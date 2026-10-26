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

test('PRD10: Abriss verlangt Bestätigung, schützt Grundlagen, Abhängigkeiten und aktive Projekte',()=>{
 const f=fixture(),b=add(f,'school','schule',{upgrades:['academy']});
 assert.match(command(f,'homeDemolish',{id:'dock',confirmed:true}),/geschützt/);
 assert.match(command(f,'homeDemolish',{id:b.id,confirmed:true}),/Ausbauten/);
 f.home.projects.push({kind:'training',school:b.id});
 assert.match(command(f,'homeDemolish',{id:b.id,upgrade:'academy',confirmed:true}),/aufträge/);f.home.projects=[];
 assert.match(command(f,'homeDemolish',{id:b.id,upgrade:'academy'}),/bestätigt/);
 assert.equal(command(f,'homeDemolish',{id:b.id,upgrade:'academy',confirmed:true}),undefined);
 const credits=f.player.credits;
 assert.equal(command(f,'homeDemolish',{id:b.id,confirmed:true}),undefined);
 assert.equal(f.home.structures.length,0);assert.equal(f.player.credits,credits);
 const lab=add(f,'researchWorkshop','lab'),plant=add(f,'plant','plant',{recipe:'machineworks'});
 assert.match(command(f,'homeDemolish',{id:lab.id,confirmed:true}),/abhängigen/);
 plant.progress=1;assert.match(command(f,'homeDemolish',{id:plant.id,confirmed:true}),/Produktionszyklus/);
 command(f,'homeOperation',{id:plant.id,enabled:false,priority:50});
 assert.equal(plant.progress,1);assert.match(command(f,'homeAbortCycle',{id:plant.id}),/bestätigen/);
 assert.equal(command(f,'homeAbortCycle',{id:plant.id,confirmed:true}),undefined);
 assert.equal(command(f,'homeDemolish',{id:plant.id,confirmed:true}),undefined);
 assert.equal(command(f,'homeDemolish',{id:lab.id,confirmed:true}),undefined);f.game.store.close();
});
test('PRD10: Lagerabriss berücksichtigt Waren, Gefahrstoffe, Module und reservierte Ausgabeplätze',()=>{
 const f=fixture();empty(f);add(f,'silo','silo');add(f,'safeStorage','safe');advance(f,1);
 f.entity.market.goods.ore.stock=1990;f.entity.market.moduleInventory={cargo:1};
 assert.match(command(f,'homeDemolish',{id:'silo',confirmed:true}),/[Kk]apazität/);
 f.entity.market.moduleInventory={};f.home.moduleOutputReserved=30;
 assert.match(command(f,'homeDemolish',{id:'silo',confirmed:true}),/[Kk]apazität/);
 f.home.moduleOutputReserved=0;f.entity.market.goods.chemicals.stock=101;
 assert.match(command(f,'homeDemolish',{id:'safe',confirmed:true}),/Gefahrstoff/);
 f.entity.market.goods.chemicals.stock=100;
 assert.equal(command(f,'homeDemolish',{id:'safe',confirmed:true}),undefined);
 assert.equal(command(f,'homeDemolish',{id:'silo',confirmed:true}),undefined);
 assert.equal(f.home.storage,2000);assert.equal(f.home.hazardStorage,100);
 assert.equal(f.entity.market.goods.ore.stock,1990);assert.equal(f.entity.market.goods.chemicals.stock,100);f.game.store.close();
});

test('PRD10: direkte Lagerregeln erlauben Null, erhalten Bestand und unabhängige Sperrmengen',()=>{
 const f=fixture();advance(f,1);empty(f);f.entity.market.goods.ore.stock=50;f.ship.cargo={ore:10};
 assert.equal(command(f,'homeLimit',{good:'ore',amount:0}),undefined);
 assert.equal(homeStorageFree(f.entity.market,'ore'),0);assert.equal(f.game.ownerTransfer(f.ship,f.entity,'ore',10,'sell').n,0);
 assert.equal(f.entity.market.goods.ore.stock,50);
 assert.equal(command(f,'homeReserve',{good:'ore',amount:80}),undefined);
 assert.equal(command(f,'homeLimit',{good:'ore',amount:60}),undefined);
 assert.equal(homeStorageFree(f.entity.market,'ore'),10);assert.equal(f.home.reserves.ore,80);
 assert.match(command(f,'homeLimit',{good:'ore',amount:2001}),/[Kk]apazität/);
 assert.match(command(f,'homeReserve',{good:'ore',amount:2001}),/[Kk]apazität/);
 assert.equal(command(f,'homeLimit',{all:true,amount:500}),undefined);
 assert.equal(f.home.limits.ore,500);assert.equal(f.home.limits.chemicals,100);assert.equal(f.home.reserves.ore,80);
 assert.equal(command(f,'homeReserve',{good:'ore',amount:0}),undefined);assert.equal(f.home.reserves.ore,0);
 f.game.store.close();
});

