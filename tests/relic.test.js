import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Game } from '../server/game.js';
import {runCommand,acknowledgeStories} from './home-story-helper.js';
import { tickHomeworld } from '../server/homeworld.js';
import { tickRelics } from '../server/relic.js';
import { updateShip } from '../server/ships.js';
import { shipStats } from '../shared/ships.js';

function fixture(file = ':memory:') {
  const game = new Game(file, { profile: 'homeworld', seed: 42 }), player=game.createPlayer('Relikt');
  const home=game.world.entities.get(player.homeworld),ship=game.shipsOf(player.id)[0];
  ship.dockedAt=home.id;
  // Isolate the H04 branch; H00–H02 production is covered by homeworld.test.js.
  player.homeQuest.completed={H00:{at:0},H01:{at:0}};
  for(const id of ['dock','waterworks','foodplant'])home.market.homeworld.facilities[id].status='ready';
  home.market.homeworld.produced={water:20,food:10};
  assert.equal(runCommand(game,player,{cmd:'homeQuestComplete',target:home.id,quest:'H02'}),undefined);
  return {game,player,home,ship,wreck:game.world.entities.get(player.homeQuest.salvage.wreck)};
}
function go(f, target) {
  f.ship.dockedAt=null;f.ship.x=target.x+target.radius+28;f.ship.y=target.y;
  assert.equal(runCommand(f.game,f.player,{cmd:'order',ships:[f.ship.id],order:{t:'goto',target:target.id}}),undefined);
  updateShip(f.ship,1,f.game);
  assert.equal(f.ship.dockedAt,target.id);
}
function unlock(f) {
  go(f,f.wreck);
  assert.equal(runCommand(f.game,f.player,{cmd:'relicSalvage',ship:f.ship.id,target:f.wreck.id}),undefined);
  go(f,f.home);
  assert.equal(runCommand(f.game,f.player,{cmd:'relicDeliver',ship:f.ship.id,target:f.home.id}),undefined);
  f.game.time+=60;tickHomeworld(f.game,f.home,60);
  assert.equal(runCommand(f.game,f.player,{cmd:'homeQuestComplete',target:f.home.id,quest:'H04'}),undefined);
}
const work=(f,kind,ship=f.ship,home=f.home)=>runCommand(f.game,f.player,{cmd:'relicWork',target:home.id,ship:ship.id,kind});
const finish=(f)=>{f.game.time+=15;tickRelics(f.game);};

test('H04: versiegelter persönlicher Fund wird erst in der Heimatwerkstatt zu genau einem Antrieb',()=>{
  const f=fixture();
  assert.equal(f.player.relic,undefined);
  assert.match(work(f,'install'),/erst durch H04/);
  assert.match(runCommand(f.game,f.player,{cmd:'relicSalvage',ship:f.ship.id,target:f.wreck.id}),/persönlich anfliegen/);
  go(f,f.wreck);
  assert.equal(runCommand(f.game,f.player,{cmd:'relicSalvage',ship:f.ship.id,target:f.wreck.id}),undefined);
  assert.deepEqual(f.ship.cargo,{});
  assert.match(runCommand(f.game,f.player,{cmd:'relicSalvage',ship:f.ship.id,target:f.wreck.id}),/bereits/);
  assert.match(f.game.canGiveAway(f.player,f.ship),/versiegelten Fund/);
  assert.match(runCommand(f.game,f.player,{cmd:'homeQuestComplete',target:f.home.id,quest:'H04'}),/Keine Verbindung/);
  go(f,f.home);
  assert.equal(runCommand(f.game,f.player,{cmd:'relicDeliver',ship:f.ship.id,target:f.home.id}),undefined);
  assert.equal(f.player.relic,undefined);
  f.game.time+=59;tickHomeworld(f.game,f.home,59);
  assert.match(runCommand(f.game,f.player,{cmd:'homeQuestComplete',target:f.home.id,quest:'H04'}),/Voraussetzungen/);
  f.game.time++;tickHomeworld(f.game,f.home,1);
  assert.equal(runCommand(f.game,f.player,{cmd:'homeQuestComplete',target:f.home.id,quest:'H04'}),undefined);
  assert.deepEqual(f.player.relic.location,{kind:'world',id:f.home.id});
  assert.match(runCommand(f.game,f.player,{cmd:'homeQuestComplete',target:f.home.id,quest:'H04'}),/bereits abgeholt/);
  assert.equal(f.home.market.homeworld.grants.filter(g=>g.relic).length,1);
  f.game.store.close();
});

test('Ein-/Ausbau: atomar, 15 s, ohne Remotewechsel, Rückerstattung oder gleichzeitige Anwesenheit beider Schiffe',()=>{
  const f=fixture();unlock(f);
  const credits=f.player.credits,modules=[...f.ship.modules],cargo={...f.ship.cargo};
  assert.equal(work(f,'install'),undefined);
  assert.match(work(f,'install'),/bereits gearbeitet/);
  assert.match(runCommand(f.game,f.player,{cmd:'order',ships:[f.ship.id],order:{t:'move',x:f.ship.x+100,y:f.ship.y}}),/Reliktarbeit/);
  f.game.time+=14;tickRelics(f.game);assert.equal(f.ship.relicSpeed,undefined);
  f.game.time++;tickRelics(f.game);assert.equal(f.ship.relicSpeed,4);
  assert.equal(f.player.credits,credits);assert.deepEqual(f.ship.modules,modules);assert.deepEqual(f.ship.cargo,cargo);
  const other=f.game.spawnShip(f.player,'spatz',f.home);
  assert.match(work(f,'install',other),/nicht an dieser Werkstatt/);
  assert.match(f.game.canGiveAway(f.player,f.ship),/Reliktantrieb/);
  assert.match(runCommand(f.game,f.player,{cmd:'order',ships:[f.ship.id],order:{t:'harvest',x:f.home.x,y:f.home.y}}),/keine Automatisierung/);
  assert.equal(work(f,'remove'),undefined);finish(f);
  assert.deepEqual(f.player.relic.location,{kind:'world',id:f.home.id});
  f.ship.dockedAt=null;f.ship.x+=5000;
  assert.equal(work(f,'install',other),undefined);finish(f);
  assert.equal(other.relicSpeed,4);assert.equal(f.ship.relicSpeed,undefined);
  assert.equal(f.player.relic.location.id,other.id);
  f.game.store.close();
});

