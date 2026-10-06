import { NET, NPC_OWNER, cellKey, cellOf } from '../shared/config.js';
import { runCommand } from './handlers/index.js';

const r1 = (v) => Math.round(v * 10) / 10;
const MAX_MARKET_SUBS = 400;

/**
 * Netzwerk mit Subscription- und Delta-Modell.
 * - Märkte: Der Client abonniert Markt-IDs (Sichtbereich + offene Dialoge). Übertragen werden nur geänderte Werte.
 * - Schiffe: eigene Schiffe immer kompakt, Details nur bei Änderung. Fremde Schiffe nur im Sichtbereich.
 */
export class Net {
  constructor(io, game) {
    this.io = io;
    this.game = game;
    this.sessions = new Map(); // playerId -> Session
    game.on('reveal', (p, cells, entities) => {
      const s = this.sessions.get(p.id);
      if (s) s.socket.emit('reveal', { cells, entities: entities.map((e) => serializeEntity(e)) });
    });
    game.on('log', (ship, msg) => this.sessions.get(ship.owner)?.socket.emit('log', { ship: ship.name, msg }));
    io.on('connection', (socket) => this.onConnection(socket));
  }

  online() { return new Set(this.sessions.keys()); }
  broadcastPlayers() { this.io.emit('players', this.game.playerList(this.online())); }

  onConnection(socket) {
    let session = null;
    socket.emit('players', this.game.playerList(this.online()));

    socket.on('login', (msg) => {
      const name = String(msg?.name || '').trim().replace(/\s+/g, ' ');
      if (name.length < 2 || name.length > 20) return socket.emit('loginError', 'Name muss 2 bis 20 Zeichen lang sein.');
      const player = this.game.findPlayerByName(name) || this.game.createPlayer(name);
      const old = this.sessions.get(player.id);
      if (old && old.socket !== socket) {
        old.socket.emit('kicked', 'Mit diesem Namen hat sich jemand anderes angemeldet.');
        old.socket.disconnect(true);
      }
      session = new Session(player, socket);
      this.sessions.set(player.id, session);
      player.lastSeen = Date.now();
      this.welcome(session);
      console.log(`Login: ${player.name}`);
      this.broadcastPlayers();
    });

    socket.on('cmd', (msg) => {
      if (!session || !msg || typeof msg.cmd !== 'string') return;
      try {
        const err = runCommand(this.game, session.player, msg);
        if (err) socket.emit('errorMsg', err);
      } catch (e) {
        console.error('Befehl fehlgeschlagen', msg, e);
        socket.emit('errorMsg', 'Interner Fehler beim Befehl.');
      }
    });

    socket.on('sub', (msg) => {
      if (!session) return;
      const v = msg?.view;
      if (v && [v.x0, v.y0, v.x1, v.y1].every(Number.isFinite)) session.view = { x0: v.x0, y0: v.y0, x1: v.x1, y1: v.y1 };
      if (Array.isArray(msg?.markets)) {
        const subs = new Set();
        for (const id of msg.markets.slice(0, MAX_MARKET_SUBS)) {
          const e = this.game.world.entities.get(id);
          if (e?.market && this.game.isKnown(session.player, e)) subs.add(id);
        }
        for (const id of session.sentMarket.keys()) if (!subs.has(id)) session.sentMarket.delete(id);
        session.subs = subs;
        this.sendMarketsTo(session); // neue Abos sofort bedienen
      }
    });

    socket.on('stats', (msg) => {
      if (!session) return;
      const data = this.game.statsFor(session.player, msg?.entityId);
      if (data) socket.emit('stats', data);
    });

    socket.on('shipStats', (msg) => {
      if (!session) return;
      const ship = this.game.ships.get(msg?.ship);
      if (ship?.owner === session.player.id) socket.emit('shipStats', { ship: ship.id, ...this.game.shipSummary(ship) });
    });

    socket.on('disconnect', () => {
      if (!session || this.sessions.get(session.player.id) !== session) return;
      this.sessions.delete(session.player.id);
      session.player.lastSeen = Date.now();
      this.broadcastPlayers();
    });
  }

  welcome(s) {
    const p = s.player;
    const entities = [];
    for (const k of p.revealed) for (const id of this.game.world.entitiesInCell(k)) entities.push(serializeEntity(this.game.world.entities.get(id)));
    s.socket.emit('welcome', {
      you: { id: p.id, name: p.name, color: p.color },
      cells: [...p.revealed],
      entities,
      players: this.game.playerList(this.online()),
    });
    s.sentMe = null;
    s.sentRoutes = null;
    this.sendShipsTo(s);
    this.sendFleetStats();
  }

  // ---------- Schiffe ----------
  sendShips() { for (const s of this.sessions.values()) this.sendShipsTo(s); }

