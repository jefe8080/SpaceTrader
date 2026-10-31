// PRD 15 U02/U03: zentrale Kampf-Wertetabellen. Klassen, Waffen, Systeme, Baupläne und Fraktionsprofile.
// Alle Zahlen außerhalb der im PRD bestätigten Vorgaben sind Kalibrierungsannahmen und hier zentral änderbar.
import { WORLD } from './config.js';

/** Bestätigte Rahmenwerte des PRD und taktische Grundgrößen */
export const COMBAT = {
  MAP: { W: 6000, H: 4000 },          // taktische Karte (Kampfeinheiten)
  EDGE: 260,                          // Rückzugsbereich am Kartenrand
  ENGAGE: 900,                        // strategische Waffenreichweite: Begegnung eröffnet die Schlacht
  SUPPORT_LOCAL: (WORLD.SYSTEM_RADIUS * 2) / 4, // Bewachen: ein Viertel des Systemdurchmessers
  INTERCEPT: WORLD.SECTOR_RADIUS,     // Abfangen: halbe Sektorweite
  STALEMATE: 120,                     // Sekunden ohne mögliche Schadenswirkung -> Unentschieden
  DEBRIS_TTL: 1800,                   // Trümmer verschwinden nach 30 Minuten Spielzeit
  DEBRIS_SHARE: 0.3,                  // Anteil der Baurohstoffe in Trümmern
  RANSOM: 0.25,                       // Freikauf: 25 % des regulären Kaufpreises
  RETREAT: { war: 0.25, multi: 0.4 }, // Standard-Rückzugsschwellen (Rumpfanteil)
  SURRENDER_MULTI: 0.3,               // Mehrzweck: Kapitulation unter 30 %
  JUMP_PREP: { craft: 4, S: 8, M: 12, L: 18, XL: 25 }, // Sprungvorbereitung in Sekunden
  RETREAT_OFFSET: 2500,               // Abstand der sicheren Rückzugsposition vom Schlachtort
  SENSOR_DETECT: 1.6,                 // Erfassung (Typ/Schild/Rumpf) = Sensor × Faktor; Systeme innerhalb Sensor
  ION: { DECAY: 6, DURATION: 6, MAX: 15 }, // Belastungsabbau je Sekunde, Störungsdauer, Höchstdauer
  FIRE: { CHANCE: 0.06, DPS: 6, SECS: 12 }, // Brände: Auslösechance je geeignetem Treffer, Rumpfschaden je Sekunde
  DAMAGE_CONTROL: { RATE: 4, SECS_PER_FIRE: 6 }, // System-LP je Sekunde, Sekunden je gelöschtem Brand
};

/** Strategische Klassen */
export const NAVAL_CLASSES = {
  civil: { name: 'Zivil', desc: 'Frachter, Bergbau und Arbeit; fliehen oder kapitulieren, kämpfen nicht' },
  multi: { name: 'Mehrzweck', desc: 'Handel/Arbeit und Selbstverteidigung; kein automatisches Abfangen' },
  war: { name: 'Krieg', desc: 'Aktiver Angriff, Bewachen, Abfangen; nur kleine Versorgungs-/Beuteladeräume' },
};

/** Panzerung: Anteil Schadensreduktion gegen Durchschlag 0. Nie vollständige Unwirksamkeit (Minimum 25 % Wirkung). */
export const ARMOR = { none: 0, light: 0.2, medium: 0.4, heavy: 0.6 };
export const ARMOR_FLOOR = 0.25;
export const armorFactor = (armor, pen) => Math.max(ARMOR_FLOOR, 1 - (ARMOR[armor] ?? armor) * (1 - pen));

/**
 * Waffentabelle. range/minRange in Kampfeinheiten, rof Schüsse/s, arc Feuerwinkel in Grad, tracking Zielverfolgung,
 * speed Geschossgeschwindigkeit (0 = sofort), dmg je Schuss, type Schadenstyp, pen Durchschlag, struct Strukturanteil
 * bei Systemtreffern, shieldMul/hullMul Wirkung auf Schild bzw. Struktur, bypass schildumgehender Anteil,
 * ammo Vorrat je Werfer, ammoCost Credits je Schuss, guided Lenkwaffe, aoe Flächenwirkung, vsCraft Treffermalus gegen Fluggeräte.
 */
