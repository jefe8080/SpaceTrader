// PRD 15 U08: strategisches Bewachen/Abfangen, Unterstützungsrechte, Konsortiumsbündnis und Schutzmodul an Werften.
import { COMBAT, navalClass } from '../../shared/combat.js';
import { joinBattle } from './battle.js';
import { stackOf, stackMembers, leaderOf } from './stacks.js';
import { isProtected } from './engage.js';
import { allianceActive, sameCamp, isFactionOwner } from './diplomacy.js';
import { setWarn } from '../ships.js';

/** Standardhaltung: militärische Einheiten fangen ab */
export function postureOf(ship) {
  return ship.posture || { mode: 'intercept' };
}

/** Kann dieses Schiff bzw. sein Stack Unterstützung auslösen? Nur Kriegsschiffe und Stacks mit Kriegsschiffen. */
export function canSupport(game, ship) {
  const lead = leaderOf(game, ship);
  if (lead !== ship) return false;
  if (ship.battle || ship.captive || ship.repairRun || ship.repairHold) return false;
  const c = ship.queue[0];
  if (c && (c.t === 'attack' || c.t === 'intercept' || c.t === 'repairRun' || c.t === 'repairWait' || c.t === 'salvage')) return false;
  const st = stackOf(game, ship);
  return (st ? stackMembers(game, st) : [ship]).some((m) => navalClass(m.type) === 'war' && !isProtected(m) && !m.repairHold);
}

/** Bündnisstand je Seite zu Schlachtbeginn: Änderungen gelten nur für neue Begegnungen */
export function snapshotAllies(game, b) {
  b.allies = {};
  for (const side of ['A', 'B']) {
    const set = new Set(b.sides[side].owners);
    for (const o of b.sides[side].owners) {
      if (isFactionOwner(o)) continue;
      for (const p of game.players.values()) if (p.id !== o && allianceActive(game, o, p.id)) set.add(p.id);
    }
    b.allies[side] = [...set];
  }
}

/** Seite, die der Besitzer in dieser Schlacht unterstützen darf (eigene oder militärisch verbündete Einheiten) */
export function supportSide(game, b, owner) {
  for (const side of ['A', 'B']) if ((b.allies?.[side] || b.sides[side].owners).includes(owner)) return side;
  return null;
}

const speedOf = (game, ship) => game.shipSpeed(ship);

/**
 * Hilferufe verteilen: Abfangen bis halbe Sektorweite, Bewachen nur im lokalen Radius um den Schutzort.
 * Ein laufender Kampfeinsatz wird nicht abgebrochen; bei mehreren Rufen hat das nächste erreichbare Ziel Vorrang.
 */
export function tickSupport(game) {
  if (!game.battles.size) return;
  const calls = [...game.battles.values()].filter((b) => !b.ended);
  for (const ship of game.ships.values()) {
    if (!canSupport(game, ship)) continue;
    const posture = postureOf(ship);
    let best = null, bt = Infinity;
    for (const b of calls) {
      const side = supportSide(game, b, ship.owner);
      if (!side) continue;
      const d = Math.hypot(b.x - ship.x, b.y - ship.y);
      if (posture.mode === 'guard') {
        const gx = posture.x ?? ship.x, gy = posture.y ?? ship.y;
        if (Math.hypot(b.x - gx, b.y - gy) > COMBAT.SUPPORT_LOCAL) continue;
      } else if (posture.mode === 'passive' || d > COMBAT.INTERCEPT) continue;
      const t = d / Math.max(1, speedOf(game, ship));
      if (t < bt) { bt = t; best = { b, side }; }
    }
    if (!best) continue;
    const back = posture.mode === 'guard' && posture.x !== undefined ? [{ t: 'move', x: posture.x, y: posture.y, qid: ++ship.qid, guardReturn: true }] : [];
    // Reise-/Handelsaufträge bleiben dahinter erhalten und werden anschließend fortgesetzt
    ship.queue = [{ t: 'intercept', battle: best.b.id, side: best.side, qid: ++ship.qid }, ...back, ...ship.queue.filter((c) => !c.guardReturn)];
    ship.nav = null;
    game.shipLog(ship, `${posture.mode === 'guard' ? 'Bewachen' : 'Abfangen'}: unterstützt eine Schlacht in ${Math.round(bt)} s Flugzeit`);
  }
}

/** Anflug zur Schlacht; Beitritt erst beim tatsächlichen Erreichen, keine sofortige Übertragung */
export function runIntercept(ship, c, dt, game, flyTo) {
  const b = game.battles.get(c.battle);
  if (!b || b.ended) { game.shipLog(ship, 'Hilferuf erledigt: Schlacht bereits beendet'); return true; }
  if (b.retreated.includes(ship.id)) return true;
  const d = Math.hypot(b.x - ship.x, b.y - ship.y);
  if (d > COMBAT.ENGAGE) {
    ship.state = 'flying';
    ship.dockedAt = null;
    flyTo(ship, b.x, b.y, dt, game);
    return false;
  }
  joinBattle(game, b, [ship], c.side);
  return false; // Befehl bleibt bis Schlachtende vorn und wird dann entfernt
}

/** Werften führen Schutzmodule als physische Exemplare (Ein-/Ausbau ausschließlich dort) */
export function stockProtection(game) {
  for (const e of game.world.entities.values()) {
    if (e.kind !== 'station' || !['shipyard', 'bigyard'].includes(e.type) || game.ownership.has(e.id) || !e.market) continue;
    e.market.moduleInventory ||= {};
    if ((e.market.moduleInventory.protect || 0) < 2) e.market.moduleInventory.protect = 2;
  }
}

export const isYard = (e) => e?.kind === 'station' && ['shipyard', 'bigyard', 'factionyard'].includes(e.type);

/** Militärisches Bündnis des Konsortiums: nur die Leitung (Handelsmeister) darf es ändern */
export function setAlliance(game, player, on) {
  const c = game.consortia.get(player.consortium);
  if (!c) return 'Kein Konsortium.';
  if (c.members[player.id]?.rank !== 'master') return 'Nur die Konsortiumsleitung darf das militärische Bündnis ändern.';
  c.military = !!on;
  game.emit('consortium', c);
  return null;
}

export { sameCamp, setWarn };
