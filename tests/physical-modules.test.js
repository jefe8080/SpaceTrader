import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game} from '../server/game.js';
import {runCommand} from '../server/handlers/index.js';
import {tickHomeworld} from '../server/homeworld.js';
import {holdUsage,shipStats,freeFor,cargoFits,MODULES} from '../shared/ships.js';
import {homeStorageUsage} from '../shared/homeworld.js';
import {MODULE_RECIPES} from '../shared/module-production.js';

function fixture(file=':memory:'){
  const game=new Game(file,{seed:42,profile:'homeworld'}),player=game.createPlayer('Module'),entity=game.world.entities.get(player.homeworld),home=entity.market.homeworld,ship=game.shipsOf(player.id)[0];
  ship.dockedAt=entity.id;home.facilities.dock.status='ready';home.controlLevel=1;home.facilities.control.status='ready';home.moduleBlueprints=['cabin','shielded'];
  home.structures=[{id:'bench',kind:'moduleBench',status:'ready',enabled:true,plot:0}];
  for(const [g,n] of Object.entries({plates:80,plastics:40,textiles:20,glass:40,hydraulicoil:20,water:100,food:100}))entity.market.goods[g].stock=n;
  return {game,player,entity,home,ship};
}
const command=(f,cmd,args={})=>runCommand(f.game,f.player,{cmd,target:f.entity.id,ship:f.ship.id,...args});
const advance=(f,dt)=>{f.game.time+=dt;tickHomeworld(f.game,f.entity,dt);};
const close=f=>f.game.store.close();

test('Grundmodulfertigung bindet tatsächliche Zutaten und 30 Lagerplätze, ein Auftrag je Werkbank',()=>{
  const f=fixture(),before=f.entity.market.goods.plates.stock;
  assert.equal(command(f,'homeModuleCraft',{module:'cabin'}),undefined);assert.equal(f.entity.market.goods.plates.stock,before-8);assert.equal(f.home.moduleOutputReserved,30);
  assert.match(command(f,'homeModuleCraft',{module:'cabin'}),/Keine freie/);assert.equal(f.entity.market.goods.plates.stock,before-8);
  advance(f,59);assert.equal(f.entity.market.moduleInventory?.cabin||0,0);advance(f,1);
  assert.equal(f.entity.market.moduleInventory.cabin,1);assert.equal(f.home.moduleOutputReserved,0);assert.equal(f.home.modulesProduced.cabin,1);
  assert.equal(f.home.projects.length,0);assert.equal(Object.keys(MODULE_RECIPES).length,Object.keys(MODULES).length);close(f);
});

test('Verpackte Module nutzen geschirmten Überlauf, verleihen aber keine eigenen Kammern oder Fähigkeiten',()=>{
  const f=fixture();f.ship.modules=['shielded'];f.ship.moduleCargo={cabin:1};
  assert.deepEqual(holdUsage(f.ship),{cargo:0,hazard:30,passenger:0});assert.equal(freeFor(f.ship,'workers'),0);assert.equal(freeFor(f.ship,'ore'),0);assert(cargoFits(f.ship));
  f.ship.moduleCargo={drill:1};assert.equal(shipStats(f.ship).mining.drill,undefined);
  f.entity.market.moduleInventory={cabin:1};const before=f.entity.market.moduleInventory.cabin;
  assert.match(command(f,'moduleInstall',{module:'cabin',source:'warehouse'}),/Einbau blockiert/);assert.equal(f.entity.market.moduleInventory.cabin,before);close(f);
});

