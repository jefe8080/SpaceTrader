import { WORLD, PLANET_TYPES, STATION_TYPES, BELT_TYPES, SHIP_TYPES, cellKey, cellOf, chunkOf } from '../shared/config.js';
import { createMarket } from './markets.js';

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

export function hash2(seed, x, y) {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function weighted(r, table) {
  const entries = Object.entries(table);
  const total = entries.reduce((s, [, d]) => s + d.weight, 0);
  let x = r() * total;
  for (const [id, d] of entries) {
    x -= d.weight;
    if (x <= 0) return id;
  }
  return entries[entries.length - 1][0];
}

const SYL_A = ['Ka', 'Ve', 'Zor', 'Al', 'Ny', 'Tha', 'Or', 'Mi', 'Sel', 'Dra', 'Ry', 'Ez', 'Qua', 'Lo', 'Fen', 'Ari', 'Bel', 'Cy',
  'Hel', 'Ix', 'Jun', 'Kor', 'Lys', 'Mor', 'Nex', 'Ol', 'Pyr', 'Sar', 'Tor', 'Ul', 'Vex', 'Xan', 'Yr', 'Zel'];
const SYL_B = ['ra', 'lon', 'dis', 'ta', 'mir', 'nos', 'vek', 'lia', 'dor', 'rin', 'tis', 'ga', 'phe', 'mus', 'cor', 'lan', 'ther',
  'nia', 'ros', 'tan'];
const SUFFIX = ['', '', '', ' Prime', ' II', ' III', ' IV', ' V', ' Major', ' Minor'];
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const baseName = (r) => pick(r, SYL_A) + pick(r, SYL_B) + (r() < 0.3 ? pick(r, SYL_B) : '');

export class World {
  constructor(seed) {
    this.seed = seed;
    this.entities = new Map();
    this.chunks = new Set();
    this.cellIndex = new Map(); // Nebel-Zelle -> Entity-IDs
  }

  static fromJSON(d) {
    const w = new World(d.seed);
    for (const c of d.chunks) w.chunks.add(c);
    for (const e of d.entities) w.addEntity(e);
    return w;
  }

  toJSON() {
    return { seed: this.seed, chunks: [...this.chunks], entities: [...this.entities.values()] };
  }

  addEntity(e) {
    this.entities.set(e.id, e);
    const k = cellKey(...cellOf(e.x, e.y));
    if (!this.cellIndex.has(k)) this.cellIndex.set(k, []);
    this.cellIndex.get(k).push(e.id);
  }

  entitiesInCell(k) {
    return this.cellIndex.get(k) || [];
  }

  ensureChunkAt(x, y) {
    const [cx, cy] = chunkOf(x, y);
    this.ensureChunk(cx, cy);
  }

  ensureChunk(cx, cy) {
    const key = cellKey(cx, cy);
    if (this.chunks.has(key)) return;
    this.chunks.add(key);
    if (cx === 0 && cy === 0) this.generateOrigin();
    else this.generateChunk(cx, cy);
  }

  generateChunk(cx, cy) {
    const r = rng(hash2(this.seed, cx, cy));
    const S = WORLD.CHUNK_SIZE;
    const ox = cx * S, oy = cy * S;
    const placed = [];
    let idx = 0;
    const place = (radius) => {
      for (let i = 0; i < 40; i++) {
        const x = ox + (r() - 0.5) * (S - 600);
        const y = oy + (r() - 0.5) * (S - 600);
        if (placed.every((p) => Math.hypot(p.x - x, p.y - y) > p.r + radius + 380)) {
          placed.push({ x, y, r: radius });
          return { x, y };
        }
      }
      return null;
    };
    const id = () => `e${cx}_${cy}_${idx++}`;
    const count = (probs) => {
      let x = r();
      for (let i = 0; i < probs.length; i++) { x -= probs[i]; if (x <= 0) return i; }
      return probs.length - 1;
    };

    const nPlanets = count([0.15, 0.4, 0.3, 0.15]);
    const nStations = count([0.1, 0.3, 0.35, 0.25]);
    const nBelts = count([0.3, 0.5, 0.2]);

    for (let i = 0; i < nPlanets; i++) {
      const type = weighted(r, PLANET_TYPES);
      const def = PLANET_TYPES[type];
      const radius = Math.round(def.radius[0] + r() * (def.radius[1] - def.radius[0]));
      const p = place(radius);
      if (!p) continue;
      const scale = 0.7 + (radius - def.radius[0]) / (def.radius[1] - def.radius[0]) * 0.6;
      this.addEntity({ id: id(), kind: 'planet', type, name: baseName(r) + pick(r, SUFFIX), x: p.x, y: p.y, radius,
        market: createMarket('planet', type, r, scale) });
    }
    for (let i = 0; i < nStations; i++) {
      const type = weighted(r, STATION_TYPES);
      const radius = type === 'shipyard' ? 64 : 48;
      const p = place(radius);
      if (!p) continue;
      const market = createMarket('station', type, r);
      this.addEntity({ id: id(), kind: 'station', type, name: `${STATION_TYPES[type].name} ${baseName(r)}`, x: p.x, y: p.y, radius, market });
    }
    for (let i = 0; i < nBelts; i++) {
      const type = weighted(r, BELT_TYPES);
      const radius = Math.round(160 + r() * 120);
      const p = place(radius);
      if (!p) continue;
      this.addEntity({ id: id(), kind: 'belt', type, name: `${BELT_TYPES[type].name} ${baseName(r)}`, x: p.x, y: p.y, radius,
        richness: Math.round((0.7 + r() * 0.8) * 100) / 100 });
    }
  }

  // Fest gestalteter Startbereich, damit der Wirtschaftskreislauf sofort funktioniert.
  generateOrigin() {
    const r = rng(hash2(this.seed, 0, 0));
    const add = (id, kind, type, name, x, y, radius, extra = {}) =>
      this.addEntity({ id, kind, type, name, x, y, radius, ...extra,
        market: kind === 'belt' ? undefined : createMarket(kind, type, r) });

    add('origin_yard', 'station', 'shipyard', 'Werft Ursprung', 0, 0, 64);
    const yard = this.entities.get('origin_yard').market;
    yard.goods.metal.stock = 30;
    yard.goods.fuel.stock = 10;
    yard.forSale = [{ type: 'spatz', price: SHIP_TYPES.spatz.price }];
    yard.nextBuild = 0;

    add('origin_agrar', 'planet', 'agrar', 'Gaia Nova', -950, -450, 105);
    add('origin_urban', 'planet', 'urban', 'Neo Lumen', 900, 650, 120);
    add('origin_mining', 'planet', 'mining', 'Ferrum', 950, -800, 90);
    add('origin_smelter', 'station', 'smelter', 'Schmelzwerk Glut', 150, -1100, 48);
    add('origin_hotel', 'station', 'hotel', 'Orbitalhotel Sternblick', 100, 1100, 48);
    add('origin_belt', 'belt', 'ore', 'Erzfeld Alpha', -850, 850, 230, { richness: 1 });
    add('origin_gas', 'planet', 'gasgiant', 'Aeolus', 1250, 50, 135);
    add('origin_refinery', 'station', 'refinery', 'Raffinerie Funke', -1150, 300, 48);
    // Planet-Märkte für den Start leicht anpassen: Produkte vorrätig, Bedarf offen
    for (const id of ['origin_agrar', 'origin_urban', 'origin_mining', 'origin_gas']) {
      for (const s of Object.values(this.entities.get(id).market.goods)) s.stock = s.role === 'produce' ? s.cap * 0.7 : s.cap * 0.1;
    }
  }
}
