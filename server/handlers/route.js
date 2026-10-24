import { GOODS } from '../../shared/config.js';
import { V, CmdError } from './validate.js';
import { giveOrder, batchOrderError } from './ship.js';
import { remoteManagementError } from '../coverage.js';

const MAX_ROUTES = 100;

/** Aktion eines Stopps: kaufen, verkaufen, abbauen, warten bis */
export const tradeAction = (v) => {
  const op = V.oneOf('buy', 'sell', 'mine', 'waitUntil', 'refuel')(v?.op);
  if (op === 'mine' || op === 'refuel') return { op };
  if (op === 'waitUntil') {
    return {
      op,
      good: V.key(GOODS)(v.good),
      cond: V.oneOf('stock>=', 'stock<=', 'price>=', 'price<=')(v.cond),
      value: V.num(0, 1e9)(v.value),
      timeout: V.opt(V.int(10, 86400), 600)(v.timeout),
    };
  }
  return {
    op,
    good: V.key(GOODS)(v.good),
    amount: V.opt(V.int(0, 1e6), 0)(v.amount),
    limit: Math.round(V.opt(V.num(0, 1e9), 0)(v.limit) * 10) / 10,
  };
};

const stop = (v, ctx) => {
  const e = V.entity()(v?.targetId, ctx);
  const actions = V.arr(tradeAction, 8)(v?.actions ?? []);
  for (const a of actions) {
    if (a.op === 'mine' && e.kind !== 'belt') throw new CmdError(`${e.name}: Abbauen nur in Asteroidenfeldern.`);
    if (a.op === 'refuel' && !e.market?.goods.shipfuel) throw new CmdError(`${e.name}: Hier gibt es keinen Schiffstreibstoff.`);
    if (a.good && !e.market?.goods[a.good]) throw new CmdError(`${e.name}: ${GOODS[a.good].name} wird dort nicht gehandelt.`);
  }
  return { targetId: e.id, actions };
};

/** Schiffe, die eine Route in ihrer Queue haben */
export const shipsOnRoute = (game, routeId) => [...game.ships.values()].filter((s) => s.queue?.some((c) => c.t === 'route' && c.route === routeId));

export default {
  routeSave: {
    args: {
      id: V.opt(V.ownRoute(), null),
      name: V.str(32, 1),
      stops: V.arr(stop, 16),
      minBalance: V.opt(V.int(0, 1e12), 0),
      assign: V.opt(V.arr(V.ownShip(), 100), []), // leer = nur Route bearbeiten
    },
    run({ game, player }, { id: route, name, stops, minBalance, assign }) {
      if (!stops.length) return 'Eine Route braucht mindestens einen Stopp.';
      if(game.profile==='homeworld'){
        for(const stop of stops){const error=remoteManagementError(game,player,game.world.entities.get(stop.targetId));if(error)return error;}
        const error=batchOrderError(game,[...new Set([...assign,...(route?shipsOnRoute(game,route.id):[])])],{t:'route',route:route?.id},false,{stops});if(error)return error;
      }
      if (!route) {
        if ([...game.routes.values()].filter((r) => r.owner === player.id).length >= MAX_ROUTES) return 'Zu viele Routen.';
        route = { id: 'r' + ++game.counters.route, owner: player.id, paused: false, created: Math.round(game.time) };
        game.routes.set(route.id, route);
      }
      Object.assign(route, { name, stops, minBalance });
      // Laufende Schiffe auf gültigen Stopp setzen
      for (const s of shipsOnRoute(game, route.id)) for (const c of s.queue) if (c.route === route.id && c.idx >= stops.length) { c.idx = 0; c.phase = 'travel'; }
      for (const s of new Set(assign)) if (!s.main) {
        const error = giveOrder(game, s, { t: 'route', route: route.id, rounds: 0 }, false);
        if (error) return error;
      }
      game.emit('routes', player);
      return undefined;
    },
  },
  routeDelete: {
    args: { route: V.ownRoute() },
    run({ game, player }, { route }) {
      for (const s of shipsOnRoute(game, route.id)) s.queue = s.queue.filter((c) => !(c.t === 'route' && c.route === route.id));
      game.routes.delete(route.id);
      game.routeStats.delete(route.id);
      game.emit('routes', player);
    },
  },
  routeAssign: {
    args: { route: V.ownRoute(), ships: V.ownShips(), rounds: V.opt(V.int(0, 1000), 0), append: V.bool() },
    run({ game, player }, { route, ships, rounds, append }) {
      const error=batchOrderError(game,ships,{t:'route',route:route.id,rounds},append);if(error)return error;
      for (const s of ships) {
        const err = giveOrder(game, s, { t: 'route', route: route.id, rounds }, append);
        if (err) return err;
      }
      game.emit('routes', player);
    },
  },
  routeUnassign: {
    args: { route: V.ownRoute(), ship: V.ownShip() },
    run({ game, player }, { route, ship }) {
      ship.queue = ship.queue.filter((c) => !(c.t === 'route' && c.route === route.id));
      game.emit('routes', player);
    },
  },
  routePause: {
    args: { route: V.ownRoute(), paused: V.bool() },
    run({ game, player }, { route, paused }) {
      route.paused = paused;
      game.emit('routes', player);
    },
  },
};
