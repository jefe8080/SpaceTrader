import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { OBJECT_GUIDE, entityGuideKey, buildingGuideKey } from '../shared/object-guide.js';
import { STATION_TYPES, PLANET_TYPES, BELT_TYPES } from '../shared/goods.js';
import os from 'node:os';
import path from 'node:path';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { migrateNewHullInventory, initializeNewHull, applyPhysicalHull } from '../server/physical-yards.js';
import { shipStats } from '../shared/ships.js';
import { cleanupPersonalSites } from '../server/quest-cleanup.js';
import { revealHomeSites } from '../server/homequests.js';

test('PRD11: registered object types have illustrated guides without location spoilers', () => {
  for (const [kind,prefix,types] of [['station','st:',STATION_TYPES],['planet','pl:',PLANET_TYPES],['belt','bt:',BELT_TYPES]]) {
    for (const type of Object.keys(types)) {
      const key = entityGuideKey({kind,type});
      assert.equal(key,prefix+type);
      assert.ok(OBJECT_GUIDE[key]);
    }
  }
  for (const entry of Object.values(OBJECT_GUIDE)) {
    assert.ok(entry.intro && entry.points.length);
    assert.ok(fs.existsSync('client' + entry.image), entry.image);
    assert.ok(!('coordinates' in entry));
  }
  assert.notEqual(buildingGuideKey({homeOrbital:true},{market:{homeworld:{orbital:{large:true}}}}), buildingGuideKey({homeOrbital:true},{}));
});

test('PRD11: quest cleanup keeps unlocked finds and pending archives, removes completed personal sites and references', () => {
  const game=new Game(':memory:',{profile:'homeworld',seed:42});
  const p=game.createPlayer('Sites A'), other=game.createPlayer('Sites B'), home=game.world.entities.get(p.homeworld);
  p.homeQuest.completed.H09={at:0};
  revealHomeSites(game,p,home);
  const find=game.world.entities.get(p.homeQuest.sites.acidex); assert.ok(find);
  cleanupPersonalSites(game,p);assert.ok(game.world.entities.has(find.id));
  const archive={...find,id:'archive-completed',archiveKey:'H09'};
  const pending={...find,id:'archive-pending',archiveKey:'H14'};
  const foreign={...find,id:'foreign',archiveOwner:other.id};
  for(const e of [archive,pending,foreign])game.world.addEntity(e);
  const ship=game.shipsOf(p.id)[0];ship.dockedAt=find.id;ship.manualDock=find.id;ship.queue=[{t:'goto',target:archive.id}];ship.moduleCargo={acidex:1};
  game.routes.set('cleanup-route',{id:'cleanup-route',owner:p.id,stops:[{targetId:archive.id},{targetId:home.id}]});
  p.homeQuest.finds={acidex:{ship:ship.id}};
  const removed=[];game.on('entityRemoved',e=>removed.push(e.id));cleanupPersonalSites(game,p);
  assert.ok(!game.world.entities.has(find.id));assert.ok(!game.world.entities.has(archive.id));
  assert.ok(game.world.entities.has(pending.id));assert.ok(game.world.entities.has(foreign.id));
  assert.equal(ship.dockedAt,null);assert.equal(ship.manualDock,undefined);assert.deepEqual(ship.queue,[]);assert.equal(ship.moduleCargo.acidex,1);
  assert.deepEqual(game.routes.get('cleanup-route').stops,[{targetId:home.id}]);
  for(const ids of game.world.cellIndex.values())assert.ok(!ids.includes(find.id)&&!ids.includes(archive.id));
  revealHomeSites(game,p,home);cleanupPersonalSites(game,p);assert.equal(removed.length,2);
  game.close();
});

