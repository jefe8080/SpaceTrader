import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUEST, XP, PILOT_LEVELS, pilotLevel, pilotTitle, giverLevel, questReward, factionRank, RANKS } from '../shared/config.js';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { makeOffer, boardOf, refreshBoards } from '../server/quests.js';

const dockAt = (ship, e) => { ship.x = e.x + e.radius + 28; ship.y = e.y; ship.dockedAt = e.id; ship.queue = []; };

test('Pilotenlevel: XP-Kurve, Titel ab Level 7', () => {
  assert.equal(pilotLevel(0), 1);
  assert.equal(pilotLevel(99), 1);
  assert.equal(pilotLevel(100), 2);
  assert.equal(pilotLevel(12000), 6);
  assert.equal(pilotLevel(1e9), 7);
  assert.equal(pilotTitle(30000), PILOT_LEVELS[7].title);
  assert.equal(pilotTitle(29999), null);
  assert.equal(giverLevel(0), 0);
  assert.equal(factionRank(RANKS[2]), 2);
});

test('Belohnung: mit Aufwand und Questlevel steigend, XP nach Aufwand', () => {
  const a = questReward(10, 0), b = questReward(20, 0), c = questReward(10, 3);
  assert.ok(b.cr > a.cr && c.cr > a.cr && b.xp > a.xp && c.xp > a.xp);
  assert.ok(questReward(10, 0, 1000).cr >= a.cr + 1000, 'Warenwert wird erstattet');
});

test('Nebenquellen: Sektorbesuch, Almanach, keine XP beim Start', () => {
  const g = new Game(':memory:', { seed: 5 });
  const p = g.createPlayer('Anna');
  assert.equal(p.xp || 0, 0, 'Startwissen bringt keine XP');
  g.discover(p, 'recipe', 'st:aiforge');
  g.discover(p, 'ship', 'wal');
  assert.equal(p.xp, XP.RECIPE + XP.SHIP);
});

test('Hauptschiff: manueller Handel bringt 1 XP je 1.000 Cr Gewinn, höchstens 40 je Stunde', () => {
  const g = new Game(':memory:', { seed: 5 });
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  ship.main = true;
  ship.basis = { ore: 10 };
  ship.cargo.ore = 100;
  g.tradeBasis(ship, 'ore', 100, 26000, 'sell'); // 25.000 Gewinn
  assert.equal(p.xp, 25);
  g.tradeBasis(ship, 'ore', 100, 100000, 'sell');
  assert.equal(p.xp, XP.TRADE_MAX_H, 'gedeckelt');
  const other = g.spawnShip(p, 'spatz', g.world.entities.get('origin_yard'));
  g.time += 3600;
  g.tradeBasis(other, 'ore', 10, 50000, 'sell');
  assert.equal(p.xp, XP.TRADE_MAX_H, 'nur das Hauptschiff');
});

test('Questtafel: Angebot erscheint, Annahme nur angedockt, eine Quest gleichzeitig', () => {
  const g = new Game(':memory:', { seed: 5 });
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  const planet = g.world.entities.get('origin_urban');
  refreshBoards(g, new Set([planet.sector]));
  assert.equal(boardOf(planet).offers.length, QUEST.SLOTS[0]);
  const q = boardOf(planet).offers[0];
  assert.match(runCommand(g, p, { cmd: 'questAccept', ship: ship.id, target: planet.id, quest: q.id }), /angedockt/);
  dockAt(ship, planet);
  if (q.type === 'tour') ship.modules = ['cabin'];
  assert.equal(runCommand(g, p, { cmd: 'questAccept', ship: ship.id, target: planet.id, quest: q.id }), undefined);
  assert.equal(p.quest.id, q.id);
  assert.equal(boardOf(planet).offers.length, 0, 'für alle anderen verschwunden');
  // Abbruch: 10 min Sperre
  assert.equal(runCommand(g, p, { cmd: 'questAbort' }), undefined);
  boardOf(planet).offers.push(makeOffer(g, planet, 'courier'));
  assert.match(runCommand(g, p, { cmd: 'questAccept', ship: ship.id, target: planet.id, quest: boardOf(planet).offers[0].id }), /erst in 10 min/);
});

