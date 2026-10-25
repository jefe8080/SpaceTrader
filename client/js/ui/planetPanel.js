// Planetare Ansicht: Kopfzeile und Gebäude-Panel (PRD-3 Kapitel 6). Weitere Gebäude (Unterhaltung, Schmuggler,
// Bettler, Hund, Schule) hängen sich über panelKinds ein.
import { GOODS, RECIPES, RECIPE_CATS, BUILDING, PLANET_TYPES, buildingUpgradeCost, factoryCost, factorySlots, recipeCat, effectiveLevel, recipeText } from '/shared/config.js';
import { state, fmt, esc, myShips } from '../state.js';
import { cmd } from '../net.js';
import { goodTag } from '../util.js';
import { $, setHtml, toast,confirmAction } from './dom.js';
import { stockBar } from './charts.js';
import { questBoardSection } from './quests.js';
import { scene, canLand, accessTo, resetPlanetside, selectBuilding, hidePlanetside } from '../planetside.js';
import { sfx } from '../audio.js';
import { homePanel } from './homeworld.js';
import {handleModuleAction} from './modules.js';
import { bus } from './bus.js';
import {handlePopulationAction} from './population.js';
import {propertySection,handlePropertyAction,specializationPanel} from './property.js';
import {handleColonyAction} from './colonies.js';

const bar = $('planetBar');
const panel = $('planetPanel');
/** Zusätzliche Gebäudearten: kind -> { render(it, e, ship), click(d, it, e, ship) } */
export const panelKinds = {};
let current = null; // gewähltes Gebäude

const shipsHere = (id) => myShips().filter((s) => s.dockedAt === id);
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
export function openBuilding(it) {
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
    if(['close','homeReplay','homeSite','homeWreck'].includes(button.dataset.pp))continue;
    if(lost){
      if(button.dataset.connectionDisabled===undefined)button.dataset.connectionDisabled=String(button.disabled);
      button.disabled=true;
    }else if(button.dataset.connectionDisabled!==undefined){
      button.disabled=button.dataset.connectionDisabled==='true';delete button.dataset.connectionDisabled;
    }
  }
}

export function renderPlanetUi() {
  const lost = state.landed && state.entities.get(state.landed)?.type==='ruins' && !accessTo(state.landed).manage;
  syncManagementControls(lost);
  if (!lost && panel.contains(document.activeElement) && document.activeElement.matches('input,select,textarea')) return;
  const e = state.landed && state.entities.get(state.landed);
  bar.hidden = !e;
  if (e && current) {
    current = scene.items.find(x => x.key === current.key) ?? null;
    if (!current) selectBuilding(null);
  }
  panel.hidden = !e || !current;
  document.body.classList.toggle('landed', !!e);
  if (!e) return;
  setHtml(bar, `<b>${esc(e.name)}</b> <span class="muted">${PLANET_TYPES[e.type].name} ${e.type==='ruins' ? (accessTo(e.id).local?'· Lokaler Zugang':accessTo(e.id).remote?'· Fernverbindung aktiv':'· Verbindung verloren – Verwaltung gesperrt'):''} · 2,5D · Ziehen: verschieben · Mausrad: Zoom</span>
    <select id="planetBuildingSelect" aria-label="Gebäude auswählen"><option value="">Gebäude auswählen</option>${scene.items.map(it => `<option value="${esc(it.key)}">${esc(it.label)}</option>`).join('')}</select>
    <button class="small" data-pp="overview">Übersicht</button>
    <button class="small" data-pp="leave">Zurück ins All <kbd>Esc</kbd></button>`);
  bar.querySelector('select').value = current?.key ?? '';
  if (!current) return;
  // Gebäude kann nach Änderungen (Abriss, Bau) neu nummeriert sein
  const it = current;
  current = it;
  const ship = shipsHere(e.id).find((s) => s.queue?.[0]?.t !== 'route') || shipsHere(e.id)[0];
  let body = '';
  if (e.type === 'ruins') body = homePanel(e, it, ship);
  else if (it.kind === 'questhouse') body = questBoardSection(e, ship, true)+(e.market.realEconomy?propertySection(e):'');
  else if (it.kind === 'produce' || it.kind === 'consume') body = goodBuilding(it, e);
  else if (it.kind === 'factory') body = factoryPanel(it, e);
  else if (it.kind === 'plot') body = plotPanel(it, e);
  else body = panelKinds[it.kind]?.render(it, e, ship) ?? '<div class="muted">Hier ist gerade nichts los.</div>';
  const expanded=new Set([...panel.querySelectorAll('details[open]')].map(d=>d.querySelector('summary')?.textContent));
  setHtml(panel, `<div class="panel-head"><h2>${esc(it.label)}</h2><span style="flex:1"></span><button class="small ghost" data-pp="close">✕</button></div>${body}`);
  syncManagementControls(lost);
  for(const details of panel.querySelectorAll('details'))if(expanded.has(details.querySelector('summary')?.textContent))details.open=true;
}

