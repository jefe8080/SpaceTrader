import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { Game } from '../server/game.js';
import { runtimeOptions } from '../server/world-profile.js';
import { HOMEWORLD, INDUSTRY_GROUPS, industryGroup } from '../shared/homeworld.js';
import { GOODS, RECIPES } from '../shared/goods.js';

function temporary(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spacetrader-profile-'));
  try { fn(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

const digest = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('PRD-5-Server nutzt getrennten Datenpfad; aktiver Pfad wird abgewiesen', () => {
  temporary((root) => {
    const active = runtimeOptions(root, {});
    const dev = runtimeOptions(root, { WORLD_PROFILE: 'homeworld',DB_FILE:path.join(root,'data','prd5','spacetrader.db') });
    assert.equal(active.profile, 'homeworld');assert.match(active.dbFile,/world-v5/);
    assert.notEqual(active.dbFile, dev.dbFile);
    assert.match(dev.dbFile, /prd5/);
    assert.throws(() => runtimeOptions(root, { WORLD_PROFILE: 'homeworld', DB_FILE:path.join(root,'data','spacetrader.db') }), /aktiven Datenpfad/);
    assert.throws(() => runtimeOptions(root, { WORLD_PROFILE: 'typo' }), /Unbekanntes Weltprofil/);
    assert.equal(runtimeOptions(root, { WORLD_PROFILE: 'homeworld', DB_FILE: ':memory:' }).dbFile, ':memory:');
  });
});

test('Weltprofil und neue Version bleiben nach Neustart erhalten, Altwelt wird unverändert abgewiesen', () => {
  temporary((root) => {
    const file = path.join(root, 'home.db');
    const first = new Game(file, { profile: 'homeworld', seed: 42 });
    const player = first.createPlayer('Dhoinen');
    first.time = 123;
    first.close();
    const before = digest(file);
    assert.throws(() => new Game(file), /Inkompatible Welt/);
    assert.equal(digest(file), before);
    const loaded = new Game(file, { profile: 'homeworld' });
    assert.equal(loaded.worldVersion, 5);
    assert.equal(loaded.time, 123);
    assert.equal(loaded.players.get(player.id).name, 'Dhoinen');
    loaded.close();
  });
});

test('Veraltete Welt wird vor Migration und ohne Löschung geöffnet/abgewiesen', () => {
  temporary((root) => {
    const file = path.join(root, 'old.db');
    const old = new Game(file, { seed: 4 });
    const player = old.createPlayer('Altbestand');
    old.save();
    old.store.setMeta('worldGen', 2);
    old.store.db.pragma('user_version = 1');
    old.store.close();
    const before = digest(file);
    assert.throws(() => new Game(file), /Kein automatischer Reset/);
    assert.throws(() => new Game(file, { profile: 'homeworld' }), /Kein automatischer Reset/);
    assert.equal(digest(file), before);
    // Read-only verification uses SQLite directly, without invoking migrations.
    const db = new Database(file, { readonly: true });
    assert.equal(db.pragma('user_version', { simple: true }), 1);
    assert.ok(db.prepare('SELECT 1 FROM players WHERE id = ?').get(player.id));
    db.close();
  });
});

test('Zentrale PRD-5-Werte decken alle 46 Rezepte genau einmal und nur gültige Waren ab', () => {
  const recipes = Object.values(INDUSTRY_GROUPS).flatMap((group) => group.recipes);
  assert.equal(new Set(recipes).size, 46);
  assert.deepEqual([...recipes].sort(), Object.keys(RECIPES).sort());
  const rank = Object.keys(INDUSTRY_GROUPS);
  const outputGroup = new Map();
  for (const [id, recipe] of Object.entries(RECIPES)) for (const good of Object.keys(recipe.out)) outputGroup.set(good, rank.indexOf(industryGroup(id)));
  for (const [name, group] of Object.entries(INDUSTRY_GROUPS)) {
    assert.ok(group.seconds <= HOMEWORLD.industry.maxBuildSeconds);
    for (const good of Object.keys(group.goods)) {
      assert.ok(GOODS[good], good);
      // The explicitly listed group-I ingot foundation is the tutorial repair exception.
      if (name !== 'I') assert.ok(outputGroup.get(good) < rank.indexOf(name), `${name}: ${good}`);
    }
    for (const id of group.recipes) for (const good of Object.keys(RECIPES[id].in)) {
      if (outputGroup.has(good)) assert.ok(outputGroup.get(good) <= rank.indexOf(name), `${id}: ${good}`);
    }
  }
  for (const collection of [HOMEWORLD.start.repairs, HOMEWORLD.start.supplies, HOMEWORLD.population.needPerHour, HOMEWORLD.population.comfortPerHour]) {
    for (const good of Object.keys(collection)) assert.ok(GOODS[good], good);
  }
  assert.ok(Object.isFrozen(HOMEWORLD.start.repairs));
});
