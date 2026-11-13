import {GOODS} from '/shared/goods.js';
import {state,esc,fmt,myShips} from '../state.js';
import {socket} from '../net.js';
import {$,registerModal,openModal,closeModal,setHtml} from './dom.js';
import {bus} from './bus.js';
import {productionPlanningPanel,planningClick} from './productionPlanning.js';
import {settlementPlanningPanel,settlementChange} from './settlementPlanning.js';
const overlay=document.createElement('div');overlay.id='economyModal';overlay.className='overlay';overlay.hidden=true;
overlay.innerHTML='<section class="card planning-card" role="dialog" aria-modal="true" aria-labelledby="economyTitle"><div class="panel-head"><h2 id="economyTitle">Wirtschaft und Planung</h2><button data-close>Schließen</button></div><div id="economyBody"></div></section>';document.body.append(overlay);
let data=null;
const opts=rows=>rows.map(([id,label])=>`<option value="${esc(id)}">${esc(label)}</option>`).join('');
const placeName=id=>state.entities.get(id)?.name||id||'–';
function load(){socket.emit('economicView',{},r=>{data=r;render();});}
function render(){
 if(!data){setHtml($('economyBody'),'<p role="status">Wirtschaftsdaten werden geladen …</p>');load();return;}
 const places=[...state.entities.values()].filter(e=>e.market);
 setHtml($('economyBody'),`<p>${esc(data.notice)}</p><details open data-disclosure="trade-quote"><summary>Mengenbezogene Handelsvorschau</summary><p>Die Vorschau nutzt das ausgewählte Schiff mit seiner aktuellen Ladung. Du kannst einen bekannten Markt prüfen, bevor du ihn anfliegst.</p><div class="planning-fields"><label>Schiff<select id="quoteShip">${opts(myShips().map(s=>[s.id,s.name]))}</select></label><label>Markt<select id="quoteTarget">${opts(places.map(e=>[e.id,e.name]))}</select></label><label>Ware<select id="quoteGood">${opts(Object.entries(GOODS).filter(([,d])=>d.cls!=='passenger').map(([g,d])=>[g,d.name]))}</select></label><label>Richtung<select id="quoteDir"><option value="sell">Verkaufen / Einlagern</option><option value="buy">Kaufen / Entnehmen</option></select></label><label>Menge<input id="quoteAmount" type="number" min="1" max="10000" value="20"></label></div><button data-quote>Vorschau berechnen</button><button data-market>Markt und Verlauf öffnen</button><div id="quoteResult" role="status"></div></details><h3>Geschäftsbuch</h3><div class="planning-fields"><label>Zeitraum<select id="ledgerTime"><option value="3600">Letzte Spielstunde</option><option value="86400">Letzte 24 Spielstunden</option><option value="0">Gesamte erfasste Historie</option></select></label><label>Schiff<select id="ledgerShip"><option value="">Alle</option>${opts(myShips().map(s=>[s.id,s.name]))}</select></label><label>Standort<select id="ledgerPlace"><option value="">Alle</option>${opts(places.map(e=>[e.id,e.name]))}</select></label></div><button data-refresh>Aktualisieren</button><div id="ledgerRows"></div>`);
 if(!$('planWorld'))$('economyBody').insertAdjacentHTML('afterbegin',productionPlanningPanel());
 if(!$('economyBody').querySelector('[data-disclosure="settlement-planning"]'))$('economyBody').insertAdjacentHTML('beforeend',settlementPlanningPanel());
 ledger();
}
function ledger(){
 if(!data)return;const value=id=>$(id)?.value,window=Number(value('ledgerTime'));
 const rows=data.ledger.filter(r=>(!window||r.time>=data.time-window)&&(!value('ledgerShip')||r.ship===value('ledgerShip'))&&(!value('ledgerPlace')||r.place===value('ledgerPlace')));
 const sums={};for(const r of rows)sums[r.category]=(sums[r.category]||0)+r.amount;
 $('ledgerRows').innerHTML=`<p>Erfasste Geldbewegung: <b>${fmt(rows.reduce((n,r)=>n+r.amount,0))} Cr</b> · kein Gesamtgewinn. Andere, noch nicht erfasste Kontobewegungen können fehlen.</p>${Object.entries(sums).map(([k,n])=>`<p>${esc(k)}: ${fmt(n)} Cr</p>`).join('')}<p>${rows.length} Buchungsgruppen; die jüngsten 250 werden unten angezeigt. Maximal 5.000 Gruppen werden gespeichert.</p><table class="market"><tr><th>Spielzeit</th><th>Vorgang / Ort</th><th>Ware</th><th>Geld</th></tr>${rows.slice(-250).reverse().map(r=>`<tr><td>${(r.time/3600).toFixed(2)} h</td><td>${esc(r.category)}<br>${esc(placeName(r.place))}</td><td>${esc(GOODS[r.good]?.name||'–')} ${r.units?fmt(r.units):''}</td><td>${fmt(r.amount)} Cr</td></tr>`).join('')}</table>`;
}
overlay.addEventListener('change',e=>{settlementChange(e);if(e.target.id.startsWith('ledger'))ledger();});
overlay.addEventListener('click',e=>{
 planningClick(e,overlay);
 if(e.target.closest('[data-close]')){closeModal('economyModal');return;}
 if(e.target.closest('[data-refresh]')){load();return;}
 if(e.target.closest('[data-market]')){const target=$('quoteTarget').value;closeModal('economyModal');bus.select({kind:'entity',id:target});return;}
 if(e.target.closest('[data-quote]')){
  $('quoteResult').textContent='Vorschau wird berechnet …';
  socket.emit('tradePreview',{ship:$('quoteShip').value,target:$('quoteTarget').value,good:$('quoteGood').value,dir:$('quoteDir').value,amount:Number($('quoteAmount').value)},r=>{
   $('quoteResult').innerHTML=r.error?`<p>${esc(r.error)}</p>`:`<p><b>${r.n} / ${r.requested} Einheiten · ${fmt(r.total)} Cr</b>${r.reason?' · '+esc(r.reason):''}</p><p>Kostenbasis: ${r.knownCost==null?'unbekannt / unvollständig':fmt(r.knownCost)+' Cr'} · Reisekosten: ${r.fuelCost===0?'treibstofffrei':'unbekannt, Anflug separat planen'}</p>${r.knownCost!=null?'<p>Erwarteter Warenbeitrag vor Reise und Investitionen: '+fmt(r.total-r.knownCost)+' Cr</p>':''}<p>Stand Spielzeit ${(r.time/3600).toFixed(2)} h. ${esc(r.notice)}</p>`;
  });
 }
});
registerModal('economyModal',render,()=>{data=null;},{live:false});
$('btnEconomy').onclick=()=>openModal('economyModal');
