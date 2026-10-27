import { STATION_TYPES, PLANET_TYPES, BELT_TYPES, GOODS } from './goods.js';
import { HOME_BUILDINGS } from './homeworld.js';
import { ENTERTAINMENT } from './planetside.js';
import { STUDY_FINDS } from './advanced-homequests.js';

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
  school: ['Schule', 'Hier kannst du Wissenseinträge aus verschiedenen Themengebieten lesen.'],
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
add('wormhole:wormhole','Wurmloch','/assets/wormhole.svg','Eine Verbindung zwischen entfernten Orten im Weltraum.',['Mit einem Schiff hineinfliegen, um die Gegenseite zu entdecken.','Bekannte Verbindungen werden von der Navigation genutzt.','Der Durchflug benötigt fünf Sekunden und keinen Treibstoff.'],'Weltobjekte');

export function entityGuideKey(e) {
  if (!e) return null;
  if (e.archiveKey) return STUDY_FINDS[e.archiveKey] ? 'quest:study' : 'quest:archive';
  if (e.salvageOwner) return 'quest:relic';
  if (e.kind === 'ship') return e.type === 'versorger' || e.task ? 'ship:versorger' : null;
  return ({station:'st:',planet:'pl:',belt:'bt:',wormhole:'wormhole:'}[e.kind] || '') + e.type;
}
export function buildingGuideKey(it, e) {
  if (it.homeOrbital) return 'building:orbital-' + (e.market?.homeworld?.orbital?.large ? 'large' : 'small');
  if (it.recipe) return 'st:' + it.recipe;
  if (it.homeFacility) {
    if (OBJECT_GUIDE['building:home:' + it.homeFacility]) return 'building:home:' + it.homeFacility;
    if (OBJECT_GUIDE['st:' + it.homeFacility]) return 'st:' + it.homeFacility;
  }
  const structure = e.market?.homeworld?.structures?.find(s => s.id === it.homeStructure);
  if (structure?.recipe) return 'st:' + structure.recipe;
  if (structure?.upgrades?.length) return 'building:home-building:' + structure.upgrades.at(-1);
  if (structure && OBJECT_GUIDE['building:home-building:' + structure.kind]) return 'building:home-building:' + structure.kind;
  return 'building:' + (it.kind === 'fun' ? 'fun:' + it.building : it.kind);
}

for (const [id,name,intro,points] of [
  ['archive','Persönliche Archivstelle','Eine persönliche Expedition untersucht menschliche Aufzeichnungen.',['Mit dem aktiven manuellen Schiff persönlich anfliegen und den Besuch aufzeichnen.','Die Stelle bleibt bis zur vollständigen Questabgabe erhalten.']],
  ['study','Studienfundstelle','Eine einmalige Studienvorlage kann hier geborgen werden.',['Das aktive manuelle Schiff benötigt 30 freie normale Frachteinheiten.','Nach vollständiger Bergung verschwindet die Stelle; die Vorlage bleibt als Fracht erhalten.']],
  ['relic','Reliktwrack','Ein persönliches Wrack mit einem versiegelten Fund.',['Mit dem aktiven manuellen Schiff persönlich bergen.','Den versiegelten Fund mit dem Bergungsschiff zur Heimatwerkstatt bringen.','Die Fundstelle verschwindet nach Abschluss der zugehörigen Aufgabe.']],
]) add('quest:'+id,name,'/assets/art/homeworld/'+(id==='relic'?'relic':'archive')+'.png',intro,points,'Fundstellen');

const modelImages={questhouse:'hall',produce:'farm',consume:'store',factory:'factory',plot:'store',smuggler:'smuggler',beggar:'beggar',dog:'dog',school:'school','home:dock':'store','home:control':'hall','home:workshop':'factory',housing:'hall',solar:'tower',silo:'silo',safeStorage:'store',spaceport:'tower',moduleBench:'factory',researchWorkshop:'school',researchCenter:'school',workshop:'factory',academy:'school'};
for (const d of Object.values(OBJECT_GUIDE).filter(d=>d.category==='Gebäude')) {
  const id=d.key.replace('building:','').replace('home-building:','').replace('fun:','');
  const model=modelImages[id]||(['tavern','casino','fair','racetrack','mine'].includes(id)?id:null);
  if(model)d.image='/assets/models/'+model+'/preview.png';
  if(id.startsWith('orbital-'))d.image='/assets/orbital_elevator_'+id.replace('orbital-','')+'.svg';
}
for(const [id,d] of Object.entries(HOME_BUILDINGS)){
  const entry=OBJECT_GUIDE['building:home-building:'+id];
  entry.points=[];
  if(d.housing)entry.points.push('Schafft Wohnraum für '+d.housing+' Bewohner.');
  if(d.generation)entry.points.push('Erzeugt '+d.generation+' Energie bei aktiver Belegschaft.');
  if(d.storage)entry.points.push('Erweitert das gemeinsame normale Zentrallager; Ausbau erhöht die Kapazität.');
  if(d.hazardStorage)entry.points.push('Erweitert das geschirmte Zentrallager für Gefahrgut; separat ausbaubar.');
  if(d.throughput)entry.points.push('Erweitert Andockplätze und gemeinsamen Warenumschlag.');
  if(d.fuelPerHour)entry.points.push('Benötigt im Betrieb: '+Object.entries(d.fuelPerHour).map(([g,n])=>n+' '+GOODS[g].name+'/h').join(', ')+'.');
  if(['school','academy'].includes(id))entry.points.push('Bildet Bewohner zu Fachkräften beziehungsweise Spezialisten aus. Ausbildung benötigt Zeit und Versorgung.');
  if(['researchWorkshop','researchCenter'].includes(id))entry.points.push('Erforscht neue Vorlagen und unterstützt Forschungsaufgaben. Freischaltungen folgen dem Questfortschritt.');
  if(id==='moduleBench')entry.points.push('Fertigt physische Module aus Materialien und bekannten Vorlagen.');
  if(id==='workshop')entry.points.push('Baut den einzigartigen Reliktantrieb ein oder aus. Das betreffende Schiff muss angedockt sein.');
  entry.points.push('Bau benötigt Credits und Materialien; der Betrieb benötigt die angegebene Energie und Belegschaft.');
}

