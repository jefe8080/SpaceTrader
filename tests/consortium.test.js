import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSORTIUM_LEVELS, CONSORTIUM, GOVERNOR_LICENSES, propertyPrice as propertyPriceOf0 } from '../shared/config.js';
const propertyPriceOf = (e, prop) => propertyPriceOf0(e, prop.upg);
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { consortiumView } from '../server/consortium.js';

/** Zwei Spieler, A mit Level 2 und Schiff am Hub */
export function setupCons(seed = 3) {
  const g = new Game(':memory:', { seed });
  const a = g.createPlayer('Anna');
  const b = g.createPlayer('Bert');
  const c3 = g.createPlayer('Cleo');
  a.xp = 200; a.credits = 1e7; b.credits = 1e6;
  const hub = g.world.entities.get('origin_hub');
  const ship = g.shipsOf(a.id)[0];
  ship.dockedAt = hub.id; ship.x = hub.x + hub.radius + 20; ship.y = hub.y;
  return { g, a, b, c3, hub, ship };
}
const cmd = (g, p, name, args = {}) => runCommand(g, p, { cmd: name, ...args });

test('Konsortium: Level-Tabelle = 5 × Gouverneurslizenz n−1', () => {
  assert.equal(CONSORTIUM_LEVELS[2].cost, 1250000);
  assert.equal(CONSORTIUM_LEVELS[6].cost, 5 * GOVERNOR_LICENSES[5].cost);
  assert.deepEqual(CONSORTIUM_LEVELS.slice(1).map((l) => l.maxProps), [3, 15, 35, 80, 150, 300]);
});

test('Konsortium: Gründung nur ab Level 2, am Hub, mit eindeutigem Namen', () => {
  const { g, a, b, ship } = setupCons();
  a.xp = 0;
  assert.match(cmd(g, a, 'cFound', { name: 'Nordkontor', color: '#ff8800' }), /Pilotenlevel 2/);
  a.xp = 200;
  ship.dockedAt = null;
  assert.match(cmd(g, a, 'cFound', { name: 'Nordkontor', color: '#ff8800' }), /Hub/);
  ship.dockedAt = 'origin_hub';
  assert.match(cmd(g, a, 'cFound', { name: 'No', color: '#ff8800' }), /3 bis 24/);
  const before = a.credits;
  assert.equal(cmd(g, a, 'cFound', { name: 'Nordkontor', color: '#ff8800' }), undefined);
  assert.equal(a.credits, before - 2000);
  const c = g.consortia.get(a.consortium);
  assert.equal(c.members[a.id].rank, 'master');
  // zweites Konsortium mit gleichem Namen
  b.xp = 200;
  const bs = g.shipsOf(b.id)[0]; bs.dockedAt = 'origin_hub';
  assert.match(cmd(g, b, 'cFound', { name: 'nordkontor', color: '#00ff00' }), /anderes Konsortium/);
});

test('Konsortium: Einladen, Annehmen, Ränge, Rausschmiss, Austritt, Auflösung', () => {
  const { g, a, b, c3 } = setupCons();
  cmd(g, a, 'cFound', { name: 'Nordkontor', color: '#ff8800' });
  const c = g.consortia.get(a.consortium);
  assert.match(cmd(g, b, 'cInvite', { name: 'Anna' }), /Handelsmeister/);
  assert.equal(cmd(g, a, 'cInvite', { name: 'Bert' }), undefined);
  assert.equal(consortiumView(g, b).invites.length, 1);
  assert.equal(cmd(g, b, 'cAnswer', { id: c.id, accept: true }), undefined);
  assert.equal(b.consortium, c.id);
  assert.equal(c.members[b.id].rank, 'trader');
  // Händler dürfen nicht auszahlen
  assert.match(cmd(g, b, 'cWithdraw', { amount: 10 }), /Handelsmeister/);
  // Letzter Handelsmeister kann nicht austreten
  assert.match(cmd(g, a, 'cLeave'), /letzte Handelsmeister/);
  assert.equal(cmd(g, a, 'cPromote', { player: b.id }), undefined);
  assert.equal(c.members[b.id].rank, 'master');
  // Handelsmeister können andere Handelsmeister herabstufen und entfernen
  assert.equal(cmd(g, b, 'cDemote', { player: a.id }), undefined);
  assert.equal(c.members[a.id].rank, 'trader');
  cmd(g, b, 'cInvite', { name: 'Cleo' });
  cmd(g, c3, 'cAnswer', { id: c.id, accept: true });
  assert.equal(cmd(g, b, 'cKick', { player: c3.id }), undefined);
  assert.equal(c3.consortium, null);
  assert.equal(cmd(g, a, 'cLeave'), undefined);
  assert.equal(a.consortium, null);
  // Letztes Mitglied tritt aus: Auflösung
  assert.equal(cmd(g, b, 'cLeave'), undefined);
  assert.equal(g.consortia.size, 0);
});

