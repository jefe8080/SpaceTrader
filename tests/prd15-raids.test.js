import { COMBAT } from '../shared/combat.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { AGGRESSION as A } from '../shared/warfare.js';
import { ensureFactionSectors, spawnFactionShip, recordActivity } from '../server/war/factions.js';
import { diplo } from '../server/war/diplomacy.js';
import { productionFactor, raidError, tickRaids } from '../server/war/raids.js';
import { freeFor } from '../shared/config.js';

function withFaction() {
  for (let seed = 1; seed < 60; seed++) {
    const game = new Game(':memory:', { seed });
    for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) game.world.ensureSector(q, r);
    ensureFactionSectors(game);
    if (game.fsecs.size) return game;
    game.store.close();
  }
  throw new Error('keine Fraktionssektoren');
}
const run = (game, secs, dt = 0.25) => { for (let t = 0; t < secs; t += dt) game.tick(dt); };
const minutes = (game, n) => { for (let i = 0; i < n * 60; i++) tickRaids(game); };

test('PRD15 U10: einmaliger Friedenstimer, Aggression nur danach, durch Aktivität; Versorgung pausiert; Neutralität vor erster Freundschaft', () => {
  const game = withFaction();
  try {
    const fs = [...game.fsecs.values()][0];
    const p = game.createPlayer('Grenzgänger');
    const w = diplo(p);
    fs.ok = false;
    minutes(game, 1);
    assert.equal(w.peace[fs.key], undefined, 'neutral: kein Timer, keine Aggression');
    w.friends = [['miners', 'tech', 'nomads', 'order', 'league', 'syndicate'].find((f) => f !== fs.faction)];
    minutes(game, 1);
    const start = w.peace[fs.key];
    assert.notEqual(start, undefined);
    recordActivity(game, fs.sector, p.id);
    minutes(game, 1);
    assert.equal(w.aggr[fs.key] || 0, 0, 'Friedenszeit verhindert Anstieg');
    game.time = start + A.PEACE + 10;
    recordActivity(game, fs.sector, p.id);
    minutes(game, 1);
    assert.ok(w.aggr[fs.key] > 0, 'nach 24 h steigt Aggression durch Aktivität');
    const a = w.aggr[fs.key];
    fs.ok = true;
    recordActivity(game, fs.sector, p.id);
    minutes(game, 1);
    assert.equal(w.aggr[fs.key], a, 'Versorgung pausiert, senkt nicht');
    minutes(game, 1);
    assert.equal(w.peace[fs.key], start, 'Timer wird nicht erneuert');
  } finally { game.store.close(); }
});

test('PRD15 U10: Grenzabfangen unabhängig von Aggression, aber nicht in der Neutralitätsphase', () => {
  const game = withFaction();
  try {
    const fs = [...game.fsecs.values()][0];
    const admin = game.world.entities.get(fs.admin);
    for (let i = 0; i < 3; i++) spawnFactionShip(game, fs, 'korvette', admin);
    const p = game.createPlayer('Eindringling');
    const yard = game.world.entities.get('origin_yard');
    const w = game.spawnShip(p, 'fregatte', yard);
    w.dockedAt = null; w.x = admin.x + 2000; w.y = admin.y; w.queue = [];
    for (let i = 0; i < 6; i++) tickRaids(game);
    assert.ok(![...game.ships.values()].some((s) => s.fsec === fs.key && s.queue[0]?.t === 'attack'), 'neutral: kein automatischer Angriff');
    diplo(p).friends = [['miners', 'tech', 'nomads', 'order', 'league', 'syndicate'].find((f) => f !== fs.faction)];
    for (let i = 0; i < 6; i++) tickRaids(game);
    assert.ok([...game.ships.values()].some((s) => s.fsec === fs.key && s.queue[0]?.t === 'attack' && s.queue[0].target === w.id), 'Grenzabfangen');
  } finally { game.store.close(); }
});

test('PRD15 U10: Raid mit Plünderungsphase, Beute begrenzt durch Bestand und Frachtraum, 24 h Schutz, Malus und Reparatur ohne Schutzverlust', () => {
  const game = withFaction();
  try {
    const fs = [...game.fsecs.values()][0];
    const admin = game.world.entities.get(fs.admin);
    const p = game.createPlayer('Räuber');
    diplo(p).friends = [['miners', 'tech', 'nomads', 'order', 'league', 'syndicate'].find((f) => f !== fs.faction)];
    const yard = game.world.entities.get('origin_yard');
    const r = game.spawnShip(p, 'keiler', yard);
    r.dockedAt = null; r.x = admin.x + 600; r.y = admin.y; r.queue = [];
    const stockBefore = Object.values(admin.market.goods).reduce((a, s) => a + Math.floor(s.stock), 0);
    const free = freeFor(r, 'ore');
    game.revealAround(p, admin.x, admin.y, 3000);
    assert.equal(runCommand(game, p, { cmd: 'raid', ships: [r.id], planet: admin.id }), undefined);
    run(game, 3);
    const b = [...game.battles.values()].find((x) => x.kind === 'raid');
    assert.ok(b, 'Raidschlacht');
    run(game, 2);
    assert.equal(b.raid.phase, 'loot', 'ohne Verteidiger direkt Plünderungsphase');
    assert.ok(game.battles.has(b.id), 'Plünderung dauert sichtbar an');
    run(game, A.LOOT_SECS / COMBAT.TIME_SCALE + 2);
    assert.ok(!game.battles.has(b.id));
    const taken = Object.values(r.cargo).reduce((x, y) => x + y, 0);
    assert.ok(taken > 0 && taken <= free + 0.01, 'nicht mehr als freier Frachtraum');
    assert.deepEqual(b.raid.loot, r.cargo, 'entnommene Beute landet genau einmal im Laderaum');
    void stockBefore;
    assert.ok(admin.market.raid.malus);
    assert.equal(productionFactor(admin), 0.5);
    assert.match(raidError(game, p.id, admin), /24 Stunden/, 'Schutz gegen neue Raids');
    // NPC repariert selbst; Schutz bleibt bis Ablauf
    game.time += 400;
    minutes(game, 1);
    assert.ok(admin.market.raid.repairUntil, 'NPC veranlasst kostenpflichtige Reparatur selbst');
    game.time += A.REPAIR_SECS + 1;
    minutes(game, 1);
    assert.equal(admin.market.raid.malus, false);
    assert.match(raidError(game, p.id, admin), /24 Stunden/, 'Reparatur hebt den Schutz nicht auf');
    game.time = admin.market.raid.protectUntil + 1;
    minutes(game, 1);
    assert.equal(admin.market.raid, undefined);
  } finally { game.store.close(); }
});
