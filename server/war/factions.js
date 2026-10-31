// PRD 15 U09: Fraktionssektoren. Verwaltungsplanet mit Werft, Geldpool und Level je Fraktion und Sektor,
// Grundversorgung, Warenannahme, physische Goldtransporte, Flottenbau und Freundschaftsquests.
import { SHIP_TYPES, GOODS, WORLD, freeFor } from '../../shared/config.js';
import { FACTIONS } from '../../shared/factions.js';
import { FACTION_WAR as F, fleetChoices } from '../../shared/warfare.js';
import { isWarship, ensureDamage } from '../../shared/combat.js';
import { hexAt, hexKey, hexNeighbors } from '../../shared/hex.js';
import { factionOwner, factionOfOwner, isFactionOwner, diplo, isFriend, factionHostileTo } from './diplomacy.js';
import { hooks } from './hooks.js';

export const fsecKey = (faction, sector) => `${faction}@${sector}`;
export const capOf = (fs) => F.POOL_CAP * fs.level;

/** Geld in den Pool: Deckel gilt, Überschuss verfällt. Rückgabe: tatsächlich gutgeschrieben */
export function poolAdd(fs, amount) {
  const room = Math.max(0, capOf(fs) - fs.pool);
  const k = Math.max(0, Math.min(room, amount));
  fs.pool += k;
  return k;
}
/** Ausgabe nie unter null */
export function poolSpend(fs, amount) {
  if (amount > fs.pool + 1e-6) return false;
  fs.pool -= amount;
  return true;
}

/** Fraktionssektoren aus der Weltgenerierung anlegen (einmal je vorhandenem Sektor) */
export function ensureFactionSectors(game) {
  for (const sec of game.world.sectors.values()) {
    if (!sec.faction?.id) continue;
    const key = fsecKey(sec.faction.id, sec.key);
    if (game.fsecs.has(key)) {
      prepareAdminMarket(game, game.fsecs.get(key));
      continue;
    }
    const ents = game.world.sectorEntities(sec.key).filter((e) => e.sector === sec.key && e.faction === sec.faction.id);
    const yard = ents.find((e) => e.type === 'factionyard');
    if (!yard) continue;
    const planets = ents.filter((e) => e.kind === 'planet' && e.system === yard.system && e.market);
    const admin = planets.sort((a, b) => Math.hypot(a.x - yard.x, a.y - yard.y) - Math.hypot(b.x - yard.x, b.y - yard.y))[0];
    if (!admin) continue;
    admin.admin = sec.faction.id;
    game.fsecs.set(key, { key, faction: sec.faction.id, sector: sec.key, admin: admin.id, yard: yard.id, pool: F.START_POOL, level: 1, progress: 0, xp: 0,
      supply: { water: F.BUFFER * 0.5, food: F.BUFFER * 0.5 }, ok: true, nextTransport: game.time + 600 + Math.random() * 900, nextBuild: game.time + 60,
      fleet: [], raidAt: 0, upkeepAt: game.time });
    prepareAdminMarket(game, game.fsecs.get(key));
  }
}

/** One-time conversion; supply slots always reference the canonical faction buffer. */
export function prepareAdminMarket(game, fs) {
  const e = game.world.entities.get(fs.admin);
  if (!e?.market) return;
  e.admin = fs.faction;
  if (!fs.adminMarketVersion) {
    e.adminOriginalName ??= e.name;
    e.name = `${e.adminOriginalName} – Verwaltungszentrum (${FACTIONS[fs.faction].name})`;
    for (const [good, slot] of Object.entries(e.market.goods)) {
      const amount = Math.max(0, slot.stock || 0);
      if (F.SUPPLY_GOODS.includes(good)) fs.supply[good] = (fs.supply[good] || 0) + amount;
      else poolAdd(fs, amount * (good === 'finegold' ? F.GOLD_RATE : bestPrice(good)));
    }
    fs.adminMarketVersion = 1;
  }
  if (e.market.strategy === 'factionadmin' && e.market.adminBound === fs) return;
  e.market.strategy = 'factionadmin';
  e.market.goods = Object.fromEntries(F.SUPPLY_GOODS.map((good) => [good, {
    role: 'consume', get rate() { return F.DEMAND_PER_MIN * fs.level / 60; }, mod: 1,
    get cap() { return bufferOf(fs); },
    get stock() { return fs.supply[good] || 0; },
    set stock(value) { fs.supply[good] = value; },
  }]));
  Object.defineProperty(e.market, 'adminBound', { value: fs, configurable: true });
  e.market.rev = (e.market.rev || 0) + 1;
}

