// Gemeinsame Spielregeln und Balancing - wird von Server UND Client importiert.

// Maßstab: Speed 150 = 150 Einheiten/s. 1 Minute Flug = 9.000 Einheiten.
export const WORLD = {
  FOG_CELL: 1000,            // Kantenlänge einer Nebel-Zelle
  SENSOR_RANGE: 2500,        // Sensorreichweite eines Schiffes
  SYSTEM_DETECT: 50000,      // Fernortung: Sonnensysteme in diesem Umkreis werden bekannt
  START_CREDITS: 1500,
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
  plasma:    { name: 'Plasmawolke', mining: 'gas', color: '#f06292', desc: 'Abbau von Spezialressourcen', weight: 15 },
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
};

// Statistik: 36 Blöcke à 5 Minuten = 3 Stunden Rückblick (Spielzeit)
export const STATS = { BUCKET_SECS: 300, BUCKETS: 36 };

// Automatische Versorgung leerer Stationen
export const SUPPLY = {
  RANGE: 30000,       // Suchradius für Bezugsquellen (gleicher Sektor)
  MIN_SOURCE_STOCK: 10,
  COOLDOWN: 20,       // Sekunden nach einer Lieferung
  RETRY_NO_SOURCE: 120,
  SHIP_TYPE: 'versorger',
};

export const GOODS = {
  // Rohstoffe
  food:        { name: 'Nahrung',        base: 12,  color: '#8bc34a', tier: 0 },
  ore:         { name: 'Erz',            base: 10,  color: '#bcaaa4', tier: 0 },
  ice:         { name: 'Eis',            base: 8,   color: '#b3e5fc', tier: 0 },
  crystals:    { name: 'Kristalle',      base: 24,  color: '#ce93d8', tier: 0 },
  gas:         { name: 'Gas',            base: 9,   color: '#ffe082', tier: 0 },
  biomass:     { name: 'Biomasse',       base: 11,  color: '#558b2f', tier: 0 },
  rareearth:   { name: 'Seltene Erden',  base: 30,  color: '#ff8a65', tier: 0 },
  passengers:  { name: 'Touristen',      base: 28,  color: '#ffcc80', tier: 0 },
  // Zwischenprodukte
  metal:       { name: 'Metall',         base: 32,  color: '#b0bec5', tier: 1 },
  water:       { name: 'Wasser',         base: 22,  color: '#4fc3f7', tier: 1 },
  fuel:        { name: 'Treibstoff',     base: 26,  color: '#ff7043', tier: 1 },
  plastics:    { name: 'Kunststoff',     base: 30,  color: '#80cbc4', tier: 1 },
  electronics: { name: 'Elektronik',     base: 95,  color: '#9575cd', tier: 1 },
  alloys:      { name: 'Legierungen',    base: 110, color: '#90a4ae', tier: 1 },
  // Endprodukte
  medicine:    { name: 'Medikamente',    base: 60,  color: '#ef9a9a', tier: 2 },
  luxury:      { name: 'Luxusgüter',     base: 70,  color: '#f06292', tier: 2 },
  machinery:   { name: 'Maschinen',      base: 230, color: '#ffb300', tier: 2 },
  consumer:    { name: 'Konsumgüter',    base: 180, color: '#4db6ac', tier: 2 },
  robots:      { name: 'Roboter',        base: 520, color: '#64b5f6', tier: 2 },
};
export const TIER_NAMES = ['Rohstoff', 'Zwischenprodukt', 'Endprodukt'];

// Preis hängt vom Füllstand ab: leeres Lager = teuer, volles Lager = billig.
export const PRICE = { MAX_FACTOR: 1.8, MIN_FACTOR: 0.45, SPREAD: 0.06 };

export function unitPrice(good, stock, cap) {
  const r = Math.max(0, Math.min(1, stock / cap));
  return GOODS[good].base * PRICE.MAX_FACTOR * Math.pow(PRICE.MIN_FACTOR / PRICE.MAX_FACTOR, r);
}
/** Rollen: produce = Markt verkauft, consume = Markt kauft, trade = Händler (beides, nur Puffer-Lager) */
export const canBuyFrom = (slot) => slot.role === 'produce' || slot.role === 'trade';
export const canSellTo = (slot) => slot.role === 'consume' || slot.role === 'trade';
/** Preis, den der Spieler pro Einheit zahlt */
export const buyPrice = (good, stock, cap) => unitPrice(good, stock, cap) * (1 + PRICE.SPREAD);
/** Preis, den der Spieler pro Einheit erhält */
export const sellPrice = (good, stock, cap) => unitPrice(good, stock, cap) * (1 - PRICE.SPREAD);

