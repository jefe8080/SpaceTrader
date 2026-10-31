// PRD 15 U09/U10: zentrale Fraktions- und Kriegswirtschaftstabellen. Bestätigte PRD-Zahlen sind markiert,
// alle übrigen Werte sind Kalibrierungsannahmen und hier zentral änderbar.
export const FACTION_WAR = {
  POOL_CAP: 10_000_000,          // bestätigt: Pooldeckel 10 Mio. Credits × Fraktionssektorlevel
  START_POOL: 1_500_000,
  INCOME_PER_MIN: 2_000,         // sehr langsames passives Einkommen je Level und Minute
  ACTIVITY_WINDOW: 86_400,       // bestätigt: Spieleraktivität im eigenen/angrenzenden Sektor in den letzten 24 Spielstunden
  SUPPLY_GOODS: ['water', 'food'],
  DEMAND_PER_MIN: 3,             // je Ware und Level
  BUFFER: 300,                   // Puffer je Ware und Level
  PROGRESS_PER_MIN: 1 / 120,     // dauerhafte Versorgung: ca. 2 Stunden je Level
  QUEST_XP_PROGRESS: 1 / 3000,   // Fraktions-XP aus Quests als Zusatzfortschritt
  LEVEL_COST: 2_000_000,         // Ausbau kostet Level × Betrag aus dem lokalen Pool
  MAX_LEVEL: 10,
  WARSHIPS_PER_LEVEL: 10,        // bestätigt: Kriegsschifflimit 10 × Fraktionssektorlevel je Sektor
  DEFENSE_SHARE: 0.4,            // Anteil der Flotte, der als Verteidigung zurückbleibt
  BUILD_EVERY: 240,              // Sekunden zwischen Bauentscheidungen
  TRANSPORT_EVERY: [600, 1500],  // bestätigt: alle 10-25 Minuten ein Versorgungs-/Abholschiff
  GOLD_RATE: 2_000,              // fester Kurs Credits je Einheit Feingold, verlustfrei
  TRANSPORT_SHARE: 0.2,          // Anteil des Startpools je Transport
  TRANSPORT_TYPE: 'seekuh',
  GIFT: { food: 40, water: 40 }, // Geschenk der Freundschaftsquest
  FRIEND_LEVEL: 2,               // bestätigt: Leitstellenstufe mit sektorweiter Reichweite
  SHIP_LOCK: 5,                  // bestätigt: ab fünf eigenen Schiffen Bau/Kauf gesperrt, solange die Quest offen ist
  SECOND_FRIEND_COST: 75_000_000, // ausdrücklich sehr teuer: Leitstellenmodul „galaktische Freundschaft“
};

/** Baureihen der NPC-Fraktionen: Grundtypen plus eigene Fraktionsmodelle (nach Level) */
export const FACTION_FLEET = {
  1: ['korvette', 'abfangstaffel'],
  2: ['korvette', 'fregatte', 'abfangstaffel', 'bomberstaffel'],
  4: ['fregatte', 'zerstoerer', 'abfangstaffel', 'bomberstaffel'],
  6: ['zerstoerer', 'kreuzer', 'fregatte', 'bomberstaffel'],
};
export function fleetChoices(level) {
  let out = FACTION_FLEET[1];
  for (const [lv, list] of Object.entries(FACTION_FLEET)) if (level >= Number(lv)) out = list;
  return out;
}

/** U10: Aggression, Friedenszeit, Raids, Planetenschutz */
export const AGGRESSION = {
  PEACE: 86_400,          // bestätigt: einmaliger 24-Stunden-Friedenstimer ab erster Erfassung
  RISE_PER_MIN: 0.5,      // Anstieg je Minute Spieleraktivität im Sektor oder angrenzend
  RAID_AT: 60,            // Schwelle für Raids
  RAID_COST: 40,          // Aggressionsabbau je ausgelöstem Raid
  RAID_COOLDOWN: 1800,    // Sekunden zwischen Raids je Fraktionssektor
  BORDER_RADIUS: 6000,    // Schutzradius um Verwaltungsplanet und Werft (Grenzabfangen)
  LOOT_SECS: 45,          // sichtbare Plünderungsphase
  PROTECT: 86_400,        // bestätigt: 24 Stunden Raidschutz ab erfolgreicher Plünderung
  MALUS: 0.5,             // bestätigt: Produktion 50 % bis zur Reparatur
  REPAIR_COST: 25_000,    // Planetenreparatur (Geld, kurze Zeit, keine Baumaterialien)
  REPAIR_SECS: 120,
};
