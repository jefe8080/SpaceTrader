import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shipStats, holdUsage, freeFor, cargoFits } from '../shared/ships.js';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('Normale Ware nutzt zuerst Normalraum, dann reale geschirmte Restkapazität', () => {
  const ship = { type: 'lastesel', modules: ['shielded'], cargo: { ore: 240 } };
  assert.equal(shipStats(ship).cargo, 220);
  assert.deepEqual(holdUsage(ship), { cargo: 220, hazard: 20, passenger: 0 });
  assert.equal(freeFor(ship, 'ore'), 10);
  assert.equal(freeFor(ship, 'chemicals'), 10);
  ship.cargo.chemicals = 10;
  assert.equal(freeFor(ship, 'ore'), 0);
  assert.equal(freeFor(ship, 'chemicals'), 0);
  ship.cargo.ore -= 40;
  assert.deepEqual(holdUsage(ship), { cargo: 200, hazard: 10, passenger: 0 });
  assert.equal(freeFor(ship, 'ore'), 40);
  assert.equal(freeFor(ship, 'chemicals'), 20);
});

test('Kein Normalraum: geschirmte Kammer bleibt nutzbar; Passagiere bleiben getrennt', () => {
  const ship = { type: 'spatz', modules: ['shielded'], cargo: {} };
  assert.equal(shipStats(ship).cargo, 0);
  assert.equal(freeFor(ship, 'ore'), 30);
  assert.equal(freeFor(ship, 'tourists'), 0);
  ship.modules = ['cabin'];
  assert.equal(freeFor(ship, 'ore'), 0);
  assert.equal(freeFor(ship, 'tourists'), 30);
});

test('Stahlkoloss teilt seinen freigegebenen Raum; NPCs behalten ihre Kapazitätsausnahme', () => {
  const ship = { type: 'f_syndicate', cargo: { ore: 20, chemicals: 30 } };
  assert.equal(freeFor(ship, 'ore'), shipStats(ship).cargo - 50);
  assert.equal(freeFor(ship, 'chemicals'), freeFor(ship, 'ore'));
  const npc = { type: 'versorger', cargo: { tourists: 20, chemicals: 30 } };
  assert.equal(freeFor(npc, 'ore'), 50);
  assert.equal(freeFor(npc, 'chemicals'), 50);
});

test('Modulausbau prüft hypothetische Gesamtbelegung und erlaubt legale Umsortierung', () => {
  const game = new Game(':memory:', { seed: 3 });
  const player = game.createPlayer('Fracht');
  const ship = game.shipsOf(player.id)[0];
  ship.type = 'lastesel';
  ship.dockedAt = 'origin_yard';
  for (const [cargo, blocked] of [[{ ore: 230 }, false], [{ ore: 255 }, true], [{ chemicals: 60 }, true]]) {
    ship.modules = ['shielded', 'shielded'];
    ship.cargo = cargo;
    const before = structuredClone(ship.cargo), credits = player.credits;
    const result = runCommand(game, player, { cmd: 'removeModule', ship: ship.id, module: 'shielded' });
    if (blocked) {
      assert.match(result, /Fracht passt nicht/);
      assert.equal(ship.modules.length, 2);
      assert.equal(player.credits, credits);
    } else {
      assert.equal(result, undefined);
      assert.equal(ship.modules.length, 1);
      assert.ok(cargoFits(ship));
    }
    assert.deepEqual(ship.cargo, before);
  }
  game.store.db.close();
});

test('Eigentümerladen, Teilentladung und Speichern erhalten dieselbe geschirmte Belegung', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spacetrader-cargo-'));
  const db = path.join(dir, 'test.db');
  let game;
  try {
    game = new Game(db, { seed: 3 });
    const player = game.createPlayer('Lager');
    const ship = game.shipsOf(player.id)[0], id = ship.id;
    ship.modules = ['shielded'];
    ship.cargo = {};
    const entity = game.world.entities.get('origin_hub');
    ship.dockedAt = entity.id;
    entity.market.goods.ore = { stock: 100, cap: 100, role: 'produce', mod: 1 };
    game.ownership.set(entity.id, { player: player.id });
    assert.equal(game.trade(ship, entity, 'ore', 40, 'buy').n, 30);
    assert.deepEqual(holdUsage(ship), { cargo: 0, hazard: 30, passenger: 0 });
    assert.equal(game.trade(ship, entity, 'ore', 10, 'sell').n, 10);
    game.save();
    game.store.db.close();
    game = new Game(db);
    assert.deepEqual(holdUsage(game.ships.get(id)), { cargo: 0, hazard: 20, passenger: 0 });
    assert.equal(freeFor(game.ships.get(id), 'ore'), 10);
  } finally {
    if (game?.store.db.open) game.store.db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
