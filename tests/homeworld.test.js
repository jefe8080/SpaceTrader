import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Game } from '../server/game.js';
import {runCommand,acknowledgeStories} from './home-story-helper.js';
import { createHomeworld, tickHomeworld, ringCoordinates } from '../server/homeworld.js';
import { HOMEWORLD } from '../shared/homeworld.js';
import { ruinsLayout, createRuinsTerrain } from '../client/js/ruinsTerrain.js';
import { createPlanetEnvironment } from '../client/js/planetEnvironment.js';

function fixture(seed = 42, db = ':memory:') {
  const game = new Game(db, { profile: 'homeworld', seed });
  const player = game.createPlayer('Heimat');
  const entity = game.world.entities.get(player.homeworld);
  const ship = game.shipsOf(player.id)[0];
  ship.dockedAt = entity.id;
  return { game, player, entity, ship, home: entity.market.homeworld };
}
const command = (f, cmd, args = {}) => runCommand(f.game, f.player, { cmd, target: f.entity.id, ...args });
const advance = (f, seconds) => { for (let i = 0; i < seconds; i++) { f.game.time++; tickHomeworld(f.game, f.entity, 1); } };
function repair(f, facility) {
  assert.equal(command(f, 'homeRepair', { facility }), undefined, facility);
  advance(f, facility === 'dock' ? 15 : 30);
}
function claim(f, quest) { assert.equal(command(f, 'homeQuestComplete', { quest }), undefined, quest); }
function begin(f) {
  assert.equal(command(f, 'homeLand'), undefined); claim(f, 'H00'); repair(f, 'dock'); claim(f, 'H01');
}
function deliver(f, good, amount) {
  const source = [...f.game.world.entities.values()].find(e => e.system === f.entity.system && e.market?.goods[good]?.role === 'produce' && Math.hypot(e.x-f.entity.x,e.y-f.entity.y)<=6000);
  assert.ok(source, good);
  while (amount > 0) {
    f.ship.dockedAt = source.id;
    const loaded = f.game.trade(f.ship, source, good, Math.min(amount, 30), 'buy', 0, { manual: true });
    assert.ok(loaded.n > 0, good + ': ' + loaded.reason);
    f.ship.dockedAt = f.entity.id;
    assert.equal(f.game.trade(f.ship, f.entity, good, loaded.n, 'sell').n, loaded.n);
    amount -= loaded.n;
  }
}

test('Persönliche Heimat: gleichzeitige und spätere Spieler haben Abstand, getrennte Systeme und Grundquellen', () => {
  const game = new Game(':memory:', { profile: 'homeworld', seed: 17 });
  const homes = [];
  for (let i = 0; i < 24; i++) {
    const player = game.createPlayer(`Kapitän ${i}`), home = game.world.entities.get(player.homeworld);
    assert.notEqual(home.sector, '0,0');
    for (const other of homes) {
      assert.notEqual(home.system, other.system);
      assert.ok(Math.hypot(home.x-other.x,home.y-other.y)>=27000);
    }
    for (const good of HOMEWORLD.placement.resources) assert.ok([...game.world.entities.values()].some(e=>e.system===home.system&&e.market?.goods[good]?.role==='produce'&&Math.hypot(e.x-home.x,e.y-home.y)<=6000),good);
    homes.push(home);
    if (i === 12) game.tick(1);
  }
  assert.equal(new Set(homes.map(h=>h.id)).size,24);
  game.store.close();
});

test('Erschöpfte Startringe erweitern die Suche ringweise', () => {
  const game = new Game(':memory:', { profile: 'homeworld', seed: 9 });
  for (const {q,r} of [...ringCoordinates(1),...ringCoordinates(2)]) {
    game.world.ensureSector(q,r);
    for(const system of game.world.sectors.get(`${q},${r}`).systems) game.world.addEntity({id:'occupied_'+system.id,type:'ruins',kind:'planet',system:system.id,sector:system.sector,x:system.x,y:system.y,radius:100});
  }
  const player=game.createPlayer('Später Spieler'),home=game.world.entities.get(player.homeworld);
  const [q,r]=home.sector.split(',').map(Number);
  assert.equal(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r)),3);
  game.store.close();
});