test('PRD10: Routenoption und Reservierungen bleiben nach echtem Speichern und Laden konsistent',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'prd10-route-')),file=path.join(folder,'world.db');
 const game=new Game(file,{seed:3}),p=game.createPlayer('Route'),ship=game.shipsOf(p.id)[0];
 const a=game.world.entities.get('origin_hub'),b=game.world.entities.get('origin_yard');
 a.market.goods.ore={role:'produce',stock:100,cap:1000,mod:1};b.market.goods.ore={role:'consume',stock:0,cap:100,mod:1};
 const stops=[{targetId:a.id,actions:[{op:'buy',good:'ore',amount:80}]},{targetId:b.id,actions:[{op:'sell',good:'ore',amount:0}]}];
 assert.equal(runCommand(game,p,{cmd:'routeSave',name:'Geschützt',stops,onlyWithTargetSpace:true}),undefined);
 const route=[...game.routes.values()][0];assert.equal(route.onlyWithTargetSpace,true);
 b.market.goods.ore={role:'consume',stock:0,cap:100,mod:1};ship.cargo={ore:80};ship.queue=[{t:'route',route:route.id,idx:0}];
 game.save();game.store.close();
 const loaded=new Game(file),s=loaded.ships.get(ship.id),r=loaded.routes.get(route.id);
 assert.equal(r.onlyWithTargetSpace,true);assert.equal(s.queue[0].destinationReservations.reduce((n,r)=>n+r.amount,0),80);
 assert.equal(runCommand(loaded,loaded.players.get(p.id),{cmd:'routeSave',id:r.id,name:r.name,stops,onlyWithTargetSpace:false}),undefined);
 assert.equal(s.queue[0].destinationReservations,undefined);assert.equal(s.cargo.ore,80);
 loaded.store.close();fs.rmSync(folder,{recursive:true,force:true});
});

test('PRD10: Quest- und Orbitalrümpfe übersteigen die alte Flottenobergrenze ohne Klassenfreigabe zu ändern',()=>{
 const f=fixture();for(let i=0;i<6;i++)f.game.spawnShip(f.player,'spatz',f.entity);
 f.home.suppliedSeconds=600;f.player.homeQuest.active.H05={at:0};
 const before=f.game.shipsOf(f.player.id).length;
 assert.equal(command(f,'homeQuestComplete',{quest:'H05'}),undefined);assert.equal(f.game.shipsOf(f.player.id).length,before+1);
 f.home.orbital={small:true,jobs:{},inventory:[{id:'s1',type:'spatz',fuel:0},{id:'m1',type:'lastesel',fuel:0}]};
 assert.equal(command(f,'homeOrbitalClaim',{id:'s1'}),undefined);assert.equal(f.game.shipsOf(f.player.id).length,before+2);
 assert.match(command(f,'homeOrbitalClaim',{id:'m1'}),/Pilotenlizenz/);assert.equal(f.home.orbital.inventory.length,1);f.game.store.close();
});
test('PRD10: öffentliche und eigene Werften erlauben Erwerb über dem alten Flottenlimit',()=>{
 const game=new Game(':memory:',{seed:3}),p=game.createPlayer('Flotte'),yard=game.world.entities.get('origin_yard');
 for(let i=0;i<6;i++)game.spawnShip(p,'spatz',yard);
 const ship=game.shipsOf(p.id)[0];ship.dockedAt=yard.id;ship.x=yard.x;ship.y=yard.y;p.credits=1e6;
 yard.market.forSale=[{type:'spatz',price:100}];const before=game.shipsOf(p.id).length;
 assert.equal(runCommand(game,p,{cmd:'buyShip',target:yard.id,index:0}),undefined);assert.equal(game.shipsOf(p.id).length,before+1);
 game.ownership.set(yard.id,{player:p.id});yard.market.owner=p.id;yard.market.forSale=[{type:'spatz',own:true,price:0}];
 assert.equal(runCommand(game,p,{cmd:'yardClaim',target:yard.id,index:0}),undefined);assert.equal(game.shipsOf(p.id).length,before+2);game.store.close();
});

test('PRD10: alte laufende Leitstellenprojekte und gespeicherte Lagerwerte bleiben unverändert',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'prd10-old-')),file=path.join(folder,'world.db'),f=fixture(file);
 const silo=add(f,'silo','alt');delete silo.level;
 f.home.projects.push({id:'alt-control',kind:'control',level:2,until:60,bound:{credits:8000,goods:{plates:10,wires:4}}});
 f.home.reserves={ore:900};f.home.limits={ore:40};f.entity.market.goods.ore.stock=75;
 const credits=f.player.credits;f.game.save();f.game.store.close();
 const game=new Game(file,{profile:'homeworld'}),entity=game.world.entities.get(f.entity.id),h=entity.market.homeworld;
 assert.equal(h.reserves.ore,900);assert.equal(h.limits.ore,40);assert.equal(entity.market.goods.ore.stock,75);
 game.time=60;tickHomeworld(game,entity,60);
 assert.equal(h.structures[0].level,1);assert.equal(h.storage,4000);assert.equal(h.controlLevel,2);
 assert.equal(h.capitalCosts.find(c=>c.id==='alt-control').cost.credits,8000);
 assert.ok(Math.abs(game.players.get(f.player.id).credits-h.civil.taxes-h.civil.consumptionPayments-credits)<1e-7);
 assert.equal(h.reserves.ore,900);assert.equal(h.limits.ore,40);
 game.store.close();fs.rmSync(folder,{recursive:true,force:true});
});
