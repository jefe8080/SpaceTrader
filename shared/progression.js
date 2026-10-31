// Fortschritt (PRD-2 Kapitel 8 bis 11): Pilotenlevel, XP-Quellen, Quests, Level von Planeten und Werften, Fraktionsruf.
// Alle Zahlen sind Kalibrierungsannahmen.

/** Pilotenlevel: XP kumuliert. Level n erlaubt den Kauf von Pilotenlizenz n. */
export const PILOT_LEVELS = [
  null,
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 600 },
  { level: 4, xp: 2000 },
  { level: 5, xp: 5500 },
  { level: 6, xp: 12000 },
  { level: 7, xp: 30000, title: 'Arbeitsloses Opfer' },
];
export const MAX_PILOT_LEVEL = PILOT_LEVELS.length - 1;
export function pilotLevel(xp = 0) {
  let l = 1;
  while (l < MAX_PILOT_LEVEL && xp >= PILOT_LEVELS[l + 1].xp) l++;
  return l;
}
export const pilotTitle = (xp) => PILOT_LEVELS[pilotLevel(xp)].title || null;

/** Nebenquellen der XP (Kapitel 17.2). Routenhandel bringt keine XP. */
export const XP = {
  SECTOR_FIRST: 30,   // erster Spieler weltweit im Sektor (PRD-3 Kapitel 8: vorher 60)
  SECTOR_VISIT: 10,   // Sektor erstmals selbst besucht (vorher 20)
  RECIPE: 5,          // neuer Almanach-Eintrag: Rezept, Planeten- oder Feldtyp
  SHIP: 10,           // neuer Almanach-Eintrag: Schiff
  MODULE: 10,         // neuer Almanach-Eintrag: Modul
  TRADE_CR: 1000,     // manueller Handel des Hauptschiffs: 1 XP je 1.000 Cr Gewinn ...
  TRADE_MAX_H: 40,    // ... höchstens 40 XP pro Stunde
};

/** Level von Planeten und Werften: 0 bis 6, XP kumuliert, kein Verfall */
export const GIVER_LEVELS = [0, 60, 180, 400, 800, 1500, 3000];
export const MAX_GIVER_LEVEL = GIVER_LEVELS.length - 1;
export function giverLevel(xp = 0) {
  let l = 0;
  while (l < MAX_GIVER_LEVEL && xp >= GIVER_LEVELS[l + 1]) l++;
  return l;
}
/** Wenig XP aus dem Handelsvolumen der Spieler am Questgeber: 1 XP je 20.000 Cr Umsatz */
export const GIVER_TRADE_CR = 20000;

export const LEVEL_FX = {
  PLANET_RATE: 0.1,     // Produktion und Verbrauch +10 % je Level
  PLANET_STORAGE: 0.15, // Lager +15 % je Level
  PLANET_PRICE: 0.4,    // Kaufpreis ×(1 + 0,4 × Level)
  YARD_BONUS: 0.05,     // Werte der gebauten Schiffe +5 % je Werftlevel
  EXTRA_RATE_CR: 6,     // Zusatzware: Warenfluss von 6 Cr/s zum Basispreis (× Planetengröße)
};

/** Zusatzwaren je Planetentyp (Kapitel 17.3): Level 2 produziert, Level 4 verbraucht, Level 6 produziert */
export const PLANET_EXTRAS = {
  agrar: ['preserves', 'medicine', 'textiles'],
  ocean: ['water', 'machinery', 'plastics'],
  desert: ['glass', 'coolant', 'silicon'],
  mining: ['ingots', 'cutters', 'raremetals'],
  ice: ['water', 'electronics', 'coolant'],
  urban: ['electronics', 'habitats', 'robots'],
  resort: ['workers', 'medicine', 'preserves'],
  gasgiant: ['shipfuel', 'coolant', 'chemicals'],
  jungle: ['medicine', 'cutters', 'textiles'],
  volcanic: ['raremetals', 'machinery', 'chemicals'],
  colony: ['workers', 'consumer', 'ingots'],
  industrial: ['plates', 'electronics', 'hullparts'],
};
export const EXTRA_STEPS = [[2, 'produce'], [4, 'consume'], [6, 'produce']];

