// Schiffe, Klassen, Stufen-Upgrades, Module und Pilotenlizenz. Alle Zahlen sind Kalibrierungsannahmen.
import { GOODS } from './goods.js';
import { FACTIONS, FACTION_SHIPS } from './factions.js';

export const SHIP_CLASSES = {
  S:  { name: 'S', license: 1, yard: 'shipyard' },
  M:  { name: 'M', license: 2, yard: 'shipyard' },
  L:  { name: 'L', license: 3, yard: 'bigyard' },
  XL: { name: 'XL', license: 5, yard: 'bigyard' },
  F:  { name: 'Fraktion', license: 4, yard: 'faction' },
};

/** Faktor je Stufe für Schiffe, Lizenzen und Upgrades (Geldbalance: exponentielle Senken) */
export const STEP = 1.6;

/**
 * Schiffstypen. price = Referenzpreis (Werften verlangen Materialkosten plus Marge), tank in Einheiten Schiffstreibstoff.
 * Annahme Treibstoff: Tank für ca. 8 h Flug; bei L/XL liegt eine Tankfüllung unter 2 % des Schiffspreises.
 */
export const SHIP_TYPES = {
  // S - jede Werft, Pilotenlizenz 1
  spatz:      { cls: 'S', name: 'Spatz', sprite: 'ship_spatz', size: 26, cargo: 30, speed: 150, mining: 1.5, price: 4000, tank: 6,
                desc: 'Kleiner Allrounder mit Bergbaulaser.' },
  maulwurf:   { cls: 'S', name: 'Maulwurf', sprite: 'ship_maulwurf', size: 30, cargo: 60, speed: 150, mining: 4, price: 8000, tank: 9,
                desc: 'Kleines Bergbauschiff mit schwerem Bohrkopf.' },
  kolibri:    { cls: 'S', name: 'Kolibri', sprite: 'ship_kolibri', size: 28, cargo: 40, speed: 260, mining: 0, price: 13000, tank: 10,
                desc: 'Schneller Kurier für lange Strecken.' },
  // M - jede Werft, Pilotenlizenz 2
  lastesel:   { cls: 'M', name: 'Lastesel', sprite: 'ship_lastesel', size: 40, cargo: 250, speed: 100, mining: 0, price: 40000, tank: 30,
                desc: 'Träger Frachter mit großem Laderaum.' },
  grubenhund: { cls: 'M', name: 'Grubenhund', sprite: 'ship_grubenhund', size: 40, cargo: 180, speed: 110, mining: 10, price: 55000, tank: 32,
                desc: 'Bergbauschiff mit Doppelbohrer.' },
  bussard:    { cls: 'M', name: 'Bussard', sprite: 'ship_bussard', size: 38, cargo: 120, speed: 200, mining: 0, price: 75000, tank: 36,
                desc: 'Schneller mittlerer Frachter.' },
  pelikan:    { cls: 'M', name: 'Pelikan', sprite: 'ship_pelikan', size: 44, cargo: 200, speed: 150, mining: 2, price: 115000, tank: 45,
                desc: 'Vielseitiger Allrounder mit viel Platz für Module.' },
  // L - große Werft, Pilotenlizenz 3
  seekuh:     { cls: 'L', name: 'Seekuh', sprite: 'ship_seekuh', size: 58, cargo: 420, speed: 120, mining: 0, price: 280000, tank: 120,
                desc: 'Robuster großer Frachter.' },
  mammut:     { cls: 'L', name: 'Mammut', sprite: 'ship_mammut', size: 62, cargo: 600, speed: 80, mining: 28, price: 650000, tank: 150,
                desc: 'Schwerer Bergbaufrachter.' },
  wal:        { cls: 'L', name: 'Wal', sprite: 'ship_wal', size: 68, cargo: 900, speed: 70, mining: 0, price: 1100000, tank: 190,
                desc: 'Langsamer Massengutfrachter.' },
  kondor:     { cls: 'L', name: 'Kondor', sprite: 'ship_kondor', size: 60, cargo: 520, speed: 140, mining: 0, price: 1500000, tank: 210,
                desc: 'Schneller Langstreckenfrachter.' },
  // XL - große Werft, Pilotenlizenz 5
  titan:      { cls: 'XL', name: 'Titan', sprite: 'ship_titan', size: 90, cargo: 1800, speed: 90, mining: 0, price: 5500000, tank: 520,
                desc: 'Riesenfrachter mit Habitatring.' },
  leviathan:  { cls: 'XL', name: 'Leviathan', sprite: 'ship_leviathan', size: 110, cargo: 3000, speed: 55, mining: 0, price: 9500000, tank: 800,
                desc: 'Das größte zivile Schiff der Galaxie.' },
  // NPC
  versorger:  { cls: 'S', name: 'Versorger', sprite: 'ship_versorger', size: 30, cargo: 100, speed: 120, mining: 4, price: 0, tank: 0, npc: true,
                desc: 'Stationseigenes Versorgungsschiff. Holt Rohstoffe für leere Stationen.' },
};

