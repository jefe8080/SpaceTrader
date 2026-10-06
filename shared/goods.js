// Warenkatalog, Rezepte, Planeten-, Stations- und Asteroidentypen.
// Basispreise und Stufen der verarbeiteten Waren werden aus den Rezepten berechnet.

/**
 * Rohstoffe und Sonderwaren (Stufe 0).
 * cls: Frachtklasse normal | hazard (Geschirmte Kammer) | passenger (Passagierkabine)
 * mine: Abbauklasse std (Bergbaulaser) | drill (Tiefbohrer) | acid (Säureextraktor) | gas (Gaskollektor)
 * ultra: ultraselten, nur am Hub angekauft
 */
const RAW = {
  ore:         { name: 'Erz',              base: 10,  color: '#bcaaa4', mine: 'std' },
  ice:         { name: 'Eis',              base: 8,   color: '#b3e5fc', mine: 'std' },
  crystals:    { name: 'Kristalle',        base: 22,  color: '#ce93d8', mine: 'std' },
  rareearth:   { name: 'Seltene Erden',    base: 28,  color: '#ff8a65', mine: 'std' },
  silicate:    { name: 'Silikat',          base: 9,   color: '#e6d3a3' },
  sulfur:      { name: 'Schwefel',         base: 12,  color: '#fff176' },
  gas:         { name: 'Rohgas',           base: 9,   color: '#ffe082' },
  helium3:     { name: 'Helium-3',         base: 18,  color: '#80deea' },
  crude:       { name: 'Rohöl',            base: 14,  color: '#6d4c41' },
  biomass:     { name: 'Biomasse',         base: 10,  color: '#558b2f' },
  grain:       { name: 'Getreide',         base: 9,   color: '#d4b45c' },
  acid:        { name: 'Säure',            base: 20,  color: '#c6ff00', cls: 'hazard', mine: 'acid' },
  tourists:    { name: 'Touristen',        base: 28,  color: '#ffcc80', cls: 'passenger' },
  workers:     { name: 'Arbeiter',         base: 24,  color: '#a1887f', cls: 'passenger' },
  gold:        { name: 'Gold',             base: 420, color: '#ffd54f', ultra: true, mine: 'drill' },
  diamond:     { name: 'Diamant',          base: 650, color: '#e1f5fe', ultra: true, mine: 'drill' },
  uranium:     { name: 'Uran',             base: 520, color: '#76ff03', ultra: true, mine: 'drill', cls: 'hazard' },
  antimatter:  { name: 'Antimaterie',      base: 1900, color: '#ea80fc', ultra: true, cls: 'hazard' },
  exocrystals: { name: 'Exotische Kristalle', base: 880, color: '#18ffff', ultra: true, mine: 'drill' },
  nebulagas:   { name: 'Nebelgas',         base: 310, color: '#f48fb1', ultra: true, mine: 'gas' },
};

