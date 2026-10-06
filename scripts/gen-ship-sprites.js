// Erzeugt Schiffsgrafiken (SVG, Nase nach rechts) aus Parametern. #ff00ff wird zur Laufzeit durch die Spielerfarbe ersetzt.
// Aufruf: node scripts/gen-ship-sprites.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'assets');

/**
 * Parameter:
 * len: Rumpflänge (x von 64-len/2 bis 64+len/2), w: halbe Rumpfbreite, nose: Spitzheit 0..1,
 * wing: { span, sweep, root, tip } oder null, pods: Anzahl Frachtcontainer je Seite, engines: Triebwerke,
 * drill: Bohrkopf, ring: Habitatring, fins: Heckflossen, hull: [hell, dunkel], glass: Cockpitfarbe
 */
const SHIPS = {
  bussard:    { len: 92, w: 11, nose: 0.9, wing: { span: 40, sweep: 26, root: 30, tip: 8 }, engines: 2, fins: true, hull: ['#f5f7f8', '#607d8b'] },
  grubenhund: { len: 84, w: 18, nose: 0.3, wing: { span: 22, sweep: 6, root: 28, tip: 20 }, pods: 1, engines: 2, drill: true, hull: ['#ffe0b2', '#8d6e63'] },
  pelikan:    { len: 96, w: 16, nose: 0.6, wing: { span: 30, sweep: 14, root: 34, tip: 14 }, pods: 2, engines: 3, hull: ['#e3f2fd', '#546e7a'] },
  seekuh:     { len: 100, w: 22, nose: 0.4, wing: { span: 18, sweep: 8, root: 36, tip: 22 }, pods: 3, engines: 3, hull: ['#eceff1', '#607d8b'] },
  mammut:     { len: 104, w: 26, nose: 0.2, wing: { span: 16, sweep: 4, root: 40, tip: 30 }, pods: 2, engines: 4, drill: true, hull: ['#ffecb3', '#6d4c41'] },
  kondor:     { len: 112, w: 15, nose: 0.95, wing: { span: 44, sweep: 34, root: 44, tip: 10 }, pods: 1, engines: 4, fins: true, hull: ['#f5f5f5', '#455a64'] },
  wal:        { len: 112, w: 30, nose: 0.35, wing: { span: 10, sweep: 4, root: 44, tip: 36 }, pods: 4, engines: 4, hull: ['#e0f2f1', '#37474f'] },
  titan:      { len: 116, w: 24, nose: 0.55, wing: { span: 30, sweep: 18, root: 54, tip: 26 }, pods: 4, engines: 5, ring: true, fins: true, hull: ['#eceff1', '#37474f'] },
  leviathan:  { len: 120, w: 32, nose: 0.3, wing: { span: 22, sweep: 10, root: 60, tip: 40 }, pods: 5, engines: 6, ring: true, hull: ['#cfd8dc', '#263238'] },
  // Fraktionsschiffe: eigene Silhouetten, Akzent über #ff00ff
  f_miners:   { len: 108, w: 26, nose: 0.25, wing: { span: 26, sweep: 6, root: 44, tip: 30 }, pods: 3, engines: 4, drill: true, fins: true, hull: ['#ffd54f', '#5d4037'] },
  f_tech:     { len: 112, w: 14, nose: 1, wing: { span: 46, sweep: 40, root: 50, tip: 6 }, engines: 3, fins: true, ring: true, hull: ['#e0f7fa', '#00838f'] },
  f_nomads:   { len: 110, w: 20, nose: 0.7, wing: { span: 38, sweep: 22, root: 36, tip: 16 }, pods: 3, engines: 5, hull: ['#ffccbc', '#bf360c'] },
  f_order:    { len: 114, w: 18, nose: 0.85, wing: { span: 48, sweep: 30, root: 40, tip: 20 }, engines: 2, ring: true, fins: true, hull: ['#f3e5f5', '#4a148c'] },
  f_league:   { len: 112, w: 24, nose: 0.5, wing: { span: 28, sweep: 12, root: 46, tip: 24 }, pods: 4, engines: 4, hull: ['#e8f5e9', '#1b5e20'] },
  f_syndicate: { len: 116, w: 28, nose: 0.35, wing: { span: 34, sweep: 16, root: 50, tip: 30 }, pods: 2, engines: 6, fins: true, hull: ['#ffcdd2', '#3e2723'] },
};

