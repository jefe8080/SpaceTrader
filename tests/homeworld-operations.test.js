import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { tickHomeworld } from '../server/homeworld.js';
import { homeStorageUsage, homeStorageFree, HOME_BUILDINGS } from '../shared/homeworld.js';

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

test('Bau bindet Material, Geld, gewählten Platz und Team; unabhängige Projekte laufen parallel',()=>{
  const f=fixture(),credits=f.player.credits,ingots=f.entity.market.goods.ingots.stock;
  assert.equal(command(f,'homeBuild',{kind:'solar',plot:3}),undefined);
  assert.equal(command(f,'homeBuild',{kind:'school',plot:4}),undefined);
  assert.ok(Math.abs(f.player.credits-(f.home.civil?.taxes||0)-(f.home.civil?.consumptionPayments||0)-(credits-9000))<1e-7);
  assert.equal(f.entity.market.goods.ingots.stock,ingots-10);
  assert.equal(f.home.structures[0].plot,3);
  assert.match(command(f,'homeBuild',{kind:'housing',plot:3}),/bereits belegt/);
  assert.match(command(f,'homeBuild',{kind:'housing',plot:47}),/nicht erschlossen/);
  advance(f,59);assert.equal(f.home.structures[0].status,'building');
  assert.equal(f.home.workforce.reserved.basic,4);
  advance(f,1);assert.equal(f.home.structures[0].status,'ready');assert.equal(f.home.energy.generation,32);
  advance(f,30);assert.equal(f.home.structures[1].status,'ready');assert.equal(f.home.projects.length,0);
  assert.ok(Math.abs(f.player.credits-(f.home.civil?.taxes||0)-(f.home.civil?.consumptionPayments||0)-(credits-9000))<1e-7);
  assert.ok(Object.values(HOME_BUILDINGS).every(spec=>spec.seconds<=600));
  f.game.store.close();
});

test('Lagerkapazität ist gemeinsam, Gefahrgut getrennt, Passagiere werden nicht als Lagerware abgelegt',()=>{
  const f=fixture();empty(f);f.entity.market.goods.ore.stock=1980;f.entity.market.goods.water.stock=20;advance(f,1);
  // Put back the actual life-support consumption to test the exact storage boundary.
  f.entity.market.goods.water.stock=20;
  f.ship.type='lastesel';f.ship.modules=['shielded'];f.ship.cargo={grain:10};
  assert.equal(homeStorageFree(f.entity.market,'grain'),0);
  assert.equal(f.game.ownerTransfer(f.ship,f.entity,'grain',10,'sell').n,0);
  f.ship.cargo={};assert.equal(f.game.ownerTransfer(f.ship,f.entity,'ore',30,'buy').n,30);
  f.ship.cargo.chemicals=25;
  assert.equal(f.game.ownerTransfer(f.ship,f.entity,'chemicals',25,'sell').n,25);
  assert.equal(homeStorageUsage(f.entity.market).normal,1970);assert.equal(homeStorageUsage(f.entity.market).hazard,25);
  f.ship.cargo.workers=10;assert.equal(f.game.ownerTransfer(f.ship,f.entity,'workers',10,'sell').n,0);
  f.game.store.close();
});

test('Geschützte Reserven gelten für Entnahme, Bau und Produktion; Schiffsmaterial wird ohne Doppelabbuchung verwendet',()=>{
  const f=fixture();f.entity.market.goods.ore.stock=50;
  assert.equal(command(f,'homeReserve',{good:'ore',amount:20}),undefined);
  f.ship.type='lastesel';const credits=f.player.credits;
  assert.equal(f.game.ownerTransfer(f.ship,f.entity,'ore',100,'buy').n,30);
  assert.equal(f.entity.market.goods.ore.stock,20);assert.equal(f.player.credits,credits);
  f.entity.market.goods.ingots.stock=20;command(f,'homeReserve',{good:'ingots',amount:15});
  assert.match(command(f,'homeBuild',{kind:'solar'}),/geschützter Reserven/);
  f.ship.cargo.ingots=5;
  assert.equal(command(f,'homeBuild',{kind:'solar'}),undefined);
  assert.equal(f.entity.market.goods.ingots.stock,15);assert.equal(f.ship.cargo.ingots,undefined);
  assert.equal(f.home.projects[0].bound.goods.ingots,10);
  f.home.facilities.waterworks.status='ready';f.entity.market.goods.ice.stock=2;
  command(f,'homeReserve',{good:'ice',amount:1});advance(f,60);
  assert.equal(f.home.produced.water,undefined);
  command(f,'homeReserve',{good:'ice',amount:0});advance(f,30);
  assert.equal(f.home.produced.water,2);
  f.game.store.close();
});

