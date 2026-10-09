import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDING, buildingUpgradeCost, factorySlots, factoryCost, planetFeatures, RECIPE_CATS, RECIPES, LEVEL_FX } from '../shared/config.js';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import * as await_import from '../server/markets.js';

const cmd = (g, p, name, args = {}) => runCommand(g, p, { cmd: name, ...args });
function setup() {
  const g = new Game(':memory:', { seed: 12 });
  const p = g.createPlayer('Pia');
  p.credits = 1e9;
  const planet = [...g.world.entities.values()].find((e) => e.kind === 'planet' && !e.noBuy && !e.faction && e.market && e.type === 'agrar')
    || [...g.world.entities.values()].find((e) => e.kind === 'planet' && !e.noBuy && !e.faction && e.market);
  g.revealAround(p, planet.x, planet.y, 3000);
  const ship = g.shipsOf(p.id)[0];
  Object.assign(ship, { dockedAt: planet.id, state: 'docked', x: planet.x + planet.radius + 20, y: planet.y });
  return { g, p, planet, ship };
}

test('Rezeptkategorien decken alle 40 Rezepte genau einmal ab', () => {
  const all = Object.values(RECIPE_CATS).flatMap((c) => c.recipes);
  assert.equal(all.length, 40);
  assert.deepEqual(new Set(all), new Set(Object.keys(RECIPES)));
  assert.deepEqual(factorySlots('urban'), { bio: 1, chem: 0, heavy: 0, tech: 3 });
});

test('Ausstattung ist deterministisch aus der Planeten-ID, ca. 20 % Schmuggler', () => {
  assert.deepEqual(planetFeatures('e1_2_3'), planetFeatures('e1_2_3'));
  let n = 0;
  for (let i = 0; i < 2000; i++) if (planetFeatures('p' + i).smuggler) n++;
  assert.ok(n > 300 && n < 500, `Schmuggler ${n} / 2000`);
});

test('Gebäude-Ausbau: Rate +20 % und Lager +15 % je Level, ohne Besitz bis 6, Questgeber-XP', () => {
  const { g, p, planet, ship } = setup();
  const [good, s] = Object.entries(planet.market.goods).find(([, x]) => x.role === 'produce');
  const rate0 = s.rate, cap0 = s.cap;
  const cost = buildingUpgradeCost(planet, 1);
  assert.match(cmd(g, p, 'bldUpgrade', { target: planet.id, good }), /fehlen/);
  ship.cargo = { ...cost.goods };
  const cr = p.credits, xp = p.xp || 0;
  assert.equal(cmd(g, p, 'bldUpgrade', { target: planet.id, good }), undefined);
  assert.equal(p.credits, cr - cost.credits);
  assert.ok(Math.abs(s.rate - rate0 * (1 + BUILDING.RATE)) < 1e-9);
  assert.equal(s.cap, Math.round(cap0 * (1 + BUILDING.STORAGE)));
  assert.ok(planet.market.qxp > 0, 'Questgeber-XP');
  assert.equal(p.xp || 0, xp, 'keine Piloten-XP');
  g.buildingsOf(planet).lvl[good] = 6;
  assert.match(cmd(g, p, 'bldUpgrade', { target: planet.id, good }), /nur für den Besitzer/);
  // Level 10 gespeichert, ohne Besitz auf 6 gedeckelt
  g.buildingsOf(planet).lvl[good] = 10;
  const { applyLevel } = await_import;
  applyLevel(planet);
  const L = planet.market.lvl || 0;
  assert.ok(Math.abs(s.rate - s.baseRate * (1 + LEVEL_FX.PLANET_RATE * L) * (1 + BUILDING.RATE * 6)) < 1e-9);
});

test('Fabrik-Bauplätze: nur eigene Planeten, Kategorie-Grenze, Fabrik läuft aus dem Planetenlager', () => {
  const { g, p, planet, ship } = setup();
  const slots = factorySlots(planet.type);
  const cat = Object.keys(slots).find((k) => slots[k] > 0);
  const recipe = RECIPE_CATS[cat].recipes[0];
  assert.match(cmd(g, p, 'facBuild', { target: planet.id, recipe }), /eigenen Planeten/);
  p.governor = 3; p.faction = { name: 'Pias', color: '#00ff00' };
  assert.equal(cmd(g, p, 'buyProperty', { target: planet.id }), undefined);
  ship.cargo = { plates: 100, machinery: 20 };
  const cr = p.credits;
  for (let i = 0; i < slots[cat]; i++) assert.equal(cmd(g, p, 'facBuild', { target: planet.id, recipe }), undefined);
  assert.equal(p.credits, cr - slots[cat] * factoryCost(recipe).credits);
  assert.match(cmd(g, p, 'facBuild', { target: planet.id, recipe }), /Keine freien Bauplätze/);
  const r = RECIPES[recipe];
  for (const [gd, n] of Object.entries(r.in)) planet.market.goods[gd].stock = Math.min(planet.market.goods[gd].cap, n * 50);
  const out = Object.keys(r.out)[0];
  const before = planet.market.goods[out].stock;
  for (let i = 0; i < 30; i++) g.tick(1);
  assert.ok(planet.market.goods[out].stock > before, 'Fabrik produziert');
  assert.equal(cmd(g, p, 'facDemolish', { target: planet.id, index: 0 }), undefined);
  assert.equal(g.buildingsOf(planet).factories.length, slots[cat] - 1);
});
