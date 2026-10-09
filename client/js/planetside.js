// Planetare Ansicht (PRD-3 Kapitel 6.1): Seitenansicht im Canvas, horizontal scrollbar, prozedural gezeichnet.
// Anordnung und Ausstattung sind deterministisch aus der Planeten-ID, das Questhaus steht immer links.
import { GOODS, PLANET_TYPES, RECIPES, ENTERTAINMENT, RECIPE_CATS, planetFeatures, planetRng, factorySlots, recipeCat, effectiveLevel } from '/shared/config.js';
import { state, myShips } from './state.js';

const TAU = Math.PI * 2;
let canvas, ctx, W = 0, H = 0, dpr = 1;
export const scene = { scroll: 0, width: 0, items: [], hover: null, key: '' };

/** Farben je Planetentyp: Himmel oben, Himmel unten, Boden, Bodenkante, Akzent */
const PALETTE = {
  agrar: ['#3d6fb0', '#a8d0e6', '#5d8a3a', '#79a84a', '#e8d27a'],
  ocean: ['#1d4f8a', '#7fc3e0', '#2f6f8f', '#e6d8a8', '#9fe0ff'],
  desert: ['#c26b2b', '#f2c27a', '#c99a55', '#e0b872', '#ffe0a0'],
  mining: ['#3a3440', '#8a7f7a', '#5a4d45', '#7a6a5e', '#ffb74d'],
  ice: ['#5f8fb8', '#d6ecf7', '#c8e3f0', '#f2fbff', '#9fe0ff'],
  urban: ['#1b1f3a', '#5a5f9a', '#3a3d4f', '#55596e', '#ffd54f'],
  resort: ['#ff8a65', '#ffe0b2', '#e0c48a', '#f5deb0', '#4dd0e1'],
  gasgiant: ['#6b4a2b', '#e0b07a', '#8a6a4a', '#a8865e', '#ffcc80'],
  jungle: ['#2f5a3a', '#9fd09a', '#2e5a26', '#3f7a32', '#c6ff00'],
  volcanic: ['#2a0f0f', '#8a2f1a', '#3a2420', '#5a2a1a', '#ff7043'],
  colony: ['#3f4f6f', '#a0b4d0', '#6a6a5a', '#8a8a72', '#80deea'],
  industrial: ['#3a3a3a', '#9a8f80', '#4a4642', '#6a645c', '#ff8a65'],
};
/** Aussehen der Produktionsgebäude nach Ware */
const LOOK = {
  farm: ['grain', 'biomass', 'food', 'fertilizer', 'textiles', 'preserves'],
  drill: ['crude', 'gas', 'helium3', 'shipfuel', 'fuel', 'chemicals', 'acid'],
  silo: ['water', 'ice', 'coolant'],
  mine: ['ore', 'crystals', 'rareearth', 'silicate', 'sulfur', 'raremetals', 'ingots', 'cutters'],
  tower: ['tourists', 'workers'],
};
const lookOf = (g) => Object.keys(LOOK).find((k) => LOOK[k].includes(g)) || 'hall';

export function initPlanetside(c) {
  canvas = c;
  ctx = c.getContext('2d');
}

