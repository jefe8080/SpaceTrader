import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { diffMarket } from '../server/net.js';
import { unitPrice, buyPrice, sellPrice, GOODS, PRICE } from '../shared/config.js';

test('Preisformel: leeres Lager teuer, volles billig, Spread symmetrisch', () => {
  const g = 'ore', base = GOODS[g].base;
  assert.equal(unitPrice(g, 0, 100), base * PRICE.MAX_FACTOR);
  assert.ok(Math.abs(unitPrice(g, 100, 100) - base * PRICE.MIN_FACTOR) < 1e-9);
  assert.ok(unitPrice(g, 30, 100) > unitPrice(g, 60, 100));
  const u = unitPrice(g, 50, 100);
  assert.ok(Math.abs(buyPrice(g, 50, 100) - u * (1 + PRICE.SPREAD)) < 1e-9);
  assert.ok(Math.abs(sellPrice(g, 50, 100) - u * (1 - PRICE.SPREAD)) < 1e-9);
});

test('Persistenz: Spielstand übersteht Speichern und Laden', () => {
  const file = `${process.env.TMPDIR || process.env.TEMP || '.'}/st-test-${process.pid}.db`;
  const g1 = new Game(file, { seed: 42 });
  const p = g1.createPlayer('Testkapitän');
  g1.tick(1);
  const ship = [...g1.ships.values()].find((s) => s.owner === p.id);
  ship.name = 'Persistiert';
  g1.save();
  const second = g1.save();
  assert.equal(second.rows, 0, 'unveränderter Stand schreibt nichts');
  g1.store.close();
  const g2 = new Game(file, { seed: 1 });
  assert.equal(g2.world.seed, 42);
  assert.equal(g2.players.get(p.id).name, 'Testkapitän');
  assert.equal(g2.ships.get(ship.id).name, 'Persistiert');
  assert.ok(g2.players.get(p.id).revealed.size > 0);
  assert.equal(g2.world.entities.size, g1.world.entities.size);
  g2.store.close();
});

test('Command-Handler validieren Eingaben', () => {
  const g = new Game(':memory:', { seed: 7 });
  const p = g.createPlayer('Anna');
  const q = g.createPlayer('Bert');
  const ship = [...g.ships.values()].find((s) => s.owner === p.id);
  const foreign = [...g.ships.values()].find((s) => s.owner === q.id);
  assert.equal(runCommand(g, p, { cmd: 'gibtsnicht' }), 'Unbekannter Befehl.');
  assert.equal(runCommand(g, p, { cmd: 'stop', ship: foreign.id }), 'Unbekanntes Schiff.');
  assert.equal(runCommand(g, p, { cmd: 'move', ship: ship.id, x: 'a', y: 0 }), 'Zahl außerhalb von -1000000000 bis 1000000000.');
  assert.equal(runCommand(g, p, { cmd: 'goto', ship: ship.id, target: 'xyz' }), 'Unbekanntes Ziel.');
  assert.equal(runCommand(g, p, { cmd: 'rename', ship: ship.id, name: 'x'.repeat(30) }), 'Text muss 1 bis 24 Zeichen lang sein.');
  assert.equal(runCommand(g, p, { cmd: 'move', ship: ship.id, x: 10, y: 20 }), undefined);
  assert.deepEqual(ship.orders, { type: 'move', x: 10, y: 20 });
});

test('Markt-Delta enthält nur Änderungen', () => {
  const a = { stock: { ore: 1, ice: 2 }, extra: '{"eff":1}' };
  assert.deepEqual(diffMarket(null, a), { s: { ore: 1, ice: 2 }, x: { eff: 1 } });
  assert.equal(diffMarket(a, { stock: { ore: 1, ice: 2 }, extra: '{"eff":1}' }), null);
  assert.deepEqual(diffMarket(a, { stock: { ore: 1, ice: 3 }, extra: '{"eff":1}' }), { s: { ice: 3 } });
});
