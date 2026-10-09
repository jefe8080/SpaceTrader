// Gemeinsame Spielregeln und Balancing - wird von Server UND Client importiert.

// Maßstab: Speed 150 = 150 Einheiten/s. 1 Minute Flug = 9.000 Einheiten.
export const WORLD = {
  FOG_CELL: 1000,            // Kantenlänge einer Nebel-Zelle
  SENSOR_RANGE: 2500,        // Sensorreichweite eines Schiffes ohne Sensorphalanx (siehe SENSOR in ships.js)
  SYSTEM_DETECT: 50000,      // Fernortung: Sonnensysteme in diesem Umkreis werden bekannt
  START_CREDITS: 5000,
  DOCK_OFFSET: 28,           // Abstand zur Oberfläche beim Andocken
  HEX_SPACING: 240000,       // Abstand der Sektormittelpunkte (Sektor 150.000 + Leerraum 90.000)
  SECTOR_RADIUS: 75000,      // Radius des besiedelten Sektorbereichs
  BH_OFFSET: 4000,           // max. Zufallsversatz des Schwarzen Lochs
  SYSTEM_RADIUS: 4000,       // Sonnensystem ca. 1 Minute Flug im Durchmesser
  SYSTEM_MIN_DIST: 27000,    // 3 Minuten Flug zwischen Systemen
  SYSTEMS: [8, 15],
  GEN_LOOKAHEAD: 30000,      // Nachbarsektor wird erzeugt, wenn ein Schiff so nah an den Sektorrand kommt
  HUB_DIST: 5000,            // Hub-Abstand zum Schwarzen Loch
  WORMHOLE_TRANSIT: 5,       // Sekunden
  START_SLOW: 0.25,          // Langsam-Modifier des Startsystems (Produktion, Verbrauch, Lager)
};

// Sondergebiete: Ellipsen mit Wirkung innerhalb
export const ZONE_TYPES = {
  gravity:   { name: 'Gravitationsstörung', speed: 0.5, color: '#9575cd', desc: '−50 % Geschwindigkeit', weight: 25 },
  ionstorm:  { name: 'Ionensturm', fuel: 2, color: '#4fc3f7', desc: '+100 % Treibstoffverbrauch', weight: 20 },
  nebula:    { name: 'Dichter Nebel', sensor: 0.3, color: '#90a4ae', desc: 'Sensorreichweite −70 %', weight: 20 },
  solarwind: { name: 'Sonnenwindkorridor', speed: 1.4, color: '#ffca28', desc: '+40 % Geschwindigkeit', weight: 20 },
  plasma:    { name: 'Plasmawolke', mining: 'nebulagas', color: '#f06292', desc: 'Nebelgas sammeln (Gaskollektor)', weight: 15 },
};

// Spezialisierungs-Tags: Rohstoffe, deren Vorkommen ein System häufiger hat (Wahrscheinlichkeit ×3)
export const TAG_FACTOR = 3;

export const NET = { TICK_MS: 100, STATE_MS: 200, MARKET_MS: 1000, SAVE_MS: 15000, VIEW_MARGIN: 600 };

// Lagergrößen: Kapazität = max(Minimum, Rate × Sekunden). Große Lager = träge Preise.
export const STORAGE = {
  PLANET_PRODUCE: { secs: 1500, min: 500 },
  PLANET_CONSUME: { secs: 1200, min: 200 },
  STATION_INPUT_PER_UNIT: 400,  // je Einheit im Rezept
  STATION_OUTPUT_PER_UNIT: 300,
  STATION_FOOD: 500,
  CONSUMER_STATION: { secs: 1500, min: 300 }, // Hotels
  SHIPYARD: 1500,
  HUB: 3000,
  HUB_FUEL: 6000,
  ULTRA_HUB: 300,
  EXTRACT: 400,
};

// Statistik: 36 Blöcke à 5 Minuten = 3 Stunden Rückblick (Spielzeit)
export const STATS = { BUCKET_SECS: 300, BUCKETS: 36 };

