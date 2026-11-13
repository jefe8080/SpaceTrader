// Planetare Ansicht: Kopfzeile und Gebäude-Panel (PRD-3 Kapitel 6). Weitere Gebäude (Unterhaltung, Schmuggler,
// Bettler, Hund, Schule) hängen sich über panelKinds ein.
import { GOODS, RECIPES, RECIPE_CATS, PLANET_TYPES, factoryCost, factorySlots, recipeCat, recipeText } from '/shared/config.js';
import { state, fmt, esc, myShips } from '../state.js';
import { cmd } from '../net.js';
import { $, setHtml, toast,confirmAction } from './dom.js';
import { questBoardSection } from './quests.js';
import { scene, canLand, accessTo, resetPlanetside, selectBuilding, hidePlanetside, getPlanetView } from '../planetside.js';
import { sfx } from '../audio.js';
import { demolitionPreview } from '/shared/homeworld.js';
import { homePanel, setStorageBatchDraft } from './homeworld.js';
import {handleModuleAction} from './modules.js';
import { bus } from './bus.js';
import { patchPanelContent } from './panelContent.js';
import {handlePopulationAction} from './population.js';
import {propertySection,handlePropertyAction,specializationPanel} from './property.js';
import {handleColonyAction} from './colonies.js';
import { firstGuide, showGuide } from './objectGuide.js';
import { buildingGuideKey } from '/shared/object-guide.js';
import {recipeWithStock, stockLabel, planetSummary} from './productionDisplay.js';
import {housingPanel} from './housing.js';

const bar = $('planetBar');
const panel = $('planetPanel');
/** Zusätzliche Gebäudearten: kind -> { render(it, e, ship), click(d, it, e, ship) } */
export const panelKinds = {};
let current = null; // gewähltes Gebäude
let cityNames = false;
let panelContext = null;
const buildingHistory=[];
const disclosureMemory=new Map();
panel.addEventListener('toggle',event=>{
  if(event.target.tagName==='DETAILS'&&current)disclosureMemory.set(current.key+':'+event.target.querySelector('summary')?.textContent,event.target.open);
},true);
export function openHomeBuilding(key){
  if(!state.landed)return;
  const item=key==='overview'?{key:'overview',label:'Planetenübersicht',homeOverview:true}:scene.items.find(it=>it.key===key);
  if(!item)return;
  if(current&&current.key!==key)buildingHistory.push(current.key);
  openBuilding(item,true);
}
bus.openHomeBuilding=openHomeBuilding;
addEventListener('resize', renderPlanetUi);

const shipsHere = (id) => myShips().filter((s) => s.dockedAt === id);
const chosenShip=id=>shipsHere(id).find(s=>s.id===state.homeDockShip)||shipsHere(id).find(s=>s.id===state.manualShip)||shipsHere(id)[0];
const onBoard = (id, g) => shipsHere(id).reduce((a, s) => a + (s.cargo?.[g] || 0), 0);
const cons = () => (state.cons && !state.cons.none ? state.cons : null);

export function enterPlanet(id) {
  const e = state.entities.get(id);
  if (e?.kind !== 'planet') return;
  if (!canLand(id)) { toast('Kein Schiff angedockt'); return; }
  state.landed = id;
  if (e.type === 'ruins' && accessTo(id).local) cmd('homeLand', { target: id });
  resetPlanetside(e);
  current = null;
  state.follow = null;
  buildingHistory.length=0;
  sfx('dock');
  renderPlanetUi();
}
export function leavePlanet() {
  if (!state.landed) return;
  state.landed = null;
  selectBuilding(null);
  hidePlanetside();
  current = null;
  renderPlanetUi();
}
export function closeBuilding(force = false) {
  current = null;
  selectBuilding(null, force);
  renderPlanetUi();
}
export function openBuilding(it, explained = false) {
  const e = state.entities.get(state.landed);
  if (!e) return;
  if (!explained && firstGuide(buildingGuideKey(it,e), () => {
    if (state.landed === e.id) openBuilding(it,true);
  })) return;
  if (current?.key === it.key) { closeBuilding(); return; }
  current = it;
  selectBuilding(it);
  panelKinds[it.kind]?.open?.();
  sfx('click');
  renderPlanetUi();
}
/** Esc: erst das Panel schließen, dann die Ansicht verlassen */
export function planetEscape() {
  if (current) { closeBuilding(); return; }
  leavePlanet();
}

