// PRD 15 U05: Schlachtansicht je Betrachter. Beteiligte sehen eigene Einheiten vollständig und gegnerische nur
// gemäß Aufklärung ihrer Seite; Zuschauer sehen sichtbare Kampfhandlungen ohne Systeme, Befehle oder Rückzugsregeln.
import { blueprint, maxHull, systemState, COMBAT } from '../../shared/combat.js';
import { kindFactor } from '../../shared/damage.js';
import { battleSymbol, isActive, drivesDestroyed } from './battle.js';
import { ownerName, ownerColor } from './diplomacy.js';

const r1 = (v) => Math.round(v * 10) / 10;

export function sideOf(b, playerId) {
  for (const side of ['A', 'B']) if (Object.values(b.units).some((u) => u.side === side && u.owner === playerId)) return side;
  return null;
}

/** Sichtbare Schlachtsymbole im Ausschnitt (kein globales Verzeichnis aller Schlachten) */
export function visibleBattles(game, player, view, margin) {
  const out = [];
  for (const b of game.battles.values()) {
    const mine = sideOf(b, player.id);
    if (!mine) {
      if (!view || b.x < view.x0 - margin || b.x > view.x1 + margin || b.y < view.y0 - margin || b.y > view.y1 + margin) continue;
      if (!game.isKnown(player, b)) continue;
    }
    out.push({ ...battleSymbol(game, b), mine: !!mine });
  }
  return out;
}

export function battleView(game, b, player, since = -1) {
  const side = sideOf(b, player.id);
  const units = [];
  for (const u of Object.values(b.units)) {
    const ship = game.ships.get(u.ship);
    if (!ship || u.state === 'retreated') continue;
    const bp = blueprint(ship.type);
    const own = u.owner === player.id;
    const friendly = side && u.side === side;
    const known = side && !friendly ? b.known[side][u.ship] : null;
    // Gegner außerhalb der eigenen Erfassung: nur zuletzt bekannte Position
    if (side && !friendly && !known) continue;
    const live = !side || friendly || known?.live;
    const o = {
      id: u.ship, type: ship.type, name: ship.name, side: u.side, owner: ownerName(game, u.owner), color: ownerColor(game, u.owner), own,
      x: Math.round(live ? u.x : known.x), y: Math.round(live ? u.y : known.y), a: r1(u.a), v: Math.round(u.v), live: !!live,
      state: u.state, hull: r1(ship.dmg.hull / Math.max(1, maxHull(ship.type))), shields: bp.shields.map((s, i) => ({ k: s.k, f: r1(Math.max(0, u.shields[i]) / s.max) })),
      craft: bp.squad ? ship.dmg.craft : null, protected: !!u.protected, fire: u.fires.length > 0,
      immobile: drivesDestroyed(ship),
      driveJammed: !bp.squad && kindFactor(u, ship, 'engine', b.t) === 0, size: bp.tier,
    };
    if (own) {
      // Eigene Einheiten: Systeme, Aufträge, Haltung, Rückzugspolitik
      o.systems = bp.systems.map((s) => ({ id: s.id, kind: s.kind, x: s.x, y: s.y, hp: Math.round(ship.dmg.sys[s.id] ?? s.hp), max: s.hp,
        state: (u.jam[s.id] || 0) > b.t ? 'jammed' : systemState(ship.dmg.sys[s.id] ?? s.hp, s.hp) }));
      Object.assign(o, { ai: u.ai, order: u.order, stance: u.stance, retreat: u.retreat, prio: u.prio, dcPrio: u.dcPrio || null,
        prep: u.state === 'retreating' ? r1(u.prep / COMBAT.JUMP_PREP[bp.tier]) : null, retreatBlock: u.retreatBlock || null,
        ammo: bp.weapons.map((w, i) => (w.ammo != null ? ship.dmg.ammo[i] : null)).filter((x) => x !== null) });
    } else if (friendly) {
      o.systems = bp.systems.map((s) => ({ id: s.id, kind: s.kind, x: s.x, y: s.y, state: systemState(ship.dmg.sys[s.id] ?? s.hp, s.hp) }));
    } else if (known) {
      // Nur identifizierte Systeme mit dem Zustand beim letzten Kontakt
      o.systems = bp.systems.filter((s) => known.sys.includes(s.id)).map((s) => ({ id: s.id, kind: s.kind, x: s.x, y: s.y, state: systemState(known.st[s.id] ?? s.hp, s.hp) }));
    }
    units.push(o);
  }
  const fx = (game.battleFx.get(b.id) || []).filter((e) => e.t > since);
  return {
    id: b.id, t: r1(b.t), kind: b.kind, side, map: COMBAT.MAP, edge: COMBAT.EDGE, units,
    projectiles: b.projectiles.map((p) => ({ id: p.id, w: p.w, x: Math.round(p.x), y: Math.round(p.y), a: r1(p.a), side: p.side })),
    fx, sides: { A: b.sides.A.owners.map((o) => ownerName(game, o)), B: b.sides.B.owners.map((o) => ownerName(game, o)) },
    inhibitors: Object.values(b.units).filter((u) => isActive(u) && blueprint(u.type).inhibitor && (!side || u.side === side || b.known[side][u.ship]?.live))
      .map((u) => ({ x: Math.round(u.x), y: Math.round(u.y), r: blueprint(u.type).inhibitor })),
    log: side ? b.log.slice(-12) : [],
    raid: b.raid ? { phase: b.raid.phase || 'fight', left: b.raid.until ? Math.max(0, Math.round(b.raid.until - b.t)) : null } : null,
  };
}
