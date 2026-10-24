import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game} from '../server/game.js';
import {runCommand} from '../server/handlers/index.js';
import {SHIP_TYPES,buildMaterials,sellValue,SHIPYARD} from '../shared/ships.js';
import {tickPhysicalYard} from '../server/physical-yards.js';

function fixture(file=':memory:'){
  const game=new Game(file,{seed:42,profile:'homeworld'}),player=game.createPlayer('Werft'),ship=game.shipsOf(player.id)[0],yard=game.world.entities.get('origin_yard');
  player.credits=1e7;ship.dockedAt=yard.id;ship.x=yard.x;ship.y=yard.y;game.revealAround(player,yard.x,yard.y,1000);game.onDock(ship,yard);
  return {game,player,ship,yard};
}
const command=(f,cmd,args={})=>runCommand(f.game,f.player,{cmd,target:f.yard.id,ship:f.ship.id,...args});
const advance=(f,dt)=>{f.game.time+=dt;tickPhysicalYard(f.game,f.yard,dt);};
const supply=(f,type)=>{for(const [g,n] of Object.entries(buildMaterials(type)))f.yard.market.goods[g].stock=n;};
const close=f=>f.game.store.close();

test('Einmaliges öffentliches Einstiegsschiff besitzt registrierten Rumpf und begrenzten Tank',()=>{
  const f=fixture(),item=f.yard.market.forSale[0];assert.equal(item.source,'public_start_exception');assert.equal(item.fuel,SHIP_TYPES.spatz.tank);
  assert.equal(command(f,'buyShip',{index:0}),undefined);assert.equal(f.yard.market.forSale.length,0);
  assert.equal(f.yard.market.provenance.find(p=>p.id===item.id).claimedBy,f.player.id);
  const purchased=f.game.shipsOf(f.player.id).find(s=>s.id!==f.ship.id);assert.equal(purchased.hullSource,item.id);assert.equal(purchased.fuel,item.fuel);
  assert.match(command(f,'buyShip',{index:0}),/nicht mehr/);close(f);
});

test('Öffentliche Werft wartet auf vollständiges Material, bindet es einmalig und verkauft genau einen realen Rumpf',()=>{
  const f=fixture();f.yard.market.forSale=[];advance(f,1000);assert.equal(f.yard.market.building,null);
  supply(f,'spatz');advance(f,1);const build=structuredClone(f.yard.market.building);assert.equal(build.type,'spatz');assert.equal(build.remaining,40);
  for(const g of Object.keys(buildMaterials('spatz')))assert.equal(f.yard.market.goods[g].stock,0);
  advance(f,39);assert.equal(f.yard.market.forSale.length,0);advance(f,1);assert.equal(f.yard.market.forSale.length,1);assert.equal(f.yard.market.forSale[0].id,build.id);
  assert.equal(command(f,'buyShip',{index:0}),undefined);const bought=f.game.shipsOf(f.player.id).find(s=>s.hullSource===build.id);
  assert.equal(bought.fuel,0);assert.equal(bought.bonus,0);advance(f,1000);assert.equal(f.yard.market.forSale.length,0);assert.equal(f.yard.market.building,null);close(f);
});

test('Bezahlte Bestellung erzeugt keine Materialien und reserviert erst den tatsächlich fertig gebauten Rumpf',()=>{
  const f=fixture();f.yard.market.forSale=[];const cash=f.yard.market.economy.cash;
  assert.equal(command(f,'yardOrder',{type:'spatz'}),undefined);assert.equal(f.yard.market.economy.cash,cash+SHIP_TYPES.spatz.price*2);
  advance(f,600);assert.equal(f.yard.market.building,null);assert.equal(f.yard.market.forSale.length,0);assert(f.yard.market.order);
  supply(f,'spatz');advance(f,1);advance(f,40);assert.equal(f.yard.market.forSale[0].reservedFor,f.player.id);
  const other=f.game.createPlayer('Anderer'),visitor=f.game.shipsOf(other.id)[0];visitor.dockedAt=f.yard.id;f.game.revealAround(other,f.yard.x,f.yard.y,1000);other.credits=1e6;
  assert.match(runCommand(f.game,other,{cmd:'buyShip',target:f.yard.id,index:0}),/reserviert/);
  assert.equal(command(f,'buyShip',{index:0}),undefined);assert.equal(f.yard.market.forSale.length,0);close(f);
});

