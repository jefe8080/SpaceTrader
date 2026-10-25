import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game} from '../server/game.js';
import {runCommand,acknowledgeStories} from './home-story-helper.js';
import {siteError,tickColonies,colonyCost} from '../server/colonies.js';
import {quoteWarp,startWarp,tickWarps,warpValuation} from '../server/warp.js';
import {passengerTrade} from '../server/population.js';
import {tickHomeworld} from '../server/homeworld.js';
import {pointCovered,coverageAreas} from '../server/coverage.js';
import {giveOrder} from '../server/handlers/ship.js';
import {updateShip} from '../server/ships.js';
import {GOODS,cellKey,cellOf} from '../shared/config.js';

function fixture(file=':memory:'){
  const game=new Game(file,{seed:42,profile:'homeworld'}),p=game.createPlayer('Expansion'),home=game.world.entities.get(p.homeworld),h=home.market.homeworld,ship=game.shipsOf(p.id)[0];
  p.homeQuest.completed=Object.fromEntries(Array.from({length:13},(_,i)=>[`H${String(i).padStart(2,'0')}`,{at:0}]));p.credits=1e7;p.pilot=5;
  h.facilities.dock.status='ready';h.facilities.control.status='ready';h.controlLevel=1;ship.dockedAt=home.id;ship.queue=[];
  for(const [q,r] of [[3,0],[4,0],[5,0]])game.world.ensureSector(q,r);
  const site=[...game.world.entities.values()].find(e=>e.ruinsSite&&!siteError(game,p,e));assert(site);
  game.revealAround(p,site.x,site.y,1000);const system=[...game.world.systems.values()].find(s=>s.sector==='4,0'&&!s.faction&&!s.start);
  game.discover(p,'system',system.id);game.discover(p,'sector',system.sector);
  acknowledgeStories(game,p);
  return {game,p,home,h,ship,site,system};
}
const command=(f,cmd,args={})=>runCommand(f.game,f.p,{cmd,...args});
const close=f=>f.game.store.close();
function expedition(f){
  f.ship.modules=['cabin'];assert.equal(passengerTrade(f.game,f.ship,f.home,'workers',20,'buy').n,20);
  const rootsurvivor=f.game.spawnShip(f.p,'spatz',f.home);rootsurvivor.dockedAt=f.home.id;
  const carrier=f.game.spawnShip(f.p,'lastesel',f.site);carrier.dockedAt=f.site.id;
  f.ship.dockedAt=f.site.id;f.ship.manualDock=f.site.id;
  assert.equal(command(f,'colonySurvey',{target:f.site.id,ship:f.ship.id}),undefined);
  const cost=colonyCost(f.p);
  for(const [g,n] of Object.entries(cost.goods)){carrier.cargo[g]=n;assert.equal(command(f,'colonyDeliver',{target:f.site.id,good:g,amount:n}),undefined);}
  return {carrier,rootsurvivor,cost};
}
function prepareWarp(f){
  f.p.homeQuest.completed.H16={at:0};f.p.relic={id:'test-relic',speed:4,location:{kind:'ship',id:f.ship.id}};f.ship.relicSpeed=4;f.ship.dockedAt=null;f.ship.x=f.home.x+f.home.radius+500;f.ship.y=f.home.y;
  assert.equal(quoteWarp(f.game,f.p,f.home,f.system.id),undefined);return f.h.warpQuote;
}

test('Entdeckbare Ruinen verwenden vorhandene Planeten, ohne Markt, Bevölkerung oder plünderbares Startpaket',()=>{
  const f=fixture();assert.equal(f.site.market,null);assert(f.site.originalType);assert.equal(f.game.ownership.has(f.site.id),false);assert.equal(f.site.colony,undefined);
  assert.equal(command(f,'colonySurvey',{target:f.site.id,ship:f.ship.id}),'Den Standort mit dem aktiven manuellen Schiff persönlich erkunden.');close(f);
});

