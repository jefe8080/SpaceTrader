import {questText} from './quests.js';
import {HOME_STORY,storyAvailable,storyDialogReady} from '/shared/home-story.js';
import { GOODS, RECIPES,recipeText } from '/shared/config.js';
import { HOME_QUESTS, HOMEWORLD, HOME_BUILDINGS, INDUSTRY_GROUPS, CONTROL_MODULES, controlUpgradeCost, industryGroup, industrySpec, homeStorageUsage, availableHomeStock } from '/shared/homeworld.js';
import { state, fmt, esc, myShips } from '../state.js';
import { cmd } from '../net.js';
import {moduleStockPanel,moduleCraftPanel} from './modules.js';
import {REFINEMENT_RECIPES} from '/shared/goods.js';
import {populationPanel} from './population.js';
import {QUEST_DELIVERIES,STUDY_FINDS} from '/shared/advanced-homequests.js';
import {SHIP_TYPES,SHIPYARD} from '/shared/config.js';
import {warpPanel} from './colonies.js';

let dialog, currentScene, closingScene;
export function renderHomeDialog() {
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

const names = { dock: 'Dock und Zentrallager', control: 'Leitstelle', workshop: 'Antriebswerkstatt' };
const completed = (id) => !!state.homeQuest?.completed[id];
export function homePanel(entity, item, ship) {
  const home = entity.market.homeworld;
  if (home.owner !== state.me.id) return '<div class="muted">Persönliche Ruinenwelt eines anderen Kapitäns.</div>';
  if (item.kind === 'questhouse') {
    const mode=entity.market.mode==='open'?'open':'private';
    const trade=`<h3>Handel</h3><p>Handelsmodus: <b>${mode==='open'?'offen':'privat'}</b></p><p>${mode==='open'?'Andere Spieler und NPCs können unreservierte Waren handeln.':'Nur du kannst auf das Lager zugreifen.'} Reservierte Waren bleiben geschützt.</p><button class="small" data-pp="homeTradeMode" data-mode="${mode==='open'?'private':'open'}">Handel ${mode==='open'?'auf privat stellen':'öffnen'}</button>`;
    const overview='<details><summary>Planetenübersicht</summary>'+homeBalance(entity)+'</details>'+trade+planetNamePanel(entity);
    if(entity.id!==state.homeworld)return overview+'<h3>Laufende Quests</h3>'+(state.quest?'<p>'+questText(state.quest)+'</p>':'')+Object.entries(HOME_QUESTS).filter(([id])=>state.homeQuest?.active?.[id]&&!completed(id)).map(([id,q])=>'<p><b>'+id+' · '+esc(q.title)+'</b><br>'+esc(q.goal)+'</p>').join('')+'<button class="small" data-pp="homeSite" data-id="'+state.homeworld+'">Zur Hauptheimat zeigen</button>'+historyPanel()+`<p>Gründung: ${home.founding?.immigrants?.reduce((n,b)=>n+b.n,0)||0} eigene Auswanderer · Expeditionsschiff ${esc(home.founding?.infrastructureShip?.name||'')}</p>`+warpPanel(entity);
    let html = overview+(state.quest?'<h3>Laufender Auftrag</h3><p>'+questText(state.quest)+'</p>':'')+`<div class="muted">Hauptquests laufen unabhängig von normalen Quests. Mehrere freigeschaltete Zweige können gleichzeitig fortschreiten.</div>`;
    for (const [id, quest] of Object.entries(HOME_QUESTS)) {
      if(completed(id)||!state.homeQuest?.active?.[id])continue;
      const unlocked = true;
      html += `<div class="quest-offer"><b>${id} · ${esc(quest.title)} ${completed(id) ? '✓' : ''}</b><p>${esc(quest.goal)}</p>
      <div class="muted">${quest.credits} Cr · ${quest.xp} XP${unlocked ? '' : ' · Voraussetzung: ' + quest.requires.join(', ')}</div>
      ${completed(id) ? '' : `<button class="small primary" data-pp="homeQuest" data-quest="${id}" ${unlocked ? '' : 'disabled'}>Fortschritt prüfen und abschließen</button>`}</div>`;
      if(id==='H05')html+=`<p>Versorgter Betrieb: ${Math.floor(home.suppliedSeconds)} / 600 s</p>`;
      if (id === 'H04' && state.homeQuest?.salvage?.phase === 'available') html += '<button class="small" data-pp="homeWreck">Markiertes Wrack zeigen</button>';
      if(unlocked&&!completed(id)){
        for(const [g,n] of Object.entries(QUEST_DELIVERIES[id]||{})){
          const have=home.questDeliveries?.[id]?.[g]||0,remaining=n-have;
          html+=`<p>${GOODS[g].name}: ${have} / ${n} unwiderruflich für diesen Auftrag gebunden</p>${remaining>0?`<input aria-label="Liefermenge ${id} ${GOODS[g].name}" id="questDelivery-${id}-${g}" type="number" min="1" max="${remaining}" value="${Math.min(10,remaining)}"><button class="small" data-pp="homeQuestDeliver" ${ship?'':'disabled title="Ein eigenes Schiff muss für die Lieferung hier angedockt sein"'} data-quest="${id}" data-good="${g}">Teilmenge liefern</button>`:''}`;
        }
        const site=state.homeQuest?.sites?.[id];
        if(site)html+=`<p>Archivbesuch: ${state.homeQuest.visits?.[id]?'aufgezeichnet':'offen'}</p><button class="small" data-pp="homeSite" data-id="${site}">Archivstelle zeigen</button>`;
      }
    }
    for(const [module,find] of Object.entries(STUDY_FINDS))if(completed(find.quest))html+=`<p>${find.name}: ${state.homeQuest.finds?.[module]?'einmalige Vorlage geborgen':'Studienvorlage verfügbar'}</p><button class="small" data-pp="homeSite" data-id="${state.homeQuest.sites?.[module]||''}">Forschungsfund zeigen</button>`;
    html+=`<p>Volle Grundversorgung: ${Math.floor(home.fullSupplySeconds||0)} / 1.800 s · Selbst ausgebildete Fachkräfte: ${home.trained?.skilled||0}</p>`+orbitalPanel(entity);
    html+='<h3>Eigene Welten und Expeditionen</h3>';
    for(const world of [...state.entities.values()].filter(e=>e.ruinsSite||e.market?.homeworld?.owner===state.me.id))html+=`<p>${esc(world.name)} · ${world.ruinsSite?'unbewohnter Standort':`Leitstelle ${world.market.homeworld.controlLevel}`}</p><button class="small" data-pp="homeSite" data-id="${world.id}">Standort zeigen</button>`;
    html+=warpPanel(entity);
    html += historyPanel();
    return html;
  }
  if (item.homeStructure) return structurePanel(entity,item.homeStructure);
  if(item.homeOrbital)return orbitalPanel(entity);
  if (item.kind === 'plot') return `<div class="muted">Freier Bauplatz ${item.plotIndex + 1}. Aktuell ${home.plots} von maximal ${HOMEWORLD.start.maxPlots} Plätzen erschlossen.</div>`+homeBuildPanel(entity);
  const facility = item.homeFacility, building = home.facilities[facility];
  if (!building) return '';
  const cost = facility === 'dock' ? { credits: 0, seconds: 15, goods: { ingots: 4 } }
    : facility === 'control' ? { credits: 500, seconds: 30, goods: { ingots: 4 } } : HOMEWORLD.industry.repair;
  let html = `<div class="kv"><span>Anlage</span><span>${esc(names[facility] || RECIPES[facility]?.name || facility)}</span><span>Zustand</span><span>${building.status === 'ready' ? 'Betriebsbereit' : building.status === 'building' ? 'Reparatur läuft · ' + Math.max(0, Math.ceil(building.readyAt - state.time)) + ' s' : 'Beschädigte Ruine'}</span></div>`;
  if (facility === 'workshop' && building.status === 'ruined') html += '<p>Der Reliktfund führt zur Wiederherstellung dieser Werkstatt.</p>';
  else if (building.status === 'ruined') html += `<p>${cost.credits} Cr · ${Object.entries(cost.goods).map(([g, n]) => n + ' ' + GOODS[g].name).join(', ')} · ${cost.seconds} s</p>
    <button class="primary" data-pp="homeRepair" data-facility="${facility}">Reparieren</button>`;
  if (facility === 'workshop') {
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
  }
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
  }
  if (RECIPES[facility]) {
    const recipe = RECIPES[facility];
    html += `<p>${Object.entries(recipe.in).map(([g,n]) => `${n} ${GOODS[g].name}`).join(' + ')} → ${Object.entries(recipe.out).map(([g,n]) => `${n} ${GOODS[g].name}`).join(' + ')}</p><div class="muted">${building.restored?'Normalbetrieb: 100 %':'Reparierter Grundbetrieb: 10 %'} Geschwindigkeit. ${esc(building.blocked || '')}</div>`;
    if(building.status==='ready'){
      html+=operationPanel(entity,facility,building);
      if(!building.restored)html+=`<p>Normalanlage: 4 Energie, 6 einfache Kräfte · ${costLabel(HOMEWORLD.industry.restore)}</p><button class="small" data-pp="homeRestore" data-facility="${facility}" ${building.upgrading?'disabled':''}>Zur Normalanlage ausbauen</button>`;
    }
  }
  if (facility === 'dock' && building.status === 'ready') {
    const goods = Object.entries(entity.market.goods).filter(([g, slot]) => GOODS[g].cls!=='passenger'&&(slot.stock > 0 || ship?.cargo?.[g]));
    html += homeBalance(entity)+'<p>Eigene Transfers sind kostenlos. Geschützte Reserven bleiben im Lager.</p><table class="market"><tr><th>Ware</th><th>Lager / Schiff</th><th></th></tr>';
    for (const [good, slot] of goods) html += `<tr><td>${GOODS[good].name}</td><td>${fmt(slot.stock)} / ${fmt(ship?.cargo?.[good] || 0)}</td><td>
      <button class="small" data-pp="homeTransfer" data-good="${good}" data-dir="buy" ${ship && slot.stock >= 1 ? '' : 'disabled'}>Laden</button>
      <button class="small" data-pp="homeTransfer" data-good="${good}" data-dir="sell" ${ship?.cargo?.[good] ? '' : 'disabled'}>Einlagern</button></td></tr>`;
    html += '</table>';
    html+=moduleStockPanel(entity,ship,'pp')+populationPanel(entity);
    html += `<label>Reserve für <select id="homeReserveGood" aria-label="Ware für Reserve">${Object.keys(entity.market.goods).filter(g=>GOODS[g].cls!=='passenger').map(g=>`<option value="${g}">${GOODS[g].name}</option>`).join('')}</select></label>
      <input id="homeReserveAmount" type="number" min="0" max="1000000000" value="0" aria-label="Geschützte Reservemenge"><button class="small" data-pp="homeReserve">Reserve setzen / freigeben</button>
      <p class="muted">Zwei Stunden Grundbedarf: ${Math.ceil(home.population*.4)} Wasser und ${Math.ceil(home.population*.2)} Nahrung. Reserven sind Teil des Lagerbestands, kein zusätzliches Lager.</p>`;
  }
  return html;
}

