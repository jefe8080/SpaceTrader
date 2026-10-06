import { WORLD, GOODS, BELT_TYPES, PLAYER_COLORS, SHIP_NAMES, SUPPLY, NPC_OWNER, STATS,
  cellKey, cellOf, buyPrice, sellPrice, canBuyFrom, canSellTo } from '../shared/config.js';
import { World } from './world.js';
import { tickMarket, stat, missingInput } from './markets.js';
import { updateShip, cargoFree } from './ships.js';
import { Store } from './db.js';

export const WORLD_GEN_VERSION = 1; // ändert sich die Generierung inkompatibel, wird die Welt neu erzeugt

export class Game {
  /** dbFile: Pfad zur SQLite-Datei oder ':memory:' */
  constructor(dbFile, { seed } = {}) {
    this.store = new Store(dbFile);
    this.time = 0;
    this.players = new Map();
    this.ships = new Map();
    this.routes = new Map();
    this.counters = { player: 0, ship: 0, route: 0 };
    this.econAcc = 0;
    this.newDiscoveries = []; // [player, kind, key] seit dem letzten Speichern
    this.listeners = { reveal: [], log: [] };
    if (!this.load()) {
      this.world = new World(seed ?? ((Math.random() * 2 ** 31) | 0));
      this.world.ensureChunk(0, 0);
    }
  }

  on(ev, fn) { this.listeners[ev].push(fn); }
  emit(ev, ...a) { for (const fn of this.listeners[ev]) fn(...a); }

  // ---------- Persistenz ----------
  load() {
    const st = this.store;
    const gen = st.getMeta('worldGen');
    if (gen === undefined) return false;
    if (gen !== WORLD_GEN_VERSION) {
      console.log(`Weltgenerierung ${gen} ist veraltet (aktuell ${WORLD_GEN_VERSION}). Neue Welt wird erzeugt.`);
      st.transaction(() => {
        for (const t of ['players', 'ships', 'sectors', 'entities', 'markets', 'routes', 'favorites', 'discoveries', 'ownership', 'market_stats', 'ship_stats', 'meta']) {
          st.db.prepare(`DELETE FROM ${t}`).run();
        }
      });
      for (const c of st.cache.values()) c.clear();
      return false;
    }
    this.time = st.getMeta('time');
    this.counters = { ...this.counters, ...st.getMeta('counters') };
    this.world = new World(st.getMeta('seed'));
    const markets = new Map(st.loadAll('markets').map((r) => [r.id, r.data]));
    const stats = new Map();
    for (const r of st.loadAll('market_stats')) {
      if (!stats.has(r.entity)) stats.set(r.entity, []);
      stats.get(r.entity).push({ b: r.bucket, ...r.data });
    }
    for (const r of st.loadAll('sectors')) this.world.chunks.add(r.id);
    for (const r of st.loadAll('entities')) {
      const e = r.data;
      if (markets.has(e.id)) {
        e.market = markets.get(e.id);
        e.market.stats = (stats.get(e.id) || []).sort((a, b) => a.b - b.b);
      }
      this.world.addEntity(e);
    }
    for (const r of st.loadAll('players')) this.players.set(r.id, { ...r.data, revealed: new Set() });
    for (const d of st.loadDiscoveries()) {
      const p = this.players.get(d.player);
      if (p && d.kind === 'cell') p.revealed.add(d.key);
    }
    for (const r of st.loadAll('ships')) this.ships.set(r.id, r.data);
    for (const r of st.loadAll('routes')) this.routes.set(r.id, r.data);
    console.log(`Spielstand geladen: ${this.players.size} Spieler, ${this.world.entities.size} Objekte, ${this.ships.size} Schiffe`);
    return true;
  }

  save() {
    const st = this.store;
    const t0 = Date.now();
    let n = 0;
    st.transaction(() => {
      st.setMeta('worldGen', WORLD_GEN_VERSION);
      st.setMeta('seed', this.world.seed);
      st.setMeta('time', this.time);
      st.setMeta('counters', this.counters);
      n += st.sync('sectors', [...this.world.chunks].map((k) => ({ key: [k], data: {} })));
      const ents = [], mkts = [], mstats = [];
      for (const e of this.world.entities.values()) {
        const { market, ...stat } = e;
        ents.push({ key: [e.id], cols: [e.sector ?? ''], data: stat });
        if (market) {
          const { stats, ...m } = market;
          mkts.push({ key: [e.id], data: m });
          for (const b of stats || []) {
            const { b: bucket, ...data } = b;
            mstats.push({ key: [e.id, bucket], data });
          }
        }
      }
      n += st.sync('entities', ents);
      n += st.sync('markets', mkts);
      n += st.sync('market_stats', mstats, false);
      st.trimStats('market_stats', Math.floor(this.time / STATS.BUCKET_SECS) - STATS.BUCKETS);
      n += st.sync('players', [...this.players.values()].map((p) => {
        const { revealed, ...data } = p;
        return { key: [p.id], data };
      }));
      n += st.sync('ships', [...this.ships.values()].map((s) => ({ key: [s.id], cols: [s.owner], data: s })));
      n += st.sync('routes', [...this.routes.values()].map((r) => ({ key: [r.id], cols: [r.owner], data: r })));
      st.addDiscoveries(this.newDiscoveries);
      n += this.newDiscoveries.length;
      this.newDiscoveries = [];
    });
    return { rows: n, ms: Date.now() - t0 };
  }

