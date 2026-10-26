import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHIP_TYPES, MODULES, PILOT_LICENSES, GOODS, YARD_MARGIN, STEP, FACTIONS, ABILITIES,
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
  for (const [t, d] of Object.entries(SHIP_TYPES)) if (!d.npc && !d.faction) (byCls[d.cls] ||= []).push(t);
  assert.equal(byCls.S.length, 3);
  assert.equal(byCls.M.length, 4);
  assert.equal(byCls.L.length, 4);
  assert.equal(byCls.XL.length, 2);
  const range = { S: [3e3, 15e3], M: [25e3, 120e3], L: [250e3, 1.5e6], XL: [3e6, 10e6] };
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
  assert.equal(freeFor(s, 'ore'), SHIP_TYPES.lastesel.cargo - 90 - 10 + 5);
});

test('Verkaufswert: 60 % Marktpreis plus 50 % der Upgrades', () => {
  assert.equal(sellValue({ type: 'spatz', upgValue: 1000 }, 4000), 2400 + 500);
});

test('Pilotenlizenz: Klassen, unbegrenzte Flotte, Kauf nur am Hub', () => {
  assert.equal('maxShips' in PILOT_LICENSES[1], false);
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
  assert.match(runCommand(g, p, { cmd: 'buyLicense', kind: 'pilot' }), /Pilotenlevel 2/, 'Lizenz doppelt gesperrt: Level und Credits');
  p.xp = 100;
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

test('Hauptschiff: Tempo ×4, Verbrauch ×4 pro Sekunde, keine Routen, 5 min Sperre', () => {
  const g = new Game(':memory:', { seed: 3 });
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  const base = shipStats(ship).speed;
  runCommand(g, p, { cmd: 'routeSave', name: 'R', stops: [{ targetId: 'origin_fuel', actions: [] }], assign: [ship.id] });
  assert.equal(ship.queue[0].t, 'route');
  assert.equal(runCommand(g, p, { cmd: 'flagship', ship: ship.id }), undefined);
  assert.ok(ship.main);
  assert.equal(ship.queue.length, 0, 'Routenbefehle entfernt');
  assert.equal(shipStats(ship).speed, base * 4);
  assert.equal(shipStats(ship).burn, 4);
  const route = [...g.routes.values()][0];
  assert.match(runCommand(g, p, { cmd: 'routeAssign', route: route.id, ships: [ship.id], append: false }), /Hauptschiff/);
  assert.match(runCommand(g, p, { cmd: 'flagship', ship: null }), /erst in/);
  g.time += 301;
  assert.equal(runCommand(g, p, { cmd: 'flagship', ship: null }), undefined);
  assert.ok(!ship.main);
  // Verbrauch pro Strecke bleibt gleich
  ship.main = true;
  ship.dockedAt = null;
  const f0 = ship.fuel, x0 = ship.x;
  runCommand(g, p, { cmd: 'order', ships: [ship.id], order: { t: 'move', x: ship.x + 50000, y: ship.y } });
  g.tick(1);
  const perUnitMain = (f0 - ship.fuel) / (ship.x - x0);
  ship.main = false;
  const f1 = ship.fuel, x1 = ship.x;
  g.tick(1);
  const perUnit = (f1 - ship.fuel) / (ship.x - x1);
  assert.ok(Math.abs(perUnitMain / perUnit - 1) < 0.01, `${perUnitMain} vs ${perUnit}`);
});

test('Sensorphalanx: +60 % für das erste, +30 % für jedes weitere Modul', () => {
  assert.equal(shipStats({ type: 'lastesel' }).sensor, 2500);
  assert.equal(shipStats({ type: 'lastesel', modules: ['sensor'] }).sensor, 4000);
  assert.ok(Math.abs(shipStats({ type: 'lastesel', modules: ['sensor', 'sensor', 'sensor'] }).sensor - 5500) < 1e-6);
  assert.equal(MODULES.sensor.name, 'Sensorphalanx');
});

test('Fraktionsschiffe: je Fraktion L, XL und Spezial, Profilwert ca. +50 %, Preis 2,5 × Gegenstück', () => {
  const fac = Object.entries(SHIP_TYPES).filter(([, d]) => d.faction);
  assert.equal(fac.length, 18);
  for (const f of Object.keys(FACTIONS)) {
    const list = fac.filter(([, d]) => d.faction === f).map(([, d]) => d);
    assert.deepEqual(list.map((d) => d.cls).sort(), ['F', 'L', 'XL']);
    assert.deepEqual(list.map((d) => d.rank).sort(), [1, 2, 3]);
    for (const d of list.filter((x) => x.base)) {
      const b = SHIP_TYPES[d.base];
      assert.ok(Math.abs(d.price / (b.price * 2.5) - 1) < 0.15, `${d.name}: Preis`);
      const best = Math.max(d.cargo / b.cargo, d.speed / b.speed, b.mining ? d.mining / b.mining : 0, d.tank / b.tank);
      // Profilwert gegenüber dem Gegenstück; Abbau-Schiffe ohne Abbau beim Gegenstück (Titan) zählen über den Abbau
      assert.ok((best >= 1.3 || (!b.mining && d.mining > 0)) && best <= 2.5, `${d.name}: Profilwert ${best}`);
    }
    const special = list.find((d) => d.cls === 'F');
    assert.ok(ABILITIES[special.ability], `${special.name}: Fähigkeit`);
    assert.ok(special.price > SHIP_TYPES.leviathan.price, 'Senke nach Lizenz 5');
  }
  assert.ok(!PILOT_LICENSES[4].classes.includes('F'));
  assert.ok(PILOT_LICENSES[5].classes.includes('F'));
});

test('Fähigkeiten: Erzbrecher, Quantensegler, Karawane, Stahlkoloss; Werftbonus', () => {
  assert.ok(shipStats({ type: 'f_miners' }).mining.drill > 0, 'Tiefbohren ohne Modul');
  assert.equal(shipStats({ type: 'f_tech', modules: ['sensor'] }).sensor, 2500 * 1.6 * 2);
  assert.equal(shipStats({ type: 'f_nomads' }).burn, 0.5);
  assert.ok(freeFor({ type: 'f_syndicate', cargo: {}, modules: [] }, 'uranium') > 0, 'Gefahrgut ohne Kammer');
  assert.equal(freeFor({ type: 'titan', cargo: {}, modules: [] }, 'uranium'), 0);
  const b = shipStats({ type: 'lastesel', bonus: 0.2 });
  assert.equal(b.speed, SHIP_TYPES.lastesel.speed * 1.2);
  assert.equal(b.cargoTotal, Math.round(SHIP_TYPES.lastesel.cargo * 1.2));
});

test('Fraktionswerft: doppelt gesperrt durch Rang und Lizenz, Währung aus dem Laderaum', () => {
  let g, yard;
  for (let seed = 1; seed < 40 && !yard; seed++) {
    g = new Game(':memory:', { seed });
    for (const [q, r] of [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]) g.world.ensureSector(q, r);
    yard = [...g.world.entities.values()].find((e) => e.market?.strategy === 'factionyard');
  }
  assert.ok(yard, 'Fraktionswerft gefunden');
  assert.equal(yard.market.forSale.length, 3);
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  g.revealAround(p, yard.x, yard.y, 1500);
  ship.x = yard.x + yard.radius + 28; ship.y = yard.y; ship.dockedAt = yard.id;
  const lIdx = yard.market.forSale.findIndex((it) => SHIP_TYPES[it.type].cls === 'L');
  const it = yard.market.forSale[lIdx];
  p.credits = 1e9;
  p.pilot = 3;
  assert.match(runCommand(g, p, { cmd: 'buyFactionShip', target: yard.id, index: lIdx }), /Rang 1/);
  for(let i=0;i<13;i++)g.spawnShip(p,'spatz',yard);
  p.rep = { [yard.faction]: 100 };
  p.pilot = 2;
  assert.match(runCommand(g, p, { cmd: 'buyFactionShip', target: yard.id, index: lIdx }), /Pilotenlizenz 3/);
  p.pilot = 3;
  assert.match(runCommand(g, p, { cmd: 'buyFactionShip', target: yard.id, index: lIdx }), /Es fehlen/);
  ship.type = 'lastesel';
  ship.modules = ['shielded', 'shielded', 'shielded', 'shielded'];
  ship.cargo[it.currency.good] = it.currency.n;
  assert.equal(runCommand(g, p, { cmd: 'buyFactionShip', target: yard.id, index: lIdx }), undefined);
  assert.equal(g.shipsOf(p.id).length, 15);
  assert.equal(yard.market.forSale.length, 3, 'dauerhaft im Angebot');
  assert.match(runCommand(g, p, { cmd: 'buyShip', target: yard.id, index: 0 }), /Fraktionswerft/);
});

test('Bestellslot: Anzahlung 2 × Katalogpreis, Vorrang beim Bau, 10 min Vorkaufsrecht', () => {
  const g = new Game(':memory:', { seed: 3 });
  const p = g.createPlayer('Anna');
  const q = g.createPlayer('Bert');
  const ship = g.shipsOf(p.id)[0];
  const yard = g.world.entities.get('origin_yard');
  const m = yard.market;
  p.credits = 100000;
  assert.match(runCommand(g, p, { cmd: 'yardOrder', target: yard.id, type: 'kolibri' }), /Almanach/);
  g.discover(p, 'ship', 'kolibri');
  g.discover(p, 'ship', 'seekuh');
  assert.match(runCommand(g, p, { cmd: 'yardOrder', target: yard.id, type: 'seekuh' }), /nur Klasse S und M/);
  const before = p.credits;
  assert.equal(runCommand(g, p, { cmd: 'yardOrder', target: yard.id, type: 'kolibri' }), undefined);
  assert.equal(before - p.credits, SHIP_TYPES.kolibri.price * 2);
  g.discover(q, 'ship', 'spatz');
  assert.match(runCommand(g, q, { cmd: 'yardOrder', target: yard.id, type: 'spatz' }), /Bestellt: Kolibri/);
  // Vorrang: auch mit vollem Angebot wird die Bestellung gebaut, sobald das Material da ist
  m.forSale = [{ type: 'spatz', price: 1 }, { type: 'spatz', price: 1 }, { type: 'spatz', price: 1 }];
  m.building = null;
  for (const [gd, n] of Object.entries(SHIP_TYPES.kolibri.build)) m.goods[gd].stock = n;
  g.tick(1.5);
  assert.equal(m.building?.type, 'kolibri');
  m.building.remaining = 0;
  g.tick(1.5);
  assert.equal(m.order, null);
  const idx = m.forSale.findIndex((it) => it.ordered);
  assert.ok(idx >= 0 && m.forSale.length === 4, 'viertes Schiff im Angebot');
  // Fremder darf in den ersten 10 min nicht kaufen
  const qs = g.shipsOf(q.id)[0];
  qs.x = ship.x; qs.y = ship.y; qs.dockedAt = yard.id;
  q.credits = 1e6;
  assert.match(runCommand(g, q, { cmd: 'buyShip', target: yard.id, index: idx }), /reserviert/);
  ship.dockedAt = yard.id;
  assert.equal(runCommand(g, p, { cmd: 'buyShip', target: yard.id, index: idx }), undefined);
  assert.ok(g.shipsOf(p.id).some((s) => s.type === 'kolibri'));
});
