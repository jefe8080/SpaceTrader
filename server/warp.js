import {GOODS,MODULES,NPC_OWNER,propertyBasePrice} from '../shared/config.js';
import {HOMEWORLD} from '../shared/homeworld.js';
import {hexAt,hexKey} from '../shared/hex.js';
import {moveWorldEntity} from './ruin-sites.js';
import {pointCovered,coverageAreas} from './coverage.js';

const goodsValue=goods=>Object.entries(goods||{}).reduce((sum,[g,n])=>sum+(GOODS[g]?.base||0)*n,0);
const costValue=cost=>(cost?.credits||0)+goodsValue(cost?.goods);
export function warpValuation(e){
  const m=e.market,h=m.homeworld;
  const base=h.fixedSiteBase??propertyBasePrice(e);
  const built=(h.capitalCosts||[]).reduce((n,c)=>n+costValue(c.cost),0);
  const pending=(h.projects||[]).filter(j=>!['module','study','training'].includes(j.kind)).reduce((n,j)=>n+costValue(j.bound),0)
    +Object.values(h.facilities).filter(b=>b.status==='building').reduce((n,b)=>n+costValue(b.bound),0);
  const quests=Object.values(h.questDeliveries||{}).reduce((n,goods)=>n+goodsValue(goods),0);
  const founding=h.founding?costValue(h.founding.cost)+4000+(h.founding.infrastructureShip?.modules||[]).reduce((n,id)=>n+(MODULES[id]?.price||0),0):0;
  const population=h.population*GOODS.workers.base;
  const site=base+built+pending+quests+founding+population;
  const goods=Object.fromEntries(Object.entries(m.goods).filter(([g,s])=>['normal','hazard'].includes(GOODS[g].cls)&&s.stock>0).map(([g,s])=>[g,s.stock]));
  const modules={...(m.moduleInventory||{})};
  const cargoGoods=goodsValue(goods),cargoModules=Object.entries(modules).reduce((n,[id,count])=>n+(MODULES[id]?.price||0)*count,0);
  const work=(h.projects||[]).filter(j=>['module','study'].includes(j.kind)).reduce((n,j)=>n+(j.kind==='study'?MODULES[j.module].price:goodsValue(j.bound)),0);
  const hulls=[...Object.values(h.orbital?.jobs||{}),...(h.orbital?.inventory||[])];
  const ships=hulls.reduce((n,j)=>n+goodsValue(j.materials)+(j.currency?goodsValue({[j.currency.good]:j.currency.n}):j.currencyPaid?goodsValue({[j.currencyPaid.good]:j.currencyPaid.n}):0),0);
  const cargo=cargoGoods+cargoModules+work+ships,total=Math.ceil(HOMEWORLD.warp.basePrice+site*HOMEWORLD.warp.siteShare+cargo);
  return {base:HOMEWORLD.warp.basePrice,site,siteCharge:site*.2,cargo,cargoGoods,cargoModules,work,ships,total,goods,modules,hulls:hulls.map(j=>j.id)};
}

