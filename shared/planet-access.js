import { coveredPoint } from './coverage.js';

export function mainShip(player, ships) {
  if(player?.relic?.location?.kind!=='ship')return null;
  const ship=ships.get(player.relic.location.id);
  return ship?.owner===player.id ? ship : null;
}

export function planetAccess(player, ships, entity, areas) {
  const local=[...ships.values()].some(s=>s.owner===player?.id&&s.dockedAt===entity?.id);
  const own=entity?.type==='ruins'&&entity.market?.homeworld?.owner===player?.id;
  const flagship=mainShip(player,ships);
  const remote=!!(own&&flagship&&!flagship.transit&&coveredPoint(areas,flagship));
  return {local,remote,manage:!!(own&&(local||remote))};
}
