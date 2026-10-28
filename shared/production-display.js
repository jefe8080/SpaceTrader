import {availableHomeStock, homeStorageUsage} from './homeworld.js';
import {GOODS} from './goods.js';

export function recipeStock(market, good, recipe) {
  if (!Number.isFinite(market?.goods?.[good]?.stock)) return null;
  const home = market.homeworld;
  const order = home?.logistics?.orders?.find(o => o.kind === 'production' && o.recipe === recipe && o.state !== 'cancelled');
  return availableHomeStock(market, good) + (order ? home.reservations?.[`production:${order.id}`]?.goods?.[good] || 0 : 0);
}

export function stockAssessment(value, need = null) {
  return !Number.isFinite(value) ? 'unknown' : (need === null ? value > 0 : value >= need) ? 'enough' : 'short';
}

export function productionBubble(market, item) {
  const home = market?.homeworld;
  const building = item.homeStructure ? home?.structures?.find(b => b.id === item.homeStructure) : home?.facilities?.[item.homeFacility];
  if (building) {
    if (building.status !== 'ready' || !(building.recipe || ['waterworks','foodplant','fueldepot','refinery','smelter'].includes(item.homeFacility))) return null;
    if (building.enabled === false) return 'Zzz';
    const allocation = home.allocations?.find(a => a.id === (item.homeStructure || item.homeFacility));
    return allocation?.state === 'paused' && allocation.reason === 'Zutaten fehlen' ? '???' : null;
  }
  return market?.factoryStates?.[item.index]?.reason === 'Zutaten fehlen' && item.kind === 'factory' ? '???' : null;
}

export function storageSummary(market) {
  if (!market?.goods) return null;
  const usage = homeStorageUsage(market);
  const capacity = {normal:0, hazard:0};
  if (market.homeworld) {
    capacity.normal = market.homeworld.storage;
    capacity.hazard = market.homeworld.hazardStorage;
  } else {
    for (const [good, slot] of Object.entries(market.goods)) {
      const cls = GOODS[good]?.cls;
      if (cls in capacity) {
        if (!Number.isFinite(slot.cap)) capacity[cls] = NaN;
        else capacity[cls] += slot.cap;
      }
    }
  }
  for (const [good, slot] of Object.entries(market.goods)) {
    const cls = GOODS[good]?.cls;
    if (cls in usage && !Number.isFinite(slot.stock)) usage[cls] = NaN;
  }
  return {usage, capacity};
}