test('Vollständige Rezeptzyklen erhalten Zutaten und passen auch bei vollem Lager mit mengenneutraler Umwandlung',()=>{
  const f=fixture();empty(f);f.entity.market.goods.ore.stock=1998;f.entity.market.goods.ice.stock=2;
  f.home.facilities.waterworks.status='ready';advance(f,29);
  assert.equal(f.home.produced.water,undefined);assert.equal(f.entity.market.goods.ice.stock,2);
  advance(f,1);assert.equal(f.home.produced.water,2);assert.equal(f.entity.market.goods.ice.stock,0);
  assert.ok(Math.abs(homeStorageUsage(f.entity.market).normal-2000)<1e-8);
  advance(f,300);assert.equal(f.home.produced.water,2,'kein Teilzyklus aus fehlenden Zutaten');
  f.game.store.close();
});

test('Personal wird nicht doppelt zugeordnet; Energieknappheit pausiert nach Priorität',()=>{
  const f=fixture();add(f,'school','school');add(f,'plant','water-low',{recipe:'waterworks',priority:0});
  f.entity.market.goods.ice.stock=100;
  advance(f,1);
  assert.equal(f.home.allocations.find(a=>a.id==='water-low').reason,'Energie fehlt');
  add(f,'solar','solar');advance(f,1);
  assert.equal(f.home.allocations.find(a=>a.id==='water-low').state,'active');
  for(let i=0;i<12;i++)add(f,'plant','water-'+i,{recipe:'waterworks'});
  for(let i=0;i<5;i++)add(f,'solar','solar-'+i);
  advance(f,1);
  for(const q of ['basic','skilled','specialist']){
    const assigned=f.home.allocations.reduce((sum,a)=>sum+(a.workers[q]||0),0);
    assert.equal(assigned,f.home.workforce.used[q]);
    assert.ok(assigned+f.home.workforce.reserved[q]<=f.home.workers[q]);
    assert.ok(f.home.workforce.free[q]>=0);
  }
  assert.ok(f.home.allocations.some(a=>a.reason==='Personal fehlt'));
  assert.ok(f.home.energy.used<=f.home.energy.generation);
  assert.match(command(f,'homeOperation',{id:'__proto__',enabled:true,priority:0}),/Unbekannte Anlage/);
  assert.equal(Object.prototype.enabled,undefined);
  f.game.store.close();
});

test('Gasgenerator verbraucht reale Betriebsmittel, fällt ohne Brennstoff aus und löscht keine Infrastruktur',()=>{
  const f=fixture();empty(f);add(f,'gasGenerator','generator');f.entity.market.goods.gas.stock=20;
  advance(f,3600);
  assert.ok(Math.abs(f.entity.market.goods.gas.stock)<1e-7);
  advance(f,10);assert.equal(f.home.energy.generation,12);
  assert.equal(f.home.structures.length,1);assert.equal(f.home.population,100);
  assert.equal(f.home.allocations.find(a=>a.id==='generator').reason,'Betriebsmittel fehlen');
  f.game.store.close();
});

test('Ausbildung reserviert Bewohner, pausiert ohne Versorgung und wandelt Qualifikation ohne zusätzliche Einwohner um',()=>{
  const f=fixture(),school=add(f,'school','school');add(f,'solar','solar');advance(f,1);
  assert.equal(command(f,'homeTrain',{qualification:'skilled'}),undefined);
  assert.match(command(f,'homeTrain',{qualification:'skilled'}),/Keine freie/);
  advance(f,60);assert.equal(f.home.projects[0].remaining,60);
  f.entity.market.goods.water.stock=0;f.entity.market.goods.food.stock=0;advance(f,500);
  assert.equal(f.home.projects[0].remaining,60);assert.equal(f.home.projects[0].paused,true);
  f.entity.market.goods.water.stock=100;f.entity.market.goods.food.stock=100;advance(f,60);
  assert.equal(f.home.workers.basic,38);assert.equal(f.home.workers.skilled,22);assert.equal(f.home.population,100);
  school.upgrades=['academy'];advance(f,1);
  assert.equal(command(f,'homeTrain',{qualification:'specialist'}),undefined);advance(f,180);
  assert.equal(f.home.workers.specialist,10);assert.equal(f.home.workers.skilled,12);
  assert.equal(Object.values(f.home.workers).reduce((a,b)=>a+b,0),60);
  assert.deepEqual(f.home.trained,{skilled:10,specialist:10});
  f.game.store.close();
});

