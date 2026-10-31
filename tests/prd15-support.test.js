import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { shipStats, SHIP_TYPES } from '../shared/config.js';
import { COMBAT } from '../shared/combat.js';
import { startBattle } from '../server/war/battle.js';
import { targetError } from '../server/war/engage.js';

const run = (game, secs, dt = 0.2) => { for (let t = 0; t < secs; t += dt) game.tick(dt); };
const world = () => {
  const game = new Game(':memory:', { seed: 9 });
  const p = game.createPlayer('Wache'), q = game.createPlayer('Pirat');
  const yard = game.world.entities.get('origin_yard');
  const place = (s, dx, dy) => { s.dockedAt = null; s.state = 'idle'; s.queue = []; s.x = yard.x + dx; s.y = yard.y + dy; return s; };
  return { game, p, q, yard, place };
};

test('PRD15 U08: Schutzmodul halbiert reguläre Fracht, 70 % Tempo, Einbau nur an Werften und nur wenn Ladung passt', () => {
  const { game, p, yard, place } = world();
  try {
    const s = place(game.spawnShip(p, 'lastesel', yard), 0, 0);
    const base = shipStats(s);
    const prot = shipStats({ ...s, modules: ['protect'] });
    assert.equal(prot.cargoTotal, Math.round(base.cargoTotal / 2));
    assert.equal(prot.cargo, prot.cargoTotal - 30, 'Modulbedarf kommt zusätzlich hinzu');
    assert.ok(Math.abs(prot.speed - base.speed * 0.7) < 1e-9);
    // Einbau an der Werft aus dem Laderaum
    s.dockedAt = yard.id; s.moduleCargo = { protect: 1 };
    s.cargo = { ore: 200 };
    assert.match(runCommand(game, p, { cmd: 'moduleInstall', ship: s.id, module: 'protect' }), /passt/);
    s.cargo = {};
    const hub = game.world.entities.get('origin_hub');
    s.dockedAt = hub.id;
    assert.match(runCommand(game, p, { cmd: 'moduleInstall', ship: s.id, module: 'protect' }), /Werft/);
    s.dockedAt = yard.id;
    p.credits = 1e6;
    assert.equal(runCommand(game, p, { cmd: 'moduleInstall', ship: s.id, module: 'protect' }), undefined);
    assert.ok(s.modules.includes('protect'));
  } finally { game.store.close(); }
});

test('PRD15 U08: geschützte Schiffe unangreifbar, vollständig geschützter Stack eröffnet keine Schlacht, ungeschützte Mitglieder bleiben angreifbar', () => {
  const { game, p, q, yard, place } = world();
  try {
    const a = place(game.spawnShip(p, 'lastesel', yard), 0, 0);
    const b = place(game.spawnShip(p, 'lastesel', yard), 50, 0);
    const pirate = place(game.spawnShip(q, 'korvette', yard), 400, 0);
    a.modules = ['protect'];
    assert.equal(targetError(game, pirate, b), null);
    assert.match(targetError(game, pirate, a), /Schutzmodul/);
    b.modules = ['protect'];
    runCommand(game, p, { cmd: 'stackJoin', ships: [b.id], target: a.id });
    run(game, 3);
    assert.equal(a.stack, b.stack);
    assert.match(targetError(game, pirate, b), /Schutzmodul/, 'vollständig geschützter Stack');
    b.modules = [];
    assert.equal(targetError(game, pirate, a.stack ? b : a), null, 'ungeschütztes Mitglied angreifbar');
    const battle = startBattle(game, [pirate], [b]);
    assert.ok(battle.units[a.id].protected, 'geschütztes Mitglied kämpft nicht und ist unangreifbar');
    assert.equal(battle.units[b.id].state, 'surrendered', 'kein Geleitschutz durch geschützte Mitglieder');
  } finally { game.store.close(); }
});