/** Verarbeitete Waren: Name, Farbe, Frachtklasse */
const MADE = {
  water:        { name: 'Wasser',            color: '#4fc3f7' },
  food:         { name: 'Nahrung',           color: '#8bc34a' },
  shipfuel:     { name: 'Schiffstreibstoff', color: '#ff7043' },
  fuel:         { name: 'Brennstoff',        color: '#ffab40' },
  ingots:       { name: 'Barren',            color: '#b0bec5' },
  hydraulicoil: { name: 'Hydrauliköl',       color: '#a1887f' },
  plastics:     { name: 'Kunststoff',        color: '#80cbc4' },
  glass:        { name: 'Glas',              color: '#e0f7fa' },
  chemicals:    { name: 'Chemikalien',       color: '#aeea00', cls: 'hazard' },
  silicon:      { name: 'Silizium',          color: '#90a4ae' },
  textiles:     { name: 'Textilien',         color: '#f8bbd0' },
  fertilizer:   { name: 'Dünger',            color: '#9ccc65' },
  raremetals:   { name: 'Seltenmetalle',     color: '#ff7043' },
  plates:       { name: 'Platten',           color: '#78909c' },
  cutters:      { name: 'Fräser',            color: '#cfd8dc' },
  wires:        { name: 'Kabel',             color: '#ffb300' },
  chips:        { name: 'Mikrochips',        color: '#7e57c2' },
  alloys:       { name: 'Legierungen',       color: '#90a4ae' },
  medicine:     { name: 'Medikamente',       color: '#ef9a9a' },
  coolant:      { name: 'Kühlmittel',        color: '#4dd0e1' },
  clothing:     { name: 'Kleidung',          color: '#f48fb1' },
  preserves:    { name: 'Konserven',         color: '#c5e1a5' },
  optics:       { name: 'Optiken',           color: '#b3e5fc' },
  batteries:    { name: 'Akkus',             color: '#dce775' },
  gears:        { name: 'Zahnräder',         color: '#bdbdbd' },
  electronics:  { name: 'Elektronik',        color: '#9575cd' },
  hullparts:    { name: 'Rumpfsegmente',     color: '#607d8b' },
  sensors:      { name: 'Sensoren',          color: '#4db6ac' },
  luxury:       { name: 'Luxusgüter',        color: '#f06292' },
  reactorcores: { name: 'Reaktorkerne',      color: '#ff5252', cls: 'hazard' },
  powercells:   { name: 'Energiezellen',     color: '#ffee58' },
  robots:       { name: 'Roboter',           color: '#64b5f6' },
  machinery:    { name: 'Maschinen',         color: '#ffb300' },
  engines:      { name: 'Triebwerke',        color: '#ff8a65' },
  shipparts:    { name: 'Schiffsbauteile',   color: '#8d6e63' },
  consumer:     { name: 'Konsumgüter',       color: '#4db6ac' },
  medtech:      { name: 'Medizintechnik',    color: '#e57373' },
  computers:    { name: 'Computer',          color: '#5c6bc0' },
  aicores:      { name: 'KI-Kerne',          color: '#b388ff' },
  habitats:     { name: 'Habitatmodule',     color: '#a5d6a7' },
};

/**
 * Rezepte: je Rezept ein Stationstyp. in/out in Einheiten je Zyklus, time in Sekunden.
 * Die Kette Erz (+Brennstoff) → Barren (+Hydrauliköl) → Platten (+Fräser) → Zahnräder → Roboter ist durchgängig abgebildet.
 */
