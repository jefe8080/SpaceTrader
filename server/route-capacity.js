import { GOODS, canSellTo } from '../shared/config.js';
import { homeStorageFree } from '../shared/homeworld.js';
import { strangerBlocked } from './property.js';

const signature = route => JSON.stringify([route.stops, !!route.onlyWithTargetSpace]);
const active = (game, ship) => {
  const command = ship.queue?.[0], route = command?.t === 'route' && game.routes.get(command.route);
  return route?.onlyWithTargetSpace ? { ship, command, route } : null;
};
const entries = game => [...game.ships.values()].map(ship => active(game, ship)).filter(Boolean);

// Stop at the next return to the purchasing location, even if it occurs twice
// in the template. Repeated destinations share one physical capacity budget.
export function routeDestinations(game, ship, route, index, good, includeCurrent = false) {
  const destinations = new Map(), origin = route.stops[index]?.targetId;
  for (let step = includeCurrent ? 0 : 1; step < route.stops.length; step++) {
    const stop = route.stops[(index + step) % route.stops.length];
    if (step > 0 && stop.targetId === origin) break;
    const entity = game.world.entities.get(stop.targetId), slot = entity?.market?.goods[good];
    if (!slot || entity.market.homeworld?.warp) continue;
    const prop = game.ownership.get(entity.id);
    const own = prop?.player === ship.owner || (prop && game.canUseStorage(prop, ship.owner));
    if (!own && (!canSellTo(slot) || (prop && strangerBlocked(prop)))) continue;
    if (entity.type === 'ruins' && entity.market.homeworld?.facilities.dock.status !== 'ready') continue;
    for (const action of stop.actions) if (action.op === 'sell' && action.good === good) {
      const amount = action.amount > 0 ? action.amount : Infinity;
      destinations.set(entity.id, (destinations.get(entity.id) || 0) + amount);
    }
  }
  return [...destinations].map(([target, amount]) => ({ target, amount }));
}

function available(game, target, good, reservations) {
  const market = game.world.entities.get(target)?.market;
  if (!market?.goods[good]) return 0;
  const ownGood = reservations.filter(r => r.target === target && r.good === good).reduce((n, r) => n + r.amount, 0);
  if (!market.homeworld) return Math.max(0, homeStorageFree(market, good) - ownGood);
  const shared = reservations.filter(r => r.target === target && GOODS[r.good]?.cls === GOODS[good]?.cls).reduce((n, r) => n + r.amount, 0);
  const home = market.homeworld, cls = GOODS[good]?.cls;
  // homeStorageFree includes the per-good limit; subtract shared usage only
  // from physical space and same-good reservations from the per-good limit.
  const physical = cls === 'normal' ? home.storage : home.hazardStorage;
  const used = Object.entries(market.goods).filter(([g]) => GOODS[g]?.cls === cls).reduce((n, [, s]) => n + s.stock, 0)
    + (cls === 'normal' ? Object.values(market.moduleInventory || {}).reduce((n, count) => n + count * 30, 0) + (home.moduleOutputReserved || 0) : 0);
  const limit = home.limits?.[good] ?? physical;
  return Math.max(0, Math.min(physical - used - shared, limit - market.goods[good].stock - ownGood));
}

function allocate(game, destinations, good, amount, reservations, own = []) {
  const plan = [];
  for (const destination of destinations) {
    const already = own.filter(r => r.target === destination.target && r.good === good).reduce((n, r) => n + r.amount, 0);
    const n = Math.floor(Math.min(amount, Math.max(0, destination.amount - already), available(game, destination.target, good, [...reservations, ...plan])));
    if (n > 0) { plan.push({ target: destination.target, good, amount: n }); amount -= n; }
    if (amount <= 0) break;
  }
  return plan;
}

// Reservations live with the route command and are saved with its queue.
// Reconciliation also reconstructs old saves and releases changed assignments,
// removed routes, disabled protection and cargo unloaded through other actions.
export function syncRouteReservations(game) {
  const current = entries(game), reservations = [];
  for (const ship of game.ships.values()) for (const command of ship.queue || []) {
    if (!current.some(e => e.command === command)) { delete command.destinationReservations; delete command.destinationSignature; }
  }
  for (const entry of current) {
    const { ship, command, route } = entry, key = signature(route), remaining = { ...ship.cargo };
    if (command.destinationSignature !== key) command.destinationReservations = [];
    command.destinationSignature = key;
    command.destinationReservations = (command.destinationReservations || []).flatMap(r => {
      const amount = Math.min(r.amount, remaining[r.good] || 0);
      remaining[r.good] = (remaining[r.good] || 0) - amount;
      return amount > 0 && game.world.entities.has(r.target) ? [{ ...r, amount }] : [];
    });
    reservations.push(...command.destinationReservations);
  }
  for (const { ship, command, route } of current) for (const [good, amount] of Object.entries(ship.cargo || {})) {
    const assigned = command.destinationReservations.filter(r => r.good === good).reduce((n, r) => n + r.amount, 0);
    if (amount <= assigned) continue;
    const plan = allocate(game, routeDestinations(game, ship, route, command.idx || 0, good, true), good, amount - assigned, reservations, command.destinationReservations);
    command.destinationReservations.push(...plan); reservations.push(...plan);
  }
  return reservations;
}

export function planRoutePurchase(game, ship, route, good, amount) {
  const reservations = syncRouteReservations(game), command = ship.queue?.[0];
  const destinations = routeDestinations(game, ship, route, command?.idx || 0, good);
  return allocate(game, destinations, good, amount, reservations, command?.destinationReservations || []);
}

export function reserveRoutePurchase(ship, plan, amount) {
  const command = ship.queue[0]; command.destinationReservations ||= [];
  for (const reservation of plan) {
    const n = Math.min(amount, reservation.amount);
    if (n > 0) command.destinationReservations.push({ ...reservation, amount: n });
    amount -= n;
  }
}

export function releaseRouteDelivery(ship, target, good, amount) {
  const command = ship.queue?.[0]; if (!command?.destinationReservations) return;
  command.destinationReservations = command.destinationReservations.flatMap(r => {
    if (r.target !== target || r.good !== good) return [r];
    const n = Math.min(amount, r.amount); amount -= n;
    return r.amount > n ? [{ ...r, amount: r.amount - n }] : [];
  });
}
