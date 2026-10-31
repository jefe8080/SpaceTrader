import {recordInventoryTrade} from './pilot-profile.js';
import {recordLocalSale} from '../shared/local-sales.js';
import {CIVIL_GOODS,localDemandPerHour} from '../shared/local-demand.js';
import {GOODS,SHIP_TYPES,SHIPYARD,WORLD,SUPPLY,buyPrice,sellPrice,canBuyFrom,canSellTo,NPC_OWNER} from '../shared/config.js';
import {HOMEWORLD,availableHomeStock,homeStorageFree} from '../shared/homeworld.js';
import {stat,tickHubEquilibrium} from './markets.js';
import {propBook} from './property.js';
import {preparePhysicalYard,tickPhysicalYard} from './physical-yards.js';
import {initializePopulation,tickVisitors} from './population.js';
import {tickSpecialization} from './specializations.js';
import {handlingAllowance,recordHandling} from './handling.js';

export const naturalGood=good=>GOODS[good]?.tier===0&&GOODS[good].cls!=='passenger';

/** Called only on freshly generated public markets, never on a loaded market. */
export function preparePublicEntity(entity){
  const market=entity.market;if(!market||market.homeworld||market.strategy==='homeResource')return;
  market.realEconomy=true;market.provenance=[];market.modules=[];market.moduleInventory={};
  if(market.forSale)market.forSale=[];
  for(const [good,slot] of Object.entries(market.goods)){
    const natural=slot.role==='produce'&&naturalGood(good);
    if(!natural)slot.stock=0;
    if(slot.role==='produce'&&!natural){slot.role=good==='shipfuel'?'trade':'consume';slot.rate=good==='shipfuel'?0:slot.rate;}
    if(GOODS[good].cls==='passenger'){slot.stock=0;slot.rate=0;}
    if(entity.id.startsWith('origin_'))slot.rate/=WORLD.START_SLOW;
    if(entity.type==='hub'&&GOODS[good].ultra&&GOODS[good].tier===0)delete market.goods[good];
    if(natural&&slot.stock>0)market.provenance.push({id:`${entity.id}:${good}:natural`,source:'natural_reserve',good,amount:slot.stock});
    slot.baseRate=slot.rate;slot.baseCap=slot.cap;
  }
  preparePhysicalYard(entity);ensureCash(entity);initializePopulation(entity);
}

export function ensureCash(entity){
  const market=entity.market;if(market.economy)return market.economy;
  let rate=Object.entries(market.goods).reduce((sum,[good,slot])=>sum+(slot.role==='consume'?slot.rate*3600*GOODS[good].base:0),0);
  if(market.yardCatalog)rate=Math.max(rate,...market.yardCatalog.map(type=>Object.entries(SHIP_TYPES[type].build).reduce((sum,[g,n])=>sum+GOODS[g].base*n,0)));
  // A hub's fuel service has a bounded procurement allocation; selling fuel
  // also returns actual receipts to this same cash account.
  if(entity.type==='hub')rate+=20*GOODS.shipfuel.base;
  market.economy={cash:0,rate,granted:0,spent:0,received:0,population:entity.kind==='planet'?Math.round(1000*(entity.size||1)):0};
  if(entity.kind==='planet'){initializePopulation(entity);market.economy.rate=Object.entries(market.goods).reduce((n,[g,s])=>n+(s.role==='consume'?s.rate*3600*GOODS[g].base:0),0);}
  return market.economy;
}

export function receiveMarketCash(entity,amount){const cash=ensureCash(entity);cash.cash+=amount;cash.received+=amount;}
export function spendMarketCash(entity,amount){const cash=ensureCash(entity);if(cash.cash+1e-8<amount)return false;cash.cash=Math.max(0,cash.cash-amount);cash.spent+=amount;return true;}

export function downstreamDemand(game,entity,good){
  if(entity.type==='hub')return Math.max(0,(entity.market.goods[good]?.cap||0)-(entity.market.goods[good]?.stock||0));
  const wanted=game.world.sectorEntities(entity.sector).reduce((sum,target)=>{
    const slot=target.market?.goods[good];
    if(target.id===entity.id||game.ownership.has(target.id)||slot?.role!=='consume'||Math.hypot(target.x-entity.x,target.y-entity.y)>SUPPLY.RANGE)return sum;
    return sum+Math.max(0,Math.min(Math.floor(slot.cap*.5-slot.stock),Math.floor(ensureCash(target).cash/buyPrice(good,slot))));
  },0);
  return Math.max(0,wanted-(entity.market.goods[good]?.stock||0));
}

