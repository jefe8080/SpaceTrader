// PRD 15: Illustrationen der neuen Schiffstypen im bestehenden Comic-Steampunk-Stil.
// Kleine 3D-Szene aus Platten, Zylindern und Türmen, Dreiviertelansicht mit Nase nach rechts,
// Zellschattierung, kräftige Konturen, Messingkanten, Nieten, Schmutz und glühende Triebwerke.
// Ausgabe: 512 × 512 RGBA mit 32 px transparentem Rand (siehe docs/art/ships/README.md).

const YAW = 0.62, PITCH = 0.92;
const cy = Math.cos(YAW), sy = Math.sin(YAW), cp = Math.cos(PITCH), sp = Math.sin(PITCH);
const LIGHT = norm([-0.55, 0.55, 0.65]);
function norm(v) { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const rot = (p) => [p[0] * cy - p[1] * sy, p[0] * sy + p[1] * cy, p[2]];
/** Weltpunkt -> Bildschirm (x rechts, y unten) und Tiefe (größer = näher) */
function proj(p) { const r = rot(p); return { x: r[0], y: -(r[2] * cp - r[1] * sp), d: r[1] * cp + r[2] * sp }; }
const CAM = [0, cp, sp];

// ---------- Materialien ----------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const MAT = {
  cream: { base: '#e9dcc0', plates: true, rust: 0.35 },
  teal: { base: '#5f8f95', plates: true, rust: 0.4 },
  steel: { base: '#5d6c7a', plates: true, rust: 0.25 },
  navy: { base: '#36475a', plates: true, rust: 0.2 },
  gunmetal: { base: '#3b3f45', plates: true, rust: 0.25 },
  red: { base: '#a8352b', plates: true, rust: 0.3 },
  rust: { base: '#8a5233', plates: true, rust: 0.5 },
  brass: { base: '#c9892d', plates: false, metal: true },
  copper: { base: '#b5622f', plates: false, metal: true },
  dark: { base: '#2a2622', plates: false },
  glass: { base: '#2f5a7a', glass: true },
  nozzle: { base: '#2b1a10', glow: '#ffb347' },
  glowBlue: { base: '#1e3f55', glow: '#7fe3ff' },
};