function syncManagementControls(lost){
  for(const button of panel.querySelectorAll('button[data-pp]')){
    if(['close','homeReplay','homeSite','homeWreck','homeOpen','homeBack'].includes(button.dataset.pp))continue;
    if(lost){
      if(button.dataset.connectionDisabled===undefined)button.dataset.connectionDisabled=String(button.disabled);
      button.disabled=true;
    }else if(button.dataset.connectionDisabled!==undefined){
      button.disabled=button.dataset.connectionDisabled==='true';delete button.dataset.connectionDisabled;
    }
  }
}

export function renderPlanetUi() {
  const viewed=state.landed&&state.entities.get(state.landed);
  const summary=$('planetSummary');
  summary.hidden=!viewed;
  if(viewed){setHtml(summary,planetSummary(viewed));summary.title=viewed.name;}
  document.body.classList.toggle('landed',!!viewed);
  const fleet=$('fleet');
  if(viewed)fleet.style.top=`${Math.ceil($('topbar').getBoundingClientRect().bottom)+12}px`;
  else fleet.style.removeProperty('top');
  // Keep recipe stocks live even while an adjacent form retains keyboard focus.
  if(viewed)for(const label of panel.querySelectorAll('[data-production-recipe]')){
    const id=label.dataset.productionRecipe;if(RECIPES[id])label.outerHTML=recipeWithStock(viewed.market,RECIPES[id],id);
  }
  const lost = state.landed && state.entities.get(state.landed)?.type==='ruins' && !accessTo(state.landed).manage;
  syncManagementControls(lost);
  if (!lost && panel.contains(document.activeElement) && document.activeElement.matches('input,select,textarea')) return;
  const e = state.landed && state.entities.get(state.landed);
  bar.hidden = !e;
  if (e && current) {
    current = current.homeOverview?current:scene.items.find(x => x.key === current.key) ?? null;
    if (!current) selectBuilding(null);
  }
  panel.hidden = !e || !current;
  document.body.classList.toggle('landed', !!e);
  if (!e) return;
  setHtml(bar, `<button class="small" data-pp="leave">Planet verlassen <kbd>Esc</kbd></button>
    <button class="small" data-pp="overview" title="Zur gesamten Stadt zurückkehren">Übersicht</button>
    <button class="small" data-pp="names" aria-pressed="${cityNames}" title="Namen aller Stadtorte anzeigen">Namen</button>${e.type==='ruins'?`<button class="small" data-pp="homeOpen" data-key="overview">Planetenlage</button><label>Gebäude <select id="homeBuildingNav" aria-label="Gebäude öffnen"><option value="">Gebäude wählen …</option>${scene.items.map(it=>{const h=e.market.homeworld,b=h.facilities?.[it.homeFacility]||h.structures?.find(b=>b.id===it.homeStructure),a=h.allocations?.find(a=>a.id===(it.homeFacility||it.homeStructure));return `<option value="${esc(it.key)}" ${current?.key===it.key?'selected':''}>${esc(it.label)}${b?' · '+(b.status==='building'?'Bau läuft':b.status==='ruined'?'Ruine':a?.reason||'Betriebsbereit'):''}</option>`;}).join('')}</select></label>`:''}`);
  bar.setAttribute('aria-label', `${e.name} · ${PLANET_TYPES[e.type].name}`);
  bar.style.top = `${Math.ceil($('topbar').getBoundingClientRect().bottom)+12}px`;
  if(innerWidth>1100)panel.style.top=`${Math.ceil(bar.getBoundingClientRect().bottom)+12}px`;
  else panel.style.top=`${Math.ceil(bar.getBoundingClientRect().bottom)+12}px`;
  panel.style.maxHeight=`${Math.max(80,innerHeight-bar.getBoundingClientRect().bottom-24)}px`;
  getPlanetView()?.setNames(cityNames);
  if (!current) return;
  // Gebäude kann nach Änderungen (Abriss, Bau) neu nummeriert sein
  const it = current;
  current = it;
  const ship = chosenShip(e.id);
  let body = '';
  if (e.type === 'ruins') body = homePanel(e, it, ship);
  else if (it.kind === 'questhouse') body = questBoardSection(e, ship, true)+propertySection(e);
  else if (it.worldInfrastructure) {const building=e.market.economy?.infrastructure?.find(b=>b.id===it.worldInfrastructure);body=building&&state.props.get(e.id)?.manage?housingPanel(e,building):'<p>Wohngebiet des Planeten.</p>';}
  else if (it.kind === 'produce' || it.kind === 'consume') body = goodBuilding(it, e);
  else if (it.kind === 'factory') body = factoryPanel(it, e);
  else if (it.kind === 'plot') body = plotPanel(it, e);
  else body = panelKinds[it.kind]?.render(it, e, ship) ?? '<div class="muted">Hier ist gerade nichts los.</div>';
  const expanded=new Set([...panel.querySelectorAll('details[open]')].map(d=>d.dataset.disclosure||d.querySelector('summary')?.textContent));
  const connection = e.type==='ruins' ? `<div class="small-note ${lost?'neg':'muted'}">${accessTo(e.id).local?'Lokaler Zugang':accessTo(e.id).remote?'Fernverbindung aktiv':'Verbindung verloren – Verwaltung gesperrt'}</div>` : '';
  const context = JSON.stringify([e.id, it.key]);
  const updatePanel = context === panelContext ? patchPanelContent : (element, html) => { element.innerHTML = html; };
  panelContext = context;
  updatePanel(panel, `<div class="panel-head"><h2>${esc(it.label)}</h2><button class="small ghost" data-guide-help aria-label="Erklärung anzeigen">?</button><span style="flex:1"></span>${buildingHistory.length?'<button class="small" data-pp="homeBack">Zurück</button>':''}<button class="small ghost" data-pp="close" aria-label="Ort schließen">✕</button></div>${connection}${body}`);
  for(const input of panel.querySelectorAll('[data-storage-rule]'))input.value=input.getAttribute('value');
  const selectedRecipe = panel.querySelector('#homeRecipe');
  if (selectedRecipe) selectedRecipe.dispatchEvent(new Event('change', { bubbles: true }));
  syncManagementControls(lost);
  for(const details of panel.querySelectorAll('details'))if(expanded.has(details.dataset.disclosure||details.querySelector('summary')?.textContent))details.open=true;
  for(const details of panel.querySelectorAll('details')){const key=current.key+':'+details.querySelector('summary')?.textContent;if(disclosureMemory.has(key))details.open=disclosureMemory.get(key);}
}

