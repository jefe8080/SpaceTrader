import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOODS, RECIPES, PLANET_TYPES, STATION_TYPES, ULTRA, distancePremium, canSellTo, LOCATION, SHIP_TYPES, ECON, SUPPLY, supplyLoad, targetOf } from '../shared/config.js';
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
  assert.ok(far.market.goods.ore.mod >= lo * 1.6 - 1e-3 && far.market.goods.ore.mod <= hi * 1.6 + 1e-3, `ferner Abnehmer +60 % (Rohstoff, Stufe 0): ${far.market.goods.ore.mod}`);
  for (const e of [near, mine, far]) {
    for (const [g, s] of Object.entries(e.market.goods)) if (!canSellTo(s)) assert.ok(s.mod >= lo - 1e-3 && s.mod <= hi + 1e-3, `${g}: Produzent ohne Prämie`);
  }
  const { entities } = generateSector(77, 3, 1);
  for (const e of entities.filter((x) => x.market)) for (const s of Object.values(e.market.goods)) assert.ok(s.mod >= lo - 1e-3 && s.mod <= hi * 2 + 1e-3);
});

test('Drift: Rückkehr zum Ziel-Füllstand mit 45 min Halbwertszeit, nicht bei Spielerbesitz', () => {
  const m = createMarket('station', 'hotel', rng(1), 1, { traders: false });
  const e = { market: m };
  const s = m.goods.tourists;
  assert.ok(s.target >= ECON.TARGET.consume[0] && s.target <= ECON.TARGET.consume[1], 'Verbraucher 30-40 %');
  // leergehandelt: Hintergrundzufluss füllt in einer Halbwertszeit die halbe Lücke
  s.stock = 0;
  for (let t = 0; t < ECON.HALF_LIFE; t += 10) tickMarket(e, 10, t);
  assert.ok(Math.abs(s.stock - s.target * s.cap / 2) < s.cap * 0.01, `halbe Lücke: ${s.stock}`);
  // übervoll: Verbrauch über dem Ziel, höchstens mit der eigenen Rate
  s.stock = s.cap;
  tickMarket(e, 60, 0);
  assert.ok(s.stock < s.cap && s.cap - s.stock <= s.rate * 60 + 1e-9);
  // Spielerbesitz: keine Drift, keine Zuflüsse
  m.owner = 'p1';
  s.stock = 0;
  tickMarket(e, 600, 600);
  assert.equal(s.stock, 0);
  // Produzent: 60-70 %, erholt sich von 0 innerhalb von 2 h auf über 70 % des Ziels
  const pl = createMarket('planet', 'mining', rng(4), 1, { traders: false });
  const ore = pl.goods.ore;
  assert.ok(ore.target >= 0.6 && ore.target <= 0.7);
  ore.stock = 0;
  for (let t = 0; t < 7200; t += 10) tickMarket({ market: pl }, 10, t);
  assert.ok(ore.stock > 0.7 * ore.target * ore.cap, `erholt: ${ore.stock}`);
});

test('Nachfrage-Schwankung: Planeten würfeln den Ziel-Füllstand alle 2-6 h neu', () => {
  const pl = createMarket('planet', 'urban', rng(8), 1, { traders: false });
  const e = { market: pl };
  tickMarket(e, 1, 0);
  const before = Object.fromEntries(Object.entries(pl.goods).map(([g, s]) => [g, s.target]));
  for (const s of Object.values(pl.goods)) assert.ok(s.swingAt >= ECON.SWING_EVERY[0] && s.swingAt <= ECON.SWING_EVERY[1]);
  for (let t = 60; t <= 6.5 * 3600; t += 60) tickMarket(e, 60, t);
  let changed = 0;
  for (const [g, s] of Object.entries(pl.goods)) {
    if (s.target !== before[g]) changed++;
    assert.ok(s.target >= ECON.SWING[s.role][0] && s.target <= ECON.SWING[s.role][1]);
  }
  assert.ok(changed >= Object.keys(pl.goods).length - 1, 'fast alle Ziele neu gewürfelt');
});

test('NPC-Ladung: 10 % des Ziellagers, 5 bis 40, nur was passt', () => {
  assert.equal(supplyLoad({ cap: 300, stock: 0 }), 30);
  assert.equal(supplyLoad({ cap: 1000, stock: 0 }), SUPPLY.LOAD_MAX);
  assert.equal(supplyLoad({ cap: 30, stock: 0 }), SUPPLY.LOAD_MIN);
  assert.equal(supplyLoad({ cap: 300, stock: 288 }), 12);
  assert.equal(supplyLoad({ cap: 300, stock: 297 }), 0);
});

test('Planeten-Abholer: nur in Sektoren mit Spieleraktivität, höchstens einer je Markt und Ware', () => {
  const g = new Game(':memory:', { seed: 9 });
  const planet = g.world.entities.get('origin_urban');
  const food = planet.market.goods.food;
  const plant = g.world.entities.get('origin_foodplant');
  plant.market.goods.food.stock = plant.market.goods.food.cap; // Produzent über dem Ziel
  food.stock = 0;
  food.target = 0.4;
  g.tick(1.5);
  const haulers = () => [...g.ships.values()].filter((s) => s.owner === 'npc' && s.queue[0]?.haul);
  assert.equal(haulers().length, 0, 'ohne Spieler kein Abholer');
  const p = g.createPlayer('Anna');
  // Sensorlauf markiert den Heimatsektor als aktiv; die Quelle kann kurz durch einen Versorger belegt sein
  let h = [];
  for (let i = 0; i < 600 && !h.length; i++) {
    g.tick(1.5);
    h = haulers().filter((s) => s.queue[0].stationId === planet.id && s.queue[0].good === 'food');
    const keys = [...g.ships.values()].filter((s) => s.owner === 'npc').flatMap((s) => [s.queue[0].stationId + ':' + s.queue[0].good, s.queue[0].sourceId + ':' + s.queue[0].good]);
    assert.equal(new Set(keys).size, keys.length, 'höchstens ein NPC-Schiff je Markt und Ware');
  }
  assert.equal(h.length, 1, 'genau ein Abholer für Nahrung');
  assert.equal(h[0].queue[0].amount, supplyLoad(food));
  assert.ok(h[0].queue[0].amount <= SUPPLY.LOAD_MAX);
  // fliegt hin, lädt, liefert ab
  const before = food.stock;
  for (let i = 0; i < 3000 && g.ships.has(h[0].id); i++) g.tick(0.5);
  assert.ok(!g.ships.has(h[0].id), 'Abholer ist fertig');
  assert.ok(food.stock > before, 'Lieferung angekommen');
  assert.ok(p);
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
