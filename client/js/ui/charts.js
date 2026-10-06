import { esc, fmt } from '../state.js';

export const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v);
};
export const fmtNum = (v) => (Math.abs(v) >= 100 ? fmt(v) : (Math.round(v * 10) / 10).toLocaleString('de-DE'));
const bucketLabel = (k, secs) => {
  const m = secs / 60;
  return k === 0 ? `laufende ${m} min` : `vor ${k * m}–${(k + 1) * m} min`;
};

/** Säulendiagramm: eine Reihe, ein Balken je Zeitblock, Hover-Anzeige über data-tip */
export function barChart(vals, series, secs) {
  const W = 336, H = 104, padL = 34, padB = 18, padT = 8;
  const n = vals.length;
  const max = niceMax(Math.max(...vals));
  const ph = H - padB - padT;
  const bw = (W - padL) / n;
  const total = vals.reduce((a, b) => a + b, 0);
  let bars = '', hits = '';
  vals.forEach((v, i) => {
    const k = n - 1 - i;
    const x = padL + i * bw;
    const h = v > 0 ? Math.max(2, (v / max) * ph) : 0;
    if (h) bars += `<rect x="${(x + 1).toFixed(1)}" y="${(H - padB - h).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="var(--accent)"${k === 0 ? ' opacity="0.5"' : ''}/>`;
    hits += `<rect x="${x.toFixed(1)}" y="${padT}" width="${bw.toFixed(1)}" height="${ph}" fill="transparent" data-tip="${bucketLabel(k, secs)}: ${fmtNum(v)} ${esc(series.unit)}"/>`;
  });
  const xl = [0, 12, 24].map((i) => `<text x="${(padL + i * bw).toFixed(1)}" y="${H - 4}">−${((n - i) * secs) / 3600} h</text>`).join('')
    + `<text x="${W}" y="${H - 4}" text-anchor="end">jetzt</text>`;
  const def = `${series.label} · Summe ${fmtNum(total)}`;
  return `<div class="chart-readout" data-default="${esc(def)}">${esc(def)}</div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(series.label)} je ${secs / 60} Minuten">
      <line x1="${padL}" x2="${W}" y1="${padT}" y2="${padT}" class="grid"/>
      <line x1="${padL}" x2="${W}" y1="${padT + ph / 2}" y2="${padT + ph / 2}" class="grid"/>
      <line x1="${padL}" x2="${W}" y1="${H - padB}" y2="${H - padB}" class="axis"/>
      <text x="${padL - 4}" y="${padT + 4}" text-anchor="end">${fmtNum(max)}</text>
      <text x="${padL - 4}" y="${padT + ph / 2 + 4}" text-anchor="end">${fmtNum(max / 2)}</text>
      <text x="${padL - 4}" y="${H - padB + 4}" text-anchor="end">0</text>
      ${bars}${xl}${hits}
    </svg>`;
}

/**
 * Preis-Sparkline: Werte (null = keine Daten), optionale Grenze als gestrichelte Linie.
 * Gibt kompaktes Inline-SVG zurück.
 */
export function sparkline(vals, { limit = 0, w = 120, h = 26, color = 'var(--accent)', title = '' } = {}) {
  const pts = vals.map((v, i) => [i, v]).filter(([, v]) => v !== null && v !== undefined);
  if (pts.length < 2) return `<svg class="spark" width="${w}" height="${h}"><text x="2" y="${h - 8}" class="muted">keine Daten</text></svg>`;
  const ys = pts.map(([, v]) => v).concat(limit ? [limit] : []);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
  const X = (i) => 1 + (i / (vals.length - 1)) * (w - 2);
  const Y = (v) => h - 2 - ((v - lo) / (hi - lo)) * (h - 4);
  const d = pts.map(([i, v], k) => `${k ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const lim = limit ? `<line x1="0" x2="${w}" y1="${Y(limit).toFixed(1)}" y2="${Y(limit).toFixed(1)}" class="spark-limit"/>` : '';
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>${esc(title)} · min ${fmtNum(Math.min(...pts.map((p) => p[1])))} · max ${fmtNum(Math.max(...pts.map((p) => p[1])))}</title>${lim}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1.5"/><circle cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="2" fill="${color}"/></svg>`;
}

/** Füllstandsbalken */
export const stockBar = (stock, cap, color) => `<span class="stockbar" title="${Math.floor(stock)} / ${cap}"><div style="width:${Math.min(100, (stock / cap) * 100)}%;background:${color}"></div></span>`;
