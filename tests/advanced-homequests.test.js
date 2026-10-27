import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game} from '../server/game.js';
import {runCommand,acknowledgeStories} from './home-story-helper.js';
import {tickHomeworld,homeQuestReady} from '../server/homeworld.js';
import {revealHomeSites} from '../server/homequests.js';
import {HOME_QUESTS} from '../shared/homeworld.js';
import {QUEST_DELIVERIES} from '../shared/advanced-homequests.js';
import {SHIP_TYPES} from '../shared/config.js';
import {giveOrder} from '../server/handlers/ship.js';
import {updateShip} from '../server/ships.js';

function fixture(file=':memory:'){
  const game=new Game(file,{seed:42,profile:'homeworld'}),p=game.createPlayer('Archiv'),e=game.world.entities.get(p.homeworld),h=e.market.homeworld,s=game.shipsOf(p.id)[0];
  p.homeQuest.completed=Object.fromEntries(['H00','H01','H02','H03','H04','H05','H06'].map(id=>[id,{at:0}]));p.credits=1e6;p.pilot=5;
  h.population=1000;h.workers={basic:400,skilled:100,specialist:30};h.controlLevel=1;
  for(const id of ['dock','control'])h.facilities[id].status='ready';
  h.structures=Array.from({length:6},(_,i)=>({id:`solar${i}`,kind:'solar',status:'ready',plot:i}));
  s.dockedAt=e.id;s.queue=[];acknowledgeStories(game,p);return {game,p,e,h,s};
}
const close=f=>f.game.store.close();
const command=(f,cmd,args={})=>runCommand(f.game,f.p,{cmd,target:f.e.id,...args});
const finish=(f,id)=>command(f,'homeQuestComplete',{quest:id});
const advance=(f,n)=>{f.game.time+=n;tickHomeworld(f.game,f.e,n);};
const unlock=(f,...ids)=>{for(const id of ids)f.p.homeQuest.completed[id]={at:0};acknowledgeStories(f.game,f.p);};
function deliver(f,id){for(const [g,n] of Object.entries(QUEST_DELIVERIES[id])){f.e.market.goods[g].stock=n;assert.equal(command(f,'homeQuestDeliver',{quest:id,good:g,amount:n}),undefined);}}

test('Alle 18 Hauptquests haben feste Voraussetzungen, Belohnungen und nachvollziehbare Ziele',()=>{
  assert.deepEqual(Object.keys(HOME_QUESTS),Array.from({length:18},(_,i)=>`H${String(i).padStart(2,'0')}`));
  for(const [id,q] of Object.entries(HOME_QUESTS))for(const r of q.requires){assert(HOME_QUESTS[r]);assert(r<id);}
  assert.deepEqual(HOME_QUESTS.H13.requires,['H10','H11','H12']);assert.deepEqual(HOME_QUESTS.H15.requires,['H08','H12']);
});

test('H07 verlangt nachweisliche Ausbildung und Eigenproduktion; gekaufte oder umgeladene Ware genügt nicht',()=>{
  const f=fixture();f.h.structures.push({id:'school',kind:'school',status:'ready',plot:6});advance(f,1);
  f.e.market.goods.plates.stock=100;f.e.market.goods.wires.stock=100;assert.equal(homeQuestReady(f.game,f.p,f.e,'H07'),false);
  f.h.trained.skilled=10;f.h.produced.plates=40;f.h.produced.wires=20;assert.equal(finish(f,'H07'),undefined);const credits=f.p.credits;assert.match(finish(f,'H07'),/bereits/);assert.equal(f.p.credits,credits);assert(f.p.homeQuest.sites.H09);close(f);
});

test('Teillieferungen verbrauchen tatsächlich verfügbare Ware und bleiben getrennt von Produktionsnachweisen',()=>{
  const f=fixture();unlock(f,'H07');f.e.market.goods.sensors.stock=10;
  assert.equal(command(f,'homeQuestDeliver',{quest:'H09',good:'sensors',amount:4}),undefined);assert.equal(f.e.market.goods.sensors.stock,6);assert.equal(f.h.questDeliveries.H09.sensors,4);
  assert.equal(command(f,'homeQuestDeliver',{quest:'H09',good:'sensors',amount:100}),undefined);assert.equal(f.e.market.goods.sensors.stock,0);assert.equal(f.h.questDeliveries.H09.sensors,10);
  assert.match(command(f,'homeQuestDeliver',{quest:'H09',good:'sensors',amount:1}),/vollständig/);assert.equal(f.h.produced.sensors,undefined);close(f);
});

