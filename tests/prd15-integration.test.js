import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { shipStats, freeFor, SHIP_TYPES } from '../shared/config.js';
import { WEAPONS, maxHull } from '../shared/combat.js';
import { hitChance, applyHit } from '../shared/damage.js';
import { ensureDamage, blueprint } from '../shared/combat.js';
import { startBattle, tickBattle } from '../server/war/battle.js';
import { diplo } from '../server/war/diplomacy.js';
import { ensureFactionSectors } from '../server/war/factions.js';

const tmp = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prd15-int-')); return { dir, file: path.join(dir, 'w.db') }; };

test('PRD15 U11: Migration erhält Schiffe, Ruf und Überladung, beendet alte Fraktionsquests ohne Strafe genau einmal', () => {
  const { dir, file } = tmp();
  let game = new Game(file, { profile: 'homeworld', seed: 21 });
  try {
    for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) game.world.ensureSector(q, r);
    const p = game.createPlayer('Bestand');
    const home = game.world.entities.get(p.homeworld);
    home.market.homeworld.controlLevel = 2;
    ensureFactionSectors(game);
    const fplanet = [...game.world.entities.values()].find((e) => e.faction && e.kind === 'planet' && e.market && !e.admin);
    // Simulierter Altstand: Fraktionsquest an einem beliebigen Fraktionsplaneten, alter Ruf, überladenes Fraktionsschiff
    for (const e of game.world.entities.values()) delete e.admin;
    game.fsecs.clear();
    p.rep = { [fplanet.faction]: 450 };
    p.quest = { id: 'qold', type: 'procure', giver: fplanet.id, giverName: fplanet.name, good: 'water', amount: 5, faction: fplanet.faction, reward: { cr: 100, xp: 10 } };
    const ship = game.spawnShip(p, 'f_tech', home);
    ship.cargo = { ore: 900 };
    const before = { ships: game.shipsOf(p.id).length, credits: p.credits };
    const pid = p.id, sid = ship.id;
    game.close();
    game = new Game(file, { profile: 'homeworld' });
    const p2 = game.players.get(pid);
    assert.equal(game.shipsOf(pid).length, before.ships, 'Umstellung vernichtet keine Einheiten');
    assert.equal(game.battles.size, 0, 'startet keine Kämpfe');
    assert.equal(p2.quest, null, 'alte Fraktionsquest beendet');
    assert.equal(p2.rep[fplanet.faction], 450, 'ohne Rufmalus');
    assert.ok(!(p2.questLock > game.time), 'ohne Abbruchsperre');
    assert.equal(game.ships.get(sid).cargo.ore, 900, 'überschüssige Ladung bleibt erhalten');
    assert.equal(freeFor(game.ships.get(sid), 'ore'), 0, 'weiteres Beladen blockiert');
    assert.ok(diplo(p2).friendQuest, 'Freundschaftsquest bei sektorweiter Leitstelle gestartet');
    assert.ok(game.ships.get(sid).dmg, 'Kampfdefinition übertragen');
    assert.ok([...game.world.entities.values()].some((e) => e.admin), 'Verwaltungsplaneten bestimmt');
    const notes = diplo(p2).migratedQuests.length;
    game.close();
    game = new Game(file, { profile: 'homeworld' });
    const p3 = game.players.get(pid);
    assert.equal(diplo(p3).migratedQuests.length, notes, 'wiederholbar ohne Doppelungen');
    assert.equal(game.shipsOf(pid).length, before.ships);
    assert.equal(p3.credits, before.credits);
  } finally { if (game.store.db.open) game.store.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('PRD15 U11: Mehrspieler und Neustart: Schlacht, Gefangene und Freikauf überstehen den Neustart ohne Nachsimulation', () => {
  const { dir, file } = tmp();
  let game = new Game(file, { seed: 4 });
  try {
    const a = game.createPlayer('Alpha'), b = game.createPlayer('Beta');
    const yard = game.world.entities.get('origin_yard');
    const w = game.spawnShip(a, 'kreuzer', yard), v = game.spawnShip(b, 'lastesel', yard), g = game.spawnShip(b, 'korvette', yard);
    for (const s of [w, v, g]) { s.dockedAt = null; s.queue = []; s.x = yard.x; s.y = yard.y + 500; }
    const bt = startBattle(game, [w], [v, g]);
    for (let i = 0; i < 50; i++) tickBattle(game, bt, 0.1);
    const t = game.battles.get(bt.id)?.t;
    game.close();
    game = new Game(file, {});
    const b2 = game.battles.get(bt.id);
    if (b2) assert.equal(b2.t, t, 'keine Simulation der ausgeschalteten Zeit');
    // Kampf zu Ende spielen
    for (let i = 0; i < 6000 && game.battles.size; i++) game.tick(0.1);
    assert.equal(game.battles.size, 0);
    const lastesel = game.ships.get(v.id);
    if (lastesel?.captive) {
      game.close();
      game = new Game(file, {});
      const pb = game.players.get(b.id);
      const s = game.ships.get(v.id);
      assert.ok(s.captive, 'Gefangenschaft gespeichert');
      pb.credits = 1e7;
      const price = Math.round(SHIP_TYPES.lastesel.price * 0.25);
      assert.equal(runCommand(game, pb, { cmd: 'ransom', ship: s.id, price }), undefined);
      assert.equal(s.captive, undefined);
    }
  } finally { if (game.store.db.open) game.store.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('PRD15 U11 Vergleichsszenarien: Waffenrollen und Gegenstrategien sind wirksam', () => {
  const craft = { type: 'abfangstaffel' }, big = { type: 'kreuzer' };
  // Staffeln gegen schwere Waffen: schlecht getroffen, aber nicht unverwundbar
  assert.ok(hitChance('heavy', craft, { targetSpeed: 300 }) < 0.2);
  assert.ok(hitChance('heavy', craft, { targetSpeed: 300 }) > 0.02);
  assert.ok(hitChance('flak', craft, { targetSpeed: 300 }) > hitChance('heavy', craft, { targetSpeed: 300 }) * 3);
  assert.ok(hitChance('heavy', big) > 0.6, 'große Ziele werden zuverlässig getroffen');
  // Ionen gegen Schilde: stärker als Laser je Schadenspunkt
  const mk = (t) => { const s = { type: t }; ensureDamage(s); return { s, u: { state: 'fight', shields: blueprint(t).shields.map((x) => x.max), shieldDelay: [], ion: {}, jam: {}, fires: [] } }; };
  const i1 = mk('fregatte'), l1 = mk('fregatte');
  const ri = applyHit(i1.u, i1.s, { weapon: 'ion', dmg: 30, rel: 0, now: 0, rnd: 0.9 });
  const rl = applyHit(l1.u, l1.s, { weapon: 'laser', dmg: 30, rel: 0, now: 0, rnd: 0.9 });
  assert.ok(ri.shield > rl.shield * 2);
  // Schneller Frachter gegen Verfolger: Kolibri schneller als Korvette, langsamer als Abfangjäger
  assert.ok(shipStats({ type: 'kolibri' }).speed > shipStats({ type: 'korvette' }).speed);
  assert.ok(shipStats({ type: 'kolibri' }).speed < shipStats({ type: 'abfangstaffel' }).speed);
  // Flotten gleicher Kosten: drei Sperber gegen einen Greif (je ca. 2,4 Mio.) haben vergleichbare Rumpfsummen
  assert.ok(Math.abs(3 * SHIP_TYPES.fregatte.price - SHIP_TYPES.zerstoerer.price) / SHIP_TYPES.zerstoerer.price < 0.05);
  const r = (3 * maxHull('fregatte')) / maxHull('zerstoerer');
  assert.ok(r > 0.9 && r < 2.5, `Rumpfverhältnis ${r}`);
  void WEAPONS;
});

test('PRD15 U11 Vergleichsszenario: Eskorte gegen Raid lässt Zivilschiffe fliehen statt kapitulieren', () => {
  const game = new Game(':memory:', { seed: 8 });
  try {
    const a = game.createPlayer('Raider'), b = game.createPlayer('Konvoi');
    const yard = game.world.entities.get('origin_yard');
    const raider = game.spawnShip(a, 'korvette', yard), civ = game.spawnShip(b, 'lastesel', yard), esc = game.spawnShip(b, 'korvette', yard);
    for (const s of [raider, civ, esc]) { s.dockedAt = null; s.queue = []; }
    const bt = startBattle(game, [raider], [civ, esc]);
    assert.equal(bt.units[civ.id].state, 'retreating', 'mit Geleitschutz regulärer Rückzugsversuch');
    const lone = game.spawnShip(b, 'lastesel', yard); lone.dockedAt = null;
    const r2 = game.spawnShip(a, 'korvette', yard); r2.dockedAt = null;
    let started = null; game.on('battleStart', (x) => { started = x; });
    startBattle(game, [r2], [lone]);
    assert.equal(started.units[lone.id].state, 'surrendered', 'ohne Geleitschutz Kapitulation');
  } finally { game.store.close(); }
});
