// PRD 15 U10: Aggression mit einmaligem Friedenstimer, Grenzabfangen, NPC-Flotten-KI und Fraktionskriege,
// Planetenraids mit sichtbarer Plünderungsphase, Beute, 24-Stunden-Schutz, Produktionsmalus und Reparatur.
import { GOODS, freeFor, SHIP_TYPES } from '../../shared/config.js';
import { COMBAT, navalClass, isWarship, needsRepair, ensureDamage, blueprint, maxHull } from '../../shared/combat.js';
import { AGGRESSION as A } from '../../shared/warfare.js';
import { hexAt, hexKey, hexNeighbors } from '../../shared/hex.js';
import { coverageAreas } from '../coverage.js';
import { coveredPoint } from '../../shared/coverage.js';
import { startBattle, endBattle, isActive, logBattle } from './battle.js';
import { stackOf, stackMembers, mergeShips, leaderOf } from './stacks.js';
import { isProtected } from './engage.js';
import { diplo, factionOwner, factionOfOwner, isFactionOwner, factionHostileTo, attackBlock, neutralPhase, isFriend } from './diplomacy.js';
import { fsecOfEntity, warshipsOf, poolSpend, receiveGoods } from './factions.js';
import { hooks } from './hooks.js';
import { setWarn } from '../ships.js';

const aggrKey = (fs) => fs.key;


/** Minütliche Aggression je feindlicher Fraktion, Sektor und Spieler */
function tickAggression(game, mins) {
  for (const p of game.players.values()) {
    const w = diplo(p);
    if (neutralPhase(p)) continue; // vor erster Freundschaft bleibt die Aggression null
    const areas = coverageAreas(game, p);
    for (const fs of game.fsecs.values()) {
      if (isFriend(p, fs.faction)) continue;
      const admin = game.world.entities.get(fs.admin);
      if (!admin) continue;
      const key = aggrKey(fs);
      // Einmaliger Friedenstimer ab erster Erfassung durch die eigene Leitstelle; Ausbau/Verlust setzen ihn nicht zurück
      if (w.peace[key] === undefined && (game.profile !== 'homeworld' || coveredPoint(areas, admin))) w.peace[key] = game.time;
      if (w.peace[key] === undefined || game.time - w.peace[key] < A.PEACE) continue;
      // Ausreichende Versorgung pausiert den Anstieg, senkt aber nicht
      if (fs.ok) continue;
      const [q, r] = fs.sector.split(',').map(Number);
      const near = [fs.sector, ...hexNeighbors(q, r).map((h) => hexKey(h.q, h.r))].some((k) => w.act?.[k] !== undefined && game.time - w.act[k] <= 60 * Math.max(1, mins));
      if (near) w.aggr[key] = (w.aggr[key] || 0) + A.RISE_PER_MIN * mins;
    }
  }
}

/** Untätige Kriegsschiffe eines Fraktionssektors am Verwaltungsplaneten */
function idleFleet(game, fs) {
  const admin = game.world.entities.get(fs.admin);
  return warshipsOf(game, fs).filter((s) => !s.battle && !s.queue.length && !s.stack && admin && Math.hypot(s.x - admin.x, s.y - admin.y) < 3000);
}

/** Raidstack bilden: ein Teil der Flotte bleibt als Verteidigung zurück */
function formRaidStack(game, fs, max = 4) {
  const idle = idleFleet(game, fs);
  const total = warshipsOf(game, fs).length;
  const keep = Math.ceil(total * 0.4);
  const free = idle.slice(0, Math.max(0, Math.min(max, idle.length - keep)));
  if (!free.length) return null;
  for (const s of free.slice(1)) mergeShips(game, s, free[0]);
  return free[0];
}

/** Planet für Raids gesperrt? (24 Stunden nach erfolgreicher Plünderung, unabhängig von Besitz und Reparatur) */
export const raidProtected = (game, planet) => (planet.market?.raid?.protectUntil || 0) > game.time;

/** Raidziel prüfen */
export function raidError(game, attackerOwner, planet) {
  if (!planet || planet.kind !== 'planet' || !planet.market) return 'Kein Planet.';
  if (raidProtected(game, planet)) return 'Dieser Planet ist nach einer Plünderung 24 Stunden geschützt.';
  const owner = planetOwner(game, planet);
  if (!owner) return 'Dieser Planet gehört niemandem, der geplündert werden könnte.';
  return attackBlock(game, attackerOwner, owner);
}
/** Besitzer eines Planeten: Spieler (Heimat/Kolonie/Besitz) oder Fraktion (Fraktionsplanet) */
export function planetOwner(game, planet) {
  if (planet.market?.homeworld?.owner) return planet.market.homeworld.owner;
  const prop = game.ownership.get(planet.id);
  if (prop) return prop.player;
  if (planet.faction) return factionOwner(planet.faction);
  return null;
}

