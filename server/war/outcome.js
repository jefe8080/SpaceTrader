// PRD 15 U06: Schlachtende. Kapitulation, Sieg/Unentschieden, Besitzwechsel, Gefangene, Freikauf, Trümmer und Berichte.
import { SHIP_TYPES, GOODS, freeFor, WORLD } from '../../shared/config.js';
import { COMBAT, navalClass, blueprint, maxHull, needsRepair } from '../../shared/combat.js';
import { isActive, drivesDestroyed } from './battle.js';
import { hooks } from './hooks.js';
import { removeFromStacks, detachShip } from './stacks.js';
import { ownerName, isFactionOwner, diplo } from './diplomacy.js';

const unitsOf = (b) => Object.values(b.units);
/** Kampfunfähig: weder beweglich noch bewaffnet (zählt nicht als weiterkämpfend) */
export function immobile(game, b, u) {
  return drivesDestroyed(game.ships.get(u.ship));
}

/** Hooks späterer Pakete: Beute für Fraktionen (U09), Reparaturautomatik (U07), Raids (U10) */
export const outcomeHooks = hooks;

function report(game, owner, rep) {
  const p = game.players.get(owner);
  if (!p) return;
  const w = diplo(p);
  w.reports ||= [];
  w.reports.unshift(rep);
  if (w.reports.length > 10) w.reports.length = 10;
  game.emit('notice', p, `Schlacht beendet: ${rep.result === 'win' ? 'Sieg' : rep.result === 'loss' ? 'Niederlage' : 'Unentschieden'} (${rep.lost.length} Verluste, ${rep.prisoners.length} Gefangene)`);
}

/** Ladung kapitulierter Verlierer geht an den Sieger: in freien Laderaum der Siegerschiffe, bei Fraktionen an den Sektorpool */
function transferLoot(game, b, goods, winnerOwner, winners) {
  const moved = {};
  for (const [g, n0] of Object.entries(goods)) {
    let n = n0;
    if (isFactionOwner(winnerOwner) && hooks.factionLoot) { const k = hooks.factionLoot(game, b, winnerOwner, g, n); moved[g] = (moved[g] || 0) + k; continue; }
    for (const s of winners) {
      if (n <= 0) break;
      if (s.modules?.includes('protect')) continue; // geschützte Schiffe plündern nicht
      const k = Math.min(n, Math.floor(freeFor(s, g)));
      if (k <= 0) continue;
      s.cargo[g] = (s.cargo[g] || 0) + k;
      n -= k;
      moved[g] = (moved[g] || 0) + k;
    }
  }
  return moved;
}

/** Trümmer zerstörter Kriegsschiffe: öffentlich abbaubar, Teil der Baurohstoffe, 30 Minuten Spielzeit */
export function spawnDebris(game, b, ship) {
  const build = SHIP_TYPES[ship.type]?.build || {};
  const goods = {};
  for (const [g, n] of Object.entries(build)) { const k = Math.floor(n * COMBAT.DEBRIS_SHARE); if (k > 0) goods[g] = k; }
  if (!Object.keys(goods).length) return null;
  const id = 'debris' + ++game.counters.debris;
  const sec = game.world.sectorAt(b.x, b.y);
  const a = Math.random() * Math.PI * 2;
  const e = { id, kind: 'belt', type: 'debris', name: `Trümmer ${ship.name}`, x: b.x + Math.cos(a) * 300, y: b.y + Math.sin(a) * 300, radius: 140,
    sector: sec?.key ?? b.sector, richness: 1, debris: { goods, until: game.time + COMBAT.DEBRIS_TTL, from: SHIP_TYPES[ship.type].name } };
  game.world.addEntity(e);
  for (const p of game.players.values()) if (game.isKnown(p, e)) game.emit('reveal', p, { entities: [e] });
  return e;
}