function historyPanel(){return '<details><summary>Archiv – erlebte Geschichten</summary>'+Object.entries(HOME_STORY).filter(([id])=>state.homeQuest?.scenesSeen?.[id]||completed(id)).map(([id,scene])=>`<button class="small" data-pp="homeReplay" data-scene="${id}">${id} · ${esc(scene.title)} ansehen</button><p><b>${esc(scene.speaker)}</b>: ${esc(scene.text)}</p>`).join('') + (state.homeQuest?.journal || []).map((entry) => `<p><b>${esc(entry.speaker || entry.id)}</b> · ${esc(entry.text)}</p>`).join('') + '</details>';}

function planetNamePanel(entity){
  const until=(entity.market.homeworld.renamedAt??0)+86400000;
  const remaining=entity.market.homeworld.renamedAt==null?0:Math.max(0,Math.ceil((until-Date.now())/60000));
  return '<h3>Planetenname</h3><p>'+esc(entity.name)+(remaining?' · Nächste Änderung in '+Math.floor(remaining/60)+' h '+remaining%60+' min':' · Namensänderung verfügbar')+'</p><label>Neuer Name <input id="homePlanetName" minlength="3" maxlength="32" value="'+esc(entity.name)+'"></label><button class="small" data-pp="homeRename">Namen speichern</button>';
}

