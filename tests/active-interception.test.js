import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { tickInterceptions, runIntercept } from '../server/war/support.js';
import { updateShip } from '../server/ships.js';
import { COMBAT } from '../shared/combat.js';
import { coverAll } from './world-helper.js';

function setup(fn) {
  const game = new Game(':memory:', { seed: 9 });
  try {
    const p = game.createPlayer('Verteidiger'), q = game.createPlayer('Angreifer');
    coverAll(game, p);
    const yard = game.world.entities.get('origin_yard');
    const spawn = (owner, type, x) => {
      const s = game.spawnShip(owner, type, yard);
      Object.assign(s, { x: yard.x + x, y: yard.y, queue: [], dockedAt: null, state: 'idle' });
      game.revealAround(p, s.x, s.y, 100);
      return s;
    };
    const victim = spawn(p, 'lastesel', 10000);
    const enemy = spawn(q, 'fregatte', 5000);
    enemy.queue = [{ t: 'attack', target: victim.id }];
    const guard = spawn(p, 'korvette', 0);
    fn({ game, p, q, spawn, victim, enemy, guard });
  } finally { game.store.close(); }
}

test('Aktives Abfangen rückt vor Schlachtbeginn mit allen verfügbaren Kriegsschiffen aus', () => setup(({ game, p, spawn, enemy, guard }) => {
  const second = spawn(p, 'kreuzer', 100);
  const others = ['lastesel', 'pelikan', 'korvette', 'korvette', 'korvette'].map((t) => spawn(p, t, 0));
  others[2].posture = { mode: 'guard' };
  others[3].posture = { mode: 'passive' };
  others[4].repairHold = true;
  const saved = { t: 'move', x: guard.x - 500, y: guard.y };
  guard.queue = [saved];
  tickInterceptions(game);
  assert.equal(game.battles.size, 0);
  for (const s of [guard, second]) assert.equal(s.queue[0].target, enemy.id);
  assert.equal(guard.queue[1], saved);
  for (const s of others) assert.equal(s.queue.length, 0);
  const oldX = guard.x;
  updateShip(guard, 0.2, game);
  assert.ok(guard.x > oldX, 'realer Anflug statt Teleportation');
  guard.x = enemy.x - 100;
  updateShip(guard, 0.2, game);
  assert.ok(guard.battle);
  assert.equal(enemy.battle, guard.battle);
  second.x = enemy.x - 100;
  updateShip(second, 0.2, game);
  const b = game.battles.get(guard.battle);
  assert.equal(b.units[second.id].side, b.units[guard.id].side);
}));

test('Abfangen respektiert Sichtbarkeit, bestehende Reichweite und militärisches Bündnis', () => setup(({ game, p, spawn, victim, enemy, guard }) => {
  const ally = game.createPlayer('Partner');
  victim.owner = ally.id;
  tickInterceptions(game);
  assert.equal(guard.queue.length, 0);
  p.consortium = ally.consortium = 'bund';
  game.consortia.set('bund', { military: false });
  tickInterceptions(game);
  assert.equal(guard.queue.length, 0);
  game.consortia.get('bund').military = true;
  p.revealed.clear();
  tickInterceptions(game);
  assert.equal(guard.queue.length, 0);
  game.revealAround(p, enemy.x, enemy.y, 100);
  const far = spawn(p, 'korvette', -COMBAT.INTERCEPT);
  tickInterceptions(game);
  assert.equal(guard.queue[0].target, enemy.id);
  assert.equal(far.queue.length, 0);
}));

test('Angriffsabbruch setzt unterbrochene Aufträge fort', () => setup(({ game, guard, enemy }) => {
  const saved = { t: 'wait', secs: 30 };
  guard.queue = [saved];
  tickInterceptions(game);
  enemy.queue = [];
  updateShip(guard, 0.2, game);
  assert.equal(guard.queue[0], saved);
  assert.equal(guard.queue.length, 1);
  assert.equal(guard.battle, undefined);
}));

test('Verfolgungsgrenze bleibt am Ausgangspunkt und wandert nicht mit dem Abfänger', () => setup(({ game, guard, enemy }) => {
  tickInterceptions(game);
  const c = guard.queue[0];
  guard.x += COMBAT.INTERCEPT;
  enemy.x = c.originX + COMBAT.INTERCEPT;
  game.revealAround(game.players.get(guard.owner), enemy.x, enemy.y, 100);
  let flown = false;
  guard.x = enemy.x - 1000;
  assert.equal(runIntercept(guard, c, 0.2, game, () => { flown = true; }), false);
  assert.ok(flown);
  enemy.x++;
  assert.equal(runIntercept(guard, c, 0.2, game, () => assert.fail('kein weiterer Anflug')), true);
  guard.queue.shift();
  tickInterceptions(game);
  assert.equal(guard.queue.length, 0, 'kein erneutes Ausrücken mit verschobenem Ursprung');
}));

test('Sichtbare Planetenraids lösen aktives Abfangen aus', () => setup(({ game, p, enemy, guard }) => {
  const planet = [...game.world.entities.values()].find((e) => e.kind === 'planet' && e.market);
  game.ownership.set(planet.id, { player: p.id });
  enemy.queue = [{ t: 'raid', planet: planet.id }];
  tickInterceptions(game);
  assert.equal(guard.queue[0]?.target, enemy.id);
}));

test('Spiel-Tick erkennt den Angriff bereits vor der Bewegung', () => setup(({ game, guard, enemy }) => {
  game.tick(0.1);
  assert.equal(guard.queue[0]?.target, enemy.id);
  assert.equal(guard.queue[0]?.t, 'intercept');
  assert.equal(game.battles.size, 0);
}));
