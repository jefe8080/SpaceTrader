import { GOODS, canBuyFrom, canSellTo } from '/shared/config.js';
import { state, esc, selectedShips, fleetOrder } from '../state.js';
import { cmd } from '../net.js';
import { typeName, playerPrice, flightSecs, fmtDuration, systemName, sectorName, dist } from '../util.js';
import { $, registerModal, openModal, closeModal, isOpen, toast } from './dom.js';
import { orderShips, orderBuy } from './orders.js';
import { openRouteEditor, addStopToRoute } from './routes.js';
import { storagePrice } from './property.js';
import { extraSubs } from './subs.js';
import { bus } from './bus.js';
import { defaultTradeView, filterTradeRows, reconcileTradeRows } from './tradeModel.js';

const card=$('favCard'), view=defaultTradeView();
let rowIds=null, initialized=false;
export const sectorOf=e=>sectorName(e);
export const systemOf=e=>systemName(e);
const number=v=>Number.isFinite(v)?v.toLocaleString('de-DE',{maximumFractionDigits:1}):'unbekannt';
const options=(items,value)=>items.map(([id,label])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(label)}</option>`).join('');
function quote(e,g,dir) {
  const slot=e.market?.goods?.[g];
  if(!slot || (state.homeworld && GOODS[g]?.cls==='passenger') || !Number.isFinite(slot.stock)||!Number.isFinite(slot.cap))return null;
  const own=e.owner===state.me?.id, member=!own && state.props.get(e.id)?.cons;
  if(own)return 0;
  if(member)return storagePrice(e,g);
  if(!(dir==='buy'?canBuyFrom(slot):canSellTo(slot)))return null;
  const customs=e.owner?(e.market.customs||0):0;
  const price=playerPrice(e,g,dir)*(dir==='buy'?1+customs:1-customs);
  return Number.isFinite(price)?price:null;
}
function rows() {
  const ship=state.ships.get(view.ship);
  return [...state.entities.values()].filter(e=>['planet','station'].includes(e.kind)).map(e=>{
    const slot=e.market?.goods?.[view.good];
    const buy=view.good?quote(e,view.good,'buy'):null,sell=view.good?quote(e,view.good,'sell'):null;
    const stock=Number.isFinite(slot?.stock)?Math.floor(slot.stock):null;
    const demand=Number.isFinite(slot?.cap)&&stock!=null?Math.max(0,Math.floor(slot.cap-slot.stock)):null;
    return {id:e.id,e,name:e.name,kind:e.kind,type:typeName(e),system:systemOf(e),sector:sectorOf(e),favorite:!!state.favorites[e.id],hasGood:!!slot,
      distance:ship?dist(ship,e):null,time:ship?flightSecs(ship,e):null,buy,sell,stock,demand,quantity:view.direction==='sell'?demand:view.direction==='buy'?stock:(buy!=null?stock:demand)};
  });
}
function shell() {
  const active=document.activeElement;
  const focusKey=card.contains(active)?active.dataset.filter:null;
  const scroll=card.closest('.trade-hub-card')?.scrollTop||0;
  const all=rows();
  const unique=k=>[...new Set(all.map(r=>r[k]))].sort().map(s=>[s,s]);
  const sorts=[['name','Name'],['type','Ortstyp'],['system','System'],['sector','Sektor'],['distance','Entfernung'],['time','Flugzeit'],['buy','Einkaufspreis'],['sell','Verkaufspreis'],['quantity','Warenmenge']];
  card.innerHTML=`<div class="modal-head"><h2>Handel & Routen</h2><span class="spacer"></span><button data-f="close" aria-label="Handelsübersicht schließen">✕</button></div>
    <div class="trade-tabs"><button aria-current="page" data-trade-tab="places">Orte & Waren</button><button data-trade-tab="routes">Meine Routen</button></div>
    <div class="trade-filters">
      <label>Name <input data-filter="search" value="${esc(view.search)}" placeholder="Ort suchen"></label>
      <label>Ortstyp <select data-filter="type">${options([['','alle'],['planet','Planeten'],['station','Basen / Stationen']],view.type)}</select></label>
      <label>System <select data-filter="system">${options([['','alle'],...unique('system')],view.system)}</select></label>
      <label>Sektor <select data-filter="sector">${options([['','alle'],...unique('sector')],view.sector)}</select></label>
      <label>Ware <select data-filter="good">${options([['','keine'],...Object.entries(GOODS).filter(([,g])=>!state.homeworld||g.cls!=='passenger').sort((a,b)=>a[1].name.localeCompare(b[1].name)).map(([id,g])=>[id,g.name])],view.good)}</select></label>
      <label>Handelsrichtung <select data-filter="direction" ${view.good?'':'disabled'}>${options([['','alle'],['buy','Hier kaufen'],['sell','Hier verkaufen']],view.direction)}</select></label>
      <label>${view.direction==='sell'?'Mindestverkaufspreis':'Max. Einkaufspreis'} <input data-filter="price" type="number" min="0" step="0.1" value="${esc(view.price)}" ${view.good&&view.direction?'':'disabled'}></label>
      <label>Mindestmenge <input data-filter="quantity" type="number" min="0" value="${esc(view.quantity)}" ${view.good?'':'disabled'}></label>
      <label><input data-filter="favorites" type="checkbox" ${view.favorites?'checked':''}> Nur Favoriten</label>
      <label><input data-filter="pin" type="checkbox" ${view.pin?'checked':''}> Favoriten oben</label>
      <label>Referenzschiff <select data-filter="ship">${options([['','ohne Schiff'],...fleetOrder().map(s=>[s.id,s.name])],view.ship)}</select></label>
      <label>Sortierung <select data-filter="sort">${sorts.map(([id,label])=>`<option value="${id}" ${id===view.sort?'selected':''} ${!view.good&&['buy','sell','quantity'].includes(id)?'disabled':''}>${label}</option>`).join('')}</select></label>
      <button data-f="direction" aria-label="Sortierrichtung ändern">${view.descending?'↓ Absteigend':'↑ Aufsteigend'}</button>
      <button data-f="reset">Filter zurücksetzen</button><button data-f="refresh">Liste aktualisieren</button>
    </div><p class="muted">Planungspreise, kein garantierter Ausführungspreis. Flugzeit geschätzt mit bekannten Wurmlöchern und Sondergebieten; Treibstoff- und Wartezeiten können abweichen.</p>
    <p id="tradeStatus" role="status"></p><div class="trade-scroll"><table class="trade-table"><thead><tr><th>Favorit</th><th>Ort / Typ</th><th>System / Sektor</th><th>Entfernung</th><th>Flugzeit</th><th>Einkauf</th><th>Verkauf</th><th>Menge</th><th>Aktionen</th></tr></thead><tbody id="tradeRows"></tbody></table></div><div id="favBuy" class="inline-form" hidden></div>`;
  rowIds=null;
  update(true);
  if(focusKey)card.querySelector(`[data-filter="${focusKey}"]`)?.focus({preventScroll:true});
  if(card.closest('.trade-hub-card'))card.closest('.trade-hub-card').scrollTop=scroll;
}
function rowHtml(r) {
  return `<tr data-place="${esc(r.id)}"><td><button data-f="star" data-id="${r.id}" aria-label="Favorit ${esc(r.name)} umschalten" aria-pressed="${r.favorite}">${r.favorite?'★':'☆'}</button></td>
  <td><button data-f="show" data-id="${r.id}">${esc(r.name)}</button><div class="muted">${esc(r.type)}</div><details><summary>Details & Notiz</summary><p>${esc(r.e.ownerName||'NPC')}</p><label>Notiz <input class="fav-note" data-id="${r.id}" maxlength="120" value="${esc(state.favorites[r.id]?.note||'')}" placeholder="Notiz speichern markiert als Favorit"></label></details></td>
  <td>${esc(r.system)}<br><span class="muted">${esc(r.sector)}</span></td>
  <td data-value="distance"></td><td data-value="time"></td><td data-value="buy"></td><td data-value="sell"></td><td data-value="quantity"></td>
  <td><button data-f="fly" data-id="${r.id}" ${view.ship?'':'disabled'}>Anfliegen</button><details><summary>Aktionen</summary><div class="trade-actions"><button data-f="buy" data-id="${r.id}">Einkauf einreihen</button><button data-f="show" data-id="${r.id}">Karte & Handel</button><button data-f="route" data-id="${r.id}">Neue Route ab hier</button><label>Zu Route hinzufügen <select data-f="toRoute" data-id="${r.id}"><option value="">Route wählen</option><option value="draft">Offener / neuer Entwurf</option>${[...state.routes.values()].map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></label></div></details></td></tr>`;
}
function update(explicit=false) {
  if(!initialized){view.ship=selectedShips()[0]?.id||'';initialized=true;}
  const all=rows(), byId=new Map(all.map(r=>[r.id,r]));
  const filtered=filterTradeRows(all,view), result=reconcileTradeRows(rowIds,filtered,explicit);
  rowIds=result.ids;
  extraSubs.favorites=new Set(all.map(r=>r.id));
  if(explicit) $('tradeRows').innerHTML=rowIds.map(id=>rowHtml(byId.get(id))).join('');
  for(const tr of $('tradeRows').children){
    const r=byId.get(tr.dataset.place);
    for(const button of tr.querySelectorAll('button'))button.disabled=!r || (button.dataset.f==='fly' && !view.ship);
    for(const cell of tr.querySelectorAll('[data-value]')) {
      const k=cell.dataset.value,v=r?.[k];
      cell.textContent=!view.good&&['buy','sell','quantity'].includes(k)?'—':k==='time'?(v==null?'unbekannt':fmtDuration(v)):number(v);
    }
    const star=tr.querySelector('[data-f="star"]');star.textContent=r?.favorite?'★':'☆';star.setAttribute('aria-pressed',String(!!r?.favorite));
  }
  const count=Object.entries(view).filter(([k,v])=>['search','type','system','sector','good','direction','price','quantity','favorites'].includes(k)&&v!==''&&v!==false).length;
  $('tradeStatus').textContent=`${rowIds.length} Orte · ${count} aktive Filter${result.pending?' · Aktualisierte Reihenfolge / Treffer verfügbar – Liste aktualisieren':''}`;
  if(!rowIds.length){$('tradeStatus').append(' · Keine Treffer. ');const b=document.createElement('button');b.dataset.f='reset';b.textContent='Filter zurücksetzen';$('tradeStatus').append(b);}
}
card.addEventListener('input',ev=>{
  if(ev.target.dataset.filter==='search'){view.search=ev.target.value;update(true);}
});
card.addEventListener('change',ev=>{
  const el=ev.target,key=el.dataset.filter;
  if(key){view[key]=el.type==='checkbox'?el.checked:el.value;if(key==='good'&&!view.good){view.direction='';view.price='';view.quantity='';view.sort='name';}shell();return;}
  if(el.classList.contains('fav-note')){if(!state.favorites[el.dataset.id])cmd('favorite',{target:el.dataset.id,on:true});cmd('favoriteNote',{target:el.dataset.id,note:el.value.slice(0,120)});return;}
  if(el.dataset.f==='toRoute'&&el.value){addStopToRoute(el.value,el.dataset.id);el.value='';}
});
card.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-f]');if(!b||b.tagName==='SELECT')return;
  const e=state.entities.get(b.dataset.id), ship=state.ships.get(view.ship), ships=ship?[ship]:[];
  switch(b.dataset.f){
    case 'close':closeModal('favorites');return;
    case 'reset':Object.assign(view,defaultTradeView(),{ship:view.ship});shell();return;
    case 'refresh':update(true);return;
    case 'direction':view.descending=!view.descending;shell();return;
    case 'star':cmd('favorite',{target:e.id,on:!state.favorites[e.id]});return;
    case 'show':state.camera.x=e.x;state.camera.y=e.y;state.camera.zoom=Math.max(.12,state.camera.zoom);state.follow=null;closeModal('favorites');bus.select({kind:'entity',id:e.id});return;
    case 'fly':if(ship)orderShips(ships,e,ev.shiftKey);return;
    case 'route':openRouteEditor(null,{stops:[{targetId:e.id,actions:[]}],assign:ships.map(s=>s.id)});return;
    case 'buy':showBuy(e);return;
    case 'cancelBuy':$('favBuy').hidden=true;return;
    case 'doBuy':if(!ship)return toast('Referenzschiff auswählen.');orderBuy(ships,e,$('favBuyGood').value,Math.max(0,Math.floor(Number($('favBuyAmt').value)||0)),true);$('favBuy').hidden=true;return;
  }
});
function showBuy(e){
 const goods=Object.keys(e.market?.goods||{}).filter(g=>quote(e,g,'buy')!=null);
 if(!goods.length)return toast('Kein verfügbares Angebot.');
 const f=$('favBuy');f.hidden=false;f.innerHTML=`<b>Einkaufen bei ${esc(e.name)}</b><select id="favBuyGood">${options(goods.map(g=>[g,GOODS[g].name]),view.good)}</select><input id="favBuyAmt" type="number" min="0" placeholder="Menge (0 = max.)"><button data-f="doBuy" data-id="${e.id}">In Queue einreihen</button><button data-f="cancelBuy">Abbrechen</button>`;f.scrollIntoView({block:'nearest'});
}
registerModal('favorites',()=>{if(!$('tradeRows')){if(!initialized){view.ship=selectedShips()[0]?.id||'';initialized=true;}shell();}else update();},()=>extraSubs.favorites.clear(),{liveWhileTyping:true});
export const openFavorites=()=>openModal('favorites');
export const favoritesOpen=()=>isOpen('favorites');
