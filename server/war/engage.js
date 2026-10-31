// PRD 15 Kapitel 4.1: ausdrückliche Angriffsbefehle, reales Erreichen der Waffenreichweite, Beitritt zu laufenden Schlachten.
import { COMBAT, navalClass } from '../../shared/combat.js';
import { startBattle, joinBattle, joinSideFor } from './battle.js';
import { attackBlock } from './diplomacy.js';
import { stackOf, stackMembers, leaderOf } from './stacks.js';
import { setWarn } from '../ships.js';

/** Geschützte Schiffe sind unangreifbar; ein vollständig geschützter Stack eröffnet keine Schlacht */
export const isProtected = (ship) => !!ship.modules?.includes('protect');
export function fullyProtected(game, ship) {
  const st = stackOf(game, ship);
  return (st ? stackMembers(game, st) : [ship]).every(isProtected);
}

/** Kann das Schiff überhaupt angreifen? Zivilschiffe kämpfen nicht, geschützte Schiffe haben keine Bewaffnung. */
export function attackerError(game, ship) {
  const st = stackOf(game, ship);
  const crew = st ? stackMembers(game, st) : [ship];
  if (!crew.some((s) => navalClass(s.type) !== 'civil' && !isProtected(s))) return `${ship.name} besitzt keine einsatzfähige Bewaffnung.`;
  return null;
}

/** Ziel prüfen (Besitz, Konsortium, Freundschaft, Schutzmodul, Gefangenschaft) */
export function targetError(game, attacker, target) {
  if (!target) return 'Ziel nicht mehr verfügbar.';
  if (target.captive) return 'Gefangene Schiffe sind nicht angreifbar.';
  const block = attackBlock(game, attacker.owner, target.owner);
  if (block) return block;
  if (!target.battle && fullyProtected(game, target)) return `${target.name} ist durch Schutzmodule unangreifbar.`;
  return null;
}

/** Strategische Ausführung des Angriffsbefehls (Queue-Befehl { t: 'attack', target }) */
export function runAttack(ship, c, dt, game, flyTo) {
  const target = game.ships.get(c.target);
  const err = targetError(game, ship, target);
  if (err) { game.shipLog(ship, `Angriff beendet: ${err}`); return true; }
  const b = target.battle ? game.battles.get(target.battle) : null;
  const tx = b ? b.x : target.x, ty = b ? b.y : target.y;
  const d = Math.hypot(tx - ship.x, ty - ship.y);
  if (d > COMBAT.ENGAGE) {
    ship.state = 'flying';
    ship.dockedAt = null;
    flyTo(ship, tx, ty, dt, game);
    return false;
  }
  if (b) {
    if (b.retreated.includes(ship.id)) { game.shipLog(ship, 'Zurückgezogene Einheiten dürfen derselben Schlacht nicht erneut beitreten.'); return true; }
    const targetSide = b.units[target.id]?.side;
    const side = targetSide && joinSideFor(game, b, ship.owner, targetSide);
    if (!side) { game.shipLog(ship, 'Keine kompatible Schlachtseite.'); return true; }
    joinBattle(game, b, [ship], side);
    return true;
  }
  startBattle(game, [ship], [target]);
  return true;
}

/**
 * Zivile Ziele versuchen vor dem Stellen zu fliehen: ein schnelleres Ziel kann entkommen.
 * Gilt für zivile Schiffe und Stacks ohne kampffähige Mitglieder.
 */
export function tickEngagements(game) {
  const hunted = new Map();
  for (const s of game.ships.values()) {
    const c = s.queue[0];
    if (c?.t !== 'attack' || s.battle) continue;
    const t = game.ships.get(c.target);
    if (!t || t.battle || t.captive) continue;
    const lead = leaderOf(game, t);
    const st = stackOf(game, lead);
    const crew = st ? stackMembers(game, st) : [lead];
    if (crew.some((m) => navalClass(m.type) !== 'civil' && !isProtected(m))) continue;
    if (Math.hypot(s.x - lead.x, s.y - lead.y) < 6000) hunted.set(lead.id, s.id);
  }
  for (const s of game.ships.values()) {
    if (hunted.has(s.id)) { s.fleeFrom = hunted.get(s.id); setWarn(s, 'flee', 'Flucht vor einem Angreifer'); }
    else if (s.fleeFrom) { delete s.fleeFrom; setWarn(s, 'flee', null); }
  }
}

/** Fluchtbewegung (statt der eigenen Queue, solange ein Angreifer nahe ist) */
export function runFlee(ship, dt, game, flyTo) {
  const h = game.ships.get(ship.fleeFrom);
  if (!h) { delete ship.fleeFrom; return false; }
  const a = Math.atan2(ship.y - h.y, ship.x - h.x);
  ship.state = 'flying';
  ship.dockedAt = null;
  ship.nav = null;
  flyTo(ship, ship.x + Math.cos(a) * 2000, ship.y + Math.sin(a) * 2000, dt, game);
  return true;
}
