import {ownerName} from './diplomacy.js';
/** Called exactly once by startBattle, never by individual shots or joins. */
export function warnDefenders(game,b){
 const planet=game.world.entities.get(b.planet),prop=planet&&game.ownership.get(planet.id);
 const owners=new Set(Object.values(b.units).filter(u=>u.side==='B').map(u=>u.owner));
 const planetOwner=planet?.market?.homeworld?.owner||prop?.player||planet?.owner;if(planetOwner)owners.add(planetOwner);
 for(const id of owners){const p=game.players.get(id);if(!p)continue;
  const targets=Object.values(b.units).filter(u=>u.side==='B'&&u.owner===id).map(u=>game.ships.get(u.ship)?.name||u.ship);
  if(id===planetOwner)targets.push(planet.name);
  game.emit('attackWarning',p,{id:b.id,attacker:b.sides.A.owners.map(o=>ownerName(game,o)).join(', '),location:planet?.name||`Schlacht bei ${Math.round(b.x)} / ${Math.round(b.y)}`,targets});
 }
}
