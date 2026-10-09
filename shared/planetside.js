// Planetare Ansicht (PRD-3 Kapitel 6): Gebäude-Ausbau, Fabrik-Bauplätze, Ausstattung der Planeten.
// Alle Zahlen sind Kalibrierungsannahmen.
import { GOODS, RECIPES, STATION_TYPES } from './goods.js';

// ---------- Gebäude-Ausbau ----------
export const BUILDING = {
  RATE: 0.2,          // Rate der Ware +20 % je Level
  STORAGE: 0.15,      // Lager der Ware +15 % je Level
  MAX_PUBLIC: 6,      // jeder Spieler bis Level 6
  MAX_OWNER: 10,      // Level 7 bis 10 nur bei eigenem Besitz (bzw. Handelsmeister bei Konsortiumsbesitz)
  BASE_CR: 50000,     // Credits: 50.000 × 1,8^(L−1) × Planetengröße
  STEP: 1.8,
  XP_CR: 2000,        // Questgeber-XP: 1 je 2.000 Cr Ausbauwert (Credits plus Warenwert zum Basispreis)
};
/** Waren je Levelstufe, Mengen × Level (wie bei propUpgradeCost) */
const BUILDING_GOODS = [
  [3, { plates: 10, machinery: 2, gears: 4 }],
  [6, { electronics: 4, robots: 1, hullparts: 1 }],
  [10, { robots: 2, aicores: 1, habitats: 1 }],
];
export function buildingUpgradeCost(e, level) {
  const credits = Math.round(BUILDING.BASE_CR * BUILDING.STEP ** (level - 1) * (e.size || 1) / 100) * 100;
  const base = BUILDING_GOODS.find(([max]) => level <= max)[1];
  const goods = Object.fromEntries(Object.entries(base).map(([g, n]) => [g, Math.ceil(n * level)]));
  return { credits, goods };
}
/** Wert eines Ausbaus für die Questgeber-XP */
export const upgradeValue = (cost) => cost.credits + Object.entries(cost.goods).reduce((a, [g, n]) => a + n * GOODS[g].base, 0);
/** Wirksames Level: ohne Besitz auf 6 gedeckelt */
export const effectiveLevel = (lvl, owned) => Math.min(lvl || 0, owned ? BUILDING.MAX_OWNER : BUILDING.MAX_PUBLIC);
export const buildingRateMul = (lvl) => 1 + BUILDING.RATE * lvl;
export const buildingCapMul = (lvl) => 1 + BUILDING.STORAGE * lvl;

// ---------- Fabrik-Bauplätze ----------
export const RECIPE_CATS = {
  bio: { name: 'Bio', recipes: ['waterworks', 'foodplant', 'weavery', 'fertilizerplant', 'pharma', 'cannery', 'tailor'] },
  chem: { name: 'Chemie', recipes: ['refinery', 'oilworks', 'chemworks', 'chemplant', 'coolantworks', 'fueldepot', 'glassworks', 'siliconworks'] },
  heavy: { name: 'Schwer', recipes: ['smelter', 'rollingmill', 'alloyworks', 'refinery2', 'toolworks', 'gearworks', 'hullworks', 'machineworks', 'engineworks', 'reactorworks'] },
  tech: { name: 'Hightech', recipes: ['chipfab', 'cableworks', 'electronicsworks', 'opticsworks', 'batteryplant', 'cellworks', 'sensorworks', 'robotics',
    'computerworks', 'aiforge', 'medtechworks', 'consumerworks', 'shippartsworks', 'habitatworks', 'jeweler'] },
};
export const recipeCat = (id) => Object.keys(RECIPE_CATS).find((k) => RECIPE_CATS[k].recipes.includes(id)) || null;
/** Bauplätze je Planetentyp: [Bio, Chemie, Schwer, Hightech] */
const SLOTS = {
  agrar: [3, 1, 0, 0], ocean: [2, 2, 0, 0], jungle: [3, 1, 0, 0], desert: [0, 2, 1, 1], ice: [1, 2, 0, 1], mining: [0, 1, 3, 0],
  volcanic: [0, 2, 2, 0], gasgiant: [0, 3, 1, 0], colony: [1, 0, 2, 1], urban: [1, 0, 0, 3], resort: [2, 0, 0, 1], industrial: [0, 1, 2, 2],
};
export const factorySlots = (type) => Object.fromEntries(Object.keys(RECIPE_CATS).map((k, i) => [k, SLOTS[type]?.[i] || 0]));
/** Kosten: 50 % des Stationspreises (200.000 × (1 + 0,35 × Stufe)) plus Platten und Maschinen aus dem Laderaum */
export const FACTORY_GOODS = { plates: 20, machinery: 4 };
export function factoryCost(recipe) {
  const tier = Math.max(...Object.keys(RECIPES[recipe].out).map((g) => GOODS[g].tier));
  return { credits: Math.round(200000 * (1 + 0.35 * tier) / 1000) * 1000, goods: { ...FACTORY_GOODS } };
}
export const recipeOf = (id) => STATION_TYPES[id]?.recipe || RECIPES[id];

// ---------- Ausstattung (deterministisch aus der Planeten-ID) ----------
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const planetRng = (id, salt = 0) => seeded(hashStr(id) ^ Math.imul(salt + 1, 0x9e3779b1));

export const ENTERTAINMENT = {
  tavern: { name: 'Taverne', games: ['dice', 'highlow'] },
  casino: { name: 'Kasino', games: ['slots', 'roulette', 'stoplight'] },
  fair: { name: 'Jahrmarktbude', games: ['shells', 'cans'] },
  racetrack: { name: 'Rennbahn', games: ['horses'] },
  mine: { name: 'Stollen', games: ['ore'] },
};
export const MINIGAMES = {
  dice: { name: 'Würfeln', kind: 'luck' },
  highlow: { name: 'Höher oder Tiefer', kind: 'luck' },
  slots: { name: 'Slotmaschine', kind: 'luck' },
  roulette: { name: 'Weltraum-Roulette', kind: 'luck' },
  stoplight: { name: 'Lichtpunkt stoppen', kind: 'skill' },
  shells: { name: 'Hütchenspiel', kind: 'skill' },
  cans: { name: 'Dosenwerfen in Schwerelosigkeit', kind: 'skill' },
  horses: { name: 'Pferderennen', kind: 'luck' },
  ore: { name: 'Erzsuche', kind: 'skill' },
};
export const EXTRAS_CHANCE = 0.2;

/** Ausstattung eines Planeten: Unterhaltung (0 bis 3, Kasino mit 1 bis 3 Spielen), Schmuggler, Bettler, Hund, Schule */
export function planetFeatures(id) {
  const r = planetRng(id, 7);
  const pool = Object.keys(ENTERTAINMENT);
  const n = Math.floor(r() * 4);
  const fun = [];
  for (let i = 0; i < n; i++) fun.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  const casinoGames = ENTERTAINMENT.casino.games.filter(() => r() < 0.6);
  if (!casinoGames.length) casinoGames.push(ENTERTAINMENT.casino.games[Math.floor(r() * 3)]);
  return {
    fun, casinoGames,
    smuggler: r() < EXTRAS_CHANCE, beggar: r() < EXTRAS_CHANCE, dog: r() < EXTRAS_CHANCE, school: r() < EXTRAS_CHANCE,
  };
}
/** Spiele eines Unterhaltungsgebäudes auf diesem Planeten */
export const gamesOf = (feat, building) => (building === 'casino' ? feat.casinoGames : ENTERTAINMENT[building]?.games || []);
