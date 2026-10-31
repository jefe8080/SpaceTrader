import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { ensureDamage, blueprint, maxHull, needsRepair } from '../shared/combat.js';
import { maybeStartRepairRun, nearestRepairSite } from '../server/war/repair.js';

const setup = () => {
  const game = new Game(':memory:', { seed: 5 });
  const p = game.createPlayer('Werft');
  const yard = game.world.entities.get('origin_yard');
  const s = game.spawnShip(p, 'fregatte', yard);
  s.dockedAt = null; s.x = yard.x + 3000; s.y = yard.y; s.queue = [];
  ensureDamage(s);
  return { game, p, s, yard };
};
const run = (game, secs, dt = 0.2) => { for (let t = 0; t < secs; t += dt) game.tick(dt); };

test('PRD15 U07: Schild-, Ionen- und Munitionszustände allein lösen keine Reparaturfahrt aus', () => {
  const { game, s } = setup();
  try {
    s.dmg.ammo = { 0: 0 };
    assert.equal(needsRepair(s), false);
    assert.equal(maybeStartRepairRun(game, s), false);
    s.dmg.hull -= 10;
    assert.equal(maybeStartRepairRun(game, s), true);
  } finally { game.store.close(); }
});

test('PRD15 U07: Reparaturautomatik fährt zur Werft, zahlt einmal, repariert vollständig und setzt die Route fort', () => {
  const { game, p, s, yard } = setup();
  try {
    const hub = game.world.entities.get('origin_hub');
    runCommand(game, p, { cmd: 'routeSave', name: 'R', stops: [{ targetId: hub.id, actions: [] }, { targetId: yard.id, actions: [] }], assign: [s.id] });
    s.queue[0].idx = 1; s.queue[0].phase = 'travel';
    s.dmg.hull = maxHull('fregatte') * 0.5;
    s.dmg.sys.jump1 = 0;
    p.credits = 10;
    assert.equal(maybeStartRepairRun(game, s), true);
    assert.equal(s.queue[0].t, 'repairRun');
    assert.equal(nearestRepairSite(game, s).id, s.queue[0].target);
    run(game, 40);
    assert.match(s.warn.repair || '', /Cr nötig/, 'Geldmangel pausiert sichtbar');
    assert.equal(p.credits, 10, 'keine Schulden, keine Teilzahlung');
    p.credits = 1e7;
    run(game, 3);
    const paid = 1e7 - p.credits;
    assert.ok(paid > 0);
    run(game, 200);
    assert.equal(1e7 - p.credits, paid, 'Zahlung genau einmal');
    assert.equal(s.dmg.hull, maxHull('fregatte'));
    assert.equal(s.dmg.sys.jump1, blueprint('fregatte').systems.find((x) => x.id === 'jump1').hp, 'zerstörte Systeme an der Werft wiederhergestellt');
    assert.equal(s.repairRun, undefined);
    const route = s.queue.find((c) => c.t === 'route');
    assert.ok(route, 'gespeicherter Routenauftrag fortgesetzt');
  } finally { game.store.close(); }
});

test('PRD15 U07: Automatik abschaltbar; manuelle Reparatur nur angedockt mit bestätigtem Preis', () => {
  const { game, p, s, yard } = setup();
  try {
    assert.equal(runCommand(game, p, { cmd: 'autoRepair', ship: s.id, on: false }), undefined);
    s.dmg.hull -= 300;
    assert.equal(maybeStartRepairRun(game, s), false);
    assert.match(runCommand(game, p, { cmd: 'repair', ship: s.id }), /keine Reparatur|Ziel/i);
    s.x = yard.x + yard.radius + 20; s.y = yard.y; s.dockedAt = yard.id;
    assert.match(runCommand(game, p, { cmd: 'repair', ship: s.id, cost: 1 }), /kostet/);
    const before = p.credits;
    assert.equal(runCommand(game, p, { cmd: 'repair', ship: s.id }), undefined);
    assert.ok(p.credits < before);
    run(game, 60);
    assert.equal(s.dmg.hull, maxHull('fregatte'));
  } finally { game.store.close(); }
});

test('PRD15 U07: Bewegungsunfähige Überlebende werden kostenpflichtig geborgen und repariert', () => {
  const { game, p, s } = setup();
  try {
    for (const x of blueprint('fregatte').systems.filter((x) => x.kind === 'engine')) s.dmg.sys[x.id] = 0;
    p.credits = 1e7;
    assert.equal(maybeStartRepairRun(game, s), true);
    assert.equal(s.queue[0].t, 'salvage');
    run(game, 130);
    assert.ok(p.credits < 1e7);
    run(game, 120);
    assert.ok(s.dmg.sys.engine1 > 0, 'nach Bergung repariert');
  } finally { game.store.close(); }
});
