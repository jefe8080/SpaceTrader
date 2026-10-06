import { WORLD, PLANET_TYPES, STATION_TYPES, BELT_TYPES, SHIP_TYPES, cellKey } from '/shared/config.js';
import { getSprite } from './assets.js';
import { state, playerColor } from './state.js';

const TAU = Math.PI * 2;
const cam = state.camera;
let canvas, ctx, W = 0, H = 0, dpr = 1;
const fogSmall = document.createElement('canvas');
const fogMid = document.createElement('canvas');

export function initRenderer(c) {
  canvas = c;
  ctx = c.getContext('2d');
  resize();
  addEventListener('resize', resize);
}

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
}

export const worldToScreen = (x, y) => [(x - cam.x) * cam.zoom + W / 2, (y - cam.y) * cam.zoom + H / 2];
export const screenToWorld = (sx, sy) => [(sx - W / 2) / cam.zoom + cam.x, (sy - H / 2) / cam.zoom + cam.y];

function srand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function ihash(...nums) {
  let h = 2166136261;
  for (const v of nums) h = Math.imul(h ^ (v | 0), 16777619);
  return h >>> 0;
}
const strHash = (s) => ihash(...[...s].map((c) => c.charCodeAt(0)));

// ---------------- Hintergrund ----------------
const STAR_LAYERS = [
  { p: 0.04, tile: 200, n: 7, size: [0.5, 1.1], alpha: [0.2, 0.55] },
  { p: 0.1, tile: 260, n: 5, size: [0.8, 1.5], alpha: [0.35, 0.8] },
  { p: 0.22, tile: 340, n: 3, size: [1.1, 2.2], alpha: [0.5, 1] },
];
const NEBULA_COLORS = ['#5e35b1', '#00838f', '#1565c0', '#ad1457', '#2e7d32'];

