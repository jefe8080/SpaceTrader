import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { FACTION_WAR as F } from '../shared/warfare.js';
import { isGiver, makeOffer } from '../server/quests.js';
import { ensureFactionSectors, poolAdd, poolSpend, capOf, receiveGoods, supplyOk, tickFactions, shipPurchaseBlock, syncFriendQuest, announceFriendQuest, questTurnInBlock, spawnFactionShip } from '../server/war/factions.js';
import { factionHostileTo, diplo } from '../server/war/diplomacy.js';
import { startBattle, endBattle } from '../server/war/battle.js';

function withFaction(profile = 'legacy') {
  for (let seed = 1; seed < 60; seed++) {
    const game = new Game(':memory:', { seed, profile });
    for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) game.world.ensureSector(q, r);
    ensureFactionSectors(game);
    const factions = new Set([...game.fsecs.values()].map((f) => f.faction));
    if (game.fsecs.size >= 2 && [...game.fsecs.values()].some((f) => [...game.fsecs.values()].some((o) => o !== f && o.faction === f.faction)) || factions.size >= 2) return game;
    game.store.close();
  }
  throw new Error('keine Fraktionssektoren');
}

test('PRD15 U09: Verwaltungsplanet mit Werft im selben System; Quests nur dort, ohne Credits', () => {
  const game = withFaction();
  try {
    for (const fs of game.fsecs.values()) {
      const admin = game.world.entities.get(fs.admin), yard = game.world.entities.get(fs.yard);
      assert.equal(admin.system, yard.system);
      assert.equal(isGiver(admin), true);
      const others = game.world.sectorEntities(fs.sector).filter((e) => e.faction === fs.faction && e.kind === 'planet' && e !== admin);
      for (const o of others) assert.equal(isGiver(o), false, 'andere Fraktionsplaneten ohne Questannahme');
      const offer = makeOffer(game, admin);
      if (offer) { assert.equal(offer.reward.cr, 0); assert.ok(offer.adminSector); }
    }
  } finally { game.store.close(); }
});

test('PRD15 U09: Pooldeckel 10 Mio. × Level, nie unter null; Wasser/Nahrung bei vollem Lager abgewiesen, andere Waren zum Bestpreis', () => {
  const game = withFaction();
  try {
    const fs = [...game.fsecs.values()][0];
    fs.pool = 0;
    assert.equal(poolAdd(fs, capOf(fs) + 5), capOf(fs));
    assert.equal(fs.pool, F.POOL_CAP * fs.level);
    assert.equal(poolSpend(fs, fs.pool + 1), false);
    fs.pool = 0;
    fs.supply.water = F.BUFFER * fs.level - 5;
    assert.equal(receiveGoods(fs, 'water', 20), 5, 'nur bis zum Puffer');
    assert.equal(fs.pool, 0, 'kein automatischer Verkauf von Überschüssen');
    assert.equal(receiveGoods(fs, 'water', 20), 0);
    receiveGoods(fs, 'ore', 10);
    assert.ok(fs.pool > 0, 'andere Waren zum regulären Bestpreis umgewandelt');
  } finally { game.store.close(); }
});

test('PRD15 U09: Versorgung erzeugt Levelfortschritt, Lücken pausieren; Aufstieg kostet Pool; Einkommen nur bei Aktivität', () => {
  const game = withFaction();
  try {
    const fs = [...game.fsecs.values()][0];
    fs.pool = 1e7; fs.supply = { water: 1e9, food: 1e9 };
    fs.upkeepAt = game.time - 60 * 130;
    tickFactions(game);
    assert.equal(fs.level, 2, 'aufgestiegen');
    assert.ok(fs.pool < 1e7, 'Aufstieg kostet Geld');
    const pool = fs.pool;
    fs.supply = { water: 0, food: 0 };
    fs.progress = 0.5;
    fs.upkeepAt = game.time - 120;
    game.time += 1;
    tickFactions(game);
    assert.equal(fs.progress, 0.5, 'Lücke pausiert');
    assert.equal(fs.level, 2, 'Level sinkt nicht');
    assert.equal(fs.pool, pool, 'ohne Spieleraktivität kein Einkommen');
    game.warActivity.set(fs.sector, game.time);
    fs.upkeepAt = game.time - 60;
    tickFactions(game);
    assert.ok(fs.pool > pool, 'passives Einkommen bei Aktivität');
  } finally { game.store.close(); }
});

test('PRD15 U09: Goldtransport belastet Start, schreibt erst bei Ankunft gut; Abfangen schreibt nichts gut', () => {
  const game = withFaction();
  try {
    const all = [...game.fsecs.values()];
    const fs = all.find((f) => all.some((o) => o !== f && o.faction === f.faction));
    if (!fs) return; // Welt ohne zweiten Sektor derselben Fraktion
    const to = all.find((o) => o !== fs && o.faction === fs.faction);
    fs.pool = 5e6; to.pool = 0; fs.nextTransport = 0;
    tickFactions(game);
    const ship = [...game.ships.values()].find((s) => s.queue[0]?.t === 'goldRun');
    assert.ok(ship);
    const value = ship.cargo.finegold * F.GOLD_RATE;
    assert.equal(fs.pool, 5e6 - value);
    assert.equal(to.pool, 0, 'Ziel erst nach Ankunft');
    game.removeShip(ship);
    for (let i = 0; i < 10; i++) game.tick(1);
    assert.equal(to.pool, 0, 'verlorener Transport schreibt nichts gut');
  } finally { game.store.close(); }
});

