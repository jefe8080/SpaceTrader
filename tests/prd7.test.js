import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { syncHomeQuests } from '../server/quest-activation.js';

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