// NPC-Verkehr: Versorger (Stationen holen fehlende Zutaten) und Abholer (Planeten holen Waren bei Produzenten)
export const SUPPLY = {
  RANGE: 90000,       // Suchradius für Bezugsquellen (gleicher Sektor)
  MIN_SOURCE_STOCK: 10,
  COOLDOWN: 20,       // Sekunden nach einer Lieferung (je Ware)
  RETRY_NO_SOURCE: 120,
  SHIP_TYPE: 'versorger',
  LOAD_SHARE: 0.1,    // Ladung je Fahrt: höchstens 10 % der Kapazität des Ziellagers ...
  LOAD_MIN: 5,        // ... mindestens 5 ...
  LOAD_MAX: 40,       // ... höchstens 40 Einheiten
  MARGIN: 0.1,        // Abstand zum Ziel-Füllstand (Anteil der Kapazität), ab dem NPC-Schiffe losfliegen
  ACTIVITY: 1800,     // Abholer nur in Sektoren mit Spielerschiffen in den letzten 30 min oder mit Spielerbesitz
};

/** Ladung eines NPC-Schiffs für ein Ziellager: min(10 % der Kapazität, freier Platz), 5 bis 40, 0 = passt nicht */
export function supplyLoad(slot) {
  const free = Math.floor(slot.cap - slot.stock);
  if (free < SUPPLY.LOAD_MIN) return 0;
  return Math.min(free, SUPPLY.LOAD_MAX, Math.max(SUPPLY.LOAD_MIN, Math.floor(slot.cap * SUPPLY.LOAD_SHARE)));
}

import { GOODS, PLANET_TYPES, STATION_TYPES, BELT_TYPES } from './goods.js';
export { GOODS, PLANET_TYPES, STATION_TYPES, BELT_TYPES, RECIPES, TIER_NAMES, CARGO_CLASSES, MINE_CLASSES, ULTRA, STATION_FOOD } from './goods.js';
export { FACTIONS, FACTION_SHIPS, FACTION, ABILITIES, factionShips } from './factions.js';
export { SHIP_TYPES, SHIP_CLASSES, SHIPYARD, UPGRADES, MODULES, PILOT_LICENSES, STEP, YARD_MARGIN, MODULE_SIZE, MODULE_REFUND, SENSOR, FLAGSHIP, sensorFactor,
  upgradeCost, moduleCapacity, moduleMiningRate, shipStats, holdOf, holdFor, hasAbility, holdUsage, freeFor, sellValue, countModules, buildMaterials } from './ships.js';

export * from './progression.js';
export * from './consortium.js';
export * from './consortium.js';

// Preis = Basispreis × Standort-Modifier × Füllstandskurve(stock/cap) ± Spread
import { PRICE, curveMax, curveMin } from './price.js';
export { PRICE, curveMax, curveMin };
export { GOVERNOR_LICENSES, UNLOCK_NAMES, PROP_UPGRADES, FIXED, CUSTOMS_MAX, RECYCLE_SHARE, propertyKind, minGovernorFor, propertyBasePrice,
  propertyPrice, propUpgradeCost, extraOptions, priceWindow, fixedPrice, fixedRevenuePerHour, fixedConsumptionPerHour, fixedRref } from './property.js';

export function unitPrice(good, stock, cap, mod = 1) {
  const r = Math.max(0, Math.min(1, stock / cap));
  const t = GOODS[good].tier, hi = curveMax(t);
  return GOODS[good].base * mod * hi * Math.pow(curveMin(t) / hi, r);
}
/** Rollen: produce = Markt verkauft, consume = Markt kauft, trade = Händler (beides, nur Puffer-Lager) */
export const canBuyFrom = (slot) => slot.role === 'produce' || slot.role === 'trade';
export const canSellTo = (slot) => slot.role === 'consume' || slot.role === 'trade';
/** Mittelpreis eines Marktplatzes (Slot) */
export const slotPrice = (good, s) => unitPrice(good, s.stock, s.cap, s.mod || 1);
/** Preis, den der Spieler pro Einheit zahlt */
export const buyPrice = (good, s) => slotPrice(good, s) * (1 + PRICE.SPREAD);
/** Preis, den der Spieler pro Einheit erhält */
export const sellPrice = (good, s) => slotPrice(good, s) * (1 - PRICE.SPREAD);

/**
 * Standort-Modifier (fest ab Sektorgenerierung):
 * Zufall ±25 %, geglättet mit dem Mittel der Märkte im selben System, plus Entfernungsprämie für angekaufte Waren.
 * Der Modifier wird nicht angezeigt (PRD-2 4.5), das Rauschen überdeckt die Prämie.
 */
