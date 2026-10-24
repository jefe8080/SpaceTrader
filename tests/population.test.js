import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game} from '../server/game.js';
import {passengerTrade,transferPassengers,initializePopulation,tickVisitors} from '../server/population.js';
import {tickHomeworld} from '../server/homeworld.js';
import {runCommand} from '../server/handlers/index.js';
import {acceptQuest,abortQuest,questProgress,boardOf} from '../server/quests.js';
import {cargoFits,freeFor} from '../shared/config.js';

function fixture(file=':memory:'){
  const game=new Game(file,{seed:42,profile:'homeworld'}),player=game.createPlayer('Personen'),home=game.world.entities.get(player.homeworld),ship=game.shipsOf(player.id)[0];
  home.market.homeworld.facilities.dock.status='ready';ship.modules=['cabin'];ship.queue=[];player.credits=100000;
  const source=[...game.world.entities.values()].find(e=>e.kind==='planet'&&e.type!=='ruins');
  ship.dockedAt=source.id;game.revealAround(player,source.x,source.y,1000);initializePopulation(source);initializePopulation(home);
  return {game,player,home,ship,source,state:source.market.economy};
}
const close=f=>f.game.store.close();

test('Anwerbung, Teil-Umladung und Ansiedlung erhalten Einwohner und konkrete Qualifikationen',()=>{
  const f=fixture(),population=f.state.population,workers=structuredClone(f.state.workers),destination=f.home.market.homeworld;
  assert.equal(passengerTrade(f.game,f.ship,f.source,'workers',20,'buy').n,20);assert.equal(f.state.population,population-20);assert.equal(f.state.workers.basic,workers.basic-20);
  const second=f.game.spawnShip(f.player,'spatz',f.source);second.modules=['cabin'];second.dockedAt=f.source.id;
  assert.equal(transferPassengers(f.ship,second,'workers',7),undefined);assert.equal(f.ship.cargo.workers,13);assert.equal(second.cargo.workers,7);
  const before=destination.population;f.ship.dockedAt=f.home.id;second.dockedAt=f.home.id;
  assert.equal(passengerTrade(f.game,second,f.home,'workers',100,'sell').n,7);assert.equal(passengerTrade(f.game,f.ship,f.home,'workers',100,'sell').n,13);
  assert.equal(destination.population,before+20);assert.equal(f.state.population+destination.population,population+before);assert.equal(destination.workers.basic,68);assert.equal(f.ship.cargo.workers,undefined);close(f);
});

test('Fehlender Wohnraum und Kabinenplatz lassen Personen vollständig erhalten',()=>{
  const f=fixture();passengerTrade(f.game,f.ship,f.source,'workers',100,'buy');assert.equal(freeFor(f.ship,'workers'),0);assert(cargoFits(f.ship));
  f.ship.dockedAt=f.home.id;f.home.market.homeworld.housing=105;
  assert.equal(passengerTrade(f.game,f.ship,f.home,'workers',100,'sell').n,5);assert.equal(f.ship.cargo.workers,25);
  assert.equal(passengerTrade(f.game,f.ship,f.home,'workers',100,'sell').n,0);assert.equal(f.ship.cargo.workers,25);close(f);
});

test('Touristen bleiben nach 20 Minuten dieselben Personen und ein Aufenthalt wird nur einmal bezahlt',()=>{
  const f=fixture(),n=f.state.population;f.state.civil={budget:1000};
  assert.equal(passengerTrade(f.game,f.ship,f.source,'tourists',10,'buy').n,10);assert.equal(f.state.population,n-10);assert.equal(f.state.civil.budget,720);
  const h=f.home.market.homeworld;h.visitorCapacity=20;const credits=f.player.credits;f.ship.dockedAt=f.home.id;
  assert.equal(passengerTrade(f.game,f.ship,f.home,'tourists',10,'sell').n,10);assert.equal(f.player.credits,credits+280);assert.equal(h.visitors[0].stayPaid,280);
  tickVisitors(f.home,1199);assert.equal(h.visitors[0].ready,false);tickVisitors(f.home,1200);assert.equal(h.visitors[0].ready,true);
  const after=f.player.credits;tickVisitors(f.home,12000);assert.equal(f.player.credits,after);assert.equal(h.visitors.length,1);
  assert.equal(passengerTrade(f.game,f.ship,f.home,'tourists',10,'buy').n,10);assert.equal(h.visitors.length,0);
  f.ship.dockedAt=f.source.id;assert.equal(passengerTrade(f.game,f.ship,f.source,'tourists',10,'sell').n,10);assert.equal(f.state.population,n);assert.equal(f.ship.cargo.tourists,undefined);close(f);
});