export const WEAPONS = {
  laser:   { name: 'Leichter Laser', range: 900, minRange: 0, rof: 2, arc: 120, tracking: 1, speed: 0, dmg: 14, type: 'energy', pen: 0, struct: 0.3, vsCraft: 1, role: 'Hohe Zielverfolgung gegen kleine Ziele; schwach gegen schwere Panzerung' },
  heavy:   { name: 'Schwere Energiewaffe', range: 1400, minRange: 0, rof: 0.4, arc: 60, tracking: 0.35, speed: 900, dmg: 120, type: 'energy', pen: 0.5, struct: 0.4, vsCraft: 0.35, fire: true, role: 'Hoher Schaden gegen große Ziele; begrenzte Zielverfolgung' },
  ion:     { name: 'Ionenwaffe', range: 1000, minRange: 0, rof: 0.8, arc: 90, tracking: 0.6, speed: 1100, dmg: 30, type: 'ion', pen: 0.2, struct: 0.2, shieldMul: 3, hullMul: 0.25, ionLoad: 30, vsCraft: 0.6, role: 'Starke Schildwirkung und Systemstörung; wenig Strukturzerstörung' },
  missile: { name: 'Rakete', range: 2000, minRange: 250, rof: 0.25, arc: 360, tracking: 0.9, speed: 380, dmg: 80, type: 'explosive', pen: 0.4, struct: 0.4, ammo: 12, ammoCost: 900, guided: true, vsCraft: 0.8, role: 'Gelenkt gegen bewegliche Ziele; begrenzte Munition, abfangbar' },
  torpedo: { name: 'Torpedo', range: 1800, minRange: 400, rof: 0.1, arc: 60, tracking: 0.5, speed: 220, dmg: 420, type: 'explosive', pen: 0.7, struct: 0.5, bypass: 0.35, ammo: 4, ammoCost: 6000, guided: true, aoe: { r: 60, falloff: 0.5 }, vsCraft: 0.2, fire: true, role: 'Schwerer Schiffs-/Systemschaden; langsam/weniger wendig, abfangbar' },
  beam:    { name: 'Strahlenwaffe', range: 1100, minRange: 0, rof: 4, arc: 30, tracking: 0.5, speed: 0, dmg: 10, ramp: 2.2, rampSecs: 4, type: 'energy', pen: 0.4, struct: 0.35, vsCraft: 0.5, role: 'Konzentrierte Wirkung bei gehaltenem Feuerkontakt' },
  flak:    { name: 'Flak', range: 700, minRange: 0, rof: 1.5, arc: 180, tracking: 1.2, speed: 1000, dmg: 18, type: 'kinetic', pen: 0.1, struct: 0.3, aoe: { r: 90, falloff: 0.6 }, vsLarge: 0.3, vsCraft: 1.4, role: 'Flächenwirkung gegen kleine Ziele; schwach gegen schwere Schiffe' },
  pd:      { name: 'Punktverteidigung', range: 450, minRange: 0, rof: 4, arc: 180, tracking: 1.5, speed: 0, dmg: 6, type: 'kinetic', pen: 0, struct: 0.3, intercept: 1.5, vsCraft: 1.2, role: 'Lenkwaffenabwehr; begrenzte Reichweite, Winkel und Kapazität' },
  gun:     { name: 'Bordkanone', range: 500, minRange: 0, rof: 3, arc: 60, tracking: 1.4, speed: 0, dmg: 6, type: 'energy', pen: 0, struct: 0.3, vsCraft: 1.3, role: 'Jägerbewaffnung gegen Staffeln' },
  bomb:    { name: 'Bombe', range: 450, minRange: 0, rof: 0.25, arc: 40, tracking: 0.5, speed: 300, dmg: 160, type: 'explosive', pen: 0.6, struct: 0.6, vsCraft: 0.1, role: 'Bomber gegen freigelegte Systeme' },
};

/** Treffbare Systeme und ihre Ausfallwirkung */
export const SYSTEMS = {
  engine:  { name: 'Hauptantriebsgruppe', icon: '🔥', effect: 'Anteil an Beschleunigung/Höchstgeschwindigkeit entfällt' },
  thrust:  { name: 'Manövrieranlage', icon: '↻', effect: 'Anteil an Drehen und Bremsen entfällt' },
  shield:  { name: 'Schildgenerator', icon: '◈', effect: 'Zugeordnete Schildsektoren brechen zusammen' },
  light:   { name: 'Leichte Waffenbatterie', icon: '✦', effect: 'Zugeordnete Waffen fallen aus' },
  heavyb:  { name: 'Schwere Waffenbatterie', icon: '✸', effect: 'Zugeordnete Waffen fallen aus' },
  ionb:    { name: 'Ionenbatterie', icon: 'ϟ', effect: 'Zugeordnete Ionenwaffen fallen aus' },
  launcher:{ name: 'Raketen-/Torpedowerfer', icon: '➹', effect: 'Werfer fällt aus; übrige Munition nicht nutzbar' },
  pd:      { name: 'Punktverteidigung', icon: '⊕', effect: 'Zugeordneter Abwehrbereich verliert Schutz' },
  sensor:  { name: 'Sensoranlage', icon: '◉', effect: 'Erfassung und Zielverfolgung sinken' },
  bridge:  { name: 'Brücke/Feuerleitung', icon: '⌂', effect: 'Koordination und Fähigkeiten sinken; Befehlsgewalt bleibt' },
  reactor: { name: 'Reaktor', icon: '⚛', effect: 'Zugeordnete Energieverbraucher verlieren Leistung' },
  jump:    { name: 'Sprungantrieb', icon: '⤴', effect: 'Individueller Sprungrückzug nicht möglich' },
  work:    { name: 'Bergbau-/Arbeitsanlage', icon: '⛏', effect: 'Zugeordnete zivile Funktion fällt aus' },
};

