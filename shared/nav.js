// Navigation: Flugzeiten mit Sondergebieten und schnellster Weg über bekannte Wurmlöcher (Dijkstra).
import { WORLD, ZONE_TYPES } from './config.js';

/** Liegt (x, y) in der (gedrehten) Ellipse der Zone? */
export function inZone(z, x, y) {
  const dx = x - z.x, dy = y - z.y;
  const c = Math.cos(-z.rot || 0), s = Math.sin(-z.rot || 0);
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  return (lx * lx) / (z.rx * z.rx) + (ly * ly) / (z.ry * z.ry) <= 1;
}

/**
 * Produkt der Zoneneffekte an einem Punkt: { speed, fuel, sensor }.
 * opts.void (Sternenläufer): keine Bremse durch Gravitationsstörungen, halber Sensor-Malus im Nebel.
 */
export function zoneEffects(zones, x, y, opts = {}) {
  const out = { speed: 1, fuel: 1, sensor: 1, zones: null };
  for (const z of zones || []) {
    if (!inZone(z, x, y)) continue;
    const t = ZONE_TYPES[z.type];
    if (!(opts.void && (t.speed || 1) < 1)) out.speed *= t.speed || 1;
    out.fuel *= t.fuel || 1;
    out.sensor *= opts.void && t.sensor ? 1 - (1 - t.sensor) / 2 : t.sensor || 1;
    (out.zones ||= []).push(z);
  }
  return out;
}

/** Geschätzte Flugzeit einer geraden Strecke inkl. Zonen (numerisch über Stützpunkte) */
export function segmentTime(ax, ay, bx, by, speed, zones = []) {
  const d = Math.hypot(bx - ax, by - ay);
  if (!d) return 0;
  const rel = (zones || []).filter((z) => segNearZone(ax, ay, bx, by, z));
  if (!rel.length) return d / speed;
  const n = Math.min(400, Math.max(32, Math.ceil(d / 500)));
  let t = 0;
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    t += d / n / (speed * zoneEffects(rel, ax + (bx - ax) * f, ay + (by - ay) * f).speed);
  }
  return t;
}

/** Grobe Vorprüfung: Abstand Strecke-Zonenmittelpunkt kleiner als größte Halbachse */
function segNearZone(ax, ay, bx, by, z) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((z.x - ax) * dx + (z.y - ay) * dy) / l2)) : 0;
  return Math.hypot(ax + dx * t - z.x, ay + dy * t - z.y) <= Math.max(z.rx, z.ry);
}

/**
 * Schnellster Weg von `from` nach `to`.
 * wormholes: [{ id, a: {x, y}, b: {x, y} }] – nur Wurmlöcher, deren beide Enden bekannt sind (in beide Richtungen nutzbar).
 * Kantengewicht: gerade Flugzeit (inkl. Zonen), Wurmlochdurchflug WORMHOLE_TRANSIT Sekunden.
 * Rückgabe: { time, legs: [{ x, y, wh?: { id, side: 'a' | 'b' } }] } – letzter Leg ist das Ziel.
 */
export function planPath(from, to, wormholes, speed, zones = []) {
  const direct = segmentTime(from.x, from.y, to.x, to.y, speed, zones);
  if (!wormholes?.length) return { time: direct, legs: [{ x: to.x, y: to.y }] };
  // Knoten: 0 = Start, 1 = Ziel, dann je Wurmloch zwei Enden
  const nodes = [{ x: from.x, y: from.y }, { x: to.x, y: to.y }];
  for (const w of wormholes) {
    nodes.push({ x: w.a.x, y: w.a.y, wh: w, side: 'a' });
    nodes.push({ x: w.b.x, y: w.b.y, wh: w, side: 'b' });
  }
  const n = nodes.length;
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const viaWh = new Array(n).fill(false);
  const done = new Array(n).fill(false);
  dist[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === 1) break;
    done[u] = true;
    const nu = nodes[u];
    for (let v = 1; v < n; v++) {
      if (done[v] || v === u) continue;
      const nv = nodes[v];
      // Flug (ohne Zonen für die Suche, Zonen nur bei der Ergebniszeit – schnell genug und stabil)
      let w = Math.hypot(nv.x - nu.x, nv.y - nu.y) / speed;
      let wh = false;
      if (nu.wh && nv.wh === nu.wh) { w = WORLD.WORMHOLE_TRANSIT; wh = true; }
      if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; viaWh[v] = wh; }
    }
  }
  if (dist[1] === Infinity) return { time: direct, legs: [{ x: to.x, y: to.y }] };
  const chain = [];
  for (let v = 1; v > 0; v = prev[v]) chain.unshift(v);
  // Legs: Flug zum Eingang (mit wh-Markierung), Austritt ist der nächste Startpunkt
  const legs = [];
  let time = 0, px = from.x, py = from.y;
  for (let i = 0; i < chain.length; i++) {
    const v = chain[i];
    const nd = nodes[v];
    if (viaWh[v]) { time += WORLD.WORMHOLE_TRANSIT; px = nd.x; py = nd.y; continue; }
    time += segmentTime(px, py, nd.x, nd.y, speed, zones);
    const next = chain[i + 1];
    if (next !== undefined && viaWh[next]) legs.push({ x: nd.x, y: nd.y, wh: { id: nd.wh.id, side: nd.side } });
    else legs.push({ x: nd.x, y: nd.y });
    px = nd.x; py = nd.y;
  }
  if (direct <= time) return { time: direct, legs: [{ x: to.x, y: to.y }] };
  return { time, legs };
}
