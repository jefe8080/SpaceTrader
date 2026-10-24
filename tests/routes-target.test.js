import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { updateShip } from '../server/ships.js';

function fixture(have, amount = 100, op = 'buy') {
  const game = new Game(':memory:', { seed: 3 });
  const player = game.createPlayer('Route');
  const ship = game.shipsOf(player.id)[0];
  ship.type = 'lastesel';
  ship.cargo = { ore: have, grain: 10 };
  const entity = game.world.entities.get('origin_hub');
  ship.dockedAt = entity.id;
  const route = { id: 'test', name: 'Test', stops: [{ targetId: entity.id, actions: [{ op, good: 'ore', amount }] }] };
  game.routes.set(route.id, route);
  ship.queue = [{ t: 'route', route: route.id }];
  return { game, player, ship, entity, route };
}

test('Routenkauf ergänzt nur die eigene Ware; erreichte Ziele sind erfolgreiche Nullaktionen', () => {
  for (const [have, expected] of [[30, 70], [100, 0], [120, 0]]) {
    const { game, ship } = fixture(have);
    let bought = 0;
    game.trade = (_s, _e, _g, n) => { bought += n; return { n }; };
    ship.fails = { 'origin_hub:buy:ore': 3 };
    ship.warn = { fail: 'alter Fehler' };
    updateShip(ship, 1, game);
    assert.equal(bought, expected);
    assert.equal(ship.fails['origin_hub:buy:ore'], undefined);
    assert.equal(ship.warn.fail, undefined);
    assert.equal(ship.queue[0].phase, 'wait');
    game.store.db.close();
  }
});

test('Leeres Ziel kauft maximal; Routenverkauf und einmaliger Dockkauf bleiben Zusatzmengen', () => {
  for (const [op, amount, once, expected] of [['buy', 0, false, Infinity], ['sell', 20, false, 20], ['buy', 100, true, 100]]) {
    const { game, ship, entity } = fixture(30, amount, op);
    if (once) ship.queue = [{ t: 'dock', target: entity.id, actions: [{ op, good: 'ore', amount }] }];
    let actual;
    game.trade = (_s, _e, _g, n) => { actual = n; return { n: 1 }; };
    updateShip(ship, 1, game);
    assert.equal(actual, expected);
    game.store.db.close();
  }
});

test('Routenziel gilt auch beim kostenlosen Eigentümertransfer und Teilkauf fährt weiter', () => {
  const { game, player, ship, entity } = fixture(30);
  entity.market.owner = player.id;
  game.ownership.set(entity.id, { player: player.id });
  entity.market.goods.ore = { stock: 25, cap: 1000, role: 'producer', mod: 1 };
  const credits = player.credits;
  updateShip(ship, 1, game);
  assert.equal(ship.cargo.ore, 55);
  assert.equal(entity.market.goods.ore.stock, 0);
  assert.equal(player.credits, credits);
  assert.equal(ship.queue[0].phase, 'wait');
  game.store.db.close();
});

test('Routenkauf hält Preisgrenze und Mindestkonto ein; separate Wartebedingung bleibt aktiv', () => {
  for (const priceBlocked of [true, false]) {
    const { game, player, ship, entity, route } = fixture(30);
    entity.market.goods.ore = { stock: 500, cap: 1000, role: 'produce', mod: 1 };
    player.credits = 1000;
    route.minBalance = 950;
    route.stops[0].actions[0].limit = priceBlocked ? 0.001 : 0;
    route.stops[0].actions.push({ op: 'waitUntil', good: 'ore', cond: 'stock>=', value: 999, timeout: 600 });
    updateShip(ship, 1, game);
    assert.ok(player.credits >= 950);
    assert.ok(ship.cargo.ore < 100);
    if (priceBlocked) assert.equal(ship.cargo.ore, 30);
    else assert.ok(ship.cargo.ore > 30);
    assert.equal(ship.state, 'waiting');
    assert.equal(ship.queue[0].actionIdx, 1);
    game.store.db.close();
  }
});