test('Archivbesuch benötigt tatsächlich manuell angedocktes Schiff; Forschungsfund ist einmalige physische Fracht',()=>{
  const f=fixture();unlock(f,'H07');revealHomeSites(f.game,f.p,f.e);const node=f.game.world.entities.get(f.p.homeQuest.sites.H09);
  f.s.dockedAt=node.id;assert.match(runCommand(f.game,f.p,{cmd:'homeArchiveVisit',target:node.id,ship:f.s.id}),/persönlich/);
  f.s.manualDock=node.id;assert.equal(runCommand(f.game,f.p,{cmd:'homeArchiveVisit',target:node.id,ship:f.s.id}),undefined);
  f.s.dockedAt=f.e.id;f.h.structures.push({id:'research',kind:'researchWorkshop',status:'ready',plot:6});deliver(f,'H09');assert.equal(finish(f,'H09'),undefined);
  const find=f.game.world.entities.get(f.p.homeQuest.sites.acidex);f.s.dockedAt=find.id;f.s.manualDock=find.id;f.s.cargo.ore=1;
  assert.match(runCommand(f.game,f.p,{cmd:'homeArchiveVisit',target:find.id,ship:f.s.id}),/30 freie/);f.s.cargo={};
  assert.equal(runCommand(f.game,f.p,{cmd:'homeArchiveVisit',target:find.id,ship:f.s.id}),undefined);assert.equal(f.s.moduleCargo.acidex,1);
  assert.match(runCommand(f.game,f.p,{cmd:'homeArchiveVisit',target:find.id,ship:f.s.id}),/bereits/);assert.equal(f.s.moduleCargo.acidex,1);assert.equal(f.h.grants.filter(g=>g.module==='acidex').length,1);close(f);
});

test('Persönliche Archivstelle kann über die reguläre Fluglogik manuell erreicht werden',()=>{
  const f=fixture();unlock(f,'H07');revealHomeSites(f.game,f.p,f.e);const target=f.game.world.entities.get(f.p.homeQuest.sites.H09);f.h.controlLevel=0;
  assert.equal(giveOrder(f.game,f.s,{t:'goto',target:target.id},false),undefined);
  for(let i=0;i<300&&f.s.queue.length;i++){f.game.time++;updateShip(f.s,1,f.game);}
  assert.equal(f.s.dockedAt,target.id);assert.equal(f.s.manualDock,target.id);assert.equal(runCommand(f.game,f.p,{cmd:'homeArchiveVisit',target:target.id,ship:f.s.id}),undefined);close(f);
});

test('H10 zählt tatsächlichen Veredelungsoutput, H11 dauerhaft angesammelte volle Versorgung',()=>{
  const f=fixture();unlock(f,'H07','H09');f.h.structures.push({id:'gold',kind:'plant',recipe:'goldpurifier',status:'ready',plot:6});f.e.market.goods.finegold.stock=10;
  assert.equal(homeQuestReady(f.game,f.p,f.e,'H10'),false);f.e.market.goods.gold.stock=20;f.e.market.goods.chemicals.stock=10;advance(f,120);assert.equal(f.h.produced.finegold,10);assert.equal(finish(f,'H10'),undefined);assert(f.p.homeQuest.sites.gascoll);assert(f.p.homeQuest.sites.drill);
  f.h.population=250;f.h.workers={basic:100,skilled:30,specialist:10};f.h.structures.push({id:'housing',kind:'housing',status:'ready',plot:7});f.e.market.goods.water.stock=1000;f.e.market.goods.food.stock=1000;
  advance(f,900);const supplied=f.h.fullSupplySeconds;f.e.market.goods.water.stock=0;advance(f,100);assert.equal(f.h.fullSupplySeconds,supplied);f.e.market.goods.water.stock=1000;advance(f,900);assert.equal(finish(f,'H11'),undefined);close(f);
});