test('Konsortium: Pool mit Gebühren (Einzahlen 10 %, Auszahlen 20 %), Levelaufstieg aus dem Pool', () => {
  const { g, a } = setupCons();
  cmd(g, a, 'cFound', { name: 'Nordkontor', color: '#ff8800' });
  const c = g.consortia.get(a.consortium);
  const cr = a.credits;
  assert.equal(cmd(g, a, 'cDeposit', { amount: 1000000 }), undefined);
  assert.equal(c.credits, 900000);
  assert.equal(a.credits, cr - 1000000);
  assert.equal(cmd(g, a, 'cWithdraw', { amount: 100000 }), undefined);
  assert.equal(c.credits, 800000);
  assert.equal(a.credits, cr - 1000000 + 80000);
  assert.match(cmd(g, a, 'cWithdraw', { amount: 900000 }), /Pool/);
  assert.match(cmd(g, a, 'cLevelUp'), /Pool/);
  cmd(g, a, 'cDeposit', { amount: 1000000 });
  assert.equal(cmd(g, a, 'cLevelUp'), undefined);
  assert.equal(c.level, 2);
  assert.equal(c.credits, 1700000 - 1250000);
  const log = consortiumView(g, a).log.map((e) => e.action);
  assert.ok(['found', 'deposit', 'withdraw', 'level'].every((x) => log.includes(x)));
});

test('Konsortium: Schwarzes Brett und Speichern/Laden', () => {
  const { g, a } = setupCons();
  cmd(g, a, 'cFound', { name: 'Nordkontor', color: '#ff8800' });
  cmd(g, a, 'cBoard', { text: 'Treffen am Hub\num 20 Uhr' });
  const c = g.consortia.get(a.consortium);
  assert.equal(c.board.text, 'Treffen am Hub\num 20 Uhr');
  assert.equal(c.board.by, 'Anna');
  assert.equal(cmd(g, a, 'cBoard', { text: 'x'.repeat(3000) }), undefined);
  assert.equal(c.board.text.length, CONSORTIUM.BOARD_MAX);
  g.save();
  assert.ok(g.store.db.prepare('SELECT COUNT(*) n FROM consortium_log').get().n >= 1);
  assert.equal(g.store.db.prepare('SELECT COUNT(*) n FROM consortia').get().n, 1);
});

/** Konsortium mit A (Handelsmeister) und B (Händler), Pool gefüllt, A mit Lizenz 3 */
function withCons() {
  const env = setupCons();
  const { g, a, b } = env;
  cmd(g, a, 'cFound', { name: 'Nordkontor', color: '#ff8800' });
  const c = g.consortia.get(a.consortium);
  cmd(g, a, 'cInvite', { name: 'Bert' });
  cmd(g, b, 'cAnswer', { id: c.id, accept: true });
  c.credits = 5e7;
  a.governor = 3; a.faction = { name: 'Annas Kontor', color: '#ff0000' };
  return { ...env, c };
}
const dockAt = (g, s, e) => { s.dockedAt = e.id; s.state = 'docked'; s.x = e.x + e.radius + 20; s.y = e.y; };