function destinationError(game,e,system,x,y){
  if(!system||system.start||system.faction)return 'Ein erschlossenes gewöhnliches Zielsystem wählen.';
  const hex=hexAt(x,y),radius=Math.hypot(x-system.x,y-system.y);
  if(hexKey(hex.q,hex.r)!==system.sector||radius<1000||radius>12000)return 'Zielposition muss in 1.000–12.000 Entfernung vom Stern und im Zielsektor liegen.';
  for(const other of game.world.entities.values()){
    if(other.id===e.id)continue;
    if(Math.hypot(x-other.x,y-other.y)<(other.radius||100)+e.radius+400)return 'Zielposition ist räumlich belegt.';
    if((other.market?.homeworld||other.colony?.owner)&&(other.system===system.id||Math.hypot(x-other.x,y-other.y)<HOMEWORLD.placement.minDistance))return 'Ein anderer bestehender oder reservierter Ruinenstandort ist zu nah.';
    const reserved=other.market?.homeworld?.warp?.target;
    if(reserved&&(reserved.system===system.id||Math.hypot(x-reserved.x,y-reserved.y)<HOMEWORLD.placement.minDistance))return 'Dieses Warpziel ist bereits reserviert.';
  }
}
function access(game,p,e){
  const h=e.market?.homeworld;if(h?.owner!==p.id)return 'Nur eigene persönliche Ruinenwelten können versetzt werden.';
  if(!p.homeQuest.completed.H16)return 'Warpservice wird durch H16 freigeschaltet.';
  if(h.warp)return 'Dieser Standort bereitet bereits seinen Transfer vor.';
  if((h.warpCooldownUntil||0)>game.time)return 'Für diesen Standort läuft die 24-Stunden-Sperrfrist in Serverzeit.';
  if(!pointCovered(game,p,e)&&game.ships.get(p.manualShip)?.dockedAt!==e.id)return 'Eigene Abdeckung oder manuelle Anwesenheit erforderlich.';
}
const affects=(game,s,e)=>s.queue.some(c=>c.target===e.id||c.stationId===e.id||c.sourceId===e.id||c.deliveryTargetId===e.id||game.routes.get(c.route)?.stops.some(stop=>stop.targetId===e.id))||s.logisticsJob&&[...game.world.entities.values()].some(home=>home.market?.homeworld?.logistics?.jobs?.some(j=>j.id===s.logisticsJob.id&&home.id===s.logisticsJob.home&&(j.source===e.id||j.destination===e.id)));
export function quoteWarp(game,p,e,systemId,x,y){
  const error=access(game,p,e);if(error)return error;
  const system=game.world.systems.get(systemId);if(!system||!p.known.system.has(systemId))return 'Zielsystem zuerst erschließen.';
  if(x===undefined||y===undefined){
    let point;
    for(let i=0;i<180;i++){const angle=i*137.508*Math.PI/180,radius=2500+Math.floor(i/30)*1300,tx=system.x+Math.cos(angle)*radius,ty=system.y+Math.sin(angle)*radius;if(!destinationError(game,e,system,tx,ty)){point={x:tx,y:ty};break;}}
    if(!point)return 'Im gewählten System gibt es keine geeignete freie Zielposition.';x=point.x;y=point.y;
  }
  const blocked=destinationError(game,e,system,x,y);if(blocked)return blocked;
  const target={x,y,system:system.id,sector:system.sector},h=e.market.homeworld;
  const position={x:e.x,y:e.y,system:e.system,sector:e.sector};let after;
  try{Object.assign(e,target);after=coverageAreas(game,p);}finally{Object.assign(e,position);}
  const ships=[...game.ships.values()].filter(s=>affects(game,s,e)).map(s=>s.id),routes=[...game.routes.values()].filter(r=>r.owner===p.id&&r.stops.some(stop=>stop.targetId===e.id)).map(r=>({id:r.id,name:r.name}));
  h.warpQuote={id:(h.nextWarpQuote||0)+1,created:game.time,target,price:warpValuation(e),coverage:after,affectedShips:ships,affectedRoutes:routes,otherWorlds:[...game.world.entities.values()].filter(w=>w.id!==e.id&&w.market?.homeworld?.owner===p.id).map(w=>({id:w.id,name:w.name}))};h.nextWarpQuote=h.warpQuote.id;
  game.emit('entity',e);
}
export function startWarp(game,p,e,quoteId,confirmed){
  const error=access(game,p,e);if(error)return error;
  const h=e.market.homeworld,q=h.warpQuote;if(!confirmed||!q||q.id!==quoteId)return 'Gültige Vorschau und ausdrückliche Transferbestätigung erforderlich.';
  if([...game.ships.values()].some(s=>s.dockedAt===e.id))return 'Vor der Vorbereitung müssen sämtliche angedockten Schiffe starten. Kein Flottenschiff wird mitgenommen.';
  if(p.relic?.operation?.world===e.id)return 'Laufende Reliktarbeit zuerst beenden.';
  const system=game.world.systems.get(q.target.system),blocked=destinationError(game,e,system,q.target.x,q.target.y);if(blocked)return blocked;
  const price=warpValuation(e);if(!Number.isSafeInteger(price.total)||price.total>q.price.total)return 'Bestände oder Standortwert sind gestiegen. Neue Preisvorschau anfordern.';
  if(p.credits<price.total)return 'Nicht genug Credits für den bestätigten Transfer.';
  p.credits-=price.total;h.warp={target:structuredClone(q.target),price,started:game.time,remaining:300};delete h.warpQuote;
  for(const s of game.ships.values())if(affects(game,s,e))s.relocationHold={home:e.id,x:s.coverageLeg?.x??s.flightLeg?.x??s.x,y:s.coverageLeg?.y??s.flightLeg?.y??s.y,state:'finishing'};
  game.emit('entity',e);
}
export function tickWarps(game,dt){
  for(const e of game.world.entities.values()){
    const h=e.market?.homeworld,w=h?.warp;if(!w)continue;
    // Absolute construction timestamps are shifted while all local stock flows
    // and remaining-time projects stay paused by tickHomeOperations.
    const paused=Math.min(dt,w.remaining);
    for(const b of Object.values(h.facilities))if(b.readyAt!==undefined)b.readyAt+=paused;
    for(const b of h.structures||[])if(b.readyAt!==undefined)b.readyAt+=paused;
    for(const j of h.projects||[])if(j.until!==undefined)j.until+=paused;
    w.remaining=Math.max(0,w.remaining-paused);if(w.remaining>0)continue;
    const p=game.players.get(h.owner),old={x:e.x,y:e.y,system:e.system,sector:e.sector};
    const transferredAt=game.time-dt+paused;
    moveWorldEntity(game.world,e,w.target);h.warpHistory||=[];h.warpHistory.push({from:old,to:w.target,price:w.price,at:transferredAt});h.warpCooldownUntil=transferredAt+86400;h.warpResumedAt=transferredAt;h.warp=null;
    for(const s of game.ships.values())if(s.relocationHold?.home===e.id&&s.owner===NPC_OWNER){delete s.relocationHold;s.nav=null;delete s.coverageLeg;}
    game.revealAround(p,e.x,e.y,7000);game.discover(p,'system',e.system);game.discover(p,'sector',e.sector);game.emit('relocated',e,old);game.emit('entity',e);
  }
}
