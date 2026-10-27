import { STATION_TYPES, PLANET_TYPES, BELT_TYPES, GOODS } from './goods.js';
import { HOME_BUILDINGS } from './homeworld.js';
import { ENTERTAINMENT } from './planetside.js';

// General mechanics only: coordinates, rewards and recipe discovery stay private.
export const OBJECT_GUIDE = {};
function add(key, name, image, intro, points, category = 'Gebäude') {
  OBJECT_GUIDE[key] = { key, name, image, intro, points, category };
}
const names = goods => Object.keys(goods || {}).map(g => GOODS[g]?.name || g).join(', ');
for (const [id, d] of Object.entries(STATION_TYPES)) {
  let points = ['Zum Handeln und Verwalten muss ein eigenes Schiff hier angedockt sein.'];
  let intro = 'Eine Station für Versorgung und Handel im Weltraum.';
  if (d.recipe) { intro = 'Diese Produktionsstation verarbeitet angelieferte Zutaten zu Waren.'; points.push('Die Produktion benötigt passende Zutaten im Stationslager.', 'Konkrete Rezepte werden durch Entdeckung freigeschaltet.'); }
  if (d.extract) { intro = 'Diese Spezialförderstation gewinnt seltene Rohstoffe.'; points.push('Fördert: ' + d.extract.map(g => GOODS[g].name).join(', ') + '.', 'Die Förderung ist langsam; Bestand und Nachfrage bestimmen den Handel.'); }
  if (id === 'hub') { intro = 'Der Handels-Hub bündelt zentralen Handel und Verwaltung.'; points = ['Hier kannst du handeln, ein Konsortium gründen und Pilotenlizenzen kaufen.', 'Das Pilotenlevel steigt durch Erfahrung; eine Pilotenlizenz wird separat gekauft und setzt das passende Level voraus.', 'Die Lizenz schaltet Schiffsklassen und Upgrades frei. Die Steuerkapazität bestimmt die nutzbare Flotte.']; }
  if (['shipyard','bigyard','factionyard'].includes(id)) { intro = id === 'bigyard' ? 'Die große Werft baut auch große Schiffsklassen.' : id === 'factionyard' ? 'Eine Fraktionswerft baut Schiffe ihrer Fraktion.' : 'Die Werft baut neue Schiffe aus angelieferten Materialien.'; points.push('Für den Kauf brauchst du Credits und eine passende Pilotenlizenz.', id === 'factionyard' ? 'Fraktionsschiffe benötigen außerdem Rang und die geforderte Fraktionswährung.' : 'Bestellungen sind auf den Baukatalog der Werft beschränkt.'); }
  if (id === 'hotel') { intro = 'Das Orbitalhotel versorgt Gäste im Weltraum.'; points.push('Benötigt: ' + names(d.consume) + '.', 'Passagiertransport benötigt geeignete Kabinen.'); }
  if (id === 'outpost') { intro = 'Ein Außenposten ist eine Anlaufstelle seiner Fraktion.'; points.push('Hier werden Module angeboten und Fraktionswaren nachgefragt.', 'Angebote und Freischaltungen hängen vom Fraktionsrang ab.'); }
  if (id === 'wreck') { intro = 'Eine persönliche Fundstelle kann geborgen oder untersucht werden.'; points = ['Aufgaben geben die Voraussetzungen für die Bergung vor.', 'Für persönliche Funde ist das aktive manuelle Schiff erforderlich.', 'Fundorte und Belohnungen werden erst bei ihrer Entdeckung bekannt.']; }
  add('st:' + id, d.name, '/assets/' + d.sprite + '.svg', intro, points, 'Stationen');
}
for (const [id, d] of Object.entries(PLANET_TYPES)) add('pl:' + id, d.name, '/assets/' + d.sprite + '.svg', 'Ein Planet mit eigenen Rohstoffen, Bewohnern und Einrichtungen.', ['Mit einem angedockten Schiff kannst du die Oberfläche betreten.', 'Gebäude bieten Produktion, Lagerung und lokale Dienste.', 'Konkrete Waren und Rezepte lernst du durch Entdeckung kennen.'], 'Planeten');
for (const [id, d] of Object.entries(BELT_TYPES)) add('bt:' + id, d.name, '/assets/' + d.sprite + '.svg', 'Ein Ressourcenfeld für den Abbau von ' + GOODS[d.good].name + '.', ['Zum Abbau benötigst du ein geeignetes Bergbaumodul (' + (GOODS[d.good].mine || 'std') + ').', 'Freier Laderaum und bei Gefahrgut ein geschirmter Frachtraum sind erforderlich.'], 'Ressourcenfelder');
const buildings = {
  questhouse: ['Rathaus und Questhaus', 'Hier erhältst du Aufgaben und holst abgeschlossene Belohnungen ab.'],
  produce: ['Produktionsgebäude', 'Gewinnt oder produziert die angezeigte Ware.'],
  consume: ['Warenlager', 'Lagert Waren für den lokalen Verbrauch.'],
  factory: ['Fabrik', 'Verarbeitet Zutaten nach einem Produktionsrezept.'],
  plot: ['Bauplatz', 'Freier Platz für ein neues Gebäude.'],
  smuggler: ['Schmugglerhöhle', 'Bietet besondere lokale Handelsmöglichkeiten.'],
  beggar: ['Bettler', 'Ein Bewohner, dem du vor Ort helfen kannst.'],
  dog: ['Hund', 'Ein tierischer Begleiter mit lokalen Interaktionen.'],
  school: ['Schule', 'Hier können Kenntnisse und Fähigkeiten verbessert werden.'],
  'home:dock': ['Landeplatz und Zentrallager', 'Verbindet die Schiffslandung mit dem zentralen Warenlager der Heimat.'],
  'home:control': ['Leitstelle', 'Stellt Steuerkapazität für deine Flotte bereit.'],
  'home:workshop': ['Antriebswerkstatt', 'Hier untersuchst und bearbeitest du den Reliktantrieb.'],
  'orbital-small': ['Kleiner Orbitalring', 'Eine Aufzugsanlage verbindet den Boden mit dem Orbitalring. Kleine Schiffsklassen können hier gebaut werden.'],
  'orbital-large': ['Großer Orbitalring', 'Die erweiterte Aufzugsanlage erschließt den großen Orbitalring für größere Schiffsklassen.'],
};
for (const [id,d] of Object.entries(HOME_BUILDINGS)) buildings['home-building:' + id] = [d.name, d.desc || 'Eine Einrichtung für den Ausbau deiner Heimat.'];
for (const [id,d] of Object.entries(ENTERTAINMENT)) buildings['fun:' + id] = [d.name, 'Hier kannst du ein lokales Spiel gegen einen Einsatz spielen.'];
for (const [id,[name,intro]] of Object.entries(buildings)) add('building:' + id,name,'/assets/art/homeworld/buildings.png',intro,['Verfügbare Aktionen und Voraussetzungen stehen in der Gebäudeansicht.', 'Baumaßnahmen benötigen Materialien, Versorgung und die passenden Verwaltungsrechte.']);
add('ship:versorger','Versorger','/assets/ship_versorger.svg','Ein mobiles Versorgungsschiff mit eigenen Aufgaben.',['Wähle das Schiff, um seinen aktuellen Auftrag und seine Interaktionen zu sehen.'],'Schiffe');

export function entityGuideKey(e) {
  if (!e) return null;
  if (e.kind === 'ship') return e.type === 'versorger' || e.task ? 'ship:versorger' : null;
  return ({station:'st:',planet:'pl:',belt:'bt:'}[e.kind] || '') + e.type;
}
export function buildingGuideKey(it, e) {
  if (it.homeOrbital) return 'building:orbital-' + (e.market?.homeworld?.orbital?.large ? 'large' : 'small');
  if (it.recipe) return 'st:' + it.recipe;
  if (it.homeFacility) {
    if (OBJECT_GUIDE['building:home:' + it.homeFacility]) return 'building:home:' + it.homeFacility;
    if (OBJECT_GUIDE['st:' + it.homeFacility]) return 'st:' + it.homeFacility;
  }
  const structure = e.market?.homeworld?.structures?.find(s => s.id === it.homeStructure);
  if (structure && OBJECT_GUIDE['building:home-building:' + structure.kind]) return 'building:home-building:' + structure.kind;
  return 'building:' + (it.kind === 'fun' ? 'fun:' + it.building : it.kind);
}