/** Produktions- und Verbrauchsgebäude: Ausbau (PRD-3 6.3) */
function goodBuilding(it, e) {
  const s = e.market.goods[it.good];
  if (!s) return '<div class="muted">Dieses Gebäude ist stillgelegt.</div>';
  if(e.market.realEconomy)return `<p>${GOODS[it.good].name}: ${fmt(s.stock)} / ${fmt(s.cap)} · tatsächliche Rate ${fmt(s.rate*3600)}/h</p>`+(state.props.get(e.id)?.manage?specializationPanel(e):'<p>Natürlicher Standort. Konkrete Spezialisierung kann der Besitzer ausbauen.</p>');
  const prop = state.props.get(e.id);
  const manage = !!prop?.manage;
  const lvl = e.market.bld?.lvl?.[it.good] || 0;
  const eff = effectiveLevel(lvl, !!e.owner);
  const max = manage ? BUILDING.MAX_OWNER : BUILDING.MAX_PUBLIC;
  const c = prop?.cons && manage ? cons() : null;
  const funds = c ? c.pool : state.credits;
  let h = `<div class="kv"><span>Ware</span><span>${goodTag(it.good)} · ${s.role === 'produce' ? 'Produktion' : 'Verbrauch'}</span>
    <span>Lager</span><span>${stockBar(s.stock, s.cap, s.role === 'produce' ? '#81c784' : '#ffb74d')} ${fmt(s.stock)} / ${fmt(s.cap)}</span>
    <span>Rate</span><span>${(s.rate * 3600).toLocaleString('de-DE', { maximumFractionDigits: 0 })} / h</span>
    <span>Gebäudelevel</span><span><b>${eff}</b>${eff < lvl ? ` <span class="muted">(gespeichert ${lvl}, ohne Besitz auf ${BUILDING.MAX_PUBLIC} gedeckelt)</span>` : ''} · Rate +${Math.round(BUILDING.RATE * eff * 100)} %, Lager +${Math.round(BUILDING.STORAGE * eff * 100)} %</span></div>`;
  if (lvl >= max) {
    h += `<div class="muted small-note">${max === BUILDING.MAX_PUBLIC ? `Level ${BUILDING.MAX_PUBLIC + 1} bis ${BUILDING.MAX_OWNER} nur für den Besitzer des Planeten.` : 'Höchstes Level erreicht.'}</div>`;
    return h;
  }
  const cost = buildingUpgradeCost(e, lvl + 1);
  const goods = Object.entries(cost.goods).map(([g, n]) => `<span class="${onBoard(e.id, g) >= n ? '' : 'neg'}">${n} ${GOODS[g].name}</span>`).join(', ');
  const ok = funds >= cost.credits && Object.entries(cost.goods).every(([g, n]) => onBoard(e.id, g) >= n);
  h += `<div class="sub-title">Ausbau auf Level ${lvl + 1}</div>
    <div>${fmt(cost.credits)} Cr${c ? ' aus dem Pool' : ''} + ${goods}</div>
    <div class="btnrow" style="margin-top:6px"><button class="small primary" data-pp="bld" ${ok ? '' : 'disabled'}>Ausbauen</button></div>
    <div class="muted small-note">Waren kommen aus den Laderäumen deiner hier angedockten Schiffe. Das Level gilt für alle Spieler. Keine Piloten-XP, der Planet erhält Questgeber-XP.</div>`;
  return h;
}