test('Ausbildungsreservierung und aktive Belegschaft können nicht als Arbeiter ausreisen',()=>{
  const f=fixture();f.state.workers={basic:10,skilled:0,specialist:0};f.state.projects=[{kind:'training',from:'basic',count:10}];
  assert.equal(passengerTrade(f.game,f.ship,f.source,'workers',20,'buy').n,0);f.state.projects=[];f.state.workforce={used:{basic:8}};
  assert.equal(passengerTrade(f.game,f.ship,f.source,'workers',20,'buy').n,2);assert.equal(f.state.workers.basic,8);close(f);
});

test('Personenabwurf wird abgewiesen und neue Heimatbelegschaft überschreitet nicht 60 % der Einwohner',()=>{
  const f=fixture();passengerTrade(f.game,f.ship,f.source,'workers',20,'buy');assert.match(runCommand(f.game,f.player,{cmd:'jettison',ship:f.ship.id,good:'workers'}),/nicht abgeworfen/);assert.equal(f.ship.cargo.workers,20);
  const h=f.home.market.homeworld;h.workers={basic:100,skilled:100,specialist:100};h.facilities.control.status='ready';h.controlLevel=4;h.controlModules={dispatch:1,production:1,sales:1};h.structures=Array.from({length:20},(_,i)=>({id:`s${i}`,kind:'solar',status:'ready',plot:i}));
  tickHomeworld(f.game,f.home,1);assert(Object.values(h.workforce.used).reduce((a,b)=>a+b,0)<=60);close(f);
});

test('Rundreisequest belegt reale Kabinen und gibt ihre ursprünglichen Einwohner erst bei Rückkehr zurück',()=>{
  const f=fixture(),n=f.state.population,q={id:'tour-real',type:'tour',giver:f.source.id,tourists:10,stops:[f.home.id],stopNames:[f.home.name],reward:{cr:100,xp:1}};
  // Tour quests may not involve the player's property, so use another real public stop.
  const stop=[...f.game.world.entities.values()].find(e=>e.market&&e.id!==f.source.id&&!f.game.ownership.has(e.id));q.stops=[stop.id];q.stopNames=[stop.name];
  boardOf(f.source).offers.push(q);assert.equal(acceptQuest(f.game,f.player,f.ship,f.source,q.id),undefined);assert.equal(f.ship.cargo.tourists,10);assert.equal(f.state.population,n-10);
  assert.equal(passengerTrade(f.game,f.ship,f.source,'tourists',10,'sell').n,0);f.ship.dockedAt=stop.id;questProgress(f.game,f.player,f.ship);f.ship.dockedAt=f.source.id;questProgress(f.game,f.player,f.ship);
  assert.equal(f.player.quest,null);assert.equal(f.state.population,n);assert.equal(f.ship.cargo.tourists,undefined);close(f);
});

test('Questabbruch löscht keine Touristen; Rückgabe benötigt den wirklichen Herkunftsort',()=>{
  const f=fixture(),n=f.state.population;passengerTrade(f.game,f.ship,f.source,'tourists',10,'buy');f.ship.passengers[0].quest='abort';f.player.quest={id:'abort',type:'tour',reward:{xp:0}};
  abortQuest(f.game,f.player);assert.equal(f.ship.cargo.tourists,10);assert.equal(f.ship.passengers[0].quest,undefined);
  assert.equal(passengerTrade(f.game,f.ship,f.source,'tourists',10,'sell').n,10);assert.equal(f.state.population,n);close(f);
});

test('Neustart bewahrt Herkunft, Qualifikation, Reisegeld und Aufenthalt ohne erneute Bevölkerungserzeugung',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'prd5-persons-')),file=path.join(directory,'world.db');let f=fixture(file);f.state.civil={budget:1000};passengerTrade(f.game,f.ship,f.source,'tourists',10,'buy');
  const ids={p:f.player.id,s:f.ship.id,e:f.source.id},population=f.state.population;f.game.close();const game=new Game(file,{profile:'homeworld'}),ship=game.ships.get(ids.s),source=game.world.entities.get(ids.e);
  assert.equal(ship.passengers[0].origin,source.id);assert.equal(ship.passengers[0].wallet,280);assert.equal(source.market.economy.population,population);
  assert.equal(passengerTrade(game,ship,source,'tourists',10,'sell').n,10);assert.equal(source.market.economy.population,population+10);game.store.close();fs.rmSync(directory,{recursive:true,force:true});
});
