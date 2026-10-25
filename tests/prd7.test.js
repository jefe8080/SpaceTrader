import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { syncHomeQuests } from '../server/quest-activation.js';
import { findWreckPosition, correctQuestWreck } from '../server/quest-wreck.js';
import { WORLD } from '../shared/config.js';
import { homeAccess } from '../server/homeworld-operations.js';
import { mainShip } from '../shared/planet-access.js';
import { renamePlanet, PLANET_RENAME_COOLDOWN } from '../server/planet-name.js';
import { pilotProfile } from '../server/pilot-profile.js';

function fixture() {
  const game = new Game(':memory:', { profile: 'homeworld', seed: 42 });
  const player = game.createPlayer('Pilot');
  const home = game.world.entities.get(player.homeworld);
  const ship = game.shipsOf(player.id)[0];
  return { game, player, home, ship };
}

test('PRD7: introductions serialize actual starts and survive repeated synchronization', () => {
  const { game, player } = fixture();
  player.homeQuest.completed = { H00: {}, H01: {}, H02: {} };
  player.homeQuest.introduction = null;
  syncHomeQuests(game, player);
  assert.equal(player.homeQuest.introduction, 'H03');
  assert.equal(player.homeQuest.active.H04, undefined);
  assert.deepEqual(player.homeQuest.pending, ['H04']);
  const journal = player.homeQuest.journal.length;
  syncHomeQuests(game, player);
  assert.equal(player.homeQuest.journal.length, journal);
  assert.equal(runCommand(game, player, { cmd: 'homeDialogRead', scene: 'H04' }), 'Diese Geschichte ist noch nicht verfügbar.');
  assert.equal(runCommand(game, player, { cmd: 'homeDialogRead', scene: 'H03' }), undefined);
  assert.equal(player.homeQuest.introduction, 'H04');
  assert.ok(player.homeQuest.active.H04);
  runCommand(game, player, { cmd: 'homeDialogRead', scene: 'H03' });
  assert.equal(player.homeQuest.introduction, 'H04');
  game.store.close();
});

test('PRD7: actual manual and automated sales count once; partial weighted costs and unknown goods', () => {
  const game=new Game(':memory:',{seed:42}),player=game.createPlayer('Trader'),ship=game.shipsOf(player.id)[0];
  const market={id:'accounting',kind:'station',name:'Handel',market:{goods:{ore:{role:'trade',stock:500,cap:1000,mod:1}}}};
  player.credits=100000;ship.cargo={};ship.dockedAt=market.id;
  const bought=game.trade(ship,market,'ore',20,'buy');
  assert.equal(bought.n,20);assert.equal(pilotProfile(game,player).revenue,0);
  const sold=game.trade(ship,market,'ore',5,'sell',0,{auto:true});
  assert.equal(sold.n,5);
  assert.equal(pilotProfile(game,player).revenue,sold.total);
  assert.ok(Math.abs(pilotProfile(game,player).profit-(sold.total-bought.total/4))<1e-7);
  const rest=game.trade(ship,market,'ore',15,'sell',0,{manual:true});
  assert.equal(pilotProfile(game,player).revenue,sold.total+rest.total);
  assert.ok(Math.abs(pilotProfile(game,player).profit-(sold.total+rest.total-bought.total))<1e-7);
  player.credits+=10000; // quest and other income never count as sales
  assert.equal(pilotProfile(game,player).revenue,sold.total+rest.total);
  ship.cargo.ore=10;game.trade(ship,market,'ore',5,'sell');
  assert.equal(pilotProfile(game,player).profit,null);
  assert.ok(pilotProfile(game,player).unknownRevenue>0);
  game.store.close();
});

