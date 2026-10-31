import {GOODS,STATION_TYPES,freeFor} from '../shared/config.js';
import {stat} from './markets.js';

export const peopleOf=e=>e.market?.homeworld||e.market?.economy;
const total=w=>Object.values(w).reduce((a,b)=>a+b,0);
/** Persist the grant on each economic school, so upgrades and reloads cannot repeat it. */
export function grantSchoolStaff(h,schools){
  if(!h?.workers)return;
  for(const school of schools||[]){
    if(school.kind!=='school'||school.staffGranted)continue;
    h.population+=2;h.workers.skilled+=2;school.staffGranted=true;
  }
}
export function initializePopulation(e){
  if(e.type==='hotel'&&e.kind==='station'){
    const h=e.market.economy||=( {cash:0,rate:0,population:0} );
    h.population??=0;h.housing??=0;h.workers||={basic:0,skilled:0,specialist:0};h.visitors||=[];h.nextPassenger||=0;
    h.visitorCapacity??=Math.round(STATION_TYPES.hotel.consume.tourists*1200);
    e.market.goods.tourists||={role:'trade',rate:0,stock:0,cap:h.visitorCapacity,mod:1};
    updatePassengerOffers(e);return;
  }
  const h=peopleOf(e);if(!h||e.kind!=='planet')return;
  h.workers||={basic:Math.floor(h.population*.48),skilled:Math.floor(h.population*.12),specialist:0};
  if(!h.peopleRegistered){e.market.provenance||=[];e.market.provenance.push({id:`${e.id}:population`,source:'existing_population',amount:h.population});h.peopleRegistered=true;}
  grantSchoolStaff(h,e.type==='ruins'?(h.structures||[]).filter(s=>s.status==='ready'):h.infrastructure);
  h.housing??=Math.max(100,Math.ceil(h.population*1.2));h.visitors||=[];h.nextPassenger||=0;h.growthProgress||=0;
  h.visitorCapacity??=e.type==='resort'?50:0;
  for(const [g,n] of Object.entries({water:.2,food:.1})){
    e.market.goods[g]||={role:'consume',rate:0,stock:0,cap:Math.max(200,h.population*n*4),mod:1};
    if(e.type!=='ruins')e.market.goods[g].rate=h.population*n/3600;
  }
  if(e.type!=='ruins')for(const [g,n] of Object.entries({clothing:.02,medicine:.01,consumer:.01})){
    e.market.goods[g]||={role:'consume',rate:0,stock:0,cap:200,mod:1};
    e.market.goods[g].rate=h.population*n*Math.min(1,h.population/1000)/3600;
  }
  for(const good of ['workers','tourists'])e.market.goods[good]||={role:'trade',rate:0,stock:0,cap:0,mod:1};
  updatePassengerOffers(e);
}
function reservedWorkers(h){
  const r={basic:0,skilled:0,specialist:0};
  for(const p of h.projects||[])if(p.kind==='training')r[p.from]+=p.count;
  else if(!['module','study'].includes(p.kind))r.basic+=2;
  r.basic+=Object.values(h.facilities||{}).filter(b=>b.status==='building').length*2;
  if(h.workforce?.reserved)for(const q of Object.keys(r))r[q]=Math.max(r[q],h.workforce.reserved[q]||0);
  if(h.workforce?.used)for(const q of Object.keys(r))r[q]+=h.workforce.used[q]||0;
  return r;
}
export const residentDepartureCapacity=h=>Math.max(0,Math.floor(h.population-Math.ceil(total(reservedWorkers(h))/.6)));
export function updatePassengerOffers(e){
  const h=peopleOf(e);if(!h?.workers)return;
  const reserved=reservedWorkers(h),available=Object.keys(reserved).reduce((n,q)=>n+Math.max(0,h.workers[q]-reserved[q]),0),leave=residentDepartureCapacity(h);
  for(const g of ['workers','tourists']){
    const s=e.market.goods[g];if(!s)continue;
    s.rate=0;s.role='trade';s.cap=Math.max(h.population,h.visitorCapacity||0);
    s.stock=g==='workers'?Math.floor(Math.min(available,leave)):Math.floor(h.visitors.filter(v=>v.ready).reduce((n,v)=>n+v.n,0)+Math.min(leave,Math.max(0,h.population-total(h.workers))));
  }
}
function takeWorkers(h,n){
  const taken={basic:0,skilled:0,specialist:0},reserved=reservedWorkers(h);let left=n;
  for(const q of Object.keys(taken)){taken[q]=Math.min(left,Math.max(0,h.workers[q]-reserved[q]));h.workers[q]-=taken[q];left-=taken[q];}
  return taken;
}
function splitBatch(batch,n){
  const moved={...batch,n,workers:{basic:0,skilled:0,specialist:0},wallet:(batch.wallet||0)*n/batch.n};
  let left=n;
  for(const q of Object.keys(moved.workers)){moved.workers[q]=Math.min(left,batch.workers?.[q]||0);if(batch.workers)batch.workers[q]-=moved.workers[q];left-=moved.workers[q];}
  batch.n-=n;batch.wallet=(batch.wallet||0)-moved.wallet;return moved;
}
function cargoSync(ship){
  for(const g of ['workers','tourists']){const n=(ship.passengers||[]).filter(b=>b.kind===g).reduce((n,b)=>n+b.n,0);if(n)ship.cargo[g]=n;else delete ship.cargo[g];}
}
export function passengerTrade(game,ship,e,good,amount,dir,limit=0,free=false){
  initializePopulation(e);
  const h=peopleOf(e),p=game.players.get(ship.owner),prop=game.ownership.get(e.id);
  if(!p||ship.dockedAt!==e.id)return {n:0,reason:'Das eigene Schiff muss am Standort angedockt sein.'};
  if(!h||!(e.kind==='planet'||e.type==='hotel'))return {n:0,reason:'Dieser Standort hat keine touristischen Gästeplätze. Touristen können auf Paradieswelten und in Orbitalhotels untergebracht werden.'};
  if(e.type==='hotel'&&good!=='tourists')return {n:0,reason:'Das Orbitalhotel nimmt ausschließlich Touristen als Gäste auf.'};
  if(prop?.mode==='private'&&!game.canUseStorage(prop,p.id))return {n:0,reason:'Privater Standort.'};
  if(h.warp)return {n:0,reason:'Standort im Warptransfer.'};
  if(e.type==='ruins'&&h.facilities.dock.status!=='ready')return {n:0,reason:'Landeplatz zuerst reparieren.'};
  initializePopulation(e);ship.passengers||=[];
  if(dir==='buy'){
    updatePassengerOffers(e);
    const own=prop?.player===p.id,fee=own||free?0:GOODS[good].base;
    if(limit&&fee>limit)return {n:0,reason:'Preisgrenze'};
    const offer=free&&good==='tourists'?Math.min(residentDepartureCapacity(h),Math.max(0,h.population-total(h.workers))):e.market.goods[good].stock;
    let n=Math.floor(Math.min(amount,freeFor(ship,good),offer,fee?Math.floor(p.credits/fee):Infinity));
    if(!n)return {n:0,reason:'Keine verfügbaren Personen, Passagierplätze oder Credits.'};
    const loaded=n;
    // Returning visitors board with their original identity and wallet. No
    // second tourist is generated from a completed stay.
    if(good==='tourists'&&!free)for(const v of h.visitors.filter(v=>v.ready)){
      if(!n)break;const take=Math.min(n,v.n);ship.passengers.push(splitBatch(v,take));n-=take;
    }
    h.visitors=h.visitors.filter(v=>v.n>0);
    if(n){
      const workers=good==='workers'?takeWorkers(h,n):{basic:0,skilled:0,specialist:0};h.population-=n;
      ship.passengers.push({id:`${e.id}:passengers:${++h.nextPassenger}`,kind:good,origin:e.id,ownerAtDeparture:prop?.player||null,n,workers,wallet:0});
    }
    p.credits-=loaded*fee;
    const recipient=prop&&game.accountOf(prop.player);if(recipient)recipient.credits+=loaded*fee;else if(e.market.economy)e.market.economy.cash+=loaded*fee;
    // Travel spending is escrowed from the source's actual civilian budget.
    if(good==='tourists'){
      const batch=ship.passengers.at(-1),wallet=Math.min(h.civil?.budget||0,n*GOODS.tourists.base);
      if(wallet&&n){h.civil.budget-=wallet;batch.wallet+=wallet;}
    }
    cargoSync(ship);updatePassengerOffers(e);stat(e.market,game.time,'o',good,loaded);
    return {n:loaded,total:loaded*fee};
  }
  let remaining=Math.floor(Math.min(amount,ship.cargo[good]||0)),delivered=0;
  for(const batch of ship.passengers.filter(b=>b.kind===good&&!b.quest)){
    if(!remaining)break;
    const returning=good==='tourists'&&batch.origin===e.id;
    const visitorCap=h.visitorCapacity||0,occupied=h.visitors.reduce((n,v)=>n+v.n,0);
    const room=good==='workers'||returning?Math.max(0,h.housing-h.population):Math.max(0,visitorCap-occupied);
    const n=Math.min(remaining,batch.n,room);if(n<1)continue;
    const moved=splitBatch(batch,n);
    if(good==='workers'||returning){h.population+=n;for(const q of Object.keys(h.workers))h.workers[q]+=moved.workers[q]||0;if(returning&&moved.wallet){h.civil||={budget:0};h.civil.budget+=moved.wallet;}}
    else{
      moved.arrived=game.time;moved.until=game.time+1200;moved.ready=false;
      const recipient=prop&&game.accountOf(prop.player);
      if(recipient&&moved.wallet){recipient.credits+=moved.wallet;moved.stayPaid=moved.wallet;moved.wallet=0;}
      h.visitors.push(moved);
    }
    delivered+=n;remaining-=n;
  }
  ship.passengers=ship.passengers.filter(b=>b.n>0);cargoSync(ship);updatePassengerOffers(e);stat(e.market,game.time,'i',good,delivered);
  const occupied=h.visitors.reduce((n,v)=>n+v.n,0),capacity=h.visitorCapacity||0;
  const returning=(ship.passengers||[]).some(b=>b.kind===good&&b.origin===e.id&&!b.quest);
  const reason=good==='workers'||returning?'Kein freier Wohnraum für Ansiedlung oder Rückkehr; Personen bleiben an Bord.':
    (ship.passengers||[]).some(b=>b.kind===good&&b.quest)?'Questgebundene Touristen werden über die Rundreisequest zurückgegeben.':
    capacity<=0?'Dieser Planet hat keine touristischen Gästeplätze. Touristen können auf Paradieswelten und in Orbitalhotels untergebracht werden.':`Keine Gästeplätze verfügbar: ${occupied} / ${capacity} belegt. Personen bleiben an Bord.`;
  return {n:delivered,total:0,reason:delivered?undefined:reason};
}

export function tickVisitors(e,now){const h=peopleOf(e);if(!h?.visitors)return;for(const v of h.visitors)if(v.until<=now)v.ready=true;updatePassengerOffers(e);}
export function transferPassengers(from,to,good,amount){
  if(!from.dockedAt||from.dockedAt!==to.dockedAt||from.owner!==to.owner||from.id===to.id)return 'Beide eigenen Schiffe müssen am selben Standort angedockt sein.';
  let left=Math.floor(Math.min(amount,freeFor(to,good)));to.passengers||=[];
  for(const b of from.passengers||[])if(b.kind===good&&!b.quest&&left){const n=Math.min(left,b.n);to.passengers.push(splitBatch(b,n));left-=n;}
  from.passengers=(from.passengers||[]).filter(b=>b.n>0);cargoSync(from);cargoSync(to);
}
