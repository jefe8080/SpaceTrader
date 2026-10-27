import {drawPlanetExterior} from './planetExterior.js';
import { WORLD, PLANET_TYPES, STATION_TYPES, BELT_TYPES, SHIP_TYPES, ZONE_TYPES, GOODS, cellKey } from '/shared/config.js';
import { hexAt, hexCorners, hexCenter, hexKey } from '/shared/hex.js';
import { getSprite } from './assets.js';
import { shipScreenSize, shipVerticalScale } from './shipArt.js';
import { state, playerColor, selectedShips } from './state.js';
import { hasWarn, stationAccent } from './util.js';
import { FACTIONS } from '/shared/factions.js';

const TAU = Math.PI * 2;
const cam = state.camera;
let canvas, ctx, W = 0, H = 0, dpr = 1;
const fogSmall = document.createElement('canvas');
const fogMid = document.createElement('canvas');

/** Zoomstufen: ab hier System- bzw. Sektordarstellung */
export const LOD = { SYSTEM: 0.035, SECTOR: 0.0035 };
export const ZOOM_PRESETS = { 1: 0.3, 2: 0.007, 3: 0.0011 };
export const ZOOM_MIN = 0.0004, ZOOM_MAX = 2.5;
export const viewMode = () => (cam.zoom >= LOD.SYSTEM ? 'system' : cam.zoom >= LOD.SECTOR ? 'sector' : 'galaxy');

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

function drawCoverage(){
  ctx.save();ctx.fillStyle='rgba(68,198,185,0.035)';ctx.strokeStyle='rgba(83,225,208,0.55)';ctx.lineWidth=1/cam.zoom;ctx.setLineDash([8/cam.zoom,6/cam.zoom]);
  for(const area of state.coverage||[]){
    if(area.kind==='circle'){
      ctx.beginPath();ctx.arc(area.x,area.y,area.radius,0,TAU);ctx.fill();ctx.stroke();
    }else{
      // Draw only exterior cell edges; shared edges in an own hex ring disappear.
      const edges=new Map();
      for(let q=-area.rings;q<=area.rings;q++)for(let r=Math.max(-area.rings,-q-area.rings);r<=Math.min(area.rings,-q+area.rings);r++){
        const corners=hexCorners(area.q+q,area.r+r);
        for(let i=0;i<6;i++){
          const a=corners[i],b=corners[(i+1)%6],ka=`${Math.round(a.x)},${Math.round(a.y)}`,kb=`${Math.round(b.x)},${Math.round(b.y)}`,key=[ka,kb].sort().join(':');
          if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);
        }
      }
      ctx.beginPath();for(const [a,b] of edges.values()){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.stroke();
    }
  }
  ctx.restore();
}

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

// ---------------- Markerfarben ----------------
export const STATE_COLORS = { route: '#4fc3f7', flying: '#81c784', docked: '#90a4ae', idle: '#ffb74d', mining: '#d7ccc8', warn: '#e57373', transit: '#ce93d8', waiting: '#90a4ae' };
export function shipColor(s) {
  if (s.owner !== state.me?.id) return playerColor(s.owner);
  if (state.markerMode === 'state') {
    if (hasWarn(s)) return STATE_COLORS.warn;
    if (s.queue?.[0]?.t === 'route' && s.state !== 'mining') return STATE_COLORS.route;
    return STATE_COLORS[s.state] || STATE_COLORS.idle;
  }
  return s.marker || playerColor(s.owner);
}

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
  // Parallaxe gedämpft, damit auch bei großen Koordinaten und kleinem Zoom ruhig
  const z = Math.max(cam.zoom, 0.02);
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

// ---------------- Hilfen ----------------
function inView(x, y, r) {
  const [sx, sy] = worldToScreen(x, y);
  const rr = r * cam.zoom + 40;
  return sx > -rr && sx < W + rr && sy > -rr && sy < H + rr;
}
const px = (n) => n / cam.zoom; // Bildschirmpixel in Welteinheiten

