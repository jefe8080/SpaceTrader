import { GOODS, RECIPES } from './goods.js';
import {ADVANCED_HOME_QUESTS} from './advanced-homequests.js';
// PRD 5 starting values. Rates use server seconds, costs use actual goods IDs.
const freeze = (value) => {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
};

export const HOMEWORLD = freeze({
  start: {
    credits: 5000, ship: 'spatz', population: 100, workers: { basic: 48, skilled: 12, specialist: 0 },
    housing: 200, power: 12, storage: 2000, hazardStorage: 100, plots: 8, maxPlots: 48,
    supplies: { water: 80, food: 40, shipfuel: 40 },
    repairs: { ingots: 80, plates: 40, electronics: 12, machinery: 4 },
    basicPlants: ['waterworks', 'foodplant', 'fueldepot', 'refinery', 'smelter'],
  },
  placement: { firstRing: 1, preferredLastRing: 2, minDistance: 27000, maxResourceDistance: 6000,
    resources: ['ice', 'grain', 'gas', 'helium3', 'crude', 'ore'] },
  population: {
    workforceShare: 0.6, needPerHour: { water: 0.2, food: 0.1 },
    comfortPerHour: { clothing: 0.02, medicine: 0.01, consumer: 0.01 },
    growthPerHour: 0.02, maxGrowthPerHour: 100, touristStay: 1200,
    training: { skilled: { count: 10, seconds: 120 }, specialist: { count: 10, seconds: 180 } },
  },
  money: { incomePerHour: 4, supplyFactor: [0.25, 1.25], employmentFactor: [0.5, 1],
    tax: 0.2, maxTax: 0.4, civilianBudgetHours: 4, npcBudgetHours: 2 },
  industry: { unsuppliedExtraction: 0.25, repairedSpeed: 0.1,
    repair: { credits: 250, goods: { ingots: 4 }, seconds: 30, power: 1, workers: { basic: 4, skilled: 0, specialist: 0 } },
    restore: { credits: 4750, goods: { ingots: 6 }, seconds: 60 }, maxBuildSeconds: 600 },
  relic: { speeds: [4, 5, 6], workshopSeconds: 15 },
  warp: { preparationSeconds: 300, cooldownSeconds: 86400, basePrice: 250000, siteShare: 0.2, cargoShare: 1 },
});

export const INDUSTRY_GROUPS = freeze({
  I: { recipes: ['waterworks', 'foodplant', 'fueldepot', 'refinery', 'smelter', 'oilworks', 'chemworks', 'glassworks', 'weavery', 'fertilizerplant', 'siliconworks'],
    credits: 5000, goods: { ingots: 10 }, seconds: 60, power: 4, workers: { basic: 6, skilled: 0, specialist: 0 }, quest: 'H02' },
  II: { recipes: ['rollingmill', 'cableworks', 'chemplant', 'toolworks', 'refinery2', 'alloyworks', 'chipfab', 'pharma', 'coolantworks', 'tailor', 'cannery', 'opticsworks', 'batteryplant', 'jeweler'],
    credits: 15000, goods: { ingots: 12, hydraulicoil: 4 }, seconds: 90, power: 8, workers: { basic: 6, skilled: 2, specialist: 0 }, quest: 'H06' },
  III: { recipes: ['gearworks', 'electronicsworks', 'hullworks', 'sensorworks', 'reactorworks', 'cellworks','goldpurifier','diamondcutter','nebulagasrefiner'],
    credits: 40000, goods: { plates: 12, wires: 8 }, seconds: 120, power: 12, workers: { basic: 6, skilled: 4, specialist: 0 }, quest: 'H07' },
  IV: { recipes: ['robotics', 'machineworks', 'engineworks', 'shippartsworks', 'consumerworks', 'medtechworks', 'computerworks','uraniumrefiner','exocrystalrefiner'],
    credits: 100000, goods: { alloys: 12, electronics: 8, gears: 6 }, seconds: 180, power: 20, workers: { basic: 8, skilled: 6, specialist: 2 }, quest: 'H09', facility: 'researchWorkshop' },
  V: { recipes: ['aiforge', 'habitatworks','antimatterstabilizer'],
    credits: 250000, goods: { machinery: 6, computers: 4, robots: 2 }, seconds: 180, power: 32, workers: { basic: 8, skilled: 8, specialist: 4 }, quest: 'H12', facility: 'researchCenter' },
});

