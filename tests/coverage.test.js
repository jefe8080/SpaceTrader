import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {coveredPoint,coveredSegment} from '../shared/coverage.js';
import {hexAt,hexCenter,hexCorners} from '../shared/hex.js';
import {controlUpgradeCost} from '../shared/homeworld.js';
import {Game} from '../server/game.js';
import {pointCovered,segmentCovered,coveredPath,controlCapacity} from '../server/coverage.js';
import {giveOrder} from '../server/handlers/ship.js';
import {runCommand} from '../server/handlers/index.js';
import {updateShip} from '../server/ships.js';
import {tickHomeworld} from '../server/homeworld.js';

function fixture(file=':memory:'){
  const game=new Game(file,{seed:42,profile:'homeworld'}),player=game.createPlayer('Netz');
  const home=game.world.entities.get(player.homeworld),state=home.market.homeworld;
  state.facilities.control.status='ready';state.facilities.dock.status='ready';state.controlLevel=2;
  const ship=game.spawnShip(player,'spatz',home);ship.x=home.x;ship.y=home.y;ship.dockedAt=null;
  return {game,player,home,state,ship};
}
const close=f=>f.game.store.close();

test('Exakte Gebietsvereinigung erkennt schmale Lücken und verbunden überlappende Systemzonen',()=>{
  const circles=[{kind:'circle',x:0,y:0,radius:10},{kind:'circle',x:20.001,y:0,radius:10}];
  assert(coveredPoint(circles,{x:0,y:0}));assert(coveredPoint(circles,{x:20,y:0}));
  assert.equal(coveredSegment(circles,{x:0,y:0},{x:20,y:0}),false);
  circles[1].x=19.999;assert(coveredSegment(circles,{x:0,y:0},{x:20,y:0}));
  assert.equal(coveredSegment(circles,{x:0,y:10.1},{x:20,y:10.1}),false);
});

test('Vollständiger Hexsektor enthält Leerraum und jede Ecke; Nachbarlücke bleibt gesperrt',()=>{
  const areas=[{kind:'hex',q:0,r:0,rings:0}];
  for(const point of hexCorners(0,0))assert(coveredPoint(areas,point));
  assert(coveredSegment(areas,hexCorners(0,0,.999)[0],hexCorners(0,0,.999)[3]));
  const neighbor=hexCenter(1,0);assert.equal(coveredPoint(areas,neighbor),false);
  areas.push({kind:'hex',q:1,r:0,rings:0});assert(coveredSegment(areas,{x:0,y:0},neighbor));
  assert.equal(coveredSegment(areas,{x:0,y:0},hexCenter(2,0)),false);
});

test('Eigene Netze verbinden sich; Konsortium und fremde Leitstellen gewähren keine Reichweite',()=>{
  const f=fixture(),other=f.game.createPlayer('Fremd'),foreign=f.game.world.entities.get(other.homeworld);
  foreign.market.homeworld.controlLevel=2;
  const sector=hexAt(f.home.x,f.home.y),center=hexCenter(sector.q,sector.r);
  assert(pointCovered(f.game,f.player,center));
  assert.equal(pointCovered(f.game,f.player,hexCenter(sector.q+5,sector.r)),false);
  f.player.consortium='gemeinsam';other.consortium='gemeinsam';
  foreign.x=hexCenter(sector.q+5,sector.r).x;foreign.y=center.y;
  assert.equal(pointCovered(f.game,f.player,foreign),false);
  foreign.market.homeworld.owner=f.player.id;assert(pointCovered(f.game,f.player,foreign));
  close(f);
});

test('Bekannte abgedeckte Wurmlochenden verbinden getrennte Netze ohne geometrische Zwischenabdeckung',()=>{
  const f=fixture(),sector=hexAt(f.home.x,f.home.y),a=hexCenter(sector.q,sector.r),b=hexCenter(sector.q+5,sector.r);
  f.game.world.entities.set('remote',{id:'remote',kind:'planet',type:'ruins',...b,market:{homeworld:{owner:f.player.id,controlLevel:2}}});
  for(const [id,point] of [['wa',a],['wb',b]])f.game.world.entities.set(id,{id,kind:'wormhole',wh:'test-wh',radius:0,...point});
  f.game.world.wormholes.set('test-wh',{a:'wa',b:'wb'});
  assert.equal(segmentCovered(f.game,f.player,a,b),false);
  assert.equal(coveredPath(f.game,f.player,a,b).time,Infinity);
  f.player.known.wh.add('test-wh');const planned=coveredPath(f.game,f.player,a,b);
  assert(Number.isFinite(planned.time));assert(planned.legs.some(l=>l.wh));
  f.game.world.entities.get('remote').market.homeworld.controlLevel=0;
  assert.equal(coveredPath(f.game,f.player,a,b).time,Infinity);close(f);
});

