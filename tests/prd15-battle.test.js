import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { SHIP_TYPES } from '../shared/config.js';
import { COMBAT, WEAPONS, armorFactor, ensureDamage, blueprint, maxHull } from '../shared/combat.js';
import { applyHit, applyArea, systemExposed } from '../shared/damage.js';
import { startBattle, tickBattle, beginRetreat, joinBattle, endBattle } from '../server/war/battle.js';
import { ransomQuote } from '../server/war/outcome.js';

const unit = (type) => { const ship = { type }; ensureDamage(ship); const bp = blueprint(type); return { ship, u: { state: 'fight', shields: bp.shields.map((s) => s.max), shieldDelay: [], ion: {}, jam: {}, fires: [] } }; };

test('PRD15 Schadenspipeline: Strukturanteil teilt denselben Schaden, Summe nie größer, Überschuss auf Rumpf', () => {
  const { ship, u } = unit('kolibri'); // ohne Schild, Rumpfzonen ohne Panzerung
  const r = applyHit(u, ship, { weapon: 'laser', dmg: 100, rel: 0, sys: 'engine1', now: 0, rnd: 0.99 });
  assert.equal(Math.round(r.hull), 30, '30 % Strukturanteil gehen an den Rumpf');
  assert.equal(Math.round(r.system), Math.round(70 * armorFactor('medium', 0)), '70 % gehen ans System, dort gepanzert');
  assert.ok(r.hull + r.system <= 100);
  // Systemüberschuss nach Zerstörung geht auf den Rumpf
  ship.dmg.sys.engine1 = 5;
  const hull0 = ship.dmg.hull;
  const r2 = applyHit(u, ship, { weapon: 'laser', dmg: 100, rel: 0, sys: 'engine1', now: 0, rnd: 0.99 });
  assert.deepEqual(r2.sysDestroyed, ['engine1']);
  assert.ok(hull0 - ship.dmg.hull > 30, 'Überschuss erhöht den Rumpfschaden');
  // Bereits zerstörtes Zielsystem: Rumpftreffer, kein Zufallssystem
  const sysBefore = { ...ship.dmg.sys };
  const r3 = applyHit(u, ship, { weapon: 'laser', dmg: 50, rel: 0, sys: 'engine1', now: 0, rnd: 0.99 });
  assert.equal(r3.system, 0);
  assert.deepEqual(ship.dmg.sys, sysBefore);
  assert.equal(Math.round(r3.hull), 50);
});

test('PRD15 Schadenspipeline: Schildüberschuss, Durchdringung, Generatorausfall und Kapitulationsschutz', () => {
  const { ship, u } = unit('fregatte');
  const bow = blueprint('fregatte').shields.findIndex((s) => s.k === 'bow');
  u.shields[bow] = 50;
  const r = applyHit(u, ship, { weapon: 'heavy', dmg: 120, rel: 0, sys: null, now: 0, rnd: 0.99 });
  assert.equal(r.shield, 50);
  assert.equal(u.shields[bow], 0);
  assert.ok(Math.abs(r.hull - 70 * armorFactor('medium', WEAPONS.heavy.pen)) < 0.01, 'Überschuss in derselben Schadensart auf passende Panzerung');
  // Torpedo: umgehender Anteil trifft trotz vollem Schild
  const t = unit('fregatte');
  const rt = applyHit(t.u, t.ship, { weapon: 'torpedo', dmg: 400, rel: 0, sys: null, now: 0, rnd: 0.99 });
  assert.ok(rt.hull > 0 && rt.shield > 0);
  // Generator zerstört: zugeordnete Sektoren sofort aus, auch mit Restpunkten; andere Sektoren bleiben
  const g = unit('fregatte');
  const gen = blueprint('fregatte').shields[bow].gen;
  g.ship.dmg.sys[gen] = 0;
  const rg = applyHit(g.u, g.ship, { weapon: 'laser', dmg: 20, rel: 0, sys: null, now: 0, rnd: 0.99 });
  assert.equal(rg.shield, 0);
  const stern = blueprint('fregatte').shields.findIndex((s) => s.k === 'stern');
  const rs = applyHit(g.u, g.ship, { weapon: 'laser', dmg: 20, rel: Math.PI, sys: null, now: 0, rnd: 0.99 });
  assert.ok(rs.shield > 0 && g.u.shields[stern] < blueprint('fregatte').shields[stern].max);
  // Kapitulierte Schiffe erleiden keinen Schaden
  g.u.state = 'surrendered';
  const hull = g.ship.dmg.hull;
  applyHit(g.u, g.ship, { weapon: 'torpedo', dmg: 999, rel: 0, now: 0 });
  assert.equal(g.ship.dmg.hull, hull);
});

