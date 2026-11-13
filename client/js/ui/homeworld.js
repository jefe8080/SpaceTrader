import {SHIP_CATEGORIES,shipComparison,compareShipTypes} from '/shared/ship-comparison.js';
import {FACTIONS} from '/shared/factions.js';
import {shipRatings} from './shipComparison.js';
import {questText} from './quests.js';
import {HOME_STORY,storyAvailable,storyDialogReady} from '/shared/home-story.js';
import { GOODS, RECIPES,recipeText } from '/shared/config.js';
import {recipeWithStock} from './productionDisplay.js';
import { HOME_QUESTS, HOMEWORLD, HOME_BUILDINGS, CONTROL_MODULES, controlUpgradeCost, industryGroup, industrySpec, homeStorageUsage, availableHomeStock, homeGoodCapacity, homeGoodLimit, demolitionPreview, homeStructureSpec, storageLevel, storageUpgradeCost } from '/shared/homeworld.js';
import { state, fmt, esc, myShips } from '../state.js';
import { cmd } from '../net.js';
import {moduleStockPanel,moduleCraftPanel} from './modules.js';
import {REFINEMENT_RECIPES} from '/shared/goods.js';
import {populationPanel,homePrices} from './population.js';
import {QUEST_DELIVERIES,STUDY_FINDS} from '/shared/advanced-homequests.js';
import {shipSprite} from '../util.js';
import {blueprintRank} from '/shared/combat.js';
import {SHIP_TYPES,SHIPYARD,PILOT_LICENSES,factionRank} from '/shared/config.js';
import {warpPanel,worldsPanel} from './colonies.js';
import {housingPanel} from './housing.js';
import {activeSideQuests} from '/shared/side-quests.js';
import {homeQuestConditions} from '/shared/home-quest-progress.js';
import {toast} from './dom.js';
import {warehouseTransfer} from '/shared/warehouse-transfer.js';
import {impactText} from './productionPlanning.js';
import {visibleQuestBranches,questWorkplaces} from '/shared/quest-guidance.js';
const productionNotices=new Set();
function productionMilestone(){
  const h=state.entities.get(state.homeworld)?.market?.homeworld;
  if(!state.me||!h)return;
  for(const good of ['water','food']){
    const key='st-first-production:'+(state.progressNoticeKey||state.me.id)+':'+good;
    if(!(h.produced?.[good]>0)||productionNotices.has(key))continue;
    productionNotices.add(key);
    try{if(localStorage.getItem(key))continue;localStorage.setItem(key,'1');}catch{}
    toast(good==='water'?'Das erste eigene Wasser fließt! Deine Eislieferung versorgt die Heimat.':'Die erste eigene Nahrung ist fertig! Deine Lieferkette ernährt die Siedlung.','success');
  }
}

let dialog, currentScene, closingScene;
export function renderHomeDialog() {
  productionMilestone();
  if (!dialog) {
    dialog = document.createElement('div'); dialog.className = 'overlay'; dialog.id = 'homeStory'; dialog.hidden = true;
    dialog.addEventListener('click', (event) => {
      const choice=event.target.closest('[data-story-priority]');
      if(choice)cmd('homeStoryPriority',{priority:choice.dataset.storyPriority});
      if (!event.target.closest('[data-story-close]')&&!choice) return;
      state.homeDialogReplay = false;
      if (state.homeQuest) { state.homeQuest.scenesSeen ||= {}; state.homeQuest.scenesSeen[currentScene] = true; }
      closingScene=currentScene;
      dialog.hidden = true; cmd('homeDialogRead', { scene: currentScene });currentScene=null;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !dialog.hidden) { event.stopImmediatePropagation(); dialog.querySelector('[data-story-close]').click(); }
    }, true);
    document.body.append(dialog);
  }
  if(!state.me){dialog.hidden=true;currentScene=null;closingScene=null;return;}
  if(currentScene && !dialog.hidden) return;
  const requested=typeof state.homeDialogReplay==='string'?state.homeDialogReplay:state.homeDialogReplay?'H00':null;
  if (!storyDialogReady(state.homeQuest, state.homeStoryShipClicked, !document.getElementById('help').hidden)) {
    dialog.hidden = true; currentScene = null; return;
  }
  const id=requested&&storyAvailable(state.homeQuest,requested)?requested:state.homeQuest?.eventDialog||state.homeQuest?.introduction;
  if(id===closingScene&&!requested)return;
  if(id!==closingScene)closingScene=null;
  if(!state.me||!id){dialog.hidden=true;currentScene=null;return;}
  if(currentScene!==id){
    currentScene=id;const scene=HOME_STORY[id];
    dialog.innerHTML=`<section class="home-story" role="dialog" aria-modal="true" aria-labelledby="homeStoryTitle"><img src="/assets/art/homeworld/${scene.image}.png" alt="${esc(scene.title)} · gezeichnete Szene mit ${esc(scene.speaker)}"><div class="home-story-text"><div class="muted">HAUPTGESCHICHTE · ${id}</div><h2 id="homeStoryTitle">${esc(scene.title)}</h2><p><b>${esc(scene.speaker)}</b></p><p>„${esc(scene.text)}“</p><p class="muted">${esc(scene.hint)}</p>${scene.choice?'<button data-story-priority="housing">Wohnraum zuerst</button> <button data-story-priority="supply">Versorgung zuerst</button>':''}<button class="primary" data-story-close>Weiter</button> <button data-story-close>Überspringen</button><p class="muted small-note">Im Rathaus nachlesbar. Schiffe, Produktion und Lieferungen laufen weiter.</p></div></section>`;
  }
  dialog.hidden=false;
}