export const LOCATION = {
  RANDOM: 0.25,
  SMOOTH: 0.5,         // Anteil des Systemmittels
  REF_SPEED: 150,      // Flugzeit wird bei Speed 150 gemessen
  // Flugzeit zum nächsten Produzenten im Sektor (Minuten) -> Prämie, dazwischen linear
  PREMIUM: [[2, 0], [5, 0.25], [10, 0.6], [16, 1.0]],
  PREMIUM_MAX: 1.0,
};
/** Prämie für hohe Stufen gedämpft (Kalibrierung): Stufe 5 erhält die Hälfte */
export const premiumFactor = (tier) => 1 - 0.1 * tier;
export function distancePremium(minutes) {
  const P = LOCATION.PREMIUM;
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return LOCATION.PREMIUM_MAX;
  if (minutes <= P[0][0]) return 0;
  for (let i = 1; i < P.length; i++) {
    if (minutes <= P[i][0]) {
      const [t0, p0] = P[i - 1], [t1, p1] = P[i];
      return p0 + ((minutes - t0) / (t1 - t0)) * (p1 - p0);
    }
  }
  return LOCATION.PREMIUM_MAX;
}

/**
 * Wirtschaftsdynamik (PRD-2 Kapitel 4, ersetzt den Eigenverbrauch): Jeder Lagerplatz eines NPC-Marktes hat einen
 * Ziel-Füllstand. Der Bestand nähert sich ihm exponentiell (Halbwertszeit 45 min), als Verbrauch über und als Zufluss
 * unter dem Ziel. Planeten würfeln den Ziel-Füllstand je Ware alle 2 bis 6 h neu (Nachfrage-Schwankung).
 * Spielerbesitz hat keine Drift, dort gilt die Besitzerwirtschaft.
 */
export const ECON = {
  HALF_LIFE: 2700,
  TARGET: { produce: [0.6, 0.7], consume: [0.3, 0.4], trade: [0.45, 0.55] },
  SWING: { produce: [0.45, 0.85], consume: [0.15, 0.55], trade: [0.3, 0.7] },
  SWING_EVERY: [7200, 21600],
};
/** Ziel-Füllstand eines Lagerplatzes (Anteil der Kapazität) */
export const targetOf = (s) => s.target ?? (ECON.TARGET[s.role][0] + ECON.TARGET[s.role][1]) / 2;
/** Änderung des Bestands durch die Drift in dt Sekunden (positiv = Zufluss) */
export const driftDelta = (stock, target, dt) => (target - stock) * (1 - 2 ** (-dt / ECON.HALF_LIFE));

/** Händlerrolle: Planeten bekommen 5-10, Stationen 0-3 Händler-Waren (nie ultraselten) */
export const TRADER = { PLANET: [5, 10], STATION: [0, 3], CAP: [300, 900] };

/** Treibstoff: Tank reicht für ca. 8 h Flug bei Grundgeschwindigkeit, leerer Tank = 30 % Speed */
export const FUEL = { HOURS: 8, EMPTY_SPEED: 0.3, AUTO_DEFAULT: 0.3 };
export const fuelBurn = (tank) => tank / (FUEL.HOURS * 3600); // Einheiten je Flugsekunde


export const NPC_OWNER = 'npc';
export const NPC_COLOR = '#b0bec5';
export const PLAYER_COLORS = ['#4fc3f7', '#ff8a65', '#aed581', '#ba68c8', '#ffd54f', '#4db6ac', '#f06292', '#9575cd', '#e57373', '#81c784'];

export const SHIP_NAMES = ['Albatros', 'Möwe', 'Kranich', 'Falke', 'Sturmvogel', 'Pelikan', 'Kormoran', 'Seeadler', 'Reiher',
  'Lerche', 'Schwalbe', 'Eisvogel', 'Kondor', 'Milan', 'Bussard', 'Uhu', 'Elster', 'Rabe', 'Fink', 'Zaunkönig'];

export const cellKey = (cx, cy) => cx + ',' + cy;
export const cellOf = (x, y) => [Math.floor(x / WORLD.FOG_CELL), Math.floor(y / WORLD.FOG_CELL)];

/** Beschreibt, was eine Station verarbeitet, z.B. "2 Erz → 1 Metall" */
export function recipeText(recipe) {
  const part = (o) => Object.entries(o).map(([g, n]) => `${n} ${GOODS[g].name}`).join(' + ');
  return `${part(recipe.in)} → ${part(recipe.out)}`;
}
