import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { syncHomeQuests } from '../server/quest-activation.js';
import { findWreckPosition, correctQuestWreck } from '../server/quest-wreck.js';
import { WORLD } from '../shared/config.js';

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