  sendShipsTo(s) {
    const p = s.player;
    const ships = [];
    const others = new Set();
    const v = s.view, M = NET.VIEW_MARGIN;
    for (const ship of this.game.ships.values()) {
      if (ship.owner === p.id) {
        const o = compactShip(ship);
        const d = JSON.stringify(shipDetail(ship));
        if (s.sentDetail.get(ship.id) !== d) {
          o.d = JSON.parse(d);
          s.sentDetail.set(ship.id, d);
        }
        ships.push(o);
        continue;
      }
      if (!v || ship.x < v.x0 - M || ship.x > v.x1 + M || ship.y < v.y0 - M || ship.y > v.y1 + M) continue;
      if (!p.revealed.has(cellKey(...cellOf(ship.x, ship.y)))) continue;
      const o = compactShip(ship);
      Object.assign(o, foreignInfo(ship));
      others.add(ship.id);
      ships.push(o);
    }
    for (const id of s.sentDetail.keys()) if (!this.game.ships.has(id) || this.game.ships.get(id).owner !== p.id) s.sentDetail.delete(id);
    s.socket.emit('ships', { t: r1(this.game.time), credits: Math.floor(p.credits), ships });
    // Spielerdaten und Routen nur bei Änderung
    const me = JSON.stringify(playerDetail(p));
    if (me !== s.sentMe) { s.sentMe = me; s.socket.emit('me', JSON.parse(me)); }
    const routes = JSON.stringify([...this.game.routes.values()].filter((r) => r.owner === p.id));
    if (routes !== s.sentRoutes) { s.sentRoutes = routes; s.socket.emit('routes', JSON.parse(routes)); }
  }

  /** Salden je Schiff (1 h) und je Route (1 h / 24 h), alle paar Sekunden */
  sendFleetStats() {
    for (const s of this.sessions.values()) {
      const ships = {}, routes = {};
      for (const ship of this.game.ships.values()) if (ship.owner === s.player.id) ships[ship.id] = Math.round(this.game.shipBalance1h(ship));
      for (const r of this.game.routes.values()) if (r.owner === s.player.id) routes[r.id] = this.game.routeSummary(r);
      s.socket.emit('fleetStats', { ships, routes });
    }
  }

  // ---------- Märkte ----------
  sendMarkets() { for (const s of this.sessions.values()) this.sendMarketsTo(s); }

  sendMarketsTo(s) {
    const upd = {};
    let any = false;
    for (const id of s.subs) {
      const e = this.game.world.entities.get(id);
      if (!e?.market) continue;
      const cur = marketDynamic(e.market);
      const prev = s.sentMarket.get(id);
      const delta = diffMarket(prev, cur);
      if (!delta) continue;
      s.sentMarket.set(id, cur);
      upd[id] = delta;
      any = true;
    }
    if (any) s.socket.emit('markets', upd);
  }
}

class Session {
  constructor(player, socket) {
    this.player = player;
    this.socket = socket;
    this.view = null;
    this.subs = new Set();
    this.sentMarket = new Map(); // id -> letzter gesendeter Zustand
    this.sentDetail = new Map(); // Schiff-ID -> JSON der Details
  }
}

// ---------- Serialisierung ----------
export function serializeEntity(e) {
  return { id: e.id, kind: e.kind, type: e.type, name: e.name, x: Math.round(e.x), y: Math.round(e.y), radius: e.radius,
    richness: e.richness, market: e.market ? serializeMarket(e.market) : null };
}

/** Struktur des Marktes (Rollen, Kapazitäten) plus aktueller Zustand */
export function serializeMarket(m) {
  const goods = {};
  for (const [g, s] of Object.entries(m.goods)) goods[g] = { role: s.role, rate: s.rate, cap: s.cap, stock: r1(s.stock) };
  return { strategy: m.strategy, recipe: m.recipe, goods, ...extraOf(m) };
}

function extraOf(m) {
  const out = { eff: r1(m.eff ?? 1) };
  if (m.forSale) {
    out.forSale = m.forSale;
    out.building = m.building ? { type: m.building.type, remaining: Math.ceil(m.building.remaining) } : null;
    out.nextBuild = m.nextBuild;
  }
  if (m.progress !== undefined) out.progress = r1(m.progress);
  if (m.supply !== undefined) out.supply = m.supply && { state: m.supply.state, good: m.supply.good, sourceId: m.supply.sourceId, shipId: m.supply.shipId };
  return out;
}

function marketDynamic(m) {
  const stock = {};
  for (const [g, s] of Object.entries(m.goods)) stock[g] = r1(s.stock);
  return { stock, extra: JSON.stringify(extraOf(m)) };
}

/** Liefert nur geänderte Werte: { s: {ware: bestand}, x: {extras} } oder null */
export function diffMarket(prev, cur) {
  const s = {};
  let changed = false;
  for (const [g, v] of Object.entries(cur.stock)) {
    if (prev?.stock[g] !== v) { s[g] = v; changed = true; }
  }
  const out = {};
  if (changed) out.s = s;
  if (prev?.extra !== cur.extra) out.x = JSON.parse(cur.extra);
  return out.s || out.x ? out : null;
}

function compactShip(s) {
  return { id: s.id, x: r1(s.x), y: r1(s.y), a: Math.round(s.angle * 100) / 100, vx: r1(s.vx), vy: r1(s.vy), st: s.state, dk: s.dockedAt };
}

function foreignInfo(s) {
  const o = { owner: s.owner, type: s.type, name: s.name };
  const c = s.queue[0];
  if (s.owner === NPC_OWNER && c?.t === 'supply') {
    const { stationId, sourceId, good, phase } = c;
    o.task = { stationId, sourceId, good, phase };
    o.cargo = s.cargo;
  }
  return o;
}

function shipDetail(s) {
  return {
    owner: s.owner, type: s.type, name: s.name, cargo: s.cargo, log: s.log, group: s.group, ord: s.ord,
    queue: s.queue.map(({ waitStart, waitUntil, ...c }) => c), warn: s.warn || {},
  };
}

function playerDetail(p) {
  return { stopLoss: p.stopLoss || 0, groups: p.groups || [], favorites: p.favorites || {} };
}
