import { navalClass } from '../../shared/combat.js';
import { SHIP_TYPES, FACTIONS } from '../../shared/config.js';
import { ownerName, factionOfOwner, diplo } from './diplomacy.js';

export const REPORT_LIMIT = 500;
export function combatIdentity(game, ship) {
  const faction = factionOfOwner(ship.owner) || game.players.get(ship.owner)?.faction || null;
  return { id: ship.id, name: ship.name, type: ship.type, typeName: SHIP_TYPES[ship.type]?.name || ship.type,
    owner: ship.owner, ownerName: ownerName(game, ship.owner), faction,
    factionName: FACTIONS[faction]?.name || faction || null };
}

export function combatStats(player) {
  const w = diplo(player);
  return w.combatStats ||= { since: Date.now(), total: 0, win: 0, loss: 0, draw: 0,
    destroyed: 0, enemyDestroyed: 0, lost: 0, captured: 0, captive: 0, prisoners: 0, retreated: 0, loot: {} };
}

export function battleSnapshot(game, b, winner, loserSide, immobile) {
  const ships = Object.values(b.units).map(u => {
    const ship = game.ships.get(u.ship);
    const identity = u.history || (ship ? combatIdentity(game, ship) : { id:u.ship, owner:u.owner, type:u.type, name:u.ship });
    let outcome = 'survived';
    if (u.state === 'destroyed' || u.state === 'retreated') outcome = u.state;
    else if (u.side === loserSide && u.state === 'surrendered') outcome = 'captive';
    else if (u.side === loserSide && winner && ship && immobile(game,b,u) && SHIP_TYPES[ship.type] && navalWar(ship.type)) outcome = 'captured';
    return { ...identity, side:u.side, outcome };
  });
  const planet = b.planet ? game.world.entities.get(b.planet) : null;
  const sector = game.world.sectors?.get?.(b.sector);
  return { version:1, endedAt:Date.now(), started:b.started, duration:Math.max(0,game.time-b.started), kind:b.kind,
    location:{ x:Math.round(b.x), y:Math.round(b.y), sector:b.sector, sectorName:sector?.name || b.sector,
      planet:planet ? {id:planet.id,name:planet.name} : null }, ships };
}

const navalWar = type => navalClass(type) === 'war';

export function storeCombatReport(player, report) {
  const w = diplo(player);
  // Retried completion must not increment totals twice.
  if ((w.reports || []).some(r => r.battle === report.battle)) return;
  if (report.version === 1) {
    const s = combatStats(player);
    s.total++; s[report.result]++;
    for (const ship of report.ships) {
      const own = ship.owner === player.id;
      if (ship.outcome === 'destroyed') {
        if (own) s.destroyed++;
        else if (ship.side !== report.side) s.enemyDestroyed++;
      }
      if (own && ship.outcome === 'captured') s.lost++;
      if (own && ship.outcome === 'captive') s.captive++;
      if (own && ship.outcome === 'retreated') s.retreated++;
    }
    s.captured += report.captured.length;
    s.prisoners += report.result === 'win' ? report.prisoners.length : 0;
    for (const [g,n] of Object.entries(report.loot)) s.loot[g]=(s.loot[g]||0)+n;
  }
  w.reports ||= [];
  w.reports.unshift(report);
  w.reports.length = Math.min(w.reports.length, REPORT_LIMIT);
}