panel.addEventListener('click', ev => {
  if (!ev.target.closest('[data-guide-help]') || !current) return;
  showGuide(buildingGuideKey(current,state.entities.get(state.landed)));
});

/** Produktions- und Verbrauchsgebäude: Ausbau (PRD-3 6.3) */
function goodBuilding(it, e) {
  const s = e.market.goods[it.good];
  if (!s) return '<div class="muted">Dieses Gebäude ist stillgelegt.</div>';
  return `<p>${GOODS[it.good].name} ${stockLabel(s.stock)} / ${fmt(s.cap)} · tatsächliche Rate ${fmt(s.rate*3600)}/h</p>`+(state.props.get(e.id)?.manage?specializationPanel(e):'<p>Natürlicher Standort. Konkrete Spezialisierung kann der Besitzer ausbauen.</p>');
}

function factoryPanel(it, e) {
  const r = RECIPES[it.recipe];
  const manage = !!state.props.get(e.id)?.manage;
  return `<div class="kv"><span>Rezept</span><span>${recipeWithStock(e.market,r,it.recipe)} (${r.time} s)</span><span>Lager</span><span>Zutaten und Produkte liegen im Planetenlager</span>
    <span>Status</span><span>${e.owner ? 'läuft, solange Zutaten da sind' : 'steht still (kein Besitz)'}</span></div>
    ${manage ? `<div class="btnrow" style="margin-top:6px"><button class="small danger" data-pp="demolish">Abreißen (ohne Erstattung)</button></div>` : ''}`;
}

