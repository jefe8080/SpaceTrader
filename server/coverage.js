import { hexAt } from '../shared/hex.js';

export function pointCovered(game, player, point) {
  if (game.profile !== 'homeworld') return true;
  const pointHex = hexAt(point.x, point.y);
  for (const home of game.world.entities.values()) {
    const state = home.market?.homeworld;
    if (state?.owner !== player.id || state.controlLevel < 1) continue;
    if (state.controlLevel === 1) {
      const system = game.world.systems.get(home.system);
      if (!system) continue;
      const radius = Math.max(1000, ...game.world.sectorEntities(home.sector).filter(e=>e.system===system.id)
        .map(e=>Math.hypot(e.x-system.x,e.y-system.y)+(e.radius||0))) + 1000;
      if (Math.hypot(point.x-system.x,point.y-system.y)<=radius) return true;
    } else {
      const center = hexAt(home.x, home.y), dq=pointHex.q-center.q, dr=pointHex.r-center.r;
      if (Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr))<=state.controlLevel-2) return true;
    }
  }
  return false;
}

export function manualActionError(game, player, ship, target = ship) {
  if (game.profile !== 'homeworld') return null;
  if ((!pointCovered(game,player,ship)||!pointCovered(game,player,target)) && player.manualShip!==ship.id) {
    return 'Außerhalb deiner Leitstellenabdeckung erhält nur das aktiv manuell gesteuerte Schiff neue Direktbefehle.';
  }
  return null;
}
