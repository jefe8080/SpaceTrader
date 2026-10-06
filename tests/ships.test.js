import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHIP_TYPES, MODULES, PILOT_LICENSES, GOODS, YARD_MARGIN, STEP,
  moduleCapacity, moduleMiningRate, upgradeCost, shipStats, freeFor, sellValue } from '../shared/config.js';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';

test('Kombo-Kapazität: 1 Modul 30, 2 Module 65, 3 Module 100', () => {
  assert.equal(moduleCapacity(0), 0);
  assert.equal(moduleCapacity(1), 30);
  assert.equal(moduleCapacity(2), 65);
  assert.equal(moduleCapacity(3), 100);
});

test('Abbaumodule: jedes weitere +100 % plus Kombo-Bonus', () => {
  assert.equal(moduleMiningRate(1, 1), 1);
  assert.ok(moduleMiningRate(1, 2) > 2);
  assert.ok(moduleMiningRate(1, 3) > 3 * moduleMiningRate(1, 1));
});

test('Schiffskatalog: Klassen, Preisbereiche, Material + Marge ≈ Referenzpreis', () => {
  const byCls = {};
  for (const [t, d] of Object.entries(SHIP_TYPES)) if (!d.npc) (byCls[d.cls] ||= []).push(t);
  assert.equal(byCls.S.length, 3);
  assert.equal(byCls.M.length, 4);
  assert.equal(byCls.L.length, 4);
  assert.equal(byCls.XL.length, 2);
  assert.equal(byCls.F.length, 6, 'je Fraktion ein Schiff');
  const range = { S: [3e3, 15e3], M: [25e3, 120e3], L: [250e3, 1.5e6], XL: [3e6, 10e6], F: [5e6, 12e6] };
  for (const [cls, list] of Object.entries(byCls)) {
    for (const t of list) {
      const d = SHIP_TYPES[t];
      assert.ok(d.price >= range[cls][0] && d.price <= range[cls][1], `${t}: ${d.price}`);
      const mat = Object.entries(d.build).reduce((s, [g, n]) => s + n * GOODS[g].base, 0);
      assert.ok(Math.abs(mat * (1 + YARD_MARGIN) / d.price - 1) < 0.15, `${t}: Material ${mat}`);
    }
  }
});

test('Upgrades: Kosten ×1,6 je Stufe, Tempo ohne Mehrverbrauch', () => {
  assert.ok(Math.abs(upgradeCost('spatz', 2) / upgradeCost('spatz', 1) - STEP) < 0.01);
  const s = { type: 'spatz', upg: { speed: 2, tank: 1, cargo: 3 }, modules: [], cargo: {} };
  const st = shipStats(s);
  assert.ok(st.speed > SHIP_TYPES.spatz.speed && st.tank > SHIP_TYPES.spatz.tank && st.cargo > SHIP_TYPES.spatz.cargo);
});

test('Module belegen 30 Fracht, Gefahrgut und Passagiere nur mit Modul', () => {
  const s = { type: 'lastesel', upg: {}, modules: [], cargo: {} };
  assert.equal(freeFor(s, 'chemicals'), 0, 'ohne Geschirmte Kammer kein Gefahrgut');
  assert.equal(freeFor(s, 'tourists'), 0);
  s.modules = ['shielded', 'shielded', 'cabin'];
  assert.equal(shipStats(s).cargo, SHIP_TYPES.lastesel.cargo - 90);
  assert.equal(freeFor(s, 'chemicals'), 65);
  assert.equal(freeFor(s, 'tourists'), 30);
  s.cargo = { chemicals: 60, ore: 10 };
  assert.equal(freeFor(s, 'chemicals'), 5);
  assert.equal(freeFor(s, 'ore'), SHIP_TYPES.lastesel.cargo - 90 - 10);
});

test('Verkaufswert: 60 % Marktpreis plus 50 % der Upgrades', () => {
  assert.equal(sellValue({ type: 'spatz', upgValue: 1000 }, 4000), 2400 + 500);
});

test('Pilotenlizenz: Klassen, Schiffslimit, Kauf nur am Hub', () => {
  assert.equal(PILOT_LICENSES[1].maxShips, 3);
  assert.deepEqual(PILOT_LICENSES[2].classes, ['S', 'M']);
  const g = new Game(':memory:', { seed: 3 });
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  const yard = g.world.entities.get('origin_yard');
  yard.market.forSale = [{ type: 'lastesel', price: 100 }];
  assert.match(runCommand(g, p, { cmd: 'buyShip', target: yard.id, index: 0 }), /Pilotenlizenz 2/);
  assert.match(runCommand(g, p, { cmd: 'buyLicense', kind: 'pilot' }), /nur am Handels-Hub/);
  // zum Hub
  const hub = g.world.entities.get('origin_hub');
  ship.x = hub.x + hub.radius + 30; ship.y = hub.y; ship.dockedAt = hub.id;
  p.credits = 25000;
  assert.equal(runCommand(g, p, { cmd: 'buyLicense', kind: 'pilot' }), undefined);
  assert.equal(p.pilot, 2);
  assert.equal(p.credits, 5000);
  // Upgrade-Stufe durch Lizenz begrenzt
  ship.dockedAt = yard.id;
  p.credits = 1e7;
  assert.equal(runCommand(g, p, { cmd: 'upgrade', ship: ship.id, line: 'cargo' }), undefined);
  assert.equal(runCommand(g, p, { cmd: 'upgrade', ship: ship.id, line: 'cargo' }), undefined);
  assert.match(runCommand(g, p, { cmd: 'upgrade', ship: ship.id, line: 'cargo' }), /höchstens Stufe 2/);
  assert.equal(ship.upg.cargo, 2);
});

test('Module: Kauf an großer Werft, Ausbau mit 50 % Erstattung', () => {
  const g = new Game(':memory:', { seed: 3 });
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  ship.type = 'lastesel';
  const big = [...g.world.entities.values()].find((e) => e.type === 'bigyard');
  const mod = big.market.modules[0];
  ship.dockedAt = big.id;
  p.credits = 1e6;
  assert.equal(runCommand(g, p, { cmd: 'buyModule', ship: ship.id, module: mod }), undefined);
  assert.deepEqual(ship.modules, [mod]);
  const before = p.credits;
  assert.equal(runCommand(g, p, { cmd: 'removeModule', ship: ship.id, module: mod }), undefined);
  assert.equal(p.credits - before, MODULES[mod].price * 0.5);
  assert.deepEqual(ship.modules, []);
});
