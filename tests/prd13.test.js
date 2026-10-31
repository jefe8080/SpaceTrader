import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import planetHandlers from '../server/handlers/planet.js';
import {newProperty,releaseMarket} from '../server/property.js';
import {repairHome,tickHomeworld} from '../server/homeworld.js';
import {RECIPES,factoryCost} from '../shared/config.js';
import {tickSpecialization} from '../server/specializations.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function fixture() {
  const game=new Game(':memory:',{profile:'homeworld',seed:42}),player=game.createPlayer('PRD13');
  const home=game.world.entities.get(player.homeworld),ship=game.shipsOf(player.id)[0];
  ship.dockedAt=home.id;player.credits=1e8;
  return {game,player,home,ship};
}

test('PRD13: economic schools grant two residents once on completion, migration and rebuilding',()=>{
  const {game,home}=fixture();
  try {
    const h=home.market.homeworld;
    h.structures=[{id:'old',kind:'school',status:'ready'},{id:'new',kind:'school',status:'building'}];
    const population=h.population,skilled=h.workers.skilled;
    tickHomeworld(game,home,1);
    assert.equal(h.population,population+2);assert.equal(h.workers.skilled,skilled+2);
    h.projects.push({id:'build',kind:'construction',target:'new',until:game.time});
    tickHomeworld(game,home,1);
    assert.equal(h.population,population+4);assert.equal(h.workers.skilled,skilled+4);
    h.structures[0].upgrades=['academy'];tickHomeworld(game,home,1);
    assert.equal(h.population,population+4);
    h.structures.shift();h.structures.push({id:'rebuilt',kind:'school',status:'ready'});
    tickHomeworld(game,home,1);assert.equal(h.population,population+6);
    const saved=structuredClone(h);
    home.market.homeworld=saved;tickHomeworld(game,home,1);
    assert.equal(saved.population,population+6);
    const e=[...game.world.entities.values()].find(e=>e.kind==='planet'&&e.type==='mining'&&e.market.realEconomy),world=e.market.economy;
    world.infrastructure=[{id:'old',kind:'school'},{id:'decorative',kind:'academy'}];
    world.projects=[{id:'new',kind:'infrastructure',building:'school',until:game.time+10}];
    const pop=world.population,staff=world.workers.skilled;
    tickSpecialization(game,e,0);assert.equal(world.population,pop+2);
    game.time+=10;tickSpecialization(game,e,0);
    assert.equal(world.population,pop+4);assert.equal(world.workers.skilled,staff+4);
    tickSpecialization(game,e,0);assert.equal(world.population,pop+4);
  } finally {game.close();}
});

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
    const second=structuredClone(home);second.id='prd13-second-ruins';
    second.market.homeworld.facilities.workshop={status:'ruined'};
    game.world.addEntity(second);
    assert.match(repairHome(game,player,second,'workshop'),/Verbindung/);
    f.ship.dockedAt=second.id;
    assert.equal(repairHome(game,player,second,'workshop'),undefined);
    assert.equal(second.market.homeworld.facilities.workshop.status,'building');
  } finally {game.close();}
});

test('PRD13: saved school migration markers prevent grants after an actual database reload',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'prd13-')),file=path.join(directory,'world.db');
  let game;
  try {
    game=new Game(file,{profile:'homeworld',seed:42});
    const player=game.createPlayer('Migration'),home=game.world.entities.get(player.homeworld),h=home.market.homeworld;
    const e=[...game.world.entities.values()].find(e=>e.kind==='planet'&&e.type==='mining'&&e.market.realEconomy),world=e.market.economy;
    h.structures=[{id:'old',kind:'school',status:'ready'}];
    world.infrastructure=[{id:'old',kind:'school'}];
    tickHomeworld(game,home,1);tickSpecialization(game,e,0);
    const expected=[h.population,h.workers.skilled,world.population,world.workers.skilled],ids=[home.id,e.id];
    game.close();game=new Game(file,{profile:'homeworld'});
    const restored=game.world.entities.get(ids[0]),ordinary=game.world.entities.get(ids[1]);
    tickHomeworld(game,restored,1);tickSpecialization(game,ordinary,0);
    assert.deepEqual([restored.market.homeworld.population,restored.market.homeworld.workers.skilled,ordinary.market.economy.population,ordinary.market.economy.workers.skilled],expected);
    assert.equal(restored.market.homeworld.structures[0].staffGranted,true);
    assert.equal(ordinary.market.economy.infrastructure[0].staffGranted,true);
  } finally {
    if(game?.store.db.open)game.close();
    fs.rmSync(directory,{recursive:true,force:true});
  }
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
    assert.match(build(),/eigenen/);
    game.setOwner(e,player,newProperty(e.id,player.id,game.time));
    ship.cargo={plates:100,machinery:20};
    assert.equal(build(),undefined);assert.equal(build(),undefined);
    const paid=player.credits,cargo=structuredClone(ship.cargo);
    assert.match(build(),/Keine freien Bauplätze/);
    assert.equal(player.credits,paid);assert.deepEqual(ship.cargo,cargo);
    assert.equal(planetHandlers.facDemolish.run({game,player},{target:e,index:0}),undefined);
    assert.equal(game.buildingsOf(e).factories.length,2);
    assert.equal(player.credits,paid);
  } finally {game.close();}
});
