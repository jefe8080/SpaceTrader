import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOODS, RECIPES, PLANET_TYPES, STATION_TYPES, ULTRA, distancePremium, selfUse, canSellTo, LOCATION, SHIP_TYPES } from '../shared/config.js';
import { generateSector, applyLocationMods, rng } from '../server/worldgen.js';
import { createMarket, tickMarket } from '../server/markets.js';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';

test('Warenkatalog: ca. 60 Waren, jede mit Produzent und Abnehmer, Stufen bis 5', () => {
  const n = Object.keys(GOODS).length;
  assert.ok(n >= 55 && n <= 65, `${n} Waren`);
  assert.equal(ULTRA.length, 6);
  const prod = new Set(), cons = new Set();
  for (const r of Object.values(RECIPES)) { Object.keys(r.out).forEach((g) => prod.add(g)); Object.keys(r.in).forEach((g) => cons.add(g)); }
  for (const p of Object.values(PLANET_TYPES)) { Object.keys(p.produce).forEach((g) => prod.add(g)); Object.keys(p.consume).forEach((g) => cons.add(g)); }
  for (const s of Object.values(STATION_TYPES)) { (s.extract || []).forEach((g) => prod.add(g)); Object.keys(s.consume || {}).forEach((g) => cons.add(g)); (s.buys || []).forEach((g) => cons.add(g)); }
  for (const g of Object.keys(GOODS)) {
    assert.ok(prod.has(g), `${g} ohne Produzent`);
    if (!GOODS[g].ultra) assert.ok(cons.has(g), `${g} ohne Abnehmer`);
    assert.ok(GOODS[g].base > 0 && GOODS[g].tier >= 0 && GOODS[g].tier <= 5);
  }
  assert.ok(Object.values(GOODS).some((g) => g.tier === 5), 'tiefe Ketten');
  // Kette aus dem PRD: Erz (+Brennstoff) -> Barren (+Hydrauliköl) -> Platten (+Fräser) -> Zahnräder -> Roboter
  assert.ok(RECIPES.smelter.in.ore && RECIPES.smelter.in.fuel && RECIPES.smelter.out.ingots);
  assert.ok(RECIPES.rollingmill.in.ingots && RECIPES.rollingmill.in.hydraulicoil && RECIPES.rollingmill.out.plates);
  assert.ok(RECIPES.gearworks.in.plates && RECIPES.gearworks.in.cutters && RECIPES.gearworks.out.gears);
  assert.ok(RECIPES.robotics.in.gears && RECIPES.robotics.out.robots);
  assert.notEqual(GOODS.shipfuel, GOODS.fuel, 'Schiffstreibstoff und Brennstoff getrennt');
});

test('Entfernungsprämie: progressiv mit Obergrenze', () => {
  assert.equal(distancePremium(1), 0);
  assert.equal(distancePremium(2), 0);
  assert.ok(Math.abs(distancePremium(5) - 0.25) < 1e-9);
  assert.ok(Math.abs(distancePremium(10) - 0.6) < 1e-9);
  assert.equal(distancePremium(60), 1);
  assert.equal(distancePremium(null), 1, 'kein Produzent im Sektor');
  assert.ok(distancePremium(7) > distancePremium(5) && distancePremium(7) < distancePremium(10));
});

test('Standort-Modifier: Zufall, Glättung im System, Prämie nur für angekaufte Waren', () => {
  const r = rng(5);
  const mk = (id, sys, x, kind, type) => ({ id, system: sys, x, y: 0, kind, type, market: createMarket(kind, type, rng(id.length * 7 + x)) });
  const near = mk('a', 's1', 0, 'station', 'smelter');           // kauft Erz
  const mine = mk('b', 's1', 500, 'planet', 'mining');           // produziert Erz, wenige Sekunden entfernt
  const far = mk('c', 's2', 9000 * 10, 'station', 'smelter');    // 10 Minuten bis zur Mine
  applyLocationMods([near, mine, far], r);
  const lo = 1 - LOCATION.RANDOM, hi = 1 + LOCATION.RANDOM;
  assert.ok(near.market.goods.ore.mod >= lo && near.market.goods.ore.mod <= hi, 'naher Abnehmer ohne Prämie');
  assert.ok(far.market.goods.ore.mod >= lo * 1.6 - 1e-3 && far.market.goods.ore.mod <= hi * 1.6 + 1e-3, `ferner Abnehmer +60 %: ${far.market.goods.ore.mod}`);
  for (const e of [near, mine, far]) {
    for (const [g, s] of Object.entries(e.market.goods)) if (!canSellTo(s)) assert.ok(s.mod >= lo - 1e-3 && s.mod <= hi + 1e-3, `${g}: Produzent ohne Prämie`);
  }
  const { entities } = generateSector(77, 3, 1);
  for (const e of entities.filter((x) => x.market)) for (const s of Object.values(e.market.goods)) assert.ok(s.mod >= lo - 1e-3 && s.mod <= hi * 2 + 1e-3);
});