/** Shared by manual and route trades; special quest/gift/loot paths stay separate. */
export function tradeAdminSupply(game, ship, e, good, amount, dir, limit = 0, opts = {}) {
  const fs = fsecOfEntity(game, e), p = game.players.get(ship.owner);
  if (!fs || !p) return { n: 0, reason: 'Kein Spielerhandel am Verwaltungszentrum.' };
  if (ship.dockedAt !== e.id) return { n: 0, reason: 'Schiff ist nicht angedockt' };
  if (dir !== 'sell' || !F.SUPPLY_GOODS.includes(good)) return { n: 0, reason: 'Fraktionen kaufen außerhalb von Quests nur Wasser und Nahrung.' };
  const price = bestPrice(good);
  if (limit && price < limit) return { n: 0, reason: 'Preisgrenze' };
  const before = ship.cargo[good] || 0;
  const reason = supplyDelivery(game, p, ship, good, amount, false);
  if (reason) return { n: 0, reason };
  const n = before - (ship.cargo[good] || 0), total = n * price;
  game.recordShip(ship, 'inc', total, opts.route);
  game.afterTrade(ship, e, good, n, total, dir, opts);
  return { n, total };
}

export const fsecOfEntity = (game, e) => (e?.admin ? game.fsecs.get(fsecKey(e.admin, e.sector)) : null);
export const fsecsOf = (game, faction) => [...game.fsecs.values()].filter((f) => f.faction === faction);

/** Ausreichende Grundversorgung: beide Waren tatsächlich vorrätig */
export const supplyOk = (fs) => F.SUPPLY_GOODS.every((g) => (fs.supply[g] || 0) > 0);
export const bufferOf = (fs) => F.BUFFER * fs.level;

/** Regulärer Bestpreis (kein frei gesetztes Spielerangebot): Referenzpreis der Ware */
export const bestPrice = (good) => GOODS[good]?.base || 0;

/**
 * Waren an die Fraktion: Wasser/Nahrung füllen zuerst die Versorgung, bei vollem Lager wird abgewiesen
 * (kein automatischer Verkauf). Andere Waren werden zum regulären Bestpreis in Geld umgewandelt.
 * Rückgabe: angenommene Menge.
 */
export function receiveGoods(fs, good, n) {
  if (n <= 0) return 0;
  if (F.SUPPLY_GOODS.includes(good)) {
    const k = Math.max(0, Math.min(n, Math.floor(bufferOf(fs) - (fs.supply[good] || 0))));
    fs.supply[good] = (fs.supply[good] || 0) + k;
    return k;
  }
  if (good === 'finegold') { poolAdd(fs, n * F.GOLD_RATE); return n; }
  poolAdd(fs, n * bestPrice(good));
  return n;
}

/** Spieleraktivität im Sektor (wirtschaftliche oder militärische Aktionen) */
export function recordActivity(game, sector, playerId = null) {
  if (!sector) return;
  game.warActivity.set(sector, game.time);
  // Spielerbezogen für die Aggression (U10)
  const p = playerId && game.players.get(playerId);
  if (p) (diplo(p).act ||= {})[sector] = game.time;
}
function activeNear(game, sector) {
  const [q, r] = sector.split(',').map(Number);
  const keys = [sector, ...hexNeighbors(q, r).map((h) => hexKey(h.q, h.r))];
  return keys.some((k) => game.time - (game.warActivity.get(k) ?? -Infinity) <= F.ACTIVITY_WINDOW);
}