test('Lager, Fracht, Einbau und Ausbau erhalten genau ein Exemplar ohne Geldrefund',()=>{
  const f=fixture();f.entity.market.moduleInventory={shielded:1};const credits=f.player.credits;
  assert.equal(command(f,'moduleTransfer',{module:'shielded',dir:'buy'}),undefined);assert.equal(f.ship.moduleCargo.shielded,1);assert.equal(f.entity.market.moduleInventory.shielded,undefined);
  assert.equal(command(f,'moduleInstall',{module:'shielded',source:'cargo'}),undefined);assert.deepEqual(f.ship.modules,['shielded']);assert.equal(f.ship.moduleCargo.shielded,undefined);
  assert.equal(command(f,'moduleRemove',{module:'shielded',destination:'cargo'}),undefined);assert.deepEqual(f.ship.modules,[]);assert.equal(f.ship.moduleCargo.shielded,1);assert.equal(f.player.credits,credits);
  assert.match(command(f,'moduleRemove',{module:'shielded'}),/nicht eingebaut/);assert.equal(f.ship.moduleCargo.shielded,1);
  assert.equal(command(f,'moduleTransfer',{module:'shielded',dir:'sell'}),undefined);assert.equal(f.entity.market.moduleInventory.shielded,1);assert.equal(f.ship.moduleCargo.shielded,undefined);close(f);
});

test('Ausbau blockiert vorhandene Gefahrgut-/Passagierfracht und verändert keine Ware',()=>{
  const f=fixture();f.ship.modules=['shielded'];f.ship.cargo={chemicals:20};const before=structuredClone(f.ship);
  assert.match(command(f,'moduleRemove',{module:'shielded',destination:'warehouse'}),/Ausbau blockiert/);assert.deepEqual(f.ship.modules,before.modules);assert.deepEqual(f.ship.cargo,before.cargo);
  f.ship.cargo={};assert.equal(command(f,'moduleRemove',{module:'shielded',destination:'warehouse'}),undefined);assert.equal(f.entity.market.moduleInventory.shielded,1);assert.deepEqual(f.ship.modules,[]);close(f);
});

test('Studium verbraucht ein reales Exemplar, pausiert bei fehlendem Betrieb und schaltet nur einen Bauplan frei',()=>{
  const f=fixture();f.home.structures.push({id:'research',kind:'researchWorkshop',status:'ready',enabled:true,plot:1});f.entity.market.moduleInventory={acidex:1};
  f.home.structures[0].enabled=false; // Keep the six-power research workshop within the real 12-power budget.
  assert.equal(command(f,'homeModuleCraft',{module:'acidex',study:true}),undefined);assert.equal(f.entity.market.moduleInventory.acidex,undefined);
  assert.match(command(f,'homeModuleCraft',{module:'acidex',study:true}),/bereits studiert/);
  f.home.structures[1].enabled=false;advance(f,120);assert.equal(f.home.projects[0].remaining,90);
  f.home.structures[1].enabled=true;advance(f,90);assert(f.player.moduleBlueprints.includes('acidex'));assert.equal(f.home.projects.length,0);assert.equal(f.entity.market.moduleInventory.acidex,undefined);
  assert.match(command(f,'homeModuleCraft',{module:'acidex',study:true}),/bereits bekannt/);
  assert.match(command(f,'homeModuleCraft',{module:'acidex'}),/Es fehlen/);close(f);
});

test('Öffentlicher Modulhandel besitzt Stückbestand, Gegenkasse und begrenzte Ankaufmenge',()=>{
  const f=fixture(),hub=f.game.world.entities.get('origin_hub');f.ship.dockedAt=hub.id;f.player.manualShip=f.ship.id;
  f.game.revealAround(f.player,hub.x,hub.y,1000);f.ship.x=hub.x;f.ship.y=hub.y;
  f.ship.moduleCargo={cabin:1};hub.market.economy.cash=10000;const credits=f.player.credits;
  assert.match(command(f,'moduleTransfer',{target:hub.id,module:'cabin',dir:'sell'}),/keine finanzierte/);assert.equal(f.ship.moduleCargo.cabin,1);
  hub.market.economy.cash=20000;assert.equal(command(f,'moduleTransfer',{target:hub.id,module:'cabin',dir:'sell'}),undefined);
  assert.equal(f.player.credits,credits+12000);assert.equal(hub.market.moduleInventory.cabin,1);assert.equal(hub.market.economy.cash,8000);
  f.player.credits=20000;assert.equal(command(f,'moduleTransfer',{target:hub.id,module:'cabin',dir:'buy'}),undefined);
  assert.equal(f.ship.moduleCargo.cabin,1);assert.equal(hub.market.moduleInventory.cabin,undefined);assert.equal(hub.market.economy.cash,23000);close(f);
});