test('H13-Gründung bindet tatsächliche Materialien, 20 eigene Auswanderer und einen Spatz; keine zweite Starthilfe',()=>{
  const f=fixture(),count=f.game.world.entities.size,population=f.h.population,{carrier,cost}=expedition(f),credits=f.p.credits;
  assert.equal(command(f,'colonyFound',{target:f.site.id,ship:f.ship.id,confirmed:false}),'Dauerhafte Expeditionsschiffsabgabe ausdrücklich bestätigen.');
  assert.equal(command(f,'colonyFound',{target:f.site.id,ship:f.ship.id,confirmed:true}),undefined);assert.equal(f.p.credits,credits-cost.credits);assert.equal(f.game.ships.has(f.ship.id),false);assert.equal(f.h.population,population-20);
  f.game.time+=299;tickColonies(f.game,299);assert(f.site.ruinsSite);f.game.time++;tickColonies(f.game,1);
  const h=f.site.market.homeworld;assert.equal(f.game.world.entities.size,count);assert.equal(f.p.homeQuest.firstColony,f.site.id);assert.equal(h.population,20);assert.equal(h.housing,100);assert.equal(h.controlLevel,0);assert.equal(h.storage,2000);assert.equal(h.hazardStorage,100);
  assert.equal(h.facilities.dock.status,'ready');assert.equal(h.facilities.waterworks.status,'ruined');assert.deepEqual(h.grants,[]);assert.deepEqual(h.bootstrap,{});assert.equal(h.founding.immigrants.reduce((n,b)=>n+b.n,0),20);
  for(const [g,s] of Object.entries(f.site.market.goods))if(GOODS[g].cls!=='passenger')assert.equal(s.stock,0);
  assert.equal(f.game.ownership.get(f.site.id).personal,true);assert(f.game.ships.has(carrier.id));tickHomeworld(f.game,f.site,1);assert.equal(h.housing,100);close(f);
});

test('Fremd angeworbene oder nur als Warenzahl behauptete Auswanderer werden ohne Verluste abgewiesen',()=>{
  const f=fixture();expedition(f);f.ship.passengers[0].ownerAtDeparture='someone_else';const credits=f.p.credits,before=structuredClone(f.ship.passengers);
  assert.match(command(f,'colonyFound',{target:f.site.id,ship:f.ship.id,confirmed:true}),/eigene Auswanderer/);assert.deepEqual(f.ship.passengers,before);assert.equal(f.p.credits,credits);assert(f.game.ships.has(f.ship.id));close(f);
});

test('Expedition benötigt ein anderes verfügbares Schiff vor Ort und kann keinen Reliktträger abgeben',()=>{
  const f=fixture(),{carrier}=expedition(f);carrier.dockedAt=null;
  assert.match(command(f,'colonyFound',{target:f.site.id,ship:f.ship.id,confirmed:true}),/Weiterreise/);carrier.dockedAt=f.site.id;f.ship.relicSpeed=4;
  assert.match(command(f,'colonyFound',{target:f.site.id,ship:f.ship.id,confirmed:true}),/ohne Relikt/);assert.equal(f.ship.cargo.workers,20);close(f);
});

test('H13/H16 schließen mit dem echten zweiten Standort und seiner bezahlten Leitstelle; Folgegründung eskaliert separat',()=>{
  const f=fixture(),{carrier}=expedition(f);command(f,'colonyFound',{target:f.site.id,ship:f.ship.id,confirmed:true});f.game.time+=300;tickColonies(f.game,300);
  assert.equal(command(f,'homeQuestComplete',{target:f.home.id,quest:'H13'}),undefined);
  command(f,'manualShip',{ship:carrier.id});carrier.cargo.ingots=4;assert.equal(command(f,'homeRepair',{target:f.site.id,facility:'control'}),undefined);f.game.time+=30;tickHomeworld(f.game,f.site,30);assert.equal(f.site.market.homeworld.controlLevel,1);
  for(const [g,n] of Object.entries({powercells:20,computers:10})){f.home.market.goods[g].stock=n;assert.equal(command(f,'homeQuestDeliver',{target:f.home.id,quest:'H16',good:g,amount:n}),undefined);}
  assert.equal(command(f,'homeQuestComplete',{target:f.home.id,quest:'H16'}),undefined);assert.equal(coverageAreas(f.game,f.p).length,2);
  const first=colonyCost(f.p);assert.equal(first.credits,250000);assert.equal(first.goods.computers,10);f.p.homeQuest.regularColonies=1;assert.equal(colonyCost(f.p).credits,400000);assert.equal(colonyCost(f.p).goods.plates,125);close(f);
});

