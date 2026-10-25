import { GOODS } from '../shared/goods.js';

// Personal moving-average inventory across own ships and warehouses. Free transfers
// retain basis; new production and pre-introduction inventory have unknown cost.
export function inventoryQuantity(game, player, good) {
  let n=game.shipsOf(player.id).reduce((sum,s)=>sum+(s.cargo[good]||0),0);
  for(const e of game.world.entities.values())if(e.market&&(e.market.homeworld?.owner===player.id||game.ownership.get(e.id)?.player===player.id))n+=e.market.goods[good]?.stock||0;
  return n;
}

export function initializeProfile(game, player) {
  player.profileStats ||= { since:Date.now(), revenue:0, knownProfit:0, unknownRevenue:0, unknownUnits:0, inventory:{} };
  player.profileStats.discoveredPlanets ||= [...game.world.entities.values()].filter(e=>e.kind==='planet'&&game.isKnown(player,e)).map(e=>e.id);
  return player.profileStats;
}

export function syncInventoryBasis(game, player, good, quantity=inventoryQuantity(game,player,good)) {
  const stats=initializeProfile(game,player);
  const entry=stats.inventory[good] ||= {quantity,known:0,cost:0};
  // Unexplained removals (production, fuel, quests) consume the same average mix.
  if(quantity<entry.quantity&&entry.quantity>0) {
    const ratio=quantity/entry.quantity;entry.known*=ratio;entry.cost*=ratio;
  }
  entry.quantity=quantity;
  return entry;
}

// Marketplace/NPC paths mutate the warehouse directly rather than Game.trade.
export function recordInventoryTrade(game, player, good, dir, n, total) {
  if(!player||!n||!total)return;
  const before=inventoryQuantity(game,player,good)+(dir==='sell'?n:-n);
  syncInventoryBasis(game,player,good,before);
  recordGoodsTrade(game,player,good,dir,{n,total},before);
}

export function recordGoodsTrade(game, player, good, dir, result, before) {
  if(!result.n||!result.total||GOODS[good]?.cls==='passenger')return;
  const stats=initializeProfile(game,player),entry=stats.inventory[good];
  const {n,total}=result;
  if(dir==='buy') {entry.known+=n;entry.cost+=total;}
  else {
    const fraction=before>0?Math.min(1,entry.known/before):0;
    const known=n*fraction,cost=entry.known>0?entry.cost*known/entry.known:0;
    stats.revenue+=total;stats.knownProfit+=total*fraction-cost;
    stats.unknownRevenue+=total*(1-fraction);stats.unknownUnits+=n-known;
    entry.known=Math.max(0,entry.known-known);entry.cost=Math.max(0,entry.cost-cost);
  }
  entry.quantity=inventoryQuantity(game,player,good);
}

export function pilotProfile(game, player) {
  const stats=initializeProfile(game,player);
  return {since:stats.since,revenue:stats.revenue,knownProfit:stats.knownProfit,unknownRevenue:stats.unknownRevenue,
    profit:stats.unknownUnits>1e-7?null:stats.knownProfit,
    systems:player.known.system.size,planets:stats.discoveredPlanets.length,
    missions:(player.questsDone||0)+Object.keys(player.homeQuest?.completed||{}).length,
    battlesWon:null,ships:game.shipsOf(player.id).length,
    worlds:[...game.world.entities.values()].filter(e=>e.kind==='planet'&&(e.market?.homeworld?.owner===player.id||game.ownership.get(e.id)?.player===player.id)).map(e=>({id:e.id,name:e.name}))};
}