function plotPanel(it, e) {
  if(!state.props.get(e.id)?.manage)return '<p>Fabriken baust du nur auf eigenen Planeten.</p>';
  const prop = state.props.get(e.id);
  const c = prop?.cons ? cons() : null;
  const funds = c ? c.pool : state.credits;
  const slots = factorySlots(e.type)[it.cat];
  const used = (e.market.bld?.fac || []).filter((x) => recipeCat(x) === it.cat).length;
  return `<div class="muted">Bauplatz der Kategorie ${RECIPE_CATS[it.cat].name} (${used} / ${slots} belegt). Die Fabrik nutzt das Planetenlager: Zutaten werden Verbrauchswaren, Produkte werden Produktionswaren. Gebaut wird sofort.</div>
    <table class="market" style="margin-top:6px"><tr><th>Rezept</th><th>Kosten</th><th></th></tr>
    ${RECIPE_CATS[it.cat].recipes.map((id) => { const k = factoryCost(id); const ok = funds >= k.credits && Object.entries(k.goods).every(([g, n]) => onBoard(e.id, g) >= n);
      return `<tr><td><b>${RECIPES[id].name}</b><div class="muted small-note">${recipeText(RECIPES[id])}</div></td><td class="small-note">${fmt(k.credits)} Cr${c ? ' (Pool)' : ''}<br>${Object.entries(k.goods).map(([g, n]) => `<span class="${onBoard(e.id, g) >= n ? '' : 'neg'}">${n} ${GOODS[g].name}</span>`).join(', ')}</td>
        <td><button class="small" data-pp="facBuild" data-recipe="${id}" ${ok ? '' : 'disabled'}>Bauen</button></td></tr>`; }).join('')}</table>`;
}