test('PRD15 U09: Freundschaftsquest ab Leitstellenstufe 2; Neutralität davor; Geschenk befreundet eine und verfeindet fünf; Bau/Kauf-Sperre ab fünf Schiffen', () => {
  const game = withFaction('homeworld');
  try {
    const p = game.createPlayer('Diplomat');
    const fs = [...game.fsecs.values()][0];
    const home = game.world.entities.get(p.homeworld);
    syncFriendQuest(game, p);
    assert.equal(diplo(p).friendQuest, undefined);
    assert.equal(factionHostileTo(game, fs.faction, p.id), false, 'vor erster Freundschaft neutral');
    home.market.homeworld.controlLevel = 2;
    syncFriendQuest(game, p);
    assert.ok(diplo(p).friendQuest);
    const yard = game.world.entities.get(fs.yard);
    while (game.shipsOf(p.id).length < 5) game.spawnShip(p, 'spatz', home);
    assert.match(shipPurchaseBlock(game, p), /fünf Schiffen/);
    const ship = game.shipsOf(p.id)[0];
    const admin = game.world.entities.get(fs.admin);
    ship.dockedAt = admin.id; ship.x = admin.x; ship.y = admin.y; ship.cargo = { food: 40, water: 40 };
    assert.equal(runCommand(game, p, { cmd: 'friendGift', ship: ship.id }), undefined);
    assert.deepEqual(diplo(p).friends, [fs.faction]);
    assert.equal(factionHostileTo(game, fs.faction, p.id), false);
    const other = ['miners', 'tech', 'nomads', 'order', 'league', 'syndicate'].filter((f) => f !== fs.faction);
    assert.equal(other.filter((f) => factionHostileTo(game, f, p.id)).length, 5);
    assert.equal(shipPurchaseBlock(game, p), null, 'Sperre endet mit der Quest');
    assert.match(runCommand(game, p, { cmd: 'galacticFriendship' }), /kostet/);
    // Fraktionsquest: Abgabe nur bei ausreichender Grundversorgung
    fs.supply = { water: 0, food: 0 };
    assert.match(questTurnInBlock(game, { adminSector: fs.key }), /Grundversorgung/);
    fs.supply = { water: 10, food: 10 };
    assert.equal(supplyOk(fs), true);
    assert.equal(questTurnInBlock(game, { adminSector: fs.key }), null);
    void yard;
  } finally { game.store.close(); }
});

test('PRD15 U09: Beute einer Fraktion fließt in ihren Pool, ohne Doppelgutschrift', () => {
  const game = withFaction();
  try {
    const fs = [...game.fsecs.values()][0];
    const admin = game.world.entities.get(fs.admin);
    const p = game.createPlayer('Beute');
    const victim = game.spawnShip(p, 'lastesel', admin);
    victim.dockedAt = null; victim.cargo = { ore: 50 };
    const raider = spawnFactionShip(game, fs, 'korvette', admin);
    raider.dockedAt = null; raider.x = victim.x + 300; raider.y = victim.y;
    fs.pool = 0;
    const b = startBattle(game, [raider], [victim]);
    if (game.battles.has(b.id)) endBattle(game, b, 'A');
    assert.ok(victim.captive);
    assert.equal(victim.cargo.ore, undefined);
    assert.ok(fs.pool > 0 && fs.pool <= 50 * 300, 'genau einmal zum Bestpreis gutgeschrieben');
  } finally { game.store.close(); }
});


test('PRD15 U09: Spieler mit bereits ausgebauter Leitstelle erhalten die Freundschaftsquest beim nächsten Login samt Meldung', () => {
  const game = withFaction('homeworld');
  try {
    const p = game.createPlayer('Nachzügler');
    game.world.entities.get(p.homeworld).market.homeworld.controlLevel = 2;
    assert.equal(diplo(p).friendQuest, undefined);
    assert.equal(announceFriendQuest(game, p), true, 'Login startet die Quest und meldet sie');
    assert.ok(diplo(p).friendQuest);
    assert.equal(announceFriendQuest(game, p), false, 'nur einmal gemeldet');
    const q = game.createPlayer('Offline');
    game.world.entities.get(q.homeworld).market.homeworld.controlLevel = 3;
    syncFriendQuest(game, q); // Takt bzw. Migration, während der Spieler offline ist
    assert.ok(diplo(q).friendQuest);
    assert.equal(announceFriendQuest(game, q), true, 'offline verpasste Meldung wird beim Login nachgeholt');
  } finally { game.store.close(); }
});
