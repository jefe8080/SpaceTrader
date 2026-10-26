import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { updateShip } from '../server/ships.js';
import { BELT_TYPES, freeFor } from '../shared/config.js';

function fixture(type = 'ore', protect = true) {
  const game = new Game(':memory:', { seed: 3 }), player = game.createPlayer('Abbau');
  const ship = game.shipsOf(player.id)[0], good = BELT_TYPES[type]?.good || 'nebulagas';
  Object.assign(ship, { type: 'mammut', cargo: {}, modules: ['drill', 'acidex', 'shielded', 'gascoll'] });
  const source = type === 'gas'
    ? { id: 'source', name: 'Gassammler', kind: 'station', type: 'gasharvester', market: { goods: { [good]: { stock: 500, cap: 1000, role: 'produce', mod: 1 } } } }
    : { id: 'source', name: 'Vorkommen', kind: 'belt', type, richness: 1 };
  game.world.entities.set(source.id, source); ship.dockedAt = source.id; player.credits = 1e9;
  const target = game.world.entities.get('origin_hub');
  target.market.goods = { [good]: { stock: 40, cap: 1000, role: 'trade', mod: 1 } };
  target.market.homeworld = { storage: 1000, hazardStorage: 500, limits: { [good]: 50 } };
  game.ownership.set(target.id, { player: player.id });
  const route = { id: 'extract', owner: player.id, onlyWithTargetSpace: protect, stops: [
    { targetId: source.id, actions: [{ op: type === 'gas' ? 'buy' : 'mine', ...(type === 'gas' ? { good, amount: 0 } : {}) }] },
    { targetId: target.id, actions: [{ op: 'sell', good, amount: 0 }] },
  ] };
  game.routes.set(route.id, route); ship.queue = [{ t: 'route', route: route.id }];
  return { game, player, ship, source, target, route, good };
}
const reserved = ship => (ship.queue[0].destinationReservations || []).reduce((n, r) => n + r.amount, 0);

test('Geschützter Routenabbau beachtet Lagerlimits für alle Feld- und Gerätearten', () => {
  for (const type of Object.keys(BELT_TYPES)) {
    const f = fixture(type);
    try {
      updateShip(f.ship, 100, f.game);
      assert.equal(f.ship.cargo[f.good], 10, type);
      assert.equal(f.ship.mined[f.good], 10, type);
      assert.equal(reserved(f.ship), 10, type);
      assert.equal(f.ship.queue[0].phase, 'wait', type);
      assert.ok(f.ship.mineAcc < 1, 'Überschüssige Abbauzeit erzeugt keinen Vorrat an ganzen Einheiten');
      // The route delivers exactly the bounded load through the real owner transfer.
      Object.assign(f.ship.queue[0], { idx: 1, phase: 'act', actionIdx: 0 }); f.ship.dockedAt = f.target.id;
      updateShip(f.ship, 1, f.game);
      assert.equal(f.target.market.goods[f.good].stock, 50, type);
      assert.equal(f.ship.cargo[f.good], undefined, type);
      assert.equal(reserved(f.ship), 0, type);
    } finally { f.game.store.close(); }
  }
});

test('Abbau überspringt volle/ungeeignete Ziele und erhält bereits geladene Ware', () => {
  for (const mode of ['zero', 'stock', 'cargo', 'no-destination']) {
    const f = fixture();
    try {
      if (mode === 'zero') f.target.market.homeworld.limits.ore = 0;
      if (mode === 'stock') f.target.market.goods.ore.stock = 50;
      if (mode === 'cargo') f.ship.cargo.ore = 10;
      if (mode === 'no-destination') f.route.stops[1].actions = [];
      updateShip(f.ship, 100, f.game);
      assert.equal(f.ship.cargo.ore || 0, mode === 'cargo' ? 10 : 0, mode);
      assert.equal(f.ship.mined?.ore || 0, 0, mode);
      assert.equal(f.ship.queue[0].phase, 'wait', mode);
    } finally { f.game.store.close(); }
  }
});

test('Abbau reserviert nur gewonnene Einheiten über mehrere Ticks und ergänzt vorhandene Fracht', () => {
  const f = fixture();
  try {
    f.ship.cargo.ore = 4;
    updateShip(f.ship, .01, f.game);
    assert.equal(f.ship.cargo.ore, 4); assert.equal(reserved(f.ship), 4);
    for (let i = 0; i < 30 && f.ship.queue[0].phase !== 'wait'; i++) updateShip(f.ship, .01, f.game);
    assert.equal(f.ship.cargo.ore, 10); assert.equal(f.ship.mined.ore, 6);
    assert.equal(reserved(f.ship), 10); assert.equal(f.ship.queue[0].phase, 'wait');
  } finally { f.game.store.close(); }
});

test('Ohne Routenoption und bei manuellem Abbau bleibt der volle Laderaum das Ziel', () => {
  for (const manual of [false, true]) {
    const f = fixture('ore', false);
    try {
      if (manual) f.ship.queue = [{ t: 'mine', target: f.source.id }];
      const capacity = freeFor(f.ship, 'ore');
      updateShip(f.ship, 1000, f.game);
      assert.equal(f.ship.cargo.ore, capacity);
    } finally { f.game.store.close(); }
  }
});

test('Nebelgas-Sammlerstationen begrenzen Käufe durch Ziel-Lagerlimit und reservieren Teilmengen', () => {
  const f = fixture('gas');
  try {
    updateShip(f.ship, 1, f.game);
    assert.equal(f.ship.cargo.nebulagas, 10); assert.equal(reserved(f.ship), 10);
    assert.equal(f.source.market.goods.nebulagas.stock, 490);
    assert.equal(f.ship.queue[0].phase, 'wait');
  } finally { f.game.store.close(); }
});

test('Bergbau und Gassammlereinkauf können gemeinsamen Zielplatz nicht doppelt belegen', () => {
  const f = fixture();
  try {
    f.target.market.homeworld.storage = 100; f.target.market.homeworld.limits = { ore: 80, nebulagas: 80 };
    f.target.market.goods.ore.stock = 0;
    f.target.market.goods.nebulagas = { stock: 0, cap: 100, role: 'trade', mod: 1 };
    const gas = { id: 'gas', kind: 'station', type: 'gasharvester', name: 'Gassammler', market: { goods: { nebulagas: { stock: 500, cap: 1000, role: 'produce', mod: 1 } } } };
    f.game.world.entities.set(gas.id, gas);
    const route = { id: 'gas-route', owner: f.player.id, onlyWithTargetSpace: true, stops: [
      { targetId: gas.id, actions: [{ op: 'buy', good: 'nebulagas' }] },
      { targetId: f.target.id, actions: [{ op: 'sell', good: 'nebulagas' }] },
    ] };
    f.game.routes.set(route.id, route);
    const second = structuredClone(f.ship); second.id = 'second'; second.dockedAt = gas.id;
    second.queue = [{ t: 'route', route: route.id }]; f.game.ships.set(second.id, second);
    updateShip(f.ship, 100, f.game); updateShip(second, 1, f.game);
    assert.equal(f.ship.cargo.ore, 80); assert.equal(second.cargo.nebulagas, 20);
    assert.equal(reserved(f.ship) + reserved(second), 100);
  } finally { f.game.store.close(); }
});