test('Warpvorschau bewertet feste Kosten und Basisbestände statt selbst gesetzter Preise oder Handelsaufschläge',()=>{
  const f=fixture();f.h.capitalCosts=[{id:'paid',cost:{credits:1000,goods:{plates:10}}}];f.home.market.goods.ore.stock=10;f.home.market.moduleInventory={cabin:1};
  const a=warpValuation(f.home);f.game.ownership.get(f.home.id).fixed.ore=1;f.home.market.goods.ore.mod=1000;assert.deepEqual(warpValuation(f.home),a);
  assert.equal(a.cargoGoods,10*GOODS.ore.base);assert.equal(a.cargoModules,15000);assert.equal(a.total,Math.ceil(250000+.2*a.site+a.cargo));prepareWarp(f);assert.equal(f.h.warpQuote.target.system,f.system.id);assert(f.h.warpQuote.coverage.length);close(f);
});

test('Warpbeginn benötigt freie Schiffe, gültiges Ziel, bestätigte Vorschau und unveränderte Preisobergrenze',()=>{
  const f=fixture(),q=prepareWarp(f),credits=f.p.credits;f.ship.dockedAt=f.home.id;
  assert.match(startWarp(f.game,f.p,f.home,q.id,true),/sämtliche angedockten/);f.ship.dockedAt=null;
  f.home.market.goods.gold.stock=100;assert.match(startWarp(f.game,f.p,f.home,q.id,true),/gestiegen/);assert.equal(f.p.credits,credits);assert.equal(f.h.warp,undefined);close(f);
});

test('Vorbereitung friert Bestände und Fortschritt ein, sperrt Waren-/Modultransfer und verschiebt Bauzeit',()=>{
  const f=fixture();f.h.structures=[{id:'water',kind:'plant',recipe:'waterworks',status:'ready',plot:0,progress:0}];f.h.facilities.foodplant={status:'building',readyAt:100,progress:0};
  f.home.market.goods.ice.stock=100;f.home.market.goods.water.stock=100;f.home.market.goods.food.stock=100;const q=prepareWarp(f);assert.equal(startWarp(f.game,f.p,f.home,q.id,true),undefined);
  const stocks=Object.fromEntries(Object.entries(f.home.market.goods).map(([g,s])=>[g,s.stock])),pop=f.h.population;
  f.ship.dockedAt=f.home.id;assert.equal(f.game.trade(f.ship,f.home,'water',10,'buy').n,0);assert.equal(f.game.refuel(f.ship,f.home).ok,false);
  assert.match(command(f,'homeBuild',{target:f.home.id,kind:'solar'}),/Warp/);f.ship.dockedAt=null;
  f.game.time+=100;tickWarps(f.game,100);tickHomeworld(f.game,f.home,100);assert.equal(f.h.facilities.foodplant.readyAt,200);assert.equal(f.h.structures[0].progress,0);assert.equal(f.h.population,pop);assert.deepEqual(Object.fromEntries(Object.entries(f.home.market.goods).map(([g,s])=>[g,s.stock])),stocks);close(f);
});

