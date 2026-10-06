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
  lastSub = '';
  state.awaitCenter = first;
  ui.enterGame();
});
socket.on('ships', (d) => {
  state.credits = d.credits;
  const now = performance.now();
  const seen = new Set();
  for (const c of d.ships) {
    let s = state.ships.get(c.id);
    if (!s) { s = { id: c.id, cargo: {}, log: [], orders: { type: 'idle' } }; state.ships.set(c.id, s); }
    Object.assign(s, { x: c.x, y: c.y, angle: c.a, vx: c.vx, vy: c.vy, state: c.st, dockedAt: c.dk, recv: now });
    if (c.d) Object.assign(s, c.d);
    if (c.owner) Object.assign(s, { owner: c.owner, type: c.type, name: c.name, task: c.task, cargo: c.cargo || s.cargo });
    seen.add(c.id);
  }
  for (const id of state.ships.keys()) if (!seen.has(id)) state.ships.delete(id);
  if (state.awaitCenter) {
    const own = d.ships.find((s) => state.ships.get(s.id).owner === state.me.id);
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
    if (m.s) for (const [g, v] of Object.entries(m.s)) if (e.market.goods[g]) e.market.goods[g].stock = v;
    if (m.x) Object.assign(e.market, m.x);
  }
  ui.onMarkets();
});
socket.on('log', ({ ship, msg }) => ui.addLog(ship, msg));
socket.on('stats', (d) => {
  state.stats.set(d.id, d);
  ui.onMarkets();
});
setInterval(ui.requestStats, 15000);

let lastSub = '';
function sendSubscriptions() {
  if (!state.me) return;
  const [x0, y0] = screenToWorld(0, 0);
  const [x1, y1] = screenToWorld(innerWidth, innerHeight);
  const ids = new Set();
  for (const e of state.entities.values()) {
    if (e.market && e.x > x0 - 300 && e.x < x1 + 300 && e.y > y0 - 300 && e.y < y1 + 300) ids.add(e.id);
  }
  for (const id of ui.dialogMarkets()) ids.add(id);
  const markets = [...ids].slice(0, 400);
  const key = markets.join(',') + '|' + [x0, y0, x1, y1].map((v) => Math.round(v / 200)).join(',');
  if (key === lastSub) return;
  lastSub = key;
  socket.emit('sub', { view: { x0, y0, x1, y1 }, markets });
}
setInterval(sendSubscriptions, 250);
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
    cmd(mine ? 'mine' : 'goto', { ship: ship.id, target: ent.id });
  } else {
    cmd('move', { ship: ship.id, x: wx, y: wy });
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
