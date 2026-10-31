import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Game } from '../server/game.js';
import { GOODS } from '../shared/config.js';
import { FACTION_WAR as F } from '../shared/warfare.js';
import { ensureFactionSectors, prepareAdminMarket, supplyDelivery, receiveGoods, capOf } from '../server/war/factions.js';
import { diplo } from '../server/war/diplomacy.js';
import { serializeEntity } from '../server/net.js';
import { applyLevel } from '../server/markets.js';
import { questProgress } from '../server/quests.js';

function fixture(file = ':memory:') {
  const game = new Game(file, { seed: 21, profile: 'homeworld' });
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) game.world.ensureSector(q, r);
  ensureFactionSectors(game);
  const faction = [...game.fsecs.values()][0];
  assert.ok(faction);
  const admin = game.world.entities.get(faction.admin);
  const player = game.createPlayer('Admin-Test');
  const ship = game.spawnShip(player, 'lastesel', admin);
  return { game, faction, admin, player, ship };
}

test('Verwaltungsmarkt migriert Bestände einmalig, erhält Grundversorgung und übersteht Neustarts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-migration-'));
  const file = path.join(dir, 'world.db');
  let game;
  try {
    const f = fixture(file); game = f.game;
    const { admin, faction } = f, originalId = admin.id;
    admin.name = 'Alter Planet'; delete admin.adminOriginalName;
    delete faction.adminMarketVersion;
    faction.pool = 100; faction.supply = { water: 20, food: 10 };
    admin.market.strategy = 'planet';
    admin.market.goods = {
      water: { role: 'consume', stock: 400, cap: 500, rate: 1 },
      food: { role: 'consume', stock: 15, cap: 500, rate: 1 },
      ore: { role: 'produce', stock: 7, cap: 500, rate: 1 },
      finegold: { role: 'consume', stock: 2, cap: 500, rate: 1 },
    };
    game.close();
    game = new Game(file, { profile: 'homeworld' });
    const migrated = game.world.entities.get(originalId), fs1 = game.fsecs.get(faction.key);
    const expected = 100 + 7 * GOODS.ore.base + 2 * F.GOLD_RATE;
    assert.equal(fs1.pool, expected);
    assert.deepEqual(fs1.supply, { water: 420, food: 25 });
    assert.deepEqual(Object.keys(migrated.market.goods), ['water', 'food']);
    assert.match(migrated.name, /^Alter Planet – Verwaltungszentrum \(/);
    assert.equal(serializeEntity(migrated).admin, faction.faction);
    const name = migrated.name;
    prepareAdminMarket(game, fs1);
    assert.equal(fs1.pool, expected);
    assert.equal(migrated.market.goods.water.stock, 420);
    game.close();
    game = new Game(file, { profile: 'homeworld' });
    assert.equal(game.world.entities.get(originalId).name, name);
    assert.equal(game.fsecs.get(faction.key).pool, expected);
    assert.deepEqual(game.fsecs.get(faction.key).supply, { water: 420, food: 25 });
    for (let i = 0; i < 600; i++) game.tick(.1);
    assert.deepEqual(Object.keys(game.world.entities.get(originalId).market.goods), ['water', 'food']);
  } finally { if (game?.store.db.open) game.store.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('Manueller und Routenhandel nutzen denselben Pool/Puffer und blockieren andere Waren', () => {
  const { game, faction, admin, player, ship } = fixture();
  try {
    faction.pool = 10000; faction.supply = { water: 0, food: 0 };
    ship.cargo = { water: 20, food: 20, ore: 10, workers: 5 };
    const balance = player.credits;
    for (const options of [{ manual: true }, { auto: true, route: 'test-route' }]) {
      assert.equal(game.trade(ship, admin, 'ore', 1, 'sell', 0, options).n, 0);
      assert.equal(game.trade(ship, admin, 'workers', 1, 'sell', 0, options).n, 0);
      assert.equal(game.trade(ship, admin, 'water', 1, 'buy', 0, options).n, 0);
      assert.equal(game.trade(ship, admin, 'water', 1, 'sell', GOODS.water.base + 1, options).n, 0);
      const result = game.trade(ship, admin, 'water', 1, 'sell', GOODS.water.base, options);
      assert.equal(result.n, 1); assert.equal(result.total, GOODS.water.base);
    }
    assert.equal(faction.supply.water, 2);
    assert.equal(admin.market.goods.water.stock, 2);
    assert.equal(player.credits, balance + 2 * GOODS.water.base);
    assert.ok(Math.abs(faction.pool - (10000 - 2 * GOODS.water.base)) < 1e-8);
    faction.supply.water = F.BUFFER;
    assert.equal(game.trade(ship, admin, 'water', 1, 'sell').n, 0);
    assert.equal(ship.cargo.water, 18);
    faction.supply.water = 0; faction.pool = 0;
    assert.equal(game.trade(ship, admin, 'water', 1, 'sell').n, 0);
    faction.pool = GOODS.water.base;
    assert.equal(game.trade(ship, admin, 'water', 10, 'sell').n, 1);
    assert.equal(faction.pool, 0);
  } finally { game.store.close(); }
});

test('Feindliche Versorgung erfordert ausdrückliche Abgabe; Beute bleibt nutzbar und Pool gedeckelt', () => {
  const { game, faction, admin, player, ship } = fixture();
  try {
    const other = [...game.fsecs.values()].find(f => f.faction !== faction.faction);
    assert.ok(other); diplo(player).friends = [other.faction];
    ship.cargo = { water: 5 }; faction.supply.water = 0;
    const before = player.credits, pool = faction.pool;
    assert.equal(game.trade(ship, admin, 'water', 5, 'sell').n, 0);
    assert.equal(supplyDelivery(game, player, ship, 'water', 5, true), null);
    assert.equal(faction.supply.water, 5);
    assert.equal(player.credits, before); assert.equal(faction.pool, pool);
    assert.equal(receiveGoods(faction, 'food', 5), 5);
    faction.pool = capOf(faction) - 1;
    receiveGoods(faction, 'ore', 100);
    assert.equal(faction.pool, capOf(faction));
    faction.level++;
    applyLevel(admin);
    assert.deepEqual(Object.keys(admin.market.goods), ['water', 'food']);
    assert.equal(admin.market.goods.water.cap, F.BUFFER * faction.level);
    assert.equal(admin.market.goods.water.rate, F.DEMAND_PER_MIN * faction.level / 60);
  } finally { game.store.close(); }
});

test('Fraktionsquest wandelt Sonderwaren in Pool um; voller Versorgungspuffer erhält Quest und Ladung', () => {
  const { game, faction, admin, player, ship } = fixture();
  try {
    const quest = (good) => ({ id: 'admin-quest', type: 'procure', giver: admin.id, giverName: admin.name,
      good, amount: 5, faction: faction.faction, adminSector: faction.key, reward: { cr: 0, xp: 0 } });
    faction.pool = 100; faction.supply = { water: 10, food: 10 };
    ship.cargo = { ore: 5, water: 5 };
    player.quest = quest('ore');
    const credits = player.credits;
    assert.equal(questProgress(game, player, ship), true);
    assert.equal(faction.pool, 100 + 5 * GOODS.ore.base);
    assert.equal(player.credits, credits);
    player.quest = quest('water'); faction.supply.water = F.BUFFER;
    assert.equal(questProgress(game, player, ship), false);
    assert.equal(ship.cargo.water, 5); assert.ok(player.quest);
    faction.supply.water = 10;
    assert.equal(questProgress(game, player, ship), true);
    assert.equal(faction.supply.water, 15);
  } finally { game.store.close(); }
});