export const RECIPES = {
  waterworks:     { name: 'Wasserwerk',         in: { ice: 2 }, out: { water: 2 }, time: 3 },
  foodplant:      { name: 'Nahrungsfabrik',     in: { grain: 2, water: 1 }, out: { food: 2 }, time: 3 },
  fueldepot:      { name: 'Treibstoffdepot',    in: { helium3: 1, gas: 1 }, out: { shipfuel: 2 }, time: 3 },
  refinery:       { name: 'Raffinerie',         in: { crude: 2 }, out: { fuel: 1 }, time: 2.5 },
  smelter:        { name: 'Schmelzwerk',        in: { ore: 2, fuel: 1 }, out: { ingots: 2 }, time: 3.5 },
  oilworks:       { name: 'Ölwerk',             in: { crude: 2 }, out: { hydraulicoil: 1 }, time: 3 },
  chemworks:      { name: 'Kunststoffwerk',     in: { crude: 1, gas: 1 }, out: { plastics: 1 }, time: 3 },
  glassworks:     { name: 'Glashütte',          in: { silicate: 2, fuel: 1 }, out: { glass: 2 }, time: 3.5 },
  chemplant:      { name: 'Chemiefabrik',       in: { sulfur: 1, gas: 1 }, out: { chemicals: 1 }, time: 3 },
  siliconworks:   { name: 'Siliziumwerk',       in: { silicate: 2, crystals: 1 }, out: { silicon: 1 }, time: 4 },
  weavery:        { name: 'Weberei',            in: { biomass: 2 }, out: { textiles: 1 }, time: 3 },
  fertilizerplant: { name: 'Düngerwerk',        in: { sulfur: 1, biomass: 1 }, out: { fertilizer: 2 }, time: 3 },
  refinery2:      { name: 'Scheideanstalt',     in: { rareearth: 2, acid: 1 }, out: { raremetals: 1 }, time: 5 },
  rollingmill:    { name: 'Walzwerk',           in: { ingots: 2, hydraulicoil: 1 }, out: { plates: 2 }, time: 4 },
  toolworks:      { name: 'Werkzeugbau',        in: { ingots: 1, raremetals: 1, crystals: 1 }, out: { cutters: 1 }, time: 5 },
  cableworks:     { name: 'Kabelwerk',          in: { ingots: 1, plastics: 1 }, out: { wires: 2 }, time: 4 },
  chipfab:        { name: 'Chipfabrik',         in: { silicon: 1, raremetals: 1, chemicals: 1 }, out: { chips: 2 }, time: 6 },
  alloyworks:     { name: 'Legierungswerk',     in: { ingots: 2, raremetals: 1 }, out: { alloys: 2 }, time: 5 },
  pharma:         { name: 'Pharmawerk',         in: { biomass: 2, chemicals: 1, water: 1 }, out: { medicine: 2 }, time: 5 },
  coolantworks:   { name: 'Kühlmittelwerk',     in: { water: 2, chemicals: 1 }, out: { coolant: 2 }, time: 4 },
  tailor:         { name: 'Bekleidungswerk',    in: { textiles: 2, plastics: 1 }, out: { clothing: 2 }, time: 4 },
  cannery:        { name: 'Konservenfabrik',    in: { food: 3, plastics: 1 }, out: { preserves: 2 }, time: 4 },
  opticsworks:    { name: 'Optikwerk',          in: { glass: 2, crystals: 1 }, out: { optics: 1 }, time: 5 },
  batteryplant:   { name: 'Akkufabrik',         in: { raremetals: 1, chemicals: 1, ingots: 1 }, out: { batteries: 2 }, time: 5 },
  gearworks:      { name: 'Getriebewerk',       in: { plates: 2, cutters: 1 }, out: { gears: 3 }, time: 6 },
  electronicsworks: { name: 'Elektronikwerk',   in: { chips: 1, wires: 2 }, out: { electronics: 2 }, time: 6 },
  hullworks:      { name: 'Rumpfwerk',          in: { plates: 3, alloys: 1 }, out: { hullparts: 1 }, time: 7 },
  sensorworks:    { name: 'Sensorwerk',         in: { optics: 1, chips: 1 }, out: { sensors: 1 }, time: 6 },
  jeweler:        { name: 'Luxusmanufaktur',    in: { clothing: 1, glass: 1, crystals: 1 }, out: { luxury: 1 }, time: 6 },
  reactorworks:   { name: 'Reaktorwerk',        in: { alloys: 2, coolant: 2, batteries: 1 }, out: { reactorcores: 1 }, time: 9 },
  cellworks:      { name: 'Energiezellenwerk',  in: { batteries: 2, wires: 1 }, out: { powercells: 2 }, time: 6 },
  robotics:       { name: 'Robotikwerk',        in: { gears: 2, electronics: 1, sensors: 1 }, out: { robots: 1 }, time: 10 },
  machineworks:   { name: 'Maschinenbau',       in: { gears: 2, plates: 1, hydraulicoil: 1 }, out: { machinery: 1 }, time: 9 },
  engineworks:    { name: 'Triebwerkswerk',     in: { alloys: 2, gears: 1, powercells: 1 }, out: { engines: 1 }, time: 10 },
  shippartsworks: { name: 'Schiffsteilewerk',   in: { hullparts: 1, electronics: 1, coolant: 1 }, out: { shipparts: 1 }, time: 10 },
  consumerworks:  { name: 'Konsumgüterfabrik',  in: { electronics: 1, plastics: 2, powercells: 1 }, out: { consumer: 2 }, time: 8 },
  medtechworks:   { name: 'Medtechwerk',        in: { electronics: 1, medicine: 1, optics: 1 }, out: { medtech: 1 }, time: 9 },
  computerworks:  { name: 'Computerwerk',       in: { electronics: 2, chips: 1, plastics: 1 }, out: { computers: 1 }, time: 9 },
  aiforge:        { name: 'KI-Schmiede',        in: { computers: 2, robots: 1 }, out: { aicores: 1 }, time: 14 },
  habitatworks:   { name: 'Habitatwerk',        in: { hullparts: 1, machinery: 1, medtech: 1 }, out: { habitats: 1 }, time: 14 },
};

