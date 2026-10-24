import {GOODS,RECIPES} from '../shared/goods.js';
import {freeFor,canBuyFrom,canSellTo,buyPrice,sellPrice} from '../shared/config.js';
import {availableHomeStock} from '../shared/homeworld.js';
import {pointCovered,coveredPath,controlAdmissionCapacity} from './coverage.js';

const terminal=o=>['delivered','cancelled'].includes(o.state);
const moduleFor={supply:'dispatch',production:'production',sales:'sales'};
const init=h=>(h.logistics||={next:0,orders:[],jobs:[]});
const activeModule=(h,id)=>h.allocations?.some(a=>a.id===`control:${id}:0`&&a.state==='active');
const reason=(o,text)=>{o.reason=text;o.state='paused';};
const reservedKey=j=>`logistics:${j.id}`;

// Credits leave the spendable account at acceptance. Only actual purchases consume
// the escrow; unused funds return exactly once at completion or cancellation.
export function createLogistics(game,player,entity,spec){
  const h=entity.market?.homeworld;
  if(h?.owner!==player.id||!pointCovered(game,player,entity)&&game.ships.get(player.manualShip)?.dockedAt!==entity.id)return 'Eigene Abdeckung oder manuelle Anwesenheit erforderlich.';
  if(h.warp)return 'Standort ist im Warptransfer.';
  if(!h.controlModules?.[moduleFor[spec.kind]])return 'Das passende Leitstellenmodul fehlt.';
  const l=init(h);
  if(l.orders.filter(o=>!terminal(o)).length>=100)return 'Höchstens 100 offene Leitstellenaufträge pro Standort.';
  if(spec.kind==='production'&&l.orders.some(o=>o.kind==='production'&&o.recipe===spec.recipe&&o.state!=='cancelled'))return 'Für dieses Rezept besteht bereits ein Produktionsziel. Zuerst abbrechen.';
  if(spec.kind==='production'&&!RECIPES[spec.recipe])return 'Unbekanntes Rezept.';
  if(spec.kind==='production'&&!h.controlModules?.dispatch)return 'Produktionsversorgung benötigt zusätzlich die Disposition.';
  if(spec.kind!=='production'&&(!GOODS[spec.good]||GOODS[spec.good].cls==='passenger'))return 'Eine Handelsware auswählen.';
  if(!spec.ships.length||spec.ships.some(s=>s.owner!==player.id||s.relicSpeed||game.shipOffers.has(s.id)))return 'Eigene reguläre, nicht angebotene Schiffe zuweisen.';
  const escrow=spec.budget+spec.emergency;
  if(player.credits-escrow<(player.stopLoss||0))return 'Budget und Zusatzfreigabe überschreiten den freien Kontostand.';
  const allowed=spec.locations.map(e=>e.id);
  if(!allowed.length)return 'Mindestens einen erlaubten Standort auswählen.';
  player.credits-=escrow;
  const o={id:`order_${++l.next}`,kind:spec.kind,good:spec.kind==='production'?undefined:spec.good,recipe:spec.kind==='production'?spec.recipe:undefined,target:spec.amount,limit:spec.limit,priority:spec.priority,
    locations:allowed,ships:spec.ships.map(s=>s.id),budget:spec.budget,emergency:spec.emergency,escrow,spent:0,delivered:0,cycles:0,state:'planned',created:game.time};
  l.orders.push(o);return null;
}

function release(game,j){
  const source=game.world.entities.get(j.source);
  if(source?.market?.homeworld)delete source.market.homeworld.reservations[reservedKey(j)];
}
function refund(player,o){if(o.escrow){player.credits+=o.escrow;o.escrow=0;}}
export function cancelLogistics(game,player,entity,id){
  const h=entity.market?.homeworld;
  if(h?.owner!==player.id||!pointCovered(game,player,entity)&&game.ships.get(player.manualShip)?.dockedAt!==entity.id)return 'Eigene Abdeckung oder manuelle Anwesenheit erforderlich.';
  const l=init(h),o=l.orders.find(o=>o.id===id);if(!o)return 'Unbekannter Auftrag.';
  for(const j of l.jobs.filter(j=>j.order===id&&!terminal(j))){
    release(game,j);j.state='cancelled';const s=game.ships.get(j.ship);
    if(s){s.queue=s.queue.filter(c=>c.logistics!==j.id);if(s.transit){s.queue.unshift({t:'goto',target:s.transit.exit,viaWh:true});}else if(s.coverageLeg){s.queue.unshift({t:'move',...s.coverageLeg});}delete s.logisticsJob;delete s.nav;}
  }
  refund(player,o);o.state='cancelled';o.reason='Abgebrochen; bereits geladene Ware bleibt auf dem Schiff.';
  delete h.reservations[`production:${o.id}`];
}