export function industryGroup(recipe) {
  return Object.entries(INDUSTRY_GROUPS).find(([, group]) => group.recipes.includes(recipe))?.[0];
}

export function industrySpec(recipe){
  const group=INDUSTRY_GROUPS[industryGroup(recipe)];if(!group)return null;
  return {...group,power:RECIPES[recipe].power??group.power,workers:RECIPES[recipe].workers||group.workers};
}

export function controlUpgradeCost(level) {
  if(!Number.isSafeInteger(level)||level<2)return null;
  const cost=level===2?{credits:8000,goods:{plates:10,wires:4},seconds:60}
    :{credits:Math.round(30000*1.5**(level-3)),goods:{plates:Math.ceil(20*1.3**(level-3)),electronics:Math.ceil(10*1.3**(level-3)),computers:Math.ceil(2*1.3**(level-3))},seconds:Math.min(180,120+15*(level-3))};
  return [cost.credits,...Object.values(cost.goods)].every(Number.isSafeInteger)?cost:null;
}

export const CONTROL_MODULES=freeze({
  dispatch:{name:'Disposition',credits:10000,goods:{electronics:8},seconds:60,power:2,workers:{skilled:2}},
  production:{name:'Produktionsplanung',credits:20000,goods:{computers:4},seconds:90,power:2,workers:{skilled:2}},
  sales:{name:'Absatzplanung',credits:20000,goods:{computers:4},seconds:90,power:2,workers:{skilled:2}},
  capacity:{name:'Auftragskapazität +8',credits:15000,goods:{electronics:6},seconds:90,power:2,workers:{skilled:2}},
});

export const HOME_QUESTS = freeze({
  H00: { title: 'Ein Licht im Rauschen', requires: [], goal: 'Heimat anfliegen und landen.', credits: 0, xp: 10 },
  H01: { title: 'Der erste sichere Landeplatz', requires: ['H00'], goal: 'Das Dock reparieren.', credits: 500, xp: 10 },
  H02: { title: 'Wasser unter den Trümmern', requires: ['H01'], goal: 'Wasser- und Nahrungsanlage reparieren; 20 Wasser und 10 Nahrung selbst produzieren.', credits: 1000, xp: 20 },
  H03: { title: 'Ein Netz aus Stimmen', requires: ['H02'], goal: 'Leitstelle 1 und Treibstoffanlage reparieren; eine lokale Route einrichten.', credits: 1000, xp: 20 },
  H04: { title: 'Bergung ohne Kennung', requires: ['H02'], goal: 'Das markierte Wrack persönlich erreichen und den versiegelten Fund zur Heimat zurückbringen.', credits: 0, xp: 25 },
  H05: { title: 'Ein zweites Paar Hände', requires: ['H03'], goal: 'Zehn Minuten Wasser und Nahrung bereitstellen (angesammelte Betriebszeit).', credits: 500, xp: 15 },
  H06: { title: 'Feuer und Metall', requires: ['H03'], goal: 'Raffinerie und Schmelzwerk reparieren; 40 Barren selbst produzieren.', credits: 3000, xp: 35 },
  ...ADVANCED_HOME_QUESTS,
});

