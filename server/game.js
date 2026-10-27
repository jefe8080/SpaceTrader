import {syncRouteReservations} from './route-capacity.js';
import { initializeProfile, syncInventoryBasis, recordGoodsTrade } from './pilot-profile.js';
import { WORLD, GOODS, BELT_TYPES, SHIP_TYPES, FUEL, GOVERNOR_LICENSES, shipStats, freeFor, holdOf, PLAYER_COLORS, SHIP_NAMES, SUPPLY, NPC_OWNER, STATS,
  cellKey, cellOf, buyPrice, sellPrice, canBuyFrom, canSellTo, slotPrice, supplyLoad, targetOf,
  XP, pilotLevel, pilotTitle, giverLevel, GIVER_TRADE_CR, factionRank, RANK_NAMES, FACTIONS, hasAbility, holdFor, priceWindow, fixedPrice, FIXED, recipeOf } from '../shared/config.js';
import { refreshBoards, boardSectors, isGiver, questProgress, exploreCells, exploreZone } from './quests.js';
import { World } from './world.js';
import { hexAt, hexKey } from '../shared/hex.js';
import { planPath, zoneEffects } from '../shared/nav.js';
import { tickMarket, stat, missingInputs, applyLevel, runRecipe } from './markets.js';
import { updateShip, setWarn } from './ships.js';
import { Store } from './db.js';
import { addToBuckets, bucketOf, summary, sumWindow, balance, SHIP_STATS } from './stats.js';
import { applyProperty, releaseMarket, tickOwnedPlanet, strangerBlocked, payForDelivery, sellToSupplier, propBook } from './property.js';
import { flushRevenue, trimLog, isMaster } from './consortium.js';
import { removeOffersOf } from './offers.js';
import { tickEvents, sellToEvent } from './events.js';
import { isConsortiumOwner, consortiumIdOf } from '../shared/consortium.js';
import { checkWorldFile, worldProfile } from './world-profile.js';
import { createHomeworld, tickHomeworld, tickHomeResource } from './homeworld.js';
import {passengerTrade} from './population.js';
import {handlingAllowance,recordHandling} from './handling.js';
import {tickColonies} from './colonies.js';
import {tickWarps} from './warp.js';
import { syncHomeQuests } from './quest-activation.js';
import { tickRelics } from './relic.js';
import { homeStorageFree, availableHomeStock } from '../shared/homeworld.js';
import { coveredPath, pointCovered } from './coverage.js';
import {dispatchRealSupply,finishRealSupply,receiveMarketCash,spendMarketCash,downstreamDemand} from './real-economy.js';

export const WORLD_GEN_VERSION = 3; // Bestandswelt; Versionskonflikte lösen niemals einen Reset aus

export class Game {
  /** dbFile: Pfad zur SQLite-Datei oder ':memory:' */
  constructor(dbFile, { seed, verbose = false, profile = 'legacy' } = {}) {
    this.verbose = verbose;
    this.profile = profile;
    this.worldVersion = worldProfile(profile).version;
    checkWorldFile(dbFile, profile);
    this.store = new Store(dbFile);
    this.time = 0;
    this.players = new Map();
    this.ships = new Map();
    this.routes = new Map();
    this.shipStats = new Map();  // Schiff-ID -> Ringpuffer
    this.routeStats = new Map(); // Routen-ID -> Ringpuffer
    this.ownership = new Map();  // Entity-ID -> Besitz
    this.consortia = new Map();      // Konsortium-ID -> Konsortium (PRD-3)
    this.consortiumLog = new Map();  // Konsortium-ID -> Logeinträge
    this.mapOffers = new Map();      // Angebots-ID -> Kartendaten-Angebot
    this.shipOffers = new Map();     // Schiff-ID -> Schiffsangebot (Schiff gesperrt)
    this.sectorEvents = new Map();   // Sektor -> { timer, event } (Sondernachfrage)
    this.buildings = new Map();      // Planet-ID -> { lvl: { Ware: Level }, factories: [{ recipe, prog }] }
    this.counters = { player: 0, ship: 0, route: 0, group: 0, quest: 0, consortium: 0, offer: 0 };
    this.boardAcc = 0;
    this.econAcc = 0;
    this.npcBusy = new Set();    // "Markt:Ware", für die ein NPC-Schiff unterwegs ist (Ziel oder Quelle)
    this.activity = new Map();   // Sektor -> letzte Spielzeit mit einem fliegenden Spielerschiff
    this.newDiscoveries = []; // [player, kind, key] seit dem letzten Speichern
    this.listeners = {};
    if (!this.load()) {
      this.world = new World(seed ?? ((Math.random() * 2 ** 31) | 0),this.profile);
      this.world.ensureSector(0, 0);
    }
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, ...a) { for (const fn of this.listeners[ev] || []) fn(...a); }