// ---------- Abgeleitete Werte: Stufe und Basispreis ----------
const MARKUP = 1.3;
export const GOODS = {};
for (const [g, d] of Object.entries(RAW)) GOODS[g] = { cls: 'normal', mine: null, ultra: false, ...d, tier: 0 };
for (const [g, d] of Object.entries(MADE)) GOODS[g] = { cls: 'normal', mine: null, ultra: false, ...d, tier: null, base: null };
{
  // Iterativ auflösen: Stufe = 1 + max(Stufe der Zutaten), Basispreis = Zutatenwert × Aufschlag + Arbeitsanteil
  let open = Object.keys(RECIPES);
  for (let pass = 0; open.length && pass < 20; pass++) {
    open = open.filter((id) => {
      const r = RECIPES[id];
      if (!Object.keys(r.in).every((g) => GOODS[g].base !== null)) return true;
      const outN = Object.values(r.out).reduce((a, b) => a + b, 0);
      const cost = Object.entries(r.in).reduce((s, [g, n]) => s + GOODS[g].base * n, 0);
      // Stufe auf 5 begrenzt (Hochtechnologie)
      const tier = Math.min(5, 1 + Math.max(...Object.keys(r.in).map((g) => GOODS[g].tier)));
      for (const g of Object.keys(r.out)) {
        GOODS[g].tier = tier;
        GOODS[g].base = Math.round(((cost * MARKUP) / outN + 2 * tier + r.time * 0.6) * 10) / 10;
      }
      return false;
    });
  }
  if (open.length) throw new Error('Rezepte nicht auflösbar: ' + open.join(', '));
}
export const TIER_NAMES = ['Rohstoff', 'Grundstoff', 'Zwischenprodukt', 'Bauteil', 'Endprodukt', 'Hochtechnologie'];
export const CARGO_CLASSES = { normal: 'Normal', hazard: 'Gefahrgut', passenger: 'Passagiere' };
export const MINE_CLASSES = { std: 'Standard (Bergbaulaser)', drill: 'Tiefbohrer', acid: 'Säureextraktor', gas: 'Gaskollektor' };
export const ULTRA = Object.keys(GOODS).filter((g) => GOODS[g].ultra);

