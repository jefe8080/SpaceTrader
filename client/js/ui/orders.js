import { BELT_TYPES, ZONE_TYPES } from '/shared/config.js';
import { inZone } from '/shared/nav.js';
import { cmd } from '../net.js';
import { state } from '../state.js';
import { canMine } from '../util.js';

/**
 * Befehl "dorthin" an Schiffe: Asteroidenfeld + Bergbau -> abbauen, Objekt -> anfliegen, Punkt -> fliegen.
 * append = an Queue anhängen statt ersetzen.
 */
export function orderShips(ships, target, append = false) {
  ships = ships.filter(Boolean);
  if (!ships.length) return;
  if (!target.id) {
    // In einer Plasmawolke: Schiffe mit Gaskollektor sammeln, die anderen fliegen hin
    const zone = [...state.zones.values()].find((z) => ZONE_TYPES[z.type].mining && inZone(z, target.x, target.y));
    const collectors = zone ? ships.filter((s) => canMine(s, ZONE_TYPES[zone.type].mining)) : [];
    const rest = ships.filter((s) => !collectors.includes(s));
    if (collectors.length) cmd('order', { ships: collectors.map((s) => s.id), order: { t: 'harvest', x: target.x, y: target.y }, append });
    if (rest.length) cmd('order', { ships: rest.map((s) => s.id), order: { t: 'move', x: target.x, y: target.y }, append });
    return;
  }
  const miners = target.kind === 'belt' ? ships.filter((s) => canMine(s, BELT_TYPES[target.type].good)) : [];
  const others = ships.filter((s) => !miners.includes(s));
  if (miners.length) cmd('order', { ships: miners.map((s) => s.id), order: { t: 'mine', target: target.id }, append });
  if (others.length) cmd('order', { ships: others.map((s) => s.id), order: { t: 'goto', target: target.id }, append });
}

/** Anfliegen und kaufen in die Queue einreihen */
export function orderBuy(ships, target, good, amount, append = true) {
  cmd('order', { ships: ships.map((s) => s.id), order: { t: 'dock', target: target.id, actions: [{ op: 'buy', good, amount }] }, append });
}