/** Systemzustände nach Anteil der System-Lebenspunkte; Wirkungsfaktor je Zustand */
export function systemState(hp, max) {
  if (hp <= 0) return 'destroyed';
  const f = hp / max;
  return f > 0.5 ? 'intact' : f > 0.25 ? 'damaged' : 'critical';
}
export const STATE_NAMES = { intact: 'Intakt', damaged: 'Beschädigt', critical: 'Kritisch', destroyed: 'Zerstört', jammed: 'Gestört' };
export const STATE_EFFECT = { intact: 1, damaged: 0.7, critical: 0.35, destroyed: 0 };

/** Waffenart -> Batterietyp */
const BATTERY_OF = { laser: 'light', gun: 'light', flak: 'light', heavy: 'heavyb', beam: 'heavyb', ion: 'ionb', missile: 'launcher', torpedo: 'launcher', bomb: 'launcher', pd: 'pd' };

/** Montageseiten: Bogenmitte (rad, 0 = Bug) und Lage im Schiffsrahmen (x Bug+, y Steuerbord+) */
const SIDES = {
  bow: { arc: 0, x: 0.75, y: 0 }, stern: { arc: Math.PI, x: -0.75, y: 0 },
  port: { arc: -Math.PI / 2, x: 0, y: -0.6 }, starboard: { arc: Math.PI / 2, x: 0, y: 0.6 },
  turret: { arc: 0, x: 0.2, y: 0, turret: true },
};

/**
 * Schiffstabelle. hull Rumpf-LP, armor [Bug, Heck, Backbord, Steuerbord], shield { sectors 1|4, hp je Sektor, regen/s, delay },
 * tac { speed, accel, brake, turn (rad/s) }, weapons [[Art, Anzahl, Seite]], extra Systeme, tier Größenklasse für Systemzahl.
 * squad { n, hull, shield } für Staffeln. ability/drawback: besondere Fähigkeit mit spürbarem Nachteil.
 */
