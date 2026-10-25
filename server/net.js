import { pilotProfile } from './pilot-profile.js';
import { GAME_PROTOCOL } from '../shared/protocol.js';
import { NET, NPC_OWNER, cellKey, cellOf, pilotLevel } from '../shared/config.js';
import { runCommand } from './handlers/index.js';
import { sectorSummary } from './game.js';
import { sumWindow } from './stats.js';
import { consortiumView, consortiumOf } from './consortium.js';
import { offersView } from './offers.js';
import { eventsView } from './events.js';
import { coverageAreas, controlCapacity } from './coverage.js';

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
    game.on('reveal', (p, d) => {
      const s = this.sessions.get(p.id);
      if (!s) return;
      const out = { ...d };
      if (d.entities) out.entities = d.entities.map((e) => serializeEntity(e));
      s.socket.emit('reveal', out);
    });
    game.on('log', (ship, msg) => this.sessions.get(ship.owner)?.socket.emit('log', { ship: ship.name, id: ship.id, msg }));
    game.on('sfx', (p, name) => this.sessions.get(p.id)?.socket.emit('sfx', name));
    game.on('player', () => this.broadcastPlayers()); // Level und Titel für die Tooltips der anderen
    game.on('notice', (p, msg) => p && this.sessions.get(p.id)?.socket.emit('notice', msg));
    // Konsortium geändert: Mitglieder und Eingeladene bekommen den neuen Stand; (null, p): nur dieser Spieler
    game.on('consortium', (c, p) => {
      if (p) { const s = this.sessions.get(p.id); if (s) this.sendConsortium(s); return; }
      for (const s of this.sessions.values()) if (c.members[s.player.id] || c.invites[s.player.id] || s.player.consortium === c.id) this.sendConsortium(s);
    });
    // Geänderte Objekte (Besitzwechsel, Upgrades) an alle, die sie kennen
    game.on('entity', (e) => {
      for (const s of this.sessions.values()) {
        if (!game.isKnown(s.player, e)) continue;
        s.sentMarket.delete(e.id);
        s.socket.emit('reveal', { entities: [serializeEntity(e)] });
      }
    });
    game.on('relocated',(e,old)=>{
      for(const s of this.sessions.values())if(!game.isKnown(s.player,e)&&game.isKnown(s.player,{...e,...old})){
        s.sentMarket.delete(e.id);s.socket.emit('vanish',{id:e.id});
      }
    });
    game.on('mg', (p, d) => this.sessions.get(p.id)?.socket.emit('mg', d));
    game.on('events', () => { for (const s of this.sessions.values()) this.sendEvents(s); });
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
    const w = this.game.world;
    s.socket.emit('welcome', {
      protocol: GAME_PROTOCOL,
      onboardingKey: `${w.seed}:${p.id}`,
      onboardingRequired: !!(p.homeQuest && !p.homeQuest.completed?.H00 && !p.homeQuest.scenesSeen?.H00),
      you: { id: p.id, name: p.name, color: p.color },
      cells: [...p.revealed],
      entities,
      sectors: [...p.known.sector].map((k) => w.sectors.get(k)).filter(Boolean).map(sectorSummary),
      systems: [...p.known.system].map((id) => w.systems.get(id)).filter(Boolean),
      zones: [...p.known.zone].map((id) => this.game.findZone(id)).filter(Boolean),
      wh: [...p.known.wh].filter((id) => w.wormholes.has(id)).map((id) => this.game.wormholeInfo(id)),
      recipes: [...p.known.recipe],
      shipTypes: [...p.known.ship],
      moduleTypes: [...p.known.module],
      players: this.game.playerList(this.online()),
    });
    s.sentMe = null;
    s.sentRoutes = null;
    s.sentCons = null;
    s.sentEvents = null;
    this.sendConsortium(s);
    this.sendEvents(s);
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
        const d = JSON.stringify(shipDetail(ship, this.game));
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
    const me = JSON.stringify({...playerDetail(p),profile:pilotProfile(this.game,p),coverage:this.game.profile==='homeworld'?coverageAreas(this.game,p):[],controlCapacity:controlCapacity(this.game,p)});
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
      // Eigener Besitz mit Einstellungen und Salden
      // Eigener Besitz und Besitz des eigenen Konsortiums (cons = true, manage = Handelsmeister)
      const props = [...this.game.ownership.values()].filter((p) => this.game.canUseStorage(p, s.player.id)).map((p) => {
        const { stats, ...rest } = p;
        const net = (secs) => { const w = sumWindow(stats, this.game.time, secs); return Math.round((w.inc || 0) - (w.exp || 0)); };
        return { ...rest, h1: net(3600), d24: net(86400), inc24: Math.round(sumWindow(stats, this.game.time, 86400).inc || 0),
          cons: p.player !== s.player.id, manage: this.game.canManage(p, s.player.id) };
      });
      s.socket.emit('props', props);
      this.sendConsortium(s);
      this.sendEvents(s);
    }
  }

  /** Sondernachfrage in bekannten Sektoren (nur bei Änderung) */
  sendEvents(s) {
    const v = JSON.stringify(eventsView(this.game, s.player));
    if (v === s.sentEvents) return;
    s.sentEvents = v;
    s.socket.emit('events', JSON.parse(v));
  }

  /** Konsortiumsstand (nur bei Änderung) */
  sendConsortium(s) {
    const c = consortiumOf(this.game, s.player);
    const v = JSON.stringify({ ...consortiumView(this.game, s.player, this.online()), ...(c ? offersView(this.game, c, s.player.id) : {}) });
    if (v === s.sentCons) return;
    s.sentCons = v;
    s.socket.emit('consortium', JSON.parse(v));
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
  const o = { id: e.id, kind: e.kind, type: e.type, name: e.name, x: Math.round(e.x), y: Math.round(e.y), radius: e.radius,
    sector: e.sector, system: e.system, market: e.market ? serializeMarket(e.market) : null };
  if (e.richness) o.richness = e.richness;
  if (e.noBuy) o.noBuy = true;
  if (e.size) o.size = e.size;
  if (e.wh) o.wh = e.wh;
  if (e.faction) o.faction = e.faction;
  if (e.salvageOwner) o.salvageOwner = e.salvageOwner;
  if(e.archiveOwner)Object.assign(o,{archiveOwner:e.archiveOwner,archiveKey:e.archiveKey});
  if(e.ruinsSite)Object.assign(o,{ruinsSite:true,colony:e.colony||null});
  if (e.market?.owner) Object.assign(o, { owner: e.market.owner, ownerName: e.ownerName, ownerColor: e.ownerColor });
  return o;
}

