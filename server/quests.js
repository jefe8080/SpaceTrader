import { WORLD, GOODS, BELT_TYPES, QUEST, QUEST_TYPES, REP, RANKS, factionRank, questReward, flightMinutes, canBuyFrom, shipStats,
  giverLevel, giverXpOf } from '../shared/config.js';
import { hexAt, hexKey, hexNeighbors } from '../shared/hex.js';
import { missingInputs, stat } from './markets.js';

/**
 * Quests (PRD-2 Kapitel 9): Questtafeln an Planeten und Werften, eine aktive Quest je Spieler, keine Fristen.
 * Die Belohnung richtet sich nach dem geschätzten Aufwand (Flugminuten bei Speed 150 plus Stopps), nicht nach der Zeit.
 */

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

/** Questgeber: jeder Planet und jede Werft (auch im Spielerbesitz) */
export const isGiver = (e) => !!e?.market && (e.kind === 'planet' || e.market.strategy === 'shipyard');
export const giverLvl = (e) => giverLevel(e.market?.qxp || 0);
export const boardOf = (e) => (e.market.board ||= { offers: [], next: 0 });

/** Zellen eines Sektors (Fläche des besiedelten Bereichs in Nebelzellen) */
const SECTOR_CELLS = Math.round((Math.PI * WORLD.SECTOR_RADIUS ** 2) / WORLD.FOG_CELL ** 2);

// ---------- Tafeln ----------
/** Tafeln in den angegebenen Sektoren auffüllen: neues Angebot alle 30 bis 60 min, volle Tafeln ersetzen alte Angebote */
export function refreshBoards(game, sectors) {
  for (const key of sectors) {
    for (const e of game.world.sectorEntities(key)) {
      if (!isGiver(e) || e.sector !== key) continue;
      const b = boardOf(e);
      if (game.time < b.next) continue;
      const slots = QUEST.SLOTS[giverLvl(e)];
      if (b.offers.length >= slots) {
        const i = b.offers.findIndex((o) => game.time - o.created > QUEST.EXPIRE);
        if (i >= 0) b.offers.splice(i, 1);
      }
      if (b.offers.length < slots) {
        const o = makeOffer(game, e);
        if (o) b.offers.push(o);
      }
      b.next = game.time + rnd(...QUEST.EVERY);
    }
  }
}

/** Neues Angebot eines Questgebers (oder null, wenn kein Typ passt) */
export function makeOffer(game, e, onlyType = null) {
  const L = giverLvl(e);
  const level = Math.max(0, L - Math.floor(Math.random() * 3)); // Schwierigkeit bis zum eigenen Level
  const kinds = onlyType ? [onlyType] : e.kind === 'planet'
    ? ['procure', 'procure', 'courier', 'courier', 'explore', ...(['resort', 'urban'].includes(e.type) ? ['tour', 'tour'] : [])]
    : ['procure', 'explore', 'mine', 'rush', 'rush'];
  for (const type of shuffle(kinds)) {
    const p = GEN[type](game, e, level);
    if (!p) continue;
    const { effort, value = 0, ...params } = p;
    const reward = questReward(effort, level, value, type);
    return { id: 'q' + ++game.counters.quest, type, giver: e.id, giverName: e.name, level, created: Math.round(game.time),
      effort: Math.round(effort * 10) / 10, reward, faction: e.faction || null, ...params };
  }
  return null;
}

/** Märkte im Sektor des Questgebers innerhalb von QUEST.RANGE (ohne Spielerbesitz) */
function nearMarkets(game, e, range = QUEST.RANGE) {
  return game.world.sectorEntities(e.sector).filter((x) => x !== e && x.market && x.kind !== 'wormhole' && dist(x, e) <= range && !game.ownership.has(x.id));
}
const stop = QUEST.STOP_MIN;

