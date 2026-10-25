import { WORLD, cellKey, cellOf } from '../shared/config.js';
import { hexAt, hexKey } from '../shared/hex.js';

export const WRECK_MARGIN = 400;
export function wreckPositionValid(game, home, point, ignore) {
  const system = game.world.systems.get(home.system);
  if (!system || Math.hypot(point.x-system.x, point.y-system.y) > WORLD.SYSTEM_RADIUS+WRECK_MARGIN) return false;
  const hex = hexAt(point.x, point.y);
  return hexKey(hex.q,hex.r) === home.sector && Math.hypot(point.x-system.x,point.y-system.y)>=650
    && !game.world.sectorEntities(home.sector).some(e=>e.id!==ignore&&Math.hypot(point.x-e.x,point.y-e.y)<(e.radius||100)+250);
}

export function findWreckPosition(game, home, ignore) {
  const system=game.world.systems.get(home.system);
  if(!system)return null;
  // Complete interior search before the fixed boundary fallback (maximum 720 candidates).
  for (const radius of [1200,2000,2800,WORLD.SYSTEM_RADIUS-65,WORLD.SYSTEM_RADIUS+WRECK_MARGIN]) {
    for(let i=0;i<144;i++) {
      const angle=i*Math.PI*2/144;
      const point={x:system.x+Math.cos(angle)*radius,y:system.y+Math.sin(angle)*radius};
      if(wreckPositionValid(game,home,point,ignore))return point;
    }
  }
  return null;
}

export function correctQuestWreck(game, player) {
  const salvage=player.homeQuest?.salvage;
  if(salvage?.phase!=='available')return;
  const wreck=game.world.entities.get(salvage.wreck),home=game.world.entities.get(player.homeworld);
  if(!wreck||!home||wreckPositionValid(game,home,wreck,wreck.id))return;
  const point=findWreckPosition(game,home,wreck.id);
  if(!point)return;
  const old=cellKey(...cellOf(wreck.x,wreck.y));
  game.world.cellIndex.set(old,(game.world.cellIndex.get(old)||[]).filter(id=>id!==wreck.id));
  game.world.bySector.get(wreck.sector)?.delete(wreck.id);
  Object.assign(wreck,point,{system:home.system,sector:home.sector});
  game.world.addEntity(wreck);
  if(player.homeQuest.active?.H04) {
    game.revealAround(player,point.x,point.y,0);
    game.emit('entity',wreck);
  }
}
