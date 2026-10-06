import { WORLD, GOODS, BELT_TYPES, SHIP_TYPES, FUEL, GOVERNOR_LICENSES, shipStats, freeFor, holdOf, PLAYER_COLORS, SHIP_NAMES, SUPPLY, NPC_OWNER, STATS,
  cellKey, cellOf, buyPrice, sellPrice, canBuyFrom, canSellTo, slotPrice } from '../shared/config.js';
import { World } from './world.js';
import { hexAt, hexKey } from '../shared/hex.js';
import { planPath, zoneEffects } from '../shared/nav.js';
import { tickMarket, stat, missingInput } from './markets.js';
import { updateShip, setWarn } from './ships.js';
import { Store } from './db.js';
import { addToBuckets, bucketOf, summary, sumWindow, balance, SHIP_STATS } from './stats.js';
import { applyProperty, tickOwnedPlanet, strangerBlocked, payForDelivery, sellToSupplier, propBook } from './property.js';

export const WORLD_GEN_VERSION = 2; // ändert sich die Generierung inkompatibel, wird die Welt neu erzeugt
const ALL_TABLES = ['players', 'ships', 'sectors', 'entities', 'markets', 'routes', 'favorites', 'discoveries', 'ownership',
  'market_stats', 'ship_stats', 'route_stats', 'meta'];

export class Game {
  /** dbFile: Pfad zur SQLite-Datei oder ':memory:' */
  constructor(dbFile, { seed, verbose = false } = {}) {
    this.verbose = verbose;
    this.store = new Store(dbFile);
    this.time = 0;
    this.players = new Map();
    this.ships = new Map();
    this.routes = new Map();
    this.shipStats = new Map();  // Schiff-ID -> Ringpuffer
    this.routeStats = new Map(); // Routen-ID -> Ringpuffer
    this.ownership = new Map();  // Entity-ID -> Besitz
    this.counters = { player: 0, ship: 0, route: 0, group: 0 };
    this.econAcc = 0;
    this.newDiscoveries = []; // [player, kind, key] seit dem letzten Speichern
    this.listeners = { reveal: [], log: [], routes: [], player: [], notice: [], entity: [] };
    if (!this.load()) {
      this.world = new World(seed ?? ((Math.random() * 2 ** 31) | 0));
      this.world.ensureSector(0, 0);
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
      st.transaction(() => { for (const t of ALL_TABLES) st.db.prepare(`DELETE FROM ${t}`).run(); });
      for (const c of st.cache.values()) c.clear();
      return false;
    }
    this.time = st.getMeta('time');
    this.counters = { ...this.counters, ...st.getMeta('counters') };
    this.world = new World(st.getMeta('seed'));
    const markets = new Map(st.loadAll('markets').map((r) => [r.id, r.data]));
    const stats = groupRows(st.loadAll('market_stats'), 'entity');
    for (const r of st.loadAll('sectors')) this.world.addSector(r.data);
    for (const r of st.loadAll('entities')) {
      const e = r.data;
      if (markets.has(e.id)) {
        e.market = markets.get(e.id);
        e.market.stats = stats.get(e.id) || [];
      }
      this.world.addEntity(e);
    }
    for (const r of st.loadAll('players')) this.players.set(r.id, { ...r.data, revealed: new Set(), favorites: {}, known: newKnown() });
    for (const d of st.loadDiscoveries()) {
      const p = this.players.get(d.player);
      if (!p) continue;
      if (d.kind === 'cell') p.revealed.add(d.key);
      else p.known[d.kind]?.add(d.key);
    }
    for (const r of st.loadAll('favorites')) {
      const p = this.players.get(r.player);
      if (p) p.favorites[r.entity] = r.data;
    }
    for (const r of st.loadAll('ships')) this.ships.set(r.id, r.data);
    for (const r of st.loadAll('routes')) this.routes.set(r.id, r.data);
    for (const r of st.loadAll('ownership')) {
      const e = this.world.entities.get(r.entity);
      if (!e?.market) continue;
      this.ownership.set(r.entity, r.data);
      applyProperty(this, e, r.data);
    }
    this.shipStats = groupRows(st.loadAll('ship_stats'), 'ship');
    this.routeStats = groupRows(st.loadAll('route_stats'), 'route');
    if (this.verbose) console.log(`Spielstand geladen: ${this.players.size} Spieler, ${this.world.entities.size} Objekte, ${this.ships.size} Schiffe`);
    return true;
  }