/** Gebäudeliste eines Planeten (abhängig von Markt, Besitz und Fabriken) */
export function buildItems(e) {
  const m = e.market;
  const feat = planetFeatures(e.id);
  const owned = state.props.get(e.id)?.manage;
  const r = planetRng(e.id, 3);
  const items = [{ kind: 'questhouse', label: 'Questhaus', w: 170 }];
  const rest = [];
  for (const [g, s] of Object.entries(m.goods)) {
    if (s.fac || (s.role !== 'produce' && s.role !== 'consume')) continue;
    rest.push({ kind: s.role === 'produce' ? 'produce' : 'consume', good: g, look: s.role === 'produce' ? lookOf(g) : 'store', label: `${s.role === 'produce' ? '' : 'Lager '}${GOODS[g].name}`, w: 150 + Math.floor(r() * 40) });
  }
  for (const k of feat.fun) rest.push({ kind: 'fun', building: k, label: ENTERTAINMENT[k].name, w: 170 });
  for (const k of ['smuggler', 'beggar', 'dog', 'school']) if (feat[k]) rest.push({ kind: k, label: { smuggler: 'Schmugglerhöhle', beggar: 'Bettler', dog: 'Hund', school: 'Schule' }[k], w: { smuggler: 150, beggar: 80, dog: 80, school: 160 }[k] });
  // deterministisch mischen
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  items.push(...rest);
  // Fabriken und freie Bauplätze (nur sichtbar, wenn der Planet dir bzw. deinem Konsortium gehört oder Fabriken stehen)
  const fac = m.bld?.fac || [];
  fac.forEach((recipe, index) => items.push({ kind: 'factory', recipe, index, label: RECIPES[recipe]?.name || recipe, w: 180 }));
  if (owned) {
    const slots = factorySlots(e.type);
    for (const [cat, n] of Object.entries(slots)) {
      const used = fac.filter((x) => recipeCat(x) === cat).length;
      for (let i = used; i < n; i++) items.push({ kind: 'plot', cat, label: `Bauplatz ${RECIPE_CATS[cat].name}`, w: 150 });
    }
  }
  let x = 120;
  for (const it of items) { it.x = x; x += it.w + 50; }
  return { items, width: x + 80, feat };
}

const dockedHere = (id) => myShips().filter((s) => s.dockedAt === id);
export const canLand = (id) => dockedHere(id).length > 0;

/** Szene zeichnen */
export function renderPlanetside(now) {
  const e = state.entities.get(state.landed);
  if (!e) return;
  dpr = window.devicePixelRatio || 1;
  W = innerWidth; H = innerHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const key = JSON.stringify([e.id, Object.keys(e.market.goods), e.market.bld?.fac, !!state.props.get(e.id)?.manage]);
  if (key !== scene.key) Object.assign(scene, buildItems(e), { key });
  const pal = PALETTE[e.type] || PALETTE.colony;
  const ground = H * 0.68;
  scene.scroll = Math.max(0, Math.min(scene.scroll, Math.max(0, scene.width - W)));
  // Himmel
  const sky = ctx.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, pal[0]);
  sky.addColorStop(1, pal[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, ground);
  drawSkyDetails(e, pal, ground, now);
  // ferne Hügel (Parallaxe)
  const r = planetRng(e.id, 11);
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = shade(pal[2], layer ? -0.15 : -0.3) + (layer ? 'cc' : '88');
    ctx.beginPath();
    ctx.moveTo(0, ground);
    const off = scene.scroll * (0.2 + layer * 0.25);
    const amp = 30 + r() * 50, freq = 0.004 + r() * 0.004, ph = r() * 10;
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, ground - 30 - layer * 10 - amp * (0.5 + 0.5 * Math.sin((x + off) * freq + ph)) * (1 - layer * 0.4));
    ctx.lineTo(W, ground);
    ctx.fill();
  }
  // Boden
  ctx.fillStyle = pal[2];
  ctx.fillRect(0, ground, W, H - ground);
  ctx.fillStyle = pal[3];
  ctx.fillRect(0, ground, W, 6);
  // Gebäude
  ctx.save();
  ctx.translate(-scene.scroll, 0);
  for (const it of scene.items) {
    if (it.x + it.w < scene.scroll - 50 || it.x > scene.scroll + W + 50) continue;
    drawBuilding(it, e, pal, ground, now);
  }
  ctx.restore();
  // Scrollleiste
  if (scene.width > W) {
    const k = W / scene.width;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(20, H - 14, W - 40, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(20 + (scene.scroll / scene.width) * (W - 40), H - 14, k * (W - 40), 5);
  }
}