const r1 = (v) => Math.round(v * 10) / 10;

function svg(p) {
  const cx = 64, cy = 64;
  const x0 = cx - p.len / 2, x1 = cx + p.len / 2;
  const w = p.w;
  const noseLen = 8 + p.nose * 22;
  const parts = [];
  parts.push(`<defs>
    <linearGradient id="hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.hull[0]}"/><stop offset="1" stop-color="${p.hull[1]}"/></linearGradient>
    <linearGradient id="wing" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.hull[1]}"/><stop offset="1" stop-color="${p.hull[0]}"/></linearGradient>
    <radialGradient id="flame" cx="100%" cy="50%" r="100%"><stop offset="0" stop-color="#fff3c4"/><stop offset="0.5" stop-color="#ffab40"/><stop offset="1" stop-color="#ff6d00" stop-opacity="0"/></radialGradient>
  </defs>`);
  // Flügel
  if (p.wing) {
    const { span, sweep, root, tip } = p.wing;
    const rx = cx - root / 2 + 4;
    for (const s of [-1, 1]) {
      const pts = [[rx, cy + s * w * 0.8], [rx + root, cy + s * w * 0.8], [rx + root - sweep + tip, cy + s * (w + span)], [rx + root - sweep - tip * 0.2, cy + s * (w + span)]];
      parts.push(`<path d="M${pts.map((q) => q.map(r1).join(' ')).join(' L')} Z" fill="url(#wing)" stroke="#1c2529" stroke-width="2"/>`);
      // Akzentstreifen an der Flügelspitze
      const a = pts[2], b = pts[3];
      parts.push(`<path d="M${r1(b[0])} ${r1(b[1])} L${r1(a[0])} ${r1(a[1])} L${r1(a[0] - 4)} ${r1(a[1] - s * 6)} L${r1(b[0] + 2)} ${r1(b[1] - s * 6)} Z" fill="#ff00ff"/>`);
    }
  }
  // Frachtcontainer
  for (let i = 0; i < (p.pods || 0); i++) {
    const pw = Math.min(16, (p.len * 0.55) / p.pods - 3);
    const px = cx - p.len * 0.3 + i * (pw + 3);
    for (const s of [-1, 1]) {
      parts.push(`<rect x="${r1(px)}" y="${r1(s < 0 ? cy - w - 9 : cy + w - 1)}" width="${r1(pw)}" height="10" rx="2" fill="${i % 2 ? '#90a4ae' : '#b0bec5'}" stroke="#263238" stroke-width="1.5"/>`);
    }
  }
  // Habitatring
  if (p.ring) parts.push(`<ellipse cx="${r1(cx - p.len * 0.12)}" cy="${cy}" rx="7" ry="${r1(w + 12)}" fill="none" stroke="#78909c" stroke-width="4"/><ellipse cx="${r1(cx - p.len * 0.12)}" cy="${cy}" rx="7" ry="${r1(w + 12)}" fill="none" stroke="#ff00ff" stroke-width="1.5" stroke-dasharray="3 4"/>`);
  // Triebwerke
  const n = p.engines || 1;
  const eh = Math.min(10, (2 * w + 4) / n - 2);
  for (let i = 0; i < n; i++) {
    const ey = cy - ((n - 1) * (eh + 2)) / 2 + i * (eh + 2);
    parts.push(`<ellipse cx="${r1(x0 - 4)}" cy="${r1(ey)}" rx="8" ry="${r1(eh / 2)}" fill="url(#flame)"/>`);
    parts.push(`<rect x="${r1(x0 - 2)}" y="${r1(ey - eh / 2)}" width="9" height="${r1(eh)}" rx="2" fill="#37474f" stroke="#1c2529" stroke-width="1"/>`);
  }
  // Rumpf
  const body = `M${r1(x0 + 4)} ${r1(cy - w)} L${r1(x1 - noseLen)} ${r1(cy - w * 0.9)} Q${r1(x1)} ${r1(cy - w * (0.5 - p.nose * 0.4))} ${r1(x1)} ${cy} Q${r1(x1)} ${r1(cy + w * (0.5 - p.nose * 0.4))} ${r1(x1 - noseLen)} ${r1(cy + w * 0.9)} L${r1(x0 + 4)} ${r1(cy + w)} Q${r1(x0)} ${cy} ${r1(x0 + 4)} ${r1(cy - w)} Z`;
  parts.push(`<path d="${body}" fill="url(#hull)" stroke="#1c2529" stroke-width="2.5"/>`);
  // Panellinien und Spielerfarbe
  parts.push(`<path d="M${r1(x0 + 10)} ${cy} L${r1(x1 - noseLen - 4)} ${cy}" stroke="#263238" stroke-width="1" opacity="0.45"/>`);
  parts.push(`<rect x="${r1(cx - p.len * 0.18)}" y="${r1(cy - w + 2)}" width="${r1(Math.max(6, p.len * 0.08))}" height="${r1(2 * w - 4)}" fill="#ff00ff" opacity="0.9"/>`);
  if (p.fins) for (const s of [-1, 1]) parts.push(`<path d="M${r1(x0 + 4)} ${r1(cy + s * w * 0.6)} L${r1(x0 - 4)} ${r1(cy + s * (w + 7))} L${r1(x0 + 16)} ${r1(cy + s * w * 0.8)} Z" fill="#ff00ff" stroke="#1c2529" stroke-width="1.5"/>`);
  // Bohrkopf
  if (p.drill) {
    parts.push(`<path d="M${r1(x1 - 4)} ${r1(cy - w * 0.6)} L${r1(x1 + 12)} ${cy} L${r1(x1 - 4)} ${r1(cy + w * 0.6)} Z" fill="#ffca28" stroke="#5d4037" stroke-width="2"/>`);
    parts.push(`<path d="M${r1(x1)} ${r1(cy - w * 0.35)} L${r1(x1 + 6)} ${r1(cy - 2)} M${r1(x1)} ${r1(cy + w * 0.35)} L${r1(x1 + 6)} ${r1(cy + 2)}" stroke="#5d4037" stroke-width="2"/>`);
  }
  // Cockpit
  const ckx = x1 - noseLen - (p.drill ? 10 : 2);
  parts.push(`<ellipse cx="${r1(ckx)}" cy="${cy}" rx="${r1(Math.min(12, noseLen * 0.55))}" ry="${r1(Math.max(3, w * 0.45))}" fill="${p.glass || '#4fc3f7'}" stroke="#01579b" stroke-width="1.5"/>`);
  parts.push(`<ellipse cx="${r1(ckx + 2)}" cy="${r1(cy - w * 0.15)}" rx="${r1(Math.min(5, noseLen * 0.25))}" ry="${r1(Math.max(1.2, w * 0.12))}" fill="#e1f5fe" opacity="0.7"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">\n  <!-- Generiert von scripts/gen-ship-sprites.js. Nase zeigt nach rechts. #ff00ff = Spielerfarbe -->\n  ${parts.join('\n  ')}\n</svg>\n`;
}

for (const [name, p] of Object.entries(SHIPS)) {
  fs.writeFileSync(path.join(out, `ship_${name}.svg`), svg(p));
  console.log('geschrieben:', `ship_${name}.svg`);
}