test('Eigenverbrauch: nur über 80 %, 2 % des Überschusses pro Minute, nicht bei Spielerbesitz', () => {
  assert.equal(selfUse(80, 100, 60), 0);
  assert.ok(Math.abs(selfUse(100, 100, 60) - 20 * 0.02) < 1e-9);
  const m = createMarket('station', 'hotel', rng(1), 1, { traders: false });
  const e = { market: m };
  m.goods.tourists.stock = m.goods.tourists.cap;
  m.goods.tourists.rate = 0;
  tickMarket(e, 60, 0);
  assert.ok(m.goods.tourists.stock < m.goods.tourists.cap);
  m.owner = 'p1';
  m.goods.tourists.stock = m.goods.tourists.cap;
  tickMarket(e, 60, 60);
  assert.equal(m.goods.tourists.stock, m.goods.tourists.cap);
});

test('Händlerrolle: Planeten 5-10 Händler-Waren, Ultraselten nur am Hub', () => {
  const { entities } = generateSector(31, -1, 2);
  for (const e of entities.filter((x) => x.market)) {
    const trade = Object.entries(e.market.goods).filter(([, s]) => s.role === 'trade');
    if (e.kind === 'planet') assert.ok(trade.length >= 5 && trade.length <= 10, `${e.name}: ${trade.length}`);
    for (const [g, s] of Object.entries(e.market.goods)) {
      if (GOODS[g].ultra && canSellTo(s)) assert.equal(e.type, 'hub', `${g} angekauft bei ${e.name}`);
      if (GOODS[g].ultra) assert.notEqual(s.role, 'trade');
    }
  }
  const hub = entities.find((x) => x.type === 'hub');
  for (const g of ULTRA) assert.equal(hub.market.goods[g].role, 'consume');
  assert.ok(entities.some((x) => x.ultra), 'mindestens ein Produzent ultraseltener Waren');
});

test('Treibstoff: Verbrauch im Flug, leerer Tank 30 %, Auto-Tanken beim Andocken', () => {
  const g = new Game(':memory:', { seed: 9 });
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  const tank = SHIP_TYPES[ship.type].tank;
  assert.equal(ship.fuel, tank);
  ship.dockedAt = null;
  runCommand(g, p, { cmd: 'order', ships: [ship.id], order: { t: 'move', x: ship.x + 1500, y: ship.y } });
  g.tick(1);
  assert.ok(ship.fuel < tank && ship.fuel > tank * 0.99, 'Verbrauch im Flug');
  ship.fuel = 0;
  const x0 = ship.x;
  g.tick(1);
  assert.ok(Math.abs(ship.x - x0 - SHIP_TYPES[ship.type].speed * 0.3) < 1, 'nur 30 % Tempo');
  assert.ok(ship.warn.fuel);
  runCommand(g, p, { cmd: 'order', ships: [ship.id], order: { t: 'goto', target: 'origin_fuel' } });
  ship.fuel = 0.1;
  for (let i = 0; i < 4000 && ship.queue.length; i++) g.tick(0.5);
  assert.equal(ship.dockedAt, 'origin_fuel');
  assert.ok(ship.fuel > tank * 0.95, `aufgetankt: ${ship.fuel}`);
  assert.ok(!ship.warn.fuel);
  assert.ok(ship.tot.fuel > 0, 'Treibstoffkosten in der Statistik');
});

test('Almanach: Rezepte werden über die Sensoren entdeckt', () => {
  const g = new Game(':memory:', { seed: 9 });
  const p = g.createPlayer('Anna');
  assert.ok(p.known.recipe.has('st:smelter'), 'Schmelzwerk im Startsystem');
  assert.ok(p.known.recipe.has('pl:mining'));
  assert.ok(!p.known.recipe.has('st:aiforge'));
});