test('PRD11: old unclaimed new hulls get fuel once, used and active ships retain fuel', () => {
  const game = new Game(':memory:',{profile:'homeworld',seed:42});
  const p = game.createPlayer('Fuel'), home = game.world.entities.get(p.homeworld);
  const active = game.shipsOf(p.id)[0]; active.fuel=1;
  const fresh = {id:'old:new',source:'materials',type:'spatz',fuel:0,upg:{tank:1}};
  const used = {id:'old:used',source:'player_sale',type:'spatz',fuel:2};
  const orbital = {id:'old:orbital',source:'materials',type:'spatz',fuel:0};
  home.market.forSale=[fresh,used]; home.market.homeworld.orbital={inventory:[orbital]};
  migrateNewHullInventory(game);
  assert.equal(fresh.fuel,shipStats({...fresh,modules:[]}).tank);
  assert.equal(orbital.fuel,shipStats({...orbital,upg:{},modules:[]}).tank);
  assert.equal(used.fuel,2); assert.equal(active.fuel,1);
  fresh.fuel=3; initializeNewHull(fresh); assert.equal(fresh.fuel,3);
  const claimed=game.spawnShip(p,'spatz',home);applyPhysicalHull(claimed,fresh);assert.equal(claimed.fuel,3);
  used.initialFuelGranted=false;applyPhysicalHull(claimed,used);assert.equal(claimed.fuel,2);
  game.close();
});

test('PRD11: guide acknowledgements are validated, idempotent, saved and player specific', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'prd11-'));
  const file = path.join(dir,'game.db');
  const game = new Game(file,{profile:'homeworld',seed:42});
  const a = game.createPlayer('Guide A'), b = game.createPlayer('Guide B');
  for (let i=0;i<2;i++) assert.equal(runCommand(game,a,{cmd:'guideRead',key:'st:hub'}),undefined);
  assert.deepEqual(a.guideRead,['st:hub']);
  assert.equal(b.guideRead,undefined);
  assert.ok(runCommand(game,a,{cmd:'guideRead',key:'unknown'}));
  game.save();
  const restored = new Game(file,{profile:'homeworld',seed:42});
  assert.deepEqual(restored.players.get(a.id).guideRead,['st:hub']);
  assert.equal(restored.players.get(b.id).guideRead,undefined);
  restored.store?.close?.(); game.store?.close?.();
});

test('PRD11: loading legacy inventory and completed sites migrates once and stays consistent on a second reload',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prd11-migration-')),file=path.join(dir,'game.db');
  let game=new Game(file,{profile:'homeworld',seed:42});
  const p=game.createPlayer('Migration'),owner=p.id,home=game.world.entities.get(p.homeworld),ship=game.shipsOf(p.id)[0];
  const activeId=ship.id;ship.fuel=1;
  home.market.forSale=[{id:'new-stock',source:'materials',type:'spatz',fuel:0},{id:'used-stock',source:'player_sale',type:'spatz',fuel:2}];
  const site={id:'legacy-site',kind:'station',type:'wreck',name:'Altarchiv',x:home.x+300,y:home.y,sector:home.sector,system:home.system,archiveOwner:p.id,archiveKey:'H09'};
  game.world.addEntity(site);p.homeQuest.sites={H09:site.id};p.homeQuest.completed.H09={at:0};
  ship.queue=[{t:'goto',target:site.id}];game.close();
  for(let i=0;i<2;i++){
    game=new Game(file,{profile:'homeworld',seed:42});
    const player=game.players.get(owner),e=game.world.entities.get(player.homeworld);
    assert.ok(!game.world.entities.has(site.id));assert.deepEqual(game.ships.get(activeId).queue,[]);
    assert.equal(game.ships.get(activeId).fuel,1);
    assert.equal(e.market.forSale[0].fuel,shipStats({type:'spatz',upg:{},modules:[]}).tank);
    assert.equal(e.market.forSale[1].fuel,2);
    revealHomeSites(game,player,e);assert.ok(!game.world.entities.has(site.id));game.close();
  }
  fs.rmSync(dir,{recursive:true,force:true});
});