function drawBackground(now) {
  ctx.fillStyle = '#04050d';
  ctx.fillRect(0, 0, W, H);
  const z = cam.zoom;

  // Nebelschwaden
  ctx.globalCompositeOperation = 'lighter';
  {
    const p = 0.025, T = 1100;
    const ox = cam.x * z * p * 4, oy = cam.y * z * p * 4;
    for (let tx = Math.floor((ox - W / 2) / T) - 1; tx <= Math.floor((ox + W / 2) / T) + 1; tx++) {
      for (let ty = Math.floor((oy - H / 2) / T) - 1; ty <= Math.floor((oy + H / 2) / T) + 1; ty++) {
        const r = srand(ihash(tx, ty, 99));
        if (r() > 0.45) continue;
        const x = tx * T + r() * T - ox + W / 2, y = ty * T + r() * T - oy + H / 2;
        const rad = 350 + r() * 450;
        const col = NEBULA_COLORS[Math.floor(r() * NEBULA_COLORS.length)];
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        const a = Math.round((0.05 + r() * 0.07) * 255).toString(16).padStart(2, '0');
        g.addColorStop(0, col + a);
        g.addColorStop(1, col + '00');
        ctx.fillStyle = g;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  // Sterne
  for (let li = 0; li < STAR_LAYERS.length; li++) {
    const L = STAR_LAYERS[li];
    const ox = cam.x * z * L.p * 4, oy = cam.y * z * L.p * 4;
    for (let tx = Math.floor((ox - W / 2) / L.tile); tx <= Math.floor((ox + W / 2) / L.tile); tx++) {
      for (let ty = Math.floor((oy - H / 2) / L.tile); ty <= Math.floor((oy + H / 2) / L.tile); ty++) {
        const r = srand(ihash(tx, ty, li));
        for (let i = 0; i < L.n; i++) {
          const x = tx * L.tile + r() * L.tile - ox + W / 2;
          const y = ty * L.tile + r() * L.tile - oy + H / 2;
          const s = L.size[0] + r() * (L.size[1] - L.size[0]);
          const tw = 0.75 + 0.25 * Math.sin(now / 600 + r() * 50);
          const a = (L.alpha[0] + r() * (L.alpha[1] - L.alpha[0])) * tw;
          const hue = r();
          ctx.fillStyle = hue < 0.15 ? `rgba(255,210,170,${a})` : hue < 0.3 ? `rgba(170,200,255,${a})` : `rgba(255,255,255,${a})`;
          ctx.fillRect(x, y, s, s);
        }
      }
    }
  }
}

// ---------------- Welt ----------------
function inView(x, y, r) {
  const [sx, sy] = worldToScreen(x, y);
  const rr = r * cam.zoom + 40;
  return sx > -rr && sx < W + rr && sy > -rr && sy < H + rr;
}

const beltCache = new Map();
function beltRocks(e) {
  let rocks = beltCache.get(e.id);
  if (rocks) return rocks;
  const r = srand(strHash(e.id));
  rocks = [];
  const n = Math.round(e.radius / 6);
  for (let i = 0; i < n; i++) {
    rocks.push({ a: r() * TAU, d: e.radius * (0.2 + 0.8 * Math.sqrt(r())), size: 9 + r() * r() * 34, rot: r() * TAU, spin: (r() - 0.5) * 0.8 });
  }
  beltCache.set(e.id, rocks);
  return rocks;
}

function drawBelt(e, t) {
  const def = BELT_TYPES[e.type];
  const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius * 1.15);
  g.addColorStop(0, def.dust + '30');
  g.addColorStop(1, def.dust + '00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius * 1.15, 0, TAU);
  ctx.fill();
  const spr = getSprite(def.sprite, null, 96);
  for (const k of beltRocks(e)) {
    const a = k.a + t * (4 / k.d);
    const x = e.x + Math.cos(a) * k.d, y = e.y + Math.sin(a) * k.d;
    const s = Math.max(k.size, 3 / cam.zoom);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(k.rot + t * k.spin);
    if (spr) ctx.drawImage(spr, -s / 2, -s / 2, s, s);
    else { ctx.fillStyle = def.dust; ctx.fillRect(-s / 3, -s / 3, s / 1.5, s / 1.5); }
    ctx.restore();
  }
}

function drawPlanet(e) {
  const def = PLANET_TYPES[e.type];
  const r = Math.max(e.radius, 7 / cam.zoom);
  const s = r * 2.56;
  const spr = getSprite(def.sprite, null, 512);
  if (spr) ctx.drawImage(spr, e.x - s / 2, e.y - s / 2, s, s);
  else { ctx.fillStyle = '#556'; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.fill(); }
}

function drawStation(e, t) {
  const def = STATION_TYPES[e.type];
  const r = Math.max(e.radius, 7 / cam.zoom);
  const s = r * 2.56;
  const spr = getSprite(def.sprite, def.accent, 384);
  const h = strHash(e.id);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate((h % 628) / 100 + t * 0.06 * (h % 2 ? 1 : -1));
  if (spr) ctx.drawImage(spr, -s / 2, -s / 2, s, s);
  else { ctx.fillStyle = def.accent; ctx.fillRect(-r / 2, -r / 2, r, r); }
  ctx.restore();
}

function drawShip(s, now) {
  const def = SHIP_TYPES[s.type];
  const size = Math.max(def.size, 16 / cam.zoom) * 1.28;
  const col = playerColor(s.owner);
  const moving = Math.hypot(s.vx, s.vy) > 1;
  ctx.save();
  ctx.translate(s.rx, s.ry);
  ctx.rotate(s.ra);
  if (moving) {
    const fl = size * (0.45 + 0.12 * Math.sin(now / 40 + s.rx));
    const g = ctx.createLinearGradient(-size * 0.42, 0, -size * 0.42 - fl, 0);
    g.addColorStop(0, 'rgba(255,220,140,0.95)');
    g.addColorStop(0.4, 'rgba(255,140,60,0.6)');
    g.addColorStop(1, 'rgba(255,80,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, -size * 0.09);
    ctx.lineTo(-size * 0.42 - fl, 0);
    ctx.lineTo(-size * 0.4, size * 0.09);
    ctx.fill();
  }
  const spr = getSprite(def.sprite, col, 128);
  if (spr) ctx.drawImage(spr, -size / 2, -size / 2, size, size);
  else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, size / 4, 0, TAU); ctx.fill(); }
  ctx.restore();

  if (s.state === 'mining' && s.dockedAt) {
    const e = state.entities.get(s.dockedAt);
    if (e) {
      const a = Math.atan2(e.y - s.ry, e.x - s.rx) + Math.sin(now / 300 + s.rx) * 0.4;
      const len = 40 + 15 * Math.sin(now / 90);
      ctx.strokeStyle = `rgba(255,90,90,${0.6 + 0.3 * Math.sin(now / 50)})`;
      ctx.lineWidth = 2.5 / cam.zoom;
      ctx.beginPath();
      ctx.moveTo(s.rx, s.ry);
      ctx.lineTo(s.rx + Math.cos(a) * len, s.ry + Math.sin(a) * len);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,150,0.8)';
      ctx.beginPath();
      ctx.arc(s.rx + Math.cos(a) * len, s.ry + Math.sin(a) * len, 3 / cam.zoom + Math.random() * 2, 0, TAU);
      ctx.fill();
    }
  }
}

function ring(x, y, r, color, now, dashed = true) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 / cam.zoom;
  if (dashed) {
    ctx.setLineDash([8 / cam.zoom, 6 / cam.zoom]);
    ctx.lineDashOffset = -now / 60 / cam.zoom;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function entitySelectRadius(e) {
  if (e.kind === 'belt') return e.radius;
  return Math.max(e.radius, 7 / cam.zoom) * 1.25;
}

/** Linien für die Befehle des gewählten Schiffes */
function drawOrders(now) {
  const sel = state.selected;
  if (sel?.kind !== 'ship') return;
  const s = state.ships.get(sel.id);
  if (!s?.orders) return;
  const col = playerColor(s.owner);
  ctx.save();
  ctx.lineWidth = 1.6 / cam.zoom;
  ctx.setLineDash([10 / cam.zoom, 8 / cam.zoom]);
  ctx.lineDashOffset = -now / 40 / cam.zoom;
  const o = s.orders;
  if (o.type === 'route') {
    const pts = o.stops.map((st) => state.entities.get(st.targetId)).filter(Boolean);
    if (pts.length > 1) {
      ctx.strokeStyle = col + '55';
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
    }
    const cur = state.entities.get(o.stops[o.index]?.targetId);
    if (cur && o.phase === 'travel') {
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(s.rx, s.ry); ctx.lineTo(cur.x, cur.y); ctx.stroke();
    }
  } else if (o.type === 'move' || o.type === 'goto' || o.type === 'mine') {
    const t = o.type === 'move' ? o : state.entities.get(o.targetId);
    if (t) {
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(s.rx, s.ry); ctx.lineTo(t.x, t.y); ctx.stroke();
      if (o.type === 'move') {
        const k = 8 / cam.zoom;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(t.x - k, t.y - k); ctx.lineTo(t.x + k, t.y + k); ctx.moveTo(t.x + k, t.y - k); ctx.lineTo(t.x - k, t.y + k); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawFog() {
  const C = WORLD.FOG_CELL;
  const [x0, y0] = screenToWorld(0, 0);
  const [x1, y1] = screenToWorld(W, H);
  const cx0 = Math.floor(x0 / C) - 2, cy0 = Math.floor(y0 / C) - 2;
  const w = Math.floor(x1 / C) + 2 - cx0 + 1, h = Math.floor(y1 / C) + 2 - cy0 + 1;
  fogSmall.width = w;
  fogSmall.height = h;
  const fc = fogSmall.getContext('2d');
  const img = fc.createImageData(w, h);
  const d = img.data;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = (j * w + i) * 4;
      d[idx] = 7; d[idx + 1] = 9; d[idx + 2] = 24;
      d[idx + 3] = state.cells.has(cellKey(cx0 + i, cy0 + j)) ? 0 : 232;
    }
  }
  fc.putImageData(img, 0, 0);
  const S = 8;
  fogMid.width = w * S;
  fogMid.height = h * S;
  const mc = fogMid.getContext('2d');
  mc.imageSmoothingEnabled = true;
  mc.filter = 'blur(5px)';
  mc.drawImage(fogSmall, 0, 0, w * S, h * S);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(fogMid, cx0 * C, cy0 * C, w * C, h * C);
}

function updateShipInterpolation(now, dt) {
  const k = 1 - Math.exp(-dt * 10);
  for (const s of state.ships.values()) {
    const age = Math.min(0.4, (now - s.recv) / 1000);
    const px = s.x + s.vx * age, py = s.y + s.vy * age;
    if (s.rx === undefined || Math.hypot(px - s.rx, py - s.ry) > 400) { s.rx = px; s.ry = py; s.ra = s.angle; continue; }
    s.rx += (px - s.rx) * k;
    s.ry += (py - s.ry) * k;
    let da = s.angle - s.ra;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    s.ra += da * k;
  }
}

// ---------------- Beschriftungen (Bildschirmkoordinaten) ----------------
function drawLabels() {
  const z = cam.zoom;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (z > 0.09) {
    ctx.font = '600 12px "Segoe UI", sans-serif';
    for (const e of state.entities.values()) {
      if (!inView(e.x, e.y, e.radius)) continue;
      const [sx, sy] = worldToScreen(e.x, e.y);
      const r = e.kind === 'belt' ? e.radius * z * 0.9 : Math.max(e.radius, 7 / z) * z;
      const y = sy + r + 6;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(e.name, sx + 1, y + 1);
      ctx.fillStyle = e.kind === 'station' ? STATION_TYPES[e.type].accent : e.kind === 'belt' ? '#bcaaa4' : '#e3ecff';
      ctx.fillText(e.name, sx, y);
    }
  }
  ctx.font = '11px "Segoe UI", sans-serif';
  for (const s of state.ships.values()) {
    const own = s.owner === state.me?.id;
    if (!(z > 0.45 || (own && z > 0.18))) continue;
    if (!inView(s.rx, s.ry, 30)) continue;
    const [sx, sy] = worldToScreen(s.rx, s.ry);
    const size = Math.max(SHIP_TYPES[s.type].size, 16 / z) * z * 0.6;
    ctx.fillStyle = playerColor(s.owner);
    const owner = own || s.task ? '' : ` (${state.players.find((p) => p.id === s.owner)?.name || '?'})`;
    ctx.fillText(s.name + owner, sx, sy + size + 4);
  }
  // Stoppnummern der Route
  const sel = state.selected;
  if (sel?.kind === 'ship') {
    const s = state.ships.get(sel.id);
    if (s?.orders?.type === 'route') {
      ctx.font = '700 11px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      s.orders.stops.forEach((st, i) => {
        const e = state.entities.get(st.targetId);
        if (!e) return;
        const [sx, sy] = worldToScreen(e.x, e.y);
        const r = (e.kind === 'belt' ? e.radius * 0.7 : Math.max(e.radius, 7 / z)) * z;
        const x = sx + r * 0.75 + 6, y = sy - r * 0.75 - 6 - (i % 2) * 2;
        ctx.fillStyle = i === s.orders.index ? '#ffb74d' : playerColor(s.owner);
        ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = '#051020';
        ctx.fillText(String(i + 1), x, y + 0.5);
      });
    }
  }
}

// ---------------- Hauptfunktion ----------------
export function render(now, dt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBackground(now);
  if (!state.me) return;
  updateShipInterpolation(now, dt);
  const t = now / 1000;
  const z = cam.zoom;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  ctx.translate(-cam.x, -cam.y);

  const ents = [...state.entities.values()].filter((e) => inView(e.x, e.y, e.radius * 1.3));
  for (const e of ents) if (e.kind === 'belt') drawBelt(e, t);
  for (const e of ents) if (e.kind === 'planet') drawPlanet(e);
  for (const e of ents) if (e.kind === 'station') drawStation(e, t);

  // Auswahl und Hover
  const hov = state.hover;
  if (hov?.kind === 'entity') { const e = state.entities.get(hov.id); if (e) ring(e.x, e.y, entitySelectRadius(e), 'rgba(255,255,255,0.35)', now, false); }
  const sel = state.selected;
  if (sel?.kind === 'entity') { const e = state.entities.get(sel.id); if (e) ring(e.x, e.y, entitySelectRadius(e), '#ffb74d', now); }

  drawOrders(now);
  for (const s of state.ships.values()) if (inView(s.rx, s.ry, 40)) drawShip(s, now);
  if (sel?.kind === 'ship') { const s = state.ships.get(sel.id); if (s) ring(s.rx, s.ry, Math.max(SHIP_TYPES[s.type].size, 16 / z) * 0.9, '#4fc3f7', now); }
  if (hov?.kind === 'ship') { const s = state.ships.get(hov.id); if (s) ring(s.rx, s.ry, Math.max(SHIP_TYPES[s.type].size, 16 / z) * 0.9, 'rgba(255,255,255,0.35)', now, false); }

  // Klick-Effekt
  const fx = state.clickFx;
  if (fx && now - fx.t < 500) {
    const p = (now - fx.t) / 500;
    ring(fx.x, fx.y, (8 + 20 * p) / z, `rgba(129,199,132,${1 - p})`, now, false);
  }

  drawFog();
  ctx.restore();
  drawLabels();
}

/** Ermittelt Schiff oder Objekt unter einer Bildschirmposition */
export function pickAt(sx, sy) {
  const [wx, wy] = screenToWorld(sx, sy);
  const z = cam.zoom;
  let best = null, bestScore = Infinity;
  for (const s of state.ships.values()) {
    const r = Math.max(SHIP_TYPES[s.type].size * 0.7, 14 / z);
    const d = Math.hypot(s.rx - wx, s.ry - wy);
    if (d > r) continue;
    const score = d - (s.owner === state.me?.id ? 10 / z : 0);
    if (score < bestScore) { bestScore = score; best = { kind: 'ship', id: s.id }; }
  }
  if (best) return best;
  for (const e of state.entities.values()) {
    const r = e.kind === 'belt' ? e.radius * 0.9 : Math.max(e.radius * 1.25, 18 / z);
    const d = Math.hypot(e.x - wx, e.y - wy);
    if (d > r) continue;
    const score = d / r;
    if (score < bestScore) { bestScore = score; best = { kind: 'entity', id: e.id }; }
  }
  return best;
}
