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
  III: { recipes: ['gearworks', 'electronicsworks', 'hullworks', 'sensorworks', 'reactorworks', 'cellworks'],
    credits: 40000, goods: { plates: 12, wires: 8 }, seconds: 120, power: 12, workers: { basic: 6, skilled: 4, specialist: 0 }, quest: 'H07' },
  IV: { recipes: ['robotics', 'machineworks', 'engineworks', 'shippartsworks', 'consumerworks', 'medtechworks', 'computerworks'],
    credits: 100000, goods: { alloys: 12, electronics: 8, gears: 6 }, seconds: 180, power: 20, workers: { basic: 8, skilled: 6, specialist: 2 }, quest: 'H09', facility: 'researchWorkshop' },
  V: { recipes: ['aiforge', 'habitatworks'],
    credits: 250000, goods: { machinery: 6, computers: 4, robots: 2 }, seconds: 180, power: 32, workers: { basic: 8, skilled: 8, specialist: 4 }, quest: 'H12', facility: 'researchCenter' },
});

export function industryGroup(recipe) {
  return Object.entries(INDUSTRY_GROUPS).find(([, group]) => group.recipes.includes(recipe))?.[0];
}
