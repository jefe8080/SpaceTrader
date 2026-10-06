import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixedPrice, fixedRevenuePerHour, fixedConsumptionPerHour, fixedRref, priceWindow, propertyKind, propertyPrice,
  GOVERNOR_LICENSES, SHIP_TYPES, FIXED } from '../shared/config.js';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';

test('Fixpreis-Verbrauch: s = 0,3 bringt doppelt so viel Erlös wie s = 0,7', () => {
  const { pmin, pmax } = priceWindow('food');
  assert.equal(fixedPrice(pmin, pmax, 0), pmin);
  assert.equal(fixedPrice(pmin, pmax, 1), pmax);
  const R = fixedRref(0.5, pmin, pmax);
  assert.ok(Math.abs(fixedRevenuePerHour(R, 0.3) / fixedRevenuePerHour(R, 0.7) - 2) < 1e-9);
  // bei s = 0,7 entspricht der Verbrauch der normalen Rate
  assert.ok(Math.abs(fixedConsumptionPerHour(R, 0.7, pmin, pmax) - 0.5 * 3600) < 1e-6);
  assert.ok(fixedConsumptionPerHour(R, 0.3, pmin, pmax) > 2 * fixedConsumptionPerHour(R, 0.7, pmin, pmax), 'günstiger = deutlich mehr Verbrauch');
});

/** Spieler mit Gouverneurslizenz und Schiff an einem kaufbaren Objekt */
function setup(type = null) {
  const g = new Game(':memory:', { seed: 21 });
  const a = g.createPlayer('Anna');
  const b = g.createPlayer('Bert');
  const target = [...g.world.entities.values()].find((e) => (type ? e.type === type || e.kind === type : e.market?.strategy === 'factory') && propertyKind(e));
  for (const p of [a, b]) g.revealAround(p, target.x, target.y, 3000);
  const ship = g.shipsOf(a.id)[0];
  ship.x = target.x + target.radius + 20; ship.y = target.y; ship.dockedAt = target.id;
  return { g, a, b, target, ship };
}

test('Besitz: Kauf nur mit Lizenz, vor Ort, nicht Hub/Start/Fraktion', () => {
  const { g, a, target, ship } = setup();
  assert.equal(propertyKind(g.world.entities.get('origin_smelter')), null, 'Startsystem nicht kaufbar');
  assert.equal(propertyKind(g.world.entities.get('origin_hub')), null, 'Hub nicht kaufbar');
  assert.match(runCommand(g, a, { cmd: 'buyProperty', target: target.id }), /Gouverneurslizenz/);
  a.governor = 1; a.faction = { name: 'Annas Kontor', color: '#ff0000' };
  a.credits = 1e8;
  ship.dockedAt = null;
  assert.match(runCommand(g, a, { cmd: 'buyProperty', target: target.id }), /vor Ort/);
  ship.dockedAt = target.id;
  const price = propertyPrice(target);
  assert.equal(runCommand(g, a, { cmd: 'buyProperty', target: target.id }), undefined);
  assert.equal(a.credits, 1e8 - price);
  assert.equal(target.market.owner, a.id);
  assert.equal(target.ownerName, 'Annas Kontor');
  // Limit der Lizenz
  const other = [...g.world.entities.values()].find((e) => e !== target && propertyKind(e) === 'factory');
  g.revealAround(a, other.x, other.y, 500);
  ship.dockedAt = other.id;
  assert.match(runCommand(g, a, { cmd: 'buyProperty', target: other.id }), /höchstens 1/);
  // Planeten erst ab Lizenz 3
  const planet = [...g.world.entities.values()].find((e) => propertyKind(e) === 'planet' && e.kind === 'planet');
  g.revealAround(a, planet.x, planet.y, 500);
  ship.dockedAt = planet.id;
  assert.match(runCommand(g, a, { cmd: 'buyProperty', target: planet.id }), /Gouverneurslizenz 3/);
  assert.equal(GOVERNOR_LICENSES[3].unlocks.includes('planet'), true);
});