// ---------- Primitive ----------
function addFaces(scene, verts, faces, mat, center) {
  for (const idx of faces) {
    let pts = idx.map((i) => verts[i]);
    pts = pts.filter((p, i) => i === 0 || Math.hypot(...sub(p, pts[i - 1])) > 1e-6);
    if (pts.length < 3) continue;
    let n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
    if (dot(n, sub(c, center)) < 0) { n = n.map((x) => -x); pts = pts.reverse(); }
    scene.push({ pts, n, mat: typeof mat === 'function' ? mat(n) : mat, c });
  }
}
/** Platte/Rumpfsegment entlang x: hinten W×H, vorne verjüngt (tw, th), Höhenversatz vorne dz */
export function hull(scene, [x, y, z], L, W, H, mat, o = {}) {
  const tw = o.tw ?? 1, th = o.th ?? 1, dz = o.dz ?? 0, bw = o.bw ?? 1, bh = o.bh ?? 1, bz = o.bz ?? 0;
  const xb = x - L / 2, xf = x + L / 2;
  const v = [
    [xb, y - W * bw / 2, z + bz - H * bh / 2], [xb, y + W * bw / 2, z + bz - H * bh / 2], [xb, y + W * bw / 2, z + bz + H * bh / 2], [xb, y - W * bw / 2, z + bz + H * bh / 2],
    [xf, y - W * tw / 2, z + dz - H * th / 2], [xf, y + W * tw / 2, z + dz - H * th / 2], [xf, y + W * tw / 2, z + dz + H * th / 2], [xf, y - W * tw / 2, z + dz + H * th / 2],
  ];
  addFaces(scene, v, [[0, 1, 2, 3], [4, 5, 6, 7], [3, 2, 6, 7], [0, 1, 5, 4], [0, 3, 7, 4], [1, 2, 6, 5]], o.front ? (n) => (n[0] > 0.7 ? o.front : mat) : mat, [x, y, z + (dz + bz) / 2]);
}
/** Zylinder entlang x (Triebwerke, Tanks, Rohre) bzw. z (Turmsockel) */
export function cyl(scene, [x, y, z], L, r, mat, o = {}) {
  const n = o.sides ?? 14, r2 = o.r2 ?? r, axis = o.axis ?? 'x';
  const v = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = (rr, t) => (axis === 'x' ? [x + t, y + Math.cos(a) * rr, z + Math.sin(a) * rr] : [x + Math.cos(a) * rr, y + Math.sin(a) * rr, z + t]);
    v.push(p(r, -L / 2), p(r2, L / 2));
  }
  const faces = [];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([2 * i, 2 * j, 2 * j + 1, 2 * i + 1]); }
  addFaces(scene, v, faces, mat, [x, y, z]);
  const back = Array.from({ length: n }, (_, i) => 2 * i), front = Array.from({ length: n }, (_, i) => 2 * i + 1);
  addFaces(scene, v, [back], o.backMat || mat, axis === 'x' ? [x + 1, y, z] : [x, y, z + 1]);
  addFaces(scene, v, [front], o.frontMat || mat, axis === 'x' ? [x - 1, y, z] : [x, y, z - 1]);
}
/** Triebwerk mit glühender Düse hinten */
export function engine(scene, p, L, r, mat = MAT.copper) {
  cyl(scene, p, L, r, mat, { r2: r * 0.85, backMat: MAT.nozzle });
  cyl(scene, [p[0] - L / 2 - 1.5, p[1], p[2]], 3, r * 1.12, MAT.brass, { backMat: MAT.nozzle });
  scene.glows.push({ p: [p[0] - L / 2 - 3, p[1], p[2]], r: r * 2.2, color: '#ffb347' });
}
/** Geschützturm mit Rohren */
export function turret(scene, [x, y, z], s, n = 2, mat = MAT.steel) {
  cyl(scene, [x, y, z + s * 0.25], s * 0.5, s * 0.9, MAT.brass, { axis: 'z' });
  hull(scene, [x, y, z + s * 0.9], s * 1.5, s * 1.3, s * 0.8, mat, { tw: 0.75, th: 0.8 });
  for (let i = 0; i < n; i++) cyl(scene, [x + s * 1.6, y + (i - (n - 1) / 2) * s * 0.45, z + s * 0.95], s * 1.8, s * 0.13, MAT.dark, { sides: 8 });
}
export function mast(scene, [x, y, z], h) { scene.lines.push({ a: [x, y, z], b: [x, y, z + h], tip: true }); }
export function light(scene, p, color = '#ffd36b') { scene.lights.push({ p, color }); }