/** Questtafel: Slots je Level, neues Angebot alle 30 bis 60 min */
export const QUEST = {
  SLOTS: [1, 1, 2, 2, 2, 3, 3],
  EVERY: [1800, 3600],
  EXPIRE: 3 * 3600,     // volle Tafel: Angebote älter als 3 h werden ersetzt
  ABORT_LOCK: 600,      // 10 min Sperre nach einem Abbruch
  RANGE: 60000,         // Ziele im Umkreis des Questgebers
  // Belohnung = Basis × geschätzter Aufwand (min) × Schwierigkeit^Questlevel + Anteil am Warenwert (Erstattung)
  BASE_CR: 60,
  DIFF: 1.7,
  VALUE_SHARE: 1.25,    // Erstattung: deckt den Einkauf bei mittlerem Füllstand plus Aufschlag
  XP_PER_MIN: 1.5,      // XP je Aufwandsminute, × (1 + 0,1 × Questlevel); PRD-3: Ziel 125 bis 160 XP/h mit Hauptschiff
  XP_LEVEL: 0.1,
  EXPLORE_XP: 0.5,      // Faktor auf die XP von Erkundungsquests (netto 0,75 XP je Minute)
  GIVER_XP_DIV: 1.5,    // Questgeber-XP = Quest-XP / 1,5 (Planetenlevel steigen so schnell wie vor PRD-3)
  REF_SPEED: 150,       // Aufwand: Flugminuten bei Speed 150 ...
  STOP_MIN: 1,          // ... plus 1 min je Lade- oder Zwischenstopp
  MINE_RATE: 4,         // angenommene Abbaurate für die Aufwandsschätzung (Einheiten/s)
};
export const QUEST_TYPES = {
  procure: { name: 'Beschaffung', icon: '📦' },
  courier: { name: 'Kurier', icon: '✉' },
  tour: { name: 'Rundreise', icon: '🧳' },
  explore: { name: 'Erkundung', icon: '🔭' },
  mine: { name: 'Abbau', icon: '⛏' },
  rush: { name: 'Eilbestellung', icon: '⚡' },
};
/** Aufwand in Minuten für eine Flugstrecke (Einheiten) */
export const flightMinutes = (dist) => dist / QUEST.REF_SPEED / 60;
export function questReward(effortMin, level, goodsValue = 0, type = null) {
  const xpMul = type === 'explore' ? QUEST.EXPLORE_XP : 1;
  return {
    cr: Math.round((QUEST.BASE_CR * effortMin * QUEST.DIFF ** level + goodsValue * QUEST.VALUE_SHARE) / 10) * 10,
    xp: Math.max(1, Math.round(effortMin * QUEST.XP_PER_MIN * xpMul * (1 + QUEST.XP_LEVEL * level))),
  };
}
/** Questgeber-XP aus einer erfüllten Quest */
export const giverXpOf = (questXp) => questXp / QUEST.GIVER_XP_DIV;

/** Fraktionsruf: Ränge 0 bis 4 (Rang 4 seit PRD 15 für den Bauplan des Spezialschiffs), Ruf proportional zu den Quest-XP, Verlust nur beim Abbruch (nie unter die Rangschwelle) */
export const RANKS = [0, 100, 400, 1200, 3000];
export const RANK_NAMES = ['Fremder', 'Partner', 'Vertrauter', 'Ehrenmitglied', 'Bannerträger'];
export const REP = { PER_XP: 0.67, ABORT: 0.25 }; // Ruf = 0,67 × Quest-XP (PRD-3), Abbruch kostet 25 % der Quest-XP als Ruf
export function factionRank(rep = 0) {
  let r = 0;
  while (r < RANKS.length - 1 && rep >= RANKS[r + 1]) r++;
  return r;
}