/** Struktur des Marktes (Rollen, Kapazitäten) plus aktueller Zustand */
export function serializeMarket(m) {
  const goods = {};
  for (const [g, s] of Object.entries(m.goods)) goods[g] = { role: s.role, rate: s.rate, cap: s.cap, stock: r1(s.stock), mod: s.mod || 1 };
  return { strategy: m.strategy, recipe: m.recipe, goods, ...extraOf(m) };
}

function extraOf(m) {
  const out = { eff: r1(m.eff ?? 1) };
  if(m.economy)out.economy={...m.economy,cash:r1(m.economy.cash),rate:r1(m.economy.rate),granted:r1(m.economy.granted),spent:r1(m.economy.spent)};
  if(m.realEconomy)out.realEconomy=true;
  if (m.homeworld) out.homeworld = m.homeworld;
  if (m.qxp) out.qxp = Math.floor(m.qxp);
  if (m.lvl) out.lvl = m.lvl;
  if (m.board) out.board = m.board.offers;
  if (m.modules) out.modules = m.modules;
  if(m.moduleInventory)out.moduleInventory=m.moduleInventory;
  if(m.yardCatalog)out.yardCatalog=m.yardCatalog;
  if (m.owner) Object.assign(out, { owner: m.owner, yardSale: !!m.yardSale, mode: m.mode, customs: m.customs || 0 });
  if (m.forSale) {
    out.forSale = m.forSale;
    out.building = m.building ? { type: m.building.type, remaining: Math.ceil(m.building.remaining), bonus: m.building.bonus || 0 } : null;
    out.nextBuild = m.nextBuild;
    if (m.strategy === 'shipyard' && !m.owner) out.order = m.order ? { type: m.order.type, player: m.order.player, name: m.order.name } : null;
  }
  if (m.progress !== undefined) out.progress = r1(m.progress);
  if (m.smug?.offer) out.smug = m.smug.offer;
  if (m.bld) out.bld = { lvl: m.bld.lvl, fac: m.bld.factories.map((f) => f.recipe) };
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
  return { id: s.id, x: Math.round(s.x), y: Math.round(s.y), a: Math.round(s.angle * 100) / 100, vx: r1(s.vx), vy: r1(s.vy), st: s.state, dk: s.dockedAt };
}

function foreignInfo(s) {
  const o = { owner: s.owner, type: s.type, name: s.name, main: !!s.main };
  const c = s.queue[0];
  if (s.owner === NPC_OWNER && c?.t === 'supply') {
    const { stationId, sourceId, good, phase } = c;
    o.task = { stationId, sourceId, good, phase };
    o.cargo = s.cargo;
  }
  return o;
}

function shipDetail(s, game) {
  return {
    offer: game?.shipOffers.get(s.id)?.price ?? null,
    owner: s.owner, type: s.type, name: s.name, cargo: s.cargo, passengers:s.passengers||[],moduleCargo:s.moduleCargo||{}, log: s.log, group: s.group, ord: s.ord,
    queue: s.queue.map(({ waitStart, waitUntil, ...c }) => c), warn: s.warn || {},relocationHold:s.relocationHold||null,
    nav: s.nav ? s.nav.legs.slice(s.nav.i).map((l) => [Math.round(l.x), Math.round(l.y), l.wh ? 1 : 0]) : null,
    transit: s.transit ? s.transit.exit : null, zone: s.zone || null, marker: s.marker || null,
    fuel: Math.round((s.fuel || 0) * 10) / 10, autoRefuel: s.autoRefuel ?? 0, upg: s.upg || {}, modules: s.modules || [], upgValue: s.upgValue || 0, main: !!s.main, relicSpeed: s.relicSpeed || 0, mined: s.mined || {}, bonus: s.bonus || 0, yardLvl: s.yardLvl || 0,
  };
}

function playerDetail(p) {
  return { stopLoss: p.stopLoss || 0, groups: p.groups || [], favorites: p.favorites || {}, pilot: p.pilot || 1, governor: p.governor || 0, faction: p.faction || null,
    homeworld: p.homeworld || null, homeQuest: p.homeQuest || null, manualShip: p.manualShip || null, relic: p.relic || null,moduleBlueprints:p.moduleBlueprints||[],
    flagshipAt: p.flagshipAt ?? null, xp: Math.floor(p.xp || 0), level: pilotLevel(p.xp), quest: p.quest || null, questLock: p.questLock || 0,
    rep: p.rep || {}, questsDone: p.questsDone || 0, dogUntil: p.dogUntil || 0, mg: p.mg || null };
}
