import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { diffMarket } from '../server/net.js';
import { unitPrice, buyPrice, sellPrice, GOODS, PRICE } from '../shared/config.js';

test('Preisformel: Basispreis × Standort-Modifier × Füllstandskurve ± Spread', () => {
  const g = 'ore', base = GOODS[g].base;
  assert.equal(unitPrice(g, 0, 100), base * PRICE.MAX_FACTOR);
  assert.ok(Math.abs(unitPrice(g, 100, 100) - base * PRICE.MIN_FACTOR) < 1e-9);
  // höhere Stufen: engere Spanne
  assert.ok(Math.abs(unitPrice('robots', 0, 100) / unitPrice('robots', 100, 100) - 1.3 / 0.7) < 1e-9);
  assert.ok(unitPrice(g, 30, 100) > unitPrice(g, 60, 100));
  assert.ok(Math.abs(unitPrice(g, 50, 100, 1.25) - unitPrice(g, 50, 100) * 1.25) < 1e-9, 'Modifier wirkt linear');
  const slot = { stock: 50, cap: 100, mod: 1.1 };
  const u = unitPrice(g, 50, 100, 1.1);
  assert.ok(Math.abs(buyPrice(g, slot) - u * (1 + PRICE.SPREAD)) < 1e-9);
  assert.ok(Math.abs(sellPrice(g, slot) - u * (1 - PRICE.SPREAD)) < 1e-9);
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
  assert.equal(runCommand(g, p, { cmd: 'stop', ships: [foreign.id] }), 'Unbekanntes Schiff.');
  assert.equal(runCommand(g, p, { cmd: 'order', ships: [ship.id], order: { t: 'move', x: 'a', y: 0 } }), 'Zahl außerhalb von -1000000000 bis 1000000000.');
  assert.equal(runCommand(g, p, { cmd: 'order', ships: [ship.id], order: { t: 'goto', target: 'xyz' } }), 'Unbekanntes Ziel.');
  assert.equal(runCommand(g, p, { cmd: 'order', ships: [ship.id], order: { t: 'teleport' } }), 'Ungültiger Wert.');
  assert.equal(runCommand(g, p, { cmd: 'rename', ship: ship.id, name: 'x'.repeat(30) }), 'Text muss 1 bis 24 Zeichen lang sein.');
  assert.equal(runCommand(g, p, { cmd: 'groupRename', group: 'g99', name: 'x' }), 'Unbekannte Gruppe.');
  assert.equal(runCommand(g, p, { cmd: 'order', ships: [ship.id], order: { t: 'move', x: 10, y: 20 } }), undefined);
  assert.equal(ship.queue[0].t, 'move');
});

test('Markt-Delta enthält nur Änderungen', () => {
  const a = { stock: { ore: 1, ice: 2 }, extra: '{"eff":1}' };
  assert.deepEqual(diffMarket(null, a), { s: { ore: 1, ice: 2 }, x: { eff: 1 } });
  assert.equal(diffMarket(a, { stock: { ore: 1, ice: 2 }, extra: '{"eff":1}' }), null);
  assert.deepEqual(diffMarket(a, { stock: { ore: 1, ice: 3 }, extra: '{"eff":1}' }), { s: { ice: 3 } });
});

test('Befehlsqueue: ersetzen, anhängen, abarbeiten', () => {
  const g = new Game(':memory:', { seed: 7 });
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  const order = (o, append = false) => runCommand(g, p, { cmd: 'order', ships: [ship.id], order: o, append });
  assert.equal(order({ t: 'wait', secs: 2 }), undefined);
  assert.equal(order({ t: 'move', x: ship.x + 50, y: ship.y }, true), undefined);
  assert.equal(order({ t: 'goto', target: 'origin_smelter' }, true), undefined);
  assert.deepEqual(ship.queue.map((c) => c.t), ['wait', 'move', 'goto']);
  for (let i = 0; i < 25; i++) g.tick(0.1);
  assert.ok(!ship.queue.some((c) => c.t === 'wait'), 'Warten nach 2 s beendet');
  for (let i = 0; i < 400 && ship.queue.length; i++) g.tick(0.25);
  assert.equal(ship.queue.length, 0);
  assert.equal(ship.dockedAt, 'origin_smelter');
  assert.ok(ship.tot.dist > 0 && ship.tot.f >= 1, 'Strecke und Flüge gezählt');
  order({ t: 'wait', secs: 5 });
  assert.deepEqual(ship.queue.map((c) => c.t), ['wait'], 'Ersetzen leert die Queue');
});

test('Routenvorlage: mehrere Schiffe, Änderung wirkt auf alle, Stop-Loss', () => {
  const g = new Game(':memory:', { seed: 7 });
  const p = g.createPlayer('Anna');
  const s1 = g.shipsOf(p.id)[0];
  const s2 = g.spawnShip(p, 'spatz', g.world.entities.get('origin_yard'));
  const stops = [
    { targetId: 'origin_mining', actions: [{ op: 'buy', good: 'ore' }] },
    { targetId: 'origin_smelter', actions: [{ op: 'sell', good: 'ore' }] },
  ];
  assert.equal(runCommand(g, p, { cmd: 'routeSave', name: 'Erz', stops, assign: [s1.id, s2.id] }), undefined);
  const route = [...g.routes.values()][0];
  assert.equal(s1.queue[0].route, route.id);
  assert.equal(s2.queue[0].route, route.id);
  // Stop-Loss über dem Kontostand: kein automatischer Einkauf
  runCommand(g, p, { cmd: 'stopLoss', value: p.credits + 1 });
  for (let i = 0; i < 300; i++) g.tick(0.5);
  assert.equal(s1.cargo.ore || 0, 0);
  assert.ok(s1.warn.stoploss, 'Stop-Loss-Warnung am Schiff');
  runCommand(g, p, { cmd: 'stopLoss', value: 0 });
  for (let i = 0; i < 600; i++) g.tick(0.5);
  assert.ok(g.routeSummary(route).h1 !== 0 || s1.tot.buy > 0, 'Route handelt');
  // Vorlage ändern: beide Schiffe fahren die neue Version
  runCommand(g, p, { cmd: 'routeSave', id: route.id, name: 'Neu', stops: stops.slice(0, 1) });
  assert.equal(g.routes.get(route.id).stops.length, 1);
  runCommand(g, p, { cmd: 'routeDelete', route: route.id });
  assert.ok(!s1.queue.some((c) => c.t === 'route') && !s2.queue.some((c) => c.t === 'route'));
});

test('Umbenennen: eindeutig je Spieler', () => {
  const g = new Game(':memory:', { seed: 7 });
  const p = g.createPlayer('Anna');
  const s1 = g.shipsOf(p.id)[0];
  const s2 = g.spawnShip(p, 'spatz', g.world.entities.get('origin_yard'));
  assert.notEqual(s1.name, s2.name);
  assert.equal(runCommand(g, p, { cmd: 'rename', ship: s2.id, name: s1.name.toUpperCase() }), 'Diesen Namen trägt schon ein anderes deiner Schiffe.');
});