  // ---------- Persistenz ----------
  load() {
    const st = this.store;
    const gen = st.getMeta('worldGen');
    if (gen === undefined) return false;
    if (gen !== this.worldVersion) throw new Error('Inkompatible Weltversion; automatischer Reset ist gesperrt.');
    this.time = st.getMeta('time');
    this.counters = { ...this.counters, ...st.getMeta('counters') };
    this.world = new World(st.getMeta('seed'),this.profile);
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
    for (const s of this.ships.values()) if (s.owner === NPC_OWNER) this.markNpc(s, true);
    for (const r of st.loadAll('routes')) this.routes.set(r.id, r.data);
    for (const r of st.loadAll('consortia')) this.consortia.set(r.id, r.data);
    for (const r of st.loadAll('consortium_log')) {
      if (!this.consortiumLog.has(r.consortium)) this.consortiumLog.set(r.consortium, []);
      this.consortiumLog.get(r.consortium).push(r.data);
    }
    for (const l of this.consortiumLog.values()) { l.sort((a, b) => a.seq - b.seq); trimLog(l); }
    for (const r of st.loadAll('map_offers')) this.mapOffers.set(r.id, r.data);
    for (const r of st.loadAll('sector_events')) this.sectorEvents.set(r.sector, r.data);
    for (const r of st.loadAll('planet_buildings')) {
      const e = this.world.entities.get(r.entity);
      if (!e?.market) continue;
      this.attachBuildings(e, r.data);
      if (e.kind === 'planet') applyLevel(e);
    }
    for (const r of st.loadAll('ship_offers')) if (this.ships.has(r.ship)) this.shipOffers.set(r.ship, r.data);
    for (const r of st.loadAll('ownership')) {
      const e = this.world.entities.get(r.entity);
      if (!e?.market) continue;
      this.ownership.set(r.entity, r.data);
      applyProperty(this, e, r.data);
    }
    this.shipStats = groupRows(st.loadAll('ship_stats'), 'ship');
    for (const player of this.players.values()) syncHomeQuests(this, player);
    syncRouteReservations(this);
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
      st.setMeta('worldGen', this.worldVersion);
      st.setMeta('worldProfile', this.profile);
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
      n += st.sync('consortia', [...this.consortia.values()].map((c) => ({ key: [c.id], data: c })));
      const clogRows = [];
      for (const [cid, list] of this.consortiumLog) for (const e of list) clogRows.push({ key: [cid, e.seq], data: e });
      n += st.sync('consortium_log', clogRows);
      n += st.sync('map_offers', [...this.mapOffers.values()].map((o) => ({ key: [o.id], data: o })));
      n += st.sync('ship_offers', [...this.shipOffers.values()].map((o) => ({ key: [o.ship], data: o })));
      n += st.sync('sector_events', [...this.sectorEvents.values()].map((r) => ({ key: [r.sector], data: r })));
      n += st.sync('planet_buildings', [...this.buildings.values()].map((b) => ({ key: [b.entity], data: b })));
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
      .map((p) => ({ id: p.id, name: p.name, color: p.color, online: online.has(p.id), level: pilotLevel(p.xp), title: pilotTitle(p.xp),
        cons: this.consortia.get(p.consortium)?.name || null }));
  }

  // ---------- Erfahrung, Level, Ruf ----------
  /** XP gutschreiben; Aufstieg wird gemeldet. Während der Spielererstellung gibt es keine XP. */
  addXp(p, n) {
    if (!n || this.noXp) return;
    const before = pilotLevel(p.xp);
    p.xp = (p.xp || 0) + n;
    const after = pilotLevel(p.xp);
    if (after > before) {
      this.emit('notice', p, `Pilotenlevel ${after} erreicht${pilotTitle(p.xp) ? ': ' + pilotTitle(p.xp) : ` (Pilotenlizenz ${after} jetzt kaufbar)`}`);
      this.emit('sfx', p, 'levelUp');
      this.emit('player', p);
    }
  }

  /** XP für Planeten und Werften (Questgeber), Level 0 bis 6 */
  addGiverXp(e, n) {
    if (!isGiver(e) || !n) return;
    const m = e.market;
    const before = giverLevel(m.qxp);
    m.qxp = (m.qxp || 0) + n;
    const after = giverLevel(m.qxp);
    if (after > before) this.onGiverLevel(e, after);
  }
  /** Wirkung der Level von Planeten und Werften */
  onGiverLevel(e, lvl) {
    e.market.lvl = lvl;
    if (e.kind === 'planet') applyLevel(e);
    const prop = this.ownership.get(e.id);
    if (prop) this.notifyOwner(prop.player, `${e.name} erreicht Level ${lvl}`);
    this.emit('entity', e);
  }

  addRep(p, faction, n) {
    p.rep ||= {};
    const before = factionRank(p.rep[faction]);
    p.rep[faction] = (p.rep[faction] || 0) + n;
    const after = factionRank(p.rep[faction]);
    if (after > before) {
      this.emit('notice', p, `${FACTIONS[faction].name}: Rang ${after} (${RANK_NAMES[after]})`);
      this.emit('sfx', p, 'rankUp');
    }
  }

