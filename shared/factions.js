// NPC-Fraktionen: Archetypen mit Namensschema, Farbe, Spezialisierung, Schiffswährung und Fraktionsschiff.

export const FACTION = {
  CLUSTER_EVERY: 3,     // ca. 1 Fraktionscluster je 3 Sektoren
  SYSTEMS: [2, 3],      // Systeme je Cluster
  MODULE_SHARE: 0.6,    // jedes Fraktionssystem bietet 60 % des Modulkatalogs
  CURRENCY_DEMAND: 0.03, // dauerhafte Nachfrage nach der Schiffswährung (Einheiten/s)
};

export const FACTIONS = {
  miners: {
    name: 'Bergbaugilde', color: '#ffb300', currency: 'diamond', tags: ['ore', 'crystals', 'rareearth'],
    ship: 'f_miners', desc: 'Zähe Bergleute, die jeden Asteroiden kennen. Zahlen in Diamanten.',
    systems: ['Glückauf', 'Tiefenstein', 'Erzhalde', 'Schlägelgrund', 'Hammerfels', 'Silberader', 'Kohlgrube', 'Stollenruh'],
    station: (s) => `Gildenhütte ${s}`, yard: (s) => `Gildenwerft ${s}`,
  },
  tech: {
    name: 'Tech-Konsortium', color: '#26c6da', currency: 'exocrystals', tags: ['silicate', 'crystals'],
    ship: 'f_tech', desc: 'Ingenieure und Datenhändler. Handeln mit Exotischen Kristallen.',
    systems: ['NX-417', 'QX-9', 'ZT-Kern', 'VR-212', 'KX-Prime', 'Node-33', 'Array-5', 'Lambda-Hub'],
    station: (s) => `Konsortium ${s}`, yard: (s) => `Fertigungsring ${s}`,
  },
  nomads: {
    name: 'Nomadenclan', color: '#ff7043', currency: 'nebulagas', tags: ['gas', 'helium3'],
    ship: 'f_nomads', desc: 'Fahrendes Volk zwischen den Sternen. Ihre Währung ist Nebelgas.',
    systems: ["Ka'resh", "Tor'vaal", 'Zhar-Nesh', "Mi'kaal", 'Oshra', "Vey'dun", 'Kessrah', "Am'tar"],
    station: (s) => `Karawanenrast ${s}`, yard: (s) => `Clanwerft ${s}`,
  },
  order: {
    name: 'Tiefraum-Orden', color: '#ab47bc', currency: 'antimatter', tags: ['ice', 'crystals'],
    ship: 'f_order', desc: 'Schweigsame Wächter des Tiefraums. Verlangen Antimaterie.',
    systems: ['Sanctum Lucis', 'Abyssus', 'Vigilia', 'Silentium', 'Aeterna', 'Custodia', 'Umbra Mater', 'Noctis'],
    station: (s) => `Kloster ${s}`, yard: (s) => `Ordenswerft ${s}`,
  },
  league: {
    name: 'Handelsliga', color: '#66bb6a', currency: 'gold', tags: ['grain', 'biomass', 'crude'],
    ship: 'f_league', desc: 'Kaufmannsgilden mit altem Hanse-Stolz. Rechnen in Gold.',
    systems: ['Hansa Nova', 'Kontor Bremar', 'Gildehafen', 'Lübrecht', 'Wisbyra', 'Hanseck', 'Rigavor', 'Brügghall'],
    station: (s) => `Kontor ${s}`, yard: (s) => `Ligawerft ${s}`,
  },
  syndicate: {
    name: 'Schwerindustrie-Syndikat', color: '#ef5350', currency: 'uranium', tags: ['ore', 'sulfur', 'crude'],
    ship: 'f_syndicate', desc: 'Stahl, Reaktoren und harte Verträge. Bezahlt wird mit Uran.',
    systems: ['Hochofen 9', 'Schmiedestadt', 'Walzgrund', 'Kokerei Rot', 'Stahlberg', 'Esse-4', 'Reaktorfeld', 'Gießhall'],
    station: (s) => `Syndikatswerk ${s}`, yard: (s) => `Syndikatswerft ${s}`,
  },
};