test('Besitzerwirtschaft: eigenes Lager kostenlos, Fremde zahlen an den Besitzer, Zoll, privat', () => {
  const { g, a, b, target, ship } = setup();
  a.governor = 3; a.faction = { name: 'A', color: '#ff0000' }; a.credits = 1e8;
  runCommand(g, a, { cmd: 'buyProperty', target: target.id });
  const out = Object.keys(target.market.goods).find((x) => target.market.goods[x].role === 'produce');
  target.market.goods[out].stock = 100;
  // Besitzer lädt kostenlos
  const before = a.credits;
  assert.equal(runCommand(g, a, { cmd: 'trade', ship: ship.id, target: target.id, good: out, dir: 'buy', amount: 5 }), undefined);
  assert.equal(a.credits, before);
  assert.equal(ship.cargo[out], 5);
  // Fremder kauft: Besitzer bekommt den Erlös inkl. Zoll
  runCommand(g, a, { cmd: 'propCustoms', target: target.id, value: 0.2 });
  const bs = g.shipsOf(b.id)[0];
  bs.x = ship.x; bs.y = ship.y; bs.dockedAt = target.id;
  b.credits = 1e6;
  const aBefore = a.credits, bBefore = b.credits;
  assert.equal(runCommand(g, b, { cmd: 'trade', ship: bs.id, target: target.id, good: out, dir: 'buy', amount: 3 }), undefined);
  const paid = bBefore - b.credits;
  assert.ok(paid > 0 && Math.abs(a.credits - aBefore - paid) < 1e-6, 'Erlös geht an den Besitzer');
  // Fremder verkauft: Besitzer zahlt; bei leerem Konto nimmt der Markt nichts an
  const inp = Object.keys(target.market.goods).find((x) => target.market.goods[x].role === 'consume' && x !== 'food');
  bs.cargo = { [inp]: 10 };
  a.credits = 0;
  assert.match(runCommand(g, b, { cmd: 'trade', ship: bs.id, target: target.id, good: inp, dir: 'sell', amount: 5 }), /Besitzer kann nicht zahlen/);
  a.credits = 1e6;
  assert.equal(runCommand(g, b, { cmd: 'trade', ship: bs.id, target: target.id, good: inp, dir: 'sell', amount: 5 }), undefined);
  assert.ok(a.credits < 1e6);
  // privat: Fremde handeln nicht
  runCommand(g, a, { cmd: 'propMode', target: target.id, mode: 'private' });
  assert.match(runCommand(g, b, { cmd: 'trade', ship: bs.id, target: target.id, good: out, dir: 'buy', amount: 1 }), /Privater Handel/);
});

test('Fixpreis-Verbrauch eigener Planeten zahlt an den Besitzer', () => {
  const { g, a, target } = setup('planet');
  a.governor = 3; a.faction = { name: 'A', color: '#ff0000' }; a.credits = 1e9;
  runCommand(g, a, { cmd: 'buyProperty', target: target.id });
  const g1 = Object.keys(target.market.goods).find((x) => target.market.goods[x].role === 'consume');
  target.market.goods[g1].stock = target.market.goods[g1].cap;
  const c0 = a.credits;
  for (let i = 0; i < 60; i++) g.tick(1);
  assert.ok(a.credits > c0, 'Erlös aus Fixpreis-Verbrauch');
  assert.equal(g.ownership.get(target.id).fixed[g1], FIXED.DEFAULT);
});

test('Eigene Werft: Bau auf Befehl, Übernahme in die Flotte, Recycling', () => {
  const { g, a, target, ship } = setup('shipyard');
  a.governor = 2; a.faction = { name: 'A', color: '#ff0000' }; a.credits = 1e9;
  assert.equal(runCommand(g, a, { cmd: 'buyProperty', target: target.id }), undefined);
  const m = target.market;
  m.forSale = [];
  for (const [gd, n] of Object.entries(SHIP_TYPES.spatz.build)) m.goods[gd].stock = n;
  assert.match(runCommand(g, a, { cmd: 'yardBuild', target: target.id, type: 'lastesel' }), /Klasse/);
  assert.equal(runCommand(g, a, { cmd: 'yardBuild', target: target.id, type: 'spatz' }), undefined);
  for (let i = 0; i < 60; i++) g.tick(1);
  assert.equal(m.forSale.length, 1);
  assert.ok(m.forSale[0].own);
  assert.equal(runCommand(g, a, { cmd: 'yardClaim', target: target.id, index: 0 }), undefined);
  assert.equal(g.shipsOf(a.id).length, 2);
  const plates = m.goods.plates.stock;
  assert.equal(runCommand(g, a, { cmd: 'recycle', ship: ship.id }), undefined);
  assert.ok(m.goods.plates.stock > plates, 'Material zurück ins Werftlager');
  assert.equal(g.shipsOf(a.id).length, 1);
});

test('Gouverneurslizenz: Fraktionsname beim ersten Erwerb', () => {
  const { g, a, ship } = setup();
  const hub = g.world.entities.get('origin_hub');
  ship.dockedAt = hub.id;
  a.credits = 1e7;
  assert.match(runCommand(g, a, { cmd: 'buyLicense', kind: 'governor' }), /Namen/);
  assert.equal(runCommand(g, a, { cmd: 'buyLicense', kind: 'governor', name: 'Kontor Nord', color: '#00ff00' }), undefined);
  assert.equal(a.governor, 1);
  assert.deepEqual(a.faction, { name: 'Kontor Nord', color: '#00ff00' });
});
