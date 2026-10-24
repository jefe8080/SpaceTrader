import { GOODS } from '../../shared/config.js';
import { V } from './validate.js';
import { manualActionError } from '../coverage.js';

export default {
  trade: {
    args: { ship: V.ownShip(), target: V.entity(), good: V.key(GOODS), dir: V.oneOf('buy', 'sell'), amount: V.opt((v) => (v === 'max' ? Infinity : V.int(1, 1e6)(v)), 1) },
    run({ game, player }, { ship, target, good, dir, amount }) {
      const error = manualActionError(game, player, ship, target);
      if (error) return error;
      if (ship.queue[0]?.t === 'route') return 'Schiff fährt eine Route. Erst stoppen.';
      const res = game.trade(ship, target, good, amount, dir, 0, { manual: true });
      if (!res.n) return `${dir === 'buy' ? 'Kauf' : 'Verkauf'} nicht möglich: ${res.reason}`;
    },
  },
};
