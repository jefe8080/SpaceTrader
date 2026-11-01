import { GOODS } from '/shared/config.js';
import { combatHistoryPage } from '/shared/combat-history.js';
import { state, esc, fmt } from '../state.js';
import { socket } from '../net.js';
import { $, registerModal, openModal, closeModal, setHtml, isOpen } from './dom.js';

const RESULTS={win:'Sieg',loss:'Niederlage',draw:'Unentschieden'};
const OUTCOMES={survived:'Überlebt',destroyed:'Zerstört',retreated:'Zurückgezogen',captive:'Gefangen genommen',captured:'Vom Gegner übernommen'};
let reports=[], page=0, revision=null, pending=false, generation=0, error='';
const list=values=>values?.length ? values.map(esc).join(', ') : 'Keine';
const loot=goods=>Object.entries(goods||{}).map(([g,n])=>`${fmt(n)} ${esc(GOODS[g]?.name||g)}`).join(', ')||'Keine';
const date=r=>r.endedAt ? new Date(r.endedAt).toLocaleString('de-DE') : 'Datum nicht erfasst';
const place=r=>r.location ? [r.location.planet?.name,r.location.sectorName||r.location.sector,`(${r.location.x}, ${r.location.y})`].filter(Boolean).join(' · ') : 'Ort nicht erfasst';

function detail(r) {
  let html=`<p>Spielzeit: ${fmt(r.t||0)} s · Dauer: ${r.duration==null?'Nicht erfasst':fmt(r.duration)+' s'} · ${r.kind==='raid'?'Überfall':r.kind==='battle'?'Schlacht':'Kampfart nicht erfasst'}</p><p>Endgrund: ${esc(r.why==='stalemate'?'Festgefahrene Schlacht':r.why|| (r.version===1 ? r.result==='draw'?'Keine Seite kampffähig':'Gegenseite nicht mehr kampffähig':'Nicht erfasst'))}</p>`;
  if(r.version!==1)html+='<p class="muted">Unvollständiger Altbericht. Fehlende Angaben wurden nicht erfasst. Nicht in der Gesamtstatistik enthalten.</p>';
  for(const side of ['A','B']) {
    const ships=(r.ships||[]).filter(s=>s.side===side);
    if(!ships.length)continue;
    html+=`<h4>${side==='A'?'Angreifende':'Verteidigende'} Seite${r.side===side?' (deine Seite)':''}</h4><ul>`;
    html+=ships.map(s=>`<li><b>${esc(s.name)}</b> (${esc(s.typeName||s.type)}) · ${esc(s.ownerName||s.owner)} · Fraktion: ${esc(s.factionName||'Keine')} · ${esc(OUTCOMES[s.outcome]||'Nicht erfasst')}</li>`).join('')+'</ul>';
  }
  html+=`<div class="kv"><span>Eigene Verluste</span><span>${list(r.lost)}</span><span>Gefangene Schiffe</span><span>${list(r.prisoners)}</span><span>Erbeutete Schiffe</span><span>${list(r.captured)}</span><span>Eigene Rückzüge</span><span>${list(r.retreated)}</span><span>Eigene Beute</span><span>${loot(r.loot)}</span></div>`;
  return html;
}

function renderReports() {
  const view=combatHistoryPage(reports,$('combatSearch').value,$('combatResult').value,page);page=view.page;
  let html=pending&&!reports.length?'<p role="status">Kampfberichte werden geladen …</p>':'';
  if(error)html+=`<p role="alert">${esc(error)} <button data-history-retry>Erneut laden</button></p>`;
  html+=`<p>${view.total} Berichte · Seite ${page+1} von ${view.pages}</p>`;
  if(!view.total&&!pending)html+='<p>Keine passenden Kampfberichte vorhanden.</p>';
  html+=view.reports.map(r=>`<details class="combat-report" data-disclosure="combat-${esc(r.battle)}"><summary>${esc(RESULTS[r.result]||r.result)} · ${esc(date(r))} · ${esc(place(r))} · ${list(r.enemies)}${r.version!==1?' · Altbericht':''}</summary>${detail(r)}</details>`).join('');
  html+=`<div class="btnrow"><button data-history-page="-1" ${page===0?'disabled':''}>Zurück</button><button data-history-page="1" ${page+1>=view.pages?'disabled':''}>Weiter</button></div>`;
  setHtml($('combatReports'),html);
}

function loadReports() {
  if(pending||!socket.connected)return;
  pending=true;error='';const request=++generation, player=state.me?.id, requestedRevision=state.war?.historyRevision;
  socket.timeout(10000).emit('combatHistory',{},(err,data)=>{
    if(request!==generation||player!==state.me?.id)return;
    pending=false;
    if(err||!data||data.player!==player)error='Kampfberichte konnten nicht geladen werden.';
    else {reports=data.reports;revision=requestedRevision;}
    if(isOpen('combatHistoryModal'))renderReports();
  });
}

function render() {
  const s=state.war?.combatStats;
  if(!s){setHtml($('combatStatistics'),'<p>Statistiken werden geladen …</p>');return;}
  const labels={total:'Kämpfe',win:'Siege',loss:'Niederlagen',draw:'Unentschieden',destroyed:'Eigene Schiffe zerstört',enemyDestroyed:'Gegnerische Schiffe zerstört',lost:'Eigene Schiffe übernommen',captured:'Erbeutete Schiffe',captive:'Eigene Schiffe gefangen',prisoners:'Gegnerische Schiffe gefangen',retreated:'Eigene Schiffe zurückgezogen'};
  setHtml($('combatStatistics'),`<p class="muted">Erfassung seit ${esc(new Date(s.since).toLocaleString('de-DE'))}. Summen bleiben auch nach Entfernung alter Berichte erhalten. Verbündete Verluste zählen nicht als eigene.</p><div class="kv">${Object.entries(labels).map(([k,label])=>`<span>${label}</span><span>${fmt(s[k]||0)}</span>`).join('')}<span>Gesamte Warenbeute</span><span>${loot(s.loot)}</span></div><p class="muted">Die letzten 500 eigenen Kämpfe bleiben gespeichert. Ältere Berichte können unvollständig sein.</p>`);
  if(revision!==state.war.historyRevision&&!error)loadReports();
  renderReports();
}

registerModal('combatHistoryModal',render);
$('btnCombatHistory').onclick=()=>{
  generation++;pending=false;reports=[];revision=null;error='';page=0;
  $('combatSearch').value='';$('combatResult').value='';$('combatHistoryDisclosure').open=false;
  $('combatReports').innerHTML='';delete $('combatReports')._html;
  openModal('combatHistoryModal');
};
$('combatHistoryModal').querySelector('[data-close]').onclick=()=>closeModal('combatHistoryModal');
for(const id of ['combatSearch','combatResult'])$(id).addEventListener('input',()=>{page=0;renderReports();});
$('combatReports').addEventListener('click',ev=>{
  const button=ev.target.closest('[data-history-page]');
  if(button){page+=Number(button.dataset.historyPage);renderReports();}
  if(ev.target.closest('[data-history-retry]')){loadReports();renderReports();}
});