const GEN = {
  /** x Einheiten Ware y beschaffen (bei Station z oder frei) und an den Questgeber liefern */
  procure(game, e, level) {
    const goods = Object.entries(e.market.goods).filter(([g, s]) => s.role === 'consume' && !GOODS[g].ultra && GOODS[g].cls === 'normal').map(([g]) => g);
    if (!goods.length) return null;
    return deliveryQuest(game, e, level, pick(goods));
  },
  /** Material für den aktuellen Bau einer NPC-Werft */
  rush(game, e, level) {
    if (e.market.owner) return null;
    const g = missingInputs(e.market).find((x) => GOODS[x].cls === 'normal');
    return g ? deliveryQuest(game, e, level, g) : null;
  },
  /** Questfracht bei z abholen und zu a bringen */
  courier(game, e) {
    const zs = nearMarkets(game, e);
    if (zs.length < 2) return null;
    const z = pick(zs);
    const as = nearMarkets(game, z).filter((x) => x !== z && x !== e);
    if (!as.length) return null;
    const a = pick(as);
    return { pickup: z.id, pickupName: z.name, dest: a.id, destName: a.name, effort: flightMinutes(dist(e, z) + dist(z, a)) + 2 * stop };
  },
  /** Touristen abholen, 3 Stationen anfliegen, zurückbringen (Passagierkabine) */
  tour(game, e, level) {
    const cands = shuffle(nearMarkets(game, e));
    if (cands.length < 3) return null;
    const stops = cands.slice(0, 3);
    // Aufwand: Rundweg nach dem Prinzip "nächster Halt zuerst"
    let pos = e, len = 0;
    const rest = [...stops];
    while (rest.length) {
      rest.sort((a, b) => dist(pos, a) - dist(pos, b));
      len += dist(pos, rest[0]);
      pos = rest.shift();
    }
    len += dist(pos, e);
    return { stops: stops.map((s) => s.id), stopNames: stops.map((s) => s.name), tourists: 5 + 5 * level, effort: flightMinutes(len) + 4 * stop };
  },
  /** n % eines Sektors aufdecken oder ein Sondergebiet besuchen */
  explore(game, e, level) {
    const here = game.world.sectors.get(e.sector);
    const near = [here, ...hexNeighbors(here.q, here.r).map((c) => game.world.sectors.get(hexKey(c.q, c.r))).filter(Boolean)];
    const zones = near.flatMap((s) => s.zones).filter((z) => dist(z, e) < WORLD.HEX_SPACING);
    if (zones.length && Math.random() < 0.4) {
      const z = pick(zones);
      return { zone: z.id, zoneName: zoneName(z), zx: z.x, zy: z.y, effort: flightMinutes(2 * Math.max(0, dist(z, e) - Math.min(z.rx, z.ry))) + stop };
    }
    const sec = Math.random() < 0.6 ? here : pick(near);
    const pct = 2 + level;
    const cells = Math.round((SECTOR_CELLS * pct) / 100);
    // Ein Schiff deckt beim Flug einen Streifen von ca. 5 Zellen Breite auf
    const travel = sec === here ? 0 : Math.max(0, dist(e, sec.bh) - WORLD.SECTOR_RADIUS);
    return { sector: sec.key, sectorName: sec.name, pct, cells, effort: flightMinutes((cells / 5) * WORLD.FOG_CELL + 2 * travel) + stop };
  },
  /** x Einheiten Erz oder Eis selbst abbauen und an die Werft liefern */
  mine(game, e, level) {
    const belts = game.world.sectorEntities(e.sector).filter((b) => b.kind === 'belt' && ['ore', 'ice'].includes(BELT_TYPES[b.type].good) && dist(b, e) <= QUEST.RANGE);
    if (!belts.length) return null;
    const b = belts.sort((x, y) => dist(x, e) - dist(y, e))[0];
    const g = BELT_TYPES[b.type].good;
    const amount = 20 + 20 * level;
    return { good: g, amount, belt: b.id, beltName: b.name, value: amount * GOODS[g].base,
      effort: flightMinutes(2 * dist(e, b)) + amount / QUEST.MINE_RATE / 60 + 2 * stop };
  },
};

const ZONE_NAMES = { gravity: 'Gravitationsstörung', ionstorm: 'Ionensturm', nebula: 'Dichter Nebel', solarwind: 'Sonnenwindkorridor', plasma: 'Plasmawolke' };
const zoneName = (z) => ZONE_NAMES[z.type] || 'Sondergebiet';