// Raten in Einheiten pro Sekunde
export const PLANET_TYPES = {
  agrar:    { name: 'Agrarwelt',    sprite: 'planet_agrar',    desc: 'Fruchtbare Welt, exportiert Nahrung und Biomasse.',
              produce: { food: 1.2, biomass: 0.4 }, consume: { water: 0.25, machinery: 0.03, fuel: 0.1 }, radius: [80, 120], weight: 20 },
  mining:   { name: 'Bergbauwelt',  sprite: 'planet_mining',   desc: 'Rohstoffwelt mit Erz-, Kristall- und Seltenerdminen.',
              produce: { ore: 1.0, crystals: 0.35, rareearth: 0.15 }, consume: { food: 0.5, machinery: 0.04, robots: 0.02, fuel: 0.1 }, radius: [70, 110], weight: 18 },
  ice:      { name: 'Eiswelt',      sprite: 'planet_ice',      desc: 'Gefrorene Welt, liefert Eis.',
              produce: { ice: 1.2 }, consume: { food: 0.35, electronics: 0.05, medicine: 0.05 }, radius: [60, 100], weight: 12 },
  urban:    { name: 'Metropole',    sprite: 'planet_urban',    desc: 'Dicht besiedelt. Reiselustige Bevölkerung, hoher Bedarf an Endprodukten.',
              produce: { passengers: 0.7 }, consume: { food: 0.9, water: 0.45, consumer: 0.12, luxury: 0.1, medicine: 0.08 }, radius: [90, 130], weight: 18 },
  resort:   { name: 'Paradieswelt', sprite: 'planet_resort',   desc: 'Urlaubsziel. Nimmt Touristen auf.',
              produce: { food: 0.4 }, consume: { passengers: 0.6, luxury: 0.15, water: 0.2, consumer: 0.04 }, radius: [70, 105], weight: 12 },
  gasgiant: { name: 'Gasriese',     sprite: 'planet_gasgiant', desc: 'Gewaltiger Gasplanet mit Förderplattformen.',
              produce: { gas: 1.4 }, consume: { food: 0.3, machinery: 0.03, robots: 0.02 }, radius: [120, 160], weight: 12 },
  jungle:   { name: 'Dschungelwelt', sprite: 'planet_jungle',  desc: 'Wuchernde Biosphäre, reich an Biomasse.',
              produce: { biomass: 1.2, food: 0.4 }, consume: { medicine: 0.06, machinery: 0.03, fuel: 0.08 }, radius: [75, 115], weight: 12 },
  volcanic: { name: 'Vulkanwelt',   sprite: 'planet_volcanic', desc: 'Glühende Kruste mit Seltenen Erden.',
              produce: { rareearth: 0.6, ore: 0.5 }, consume: { food: 0.4, water: 0.3, robots: 0.02 }, radius: [65, 100], weight: 10 },
};

export const STATION_FOOD = 0.12; // Crew-Verpflegung verarbeitender Stationen