/** Strategischer Raidbefehl: anfliegen, Verteidiger stellen (Schlacht), danach Plünderung */
export function runRaid(ship, c, dt, game, flyTo) {
  const planet = game.world.entities.get(c.planet);
  const err = raidError(game, ship.owner, planet);
  if (err) { game.shipLog(ship, `Raid abgebrochen: ${err}`); return true; }
  if (Math.hypot(planet.x - ship.x, planet.y - ship.y) > COMBAT.ENGAGE) {
    ship.state = 'flying'; ship.dockedAt = null;
    flyTo(ship, planet.x, planet.y, dt, game);
    return false;
  }
  const owner = planetOwner(game, planet);
  const defenders = [...game.ships.values()].filter((s) => s.owner === owner && !s.battle && !s.captive && !isProtected(s) && navalClass(s.type) !== 'civil'
    && Math.hypot(s.x - planet.x, s.y - planet.y) < 1500);
  const b = startBattle(game, [ship], defenders, { kind: 'raid', planet, raid: { phase: 'fight', owner } });
  if (b && !b.sides.B.owners.includes(owner)) { b.sides.B.owners.push(owner); (b.allies ||= { A: [], B: [] }).B = [...new Set([...(b.allies.B || []), owner])]; }
  return true;
}

/** Plünderungsphase: sichtbar, Verteidiger können eingreifen; danach Beute bis zur freien Frachtkapazität ungeschützter Raider */
export function onDefendersBeaten(game, b) {
  if (!b.raid) return;
  if (b.raid.phase !== 'loot') {
    b.raid.phase = 'loot';
    b.raid.until = b.t + A.LOOT_SECS;
    logBattle(game, b, 'Verteidiger besiegt: Plünderungsphase beginnt');
  }
}

export function tickRaidBattles(game) {
  for (const b of game.battles.values()) {
    if (b.kind !== 'raid' || !b.raid || b.ended) continue;
    const defenders = Object.values(b.units).filter((u) => u.side === 'B' && isActive(u) && !u.protected);
    if (b.raid.phase === 'loot') {
      b.lastHarm = b.t; // laufende Plünderung ist kein festgefahrener Zustand
      if (defenders.length) { b.raid.phase = 'fight'; logBattle(game, b, 'Verteidiger greifen in die Plünderung ein'); continue; }
      if (b.t >= b.raid.until) completeLoot(game, b);
    }
  }
}

function completeLoot(game, b) {
  const planet = game.world.entities.get(b.planet);
  const raiders = Object.values(b.units).filter((u) => u.side === 'A' && isActive(u)).map((u) => game.ships.get(u.ship)).filter((s) => s && !isProtected(s));
  const loot = {};
  if (planet?.market) {
    // Wertvollste verfügbare Waren zuerst, nie mehr als Lagerbestand oder gültiger Frachtraum
    const goods = Object.entries(planet.market.goods).filter(([g, s]) => s.stock >= 1 && GOODS[g]?.cls !== 'passenger').sort(([a], [c]) => (GOODS[c].base || 0) - (GOODS[a].base || 0));
    for (const [g, slot] of goods) {
      for (const s of raiders) {
        const n = Math.min(Math.floor(slot.stock), Math.floor(freeFor(s, g)));
        if (n <= 0) continue;
        slot.stock -= n;
        s.cargo[g] = (s.cargo[g] || 0) + n;
        loot[g] = (loot[g] || 0) + n;
      }
    }
    // Kein Besitzwechsel, keine Gebäudezerstörung; Malus stapelt nicht; Schutz 24 h ab Plünderung
    planet.market.raid = { malus: true, protectUntil: game.time + A.PROTECT, at: Math.round(game.time), by: b.sides.A.owners[0] };
    game.emit('entity', planet);
    const owner = b.raid.owner;
    if (game.players.has(owner)) game.emit('notice', game.players.get(owner), `${planet.name} wurde geplündert: Produktion 50 % bis zur Reparatur, 24 Stunden Raidschutz.`);
  }
  b.raid.done = true;
  b.raid.loot = loot;
  logBattle(game, b, `Plünderung abgeschlossen: ${Object.entries(loot).map(([g, n]) => `${n} ${GOODS[g].name}`).join(', ') || 'nichts'}`);
  // Fraktionsraider liefern Beute an ihren Pool (Wasser/Nahrung nur bis zum Puffer)
  for (const s of raiders) if (isFactionOwner(s.owner) && s.fsec) s.raidHome = true;
  endBattle(game, b, 'A');
}

/** Produktionsfaktor eines Planeten (Raidmalus 50 % bis zur Reparatur) */
export const productionFactor = (e) => (e?.market?.raid?.malus ? A.MALUS : 1);

