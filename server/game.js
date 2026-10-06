import fs from 'node:fs';
import path from 'node:path';
import { WORLD, GOODS, SHIP_TYPES, STATION_TYPES, BELT_TYPES, PLAYER_COLORS, SHIP_NAMES, SAVE_VERSION, SUPPLY, NPC_OWNER, STATS,
  cellKey, cellOf, buyPrice, sellPrice } from '../shared/config.js';
import { World } from './world.js';
import { tickEntity, stat, missingInput } from './economy.js';
import { updateShip, cargoFree } from './ships.js';

const r1 = (v) => Math.round(v * 10) / 10;

export class Game {
  constructor(savePath) {
    this.savePath = savePath;
    this.time = 0;
    this.players = new Map();
    this.ships = new Map();
    this.sockets = new Map(); // playerId -> socket
    this.known = new Map();   // playerId -> Set(entityId), nur für verbundene Spieler
    this.counters = { player: 0, ship: 0 };
    this.econAcc = 0;
    if (!this.load()) {
      this.world = new World((Math.random() * 2 ** 31) | 0);
      this.world.ensureChunk(0, 0);
    }
  }

  // ---------- Persistenz ----------
  load() {
    if (!fs.existsSync(this.savePath)) return false;
    try {
      const d = JSON.parse(fs.readFileSync(this.savePath, 'utf8'));
      if (d.version !== SAVE_VERSION) {
        const archive = this.savePath.replace(/\.json$/, `.v${d.version}-${Date.now()}.json`);
        fs.renameSync(this.savePath, archive);
        console.log(`Spielstand-Version ${d.version} ist veraltet, archiviert als ${path.basename(archive)}. Neue Welt wird erzeugt.`);
        return false;
      }
      this.world = World.fromJSON(d.world);
      this.time = d.time;
      this.counters = d.counters;
      for (const p of d.players) this.players.set(p.id, { ...p, revealed: new Set(p.revealed) });
      for (const s of d.ships) this.ships.set(s.id, s);
      console.log(`Spielstand geladen: ${this.players.size} Spieler, ${this.world.entities.size} Objekte`);
      return true;
    } catch (err) {
      console.error('Spielstand defekt, starte neue Welt:', err.message);
      fs.renameSync(this.savePath, this.savePath + '.broken-' + Date.now());
      return false;
    }
  }