function factoryPanel(it, e) {
  const r = RECIPES[it.recipe];
  const manage = !!state.props.get(e.id)?.manage;
  return `<div class="kv"><span>Rezept</span><span>${recipeText(r)} (${r.time} s)</span><span>Lager</span><span>Zutaten und Produkte liegen im Planetenlager</span>
    <span>Status</span><span>${e.owner ? 'läuft, solange Zutaten da sind' : 'steht still (kein Besitz)'}</span></div>
    ${manage ? `<div class="btnrow" style="margin-top:6px"><button class="small danger" data-pp="demolish">Abreißen (ohne Erstattung)</button></div>` : ''}`;
}

function plotPanel(it, e) {
  if(e.market.realEconomy)return '<p>Verarbeitungsanlagen entstehen auf Ruinenwelten. Infrastruktur und Spezialisierung verwaltest du im Questhaus oder im Besitzpanel.</p>';
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
  const ship = shipsHere(e.id).find((s) => s.queue?.[0]?.t !== 'route') || shipsHere(e.id)[0];
  if (d.act === 'questAccept') { cmd('questAccept', { ship: d.ship, target: d.ent, quest: d.quest }); return; }
  switch (d.pp) {
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
    case 'homeModuleCraft':cmd('homeModuleCraft',{target:e.id,module:d.module,study:d.study==='true'});return;
    case 'homeTax':cmd('homeTax',{target:e.id,percent:Number(document.getElementById('homeTaxPercent')?.value)});return;
    case 'homeControlUpgrade': cmd('homeControlUpgrade',{target:e.id,module:d.module});return;
    case 'homeBuild': cmd('homeBuild', { target:e.id, kind:d.kind, recipe:d.kind==='plant'?document.getElementById('homeRecipe')?.value:undefined, parent:d.parent, plot:current?.plotIndex }); return;
    case 'homeRestore': cmd('homeRestore', { target:e.id, facility:d.facility }); return;
    case 'homeTrain': cmd('homeTrain', { target:e.id, qualification:d.qualification }); return;
    case 'homeReserve': cmd('homeReserve', { target:e.id, good:document.getElementById('homeReserveGood')?.value, amount:Number(document.getElementById('homeReserveAmount')?.value) }); return;
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
      return;
    }
    case 'homeReplay': state.homeDialogReplay = d.scene || 'H00'; return;
    case 'homeRepair': cmd('homeRepair', { target: e.id, facility: d.facility }); return;
    case 'homeQuest': cmd('homeQuestComplete', { target: e.id, quest: d.quest }); return;
    case 'homeTransfer': if (ship) cmd('trade', { ship: ship.id, target: e.id, good: d.good, dir: d.dir, amount: 'max' }); return;
    case 'close': closeBuilding(); return;
    case 'bld': cmd('bldUpgrade', { target: e.id, good: current.good }); return;
    case 'facBuild': if (confirm(`${RECIPES[d.recipe].name} bauen?`)) cmd('facBuild', { target: e.id, recipe: d.recipe }); return;
    case 'demolish': if (confirm('Fabrik abreißen? Es gibt keine Erstattung.')) { cmd('facDemolish', { target: e.id, index: current.index }); closeBuilding(); } return;
  }
  if (panelKinds[current?.kind]?.click?.(d, current, e, ship, ev)) renderPlanetUi();
});
bar.addEventListener('click', ev => {
  if (ev.target.closest('[data-pp=leave]')) leavePlanet();
  if (ev.target.closest('[data-pp=overview]')) closeBuilding(true);
});
bar.addEventListener('change', ev => {
  if (ev.target.id !== 'planetBuildingSelect') return;
  const it = scene.items.find(x => x.key === ev.target.value);
  if (it) openBuilding(it); else closeBuilding();
});
panel.addEventListener('change',event=>{
  if(event.target.id==='homeRecipe'){
    const recipe=RECIPES[event.target.value],preview=document.getElementById('homeRecipePreview');
    if(recipe&&preview)preview.innerHTML=recipeText(recipe)+` · ${recipe.time} s je Zyklus`;
  }
});