test('Abdeckungsverlust beendet begonnenen Abschnitt und pausiert nächste Queue ohne Verlust',()=>{
  const f=fixture(),first={t:'move',x:f.ship.x+1000,y:f.ship.y},second={t:'move',x:f.ship.x+2000,y:f.ship.y};
  assert.equal(giveOrder(f.game,f.ship,first,false),undefined);assert.equal(giveOrder(f.game,f.ship,second,true),undefined);
  updateShip(f.ship,1,f.game);assert(f.ship.coverageLeg);f.state.controlLevel=0;
  for(let i=0;i<20;i++)updateShip(f.ship,1,f.game);
  assert.equal(f.ship.x,first.x);assert.equal(f.ship.queue.length,1);assert.equal(f.ship.state,'waiting');
  const warnings=JSON.stringify(f.ship.warn);for(let i=0;i<10;i++)updateShip(f.ship,1,f.game);assert.equal(JSON.stringify(f.ship.warn),warnings);
  f.state.controlLevel=2;for(let i=0;i<20;i++)updateShip(f.ship,1,f.game);
  assert.equal(f.ship.x,second.x);assert.equal(f.ship.queue.length,0);close(f);
});

test('Abgelehnte Routenzuweisung und Routenbearbeitung verändern weder Vorlage noch Queues',()=>{
  const f=fixture(),route={id:'route',owner:f.player.id,name:'Original',stops:[{targetId:f.home.id,actions:[]}]};
  f.game.routes.set(route.id,route);f.ship.relicSpeed=4;
  const error=runCommand(f.game,f.player,{cmd:'routeSave',id:route.id,name:'Geändert',stops:route.stops,assign:[f.ship.id]});
  assert.match(error,/Reliktträger/);assert.equal(route.name,'Original');assert.equal(f.ship.queue.length,0);
  const count=f.game.routes.size;
  assert.match(runCommand(f.game,f.player,{cmd:'routeSave',name:'Neu',stops:route.stops,assign:[f.ship.id]}),/Reliktträger/);
  assert.equal(f.game.routes.size,count);close(f);
});

test('Gemeinsame Auftragskapazität wird für eine ganze Mehrfachauswahl vorab geprüft',()=>{
  const f=fixture();f.state.controlLevel=1;
  const ships=Array.from({length:9},()=>f.game.spawnShip(f.player,'spatz',f.home));
  assert.equal(controlCapacity(f.game,f.player),8);
  const error=runCommand(f.game,f.player,{cmd:'order',ships:ships.map(s=>s.id),order:{t:'move',x:f.home.x,y:f.home.y}});
  assert.match(error,/Auftragskapazität/);assert(ships.every(s=>s.queue.length===0));close(f);
});

test('Leitstellenausbau bindet tatsächliche Materialien, bleibt unter drei Minuten und wächst ohne niedrige Stufengrenze',()=>{
  const f=fixture();f.state.controlLevel=1;f.player.credits=1e7;
  for(const [g,n] of Object.entries({plates:100,wires:10,electronics:100,computers:30}))f.home.market.goods[g].stock=n;
  const upgrade=()=>runCommand(f.game,f.player,{cmd:'homeControlUpgrade',target:f.home.id});
  assert.equal(upgrade(),undefined);assert.equal(f.player.credits,1e7-8000);assert.equal(f.home.market.goods.wires.stock,6);
  assert.match(upgrade(),/bereits/);f.game.time+=60;tickHomeworld(f.game,f.home,60);assert.equal(f.state.controlLevel,2);
  for(let level=3;level<=20;level++){const cost=controlUpgradeCost(level);assert(cost.seconds<=180);assert(Number.isSafeInteger(cost.credits));}
  assert.equal(controlUpgradeCost(1000),null);assert.equal(upgrade(),undefined);
  f.game.time+=120;tickHomeworld(f.game,f.home,120);assert.equal(f.state.controlLevel,3);close(f);
});