test('H00–H06 ohne fremde Industrie: echte Transfers, Eigenproduktion, getrennte Quest, einmaliger zweiter Frachter', () => {
  const f=fixture();
  f.player.quest={id:'normal',type:'procure'};
  assert.equal(f.player.credits,5000);assert.equal(f.ship.main,undefined);
  assert.match(command(f,'homeQuestComplete',{quest:'H01'}),/Voraussetzungen/);
  begin(f);
  assert.equal(f.player.quest.id,'normal');
  assert.equal(f.entity.market.goods.ingots.stock,76);
  assert.equal(f.home.grants.length,3); // Materials, supplies and the registered initial ship/tank.
  repair(f,'waterworks');repair(f,'foodplant');
  deliver(f,'ice',30);deliver(f,'grain',20);advance(f,350);claim(f,'H02');
  repair(f,'control');repair(f,'fueldepot');
  assert.equal(f.home.controlLevel,1);
  assert.equal(runCommand(f.game,f.player,{cmd:'routeSave',name:'Lokal',stops:[{targetId:f.entity.id,actions:[]}],assign:[]}),undefined);
  claim(f,'H03');
  advance(f,600);claim(f,'H05');
  assert.equal(f.game.shipsOf(f.player.id).length,2);
  assert.ok(f.game.shipsOf(f.player.id).every(s=>s.fuel>0));
  assert.match(command(f,'homeQuestComplete',{quest:'H05'}),/bereits abgeholt/);
  repair(f,'refinery');repair(f,'smelter');
  deliver(f,'crude',44);deliver(f,'ore',44);advance(f,1500);claim(f,'H06');
  assert.ok(f.home.produced.ingots>=40);
  assert.equal(f.home.hazardStorage,100);
  assert.deepEqual(f.home.moduleBlueprints,['cabin','shielded']);
  assert.ok(f.player.credits>0);
  assert.equal(f.home.grants.filter(g=>g.source==='quest_H05').length,1);
  f.game.store.close();
});

test('Bau bindet Kosten genau einmal, Parallelreparaturen sind erlaubt und fremde Eingriffe bleiben gesperrt', () => {
  const f=fixture();begin(f);
  const credits=f.player.credits,stock=f.entity.market.goods.ingots.stock;
  assert.equal(command(f,'homeRepair',{facility:'waterworks'}),undefined);
  assert.match(command(f,'homeRepair',{facility:'waterworks'}),/bereits/);
  assert.equal(f.player.credits,credits-250);assert.equal(f.entity.market.goods.ingots.stock,stock-4);
  assert.equal(command(f,'homeRepair',{facility:'foodplant'}),undefined);
  advance(f,29);assert.equal(f.home.facilities.waterworks.status,'building');
  advance(f,1);assert.equal(f.home.facilities.waterworks.status,'ready');
  assert.match(command(f,'cTransfer'),/nicht übertragbar/);
  const other=f.game.createPlayer('Fremder');f.game.revealAround(other,f.entity.x,f.entity.y,1000);
  assert.match(runCommand(f.game,other,{cmd:'homeRepair',target:f.entity.id,facility:'refinery'}),/eigenen Ruinenwelt/);
  f.game.store.close();
});

test('Neustart erhält Reparaturtimer, Starthilfen und Heimatidentität ohne neue Pakete', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'spacetrader-home-')),db=path.join(dir,'new.db');
  let f;
  try {
    f=fixture(23,db);begin(f);command(f,'homeRepair',{facility:'waterworks'});advance(f,12);
    const {id}=f.player,homeId=f.entity.id,credits=f.player.credits;
    f.game.close();
    const game=new Game(db,{profile:'homeworld'}),player=game.players.get(id),entity=game.world.entities.get(homeId);
    f={game,player,entity,home:entity.market.homeworld};
    assert.equal(createHomeworld(game,player),entity);
    assert.equal(player.credits,credits);assert.equal(f.home.grants.length,3);
    assert.equal(f.home.facilities.waterworks.status,'building');advance(f,18);
    assert.equal(f.home.facilities.waterworks.status,'ready');
    assert.match(command(f,'homeQuestComplete',{quest:'H01'}),/bereits abgeholt/);
  } finally {if(f?.game.store.db.open)f.game.store.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('Ruinenlandschaft: 48 getrennte reguläre Plätze und eigene Grundanlagenanker', () => {
  const layout=ruinsLayout();assert.equal(layout.slots.filter(s=>s.role==='plot').length,48);
  for(let i=0;i<layout.slots.length;i++)for(const b of layout.slots.slice(i+1)){
    const a=layout.slots[i];assert.ok(Math.abs(a.position[0]-b.position[0])>=(a.footprint[0]+b.footprint[0])/2||Math.abs(a.position[2]-b.position[2])>=(a.footprint[1]+b.footprint[1])/2,a.id+' / '+b.id);
  }
  const terrain=createRuinsTerrain(),environment=createPlanetEnvironment(terrain,'ruins');
  assert.ok(environment.userData.boundaryEdges>=4);environment.userData.dispose();
});