function drawSkyDetails(e, pal, ground, now) {
  const r = planetRng(e.id, 5);
  // Sonne bzw. Mutterstern
  const sx = W * (0.15 + r() * 0.7), sy = ground * (0.15 + r() * 0.25);
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 90);
  g.addColorStop(0, 'rgba(255,250,220,0.95)');
  g.addColorStop(0.25, 'rgba(255,230,170,0.5)');
  g.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(sx - 90, sy - 90, 180, 180);
  // Monde
  for (let i = 0, n = Math.floor(r() * 3); i < n; i++) {
    const mx = W * r(), my = ground * (0.1 + r() * 0.3), mr = 8 + r() * 22;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.3})`;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
  }
  // Wolken, langsam ziehend
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 6; i++) {
    const w = 120 + r() * 160;
    const x = ((r() * W * 2 + now * 0.004 * (0.5 + r()) - scene.scroll * 0.1) % (W + w * 2)) - w;
    const y = ground * (0.15 + r() * 0.45);
    ctx.beginPath(); ctx.ellipse(x, y, w / 2, 14 + r() * 10, 0, 0, TAU); ctx.fill();
  }
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function rect(x, y, w, h, fill, stroke = 'rgba(0,0,0,0.35)') {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function roof(x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + w / 2, y - h); ctx.lineTo(x + w + 8, y); ctx.closePath(); ctx.fill();
}
function windows(x, y, w, h, rows, cols, lit = '#ffe9a8', now = 0, seed = 1) {
  const r = planetRng('w' + seed, rows * 13 + cols);
  const cw = w / cols, ch = h / rows;
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    ctx.fillStyle = r() < 0.6 ? lit : 'rgba(20,30,50,0.8)';
    ctx.fillRect(x + j * cw + cw * 0.25, y + i * ch + ch * 0.25, cw * 0.5, ch * 0.5);
  }
}

function drawBuilding(it, e, pal, ground, now) {
  const x = it.x, w = it.w, base = ground + 4;
  const hov = scene.hover === it;
  const t = now / 1000;
  const goodCol = it.good ? GOODS[it.good].color : pal[4];
  ctx.save();
  if (hov) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 18; }
  let top = base - 100;
  switch (it.kind === 'produce' || it.kind === 'consume' ? it.look : it.kind) {
    case 'questhouse': {
      rect(x, base - 110, w, 110, '#8d6e63');
      roof(x, base - 110, w, 50, '#5d4037');
      rect(x + w / 2 - 18, base - 50, 36, 50, '#4e342e');
      rect(x + 14, base - 92, w - 28, 30, '#d7ccc8');
      ctx.fillStyle = '#3e2723'; ctx.font = '700 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('AUFTRÄGE', x + w / 2, base - 77);
      const n = (e.market.board || []).length;
      for (let i = 0; i < Math.min(n, 3); i++) { ctx.fillStyle = '#fff8e1'; ctx.fillRect(x + 22 + i * 26, base - 62 + (i % 2) * 2, 18, 10); }
      top = base - 160;
      break;
    }
    case 'farm': {
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? shade(goodCol, -0.2) : goodCol; ctx.fillRect(x + w * 0.45, base - 4 - i * 6, w * 0.55, 6); }
      rect(x, base - 70, w * 0.45, 70, '#a1442f');
      roof(x, base - 70, w * 0.45, 30, '#6d2a1f');
      rect(x + w * 0.12, base - 34, w * 0.2, 34, '#5d2a1a');
      top = base - 110;
      break;
    }
    case 'drill': {
      ctx.strokeStyle = '#37474f'; ctx.lineWidth = 3;
      const cx = x + w * 0.35;
      ctx.beginPath(); ctx.moveTo(cx - 30, base); ctx.lineTo(cx, base - 140); ctx.lineTo(cx + 30, base);
      for (let i = 1; i < 6; i++) { const yy = base - i * 24; const k = (i * 24) / 140 * 30; ctx.moveTo(cx - 30 + k, yy); ctx.lineTo(cx + 30 - k, yy); }
      ctx.stroke();
      rect(x + w * 0.55, base - 46, w * 0.42, 46, '#607d8b');
      ctx.fillStyle = goodCol; ctx.beginPath(); ctx.arc(x + w * 0.76, base - 23, 14, 0, TAU); ctx.fill();
      const bob = Math.sin(t * 2 + x) * 6;
      ctx.fillStyle = '#263238'; ctx.fillRect(cx - 6, base - 150 + bob, 12, 12);
      top = base - 160;
      break;
    }
    case 'silo': {
      for (let i = 0; i < 3; i++) {
        const sx = x + i * (w / 3) + 6, sw = w / 3 - 12, sh = 80 + (i % 2) * 25;
        rect(sx, base - sh, sw, sh, i === 1 ? goodCol : '#b0bec5');
        ctx.fillStyle = '#90a4ae'; ctx.beginPath(); ctx.ellipse(sx + sw / 2, base - sh, sw / 2, 8, 0, Math.PI, TAU); ctx.fill();
      }
      top = base - 125;
      break;
    }
    case 'mine': {
      ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 4;
      const cx = x + w * 0.3;
      ctx.beginPath(); ctx.moveTo(cx - 26, base); ctx.lineTo(cx, base - 120); ctx.lineTo(cx + 26, base); ctx.stroke();
      ctx.fillStyle = '#795548'; ctx.beginPath(); ctx.arc(cx, base - 118, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.arc(cx, base - 118, 12, t * 2, t * 2 + 1.5); ctx.lineTo(cx, base - 118); ctx.fill();
      ctx.fillStyle = shade(goodCol, -0.1);
      ctx.beginPath(); ctx.moveTo(x + w * 0.5, base); ctx.lineTo(x + w * 0.75, base - 50); ctx.lineTo(x + w, base); ctx.fill();
      top = base - 145;
      break;
    }
    case 'tower': {
      rect(x + w * 0.15, base - 150, w * 0.35, 150, '#546e7a');
      rect(x + w * 0.55, base - 110, w * 0.35, 110, '#607d8b');
      windows(x + w * 0.15, base - 145, w * 0.35, 140, 8, 3, '#ffe9a8', now, x);
      windows(x + w * 0.55, base - 105, w * 0.35, 100, 6, 3, '#ffe9a8', now, x + 1);
      top = base - 175;
      break;
    }
    case 'store': {
      rect(x, base - 60, w, 60, '#78909c');
      ctx.fillStyle = '#546e7a'; ctx.beginPath(); ctx.moveTo(x - 6, base - 60); ctx.quadraticCurveTo(x + w / 2, base - 95, x + w + 6, base - 60); ctx.fill();
      rect(x + w * 0.3, base - 38, w * 0.4, 38, '#455a64');
      for (let i = 0; i < 4; i++) { ctx.fillStyle = shade(goodCol, -0.1 * i); ctx.fillRect(x + 8 + i * 12, base - 14, 10, 14); }
      top = base - 115;
      break;
    }
    case 'hall': {
      rect(x, base - 70, w, 70, '#8d8d8d');
      ctx.fillStyle = shade('#8d8d8d', -0.3);
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + i * w / 4, base - 70); ctx.lineTo(x + (i + 0.5) * w / 4, base - 90); ctx.lineTo(x + (i + 1) * w / 4, base - 70); ctx.fill(); }
      ctx.fillStyle = goodCol; ctx.fillRect(x + 10, base - 50, w - 20, 8);
      top = base - 115;
      break;
    }
    case 'factory': {
      rect(x, base - 80, w, 80, '#6d7b85');
      ctx.fillStyle = '#4a5560';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * w / 3, base - 80); ctx.lineTo(x + i * w / 3, base - 104); ctx.lineTo(x + (i + 1) * w / 3, base - 80); ctx.fill(); }
      rect(x + w - 30, base - 140, 16, 60, '#5d4037');
      for (let i = 0; i < 4; i++) {
        const p = ((t * 0.6 + i / 4) % 1);
        ctx.fillStyle = `rgba(220,220,220,${0.5 * (1 - p)})`;
        ctx.beginPath(); ctx.arc(x + w - 22 + p * 30, base - 145 - p * 60, 8 + p * 14, 0, TAU); ctx.fill();
      }
      windows(x + 10, base - 60, w - 50, 30, 1, 5, '#ffcc80', now, x);
      top = base - 160;
      break;
    }
    case 'plot': {
      ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      ctx.strokeRect(x, base - 60, w, 60);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, base - 60, w, 60);
      ctx.fillStyle = '#ffeb3b'; ctx.fillRect(x + w / 2 - 2, base - 90, 4, 30);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + w / 2 - 22, base - 100, 44, 18);
      ctx.fillStyle = '#333'; ctx.font = '700 11px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FREI', x + w / 2, base - 91);
      top = base - 115;
      break;
    }
    case 'fun': drawFun(it, x, w, base, t); top = base - 150; break;
    case 'smuggler': {
      ctx.fillStyle = '#3e2723';
      ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + w / 2, base - 150, x + w, base); ctx.fill();
      ctx.fillStyle = '#0d0806'; ctx.beginPath(); ctx.ellipse(x + w / 2, base, 26, 40, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = `rgba(255,170,60,${0.5 + 0.3 * Math.sin(t * 5)})`; ctx.beginPath(); ctx.arc(x + w / 2 + 8, base - 16, 3, 0, TAU); ctx.fill();
      top = base - 110;
      break;
    }
    case 'beggar': {
      const cx = x + w / 2;
      ctx.fillStyle = '#6d4c41'; ctx.fillRect(cx - 12, base - 30, 24, 30);
      ctx.fillStyle = '#ffcc80'; ctx.beginPath(); ctx.arc(cx, base - 38, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.arc(cx, base - 42, 10, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#b0bec5'; ctx.fillRect(cx + 14, base - 8, 14, 8);
      top = base - 70;
      break;
    }
    case 'dog': {
      const cx = x + w / 2, wag = Math.sin(t * 12) * 0.5;
      ctx.fillStyle = '#a1887f';
      ctx.fillRect(cx - 18, base - 22, 34, 14);
      ctx.fillRect(cx - 16, base - 10, 5, 10); ctx.fillRect(cx + 8, base - 10, 5, 10);
      ctx.beginPath(); ctx.arc(cx + 20, base - 26, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#6d4c41'; ctx.beginPath(); ctx.ellipse(cx + 17, base - 33, 4, 7, 0.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#a1887f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 18, base - 20); ctx.lineTo(cx - 30, base - 32 + wag * 10); ctx.stroke();
      if (state.dogUntil > state.time) { ctx.fillStyle = '#e57373'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♥', cx + 20, base - 46 - Math.abs(Math.sin(t * 3)) * 6); }
      top = base - 60;
      break;
    }
    case 'school': {
      rect(x, base - 90, w, 90, '#c62828');
      roof(x, base - 90, w, 34, '#7f1d1d');
      rect(x + w / 2 - 6, base - 150, 12, 30, '#7f1d1d');
      ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(x + w / 2, base - 130, 6, 0, TAU); ctx.fill();
      windows(x + 10, base - 80, w - 20, 40, 1, 4, '#fff8e1', now, x);
      rect(x + w / 2 - 14, base - 34, 28, 34, '#5d4037');
      top = base - 160;
      break;
    }
  }
  ctx.restore();
  // Beschriftung und Level
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = '600 13px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText(it.label, x + w / 2 + 1, top + 1);
  ctx.fillStyle = hov ? '#ffffff' : '#f0f4ff';
  ctx.fillText(it.label, x + w / 2, top);
  const lvl = it.good ? e.market.bld?.lvl?.[it.good] || 0 : 0;
  if (lvl) {
    const eff = effectiveLevel(lvl, !!e.owner);
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffd54f';
    ctx.fillText(`Level ${eff}${eff < lvl ? ` (${lvl})` : ''}`, x + w / 2, top - 16);
  }
  it.top = top - 20;
  it.base = base;
}

function drawFun(it, x, w, base, t) {
  switch (it.building) {
    case 'tavern':
      rect(x, base - 80, w, 80, '#6d4c41');
      roof(x, base - 80, w, 30, '#3e2723');
      windows(x + 10, base - 66, w - 20, 30, 1, 4, '#ffb74d', 0, x);
      ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.arc(x + w - 20, base - 90, 10, 0, TAU); ctx.fill();
      break;
    case 'casino': {
      rect(x, base - 100, w, 100, '#311b92');
      for (let i = 0; i < 12; i++) {
        const on = Math.floor(t * 6 + i) % 3 === 0;
        ctx.fillStyle = on ? '#ffeb3b' : '#7e57c2';
        ctx.beginPath(); ctx.arc(x + 8 + i * (w - 16) / 11, base - 104, 4, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#ffd54f'; ctx.font = '700 16px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('★ CASINO ★', x + w / 2, base - 70);
      rect(x + w / 2 - 20, base - 40, 40, 40, '#4a148c');
      break;
    }
    case 'fair': {
      const cols = ['#e53935', '#fdd835'];
      for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i % 2]; ctx.beginPath(); ctx.moveTo(x + i * w / 6, base - 60); ctx.lineTo(x + w / 2, base - 120); ctx.lineTo(x + (i + 1) * w / 6, base - 60); ctx.fill(); }
      rect(x + 6, base - 60, w - 12, 60, '#fff3e0');
      ctx.fillStyle = '#e53935'; ctx.fillRect(x + 6, base - 60, w - 12, 10);
      break;
    }
    case 'racetrack': {
      ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.ellipse(x + w / 2, base - 20, w / 2 - 6, 18, 0, 0, TAU); ctx.stroke();
      const a = t * 1.5;
      for (let i = 0; i < 3; i++) {
        const px = x + w / 2 + Math.cos(a + i * 0.4) * (w / 2 - 6), py = base - 20 + Math.sin(a + i * 0.4) * 18;
        ctx.fillStyle = ['#795548', '#212121', '#bcaaa4'][i]; ctx.fillRect(px - 6, py - 10, 12, 8);
      }
      rect(x + w * 0.3, base - 90, w * 0.4, 40, '#fafafa');
      ctx.fillStyle = '#1565c0'; ctx.fillRect(x + w * 0.3, base - 96, w * 0.4, 8);
      break;
    }
    case 'mine': {
      ctx.fillStyle = '#5d4037';
      ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + w * 0.2, base - 90); ctx.lineTo(x + w * 0.8, base - 100); ctx.lineTo(x + w, base); ctx.fill();
      ctx.fillStyle = '#1b0f0a'; ctx.fillRect(x + w / 2 - 22, base - 50, 44, 50);
      ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 6; ctx.strokeRect(x + w / 2 - 25, base - 53, 50, 53);
      ctx.fillStyle = '#ffb74d'; ctx.beginPath(); ctx.arc(x + w / 2 - 34, base - 60, 4 + Math.sin(t * 8), 0, TAU); ctx.fill();
      break;
    }
  }
}

/** Gebäude unter einer Bildschirmposition */
export function pickBuilding(sx, sy) {
  const wx = sx + scene.scroll;
  for (const it of scene.items) if (wx >= it.x - 10 && wx <= it.x + it.w + 10 && sy >= (it.top ?? 0) && sy <= (it.base ?? H) + 10) return it;
  return null;
}
