// Besitz von Planeten und Stationen: Gouverneurslizenz, Kaufpreise, Upgrades, Fixpreis-Verbrauch. Zahlen sind Annahmen.
import { GOODS, STATION_TYPES, RECIPES, PLANET_TYPES } from './goods.js';
import { PRICE } from './price.js';

export const GOVERNOR_LICENSES = [
  null,
  { level: 1, maxProps: 1, maxLevel: 2, unlocks: ['factory'], cost: 250000 },
  { level: 2, maxProps: 3, maxLevel: 3, unlocks: ['factory', 'shipyard'], cost: 1500000 },
  { level: 3, maxProps: 6, maxLevel: 4, unlocks: ['factory', 'shipyard', 'planet', 'customs'], cost: 6000000 },
  { level: 4, maxProps: 10, maxLevel: 5, unlocks: ['factory', 'shipyard', 'planet', 'customs', 'bigyard'], cost: 20000000 },
  { level: 5, maxProps: 16, maxLevel: 6, unlocks: ['factory', 'shipyard', 'planet', 'customs', 'bigyard'], cost: 60000000 },
  { level: 6, maxProps: 25, maxLevel: 7, unlocks: ['factory', 'shipyard', 'planet', 'customs', 'bigyard'], cost: 150000000 },
];
export const UNLOCK_NAMES = { factory: 'Fabriken, Raffinerien', shipyard: 'Werften', planet: 'Planeten', customs: 'Zoll', bigyard: 'große Werften' };

/** Welche Freischaltung braucht ein Objekt? null = nicht kaufbar */
export function propertyKind(e) {
  if (!e?.market || e.noBuy || e.type === 'hub' || e.faction) return null;
  if (e.kind === 'planet') return 'planet';
  if (e.type === 'bigyard') return 'bigyard';
  if (e.type === 'shipyard') return 'shipyard';
  if (e.type === 'deepmine' || e.type === 'antimatterlab' || e.type === 'gasharvester') return 'planet'; // Sonderförderung wie Planeten
  return 'factory';
}
export const minGovernorFor = (kind) => GOVERNOR_LICENSES.findIndex((l) => l && l.unlocks.includes(kind));

// ---------- Upgrades ----------
export const PROP_UPGRADES = {
  storage: { name: 'Lager', per: 0.5, desc: '+50 % Kapazität je Stufe', goods: { plates: 20, hullparts: 2 } },
  speed:   { name: 'Produktionstempo', per: 0.2, desc: '+20 % Zyklusgeschwindigkeit je Stufe', goods: { machinery: 4, electronics: 6 } },
  yield:   { name: 'Ertrag', per: 0.1, desc: '+10 % Output bei gleichem Input je Stufe', goods: { robots: 2, computers: 2 } },
  extra:   { name: 'Zusatzproduktion', per: 1, desc: '+1 Rezept aus einer typgebundenen Liste je Stufe', goods: { machinery: 6, aicores: 1 } },
};
export const STEP = 1.6;
export const PROP_UPGRADE_BASE = 0.2; // Stufe 1 kostet 20 % des Basispreises, jede weitere x1,6

/** Basispreis je Typ (ohne Ausbau) */
export function propertyBasePrice(e) {
  if (e.kind === 'planet') return Math.round(3000000 * (e.size || 1) * (1 + Object.keys(PLANET_TYPES[e.type].produce).length * 0.15) / 1000) * 1000;
  if (e.type === 'bigyard') return 12000000;
  if (e.type === 'shipyard') return 2500000;
  if (['deepmine', 'antimatterlab', 'gasharvester'].includes(e.type)) return 6000000;
  const def = STATION_TYPES[e.type];
  if (def.recipe) {
    const tier = Math.max(...Object.keys(def.recipe.out).map((g) => GOODS[g].tier));
    return Math.round(400000 * (1 + 0.35 * tier) / 1000) * 1000;
  }
  return 500000;
}
/** Kaufpreis: Basiswert × Größe × Ausbaustufe */
export function propertyPrice(e, upg = {}) {
  const levels = Object.values(upg).reduce((a, b) => a + b, 0);
  return Math.round(propertyBasePrice(e) * (1 + 0.5 * levels));
}
export function propUpgradeCost(e, line, level) {
  const credits = Math.round(propertyBasePrice(e) * PROP_UPGRADE_BASE * STEP ** (level - 1));
  const goods = Object.fromEntries(Object.entries(PROP_UPGRADES[line].goods).map(([g, n]) => [g, Math.ceil(n * level)]));
  return { credits, goods };
}

/** Typgebundene Zusatzrezepte: Rezepte derselben Stufe, die eine Zutat teilen; Planeten: weitere Rohstoffe */
export function extraOptions(e) {
  if (e.kind === 'planet') {
    const own = new Set(Object.keys(PLANET_TYPES[e.type].produce));
    const pool = new Set();
    for (const t of Object.values(PLANET_TYPES)) for (const g of Object.keys(t.produce)) if (!own.has(g) && GOODS[g].tier === 0 && GOODS[g].cls === 'normal') pool.add(g);
    return [...pool].sort();
  }
  const def = STATION_TYPES[e.type];
  if (!def?.recipe) return [];
  const ins = new Set(Object.keys(def.recipe.in));
  const tier = Math.max(...Object.keys(def.recipe.out).map((g) => GOODS[g].tier));
  return Object.entries(RECIPES).filter(([id, r]) => id !== e.type && Object.keys(r.in).some((g) => ins.has(g))
    && Math.abs(Math.max(...Object.keys(r.out).map((g) => GOODS[g].tier)) - tier) <= 1).map(([id]) => id);
}

// ---------- Fixpreis-Verbrauch ----------
export const FIXED = { MIN: 0.3, MAX: 0.7, DEFAULT: 0.5 };
/** Preisfenster eines Planeten für eine Ware: leeres Lager = pmax, volles = pmin */
export const priceWindow = (good, mod = 1) => ({ pmin: GOODS[good].base * mod * PRICE.MIN_FACTOR, pmax: GOODS[good].base * mod * PRICE.MAX_FACTOR });
export const fixedPrice = (pmin, pmax, s) => pmin + s * (pmax - pmin);
/** Erlös pro Stunde: s = 0,3 bringt doppelt so viel wie s = 0,7 */
export const fixedRevenuePerHour = (Rref, s) => Rref * 2 ** ((FIXED.MAX - s) / 0.4);
export const fixedConsumptionPerHour = (Rref, s, pmin, pmax) => fixedRevenuePerHour(Rref, s) / fixedPrice(pmin, pmax, s);
/** R_ref: bei s = 0,7 entspricht der Verbrauch der normalen Rate des Planeten */
export const fixedRref = (ratePerSec, pmin, pmax) => ratePerSec * 3600 * fixedPrice(pmin, pmax, FIXED.MAX);

export const CUSTOMS_MAX = 0.5;
export const RECYCLE_SHARE = 0.5;
