import { GOODS } from '../../shared/config.js';
import { V } from './validate.js';

const action = (v) => {
  const op = V.oneOf('buy', 'sell', 'mine')(v?.op);
  if (op === 'mine') return { op };
  return {
    op,
    good: V.key(GOODS)(v.good),
    amount: V.opt(V.int(0, 1e6), 0)(v.amount),
    limit: Math.round(V.opt(V.num(0, 1e9), 0)(v.limit) * 10) / 10,
  };
};
const stop = (v, ctx) => ({ target: V.entity()(v?.targetId, ctx), actions: V.arr(action, 8)(v?.actions ?? []) });

export default {
  route: {
    args: { ship: V.ownShip(), stops: V.arr(stop, 12) },
    run({ game }, { ship, stops }) {
      const out = stops.map(({ target, actions }) => ({
        targetId: target.id,
        actions: actions.filter((a) => (a.op === 'mine' ? target.kind === 'belt' : !!target.market?.goods[a.good])),
      }));
      ship.orders = out.length ? { type: 'route', stops: out, index: 0, phase: 'travel', actionIdx: 0 } : { type: 'idle' };
      game.shipLog(ship, out.length ? `Neue Route mit ${out.length} Stopps` : 'Route gelöscht');
    },
  },
};