export const COMBAT_TYPES = {
  // ---- Zivil (Bestand) ----
  maulwurf:   { cls: 'civil', role: 'Bergbau', tier: 'S', hull: 320, armor: ['light', 'light', 'light', 'light'], tac: { speed: 120, accel: 40, brake: 50, turn: 1.2 }, work: true },
  kolibri:    { cls: 'civil', role: 'Kurier', tier: 'S', hull: 260, armor: ['none', 'none', 'none', 'none'], tac: { speed: 260, accel: 90, brake: 90, turn: 1.6 } },
  lastesel:   { cls: 'civil', role: 'Frachter', tier: 'M', hull: 700, armor: ['light', 'light', 'light', 'light'], tac: { speed: 80, accel: 25, brake: 30, turn: 0.6 } },
  grubenhund: { cls: 'civil', role: 'Bergbau', tier: 'M', hull: 760, armor: ['medium', 'light', 'light', 'light'], tac: { speed: 90, accel: 28, brake: 32, turn: 0.6 }, work: true },
  bussard:    { cls: 'civil', role: 'Schneller Frachter', tier: 'M', hull: 560, armor: ['light', 'none', 'none', 'none'], tac: { speed: 200, accel: 70, brake: 70, turn: 1.1 } },
  seekuh:     { cls: 'civil', role: 'Frachter', tier: 'L', hull: 1500, armor: ['medium', 'light', 'light', 'light'], tac: { speed: 95, accel: 22, brake: 26, turn: 0.4 } },
  mammut:     { cls: 'civil', role: 'Bergbau', tier: 'L', hull: 1800, armor: ['medium', 'medium', 'light', 'light'], tac: { speed: 65, accel: 16, brake: 20, turn: 0.35 }, work: true },
  wal:        { cls: 'civil', role: 'Massengut', tier: 'L', hull: 2000, armor: ['light', 'light', 'light', 'light'], tac: { speed: 56, accel: 14, brake: 18, turn: 0.3 } },
  kondor:     { cls: 'civil', role: 'Schneller Frachter', tier: 'L', hull: 1300, armor: ['light', 'none', 'none', 'none'], tac: { speed: 150, accel: 40, brake: 40, turn: 0.6 } },
  titan:      { cls: 'civil', role: 'Riesenfrachter', tier: 'XL', hull: 3600, armor: ['medium', 'light', 'light', 'light'], tac: { speed: 72, accel: 12, brake: 15, turn: 0.22 } },
  leviathan:  { cls: 'civil', role: 'Riesenfrachter', tier: 'XL', hull: 4500, armor: ['medium', 'medium', 'light', 'light'], tac: { speed: 44, accel: 9, brake: 12, turn: 0.18 } },
  versorger:  { cls: 'civil', role: 'Versorgung', tier: 'S', hull: 300, armor: ['light', 'light', 'light', 'light'], tac: { speed: 100, accel: 30, brake: 35, turn: 1 }, work: true },
  // ---- Mehrzweck (Bestand und neu) ----
  spatz:      { cls: 'multi', role: 'Allrounder', tier: 'S', hull: 380, armor: ['light', 'light', 'light', 'light'], shield: { sectors: 1, hp: 120, regen: 6, delay: 6 }, tac: { speed: 130, accel: 50, brake: 55, turn: 1.4 }, weapons: [['laser', 1, 'bow']], work: true },
  pelikan:    { cls: 'multi', role: 'Allrounder', tier: 'M', hull: 900, armor: ['medium', 'light', 'light', 'light'], shield: { sectors: 1, hp: 260, regen: 10, delay: 6 }, tac: { speed: 120, accel: 35, brake: 40, turn: 0.8 }, weapons: [['laser', 2, 'turret'], ['missile', 1, 'turret']] },
  falke:      { cls: 'multi', role: 'Bewaffneter Kurier', tier: 'S', hull: 340, armor: ['light', 'none', 'light', 'light'], shield: { sectors: 1, hp: 160, regen: 8, delay: 5 }, tac: { speed: 280, accel: 110, brake: 110, turn: 1.8 }, weapons: [['laser', 2, 'bow']] },
  keiler:     { cls: 'multi', role: 'Bewaffneter Frachter', tier: 'M', hull: 1250, armor: ['heavy', 'medium', 'medium', 'medium'], shield: { sectors: 1, hp: 380, regen: 12, delay: 7 }, tac: { speed: 90, accel: 26, brake: 30, turn: 0.55 }, weapons: [['laser', 2, 'turret'], ['flak', 1, 'turret'], ['pd', 1, 'turret']] },
  // ---- Militärische Grundreihe ----
  abfangstaffel: { cls: 'war', role: 'Staffelabwehr', tier: 'craft', squad: { n: 6, hull: 60, shield: 0 }, armor: ['none', 'none', 'none', 'none'], tac: { speed: 330, accel: 200, brake: 200, turn: 3.2 }, weapons: [['gun', 1, 'bow']] },
  bomberstaffel: { cls: 'war', role: 'Systemangriff', tier: 'craft', squad: { n: 4, hull: 110, shield: 30 }, armor: ['light', 'light', 'light', 'light'], tac: { speed: 240, accel: 140, brake: 140, turn: 2.2 }, weapons: [['bomb', 1, 'bow']] },
  korvette:   { cls: 'war', role: 'Eskorte', tier: 'M', hull: 950, armor: ['medium', 'light', 'light', 'light'], shield: { sectors: 1, hp: 420, regen: 14, delay: 5 }, tac: { speed: 180, accel: 70, brake: 75, turn: 1.3 }, weapons: [['laser', 2, 'turret'], ['flak', 1, 'turret'], ['pd', 1, 'turret']] },
  fregatte:   { cls: 'war', role: 'Vielseitiger Kampf', tier: 'L', hull: 1900, armor: ['medium', 'light', 'medium', 'medium'], shield: { sectors: 4, hp: 450, regen: 12, delay: 6 }, tac: { speed: 135, accel: 45, brake: 50, turn: 0.8 }, weapons: [['heavy', 1, 'bow'], ['laser', 2, 'port'], ['laser', 2, 'starboard'], ['pd', 1, 'turret']] },
  zerstoerer: { cls: 'war', role: 'Schwerer Angriff', tier: 'L', hull: 5000, armor: ['heavy', 'medium', 'medium', 'medium'], shield: { sectors: 4, hp: 950, regen: 18, delay: 7 }, tac: { speed: 110, accel: 32, brake: 36, turn: 0.55 }, weapons: [['heavy', 3, 'bow'], ['torpedo', 2, 'bow'], ['laser', 2, 'port'], ['laser', 2, 'starboard'], ['pd', 1, 'turret']] },
  kreuzer:    { cls: 'war', role: 'Ausdauernder Flottenkampf', tier: 'XL', hull: 5200, armor: ['heavy', 'medium', 'heavy', 'heavy'], shield: { sectors: 4, hp: 1000, regen: 22, delay: 8 }, tac: { speed: 85, accel: 20, brake: 24, turn: 0.35 }, weapons: [['heavy', 2, 'bow'], ['laser', 2, 'port'], ['flak', 1, 'port'], ['laser', 2, 'starboard'], ['flak', 1, 'starboard'], ['pd', 2, 'turret']], inhibitor: 900 },
  // ---- Fraktionsschiffe (U03, von Grund auf neu) ----
  fl_miners:  { cls: 'multi', role: 'Gildenhauer: robuster Bergbau-Mehrzweck', tier: 'L', hull: 2300, armor: ['heavy', 'medium', 'medium', 'medium'], shield: { sectors: 1, hp: 500, regen: 12, delay: 7 }, tac: { speed: 80, accel: 20, brake: 24, turn: 0.4 }, weapons: [['heavy', 1, 'bow'], ['laser', 2, 'turret']], work: true, ability: 'precision' },
  fx_miners:  { cls: 'multi', role: 'Tiefenbrecher: schwerer Abbau-Mehrzweck', tier: 'XL', hull: 4800, armor: ['heavy', 'heavy', 'medium', 'medium'], shield: { sectors: 4, hp: 650, regen: 14, delay: 8 }, tac: { speed: 70, accel: 12, brake: 16, turn: 0.22 }, weapons: [['heavy', 2, 'bow'], ['laser', 2, 'port'], ['laser', 2, 'starboard']], work: true, ability: 'precision' },
  f_miners:   { cls: 'multi', role: 'Erzbrecher: Präzisions-Systemzerstörer', tier: 'XL', hull: 5000, armor: ['heavy', 'heavy', 'heavy', 'medium'], shield: { sectors: 4, hp: 700, regen: 14, delay: 8 }, tac: { speed: 82, accel: 14, brake: 18, turn: 0.25 }, weapons: [['heavy', 3, 'bow'], ['laser', 2, 'turret'], ['pd', 1, 'turret']], work: true, ability: 'precision' },
  fl_tech:    { cls: 'multi', role: 'Datenpfeil: Aufklärungs-Kurier', tier: 'L', hull: 1100, armor: ['light', 'none', 'light', 'light'], shield: { sectors: 4, hp: 520, regen: 22, delay: 4 }, tac: { speed: 190, accel: 60, brake: 60, turn: 0.9 }, weapons: [['ion', 2, 'turret'], ['pd', 1, 'turret']], ability: 'sensor' },
  fx_tech:    { cls: 'war', role: 'Netzkreuzer: Ionenstörung und Schildtechnik', tier: 'XL', hull: 4200, armor: ['medium', 'light', 'light', 'light'], shield: { sectors: 4, hp: 1150, regen: 34, delay: 4 }, tac: { speed: 115, accel: 26, brake: 30, turn: 0.4 }, weapons: [['ion', 3, 'bow'], ['ion', 2, 'turret'], ['heavy', 2, 'turret'], ['pd', 2, 'turret']], inhibitor: 1100, ability: 'sensor' },
  f_tech:     { cls: 'war', role: 'Quantensegler: schneller Störkreuzer', tier: 'L', hull: 1700, armor: ['light', 'none', 'light', 'light'], shield: { sectors: 4, hp: 800, regen: 30, delay: 4 }, tac: { speed: 240, accel: 80, brake: 80, turn: 1 }, weapons: [['ion', 2, 'bow'], ['missile', 1, 'turret'], ['pd', 1, 'turret']], ability: 'sensor' },
  fl_nomads:  { cls: 'multi', role: 'Wanderzelt: Flankenläufer', tier: 'L', hull: 1150, armor: ['light', 'none', 'light', 'light'], shield: { sectors: 1, hp: 380, regen: 14, delay: 5 }, tac: { speed: 200, accel: 70, brake: 70, turn: 1.1 }, weapons: [['laser', 2, 'turret'], ['missile', 1, 'turret']], ability: 'flank' },
  fx_nomads:  { cls: 'multi', role: 'Sippenschiff: schneller Großverband', tier: 'XL', hull: 2900, armor: ['light', 'light', 'light', 'light'], shield: { sectors: 4, hp: 520, regen: 16, delay: 6 }, tac: { speed: 140, accel: 36, brake: 40, turn: 0.5 }, weapons: [['laser', 3, 'port'], ['laser', 3, 'starboard'], ['missile', 2, 'turret'], ['pd', 1, 'turret']], ability: 'flank' },
  f_nomads:   { cls: 'war', role: 'Karawane: Flankenangriff und Rückzug', tier: 'L', hull: 1800, armor: ['light', 'none', 'light', 'light'], shield: { sectors: 4, hp: 520, regen: 18, delay: 5 }, tac: { speed: 230, accel: 85, brake: 85, turn: 1.2 }, weapons: [['heavy', 1, 'bow'], ['laser', 2, 'turret'], ['missile', 2, 'turret']], ability: 'flank' },
  fl_order:   { cls: 'war', role: 'Novize: Strahlenkorvette', tier: 'M', hull: 1050, armor: ['heavy', 'light', 'none', 'none'], shield: { sectors: 4, hp: 380, regen: 14, delay: 6 }, tac: { speed: 170, accel: 60, brake: 60, turn: 1 }, weapons: [['beam', 1, 'bow'], ['pd', 1, 'turret']], ability: 'frontbeam' },
  fx_order:   { cls: 'war', role: 'Kathedrale: Strahlenschlachtschiff', tier: 'XL', hull: 5400, armor: ['heavy', 'light', 'light', 'light'], shield: { sectors: 4, hp: 1250, regen: 20, delay: 8 }, tac: { speed: 90, accel: 18, brake: 22, turn: 0.28 }, weapons: [['beam', 3, 'bow'], ['heavy', 1, 'bow'], ['pd', 2, 'turret']], reactor: true, ability: 'frontbeam' },
  f_order:    { cls: 'war', role: 'Sternenläufer: Strahlenfregatte', tier: 'L', hull: 2100, armor: ['heavy', 'light', 'light', 'light'], shield: { sectors: 4, hp: 600, regen: 16, delay: 6 }, tac: { speed: 175, accel: 55, brake: 60, turn: 0.8 }, weapons: [['beam', 2, 'bow'], ['pd', 1, 'turret']], ability: 'frontbeam' },
  fl_league:  { cls: 'multi', role: 'Kontorkogge: bewaffneter Frachter', tier: 'L', hull: 2200, armor: ['medium', 'medium', 'medium', 'medium'], shield: { sectors: 1, hp: 540, regen: 14, delay: 6 }, tac: { speed: 75, accel: 18, brake: 22, turn: 0.35 }, weapons: [['laser', 2, 'turret'], ['pd', 2, 'turret']], ability: 'convoy' },
  fx_league:  { cls: 'multi', role: 'Großkogge: Verbandsschutz', tier: 'XL', hull: 4600, armor: ['medium', 'medium', 'medium', 'medium'], shield: { sectors: 4, hp: 720, regen: 16, delay: 7 }, tac: { speed: 58, accel: 10, brake: 14, turn: 0.18 }, weapons: [['laser', 2, 'port'], ['laser', 2, 'starboard'], ['flak', 2, 'turret'], ['pd', 3, 'turret']], ability: 'convoy' },
  f_league:   { cls: 'multi', role: 'Hansekogge: Geleitfrachter', tier: 'XL', hull: 4200, armor: ['medium', 'medium', 'medium', 'medium'], shield: { sectors: 4, hp: 760, regen: 18, delay: 6 }, tac: { speed: 96, accel: 18, brake: 22, turn: 0.28 }, weapons: [['laser', 3, 'turret'], ['missile', 1, 'turret'], ['pd', 3, 'turret']], ability: 'convoy' },
  fl_syndicate: { cls: 'multi', role: 'Stahlträger: gepanzerter Frachter', tier: 'L', hull: 2600, armor: ['heavy', 'heavy', 'heavy', 'heavy'], shield: { sectors: 1, hp: 300, regen: 8, delay: 9 }, tac: { speed: 68, accel: 14, brake: 18, turn: 0.28 }, weapons: [['torpedo', 1, 'bow'], ['laser', 1, 'turret']], ability: 'siege' },
  fx_syndicate: { cls: 'war', role: 'Schmiedeberg: Belagerungsschiff', tier: 'XL', hull: 6200, armor: ['heavy', 'heavy', 'heavy', 'heavy'], shield: { sectors: 4, hp: 600, regen: 10, delay: 9 }, tac: { speed: 58, accel: 9, brake: 12, turn: 0.15 }, weapons: [['torpedo', 3, 'bow'], ['heavy', 2, 'bow'], ['laser', 2, 'turret']], reactor: true, ability: 'siege' },
  f_syndicate: { cls: 'war', role: 'Stahlkoloss: Torpedoträger', tier: 'XL', hull: 5600, armor: ['heavy', 'heavy', 'heavy', 'heavy'], shield: { sectors: 4, hp: 520, regen: 10, delay: 9 }, tac: { speed: 80, accel: 12, brake: 15, turn: 0.2 }, weapons: [['torpedo', 2, 'bow'], ['heavy', 2, 'port'], ['heavy', 2, 'starboard']], ability: 'siege' },
};

