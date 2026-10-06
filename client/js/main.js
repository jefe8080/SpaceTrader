import { SHIP_TYPES } from '/shared/config.js';
import { state } from './state.js';
import { socket, cmd } from './net.js';
import { loadAssets } from './assets.js';
import { initRenderer, render, screenToWorld, pickAt } from './render.js';
import * as ui from './ui.js';

await loadAssets();
const canvas = document.getElementById('view');
initRenderer(canvas);
const cam = state.camera;

// ---------------- Netzwerk ----------------
socket.on('connect', () => {
  if (state.me) socket.emit('login', { name: state.me.name }); // automatischer Re-Login nach Serverneustart
});
socket.on('players', (list) => {
  state.players = list;
  ui.renderLogin();
  if (state.me) ui.renderOnline();
});
socket.on('loginError', ui.loginError);
socket.on('welcome', (d) => {
  const first = !state.me;
  state.me = d.you;
  state.players = d.players;
  state.cells = new Set(d.cells);
  state.entities = new Map(d.entities.map((e) => [e.id, e]));
  state.ships.clear();
  state.awaitCenter = first;
  ui.enterGame();
});
socket.on('state', (d) => {
  state.credits = d.credits;
  const now = performance.now();
  const seen = new Set();
  for (const s of d.ships) {
    const prev = state.ships.get(s.id);
    s.recv = now;
    if (prev) { s.rx = prev.rx; s.ry = prev.ry; s.ra = prev.ra; }
    state.ships.set(s.id, s);
    seen.add(s.id);
  }
  for (const id of state.ships.keys()) if (!seen.has(id)) state.ships.delete(id);
  if (state.awaitCenter) {
    const own = d.ships.find((s) => s.owner === state.me.id);
    if (own) { cam.x = own.x; cam.y = own.y; ui.select({ kind: 'ship', id: own.id }); }
    state.awaitCenter = false;
  }
  if (state.selected?.kind === 'ship' && !state.ships.has(state.selected.id)) state.selected = null;
  ui.onState();
});
socket.on('reveal', ({ cells, entities }) => {
  for (const c of cells) state.cells.add(c);
  for (const e of entities) state.entities.set(e.id, e);
});
socket.on('markets', (upd) => {
  for (const [id, m] of Object.entries(upd)) {
    const e = state.entities.get(id);
    if (!e?.market) continue;
    for (const [g, v] of Object.entries(m.goods)) if (e.market.goods[g]) e.market.goods[g].stock = v;
    e.market.eff = m.eff;
    if (m.forSale) Object.assign(e.market, { forSale: m.forSale, building: m.building, nextBuild: m.nextBuild });
    if (m.progress !== undefined) e.market.progress = m.progress;
  }
  ui.onMarkets();
});
socket.on('log', ({ ship, msg }) => ui.addLog(ship, msg));
socket.on('stats', (d) => {
  state.stats.set(d.id, d);
  ui.onMarkets();
});
setInterval(ui.requestStats, 15000);
socket.on('errorMsg', ui.toast);
socket.on('kicked', (msg) => {
  state.me = null;
  ui.leaveGame(msg);
});

// ---------------- Eingabe ----------------
let drag = null;
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
});
addEventListener('mousemove', (e) => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (drag.moved) {
      cam.x = drag.cx - dx / cam.zoom;
      cam.y = drag.cy - dy / cam.zoom;
      state.follow = null;
    }
  }
  state.hover = e.target === canvas && state.me ? pickAt(e.clientX, e.clientY) : null;
  canvas.style.cursor = drag?.moved ? 'grabbing' : state.hover ? 'pointer' : 'default';
  if (state.me) ui.updateTooltip(e.clientX, e.clientY);
});
addEventListener('mouseup', (e) => {
  if (e.button !== 0 || !drag) return;
  const wasDrag = drag.moved;
  drag = null;
  if (wasDrag || e.target !== canvas || !state.me) return;
  const hit = pickAt(e.clientX, e.clientY);
  if (state.pickMode) {
    if (hit?.kind === 'entity') state.pickMode(hit.id);
    return;
  }
  ui.select(hit);
});
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const sel = state.selected;
  if (sel?.kind !== 'ship') return;
  const ship = state.ships.get(sel.id);
  if (!ship || ship.owner !== state.me?.id) return;
  const hit = pickAt(e.clientX, e.clientY);
  const [wx, wy] = screenToWorld(e.clientX, e.clientY);
  state.clickFx = { x: wx, y: wy, t: performance.now() };
  if (hit?.kind === 'entity') {
    const ent = state.entities.get(hit.id);
    const mine = ent.kind === 'belt' && SHIP_TYPES[ship.type].mining;
    cmd(mine ? 'mine' : 'goto', { shipId: ship.id, targetId: ent.id });
  } else {
    cmd('move', { shipId: ship.id, x: wx, y: wy });
  }
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [wx, wy] = screenToWorld(e.clientX, e.clientY);
  cam.zoom = Math.min(2.5, Math.max(0.05, cam.zoom * Math.exp(-e.deltaY * 0.0015)));
  if (!state.follow) {
    const [nx, ny] = screenToWorld(e.clientX, e.clientY);
    cam.x += wx - nx;
    cam.y += wy - ny;
  }
}, { passive: false });
addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if (e.key === 'Escape') {
    if (state.pickMode) state.pickMode(null);
    else ui.select(null);
  } else if (e.key === ' ' && state.selected?.kind === 'ship') {
    e.preventDefault();
    state.follow = state.selected.id;
  }
});

// ---------------- Hauptschleife ----------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!state.me) cam.x += dt * 25; // langsamer Flug im Login-Hintergrund
  if (state.follow) {
    const s = state.ships.get(state.follow);
    if (s?.rx !== undefined) {
      const k = 1 - Math.exp(-dt * 6);
      cam.x += (s.rx - cam.x) * k;
      cam.y += (s.ry - cam.y) * k;
    } else state.follow = null;
  }
  render(now, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