/** Minütliche Wirtschaft eines Fraktionssektors */
function economy(game, fs, mins) {
  // Grundversorgung verbrauchen; Lücken pausieren Fortschritt, senken aber kein Level
  const need = F.DEMAND_PER_MIN * fs.level * mins;
  let ok = true;
  for (const g of F.SUPPLY_GOODS) {
    if ((fs.supply[g] || 0) >= need) fs.supply[g] -= need;
    else { fs.supply[g] = 0; ok = false; }
  }
  fs.ok = ok && supplyOk(fs);
  if (fs.ok) fs.progress = Math.min(1, fs.progress + F.PROGRESS_PER_MIN * mins);
  if (fs.progress >= 1 && fs.level < F.MAX_LEVEL && poolSpend(fs, F.LEVEL_COST * fs.level)) { fs.level++; fs.progress = 0; game.emit('fsecLevel', fs); }
  // Langsames passives Einkommen nur bei Spieleraktivität im eigenen oder angrenzenden Sektor
  if (activeNear(game, fs.sector)) poolAdd(fs, F.INCOME_PER_MIN * fs.level * mins);
}

/** NPC-Schiff einer Fraktion erzeugen */
export function spawnFactionShip(game, fs, type, at) {
  const id = 's' + ++game.counters.ship;
  const a = Math.random() * Math.PI * 2;
  const d = (at.radius || 50) + WORLD.DOCK_OFFSET;
  const ship = { id, owner: factionOwner(fs.faction), type, name: `${FACTIONS[fs.faction].name} ${SHIP_TYPES[type].name}`,
    x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d, angle: a, vx: 0, vy: 0, cargo: {}, queue: [], qid: 0, state: 'docked', dockedAt: at.id, log: [],
    fuel: SHIP_TYPES[type].tank, upg: {}, modules: [], fsec: fs.key, posture: { mode: 'intercept' } };
  ensureDamage(ship);
  game.ships.set(id, ship);
  return ship;
}

/** Kriegsschiffe einer Fraktion in diesem Sektor (einzeln gezählt, Staffeln als ein Schiff, unabhängig von Stacks) */
export const warshipsOf = (game, fs) => [...game.ships.values()].filter((s) => s.fsec === fs.key && isWarship(s.type) && !s.captive);

/** Flottenbau innerhalb von Geld-, Level- und Flottenlimit; Ersatz kostet Geld und Bauzeit */
function buildFleet(game, fs) {
  if (game.time < fs.nextBuild) return;
  fs.nextBuild = game.time + F.BUILD_EVERY;
  if (fs.building) {
    if (game.time < fs.building.until) return;
    const yard = game.world.entities.get(fs.yard);
    if (yard) spawnFactionShip(game, fs, fs.building.type, yard);
    fs.building = null;
    return;
  }
  if (warshipsOf(game, fs).length >= F.WARSHIPS_PER_LEVEL * fs.level) return;
  const choices = fleetChoices(fs.level).filter((t) => SHIP_TYPES[t].price <= fs.pool * 0.5);
  if (!choices.length) return;
  const type = choices[Math.floor(Math.random() * choices.length)];
  if (!poolSpend(fs, SHIP_TYPES[type].price)) return;
  fs.building = { type, until: game.time + ({ S: 120, M: 240, L: 480, XL: 900 }[SHIP_TYPES[type].cls] || 300) };
}