test('Wachstum benötigt Versorgung und Wohnraum; eine Woche Mangel verliert keine Einwohner, Schiffe oder Fortschritte',()=>{
  const f=fixture();add(f,'silo','silo');f.entity.market.goods.water.stock=100;f.entity.market.goods.food.stock=100;
  advance(f,3600);assert.equal(f.home.population,102);assert.equal(Object.values(f.home.workers).reduce((a,b)=>a+b,0),61);
  const population=f.home.population,completed=structuredClone(f.player.homeQuest.completed),ships=f.game.shipsOf(f.player.id).map(s=>s.id);
  empty(f);advance(f,7*24*3600);
  assert.equal(f.home.population,population);assert.deepEqual(f.player.homeQuest.completed,completed);
  assert.deepEqual(f.game.shipsOf(f.player.id).map(s=>s.id),ships);assert.equal(f.home.structures[0].status,'ready');
  f.entity.market.goods.water.stock=100;f.entity.market.goods.food.stock=100;advance(f,10);assert.equal(f.home.supply.basic,1);
  f.game.store.close();
});

test('Flächenerweiterung, Baugruppen und Hypothesenprüfung verändern keine nicht freigeschalteten Plätze',()=>{
  const f=fixture();delete f.player.homeQuest.completed.H07;
  assert.match(command(f,'homeBuild',{kind:'plant',recipe:'gearworks'}),/H07/);
  assert.equal(command(f,'homeBuild',{kind:'land'}),undefined);
  assert.match(command(f,'homeBuild',{kind:'land'}),/läuft bereits/);
  advance(f,60);assert.equal(f.home.plots,12);assert.equal(f.home.expansions,1);
  const credits=f.player.credits;assert.equal(command(f,'homeBuild',{kind:'land'}),undefined);
  assert.equal(f.player.credits,credits-4200);advance(f,60);assert.equal(f.home.plots,16);
  assert.equal(command(f,'homeBuild',{kind:'plant',recipe:'oilworks',plot:15}),undefined);
  assert.equal(f.home.structures[0].plot,15);assert.equal(f.home.structures[0].status,'building');
  f.game.store.close();
});

test('Neustart erhält Baukosten und Ausbildungsrestzeit ohne Offlinefortschritt',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'spacetrader-operations-')),file=path.join(directory,'world.db');
  let f;
  try{
    f=fixture(file);add(f,'school','school');add(f,'solar','solar');advance(f,1);
    command(f,'homeTrain',{qualification:'skilled'});command(f,'homeBuild',{kind:'housing'});advance(f,30);
    const id=f.player.id,homeId=f.entity.id,credits=f.player.credits,civilIncome=f.home.civil.taxes+f.home.civil.consumptionPayments;f.game.close();
    const game=new Game(file,{profile:'homeworld'}),player=game.players.get(id),entity=game.world.entities.get(homeId);
    f={game,player,entity,home:entity.market.homeworld};
    assert.equal(f.home.projects.find(p=>p.kind==='training').remaining,90);assert.equal(player.credits,credits);
    advance(f,30);assert.equal(f.home.structures.find(s=>s.kind==='housing').status,'ready');assert.ok(Math.abs(player.credits-credits-(f.home.civil.taxes+f.home.civil.consumptionPayments-civilIncome))<1e-7);
    advance(f,60);assert.equal(f.home.workers.skilled,22);assert.equal(f.home.projects.length,0);
  }finally{if(f?.game.store.db.open)f.game.store.close();fs.rmSync(directory,{recursive:true,force:true});}
});