test('Konsortiumsbesitz: Kauf aus dem Pool, Lager zum Fixpreis, Verwaltung nur Handelsmeister', () => {
  const { g, a, b, c, ship } = withCons();
  const planet = [...g.world.entities.values()].find((e) => e.kind === 'planet' && !e.noBuy && !e.faction && e.market);
  for (const p of [a, b]) g.revealAround(p, planet.x, planet.y, 3000);
  dockAt(g, ship, planet);
  const bs = g.shipsOf(b.id)[0];
  dockAt(g, bs, planet);
  assert.match(cmd(g, b, 'cBuyProperty', { target: planet.id }), /Handelsmeister/);
  const pool = c.credits;
  assert.equal(cmd(g, a, 'cBuyProperty', { target: planet.id }), undefined);
  const prop = g.ownership.get(planet.id);
  assert.equal(prop.player, 'c:' + c.id);
  assert.ok(c.credits < pool);
  assert.equal(planet.ownerName, 'Nordkontor');
  // Lager: Händler entnimmt zum Fixpreis, zahlt an den Pool
  const [good, slot] = Object.entries(planet.market.goods).find(([, s]) => s.role === 'produce' && s.stock > 10);
  const price = g.fixedPriceOf(planet, prop, good);
  const bc = b.credits, pc = c.credits;
  const res = g.trade(bs, planet, good, 5, 'buy');
  assert.equal(res.n, 5);
  assert.ok(Math.abs(bc - b.credits - 5 * price) < 1e-6);
  assert.ok(Math.abs(c.credits - pc - 5 * price) < 1e-6);
  // Einlagern: Pool zahlt
  const res2 = g.trade(bs, planet, good, 5, 'sell');
  assert.equal(res2.n, 5);
  assert.ok(Math.abs(b.credits - bc) < 1e-6);
  // Verwaltung
  assert.match(cmd(g, b, 'propMode', { target: planet.id, mode: 'private' }), /Handelsmeister/);
  assert.equal(cmd(g, a, 'propMode', { target: planet.id, mode: 'private' }), undefined);
  // Ausbaugrenze nach Konsortiumslevel (Level 1: Stufe 2)
  prop.upg.storage = 2;
  assert.match(cmd(g, a, 'propUpgrade', { target: planet.id, line: 'storage' }), /Konsortiumslevel 1/);
  // Herauskaufen
  const price2 = propertyPriceOf(planet, prop);
  const ac = a.credits;
  assert.equal(cmd(g, a, 'cBuyOut', { target: planet.id }), undefined);
  assert.equal(prop.player, a.id);
  assert.equal(a.credits, ac - price2);
  // Übertragen zurück (Schenkung)
  assert.equal(cmd(g, a, 'cTransfer', { target: planet.id }), undefined);
  assert.equal(prop.player, 'c:' + c.id);
  // Auflösung: herrenlos
  cmd(g, b, 'cLeave');
  cmd(g, a, 'cLeave');
  assert.equal(g.ownership.has(planet.id), false);
  assert.equal(planet.market.owner, undefined);
});

test('Kartendaten: Kauf überträgt den Stand ohne XP und Almanach, Verkäufer erhält 90 %', () => {
  const { g, a, b, c } = withCons();
  const sec = g.world.sectors.get('0,0');
  g.revealAround(a, sec.bh.x, sec.bh.y, 40000);
  assert.equal(cmd(g, a, 'cMapOffer', { sector: '0,0', price: 10000 }), undefined);
  const o = [...g.mapOffers.values()][0];
  assert.match(cmd(g, a, 'cMapBuy', { id: o.id }), /Eigene/);
  const xp = b.xp || 0, recipes = b.known.recipe.size, cells = b.revealed.size, ac = a.credits;
  assert.equal(cmd(g, b, 'cMapBuy', { id: o.id }), undefined);
  assert.ok(b.revealed.size > cells + 1000);
  assert.equal(b.xp || 0, xp, 'keine XP');
  assert.equal(b.known.recipe.size, recipes, 'kein Almanach');
  assert.equal(a.credits, ac + 9000);
  assert.ok(g.mapOffers.has(o.id), 'Angebot bleibt');
  // Austritt löscht Angebote
  cmd(g, a, 'cPromote', { player: b.id });
  cmd(g, a, 'cLeave');
  assert.equal(g.mapOffers.size, 0);
  assert.ok(c);
});

test('Schiffshandel: Sperre, Bedingungen, Übergang an Ort und Stelle', () => {
  const { g, a, b, ship } = withCons();
  assert.match(cmd(g, a, 'cShipOffer', { ship: ship.id, price: 1000 }), /letztes Schiff/);
  const s2 = g.spawnShip(a, 'spatz', g.world.entities.get('origin_yard'));
  s2.upg = { speed: 2 };
  s2.cargo = { ore: 3 };
  assert.match(cmd(g, a, 'cShipOffer', { ship: s2.id, price: 1000 }), /Laderaum/);
  s2.cargo = {};
  assert.equal(cmd(g, a, 'cShipOffer', { ship: s2.id, price: 1000 }), undefined);
  assert.match(cmd(g, a, 'stop', { ships: [s2.id] }), /angeboten/);
  const bc = b.credits, ac = a.credits;
  assert.equal(cmd(g, b, 'cShipBuy', { ship: s2.id }), undefined);
  assert.equal(s2.owner, b.id);
  assert.equal(s2.upg.speed, 2);
  assert.equal(b.credits, bc - 1000);
  assert.equal(a.credits, ac + 900);
  assert.equal(g.shipOffers.size, 0);
  assert.equal(cmd(g, b, 'stop', { ships: [s2.id] }), undefined);
});