/** Besondere Fähigkeiten mit spürbarem Nachteil (keine Immunitäten, kein Umgehen der Schadenspipeline) */
export const COMBAT_ABILITIES = {
  precision: { name: 'Präzisionsbohrer', desc: 'Systemtreffer: Strukturanteil −40 %, Systemidentifikation +30 %', drawback: 'Langsam, träge Wende, schlecht im Verfolgen' },
  sensor:    { name: 'Sensorgitter', desc: 'Sensorreichweite ×1,6, Schildregeneration +50 %', drawback: 'Schwacher Rumpf, hohe Kosten' },
  flank:     { name: 'Flankenangriff', desc: '+40 % Schaden bei Treffern auf Heck und Flanken', drawback: 'Wenig Panzerung, geringe Beschussausdauer' },
  frontbeam: { name: 'Konzentrierte Front', desc: 'Strahlenwaffen +30 % Schaden im Bugbogen', drawback: 'Schmale Feuerwinkel, schwache Flanken' },
  convoy:    { name: 'Verbandsschutz', desc: 'Punktverteidigung schützt Verbündete im Umkreis von 500', drawback: 'Schwächere Offensive' },
  siege:     { name: 'Belagerung', desc: 'Torpedos +25 % Schaden', drawback: 'Träge, kaum Staffelabwehr' },
};

