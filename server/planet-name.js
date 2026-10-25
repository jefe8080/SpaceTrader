import { homeAccess } from './homeworld-operations.js';

export const PLANET_RENAME_COOLDOWN = 24*60*60*1000;
export function renamePlanet(game, player, entity, input, now=Date.now()) {
  const error=homeAccess(game,player,entity);if(error)return error;
  if(typeof input!=='string'||/[\p{Cc}\p{Cf}]/u.test(input))return 'Planetennamen dürfen keine Steuerzeichen enthalten.';
  const name=input.trim();
  if([...name].length<3||[...name].length>32)return 'Planetennamen müssen 3 bis 32 Zeichen lang sein.';
  if(name===entity.name)return;
  const home=entity.market.homeworld;
  if(home.renamedAt!=null&&now-home.renamedAt<PLANET_RENAME_COOLDOWN)return 'Die nächste Namensänderung ist erst 24 Stunden nach der letzten möglich.';
  entity.name=name;home.renamedAt=now;
  game.emit('entity',entity);
}
