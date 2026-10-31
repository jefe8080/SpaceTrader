import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Game} from '../server/game.js';
import {tickHomeworld} from '../server/homeworld.js';
import {migrateBuildingRecipes} from '../server/building-recipes.js';
test('Recipes unlock on completion, survive demolition and migrate repeatedly without XP',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prd16-recipes-')),file=path.join(dir,'save.db');let game=new Game(file,{profile:'homeworld',seed:42});
 try{
 const p=game.createPlayer('Rezepte'),e=game.world.entities.get(p.homeworld),h=e.market.homeworld;
 tickHomeworld(game,e,0);const xp=p.xp;assert.ok(!p.known.recipe.has('st:smelter'));
 h.structures.push({id:'test-plant',kind:'plant',recipe:'smelter',status:'building',plot:0,readyAt:10});h.projects.push({id:'construction-test',kind:'construction',target:'test-plant',until:10,bound:{credits:0,goods:{}}});
 migrateBuildingRecipes(game);assert.ok(!p.known.recipe.has('st:smelter'));
 game.time=10;tickHomeworld(game,e,10);assert.ok(p.known.recipe.has('st:smelter'));assert.equal(p.xp,xp);
 h.structures=[];migrateBuildingRecipes(game);assert.ok(p.known.recipe.has('st:smelter'));
 h.facilities.refinery.status='ready';game.save();game.store.close();game=new Game(file,{profile:'homeworld',seed:42});
 const loaded=game.players.get(p.id);assert.ok(loaded.known.recipe.has('st:refinery'));assert.ok(loaded.known.recipe.has('st:smelter'));const xp2=loaded.xp;
 migrateBuildingRecipes(game);migrateBuildingRecipes(game);assert.equal(loaded.xp,xp2);
 }finally{game.store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