/** Kostenpflichtige Reparatur: Preis und Dauer vorher sichtbar, keine Baumaterialien; Schutz bleibt */
export function repairPlanet(game, player, planet) {
  const r = planet?.market?.raid;
  if (!r?.malus) return 'Kein Raidschaden.';
  if (planetOwner(game, planet) !== player.id) return 'Nur der Besitzer repariert.';
  if (r.repairUntil) return 'Die Reparatur läuft bereits.';
  if (player.credits < A.REPAIR_COST) return `Reparatur kostet ${A.REPAIR_COST} Cr.`;
  player.credits -= A.REPAIR_COST;
  r.repairUntil = game.time + A.REPAIR_SECS;
  game.emit('entity', planet);
  return null;
}

function tickPlanetRepairs(game) {
  for (const e of game.world.entities.values()) {
    const r = e.market?.raid;
    if (!r) continue;
    // NPC-Planeten veranlassen ihre kostenpflichtige Reparatur selbst
    if (r.malus && !r.repairUntil && !game.players.has(planetOwner(game, e)) && game.time - (r.at || 0) > 300) {
      const fs = e.faction ? [...game.fsecs.values()].find((f) => f.faction === e.faction && f.sector === e.sector) : null;
      if (!fs || poolSpend(fs, A.REPAIR_COST)) r.repairUntil = game.time + A.REPAIR_SECS;
    }
    if (r.repairUntil && game.time >= r.repairUntil) { r.malus = false; delete r.repairUntil; game.emit('entity', e); }
    if (!r.malus && game.time >= r.protectUntil) { delete e.market.raid; game.emit('entity', e); }
  }
}

/** Grenzverteidigung: Kriegsschiffe im Schutzradius feindlicher Fraktionen werden abgefangen (nicht in der Neutralitätsphase) */
function borderDefense(game) {
  for (const fs of game.fsecs.values()) {
    const points = [game.world.entities.get(fs.admin), game.world.entities.get(fs.yard)].filter(Boolean);
    const intruders = [...game.ships.values()].filter((s) => !s.battle && !s.captive && game.players.has(s.owner) && leaderOf(game, s) === s
      && (stackOf(game, s) ? stackMembers(game, stackOf(game, s)) : [s]).some((m) => isWarship(m.type) && !isProtected(m))
      && factionHostileTo(game, fs.faction, s.owner) && points.some((p) => Math.hypot(p.x - s.x, p.y - s.y) <= A.BORDER_RADIUS));
    for (const t of intruders) {
      if ([...game.ships.values()].some((s) => s.fsec === fs.key && s.queue[0]?.t === 'attack' && s.queue[0].target === t.id)) continue;
      const lead = formRaidStack(game, fs, 3) || idleFleet(game, fs)[0];
      if (lead) { lead.queue = [{ t: 'attack', target: t.id, qid: ++lead.qid }]; lead.nav = null; }
    }
  }
}

/** Aggressionsgesteuerte Raids gegen Handelsschiffe oder Planeten; Zielwahl gewichtet Flugzeit, Schutz und Zufall */
function launchRaids(game) {
  for (const p of game.players.values()) {
    const w = diplo(p);
    for (const fs of game.fsecs.values()) {
      const key = aggrKey(fs);
      if ((w.aggr[key] || 0) < A.RAID_AT || game.time < (fs.raidAt || 0)) continue;
      if (!factionHostileTo(game, fs.faction, p.id)) continue;
      const admin = game.world.entities.get(fs.admin);
      const targets = [];
      for (const s of game.shipsOf(p.id)) {
        if (s.battle || s.captive || isProtected(s) || navalClass(s.type) === 'war') continue;
        const guarded = game.shipsOf(p.id).filter((g) => isWarship(g.type) && Math.hypot(g.x - s.x, g.y - s.y) < 3000).length;
        targets.push({ kind: 'ship', id: s.id, score: Math.hypot(s.x - admin.x, s.y - admin.y) * (1 + guarded) * (0.7 + Math.random() * 0.6) });
      }
      for (const e of game.world.entities.values()) {
        if (e.kind !== 'planet' || planetOwner(game, e) !== p.id || raidProtected(game, e)) continue;
        const guarded = game.shipsOf(p.id).filter((g) => isWarship(g.type) && Math.hypot(g.x - e.x, g.y - e.y) < 3000).length;
        targets.push({ kind: 'planet', id: e.id, score: Math.hypot(e.x - admin.x, e.y - admin.y) * (1 + guarded) * (0.7 + Math.random() * 0.6) });
      }
      const t = targets.sort((a, b) => a.score - b.score)[0];
      if (!t) continue;
      const lead = formRaidStack(game, fs);
      if (!lead) continue;
      lead.queue = [t.kind === 'ship' ? { t: 'attack', target: t.id, qid: ++lead.qid } : { t: 'raid', planet: t.id, qid: ++lead.qid }];
      lead.nav = null;
      w.aggr[key] -= A.RAID_COST;
      fs.raidAt = game.time + A.RAID_COOLDOWN;
      game.emit('notice', p, `Warnung: ${lead.name} bricht zu einem Raid auf.`);
    }
  }
}