export const HOME_BUILDINGS = freeze({
  housing: { name: 'Wohnblock', credits: 2000, goods: { ingots: 8 }, seconds: 60, power: 1, workers: {}, housing: 200, quest: 'H02' },
  solar: { name: 'Solarfeld', credits: 3000, goods: { ingots: 10, glass: 4 }, seconds: 60, power: 0, workers: { basic: 2 }, generation: 20, quest: 'H02' },
  gasGenerator: { name: 'Gasgenerator', credits: 8000, goods: { plates: 12, electronics: 4 }, seconds: 90, power: 0, workers: { basic: 4, skilled: 2 }, generation: 80, fuelPerHour: { gas: 20 }, quest: 'H06' },
  reactor: { name: 'Reaktor', credits: 100000, goods: { alloys: 12, reactorcores: 2, machinery: 6 }, seconds: 180, power: 0, workers: { skilled: 6, specialist: 2 }, generation: 500, fuelPerHour: { enricheduranium: 2, coolant: 10 }, quest: 'H12' },
  silo: { name: 'Lagersilo', credits: 3000, goods: { ingots: 10 }, seconds: 60, power: 1, workers: { basic: 1 }, storage: 2000, quest: 'H02' },
  safeStorage: { name: 'Sicherheitslager', credits: 5000, goods: { plates: 10, electronics: 4 }, seconds: 60, power: 2, workers: { skilled: 2 }, hazardStorage: 500, quest: 'H06' },
  spaceport: { name: 'Raumhafenmodul', credits: 10000, goods: { plates: 20, electronics: 6 }, seconds: 90, power: 4, workers: { basic: 4 }, docks: 2, throughput: 500, quest: 'H06' },
  school: { name: 'Schule', credits: 10000, goods: { plates: 12, electronics: 6 }, seconds: 90, power: 4, workers: { skilled: 2 }, quest: 'H06' },
  academy: { name: 'Akademieausbau', credits: 30000, goods: { chips: 10, medicine: 4, electronics: 4 }, seconds: 120, power: 4, workers: { skilled: 2 }, parent: 'school', quest: 'H07' },
  moduleBench: { name: 'Einfache Modulwerkbank', credits: 3000, goods: { ingots: 12, glass: 4, plastics: 4 }, seconds: 60, power: 2, workers: { basic: 2 }, quest: 'H06' },
  researchWorkshop: { name: 'Forschungswerkstatt', credits: 20000, goods: { plates: 12, electronics: 10 }, seconds: 120, power: 6, workers: { skilled: 4 }, quest: 'H07' },
  researchCenter: { name: 'Forschungszentrum', credits: 100000, goods: { computers: 10, robots: 4, sensors: 4 }, seconds: 180, power: 10, workers: { specialist: 4 }, parent: 'researchWorkshop', quest: 'H09' },
  workshop: { name: 'Antriebswerkstatt', credits: 15000, goods: { plates: 12, electronics: 8 }, seconds: 60, power: 2, workers: { skilled: 2 }, quest: 'H04' },
  land: { name: 'Fläche erschließen', credits: 5000, goods: { ingots: 10 }, seconds: 60, power: 0, workers: {}, quest: 'H02' },
});

export function homeStorageUsage(market) {
  const used = { normal: 0, hazard: 0 };
  for (const [good, slot] of Object.entries(market.goods)) {
    const cls = GOODS[good]?.cls;
    if (cls === 'normal' || cls === 'hazard') used[cls] += slot.stock;
  }
  // Physical modules are stored separately from installed ship modules (U10).
  used.normal += Object.values(market.moduleInventory || {}).reduce((sum, n) => sum + n * 30, 0);
  used.normal += market.homeworld?.moduleOutputReserved||0;
  return used;
}

export function homeStorageFree(market, good) {
  if (!market.homeworld) return Math.max(0, (market.goods[good]?.cap || 0) - (market.goods[good]?.stock || 0));
  const cls = GOODS[good]?.cls;
  if (cls !== 'normal' && cls !== 'hazard') return 0;
  const capacity = cls === 'normal' ? market.homeworld.storage : market.homeworld.hazardStorage;
  return Math.max(0, capacity - homeStorageUsage(market)[cls]);
}

export function availableHomeStock(market, good) {
  const home = market.homeworld;
  const reserved = home ? (home.reserves?.[good] || 0) + Object.values(home.reservations || {}).reduce((sum, reservation) => sum + (reservation.goods[good] || 0), 0) : 0;
  return Math.max(0, (market.goods[good]?.stock || 0) - reserved);
}