/** Abgelaufene Trümmer entfernen (laufende Spielzeit) */
export function tickDebris(game) {
  for (const e of [...game.world.entities.values()]) {
    if (!e.debris) continue;
    const empty = !Object.values(e.debris.goods).some((n) => n > 0);
    if (game.time < e.debris.until && !empty) continue;
    removeEntity(game, e);
  }
}
export function removeEntity(game, e) {
  game.world.entities.delete(e.id);
  for (const ids of game.world.cellIndex.values()) { const i = ids.indexOf(e.id); if (i >= 0) ids.splice(i, 1); }
  game.world.bySector.get(e.sector)?.delete(e.id);
  for (const s of game.ships.values()) if (s.dockedAt === e.id) s.dockedAt = null;
  game.emit('entityRemoved', e);
}

/** Abbau von Trümmern mit vorhandener Bergbautechnik; entnommene Mengen sind endgültig weg */
export function mineDebris(ship, e, dt, rate) {
  if (!rate) return true;
  ship.state = 'mining';
  ship.mineAcc = (ship.mineAcc || 0) + rate * dt;
  for (const [g, left] of Object.entries(e.debris.goods)) {
    if (left <= 0) continue;
    const free = Math.floor(freeFor(ship, g));
    if (free <= 0) return true;
    const n = Math.min(left, free, Math.floor(ship.mineAcc));
    if (n <= 0) return false;
    ship.mineAcc -= n;
    e.debris.goods[g] = left - n;
    ship.cargo[g] = (ship.cargo[g] || 0) + n;
    return false;
  }
  return true;
}

function placeOutside(game, b, ship, u, dist = 0) {
  const a = u ? Math.atan2(u.y - COMBAT.MAP.H / 2, u.x - COMBAT.MAP.W / 2) : Math.random() * Math.PI * 2;
  ship.x = b.x + Math.cos(a) * dist + (Math.random() - 0.5) * 60;
  ship.y = b.y + Math.sin(a) * dist + (Math.random() - 0.5) * 60;
}

function release(game, ship) {
  delete ship.battle;
  ship.state = ship.dockedAt ? 'docked' : 'idle';
  // Der erfüllte Angriffsauftrag entfällt, andere Aufträge laufen weiter
  if (ship.queue[0]?.t === 'attack' || ship.queue[0]?.t === 'intercept') ship.queue.shift();
  ship.nav = null;
}

/** Nächstgelegener eigener Ruinenplanet (Rückgabeort beim Freikauf) */
export function nearestOwnRuins(game, owner, x, y) {
  let best = null, bd = Infinity;
  for (const e of game.world.entities.values()) {
    if (e.type !== 'ruins' || e.market?.homeworld?.owner !== owner) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) { const p = game.players.get(owner); best = p?.homeworld ? game.world.entities.get(p.homeworld) : null; }
  return best || game.world.entities.get('origin_yard') || null;
}

/** Freikauf: 25 % des regulären Kaufpreises an den Sieger; Rückgabe ohne Ladung, mit Schäden, am nächsten eigenen Ruinenplaneten */
export function ransomQuote(game, ship) {
  if (!ship.captive) return null;
  const price = Math.round(SHIP_TYPES[ship.type].price * COMBAT.RANSOM);
  const dest = nearestOwnRuins(game, ship.owner, ship.captive.x, ship.captive.y);
  return { price, dest: dest?.id || null, destName: dest?.name || '?', captor: ship.captive.by, captorName: ownerName(game, ship.captive.by) };
}
export function ransom(game, player, ship) {
  const q = ransomQuote(game, ship);
  if (!q) return 'Das Schiff ist nicht gefangen.';
  if (player.credits < q.price) return `Freikauf kostet ${q.price} Cr.`;
  const dest = game.world.entities.get(q.dest);
  if (!dest) return 'Kein eigener Ruinenplanet als Rückgabeort.';
  player.credits -= q.price;
  const captor = game.accountOf(q.captor);
  if (captor) captor.credits += q.price;
  else if (isFactionOwner(q.captor)) hooks.factionCredit?.(game, q.captor, q.price, ship.captive);
  delete ship.captive;
  ship.cargo = {};
  ship.x = dest.x + dest.radius + WORLD.DOCK_OFFSET; ship.y = dest.y;
  ship.dockedAt = dest.id;
  ship.state = 'docked';
  ship.queue = [];
  game.shipLog(ship, `Freigekauft für ${q.price} Cr, angedockt bei ${dest.name}`);
  return null;
}