  save() {
    const data = {
      version: SAVE_VERSION,
      time: this.time,
      counters: this.counters,
      world: this.world.toJSON(),
      players: [...this.players.values()].map((p) => ({ ...p, revealed: [...p.revealed] })),
      ships: [...this.ships.values()],
    };
    fs.mkdirSync(path.dirname(this.savePath), { recursive: true });
    const tmp = this.savePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, this.savePath);
  }

  // ---------- Spieler ----------
  playerList() {
    return [...this.players.values()]
      .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
      .map((p) => ({ id: p.id, name: p.name, color: p.color, online: this.sockets.has(p.id) }));
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

  attach(player, socket) {
    const old = this.sockets.get(player.id);
    if (old && old !== socket) {
      old.emit('kicked', 'Mit diesem Namen hat sich jemand anderes angemeldet.');
      old.disconnect(true);
    }
    this.sockets.set(player.id, socket);
    player.lastSeen = Date.now();
    const known = new Set();
    const entities = [];
    for (const k of player.revealed) {
      for (const id of this.world.entitiesInCell(k)) {
        known.add(id);
        entities.push(this.serializeEntity(this.world.entities.get(id)));
      }
    }
    this.known.set(player.id, known);
    socket.emit('welcome', {
      you: { id: player.id, name: player.name, color: player.color },
      cells: [...player.revealed],
      entities,
      players: this.playerList(),
    });
    this.sendStateTo(player);
  }

  detach(player, socket) {
    if (this.sockets.get(player.id) !== socket) return;
    this.sockets.delete(player.id);
    this.known.delete(player.id);
    player.lastSeen = Date.now();
  }

  // ---------- Nebel des Krieges ----------
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
      }
    }
    if (!newCells.length) return;
    const sock = this.sockets.get(p.id);
    const known = this.known.get(p.id);
    if (!sock || !known) return;
    const entities = [];
    for (const k of newCells) {
      for (const id of this.world.entitiesInCell(k)) {
        if (known.has(id)) continue;
        known.add(id);
        entities.push(this.serializeEntity(this.world.entities.get(id)));
      }
    }
    sock.emit('reveal', { cells: newCells, entities });
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
        tickEntity(e, this.econAcc, this.time);
        if (e.kind === 'station' && STATION_TYPES[e.type].recipe) this.checkSupply(e);
      }
      this.econAcc = 0;
    }
  }

  shipLog(ship, msg) {
    ship.log.unshift({ t: Date.now(), msg });
    if (ship.log.length > 8) ship.log.length = 8;
    this.sockets.get(ship.owner)?.emit('log', { ship: ship.name, msg });
  }

  /** limit: max. Einkaufspreis bzw. min. Verkaufspreis pro Einheit (0 = egal) */
  trade(ship, e, good, amount, dir, limit = 0) {
    const p = this.players.get(ship.owner);
    const slot = e.market?.goods[good];
    if (!slot || !GOODS[good]) return { n: 0, reason: 'Diese Ware wird hier nicht gehandelt.' };
    if (ship.dockedAt !== e.id) return { n: 0, reason: 'Schiff ist nicht angedockt.' };
    let n = 0, total = 0;
    if (dir === 'buy') {
      if (slot.role !== 'produce') return { n: 0, reason: 'Hier wird diese Ware nicht verkauft.' };
      const max = Math.min(amount, cargoFree(ship), Math.floor(slot.stock));
      while (n < max) {
        const pr = buyPrice(good, slot.stock, slot.cap);
        if (p.credits < pr || (limit && pr > limit)) break;
        p.credits -= pr; slot.stock -= 1; total += pr; n++;
      }
      if (n) ship.cargo[good] = (ship.cargo[good] || 0) + n;
    } else if (dir === 'sell') {
      if (slot.role !== 'consume') return { n: 0, reason: 'Hier wird diese Ware nicht angekauft.' };
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
    const good = missingInput(e);
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
        if (!sl || sl.role !== 'produce' || sl.stock < SUPPLY.MIN_SOURCE_STOCK) continue;
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
    if (!e?.market || !this.known.get(player.id)?.has(entityId)) return null;
    const round = (o) => Object.fromEntries(Object.entries(o).map(([g, v]) => [g, Math.round(v * 10) / 10]));
    return {
      id: e.id, bucketSecs: STATS.BUCKET_SECS, buckets: STATS.BUCKETS, now: Math.floor(this.time / STATS.BUCKET_SECS),
      data: (e.market.stats || []).map((b) => ({ b: b.b, n: b.n, p: round(b.p), c: round(b.c), i: round(b.i), o: round(b.o) })),
    };
  }

  // ---------- Befehle vom Client ----------
  command(player, cmd, msg) {
    const ship = msg.shipId ? this.ships.get(msg.shipId) : null;
    if (msg.shipId && (!ship || ship.owner !== player.id)) return 'Unbekanntes Schiff.';
    const known = this.known.get(player.id) || new Set();
    const target = msg.targetId ? this.world.entities.get(msg.targetId) : null;
    if (msg.targetId && (!target || !known.has(target.id))) return 'Unbekanntes Ziel.';

    switch (cmd) {
      case 'move':
        if (!Number.isFinite(msg.x) || !Number.isFinite(msg.y)) return 'Ungültige Koordinaten.';
        ship.orders = { type: 'move', x: msg.x, y: msg.y };
        return;
      case 'goto':
        ship.orders = { type: 'goto', targetId: target.id };
        return;
      case 'mine':
        if (target.kind !== 'belt') return 'Nur in Asteroidenfeldern möglich.';
        if (!SHIP_TYPES[ship.type].mining) return 'Dieses Schiff hat keine Bergbauausrüstung.';
        ship.orders = { type: 'mine', targetId: target.id };
        return;
      case 'stop':
        ship.orders = { type: 'idle' };
        return;
      case 'route': {
        const stops = this.validateRoute(msg.stops, known);
        if (typeof stops === 'string') return stops;
        ship.orders = stops.length ? { type: 'route', stops, index: 0, phase: 'travel', actionIdx: 0 } : { type: 'idle' };
        this.shipLog(ship, stops.length ? `Neue Route mit ${stops.length} Stopps` : 'Route gelöscht');
        return;
      }
      case 'trade': {
        if (!target) return 'Unbekanntes Ziel.';
        if (ship.orders.type === 'route') return 'Schiff fährt eine Route. Erst stoppen.';
        const amount = msg.amount === 'max' ? Infinity : Math.max(1, Math.floor(Number(msg.amount) || 1));
        const res = this.trade(ship, target, msg.good, amount, msg.dir);
        if (!res.n) return res.reason || (msg.dir === 'buy' ? 'Kauf nicht möglich (Credits, Laderaum oder Bestand).' : 'Verkauf nicht möglich (Lager voll?).');
        return;
      }
      case 'jettison':
        if (!ship.cargo[msg.good]) return;
        this.shipLog(ship, `${ship.cargo[msg.good]} ${GOODS[msg.good].name} abgeworfen`);
        delete ship.cargo[msg.good];
        return;
      case 'buyShip': {
        if (!target || target.type !== 'shipyard') return 'Keine Werft.';
        const docked = [...this.ships.values()].some((s) => s.owner === player.id && s.dockedAt === target.id);
        if (!docked) return 'Eines deiner Schiffe muss an der Werft angedockt sein.';
        const item = target.market.forSale[msg.index];
        if (!item) return 'Schiff nicht mehr verfügbar.';
        if (player.credits < item.price) return 'Nicht genug Credits.';
        player.credits -= item.price;
        target.market.forSale.splice(msg.index, 1);
        const s = this.spawnShip(player, item.type, target);
        this.shipLog(s, `Neues Schiff gekauft: ${SHIP_TYPES[item.type].name} bei ${target.name}`);
        return;
      }
      case 'rename': {
        const name = String(msg.name || '').trim().slice(0, 24);
        if (name) ship.name = name;
        return;
      }
      default:
        return 'Unbekannter Befehl.';
    }
  }

  validateRoute(stops, known) {
    if (!Array.isArray(stops) || stops.length > 12) return 'Ungültige Route (max. 12 Stopps).';
    const out = [];
    for (const s of stops) {
      const e = this.world.entities.get(s?.targetId);
      if (!e || !known.has(e.id)) return 'Route enthält unbekanntes Ziel.';
      if (!Array.isArray(s.actions) || s.actions.length > 8) return 'Zu viele Aktionen in einem Stopp.';
      const actions = [];
      for (const a of s.actions) {
        if (a.op === 'mine') { if (e.kind === 'belt') actions.push({ op: 'mine' }); continue; }
        if ((a.op === 'buy' || a.op === 'sell') && e.market?.goods[a.good]) {
          actions.push({ op: a.op, good: a.good, amount: Math.max(0, Math.floor(Number(a.amount) || 0)),
            limit: Math.max(0, Math.round((Number(a.limit) || 0) * 10) / 10) });
        }
      }
      out.push({ targetId: e.id, actions });
    }
    return out;
  }

  // ---------- Serialisierung ----------
  serializeEntity(e) {
    return { id: e.id, kind: e.kind, type: e.type, name: e.name, x: Math.round(e.x), y: Math.round(e.y), radius: e.radius,
      richness: e.richness, market: e.market ? this.serializeMarket(e.market, true) : null };
  }

  serializeMarket(m, full) {
    const goods = {};
    for (const [g, s] of Object.entries(m.goods)) {
      goods[g] = full ? { role: s.role, rate: s.rate, cap: s.cap, stock: r1(s.stock) } : r1(s.stock);
    }
    const out = { goods, eff: r1(m.eff ?? 1) };
    if (m.forSale) {
      out.forSale = m.forSale;
      out.building = m.building ? { type: m.building.type, remaining: Math.ceil(m.building.remaining) } : null;
      out.nextBuild = m.nextBuild;
    }
    if (m.progress !== undefined) out.progress = r1(m.progress);
    if (m.supply !== undefined) out.supply = m.supply && { state: m.supply.state, good: m.supply.good, sourceId: m.supply.sourceId, shipId: m.supply.shipId };
    return out;
  }

  serializeShip(s, own) {
    const o = { id: s.id, owner: s.owner, type: s.type, name: s.name, x: r1(s.x), y: r1(s.y), angle: Math.round(s.angle * 100) / 100,
      vx: r1(s.vx), vy: r1(s.vy), state: s.state, dockedAt: s.dockedAt };
    if (s.owner === NPC_OWNER && s.orders.type === 'supply') {
      const { stationId, sourceId, good, phase } = s.orders;
      o.task = { stationId, sourceId, good, phase };
      o.cargo = s.cargo;
    }
    if (own) {
      o.cargo = s.cargo;
      const ord = s.orders;
      o.orders = ord.type === 'route'
        ? { type: 'route', stops: ord.stops, index: ord.index, phase: ord.phase }
        : ord;
      o.log = s.log;
    }
    return o;
  }

  sendStateTo(p) {
    const sock = this.sockets.get(p.id);
    if (!sock) return;
    const ships = [];
    for (const s of this.ships.values()) {
      if (s.owner === p.id) ships.push(this.serializeShip(s, true));
      else if (p.revealed.has(cellKey(...cellOf(s.x, s.y)))) ships.push(this.serializeShip(s, false));
    }
    sock.emit('state', { t: this.time, credits: Math.floor(p.credits), ships });
  }

  sendStates() {
    for (const id of this.sockets.keys()) this.sendStateTo(this.players.get(id));
  }

  sendMarkets() {
    for (const [pid, sock] of this.sockets) {
      const upd = {};
      for (const id of this.known.get(pid) || []) {
        const e = this.world.entities.get(id);
        if (e.market) upd[id] = this.serializeMarket(e.market, false);
      }
      sock.emit('markets', upd);
    }
  }
}