  /** Einstandspreis je Ware mitführen; manueller Handel des Hauptschiffs bringt XP (gedeckelt je Stunde) */
  tradeBasis(ship, good, n, total, dir, opts = {}) {
    if (ship.owner === NPC_OWNER || !n) return;
    ship.basis ||= {};
    if (dir === 'buy') {
      const have = (ship.cargo[good] || 0) - n;
      ship.basis[good] = ((ship.basis[good] || 0) * Math.max(0, have) + total) / Math.max(1, have + n);
      return;
    }
    const profit = total - n * (ship.basis[good] || 0);
    if (!ship.cargo[good]) delete ship.basis[good];
    if ((this.profile === 'homeworld' ? !opts.manual || opts.auto : !ship.main) || profit <= 0) return;
    const p = this.players.get(ship.owner);
    const hour = Math.floor(this.time / 3600);
    if (p.tradeXp?.hour !== hour) p.tradeXp = { hour, n: 0, acc: p.tradeXp?.acc || 0 };
    p.tradeXp.acc += profit;
    let xp = Math.floor(p.tradeXp.acc / XP.TRADE_CR);
    p.tradeXp.acc -= xp * XP.TRADE_CR;
    xp = Math.min(xp, XP.TRADE_MAX_H - p.tradeXp.n);
    if (xp > 0) { p.tradeXp.n += xp; this.addXp(p, xp); }
    if (p.tradeXp.n >= XP.TRADE_MAX_H) p.tradeXp.acc = 0;
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
    this.noXp = true;
    if (this.profile === 'homeworld') {
      try { createHomeworld(this, p); } finally { this.noXp = false; }
      return p;
    }
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
    this.discover(p, 'visit', home.key);
    home.firstVisit ||= 'start';
    this.noXp = false;
    return p;
  }

  shipsOf(playerId) { return [...this.ships.values()].filter((s) => s.owner === playerId); }

