import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMAND, GOODS, demandAmount, demandPrice, unitPrice, PRICE } from '../shared/config.js';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { tickEvents, eventAt } from '../server/events.js';

test('Sondernachfrage: Mengenformel wie PRD-3 Kapitel 5', () => {
  assert.equal(demandAmount('ore', 2), 200);
  assert.equal(demandAmount('electronics', 2), 23);
  assert.equal(demandAmount('aicores', 2), 5);
  assert.ok(Math.abs(demandPrice('ore', 1.1) - 2 * unitPrice('ore', 0, 1, 1.1) * (1 - PRICE.SPREAD)) < 1e-9);
});

test('Sondernachfrage: Timer nur in aktiven Sektoren, manueller Verkauf zum Festpreis ohne Lagerwirkung', () => {
  const g = new Game(':memory:', { seed: 8 });
  const p = g.createPlayer('Eva');
  tickEvents(g, 1);
  const rec = g.sectorEvents.get('0,0');
  assert.ok(rec && !rec.event, 'Timer läuft im Startsektor');
  rec.timer = 0.5;
  tickEvents(g, 1);
  const ev = rec.event;
  assert.ok(ev, 'Event gestartet');
  const e = g.world.entities.get(ev.entity);
  assert.equal(e.kind, 'planet');
  assert.ok(!GOODS[ev.good].ultra && GOODS[ev.good].cls !== 'passenger');
  g.revealAround(p, e.x, e.y, 2000);
  const ship = g.shipsOf(p.id)[0];
  ship.dockedAt = e.id; ship.state = 'docked'; ship.x = e.x + e.radius + 20; ship.y = e.y;
  ship.cargo = { [ev.good]: 3 };
  // Route bzw. automatischer Handel zählt nicht
  const r0 = g.trade(ship, e, ev.good, 1, 'sell', 0, { auto: true });
  assert.equal(ev.left, ev.total, 'nur manuelle Verkäufe');
  assert.ok(r0);
  ship.cargo = { [ev.good]: 3 };
  const stock = e.market.goods[ev.good]?.stock;
  const cr = p.credits;
  assert.equal(runCommand(g, p, { cmd: 'trade', ship: ship.id, target: e.id, good: ev.good, dir: 'sell', amount: 3 }), undefined);
  assert.ok(Math.abs(p.credits - cr - 3 * ev.price) < 1e-6);
  assert.equal(ev.left, ev.total - 3);
  assert.equal(e.market.goods[ev.good]?.stock, stock, 'Marktlager unverändert');
  // Ende nach 30 min
  g.time = ev.ends + 1;
  tickEvents(g, 1);
  assert.equal(rec.event, null);
  assert.ok(rec.timer >= DEMAND.TIMER[0]);
  assert.equal(eventAt(g, e.id), null);
});