test('Warp bewegt dieselbe Welt und ihre Lager, keine Flottenschiffe; Index, Abdeckung und Reliktort bleiben konsistent',()=>{
  const f=fixture(),old={x:f.home.x,y:f.home.y},oldCell=cellKey(...cellOf(old.x,old.y)),q=prepareWarp(f),shipPosition={x:f.ship.x,y:f.ship.y};
  f.p.relic={id:'unique',speed:4,location:{kind:'world',id:f.home.id}};assert.match(startWarp(f.game,f.p,f.home,q.id,true),/Keine Verbindung/);f.p.relic.location={kind:'ship',id:f.ship.id};f.home.market.goods.ore.stock=0;const id=f.home.id;assert.equal(startWarp(f.game,f.p,f.home,q.id,true),undefined);
  f.game.time+=300;tickWarps(f.game,300);assert.equal(f.home.id,id);assert.equal(f.home.system,f.system.id);assert.equal(f.home.x,q.target.x);assert.equal(f.game.world.entitiesInCell(oldCell).includes(id),false);assert.equal(f.game.world.entitiesInCell(cellKey(...cellOf(f.home.x,f.home.y))).filter(i=>i===id).length,1);
  assert.deepEqual({x:f.ship.x,y:f.ship.y},shipPosition);assert.equal(f.p.relic.location.id,f.ship.id);assert(pointCovered(f.game,f.p,f.home));assert.equal(pointCovered(f.game,f.p,old),false);assert.equal(f.h.warpCooldownUntil,f.game.time+86400);assert.match(quoteWarp(f.game,f.p,f.home,f.system.id),/Sperrfrist/);close(f);
});

test('Anfliegender Frachter beendet den begonnenen Abschnitt und pausiert ohne Verlust nach Relokation',()=>{
  const f=fixture();f.p.homeQuest.completed.H16={at:0};f.ship.dockedAt=null;f.ship.x=f.home.x+3000;f.ship.y=f.home.y;
  const manual=f.game.spawnShip(f.p,'spatz',f.home);manual.dockedAt=null;f.p.manualShip=manual.id;f.p.relic={id:'unique',speed:4,location:{kind:'ship',id:manual.id}};manual.relicSpeed=4;
  assert.equal(giveOrder(f.game,f.ship,{t:'goto',target:f.home.id},false),undefined);updateShip(f.ship,1,f.game);const endpoint={...f.ship.coverageLeg};
  assert.equal(quoteWarp(f.game,f.p,f.home,f.system.id),undefined);assert.equal(startWarp(f.game,f.p,f.home,f.h.warpQuote.id,true),undefined);f.game.time+=300;tickWarps(f.game,300);
  for(let i=0;i<100;i++)updateShip(f.ship,1,f.game);assert.equal(f.ship.relocationHold.state,'waiting');assert.equal(f.ship.x,endpoint.x);assert.equal(f.ship.y,endpoint.y);assert.equal(f.ship.dockedAt,null);assert(f.ship.queue.length);
  assert.match(command(f,'relocationResume',{ship:f.ship.id}),/abdeckung/i);command(f,'manualShip',{ship:f.ship.id});assert.equal(command(f,'relocationResume',{ship:f.ship.id}),undefined);assert.equal(f.ship.queue[0].manualDirect,true);updateShip(f.ship,1,f.game);assert.equal(f.ship.state,'flying');close(f);
});

test('Neustart erhält Gründungs-/Warprestzeit, gebundene Kosten, Weltidentität und Sperrfrist ohne Offlinezeit',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'prd5-warp-')),file=path.join(directory,'world.db'),f=fixture(file),q=prepareWarp(f);startWarp(f.game,f.p,f.home,q.id,true);f.game.time+=120;tickWarps(f.game,120);const credits=f.p.credits;f.game.close();
  const game=new Game(file,{profile:'homeworld'}),home=game.world.entities.get(f.home.id),p=game.players.get(f.p.id);assert.equal(home.market.homeworld.warp.remaining,180);assert.equal(p.credits,credits);game.time+=180;tickWarps(game,180);assert.equal(home.system,f.system.id);assert.equal(home.market.homeworld.warp,null);assert.equal(home.market.homeworld.warpCooldownUntil,game.time+86400);assert.equal(p.credits,credits);game.store.close();fs.rmSync(directory,{recursive:true,force:true});
});