export const navalClass = (type) => COMBAT_TYPES[type]?.cls || 'civil';
export const isWarship = (type) => navalClass(type) === 'war';
export const isSquadron = (type) => !!COMBAT_TYPES[type]?.squad;

/**
 * Bauplan eines Typs: Systeme mit fester Position, Waffen mit Zuordnung, Schildsektoren mit Generator.
 * Positionen im Schiffsrahmen: x -1 (Heck) .. +1 (Bug), y -1 (Backbord) .. +1 (Steuerbord).
 */
const cache = new Map();
export function blueprint(type) {
  if (cache.has(type)) return cache.get(type);
  const d = COMBAT_TYPES[type] || COMBAT_TYPES.lastesel;
  const sysHp = Math.round((d.hull || 300) * (d.tier === 'XL' ? 0.16 : d.tier === 'L' ? 0.2 : 0.28));
  const systems = [];
  const add = (kind, x, y, extra = {}) => { const id = `${kind}${systems.filter((s) => s.kind === kind).length + 1}`; systems.push({ id, kind, x, y, hp: sysHp, armor: extra.armor || 'medium', ...extra }); return id; };
  const weapons = [];
  if (!d.squad) {
    const xl = d.tier === 'XL', war = d.cls !== 'civil';
    // Antrieb: große Kriegs-/Mehrzweckschiffe zwei Gruppen
    if (xl && war) { add('engine', -0.9, -0.3, { share: 0.5 }); add('engine', -0.9, 0.3, { share: 0.5 }); }
    else add('engine', -0.9, 0, { share: 1 });
    if (xl || (d.tier === 'M' && !war) || (d.tier === 'L' && !war)) add('thrust', -0.2, 0, { share: 1 });
    // Schildgeneratoren: vier Sektoren -> zwei Generatoren für je zwei Sektoren; kleine Schiffe ohne treffbaren Generator
    if (d.shield?.sectors === 4) { add('shield', 0.3, 0.25, { sectors: ['bow', 'starboard'] }); add('shield', -0.4, -0.25, { sectors: ['stern', 'port'] }); }
    else if (d.shield && d.tier !== 'S') add('shield', 0.1, 0, { sectors: ['omni'] });
    // Batterien je Batterieart und Seite; Türme teilen sich je Art eine Batterie
    for (const [w, n, side] of d.weapons || []) {
      const S = SIDES[side];
      const kind = BATTERY_OF[w];
      const same = systems.find((s) => s.kind === kind && s.side === side);
      const turrets = systems.filter((s) => s.side === 'turret').length;
      const sid = same?.id || add(kind, side === 'turret' ? 0.35 - 0.3 * turrets : S.x, side === 'turret' ? (turrets % 2 ? 0.2 : -0.2) : S.y, { side, armor: 'light' });
      for (let i = 0; i < n; i++) weapons.push({ w, sys: sid, arc: S.arc, turret: !!S.turret, ammo: WEAPONS[w].ammo || null });
    }
    if (xl && war) { add('sensor', 0.55, 0, { armor: 'light' }); add('bridge', 0.15, 0, { armor: 'heavy' }); }
    if (!war && (xl || d.tier === 'L')) { add('sensor', 0.6, 0, { armor: 'light' }); add('reactor', -0.45, 0, { armor: 'medium' }); }
    if (d.reactor) add('reactor', -0.45, 0, { armor: 'heavy' });
    if (d.work) add('work', 0.85, 0, { armor: 'light' });
    add('jump', -0.6, 0, { armor: 'heavy' });
  } else {
    for (const [w, n] of d.weapons || []) for (let i = 0; i < n; i++) weapons.push({ w, sys: null, arc: 0, turret: false, ammo: WEAPONS[w].ammo || null });
  }
  for (const s of systems) s.face = Math.atan2(s.y, s.x);
  const shields = !d.shield ? [] : d.shield.sectors === 4
    ? ['bow', 'starboard', 'stern', 'port'].map((k) => ({ k, max: d.shield.hp, gen: systems.find((s) => s.kind === 'shield' && s.sectors.includes(k)).id }))
    : [{ k: 'omni', max: d.shield.hp, gen: systems.find((s) => s.kind === 'shield')?.id }];
  const bp = { type, ...d, systems, weapons, shields };
  cache.set(type, bp);
  return bp;
}

