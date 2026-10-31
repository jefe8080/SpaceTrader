// PRD 15 Kapitel 9: Besitzer, Feindschaft und Unterstützungsrechte zwischen Spielern, Konsortien und NPC-Fraktionen.
import { FACTIONS } from '../../shared/factions.js';
import { isConsortiumOwner } from '../../shared/consortium.js';

export const FACTION_OWNER = 'fac:';
export const isFactionOwner = (o) => typeof o === 'string' && o.startsWith(FACTION_OWNER);
export const factionOfOwner = (o) => (isFactionOwner(o) ? o.slice(FACTION_OWNER.length) : null);
export const factionOwner = (f) => FACTION_OWNER + f;

export function ownerName(game, owner) {
  if (isFactionOwner(owner)) return FACTIONS[factionOfOwner(owner)]?.name || 'Fraktion';
  if (isConsortiumOwner(owner)) return game.ownerLabel(owner).name;
  return game.players.get(owner)?.name || owner;
}
export function ownerColor(game, owner) {
  if (isFactionOwner(owner)) return FACTIONS[factionOfOwner(owner)]?.color || '#999';
  return game.players.get(owner)?.color || '#999';
}

/** Diplomatiezustand eines Spielers (persistiert am Spieler) */
export function diplo(p) {
  p.war ||= {};
  p.war.friends ||= [];
  p.war.aggr ||= {};
  p.war.peace ||= {};
  return p.war;
}

/** Befreundet? Vor der ersten Freundschaft sind alle Fraktionen neutral. */
export const isFriend = (p, faction) => !!p && diplo(p).friends.includes(faction);
export const neutralPhase = (p) => !!p && !diplo(p).friends.length;

/** Dieselbe Seite im weiteren Sinn: eigener Besitz oder Konsortiumsmitglied */
export function sameCamp(game, a, b) {
  if (a === b) return true;
  const pa = game.players.get(a), pb = game.players.get(b);
  return !!(pa && pb && pa.consortium && pa.consortium === pb.consortium);
}

/** Militärisches Bündnis des Konsortiums aktiv (Standard aktiv, nur die Leitung ändert es) */
export function allianceActive(game, a, b) {
  if (!sameCamp(game, a, b) || a === b) return a === b;
  const c = game.consortia.get(game.players.get(a)?.consortium);
  return c ? c.military !== false : false;
}

/**
 * Darf attacker den Besitzer target ausdrücklich angreifen?
 * Eigene Einheiten und Konsortiumsmitglieder nie; die eigene befreundete Fraktion nur bei Konsortiumsverteidigung.
 */
export function attackBlock(game, attacker, target, { defending = null } = {}) {
  if (sameCamp(game, attacker, target)) return 'Eigene Einheiten und Konsortiumsmitglieder sind nicht angreifbar.';
  const fa = factionOfOwner(attacker), ft = factionOfOwner(target);
  if (fa && ft) return fa === ft ? 'Gleiche Fraktion.' : null;
  if (ft) {
    const p = game.players.get(attacker);
    if (isFriend(p, ft) && !(defending && allianceActive(game, attacker, defending))) return 'Die direkte Attacke auf die eigene befreundete Fraktion ist gesperrt.';
  }
  return null;
}

/** Würde ein NPC dieser Fraktion den Besitzer automatisch angreifen? (Neutralität vor erster Freundschaft) */
export function factionHostileTo(game, faction, owner) {
  const f2 = factionOfOwner(owner);
  if (f2) return f2 !== faction;
  const p = game.players.get(owner);
  if (!p) return false;
  if (neutralPhase(p)) return false;
  return !isFriend(p, faction);
}