// Fraktionsschiffe (Klasse F): nur im Fraktionscluster, Credits plus seltene Ressource
for (const [id, d] of Object.entries(FACTION_SHIPS)) {
  SHIP_TYPES[id] = { cls: 'F', sprite: 'ship_' + id, factionName: FACTIONS[d.faction].name, ...d };
}

// Baumaterial: Anteile am Materialwert je Klasse, Menge so, dass Material + Marge ≈ Referenzpreis
export const YARD_MARGIN = 0.25;
const MATERIAL_MIX = {
  // Kalibrierung (Phase 7): S/M aus häufigen Waren, damit NPC-Werften sie auch ohne Fernhandel bauen
  S: { plates: 0.45, electronics: 0.2, ingots: 0.2, shipfuel: 0.15 },
  M: { plates: 0.4, electronics: 0.25, wires: 0.15, hullparts: 0.2 },
  L: { hullparts: 0.3, shipparts: 0.3, reactorcores: 0.15, engines: 0.25 },
  XL: { shipparts: 0.4, reactorcores: 0.25, engines: 0.15, aicores: 0.2 },
  F: { shipparts: 0.4, reactorcores: 0.3, aicores: 0.3 },
};
export function buildMaterials(type) {
  const d = SHIP_TYPES[type];
  if (d.npc) return null;
  const value = d.price / (1 + YARD_MARGIN);
  const out = {};
  for (const [g, share] of Object.entries(MATERIAL_MIX[d.cls])) out[g] = Math.max(1, Math.round((value * share) / GOODS[g].base));
  return out;
}
for (const t of Object.keys(SHIP_TYPES)) SHIP_TYPES[t].build = buildMaterials(t);

/** Bauliste der NPC-Werften (häufigere Einträge = öfter im Angebot) */
export const SHIPYARD = {
  MAX_FOR_SALE: 3,
  SKIP_AFTER: 900, // Sekunden Wartezeit auf Material für den nächsten Typ der Bauliste
  BUILD_TIME: { S: 40, M: 90, L: 240, XL: 600, F: 600 },
  ORDER: {
    shipyard: ['spatz', 'maulwurf', 'lastesel', 'spatz', 'kolibri', 'grubenhund', 'bussard', 'maulwurf', 'pelikan'],
    bigyard: ['seekuh', 'mammut', 'seekuh', 'wal', 'kondor', 'titan', 'seekuh', 'leviathan'],
  },
};

// ---------- Stufen-Upgrades ----------
export const UPGRADES = {
  speed: { name: 'Geschwindigkeit', per: 0.08, desc: '+8 % Tempo je Stufe, Verbrauch bleibt gleich' },
  tank:  { name: 'Tankgröße', per: 0.25, desc: '+25 % Tank je Stufe' },
  cargo: { name: 'Laderaum', per: 0.12, desc: '+12 % Laderaum je Stufe' },
};
export const UPGRADE_BASE = 0.12; // Stufe 1 kostet 12 % des Referenzpreises, jede weitere ×1,6
export const upgradeCost = (type, level) => Math.round(SHIP_TYPES[type].price * UPGRADE_BASE * STEP ** (level - 1));