/** Deterministischer Zufall je Bauteil, damit Neuberechnungen gleich aussehen */
function prng(seed) { let s = Math.floor(seed * 9301 + 49297) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const DECK = [MAT.brass, MAT.dark, MAT.steel, MAT.copper, MAT.cream];
/**
 * Rumpfsegment mit Steampunk-Ausstattung: Messingspanten, Seitenrohre und Kleinteile auf dem Deck.
 * detail: Anzahl Deckaufbauten, ribs: Anzahl Spanten
 */
export function bulk(scene, [x, y, z], L, W, H, mat, o = {}) {
  hull(scene, [x, y, z], L, W, H, mat, o);
  const R = prng(x * 3.1 + y * 7.7 + z * 1.3 + L);
  const tw = o.tw ?? 1, th = o.th ?? 1;
  for (let i = 1; i <= (o.ribs ?? 0); i++) {
    const t = i / ((o.ribs ?? 0) + 1), f = 1 + (tw - 1) * t, h = 1 + (th - 1) * t;
    hull(scene, [x - L / 2 + L * t, y, z + (o.dz ?? 0) * t], 1.6, W * f + 1.4, H * h + 1.4, MAT.brass);
  }
  if (o.pipes) for (const side of [-1, 1]) cyl(scene, [x - L * 0.05, y + side * (W / 2 + 0.9), z - H * 0.15], L * 0.8, 0.9, MAT.copper, { sides: 8 });
  const top = z + H / 2;
  for (let i = 0; i < (o.detail ?? 0); i++) {
    const px = x - L * 0.4 + R() * L * 0.7, py = y + (R() - 0.5) * W * 0.7, kind = R();
    const m = DECK[Math.floor(R() * DECK.length)];
    if (kind < 0.4) hull(scene, [px, py, top + 1.2], 2 + R() * 5, 2 + R() * 4, 2 + R() * 2.5, m);
    else if (kind < 0.65) cyl(scene, [px, py, top + 1.6], 2 + R() * 3, 1 + R() * 1.4, MAT.copper, { axis: 'z', sides: 10, frontMat: MAT.dark });
    else if (kind < 0.85) cyl(scene, [px, py, top + 1], 5 + R() * 8, 0.7, R() < 0.5 ? MAT.brass : MAT.copper, { sides: 8 });
    else { cyl(scene, [px, py, top + 3], 6, 0.9, MAT.dark, { axis: 'z', sides: 8 }); scene.lights.push({ p: [px, py, top + 6.2], color: '#ff9b4a' }); }
  }
}

// ---------- Zeichnen ----------
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const rgb = (c, k = 1, add = [0, 0, 0]) => `rgb(${c.map((v, i) => Math.max(0, Math.min(255, Math.round(v * k + add[i])))).join(',')})`;
const INK = '#1b130c';

export function render(canvas, build, seed = 1) {
  const scene = []; scene.glows = []; scene.lines = []; scene.lights = [];
  build(scene);
  const R = rnd(seed);
  const vis = scene.filter((f) => dot(rot(f.n), CAM) > 0.02);
  const all = vis.flatMap((f) => f.pts.map(proj));
  // Glühen samt Radius einpassen, damit der transparente Rand frei bleibt
  for (const g of scene.glows) for (const [dx, dy, dz] of [[-1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]]) all.push(proj([g.p[0] + dx * g.r, g.p[1] + dy * g.r, g.p[2] + dz * g.r]));
  const minX = Math.min(...all.map((p) => p.x)), maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y)), maxY = Math.max(...all.map((p) => p.y));
  const S = 1024, M = 88;
  const k = Math.min((S - 2 * M) / (maxX - minX), (S - 2 * M) / (maxY - minY));
  const ox = S / 2 - ((minX + maxX) / 2) * k, oy = S / 2 - ((minY + maxY) / 2) * k;
  const big = document.createElement('canvas'); big.width = big.height = S;
  const g = big.getContext('2d');
  g.lineJoin = 'round'; g.lineCap = 'round';
  const P = (p) => { const q = proj(p); return [q.x * k + ox, q.y * k + oy]; };
  vis.sort((a, b) => proj(a.c).d - proj(b.c).d);
  for (const f of vis) {
    const pts = f.pts.map(P);
    const n = rot(f.n);
    const s = dot(n, LIGHT);
    const base = hex(f.mat.base);
    const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    // Zellschattierung in drei Stufen, warmes Licht, kühle Schatten
    const lvl = s > 0.5 ? 1 : s > 0.05 ? 0 : -1;
    let fill = lvl === 1 ? rgb(base, 1.12, [18, 10, 0]) : lvl === 0 ? rgb(base, 0.9) : rgb(base, 0.55, [0, 4, 14]);
    if (f.mat.glow) fill = rgb(base, 1);
    path();
    if (f.mat.metal) {
      const [x0, y0] = pts[0], [x1, y1] = pts[Math.floor(pts.length / 2)];
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, rgb(base, lvl === 1 ? 1.35 : 1.05, [30, 20, 0])); gr.addColorStop(0.5, rgb(base, lvl === -1 ? 0.6 : 0.95)); gr.addColorStop(1, rgb(base, 0.6));
      g.fillStyle = gr;
    } else g.fillStyle = fill;
    g.fill();
    const area = Math.abs(pts.reduce((a, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return a + x * y2 - x2 * y; }, 0)) / 2;
    if (f.mat.glow) {
      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cyy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const gr = g.createRadialGradient(cx, cyy, 0, cx, cyy, Math.sqrt(area));
      gr.addColorStop(0, '#fff6d8'); gr.addColorStop(0.45, f.mat.glow); gr.addColorStop(1, 'rgba(120,40,10,0.9)');
      path(); g.fillStyle = gr; g.fill();
    }
    if (f.mat.glass) {
      g.save(); path(); g.clip();
      const [x0, y0] = pts[0];
      g.strokeStyle = 'rgba(220,245,255,0.75)'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(x0 + 6, y0 + 4); g.lineTo(x0 + 30, y0 + 22); g.stroke();
      g.restore();
    }
    // Plattenkante in Messing, Nieten, Fugen und Rost
    if (f.mat.plates && area > 900) {
      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cyy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const inset = pts.map(([x, y]) => [cx + (x - cx) * 0.84, cyy + (y - cyy) * 0.84]);
      g.save(); path(); g.clip();
      g.beginPath(); inset.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
      g.strokeStyle = lvl === -1 ? 'rgba(120,70,20,0.85)' : 'rgba(214,146,52,0.95)'; g.lineWidth = 3.2; g.stroke();
      // Fugen: Platten in Segmente teilen
      const seg = Math.max(1, Math.round(Math.sqrt(area) / 70));
      g.strokeStyle = 'rgba(27,19,12,0.55)'; g.lineWidth = 1.6;
      for (let i = 1; i < seg; i++) {
        const t = i / seg, a = inset[0], b = inset[1], c2 = inset[inset.length - 1], d = inset[2] || inset[1];
        g.beginPath(); g.moveTo(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); g.lineTo(c2[0] + (d[0] - c2[0]) * t, c2[1] + (d[1] - c2[1]) * t); g.stroke();
      }
      // Rost und Schmutz
      const spots = Math.floor((area / 700) * f.mat.rust);
      for (let i = 0; i < spots; i++) {
        const a = inset[Math.floor(R() * inset.length)], b = inset[Math.floor(R() * inset.length)], t = R();
        const x = a[0] + (b[0] - a[0]) * t + (R() - 0.5) * 14, y = a[1] + (b[1] - a[1]) * t + (R() - 0.5) * 14;
        g.fillStyle = R() < 0.5 ? 'rgba(150,80,30,0.45)' : 'rgba(40,25,15,0.35)';
        g.beginPath(); g.ellipse(x, y, 1.5 + R() * 4, 1 + R() * 2.5, R() * 3, 0, Math.PI * 2); g.fill();
      }
      // Nieten entlang der Messingkante
      for (let i = 0; i < inset.length; i++) {
        const a = inset[i], b = inset[(i + 1) % inset.length];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const cnt = Math.max(2, Math.floor(len / 26));
        for (let j = 0; j < cnt; j++) {
          const t = (j + 0.5) / cnt, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
          g.fillStyle = '#3a2410'; g.beginPath(); g.arc(x + 0.8, y + 0.8, 2.3, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#f2c06a'; g.beginPath(); g.arc(x, y, 1.7, 0, Math.PI * 2); g.fill();
        }
      }
      // Glanzkante oben
      if (lvl === 1) { g.strokeStyle = 'rgba(255,248,225,0.55)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(...inset[inset.length - 1]); g.lineTo(...inset[0]); g.stroke(); }
      g.restore();
    }
    path(); g.strokeStyle = INK; g.lineWidth = f.mat.glow ? 2 : 3.2; g.stroke();
  }
  // Masten, Lichter, Triebwerksglühen
  for (const l of scene.lines) {
    const a = P(l.a), b = P(l.b);
    g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
    g.strokeStyle = '#d99a3c'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
    if (l.tip) scene.lights.push({ p: l.b, color: '#ffcf5a' });
  }
  for (const L of scene.lights) {
    const [x, y] = P(L.p);
    const gr = g.createRadialGradient(x, y, 0, x, y, 14); gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.3, L.color); gr.addColorStop(1, 'rgba(255,180,60,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill();
  }
  g.globalCompositeOperation = 'lighter';
  for (const gl of scene.glows) {
    const [x, y] = P(gl.p), r = gl.r * k;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,240,200,0.9)'); gr.addColorStop(0.35, 'rgba(255,150,50,0.55)'); gr.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, 512, 512);
  c.imageSmoothingQuality = 'high';
  c.drawImage(big, 0, 0, 512, 512);
  return canvas;
}

