import { WORLD, PLANET_TYPES, STATION_TYPES, BELT_TYPES, ZONE_TYPES, TAG_FACTOR, GOODS } from '../shared/config.js';
import { hexCenter, hexKey, hexNeighbors } from '../shared/hex.js';
import { createMarket } from './markets.js';

/**
 * Deterministische Sektorgenerierung aus Weltseed und Hex-Koordinate.
 * Ein Sektor um ein Schwarzes Loch wird vollständig am Stück erzeugt:
 * Sonnensysteme mit Planeten, Stationen und Asteroidenfeldern, Hub, Werften, Sondergebiete, Wurmlöcher.
 */

const TAU = Math.PI * 2;

/** Deterministischer Zufallsgenerator (mulberry32) */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashN(seed, ...nums) {
  let h = seed | 0;
  for (const n of nums) {
    h = Math.imul(h ^ (n | 0), 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h ^= h >>> 13;
  }
  return h >>> 0;
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const between = (r, a, b) => a + Math.floor(r() * (b - a + 1));

// ---------- Namen ----------
const SYL_A = ['Ka', 'Ve', 'Zor', 'Al', 'Ny', 'Tha', 'Or', 'Mi', 'Sel', 'Dra', 'Ry', 'Ez', 'Qua', 'Lo', 'Fen', 'Ari', 'Bel', 'Cy',
  'Hel', 'Ix', 'Jun', 'Kor', 'Lys', 'Mor', 'Nex', 'Ol', 'Pyr', 'Sar', 'Tor', 'Ul', 'Vex', 'Xan', 'Yr', 'Zel', 'Bra', 'Gal', 'Ith', 'Ser'];
const SYL_B = ['ra', 'lon', 'dis', 'ta', 'mir', 'nos', 'vek', 'lia', 'dor', 'rin', 'tis', 'ga', 'phe', 'mus', 'cor', 'lan', 'ther',
  'nia', 'ros', 'tan', 'gos', 'vin', 'del', 'kas'];
const GREEK = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Sigma', 'Tau', 'Omega'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
export const baseName = (r) => pick(r, SYL_A) + pick(r, SYL_B) + (r() < 0.3 ? pick(r, SYL_B) : '');
const sectorName = (r) => `${baseName(r)}-${pick(r, GREEK)}`;

// ---------- Gewichtete Auswahl mit Spezialisierung ----------
/** Welche Waren erzeugt ein Typ? (für Tag-Gewichtung) */
const producesOf = {
  planet: (t) => Object.keys(PLANET_TYPES[t].produce || {}),
  station: (t) => Object.keys(STATION_TYPES[t].recipe?.out || {}),
  belt: (t) => [BELT_TYPES[t].good],
};

function weightedTagged(r, table, kind, tags) {
  const entries = Object.entries(table).filter(([, d]) => d.weight > 0);
  const w = entries.map(([t, d]) => d.weight * (producesOf[kind](t).some((g) => tags.includes(g)) ? TAG_FACTOR : 1));
  let x = r() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < entries.length; i++) { x -= w[i]; if (x <= 0) return entries[i][0]; }
  return entries[entries.length - 1][0];
}

/** Rohstoffe, die als Spezialisierung eines Systems in Frage kommen */
export const TAGGABLE = [...new Set(Object.values(BELT_TYPES).map((b) => b.good)
  .concat(Object.values(PLANET_TYPES).flatMap((p) => Object.keys(p.produce)).filter((g) => GOODS[g].tier === 0 && g !== 'passengers')))];

// ---------- Layout ----------
/**
 * Systempositionen und Grunddaten eines Sektors (deterministisch, ohne Inhalt).
 * Wird auch genutzt, um Wurmloch-Enden in noch nicht erzeugte Nachbarsektoren zu legen.
 */
export function layoutSector(seed, q, r) {
  const rr = rng(hashN(seed, q, r, 1));
  const c = hexCenter(q, r);
  const bh = { x: c.x + (rr() - 0.5) * 2 * WORLD.BH_OFFSET, y: c.y + (rr() - 0.5) * 2 * WORLD.BH_OFFSET };
  const start = q === 0 && r === 0;
  const hubAngle = rr() * TAU;
  const hubPos = { x: bh.x + Math.cos(hubAngle) * WORLD.HUB_DIST, y: bh.y + Math.sin(hubAngle) * WORLD.HUB_DIST };
  const n = between(rr, WORLD.SYSTEMS[0], WORLD.SYSTEMS[1]);
  const systems = [];
  // Startsystem liegt am Schwarzen Loch, der Hub gehört dazu
  if (start) systems.push({ x: bh.x + Math.cos(hubAngle) * 8500, y: bh.y + Math.sin(hubAngle) * 8500, start: true });
  const inner = WORLD.HUB_DIST + WORLD.SYSTEM_RADIUS * 2.5;
  for (let tries = 0; systems.length < n && tries < 4000; tries++) {
    const a = rr() * TAU, d = Math.sqrt(rr()) * (WORLD.SECTOR_RADIUS - WORLD.SYSTEM_RADIUS);
    const x = bh.x + Math.cos(a) * d, y = bh.y + Math.sin(a) * d;
    if (Math.hypot(x - bh.x, y - bh.y) < inner) continue;
    if (systems.some((s) => Math.hypot(s.x - x, s.y - y) < WORLD.SYSTEM_MIN_DIST)) continue;
    systems.push({ x, y });
  }
  const used = new Set();
  systems.forEach((s, i) => {
    s.id = `y${q}_${r}_${i}`;
    let name;
    do { name = s.start ? 'Ursprung' : baseName(rr); } while (used.has(name) && !s.start);
    used.add(name);
    s.name = name;
    s.x = Math.round(s.x);
    s.y = Math.round(s.y);
  });
  return { key: hexKey(q, r), q, r, name: start ? 'Heimat-Alpha' : sectorName(rr), bh: { x: Math.round(bh.x), y: Math.round(bh.y) }, hubPos, systems };
}

// ---------- Generierung ----------
export function generateSector(seed, q, r) {
  const L = layoutSector(seed, q, r);
  const rr = rng(hashN(seed, q, r, 2));
  const start = q === 0 && r === 0;
  const entities = [];
  let idx = 0;
  const nextId = () => `e${q}_${r}_${idx++}`;
  const sector = {
    key: L.key, q, r, name: L.name, bh: L.bh, hubPos: { x: Math.round(L.hubPos.x), y: Math.round(L.hubPos.y) },
    systems: [], zones: [], wormholes: [], hub: null, bigyard: null,
  };

  // Spezialisierung, Treibstoff, Werften
  const normal = L.systems.filter((s) => !s.start);
  for (const s of L.systems) {
    const tags = [];
    const nTags = rr() < 0.5 ? 1 : 2;
    while (tags.length < nTags) { const t = pick(rr, TAGGABLE); if (!tags.includes(t)) tags.push(t); }
    sector.systems.push({ id: s.id, name: s.name, x: s.x, y: s.y, sector: L.key, tags: s.start ? [] : tags,
      star: starOf(rr), start: !!s.start, fuel: s.start || rr() < 0.7, yard: false, bigyard: false });
  }
  const sysById = new Map(sector.systems.map((s) => [s.id, s]));
  const nYards = Math.min(normal.length, between(rr, 3, 5));
  const shuffled = [...normal].sort(() => rr() - 0.5);
  for (const s of shuffled.slice(0, nYards)) sysById.get(s.id).yard = true;
  if (normal.length) sysById.get(shuffled[shuffled.length > nYards ? nYards : 0].id).bigyard = true;

  // Hub
  const hubId = start ? 'origin_hub' : `hub${q}_${r}`;
  const hub = { id: hubId, kind: 'station', type: 'hub', name: `Hub ${L.name}`, x: Math.round(L.hubPos.x), y: Math.round(L.hubPos.y),
    radius: STATION_TYPES.hub.radius, sector: L.key, system: start ? L.systems[0].id : null, noBuy: true,
    market: createMarket('station', 'hub', rr) };
  entities.push(hub);
  sector.hub = hubId;

  // Systeminhalte
  for (const sys of sector.systems) {
    if (sys.start) entities.push(...startSystem(sys, rr, hub));
    else entities.push(...populateSystem(sys, rr, nextId));
    if (sys.bigyard) sector.bigyard = entities.find((e) => e.system === sys.id && e.type === 'bigyard')?.id || null;
  }

  // Sondergebiete
  const nZones = between(rr, 0, 3);
  for (let i = 0; i < nZones; i++) {
    const type = weightedPlain(rr, ZONE_TYPES);
    const rx = 8000 + rr() * 14000;
    const ry = rx * (0.4 + rr() * 0.6);
    let best = null;
    for (let t = 0; t < 30 && !best; t++) {
      const a = rr() * TAU, d = 12000 + rr() * (WORLD.SECTOR_RADIUS - 12000);
      const x = L.bh.x + Math.cos(a) * d, y = L.bh.y + Math.sin(a) * d;
      const clear = sector.systems.every((s) => Math.hypot(s.x - x, s.y - y) > rx + WORLD.SYSTEM_RADIUS * (s.start ? 2 : 0.5));
      if (clear || t === 29) best = { x, y };
    }
    if (sector.systems.some((s) => s.start && Math.hypot(s.x - best.x, s.y - best.y) < rx + WORLD.SYSTEM_RADIUS * 2)) continue;
    sector.zones.push({ id: `z${q}_${r}_${i}`, type, x: Math.round(best.x), y: Math.round(best.y), rx: Math.round(rx), ry: Math.round(ry), rot: Math.round(rr() * Math.PI * 100) / 100, sector: L.key });
  }

  // Wurmlöcher: Enden in Systemen des eigenen oder eines Nachbarsektors
  const nWh = start ? 1 : between(rr, 0, 2);
  for (let i = 0; i < nWh; i++) {
    const a = pick(rr, normal.length ? normal : L.systems);
    let bSys, bSector = L.key;
    if (rr() < 0.5 && L.systems.length > 1) {
      const others = L.systems.filter((s) => s !== a && !s.start);
      bSys = pick(rr, others.length ? others : L.systems.filter((s) => s !== a));
    } else {
      const nb = pick(rr, hexNeighbors(q, r));
      const NL = layoutSector(seed, nb.q, nb.r);
      const cands = NL.systems.filter((s) => !s.start);
      bSys = pick(rr, cands.length ? cands : NL.systems);
      bSector = NL.key;
    }
    if (!bSys) continue;
    const id = `w${q}_${r}_${i}`;
    const ends = [[a, L.key, 'a'], [bSys, bSector, 'b']].map(([s, sec, side]) => {
      const ang = rr() * TAU;
      return { id: id + side, kind: 'wormhole', type: 'wormhole', name: `Wurmloch ${s.name}`, x: Math.round(s.x + Math.cos(ang) * 3400), y: Math.round(s.y + Math.sin(ang) * 3400),
        radius: 140, sector: sec, system: s.id, pair: id + (side === 'a' ? 'b' : 'a'), wh: id };
    });
    entities.push(...ends);
    sector.wormholes.push({ id, a: ends[0].id, b: ends[1].id, sectors: [L.key, bSector] });
  }
  return { sector, entities };
}

function weightedPlain(r, table) {
  const entries = Object.entries(table);
  let x = r() * entries.reduce((s, [, d]) => s + d.weight, 0);
  for (const [k, d] of entries) { x -= d.weight; if (x <= 0) return k; }
  return entries[entries.length - 1][0];
}

const STAR_COLORS = [['#fff3c4', 1], ['#ffe082', 1.1], ['#ffcc80', 0.9], ['#ff8a65', 0.8], ['#bbdefb', 1.3], ['#ffffff', 1.2]];
function starOf(r) {
  const [color, size] = pick(r, STAR_COLORS);
  return { color, size };
}

/** Platziert Objekte in einem System (Abstand zum Stern und untereinander) */
function placer(sys, r) {
  const placed = [{ x: sys.x, y: sys.y, r: 520 }];
  return (radius) => {
    for (let i = 0; i < 80; i++) {
      const a = r() * TAU;
      const d = 950 + r() * (WORLD.SYSTEM_RADIUS - 950 - radius);
      const x = sys.x + Math.cos(a) * d, y = sys.y + Math.sin(a) * d;
      if (placed.every((p) => Math.hypot(p.x - x, p.y - y) > p.r + radius + 260)) {
        placed.push({ x, y, r: radius });
        return { x: Math.round(x), y: Math.round(y) };
      }
    }
    return null;
  };
}

function populateSystem(sys, r, nextId) {
  const out = [];
  const place = placer(sys, r);
  const base = { sector: sys.sector, system: sys.id };

  // Planeten, benannt nach Umlaufbahn (I = innen)
  const planets = [];
  for (let i = 0, n = between(r, 2, 6); i < n; i++) {
    const type = weightedTagged(r, PLANET_TYPES, 'planet', sys.tags);
    const def = PLANET_TYPES[type];
    const radius = Math.round(def.radius[0] + r() * (def.radius[1] - def.radius[0]));
    const p = place(radius);
    if (!p) continue;
    const scale = 0.7 + ((radius - def.radius[0]) / (def.radius[1] - def.radius[0])) * 0.6;
    planets.push({ id: nextId(), kind: 'planet', type, x: p.x, y: p.y, radius, size: Math.round(scale * 100) / 100, ...base, market: createMarket('planet', type, r, scale) });
  }
  planets.sort((a, b) => Math.hypot(a.x - sys.x, a.y - sys.y) - Math.hypot(b.x - sys.x, b.y - sys.y));
  planets.forEach((p, i) => { p.name = `${sys.name} ${ROMAN[i]}`; });
  out.push(...planets);

  // Stationen: Treibstoff (ca. 70 %), Werften, Rest nach Spezialisierung
  const n = between(r, 1, 4);
  const types = [];
  if (sys.fuel) types.push('refinery');
  if (sys.yard) types.push('shipyard');
  if (sys.bigyard) types.push('bigyard');
  while (types.length < n) types.push(weightedTagged(r, STATION_TYPES, 'station', sys.tags));
  for (const type of types) {
    const def = STATION_TYPES[type];
    const radius = def.radius || 48;
    const p = place(radius);
    if (!p) continue;
    const name = type === 'bigyard' ? `Großwerft ${sys.name}` : `${def.name} ${sys.name}${types.filter((t) => t === type).length > 1 ? ' ' + baseName(r) : ''}`;
    out.push({ id: nextId(), kind: 'station', type, name, x: p.x, y: p.y, radius, ...base, market: createMarket('station', type, r) });
  }

  // Asteroidenfelder
  for (let i = 0, nb = between(r, 0, 2); i < nb; i++) {
    const type = weightedTagged(r, BELT_TYPES, 'belt', sys.tags);
    const radius = Math.round(200 + r() * 160);
    const p = place(radius);
    if (!p) continue;
    out.push({ id: nextId(), kind: 'belt', type, name: `${BELT_TYPES[type].name} ${sys.name}${i ? ' ' + ROMAN[i] : ''}`, x: p.x, y: p.y, radius,
      richness: Math.round((0.7 + r() * 0.8) * 100) / 100, ...base });
  }
  return out;
}

/**
 * Handgebautes Startsystem: Hub, Werft, Treibstoff und alle Grundrohstoffe nah beieinander.
 * Langsam-Modifier: Produktion, Verbrauch und Lager mit START_SLOW der normalen Werte.
 */
function startSystem(sys, r, hub) {
  const slow = WORLD.START_SLOW;
  const base = { sector: sys.sector, system: sys.id, noBuy: true };
  // Positionen relativ zum Systemzentrum, Hub liegt auf der Seite des Schwarzen Lochs
  const ang = Math.atan2(hub.y - sys.y, hub.x - sys.x);
  const rot = (dx, dy) => ({
    x: Math.round(sys.x + dx * Math.cos(ang) - dy * Math.sin(ang)),
    y: Math.round(sys.y + dx * Math.sin(ang) + dy * Math.cos(ang)),
  });
  const out = [];
  const add = (id, kind, type, name, dx, dy, radius, extra = {}) => {
    const p = rot(dx, dy);
    const e = { id, kind, type, name, ...p, radius, ...base, ...extra };
    if (kind !== 'belt') e.market = createMarket(kind, type, r, kind === 'planet' ? slow : 1, { slow });
    out.push(e);
    return e;
  };
  const yard = add('origin_yard', 'station', 'shipyard', 'Werft Ursprung', 1300, 400, 64);
  yard.market.goods.metal.stock = 12;
  yard.market.goods.fuel.stock = 5;
  yard.market.forSale = [{ type: 'spatz', price: 2500 }];
  yard.market.nextBuild = 0;
  add('origin_agrar', 'planet', 'agrar', 'Gaia Nova', -1500, -1400, 105);
  add('origin_urban', 'planet', 'urban', 'Neo Lumen', -2600, 900, 120);
  add('origin_mining', 'planet', 'mining', 'Ferrum', 300, -2400, 90);
  add('origin_ice', 'planet', 'ice', 'Glacia', -3300, -900, 80);
  add('origin_gas', 'planet', 'gasgiant', 'Aeolus', 2600, -1900, 135);
  add('origin_smelter', 'station', 'smelter', 'Schmelzwerk Glut', 1200, -1300, 48);
  add('origin_refinery', 'station', 'refinery', 'Raffinerie Funke', 2200, -600, 48);
  add('origin_waterworks', 'station', 'waterworks', 'Wasserwerk Quelle', -2200, -300, 48);
  add('origin_hotel', 'station', 'hotel', 'Orbitalhotel Sternblick', -1100, 1900, 48);
  add('origin_belt', 'belt', 'ore', 'Erzfeld Alpha', -400, 2600, 260, { richness: 1 });
  add('origin_belt_ice', 'belt', 'ice', 'Eisfeld Beta', -3300, 2300, 220, { richness: 0.9 });
  add('origin_belt_cry', 'belt', 'crystals', 'Kristallfeld Gamma', 1400, 2500, 220, { richness: 0.9 });
  add('origin_belt_rare', 'belt', 'rareearth', 'Seltenerdfeld Delta', 2900, 1600, 200, { richness: 0.8 });
  // Planetenmärkte für den Start: Produkte vorrätig, Bedarf offen
  for (const e of out) {
    if (e.kind !== 'planet') continue;
    for (const s of Object.values(e.market.goods)) s.stock = s.role === 'produce' ? s.cap * 0.7 : s.cap * 0.1;
  }
  return out;
}