/** Anzahl anwählbarer Systeme (für den PRD-Richtwertvergleich) */
export const systemCount = (type) => blueprint(type).systems.length;

/** Kampfzustand eines Schiffes außerhalb der Schlacht anlegen bzw. ergänzen (bleibende Schäden) */
export function ensureDamage(ship) {
  const bp = blueprint(ship.type);
  const d = ship.dmg ||= {};
  if (d.hull === undefined) d.hull = bp.squad ? bp.squad.n * bp.squad.hull : bp.hull;
  d.sys ||= {};
  for (const s of bp.systems) if (d.sys[s.id] === undefined) d.sys[s.id] = s.hp;
  if (bp.squad) d.craft ??= bp.squad.n;
  d.ammo ||= {};
  bp.weapons.forEach((w, i) => { if (w.ammo != null && d.ammo[i] === undefined) d.ammo[i] = w.ammo; });
  return d;
}
export const maxHull = (type) => { const bp = blueprint(type); return bp.squad ? bp.squad.n * bp.squad.hull : bp.hull; };

/** Rumpf- oder Systemschaden vorhanden? (Schild, Störung und Munition zählen nicht) */
export function needsRepair(ship) {
  const d = ship.dmg;
  if (!d) return false;
  const bp = blueprint(ship.type);
  if (bp.squad) return (d.craft ?? bp.squad.n) < bp.squad.n || d.hull < maxHull(ship.type) - 0.5;
  if (d.hull < bp.hull - 0.5) return true;
  return bp.systems.some((s) => (d.sys?.[s.id] ?? s.hp) < s.hp - 0.5);
}

