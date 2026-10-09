// Konsortien (PRD-3 Kapitel 4): gemeinsamer Geldpool, gemeinsamer Besitz, Karten- und Schiffshandel.
// Alle Zahlen sind Kalibrierungsannahmen.
import { GOVERNOR_LICENSES } from './property.js';

/** Level: Aufstieg auf n kostet 5 × Gouverneurslizenz n−1 (aus dem Pool), Level 1 = Gründung aus dem Privatgeld */
export const CONSORTIUM_LEVELS = [
  null,
  { level: 1, maxProps: 3, maxLevel: 2, cost: 2000 },
  { level: 2, maxProps: 15, maxLevel: 3, cost: 5 * GOVERNOR_LICENSES[1].cost },
  { level: 3, maxProps: 35, maxLevel: 4, cost: 5 * GOVERNOR_LICENSES[2].cost },
  { level: 4, maxProps: 80, maxLevel: 5, cost: 5 * GOVERNOR_LICENSES[3].cost },
  { level: 5, maxProps: 150, maxLevel: 6, cost: 5 * GOVERNOR_LICENSES[4].cost },
  { level: 6, maxProps: 300, maxLevel: 7, cost: 5 * GOVERNOR_LICENSES[5].cost },
];
export const MAX_CONSORTIUM_LEVEL = CONSORTIUM_LEVELS.length - 1;

export const CONSORTIUM = {
  FOUND_LEVEL: 2,         // Pilotenlevel für die Gründung
  NAME: [3, 24],
  DEPOSIT_SHARE: 0.9,     // Einzahlen: Pool erhält 90 %
  WITHDRAW_SHARE: 0.8,    // Auszahlen: Handelsmeister erhält 80 %
  SALE_SHARE: 0.9,        // Karten- und Schiffshandel: Verkäufer erhält 90 %
  INVITE_MS: 24 * 3600 * 1000,
  BOARD_MAX: 2000,
  LOG_MAX: 1000,
  LOG_MS: 30 * 24 * 3600 * 1000,
  PREFIX: 'c:',           // Besitz eines Konsortiums: ownership.player = 'c:<id>'
};

export const RANK = { trader: 'Händler', master: 'Handelsmeister' };

export const isConsortiumOwner = (owner) => typeof owner === 'string' && owner.startsWith(CONSORTIUM.PREFIX);
export const consortiumOwner = (cid) => CONSORTIUM.PREFIX + cid;
export const consortiumIdOf = (owner) => (isConsortiumOwner(owner) ? owner.slice(CONSORTIUM.PREFIX.length) : null);

/** Aktionen im Log mit Anzeigetext */
export const LOG_ACTIONS = {
  found: 'gegründet',
  join: 'beigetreten',
  leave: 'ausgetreten',
  kick: 'rausgeworfen',
  promote: 'befördert',
  demote: 'herabgestuft',
  deposit: 'eingezahlt',
  withdraw: 'ausgezahlt',
  level: 'Levelaufstieg',
  buy: 'gekauft',
  transfer: 'übertragen',
  buyout: 'herausgekauft',
  upgrade: 'Ausbau',
  factory: 'Fabrikbau',
  shipSale: 'Schiff verkauft',
  mapSale: 'Kartendaten verkauft',
  revenue: 'Erlöse (Stunde)',
};