// ---------- Planeten ----------
// Raten in Einheiten pro Sekunde (bei Größe 1)
export const PLANET_TYPES = {
  agrar:    { name: 'Agrarwelt',     sprite: 'planet_agrar', radius: [80, 120], weight: 16, desc: 'Fruchtbare Welt, exportiert Getreide und Biomasse.',
              produce: { grain: 1.2, biomass: 0.4, food: 0.3 }, consume: { water: 0.3, fertilizer: 0.2, machinery: 0.02, consumer: 0.03 } },
  ocean:    { name: 'Ozeanwelt',     sprite: 'planet_ocean', radius: [85, 125], weight: 12, desc: 'Wasserwelt mit Ölplattformen und Algenfarmen.',
              produce: { crude: 1.0, biomass: 0.6 }, consume: { food: 0.3, medicine: 0.05, electronics: 0.03 } },
  desert:   { name: 'Wüstenwelt',    sprite: 'planet_desert', radius: [70, 110], weight: 12, desc: 'Trockene Welt mit Silikat- und Schwefelvorkommen.',
              produce: { silicate: 1.2, sulfur: 0.5 }, consume: { water: 0.5, food: 0.3, preserves: 0.1, powercells: 0.03 } },
  mining:   { name: 'Bergbauwelt',   sprite: 'planet_mining', radius: [70, 110], weight: 14, desc: 'Rohstoffwelt mit Erz-, Kristall- und Seltenerdminen.',
              produce: { ore: 1.0, crystals: 0.35, rareearth: 0.15 }, consume: { food: 0.4, preserves: 0.1, machinery: 0.03, robots: 0.015, workers: 0.2 } },
  ice:      { name: 'Eiswelt',       sprite: 'planet_ice', radius: [60, 100], weight: 10, desc: 'Gefrorene Welt, liefert Eis.',
              produce: { ice: 1.2 }, consume: { food: 0.3, medicine: 0.05, powercells: 0.04, clothing: 0.05 } },
  urban:    { name: 'Metropole',     sprite: 'planet_urban', radius: [90, 130], weight: 14, desc: 'Dicht besiedelt. Reiselustige Bevölkerung, hoher Bedarf an Endprodukten.',
              produce: { tourists: 0.7, workers: 0.5 }, consume: { food: 0.9, water: 0.45, consumer: 0.1, luxury: 0.06, medicine: 0.08, clothing: 0.1, computers: 0.02, medtech: 0.02 } },
  resort:   { name: 'Paradieswelt',  sprite: 'planet_resort', radius: [70, 105], weight: 8, desc: 'Urlaubsziel. Nimmt Touristen auf.',
              produce: { food: 0.4 }, consume: { tourists: 0.6, luxury: 0.1, water: 0.2, consumer: 0.04, clothing: 0.05 } },
  gasgiant: { name: 'Gasriese',      sprite: 'planet_gasgiant', radius: [120, 160], weight: 12, desc: 'Gewaltiger Gasplanet mit Förderplattformen.',
              produce: { gas: 1.4, helium3: 0.6 }, consume: { food: 0.3, machinery: 0.02, robots: 0.015, workers: 0.15 } },
  jungle:   { name: 'Dschungelwelt', sprite: 'planet_jungle', radius: [75, 115], weight: 10, desc: 'Wuchernde Biosphäre, reich an Biomasse.',
              produce: { biomass: 1.2, crude: 0.3 }, consume: { medicine: 0.06, machinery: 0.02, preserves: 0.08 } },
  volcanic: { name: 'Vulkanwelt',    sprite: 'planet_volcanic', radius: [65, 100], weight: 9, desc: 'Glühende Kruste mit Schwefel, Seltenen Erden und Säureseen.',
              produce: { sulfur: 0.8, rareearth: 0.5, ore: 0.4, acid: 0.3 }, consume: { food: 0.4, water: 0.3, robots: 0.02, coolant: 0.05 } },
  colony:   { name: 'Kolonie',       sprite: 'planet_colony', radius: [65, 95], weight: 6, desc: 'Junge Siedlung im Aufbau. Braucht Hochtechnologie und Arbeitskräfte.',
              produce: { ore: 0.3, crystals: 0.2 }, consume: { habitats: 0.01, aicores: 0.005, robots: 0.02, medtech: 0.02, food: 0.4, workers: 0.3, computers: 0.01 } },
  industrial: { name: 'Industriewelt', sprite: 'planet_industrial', radius: [85, 125], weight: 7, desc: 'Schwerindustrie und Raumhäfen. Verbraucht Triebwerke, Reaktoren und Maschinen.',
              produce: { workers: 0.4 }, consume: { engines: 0.02, reactorcores: 0.01, machinery: 0.04, robots: 0.02, aicores: 0.004, food: 0.6, water: 0.3, shipfuel: 0.2, shipparts: 0.01 } },
};

// ---------- Stationen ----------
export const STATION_FOOD = 0.08; // Crew-Verpflegung verarbeitender Stationen
const TIER_WEIGHT = [0, 10, 7, 5, 3, 2];
const ACCENTS = ['#ff7043', '#29b6f6', '#ffa000', '#26c6da', '#9575cd', '#78909c', '#ef5350', '#ec407a', '#ffca28', '#66bb6a', '#42a5f5', '#8d6e63', '#26a69a', '#d4e157'];