  close() {
    this.save();
    this.store.close();
  }

  // ---------- Spieler ----------
  playerList(online = new Set()) {
    return [...this.players.values()]
      .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
      .map((p) => ({ id: p.id, name: p.name, color: p.color, online: online.has(p.id) }));
  }

  findPlayerByName(name) {
    const n = name.toLowerCase();
    for (const p of this.players.values()) if (p.name.toLowerCase() === n) return p;
    return null;
  }

  createPlayer(name) {
    const id = 'p' + ++this.counters.player;
    const p = { id, name, color: PLAYER_COLORS[(this.counters.player - 1) % PLAYER_COLORS.length], credits: WORLD.START_CREDITS,
      revealed: new Set(), createdAt: Date.now(), lastSeen: Date.now() };
    this.players.set(id, p);
    this.revealAround(p, 0, 0, WORLD.START_REVEAL_RADIUS);
    this.spawnShip(p, 'spatz', this.world.entities.get('origin_yard'));
    return p;
  }

  spawnShip(player, type, atEntity) {
    const id = 's' + ++this.counters.ship;
    const a = Math.random() * Math.PI * 2;
    const d = atEntity.radius + WORLD.DOCK_OFFSET;
    const own = [...this.ships.values()].filter((s) => s.owner === player.id).length;
    const ship = {
      id, owner: player.id, type, name: SHIP_NAMES[(own + this.counters.player * 3) % SHIP_NAMES.length] + (own >= SHIP_NAMES.length ? ' ' + (own + 1) : ''),
      x: atEntity.x + Math.cos(a) * d, y: atEntity.y + Math.sin(a) * d, angle: a + Math.PI / 2, vx: 0, vy: 0,
      cargo: {}, orders: { type: 'idle' }, state: 'docked', dockedAt: atEntity.id, log: [],
    };
    this.ships.set(id, ship);
    return ship;
  }

  // ---------- Nebel des Krieges ----------
  isKnown(player, e) {
    return player.revealed.has(cellKey(...cellOf(e.x, e.y)));
  }

  revealAround(p, x, y, r) {
    const C = WORLD.FOG_CELL;
    const newCells = [];
    for (let cx = Math.floor((x - r) / C); cx <= Math.floor((x + r) / C); cx++) {
      for (let cy = Math.floor((y - r) / C); cy <= Math.floor((y + r) / C); cy++) {
        const mx = (cx + 0.5) * C, my = (cy + 0.5) * C;
        if (Math.hypot(mx - x, my - y) > r) continue;
        const k = cellKey(cx, cy);
        if (p.revealed.has(k)) continue;
        this.world.ensureChunkAt(mx, my); // Welt wird erst generiert, wenn sie entdeckt wird
        p.revealed.add(k);
        newCells.push(k);
        this.newDiscoveries.push([p.id, 'cell', k]);
      }
    }
    if (!newCells.length) return;
    const entities = [];
    for (const k of newCells) for (const id of this.world.entitiesInCell(k)) entities.push(this.world.entities.get(id));
    this.emit('reveal', p, newCells, entities);
  }

  // ---------- Simulation ----------
  tick(dt) {
    this.time += dt;
    for (const s of this.ships.values()) {
      updateShip(s, dt, this);
      if (s.revX === undefined || Math.hypot(s.x - s.revX, s.y - s.revY) > 120) {
        s.revX = s.x;
        s.revY = s.y;
        const p = this.players.get(s.owner);
        if (p) this.revealAround(p, s.x, s.y, WORLD.SENSOR_RANGE);
      }
    }
    this.econAcc += dt;
    if (this.econAcc >= 1) {
      for (const e of this.world.entities.values()) {
        tickMarket(e, this.econAcc, this.time, this);
        if (e.market?.strategy === 'factory') this.checkSupply(e);
      }
      this.econAcc = 0;
    }
  }

  shipLog(ship, msg) {
    ship.log.unshift({ t: Date.now(), msg });
    if (ship.log.length > 8) ship.log.length = 8;
    this.emit('log', ship, msg);
  }