test('Unerschlossene, belegte und fremde Warpziele werden vor Kostenbindung abgewiesen',()=>{
  const f=fixture();f.p.homeQuest.completed.H16={at:0};f.p.known.system.delete(f.system.id);assert.match(quoteWarp(f.game,f.p,f.home,f.system.id),/erschließen/);
  f.p.known.system.add(f.system.id);assert.match(quoteWarp(f.game,f.p,f.home,f.system.id,f.system.x,f.system.y),/Zielposition/);
  const other=f.game.createPlayer('Fremde');other.homeQuest.completed.H16={at:0};const credits=other.credits;assert.match(quoteWarp(f.game,other,f.home,f.system.id),/eigene/);assert.equal(other.credits,credits);close(f);
});

test('Warpziel wird exklusiv reserviert und kann nicht durch einen zweiten Transfer oder eine Gründung belegt werden',()=>{
  const f=fixture(),q=prepareWarp(f);assert.equal(startWarp(f.game,f.p,f.home,q.id,true),undefined);
  const other=f.game.createPlayer('Zweites Warp'),world=f.game.world.entities.get(other.homeworld);other.homeQuest.completed.H16={at:0};world.market.homeworld.controlLevel=1;other.known.system.add(f.system.id);f.game.shipsOf(other.id)[0].dockedAt=world.id;
  assert.match(quoteWarp(f.game,other,world,f.system.id),/keine geeignete/);
  const hypothetical={...f.site,system:q.target.system,x:q.target.x,y:q.target.y};assert.match(siteError(f.game,f.p,hypothetical),/Warptransfer/);close(f);
});

test('Neustart bewahrt eine bezahlte 300-s-Gründung samt Personen und Infrastrukturschiff ohne neues Startpaket',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'prd5-colony-')),file=path.join(directory,'world.db'),f=fixture(file);expedition(f);command(f,'colonyFound',{target:f.site.id,ship:f.ship.id,confirmed:true});f.game.time+=100;tickColonies(f.game,100);const credits=f.p.credits;f.game.close();
  const game=new Game(file,{profile:'homeworld'}),site=game.world.entities.get(f.site.id),p=game.players.get(f.p.id);assert.equal(site.colony.remaining,200);assert.equal(p.credits,credits);assert.equal(game.ships.has(f.ship.id),false);
  game.time+=200;tickColonies(game,200);assert.equal(site.market.homeworld.population,20);assert.deepEqual(site.market.homeworld.grants,[]);assert.equal(p.credits,credits);game.store.close();fs.rmSync(directory,{recursive:true,force:true});
});

test('20 Einwohner ermöglichen höchstens zwölf gleichzeitige Arbeitende einschließlich gebundener Bauteams',()=>{
  const f=fixture(),{carrier}=expedition(f);command(f,'colonyFound',{target:f.site.id,ship:f.ship.id,confirmed:true});f.game.time+=300;tickColonies(f.game,300);command(f,'manualShip',{ship:carrier.id});tickHomeworld(f.game,f.site,1);
  const h=f.site.market.homeworld;f.site.market.goods.ingots.stock=100;f.site.market.goods.glass.stock=40;
  // The dock uses two of twelve positions. Five two-person teams fit; the sixth does not.
  for(let i=0;i<5;i++)assert.equal(command(f,'homeBuild',{target:f.site.id,kind:'solar'}),undefined);
  const credits=f.p.credits;assert.match(command(f,'homeBuild',{target:f.site.id,kind:'solar'}),/Bauteam/);assert.equal(f.p.credits,credits);
  tickHomeworld(f.game,f.site,1);assert(Object.values(h.workforce.used).reduce((a,b)=>a+b,0)+Object.values(h.workforce.reserved).reduce((a,b)=>a+b,0)<=12);close(f);
});