export const STATION_TYPES = {};
Object.entries(RECIPES).forEach(([id, r], i) => {
  const out = Object.keys(r.out)[0];
  STATION_TYPES[id] = { name: r.name, sprite: 'station_factory', accent: ACCENTS[i % ACCENTS.length], weight: TIER_WEIGHT[GOODS[out].tier],
    recipe: { in: r.in, out: r.out, time: r.time } };
});
STATION_TYPES.fueldepot.sprite = 'station_fuel';
Object.assign(STATION_TYPES, {
  hotel:    { name: 'Orbitalhotel', sprite: 'station_ring', accent: '#26a69a', weight: 6,
              consume: { tourists: 0.4, food: 0.3, luxury: 0.06 } },
  shipyard: { name: 'Werft', sprite: 'station_shipyard', accent: '#ffa726', weight: 0, radius: 64,
              buys: ['plates', 'electronics', 'ingots', 'wires', 'hullparts', 'shipfuel'] },
  bigyard:  { name: 'Große Werft', sprite: 'station_bigyard', accent: '#ff7043', weight: 0, radius: 110,
              buys: ['plates', 'shipparts', 'reactorcores', 'hullparts', 'engines', 'aicores'] },
  hub:      { name: 'Handels-Hub', sprite: 'station_hub', accent: '#4dd0e1', weight: 0, radius: 150 },
  // Fraktionen: Außenposten (Module, Nachfrage nach der Schiffswährung) und Fraktionswerft (Fraktionsschiff)
  outpost:  { name: 'Außenposten', sprite: 'station_ring', accent: '#ab47bc', weight: 0, radius: 60, outpost: true },
  factionyard: { name: 'Fraktionswerft', sprite: 'station_bigyard', accent: '#ab47bc', weight: 0, radius: 110, factionyard: true },
  // Produzenten ultraseltener Waren: fördern ohne Zutaten, sehr langsam
  deepmine: { name: 'Tiefenmine', sprite: 'station_deepmine', accent: '#ffd54f', weight: 0, radius: 58,
              extract: ['gold', 'diamond', 'uranium', 'exocrystals'], rate: 0.02 },
  antimatterlab: { name: 'Antimaterie-Labor', sprite: 'station_deepmine', accent: '#ea80fc', weight: 0, radius: 58,
              extract: ['antimatter'], rate: 0.006 },
  gasharvester: { name: 'Nebelgas-Sammler', sprite: 'station_deepmine', accent: '#f48fb1', weight: 0, radius: 58,
              extract: ['nebulagas'], rate: 0.03 },
});

// ---------- Asteroidenfelder ----------
export const BELT_TYPES = {
  ore:       { name: 'Erzfeld',         good: 'ore',         sprite: 'asteroid_rock',    dust: '#8d6e63', weight: 40 },
  ice:       { name: 'Eisfeld',         good: 'ice',         sprite: 'asteroid_ice',     dust: '#81d4fa', weight: 22 },
  crystals:  { name: 'Kristallfeld',    good: 'crystals',    sprite: 'asteroid_crystal', dust: '#ba68c8', weight: 22 },
  rareearth: { name: 'Seltenerdfeld',   good: 'rareearth',   sprite: 'asteroid_rare',    dust: '#ff8a65', weight: 16 },
  acid:      { name: 'Säurefeld',       good: 'acid',        sprite: 'asteroid_rare',    dust: '#c6ff00', weight: 4 },
  gold:      { name: 'Goldader',        good: 'gold',        sprite: 'asteroid_rock',    dust: '#ffd54f', weight: 1.2 },
  diamond:   { name: 'Diamantfeld',     good: 'diamond',     sprite: 'asteroid_crystal', dust: '#e1f5fe', weight: 0.8 },
  uranium:   { name: 'Uranfeld',        good: 'uranium',     sprite: 'asteroid_rare',    dust: '#76ff03', weight: 0.8 },
  exotic:    { name: 'Exotenfeld',      good: 'exocrystals', sprite: 'asteroid_crystal', dust: '#18ffff', weight: 0.6 },
};