test('Neustart erhält Freigabe für begonnenen Abschnitt und laufenden Leitstellenausbau',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'prd5-net-')),file=path.join(folder,'world.db');
  const f=fixture(file);giveOrder(f.game,f.ship,{t:'move',x:f.ship.x+1000,y:f.ship.y},false);updateShip(f.ship,1,f.game);
  f.state.controlLevel=1;f.player.credits=10000;f.home.market.goods.plates.stock=10;f.home.market.goods.wires.stock=4;
  assert.equal(runCommand(f.game,f.player,{cmd:'homeControlUpgrade',target:f.home.id}),undefined);
  f.state.controlLevel=0;f.game.save();close(f);
  const game=new Game(file,{profile:'homeworld'}),ship=game.ships.get(f.ship.id);
  for(let i=0;i<20;i++)updateShip(ship,1,game);assert.equal(ship.queue.length,0);assert.equal(ship.x,f.ship.coverageLeg.x);
  const home=game.world.entities.get(f.home.id);assert.equal(home.market.homeworld.projects[0].until,60);
  game.time=60;tickHomeworld(game,home,60);assert.equal(home.market.homeworld.controlLevel,2);assert.ok(Math.abs(game.players.get(f.player.id).credits-home.market.homeworld.civil.taxes-home.market.homeworld.civil.consumptionPayments-2000)<1e-7);
  game.store.close();fs.rmSync(folder,{recursive:true,force:true});
});

test('Wurmlochflug endet bei Abdeckungsverlust sicher am Ausgang und pausiert den nächsten Abschnitt',()=>{
  const f=fixture(),sector=hexAt(f.home.x,f.home.y),a=hexCenter(sector.q,sector.r),b=hexCenter(sector.q+5,sector.r);
  const remote={id:'remote',kind:'planet',type:'ruins',...b,market:{homeworld:{owner:f.player.id,controlLevel:2}}};f.game.world.entities.set(remote.id,remote);
  for(const [id,point] of [['wa',a],['wb',b]])f.game.world.entities.set(id,{id,kind:'wormhole',wh:'test-wh',radius:0,...point});
  f.game.world.wormholes.set('test-wh',{a:'wa',b:'wb'});f.player.known.wh.add('test-wh');
  f.ship.x=a.x+100;f.ship.y=a.y;
  assert.equal(giveOrder(f.game,f.ship,{t:'move',x:b.x+1000,y:b.y},false),undefined);
  updateShip(f.ship,1,f.game);assert(f.ship.transit);
  remote.market.homeworld.controlLevel=0;f.game.time+=100;updateShip(f.ship,1,f.game);assert.equal(f.ship.transit,null);
  const exited={x:f.ship.x,y:f.ship.y};updateShip(f.ship,1,f.game);
  assert.equal(f.ship.state,'waiting');assert.deepEqual({x:f.ship.x,y:f.ship.y},exited);assert(f.ship.queue.length);close(f);
});

test('Mangel reduziert nur neue Auftragsannahme, hält Reichweite und bestehende Flüge aufrecht',()=>{
  const f=fixture();f.state.supplyFactor=.25;
  const ships=Array.from({length:4},()=>f.game.spawnShip(f.player,'spatz',f.home));
  for(const ship of ships.slice(0,3))assert.equal(giveOrder(f.game,ship,{t:'move',x:f.home.x+1000,y:f.home.y},false),undefined);
  assert.match(giveOrder(f.game,ships[3],{t:'move',x:f.home.x+1000,y:f.home.y},false),/Auftragskapazität/);
  assert(pointCovered(f.game,f.player,f.home));for(const ship of ships.slice(0,3))for(let i=0;i<30;i++)updateShip(ship,1,f.game);
  assert(ships.slice(0,3).every(s=>s.queue.length===0));close(f);
});

test('Frühe lokale Automatisierung kauft und transportiert reale Rohstoffe ohne Handels-XP',()=>{
  const f=fixture();f.state.controlLevel=1;
  const source=[...f.game.world.entities.values()].find(e=>e.system===f.home.system&&e.market?.goods.ice?.role==='produce');
  const initial=source.market.goods.ice.stock,xp=f.player.xp;
  const stops=[{targetId:source.id,actions:[{op:'buy',good:'ice',amount:20}]},{targetId:f.home.id,actions:[{op:'sell',good:'ice',amount:0}]}];
  assert.equal(runCommand(f.game,f.player,{cmd:'routeSave',name:'Eisversorgung',stops,assign:[f.ship.id]}),undefined);
  const route=[...f.game.routes.values()][0];assert.equal(giveOrder(f.game,f.ship,{t:'route',route:route.id,rounds:1},false),undefined);
  for(let i=0;i<400&&f.ship.queue.length;i++){f.game.time++;updateShip(f.ship,1,f.game);}
  assert.equal(f.ship.queue.length,0);assert.equal(f.home.market.goods.ice.stock,20);assert.equal(source.market.goods.ice.stock,initial-20);
  assert.equal(f.ship.cargo.ice,undefined);assert.equal(f.player.xp,xp);close(f);
});