test('Reliktträger fliegt auch mit leerem Tank ×4, verbraucht keinen Treibstoff und kann nicht frei zum Hauptschiff wechseln',()=>{
  const f=fixture();unlock(f);work(f,'install');finish(f);
  const base=150;assert.equal(shipStats(f.ship).speed,base*4);assert.equal(shipStats(f.ship).burn,0);
  f.ship.fuel=0;f.ship.dockedAt=null;f.ship.x=f.home.x;f.ship.y=f.home.y;
  const start=f.ship.x;
  assert.equal(runCommand(f.game,f.player,{cmd:'order',ships:[f.ship.id],order:{t:'move',x:start+10000,y:f.ship.y}}),undefined);
  updateShip(f.ship,1,f.game);
  assert.ok(Math.abs(f.ship.x-start-base*4)<0.001);assert.equal(f.ship.fuel,0);
  assert.match(runCommand(f.game,f.player,{cmd:'flagship',ship:f.ship.id}),/Werkstatt/);
  f.game.store.close();
});

test('Manuelle Präsenz: genau ein Schiff außerhalb der Abdeckung, kein Bonus und keine vorbereiteten Ketten',()=>{
  const f=fixture(),other=f.game.spawnShip(f.player,'spatz',f.home);
  const move={t:'move',x:f.home.x+100,y:f.home.y};
  assert.match(runCommand(f.game,f.player,{cmd:'order',ships:[other.id],order:move}),/aktiv manuell/);
  assert.equal(runCommand(f.game,f.player,{cmd:'manualShip',ship:other.id}),undefined);
  assert.equal(shipStats(other).speed,150);
  assert.equal(runCommand(f.game,f.player,{cmd:'order',ships:[other.id],order:move}),undefined);
  assert.match(runCommand(f.game,f.player,{cmd:'order',ships:[other.id],order:move,append:true}),/einzelne manuelle/);
  assert.match(runCommand(f.game,f.player,{cmd:'order',ships:[other.id],order:{t:'dock',target:f.home.id,actions:[{op:'buy',good:'ore'},{op:'sell',good:'ore'}]}}),/einzelne manuelle/);
  assert.match(runCommand(f.game,f.player,{cmd:'order',ships:[f.ship.id],order:move}),/aktiv manuell/);
  f.game.store.close();
});

test('Handels-XP: persönliche manuelle Transaktion ohne Relikt, nie automatische oder eigene Lagertransfers',()=>{
  for(const opts of [{manual:true},{manual:true,auto:true},{auto:true},{}]) {
    const f=fixture(),market=f.game.world.entities.get('origin_hub');
    f.ship.dockedAt=market.id;f.ship.cargo={ore:20};f.ship.basis={ore:0};
    market.market.goods.ore={role:'trade',rate:0,stock:0,cap:1000,mod:100};
    market.market.economy.cash=1e6; // Explicit counterparty funds for this isolated XP test.
    f.game.world.addEntity({id:'xp-buyer',sector:market.sector,x:market.x+500,y:market.y,market:{goods:{ore:{role:'consume',rate:0,stock:0,cap:1000,mod:1}},economy:{cash:1e6}}});
    const xp=f.player.xp;
    assert.ok(f.game.trade(f.ship,market,'ore',20,'sell',0,opts).n>0);
    if(opts.manual&&!opts.auto)assert.ok(f.player.xp>xp);else assert.equal(f.player.xp,xp);
    f.ship.dockedAt=f.home.id;f.ship.cargo={ore:20};
    const before=f.player.xp;
    assert.equal(f.game.trade(f.ship,f.home,'ore',20,'sell',0,{manual:true}).n,20);
    assert.equal(f.player.xp,before);
    f.game.store.close();
  }
});

test('Neustart behält Werkstattarbeit und genau einen Standort; abgeschaltete Zeit zählt nicht',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'spacetrader-relic-')),file=path.join(dir,'world.db');
  let f;
  try{
    f=fixture(file);unlock(f);work(f,'install');f.game.time+=7;f.game.close();
    const game=new Game(file,{profile:'homeworld'}),player=game.players.get(f.player.id);
    f={game,player,ship:game.ships.get(f.ship.id),home:game.world.entities.get(f.home.id)};
    assert.equal(player.relic.operation.until-game.time,8);
    game.time+=8;tickRelics(game);assert.equal(f.ship.relicSpeed,4);
    assert.equal(player.relic.location.id,f.ship.id);assert.equal(player.relic.operation,null);
    tickRelics(game);assert.equal(game.shipsOf(player.id).filter(s=>s.relicSpeed).length,1);
  }finally{if(f?.game.store.db.open)f.game.store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