  /** limit: max. Einkaufspreis bzw. min. Verkaufspreis pro Einheit (0 = egal) */
  trade(ship, e, good, amount, dir, limit = 0) {
    const p = this.players.get(ship.owner);
    const slot = e.market?.goods[good];
    if (!slot || !GOODS[good]) return { n: 0, reason: 'Diese Ware wird hier nicht gehandelt.' };
    if (ship.dockedAt !== e.id) return { n: 0, reason: 'Schiff ist nicht angedockt.' };
    let n = 0, total = 0;
    if (dir === 'buy') {
      if (!canBuyFrom(slot)) return { n: 0, reason: 'Hier wird diese Ware nicht verkauft.' };
      const max = Math.min(amount, cargoFree(ship), Math.floor(slot.stock));
      while (n < max) {
        const pr = buyPrice(good, slot.stock, slot.cap);
        if (p.credits < pr || (limit && pr > limit)) break;
        p.credits -= pr; slot.stock -= 1; total += pr; n++;
      }
      if (n) ship.cargo[good] = (ship.cargo[good] || 0) + n;
    } else {
      if (!canSellTo(slot)) return { n: 0, reason: 'Hier wird diese Ware nicht angekauft.' };
      const have = ship.cargo[good] || 0;
      const max = Math.min(amount, have, Math.floor(slot.cap - slot.stock));
      while (n < max) {
        const pr = sellPrice(good, slot.stock, slot.cap);
        if (limit && pr < limit) break;
        p.credits += pr; slot.stock += 1; total += pr; n++;
      }
      ship.cargo[good] = have - n;
      if (!ship.cargo[good]) delete ship.cargo[good];
    }
    if (n) stat(e.market, this.time, dir === 'buy' ? 'o' : 'i', good, n);
    if (n) this.shipLog(ship, `${dir === 'buy' ? 'Gekauft' : 'Verkauft'}: ${n} ${GOODS[good].name} für ${Math.round(total)} Cr bei ${e.name}`);
    return { n, total };
  }

  // ---------- Automatische Versorgung ----------
  checkSupply(e) {
    const m = e.market;
    const sup = m.supply;
    if (sup?.shipId && this.ships.has(sup.shipId)) return;      // Versorger unterwegs
    if (sup?.until && this.time < sup.until) return;            // Abklingzeit
    const good = missingInput(m);
    if (!good) { m.supply = null; return; }
    const src = this.findSource(e, good);
    if (!src) {
      m.supply = { state: 'nosource', good, until: this.time + SUPPLY.RETRY_NO_SOURCE };
      return;
    }
    const ship = this.spawnNpcShip(e);
    ship.orders = { type: 'supply', stationId: e.id, sourceId: src.id, good, phase: 'toSource' };
    m.supply = { state: 'active', good, shipId: ship.id, sourceId: src.id };
  }

  /** Nächstgelegene Quelle im Umkreis: Produzent mit Vorrat oder passendes Asteroidenfeld */
  findSource(e, good) {
    let best = null, bestD = Infinity;
    for (const s of this.world.entities.values()) {
      if (s === e) continue;
      const d = Math.hypot(s.x - e.x, s.y - e.y);
      if (d > SUPPLY.RANGE || d >= bestD) continue;
      if (s.kind === 'belt') {
        if (BELT_TYPES[s.type].good !== good) continue;
      } else {
        const sl = s.market?.goods[good];
        if (!sl || !canBuyFrom(sl) || sl.stock < SUPPLY.MIN_SOURCE_STOCK) continue;
      }
      best = s;
      bestD = d;
    }
    return best;
  }

  spawnNpcShip(station) {
    const id = 's' + ++this.counters.ship;
    const a = Math.random() * Math.PI * 2;
    const d = station.radius + WORLD.DOCK_OFFSET;
    const ship = {
      id, owner: NPC_OWNER, type: SUPPLY.SHIP_TYPE, name: `Versorger ${station.name}`,
      x: station.x + Math.cos(a) * d, y: station.y + Math.sin(a) * d, angle: a, vx: 0, vy: 0,
      cargo: {}, orders: { type: 'idle' }, state: 'docked', dockedAt: station.id, log: [],
    };
    this.ships.set(id, ship);
    return ship;
  }

  finishSupply(ship, station) {
    const m = station.market;
    let delivered = 0;
    for (const [g, n] of Object.entries(ship.cargo)) {
      const slot = m.goods[g];
      if (!slot) continue;
      const k = Math.min(n, Math.floor(slot.cap - slot.stock));
      slot.stock += k;
      delivered += k;
      stat(m, this.time, 'i', g, k);
    }
    m.supply = { state: 'cooldown', good: ship.orders.good, delivered, until: this.time + SUPPLY.COOLDOWN };
    this.removeShip(ship);
  }

  removeShip(ship) {
    this.ships.delete(ship.id);
  }

  statsFor(player, entityId) {
    const e = this.world.entities.get(entityId);
    if (!e?.market || !this.isKnown(player, e)) return null;
    const round = (o) => Object.fromEntries(Object.entries(o).map(([g, v]) => [g, Math.round(v * 10) / 10]));
    return {
      id: e.id, bucketSecs: STATS.BUCKET_SECS, buckets: STATS.BUCKETS, now: Math.floor(this.time / STATS.BUCKET_SECS),
      data: (e.market.stats || []).map((b) => ({ b: b.b, n: b.n, p: round(b.p), c: round(b.c), i: round(b.i), o: round(b.o) })),
    };
  }
}