test('Beschaffung: Ware liefern bringt Credits, XP für Spieler und Questgeber', () => {
  const g = new Game(':memory:', { seed: 5 });
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  ship.type = 'lastesel';
  const planet = g.world.entities.get('origin_urban');
  const o = makeOffer(g, planet, 'procure');
  assert.ok(o && o.amount >= 5 && o.reward.cr > 0 && o.reward.xp > 0);
  boardOf(planet).offers.push(o);
  dockAt(ship, planet);
  assert.equal(runCommand(g, p, { cmd: 'questAccept', ship: ship.id, target: planet.id, quest: o.id }), undefined);
  ship.cargo[o.good] = o.amount;
  const cr = p.credits, xp = p.xp || 0; // beim Annehmen aufgedeckte Ziele können Almanach-XP bringen
  assert.equal(runCommand(g, p, { cmd: 'questDeliver', ship: ship.id }), undefined);
  assert.equal(p.quest, null);
  assert.equal(p.credits - cr, o.reward.cr);
  assert.equal(p.xp - xp, o.reward.xp);
  assert.equal(planet.market.qxp, o.reward.xp);
  assert.ok(!ship.cargo[o.good]);
});

test('Kurier: Abholen bei z, Abliefern bei a, beim Andocken', () => {
  const g = new Game(':memory:', { seed: 5 });
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  const planet = g.world.entities.get('origin_agrar');
  const o = makeOffer(g, planet, 'courier');
  assert.ok(o, 'Kurierquest erzeugt');
  boardOf(planet).offers.push(o);
  dockAt(ship, planet);
  assert.equal(runCommand(g, p, { cmd: 'questAccept', ship: ship.id, target: planet.id, quest: o.id }), undefined);
  for (const target of [o.pickup, o.dest]) {
    runCommand(g, p, { cmd: 'order', ships: [ship.id], order: { t: 'goto', target } });
    for (let i = 0; i < 20000 && ship.queue.length; i++) g.tick(0.5);
  }
  assert.equal(p.quest, null, 'erfüllt');
  assert.ok(p.xp >= o.reward.xp);
});

test('Abbau: nur selbst abgebaute Ware zählt', () => {
  const g = new Game(':memory:', { seed: 5 });
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  ship.type = 'maulwurf';
  const yard = g.world.entities.get('origin_yard');
  const o = makeOffer(g, yard, 'mine');
  assert.ok(o, 'Abbauquest erzeugt');
  o.amount = 10;
  boardOf(yard).offers.push(o);
  dockAt(ship, yard);
  assert.equal(runCommand(g, p, { cmd: 'questAccept', ship: ship.id, target: yard.id, quest: o.id }), undefined);
  ship.cargo[o.good] = 10; // gekauft, nicht abgebaut
  assert.match(runCommand(g, p, { cmd: 'questDeliver', ship: ship.id }), /nichts zu tun/);
  ship.mined = { [o.good]: 10 };
  assert.equal(runCommand(g, p, { cmd: 'questDeliver', ship: ship.id }), undefined);
  assert.equal(p.quest, null);
});

test('Erkundung: neu aufgedeckte Zellen im Zielsektor zählen, Abschluss automatisch', () => {
  const g = new Game(':memory:', { seed: 5 });
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  const planet = g.world.entities.get('origin_urban');
  let o;
  for (let i = 0; i < 50 && !(o?.sector === planet.sector); i++) o = makeOffer(g, planet, 'explore');
  assert.equal(o.sector, planet.sector);
  boardOf(planet).offers.push(o);
  dockAt(ship, planet);
  assert.equal(runCommand(g, p, { cmd: 'questAccept', ship: ship.id, target: planet.id, quest: o.id }), undefined);
  const home = g.world.sectors.get(planet.sector);
  for (let a = 0; a < Math.PI * 2 && p.quest; a += 0.02) g.revealAround(p, home.bh.x + Math.cos(a) * 40000, home.bh.y + Math.sin(a) * 40000, 2500);
  assert.equal(p.quest, null, 'erfüllt');
  assert.ok(p.xp >= o.reward.xp);
});

