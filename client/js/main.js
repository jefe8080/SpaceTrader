import { state, selectedShips } from './state.js';
import { socket } from './net.js';
import { loadAssets } from './assets.js';
import { initRenderer, render, screenToWorld, pickAt, viewMode, ZOOM_PRESETS, ZOOM_MIN, ZOOM_MAX } from './render.js';
import * as ui from './ui/index.js';
import { sfx, planetTone } from './audio.js';
import { initPlanetside, renderPlanetside, pickBuilding, scene, canLand } from './planetside.js';

await loadAssets();
const canvas = document.getElementById('view');
initRenderer(canvas);
initPlanetside(canvas);
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
  state.time = d.t;
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
  Object.assign(state, { stopLoss: d.stopLoss, groups: d.groups, favorites: d.favorites, pilot: d.pilot, governor: d.governor, faction: d.faction, flagshipAt: d.flagshipAt,
    xp: d.xp, level: d.level, quest: d.quest, questLock: d.questLock, rep: d.rep, dogUntil: d.dogUntil, mg: d.mg });
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
socket.on('events', (list) => {
  state.events = list;
  ui.scheduleRender(true);
});
socket.on('consortium', (d) => {
  state.cons = d;
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
socket.on('log', ({ ship, id, msg }) => {
  ui.addLog(ship, msg);
  // Geräusche nur für gewählte Schiffe und das Hauptschiff, sonst klingelt jede Route
  const s = state.ships.get(id);
  if (!s || !(s.main || state.selection.has(id) || state.selected?.id === id)) return;
  if (msg.startsWith('Gekauft') || msg.startsWith('Geladen')) sfx('buy');
  else if (msg.startsWith('Verkauft') || msg.startsWith('Eingelagert')) sfx('sell');
  else if (msg.startsWith('Angekommen')) sfx('dock');
});
socket.on('sfx', sfx);
socket.on('stats', (d) => {
  state.stats.set(d.id, d);
  ui.scheduleRender(true);
});
setInterval(ui.requestStats, 10000);
socket.on('errorMsg', (m) => { ui.toast(m); sfx('error'); });
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
const $tooltipHide = () => { document.getElementById('tooltip').hidden = true; };
let drag = null;
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, scroll: scene.scroll, moved: false };
  else if (e.button === 1) e.preventDefault(); // kein Autoscroll
});
// Mittelklick: Befehl an die Queue anhängen (Firefox öffnet bei Shift+Rechtsklick immer sein Kontextmenü)
canvas.addEventListener('auxclick', (e) => {
  if (e.button !== 1 || !state.me) return;
  e.preventDefault();
  orderAt(e.clientX, e.clientY, true);
});
addEventListener('mousemove', (e) => {
  if (state.landed) {
    // Planetare Ansicht: horizontal ziehen, Gebäude hervorheben
    if (drag) {
      if (Math.abs(e.clientX - drag.x) > 4) drag.moved = true;
      if (drag.moved) scene.scroll = drag.scroll - (e.clientX - drag.x);
    }
    scene.hover = e.target === canvas ? pickBuilding(e.clientX, e.clientY) : null;
    canvas.style.cursor = drag?.moved ? 'grabbing' : scene.hover ? 'pointer' : 'default';
    $tooltipHide();
    return;
  }
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
  clickAt(e.clientX, e.clientY, e.ctrlKey || e.metaKey);
});
/** Linksklick bzw. Tippen: auswählen, hineinzoomen oder Ziel wählen */
function clickAt(sx, sy, multi) {
  if (state.landed) {
    const b = pickBuilding(sx, sy);
    if (b) ui.openBuilding(b);
    return;
  }
  const hit = pickAt(sx, sy);
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
  if (multi && hit?.kind === 'ship' && state.ships.get(hit.id)?.owner === state.me.id) {
    if (!state.selection.size && state.selected?.kind === 'ship') state.selection.add(state.selected.id);
    if (state.selection.has(hit.id)) state.selection.delete(hit.id); else state.selection.add(hit.id);
    ui.select({ kind: 'ship', id: hit.id }, { keepSelection: true });
    return;
  }
  // Planeten-Klang bei der Auswahl eines Planeten (System- oder Sektoransicht)
  if (hit?.kind === 'entity' && viewMode() !== 'galaxy') { const pe = state.entities.get(hit.id); if (pe?.kind === 'planet') planetTone(pe); }
  ui.select(hit);
}
canvas.addEventListener('dblclick', (e) => {
  if (state.landed) return;
  const hit = pickAt(e.clientX, e.clientY);
  if (hit?.kind === 'ship') state.follow = hit.id;
  if (hit?.kind === 'entity' && state.entities.get(hit.id)?.kind === 'planet') ui.enterPlanet(hit.id);
});
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  // Android meldet langes Drücken zusätzlich als contextmenu, das übernimmt die Touch-Steuerung
  if (performance.now() - lastTouch < 1000 || state.landed) return;
  orderAt(e.clientX, e.clientY, e.shiftKey);
});
/** Rechtsklick bzw. langes Drücken: gewählte Schiffe dorthin schicken */
function orderAt(sx, sy, append) {
  const ships = selectedShips();
  if (!ships.length) return false;
  const hit = pickAt(sx, sy);
  const [wx, wy] = screenToWorld(sx, sy);
  state.clickFx = { x: wx, y: wy, t: performance.now() };
  let target = { x: wx, y: wy };
  if (hit?.kind === 'entity') target = state.entities.get(hit.id);
  else if (hit?.kind === 'system') { const sy = state.systems.get(hit.id); target = { x: sy.x + 1500, y: sy.y }; }
  else if (hit?.kind === 'sector') { const s = state.sectors.get(hit.id); target = s.hubPos ? { x: s.hubPos.x + 400, y: s.hubPos.y } : { x: s.bh.x + 3000, y: s.bh.y }; }
  ui.orderShips(ships, target, append);
  return true;
}
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (state.landed) { scene.scroll += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY); return; }
  zoomAt(e.clientX, e.clientY, cam.zoom * Math.exp(-e.deltaY * 0.0015));
}, { passive: false });
/** Zoomen mit festem Bildschirmpunkt (sofern keinem Schiff gefolgt wird) */
function zoomAt(sx, sy, zoom) {
  const [wx, wy] = screenToWorld(sx, sy);
  camAnim = null;
  cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  if (!state.follow) {
    const [nx, ny] = screenToWorld(sx, sy);
    cam.x += wx - nx;
    cam.y += wy - ny;
  }
}