function pending(game,good,source){
  let n=0;
  for(const e of game.world.entities.values())for(const j of e.market?.homeworld?.logistics?.jobs||[])if(!terminal(j)&&j.good===good&&j.source===source&&j.phase==='collect')n+=j.amount;
  return n;
}
function incoming(l,o,good){return l.jobs.filter(j=>(o.kind==='sales'?j.order===o.id:j.destination!==j.source&&l.orders.find(o=>o.id===j.order)?.kind!=='sales')&&j.good===good&&!terminal(j)).reduce((sum,j)=>sum+(j.loaded??j.amount),0);}
function pathOK(game,p,a,b){return pointCovered(game,p,a)&&pointCovered(game,p,b)&&Number.isFinite(coveredPath(game,p,a,b).time);}

export function tickLogistics(game,entity){
  const h=entity.market.homeworld,l=init(h),p=game.players.get(h.owner);if(!p)return;
  l.jobs=[...l.jobs.filter(j=>!terminal(j)),...l.jobs.filter(terminal).slice(-100)];
  // Reconcile commands replaced by direct orders, sales or ship transfers. Never
  // remove the physical cargo when abandoning a reservation.
  for(const j of l.jobs.filter(j=>!terminal(j))){
    const s=game.ships.get(j.ship);
    if(!s||s.owner!==p.id||!s.queue.some(c=>c.logistics===j.id)){release(game,j);j.state='cancelled';j.reason='Transport wurde anderweitig beauftragt; Fracht bleibt erhalten.';if(s)delete s.logisticsJob;}
  }
  const sorted=l.orders.filter(o=>!terminal(o)).sort((a,b)=>b.priority-a.priority||a.created-b.created);
  for(const o of sorted){
    if(o.retryAt>game.time)continue;
    if(o.kind==='production'&&o.cycles>=Math.ceil(o.target/Object.values(RECIPES[o.recipe].out)[0])){o.state='delivered';refund(p,o);delete h.reservations[`production:${o.id}`];continue;}
    if(!activeModule(h,moduleFor[o.kind])){reason(o,'Funktionsmodul pausiert: Energie oder Fachkräfte fehlen.');continue;}
    if(h.warp){reason(o,'Standort im Warptransfer.');continue;}
    const needs=o.kind==='production'?Object.entries(RECIPES[o.recipe].in).map(([g,n])=>[g,n*Math.max(0,Math.ceil(o.target/Object.values(RECIPES[o.recipe].out)[0])-o.cycles)+(h.reserves[g]||0)]):[[o.good,o.target]];
    let gap=false,assigned=false;
    for(const [good,target] of needs){
      const stock=availableHomeStock(entity.market,good)+(h.reserves[good]||0)+(h.reservations[`production:${o.id}`]?.goods[good]||0);
      const amount=o.kind==='sales'?Math.max(0,availableHomeStock(entity.market,good)-target-incoming(l,o,good)):Math.max(0,target-stock-incoming(l,o,good));
      if(amount<1)continue;gap=true;
      for(const sid of o.ships){
        const s=game.ships.get(sid);
        if(!s||s.owner!==p.id||s.relicSpeed||s.queue.length||s.logisticsJob||game.shipOffers.has(s.id)||Object.values(s.cargo).some(n=>n>0))continue;
        const active=game.shipsOf(p.id).filter(s=>s.queue.length).length;
        if(active>=controlAdmissionCapacity(game,p))break;
        const candidates=o.locations.map(id=>game.world.entities.get(id)).filter(e=>e&&e.id!==entity.id&&e.market?.goods[good]&&game.isKnown(p,e));
        for(const other of candidates.sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))){
          const source=o.kind==='sales'?entity:other,dest=o.kind==='sales'?other:entity,slot=other.market.goods[good];
          if(!(o.kind==='sales'?canSellTo(slot):canBuyFrom(slot))&&game.ownership.get(other.id)?.player!==p.id)continue;
          const own=game.ownership.get(other.id)?.player===p.id;
          if(!own&&o.kind!=='sales'&&(buyPrice(good,slot)>o.escrow||o.limit&&buyPrice(good,slot)>o.limit))continue;
          if(!own&&o.kind==='sales'&&o.limit&&sellPrice(good,slot)<o.limit)continue;
          if(!pathOK(game,p,s,source)||!pathOK(game,p,source,dest))continue;
          const available=Math.max(0,availableHomeStock(source.market,good)-(source.market.homeworld?0:pending(game,good,source.id)));
          const n=Math.floor(Math.min(amount,available,freeFor(s,good)));if(n<1)continue;
          const j={id:`job_${++l.next}`,order:o.id,ship:s.id,source:source.id,destination:dest.id,good,amount:n,phase:'collect',state:'reserved',created:game.time};
          if(source.market.homeworld){source.market.homeworld.reservations||={};source.market.homeworld.reservations[reservedKey(j)]={goods:{[good]:n}};}
          l.jobs.push(j);s.logisticsJob={home:entity.id,id:j.id};s.queue=[{t:'logistics',home:entity.id,logistics:j.id}];o.state='reserved';delete o.reason;assigned=true;break;
        }
        if(assigned)break;
      }
      if(assigned)break;
    }
    if(!gap&&o.kind!=='production'&&!l.jobs.some(j=>j.order===o.id&&!terminal(j))){o.state='delivered';refund(p,o);}
    else if(!assigned&&!l.jobs.some(j=>j.order===o.id&&!terminal(j)))reason(o,o.kind==='production'?'Wartet auf Produktion oder zulässige Zutatenlieferung.':'Kein freies Schiff, zulässiger Bestand oder durchgängig abgedeckter Transportweg.');
    if(o.kind==='production'){
      const key=`production:${o.id}`;delete h.reservations[key];
      h.reservations[key]={goods:Object.fromEntries(needs.map(([g,n])=>[g,Math.min(n,availableHomeStock(entity.market,g))]))};
    }
  }
}