test('PRD15 Schadenspipeline: Ionenstörung begrenzt und getrennt von Zerstörung; Flächenwirkung trifft Rumpf einmal', () => {
  const { ship, u } = unit('kolibri');
  for (let i = 0; i < 8; i++) applyHit(u, ship, { weapon: 'ion', dmg: 30, rel: 0, sys: 'engine1', now: i * 0.1, rnd: 0.99 });
  assert.ok(u.jam.engine1 > 0, 'gestört');
  assert.ok(u.jam.engine1 - u.jamStart.engine1 <= COMBAT.ION.MAX + 0.01, 'feste Höchstdauer');
  assert.ok(ship.dmg.sys.engine1 > 0, 'Störung zerstört nicht');
  // Aktive Schilde verhindern Ionenstörung aus dem abgeschirmten Anteil
  const s2 = unit('korvette');
  applyHit(s2.u, s2.ship, { weapon: 'ion', dmg: 30, rel: 0, sys: 'engine1', now: 0, rnd: 0.99 });
  assert.equal(s2.u.ion.engine1 || 0, 0);
  // Fläche: Rumpf je Schiff einmal
  const a = unit('kreuzer');
  const hull0 = a.ship.dmg.hull;
  const res = applyArea('torpedo', 420, [{ unit: a.u, ship: a.ship, dist: 0, rel: Math.PI, systems: [{ id: 'engine1', dist: 10 }, { id: 'engine2', dist: 20 }] }], 0);
  assert.equal(res.length, 1);
  assert.ok(Math.abs(hull0 - a.ship.dmg.hull - res[0].hull) < 0.01, 'genau ein Rumpftreffer');
  assert.ok(a.ship.dmg.sys.engine1 < blueprint('kreuzer').systems.find((s) => s.id === 'engine1').hp, 'benachbarte Hardpoints dürfen Schaden erhalten');
  // Keine Systemtreffer durch den Rumpf auf die Gegenseite
  assert.equal(systemExposed(a.ship, 'engine1', 0), false, 'Heckantrieb vom Bug aus verdeckt');
  assert.equal(systemExposed(a.ship, 'engine1', Math.PI), true);
});

const arena = () => {
  const game = new Game(':memory:', { seed: 3 });
  const p = game.createPlayer('Angreifer'), q = game.createPlayer('Verteidiger');
  const yard = game.world.entities.get('origin_yard');
  const war = game.spawnShip(p, 'korvette', yard);
  const civ = game.spawnShip(q, 'lastesel', yard);
  for (const s of [war, civ]) { s.dockedAt = null; s.state = 'idle'; s.queue = []; }
  war.x = yard.x; war.y = yard.y + 400; civ.x = yard.x + 3000; civ.y = yard.y + 400;
  return { game, p, q, war, civ, yard };
};
const run = (game, secs, dt = 0.1) => { for (let t = 0; t < secs; t += dt) game.tick(dt); };