test('Fraktionswerften bauen mit derselben konkreten Materialformel und verlieren ihr virtuelles Dauerangebot',()=>{
  const f=fixture();for(let q=1;q<7;q++)f.game.world.ensureSector(q,0);
  f.yard=[...f.game.world.entities.values()].find(e=>e.market?.strategy==='factionyard');assert(f.yard);
  const type=f.yard.market.yardCatalog[0],d=SHIP_TYPES[type];assert(d.faction);assert.equal(f.yard.market.forSale.length,0);
  f.player.credits=1e9;f.player.pilot=6;f.player.rep||={};f.player.rep[d.faction]=1e6;f.player.known.ship.add(type);f.game.revealAround(f.player,f.yard.x,f.yard.y,1000);
  f.ship.type='f_syndicate';f.ship.dockedAt=f.yard.id;f.ship.cargo={}; // Isolated payment/material test, no progression shortcut in the actual game.
  assert.equal(command(f,'yardOrder',{type}),undefined);advance(f,1000);assert.equal(f.yard.market.forSale.length,0);
  supply(f,type);advance(f,1);assert.equal(f.yard.market.building.remaining,SHIPYARD.BUILD_TIME[d.cls]);advance(f,SHIPYARD.BUILD_TIME[d.cls]);
  assert.equal(f.yard.market.forSale.length,1);assert.equal(f.yard.market.forSale[0].source,'materials');
  f.ship.cargo={[d.rawCurrency.good]:d.rawCurrency.n};const beforeRaw=structuredClone(f.ship.cargo),credits=f.player.credits;
  assert.match(command(f,'buyFactionShip',{index:0}),/Es fehlen/);assert.equal(f.yard.market.forSale.length,1);assert.deepEqual(f.ship.cargo,beforeRaw);assert.equal(f.player.credits,credits);
  f.ship.cargo={[d.currency.good]:d.currency.n};assert.equal(command(f,'buyFactionShip',{index:0}),undefined);
  assert.equal(f.yard.market.forSale.length,0);assert.equal(f.ship.cargo[d.currency.good],undefined);assert.equal(f.yard.market.factionPayments[d.currency.good],d.currency.n);
  assert.match(command(f,'buyFactionShip',{index:0}),/Unbekanntes Schiff/);close(f);
});

test('Schiffsankauf benötigt reale Kasse und erhält Module, Ausbau und tatsächliche Tankfüllung beim Wiederverkauf',()=>{
  const f=fixture();f.yard.market.forSale=[];f.ship.modules=['shielded'];f.ship.upg={cargo:1};f.ship.upgValue=500;f.ship.fuel=3;
  const other=f.game.spawnShip(f.player,'spatz',f.yard),id=f.ship.id,value=sellValue(f.ship),credits=f.player.credits;
  f.yard.market.economy.cash=0;assert.match(command(f,'sellShip'),/kasse/i);assert(f.game.ships.has(id));
  f.yard.market.economy.cash=value;assert.equal(command(f,'sellShip'),undefined);assert.equal(f.player.credits,credits+value);assert.equal(f.game.ships.has(id),false);assert.equal(f.player.manualShip,other.id);
  assert.equal(f.yard.market.forSale.length,1);assert.equal(f.yard.market.forSale[0].fuel,3);
  assert.equal(command(f,'buyShip',{index:0}),undefined);const restored=f.game.shipsOf(f.player.id).find(s=>s.id!==other.id);
  assert.deepEqual(restored.modules,['shielded']);assert.deepEqual(restored.upg,{cargo:1});assert.equal(restored.fuel,3);assert.equal(restored.hullSource,id);assert.equal(f.yard.market.forSale.length,0);close(f);
});

test('Neustart erhält verbrauchte Baumaterialien, Rumpf-ID und Restzeit ohne erneutes Einstiegsangebot',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'prd5-yard-')),file=path.join(directory,'world.db');
  let f=fixture(file);assert.equal(command(f,'buyShip',{index:0}),undefined);supply(f,'spatz');advance(f,1);advance(f,15);
  const id=f.yard.market.building.id;f.game.close();const game=new Game(file,{profile:'homeworld'});
  f={game,yard:game.world.entities.get('origin_yard')};assert.equal(f.yard.market.forSale.length,0);assert.equal(f.yard.market.building.remaining,25);assert.equal(f.yard.market.building.id,id);
  for(const good of Object.keys(buildMaterials('spatz')))assert.equal(f.yard.market.goods[good].stock,0);
  advance(f,25);assert.equal(f.yard.market.forSale.length,1);assert.equal(f.yard.market.forSale[0].id,id);close(f);
  assert.equal(path.dirname(directory),os.tmpdir());fs.rmSync(directory,{recursive:true,force:true});
});
