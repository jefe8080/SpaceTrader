import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game} from '../server/game.js';
import {runCommand} from '../server/handlers/index.js';
import {tickHomeworld} from '../server/homeworld.js';
import {updateShip} from '../server/ships.js';
import {tickLogistics} from '../server/logistics.js';
import {availableHomeStock} from '../shared/homeworld.js';
import {buyPrice} from '../shared/config.js';

function fixture(file=':memory:'){
  const game=new Game(file,{seed:42,profile:'homeworld'}),player=game.createPlayer('Disposition'),entity=game.world.entities.get(player.homeworld),home=entity.market.homeworld,ship=game.shipsOf(player.id)[0];
  home.facilities.dock.status='ready';home.facilities.control.status='ready';home.controlLevel=1;home.controlModules={dispatch:1,production:1,sales:1};home.workers={basic:100,skilled:40,specialist:10};
  home.structures=[{id:'solar',kind:'solar',status:'ready',plot:0}];player.credits=100000;
  ship.queue=[];ship.cargo={};ship.dockedAt=entity.id;ship.x=entity.x+entity.radius+100;ship.y=entity.y;
  const source=[...game.world.entities.values()].find(e=>e.system===entity.system&&e.market?.goods.ice?.role==='produce');
  game.revealAround(player,source.x,source.y,1000);tickHomeworld(game,entity,1);
  return {game,player,entity,home,ship,source};
}
function order(f,extra={}){return runCommand(f.game,f.player,{cmd:'homeLogistics',target:f.entity.id,kind:'supply',good:'ice',amount:20,limit:100,budget:2000,emergency:0,priority:100,ships:[f.ship.id],locations:[f.source.id],...extra});}
function step(f,n=1){for(let i=0;i<n;i++){f.game.time++;for(const s of f.game.shipsOf(f.player.id))updateShip(s,1,f.game);tickHomeworld(f.game,f.entity,1);}}
const current=f=>f.home.logistics.orders.at(-1);
const close=f=>f.game.store.close();

test('Bedarfsauftrag bindet Geld und liefert reale Ware mit tatsächlichem Flug ohne Handels-XP',()=>{
  const f=fixture(),stock=f.source.market.goods.ice.stock,xp=f.player.xp,credits=f.player.credits;
  assert.equal(order(f),undefined);assert.equal(f.player.credits,credits-2000);tickLogistics(f.game,f.entity);
  assert.equal(f.home.logistics.jobs.length,1);assert.equal(f.entity.market.goods.ice.stock,0);
  step(f,500);assert.equal(current(f).state,'delivered');assert.equal(f.entity.market.goods.ice.stock,20);assert.equal(f.source.market.goods.ice.stock,stock-20);
  assert.equal(f.player.xp,xp);assert.equal(current(f).escrow,0);assert(current(f).spent>0);assert.equal(f.ship.cargo.ice,undefined);close(f);
});

test('Parallele gleiche Zielbestände berücksichtigen bereits zugesagte Lieferungen',()=>{
  const f=fixture(),second=f.game.spawnShip(f.player,'spatz',f.entity);second.queue=[];
  assert.equal(order(f),undefined);assert.equal(order(f,{ships:[second.id]}),undefined);tickLogistics(f.game,f.entity);
  assert.equal(f.home.logistics.jobs.length,1);step(f,500);assert.equal(f.entity.market.goods.ice.stock,20);assert(f.home.logistics.orders.every(o=>o.state==='delivered'));close(f);
});

test('Harte Preisgrenze und gebundenes Budget werden nie durch Notfreigabe übergangen',()=>{
  const f=fixture();assert.equal(order(f,{limit:.01,budget:10,emergency:2}),undefined);step(f,100);
  assert.equal(f.home.logistics.jobs.length,0);assert.equal(current(f).spent,0);assert.equal(current(f).escrow,12);
  runCommand(f.game,f.player,{cmd:'homeLogisticsCancel',target:f.entity.id,id:current(f).id});assert.equal(current(f).escrow,0);const credits=f.player.credits;
  runCommand(f.game,f.player,{cmd:'homeLogisticsCancel',target:f.entity.id,id:current(f).id});assert.equal(f.player.credits,credits);close(f);
});

test('Abbruch nach Abholung erhält bezahlte Ladung und erstattet nur übriges Budget',()=>{
  const f=fixture();order(f);tickLogistics(f.game,f.entity);
  for(let i=0;i<400&&!f.ship.cargo.ice;i++)step(f);
  assert.equal(f.ship.cargo.ice,20);const escrow=current(f).escrow,credits=f.player.credits,stock=f.source.market.goods.ice.stock;
  assert.equal(runCommand(f.game,f.player,{cmd:'homeLogisticsCancel',target:f.entity.id,id:current(f).id}),undefined);
  assert.equal(f.player.credits,credits+escrow);assert.equal(f.ship.cargo.ice,20);step(f,100);assert.equal(f.source.market.goods.ice.stock,stock);assert.equal(f.ship.logisticsJob,undefined);close(f);
});

test('Teilkauf bleibt auch bei verfügbarem Spielerkonto auf sein tatsächlich gebundenes Budget begrenzt',()=>{
  const f=fixture(),budget=buyPrice('ice',f.source.market.goods.ice)*1.5;
  assert.equal(order(f,{budget}),undefined);step(f,700);
  assert(current(f).spent>0);assert(current(f).spent<=budget);assert.equal(f.entity.market.goods.ice.stock,1);
  assert.equal(current(f).state,'paused');assert.equal(f.ship.cargo.ice,undefined);close(f);
});