// ---------- Module ----------
/** Ein Modul belegt 30 Frachteinheiten. Jedes weitere gleiche Modul: +5 Kapazität bzw. +10 % Abbau-Kombo */
export const MODULE_SIZE = 30;
export const MODULE_COMBO = 5;
export const MINING_COMBO = 0.1;
export const MODULE_REFUND = 0.5;
export const MODULES = {
  cabin:     { name: 'Passagierkabine', cap: 'passenger', price: 15000, desc: 'Ermöglicht den Transport von Passagieren.' },
  shielded:  { name: 'Geschirmte Kammer', cap: 'hazard', price: 25000, desc: 'Ermöglicht den Transport von Gefahrgut.' },
  gascoll:   { name: 'Gaskollektor', mine: 'gas', rate: 0.8, price: 120000, desc: 'Sammelt Nebelgas in Plasmawolken.' },
  drill:     { name: 'Tiefbohrer', mine: 'drill', rate: 0.4, price: 200000, desc: 'Baut Gold, Diamant, Uran und Exotische Kristalle ab.' },
  acidex:    { name: 'Säureextraktor', mine: 'acid', rate: 1.5, price: 60000, desc: 'Gewinnt Säure aus Säurefeldern.' },
};
/** Kapazität für n gleiche Module: 1 → 30, 2 → 65, 3 → 100 */
export const moduleCapacity = (n) => (n > 0 ? MODULE_SIZE * n + MODULE_COMBO * (n - 1) : 0);
/** Abbaurate für n gleiche Abbaumodule: jedes weitere +100 % plus Kombo-Bonus */
export const moduleMiningRate = (base, n) => (n > 0 ? base * n * (1 + MINING_COMBO * (n - 1)) : 0);

// ---------- Pilotenlizenz ----------
export const PILOT_LICENSES = [
  null,
  { level: 1, maxShips: 3, classes: ['S'], maxUpgrade: 1, cost: 0 },
  { level: 2, maxShips: 6, classes: ['S', 'M'], maxUpgrade: 2, cost: 20000 },
  { level: 3, maxShips: 12, classes: ['S', 'M', 'L'], maxUpgrade: 3, cost: 150000 },
  { level: 4, maxShips: 20, classes: ['S', 'M', 'L', 'F'], maxUpgrade: 4, cost: 1000000 },
  { level: 5, maxShips: 35, classes: ['S', 'M', 'L', 'F', 'XL'], maxUpgrade: 5, cost: 6000000 },
  { level: 6, maxShips: 60, classes: ['S', 'M', 'L', 'F', 'XL'], maxUpgrade: 6, cost: 30000000 },
];

// ---------- Abgeleitete Werte eines Schiffes ----------
export function countModules(ship) {
  const n = {};
  for (const m of ship.modules || []) n[m] = (n[m] || 0) + 1;
  return n;
}

/** Effektive Werte: Tempo, Tank, Laderäume je Klasse, Abbauraten */
export function shipStats(ship) {
  const d = SHIP_TYPES[ship.type];
  const u = ship.upg || {};
  const n = countModules(ship);
  const mods = (ship.modules || []).length;
  const mining = { std: d.mining || 0 };
  for (const [id, k] of Object.entries(n)) if (MODULES[id].mine) mining[MODULES[id].mine] = moduleMiningRate(MODULES[id].rate, k);
  return {
    speed: d.speed * (1 + UPGRADES.speed.per * (u.speed || 0)),
    tank: d.tank * (1 + UPGRADES.tank.per * (u.tank || 0)),
    cargoTotal: Math.round(d.cargo * (1 + UPGRADES.cargo.per * (u.cargo || 0))),
    cargo: Math.max(0, Math.round(d.cargo * (1 + UPGRADES.cargo.per * (u.cargo || 0))) - MODULE_SIZE * mods),
    hazard: moduleCapacity(n.shielded || 0),
    passenger: moduleCapacity(n.cabin || 0),
    mining,
  };
}

/** Frachtklasse einer Ware -> Laderaum */
export const holdOf = (good) => (GOODS[good].cls === 'hazard' ? 'hazard' : GOODS[good].cls === 'passenger' ? 'passenger' : 'cargo');

/** Belegung je Laderaum */
export function holdUsage(ship) {
  const u = { cargo: 0, hazard: 0, passenger: 0 };
  for (const [g, n] of Object.entries(ship.cargo || {})) u[holdOf(g)] += n;
  return u;
}

/** Freier Platz für eine bestimmte Ware (NPC-Schiffe: alles im normalen Laderaum) */
export function freeFor(ship, good) {
  const st = shipStats(ship);
  if (SHIP_TYPES[ship.type].npc) return st.cargoTotal - Object.values(ship.cargo).reduce((a, b) => a + b, 0);
  const h = holdOf(good);
  return Math.max(0, st[h] - holdUsage(ship)[h]);
}

/** Verkaufswert: 60 % des Marktpreises plus 50 % der eingebauten Upgrades und Module */
export const SELL_SHARE = 0.6, SELL_UPGRADES = 0.5;
export function sellValue(ship, marketPrice = SHIP_TYPES[ship.type].price) {
  return Math.round(marketPrice * SELL_SHARE + (ship.upgValue || 0) * SELL_UPGRADES);
}