/** Reparaturkosten und -dauer (Vorschau). Rumpf je LP, Systeme je LP, zerstörte Systeme mit Zuschlag, Staffelersatz je Fluggerät. */
export const REPAIR = { HULL_CR: 4, SYS_CR: 6, DESTROYED_CR: 0.04, SECS_PER_100: 6, MIN_SECS: 10, CRAFT_SHARE: 0.18, SALVAGE_CR: 5000, SALVAGE_WAIT: 120 };
export function repairQuote(ship, price) {
  const d = ship.dmg;
  if (!d) return { cost: 0, secs: 0, craft: 0, ammo: 0 };
  const bp = blueprint(ship.type);
  let cost = 0, work = 0, craft = 0;
  if (bp.squad) {
    craft = bp.squad.n - (d.craft ?? bp.squad.n);
    cost += craft * price * REPAIR.CRAFT_SHARE;
    work += craft * 100;
  } else {
    const hull = Math.max(0, bp.hull - d.hull);
    cost += hull * REPAIR.HULL_CR; work += hull;
    for (const s of bp.systems) {
      const miss = Math.max(0, s.hp - (d.sys?.[s.id] ?? s.hp));
      cost += miss * REPAIR.SYS_CR; work += miss;
      if ((d.sys?.[s.id] ?? s.hp) <= 0) cost += price * REPAIR.DESTROYED_CR;
    }
  }
  let ammo = 0;
  bp.weapons.forEach((w, i) => { if (w.ammo != null) ammo += Math.max(0, w.ammo - (d.ammo?.[i] ?? w.ammo)) * WEAPONS[w.w].ammoCost; });
  const secs = work > 0 ? Math.max(REPAIR.MIN_SECS, Math.round((work / 100) * REPAIR.SECS_PER_100)) : 0;
  return { cost: Math.round(cost), secs, craft, ammo: Math.round(ammo) };
}

/** Freischaltung (U03): Kauf ab Fraktionsrang des Modells, Bauplan für den eigenen Orbitalring einen Rang später */
export const FACTION_UNLOCK = { BLUEPRINT_DELAY: 1 };
export const blueprintRank = (shipType) => (shipType.rank || 0) + FACTION_UNLOCK.BLUEPRINT_DELAY;