/** Beschaffung bzw. Eilbestellung: Menge nach Warenwert, Quelle unter den drei nächsten Anbietern */
function deliveryQuest(game, e, level, g) {
  const base = GOODS[g].base;
  let amount = Math.max(5, Math.min(30 + 40 * level, Math.round((600 * 1.8 ** level) / base)));
  if (e.market.strategy === 'shipyard' && !e.market.owner) {
    const need = Object.entries(e.market.goods).find(([x]) => x === g)?.[1];
    if (need) amount = Math.max(5, Math.min(amount, Math.floor(need.cap - need.stock)));
  }
  const srcs = nearMarkets(game, e, QUEST.RANGE * 1.5).filter((x) => x.market.goods[g] && canBuyFrom(x.market.goods[g]))
    .sort((a, b) => dist(a, e) - dist(b, e)).slice(0, 3);
  const src = srcs.length ? pick(srcs) : null;
  const effort = (src ? flightMinutes(2 * dist(e, src)) : flightMinutes(2 * 30000)) + 2 * stop;
  return { good: g, amount, source: src?.id || null, sourceName: src?.name || null, value: amount * base * (src?.market.goods[g].mod || 1), effort };
}

// ---------- Annehmen, abbrechen, abschließen ----------
/** Objekte, die einer Quest gehören (für die Besitzprüfung) */
const questEntities = (q) => [q.source, q.pickup, q.dest, ...(q.stops || []), ['procure', 'rush', 'mine'].includes(q.type) ? q.giver : null].filter(Boolean);

export function acceptQuest(game, player, ship, e, questId) {
  if (!isGiver(e)) return 'Hier gibt es keine Questtafel.';
  if (ship.dockedAt !== e.id) return 'Dein Schiff muss beim Questgeber angedockt sein.';
  if (player.quest) return 'Du hast schon eine aktive Quest.';
  const lock = (player.questLock || 0) - game.time;
  if (lock > 0) return `Nach dem Abbruch kannst du erst in ${Math.ceil(lock / 60)} min eine neue Quest annehmen.`;
  const b = boardOf(e);
  const i = b.offers.findIndex((o) => o.id === questId);
  if (i < 0) return 'Diese Quest ist nicht mehr verfügbar.';
  const q = b.offers[i];
  if (questEntities(q).some((id) => game.canUseStorage(game.ownership.get(id), player.id))) return 'Diese Quest betrifft deinen eigenen Besitz oder den deines Konsortiums.';
  const st = shipStats(ship);
  if (q.type === 'tour' && st.passenger < q.tourists) return `Für ${q.tourists} Touristen braucht das Schiff Passagierkabinen mit ${q.tourists} Plätzen.`;
  if (q.type === 'mine' && !(st.mining.std > 0)) return 'Für diese Quest braucht das Schiff Abbaugeräte.';
  b.offers.splice(i, 1);
  const quest = { ...q, accepted: Math.round(game.time), ship: ship.id, progress: 0 };
  if (q.type === 'courier') quest.state = 'pickup';
  if (q.type === 'tour') { quest.state = 'tour'; quest.visited = []; }
  if (q.type === 'mine') quest.minedBase = minedBy(game, player, q.good);
  player.quest = quest;
  // Ziele auf der Karte sichtbar machen
  for (const id of [q.source, q.pickup, q.dest, ...(q.stops || [])].filter(Boolean)) {
    const t = game.world.entities.get(id);
    if (t) game.revealAround(player, t.x, t.y, 600);
  }
  if (q.zone) game.discover(player, 'zone', q.zone);
  if (q.sector) game.discover(player, 'sector', q.sector);
  game.emit('notice', player, `Quest angenommen: ${QUEST_TYPES[q.type].name} für ${e.name}`);
  game.emit('sfx', player, 'questAccept');
  game.emit('entity', e);
  questProgress(game, player, ship); // z.B. Ware schon an Bord
  return undefined;
}

export function abortQuest(game, player) {
  const q = player.quest;
  if (!q) return 'Keine aktive Quest.';
  player.quest = null;
  player.questLock = game.time + QUEST.ABORT_LOCK;
  if (q.faction) {
    player.rep ||= {};
    const cur = player.rep[q.faction] || 0;
    player.rep[q.faction] = Math.max(RANKS[factionRank(cur)], cur - Math.round(q.reward.xp * REP.ABORT));
  }
  game.emit('notice', player, `Quest abgebrochen. Neue Quests erst in ${QUEST.ABORT_LOCK / 60} min.`);
  return undefined;
}

