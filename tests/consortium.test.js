import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSORTIUM_LEVELS, CONSORTIUM, GOVERNOR_LICENSES } from '../shared/config.js';
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