export function tickRealMarket(game,entity,dt){
  const market=entity.market,cash=ensureCash(entity),now=game.time;
  const structure=()=>JSON.stringify(Object.entries(market.goods).map(([g,s])=>[g,s.role,s.rate,s.cap]));
  const before=structure();
  tickVisitors(entity,now);
  if(entity.kind==='planet'){
    initializePopulation(entity);
    const basic=Math.min(...Object.entries({water:.2,food:.1}).map(([g,n])=>Math.min(1,(market.goods[g]?.stock||0)/Math.max(1e-9,cash.population*n*dt/3600))));
    const comfort=['clothing','medicine','consumer'].reduce((n,g)=>n+Math.min(1,(market.goods[g]?.stock||0)/Math.max(1e-9,market.goods[g].rate*dt))/3,0);
    cash.supplyFactor=.25+.75*basic+.25*basic*comfort;
    tickSpecialization(game,entity,dt);
    cash.rate=Object.entries(market.goods).reduce((n,[g,s])=>n+(s.role==='consume'?s.rate*3600*GOODS[g].base:0),0);
  }
  // Generated demand capital is bounded independently of player offers. Earned
  // sales receipts are retained; they are not a second generated allocation.
  const escrow=[...game.ships.values()].reduce((sum,ship)=>sum+(ship.queue[0]?.real&&ship.queue[0]?.stationId===entity.id?ship.queue[0].cash||0:0),0);
  const grant=Math.max(0,Math.min(cash.rate*dt/3600,cash.rate*HOMEWORLD.money.npcBudgetHours-cash.cash-escrow));
  cash.cash+=grant;cash.granted+=grant;
  if(entity.type==='hub'){
    tickHubEquilibrium(entity,dt,now);
    if(structure()!==before)game.emit('entity',entity);
    return;
  }
  if(market.yardCatalog){tickPhysicalYard(game,entity,dt);return;}
  const food=market.goods.food;
  const foodNeed=food?.role==='consume'?Math.max(0,food.rate*dt):0;
  const supplied=foodNeed>0?Math.min(1,food.stock/foodNeed):0;
  market.eff=.25+.75*supplied;
  tickCivilMoney(game,entity,dt);
  for(const [good,slot] of Object.entries(market.goods)){
    if(slot.role==='produce'&&naturalGood(good)){
      const amount=Math.max(0,Math.min(slot.cap-slot.stock,slot.rate*market.eff*dt));slot.stock+=amount;stat(market,now,'p',good,amount);
    }else if(slot.role==='consume'&&GOODS[good].cls!=='passenger'&&!slot.specialUse){
      if(CIVIL_GOODS.includes(good))consumeCivilGood(game,entity,good,slot.rate,dt);
      else {const amount=Math.min(availableHomeStock(market,good),slot.rate*dt);slot.stock-=amount;stat(market,now,'c',good,amount);}
    }
  }
  if(entity.kind!=='planet'){cash.supplyFactor=market.eff;cash.employmentFactor=.5;}
  if(structure()!==before)game.emit('entity',entity);
}

/** Warenentnahme und vollständige Bezahlung werden gemeinsam gebucht. */
export function consumeCivilGood(game,entity,good,rate,dt){
  const m=entity.market,h=m.homeworld||ensureCash(entity),prop=game.ownership.get(entity.id),owner=prop&&game.accountOf(prop.player);
  const slot=m.goods[good],demand=localDemandPerHour(good,slot,prop,rate)*dt/3600;
  let amount=Math.min(availableHomeStock(m,good),demand);
  if(owner){
    h.civil||={budget:0,consumptionPayments:0};
    const price=game.fixedPriceOf(entity,prop,good),budget=h.civil.budget||0;
    h.civil.purchaseLimited=!!h.civil.purchaseLimited||amount*price>budget+1e-8;
    amount=Math.min(amount,budget/price);
    const payment=amount*price;
    if(payment>0){
      h.civil.budget=Math.max(0,budget-payment);h.civil.consumptionPayments=(h.civil.consumptionPayments||0)+payment;owner.credits+=payment;
      propBook(game,prop,'inc',payment);recordInventoryTrade(game,game.players.get(prop.player),good,'sell',amount,payment);
      recordLocalSale(m,game.time,good,amount,payment);
    }
  }
  if(slot)slot.stock=Math.max(0,slot.stock-amount);
  stat(m,game.time,'c',good,amount);
  return demand>0?amount/demand:1;
}