  /**
   * Darf der Spieler dieses Schiff abgeben (Verkauf, Recycling, Angebot im Konsortium)?
   * Das letzte Schiff nie, damit kein Spieler ohne Schiff dasteht (PRD-3 Kapitel 9). Liefert Fehlertext oder null.
   */
  canGiveAway(player, ship) {
    if (ship.owner !== player.id) return 'Das ist nicht dein Schiff.';
    if (player.relic?.location.kind === 'ship' && player.relic.location.id === ship.id) return 'Vor der Abgabe den einzigartigen Reliktantrieb an einer eigenen Werkstatt ausbauen.';
    if (player.relic?.operation?.ship === ship.id) return 'Während der Reliktarbeit kann dieses Schiff nicht abgegeben werden.';
    if (player.homeQuest?.salvage?.phase === 'sealed' && player.homeQuest.salvage.ship === ship.id) return 'Zuerst den versiegelten Fund zur Heimatwerkstatt bringen.';
    // Im Konsortium angebotene Schiffe zählen nicht: Sonst bliebe nach dem Verkauf keines übrig
    if (!this.shipsOf(player.id).some((s) => s !== ship && !this.shipOffers.has(s.id))) return 'Dein letztes Schiff kannst du nicht abgeben.';
    return null;
  }

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
        if (r > 0 && Math.hypot(mx - x, my - y) > r + C * 0.35) continue;
        const k = cellKey(cx, cy);
        if (p.revealed.has(k)) continue;
        p.revealed.add(k);
        newCells.push(k);
        this.newDiscoveries.push([p.id, 'cell', k]);
      }
    }
    if (!newCells.length) return;
    if (p.quest?.type === 'explore') exploreCells(this, p, newCells);
    const entities = [];
    for (const k of newCells) {
      for (const id of this.world.entitiesInCell(k)) {
        const e = this.world.entities.get(id);
        entities.push(e);
        if(e.kind==='planet'){const stats=initializeProfile(this,p);if(!stats.discoveredPlanets.includes(e.id))stats.discoveredPlanets.push(e.id);}
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
    // Almanach: neue Einträge bringen XP
    if (kind === 'recipe') this.addXp(p, XP.RECIPE);
    if (kind === 'ship') this.addXp(p, XP.SHIP);
    if (kind === 'module') this.addXp(p, XP.MODULE);
    if (Object.keys(out).length) this.emit('reveal', p, out);
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
    if(this.profile==='homeworld'&&!ship.queue[0]?.manualDirect)return coveredPath(this,p,ship,{x,y},this.shipSpeed(ship));
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
    if (ship.queue[0]?.manualDirect && p?.manualShip === ship.id) ship.manualDock = e.id;
    else delete ship.manualDock;
    if (p && e.market) {
      for (const it of e.market.forSale || []) this.discover(p, 'ship', it.type);
      for(const type of e.market.yardCatalog||[])this.discover(p,'ship',type);
      if (e.market.building) this.discover(p, 'ship', e.market.building.type);
      for (const m of e.market.modules || []) this.discover(p, 'module', m);
    }
    if (p) questProgress(this, p, ship);
    const tank = this.shipTank(ship);
    if ((this.profile!=='homeworld'||ship.queue[0]?.manualDirect||pointCovered(this,p,e)) && !ship.relicSpeed && tank > 0 && ship.autoRefuel > 0 && ship.fuel < tank * ship.autoRefuel && e.market?.goods.shipfuel && canBuyFrom(e.market.goods.shipfuel)) {
      this.refuel(ship, e);
    }
  }

  /**
   * Tanken: Schiffstreibstoff aus dem Marktbestand zum Marktpreis. Nicht vom Stop-Loss betroffen.
   * Rückgabe { ok, n, cost } oder { ok: false, reason }
   */
  refuel(ship, e, route = null) {
    if(e.market?.homeworld?.warp)return {ok:false,reason:'Standort für Warp gesperrt.'};
    if (ship.relicSpeed) return { ok: false, reason: 'Der Reliktantrieb benötigt keinen Treibstoff' };
    const p = this.players.get(ship.owner);
    const tank = this.shipTank(ship);
    const slot = e.market?.goods.shipfuel;
    if (ship.dockedAt !== e.id) return { ok: false, reason: 'nicht angedockt' };
    if (!slot || !canBuyFrom(slot)) return { ok: false, reason: 'kein Treibstoff im Angebot' };
    const missing = tank - ship.fuel;
    if (missing < 0.05) return { ok: false, reason: 'voll' };
    const prop=this.ownership.get(e.id);
    if(prop&&prop.player!==ship.owner&&!this.canUseStorage(prop,ship.owner)&&strangerBlocked(prop))return {ok:false,reason:'Privater Handel'};
    const own = e.market.owner === ship.owner;
    const price = own ? 0 : buyPrice('shipfuel', slot);
    const n = Math.min(missing, availableHomeStock(e.market, 'shipfuel'), own ? Infinity : p.credits / price);
    if (n < 0.05) return { ok: false, reason: slot.stock < 0.05 ? 'kein Bestand' : 'zu wenig Credits' };
    const cost = n * price;
    p.credits -= cost;
    if(this.profile==='homeworld'&&cost){if(prop){const owner=this.accountOf(prop.player);if(owner)owner.credits+=cost;}else receiveMarketCash(e,cost);}
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
    const fx = zoneEffects(this.world.zonesNear(ship.x, ship.y), ship.x, ship.y, { void: hasAbility(ship, 'void') });
    this.revealAround(p, ship.x, ship.y, shipStats(ship).sensor * fx.sensor);
    const h = hexAt(ship.x, ship.y);
    const key = hexKey(h.q, h.r);
    this.activity.set(key, this.time);
    const sec = this.world.sectors.get(key);
    if (sec) {
      this.discover(p, 'sector', key);
      // Erster Besuch: Erstentdeckung weltweit 60 XP, sonst 20 XP
      if (this.discover(p, 'visit', key)) {
        this.addXp(p, sec.firstVisit ? XP.SECTOR_VISIT : XP.SECTOR_FIRST);
        if (!sec.firstVisit) { sec.firstVisit = p.id; this.emit('notice', p, `Erstentdeckung: Sektor ${sec.name}`); }
      }
    }
    if (p.quest?.type === 'explore' && fx.zones) exploreZone(this, p, fx.zones);
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

  // ---------- Konten: Spieler oder Konsortium ----------
  /** Konto eines Besitzers (Spieler oder Konsortium-Pool); beide haben das Feld credits */
  accountOf(ownerId) {
    return isConsortiumOwner(ownerId) ? this.consortia.get(consortiumIdOf(ownerId)) || null : this.players.get(ownerId) || null;
  }
  /** Anzeige eines Besitzers: Fraktion bzw. Konsortium mit Farbe */
  ownerLabel(ownerId) {
    if (isConsortiumOwner(ownerId)) { const c = this.accountOf(ownerId); return { name: c?.name || '?', color: c?.color || null }; }
    const p = this.players.get(ownerId);
    return { name: p?.faction?.name || p?.name || '?', color: p?.faction?.color || p?.color || null };
  }
  /** Nachricht an den Besitzer: Spieler bzw. alle Mitglieder des Konsortiums */
  notifyOwner(ownerId, msg) {
    if (!isConsortiumOwner(ownerId)) return this.emit('notice', this.players.get(ownerId), msg);
    const c = this.accountOf(ownerId);
    for (const id of Object.keys(c?.members || {})) this.emit('notice', this.players.get(id), msg);
  }
  /** Gehört das Konto dem Spieler oder ist er Mitglied des besitzenden Konsortiums? */
  isOwnerOrMember(ownerId, playerId) {
    if (!ownerId) return false;
    if (ownerId === playerId) return true;
    return isConsortiumOwner(ownerId) && this.players.get(playerId)?.consortium === consortiumIdOf(ownerId);
  }
  /** Darf der Spieler das Lager nutzen? Eigener Besitz oder Besitz des eigenen Konsortiums (PRD-3 4.4) */
  canUseStorage(prop, playerId) { return !!prop && this.isOwnerOrMember(prop.player, playerId); }
  /** Darf der Spieler den Besitz verwalten? Eigener Besitz oder Handelsmeister des besitzenden Konsortiums */
  canManage(prop, playerId) {
    if (!prop) return false;
    if (prop.player === playerId) return true;
    return isConsortiumOwner(prop.player) && isMaster(this.accountOf(prop.player), playerId);
  }

  /** Besitz aufgeben: Das Objekt wird wieder ein NPC-Markt (z. B. bei Auflösung eines Konsortiums) */
  releaseProperty(entityId) {
    const e = this.world.entities.get(entityId);
    this.ownership.delete(entityId);
    if (!e?.market) return;
    releaseMarket(this, e);
    this.emit('entity', e);
  }

  // ---------- Planetengebäude (PRD-3 Kapitel 6) ----------
  /** Gebäude-Datensatz an den Markt hängen (nicht aufzählbar, damit er nicht doppelt im Markt gespeichert wird) */
  attachBuildings(e, rec) {
    this.buildings.set(e.id, rec);
    Object.defineProperty(e.market, 'bld', { value: rec, enumerable: false, writable: true, configurable: true });
  }
  /** Gebäude eines Planeten, bei Bedarf neu angelegt */
  buildingsOf(e) {
    return this.buildings.get(e.id) || (this.attachBuildings(e, { entity: e.id, lvl: {}, factories: [] }), this.buildings.get(e.id));
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
    if(this.profile==='homeworld'){tickColonies(this,dt);tickWarps(this,dt);}
    tickRelics(this);
    for (const player of this.players.values()) syncHomeQuests(this, player);
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
        if (e?.kind !== 'planet' || e.type === 'ruins' || this.profile==='homeworld') continue;
        tickOwnedPlanet(this, e, prop, this.econAcc);
        // Fabriken auf Bauplätzen laufen nur bei Besitz
        for (const f of e.market.bld?.factories || []) f.prog = runRecipe(e.market, recipeOf(f.recipe), f.prog || 0, this.econAcc, this.time);
      }
      const propSectors = new Set([...this.ownership.keys()].map((id) => this.world.entities.get(id)?.sector));
      for (const e of this.world.entities.values()) {
        if (e.market?.strategy === 'homeworld') { tickHomeworld(this, e, this.econAcc); continue; }
        if (e.market?.strategy === 'homeResource') { tickHomeResource(e, this.econAcc,this.time); continue; }
        if(this.profile==='homeworld'&&e.market){
          tickMarket(e,this.econAcc,this.time,this);
          if(propSectors.has(e.sector)||this.time-(this.activity.get(e.sector)??-Infinity)<SUPPLY.ACTIVITY)dispatchRealSupply(this,e);
          continue;
        }
        tickMarket(e, this.econAcc, this.time, this);
        if (!e.market) continue;
        if (SUPPLIED.has(e.market.strategy)) this.checkSupply(e);
        else if (e.market.strategy === 'planet' && (propSectors.has(e.sector) || this.time - (this.activity.get(e.sector) ?? -Infinity) < SUPPLY.ACTIVITY)) this.checkHaul(e);
      }
      for(const player of this.players.values())for(const good of Object.keys(player.profileStats?.inventory||{}))syncInventoryBasis(this,player,good);
      tickEvents(this, this.econAcc);
      this.econAcc = 0;
      flushRevenue(this);
    }
    this.boardAcc += dt;
    if (this.boardAcc >= 10) {
      this.boardAcc = 0;
      refreshBoards(this, boardSectors(this, this.time - SUPPLY.ACTIVITY));
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
    const player=this.players.get(ship.owner);
    if(!player || opts.profileAccounting || GOODS[good]?.cls==='passenger')return this.tradeHandled(ship,e,good,amount,dir,limit,opts);
    const basis=syncInventoryBasis(this,player,good),before=basis.quantity;
    const seller=this.players.get(this.ownership.get(e.id)?.player);
    const sellerBefore=seller&&seller.id!==player.id?syncInventoryBasis(this,seller,good).quantity:null;
    const result=this.tradeHandled(ship,e,good,amount,dir,limit,{...opts,profileAccounting:true});
    recordGoodsTrade(this,player,good,dir,result,before);
    if(sellerBefore!=null)recordGoodsTrade(this,seller,good,dir==='buy'?'sell':'buy',result,sellerBefore);
    return result;
  }

  tradeHandled(ship, e, good, amount, dir, limit = 0, opts = {}) {
    if(e.market?.homeworld?.warp)return {n:0,reason:'Standort für Warp gesperrt.'};
    if(opts.handling||this.profile!=='homeworld')return this.tradeImpl(ship,e,good,amount,dir,limit,opts);
    const allowed=handlingAllowance(this,e,ship);
    if(allowed<1)return {n:0,reason:'Abfertigung oder Umschlagbudget belegt; nächstes Zeitfenster abwarten.'};
    const result=this.tradeImpl(ship,e,good,Math.min(amount,allowed),dir,limit,{...opts,handling:true});
    recordHandling(this,e,ship,result.n||0);return result;
  }

  tradeImpl(ship, e, good, amount, dir, limit = 0, opts = {}) {
    if(this.profile==='homeworld'&&GOODS[good]?.cls==='passenger')return passengerTrade(this,ship,e,good,amount,dir,limit);
    // Sondernachfrage: nur manuelle Verkäufe über den Handelsbefehl, Überschuss zum normalen Marktpreis
    if (opts.manual && dir === 'sell' && ship.dockedAt === e.id) {
      const ev = sellToEvent(this, ship, e, good, amount);
      if (ev.n) {
        const rest = amount - ev.n;
        const more = rest > 0 && ship.cargo[good] > 0 && e.market?.goods[good] ? this.trade(ship, e, good, rest, dir, limit, { ...opts, manual: false }) : { n: 0 };
        return { n: ev.n + (more.n || 0), total: ev.total + (more.total || 0) };
      }
    }
    const p = this.players.get(ship.owner);
    const slot = e.market?.goods[good];
    if (!slot || !GOODS[good]) return { n: 0, reason: 'Ware wird hier nicht gehandelt' };
    if (ship.dockedAt !== e.id) return { n: 0, reason: 'Schiff ist nicht angedockt' };
    const prop = this.ownership.get(e.id);
    if (prop && prop.player === ship.owner) return this.ownerTransfer(ship, e, good, amount, dir);
    if (prop && this.canUseStorage(prop, ship.owner)) return this.memberTransfer(ship, e, prop, good, amount, dir);
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
      if (free <= 0 && holdFor(ship, good) !== 'cargo' && !shipStats(ship)[holdFor(ship, good)]) {
        return { n: 0, reason: holdOf(good) === 'hazard' ? 'Gefahrgut braucht eine Geschirmte Kammer' : 'Passagiere brauchen eine Passagierkabine' };
      }
      const max = Math.min(amount, free, Math.floor(slot.stock));
      let blocked = false;
      while (n < max) {
        const pr = buyPrice(good, slot);
        if (limit && pr > limit) break;
        if (p.credits - pr < floor) { blocked = floor > 0; break; }
        p.credits -= pr; slot.stock -= 1; total += pr; n++;
        if(this.profile==='homeworld')receiveMarketCash(e,pr);
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
      if(this.profile==='homeworld'&&slot.role==='trade'&&!downstreamDemand(this,e,good))return {n:0,reason:'Händler hat keine zahlungsfähige Zielnachfrage'};
      const have = ship.cargo[good] || 0;
      const max = Math.min(amount, have, Math.floor(slot.cap - slot.stock),this.profile==='homeworld'&&slot.role==='trade'?downstreamDemand(this,e,good):Infinity);
      const bonus = hasAbility(ship, 'trader') ? 1.05 : 1;
      while (n < max) {
        const pr = sellPrice(good, slot) * bonus;
        if (limit && pr < limit) break;
        if(this.profile==='homeworld'&&!spendMarketCash(e,pr))break;
        p.credits += pr; slot.stock += 1; total += pr; n++;
      }
      ship.cargo[good] = have - n;
      if (!ship.cargo[good]) delete ship.cargo[good];
      if (n) this.recordShip(ship, 'inc', total, opts.route);
      if (!n) return { n: 0, reason: slot.cap - slot.stock < 1 ? 'Lager voll' : this.profile==='homeworld'&&e.market.economy?.cash<sellPrice(good,slot)?'Marktkasse reicht nicht aus':limit ? 'Preisgrenze' : 'nicht möglich' };
    }
    stat(e.market, this.time, dir === 'buy' ? 'o' : 'i', good, n);
    this.shipLog(ship, `${dir === 'buy' ? 'Gekauft' : 'Verkauft'}: ${n} ${GOODS[good].name} für ${Math.round(total)} Cr bei ${e.name}`);
    this.afterTrade(ship, e, good, n, total, dir, opts);
    return { n, total };
  }

  /** Nach jedem Handel mit Fremden: Einstandspreis bzw. Hauptschiff-XP, wenig XP für den Questgeber aus dem Umsatz */
  afterTrade(ship, e, good, n, total, dir, opts = {}) {
    this.tradeBasis(ship, good, n, total, dir, opts);
    this.addGiverXp(e, total / GIVER_TRADE_CR);
  }

  /** Eigenes Lager: kostenlos laden und einlagern */
  ownerTransfer(ship, e, good, amount, dir) {
    if(e.market?.homeworld?.warp)return {n:0,reason:'Standort für Warp gesperrt.'};
    if(this.profile==='homeworld'&&GOODS[good]?.cls==='passenger')return passengerTrade(this,ship,e,good,amount,dir);
    if (e.type === 'ruins' && e.market.homeworld?.facilities.dock.status !== 'ready') return { n: 0, reason: 'Zuerst den Landeplatz reparieren' };
    const slot = e.market.goods[good];
    let n;
    if (dir === 'buy') {
      n = Math.min(amount, freeFor(ship, good), Math.floor(availableHomeStock(e.market, good)));
      if (n <= 0) return { n: 0, reason: slot.stock < 1 ? 'kein Bestand' : 'Laderaum voll' };
      slot.stock -= n;
      ship.cargo[good] = (ship.cargo[good] || 0) + n;
    } else {
      const have = ship.cargo[good] || 0;
      n = Math.min(amount, have, Math.floor(homeStorageFree(e.market, good)));
      if (n <= 0) return { n: 0, reason: have ? 'Lager voll' : 'nichts geladen' };
      slot.stock += n;
      ship.cargo[good] = have - n;
      if (!ship.cargo[good]) delete ship.cargo[good];
    }
    stat(e.market, this.time, dir === 'buy' ? 'o' : 'i', good, n);
    this.shipLog(ship, `${dir === 'buy' ? 'Geladen' : 'Eingelagert'}: ${n} ${GOODS[good].name} bei ${e.name}`);
    return { n, total: 0 };
  }

  /** Fixpreis des Objekts für eine Ware (Konsortiumslager): Fixpreis-Position des Besitzes, sonst 0,5 */
  fixedPriceOf(e, prop, good) {
    const s = e.market.goods[good];
    const { pmin, pmax } = priceWindow(good, s?.mod || 1);
    return fixedPrice(pmin, pmax, prop.fixed?.[good] ?? FIXED.DEFAULT);
  }

  /**
   * Konsortiumslager (PRD-3 4.4): Mitglieder handeln zum Fixpreis, zollfrei und ohne Gebühr.
   * Entnahme zahlt das Mitglied an den Pool, Einlagerung zahlt der Pool (nur so viel, wie er decken kann).
   */
  memberTransfer(ship, e, prop, good, amount, dir) {
    const p = this.players.get(ship.owner);
    const pool = this.accountOf(prop.player);
    const slot = e.market.goods[good];
    const price = this.fixedPriceOf(e, prop, good);
    let n;
    if (dir === 'buy') {
      n = Math.min(amount, freeFor(ship, good), Math.floor(slot.stock), Math.floor(p.credits / price));
      if (n <= 0) return { n: 0, reason: slot.stock < 1 ? 'kein Bestand' : p.credits < price ? 'zu wenig Credits' : 'Laderaum voll' };
      slot.stock -= n;
      ship.cargo[good] = (ship.cargo[good] || 0) + n;
      p.credits -= n * price;
      pool.credits += n * price;
      this.recordShip(ship, 'buy', n * price);
    } else {
      const have = ship.cargo[good] || 0;
      n = Math.min(amount, have, Math.floor(slot.cap - slot.stock), Math.floor(pool.credits / price));
      if (n <= 0) return { n: 0, reason: !have ? 'nichts geladen' : slot.cap - slot.stock < 1 ? 'Lager voll' : 'Pool kann nicht zahlen' };
      slot.stock += n;
      ship.cargo[good] = have - n;
      if (!ship.cargo[good]) delete ship.cargo[good];
      p.credits += n * price;
      pool.credits -= n * price;
      this.recordShip(ship, 'inc', n * price);
    }
    // Einstandspreis mitführen, aber keine Handels-XP: Lagerhandel im Konsortium ist kein Markthandel
    if (dir === 'buy') this.tradeBasis(ship, good, n, n * price, 'buy');
    else if (!ship.cargo[good] && ship.basis) delete ship.basis[good];
    stat(e.market, this.time, dir === 'buy' ? 'o' : 'i', good, n);
    this.shipLog(ship, `${dir === 'buy' ? 'Entnommen' : 'Eingelagert'}: ${n} ${GOODS[good].name} für ${Math.round(n * price)} Cr (Konsortiumslager ${e.name})`);
    return { n, total: n * price };
  }

  /**
   * Handel eines Fremden mit Spielerbesitz: Käufe bringen dem Besitzer den Erlös, Verkäufe zahlt der Besitzer.
   * Zoll: Aufschlag auf alle Geschäfte von Fremden. Bei leerem Konto oder aktivem Stop-Loss nimmt der Markt nichts an.
   */
  tradeWithOwner(ship, e, prop, good, amount, dir, limit, opts) {
    const p = this.players.get(ship.owner);
    const owner = this.accountOf(prop.player);
    const slot = e.market.goods[good];
    const trader = hasAbility(ship, 'trader');
    const c = trader ? 0 : prop.customs || 0;
    let n = 0, total = 0;
    if (dir === 'buy') {
      if (!canBuyFrom(slot)) return { n: 0, reason: 'Ware wird hier nicht verkauft' };
      const floor = opts.auto ? this.stopLossFor(p, opts.route) : 0;
      const max = Math.min(amount, freeFor(ship, good), Math.floor(availableHomeStock(e.market, good)));
      while (n < max) {
        const pr = buyPrice(good, slot) * (1 + c);
        if ((limit && pr > limit) || p.credits - pr < floor || p.credits < pr) break;
        p.credits -= pr; owner.credits += pr; slot.stock -= 1; total += pr; n++;
      }
      if (n) { ship.cargo[good] = (ship.cargo[good] || 0) + n; this.recordShip(ship, 'buy', total, opts.route); propBook(this, prop, 'inc', total); }
    } else {
      if (!canSellTo(slot)) return { n: 0, reason: 'Ware wird hier nicht angekauft' };
      const have = ship.cargo[good] || 0;
      const max = Math.min(amount, have, Math.floor(homeStorageFree(e.market, good)));
      const floor = owner.stopLoss || 0;
      while (n < max) {
        const pr = sellPrice(good, slot) * (1 - c) * (trader ? 1.05 : 1);
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
    this.afterTrade(ship, e, good, n, total, dir, opts);
    return { n, total };
  }

  /** Besitz-Eintrag eines Objekts (oder undefined) */
  propertyOf(e) { return this.ownership.get(e.id); }

  // ---------- NPC-Verkehr: Versorger und Abholer ----------
  /** Belegung "Markt:Ware" eines NPC-Schiffs setzen oder freigeben (höchstens ein NPC-Schiff je Markt und Ware) */
  markNpc(ship, on) {
    const c = ship.queue?.[0];
    if (c?.t !== 'supply') return;
    for (const k of [c.stationId + ':' + c.good, c.sourceId + ':' + c.good]) on ? this.npcBusy.add(k) : this.npcBusy.delete(k);
  }
  npcFree(e, good) { return !this.npcBusy.has(e.id + ':' + good); }

  /** Station: Versorger für fehlende Zutaten, je Ware höchstens einer gleichzeitig */
  checkSupply(e) {
    const m = e.market;
    if (this.ownership.get(e.id)?.mode === 'private') return; // privat: keine NPC-Versorger
    const wants = missingInputs(m);
    if (!wants.length) { if (m.supply?.state !== 'active') m.supply = null; return; }
    this.sendNpc(e, wants, false);
  }

  /** Planet: Abholer für Verbrauchsgüter unter dem Ziel-Füllstand, geholt bei Produzenten über dem Ziel */
  checkHaul(e) {
    const m = e.market;
    if (this.ownership.get(e.id)?.mode === 'private') return;
    const wants = Object.entries(m.goods).filter(([, s]) => s.role === 'consume' && s.stock / s.cap < targetOf(s) - SUPPLY.MARGIN / 2)
      .sort(([, a], [, b]) => a.stock / a.cap - targetOf(a) - (b.stock / b.cap - targetOf(b))).map(([g]) => g);
    if (wants.length) this.sendNpc(e, wants, true);
  }

  /** Schickt höchstens ein NPC-Schiff für die erste Ware, die frei, nicht in Abklingzeit und beschaffbar ist */
  sendNpc(e, goods, haul) {
    const m = e.market;
    m.supCd ||= {};
    for (const good of goods) {
      if (!this.npcFree(e, good) || (m.supCd[good] || 0) > this.time) continue;
      const amount = supplyLoad(m.goods[good] || { cap: 0, stock: 0 });
      if (!amount) continue;
      const src = this.findSource(e, good, haul);
      if (!src) {
        m.supCd[good] = this.time + SUPPLY.RETRY_NO_SOURCE;
        if (!haul && m.supply?.state !== 'active') m.supply = { state: 'nosource', good };
        continue;
      }
      const ship = this.spawnNpcShip(e, haul);
      ship.queue = [{ t: 'supply', stationId: e.id, sourceId: src.id, good, amount, phase: 'toSource', haul }];
      this.markNpc(ship, true);
      m.supply = { state: 'active', good, shipId: ship.id, sourceId: src.id };
      return;
    }
  }

  /**
   * Nächstgelegene Quelle im Umkreis.
   * Versorger: Produzent mit Vorrat oder passendes Asteroidenfeld. Abholer: Fabrik oder Extraktor mit Output über dem Ziel.
   */
  findSource(e, good, haul = false) {
    let best = null, bestD = Infinity;
    for (const s of this.world.sectorEntities(e.sector)) {
      if (s === e || s.kind === 'wormhole' || (e.kind === 'planet' && s.type === 'hub')) continue;
      const d = Math.hypot(s.x - e.x, s.y - e.y);
      if (d > SUPPLY.RANGE || d >= bestD) continue;
      if (s.kind === 'belt') {
        if (haul || BELT_TYPES[s.type].good !== good || !this.npcFree(s, good)) continue;
      } else {
        const sl = s.market?.goods[good];
        if (!sl || !canBuyFrom(sl) || sl.stock < SUPPLY.MIN_SOURCE_STOCK || !this.npcFree(s, good)) continue;
        if (haul && (sl.role !== 'produce' || !['factory', 'extractor'].includes(s.market.strategy) || sl.stock / sl.cap <= targetOf(sl) + SUPPLY.MARGIN)) continue;
        if (this.ownership.get(s.id)?.mode === 'private') continue;
      }
      best = s;
      bestD = d;
    }
    return best;
  }

  spawnNpcShip(station, haul = false) {
    const id = 's' + ++this.counters.ship;
    const a = Math.random() * Math.PI * 2;
    const d = station.radius + WORLD.DOCK_OFFSET;
    const ship = {
      id, owner: NPC_OWNER, type: SUPPLY.SHIP_TYPE, name: `${haul ? 'Abholer' : 'Versorger'} ${station.name}`,
      x: station.x + Math.cos(a) * d, y: station.y + Math.sin(a) * d, angle: a, vx: 0, vy: 0,
      cargo: {}, queue: [], state: 'docked', dockedAt: station.id, log: [],
    };
    this.ships.set(id, ship);
    return ship;
  }

  /** Ablieferung: nur, was ins Lager passt (die Ladung wurde passend bemessen) */
  finishSupply(ship, station) {
    if(ship.queue[0]?.real)return finishRealSupply(this,ship,station);
    const m = station.market;
    const c = ship.queue[0];
    let delivered = 0;
    const prop = this.ownership.get(station.id);
    for (const [g, n] of Object.entries(ship.cargo)) {
      const slot = m.goods[g];
      if (!slot) continue;
      let k = Math.min(n, Math.floor(homeStorageFree(m, g)));
      if (prop) k = payForDelivery(this, station, prop, g, k); // Besitzer zahlt den Marktpreis
      else slot.stock += k;
      delivered += k;
      stat(m, this.time, 'i', g, k);
    }
    m.supCd ||= {};
    if (c?.good) m.supCd[c.good] = this.time + SUPPLY.COOLDOWN;
    if (!c?.haul) m.supply = { state: 'cooldown', good: c?.good, delivered };
    this.removeShip(ship);
  }

  /** Offene Karten- und Schiffsangebote eines Spielers entfernen (Austritt aus dem Konsortium) */
  removeOffersOf(pid) { removeOffersOf(this, pid); }

  removeShip(ship) {
    const player=this.players.get(ship.owner);
    if(player?.manualShip===ship.id)player.manualShip=this.shipsOf(player.id).find(s=>s.id!==ship.id)?.id||null;
    if (ship.owner === NPC_OWNER) this.markNpc(ship, false);
    this.shipOffers.delete(ship.id);
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

const newKnown = () => ({ system: new Set(), sector: new Set(), zone: new Set(), wh: new Set(), recipe: new Set(), ship: new Set(), module: new Set(), visit: new Set() });

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