/** Summe der selbst abgebauten Menge einer Ware über alle eigenen Schiffe */
export const minedBy = (game, player, g) => game.shipsOf(player.id).reduce((a, s) => a + (s.mined?.[g] || 0), 0);

/**
 * Fortschritt prüfen, wenn ein eigenes Schiff irgendwo angedockt ist (beim Andocken und auf Knopfdruck).
 * Liefert true, wenn sich etwas getan hat.
 */
export function questProgress(game, player, ship) {
  const q = player.quest;
  if (!q || !ship.dockedAt) return false;
  const at = ship.dockedAt;
  switch (q.type) {
    case 'procure':
    case 'rush':
    case 'mine': {
      if (at !== q.giver || (ship.cargo[q.good] || 0) < q.amount) return false;
      if (q.type === 'mine' && minedBy(game, player, q.good) - q.minedBase < q.amount) return false;
      ship.cargo[q.good] -= q.amount;
      if (!ship.cargo[q.good]) delete ship.cargo[q.good];
      const e = game.world.entities.get(q.giver);
      const slot = e?.market?.goods[q.good];
      if (slot) { slot.stock = Math.min(slot.cap, slot.stock + q.amount); stat(e.market, game.time, 'i', q.good, q.amount); }
      completeQuest(game, player);
      return true;
    }
    case 'courier':
      if (q.state === 'pickup' && at === q.pickup) {
        q.state = 'deliver';
        q.ship = ship.id;
        game.shipLog(ship, `Questfracht übernommen bei ${q.pickupName}`);
        return true;
      }
      if (q.state === 'deliver' && at === q.dest && ship.id === q.ship) { completeQuest(game, player); return true; }
      return false;
    case 'tour':
      if (ship.id !== q.ship) return false;
      if (q.state === 'tour' && q.stops.includes(at) && !q.visited.includes(at)) {
        q.visited.push(at);
        if (q.visited.length >= q.stops.length) q.state = 'return';
        game.shipLog(ship, `Rundreise: Halt ${q.visited.length} von ${q.stops.length}`);
        return true;
      }
      if (q.state === 'return' && at === q.giver) { completeQuest(game, player); return true; }
      return false;
    default:
      return false;
  }
}

/** Erkundung: neu aufgedeckte Zellen im Zielsektor zählen */
export function exploreCells(game, player, cells) {
  const q = player.quest;
  if (q?.type !== 'explore' || !q.sector) return;
  for (const k of cells) {
    const [cx, cy] = k.split(',').map(Number);
    const h = hexAt((cx + 0.5) * WORLD.FOG_CELL, (cy + 0.5) * WORLD.FOG_CELL);
    if (hexKey(h.q, h.r) === q.sector) q.progress++;
  }
  if (q.progress >= q.cells) completeQuest(game, player);
}

/** Erkundung: Sondergebiet besucht (ein eigenes Schiff ist darin) */
export function exploreZone(game, player, zones) {
  const q = player.quest;
  if (q?.type === 'explore' && q.zone && zones.some((z) => z.id === q.zone)) completeQuest(game, player);
}

function completeQuest(game, player) {
  const q = player.quest;
  player.quest = null;
  player.credits += q.reward.cr;
  player.questsDone = (player.questsDone || 0) + 1;
  game.addXp(player, q.reward.xp);
  const giver = game.world.entities.get(q.giver);
  if (giver) game.addGiverXp(giver, giverXpOf(q.reward.xp));
  if (q.faction) game.addRep(player, q.faction, q.reward.xp * REP.PER_XP);
  game.emit('notice', player, `Quest erfüllt: +${q.reward.cr.toLocaleString('de-DE')} Cr, +${q.reward.xp} XP`);
  game.emit('sfx', player, 'questDone');
}

/** Sektoren, in denen Tafeln laufen: Spielerschiffe (auch angedockt), Aktivität in den letzten 30 min oder Spielerbesitz */
export function boardSectors(game, activeSince) {
  const out = new Set();
  for (const [k, t] of game.activity) if (t >= activeSince) out.add(k);
  for (const s of game.ships.values()) {
    if (s.owner === 'npc') continue;
    const h = hexAt(s.x, s.y);
    out.add(hexKey(h.q, h.r));
  }
  for (const id of game.ownership.keys()) { const e = game.world.entities.get(id); if (e) out.add(e.sector); }
  return out;
}

export { SECTOR_CELLS };
