import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import planetHandlers from '../server/handlers/planet.js';
import {newProperty,releaseMarket} from '../server/property.js';
import {repairHome,tickHomeworld} from '../server/homeworld.js';
import {RECIPES,factoryCost} from '../shared/config.js';

function fixture() {
  const game=new Game(':memory:',{profile:'homeworld',seed:42}),player=game.createPlayer('PRD13');
  const home=game.world.entities.get(player.homeworld),ship=game.shipsOf(player.id)[0];
  ship.dockedAt=home.id;player.credits=1e8;
  return {game,player,home,ship};
}

test('PRD13: workshop repair requires H04, ownership and access, then charges once',()=>{
  const f=fixture(),{game,player,home}=f,h=home.market.homeworld;
  try {
    player.homeQuest.completed.H03=true;
    assert.match(repairHome(game,player,home,'workshop'),/H04/);
    player.homeQuest.completed.H04=true;
    h.bootstrap={ingots:1000,plates:1000,machinery:1000,electronics:1000};
    h.workers.basic=100;h.population=1000;
    const before=player.credits;
    assert.equal(repairHome(game,player,home,'workshop'),undefined);
    assert.equal(h.facilities.workshop.status,'building');
    assert.ok(player.credits<before);
    const paid=player.credits;
    assert.match(repairHome(game,player,home,'workshop'),/bereits/);
    assert.equal(player.credits,paid);
    const other=game.createPlayer('Other');
    assert.match(repairHome(game,other,home,'workshop'),/eigenen/);
  } finally {game.close();}
});

test('PRD13: real-economy factories need ownership and docked cargo, create storage and produce only while owned',()=>{
  const {game,player,ship}=fixture();
  try {
    const e=[...game.world.entities.values()].find(e=>e.kind==='planet'&&e.type==='mining'&&e.market.realEconomy);
    assert.ok(e);
    const build=()=>planetHandlers.facBuild.run({game,player},{target:e,recipe:'smelter'});
    assert.match(build(),/eigenen/);
    game.setOwner(e,player,newProperty(e.id,player.id,game.time));
    assert.match(build(),/angedockt/);
    ship.dockedAt=e.id;ship.cargo={...factoryCost('smelter').goods};
    const credits=player.credits;
    assert.equal(build(),undefined);
    assert.equal(player.credits,credits-factoryCost('smelter').credits);
    assert.deepEqual(ship.cargo,{});
    const r=RECIPES.smelter;
    for(const [g,n] of Object.entries(r.in))e.market.goods[g].stock=n*100;
    const before=e.market.goods.ingots.stock;
    for(let n=0;n<r.time+1;n++)game.tick(1);
    assert.ok(e.market.goods.ingots.stock>before);
    game.ownership.delete(e.id);releaseMarket(game,e);
    const stopped=e.market.goods.ingots.stock;
    for(let n=0;n<r.time+1;n++)game.tick(1);
    assert.equal(e.market.goods.ingots.stock,stopped);
  } finally {game.close();}
});