test('PRD15 U08: Abfangen nur durch Kriegsschiffe, bis halbe Sektorweite, mit realem Anflug; Reparaturfahrt nimmt keine Rufe an', () => {
  const { game, p, q, yard, place } = world();
  try {
    const trader = place(game.spawnShip(p, 'keiler', yard), 0, 0);
    const guard = place(game.spawnShip(p, 'korvette', yard), 6000, 0);
    const multi = place(game.spawnShip(p, 'pelikan', yard), 5000, 0);
    const far = place(game.spawnShip(p, 'fregatte', yard), COMBAT.INTERCEPT + 5000, 0);
    const busy = place(game.spawnShip(p, 'korvette', yard), 5500, 0);
    busy.repairRun = true;
    const pirate = place(game.spawnShip(q, 'fregatte', yard), 300, 0);
    const b = startBattle(game, [pirate], [trader]);
    game.tick(1.1);
    assert.equal(guard.queue[0]?.t, 'intercept', 'Kriegsschiff fängt ab');
    assert.notEqual(multi.queue[0]?.t, 'intercept', 'Mehrzweck löst kein Abfangen aus');
    assert.notEqual(far.queue[0]?.t, 'intercept', 'außerhalb der halben Sektorweite');
    assert.notEqual(busy.queue[0]?.t, 'intercept', 'Reparaturfahrt nimmt keine Hilferufe an');
    assert.equal(guard.battle, undefined, 'keine sofortige Übertragung');
    run(game, 40);
    assert.equal(guard.battle, b.id, 'tritt nach realem Anflug bei');
    assert.equal(b.units[guard.id].side, 'B');
  } finally { game.store.close(); }
});

test('PRD15 U08: Bewachen nur im lokalen Radius; Konsortiumsbündnis steuert Unterstützung, Angriffe untereinander bleiben verboten', () => {
  const { game, p, q, yard, place } = world();
  try {
    const ally = game.createPlayer('Partner');
    const c = { id: 'k1', name: 'Bund', color: '#ffffff', credits: 0, level: 1, members: { [p.id]: { rank: 'master' }, [ally.id]: { rank: 'trader' } }, invites: {}, board: [] };
    game.consortia.set(c.id, c);
    p.consortium = c.id; ally.consortium = c.id;
    const victim = place(game.spawnShip(ally, 'keiler', yard), 0, 0);
    const watcher = place(game.spawnShip(p, 'korvette', yard), COMBAT.SUPPORT_LOCAL + 1500, 0);
    const pirate = place(game.spawnShip(q, 'fregatte', yard), 300, 0);
    assert.match(targetError(game, watcher, victim), /Konsortium/);
    assert.match(runCommand(game, ally, { cmd: 'consortiumMilitary', on: false }), /leitung/i);
    runCommand(game, p, { cmd: 'posture', ship: watcher.id, mode: 'guard' });
    startBattle(game, [pirate], [victim]);
    game.tick(1.1);
    assert.notEqual(watcher.queue[0]?.t, 'intercept', 'Bewachen: Schlacht außerhalb des lokalen Radius');
    runCommand(game, p, { cmd: 'posture', ship: watcher.id, mode: 'intercept' });
    game.tick(1.1);
    assert.equal(watcher.queue[0]?.t, 'intercept', 'aktives Bündnis: Unterstützung');
    // Bündnis aus: neue Begegnungen ohne Unterstützung
    watcher.queue = [];
    assert.equal(runCommand(game, p, { cmd: 'consortiumMilitary', on: false }), undefined);
    const v2 = place(game.spawnShip(ally, 'keiler', yard), 900, 900);
    const p2 = place(game.spawnShip(q, 'fregatte', yard), 1200, 900);
    for (const b of game.battles.values()) b.ended = { winner: null };
    game.battles.clear();
    startBattle(game, [p2], [v2]);
    game.tick(1.1);
    assert.notEqual(watcher.queue[0]?.t, 'intercept');
  } finally { game.store.close(); }
});