/** Physische Goldtransporte zu einem anderen Sektor derselben Fraktion */
function dispatchTransport(game, fs) {
  if (game.time < fs.nextTransport) return;
  const [lo, hi] = F.TRANSPORT_EVERY;
  fs.nextTransport = game.time + lo + Math.random() * (hi - lo);
  const targets = fsecsOf(game, fs.faction).filter((o) => o !== fs);
  if (!targets.length) return;
  const from = game.world.entities.get(fs.admin);
  const to = targets.map((o) => ({ o, e: game.world.entities.get(o.admin) })).filter((x) => x.e).sort((a, b) => Math.hypot(a.e.x - from.x, a.e.y - from.y) - Math.hypot(b.e.x - from.x, b.e.y - from.y))[0];
  if (!to) return;
  // Laufende Transporte zum Ziel einrechnen; Pool, Zielkapazität und Frachtraum beachten
  const inflight = [...game.ships.values()].filter((s) => s.queue[0]?.t === 'goldRun' && s.queue[0].to === to.o.key).reduce((a, s) => a + (s.cargo.finegold || 0), 0);
  const room = Math.max(0, capOf(to.o) - to.o.pool - inflight * F.GOLD_RATE);
  const ship = spawnFactionShip(game, fs, F.TRANSPORT_TYPE, from);
  const units = Math.floor(Math.min(fs.pool * F.TRANSPORT_SHARE, room) / F.GOLD_RATE);
  const n = Math.min(units, Math.floor(freeFor(ship, 'finegold')));
  if (n <= 0) { game.ships.delete(ship.id); return; }
  poolSpend(fs, n * F.GOLD_RATE);
  ship.cargo.finegold = n;
  ship.name = `${FACTIONS[fs.faction].name} Goldtransport`;
  ship.posture = { mode: 'passive' };
  ship.queue = [{ t: 'goldRun', to: to.o.key, target: to.e.id, qid: 1 }];
}

/** Ausführung des Goldtransports: Gutschrift erst bei tatsächlicher Ankunft */
export function runGoldRun(ship, c, dt, game, flyToEntity) {
  const fs = game.fsecs.get(c.to);
  const e = game.world.entities.get(c.target);
  if (!fs || !e) { game.removeShip(ship); return true; }
  if (!flyToEntity(ship, e, dt, game)) return false;
  const n = ship.cargo.finegold || 0;
  poolAdd(fs, n * F.GOLD_RATE);
  delete ship.cargo.finegold;
  game.removeShip(ship);
  return true;
}

/** Takt (sekündlich aufgerufen, Wirtschaft minütlich) */
export function tickFactions(game) {
  ensureFactionSectors(game);
  game.friendTick = (game.friendTick || 0) + 1;
  if (game.friendTick % 5 === 1) for (const p of game.players.values()) syncFriendQuest(game, p);
  for (const fs of game.fsecs.values()) {
    const mins = (game.time - fs.upkeepAt) / 60;
    if (mins >= 1) { economy(game, fs, mins); fs.upkeepAt = game.time; }
    buildFleet(game, fs);
    dispatchTransport(game, fs);
  }
}

// ---------- Beute und Freikauf an Fraktionen ----------
hooks.factionLoot = (game, b, owner, good, n) => {
  const f = factionOfOwner(owner);
  const fs = [...game.fsecs.values()].filter((x) => x.faction === f).sort((a, c) => {
    const ea = game.world.entities.get(a.admin), ec = game.world.entities.get(c.admin);
    return Math.hypot(ea.x - b.x, ea.y - b.y) - Math.hypot(ec.x - b.x, ec.y - b.y);
  })[0];
  return fs ? receiveGoods(fs, good, n) : 0;
};
hooks.factionCredit = (game, owner, amount, at) => {
  const f = factionOfOwner(owner);
  const fs = fsecsOf(game, f)[0];
  if (fs) poolAdd(fs, amount);
};

// ---------- Versorgung durch Spieler ----------
/**
 * Abgabe von Wasser/Nahrung am Verwaltungsplaneten. Befreundet/neutral: Kauf zum regulären Bestpreis aus dem Pool.
 * Feindlich: ausdrücklich gekennzeichnete Abgabe ohne Bezahlung, Ruf oder Diplomatiewirkung.
 */