export function runLogistics(ship,c,dt,game,fly){
  const home=game.world.entities.get(c.home),l=home?.market?.homeworld?.logistics,j=l?.jobs.find(j=>j.id===c.logistics),o=l?.orders.find(o=>o.id===j?.order),p=game.players.get(ship.owner);
  if(!j||!o||terminal(j)||terminal(o)){if(j)release(game,j);delete ship.logisticsJob;return true;}
  const e=game.world.entities.get(j.phase==='collect'?j.source:j.destination);
  if(!e){release(game,j);reason(j,'Standort fehlt; Fracht bleibt erhalten.');reason(o,j.reason);return false;}
  if(!fly(ship,e,dt,game))return false;
  if(!pointCovered(game,p,e)){reason(j,'Eigene Leitstellenabdeckung fehlt.');reason(o,j.reason);return false;}
  ship.state='docked';
  if(j.phase==='collect'){
    j.state='collecting';o.state='collecting';
    release(game,j);
    const saved=p.credits;
    // The synchronous transaction sees only this order's money, preventing any
    // other purchase path from consuming it or the order from overspending.
    p.credits=o.escrow;
    let result;
    try{result=game.trade(ship,e,j.good,j.amount,'buy',o.kind==='sales'?0:o.limit,{manual:false});o.spent+=result.total||0;o.escrow=p.credits;}
    finally{p.credits=saved;}
    j.loaded=result.n||0;
    if(!j.loaded){j.state='cancelled';j.finished=game.time;o.retryAt=game.time+30;reason(o,result.reason||'Keine zulässige Abholung.');delete ship.logisticsJob;return true;}
    j.phase='deliver';j.state='intransit';o.state='intransit';return false;
  }
  const result=game.trade(ship,e,j.good,j.loaded,'sell',o.kind==='sales'?o.limit:0,{manual:false});
  j.loaded-=result.n||0;o.delivered+=result.n||0;
  if(j.loaded>0){
    reason(j,result.reason||'Ziel nimmt nur eine Teilmenge an; Restladung bleibt an Bord.');reason(o,j.reason);
    if(o.kind==='sales'&&(j.retryAt||0)<=game.time){
      j.retryAt=game.time+30;
      const alternative=o.locations.map(id=>game.world.entities.get(id)).find(a=>{
        const slot=a?.market?.goods[j.good];
        return a&&a.id!==e.id&&slot&&canSellTo(slot)&&slot.cap-slot.stock>=1&&(!o.limit||sellPrice(j.good,slot)>=o.limit)
          &&(a.market.economy?.cash||0)>=sellPrice(j.good,slot)&&pathOK(game,p,ship,a);
      });
      if(alternative){j.destination=alternative.id;j.state='intransit';o.state='intransit';delete ship.nav;}
    }
    return false;
  }
  j.state='delivered';j.finished=game.time;delete j.reason;delete ship.logisticsJob;o.state='planned';return true;
}

// A completed production goal keeps its recipe stopped until explicitly cancelled.
// Real recipe cycles, rather than elapsed time or stock changes, advance the goal.
export function productionGoal(market,recipe){return market.homeworld.logistics?.orders.find(o=>o.kind==='production'&&o.recipe===recipe&&o.state!=='cancelled');}
export function productionAllowed(market,recipe){const o=productionGoal(market,recipe);return !o||o.cycles<Math.ceil(o.target/Object.values(RECIPES[recipe].out)[0]);}
export function recordProduction(market,recipe){const o=productionGoal(market,recipe);if(o)o.cycles++;}
export function productionStock(market,good,recipe){const o=productionGoal(market,recipe);return availableHomeStock(market,good)+(o?market.homeworld.reservations[`production:${o.id}`]?.goods[good]||0:0);}
export function consumeProductionReservation(market,recipe){const o=productionGoal(market,recipe),r=o&&market.homeworld.reservations[`production:${o.id}`];if(r)for(const [g,n] of Object.entries(RECIPES[recipe].in))r.goods[g]=Math.max(0,(r.goods[g]||0)-n);}