panel.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-pp], [data-act]');
  if (!b || b.disabled) return;
  if(handlePopulationAction(b.dataset))return;
  if(handleColonyAction(b.dataset))return;
  if(b.dataset.act&&handlePropertyAction(b.dataset))return;
  const d = b.dataset;
  if(handleModuleAction(d))return;
  const e = state.entities.get(state.landed);
  if (!e) return;
  const ship = chosenShip(e.id);
  if (d.act === 'questAccept') { cmd('questAccept', { ship: d.ship, target: d.ent, quest: d.quest }); return; }
  switch (d.pp) {
    case 'homeSource':{
      const source=[...state.entities.values()].filter(x=>x.id!==e.id&&x.market?.goods[d.good]?.role==='produce').sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
      if(!source){toast('Noch keine Quelle für '+GOODS[d.good].name+' bekannt. Erkunde die Rohstoffwelten.');return;}
      toast(GOODS[d.good].name+' an der Quelle kaufen, dann zur Heimat zurückkehren und im Zentrallager einlagern.');
      leavePlanet();state.camera.x=source.x;state.camera.y=source.y;bus.select({kind:'entity',id:source.id});return;
    }
    case 'homeAllGoods':state.showAllHomeGoods=!state.showAllHomeGoods;renderPlanetUi();return;
    case 'homeSurplus':{
      state.surplusChoice=d.choice;
      if(d.choice==='keep'){toast('Reserve geplant. Du kannst dich jederzeit anders entscheiden.','success');renderPlanetUi();return;}
      const buyer=[...state.entities.values()].find(x=>x.id!==e.id&&x.market?.goods.water&&['consume','trade'].includes(x.market.goods.water.role));
      if(!buyer){toast('Noch kein bekannter Wasserabnehmer. Erkunde weitere Planeten.');return;}
      toast('Lade nur deinen geplanten Überschuss ein und prüfe den aktuellen Verkaufspreis am Ziel.','success');
      leavePlanet();state.camera.x=buyer.x;state.camera.y=buyer.y;bus.select({kind:'entity',id:buyer.id});return;
    }
    case 'homeSupplyRoute':{
      const source=[...state.entities.values()].filter(x=>x.system===e.system&&x.id!==e.id&&x.market?.goods.ice?.role==='produce').sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
      if(!source){toast('Noch keine Eisquelle bekannt. Erkunde die Eiswelt im Heimatsystem.');return;}
      bus.openRouteEditor(null,{stops:[{targetId:source.id,actions:[{op:'buy',good:'ice',amount:30,limit:0}]},{targetId:e.id,actions:[{op:'sell',good:'ice',amount:0,limit:0}]}],assign:ship?[ship.id]:[]});return;
    }
    case 'homeRoutes':bus.openRouteEditor(null);return;
    case 'homeOpen':openHomeBuilding(d.key);return;
    case 'homeBack':{const key=buildingHistory.pop();current=null;if(key)openHomeBuilding(key);return;}
    case 'homeTradeMode':cmd('propMode',{target:e.id,mode:d.mode});return;
    case 'homeRename':cmd('homeRename',{target:e.id,name:document.getElementById('homePlanetName')?.value});return;
    case 'homeQuestDeliver':cmd('homeQuestDeliver',{target:e.id,quest:d.quest,good:d.good,amount:Number(document.getElementById(`questDelivery-${d.quest}-${d.good}`)?.value)});return;
    case 'homeSite':{
      const site=state.entities.get(d.id);if(site){leavePlanet();state.camera.x=site.x;state.camera.y=site.y;bus.select({kind:'entity',id:site.id});}return;
    }
    case 'homeOrbital':{
      const large=d.large==='true',ship=document.getElementById('orbitalSurrender')?.value;
      const perform=()=>cmd('homeOrbital',{target:e.id,large,ship:large?undefined:ship,confirmed:!large});
      if(large)perform();else confirmAction('Dieser Spatz wird dauerhaft aus der steuerbaren Flotte entfernt und als Orbitalinfrastruktur erhalten. Fracht und Module müssen vorher entladen sein. Jetzt endgültig abgeben?',perform);return;
    }
    case 'homeOrbitalUpgrade':cmd('homeOrbitalUpgrade',{target:e.id});return;
    case 'homeOrbitalBuild':cmd('homeOrbitalBuild',{target:e.id,type:d.type});return;
    case 'homeOrbitalClaim':cmd('homeOrbitalClaim',{target:e.id,id:d.id});return;
    case 'homeLogistics':{
      const value=id=>document.getElementById(id)?.value, selected=id=>[...document.getElementById(id).selectedOptions].map(o=>o.value);
      cmd('homeLogistics',{target:e.id,kind:value('logKind'),good:value('logGood'),recipe:value('logRecipe'),amount:Number(value('logAmount')),limit:Number(value('logLimit')),budget:Number(value('logBudget')),emergency:Number(value('logEmergency')),priority:Number(value('logPriority')),ships:selected('logShips'),locations:selected('logLocations')});return;
    }
    case 'homeLogisticsCancel':cmd('homeLogisticsCancel',{target:e.id,id:d.id});return;
    case 'homeRecipeChange':{
      const recipe=document.getElementById('homeRefiningRecipe')?.value;
      if(recipe)confirmAction(`Zu ${RECIPES[recipe].name} wechseln? Laufender Zyklusfortschritt wird zurückgesetzt; keine Materialerstattung.`,()=>cmd('homeRecipeChange',{target:e.id,id:d.id,recipe}));return;
    }
    case 'homeModuleCraft':cmd('homeModuleCraft',{target:e.id,module:d.module,study:d.study==='true',facility:d.facility});return;
    case 'homeTax':cmd('homeTax',{target:e.id,percent:Number(document.getElementById('homeTaxPercent')?.value)});return;
    case 'homeControlUpgrade': cmd('homeControlUpgrade',{target:e.id,module:d.module});return;
    case 'homeBuild': cmd('homeBuild', { target:e.id, kind:d.kind, recipe:d.kind==='plant'?document.getElementById('homeRecipe')?.value:undefined, parent:d.parent, plot:current?.plotIndex }); return;
    case 'homeAbortCycle': confirmAction('Laufenden Zyklusfortschritt verwerfen und Produktion pausieren? Unverarbeitete Zutaten bleiben im Lager.',()=>cmd('homeAbortCycle',{target:e.id,id:d.id,confirmed:true}));return;
    case 'homeDemolish': {
      const preview=demolitionPreview(e.market,d.id,d.upgrade||undefined);
      if(preview.error){toast(preview.error);return;}
      const names={storage:'Lagerkapazität',hazardStorage:'Gefahrstoffkapazität',housing:'Wohnraum',power:'Strom'};
      const impact=Object.entries(preview.losses).filter(([,n])=>n).map(([k,n])=>names[k]+': −'+n).join(', ');
      confirmAction('Endgültig entfernen? '+impact+'. Keine Erstattung. Ein Bauplatz wird beim Gebäudeabriss frei.',()=>cmd('homeDemolish',{target:e.id,id:d.id,upgrade:d.upgrade||undefined,confirmed:true}));return;
    }
    case 'homeStorageUpgrade': cmd('homeStorageUpgrade', { target:e.id, id:d.id }); return;
    case 'homeRestore': cmd('homeRestore', { target:e.id, facility:d.facility }); return;
    case 'homeTrain': cmd('homeTrain', { target:e.id, qualification:d.qualification,school:current?.homeStructure }); return;
    case 'homeBatchLimits': {const field=document.getElementById('homeBatchNumber');if(field.reportValidity())cmd('homeLimit',{target:e.id,all:true,amount:Number(field.value)});return;}
    case 'homeOperation': {
      const building=e.market.homeworld.facilities[d.id]||e.market.homeworld.structures.find(s=>s.id===d.id);
      cmd('homeOperation',{target:e.id,id:d.id,enabled:d.enabled==='true',priority:building?.priority??50});return;
    }
    case 'homePriority': {
      const building=e.market.homeworld.facilities[d.id]||e.market.homeworld.structures.find(s=>s.id===d.id);
      const value=prompt('Priorität von 0 bis 100 (höhere Zahl zuerst):',String(building?.priority??50));
      if(value!==null&&Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=100)cmd('homeOperation',{target:e.id,id:d.id,enabled:building?.enabled!==false,priority:Math.floor(Number(value))});
      return;
    }
    case 'relicDeliver': cmd('relicDeliver', { ship: d.ship, target: e.id }); return;
    case 'relicWork': cmd('relicWork', { ship: document.getElementById('homeRelicShip')?.value, target: e.id, kind: d.kind }); return;
    case 'homeWreck': {
      const wreck = state.entities.get(state.homeQuest?.salvage?.wreck);
      if (wreck) { leavePlanet(); state.camera.x = wreck.x; state.camera.y = wreck.y; bus.select({kind:'entity',id:wreck.id}); }
      else toast('Wrackziel noch nicht geladen. Verbindung prüfen und erneut versuchen.');
      return;
    }
    case 'homeReplay': state.homeDialogReplay = d.scene || 'H00'; return;
    case 'homeRepair': cmd('homeRepair', { target: e.id, facility: d.facility }); return;
    case 'homeQuest': cmd('homeQuestComplete', { target: e.id, quest: d.quest }); return;
    case 'homeTransfer': if (ship) cmd('trade', { ship: ship.id, target: e.id, good: d.good, dir: d.dir, amount: 'max' }); return;
    case 'close': closeBuilding(); return;
    case 'facBuild': if (confirm(`${RECIPES[d.recipe].name} bauen?`)) cmd('facBuild', { target: e.id, recipe: d.recipe }); return;
    case 'demolish': if (confirm('Fabrik abreißen? Es gibt keine Erstattung.')) { cmd('facDemolish', { target: e.id, index: current.index }); closeBuilding(); } return;
  }
  if (panelKinds[current?.kind]?.click?.(d, current, e, ship, ev)) renderPlanetUi();
});
bar.addEventListener('click', ev => {
  const jump=ev.target.closest('[data-pp=homeOpen]');if(jump)openHomeBuilding(jump.dataset.key);
  if (ev.target.closest('[data-pp=leave]')) leavePlanet();
  if (ev.target.closest('[data-pp=overview]')) closeBuilding(true);
  if (ev.target.closest('[data-pp=names]')) { cityNames=!cityNames;getPlanetView()?.setNames(cityNames);renderPlanetUi(); }
});
bar.addEventListener('change',ev=>{if(ev.target.id==='homeBuildingNav'&&ev.target.value)openHomeBuilding(ev.target.value);});
panel.addEventListener('input',event=>{
  const el=event.target;
  if(el.dataset.storageRule){for(const sibling of panel.querySelectorAll('[data-storage-rule="'+el.dataset.storageRule+'"][data-good="'+el.dataset.good+'"]'))if(sibling!==el)sibling.value=el.value;}
  if(['homeBatchRange','homeBatchNumber'].includes(el.id)){
    for(const id of ['homeBatchRange','homeBatchNumber'])if(id!==el.id)document.getElementById(id).value=el.value;
    const home=state.entities.get(state.landed)?.market.homeworld,n=Number(el.value);
    if(el.checkValidity())setStorageBatchDraft(state.landed,n);
    if(home)document.getElementById('homeBatchPreview').textContent='Alle Rohstofflimits: normal '+Math.min(n,home.storage)+', Gefahrstoffe '+Math.min(n,home.hazardStorage)+'. Bestände über dem neuen Limit bleiben erhalten; weitere Einlagerung wird gesperrt. Sperrmengen bleiben unverändert.';
  }
});
panel.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.dataset.storageRule){event.target.dispatchEvent(new Event('change',{bubbles:true}));event.target.blur();}});
panel.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='homeDockShip'){state.homeDockShip=el.value;el.blur();renderPlanetUi();return;}
  if(el.id==='logKind'){
    const production=el.value==='production',sales=el.value==='sales';
    document.getElementById('logRecipe').closest('label').hidden=!production;
    document.getElementById('logGood').closest('label').hidden=production;
    document.getElementById('logAmount').closest('label').firstChild.textContent=production?'Produktionsmenge ':sales?'Verbleibender Absatzbestand ':'Zielbestand ';
    document.getElementById('logLimit').closest('label').firstChild.textContent=sales?'Mindestverkaufspreis (0 = frei) ':'Höchsteinkaufspreis (0 = frei) ';
  }
  if(el.dataset.storageRule){
    if(!el.checkValidity())return;
    cmd(el.dataset.storageRule==='limit'?'homeLimit':'homeReserve',{target:state.landed,good:el.dataset.good,amount:Number(el.value)});
  }
  if(event.target.id==='homeRecipe'){
    const recipe=RECIPES[event.target.value],preview=document.getElementById('homeRecipePreview');
    if(recipe&&preview)preview.innerHTML=recipeText(recipe)+` · ${recipe.time} s je Zyklus`;
  }
});