const costLabel=cost=>`${fmt(cost.credits)} Cr · ${Object.entries(cost.goods).map(([g,n])=>`${n} ${GOODS[g]?.name||g}`).join(', ')} · ${cost.seconds||60} s`;
function orbitalPanel(entity){
  const o=entity.market.homeworld.orbital;
  let html=`<h3>Orbitalring</h3><p>Kleiner Ring: ${o?.small?'betriebsbereit':'gebrochen'} · Großer Ring: ${o?.large?'betriebsbereit':`${o?.largeStage||0} / 2 Abschnitte`}. Eigener Orbitalanker, kein Bodenbauplatz.</p>`;
  if(o?.project)html+=`<p>Ringbau ${o.project.kind==='small'?'klein':'groß'}, Abschnitt ${o.project.stage}: ${Math.ceil(o.project.remaining)} s · zwei Bauarbeiter gebunden.</p>`;
  else if(completed('H07')&&!o?.small){
    const ships=myShips().filter(s=>s.type==='spatz'&&s.dockedAt===entity.id);
    html+=`<p>100 Platten, 40 Elektronik und zehn Rumpfsegmente für H08 liefern. Ein Spatz wird dauerhaft aus der steuerbaren Flotte entfernt und als Infrastruktur erhalten. Vorher alle Fracht und Module ausladen.</p><select id="orbitalSurrender" aria-label="Dauerhaft abzugebender Spatz">${ships.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><button class="small" data-pp="homeOrbital" data-large="false" ${ships.length?'':'disabled'}>Spatz dauerhaft abgeben und Ring aufbauen · 600 s</button>`;
  }else if(completed('H08')&&completed('H12')&&!o?.large)html+=`<button class="small" data-pp="homeOrbital" data-large="true">Großen Ring: Abschnitt ${(o?.largeStage||0)+1} starten · 600 s</button>`;
  for(const s of o?.infrastructureShips||[])html+=`<p>Infrastruktur: ${esc(s.name)} (${s.id}) · dauerhaft im Ring.</p>`;
  if(o?.small){
    html+='<details><summary>Schiffbau mit echten Materialien</summary><p>Kleiner Betrieb: 20 Energie, acht einfache und sechs Fachkräfte. Große Fertigung zusätzlich: 60 Energie, zehn Fachkräfte, vier Spezialisten. Personal und Energie nur bei laufendem Bau.</p>';
    for(const [id,d] of Object.entries(SHIP_TYPES).filter(([,d])=>!d.npc&&(o.large?['S','M','L','XL']:['S','M']).includes(d.cls)))html+=`<p>${d.name}: ${Object.entries(d.build).map(([g,n])=>`${n} ${GOODS[g].name}`).join(', ')}${d.currency?` + ${d.currency.n} ${GOODS[d.currency.good].name} · Fraktionsrang ${d.rank}`:''} · ${SHIPYARD.BUILD_TIME[d.cls]} s</p><button class="small" data-pp="homeOrbitalBuild" data-type="${id}">Rumpf bauen</button>`;
    html+='</details>';
    for(const j of Object.values(o.jobs))html+=`<p>${SHIP_TYPES[j.type].name}: ${Math.ceil(j.remaining)} s · ${j.paused?'pausiert: Energie oder Personal fehlt':'in Fertigung'} · Ausgabeplatz reserviert.</p>`;
    for(const i of o.inventory)html+=`<p>${SHIP_TYPES[i.type].name} · ${esc(i.id)} · Tank leer</p><button class="small" data-pp="homeOrbitalClaim" data-id="${i.id}">Vorhandenen Rumpf in Flotte übernehmen</button>`;
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
function homeBalance(entity){
  const home=entity.market.homeworld,used=homeStorageUsage(entity.market),work=home.workforce;
  let html=`<div class="kv"><span>Einwohner / Wohnraum</span><span>${home.population} / ${home.housing}</span><span>Energie benutzt / verfügbar</span><span>${home.energy?.used||0} / ${home.energy?.generation??home.power??0}</span>
    <span>Normales Lager</span><span>${fmt(used.normal)} / ${home.storage}</span><span>Gefahrgutlager</span><span>${fmt(used.hazard)} / ${home.hazardStorage}</span>
    <span>Unzugeordnet: einfach / Fach / Spezial</span><span>${work?`${work.free.basic} / ${work.free.skilled} / ${work.free.specialist}`:'48 / 12 / 0'} · höchstens ${work?.freeSlots??Math.floor(home.population*.6)} weitere Arbeitsplätze</span>
    <span>Grundversorgung</span><span>${Math.round((home.supply?.basic||0)*100)} % · Notversorgung erhält Einwohner und Fortschritt</span></div>`;
  if(home.civil)html+=`<details><summary>Bürger und Geld</summary><p>Brutto ${fmt(home.civil.incomePerHour||0)} Cr/h · Steuer ${Math.round(home.civil.taxRate*100)} % · Konsumkasse ${fmt(home.civil.budget)} Cr</p>
    <p>Bisher: ${fmt(home.civil.gross)} Cr Einkommen, davon ${fmt(home.civil.taxes)} Cr Steuern und ${fmt(home.civil.consumptionPayments)} Cr tatsächlich bezahlter Konsum.</p>
    <label>Steuer 0–40 % <input id="homeTaxPercent" type="number" min="0" max="40" value="${Math.round(home.civil.taxRate*100)}"></label><button class="small" data-pp="homeTax">Steuersatz setzen</button></details>`;
  html+='<table class="market"><tr><th>Ware</th><th>Verfügbar / geschützt</th><th>Zu- / Abfluss je h</th></tr>';
  for(const [g,slot] of Object.entries(entity.market.goods)){
    if(GOODS[g].cls==='passenger')continue;
    const protectedAmount=slot.stock-availableHomeStock(entity.market,g),flow=home.flows?.[g];
    if(!slot.stock&&!protectedAmount&&!flow)continue;
    const drain=(flow?.consume||0)-(flow?.produce||0),duration=drain>0?`${(availableHomeStock(entity.market,g)/drain).toFixed(1)} h Vorrat`:'kein Nettoverbrauch';
    html+=`<tr><td>${GOODS[g].name}<div class="muted">${duration}</div></td><td>${fmt(availableHomeStock(entity.market,g))} / ${fmt(protectedAmount)}</td><td>+${fmt(flow?.produce||0)} / −${fmt(flow?.consume||0)}</td></tr>`;
  }
  html+='</table><details><summary>Belegung und Engpässe</summary>'+(home.allocations||[]).map(a=>`<p>${esc(names[a.id]||RECIPES[a.id]?.name||home.structures?.find(s=>s.id===a.id)?.kind||a.id)}: ${a.state==='active'?'Betrieb':esc(a.reason||'Pausiert')} · ${a.power} Energie</p>`).join('')+'</details>';
  html+='<details><summary>Bau- und Ausbildungsaufträge</summary>'+(home.projects||[]).map(p=>`<p>${esc(({module:'Modulfertigung',study:'Modulstudium',control:'Leitstellenausbau',training:'Ausbildung',construction:'Neubau',upgrade:'Ausbau',restore:'Wiederherstellung',land:'Flächenerschließung'})[p.kind]||p.kind)} · ${['training','module','study'].includes(p.kind)?`${p.kind==='training'?p.count+' Einwohner:':'Restzeit:'} ${Math.ceil(p.remaining)} s ${p.paused?'(pausiert)':''}`:`${Math.max(0,Math.ceil(p.until-state.time))} s · 2 einfache Kräfte im Bauteam · Material gebunden`}</p>`).join('')+'</details>';
  return html;
}

function operationPanel(entity,id,building){
  const assignment=entity.market.homeworld.allocations?.find(a=>a.id===id);
  return `<p>${assignment?.state==='active'?'Betrieb aktiv':esc(assignment?.reason||building.blocked||'Wartet')}</p>
    <button class="small" data-pp="homeOperation" data-id="${id}" data-enabled="${building.enabled===false}">${building.enabled===false?'Betrieb fortsetzen':'Betrieb pausieren'}</button>
    <button class="small" data-pp="homePriority" data-id="${id}">Priorität ${building.priority??50} ändern</button>`;
}

function structurePanel(entity,id){
  const home=entity.market.homeworld,building=home.structures.find(s=>s.id===id);if(!building)return '';
  const spec=building.recipe?industrySpec(building.recipe):HOME_BUILDINGS[building.kind];
  let html=`<p>${building.status==='building'?`Bau läuft · ${Math.max(0,Math.ceil(building.readyAt-state.time))} s · Material und zwei einfache Kräfte gebunden`:'Betriebsbereite Anlage'}</p>
    <p>${spec.power} Energie · ${spec.workers.basic||0} einfach / ${spec.workers.skilled||0} Fach / ${spec.workers.specialist||0} Spezial</p>`;
  if(building.recipe)html+=`<p>${recipeText(RECIPES[building.recipe])} · ${RECIPES[building.recipe].time} s je vollständigem Zyklus</p>`;
  if(building.status==='ready')html+=operationPanel(entity,id,building);
  if(building.status==='ready'&&REFINEMENT_RECIPES.includes(building.recipe)){
    html+='<p>Rezeptwechsel setzt den laufenden Zyklusfortschritt zurück. Bereits verarbeitete Ware wird nicht erstattet.</p><select id="homeRefiningRecipe" aria-label="Veredelungsrezept">'+REFINEMENT_RECIPES.map(recipe=>`<option value="${recipe}" ${recipe===building.recipe?'selected':''}>${RECIPES[recipe].name} · Gruppe ${industryGroup(recipe)}</option>`).join('')+'</select>';
    html+=`<button class="small" data-pp="homeRecipeChange" data-id="${id}">Rezeptwechsel bestätigen</button>`;
  }
  if(building.kind==='school'&&building.status==='ready'){
    html+='<p>Ausbildung reserviert zehn tatsächlich vorhandene freie Einwohner. Fehlende Versorgung oder Schulbetrieb pausieren den Fortschritt.</p><button class="small" data-pp="homeTrain" data-qualification="skilled">10 Fachkräfte ausbilden · 120 s</button>';
    if(building.upgrades?.includes('academy'))html+='<button class="small" data-pp="homeTrain" data-qualification="specialist">10 Spezialisten ausbilden · 180 s</button>';
    else html+=`<p>Akademie: ${costLabel(HOME_BUILDINGS.academy)}</p><button class="small" data-pp="homeBuild" data-kind="academy" data-parent="${id}">Akademieausbau</button>`;
  }
  if(building.kind==='researchWorkshop'&&!building.upgrades?.includes('researchCenter'))html+=`<p>Forschungszentrum: ${costLabel(HOME_BUILDINGS.researchCenter)}</p><button class="small" data-pp="homeBuild" data-kind="researchCenter" data-parent="${id}">Forschungszentrum ausbauen</button>`;
  if(['moduleBench','researchWorkshop'].includes(building.kind)&&building.status==='ready')html+=moduleCraftPanel(entity);
  return html;
}

function homeBuildPanel(entity){
  const home=entity.market.homeworld;
  let html=homeBalance(entity)+'<h3>Industrie bauen</h3><select id="homeRecipe" aria-label="Industrierezept">';
  for(const [id,recipe] of Object.entries(RECIPES)){
    const group=industrySpec(id);
    html+=`<option value="${id}" ${completed(group.quest)?'':'disabled'}>${recipe.name} · Gruppe ${industryGroup(id)} · ${costLabel(group)} · ${group.power} Energie · ${group.workers.basic}/${group.workers.skilled}/${group.workers.specialist} Personal</option>`;
  }
  html+=`</select><p id="homeRecipePreview">${recipeText(Object.values(RECIPES)[0])} · ${Object.values(RECIPES)[0].time} s je Zyklus</p><button class="primary" data-pp="homeBuild" data-kind="plant">Industrieanlage bauen</button><h3>Infrastruktur</h3>`;
  for(const [kind,spec] of Object.entries(HOME_BUILDINGS)){
    if(spec.parent)continue;
    const cost=kind==='land'?{...spec,credits:Math.round(spec.credits*1.4**(home.expansions||0))}:spec;
    html+=`<div class="quest-offer"><b>${spec.name}</b><p>${costLabel(cost)}</p><div class="muted">${spec.generation?`+${spec.generation} Energie`:spec.power+' Energie'} · ${spec.workers.basic||0}/${spec.workers.skilled||0}/${spec.workers.specialist||0} Personal · ${kind==='land'?'+4 Bauplätze':'1 Bauplatz'}</div>
      <button class="small" data-pp="homeBuild" data-kind="${kind}" ${completed(spec.quest)?'':'disabled'}>${completed(spec.quest)?'Bauen':'Freischaltung '+spec.quest}</button></div>`;
  }
  return html;
}