const names = { dock: 'Landeplatz und Zentrallager', control: 'Leitstelle', workshop: 'Antriebswerkstatt',foodplant:'Nahrungsanlage',fueldepot:'Treibstoffanlage' };
const completed = (id) => !!state.homeQuest?.completed[id];
export function homePanel(entity, item, ship) {
  const home = entity.market.homeworld;
  if (home.owner !== state.me.id) return '<div class="muted">Persönliche Ruinenwelt eines anderen Kapitäns.</div>';
  if(item.homeOverview)return '<p>Versorgung und laufende Arbeiten deiner Welt. Wähle ein Gebäude für Änderungen.</p>'+homeBalance(entity);
  if (item.kind === 'questhouse') {
    const mode=entity.market.mode==='open'?'open':'private';
    const trade=`<h3>Handel</h3><p>Handelsmodus: <b>${mode==='open'?'offen':'privat'}</b></p><p>${mode==='open'?'Andere Spieler und NPCs können unreservierte Waren handeln.':'Nur du kannst auf das Lager zugreifen.'} Reservierte Waren bleiben geschützt.</p><button class="small" data-pp="homeTradeMode" data-mode="${mode==='open'?'private':'open'}">Handel ${mode==='open'?'auf privat stellen':'öffnen'}</button>`;
    const overview='';
    if(entity.id!==state.homeworld)return civicPanel(home)+planetNamePanel(entity)+'<h3>Laufende Quests</h3>'+activeSideQuests(state).map(q=>'<p>'+questText(q)+'</p>').join('')+Object.entries(HOME_QUESTS).filter(([id])=>state.homeQuest?.active?.[id]&&!completed(id)).map(([id,q])=>'<p><b>'+id+' · '+esc(q.title)+'</b><br>'+esc(q.goal)+'</p>').join('')+'<button class="small" data-pp="homeSite" data-id="'+state.homeworld+'">Zur Hauptheimat zeigen</button>'+historyPanel()+`<p>Gründung: ${home.founding?.immigrants?.reduce((n,b)=>n+b.n,0)||0} eigene Auswanderer · Expeditionsschiff ${esc(home.founding?.infrastructureShip?.name||'')}</p>`+jump('home:control','Weltennetz verwalten');
    let html = overview+(activeSideQuests(state).length?'<h3>Laufende Nebenquests</h3>'+activeSideQuests(state).map(q=>'<p>'+questText(q)+'</p>').join(''):'')+`<div class="muted">Hauptquests laufen unabhängig von normalen Quests. Mehrere freigeschaltete Zweige können gleichzeitig fortschreiten.</div>`;
    html+='<details data-disclosure="quest-branches"><summary>Dein Fortschrittsbaum</summary><ul>'+visibleQuestBranches(state.homeQuest).map(q=>`<li>${q.done?'✓':q.active?'○':'◇'} ${q.id} · ${esc(q.title)}${q.requires.length?' · nach '+q.requires.join(' + '):' · Einstieg'}</li>`).join('')+'</ul><p>Nur erreichte und unmittelbar freigeschaltete Zweige sind sichtbar. Nummern geben keine Pflichtreihenfolge vor.</p></details>';
    if(completed('H05'))html+='<details data-disclosure="second-ship"><summary>Zwei Schiffe sinnvoll einsetzen</summary><p>Ein freies gewöhnliches Schiff kann Eis liefern, während du mit dem anderen erkundest oder handelst. Prüfe die vorgeschlagene Route und Schiffszuweisung vor dem Speichern; laufende Aufträge werden nicht ersetzt.</p><button class="small" data-pp="homeSupplyRoute" data-helper="true">Versorgung mit freiem Zweitschiff vorbereiten</button></details>';
    const reactions=[home.structures?.some(b=>b.kind==='school'&&b.status==='ready')?'Tarek: „Unsere Leute können jetzt selbst Fachkräfte ausbilden. Das macht den nächsten Ausbau möglich.“':null,home.orbital?.small?'Mira: „Am Ring entsteht wieder ein eigener Schiffbau. Aus dem alten Hafen wird ein Netz.“':null,state.homeQuest?.firstColony?'Mira: „Eine zweite Heimat. Jetzt entscheiden die Verbindungen zwischen unseren Welten über ihren Erfolg.“':null].filter(Boolean);
    if(reactions.length)html+='<details data-disclosure="settlement-voices"><summary>Stimmen aus der Siedlung</summary>'+reactions.map(t=>'<p>'+esc(t)+'</p>').join('')+'</details>';
    for (const [id, quest] of Object.entries(HOME_QUESTS)) {
      if(completed(id)||!state.homeQuest?.active?.[id])continue;
      const unlocked = true;
      html += `<div class="quest-offer"><b>${id} · ${esc(quest.title)} ${completed(id) ? '✓' : ''}</b><p>${esc(quest.goal)}</p>
      <div class="muted">${quest.credits} Cr · ${quest.xp} XP${unlocked ? '' : ' · Voraussetzung: ' + quest.requires.join(', ')}</div>
      ${homeQuestConditions(id,state.homeQuest,home).map(c=>`<p>${c.have>=c.need?'✓':'○'} ${esc(c.label)}: ${c.have} / ${c.need}</p>`).join('')}
      ${completed(id) ? '' : `<button class="small primary" data-pp="homeQuest" data-quest="${id}" ${state.homeQuest.ready?.[id]?'':'disabled'}>${state.homeQuest.ready?.[id]?'Auftrag erfüllt – Belohnung abholen':'Voraussetzungen noch offen'}</button>`}</div>`;
      if(id==='H03')html+='<button class="small" data-pp="homeSupplyRoute">Erste Eisversorgung einrichten</button><p>Die Vorlage kauft Eis, entlädt es kostenlos zu Hause und wiederholt die Fahrt. Wähle im Editor ein Schiff und speichere. Lieferung, nicht nur Speichern, erfüllt das Ziel.</p>';
      html+='<div class="quest-workplaces">'+questWorkplaces(id,home).map(([label,key])=>jump(key,label)).join('')+'</div>';
      if(id==='H02'){
        html+='<p>Kaufe Eis und Getreide, fliege zurück und entlade sie im Zentrallager. Die reparierten Anlagen produzieren daraus automatisch.</p>';
        for(const good of ['ice','grain']){const source=[...state.entities.values()].find(e=>e.system===entity.system&&e.market?.goods[good]?.role==='produce');if(source)html+=`<button class="small" data-pp="homeSite" data-id="${source.id}">${GOODS[good].name} kaufen: ${esc(source.name)}</button>`;}
        html+=jump('home:waterworks','Wasserwerk')+jump('home:foodplant','Nahrungsanlage')+jump('home:dock','Zutaten entladen');
      }
      if(id==='H05')html+=`<p>Versorgter Betrieb: ${Math.floor(home.suppliedSeconds)} / 600 s</p>`;
      if (id === 'H04' && state.homeQuest?.salvage?.phase === 'available') html += '<button class="small" data-pp="homeWreck">Markiertes Wrack zeigen</button>';
      if(unlocked&&!completed(id)){
        for(const [g,n] of Object.entries(QUEST_DELIVERIES[id]||{})){
          const have=home.questDeliveries?.[id]?.[g]||0,remaining=n-have;
          html+=`<p>${GOODS[g].name}: ${have} / ${n} unwiderruflich für diesen Auftrag gebunden</p>${remaining>0?`<input aria-label="Liefermenge ${id} ${GOODS[g].name}" id="questDelivery-${id}-${g}" type="number" min="1" max="${remaining}" value="${Math.min(10,remaining)}"><button class="small" data-pp="homeQuestDeliver" ${ship?'':'disabled title="Ein eigenes Schiff muss für die Lieferung hier angedockt sein"'} data-quest="${id}" data-good="${g}">Teilmenge liefern</button>`:''}`;
        }
        const site=state.homeQuest?.sites?.[id];
        if(site&&!state.homeQuest.visits?.[id])html+=`<p>Archivbesuch: ${state.homeQuest.visits?.[id]?'aufgezeichnet':'offen'}</p><button class="small" data-pp="homeSite" data-id="${site}">Archivstelle zeigen</button>`;
      }
    }
    for(const [module,find] of Object.entries(STUDY_FINDS))if(completed(find.quest)&&!state.homeQuest.finds?.[module])html+=`<p>${find.name}: ${state.homeQuest.finds?.[module]?'einmalige Vorlage geborgen':'Studienvorlage verfügbar'}</p><button class="small" data-pp="homeSite" data-id="${state.homeQuest.sites?.[module]||''}">Forschungsfund zeigen</button>`;
    if(completed('H06'))html+=`<p>Volle Grundversorgung: ${Math.floor(home.fullSupplySeconds||0)} / 1.800 s · Selbst ausgebildete Fachkräfte: ${home.trained?.skilled||0}</p>`;
    if(completed('H07'))html+=jump('home:orbital','Zum Orbitalring');
    html+='<details data-disclosure="while-working"><summary>Während Anlagen und Bauprojekte arbeiten</summary><p>Freiwillig: eine bekannte Rohstoffquelle erkunden, einen vorhandenen Nebenauftrag auswählen oder die Zutaten für dein nächstes Ziel planen. Du darfst ebenso den Aufbau beobachten; es entsteht keine zusätzliche Pflicht oder Frist.</p>'+jump('home:control','Versorgung prüfen')+jump('home:dock','Nächste Lieferung vorbereiten')+'</details>';
    if(completed('H02'))html+=jump('home:control','Welten und Expeditionen verwalten');
    if(completed('H02')){
      const surplus=Math.max(0,Math.floor(availableHomeStock(entity.market,'water')-home.population*.4));
      html+=`<details><summary>Deine Entscheidung: Überschuss nutzen</summary><p>${surplus} Wasser über dem rechnerischen Zwei-Stunden-Grundbedarf. Behalten stützt weitere Produktion und Versorgung; Verkaufen kann den nächsten Ausbau finanzieren. Beachte auch den Wasserbedarf deiner Fabriken. Es wird nichts automatisch verkauft.</p><button class="small" data-pp="homeSurplus" data-choice="keep">Für den Aufbau behalten</button><button class="small" data-pp="homeSurplus" data-choice="sell">Verkaufsmöglichkeit ansehen</button><p>${state.surplusChoice==='keep'?'Du planst eine Reserve. Die Entscheidung bindet keine Waren.':state.surplusChoice==='sell'?'Du prüfst einen Verkauf. Du bestimmst Menge und Preis am Markt.':''}</p></details>`;
      if(state.homeQuest.active?.H04&&!completed('H04'))html+='<p>Während deine Anlagen arbeiten: Erkunde den markierten Fund für Iven oder plane die nächste Versorgung. Die Ziele sind unabhängig.</p>';
    }
    html+=civicPanel(home)+planetNamePanel(entity)+historyPanel();
    return html;
  }
  if (item.homeStructure) return structurePanel(entity,item.homeStructure,ship);
  if(item.homeOrbital)return orbitalPanel(entity);
  if (item.kind === 'plot') return `<div class="muted">Freier Bauplatz ${item.plotIndex + 1}. Aktuell ${home.plots} von maximal ${HOMEWORLD.start.maxPlots} Plätzen erschlossen.</div>`+homeBuildPanel(entity);
  const facility = item.homeFacility, building = home.facilities[facility];
  if (!building) return '';
  const cost = facility === 'dock' ? { credits: 0, seconds: 15, goods: { ingots: 4 } }
    : facility === 'control' ? { credits: 500, seconds: 30, goods: { ingots: 4 } } : HOMEWORLD.industry.repair;
  let html = `<div class="kv"><span>Anlage</span><span>${esc(names[facility] || RECIPES[facility]?.name || facility)}</span><span>Zustand</span><span>${building.status === 'ready' ? 'Betriebsbereit' : building.status === 'building' ? 'Reparatur läuft · ' + Math.max(0, Math.ceil(building.readyAt - state.time)) + ' s' : 'Beschädigte Ruine'}</span></div>`;
  if (facility === 'workshop' && building.status === 'ruined' && !state.homeQuest?.completed?.H04) html += '<p>Der Reliktfund führt zur Wiederherstellung dieser Werkstatt.</p>';
  else if (building.status === 'ruined') html += `<p>${cost.credits} Cr · ${Object.entries(cost.goods).map(([g, n]) => n + ' ' + GOODS[g].name).join(', ')} · ${cost.seconds} s</p>
    <button class="primary" data-pp="homeRepair" data-facility="${facility}">Reparieren</button>`;
  if (facility === 'workshop') html+=workshopPanel(entity,ship,building.status==='ready');
  if(facility==='control'&&building.status==='ready'){
    const pending=home.projects?.find(p=>p.kind==='control');
    if(pending)html+=`<p>Leitstellenausbau läuft · ${Math.max(0,Math.ceil(pending.until-state.time))} s · Material und Bauteam gebunden</p>`;
    const cost=controlUpgradeCost(home.controlLevel+1);
    const area=home.controlLevel===1?'Systemzone mit allen lokalen Transferwegen':`Vollständiger Hexsektor + ${home.controlLevel-2} Hexringe`;
    html+=`<p>Stufe ${home.controlLevel}: ${area}. Eigene Gebiete bilden ein gemeinsames Netz; Konsortien teilen es nicht.</p>
      <p>Auftragskapazität hier: ${4+4*home.controlLevel+8*(home.controlModules?.capacity||0)} · Notversorgung erhält die Reichweite.</p>`;
    if(cost)html+=`<p>Nächste Stufe: ${costLabel(cost)}</p><button class="primary" data-pp="homeControlUpgrade" ${pending?'disabled':''}>Leitstelle auf Stufe ${home.controlLevel+1} ausbauen</button>`;
    for(const [id,spec] of Object.entries(CONTROL_MODULES)){
      const count=home.controlModules?.[id]||0;if(count&&id!=='capacity'){html+=`<p>✓ ${spec.name}</p>`;continue;}
      const cost={...spec,credits:Math.round(spec.credits*(id==='capacity'?1.5**count:1))};
      html+=`<p>${spec.name}: ${costLabel(cost)} · 2 Energie / 2 Fachkräfte</p><button class="small" data-pp="homeControlUpgrade" data-module="${id}" ${pending?'disabled':''}>Funktionsmodul bauen</button>`;
    }
    html+=logisticsPanel(entity);
    html+=worldsPanel()+warpPanel(entity)+'<p>Routen wiederholen feste Halte und Aktionen. Leitstellenaufträge planen Versorgung, Produktion oder Absatz mit gebundenem Budget.</p><button class="small" data-pp="homeRoutes">Meine Routen öffnen</button>';
  }
  if (RECIPES[facility]) {
    const recipe = RECIPES[facility];
    html += productionPanel(entity,building,facility,building.restored?1:.1);
    if(building.status==='ready'){
      html+=operationPanel(entity,facility,building);
      if(!building.restored)html+=`<p>Normalanlage: 4 Energie, 6 einfache Kräfte · ${costLabel(HOMEWORLD.industry.restore)}</p><button class="small" data-pp="homeRestore" data-facility="${facility}" ${building.upgrading?'disabled':''}>Zur Normalanlage ausbauen</button>`;
    }
  }
  if (facility === 'dock' && building.status === 'ready') {
    const goods = Object.entries(entity.market.goods).filter(([g,slot]) => ['normal','hazard'].includes(GOODS[g].cls)&&(state.showAllHomeGoods||slot.stock>0||ship?.cargo?.[g]||['ice','grain'].includes(g)));
    html += `<label>Schiff für Transfers <select id="homeDockShip">${myShips().filter(s=>s.dockedAt===entity.id).map(s=>`<option value="${s.id}" ${s.id===ship?.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label><p>${ship?'Schiff: '+esc(ship.name):'Kein eigenes Schiff angedockt.'} · gemeinsames Planetenlager</p>`+storageBatchPanel(entity)+'<p>Eigene Transfers sind kostenlos. Geschützte Reserven bleiben im Lager.</p><table class="market home-storage"><tr><th>Ware / Bestand</th><th>Lagerregeln</th></tr>';
    html=html.replace('<table class="market home-storage">',`<button class="small" data-pp="homeAllGoods">${state.showAllHomeGoods?'Nur Bestände und Fracht zeigen':'Alle Waren einblenden'}</button><table class="market home-storage">`);
    for (const [good, slot] of goods) {
      const load=warehouseTransfer(entity.market,ship,good,'buy'),unload=warehouseTransfer(entity.market,ship,good,'sell');
      html += `<tr><td><b>${GOODS[good].name}</b><p>${fmt(slot.stock)} im Lager · ${fmt(availableHomeStock(entity.market,good))} verfügbar<br>${fmt(ship?.cargo?.[good] || 0)} an Bord</p>
      <button class="small" data-pp="homeTransfer" data-good="${good}" data-dir="buy" ${load.amount?'':'disabled'} title="${esc(load.reason)}">Entnehmen: Max ${load.amount}</button>
      <button class="small" data-pp="homeTransfer" data-good="${good}" data-dir="sell" ${unload.amount?'':'disabled'} title="${esc(unload.reason)}">Einlagern: Max ${unload.amount}</button></td><td><details><summary>${GOODS[good].name}: Lagerregeln</summary>${storageControls(entity,good)}</details></td></tr>`;
    }
    html += '</table>';
    html+='<details id="storage-modules"><summary>Modulfracht</summary>'+moduleStockPanel(entity,ship,'pp',false)+jump('home:workshop','Schiff ausrüsten')+'</details><details id="storage-population"><summary>Personenreisen</summary>'+populationPanel(entity,{prices:false})+'</details>'+homePrices(entity,home);
    html+=`<details><summary>Lokaler Handel</summary><p>${entity.market.mode==='open'?'Andere Spieler und NPCs dürfen unreservierte Waren handeln.':'Nur du kannst auf das Lager zugreifen.'}</p><button class="small" data-pp="homeTradeMode" data-mode="${entity.market.mode==='open'?'private':'open'}">Handel ${entity.market.mode==='open'?'auf privat stellen':'öffnen'}</button></details>`;
    html += `<p class="muted">Zwei Stunden Grundbedarf: ${Math.ceil(home.population*.4)} Wasser und ${Math.ceil(home.population*.2)} Nahrung. Reserven sind Teil des Lagerbestands, kein zusätzliches Lager.</p>`;
  }
  return html;
}

function workshopPanel(entity,ship,ready=true){
  let html='';
    const salvage = state.homeQuest?.salvage;
    if (salvage?.phase === 'sealed') html += `<button class="primary" data-pp="relicDeliver" ${ship?.id===salvage.ship?'':'disabled'} data-ship="${salvage.ship}">Versiegelten Fund übergeben · Werkstatt 60 s</button>`;
    if (state.relic) {
      const relic = state.relic, location = relic.location;
      const where = location.kind === 'ship' ? state.ships.get(location.id)?.name || location.id : state.entities.get(location.id)?.name || location.id;
      html += `<p>Einzigartiger Antrieb ×${relic.speed} · ${esc(where)} · ${location.kind === 'ship' ? 'eingebaut' : 'eingelagert'}</p>`;
      if (relic.operation) html += `<p>Werkstattarbeit: ${Math.max(0, Math.ceil(relic.operation.until-state.time))} s verbleibend.</p>`;
      else {
        const docked = myShips().filter(s=>s.dockedAt===entity.id);
        html += `<select id="homeRelicShip" aria-label="Schiff für Reliktarbeit">${docked.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
          <button class="small" data-pp="relicWork" data-kind="install" ${location.kind==='world'&&location.id===entity.id&&docked.length ? '' : 'disabled'}>Einbauen · 15 s</button>
          <button class="small" data-pp="relicWork" data-kind="remove" ${location.kind==='ship'&&docked.some(s=>s.id===location.id) ? '' : 'disabled'}>Ausbauen · 15 s</button>`;
      }
    }
    return html+(ready?'<h3>Schiff ausrüsten</h3><p>Schutzmodule benötigen weiterhin eine Werft.</p>'+moduleStockPanel(entity,ship,'pp'):'');
}

function historyPanel(){return '<details><summary>Archiv – erlebte Geschichten</summary>'+Object.entries(HOME_STORY).filter(([id])=>state.homeQuest?.scenesSeen?.[id]||completed(id)).map(([id,scene])=>`<button class="small" data-pp="homeReplay" data-scene="${id}">${id} · ${esc(scene.title)} ansehen</button><p><b>${esc(scene.speaker)}</b>: ${esc(scene.text)}</p>`).join('') + (state.homeQuest?.journal || []).map((entry) => `<p><b>${esc(entry.speaker || entry.id)}</b> · ${esc(entry.text)}</p>`).join('') + '</details>';}

function planetNamePanel(entity){
  const until=(entity.market.homeworld.renamedAt??0)+86400000;
  const remaining=entity.market.homeworld.renamedAt==null?0:Math.max(0,Math.ceil((until-Date.now())/60000));
  return '<h3>Planetenname</h3><p>'+esc(entity.name)+(remaining?' · Nächste Änderung in '+Math.floor(remaining/60)+' h '+remaining%60+' min':' · Namensänderung verfügbar')+'</p><label>Neuer Name <input id="homePlanetName" minlength="3" maxlength="32" value="'+esc(entity.name)+'"></label><button class="small" data-pp="homeRename">Namen speichern</button>';
}

const costLabel=cost=>`${fmt(cost.credits)} Cr · ${Object.entries(cost.goods).map(([g,n])=>`${n} ${GOODS[g]?.name||g}`).join(', ')} · ${cost.seconds||60} s`;
const jump=(key,label)=>`<button class="small" data-pp="homeOpen" data-key="${key}">${label}</button>`;
function civicPanel(home){return home.civil?homeBalance(null,{civil:home.civil}):'';}
function orbitalPanel(entity){
  const o=entity.market.homeworld.orbital;
  let html=`<h3>Orbitalring</h3><p>Kleiner Ring: ${o?.small?'betriebsbereit':'gebrochen'} · Großer Ring: ${o?.large?'betriebsbereit':`${o?.largeStage||0} / 2 Abschnitte`}. Eigener Orbitalanker, kein Bodenbauplatz.</p>`;
  const upgradeMissing=Object.entries({alloys:100,shipparts:30,engines:10,reactorcores:4}).filter(([g,n])=>availableHomeStock(entity.market,g)<n);
  const upgradeReason=o?.project?'Ringbau läuft bereits':upgradeMissing.length?'Materialien fehlen: '+upgradeMissing.map(([g])=>GOODS[g].name).join(', '):null;
  if(o?.large)html+=o.doubleYard?'<p><b>Doppelwerft aktiv · zwei freie Größenplätze</b></p>':o.project?.kind==='doubleYard'?'<p>Doppelwerft im Ausbau · '+Math.ceil(o.project.remaining)+' s</p>':
    '<p>Doppelwerft: 100 Legierungen, 30 Schiffsbauteile, 10 Triebwerke, 4 Reaktorkerne · 600 s · keine Credits</p><button class="small" data-pp="homeOrbitalUpgrade" '+(upgradeReason?'disabled':'')+'>Doppelwerft ausbauen</button>'+(upgradeReason?'<p class="muted">'+upgradeReason+'</p>':'');
  if(o?.project&&o.project.kind!=='doubleYard')html+=`<p>Ringbau ${o.project.kind==='small'?'klein':'groß'}, Abschnitt ${o.project.stage}: ${Math.ceil(o.project.remaining)} s · zwei Bauarbeiter gebunden.</p>`;
  else if(completed('H07')&&!o?.small){
    const ships=myShips().filter(s=>s.type==='spatz'&&s.dockedAt===entity.id);
    html+=`<p>100 Platten, 40 Elektronik und zehn Rumpfsegmente für H08 liefern. Ein Spatz wird dauerhaft aus der steuerbaren Flotte entfernt und als Infrastruktur erhalten. Vorher alle Fracht und Module ausladen.</p><select id="orbitalSurrender" aria-label="Dauerhaft abzugebender Spatz">${ships.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><button class="small" data-pp="homeOrbital" data-large="false" ${ships.length?'':'disabled'}>Spatz dauerhaft abgeben und Ring aufbauen · 600 s</button>`;
  }else if(completed('H08')&&completed('H12')&&!o?.large)html+=`<button class="small" data-pp="homeOrbital" data-large="true">Großen Ring: Abschnitt ${(o?.largeStage||0)+1} starten · 600 s</button>`;
  for(const s of o?.infrastructureShips||[])html+=`<p>Infrastruktur: ${esc(s.name)} (${s.id}) · dauerhaft im Ring.</p>`;
  if(o?.small){
    html+='<h4>Schiffbau mit echten Materialien</h4><p>'+ (o.doubleYard?'Je Auftrag: bis M 20 Energie, 8 einfache und 6 Fachkräfte; L/XL 80 Energie, 8 einfache, 16 Fachkräfte und 4 Spezialisten.':'Kleiner Betrieb: 20 Energie, acht einfache und sechs Fachkräfte. Große Fertigung zusätzlich: 60 Energie, zehn Fachkräfte, vier Spezialisten.')+' Personal und Energie nur bei laufendem Bau.</p>';
    html+='<p><b>Bauplätze: '+Object.keys(o.jobs).length+' / 2</b> · Ausgabe: '+(o.inventory.length+Object.keys(o.jobs).length)+' / 12 · '+(o.doubleYard?'zwei beliebige Größen':'ein Platz bis M, ein Platz L/XL')+'</p>';
    for(const [category,label] of Object.entries(SHIP_CATEGORIES)){
      const list=Object.entries(SHIP_TYPES).filter(([id,d])=>!d.npc&&shipComparison(id).category===category).sort(compareShipTypes);
      html+='<details data-disclosure="orbital-'+category+'"><summary>'+label+' · '+list.length+' Schiffe</summary>';
      for(const [id,d] of list){
        const c=shipComparison(id),large=['L','XL'].includes(c.tier),goods={...d.build};if(d.currency)goods[d.currency.good]=(goods[d.currency.good]||0)+d.currency.n;
        const reason=entity.market.homeworld.warp?'Standort im Warptransfer':large&&!o.large?'Großer Ring fehlt':!PILOT_LICENSES[state.pilot||1].classes.includes(d.cls)?'Pilotenlizenz fehlt':d.faction&&factionRank(state.rep?.[d.faction]||0)<blueprintRank(d)?'Bauplan benötigt Fraktionsrang '+blueprintRank(d):o.inventory.length+Object.keys(o.jobs).length>=12?'Alle zwölf Ausgabeplätze belegt':(o.doubleYard?Object.keys(o.jobs).length>=2:!!o.jobs[large?'large':'small'])?'Bauplatz belegt':Object.entries(goods).some(([g,n])=>availableHomeStock(entity.market,g)<n)?'Materialien fehlen außerhalb geschützter Reserven':null;
        html+='<div class="orbital-ship" style="'+(d.faction?'background:'+FACTIONS[d.faction].color+'24;border-left:4px solid '+FACTIONS[d.faction].color:'')+'"><img width="80" height="64" style="object-fit:contain" src="'+shipSprite(id,state.me.color)+'" alt=""><h4>'+esc(d.name)+' · '+c.tier+'</h4><p>Laderaum '+fmt(d.cargo)+' · Tempo '+d.speed+' · Tank '+d.tank+'</p><p>'+Object.entries(d.build).map(([g,n])=>n+' '+GOODS[g].name).join(', ')+(d.currency?' + '+d.currency.n+' '+GOODS[d.currency.good].name+' · Fraktionsrang '+blueprintRank(d):'')+' · '+(SHIPYARD.BUILD_TIME[d.cls]||SHIPYARD.BUILD_TIME[c.tier])+' s</p><button class="small" data-pp="homeOrbitalBuild" data-type="'+id+'" '+(reason?'disabled':'')+'>Schiff bauen</button>'+(reason?'<p class="muted">'+reason+'</p>':'')+shipRatings(id)+'</div>';
      }
      html+='</details>';
    }
    for(const j of Object.values(o.jobs))html+=`<p>${SHIP_TYPES[j.type].name}: ${Math.ceil(j.remaining)} s · ${j.paused?'pausiert: Energie oder Personal fehlt':'in Fertigung'} · Ausgabeplatz reserviert.</p>`;
    for(const i of o.inventory)html+=`<p>${SHIP_TYPES[i.type].name} · ${esc(i.id)} · Tank voll bei Erstübernahme</p><button class="small" data-pp="homeOrbitalClaim" data-id="${i.id}">Vorhandenes Schiff in Flotte übernehmen</button>`;
  }
  return html;
}
function logisticsPanel(entity){
  const h=entity.market.homeworld,states={planned:'Geplant',reserved:'Reserviert',collecting:'In Abholung',intransit:'Unterwegs',delivered:'Geliefert',paused:'Pausiert',cancelled:'Abgebrochen'};
  let html='<h3>Leitstellenaufträge</h3>';
  for(const o of h.logistics?.orders||[]){
    const jobs=(h.logistics.jobs||[]).filter(j=>j.order===o.id&&!['cancelled','delivered'].includes(j.state));
    html+=`<div class="quest-offer"><b>${esc(o.kind==='production'?RECIPES[o.recipe]?.name:GOODS[o.good]?.name)} · ${states[o.state]}</b><p>${o.kind==='production'?`Ziel ${o.target} · ${o.cycles} fertige Zyklen`:`Zielbestand ${o.target} · ${o.delivered} geliefert`} · Budgetrest ${fmt(o.escrow)} Cr · Ausgaben ${fmt(o.spent)} Cr</p>${o.reason?`<p>${esc(o.reason)}</p>`:''}${jobs.map(j=>`<p>${esc(state.ships.get(j.ship)?.name||j.ship)}: ${states[j.state]} · ${j.loaded??j.amount} ${GOODS[j.good].name} · ${esc(state.entities.get(j.source)?.name||j.source)} → ${esc(state.entities.get(j.destination)?.name||j.destination)}</p>`).join('')}${o.state!=='cancelled'?`<button class="small" data-pp="homeLogisticsCancel" data-id="${o.id}">Abbrechen / Bindung freigeben</button>`:''}</div>`;
  }
  if(!Object.keys(h.controlModules||{}).some(k=>['dispatch','production','sales'].includes(k)))return html+'<p>Für neue Aufträge zuerst ein Funktionsmodul bauen.</p>';
  const choices=[['supply','Versorgung','dispatch'],['production','Produktion','production'],['sales','Absatz','sales']].filter(([, ,m])=>h.controlModules[m]);
  return html+`<details><summary>Neuer Auftrag</summary>
    <label>Auftrag <select id="logKind">${choices.map(([id,n])=>`<option value="${id}">${n}</option>`).join('')}</select></label>
    <label>Ware <select id="logGood">${Object.entries(GOODS).filter(([,g])=>g.cls!=='passenger').map(([id,g])=>`<option value="${id}">${g.name}</option>`).join('')}</select></label>
    <label>Rezept bei Produktion <select id="logRecipe">${Object.entries(RECIPES).map(([id,r])=>`<option value="${id}">${r.name}</option>`).join('')}</select></label>
    <label>Zielbestand / Produktionsmenge / verbleibender Absatzbestand <input id="logAmount" type="number" min="1" max="1000000" value="100"></label>
    <label>Höchstpreis beim Einkauf / Mindestpreis beim Absatz (0 = frei) <input id="logLimit" type="number" min="0" value="0"></label>
    <label>Einkaufsbudget in Cr <input id="logBudget" type="number" min="0" value="1000"></label>
    <label>Zusätzliche begrenzte Notkauffreigabe in Cr <input id="logEmergency" type="number" min="0" value="0"></label>
    <label>Priorität (Lebenserhalt / Treibstoff empfohlen: 100) <input id="logPriority" type="number" min="0" max="100" value="80"></label>
    <label>Zugewiesene Schiffe <select id="logShips" multiple>${myShips().filter(s=>!s.relicSpeed).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
    <label>Erlaubte Quellen / Absatzziele <select id="logLocations" multiple>${[...state.entities.values()].filter(e=>e.id!==entity.id&&e.market).map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></label>
    <p>Budget wird beim Anlegen gebunden. Grundreserven und bestehende Materialreservierungen bleiben geschützt. Beim Abbruch bleibt geladene Ware an Bord. Produktion endet nach ganzen Zyklen; Abbrechen hebt die Rezeptbindung auf.</p>
    <button class="primary" data-pp="homeLogistics">Auftrag anlegen</button></details>`;
}
function homeBalance(entity,{civil}={}){
  if(civil)return `<details><summary>Bürger und Steuern</summary><p>Einkommen ${fmt(civil.incomePerHour||0)} Cr/h · bisher ${fmt(civil.taxes)} Cr Steuern und ${fmt(civil.consumptionPayments)} Cr bezahlter Konsum.</p><label>Steuer 0–40 % <input id="homeTaxPercent" type="number" min="0" max="40" value="${Math.round(civil.taxRate*100)}"></label><button class="small" data-pp="homeTax">Steuersatz setzen</button></details>`;
  const home=entity.market.homeworld,used=homeStorageUsage(entity.market),work=home.workforce;
  const urgency=a=>['waterworks','foodplant'].includes(a.id)?3:a.id==='fueldepot'?2:1;
  let html=(home.allocations||[]).filter(a=>a.state!=='active'&&a.reason&&a.reason!=='Pausiert').slice().sort((a,b)=>urgency(b)-urgency(a)).map(a=>`<p class="neg">${urgency(a)===3?'Grundversorgung · ':''}${esc(names[a.id]||RECIPES[a.id]?.name||home.structures?.find(s=>s.id===a.id)?.kind||a.id)}: ${esc(a.reason)} ${jump(home.facilities[a.id]?'home:'+a.id:'home:structure:'+a.id,'Anlage öffnen')}</p>`).join('');
  html+=`<div class="kv"><span>Einwohner / Wohnraum</span><span>${home.population} / ${home.housing}</span><span>Energie benutzt / verfügbar</span><span>${home.energy?.used||0} / ${home.energy?.generation??home.power??0}</span>
    <span>Normales Lager</span><span>${fmt(used.normal)} / ${home.storage}</span><span>Gefahrgutlager</span><span>${fmt(used.hazard)} / ${home.hazardStorage}</span>
    <span>Unzugeordnet: einfach / Fach / Spezial</span><span>${work?`${work.free.basic} / ${work.free.skilled} / ${work.free.specialist}`:'48 / 12 / 0'} · höchstens ${work?.freeSlots??Math.floor(home.population*.6)} weitere Arbeitsplätze</span>
    <span>Grundversorgung</span><span>${Math.round((home.supply?.basic||0)*100)} % · Notversorgung erhält Einwohner und Fortschritt</span></div>`;
  html+='<details id="storage-overview"><summary>Warenübersicht: verfügbar / geschützt / Zu- und Abfluss</summary><table class="market"><tr><th>Ware</th><th>Verfügbar / geschützt</th><th>Zu- / Abfluss je h</th></tr>';
  for(const [g,slot] of Object.entries(entity.market.goods)){
    if(GOODS[g].cls==='passenger')continue;
    const protectedAmount=slot.stock-availableHomeStock(entity.market,g),flow=home.flows?.[g];
    if(!slot.stock&&!protectedAmount&&!flow)continue;
    const drain=(flow?.consume||0)-(flow?.produce||0),duration=drain>0?`${Math.floor(availableHomeStock(entity.market,g)/drain*60)} min Vorrat`:'kein Nettoverbrauch';
    html+=`<tr><td>${GOODS[g].name}<div class="muted">${duration}</div></td><td>${fmt(availableHomeStock(entity.market,g))} / ${fmt(protectedAmount)}</td><td>+${fmt(flow?.produce||0)} / −${fmt(flow?.consume||0)}</td></tr>`;
  }
  html+='</table></details><details><summary>Belegung und Engpässe</summary>'+(home.allocations||[]).map(a=>`<p>${esc(names[a.id]||RECIPES[a.id]?.name||home.structures?.find(s=>s.id===a.id)?.kind||a.id)}: ${a.state==='active'?'Betrieb':esc(a.reason||'Pausiert')} · ${a.power} Energie</p>`).join('')+'</details>';
  html+='<details><summary>Bau- und Ausbildungsaufträge</summary>'+(home.projects||[]).map(p=>`<p>${esc(({module:'Modulfertigung',study:'Modulstudium',control:'Leitstellenausbau',training:'Ausbildung',construction:'Neubau',upgrade:'Ausbau',restore:'Wiederherstellung',land:'Flächenerschließung'})[p.kind]||p.kind)} · ${['training','module','study'].includes(p.kind)?`${p.kind==='training'?p.count+' Einwohner:':'Restzeit:'} ${Math.ceil(p.remaining)} s ${p.paused?'(pausiert)':''}`:`${Math.max(0,Math.ceil(p.until-state.time))} s · 2 einfache Kräfte im Bauteam · Material gebunden`}</p>`).join('')+'</details>';
  return html;
}

function operationPanel(entity,id,building){
  const assignment=entity.market.homeworld.allocations?.find(a=>a.id===id);
  return `<p>${assignment?.state==='active'?'Betrieb aktiv':esc(assignment?.reason||building.blocked||'Wartet')}</p>
    <button class="small" data-pp="homeOperation" data-id="${id}" data-enabled="${building.enabled===false}">${building.enabled===false?'Betrieb fortsetzen':'Betrieb pausieren'}</button>
    <button class="small" data-pp="homePriority" data-id="${id}">Priorität ${building.priority??50} ändern</button>`;
}
function productionPanel(entity,building,recipeId,speed){
  const recipe=RECIPES[recipeId],home=entity.market.homeworld;
  const assignment=home.allocations?.find(a=>a.id===(building.id||recipeId));
  const running=assignment?.state==='active';
  return `<p>${recipeWithStock(entity.market,recipe,recipeId)}</p><p>${running?'Produziert':'Steht: '+esc(assignment?.reason||'Anlage nicht fertig')} · Zyklus ${recipe.time/speed} s bei ${speed*100} % Betrieb. ${running?'Nächster Ertrag in '+Math.ceil(Math.max(0,recipe.time-(building.progress||0))/speed)+' s.':''}</p><p>${Object.entries(recipe.out).map(([g,n])=>`${GOODS[g].name}: ${running?fmt(n*speed*3600/recipe.time):0}/h`).join(', ')}</p>`+Object.entries(recipe.in).map(([g,n])=>`<p>${GOODS[g].name}: ${fmt(availableHomeStock(entity.market,g))} verfügbar · ${Math.floor(availableHomeStock(entity.market,g)/n*recipe.time/speed/60)} min Zutatenvorrat</p><button class="small" data-pp="homeSource" data-good="${g}">${GOODS[g].name} manuell beschaffen</button>`).join('')+(entity.market.homeworld.facilities.control?.status==='ready'?jump('home:control','Versorgung automatisieren'):'<p>Automatisierung wird mit der reparierten Leitstelle verfügbar. Manuelle Beschaffung ist bereits möglich; danach im Zentrallager einlagern.</p>')+jump('home:dock','Lager öffnen');
}

function structurePanel(entity,id,ship){
  const home=entity.market.homeworld,building=home.structures.find(s=>s.id===id);if(!building)return '';
  const spec=homeStructureSpec(building);
  let html=(building.kind==='housing'?housingPanel(entity,building):'')+`<p>${building.status==='building'?`Bau läuft · ${Math.max(0,Math.ceil(building.readyAt-state.time))} s · Material und zwei einfache Kräfte gebunden`:'Betriebsbereite Anlage'}</p>
    <p>${spec.power} Energie · ${spec.workers.basic||0} einfach / ${spec.workers.skilled||0} Fach / ${spec.workers.specialist||0} Spezial</p>`;
  if(building.kind==='workshop'&&building.status==='ready')html+=workshopPanel(entity,ship);
  if(spec.generation){const active=home.allocations?.some(a=>a.id===id&&a.state==='active');html+='<p>Stromerzeugung: '+(active?spec.generation:0)+' / '+spec.generation+' · Planet: '+(home.energy?.used||0)+' benutzt / '+(home.energy?.generation||0)+' verfügbar.</p>'+Object.entries(spec.fuelPerHour||{}).map(([g,n])=>'<p>'+GOODS[g].name+': '+n+'/h · '+Math.floor(availableHomeStock(entity.market,g)/n*60)+' min Vorrat</p>').join('');}
  if(building.kind==='spaceport')html+='<p>Im Betrieb: +2 gleichzeitig bedienbare Schiffe und +500 Warenumschlag je Serverminute am gemeinsamen Lager.</p>';
  if (['silo','safeStorage'].includes(building.kind)) {
    const level=storageLevel(building), cost=storageUpgradeCost(building.kind,level+1);
    html+=`<p>Stufe ${level} / 5 · Kapazität ${spec.storage||spec.hazardStorage}</p>`;
    if(building.upgrading) html+='<p>Ausbau läuft; bisherige Kapazität bleibt nutzbar.</p>';
    else if(cost&&building.status==='ready') html+=`<p>${costLabel(cost)}</p><button class="small" data-pp="homeStorageUpgrade" data-id="${id}">Auf Stufe ${level+1} ausbauen</button>`;
  }
  if(building.recipe)html+=productionPanel(entity,building,building.recipe,1);
  if(building.status==='ready')html+=operationPanel(entity,id,building);
  if(building.kind==='plant'&&building.progress>0)html+=`<button class="small" data-pp="homeAbortCycle" data-id="${id}">Laufenden Produktionszyklus abbrechen</button>`;
  if(building.status==='ready'&&REFINEMENT_RECIPES.includes(building.recipe)){
    html+='<p>Rezeptwechsel setzt den laufenden Zyklusfortschritt zurück. Bereits verarbeitete Ware wird nicht erstattet.</p><select id="homeRefiningRecipe" aria-label="Veredelungsrezept">'+REFINEMENT_RECIPES.map(recipe=>`<option value="${recipe}" ${recipe===building.recipe?'selected':''}>${RECIPES[recipe].name} · Gruppe ${industryGroup(recipe)}</option>`).join('')+'</select>';
    html+=`<button class="small" data-pp="homeRecipeChange" data-id="${id}">Rezeptwechsel bestätigen</button>`;
  }
  if(building.kind==='school'&&building.status==='ready'){
    html+=`<p>Qualifikationen planetenweit: ${home.workers.basic} einfach / ${home.workers.skilled} Fach / ${home.workers.specialist} Spezial.</p>`+(home.projects||[]).filter(p=>p.kind==='training'&&p.school===id).map(p=>`<p>Ausbildung: ${p.count} Personen · ${Math.ceil(p.remaining)} s ${p.paused?'· pausiert: Versorgung oder Schulbetrieb fehlt':''}</p>`).join('');
    html+='<p>Ausbildung reserviert zehn tatsächlich vorhandene freie Einwohner. Fehlende Versorgung oder Schulbetrieb pausieren den Fortschritt.</p><button class="small" data-pp="homeTrain" data-qualification="skilled">10 Fachkräfte ausbilden · 120 s</button>';
    if(building.upgrades?.includes('academy'))html+='<button class="small" data-pp="homeTrain" data-qualification="specialist">10 Spezialisten ausbilden · 180 s</button>';
    else html+=`<p>Akademie: ${costLabel(HOME_BUILDINGS.academy)}</p><button class="small" data-pp="homeBuild" data-kind="academy" data-parent="${id}">Akademieausbau</button>`;
  }
  if(building.kind==='researchWorkshop'&&!building.upgrades?.includes('researchCenter'))html+=`<p>Forschungszentrum: ${costLabel(HOME_BUILDINGS.researchCenter)}</p><button class="small" data-pp="homeBuild" data-kind="researchCenter" data-parent="${id}">Forschungszentrum ausbauen</button>`;
  if(['moduleBench','researchWorkshop'].includes(building.kind)&&building.status==='ready')html+=moduleCraftPanel(entity,building);
  html+='<details><summary>Entfernen und Folgen</summary>';
  for(const upgrade of [...(building.upgrades||[]),null]) {
    const preview=demolitionPreview(entity.market,id,upgrade);
    const impact=preview.error||Object.entries(preview.losses).filter(([,n])=>n).map(([k,n])=>`−${n} ${({storage:'Lagerplatz',hazardStorage:'Gefahrstoffplatz',housing:'Wohnraum',power:'Strom'})[k]}`).join(', ')||'Bauplatz wird frei';
    html+=`<p>${esc(impact)} · keine Erstattung</p><button class="small" data-pp="homeDemolish" data-id="${id}" data-upgrade="${upgrade||''}" ${preview.error?'disabled':''}>${upgrade?HOME_BUILDINGS[upgrade].name+' entfernen':'Gebäude abreißen'}</button>`;
  }
  return html+'</details>';
}

function homeBuildPanel(entity){
  const home=entity.market.homeworld;
  let html='<p>Baue auf diesem Platz. Zutaten liegen im gemeinsamen Lager; zusätzliche Anlagen benötigen freie Energie und Arbeitskräfte.</p><h3>Industrie bauen</h3><select id="homeRecipe" aria-label="Industrierezept">';
  let recipeGroup=null;
  for(const [id,recipe] of Object.entries(RECIPES).sort((a,b)=>industryGroup(a[0]).localeCompare(industryGroup(b[0])))){
    if(recipeGroup!==industryGroup(id)){if(recipeGroup)html+='</optgroup>';recipeGroup=industryGroup(id);html+='<optgroup label="Industriegruppe '+recipeGroup+'">';}
    const group=industrySpec(id);
    html+=`<option value="${id}" ${completed(group.quest)?'':'disabled'}>${recipe.name} · Gruppe ${industryGroup(id)} · ${costLabel(group)} · ${group.power} Energie · ${group.workers.basic}/${group.workers.skilled}/${group.workers.specialist} Personal</option>`;
  }
  html+=`</optgroup></select><p id="homeRecipePreview">${recipeText(Object.values(RECIPES)[0])} · ${Object.values(RECIPES)[0].time} s je Zyklus</p><button class="primary" data-pp="homeBuild" data-kind="plant">Industrieanlage bauen</button><h3>Infrastruktur</h3>`;
  const purpose=kind=>['solar','gasGenerator','reactor'].includes(kind)?'Energie':['silo','safeStorage','spaceport'].includes(kind)?'Lager und Transport':['housing','school'].includes(kind)?'Bevölkerung':['moduleBench','researchWorkshop','workshop'].includes(kind)?'Werkstätten und Forschung':'Flächenplanung';
  let category=null;
  for(const [kind,spec] of Object.entries(HOME_BUILDINGS).sort((a,b)=>purpose(a[0]).localeCompare(purpose(b[0]))||Number(completed(b[1].quest))-Number(completed(a[1].quest)))){
    if(spec.parent)continue;
    if(category!==purpose(kind)){category=purpose(kind);html+='<h4>'+category+'</h4>';}
    const cost=kind==='land'?{...spec,credits:Math.round(spec.credits*1.4**(home.expansions||0))}:spec;
    html+=`<div class="quest-offer"><b>${spec.name}</b><p>${costLabel(cost)}</p><p>${impactText(home,spec)}</p><div class="muted">${spec.generation?`+${spec.generation} Energie`:spec.power+' Energie'} · ${spec.workers.basic||0}/${spec.workers.skilled||0}/${spec.workers.specialist||0} Personal · ${kind==='land'?'+4 Bauplätze · planetenweites Projekt':'1 Bauplatz'}${spec.housing?' · +'+spec.housing+' Wohnraum':''}${spec.storage?' · +'+spec.storage+' Lager':''}${spec.hazardStorage?' · +'+spec.hazardStorage+' Gefahrgutlager':''}</div>
      <button class="small" data-pp="homeBuild" data-kind="${kind}" ${completed(spec.quest)?'':'disabled'}>${completed(spec.quest)?'Bauen':'Freischaltung '+spec.quest}</button></div>`;
  }
  return html;
}

function storageControls(entity,good){
 const market=entity.market,cap=homeGoodCapacity(market,good),limit=homeGoodLimit(market,good),reserve=market.homeworld.reserves?.[good]||0;
 return [['limit','Lagerlimit',limit],['reserve','Sperrmenge',reserve]].map(([kind,label,value])=>`<label><span>${label}</span><input type="range" min="0" max="${cap}" step="1" value="${Math.min(value,cap)}" data-storage-rule="${kind}" data-good="${good}" aria-label="${label} ${GOODS[good].name}"><input type="number" min="0" max="${cap}" step="1" value="${value}" data-storage-rule="${kind}" data-good="${good}" aria-label="${label} Zahl ${GOODS[good].name}"></label>`).join('')+(reserve>limit?'<p class="neg">Sperrmenge über Lagerlimit: Der geschützte Mindestbestand kann durch Einlagerung nicht erreicht werden.</p>':'');
}
const storageBatchDrafts=new Map();
export function setStorageBatchDraft(id,amount){storageBatchDrafts.set(id,amount);}
function storageBatchPanel(entity){
 const home=entity.market.homeworld,cap=Math.max(home.storage,home.hazardStorage),amount=Math.min(cap,storageBatchDrafts.get(entity.id)||0);
 return `<details><summary>Alle Lagerlimits gemeinsam ändern</summary><label>Neues Limit <input id="homeBatchRange" type="range" min="0" max="${cap}" value="${amount}"><input id="homeBatchNumber" aria-label="Gemeinsames Lagerlimit" type="number" min="0" max="${cap}" value="${amount}"></label><p id="homeBatchPreview">Alle Rohstofflimits: normal ${Math.min(amount,home.storage)}, Gefahrstoffe ${Math.min(amount,home.hazardStorage)}. Bestände über dem neuen Limit bleiben erhalten; weitere Einlagerung wird gesperrt. Sperrmengen bleiben unverändert.</p><button class="small" data-pp="homeBatchLimits">Anwenden</button></details>`;
}
