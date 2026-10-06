import { state, selectedShips } from './state.js';
import { socket } from './net.js';
import { loadAssets } from './assets.js';
import { initRenderer, render, screenToWorld, pickAt, viewMode, ZOOM_PRESETS, ZOOM_MIN, ZOOM_MAX } from './render.js';
import { hexCenter, parseHexKey } from '/shared/hex.js';
import { WORLD } from '/shared/config.js';
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
  state.sectors = new Map(d.sectors.map((s) => [s.key, s]));
  state.systems = new Map(d.systems.map((s) => [s.id, s]));
  state.zones = new Map(d.zones.map((z) => [z.id, z]));
  state.wh = new Map(d.wh.map((w) => [w.id, w]));
  state.recipes = new Set(d.recipes || []);
  state.shipTypes = new Set(d.shipTypes || []);
  state.moduleTypes = new Set(d.moduleTypes || []);
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
  Object.assign(state, { stopLoss: d.stopLoss, groups: d.groups, favorites: d.favorites, pilot: d.pilot, governor: d.governor, faction: d.faction });
  ui.scheduleRender(true);
});
socket.on('routes', (list) => {
  state.routes = new Map(list.map((r) => [r.id, r]));
  ui.scheduleRender(true);
});
socket.on('props', (list) => {
  state.props = new Map(list.map((p) => [p.entity, p]));
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
socket.on('reveal', (d) => {
  for (const c of d.cells || []) state.cells.add(c);
  for (const e of d.entities || []) state.entities.set(e.id, e);
  if (d.entities?.length && !d.cells) ui.scheduleRender(true);
  for (const s of d.sectors || []) state.sectors.set(s.key, s);
  for (const s of d.systems || []) state.systems.set(s.id, s);
  for (const z of d.zones || []) state.zones.set(z.id, z);
  for (const w of d.wh || []) state.wh.set(w.id, w);
  for (const k of d.recipes || []) state.recipes.add(k);
  for (const k of d.ships || []) state.shipTypes.add(k);
  for (const k of d.modules || []) state.moduleTypes.add(k);
  if (d.recipes || d.ships || d.modules) ui.refreshAlmanac();
  if (d.systems || d.sectors || d.wh) ui.scheduleRender(true);
});
socket.on('markets', (upd) => {
  for (const [id, m] of Object.entries(upd)) {
    const e = state.entities.get(id);
    if (!e?.market) continue;
    if (m.s) for (const [g, v] of Object.entries(m.s)) if (e.market.goods[g]) e.market.goods[g].stock = v;
    if (m.x) {
      Object.assign(e.market, m.x);
      // zuletzt gesehene Schiffspreise für den Almanach
      for (const it of m.x.forSale || []) state.shipPrices[it.type] = it.price;
      if (m.x.forSale?.length) { try { localStorage.setItem('st_ship_prices', JSON.stringify(state.shipPrices)); } catch { /* egal */ } }
    }
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
socket.on('notice', (m) => ui.toast(m, 'info'));
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
  if (viewMode() === 'system') {
    for (const e of state.entities.values()) {
      if (ids.size >= 400) break;
      if (e.market && e.x > x0 - 300 && e.x < x1 + 300 && e.y > y0 - 300 && e.y < y1 + 300) ids.add(e.id);
    }
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
      camAnim = null;
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
  // System bzw. Sektor anklicken: hineinzoomen
  if (hit?.kind === 'system') {
    const sy = state.systems.get(hit.id);
    state.follow = null;
    flyCamera(sy.x, sy.y, 0.09);
    return;
  }
  if (hit?.kind === 'sector') {
    const s = state.sectors.get(hit.id);
    state.follow = null;
    flyCamera(s.bh.x, s.bh.y, ZOOM_PRESETS[2]);
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
  let target = { x: wx, y: wy };
  if (hit?.kind === 'entity') target = state.entities.get(hit.id);
  else if (hit?.kind === 'system') { const sy = state.systems.get(hit.id); target = { x: sy.x + 1500, y: sy.y }; }
  else if (hit?.kind === 'sector') { const s = state.sectors.get(hit.id); target = s.hubPos ? { x: s.hubPos.x + 400, y: s.hubPos.y } : { x: s.bh.x + 3000, y: s.bh.y }; }
  ui.orderShips(ships, target, e.shiftKey);
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [wx, wy] = screenToWorld(e.clientX, e.clientY);
  camAnim = null;
  cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom * Math.exp(-e.deltaY * 0.0015)));
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
  } else if (ZOOM_PRESETS[e.key]) {
    // Schnellwahl der Zoomstufe, Mittelpunkt bleibt (bzw. folgt dem Schiff)
    flyCamera(cam.x, cam.y, ZOOM_PRESETS[e.key]);
  } else if (e.key === 'r' || e.key === 'R') {
    ui.toggleModal('routesOverview');
  } else if (e.key === 'f' || e.key === 'F') {
    ui.toggleModal('favorites');
  } else if (e.key === 'a' || e.key === 'A') {
    ui.toggleModal('almanac');
  } else if (e.key === 'b' || e.key === 'B') {
    ui.toggleModal('propsModal');
  }
});

// ---------------- Kamera ----------------
let camAnim = null;
/** Sanfter Kameraflug (logarithmischer Zoom) */
function flyCamera(x, y, zoom) {
  camAnim = { x0: cam.x, y0: cam.y, z0: cam.zoom, x, y, z: zoom, t: 0 };
}
document.getElementById('btnHome').onclick = () => {
  const home = [...state.systems.values()].find((s) => s.start);
  state.follow = null;
  if (home) flyCamera(home.x, home.y, 0.12);
};
void hexCenter; void parseHexKey; void WORLD;

// ---------------- Hauptschleife ----------------
let last = performance.now();
let lastMode = null;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (camAnim) {
    camAnim.t = Math.min(1, camAnim.t + dt / 0.6);
    const k = 1 - Math.pow(1 - camAnim.t, 3);
    cam.zoom = Math.exp(Math.log(camAnim.z0) + (Math.log(camAnim.z) - Math.log(camAnim.z0)) * k);
    if (!state.follow) {
      cam.x = camAnim.x0 + (camAnim.x - camAnim.x0) * k;
      cam.y = camAnim.y0 + (camAnim.y - camAnim.y0) * k;
    }
    if (camAnim.t >= 1) camAnim = null;
  }
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
  const mode = viewMode();
  if (mode !== lastMode) {
    lastMode = mode;
    document.getElementById('zoomInfo').textContent = { system: 'Ansicht: System [1]', sector: 'Ansicht: Sektor [2]', galaxy: 'Ansicht: Galaxie [3]' }[mode];
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