test('PRD15 Schlacht: Angriffsbefehl eröffnet erst auf Waffenreichweite; Zivil ohne Geleitschutz kapituliert und wird Gefangener', () => {
  const { game, p, q, war, civ } = arena();
  try {
    assert.match(runCommand(game, q, { cmd: 'attack', ships: [civ.id], target: war.id }), /Bewaffnung/, 'Zivilschiffe greifen nicht an');
    assert.equal(runCommand(game, p, { cmd: 'attack', ships: [war.id], target: civ.id }), undefined);
    civ.queue = []; delete civ.fleeFrom;
    game.tick(0.1);
    assert.equal(game.battles.size, 0, 'normale Annäherung eröffnet noch keine Schlacht');
    civ.x = war.x + 400;
    let started = null;
    game.on('battleStart', (b) => { started = b; });
    run(game, 1);
    assert.ok(started, 'Schlacht beginnt auf Waffenreichweite');
    assert.equal(started.units[civ.id].state, 'surrendered', 'kein Geleitschutz -> Kapitulation beim Schlachtbeginn');
    assert.equal(game.battles.size, 0, 'Seite ohne weiterkämpfende Einheiten verliert');
    assert.ok(civ.captive && civ.captive.by === p.id);
    assert.equal(game.ships.get(civ.id).owner, q.id, 'Gefangene bleiben im eigenen Bestand');
    assert.match(runCommand(game, q, { cmd: 'order', ships: [civ.id], order: { t: 'move', x: 0, y: 0 }, append: false }), /Gefangenschaft/);
    const quote = ransomQuote(game, civ);
    assert.equal(quote.price, Math.round(SHIP_TYPES[civ.type].price * 0.25));
    const before = p.credits;
    q.credits = 1e6;
    assert.match(runCommand(game, q, { cmd: 'ransom', ship: civ.id, price: quote.price + 1 }), /Freikaufpreis/);
    assert.equal(runCommand(game, q, { cmd: 'ransom', ship: civ.id, price: quote.price }), undefined);
    assert.equal(p.credits, before + quote.price, 'genau 25 % an den Sieger');
    assert.equal(civ.captive, undefined);
    assert.ok(civ.dockedAt);
    assert.match(runCommand(game, q, { cmd: 'ransom', ship: civ.id, price: quote.price }), /nicht gefangen/, 'keine doppelte Rückgabe');
    assert.ok(p.war.reports[0].result === 'win' && q.war.reports[0].result === 'loss');
  } finally { game.store.close(); }
});

test('PRD15 Schlacht: Mehrzweck kapituliert unter, nicht bei 30 %; Unentschieden gibt Kapitulierte zurück', () => {
  const { game, p, q, war, yard } = arena();
  try {
    const m = game.spawnShip(q, 'pelikan', yard);
    const guard = game.spawnShip(q, 'korvette', yard);
    for (const s of [m, guard]) { s.dockedAt = null; s.x = 300; s.y = 0; }
    const b = startBattle(game, [war], [m, guard]);
    for (const x of Object.values(b.units)) { x.ai = false; x.order = { t: 'ceasefire' }; }
    assert.match(runCommand(game, q, { cmd: 'order', ships: [m.id], order: { t: 'move', x: 0, y: 0 }, append: false }), /kämpft/);
    ensureDamage(m);
    m.dmg.hull = maxHull('pelikan') * 0.3;
    tickBattle(game, b, 0.1);
    assert.notEqual(b.units[m.id].state, 'surrendered', 'genau 30 %: keine Kapitulation');
    m.dmg.hull = maxHull('pelikan') * 0.299;
    tickBattle(game, b, 0.1);
    assert.equal(b.units[m.id].state, 'surrendered');
    endBattle(game, b, null);
    assert.equal(m.captive, undefined, 'Unentschieden: bleibt beim Besitzer');
    assert.equal(m.battle, undefined);
    assert.equal(m.repairHold, true, 'Mehrzweck unter 30 % muss vor erneutem Kampf repariert werden');
    assert.match(runCommand(game, q, { cmd: 'attack', ships: [m.id], target: war.id }), /repariert/);
  } finally { game.store.close(); }
});

