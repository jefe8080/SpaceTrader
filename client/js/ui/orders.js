import { SHIP_TYPES } from '/shared/config.js';
import { cmd } from '../net.js';

/**
 * Befehl "dorthin" an Schiffe: Asteroidenfeld + Bergbau -> abbauen, Objekt -> anfliegen, Punkt -> fliegen.
 * append = an Queue anhängen statt ersetzen.
 */
export function orderShips(ships, target, append = false) {
  ships = ships.filter(Boolean);
  if (!ships.length) return;
  if (!target.id) {
    cmd('order', { ships: ships.map((s) => s.id), order: { t: 'move', x: target.x, y: target.y }, append });
    return;
  }
  const miners = target.kind === 'belt' ? ships.filter((s) => SHIP_TYPES[s.type].mining) : [];
  const others = ships.filter((s) => !miners.includes(s));
  if (miners.length) cmd('order', { ships: miners.map((s) => s.id), order: { t: 'mine', target: target.id }, append });
  if (others.length) cmd('order', { ships: others.map((s) => s.id), order: { t: 'goto', target: target.id }, append });
}

/** Anfliegen und kaufen in die Queue einreihen */
export function orderBuy(ships, target, good, amount, append = true) {
  cmd('order', { ships: ships.map((s) => s.id), order: { t: 'dock', target: target.id, actions: [{ op: 'buy', good, amount }] }, append });
}
