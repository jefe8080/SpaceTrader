import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Game } from '../server/game.js';
import { GOODS } from '../shared/config.js';
import { newProperty } from '../server/property.js';
import { migrateHomeResources } from '../server/homeworld.js';

// Rohstoffplanet im alten Format (vor PRD 19), wie ihn createHomeworld früher angelegt hat
function legacySource(game, home, good, type, dx, extra = {}) {
  const entity = { id: `${home.id}_source_${good}`, name: `${GOODS[good].name} – Alt`, kind: 'planet', type, radius: 80, size: 1,
    x: home.x + dx, y: home.y + 2000, sector: home.sector, system: home.system,
    market: { strategy: 'homeResource', eff: 0.25, provenance: [{ id: `${home.id}_source_${good}:natural`, source: 'natural_reserve', good, amount: 150 }],
      goods: { [good]: { role: 'produce', rate: 1.2, cap: 600, stock: 450, mod: 1 }, food: { role: 'consume', rate: 0.02, cap: 100, stock: 40, mod: 1 } },
      qxp: 900, lvl: 3, stats: [{ b: 1, p: { [good]: 12 } }], ...extra } };
  game.world.addEntity(entity);
  return entity;
}

function legacyWorld(file) {
  const game = new Game(file, { seed: 42 });
  const player = game.createPlayer('Altbestand'), home = game.world.entities.get(player.homeworld);
  const ice = legacySource(game, home, 'ice', 'ice', 2500);
  const crude = legacySource(game, home, 'crude', 'ocean', -2500);
  const prop = newProperty(crude.id, player.id, game.time);
  prop.upg = { storage: 2 }; prop.extras = ['biomass'];
  game.setOwner(crude, player, prop);
  game.attachBuildings(crude, { entity: crude.id, lvl: { crude: 2 }, factories: [{ recipe: 'refinery', prog: 0.4 }] });
  const route = { id: 'r-legacy', owner: player.id, name: 'Altroute', stops: [{ targetId: ice.id, actions: [] }, { targetId: home.id, actions: [] }] };
  game.routes.set(route.id, route);
  game.close();
  return { player: player.id, ice: ice.id, crude: crude.id, home: home.id, position: { x: ice.x, y: ice.y } };
}

test('Migration stellt alte Rohstoffplaneten auf echte Wirtschaft um und ist idempotent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prd19-'));
  const file = path.join(dir, 'world.db');
  const log = console.log;
  let game, again;
  try {
    const ids = legacyWorld(file);
    const lines = [];
    console.log = (line) => lines.push(String(line));
    game = new Game(file);
    console.log = log;
    assert.ok(lines.some((line) => line.includes('2 Rohstoffplaneten') && line.includes(ids.ice) && line.includes(ids.crude)), 'Migration wird geloggt');
    const ice = game.world.entities.get(ids.ice), crude = game.world.entities.get(ids.crude);
    for (const planet of [ice, crude]) {
      assert.equal(planet.market.strategy, 'planet');
      assert.equal(planet.market.realEconomy, true);
      assert.ok(planet.market.economy.population > 0);
      assert.equal(planet.radius, 80); assert.equal(planet.size, 1);
      assert.match(planet.name, /– Alt$/);
      for (const field of ['lvl', 'qxp', 'storageMul', 'boost', 'yieldBoost', 'bld']) assert.equal(planet.market[field], undefined, field);
    }
    assert.deepEqual({ x: ice.x, y: ice.y }, ids.position);
    assert.equal(ice.market.goods.ice.stock, 450, 'Förderbestand übernommen');
    assert.equal(ice.market.goods.food.stock, 40, 'Nahrung übernommen');
    assert.ok(ice.market.goods.ice.cap > 600);
    assert.deepEqual(ice.market.provenance.filter((p) => p.good === 'ice'), [{ id: `${ids.ice}:ice:migration`, source: 'migration', good: 'ice', amount: 450 }]);
    assert.ok(ice.market.provenance.some((p) => p.good === 'food' && p.source === 'migration'));
    assert.deepEqual(ice.market.stats, [{ b: 1, p: { ice: 12 } }], 'Marktstatistik bleibt');
    // Besitz bleibt, alter Ausbau und Fabriken entfallen
    const prop = game.ownership.get(ids.crude);
    assert.equal(prop.player, ids.player);
    assert.deepEqual(prop.upg, {}); assert.deepEqual(prop.extras, []);
    assert.equal(crude.market.owner, ids.player);
    assert.equal(crude.ownerName, 'Altbestand');
    assert.equal(game.buildings.has(ids.crude), false);
    assert.equal(crude.market.goods.biomass.role, 'produce', 'Ozeanwelt fördert Biomasse aus dem Typ, nicht aus Zusatzproduktion');
    // Routen zeigen weiter auf dieselben Ziele
    assert.deepEqual(game.routes.get('r-legacy').stops.map((s) => s.targetId), [ids.ice, ids.home]);
    game.tick(2);
    const snapshot = JSON.stringify([ice.market.goods, crude.market.goods]);
    game.close(); game = null;
    console.log = (line) => lines.push(String(line));
    const before = lines.length;
    again = new Game(file);
    console.log = log;
    assert.equal(lines.slice(before).filter((line) => line.includes('PRD 19')).length, 0, 'zweiter Start migriert nichts');
    assert.equal(JSON.stringify([again.world.entities.get(ids.ice).market.goods, again.world.entities.get(ids.crude).market.goods]), snapshot);
    assert.deepEqual(migrateHomeResources(again), []);
  } finally {
    console.log = log;
    game?.store.close(); again?.store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Migration deckelt übernommene Bestände auf das neue Lager', () => {
  const game = new Game(':memory:', { seed: 42 });
  const player = game.createPlayer('Deckel'), home = game.world.entities.get(player.homeworld);
  const ice = legacySource(game, home, 'ice', 'ice', 2500);
  ice.market.goods.ice.stock = 1e6;
  assert.deepEqual(migrateHomeResources(game), [ice.id]);
  assert.equal(ice.market.goods.ice.stock, ice.market.goods.ice.cap);
  assert.equal(ice.market.provenance.find((p) => p.source === 'migration' && p.good === 'ice').amount, ice.market.goods.ice.cap);
  game.store.close();
});

test('Start-Prüfung meldet Planeten ohne echte Wirtschaft, bricht aber nicht ab', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prd19-check-'));
  const file = path.join(dir, 'world.db');
  const warn = console.warn;
  let game;
  try {
    game = new Game(file, { seed: 42 });
    const player = game.createPlayer('Prüfung'), home = game.world.entities.get(player.homeworld);
    game.world.addEntity({ id: 'odd-planet', name: 'Sonderling', kind: 'planet', type: 'ice', radius: 70, size: 1, x: home.x + 3000, y: home.y, sector: home.sector, system: home.system,
      market: { strategy: 'planet', goods: { ice: { role: 'produce', rate: 1, cap: 100, stock: 1, mod: 1 } } } });
    game.close(); game = null;
    const lines = [];
    console.warn = (line) => lines.push(String(line));
    game = new Game(file);
    console.warn = warn;
    assert.equal(lines.length, 1);
    assert.match(lines[0], /odd-planet „Sonderling“ \(Typ ice, Strategie planet\).*Korrektur/);
    assert.ok(game.world.entities.has('odd-planet'));
  } finally {
    console.warn = warn;
    game?.store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
