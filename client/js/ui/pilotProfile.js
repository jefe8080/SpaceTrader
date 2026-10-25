import { FACTIONS, RANKS, RANK_NAMES, factionRank } from '/shared/config.js';
import { mainShip } from '/shared/planet-access.js';
import { state, esc, fmt } from '../state.js';
import { $, registerModal, openModal, closeModal, setHtml } from './dom.js';

function renderProfile(){
  const p=state.profile, flagship=mainShip({...state.me,relic:state.relic},state.ships);
  if(!p)return;
  let html=`<h3>${esc(state.me.name)}</h3><div class="kv"><span>Level / EP</span><span>${state.level} / ${fmt(state.xp)}</span><span>Pilotenlizenz / Gouverneursstufe</span><span>P${state.pilot} / ${state.governor}</span><span>Credits</span><span>${fmt(state.credits)} Cr</span><span>Handelsumsatz</span><span>${fmt(p.revenue)} Cr</span><span>Handelsgewinn</span><span>${p.profit==null?'Unvollständig – Einkaufskosten fehlen':fmt(p.profit)+' Cr'}</span></div>`;
  if(p.profit==null)html+=`<p>Bekannter Gewinnanteil: ${fmt(p.knownProfit)} Cr. Für ${fmt(p.unknownRevenue)} Cr Verkaufserlös sind die Einkaufskosten unbekannt.</p>`;
  html+='<p class="muted">Handelswerte seit Einführung erfasst. Nur realisierte Warenverkäufe; Käufe werden erst beim Verkauf als Kosten berücksichtigt. Unbekannte Einkaufskosten bleiben offen.</p><h3>Fraktionsruf</h3>';
  for(const [id,faction] of Object.entries(FACTIONS)){
    const points=state.rep?.[id]||0,rank=factionRank(points),next=RANKS[rank+1];
    html+=`<p><b>${esc(faction.name)}</b> · ${RANK_NAMES[rank]} · ${fmt(points)} Punkte</p>${next==null?'<p>Höchster Rang erreicht</p>':`<progress aria-label="${esc(faction.name)} Ruf" max="${next-RANKS[rank]}" value="${points-RANKS[rank]}"></progress><p>${fmt(next-points)} Punkte bis ${RANK_NAMES[rank+1]}</p>`}`;
  }
  html+=`<h3>Erfolge und Besitz</h3><div class="kv"><span>Entdeckte Systeme / Planeten</span><span>${p.systems} / ${p.planets}</span><span>Abgeschlossene Missionen</span><span>${p.missions}</span><span>Gewonnene Kämpfe</span><span>${p.battlesWon==null?'Nicht erfasst':p.battlesWon}</span><span>Eigene Schiffe / Planeten</span><span>${p.ships} / ${p.worlds.length}</span><span>Hauptschiff</span><span>${flagship?'♛ '+esc(flagship.name):'Kein Antrieb eingebaut'}</span></div>`;
  html+=p.worlds.map(world=>`<p>${esc(world.name)}</p>`).join('');
  setHtml($('pilotInfoBody'),html);
}
registerModal('pilotInfoModal',renderProfile);
$('pilotInfoModal').querySelector('[data-close]').onclick=()=>closeModal('pilotInfoModal');
$('btnPilotInfo').onclick=()=>openModal('pilotInfoModal');