export const STATION_TYPES = {
  smelter:       { name: 'Schmelzwerk',        sprite: 'station_factory', accent: '#ff7043', weight: 16,
                   recipe: { in: { ore: 2 }, out: { metal: 1 }, time: 2.5 } },
  waterworks:    { name: 'Wasserwerk',         sprite: 'station_factory', accent: '#29b6f6', weight: 11,
                   recipe: { in: { ice: 2 }, out: { water: 1 }, time: 2 } },
  refinery:      { name: 'Raffinerie',         sprite: 'station_factory', accent: '#ffa000', weight: 10,
                   recipe: { in: { gas: 2 }, out: { fuel: 1 }, time: 2.5 } },
  chemworks:     { name: 'Chemiewerk',         sprite: 'station_factory', accent: '#26c6da', weight: 9,
                   recipe: { in: { gas: 1, biomass: 1 }, out: { plastics: 1 }, time: 3 } },
  chipfab:       { name: 'Chipfabrik',         sprite: 'station_factory', accent: '#9575cd', weight: 9,
                   recipe: { in: { crystals: 2, rareearth: 1 }, out: { electronics: 1 }, time: 5 } },
  alloyworks:    { name: 'Legierungswerk',     sprite: 'station_factory', accent: '#78909c', weight: 9,
                   recipe: { in: { metal: 2, rareearth: 1 }, out: { alloys: 1 }, time: 4 } },
  pharma:        { name: 'Pharmawerk',         sprite: 'station_factory', accent: '#ef5350', weight: 8,
                   recipe: { in: { biomass: 2, water: 1 }, out: { medicine: 1 }, time: 4 } },
  jeweler:       { name: 'Luxusmanufaktur',    sprite: 'station_factory', accent: '#ec407a', weight: 7,
                   recipe: { in: { crystals: 1, water: 1 }, out: { luxury: 1 }, time: 4 } },
  machineworks:  { name: 'Maschinenbau',       sprite: 'station_factory', accent: '#ffca28', weight: 7,
                   recipe: { in: { alloys: 1, electronics: 1 }, out: { machinery: 1 }, time: 6 } },
  consumerworks: { name: 'Konsumgüterfabrik',  sprite: 'station_factory', accent: '#66bb6a', weight: 7,
                   recipe: { in: { plastics: 2, electronics: 1 }, out: { consumer: 1 }, time: 5 } },
  robotics:      { name: 'Robotikwerk',        sprite: 'station_factory', accent: '#42a5f5', weight: 5,
                   recipe: { in: { machinery: 1, electronics: 2 }, out: { robots: 1 }, time: 8 } },
  hotel:         { name: 'Orbitalhotel',       sprite: 'station_ring',    accent: '#26a69a', weight: 10,
                   consume: { passengers: 0.4, food: 0.3, luxury: 0.06 } },
  shipyard:      { name: 'Werft',              sprite: 'station_shipyard', accent: '#ffa726', weight: 0, radius: 64,
                   buys: ['metal', 'alloys', 'electronics', 'machinery', 'fuel'] },
  bigyard:       { name: 'Große Werft',        sprite: 'station_bigyard', accent: '#ff7043', weight: 0, radius: 110,
                   buys: ['metal', 'alloys', 'electronics', 'machinery', 'fuel', 'robots'] },
  hub:           { name: 'Handels-Hub',        sprite: 'station_hub', accent: '#4dd0e1', weight: 0, radius: 150,
                   trades: ['food', 'water', 'fuel', 'metal', 'electronics', 'medicine', 'luxury', 'machinery', 'consumer', 'robots'] },
};

export const BELT_TYPES = {
  ore:       { name: 'Erzfeld',         good: 'ore',       sprite: 'asteroid_rock',    dust: '#8d6e63', weight: 40 },
  ice:       { name: 'Eisfeld',         good: 'ice',       sprite: 'asteroid_ice',     dust: '#81d4fa', weight: 22 },
  crystals:  { name: 'Kristallfeld',    good: 'crystals',  sprite: 'asteroid_crystal', dust: '#ba68c8', weight: 22 },
  rareearth: { name: 'Seltenerdfeld',   good: 'rareearth', sprite: 'asteroid_rare',    dust: '#ff8a65', weight: 16 },
};

export const SHIP_TYPES = {
  spatz:     { name: 'Spatz',     sprite: 'ship_spatz',     size: 26, cargo: 30,  speed: 150, mining: 1.5, price: 2500,
               build: { metal: 12, fuel: 5 }, desc: 'Kleiner Allrounder mit Bergbaulaser.' },
  lastesel:  { name: 'Lastesel',  sprite: 'ship_lastesel',  size: 40, cargo: 120, speed: 100, mining: 0,   price: 9000,
               build: { metal: 40, alloys: 10, electronics: 8 }, desc: 'Träger Frachter mit großem Laderaum.' },
  maulwurf:  { name: 'Maulwurf',  sprite: 'ship_maulwurf',  size: 34, cargo: 80,  speed: 95,  mining: 5,   price: 7500,
               build: { metal: 30, alloys: 5, machinery: 6 }, desc: 'Bergbauschiff mit schwerem Bohrkopf.' },
  kolibri:   { name: 'Kolibri',   sprite: 'ship_kolibri',   size: 28, cargo: 45,  speed: 240, mining: 0,   price: 11000,
               build: { alloys: 15, electronics: 15, fuel: 10 }, desc: 'Schneller Kurier für lange Strecken.' },
  versorger: { name: 'Versorger', sprite: 'ship_versorger', size: 30, cargo: 50,  speed: 110, mining: 4,   price: 0,
               build: null, npc: true, desc: 'Stationseigenes Versorgungsschiff. Holt Rohstoffe für leere Stationen.' },
};

export const SHIPYARD = {
  MAX_FOR_SALE: 3,
  BUILD_TIME: 30,
  BUILD_ORDER: ['lastesel', 'spatz', 'maulwurf', 'kolibri', 'spatz'],
};

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