test('PRD15 Schlacht: Rückzug braucht Rand, Sprungvorbereitung und keine Sperre; kein Wiederbeitritt; 120 s Stillstand', () => {
  const { game, p, q, war, yard } = arena();
  try {
    const f = game.spawnShip(q, 'fregatte', yard);
    f.dockedAt = null; f.x = 300; f.y = 0;
    const b = startBattle(game, [war], [f]);
    const u = b.units[f.id];
    u.ai = false; u.order = { t: 'ceasefire' };
    b.units[war.id].ai = false; b.units[war.id].order = { t: 'ceasefire' };
    beginRetreat(game, b, u, 'Test');
    u.x = COMBAT.MAP.W / 2; u.y = COMBAT.MAP.H / 2;
    tickBattle(game, b, 0.1);
    assert.equal(u.prep, 0, 'außerhalb des Randbereichs keine Vorbereitung');
    u.x = 50; u.v = 0;
    for (let i = 0; i < 10; i++) tickBattle(game, b, 0.1);
    assert.ok(u.prep > 0 && u.state === 'retreating');
    for (let i = 0; i < 300 && game.battles.has(b.id); i++) tickBattle(game, b, 0.1);
    assert.equal(u.state, 'retreated');
    assert.equal(f.battle, undefined, 'sofort außerhalb der Schlacht');
    assert.ok(Math.hypot(f.x - b.x, f.y - b.y) >= COMBAT.RETREAT_OFFSET - 100, 'sicher außerhalb, ohne Reise in ein anderes System');
    assert.ok(!game.battles.has(b.id), 'Seite ohne Einheiten endet');
    assert.equal(f.battle, undefined);
    // Neue Schlacht: zurückgezogene Einheit darf derselben Schlacht nicht erneut beitreten
    const g = game.spawnShip(q, 'korvette', yard);
    g.dockedAt = null; g.x = 200; g.y = 0;
    const b2 = startBattle(game, [war], [g]);
    b2.retreated.push(f.id);
    assert.equal(joinBattle(game, b2, [f], 'B'), 0);
    // Stillstand: 120 s ohne mögliche Schadenswirkung -> Unentschieden
    for (const x of Object.values(b2.units)) { x.ai = false; x.order = { t: 'ceasefire' }; }
    b2.units[g.id].x = 100; b2.units[war.id].x = COMBAT.MAP.W - 100;
    for (let i = 0; i < 1190; i++) tickBattle(game, b2, 0.1);
    assert.ok(game.battles.has(b2.id), 'vor 120 s noch nicht beendet');
    for (let i = 0; i < 30; i++) tickBattle(game, b2, 0.1);
    assert.ok(!game.battles.has(b2.id));
    assert.equal(q.war.reports[0].result, 'draw');
  } finally { game.store.close(); }
});

test('PRD15 Schlacht: Kriegsschifftrümmer öffentlich abbaubar, verschwinden nach 30 min; Schlacht übersteht Neustart', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prd15-battle-'));
  const file = path.join(dir, 'w.db');
  let game = new Game(file, { seed: 3 });
  try {
    const p = game.createPlayer('A'), q = game.createPlayer('B');
    const yard = game.world.entities.get('origin_yard');
    const a = game.spawnShip(p, 'zerstoerer', yard), d = game.spawnShip(q, 'korvette', yard);
    for (const s of [a, d]) { s.dockedAt = null; s.queue = []; }
    a.x = 0; d.x = 300;
    const b = startBattle(game, [a], [d]);
    for (let i = 0; i < 20; i++) tickBattle(game, b, 0.1);
    const bid = b.id, aHull = a.dmg.hull, dHull = d.dmg.hull;
    game.close();
    game = new Game(file, {});
    const b2 = game.battles.get(bid);
    assert.ok(b2, 'Schlacht gespeichert');
    assert.equal(game.ships.get(a.id).dmg.hull, aHull);
    assert.equal(game.ships.get(d.id).dmg.hull, dHull);
    assert.equal(game.ships.get(d.id).battle, bid);
    // Korvette zerstören -> Trümmer
    game.ships.get(d.id).dmg.hull = 1;
    b2.units[d.id].shields = b2.units[d.id].shields.map(() => 0);
    b2.units[d.id].retreat = { hull: 0, weaponsOut: false, losses: 0, systems: false };
    for (let i = 0; i < 600 && game.battles.has(bid); i++) game.tick(0.1);
    assert.ok(!game.battles.has(bid));
    assert.ok(!game.ships.has(d.id), 'zerstört');
    const debris = [...game.world.entities.values()].filter((e) => e.debris);
    assert.equal(debris.length, 1);
    assert.ok(Math.abs(debris[0].debris.until - game.time - COMBAT.DEBRIS_TTL) < 1, '30 Minuten ab Zerstörung');
    assert.ok(Object.values(debris[0].debris.goods).every((n) => n > 0));
    const id = debris[0].id;
    game.close();
    game = new Game(file, {});
    assert.equal([...game.world.entities.values()].filter((e) => e.debris).length, 1, 'Neustart dupliziert keine Trümmer');
    game.time = game.world.entities.get(id).debris.until + 1;
    game.tick(1);
    assert.ok(!game.world.entities.has(id), 'nach 30 Minuten Spielzeit entfernt');
  } finally { if (game.store.db.open) game.store.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