/**
 * Fraktionsschiffe (PRD-2 Kapitel 11 und 17.4): je Fraktion ein L-, ein XL- und ein Spezialschiff.
 * cls: L und XL wie die normalen Klassen (Pilotenlizenz 3 bzw. 5), Spezialschiffe Klasse F (Pilotenlizenz 5).
 * rank: nötiger Fraktionsrang. Preis = Credits plus Schiffswährung der Fraktion aus den angedockten eigenen Schiffen.
 * ability: Fraktionsfähigkeit der Spezialschiffe (Wirkung in ships.js, nav.js und game.js).
 */
export const FACTION_SHIPS = {
  fl_miners:   { faction: 'miners', cls: 'L', rank: 1, name: 'Gildenhauer', size: 62, cargo: 720, speed: 100, mining: 42, price: 1600000, tank: 180,
                 currency: { good: 'diamond', n: 100 }, base: 'mammut', desc: 'Bergbaufrachter der Gilde, gräbt anderthalbmal so schnell wie ein Mammut.' },
  fx_miners:   { faction: 'miners', cls: 'XL', rank: 2, name: 'Tiefenbrecher', size: 92, cargo: 2200, speed: 100, mining: 60, price: 14000000, tank: 620,
                 currency: { good: 'diamond', n: 250 }, base: 'titan', desc: 'Riesiger Abbaufrachter mit Doppelbohrkopf.' },
  f_miners:    { faction: 'miners', cls: 'F', rank: 3, name: 'Erzbrecher', size: 74, cargo: 1500, speed: 125, mining: 80, price: 20000000, tank: 400,
                 currency: { good: 'diamond', n: 500 }, ability: 'drill', desc: 'Gildenfrachter mit gewaltigem Bohrkopf.' },
  fl_tech:     { faction: 'tech', cls: 'L', rank: 1, name: 'Datenpfeil', size: 58, cargo: 600, speed: 210, mining: 0, price: 3750000, tank: 250,
                 currency: { good: 'exocrystals', n: 60 }, base: 'kondor', desc: 'Schneller Kurierfrachter des Konsortiums.' },
  fx_tech:     { faction: 'tech', cls: 'XL', rank: 2, name: 'Netzkreuzer', size: 88, cargo: 1900, speed: 140, mining: 0, price: 14000000, tank: 620,
                 currency: { good: 'exocrystals', n: 150 }, base: 'titan', desc: 'Großfrachter mit Hochleistungsantrieb.' },
  f_tech:      { faction: 'tech', cls: 'F', rank: 3, name: 'Quantensegler', size: 66, cargo: 1000, speed: 320, mining: 0, price: 22000000, tank: 360,
                 currency: { good: 'exocrystals', n: 300 }, ability: 'sensor', desc: 'Extrem schneller Hochtechnologie-Frachter.' },
  fl_nomads:   { faction: 'nomads', cls: 'L', rank: 1, name: 'Wanderzelt', size: 60, cargo: 600, speed: 170, mining: 0, price: 3750000, tank: 420,
                 currency: { good: 'nebulagas', n: 120 }, base: 'kondor', desc: 'Leichtes Reiseschiff mit riesigen Tanks.' },
  fx_nomads:   { faction: 'nomads', cls: 'XL', rank: 2, name: 'Sippenschiff', size: 92, cargo: 2000, speed: 120, mining: 0, price: 14000000, tank: 1200,
                 currency: { good: 'nebulagas', n: 300 }, base: 'titan', desc: 'Schwimmende Stadt einer ganzen Sippe.' },
  f_nomads:    { faction: 'nomads', cls: 'F', rank: 3, name: 'Karawane', size: 76, cargo: 2000, speed: 180, mining: 0, price: 20000000, tank: 1000,
                 currency: { good: 'nebulagas', n: 600 }, ability: 'fuel', desc: 'Wohnschiff und Frachter, gebaut für endlose Reisen.' },
  fl_order:    { faction: 'order', cls: 'L', rank: 1, name: 'Novize', size: 58, cargo: 620, speed: 200, mining: 0, price: 3750000, tank: 250,
                 currency: { good: 'antimatter', n: 25 }, base: 'kondor', desc: 'Schlankes Schiff der Ordensnovizen.' },
  fx_order:    { faction: 'order', cls: 'XL', rank: 2, name: 'Kathedrale', size: 94, cargo: 2000, speed: 135, mining: 0, price: 14000000, tank: 650,
                 currency: { good: 'antimatter', n: 60 }, base: 'titan', desc: 'Fliegendes Kloster mit Antimaterie-Antrieb.' },
  f_order:     { faction: 'order', cls: 'F', rank: 3, name: 'Sternenläufer', size: 68, cargo: 1200, speed: 280, mining: 0, price: 24000000, tank: 400,
                 currency: { good: 'antimatter', n: 120 }, ability: 'void', desc: 'Ordensschiff, das Gravitationsstörungen und Nebel kaum spürt.' },
  fl_league:   { faction: 'league', cls: 'L', rank: 1, name: 'Kontorkogge', size: 68, cargo: 1350, speed: 90, mining: 0, price: 2750000, tank: 230,
                 currency: { good: 'gold', n: 80 }, base: 'wal', desc: 'Bauchiger Handelsfrachter der Kontore.' },
  fx_league:   { faction: 'league', cls: 'XL', rank: 2, name: 'Großkogge', size: 108, cargo: 4500, speed: 70, mining: 0, price: 24000000, tank: 950,
                 currency: { good: 'gold', n: 200 }, base: 'leviathan', desc: 'Das Flaggschiff der Ligakontore.' },
  f_league:    { faction: 'league', cls: 'F', rank: 3, name: 'Hansekogge', size: 76, cargo: 3500, speed: 120, mining: 0, price: 25000000, tank: 600,
                 currency: { good: 'gold', n: 400 }, ability: 'trader', desc: 'Breiter Handelsfrachter der Liga mit Zollprivileg.' },
  fl_syndicate: { faction: 'syndicate', cls: 'L', rank: 1, name: 'Stahlträger', size: 68, cargo: 1200, speed: 85, mining: 0, price: 2750000, tank: 230,
                 currency: { good: 'uranium', n: 70 }, base: 'wal', desc: 'Gepanzerter Massengutfrachter.' },
  fx_syndicate: { faction: 'syndicate', cls: 'XL', rank: 2, name: 'Schmiedeberg', size: 110, cargo: 4000, speed: 70, mining: 0, price: 24000000, tank: 950,
                 currency: { good: 'uranium', n: 175 }, base: 'leviathan', desc: 'Schwimmendes Stahlwerk des Syndikats.' },
  f_syndicate: { faction: 'syndicate', cls: 'F', rank: 3, name: 'Stahlkoloss', size: 82, cargo: 4200, speed: 100, mining: 6, price: 25000000, tank: 650,
                 currency: { good: 'uranium', n: 350 }, ability: 'hazard', desc: 'Gepanzerter Schwerlastfrachter, fährt Gefahrgut ohne Kammer.' },
};
/** Fähigkeiten der Spezialschiffe */
export const ABILITIES = {
  drill: 'Baut ultraseltene Vorkommen ohne Tiefbohrer-Modul ab',
  sensor: 'Doppelte Sensorreichweite (kombinierbar mit der Sensorphalanx)',
  fuel: 'Treibstoffverbrauch −50 %',
  void: 'Kein Tempo-Malus durch Gravitationsstörungen, halber Sensor-Malus im Nebel',
  trader: 'Zahlt keinen Zoll an Spielerbesitz, +5 % Verkaufserlös',
  hazard: 'Transportiert Gefahrgut ohne Geschirmte Kammer',
};
/** Schiffe einer Fraktion in Rangfolge */
export const factionShips = (f) => Object.keys(FACTION_SHIPS).filter((id) => FACTION_SHIPS[id].faction === f).sort((a, b) => FACTION_SHIPS[a].rank - FACTION_SHIPS[b].rank);
