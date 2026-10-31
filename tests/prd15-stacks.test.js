import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { shipStats } from '../shared/config.js';

const setup = (file = ':memory:') => {
  const game = new Game(file, { seed: 7 });
  const p = game.createPlayer('Stapler');
  const yard = game.world.entities.get('origin_yard');
  const a = game.shipsOf(p.id)[0];
  const b = game.spawnShip(p, 'lastesel', yard);
  const c = game.spawnShip(p, 'kolibri', yard);
  for (const s of [a, b, c]) { s.dockedAt = null; s.state = 'idle'; }
  a.x = 0; a.y = 0; b.x = 600; b.y = 0; c.x = 0; c.y = 900;
  return { game, p, a, b, c, yard };
};
const run = (game, secs, dt = 0.1) => { for (let t = 0; t < secs; t += dt) game.tick(dt); };

test('PRD15 U01: Stack entsteht erst am Treffpunkt und nur beim selben Besitzer', () => {
  const { game, p, a, b } = setup();
  try {
    assert.equal(runCommand(game, p, { cmd: 'stackJoin', ships: [b.id], target: a.id }), undefined);
    assert.equal(b.stack, undefined, 'bei Auftragserteilung noch kein Stack');
    game.tick(0.1);
    assert.equal(b.stack, undefined);
    run(game, 8);
    assert.ok(a.stack && a.stack === b.stack);
    assert.equal(game.stacks.size, 1);
    assert.deepEqual(game.stacks.get(a.stack).members, [a.id, b.id]);
    // Fremder Spieler kann nicht beitreten
    const q = game.createPlayer('Fremd');
    const foreign = game.shipsOf(q.id)[0];
    assert.match(runCommand(game, q, { cmd: 'stackJoin', ships: [foreign.id], target: a.id }), /Unbekanntes Schiff/);
  } finally { game.store.close(); }
});

test('PRD15 U01: Stack reist mit dem langsamsten Mitglied; jedes Schiff steckt höchstens in einem Stack', () => {
  const { game, p, a, b, c } = setup();
  try {
    runCommand(game, p, { cmd: 'stackJoin', ships: [b.id], target: a.id });
    run(game, 8);
    runCommand(game, p, { cmd: 'stackJoin', ships: [c.id], target: b.id });
    run(game, 10);
    const st = game.stacks.get(a.stack);
    assert.deepEqual(st.members, [a.id, b.id, c.id]);
    const ids = [...game.stacks.values()].flatMap((s) => s.members);
    assert.equal(new Set(ids).size, ids.length);
    const slow = Math.min(...[a, b, c].map((s) => shipStats(s).speed));
    assert.equal(game.shipSpeed(a), slow);
    const x0 = a.x;
    assert.equal(runCommand(game, p, { cmd: 'order', ships: [a.id], order: { t: 'move', x: a.x + 5000, y: a.y }, append: false }), undefined);
    run(game, 2, 0.1);
    assert.ok(Math.abs(a.x - x0 - slow * 2) < slow * 0.25, 'Leitschiff fliegt mit Tempo des langsamsten');
    for (const m of [b, c]) assert.ok(Math.hypot(m.x - a.x, m.y - a.y) < 80, 'Mitglieder folgen in Formation');
    assert.ok(b.fuel < shipStats(b).tank, 'Mitglieder verbrauchen eigenen Treibstoff');
  } finally { game.store.close(); }
});

test('PRD15 U01: Treibstoffmangel eines Mitglieds blockiert sichtbar, ohne es zurückzulassen', () => {
  const { game, p, a, b } = setup();
  try {
    runCommand(game, p, { cmd: 'stackJoin', ships: [b.id], target: a.id });
    run(game, 8);
    b.fuel = 0.01;
    const x0 = a.x;
    runCommand(game, p, { cmd: 'order', ships: [a.id], order: { t: 'move', x: a.x + 200000, y: a.y }, append: false });
    run(game, 1);
    assert.equal(a.x, x0);
    assert.match(a.warn.stack, /Treibstoff/);
    assert.equal(game.stacks.get(a.stack).members.length, 2);
    b.fuel = shipStats(b).tank;
    run(game, 3);
    assert.ok(a.x > x0, 'nach Wegfall des Hindernisses geht es weiter');
    assert.equal(a.warn.stack, undefined);
  } finally { game.store.close(); }
});

test('PRD15 U01: Einzelauswahl, Ablösen per Bewegungsbefehl und Reihenfolge', () => {
  const { game, p, a, b, c } = setup();
  try {
    runCommand(game, p, { cmd: 'stackJoin', ships: [b.id, c.id], target: a.id });
    run(game, 12);
    const st = game.stacks.get(a.stack);
    assert.deepEqual(st.members, [a.id, c.id, b.id], 'schnellerer Kolibri trifft zuerst ein');
    assert.equal(runCommand(game, p, { cmd: 'stackMove', stack: st.id, ship: b.id, dir: -1 }), undefined);
    assert.deepEqual(st.members, [a.id, b.id, c.id]);
    assert.equal(runCommand(game, p, { cmd: 'order', ships: [c.id], order: { t: 'move', x: 9000, y: 9000 }, append: false }), undefined);
    assert.equal(c.stack, undefined, 'eigener Bewegungsbefehl löst das Mitglied');
    assert.deepEqual(st.members, [a.id, b.id]);
    assert.match(runCommand(game, p, { cmd: 'stackMove', stack: st.id, ship: a.id, dir: -1 }), /nicht möglich/);
    assert.equal(runCommand(game, p, { cmd: 'stackDetach', ship: b.id }), undefined);
    assert.equal(game.stacks.size, 0, 'Stack mit einem Schiff löst sich auf');
  } finally { game.store.close(); }
});

test('PRD15 U01: Routenstacks nur innerhalb derselben Route; geordnete Abarbeitung; Neustart erhält Stacks', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prd15-stacks-'));
  const file = path.join(dir, 'w.db');
  let { game, p, a, b, c, yard } = setup(file);
  try {
    const hub = game.world.entities.get('origin_hub');
    const stops = [{ targetId: yard.id, actions: [] }, { targetId: hub.id, actions: [] }];
    assert.equal(runCommand(game, p, { cmd: 'routeSave', name: 'R1', stops, assign: [a.id, b.id] }), undefined);
    assert.equal(runCommand(game, p, { cmd: 'routeSave', name: 'R2', stops, assign: [c.id] }), undefined);
    const [r1, r2] = [...game.routes.values()];
    runCommand(game, p, { cmd: 'routeStackNo', route: r1.id, ship: a.id, n: 3 });
    runCommand(game, p, { cmd: 'routeStackNo', route: r1.id, ship: b.id, n: 3 });
    runCommand(game, p, { cmd: 'routeStackNo', route: r2.id, ship: c.id, n: 3 });
    run(game, 15);
    assert.ok(a.stack && a.stack === b.stack, 'gleiche Nummer gleicher Route bildet Stack');
    assert.equal(c.stack, undefined, 'gleiche Nummer anderer Route bleibt getrennt');
    const sid = a.stack, pid = p.id;
    game.close();
    game = new Game(file, {});
    p = game.players.get(pid);
    assert.deepEqual(game.stacks.get(sid).members.length, 2);
    assert.equal(game.ships.get(game.stacks.get(sid).members[1]).stack, sid);
  } finally { if (game.store.db.open) game.store.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