test('Reservierter Modulausgang konkurriert mit anderer Fracht um reale normale Lagerkapazität',()=>{
  const f=fixture();for(const s of Object.values(f.entity.market.goods))s.stock=0;
  for(const [g,n] of Object.entries(MODULE_RECIPES.cabin.goods))f.entity.market.goods[g].stock=n;
  f.entity.market.goods.ore.stock=1986;assert.equal(homeStorageUsage(f.entity.market).normal,2000);
  assert.match(command(f,'homeModuleCraft',{module:'cabin'}),/30 normale/);assert.equal(f.entity.market.goods.plates.stock,8);
  f.entity.market.goods.ore.stock-=16;assert.equal(command(f,'homeModuleCraft',{module:'cabin'}),undefined);assert.equal(homeStorageUsage(f.entity.market).normal,2000);
  f.ship.cargo={ore:1};assert.equal(f.game.ownerTransfer(f.ship,f.entity,'ore',1,'sell').n,0);close(f);
});

test('Neustart erhält gebundene Fertigung, Ausgabereserve, verpackte und eingebaute Module',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'prd5-modules-')),file=path.join(directory,'world.db');
  let f=fixture(file);command(f,'homeModuleCraft',{module:'cabin'});advance(f,20);f.ship.modules=['shielded'];f.ship.moduleCargo={sensor:1};f.game.close();
  const game=new Game(file,{profile:'homeworld'});f={game,player:game.players.get(f.player.id),entity:game.world.entities.get(f.entity.id),ship:game.ships.get(f.ship.id)};f.home=f.entity.market.homeworld;
  assert.equal(f.home.projects[0].remaining,40);assert.equal(f.home.moduleOutputReserved,30);assert.deepEqual(f.ship.modules,['shielded']);assert.equal(f.ship.moduleCargo.sensor,1);
  advance(f,40);assert.equal(f.entity.market.moduleInventory.cabin,1);assert.equal(f.home.moduleOutputReserved,0);close(f);fs.rmSync(directory,{recursive:true,force:true});
});

test('Spielerhandel überträgt ein vorhandenes Studienexemplar mit Gegenkonto und privaten Lagerrechten',()=>{
  const f=fixture(),buyer=f.game.createPlayer('Forscher'),carrier=f.game.shipsOf(buyer.id)[0],buyerHome=f.game.world.entities.get(buyer.homeworld);
  f.entity.market.moduleInventory={sensor:1};buyer.credits=100000;carrier.dockedAt=f.entity.id;f.game.revealAround(buyer,f.entity.x,f.entity.y,1000);
  const buy=()=>runCommand(f.game,buyer,{cmd:'moduleTransfer',ship:carrier.id,target:f.entity.id,module:'sensor',dir:'buy'});
  assert.match(buy(),/Privates/);assert.equal(f.entity.market.moduleInventory.sensor,1);
  f.game.ownership.get(f.entity.id).mode='open';const credits=f.player.credits;
  assert.equal(buy(),undefined);assert.equal(carrier.moduleCargo.sensor,1);assert.equal(f.entity.market.moduleInventory.sensor,undefined);assert.equal(f.player.credits-credits,90000);assert.equal(buyer.credits,10000);
  const home=buyerHome.market.homeworld;home.facilities.dock.status='ready';home.facilities.control.status='ready';home.controlLevel=1;
  home.structures=[{id:'research',kind:'researchWorkshop',status:'ready',enabled:true,plot:0}];carrier.dockedAt=buyerHome.id;
  assert.equal(runCommand(f.game,buyer,{cmd:'homeModuleCraft',target:buyerHome.id,module:'sensor',study:true}),undefined);
  f.game.time+=90;tickHomeworld(f.game,buyerHome,90);assert(buyer.moduleBlueprints.includes('sensor'));assert.equal(carrier.moduleCargo.sensor,undefined);close(f);
});
