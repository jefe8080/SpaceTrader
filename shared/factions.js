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

/** Fraktionsschiffe: Klasse F, Pilotenlizenz 4, Preis = Credits plus seltene Ressource */
export const FACTION_SHIPS = {
  f_miners:    { faction: 'miners', name: 'Erzbrecher', size: 70, cargo: 1000, speed: 125, mining: 40, price: 8000000, tank: 260,
                 currency: { good: 'diamond', n: 500 }, desc: 'Gildenfrachter mit gewaltigem Bohrkopf.' },
  f_tech:      { faction: 'tech', name: 'Quantensegler', size: 64, cargo: 650, speed: 270, mining: 0, price: 9000000, tank: 240,
                 currency: { good: 'exocrystals', n: 300 }, desc: 'Extrem schneller Hochtechnologie-Frachter.' },
  f_nomads:    { faction: 'nomads', name: 'Karawane', size: 74, cargo: 1500, speed: 150, mining: 0, price: 7000000, tank: 420,
                 currency: { good: 'nebulagas', n: 600 }, desc: 'Wohnschiff und Frachter, gebaut für endlose Reisen.' },
  f_order:     { faction: 'order', name: 'Sternenläufer', size: 66, cargo: 850, speed: 230, mining: 0, price: 10000000, tank: 300,
                 currency: { good: 'antimatter', n: 120 }, desc: 'Ordensschiff mit Antimaterie-Antrieb.' },
  f_league:    { faction: 'league', name: 'Hansekogge', size: 72, cargo: 1700, speed: 135, mining: 0, price: 8000000, tank: 330,
                 currency: { good: 'gold', n: 400 }, desc: 'Breiter Handelsfrachter der Liga.' },
  f_syndicate: { faction: 'syndicate', name: 'Stahlkoloss', size: 80, cargo: 2300, speed: 110, mining: 6, price: 9000000, tank: 380,
                 currency: { good: 'uranium', n: 350 }, desc: 'Gepanzerter Schwerlastfrachter.' },
};