hooks.resolve = function resolve(game, b, winner, why) {
  const loserSide = winner ? (winner === 'A' ? 'B' : 'A') : null;
  const winOwner = winner ? b.sides[winner].owners[0] : null;
  const goods = {};
  const rep = Object.fromEntries([...b.sides.A.owners, ...b.sides.B.owners].map((o) => [o, { lost: [], prisoners: [], captured: [], retreated: [] }]));
  const survivorsWin = [];
  const byShip = new Map();
  for (const u of unitsOf(b)) {
    const ship = game.ships.get(u.ship);
    if (!ship) continue;
    byShip.set(u, ship);
    if (u.state === 'destroyed') {
      rep[u.owner]?.lost.push(ship.name);
      if (navalClass(ship.type) === 'war') spawnDebris(game, b, ship);
      game.removeShip(ship);
      continue;
    }
    if (u.state === 'retreated') {
      // Bereits beim Rückzug freigegeben
      rep[u.owner]?.retreated.push(ship.name);
      continue;
    }
    if (u.state === 'surrendered' && u.side === loserSide) {
      // Gefangene: freikaufbar, nicht nutzbar für den Sieger; Ladung an den Sieger
      for (const [g, n] of Object.entries(ship.cargo)) if (n > 0 && GOODS[g]?.cls !== 'passenger') goods[g] = (goods[g] || 0) + n;
      for (const g of Object.keys(ship.cargo)) if (GOODS[g]?.cls !== 'passenger') delete ship.cargo[g];
      removeFromStacks(game, ship);
      release(game, ship);
      ship.queue = [];
      ship.dockedAt = null;
      ship.captive = { by: winOwner, battle: b.id, at: Math.round(game.time), x: Math.round(b.x), y: Math.round(b.y) };
      ship.state = 'captive';
      rep[u.owner]?.prisoners.push(ship.name);
      rep[winOwner] && rep[winOwner].prisoners.push(ship.name);
      continue;
    }
    if (u.side === loserSide && navalClass(ship.type) === 'war' && immobile(game, b, u) && winOwner) {
      // Bewegungsunfähige überlebende Kriegsschiffe gehen unmittelbar an den Sieger
      removeFromStacks(game, ship);
      rep[u.owner]?.lost.push(ship.name + ' (übernommen)');
      rep[winOwner]?.captured.push(ship.name);
      ship.owner = winOwner;
      ship.queue = [];
      ship.group = null;
      release(game, ship);
      continue;
    }
    // Sieg oder Unentschieden: kapitulierte Schiffe werden wieder steuerbar und bleiben beim Besitzer
    release(game, ship);
    if (u.state === 'surrendered' && navalClass(ship.type) === 'multi' && ship.dmg.hull / maxHull(ship.type) < COMBAT.SURRENDER_MULTI) ship.repairHold = true;
    if (u.side === winner) survivorsWin.push(ship);
  }
  const loot = winOwner ? transferLoot(game, b, goods, winOwner, survivorsWin) : {};
  for (const [owner, r] of Object.entries(rep)) {
    const side = b.sides.A.owners.includes(owner) ? 'A' : 'B';
    report(game, owner, { battle: b.id, t: Math.round(game.time), result: !winner ? 'draw' : side === winner ? 'win' : 'loss', why: why || null,
      enemies: b.sides[side === 'A' ? 'B' : 'A'].owners.map((o) => ownerName(game, o)), ...r, loot: side === winner ? loot : {} });
  }
  for (const fn of hooks.afterBattle) fn(game, b, winner, byShip);
};

export { needsRepair };
