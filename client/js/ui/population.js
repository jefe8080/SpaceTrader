import {state,myShips,esc,fmt} from '../state.js';
import {cmd} from '../net.js';
import {HOMEWORLD} from '/shared/homeworld.js';
import {CIVIL_GOODS,localDemandPerHour} from '/shared/local-demand.js';
import {FIXED,priceWindow,fixedPrice} from '/shared/property.js';
import {GOODS} from '/shared/config.js';
export function populationPanel(e){
  const h=e.market?.homeworld||e.market?.economy;if(!h?.workers)return '';
  const ships=myShips().filter(s=>s.dockedAt===e.id),source=ships.find(s=>s.passengers?.length)||ships[0];
  return `<div class="section"><h3>Bevölkerung und Reisen</h3><p>${h.population} Einwohner / ${h.housing} Wohnplätze · Qualifikationen: ${h.workers.basic} einfach, ${h.workers.skilled} Fachkräfte, ${h.workers.specialist} Spezialisten. Höchstens 60 % arbeiten gleichzeitig.</p>
    <p>Ziviles Konsumbudget: ${fmt(h.civil?.budget||0)} Cr · aktueller Zufluss nach Steuern: ${fmt((h.civil?.incomePerHour||0)*(1-(h.civil?.taxRate??.2)))} Cr/h.</p><p class="muted">Lokale Käufe werden durch dieses Budget begrenzt. Der Zufluss ist kein garantiertes Verkaufsvolumen.${e.market.economy?` Beschaffungs-/NPC-Kasse: ${fmt(e.market.economy.cash||0)} Cr.`:''}</p>
    <p>Besucher: ${(h.visitors||[]).reduce((n,v)=>n+v.n,0)} / ${h.visitorCapacity||0} Plätze · ${(h.visitors||[]).filter(v=>v.ready).reduce((n,v)=>n+v.n,0)} warten auf Abreise.</p>
    <p>Anwerbbare Personen verlassen ihren Herkunftsbestand. ${e.owner===state.me.id?'Eigener Standort: kostenlos.':'Anwerbung: 24 Cr je Kraft; Touristenaufnahme: 28 Cr je Person.'} Touristischer Aufenthalt: 20 Minuten, danach Abreise. Reisegeld und Aufenthalt werden einmalig abgerechnet.</p>
    ${ships.map(s=>`<p><b>${esc(s.name)}</b> · ${s.cargo?.workers||0} Arbeiter / ${s.cargo?.tourists||0} Touristen</p><div class="btnrow"><button class="small" data-act="personBoard" data-ent="${e.id}" data-ship="${s.id}" data-good="workers" data-dir="buy">10 Kräfte anwerben</button><button class="small" data-act="personBoard" data-ent="${e.id}" data-ship="${s.id}" data-good="tourists" data-dir="buy">10 Touristen aufnehmen</button><button class="small" data-act="personBoard" data-ent="${e.id}" data-ship="${s.id}" data-good="workers" data-dir="sell">Kräfte ansiedeln</button><button class="small" data-act="personBoard" data-ent="${e.id}" data-ship="${s.id}" data-good="tourists" data-dir="sell">Touristen aussteigen lassen</button></div>`).join('')}
    ${source&&ships.length>1?`<p>Umladen ab ${esc(source.name)}:</p>${ships.filter(s=>s.id!==source.id).map(s=>['workers','tourists'].map(g=>`<button class="small" data-act="personTransfer" data-from="${source.id}" data-to="${s.id}" data-good="${g}">${g==='workers'?'Kräfte':'Touristen'} nach ${esc(s.name)}</button>`).join('')).join('')}`:''}
    ${h.civil?.purchaseLimited?'<p class="neg">Das zivile Konsumbudget begrenzt derzeit lokale Käufe; ungekaufte Waren bleiben im Lager.</p>':''}
    ${e.market.homeworld&&e.owner===state.me.id?homePrices(e,h):''}
    ${(h.visitors||[]).map(v=>`<p>${v.n} Besucher aus ${esc(state.entities.get(v.origin)?.name||v.origin)} · ${v.ready?'Abreisebereit':Math.max(0,Math.ceil((v.until-state.time)/60))+' min Aufenthalt'} · Aufenthalt bezahlt: ${fmt(v.stayPaid||0)} Cr</p>`).join('')}</div>`;
}
function homePrices(e,h){
  const prop=state.props.get(e.id)||{fixed:{}};
  return '<h4>Lokale Nachfrage und Preise</h4>'+CIVIL_GOODS.map(g=>{
    const slot=e.market.goods[g],sv=prop.fixed?.[g]??FIXED.DEFAULT,{pmin,pmax}=priceWindow(g,slot?.mod||1);
    const need=HOMEWORLD.population.needPerHour[g]??HOMEWORLD.population.comfortPerHour[g]*Math.min(1,h.population/1000);
    return `<p>${GOODS[g].name}: ${fixedPrice(pmin,pmax,sv).toFixed(1)} Cr · ${localDemandPerHour(g,slot,prop,h.population*need/3600).toFixed(1)} Einheiten/h ${[.3,.5,.7].map(s=>`<button class="small" data-act="civilPrice" data-ent="${e.id}" data-good="${g}" data-price="${s}">${s===.3?'Günstig':s===.5?'Mittel':'Hoch'}</button>`).join('')}</p>`;
  }).join('');
}
export function handlePopulationAction(d){
  if(d.act==='civilPrice'){cmd('propFixed',{target:d.ent,good:d.good,s:Number(d.price)});return true;}
  if(d.act==='personBoard'){cmd('trade',{ship:d.ship,target:d.ent,good:d.good,dir:d.dir,amount:d.dir==='buy'?10:'max'});return true;}
  if(d.act==='personTransfer'){cmd('passengerTransfer',{from:d.from,to:d.to,good:d.good,amount:1000000});return true;}
  return false;
}
