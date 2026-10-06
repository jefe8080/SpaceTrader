import { SHIP_TYPES, BELT_TYPES, WORLD } from '../shared/config.js';
import { stat } from './markets.js';

export const cargoUsed = (ship) => Object.values(ship.cargo).reduce((a, b) => a + b, 0);
export const cargoFree = (ship) => SHIP_TYPES[ship.type].cargo - cargoUsed(ship);

function approachPoint(ship, e) {
  let dx = ship.x - e.x, dy = ship.y - e.y;
  let d = Math.hypot(dx, dy);
  if (d < 1) { dx = 1; dy = 0; d = 1; }
  const off = e.kind === 'belt' ? e.radius * 0.45 : e.radius + WORLD.DOCK_OFFSET;
  return { x: e.x + (dx / d) * off, y: e.y + (dy / d) * off };
}

function flyTo(ship, tx, ty, dt) {
  const speed = SHIP_TYPES[ship.type].speed;
  const dx = tx - ship.x, dy = ty - ship.y;
  const d = Math.hypot(dx, dy);
  const step = speed * dt;
  ship.dockedAt = null;
  if (d <= step) {
    ship.x = tx; ship.y = ty;
    return true;
  }
  ship.vx = (dx / d) * speed;
  ship.vy = (dy / d) * speed;
  ship.x += (dx / d) * step;
  ship.y += (dy / d) * step;
  ship.angle = Math.atan2(dy, dx);
  return false;
}

function flyToEntity(ship, e, dt) {
  if (ship.dockedAt === e.id) return true;
  const p = approachPoint(ship, e);
  if (flyTo(ship, p.x, p.y, dt)) {
    ship.dockedAt = e.id;
    return true;
  }
  return false;
}

/** Baut ab, liefert true, wenn nichts mehr abgebaut werden kann (voll / kein Bergbau möglich). */
function mineStep(ship, e, dt) {
  const rate = SHIP_TYPES[ship.type].mining;
  if (!rate || e.kind !== 'belt') return true;
  const free = cargoFree(ship);
  if (free <= 0) return true;
  ship.mineAcc = (ship.mineAcc || 0) + rate * (e.richness || 1) * dt;
  const n = Math.min(free, Math.floor(ship.mineAcc));
  if (n > 0) {
    ship.mineAcc -= n;
    const g = BELT_TYPES[e.type].good;
    ship.cargo[g] = (ship.cargo[g] || 0) + n;
  }
  return cargoFree(ship) <= 0;
}

export function updateShip(ship, dt, game) {
  const o = ship.orders;
  ship.vx = 0;
  ship.vy = 0;
  switch (o.type) {
    case 'move':
      ship.state = 'flying';
      if (flyTo(ship, o.x, o.y, dt)) {
        ship.orders = { type: 'idle' };
        ship.state = 'idle';
      }
      break;
    case 'goto': {
      const e = game.world.entities.get(o.targetId);
      if (!e) { ship.orders = { type: 'idle' }; break; }
      ship.state = 'flying';
      if (flyToEntity(ship, e, dt)) {
        ship.orders = { type: 'idle' };
        ship.state = 'docked';
        game.shipLog(ship, `Angekommen bei ${e.name}`);
      }
      break;
    }
    case 'mine': {
      const e = game.world.entities.get(o.targetId);
      if (!e) { ship.orders = { type: 'idle' }; break; }
      if (!flyToEntity(ship, e, dt)) { ship.state = 'flying'; break; }
      ship.state = 'mining';
      if (mineStep(ship, e, dt)) {
        ship.orders = { type: 'idle' };
        ship.state = 'docked';
        game.shipLog(ship, `Laderaum voll (${e.name})`);
      }
      break;
    }
    case 'route':
      runRoute(ship, o, dt, game);
      break;
    case 'supply':
      runSupply(ship, o, dt, game);
      break;
    default:
      ship.state = ship.dockedAt ? 'docked' : 'idle';
  }
}

function runRoute(ship, r, dt, game) {
  if (!r.stops.length) { ship.orders = { type: 'idle' }; return; }
  if (r.index >= r.stops.length) r.index = 0;
  const stop = r.stops[r.index];
  const e = game.world.entities.get(stop.targetId);
  const next = () => { r.index = (r.index + 1) % r.stops.length; r.phase = 'travel'; };
  if (!e) { next(); return; }

  if (r.phase === 'travel') {
    ship.state = 'flying';
    if (!flyToEntity(ship, e, dt)) return;
    r.phase = 'act';
    r.actionIdx = 0;
  }
  if (r.phase === 'act') {
    ship.state = 'docked';
    while (r.actionIdx < stop.actions.length) {
      const a = stop.actions[r.actionIdx];
      if (a.op === 'mine') {
        ship.state = 'mining';
        if (!mineStep(ship, e, dt)) return;
        ship.state = 'docked';
      } else {
        game.trade(ship, e, a.good, a.amount > 0 ? a.amount : Infinity, a.op, a.limit || 0);
      }
      r.actionIdx++;
    }
    r.phase = 'wait';
    r.waitUntil = game.time + 2;
  }
  if (r.phase === 'wait') {
    ship.state = 'docked';
    if (game.time >= r.waitUntil) next();
  }
}

/** Stationseigener Versorger: Quelle anfliegen, laden/abbauen, zur Station zurück, entladen. */
function runSupply(ship, o, dt, game) {
  const station = game.world.entities.get(o.stationId);
  if (!station) { game.removeShip(ship); return; }
  if (o.phase === 'toSource') {
    const src = game.world.entities.get(o.sourceId);
    if (!src) { o.phase = 'toStation'; return; }
    ship.state = 'flying';
    if (!flyToEntity(ship, src, dt)) return;
    if (src.kind === 'belt') {
      ship.state = 'mining';
      if (!mineStep(ship, src, dt)) return;
    } else {
      const slot = src.market?.goods[o.good];
      const n = slot ? Math.min(cargoFree(ship), Math.floor(slot.stock)) : 0;
      if (n > 0) {
        slot.stock -= n;
        ship.cargo[o.good] = (ship.cargo[o.good] || 0) + n;
        stat(src.market, game.time, 'o', o.good, n);
      }
    }
    o.phase = 'toStation';
  }
  if (o.phase === 'toStation') {
    ship.state = 'flying';
    if (!flyToEntity(ship, station, dt)) return;
    game.finishSupply(ship, station);
  }
}