test('Kleiner Ring verlangt bestätigte dauerhafte Schiffsabgabe; ein voller, angebotener oder Relikt-Spatz wird nicht gelöscht',()=>{
  const f=fixture();unlock(f,'H07');deliver(f,'H08');const second=f.game.spawnShip(f.p,'spatz',f.e);second.dockedAt=f.e.id;
  assert.match(command(f,'homeOrbital',{large:false,ship:second.id}),/bestätigen/);
  second.relicSpeed=4;assert.match(command(f,'homeOrbital',{large:false,ship:second.id,confirmed:true}),/ohne Relikt/);delete second.relicSpeed;
  second.cargo.ore=1;assert.match(command(f,'homeOrbital',{large:false,ship:second.id,confirmed:true}),/Fracht/);second.cargo={};
  assert.equal(command(f,'homeOrbital',{large:false,ship:second.id,confirmed:true}),undefined);assert.equal(f.game.ships.has(second.id),false);assert.equal(f.h.orbital.infrastructureShips[0].id,second.id);
  advance(f,599);assert.equal(f.h.orbital.small,false);advance(f,1);assert.equal(f.h.orbital.small,true);assert.equal(finish(f,'H08'),undefined);close(f);
});

test('Orbitalbau bindet tatsächliche Schiffmaterialien, pausiert ohne Betrieb und gibt ein vollgetanktes reales Schiff aus',()=>{
  const f=fixture();f.h.orbital={small:true,large:false,jobs:{},inventory:[],next:0,infrastructureShips:[]};
  for(const [g,n] of Object.entries(SHIP_TYPES.spatz.build))f.e.market.goods[g].stock=n;
  assert.equal(command(f,'homeOrbitalBuild',{type:'spatz'}),undefined);assert.match(command(f,'homeOrbitalBuild',{type:'spatz'}),/belegt/);
  for(const g of Object.keys(SHIP_TYPES.spatz.build))assert.equal(f.e.market.goods[g].stock,0);
  f.h.structures=[];advance(f,40);assert.equal(f.h.orbital.jobs.small.remaining,40);assert.equal(f.h.orbital.inventory.length,0);
  f.h.structures=[{id:'solar',kind:'solar',status:'ready',plot:0}];advance(f,40);assert.equal(f.h.orbital.inventory.length,1);const id=f.h.orbital.inventory[0].id;
  assert.equal(command(f,'homeOrbitalClaim',{id}),undefined);const hull=f.game.shipsOf(f.p.id).find(s=>s.hullSource===id);assert(hull);assert.equal(hull.fuel,SHIP_TYPES[hull.type].tank);assert.match(command(f,'homeOrbitalClaim',{id}),/Kein vorhandenes Schiff/);close(f);
});

test('Großer Ring braucht zwei getrennte Abschnitte und bindet Questmaterialien nicht ein zweites Mal',()=>{
  const f=fixture();unlock(f,'H07','H08','H09','H12');f.h.orbital={small:true,large:false,largeStage:0,jobs:{},inventory:[],next:0,infrastructureShips:[]};deliver(f,'H15');
  assert.equal(command(f,'homeOrbital',{large:true}),undefined);advance(f,600);assert.equal(f.h.orbital.largeStage,1);assert.equal(f.h.orbital.large,false);assert.equal(f.h.orbital.project,null);
  assert.equal(command(f,'homeOrbital',{large:true}),undefined);assert.deepEqual(f.h.orbital.project.bound,{});advance(f,600);assert.equal(f.h.orbital.large,true);assert.equal(finish(f,'H15'),undefined);close(f);
});

test('Kleine und große Fertigung besitzen getrennte reale Bauplätze und teilen den Grundbetrieb ohne Doppelbelegung',()=>{
  const f=fixture();f.h.orbital={small:true,large:true,jobs:{},inventory:[],next:0,infrastructureShips:[]};
  const type=Object.keys(SHIP_TYPES).find(t=>SHIP_TYPES[t].cls==='L'&&!SHIP_TYPES[t].npc&&!SHIP_TYPES[t].faction);
  for(const t of ['spatz',type])for(const [g,n] of Object.entries(SHIP_TYPES[t].build))f.e.market.goods[g].stock+=n;
  assert.equal(command(f,'homeOrbitalBuild',{type:'spatz'}),undefined);assert.equal(command(f,'homeOrbitalBuild',{type}),undefined);advance(f,10);
  assert.equal(f.h.orbital.jobs.small.remaining,30);assert.equal(f.h.orbital.jobs.large.remaining,230);
  assert.equal(f.h.allocations.find(a=>a.id==='orbital:small').power+f.h.allocations.find(a=>a.id==='orbital:large').power,80);
  advance(f,30);assert.equal(f.h.orbital.inventory.length,1);advance(f,200);assert.equal(f.h.orbital.inventory.length,2);
  advance(f,1);assert.equal(f.h.allocations.filter(a=>a.id.startsWith('orbital:')).length,0);close(f);
});