export function supplyDelivery(game, player, ship, good, amount, donate) {
  const e = game.world.entities.get(ship.dockedAt);
  const fs = fsecOfEntity(game, e);
  if (!fs) return 'Nur am Verwaltungsplaneten einer Fraktion.';
  if (!F.SUPPLY_GOODS.includes(good)) return 'Fraktionen kaufen außerhalb von Quests nur Wasser und Nahrung.';
  const hostile = factionHostileTo(game, fs.faction, player.id);
  if (hostile && !donate) return 'Feindliche Fraktion: nur ausdrücklich gekennzeichnete Abgabe ohne Bezahlung.';
  const have = Math.floor(ship.cargo[good] || 0);
  const free = Math.floor(bufferOf(fs) - (fs.supply[good] || 0));
  if (free <= 0) return 'Das Versorgungslager ist voll; weiteres Abladen wird verweigert.';
  let n = Math.min(have, amount, free);
  const price = bestPrice(good);
  if (!donate) n = Math.min(n, Math.floor(fs.pool / Math.max(1, price)));
  if (n <= 0) return have ? 'Die Fraktion kann derzeit nicht bezahlen.' : 'Nichts geladen.';
  ship.cargo[good] -= n;
  if (!ship.cargo[good]) delete ship.cargo[good];
  fs.supply[good] += n;
  if (!donate) { poolSpend(fs, n * price); player.credits += n * price; }
  recordActivity(game, e.sector);
  game.shipLog(ship, `${donate ? 'Abgegeben' : 'Verkauft'}: ${n} ${GOODS[good].name} an ${FACTIONS[fs.faction].name} (${e.name})`);
  return null;
}

// ---------- Freundschaften (PRD 9.2) ----------
/** Erste Freundschaftsquest startet einmalig bei sektorweiter Leitstelle (aktuell Stufe 2) bzw. bei Migration */
export function syncFriendQuest(game, p) {
  const w = diplo(p);
  if (w.friendQuestStarted) return;
  const covers = [...game.world.entities.values()].some((e) => e.market?.homeworld?.owner === p.id && (e.market.homeworld.controlLevel || 0) >= F.FRIEND_LEVEL);
  if (!covers) return;
  w.friendQuestStarted = true;
  w.friendQuest = { stage: 1, gift: { ...F.GIFT } };
  game.emit('friendQuest', p); // Netz meldet sofort, wenn online; sonst beim nächsten Login (announceFriendQuest)
}

export const FRIEND_QUEST_NOTICE = 'Freundschaftsquest: Bringe einer frei gewählten Fraktion ein Geschenk an ihren Verwaltungsplaneten.';

/** Beim Login: Quest nachträglich starten und eine offline verpasste Meldung nachholen. Liefert true, wenn zu melden ist. */
export function announceFriendQuest(game, p) {
  syncFriendQuest(game, p);
  const w = diplo(p);
  if (!w.friendQuest || w.friendQuestAnnounced) return false;
  w.friendQuestAnnounced = true;
  return true;
}

/** Bau und Kauf weiterer Schiffe ab fünf eigenen Schiffen gesperrt, solange die erste Quest offen ist */
export function shipPurchaseBlock(game, p) {
  const w = p?.war;
  if (!w?.friendQuest || w.friendQuest.stage !== 1 || w.friends?.length) return null;
  const n = game.shipsOf(p.id).length; // Staffeln zählen als ein Schiff, Gefangene zählen zum Bestand
  return n >= F.SHIP_LOCK ? 'Solange die erste Freundschaftsquest offen ist, sind ab fünf Schiffen Bau und Kauf weiterer Schiffe gesperrt.' : null;
}