export function tickCivilMoney(game,entity,dt,consumption={}){
  const home=entity.market.homeworld||ensureCash(entity),prop=game.ownership.get(entity.id),owner=prop&&game.accountOf(prop.player);
  if(!home||!home.population)return;
  home.civil||={budget:0,taxRate:.2,gross:0,taxes:0,consumptionPayments:0};
  for(const [key,value] of Object.entries({budget:0,taxRate:.2,gross:0,taxes:0,consumptionPayments:0}))home.civil[key]??=value;
  const civil=home.civil,income=HOMEWORLD.money.incomePerHour*home.population*(home.supplyFactor??.25)*(home.employmentFactor??.5);
  civil.purchaseLimited=false;
  const gross=income*dt/3600,tax=gross*civil.taxRate;
  if(owner)owner.credits+=tax;civil.gross+=gross;civil.taxes+=tax;
  const budgetBeforeCap=civil.budget+gross-tax;
  civil.budget=Math.min(income*(1-civil.taxRate)*HOMEWORLD.money.civilianBudgetHours,budgetBeforeCap);
  civil.unspentExpired=(civil.unspentExpired||0)+budgetBeforeCap-civil.budget;
  for(const [good,amount] of Object.entries(consumption)){
    if(!owner)continue;
    const price=game.fixedPriceOf(entity,prop,good),payment=Math.min(civil.budget,amount*price);
    civil.budget-=payment;civil.consumptionPayments+=payment;owner.credits+=payment;
    propBook(game,prop,'inc',payment);
    recordInventoryTrade(game,game.players.get(prop.player),good,'sell',amount,payment);
    recordLocalSale(entity.market,game.time,good,price>0?payment/price:0,payment);
  }
  if(prop)propBook(game,prop,'inc',tax);
  civil.incomePerHour=income;
}

const queuedFor=(game,entity,good)=>[...game.ships.values()].some(s=>s.owner===NPC_OWNER&&[s.queue[0]?.stationId,s.queue[0]?.deliveryTargetId].includes(entity.id)&&s.queue[0]?.good===good);

/** Public demand buys real goods with escrowed cash, never anticipated sales. */
export function dispatchRealSupply(game,entity){
  if(entity.type==='hub')return; // Hub stocks use their historical equilibrium.
  const market=entity.market;if(game.ownership.has(entity.id))return;
  if(market.yardCatalog&&(market.building||(!market.order&&market.forSale.length>=SHIPYARD.MAX_FOR_SALE)))return;
  const cash=ensureCash(entity);market.supCd||={};
  for(const [good,slot] of Object.entries(market.goods)){
    if(GOODS[good].cls==='passenger'||!canSellTo(slot)||slot.role==='produce'||queuedFor(game,entity,good)||(market.supCd[good]||0)>game.time)continue;
    const nextType=market.order?.type||market.yardCatalog?.[(market.nextBuild||0)%market.yardCatalog.length];
    const target=nextType?SHIP_TYPES[nextType].build[good]||0:slot.role==='consume'?slot.cap*.5:entity.type==='hub'&&good==='shipfuel'?Math.min(slot.cap,80):0;
    const wanted=Math.min(40,Math.floor(target-slot.stock));if(wanted<1)continue;
    let source=null,distance=Infinity;
    for(const candidate of game.world.sectorEntities(entity.sector)){
      if(candidate.id===entity.id||!candidate.market||(entity.kind==='planet'&&candidate.type==='hub'))continue;
      const supply=candidate.market.goods[good],prop=game.ownership.get(candidate.id);
      if(!supply||!canBuyFrom(supply)||availableHomeStock(candidate.market,good)<1||prop?.mode==='private'||candidate.market.homeworld?.warp)continue;
      const d=Math.hypot(candidate.x-entity.x,candidate.y-entity.y);
      if(d>SUPPLY.RANGE||d>=distance||buyPrice(good,supply)>cash.cash)continue;
      // A commercial intermediary needs a real downstream demand. Merely
      // listing a trade slot does not finance speculative purchases.
      if(slot.role==='trade'&&!(entity.type==='hub'&&good==='shipfuel'))continue;
      source=candidate;distance=d;
    }
    if(!source){market.supCd[good]=game.time+SUPPLY.RETRY_NO_SOURCE;continue;}
    const price=buyPrice(good,source.market.goods[good])*(1+(game.ownership.get(source.id)?.customs||0));
    const amount=Math.min(wanted,Math.floor(availableHomeStock(source.market,good)),Math.floor(cash.cash/price));if(amount<1)continue;
    const budget=Math.min(cash.cash,amount*price*1.25);cash.cash-=budget;
    const ship=game.spawnNpcShip(entity,true);
    ship.queue=[{t:'supply',stationId:entity.id,sourceId:source.id,good,amount,phase:'toSource',haul:true,real:true,cash:budget}];
    game.markNpc(ship,true);market.supply={state:'active',shipId:ship.id,sourceId:source.id,good};return;
  }
}

