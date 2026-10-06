import { state, selectedShips } from './state.js';
import { socket } from './net.js';
import { loadAssets } from './assets.js';
import { initRenderer, render, screenToWorld, pickAt } from './render.js';
import * as ui from './ui/index.js';

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
  if (state.me) ui.renderTop();
});
socket.on('loginError', ui.loginError);
socket.on('welcome', (d) => {
  const first = !state.me;
  state.me = d.you;
  state.players = d.players;
  state.cells = new Set(d.cells);
  state.entities = new Map(d.entities.map((e) => [e.id, e]));
  state.ships.clear();
  state.selection.clear();
  lastSub = '';
  state.awaitCenter = first;
  ui.enterGame();
  ui.renderAll();
});
socket.on('ships', (d) => {
  state.credits = d.credits;
  const now = performance.now();
  const seen = new Set();
  for (const c of d.ships) {
    let s = state.ships.get(c.id);
    if (!s) { s = { id: c.id, cargo: {}, log: [], queue: [], warn: {} }; state.ships.set(c.id, s); }
    Object.assign(s, { x: c.x, y: c.y, angle: c.a, vx: c.vx, vy: c.vy, state: c.st, dockedAt: c.dk, recv: now });
    if (c.d) Object.assign(s, c.d);
    if (c.owner) Object.assign(s, { owner: c.owner, type: c.type, name: c.name, task: c.task, cargo: c.cargo || s.cargo });
    seen.add(c.id);
  }
  for (const id of state.ships.keys()) if (!seen.has(id)) state.ships.delete(id);
  for (const id of state.selection) if (!state.ships.has(id)) state.selection.delete(id);
  if (state.awaitCenter) {
    const own = d.ships.find((s) => state.ships.get(s.id).owner === state.me.id);
    if (own) { cam.x = own.x; cam.y = own.y; ui.select({ kind: 'ship', id: own.id }); }
    state.awaitCenter = false;
  }
  if (state.selected?.kind === 'ship' && !state.ships.has(state.selected.id)) state.selected = null;
  ui.scheduleRender();
});
socket.on('me', (d) => {
  Object.assign(state, { stopLoss: d.stopLoss, groups: d.groups, favorites: d.favorites });
  ui.scheduleRender(true);
});
socket.on('routes', (list) => {
  state.routes = new Map(list.map((r) => [r.id, r]));
  ui.scheduleRender(true);
});
socket.on('fleetStats', (d) => {
  state.fleetStats = d;
  ui.scheduleRender(true);
});
socket.on('shipStats', (d) => {
  state.shipStats.set(d.ship, d);
  ui.scheduleRender();
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
  ui.scheduleRender(true);
});
socket.on('log', ({ ship, msg }) => ui.addLog(ship, msg));
socket.on('stats', (d) => {
  state.stats.set(d.id, d);
  ui.scheduleRender(true);
});
setInterval(ui.requestStats, 10000);
socket.on('errorMsg', (m) => ui.toast(m));
socket.on('kicked', (msg) => {
  state.me = null;
  ui.leaveGame(msg);
});

// Abos: Sichtbereich + Märkte im Bild + offene Dialoge
let lastSub = '';
function sendSubscriptions() {
  if (!state.me) return;
  const [x0, y0] = screenToWorld(0, 0);
  const [x1, y1] = screenToWorld(innerWidth, innerHeight);
  const ids = new Set(ui.dialogMarkets());
  for (const e of state.entities.values()) {
    if (ids.size >= 400) break;
    if (e.market && e.x > x0 - 300 && e.x < x1 + 300 && e.y > y0 - 300 && e.y < y1 + 300) ids.add(e.id);
  }
  const markets = [...ids].slice(0, 400);
  const q = (v) => Math.round(v / Math.max(200, (x1 - x0) / 10));
  const key = markets.join(',') + '|' + [x0, y0, x1, y1].map(q).join(',');
  if (key === lastSub) return;
  lastSub = key;
  socket.emit('sub', { view: { x0, y0, x1, y1 }, markets });
}
setInterval(sendSubscriptions, 250);

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
  // Strg+Klick auf eigenes Schiff: Mehrfachauswahl
  if ((e.ctrlKey || e.metaKey) && hit?.kind === 'ship' && state.ships.get(hit.id)?.owner === state.me.id) {
    if (!state.selection.size && state.selected?.kind === 'ship') state.selection.add(state.selected.id);
    if (state.selection.has(hit.id)) state.selection.delete(hit.id); else state.selection.add(hit.id);
    ui.select({ kind: 'ship', id: hit.id }, { keepSelection: true });
    return;
  }
  ui.select(hit);
});
canvas.addEventListener('dblclick', (e) => {
  const hit = pickAt(e.clientX, e.clientY);
  if (hit?.kind === 'ship') state.follow = hit.id;
});
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const ships = selectedShips();
  if (!ships.length) return;
  const hit = pickAt(e.clientX, e.clientY);
  const [wx, wy] = screenToWorld(e.clientX, e.clientY);
  state.clickFx = { x: wx, y: wy, t: performance.now() };
  const target = hit?.kind === 'entity' ? state.entities.get(hit.id) : { x: wx, y: wy };
  ui.orderShips(ships, target, e.shiftKey);
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
  if (!state.me || ui.typing()) return;
  if (e.key === 'Escape') {
    if (state.pickMode) state.pickMode(null);
    else if (!ui.closeTopModal()) ui.select(null);
  } else if (e.key === ' ' && state.selected?.kind === 'ship') {
    e.preventDefault();
    state.follow = state.selected.id;
  } else if (e.ctrlKey || e.metaKey || e.altKey) {
    // keine Kürzel mit Modifikatoren
  } else if (e.key === 'r' || e.key === 'R') {
    ui.toggleModal('routesOverview');
  } else if (e.key === 'f' || e.key === 'F') {
    ui.toggleModal('favorites');
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