test('PRD7: names trim, reject controls, no-op and independent real-time cooldowns', () => {
  const {game,player,home,ship}=fixture();ship.dockedAt=home.id;
  const now=1000000;
  assert.equal(renamePlanet(game,player,home,'  Ähren-Welt  ',now),undefined);
  assert.equal(home.name,'Ähren-Welt');
  assert.equal(renamePlanet(game,player,home,home.name,now+1),undefined);
  assert.equal(home.market.homeworld.renamedAt,now);
  assert.match(renamePlanet(game,player,home,'Andere Welt',now+PLANET_RENAME_COOLDOWN-1),/24 Stunden/);
  for(const name of ['','ab','x'.repeat(33),'Neue\nWelt','Neue\u0000Welt'])assert.equal(typeof renamePlanet(game,player,home,name,now+PLANET_RENAME_COOLDOWN),'string');
  assert.equal(renamePlanet(game,player,home,'Andere Welt',now+PLANET_RENAME_COOLDOWN),undefined);
  const other={...home,id:'other',market:structuredClone(home.market)};
  delete other.market.homeworld.renamedAt;game.world.addEntity(other);ship.dockedAt=other.id;
  assert.equal(renamePlanet(game,player,other,'Andere Welt',now),undefined);
  other.market.homeworld.owner='foreign';
  assert.match(renamePlanet(game,player,other,'Fremde Welt',now),/eigenen/);
  game.store.close();
});

test('PRD7: only installed owned flagship in own network grants remote management; local survives loss', () => {
  const {game,player,home,ship}=fixture();
  home.market.homeworld.controlLevel=1;
  ship.dockedAt=null;ship.x=home.x;ship.y=home.y;
  assert.match(homeAccess(game,player,home),/Keine Verbindung/);
  player.relic={speed:4,location:{kind:'world',id:home.id}};
  assert.equal(mainShip(player,game.ships),null);
  player.relic.location={kind:'ship',id:ship.id};
  assert.equal(mainShip(player,game.ships),ship);
  assert.equal(homeAccess(game,player,home),null);
  player.manualShip='unrelated';
  assert.equal(homeAccess(game,player,home),null);
  ship.x+=100000;
  assert.match(homeAccess(game,player,home),/Keine Verbindung/);
  ship.dockedAt=home.id;
  assert.equal(homeAccess(game,player,home),null);
  ship.dockedAt=null;ship.x=home.x;
  player.relic.location={kind:'world',id:home.id};
  assert.match(homeAccess(game,player,home),/Keine Verbindung/);
  ship.owner='other';player.relic.location={kind:'ship',id:ship.id};
  assert.match(homeAccess(game,player,home),/Keine Verbindung/);
  game.store.close();
});

test('PRD7: wreck geometry, boundary fallback and existing outlier migration', () => {
  const {game,player,home}=fixture(),system=game.world.systems.get(home.system);
  const point=findWreckPosition(game,home);
  assert.ok(Math.hypot(point.x-system.x,point.y-system.y)<=WORLD.SYSTEM_RADIUS-65);
  const wreck={id:'testwreck',...point,x:home.x+9000,kind:'station',sector:home.sector,system:home.system,radius:65};
  game.world.addEntity(wreck);
  player.homeQuest.salvage={wreck:wreck.id,phase:'available'};
  correctQuestWreck(game,player);
  assert.ok(Math.hypot(wreck.x-system.x,wreck.y-system.y)<=WORLD.SYSTEM_RADIUS+400);
  const valid={x:wreck.x,y:wreck.y};correctQuestWreck(game,player);
  assert.deepEqual({x:wreck.x,y:wreck.y},valid);
  const original=game.world.sectorEntities.bind(game.world);
  game.world.sectorEntities=()=>[{id:'blocked',...system,radius:WORLD.SYSTEM_RADIUS-100}];
  const edge=findWreckPosition(game,home);
  assert.ok(Math.hypot(edge.x-system.x,edge.y-system.y)>WORLD.SYSTEM_RADIUS);
  assert.ok(Math.hypot(edge.x-system.x,edge.y-system.y)<=WORLD.SYSTEM_RADIUS+400.001);
  game.world.sectorEntities=original;game.store.close();
});