// ---------------- Touch (Tablet) ----------------
// 1 Finger: Karte verschieben, Tippen = auswählen, Doppeltippen = Schiff folgen,
// langes Drücken = gewählte Schiffe schicken. 2 Finger: Pinch-Zoom und verschieben.
const LONG_PRESS_MS = 500, TAP_SLOP = 10;
let lastTouch = 0;
let touch = null;   // { mode: 'one'|'pinch', ... }
let lastTap = null; // { x, y, t } für Doppeltippen
const touchPts = (e) => [...e.touches].map((t) => ({ x: t.clientX, y: t.clientY }));
function startTouch(e) {
  const pts = touchPts(e);
  clearTimeout(touch?.timer);
  if (pts.length === 1) {
    const p = pts[0];
    touch = { mode: 'one', x: p.x, y: p.y, cx: cam.x, cy: cam.y, moved: false, long: false };
    touch.timer = setTimeout(() => {
      if (!touch || touch.mode !== 'one' || touch.moved || !state.me || state.pickMode) return;
      touch.long = true;
      if (orderAt(touch.x, touch.y, false)) navigator.vibrate?.(30);
    }, LONG_PRESS_MS);
  } else if (pts.length >= 2) {
    const [a, b] = pts;
    touch = { mode: 'pinch', d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), z: cam.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  } else touch = null;
}
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  lastTouch = performance.now();
  // dritter Finger o. ä.: Geste abbrechen und neu aufsetzen
  if (touch?.mode === 'one' && e.touches.length > 1) touch.moved = true;
  startTouch(e);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  lastTouch = performance.now();
  if (!touch) return;
  const pts = touchPts(e);
  if (touch.mode === 'one' && pts.length === 1) {
    const dx = pts[0].x - touch.x, dy = pts[0].y - touch.y;
    if (!touch.moved && Math.hypot(dx, dy) > TAP_SLOP && !touch.long) { touch.moved = true; clearTimeout(touch.timer); }
    if (touch.moved && state.landed) { touch.scroll ??= scene.scroll; scene.scroll = touch.scroll - dx; return; }
    if (touch.moved) {
      camAnim = null;
      cam.x = touch.cx - dx / cam.zoom;
      cam.y = touch.cy - dy / cam.zoom;
      state.follow = null;
    }
  } else if (touch.mode === 'pinch' && pts.length >= 2) {
    const [a, b] = pts;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    // erst um den alten Mittelpunkt zoomen, dann um die Fingerbewegung verschieben
    zoomAt(touch.mx, touch.my, touch.z * Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) / touch.d);
    if (!state.follow) { cam.x -= (mx - touch.mx) / cam.zoom; cam.y -= (my - touch.my) / cam.zoom; }
    touch.z = cam.zoom;
    touch.d = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    touch.mx = mx; touch.my = my;
  }
}, { passive: false });
function endTouch(e) {
  e.preventDefault();
  lastTouch = performance.now();
  const t = touch;
  if (!t) return;
  clearTimeout(t.timer);
  if (e.touches.length) {
    // ein Finger bleibt nach dem Pinch liegen: als Verschieben weiterführen, kein Tippen
    startTouch(e);
    if (touch?.mode === 'one') { touch.moved = true; clearTimeout(touch.timer); }
    return;
  }
  touch = null;
  if (e.type === 'touchcancel' || t.mode !== 'one' || t.moved || t.long || !state.me) return;
  const now = performance.now();
  if (lastTap && now - lastTap.t < 350 && Math.hypot(t.x - lastTap.x, t.y - lastTap.y) < 30) {
    lastTap = null;
    const hit = pickAt(t.x, t.y);
    if (hit?.kind === 'ship') { state.follow = hit.id; return; }
  } else lastTap = { x: t.x, y: t.y, t: now };
  clickAt(t.x, t.y, false);
}
canvas.addEventListener('touchend', endTouch, { passive: false });
canvas.addEventListener('touchcancel', endTouch, { passive: false });
addEventListener('keydown', (e) => {
  if (!state.me || ui.typing()) return;
  if (ui.mgOpen()) { if (e.key === 'Escape') ui.closeGame(); return; }
  if (state.landed && (e.key === 'Escape' || ZOOM_PRESETS[e.key])) {
    // Planetare Ansicht verlassen: Esc bzw. Taste 1/2/3 (die Zoomstufe greift dann wie gewohnt)
    if (e.key === 'Escape') { ui.planetEscape(); return; }
    ui.leavePlanet();
  }
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
  } else if (e.key === 'k' || e.key === 'K') {
    ui.toggleModal('consModal');
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
  if (state.landed && !canLand(state.landed)) {
    // Das letzte angedockte eigene Schiff ist abgeflogen
    ui.leavePlanet();
    ui.toast('Kein eigenes Schiff mehr angedockt: zurück ins All.', 'info');
  }
  if (state.landed) renderPlanetside(now);
  else render(now, dt);
  const mode = viewMode();
  if (mode !== lastMode) {
    lastMode = mode;
    document.getElementById('zoomInfo').textContent = { system: 'Ansicht: System [1]', sector: 'Ansicht: Sektor [2]', galaxy: 'Ansicht: Galaxie [3]' }[mode];
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