  save() {
    const st = this.store;
    const t0 = Date.now();
    let n = 0;
    const bucketRows = (map) => {
      const rows = [];
      for (const [id, list] of map) for (const { b, ...data } of list) rows.push({ key: [id, b], data });
      return rows;
    };
    st.transaction(() => {
      st.setMeta('worldGen', WORLD_GEN_VERSION);
      st.setMeta('seed', this.world.seed);
      st.setMeta('time', this.time);
      st.setMeta('counters', this.counters);
      n += st.sync('sectors', [...this.world.sectors.values()].map((sec) => ({ key: [sec.key], data: sec })));
      const ents = [], mkts = [], mstats = [];
      for (const e of this.world.entities.values()) {
        const { market, ...stat } = e;
        ents.push({ key: [e.id], cols: [e.sector ?? ''], data: stat });
        if (market) {
          const { stats, ...m } = market;
          mkts.push({ key: [e.id], data: m });
          for (const { b, ...data } of stats || []) mstats.push({ key: [e.id, b], data });
        }
      }
      n += st.sync('entities', ents);
      n += st.sync('markets', mkts);
      n += st.sync('market_stats', mstats, false);
      st.trimStats('market_stats', Math.floor(this.time / STATS.BUCKET_SECS) - STATS.BUCKETS);
      const favs = [];
      n += st.sync('players', [...this.players.values()].map((p) => {
        const { revealed, favorites, known, ...data } = p;
        for (const [ent, f] of Object.entries(favorites)) favs.push({ key: [p.id, ent], data: f });
        return { key: [p.id], data };
      }));
      n += st.sync('favorites', favs);
      n += st.sync('ships', [...this.ships.values()].map((s) => ({ key: [s.id], cols: [s.owner], data: s })));
      n += st.sync('routes', [...this.routes.values()].map((r) => ({ key: [r.id], cols: [r.owner], data: r })));
      n += st.sync('ownership', [...this.ownership.values()].map((p) => ({ key: [p.entity], cols: [p.player], data: p })));
      n += st.sync('ship_stats', bucketRows(this.shipStats), false);
      n += st.sync('route_stats', bucketRows(this.routeStats), false);
      const minB = bucketOf(this.time) - SHIP_STATS.BUCKETS;
      st.trimStats('ship_stats', minB);
      st.trimStats('route_stats', minB);
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
      revealed: new Set(), favorites: {}, known: newKnown(), groups: [], stopLoss: 0, pilot: 1, createdAt: Date.now(), lastSeen: Date.now() };
    this.players.set(id, p);
    // Startwissen: Startsystem aufgedeckt, alle Systeme und Sondergebiete des Startsektors bekannt
    const home = this.world.sectors.get('0,0');
    const startSys = home.systems.find((x) => x.start);
    this.revealAround(p, startSys.x, startSys.y, WORLD.SYSTEM_RADIUS + 1500);
    const hub = this.world.entities.get(home.hub);
    this.revealAround(p, hub.x, hub.y, 2500);
    this.discover(p, 'sector', home.key);
    for (const sy of home.systems) this.discover(p, 'system', sy.id);
    for (const z of home.zones) this.discover(p, 'zone', z.id);
    this.spawnShip(p, 'spatz', this.world.entities.get('origin_yard'));
    return p;
  }

  shipsOf(playerId) { return [...this.ships.values()].filter((s) => s.owner === playerId); }

  /** Eindeutiger Schiffsname je Spieler */
  uniqueShipName(playerId, wanted, exceptId = null) {
    const taken = new Set(this.shipsOf(playerId).filter((s) => s.id !== exceptId).map((s) => s.name.toLowerCase()));
    if (!taken.has(wanted.toLowerCase())) return wanted;
    for (let i = 2; ; i++) {
      const n = `${wanted.slice(0, 20)} ${i}`;
      if (!taken.has(n.toLowerCase())) return n;
    }
  }

  spawnShip(player, type, atEntity) {
    const id = 's' + ++this.counters.ship;
    const a = Math.random() * Math.PI * 2;
    const d = atEntity.radius + WORLD.DOCK_OFFSET;
    const own = this.shipsOf(player.id);
    const name = this.uniqueShipName(player.id, SHIP_NAMES[(own.length + this.counters.player * 3) % SHIP_NAMES.length]);
    const ship = {
      id, owner: player.id, type, name,
      x: atEntity.x + Math.cos(a) * d, y: atEntity.y + Math.sin(a) * d, angle: a + Math.PI / 2, vx: 0, vy: 0,
      cargo: {}, queue: [], qid: 0, state: 'docked', dockedAt: atEntity.id, log: [],
      group: null, ord: own.reduce((m, s) => Math.max(m, s.ord || 0), 0) + 1, tot: {},
      fuel: SHIP_TYPES[type].tank, autoRefuel: FUEL.AUTO_DEFAULT, upg: {}, modules: [], upgValue: 0,
    };
    this.discover(player, 'ship', type);
    this.ships.set(id, ship);
    return ship;
  }

  // ---------- Statistik ----------
  recordShip(ship, field, n, route = null) {
    if (!n || ship.owner === NPC_OWNER) return;
    ship.tot ||= {};
    ship.tot[field] = (ship.tot[field] || 0) + n;
    if (!this.shipStats.has(ship.id)) this.shipStats.set(ship.id, []);
    addToBuckets(this.shipStats.get(ship.id), this.time, field, n);
    if (route && (field === 'inc' || field === 'buy' || field === 'fuel')) {
      if (!this.routeStats.has(route.id)) this.routeStats.set(route.id, []);
      addToBuckets(this.routeStats.get(route.id), this.time, field, n);
    }
  }

  shipSummary(ship) { return summary(ship.tot, this.shipStats.get(ship.id), this.time); }
  shipBalance1h(ship) { return balance(sumWindow(this.shipStats.get(ship.id), this.time, 3600)); }
  routeSummary(route) {
    const l = this.routeStats.get(route.id);
    return { h1: Math.round(balance(sumWindow(l, this.time, 3600))), d24: Math.round(balance(sumWindow(l, this.time, 86400))) };
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
        if (Math.hypot(mx - x, my - y) > r + C * 0.35) continue;
        const k = cellKey(cx, cy);
        if (p.revealed.has(k)) continue;
        p.revealed.add(k);
        newCells.push(k);
        this.newDiscoveries.push([p.id, 'cell', k]);
      }
    }
    if (!newCells.length) return;
    const entities = [];
    for (const k of newCells) {
      for (const id of this.world.entitiesInCell(k)) {
        const e = this.world.entities.get(id);
        entities.push(e);
        // Almanach: Rezept bzw. Planeten-/Feldtyp ist entdeckt, sobald der Markt in Sensorreichweite war
        const rk = recipeKey(e);
        if (rk) this.discover(p, 'recipe', rk);
        for (const it of e.market?.forSale || []) this.discover(p, 'ship', it.type);
        for (const m of e.market?.modules || []) this.discover(p, 'module', m);
        // Das andere Ende eines Wurmlochs ist schon bekannt: Verbindung gilt als aufgedeckt
        if (e.kind === 'wormhole') {
          const other = this.world.entities.get(e.pair);
          if (other && this.isKnown(p, other)) this.discover(p, 'wh', e.wh);
        }
      }
    }
    this.emit('reveal', p, { cells: newCells, entities });
  }

  /** Entdeckung buchen (system, sector, zone, wh). Meldet Neues an den Client. */
  discover(p, kind, key) {
    if (p.known[kind].has(key)) return false;
    p.known[kind].add(key);
    this.newDiscoveries.push([p.id, kind, key]);
    const out = {};
    if (kind === 'system') out.systems = [this.world.systems.get(key)];
    if (kind === 'sector') out.sectors = [sectorSummary(this.world.sectors.get(key))];
    if (kind === 'zone') out.zones = [this.findZone(key)];
    if (kind === 'wh') out.wh = [this.wormholeInfo(key)];
    if (kind === 'recipe') out.recipes = [key];
    if (kind === 'ship') out.ships = [key];
    if (kind === 'module') out.modules = [key];
    this.emit('reveal', p, out);
    return true;
  }

  findZone(id) {
    const [, q, r] = /^z(-?\d+)_(-?\d+)_/.exec(id) || [];
    return this.world.sectors.get(hexKey(Number(q), Number(r)))?.zones.find((z) => z.id === id);
  }

  wormholeInfo(id) {
    const w = this.world.wormholes.get(id);
    const a = this.world.entities.get(w.a), b = this.world.entities.get(w.b);
    return { id, a: { id: a.id, x: a.x, y: a.y }, b: { id: b.id, x: b.x, y: b.y } };
  }

  /** Bekannte Wurmlöcher eines Spielers mit beiden Enden (für die Navigation) */
  knownWormholes(p) {
    const out = [];
    for (const id of p.known.wh) {
      const w = this.world.wormholes.get(id);
      if (!w) continue;
      const a = this.world.entities.get(w.a), b = this.world.entities.get(w.b);
      if (a && b) out.push({ id, a, b });
    }
    return out;
  }

  /** Wegplanung über bekannte Wurmlöcher. Legs: [{ x, y, wh? }], letzter Leg = Ziel. */
  planLegs(ship, x, y) {
    const p = this.players.get(ship.owner);
    if (!p) return { time: 0, legs: [{ x, y }] };
    const zones = [...this.world.zonesNear(ship.x, ship.y), ...this.world.zonesNear(x, y)];
    return planPath(ship, { x, y }, this.knownWormholes(p), this.shipSpeed(ship), [...new Set(zones)]);
  }

  shipSpeed(ship) { return shipStats(ship).speed; }
  shipTank(ship) { return shipStats(ship).tank || 0; }

  /** Beim Andocken: Auto-Tanken unter der eingestellten Schwelle */
  onDock(ship, e) {
    if (ship.owner === NPC_OWNER) return;
    // Almanach: angebotene Schiffe und Module sind gesehen
    const p = this.players.get(ship.owner);
    if (p && e.market) {
      for (const it of e.market.forSale || []) this.discover(p, 'ship', it.type);
      if (e.market.building) this.discover(p, 'ship', e.market.building.type);
      for (const m of e.market.modules || []) this.discover(p, 'module', m);
    }
    const tank = this.shipTank(ship);
    if (tank > 0 && ship.autoRefuel > 0 && ship.fuel < tank * ship.autoRefuel && e.market?.goods.shipfuel && canBuyFrom(e.market.goods.shipfuel)) {
      this.refuel(ship, e);
    }
  }

  /**
   * Tanken: Schiffstreibstoff aus dem Marktbestand zum Marktpreis. Nicht vom Stop-Loss betroffen.
   * Rückgabe { ok, n, cost } oder { ok: false, reason }
   */
  refuel(ship, e, route = null) {
    const p = this.players.get(ship.owner);
    const tank = this.shipTank(ship);
    const slot = e.market?.goods.shipfuel;
    if (ship.dockedAt !== e.id) return { ok: false, reason: 'nicht angedockt' };
    if (!slot || !canBuyFrom(slot)) return { ok: false, reason: 'kein Treibstoff im Angebot' };
    const missing = tank - ship.fuel;
    if (missing < 0.05) return { ok: false, reason: 'voll' };
    const price = buyPrice('shipfuel', slot);
    const n = Math.min(missing, slot.stock, p.credits / price);
    if (n < 0.05) return { ok: false, reason: slot.stock < 0.05 ? 'kein Bestand' : 'zu wenig Credits' };
    const cost = n * price;
    p.credits -= cost;
    slot.stock -= n;
    ship.fuel = Math.min(tank, ship.fuel + n);
    stat(e.market, this.time, 'o', 'shipfuel', n);
    this.recordShip(ship, 'fuel', cost, route);
    setWarn(ship, 'fuel', null);
    this.shipLog(ship, `Getankt: ${n.toFixed(1)} Schiffstreibstoff für ${Math.round(cost)} Cr bei ${e.name}`);
    return { ok: true, n, cost };
  }

  /** Sensorlauf eines Spielerschiffs: Nebel, Fernortung, Sondergebiete, Sektoren, Nachgenerierung */
  scan(ship) {
    const p = this.players.get(ship.owner);
    if (!p) return;
    for (const { sector, entities } of this.world.ensureAround(ship.x, ship.y)) this.onSectorCreated(sector, entities);
    const fx = zoneEffects(this.world.zonesNear(ship.x, ship.y), ship.x, ship.y);
    this.revealAround(p, ship.x, ship.y, WORLD.SENSOR_RANGE * fx.sensor);
    const h = hexAt(ship.x, ship.y);
    if (this.world.sectors.has(hexKey(h.q, h.r))) this.discover(p, 'sector', hexKey(h.q, h.r));
    for (const sy of this.world.systemsNear(ship.x, ship.y)) {
      if (p.known.system.has(sy.id)) continue;
      if (Math.hypot(sy.x - ship.x, sy.y - ship.y) <= WORLD.SYSTEM_DETECT) {
        this.discover(p, 'system', sy.id);
        this.discover(p, 'sector', sy.sector);
      }
    }
    for (const z of this.world.zonesNear(ship.x, ship.y)) {
      if (!p.known.zone.has(z.id) && Math.hypot(z.x - ship.x, z.y - ship.y) <= WORLD.SYSTEM_DETECT * 0.6 + Math.max(z.rx, z.ry)) this.discover(p, 'zone', z.id);
    }
  }

  /** Gouverneurslizenz: beim ersten Erwerb benennt der Spieler seine Fraktion */
  buyGovernor(player, { name, color }) {
    const next = GOVERNOR_LICENSES[(player.governor || 0) + 1];
    if (!next) return 'Höchste Gouverneurslizenz erreicht.';
    if (!player.faction) {
      if (!name) return 'Beim ersten Erwerb braucht deine Fraktion einen Namen.';
      const taken = [...this.players.values()].some((q) => q !== player && q.faction?.name.toLowerCase() === name.toLowerCase());
      if (taken) return 'Diesen Fraktionsnamen gibt es schon.';
    }
    if (player.credits < next.cost) return 'Nicht genug Credits.';
    player.credits -= next.cost;
    player.governor = next.level;
    if (!player.faction) player.faction = { name, color: color || player.color };
    this.emit('notice', player, `Gouverneurslizenz ${next.level} erworben`);
    return undefined;
  }

  /** Besitz übernehmen */
  setOwner(e, player, prop) {
    this.ownership.set(e.id, prop);
    if (e.market.supply?.state === 'nosource') e.market.supply = null;
    applyProperty(this, e, prop);
    this.emit('entity', e);
  }

  /** Nach Änderungen am Besitz neu anwenden und melden */
  refreshProperty(e) {
    const prop = this.ownership.get(e.id);
    if (prop) applyProperty(this, e, prop);
    this.emit('entity', e);
  }

  /** Nach einem Wurmlochdurchflug ist die Verbindung bekannt */
  onWormholeTransit(ship, whId, exit) {
    const p = this.players.get(ship.owner);
    if (p) this.discover(p, 'wh', whId);
    this.shipLog(ship, `Wurmloch durchflogen, Austritt bei ${exit.name}`);
  }

  /** Neue Objekte in bereits aufgedeckten Zellen an die betroffenen Spieler melden */
  onSectorCreated(sector, entities) {
    if (this.verbose) console.log(`Sektor ${sector.name} (${sector.key}) erzeugt: ${sector.systems.length} Systeme, ${entities.length} Objekte`);
    for (const p of this.players.values()) {
      const vis = entities.filter((e) => this.isKnown(p, e));
      if (vis.length) this.emit('reveal', p, { entities: vis });
    }
  }

  // ---------- Simulation ----------
  tick(dt) {
    this.time += dt;
    for (const s of this.ships.values()) {
      updateShip(s, dt, this);
      if (s.owner !== NPC_OWNER && (s.revX === undefined || Math.hypot(s.x - s.revX, s.y - s.revY) > 300)) {
        s.revX = s.x;
        s.revY = s.y;
        this.scan(s);
      }
    }
    this.econAcc += dt;
    if (this.econAcc >= 1) {
      for (const prop of this.ownership.values()) {
        const e = this.world.entities.get(prop.entity);
        if (e?.kind === 'planet') tickOwnedPlanet(this, e, prop, this.econAcc);
      }
      for (const e of this.world.entities.values()) {
        tickMarket(e, this.econAcc, this.time, this);
        if (e.market && SUPPLIED.has(e.market.strategy)) this.checkSupply(e);
      }
      this.econAcc = 0;
    }
  }

  shipLog(ship, msg) {
    ship.log.unshift({ t: Math.round(this.time), msg });
    if (ship.log.length > 12) ship.log.length = 12;
    this.emit('log', ship, msg);
  }

  /** Stop-Loss: Schwelle, unter die automatische Einkäufe den Kontostand nicht drücken dürfen */
  stopLossFor(player, route) {
    return Math.max(player.stopLoss || 0, route?.minBalance || 0);
  }

  /**
   * Handel. limit: max. Einkaufspreis bzw. min. Verkaufspreis pro Einheit (0 = egal).
   * opts.auto: automatischer Einkauf aus Routen (Stop-Loss greift), opts.route: Routenvorlage für die Statistik
   */
  trade(ship, e, good, amount, dir, limit = 0, opts = {}) {
    const p = this.players.get(ship.owner);
    const slot = e.market?.goods[good];
    if (!slot || !GOODS[good]) return { n: 0, reason: 'Ware wird hier nicht gehandelt' };
    if (ship.dockedAt !== e.id) return { n: 0, reason: 'Schiff ist nicht angedockt' };
    const prop = this.ownership.get(e.id);
    if (prop && prop.player === ship.owner) return this.ownerTransfer(ship, e, good, amount, dir);
    if (prop) {
      const blocked = strangerBlocked(prop);
      if (blocked) return { n: 0, reason: blocked };
      return this.tradeWithOwner(ship, e, prop, good, amount, dir, limit, opts);
    }
    let n = 0, total = 0;
    if (dir === 'buy') {
      if (!canBuyFrom(slot)) return { n: 0, reason: 'Ware wird hier nicht verkauft' };
      const floor = opts.auto ? this.stopLossFor(p, opts.route) : 0;
      const free = freeFor(ship, good);
      if (free <= 0 && holdOf(good) !== 'cargo' && !shipStats(ship)[holdOf(good)]) {
        return { n: 0, reason: holdOf(good) === 'hazard' ? 'Gefahrgut braucht eine Geschirmte Kammer' : 'Passagiere brauchen eine Passagierkabine' };
      }
      const max = Math.min(amount, free, Math.floor(slot.stock));
      let blocked = false;
      while (n < max) {
        const pr = buyPrice(good, slot);
        if (limit && pr > limit) break;
        if (p.credits - pr < floor) { blocked = floor > 0; break; }
        p.credits -= pr; slot.stock -= 1; total += pr; n++;
      }
      if (opts.auto) setWarn(ship, 'stoploss', blocked ? `Stop-Loss: Einkauf ${GOODS[good].name} gestoppt` : null);
      if (n) ship.cargo[good] = (ship.cargo[good] || 0) + n;
      if (n) this.recordShip(ship, 'buy', total, opts.route);
      if (!n) {
        if (blocked) return { n: 0, reason: 'stoploss' };
        if (slot.stock < 1) return { n: 0, reason: 'kein Bestand' };
        if (free <= 0) return { n: 0, reason: 'Laderaum voll' };
        if (limit && buyPrice(good, slot) > limit) return { n: 0, reason: 'Preisgrenze' };
        return { n: 0, reason: 'zu wenig Credits' };
      }
    } else {
      if (!canSellTo(slot)) return { n: 0, reason: 'Ware wird hier nicht angekauft' };
      const have = ship.cargo[good] || 0;
      const max = Math.min(amount, have, Math.floor(slot.cap - slot.stock));
      while (n < max) {
        const pr = sellPrice(good, slot);
        if (limit && pr < limit) break;
        p.credits += pr; slot.stock += 1; total += pr; n++;
      }
      ship.cargo[good] = have - n;
      if (!ship.cargo[good]) delete ship.cargo[good];
      if (n) this.recordShip(ship, 'inc', total, opts.route);
      if (!n) return { n: 0, reason: slot.cap - slot.stock < 1 ? 'Lager voll' : limit ? 'Preisgrenze' : 'nicht möglich' };
    }
    stat(e.market, this.time, dir === 'buy' ? 'o' : 'i', good, n);
    this.shipLog(ship, `${dir === 'buy' ? 'Gekauft' : 'Verkauft'}: ${n} ${GOODS[good].name} für ${Math.round(total)} Cr bei ${e.name}`);
    return { n, total };
  }

  /** Eigenes Lager: kostenlos laden und einlagern */
  ownerTransfer(ship, e, good, amount, dir) {
    const slot = e.market.goods[good];
    let n;
    if (dir === 'buy') {
      n = Math.min(amount, freeFor(ship, good), Math.floor(slot.stock));
      if (n <= 0) return { n: 0, reason: slot.stock < 1 ? 'kein Bestand' : 'Laderaum voll' };
      slot.stock -= n;
      ship.cargo[good] = (ship.cargo[good] || 0) + n;
    } else {
      const have = ship.cargo[good] || 0;
      n = Math.min(amount, have, Math.floor(slot.cap - slot.stock));
      if (n <= 0) return { n: 0, reason: have ? 'Lager voll' : 'nichts geladen' };
      slot.stock += n;
      ship.cargo[good] = have - n;
      if (!ship.cargo[good]) delete ship.cargo[good];
    }
    stat(e.market, this.time, dir === 'buy' ? 'o' : 'i', good, n);
    this.shipLog(ship, `${dir === 'buy' ? 'Geladen' : 'Eingelagert'}: ${n} ${GOODS[good].name} bei ${e.name}`);
    return { n, total: 0 };
  }

  /**
   * Handel eines Fremden mit Spielerbesitz: Käufe bringen dem Besitzer den Erlös, Verkäufe zahlt der Besitzer.
   * Zoll: Aufschlag auf alle Geschäfte von Fremden. Bei leerem Konto oder aktivem Stop-Loss nimmt der Markt nichts an.
   */
  tradeWithOwner(ship, e, prop, good, amount, dir, limit, opts) {
    const p = this.players.get(ship.owner);
    const owner = this.players.get(prop.player);
    const slot = e.market.goods[good];
    const c = prop.customs || 0;
    let n = 0, total = 0;
    if (dir === 'buy') {
      if (!canBuyFrom(slot)) return { n: 0, reason: 'Ware wird hier nicht verkauft' };
      const floor = opts.auto ? this.stopLossFor(p, opts.route) : 0;
      const max = Math.min(amount, freeFor(ship, good), Math.floor(slot.stock));
      while (n < max) {
        const pr = buyPrice(good, slot) * (1 + c);
        if ((limit && pr > limit) || p.credits - pr < floor || p.credits < pr) break;
        p.credits -= pr; owner.credits += pr; slot.stock -= 1; total += pr; n++;
      }
      if (n) { ship.cargo[good] = (ship.cargo[good] || 0) + n; this.recordShip(ship, 'buy', total, opts.route); propBook(this, prop, 'inc', total); }
    } else {
      if (!canSellTo(slot)) return { n: 0, reason: 'Ware wird hier nicht angekauft' };
      const have = ship.cargo[good] || 0;
      const max = Math.min(amount, have, Math.floor(slot.cap - slot.stock));
      const floor = owner.stopLoss || 0;
      while (n < max) {
        const pr = sellPrice(good, slot) * (1 - c);
        if (limit && pr < limit) break;
        if (owner.credits - pr < floor || owner.credits < pr) break;
        owner.credits -= pr; p.credits += pr; slot.stock += 1; total += pr; n++;
      }
      ship.cargo[good] = have - n;
      if (!ship.cargo[good]) delete ship.cargo[good];
      if (n) { this.recordShip(ship, 'inc', total, opts.route); propBook(this, prop, 'exp', total); }
      if (!n && max > 0) return { n: 0, reason: 'Besitzer kann nicht zahlen (Konto oder Stop-Loss)' };
    }
    if (!n) return { n: 0, reason: dir === 'buy' ? 'nicht möglich' : 'Lager voll' };
    stat(e.market, this.time, dir === 'buy' ? 'o' : 'i', good, n);
    this.shipLog(ship, `${dir === 'buy' ? 'Gekauft' : 'Verkauft'}: ${n} ${GOODS[good].name} für ${Math.round(total)} Cr bei ${e.name}${c ? ` (Zoll ${Math.round(c * 100)} %)` : ''}`);
    return { n, total };
  }

  /** Besitz-Eintrag eines Objekts (oder undefined) */
  propertyOf(e) { return this.ownership.get(e.id); }

  // ---------- Automatische Versorgung ----------
  checkSupply(e) {
    const m = e.market;
    const prop = this.ownership.get(e.id);
    if (prop?.mode === 'private') return; // privat: keine NPC-Versorger
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
    ship.queue = [{ t: 'supply', stationId: e.id, sourceId: src.id, good, phase: 'toSource' }];
    m.supply = { state: 'active', good, shipId: ship.id, sourceId: src.id };
  }

  /** Nächstgelegene Quelle im Umkreis: Produzent mit Vorrat oder passendes Asteroidenfeld */
  findSource(e, good) {
    let best = null, bestD = Infinity;
    for (const s of this.world.sectorEntities(e.sector)) {
      if (s === e || s.kind === 'wormhole') continue;
      const d = Math.hypot(s.x - e.x, s.y - e.y);
      if (d > SUPPLY.RANGE || d >= bestD) continue;
      if (s.kind === 'belt') {
        if (BELT_TYPES[s.type].good !== good) continue;
      } else {
        const sl = s.market?.goods[good];
        if (!sl || !canBuyFrom(sl) || sl.stock < SUPPLY.MIN_SOURCE_STOCK) continue;
        if (this.ownership.get(s.id)?.mode === 'private') continue;
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
      cargo: {}, queue: [], state: 'docked', dockedAt: station.id, log: [],
    };
    this.ships.set(id, ship);
    return ship;
  }

  finishSupply(ship, station) {
    const m = station.market;
    let delivered = 0;
    const prop = this.ownership.get(station.id);
    for (const [g, n] of Object.entries(ship.cargo)) {
      const slot = m.goods[g];
      if (!slot) continue;
      let k = Math.min(n, Math.floor(slot.cap - slot.stock));
      if (prop) k = payForDelivery(this, station, prop, g, k); // Besitzer zahlt den Marktpreis
      else slot.stock += k;
      delivered += k;
      stat(m, this.time, 'i', g, k);
    }
    m.supply = { state: 'cooldown', good: ship.queue[0]?.good, delivered, until: this.time + SUPPLY.COOLDOWN };
    this.removeShip(ship);
  }

  removeShip(ship) {
    this.ships.delete(ship.id);
    this.shipStats.delete(ship.id);
  }

  statsFor(player, entityId) {
    const e = this.world.entities.get(entityId);
    if (!e?.market || !this.isKnown(player, e)) return null;
    const round = (o) => Object.fromEntries(Object.entries(o || {}).map(([g, v]) => [g, Math.round(v * 10) / 10]));
    return {
      id: e.id, bucketSecs: STATS.BUCKET_SECS, buckets: STATS.BUCKETS, now: Math.floor(this.time / STATS.BUCKET_SECS),
      data: (e.market.stats || []).map((b) => ({ b: b.b, n: b.n, p: round(b.p), c: round(b.c), i: round(b.i), o: round(b.o), pr: round(b.pr) })),
    };
  }

  /** Aktueller Mittelpreis (ohne Spread) */
  midPrice(e, good) {
    const s = e.market?.goods[good];
    return s ? slotPrice(good, s) : null;
  }
}

/** Strategien, die bei fehlenden Zutaten NPC-Versorger losschicken */
const SUPPLIED = new Set(['factory', 'extractor', 'shipyard']);

const newKnown = () => ({ system: new Set(), sector: new Set(), zone: new Set(), wh: new Set(), recipe: new Set(), ship: new Set(), module: new Set() });

/** Almanach-Schlüssel: st:<Stationstyp>, pl:<Planetentyp>, bt:<Feldtyp> */
export function recipeKey(e) {
  if (e.kind === 'station') return 'st:' + e.type;
  if (e.kind === 'planet') return 'pl:' + e.type;
  if (e.kind === 'belt') return 'bt:' + e.type;
  return null;
}

/** Sektor-Kurzinfo für den Client */
export function sectorSummary(s) {
  return { key: s.key, q: s.q, r: s.r, name: s.name, bh: s.bh, hub: s.hub, hubPos: s.hubPos, bigyard: s.bigyard, faction: s.faction || null };
}

function groupRows(rows, keyCol) {
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r[keyCol])) m.set(r[keyCol], []);
    m.get(r[keyCol]).push({ b: r.bucket, ...r.data });
  }
  for (const l of m.values()) l.sort((a, b) => a.b - b.b);
  return m;
}