test('H14 und H17 verbessern denselben einzigartigen Antrieb auf ×5 und ×6, ohne Exemplar oder zweite Auszahlung',()=>{
  const f=fixture();unlock(f,'H07','H09','H10','H11','H12','H13');f.p.relic={id:'unique',speed:4,location:{kind:'ship',id:f.s.id},operation:null};f.s.relicSpeed=4;
  f.p.homeQuest.visits={H14:{at:0}};deliver(f,'H14');assert.equal(finish(f,'H14'),undefined);assert.equal(f.p.relic.id,'unique');assert.equal(f.s.relicSpeed,5);
  unlock(f,'H08','H15');f.p.homeQuest.visits.H17={at:0};deliver(f,'H17');assert.equal(finish(f,'H17'),undefined);assert.equal(f.s.relicSpeed,6);const xp=f.p.xp;assert.match(finish(f,'H17'),/bereits/);assert.equal(f.p.xp,xp);close(f);
});

test('Neustart erhält Teillieferung, Ringbauabschnitt, abgegebenes Infrastrukturschiff und Studienfund',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'prd5-ring-')),file=path.join(directory,'world.db'),f=fixture(file);unlock(f,'H07','H09');revealHomeSites(f.game,f.p,f.e);const find=f.game.world.entities.get(f.p.homeQuest.sites.sensor);f.s.dockedAt=find.id;f.s.manualDock=find.id;runCommand(f.game,f.p,{cmd:'homeArchiveVisit',target:find.id,ship:f.s.id});f.s.dockedAt=f.e.id;deliver(f,'H08');const second=f.game.spawnShip(f.p,'spatz',f.e);second.dockedAt=f.e.id;command(f,'homeOrbital',{large:false,ship:second.id,confirmed:true});advance(f,200);f.game.close();
  const game=new Game(file,{profile:'homeworld'}),home=game.world.entities.get(f.e.id);assert.equal(home.market.homeworld.orbital.project.remaining,400);assert.equal(game.ships.has(second.id),false);assert.equal(home.market.homeworld.questDeliveries.H08.plates,100);
  assert.equal(game.ships.get(f.s.id).moduleCargo.sensor,1);assert(game.players.get(f.p.id).homeQuest.finds.sensor);
  game.time+=400;tickHomeworld(game,home,400);assert.equal(home.market.homeworld.orbital.small,true);game.store.close();fs.rmSync(directory,{recursive:true,force:true});
});

test('Orbitalbau von Fraktions-L/XL verlangt Rang und veredelte Währung zusätzlich zu realen Rumpfmaterialien',()=>{
  const f=fixture();f.h.orbital={small:true,large:true,jobs:{},inventory:[],next:0,infrastructureShips:[]};const type='fl_miners',d=SHIP_TYPES[type];
  for(const [g,n] of Object.entries(d.build))f.e.market.goods[g].stock=n;f.e.market.goods[d.currency.good].stock=d.currency.n;
  assert.match(command(f,'homeOrbitalBuild',{type}),/Fraktionsrang/);assert.equal(f.e.market.goods[d.currency.good].stock,d.currency.n);
  f.p.rep={miners:1e6};assert.equal(command(f,'homeOrbitalBuild',{type}),undefined);assert.equal(f.e.market.goods[d.currency.good].stock,0);assert.deepEqual(f.h.orbital.jobs.large.currency,d.currency);
  advance(f,240);assert.equal(f.h.orbital.inventory[0].type,type);assert.deepEqual(f.h.orbital.inventory[0].currencyPaid,d.currency);close(f);
});