function ring(x, y, r, color, now, dashed = true) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = px(2);
  if (dashed) {
    ctx.setLineDash([px(8), px(6)]);
    ctx.lineDashOffset = -now / 60 / cam.zoom;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// ---------------- Himmelskörper ----------------
function drawZones(now) {
  for (const z of state.zones.values()) {
    if (!inView(z.x, z.y, Math.max(z.rx, z.ry))) continue;
    const def = ZONE_TYPES[z.type];
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.rotate(z.rot || 0);
    ctx.scale(1, z.ry / z.rx);
    const g = ctx.createRadialGradient(0, 0, z.rx * 0.2, 0, 0, z.rx);
    g.addColorStop(0, def.color + '30');
    g.addColorStop(0.85, def.color + '1c');
    g.addColorStop(1, def.color + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, z.rx, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = def.color + '66';
    ctx.lineWidth = px(1.5) * (z.rx / z.ry > 1 ? 1 : 1);
    ctx.setLineDash([px(10), px(10)]);
    ctx.lineDashOffset = -now / 80 / cam.zoom;
    ctx.beginPath();
    ctx.arc(0, 0, z.rx, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBlackHoles(now) {
  for (const s of state.sectors.values()) {
    const R = 900;
    if (!inView(s.bh.x, s.bh.y, R * 6)) continue;
    const r = Math.max(R, px(6));
    const t = now / 1000;
    ctx.save();
    ctx.translate(s.bh.x, s.bh.y);
    // Akkretionsscheibe
    ctx.save();
    ctx.scale(1, 0.38);
    ctx.rotate(t * 0.05);
    const g = ctx.createRadialGradient(0, 0, r * 1.1, 0, 0, r * 5.5);
    g.addColorStop(0, 'rgba(255,214,140,0.95)');
    g.addColorStop(0.25, 'rgba(255,120,60,0.55)');
    g.addColorStop(0.6, 'rgba(160,60,200,0.18)');
    g.addColorStop(1, 'rgba(60,20,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 5.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    // Linsenring und Ereignishorizont
    const halo = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.8);
    halo.addColorStop(0, 'rgba(255,230,180,0.9)');
    halo.addColorStop(0.3, 'rgba(255,170,90,0.35)');
    halo.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function drawStars() {
  for (const sy of state.systems.values()) {
    const R = 170 * (sy.star?.size || 1);
    if (!inView(sy.x, sy.y, R * 8)) continue;
    const r = Math.max(R, px(3));
    const col = sy.star?.color || '#fff3c4';
    const g = ctx.createRadialGradient(sy.x, sy.y, r * 0.2, sy.x, sy.y, r * 6);
    g.addColorStop(0, col + 'cc');
    g.addColorStop(0.15, col + '55');
    g.addColorStop(1, col + '00');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sy.x, sy.y, r * 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sy.x, sy.y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(sy.x, sy.y, r * 1.15, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
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
  if (cam.zoom < 0.08) return; // bei kleinem Zoom nur der Staub
  const spr = getSprite(def.sprite, null, 96);
  for (const k of beltRocks(e)) {
    const a = k.a + t * (4 / k.d);
    const x = e.x + Math.cos(a) * k.d, y = e.y + Math.sin(a) * k.d;
    const s = Math.max(k.size, px(3));
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
  const r = Math.max(e.radius, px(7));
  const s = r * 2.56;
  const spr = getSprite(def.sprite, null, 512);
  drawPlanetExterior(ctx, e, r, () => {
    if (spr) ctx.drawImage(spr, e.x - s / 2, e.y - s / 2, s, s);
    else { ctx.fillStyle = '#556'; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.fill(); }
  });
}

function drawStation(e, t) {
  const def = STATION_TYPES[e.type];
  const r = Math.max(e.radius, px(7));
  const s = r * 2.56;
  const spr = getSprite(def.sprite, stationAccent(e), 384);
  const h = strHash(e.id);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate((h % 628) / 100 + t * 0.06 * (h % 2 ? 1 : -1) * (e.type === 'hub' ? 0.3 : 1));
  if (spr) ctx.drawImage(spr, -s / 2, -s / 2, s, s);
  else { ctx.fillStyle = def.accent; ctx.fillRect(-r / 2, -r / 2, r, r); }
  ctx.restore();
}

function drawWormhole(e, t) {
  const r = Math.max(e.radius, px(8));
  ctx.save();
  ctx.translate(e.x, e.y);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
  g.addColorStop(0, 'rgba(10,0,30,1)');
  g.addColorStop(0.35, 'rgba(120,60,220,0.85)');
  g.addColorStop(0.6, 'rgba(80,200,255,0.35)');
  g.addColorStop(1, 'rgba(80,120,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, TAU); ctx.fill();
  ctx.lineWidth = px(1.6);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(t * 0.8 + i * (TAU / 4));
    ctx.strokeStyle = `rgba(190,160,255,${0.7 - i * 0.12})`;
    ctx.beginPath();
    for (let k = 0; k <= 30; k++) {
      const a = (k / 30) * TAU * 0.6, d = r * (0.25 + (k / 30) * 1.6);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------- Schiffe ----------------
function drawShip(s, now) {
  const def = SHIP_TYPES[s.type];
  const col = shipColor(s);
  const transit = s.state === 'transit';
  // Die Systemansicht behält Illustrationen; die Sektoransicht zeichnet Marker.
  const size = px(shipScreenSize(def.size, cam.zoom));
  const moving = Math.hypot(s.vx, s.vy) > 1;
  ctx.save();
  ctx.translate(s.rx, s.ry);
  ctx.rotate(s.ra);
  if (transit) ctx.globalAlpha = 0.35 + 0.25 * Math.sin(now / 120);
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
  const spr = getSprite(def.sprite, s.owner === state.me?.id ? (s.marker || playerColor(s.owner)) : playerColor(s.owner), 256);
  ctx.scale(1, shipVerticalScale(s.ra));
  if (spr) ctx.drawImage(spr, -size / 2, -size / 2, size, size);
  else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, size / 4, 0, TAU); ctx.fill(); }
  ctx.restore();
  // Die Illustration behält ihre Fraktionsfarben; der Punkt zeigt den Besitzer.
  ctx.fillStyle = s.owner === state.me?.id ? (s.marker || playerColor(s.owner)) : playerColor(s.owner);
  ctx.strokeStyle = '#101925';
  ctx.lineWidth = px(1);
  ctx.beginPath(); ctx.arc(s.rx - size * 0.4, s.ry + size * 0.35, px(3), 0, TAU); ctx.fill(); ctx.stroke();
  if (state.markerMode === 'state' && s.owner === state.me?.id) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(s.rx + size * 0.45, s.ry - size * 0.45, px(3.5), 0, TAU); ctx.fill();
  }

  if (s.state === 'mining' && s.dockedAt) {
    const e = state.entities.get(s.dockedAt);
    if (e) {
      const a = Math.atan2(e.y - s.ry, e.x - s.rx) + Math.sin(now / 300 + s.rx) * 0.4;
      const len = 40 + 15 * Math.sin(now / 90);
      ctx.strokeStyle = `rgba(255,90,90,${0.6 + 0.3 * Math.sin(now / 50)})`;
      ctx.lineWidth = px(2.5);
      ctx.beginPath();
      ctx.moveTo(s.rx, s.ry);
      ctx.lineTo(s.rx + Math.cos(a) * len, s.ry + Math.sin(a) * len);
      ctx.stroke();
    }
  }
}

/** Schiffsmarker: Dreieck in Flugrichtung, eigene Schiffe mit Rand */
function drawMarker(s, col, now) {
  const own = s.owner === state.me?.id;
  const k = px(own ? 7 : 5);
  ctx.save();
  ctx.translate(s.rx, s.ry);
  ctx.rotate(s.ra || 0);
  if (s.state === 'transit') ctx.globalAlpha = 0.4 + 0.3 * Math.sin(now / 120);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(k, 0); ctx.lineTo(-k * 0.7, k * 0.65); ctx.lineTo(-k * 0.35, 0); ctx.lineTo(-k * 0.7, -k * 0.65);
  ctx.closePath();
  ctx.fill();
  if (own) { ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = px(1); ctx.stroke(); }
  ctx.restore();
  if (own && hasWarn(s)) {
    ctx.fillStyle = STATE_COLORS.warn;
    ctx.beginPath(); ctx.arc(s.rx + k, s.ry - k, px(3), 0, TAU); ctx.fill();
  }
}

// ---------------- Befehle und Wege ----------------
function cmdPoint(c) {
  if (c.t === 'move') return { x: c.x, y: c.y, move: true };
  if (c.target) return state.entities.get(c.target);
  return null;
}

/** Queue als Pfad, aktueller Weg inkl. Wurmlöchern (nav), Routen als Rundkurs */
function drawOrders(now) {
  const ships = selectedShips();
  ctx.save();
  ctx.lineWidth = px(1.6);
  ctx.setLineDash([px(10), px(8)]);
  ctx.lineDashOffset = -now / 40 / cam.zoom;
  for (const s of ships) {
    if (s.rx === undefined) continue;
    const col = shipColor(s);
    let x0 = s.rx, y0 = s.ry;
    // geplanter Weg des aktuellen Befehls (Wurmlöcher)
    if (s.nav?.length) {
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      for (const [x, y, wh] of s.nav) {
        ctx.lineTo(x, y);
        if (wh) {
          ctx.stroke();
          ring(x, y, px(10), '#ce93d8', now, false);
          const w = [...state.wh.values()].find((w) => Math.hypot(w.a.x - x, w.a.y - y) < 2 || Math.hypot(w.b.x - x, w.b.y - y) < 2);
          const exit = w && (Math.hypot(w.a.x - x, w.a.y - y) < 2 ? w.b : w.a);
          ctx.beginPath();
          if (exit) ctx.moveTo(exit.x, exit.y); else ctx.moveTo(x, y);
          continue;
        }
      }
      ctx.stroke();
      const last = s.nav[s.nav.length - 1];
      x0 = last[0]; y0 = last[1];
    }
    if (!s.queue?.length) continue;
    ctx.strokeStyle = col + '99';
    const rest = s.nav?.length ? s.queue.slice(1) : s.queue;
    for (const c of rest) {
      if (c.t === 'route') {
        const r = state.routes.get(c.route);
        const pts = (r?.stops || []).map((st) => state.entities.get(st.targetId)).filter(Boolean);
        if (pts.length > 1) {
          ctx.strokeStyle = col + '55';
          ctx.beginPath();
          pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
          ctx.closePath();
          ctx.stroke();
        }
        if (!s.nav?.length && c === s.queue[0]) {
          const cur = pts[c.idx || 0];
          if (cur && (c.phase || 'travel') === 'travel') { ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(cur.x, cur.y); ctx.stroke(); }
        }
        break;
      }
      const t = cmdPoint(c);
      if (!t) continue;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(t.x, t.y); ctx.stroke();
      if (t.move) {
        const k = px(8);
        ctx.save();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(t.x - k, t.y - k); ctx.lineTo(t.x + k, t.y + k); ctx.moveTo(t.x + k, t.y - k); ctx.lineTo(t.x - k, t.y + k); ctx.stroke();
        ctx.restore();
      }
      x0 = t.x; y0 = t.y;
    }
  }
  ctx.restore();
}

/** Bekannte Wurmlochverbindungen als gebogene Linie */
function drawWormholeLinks(alpha = 0.5) {
  ctx.save();
  ctx.strokeStyle = `rgba(206,147,216,${alpha})`;
  ctx.lineWidth = px(1.5);
  ctx.setLineDash([px(6), px(6)]);
  for (const w of state.wh.values()) {
    const mx = (w.a.x + w.b.x) / 2, my = (w.a.y + w.b.y) / 2;
    const dx = w.b.x - w.a.x, dy = w.b.y - w.a.y;
    ctx.beginPath();
    ctx.moveTo(w.a.x, w.a.y);
    ctx.quadraticCurveTo(mx - dy * 0.15, my + dx * 0.15, w.b.x, w.b.y);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------- Nebel ----------------
function drawFog() {
  const C = WORLD.FOG_CELL;
  const [x0, y0] = screenToWorld(0, 0);
  const [x1, y1] = screenToWorld(W, H);
  const cx0 = Math.floor(x0 / C) - 2, cy0 = Math.floor(y0 / C) - 2;
  const w = Math.floor(x1 / C) + 2 - cx0 + 1, h = Math.floor(y1 / C) + 2 - cy0 + 1;
  if (w * h > 120000) return;
  fogSmall.width = w;
  fogSmall.height = h;
  const fc = fogSmall.getContext('2d');
  const img = fc.createImageData(w, h);
  const d = img.data;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = (j * w + i) * 4;
      d[idx] = 7; d[idx + 1] = 9; d[idx + 2] = 24;
      d[idx + 3] = state.cells.has(cellKey(cx0 + i, cy0 + j)) ? 0 : 205;
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
    const x = s.x + s.vx * age, y = s.y + s.vy * age;
    if (s.rx === undefined || Math.hypot(x - s.rx, y - s.ry) > 2000) { s.rx = x; s.ry = y; s.ra = s.angle; continue; }
    s.rx += (x - s.rx) * k;
    s.ry += (y - s.ry) * k;
    let da = s.angle - s.ra;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    s.ra += da * k;
  }
}

// ---------------- Beschriftungen (Bildschirmkoordinaten) ----------------
function label(text, x, y, color, font = '600 12px "Segoe UI", sans-serif') {
  ctx.font = font;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawSystemLabels() {
  const z = cam.zoom;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const e of state.entities.values()) {
    if (!inView(e.x, e.y, e.radius)) continue;
    if (z < 0.09 && e.kind === 'belt') continue;
    const [sx, sy] = worldToScreen(e.x, e.y);
    const r = e.kind === 'belt' ? e.radius * z * 0.9 : Math.max(e.radius, 7 / z) * z;
    const fav = state.favorites[e.id] ? '★ ' : '';
    const col = e.kind === 'station' ? stationAccent(e) : e.kind === 'belt' ? '#bcaaa4' : e.kind === 'wormhole' ? '#ce93d8' : e.faction ? FACTIONS[e.faction].color : '#e3ecff';
    label(fav + e.name, sx, sy + r + 6, col, e.type === 'hub' ? '700 13px "Segoe UI", sans-serif' : undefined);
  }
  // Systemnamen über dem Stern
  for (const sy of state.systems.values()) {
    if (!inView(sy.x, sy.y, 500)) continue;
    const [sx, syy] = worldToScreen(sy.x, sy.y);
    label(sy.name, sx, syy - 260 * (sy.star?.size || 1) * z - 22, '#fff3c4', '600 13px "Segoe UI", sans-serif');
  }
  ctx.font = '11px "Segoe UI", sans-serif';
  for (const s of state.ships.values()) {
    const own = s.owner === state.me?.id;
    if (!(z > 0.45 || (own && z > 0.12))) continue;
    if (!inView(s.rx, s.ry, 30)) continue;
    const [sx, sy] = worldToScreen(s.rx, s.ry);
    const size = Math.max(SHIP_TYPES[s.type].size, 16 / z) * z * 0.6;
    const owner = own || s.task ? '' : ` (${state.players.find((p) => p.id === s.owner)?.name || '?'})`;
    label((s.main ? '♛ ' : '') + s.name + owner, sx, sy + size + 4, shipColor(s), '11px "Segoe UI", sans-serif');
  }
  // Stoppnummern der Route
  const sel = state.selected;
  if (sel?.kind === 'ship') {
    const s = state.ships.get(sel.id);
    const rc = s?.queue?.[0]?.t === 'route' ? s.queue[0] : null;
    const route = rc && state.routes.get(rc.route);
    if (route) {
      ctx.font = '700 11px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      route.stops.forEach((st, i) => {
        const e = state.entities.get(st.targetId);
        if (!e) return;
        const [sx, sy] = worldToScreen(e.x, e.y);
        const r = (e.kind === 'belt' ? e.radius * 0.7 : Math.max(e.radius, 7 / z)) * z;
        const x = sx + r * 0.75 + 6, y = sy - r * 0.75 - 6 - (i % 2) * 2;
        ctx.fillStyle = i === (rc.idx || 0) ? '#ffb74d' : playerColor(s.owner);
        ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = '#051020';
        ctx.fillText(String(i + 1), x, y + 0.5);
      });
    }
  }
}

// ---------------- Sektoransicht ----------------
function drawSectorView(now) {
  drawZones(now);
  // Sektorgrenzen
  ctx.save();
  ctx.strokeStyle = 'rgba(120,160,255,0.15)';
  ctx.lineWidth = px(1);
  ctx.setLineDash([px(4), px(6)]);
  for (const s of state.sectors.values()) {
    ctx.beginPath(); ctx.arc(s.bh.x, s.bh.y, WORLD.SECTOR_RADIUS, 0, TAU); ctx.stroke();
  }
  ctx.restore();
  drawBlackHoles(now);
  drawWormholeLinks(0.55);
  for (const e of state.entities.values()) {
    if (e.kind !== 'wormhole' || !inView(e.x, e.y, 2000)) continue;
    ctx.fillStyle = '#ce93d8';
    ctx.beginPath(); ctx.arc(e.x, e.y, px(4), 0, TAU); ctx.fill();
  }
  // Systeme
  for (const sy of state.systems.values()) {
    if (!inView(sy.x, sy.y, WORLD.SYSTEM_RADIUS)) continue;
    const col = sy.star?.color || '#fff3c4';
    const g = ctx.createRadialGradient(sy.x, sy.y, 0, sy.x, sy.y, px(14));
    g.addColorStop(0, col);
    g.addColorStop(0.3, col + '88');
    g.addColorStop(1, col + '00');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sy.x, sy.y, px(14), 0, TAU); ctx.fill();
    ctx.strokeStyle = sy.faction ? FACTIONS[sy.faction].color + 'cc' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = px(sy.faction ? 2.5 : 1);
    ctx.beginPath(); ctx.arc(sy.x, sy.y, WORLD.SYSTEM_RADIUS, 0, TAU); ctx.stroke();
    if (sy.faction) {
      ctx.fillStyle = FACTIONS[sy.faction].color + '18';
      ctx.beginPath(); ctx.arc(sy.x, sy.y, WORLD.SYSTEM_RADIUS, 0, TAU); ctx.fill();
    }
  }
  // Hubs
  for (const s of state.sectors.values()) {
    if (!s.hubPos || !inView(s.hubPos.x, s.hubPos.y, 1000)) continue;
    diamond(s.hubPos.x, s.hubPos.y, px(7), STATION_TYPES.hub.accent);
  }
  drawEventMarkers(now, true);
  drawOrders(now);
  for (const s of state.ships.values()) if (inView(s.rx, s.ry, 100)) drawMarker(s, shipColor(s), now);
  for (const s of selectedShips()) ring(s.rx, s.ry, px(11), '#4fc3f7', now);
}

/** Sondernachfrage: pulsierender Marker am Planeten (Weltkoordinaten), r = Mindestradius */
function drawEventMarkers(now, sector = false) {
  const pulse = 0.5 + 0.5 * Math.sin(now / 250);
  for (const ev of state.events || []) {
    if (ev.x === undefined || ev.left <= 0 || !inView(ev.x, ev.y, 3000)) continue;
    const e = state.entities.get(ev.entity);
    const r = sector ? px(9) : Math.max((e?.radius || 80) * 1.6, px(14));
    ctx.save();
    ctx.strokeStyle = `rgba(255,213,79,${0.45 + 0.45 * pulse})`;
    ctx.lineWidth = px(2.5);
    ctx.beginPath(); ctx.arc(ev.x, ev.y, r + px(4) * pulse, 0, TAU); ctx.stroke();
    if (sector) { ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(ev.x, ev.y, px(4), 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}
/** Beschriftung der Sondernachfrage (Bildschirmkoordinaten) */
function drawEventLabels(sector = false) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const ev of state.events || []) {
    if (ev.x === undefined || ev.left <= 0 || !inView(ev.x, ev.y, 3000)) continue;
    const e = state.entities.get(ev.entity);
    const [sx, sy] = worldToScreen(ev.x, ev.y);
    const r = sector ? 12 : Math.max((e?.radius || 80) * 1.6 * cam.zoom, 16);
    label(`⚡ ${GOODS[ev.good].name} ${Math.round(ev.price)} Cr`, sx, sy - r - 4, '#ffd54f', '700 12px "Segoe UI", sans-serif');
  }
}

function diamond(x, y, k, col) {
  ctx.fillStyle = col;
  ctx.strokeStyle = '#001018';
  ctx.lineWidth = px(1.2);
  ctx.beginPath();
  ctx.moveTo(x, y - k); ctx.lineTo(x + k, y); ctx.lineTo(x, y + k); ctx.lineTo(x - k, y);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
}

function drawSectorLabels() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const sy of state.systems.values()) {
    if (!inView(sy.x, sy.y, WORLD.SYSTEM_RADIUS)) continue;
    const [sx, syy] = worldToScreen(sy.x, sy.y);
    let marks = '';
    if (sy.start) marks += ' ⌂';
    if (sy.bigyard) marks += ' ⚒';
    label(sy.name + marks, sx, syy + 22, sy.start ? '#ffd54f' : sy.faction ? FACTIONS[sy.faction].color : '#e3ecff');
    if (sy.faction) label(FACTIONS[sy.faction].name, sx, syy - 24, FACTIONS[sy.faction].color, 'italic 600 11px "Segoe UI", sans-serif');
    // Spezialisierungs-Icons: farbige Punkte der Tag-Rohstoffe
    (sy.tags || []).forEach((g, i) => {
      const x = sx - ((sy.tags.length - 1) * 10) / 2 + i * 10;
      ctx.fillStyle = GOODS[g]?.color || '#888';
      ctx.beginPath(); ctx.arc(x, syy + 37, 4, 0, TAU); ctx.fill();
    });
  }
  for (const s of state.sectors.values()) {
    if (s.hubPos && inView(s.hubPos.x, s.hubPos.y, 1000)) {
      const [hx, hy] = worldToScreen(s.hubPos.x, s.hubPos.y);
      label('Hub', hx, hy - 16, STATION_TYPES.hub.accent, '700 11px "Segoe UI", sans-serif');
    }
    const [sx, sy] = worldToScreen(s.bh.x, s.bh.y - WORLD.SECTOR_RADIUS);
    if (sy > -20 && sy < H + 20 && sx > -200 && sx < W + 200) label(`Sektor ${s.name}`, sx, sy - 12, 'rgba(160,190,255,0.75)', '600 14px "Segoe UI", sans-serif');
  }
  for (const z of state.zones.values()) {
    if (!inView(z.x, z.y, z.rx)) continue;
    const [zx, zy] = worldToScreen(z.x, z.y);
    label(ZONE_TYPES[z.type].name, zx, zy, ZONE_TYPES[z.type].color, 'italic 600 12px "Segoe UI", sans-serif');
  }
}

// ---------------- Galaxieansicht ----------------
function visibleHexes() {
  const [x0, y0] = screenToWorld(0, 0);
  const [x1, y1] = screenToWorld(W, H);
  const a = hexAt(x0, y0), b = hexAt(x1, y1), c = hexAt(x0, y1), d = hexAt(x1, y0);
  const qs = [a.q, b.q, c.q, d.q], rs = [a.r, b.r, c.r, d.r];
  const out = [];
  for (let q = Math.min(...qs) - 2; q <= Math.max(...qs) + 2; q++) {
    for (let r = Math.min(...rs) - 2; r <= Math.max(...rs) + 2; r++) {
      const m = hexCenter(q, r);
      if (inView(m.x, m.y, WORLD.HEX_SPACING)) out.push({ q, r });
    }
    if (out.length > 600) break;
  }
  return out;
}

function drawGalaxyView(now) {
  for (const { q, r } of visibleHexes()) {
    const known = state.sectors.get(hexKey(q, r));
    const pts = hexCorners(q, r, 0.98);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = known ? 'rgba(40,70,140,0.18)' : 'rgba(6,8,20,0.75)';
    ctx.fill();
    ctx.strokeStyle = known ? 'rgba(120,170,255,0.45)' : 'rgba(80,100,150,0.15)';
    ctx.lineWidth = px(1);
    ctx.stroke();
  }
  drawBlackHoles(now);
  for (const sy of state.systems.values()) {
    if (!inView(sy.x, sy.y, 1000)) continue;
    ctx.fillStyle = sy.faction ? FACTIONS[sy.faction].color : sy.star?.color || '#fff3c4';
    ctx.beginPath(); ctx.arc(sy.x, sy.y, px(sy.faction ? 3 : 1.6), 0, TAU); ctx.fill();
  }
  drawWormholeLinks(0.8);
  for (const s of selectedShips()) drawMarker(s, shipColor(s), now);
}

function drawGalaxyLabels() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const counts = new Map();
  for (const s of state.ships.values()) {
    if (s.owner !== state.me?.id) continue;
    const h = hexAt(s.x, s.y);
    const k = hexKey(h.q, h.r);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  for (const s of state.sectors.values()) {
    if (!inView(s.bh.x, s.bh.y, WORLD.HEX_SPACING)) continue;
    const [sx, sy] = worldToScreen(s.bh.x, s.bh.y);
    label(s.name, sx, sy - 24, 'rgba(190,210,255,0.9)', '600 12px "Segoe UI", sans-serif');
    if (s.faction) label(FACTIONS[s.faction.id].name, sx, sy - 8, FACTIONS[s.faction.id].color, 'italic 11px "Segoe UI", sans-serif');
  }
  for (const [k, n] of counts) {
    const [q, r] = k.split(',').map(Number);
    const c = hexCenter(q, r);
    if (!inView(c.x, c.y, WORLD.HEX_SPACING)) continue;
    const [sx, sy] = worldToScreen(c.x, c.y);
    const x = sx + 28, y = sy + 18;
    ctx.fillStyle = state.me.color;
    ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#04101e';
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.fillText(String(n), x, y + 0.5);
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
  const mode = viewMode();

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  ctx.translate(-cam.x, -cam.y);

  drawCoverage();

  if (mode === 'galaxy') {
    drawGalaxyView(now);
    ctx.restore();
    drawGalaxyLabels();
    return;
  }
  if (mode === 'sector') {
    drawSectorView(now);
    ctx.restore();
    drawSectorLabels();
    drawEventLabels(true);
    return;
  }

  drawZones(now);
  drawBlackHoles(now);
  drawStars();
  const ents = [...state.entities.values()].filter((e) => inView(e.x, e.y, e.radius * 2.5));
  for (const e of ents) if (e.kind === 'belt') drawBelt(e, t);
  for (const e of ents) if (e.kind === 'wormhole') drawWormhole(e, t);
  for (const e of ents) if (e.kind === 'planet') drawPlanet(e);
  for (const e of ents) if (e.kind === 'station') drawStation(e, t);
  drawEventMarkers(now);

  const hov = state.hover;
  if (hov?.kind === 'entity') { const e = state.entities.get(hov.id); if (e) ring(e.x, e.y, entitySelectRadius(e), 'rgba(255,255,255,0.35)', now, false); }
  const sel = state.selected;
  if (sel?.kind === 'entity') { const e = state.entities.get(sel.id); if (e) ring(e.x, e.y, entitySelectRadius(e), '#ffb74d', now); }

  drawWormholeLinks(0.35);
  drawOrders(now);
  for (const s of state.ships.values()) if (inView(s.rx, s.ry, px(shipScreenSize(SHIP_TYPES[s.type].size, z)))) drawShip(s, now);
  const shipR = (s) => px(shipScreenSize(SHIP_TYPES[s.type].size, z)) * 0.7;
  for (const s of selectedShips()) ring(s.rx, s.ry, shipR(s), '#4fc3f7', now);
  if (sel?.kind === 'ship' && !state.selection.size) { const s = state.ships.get(sel.id); if (s && s.owner !== state.me.id) ring(s.rx, s.ry, shipR(s), '#4fc3f7', now); }
  if (hov?.kind === 'ship') { const s = state.ships.get(hov.id); if (s) ring(s.rx, s.ry, shipR(s), 'rgba(255,255,255,0.35)', now, false); }

  const fx = state.clickFx;
  if (fx && now - fx.t < 500) {
    const p = (now - fx.t) / 500;
    ring(fx.x, fx.y, px(8 + 20 * p), `rgba(129,199,132,${1 - p})`, now, false);
  }

  drawFog();
  ctx.restore();
  drawSystemLabels();
  drawEventLabels();
}

function entitySelectRadius(e) {
  if (e.kind === 'belt') return e.radius;
  return Math.max(e.radius, px(7)) * 1.25;
}

/** Ermittelt Schiff, Objekt, System oder Sektor unter einer Bildschirmposition */
export function pickAt(sx, sy) {
  const [wx, wy] = screenToWorld(sx, sy);
  const z = cam.zoom;
  const mode = viewMode();
  let best = null, bestScore = Infinity;
  const shipList = mode === 'galaxy' ? selectedShips() : state.ships.values();
  for (const s of shipList) {
    const r = mode === 'system' ? Math.max(shipScreenSize(SHIP_TYPES[s.type].size, z) * 0.5, 14) / z : 10 / z;
    const d = Math.hypot(s.rx - wx, s.ry - wy);
    if (d > r) continue;
    const score = d - (s.owner === state.me?.id ? 10 / z : 0);
    if (score < bestScore) { bestScore = score; best = { kind: 'ship', id: s.id }; }
  }
  if (best) return best;
  if (mode === 'system') {
    for (const e of state.entities.values()) {
      const r = e.kind === 'belt' ? e.radius * 0.9 : Math.max(e.radius * 1.25, 18 / z);
      const d = Math.hypot(e.x - wx, e.y - wy);
      if (d > r) continue;
      const score = d / r;
      if (score < bestScore) { bestScore = score; best = { kind: 'entity', id: e.id }; }
    }
    return best;
  }
  if (mode === 'sector') {
    for (const sy of state.systems.values()) {
      const d = Math.hypot(sy.x - wx, sy.y - wy);
      if (d < Math.max(WORLD.SYSTEM_RADIUS, 16 / z) && d < bestScore) { bestScore = d; best = { kind: 'system', id: sy.id }; }
    }
    return best;
  }
  const h = hexAt(wx, wy);
  const k = hexKey(h.q, h.r);
  return state.sectors.has(k) ? { kind: 'sector', id: k } : null;
}
