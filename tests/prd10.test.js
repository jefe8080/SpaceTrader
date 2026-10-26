import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { tickHomeworld } from '../server/homeworld.js';
import { homeStorageUsage, homeStorageFree, HOME_BUILDINGS, storageUpgradeCost, homeStructureSpec, controlUpgradeCost } from '../shared/homeworld.js';

function fixture(file = ':memory:') {
  const game = new Game(file, { profile: 'homeworld', seed: 42 });
  const player = game.createPlayer('Betrieb'), entity = game.world.entities.get(player.homeworld);
  const home = entity.market.homeworld, ship = game.shipsOf(player.id)[0];
  ship.dockedAt = entity.id; player.credits = 1e6;
  // Isolated infrastructure tests; regular acquisition is covered by onboarding simulation.
  player.homeQuest.completed = Object.fromEntries(['H00','H01','H02','H03','H06','H07','H09','H12'].map(id=>[id,{at:0}]));
  home.bootstrap = {}; home.facilities.dock.status = 'ready'; home.facilities.control.status = 'ready'; home.controlLevel = 1;
  for (const [good, n] of Object.entries({ water:100, food:100, ingots:100, plates:60, electronics:30, glass:30, plastics:20, wires:20, hydraulicoil:5, gas:20 })) entity.market.goods[good].stock = n;
  return {game,player,entity,home,ship};
}
const command=(f,cmd,args={})=>runCommand(f.game,f.player,{cmd,target:f.entity.id,...args});
function advance(f,seconds){f.game.time+=seconds;tickHomeworld(f.game,f.entity,seconds);}
function add(f,kind,id,extra={}){const building={id,kind,status:'ready',enabled:true,priority:50,plot:f.home.structures?.length||0,...extra};f.home.structures||=[];f.home.structures.push(building);return building;}
function empty(f){for(const slot of Object.values(f.entity.market.goods))slot.stock=0;}


test('PRD10: Leitstellen haben exakte steile Preise und unveränderte Materialkurve',()=>{
  assert.deepEqual([2,3,4,5].map(l=>controlUpgradeCost(l).credits),[20000,100000,200000,400000]);
  assert.deepEqual(controlUpgradeCost(2).goods,{plates:10,wires:4});
});
test('PRD10: beide Lager wachsen erst nach Bauabschluss, exakt bis Stufe fünf',()=>{
  for(const kind of ['silo','safeStorage']){
    const f=fixture();empty(f);const b=add(f,kind,'lager');
    for(const g of ['ingots','plates','electronics'])f.entity.market.goods[g].stock=600;
    advance(f,1);assert.equal(b.level,1);
    for(let level=2;level<=5;level++){
      const before=homeStructureSpec(b),cost=storageUpgradeCost(kind,level),credits=f.player.credits;
      assert.equal(command(f,'homeStorageUpgrade',{id:b.id}),undefined);
      assert.equal(f.player.credits,credits-cost.credits);
      assert.match(command(f,'homeStorageUpgrade',{id:b.id}),/bereits|Stufe 5/);
      advance(f,59);assert.equal(b.level,level-1);assert.deepEqual(homeStructureSpec(b),before);
      advance(f,1);assert.equal(b.level,level);
      const spec=homeStructureSpec(b);
      assert.equal(spec.power,level*(kind==='silo'?1:2));
      assert.equal(kind==='silo'?spec.storage:spec.hazardStorage,level*(kind==='silo'?2000:500));
      assert.deepEqual(spec.workers,kind==='silo'?{basic:level}:{skilled:Math.max(2,level)});
      assert.equal(f.home.structures.length,1);assert.equal(f.home.projects.length,0);
    }
    assert.match(command(f,'homeStorageUpgrade',{id:b.id}),/Stufe 5/);
    f.game.store.close();
  }
});
test('PRD10: Lagerausbau prüft Zugang und Mittel und überlebt Neustart ohne Doppelkapazität',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'prd10-')),file=path.join(folder,'world.db');
  const f=fixture(file),b=add(f,'silo','lager');f.player.credits=0;
  assert.match(command(f,'homeStorageUpgrade',{id:b.id}),/Credits/);
  f.player.credits=10000;const owner=f.home.owner;f.home.owner='fremd';
  assert.match(command(f,'homeStorageUpgrade',{id:b.id}),/eigenen/);f.home.owner=owner;
  assert.equal(command(f,'homeStorageUpgrade',{id:b.id}),undefined);
  advance(f,30);f.game.save();f.game.store.close();
  const game=new Game(file,{profile:'homeworld'}),entity=game.world.entities.get(f.entity.id);
  assert.equal(entity.market.homeworld.structures[0].level,1);
  game.time+=30;tickHomeworld(game,entity,30);
  assert.equal(entity.market.homeworld.structures[0].level,2);assert.equal(entity.market.homeworld.storage,6000);
  game.time+=1;tickHomeworld(game,entity,1);assert.equal(entity.market.homeworld.storage,6000);
  game.store.close();fs.rmSync(folder,{recursive:true,force:true});
});