/** NPC-Kriege: Fraktionen fangen gegnerische Goldtransporte in ihrem Schutzradius ab und raiden feindliche Verwaltungsplaneten */
function npcWars(game) {
  for (const fs of game.fsecs.values()) {
    const admin = game.world.entities.get(fs.admin);
    if (!admin) continue;
    for (const s of game.ships.values()) {
      if (s.queue[0]?.t !== 'goldRun' || s.battle) continue;
      const f2 = factionOfOwner(s.owner);
      if (!f2 || f2 === fs.faction || Math.hypot(s.x - admin.x, s.y - admin.y) > A.BORDER_RADIUS * 2) continue;
      if ([...game.ships.values()].some((x) => x.queue[0]?.t === 'attack' && x.queue[0].target === s.id)) continue;
      const lead = idleFleet(game, fs)[0];
      if (lead) { lead.queue = [{ t: 'attack', target: s.id, qid: ++lead.qid }]; lead.nav = null; }
    }
    // Gelegentliche Raids auf feindliche Verwaltungsplaneten im Nachbarsektor (Planeten wechseln nie den Besitzer)
    if (game.time >= (fs.npcRaidAt ?? game.time + 0) && warshipsOf(game, fs).length >= 6) {
      fs.npcRaidAt = game.time + A.RAID_COOLDOWN * 2;
      const [q, r] = fs.sector.split(',').map(Number);
      const near = new Set(hexNeighbors(q, r).map((h) => hexKey(h.q, h.r)));
      const enemy = [...game.fsecs.values()].find((o) => o.faction !== fs.faction && near.has(o.sector));
      const planet = enemy && game.world.entities.get(enemy.admin);
      if (planet && !raidProtected(game, planet)) {
        const lead = formRaidStack(game, fs);
        if (lead) { lead.queue = [{ t: 'raid', planet: planet.id, qid: ++lead.qid }]; lead.nav = null; }
      }
    }
    fs.npcRaidAt ??= game.time + A.RAID_COOLDOWN;
  }
}

/** Fraktionsschiffe kehren heim, liefern Beute ab und reparieren gegen Geld aus dem Pool */
function factionUpkeep(game) {
  for (const s of game.ships.values()) {
    if (!s.fsec || s.battle || s.captive || s.queue.length || s.queue[0]?.t === 'goldRun') continue;
    const fs = game.fsecs.get(s.fsec);
    const admin = fs && game.world.entities.get(fs.admin);
    if (!admin) continue;
    if (stackOf(game, s) && leaderOf(game, s) !== s) continue;
    if (Math.hypot(s.x - admin.x, s.y - admin.y) > 2500) { s.queue = [{ t: 'goto', target: admin.id, qid: ++s.qid }]; continue; }
    // Heimgekehrt: Stack auflösen, Beute an den Pool (Wasser/Nahrung nur bis zum Puffer), Reparatur
    const crew = stackOf(game, s) ? stackMembers(game, stackOf(game, s)) : [s];
    for (const m of crew) {
      for (const [g, n] of Object.entries(m.cargo)) { const k = receiveGoods(fs, g, n); m.cargo[g] = n - k; if (!m.cargo[g]) delete m.cargo[g]; }
      if (needsRepair(m)) {
        const cost = Math.round(SHIP_TYPES[m.type].price * 0.05);
        if (poolSpend(fs, cost)) { const bp = blueprint(m.type); ensureDamage(m); m.dmg.hull = maxHull(m.type); for (const x of bp.systems) m.dmg.sys[x.id] = x.hp; if (bp.squad) m.dmg.craft = bp.squad.n; bp.weapons.forEach((w, i) => { if (w.ammo != null) m.dmg.ammo[i] = w.ammo; }); }
      }
    }
    if (stackOf(game, s)) for (const m of crew.slice(1)) { const st = stackOf(game, m); if (st) { st.members = st.members.filter((id) => id !== m.id); delete m.stack; } }
    if (stackOf(game, s) && stackOf(game, s).members.length < 2) { game.stacks.delete(s.stack); delete s.stack; }
  }
}

/** Sekündlicher Takt der Kriegs-KI */
export function tickRaids(game) {
  tickRaidBattles(game);
  game.raidTick = (game.raidTick || 0) + 1;
  if (game.raidTick % 5 === 0) { borderDefense(game); factionUpkeep(game); }
  if (game.raidTick % 60 === 0) {
    tickAggression(game, 1);
    launchRaids(game);
    npcWars(game);
    tickPlanetRepairs(game);
  }
}

export { setWarn, hexAt };
