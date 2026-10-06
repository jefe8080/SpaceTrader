import { GOODS, SHIP_TYPES } from '../../shared/config.js';
import { V } from './validate.js';

export default {
  move: {
    args: { ship: V.ownShip(), x: V.num(-1e9, 1e9), y: V.num(-1e9, 1e9) },
    run(ctx, { ship, x, y }) { ship.orders = { type: 'move', x, y }; },
  },
  goto: {
    args: { ship: V.ownShip(), target: V.entity() },
    run(ctx, { ship, target }) { ship.orders = { type: 'goto', targetId: target.id }; },
  },
  mine: {
    args: { ship: V.ownShip(), target: V.entity() },
    run(ctx, { ship, target }) {
      if (target.kind !== 'belt') return 'Nur in Asteroidenfeldern möglich.';
      if (!SHIP_TYPES[ship.type].mining) return 'Dieses Schiff hat keine Bergbauausrüstung.';
      ship.orders = { type: 'mine', targetId: target.id };
    },
  },
  stop: {
    args: { ship: V.ownShip() },
    run(ctx, { ship }) { ship.orders = { type: 'idle' }; },
  },
  rename: {
    args: { ship: V.ownShip(), name: V.str(24, 1) },
    run(ctx, { ship, name }) { ship.name = name; },
  },
  jettison: {
    args: { ship: V.ownShip(), good: V.key(GOODS) },
    run({ game }, { ship, good }) {
      if (!ship.cargo[good]) return;
      game.shipLog(ship, `${ship.cargo[good]} ${GOODS[good].name} abgeworfen`);
      delete ship.cargo[good];
    },
  },
};
