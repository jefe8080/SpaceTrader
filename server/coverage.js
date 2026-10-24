import { hexAt } from '../shared/hex.js';
import { coveredPoint, coveredSegment } from '../shared/coverage.js';
import { planPath } from '../shared/nav.js';

export function coverageAreas(game,player) {
  const areas=[];
  if(!player)return areas;
  for (const home of game.world.entities.values()) {
    const state = home.market?.homeworld;
    if (state?.owner !== player.id || state.controlLevel < 1) continue;
    if (state.controlLevel === 1) {
      const system = game.world.systems.get(home.system);
      if (!system) continue;
      const radius = Math.max(1000, ...game.world.sectorEntities(home.sector).filter(e=>e.system===system.id)
        .map(e=>Math.hypot(e.x-system.x,e.y-system.y)+(e.radius||0))) + 1000;
      areas.push({kind:'circle',x:system.x,y:system.y,radius,home:home.id});
    } else {
      const center = hexAt(home.x, home.y);
      areas.push({kind:'hex',...center,rings:state.controlLevel-2,home:home.id});
    }
  }
  return areas;
}

export const pointCovered=(game,player,point)=>game.profile!=='homeworld'||coveredPoint(coverageAreas(game,player),point);
export const segmentCovered=(game,player,from,to)=>game.profile!=='homeworld'||coveredSegment(coverageAreas(game,player),from,to);

export function coveredPath(game,player,from,to,speed=150) {
  const areas=coverageAreas(game,player);
  const wormholes=game.knownWormholes(player).filter(w=>coveredPoint(areas,w.a)&&coveredPoint(areas,w.b));
  return planPath(from,to,wormholes,speed,[],(a,b)=>coveredSegment(areas,a,b));
}

export function controlCapacity(game,player) {
  let total=0;
  for(const entity of game.world.entities.values()){
    const home=entity.market?.homeworld;if(home?.owner!==player.id||home.controlLevel<1)continue;
    total+=4+4*home.controlLevel+8*(home.controlModules?.capacity||0);
  }
  return total;
}

export function controlAdmissionCapacity(game,player){
  let total=0;
  for(const entity of game.world.entities.values()){
    const home=entity.market?.homeworld;if(home?.owner!==player.id||home.controlLevel<1)continue;
    total+=Math.max(1,Math.floor((4+4*home.controlLevel+8*(home.controlModules?.capacity||0))*Math.min(1,home.supplyFactor??1)));
  }
  return total;
}

export function remoteManagementError(game,player,entity) {
  if(game.profile!=='homeworld'||pointCovered(game,player,entity)||game.ships.get(player.manualShip)?.dockedAt===entity.id)return null;
  return 'Neue Fernänderungen brauchen eigene Leitstellenabdeckung oder dein manuelles Schiff vor Ort.';
}

export function manualActionError(game, player, ship, target = ship) {
  if (game.profile !== 'homeworld') return null;
  if ((!pointCovered(game,player,ship)||!pointCovered(game,player,target)) && player.manualShip!==ship.id) {
    return 'Außerhalb deiner Leitstellenabdeckung erhält nur das aktiv manuell gesteuerte Schiff neue Direktbefehle.';
  }
  return null;
}
