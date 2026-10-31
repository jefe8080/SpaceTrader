import {RECIPES,REFINEMENT_RECIPES} from '../shared/goods.js';
import {industryGroup} from '../shared/homeworld.js';
/** Persistent unlock without discovery XP or quest rewards. Safe on every load. */
export function unlockBuildingRecipes(game,entity){
 const h=entity.market?.homeworld,prop=game.ownership.get(entity.id);
 const player=game.players.get(h?.owner||prop?.player);if(!player)return;
 const recipes=new Set();
 if(h){
  for(const [id,b] of Object.entries(h.facilities||{}))if(b.status==='ready'&&RECIPES[id])recipes.add(id);
  for(const b of h.structures||[])if(b.status==='ready'&&b.recipe){
   recipes.add(b.recipe);
   if(REFINEMENT_RECIPES.includes(b.recipe))for(const id of REFINEMENT_RECIPES)if(['I','II','III','IV','V'].indexOf(industryGroup(id))<=['I','II','III','IV','V'].indexOf(b.buildGroup||industryGroup(b.recipe)))recipes.add(id);
  }
 }else for(const b of entity.market?.bld?.factories||[])recipes.add(b.recipe);
 const added=[];
 for(const id of recipes)if(RECIPES[id]&&!player.known.recipe.has(id)){player.known.recipe.add(id);game.newDiscoveries.push([player.id,'recipe',id]);added.push(id);}
 if(added.length)game.emit('reveal',player,{recipes:added});
}
export function migrateBuildingRecipes(game){for(const entity of game.world.entities.values())if(entity.market)unlockBuildingRecipes(game,entity);}