const climates={agrar:'Eine fruchtbare Welt mit landwirtschaftlichen Siedlungen.',ocean:'Eine Ozeanwelt mit Küsten- und Wasserwirtschaft.',jungle:'Eine dicht bewachsene Welt mit biologischen Rohstoffen.',desert:'Eine trockene Wüstenwelt mit knappen Grundressourcen.',ice:'Eine gefrorene Welt mit Anlagen zur Rohstoffgewinnung.',mining:'Eine Bergbauwelt mit ausgeprägter Rohstoffwirtschaft.',volcanic:'Eine vulkanische Welt mit industriell nutzbaren Vorkommen.',gasgiant:'Ein Gasriese mit Förderanlagen und bewohnten Plattformen.',colony:'Eine junge Koloniewelt mit wachsender Infrastruktur.',urban:'Eine dicht besiedelte Stadtwelt mit hohem Versorgungsbedarf.',resort:'Eine Erholungswelt mit Tourismus und Versorgung für Gäste.',industrial:'Eine Industriewelt mit verarbeitenden Betrieben.',ruins:'Eine verlassene Ruinenwelt, die durch Erkundung und Wiederaufbau zur eigenen Heimat werden kann.'};
for(const [id,intro]of Object.entries(climates))if(OBJECT_GUIDE['pl:'+id])OBJECT_GUIDE['pl:'+id].intro=intro;
const functions={
  smuggler:['Verkauft Hinweise auf unbekannte Wurmloch-Eingänge im aktuellen Sektor.','Schmuggelaufträge belegen den normalen Questplatz und geben Credits, aber keine Erfahrung oder Ruf.'],
  beggar:['Eine Spende kostet 10 Credits und bringt ein Kompliment.','Jede Spende kostet deine hier angedockten Schiffe außerdem 5 % ihres Treibstoffs.'],
  dog:['Der Hund kann zeitweise die Gewinnchancen bei lokalen Minispielen erhöhen.'],
  school:['Lies Wissenseinträge und wechsle kostenlos zum nächsten Fakt.'],
  questhouse:['Wähle einen angebotenen Auftrag und erfülle seine Voraussetzungen.','Belohnungen werden erst bei vollständiger Abgabe gewährt.'],
  plot:['Wähle ein Gebäude, für das dieser Bauplatz und deine Freischaltungen geeignet sind.','Baubeginn bindet Credits und Materialien; Fertigstellung benötigt Zeit.'],
};
for(const [id,points]of Object.entries(functions))OBJECT_GUIDE['building:'+id].points=points;
OBJECT_GUIDE['building:orbital-small'].points=['Der Wiederaufbau benötigt freigeschaltete Hauptquests und vollständig gelieferte Questmaterialien.','Ein eigener leerer, ungebundener Spatz wird nach ausdrücklicher Bestätigung dauerhaft als Infrastruktur abgegeben. Mindestens ein steuerbares Schiff muss übrig bleiben.','Fertigt Schiffe der Klassen S und M aus realen Materialien; Ausgabe erfolgt mit vollem Tank. Betrieb benötigt Energie und Belegschaft.'];
OBJECT_GUIDE['building:orbital-large'].points=['Benötigt den kleinen Ring, Forschungsfortschritt und die vollständigen Questmaterialien.','Der Ausbau erfolgt in zwei getrennten Bauabschnitten.','Ein zusätzlicher Bauplatz fertigt Schiffe der Klassen L und XL. Pilotenlizenz, bei Fraktionsschiffen auch Rang und veredelte Währung, bleiben erforderlich.'];