export function loadRealSupply(game,ship,source,order){
  if(source.type==='hub'&&game.world.entities.get(order.stationId)?.kind==='planet')return;
  const market=source.market,slot=market?.goods[order.good],prop=game.ownership.get(source.id);
  if(!slot||!canBuyFrom(slot)||prop?.mode==='private'||market.homeworld?.warp)return;
  if(handlingAllowance(game,source,ship)<1)return false;
  let amount=Math.min(order.amount,40,Math.floor(availableHomeStock(market,order.good)),handlingAllowance(game,source,ship)),loaded=0;
  const cashBefore=order.cash;
  while(loaded<amount){
    const price=buyPrice(order.good,slot)*(1+(prop?.customs||0));if(price>order.cash)break;
    order.cash-=price;slot.stock--;loaded++;
    const target=game.world.entities.get(order.stationId);if(target?.market)ensureCash(target).spent+=price;
    if(prop){const owner=game.accountOf(prop.player);if(owner)owner.credits+=price;propBook(game,prop,'inc',price);}
    else receiveMarketCash(source,price);
  }
  if(loaded&&prop)recordInventoryTrade(game,game.players.get(prop.player),order.good,'sell',loaded,cashBefore-order.cash);
  if(loaded){ship.cargo[order.good]=(ship.cargo[order.good]||0)+loaded;stat(market,game.time,'o',order.good,loaded);}
  recordHandling(game,source,ship,loaded);
}

export function finishRealSupply(game,ship,station){
  if(station.market?.homeworld?.warp){ship.state='waiting';return false;}
  const order=ship.queue[0],market=station.market,primary=game.world.entities.get(order.stationId);
  if(!primary){ship.state='waiting';return false;}
  if(order.cash&&primary){ensureCash(primary).cash+=order.cash;order.cash=0;}
  for(const [good,amount] of Object.entries(ship.cargo)){
    const slot=market.goods[good];if(!slot)continue;
    let unloaded=Math.min(amount,Math.floor(homeStorageFree(market,good)),handlingAllowance(game,station,ship));
    if(station.id!==order.stationId){
      let sold=0;
      while(sold<unloaded){const price=sellPrice(good,slot);if(!spendMarketCash(station,price))break;receiveMarketCash(primary,price);slot.stock++;sold++;}
      unloaded=sold;
    }else slot.stock+=unloaded;
    ship.cargo[good]-=unloaded;
    recordHandling(game,station,ship,unloaded);
    stat(market,game.time,'i',good,unloaded);if(!ship.cargo[good])delete ship.cargo[good];
  }
  if(Object.keys(ship.cargo).length){
    // Retain paid cargo at the destination, retry on its real future capacity.
    // It remains persisted in the transport; no second purchase or payout.
    ship.state='waiting';market.supply={state:'waiting',shipId:ship.id,good:order.good,reason:'Ziellager voll; bezahlte Fracht bleibt an Bord'};
    order.blockedAt??=game.time;
    if(game.time-order.blockedAt>=60){
      const alternative=game.world.sectorEntities(station.sector).filter(e=>e.id!==station.id&&!(primary.kind==='planet'&&e.type==='hub')&&!game.ownership.has(e.id)&&e.market?.goods[order.good]?.role==='consume'&&homeStorageFree(e.market,order.good)>=1&&ensureCash(e).cash>=sellPrice(order.good,e.market.goods[order.good])&&Math.hypot(e.x-ship.x,e.y-ship.y)<=SUPPLY.RANGE)
        .sort((a,b)=>Math.hypot(a.x-ship.x,a.y-ship.y)-Math.hypot(b.x-ship.x,b.y-ship.y))[0];
      if(alternative){order.deliveryTargetId=alternative.id;delete order.blockedAt;ship.dockedAt=null;ship.nav=null;ship.state='flying';}
    }
    return false;
  }
  const original=primary?.market||market;original.supCd||={};original.supCd[order.good]=game.time+SUPPLY.COOLDOWN;original.supply={state:'cooldown',good:order.good};
  game.removeShip(ship);return true;
}