test('Planetenlevel: +10 % Raten, +15 % Lager, Zusatzwaren bei 2/4/6, Kaufpreis ×(1 + 0,4 L)', async () => {
  const { PLANET_EXTRAS, GIVER_LEVELS, propertyPrice } = await import('../shared/config.js');
  const g = new Game(':memory:', { seed: 5 });
  const planet = [...g.world.entities.values()].find((e) => e.kind === 'planet' && !e.noBuy && e.type === 'mining');
  const m = planet.market;
  const ore = m.goods.ore, rate0 = ore.rate, cap0 = ore.cap, price0 = propertyPrice(planet);
  g.addGiverXp(planet, GIVER_LEVELS[2]);
  assert.equal(m.lvl, 2);
  assert.ok(Math.abs(ore.rate / rate0 - 1.2) < 1e-9);
  assert.equal(ore.cap, Math.round(cap0 * 1.3));
  const [x2, x4, x6] = PLANET_EXTRAS.mining;
  assert.equal(m.goods[x2].role, 'produce', 'Level 2: neue Ware produziert');
  assert.ok(!m.goods[x4] || m.goods[x4].role === 'trade');
  assert.ok(Math.abs(propertyPrice(planet) / price0 - 1.8) < 1e-3);
  g.addGiverXp(planet, GIVER_LEVELS[6]);
  assert.equal(m.lvl, 6);
  assert.equal(m.goods[x4].role, 'consume');
  assert.equal(m.goods[x6].role, 'produce');
});

test('Werftlevel: Bonus haftet am gebauten Schiff', async () => {
  const { GIVER_LEVELS, SHIP_TYPES, shipStats } = await import('../shared/config.js');
  const g = new Game(':memory:', { seed: 5 });
  const p = g.createPlayer('Anna');
  const yard = [...g.world.entities.values()].find((e) => e.market?.strategy === 'shipyard' && e.type === 'shipyard' && !e.noBuy);
  g.addGiverXp(yard, GIVER_LEVELS[4]);
  const m = yard.market;
  m.forSale = [];
  m.building = null;
  m.nextBuild = 0;
  m.waitSince = null;
  for (const [gd, n] of Object.entries(SHIP_TYPES.spatz.build)) m.goods[gd].stock = n;
  g.tick(1.5);
  assert.ok(m.building, 'Bau gestartet');
  assert.ok(Math.abs(m.building.bonus - 0.2) < 1e-9);
  m.building.remaining = 0;
  g.tick(1.5);
  const it = m.forSale.find((x) => x.bonus);
  assert.ok(it && it.yardLvl === 4);
  const ship = g.shipsOf(p.id)[0];
  g.revealAround(p, yard.x, yard.y, 1500);
  ship.x = yard.x + yard.radius + 28; ship.y = yard.y; ship.dockedAt = yard.id;
  p.credits = 1e7;
  assert.equal(runCommand(g, p, { cmd: 'buyShip', target: yard.id, index: m.forSale.indexOf(it) }), undefined);
  const s = g.shipsOf(p.id).find((x) => x.bonus);
  assert.ok(Math.abs(shipStats(s).speed / SHIP_TYPES[s.type].speed - 1.2) < 1e-9);
});

test('Fraktionsruf: Quest bei Fraktionsplaneten bringt Ruf, Abbruch kostet Ruf, nie unter die Rangschwelle', () => {
  const g = new Game(':memory:', { seed: 5 });
  const p = g.createPlayer('Anna');
  g.addRep(p, 'miners', 120);
  assert.equal(factionRank(p.rep.miners), 1);
  p.quest = { type: 'courier', faction: 'miners', reward: { cr: 10, xp: 100 } };
  runCommand(g, p, { cmd: 'questAbort' });
  assert.equal(p.rep.miners, RANKS[1], 'fällt höchstens auf die Rangschwelle');
});