/** Geschenk am Verwaltungsplaneten der gewählten Fraktion übergeben */
export function deliverGift(game, p, ship) {
  const w = diplo(p);
  const q = w.friendQuest;
  if (!q) return 'Keine offene Freundschaftsquest.';
  const e = game.world.entities.get(ship.dockedAt);
  const fs = fsecOfEntity(game, e);
  if (!fs) return 'Das Geschenk wird an einem Verwaltungsplaneten übergeben.';
  if (w.friends.includes(fs.faction)) return 'Mit dieser Fraktion bist du bereits befreundet.';
  for (const [g, n] of Object.entries(q.gift)) if ((ship.cargo[g] || 0) < n) return `Geschenk unvollständig: ${n} ${GOODS[g].name} nötig.`;
  for (const [g, n] of Object.entries(q.gift)) if (F.SUPPLY_GOODS.includes(g) && bufferOf(fs) - (fs.supply[g] || 0) < n) return 'Das Versorgungslager ist voll; das Geschenk bleibt an Bord.';
  for (const [g, n] of Object.entries(q.gift)) {
    ship.cargo[g] -= n;
    if (!ship.cargo[g]) delete ship.cargo[g];
    receiveGoods(fs, g, n);
  }
  w.friends.push(fs.faction);
  w.friendQuest = null;
  game.emit('notice', p, `${FACTIONS[fs.faction].name} ist jetzt dauerhaft befreundet.${q.stage === 1 ? ' Die übrigen fünf Fraktionen sind verfeindet.' : ''}`);
  return null;
}

/** Leitstellenmodul „galaktische Freundschaft“: einmalig, sehr teuer, öffnet die zweite Geschenkquest */
export function buyGalacticFriendship(game, p) {
  const w = diplo(p);
  if (!w.friends.length) return 'Erst die erste Freundschaft abschließen.';
  if (w.galactic) return 'Das Modul ist bereits gebaut.';
  const home = game.world.entities.get(p.homeworld);
  if (!home?.market?.homeworld || home.market.homeworld.owner !== p.id || (home.market.homeworld.controlLevel || 0) < 1) return 'Eine eigene Leitstelle ist nötig.';
  if (p.credits < F.SECOND_FRIEND_COST) return `Das Modul kostet ${F.SECOND_FRIEND_COST.toLocaleString('de-DE')} Cr.`;
  p.credits -= F.SECOND_FRIEND_COST;
  w.galactic = true;
  w.friendQuest = { stage: 2, gift: { ...F.GIFT } };
  return null;
}

/** Fraktionsquests: Abgabe nur bei ausreichender Grundversorgung */
export function questTurnInBlock(game, q) {
  if (!q?.adminSector) return null;
  const fs = game.fsecs.get(q.adminSector);
  return fs && !supplyOk(fs) ? 'Abgabe erst bei ausreichender Grundversorgung des Verwaltungszentrums.' : null;
}
export function questFactionXp(game, q, xp) {
  const fs = game.fsecs.get(q?.adminSector);
  if (!fs) return;
  fs.xp += xp;
  fs.progress = Math.min(1, fs.progress + xp * F.QUEST_XP_PROGRESS);
}

/** Sicht auf Fraktionssektoren (für Planetendetails) */
export function fsecView(game, fs, p) {
  return { key: fs.key, faction: fs.faction, name: FACTIONS[fs.faction].name, level: fs.level, pool: Math.floor(fs.pool), cap: capOf(fs),
    progress: Math.round(fs.progress * 100) / 100, supply: { water: Math.floor(fs.supply.water), food: Math.floor(fs.supply.food) }, buffer: bufferOf(fs),
    ok: fs.ok, warships: warshipsOf(game, fs).length, limit: F.WARSHIPS_PER_LEVEL * fs.level,
    relation: isFriend(p, fs.faction) ? 'friend' : factionHostileTo(game, fs.faction, p.id) ? 'hostile' : 'neutral',
    aggr: Math.round(diplo(p).aggr[fs.key] || 0), peaceLeft: diplo(p).peace[fs.key] === undefined ? null : Math.max(0, Math.round(86400 - (game.time - diplo(p).peace[fs.key]))) };
}

export { isFactionOwner, hexAt };
