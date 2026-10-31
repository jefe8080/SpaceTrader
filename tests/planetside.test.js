import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDING, buildingUpgradeCost, factorySlots, factoryCost, planetFeatures, RECIPE_CATS, RECIPES, LEVEL_FX } from '../shared/config.js';
import { refreshSmuggler } from '../server/quests.js';
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

test('Rezeptkategorien decken alle 46 Rezepte genau einmal ab', () => {
  const all = Object.values(RECIPE_CATS).flatMap((c) => c.recipes);
  assert.equal(all.length, 46);
  assert.deepEqual(new Set(all), new Set(Object.keys(RECIPES)));
  assert.deepEqual(factorySlots('urban'), { bio: 1, chem: 0, heavy: 0, tech: 3 });
});

test('Ausstattung ist deterministisch aus der Planeten-ID, ca. 20 % Schmuggler', () => {
  assert.deepEqual(planetFeatures('e1_2_3'), planetFeatures('e1_2_3'));
  let n = 0;
  for (let i = 0; i < 2000; i++) if (planetFeatures('p' + i).smuggler) n++;
  assert.ok(n > 300 && n < 500, `Schmuggler ${n} / 2000`);
});

test('Manuelle Warengebäude-Upgrades sind als Serverbefehl entfernt', () => {
  const {g,p,planet}=setup();
  const before=JSON.stringify(planet.market.goods);
  assert.ok(cmd(g,p,'bldUpgrade',{target:planet.id,good:'grain'}));
  assert.equal(JSON.stringify(planet.market.goods),before);
  g.close();
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

test('Minispiele: Stundenlimit 20, Einsatz × Pilotenlevel, Gewinn zahlt doppelt', () => {
  const g = new Game(':memory:', { seed: 12 });
  const p = g.createPlayer('Mia');
  p.credits = 1e6;
  // Planet mit Taverne suchen
  const e = [...g.world.entities.values()].find((x) => x.kind === 'planet' && x.market && (planetFeatures(x.id).fun.includes('tavern')));
  g.revealAround(p, e.x, e.y, 2000);
  const s = g.shipsOf(p.id)[0];
  Object.assign(s, { dockedAt: e.id, state: 'docked' });
  const results = [];
  g.on('mg', (pl, d) => results.push(d));
  let cr = p.credits;
  for (let i = 0; i < 20; i++) {
    assert.equal(cmd(g, p, 'mgPlay', { target: e.id, building: 'tavern', game: 'dice', stake: 2 }), undefined);
    const r = results.at(-1);
    assert.equal(r.stake, 50 * 1);
    assert.equal(p.credits, cr + (r.win ? 50 : -50));
    const sum = (a) => a[0] + a[1];
    assert.equal(sum(r.outcome.you) > sum(r.outcome.bank), r.win, 'Ablauf passt zum Ergebnis');
    cr = p.credits;
  }
  assert.match(cmd(g, p, 'mgPlay', { target: e.id, building: 'tavern', game: 'dice', stake: 0 }), /Croupier macht Pause/);
  g.time += 3601;
  assert.equal(cmd(g, p, 'mgPlay', { target: e.id, building: 'tavern', game: 'highlow', stake: 0, choice: { first: 8, guess: 'higher' } }), undefined);
  const r = results.at(-1);
  assert.equal(r.outcome.next > 8, r.win);
  assert.match(cmd(g, p, 'mgPlay', { target: e.id, building: 'casino', game: 'slots', stake: 0 }), /gibt es hier nicht/);
});

test('Hund, Bettler und Schmugglerauftrag', () => {
  const g = new Game(':memory:', { seed: 12 });
  const p = g.createPlayer('Uwe');
  const find = (k) => [...g.world.entities.values()].find((x) => x.kind === 'planet' && x.market && planetFeatures(x.id)[k] && x.sector === '0,0');
  const dock = (e) => { g.revealAround(p, e.x, e.y, 2000); Object.assign(g.shipsOf(p.id)[0], { dockedAt: e.id, state: 'docked', x: e.x + e.radius + 20, y: e.y }); };
  const d = find('dog');
  dock(d);
  assert.equal(cmd(g, p, 'dogPet', { target: d.id }), undefined);
  assert.equal(p.dogUntil, g.time + 300);
  const b = find('beggar');
  dock(b);
  const s = g.shipsOf(p.id)[0];
  s.fuel = 10;
  const cr = p.credits;
  assert.equal(cmd(g, p, 'beg', { target: b.id }), undefined);
  assert.equal(p.credits, cr - 10);
  assert.ok(Math.abs(s.fuel - 9.5) < 1e-9);
  const sm = find('smuggler');
  dock(sm);
  refreshSmuggler(g, sm);
  const o = sm.market.smug.offer;
  assert.ok(o && o.smuggler && o.reward.xp === 0);
  assert.equal(cmd(g, p, 'smugAccept', { target: sm.id, ship: s.id }), undefined);
  assert.equal(p.quest.smuggler, true);
  assert.equal(sm.market.smug.offer, null);
});

test('Schmuggler: Wurmloch-Tipp deckt unbekannten Eingang auf, ohne XP; danach nichts mehr', () => {
  const g = new Game(':memory:', { seed: 12 });
  const p = g.createPlayer('Ole');
  p.credits = 1e6;
  for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) g.world.ensureSector(q, r);
  const sm = [...g.world.entities.values()].find((x) => x.kind === 'planet' && x.market && planetFeatures(x.id).smuggler
    && g.world.sectorEntities(x.sector).some((w) => w.kind === 'wormhole' && w.sector === x.sector));
  assert.ok(sm, 'Planet mit Schmuggler und Wurmloch im Sektor');
  g.revealAround(p, sm.x, sm.y, 2000);
  Object.assign(g.shipsOf(p.id)[0], { dockedAt: sm.id, state: 'docked' });
  const holes = g.world.sectorEntities(sm.sector).filter((w) => w.kind === 'wormhole' && w.sector === sm.sector);
  const xp = p.xp || 0;
  for (let i = 0; i < holes.length; i++) assert.equal(cmd(g, p, 'whTip', { target: sm.id }), undefined);
  assert.ok(holes.every((w) => g.isKnown(p, w)));
  assert.equal(p.xp || 0, xp, 'keine XP');
  assert.match(cmd(g, p, 'whTip', { target: sm.id }), /nichts mehr zu holen/);
});