test('Ersetzte Transportqueue gibt Lagerreservierungen frei und dupliziert keine Waren',()=>{
  const f=fixture();
  // Separate owned source warehouse with a protected minimum.
  f.source.market.homeworld={owner:f.player.id,reserves:{ice:10},reservations:{},facilities:{dock:{status:'ready'}}};
  f.game.ownership.set(f.source.id,{entity:f.source.id,player:f.player.id});
  const stock=f.source.market.goods.ice.stock;order(f);tickLogistics(f.game,f.entity);
  assert.equal(availableHomeStock(f.source.market,'ice'),stock-30);
  f.ship.queue=[{t:'wait',secs:1000}];tickLogistics(f.game,f.entity);
  assert.equal(availableHomeStock(f.source.market,'ice'),stock-10);assert.equal(f.source.market.goods.ice.stock,stock);assert.equal(f.home.logistics.jobs[0].state,'cancelled');close(f);
});

test('Netzverlust pausiert nach begonnenem Abschnitt und bewahrt bezahlte Fracht',()=>{
  const f=fixture();order(f);tickLogistics(f.game,f.entity);
  for(let i=0;i<400&&!f.ship.cargo.ice;i++)step(f);
  f.home.controlLevel=0;step(f,100);assert.equal(f.ship.cargo.ice,20);assert.equal(f.ship.state,'waiting');assert(f.ship.queue.length);
  f.home.controlLevel=1;step(f,500);assert.equal(f.entity.market.goods.ice.stock,20);close(f);
});

test('Volles Ziel erhält Restladung und liefert nach Freigabe ohne zweiten Einkauf',()=>{
  const f=fixture();order(f);tickLogistics(f.game,f.entity);
  for(let i=0;i<400&&!f.ship.cargo.ice;i++)step(f);
  f.entity.market.goods.ore.stock=1995;const sourceStock=f.source.market.goods.ice.stock;step(f,500);
  assert.equal(f.entity.market.goods.ice.stock,5);assert.equal(f.ship.cargo.ice,15);assert.equal(current(f).state,'paused');
  f.entity.market.goods.ore.stock=0;step(f,2);assert.equal(f.ship.cargo.ice,undefined);assert.equal(f.entity.market.goods.ice.stock,20);assert.equal(f.source.market.goods.ice.stock,sourceStock);close(f);
});

test('Produktionsziel beschafft Zutaten, zählt ganze Zyklen und stoppt gemeinsame Rezeptanlagen am Ziel',()=>{
  const f=fixture();f.home.structures.push({id:'water',kind:'plant',recipe:'waterworks',status:'ready',plot:1,progress:0});
  assert.equal(order(f,{kind:'production',recipe:'waterworks',amount:10}),undefined);step(f,700);
  assert.equal(current(f).state,'delivered');const cycles=current(f).cycles;assert(cycles>0);assert.equal(f.home.productionCycles.waterworks,cycles);
  f.entity.market.goods.ice.stock=100;step(f,100);assert.equal(f.home.productionCycles.waterworks,cycles);
  assert.equal(runCommand(f.game,f.player,{cmd:'homeLogisticsCancel',target:f.entity.id,id:current(f).id}),undefined);step(f,100);assert(f.home.productionCycles.waterworks>cycles);close(f);
});

test('Absatz reserviert nur freien Überschuss und beendet sich ohne fiktiven Absatz',()=>{
  const f=fixture();f.entity.market.goods.ice.stock=50;f.home.reserves.ice=10;
  // A genuine consumer with a funded till, using the existing local source entity.
  const slot=f.source.market.goods.ice;slot.role='consume';slot.stock=0;slot.cap=100;f.source.market.realEconomy=true;f.source.market.economy={cash:10000,rate:0};
  assert.equal(order(f,{kind:'sales',amount:20,budget:0,limit:1}),undefined);tickLogistics(f.game,f.entity);
  assert.equal(availableHomeStock(f.entity.market,'ice'),20);step(f,500);
  assert.equal(current(f).state,'delivered');assert.equal(f.entity.market.goods.ice.stock,30);assert.equal(slot.stock,20);assert.equal(current(f).delivered,20);close(f);
});

test('Neustart erhält Escrow, Flug und bezahlte Ware; keine zweite Zahlung oder Warenkopie',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'prd5-logistics-')),file=path.join(directory,'world.db');let f=fixture(file);order(f);tickLogistics(f.game,f.entity);
  for(let i=0;i<400&&!f.ship.cargo.ice;i++)step(f);
  const ids={player:f.player.id,entity:f.entity.id,ship:f.ship.id,source:f.source.id},spent=current(f).spent;f.game.close();
  const game=new Game(file,{profile:'homeworld'});f={game,player:game.players.get(ids.player),entity:game.world.entities.get(ids.entity),ship:game.ships.get(ids.ship),source:game.world.entities.get(ids.source)};f.home=f.entity.market.homeworld;
  assert.equal(f.ship.cargo.ice,20);step(f,500);assert.equal(f.entity.market.goods.ice.stock,20);assert.equal(current(f).spent,spent);close(f);fs.rmSync(directory,{recursive:true,force:true});
});
