import { GOODS } from '../../shared/config.js';
import { V, CmdError } from './validate.js';
import { tradeAction } from './route.js';

const MAX_QUEUE = 30;

/** Ein Queue-Befehl vom Client -> bereinigter Befehl */
const queueCmd = (v, ctx) => {
  const t = V.oneOf('move', 'goto', 'dock', 'mine', 'wait', 'route')(v?.t);
  switch (t) {
    case 'move': return { t, x: V.num(-1e9, 1e9)(v.x), y: V.num(-1e9, 1e9)(v.y) };
    case 'goto': return { t, target: V.entity()(v.target, ctx).id };
    case 'mine': {
      const e = V.entity()(v.target, ctx);
      if (e.kind !== 'belt') throw new CmdError('Abbau nur in Asteroidenfeldern möglich.');
      return { t, target: e.id };
    }
    case 'dock': {
      const e = V.entity()(v.target, ctx);
      const actions = V.arr(tradeAction, 8)(v.actions ?? []).filter((a) => a.op !== 'mine' && a.op !== 'waitUntil');
      for (const a of actions) if (!e.market?.goods[a.good]) throw new CmdError(`${GOODS[a.good].name} wird bei ${e.name} nicht gehandelt.`);
      return { t, target: e.id, actions };
    }
    case 'wait': return { t, secs: V.int(1, 86400)(v.secs) };
    case 'route': return { t, route: V.ownRoute()(v.route, ctx).id, rounds: V.opt(V.int(0, 1000), 0)(v.rounds) };
  }
};

/** Befehl an Schiff übergeben: ersetzen oder anhängen */
export function giveOrder(game, ship, cmd, append) {
  const c = { ...cmd, qid: ++ship.qid };
  if (!append) {
    ship.queue = [c];
    ship.fails = {};
    ship.warn = {};
  } else {
    if (ship.queue.length >= MAX_QUEUE) return `Queue von ${ship.name} ist voll (max. ${MAX_QUEUE}).`;
    ship.queue.push(c);
  }
}

export default {
  order: {
    args: { ships: V.ownShips(), order: queueCmd, append: V.bool() },
    run({ game }, { ships, order, append }) {
      for (const s of ships) {
        const err = giveOrder(game, s, order, append);
        if (err) return err;
      }
    },
  },
  queueRemove: {
    args: { ship: V.ownShip(), qid: V.int(0, 1e9) },
    run(ctx, { ship, qid }) {
      ship.queue = ship.queue.filter((c) => c.qid !== qid);
    },
  },
  queueMove: {
    args: { ship: V.ownShip(), qid: V.int(0, 1e9), dir: V.oneOf(-1, 1) },
    run(ctx, { ship, qid, dir }) {
      const q = ship.queue;
      const i = q.findIndex((c) => c.qid === qid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= q.length) return;
      [q[i], q[j]] = [q[j], q[i]];
      // Laufzeitzustand des bisher ersten Befehls verwerfen, damit er neu beginnt
      for (const c of [q[i], q[j]]) { delete c.actionIdx; delete c.until; delete c.arrived; }
    },
  },
  stop: {
    args: { ships: V.ownShips() },
    run(ctx, { ships }) { for (const s of ships) { s.queue = []; s.warn = {}; s.fails = {}; } },
  },
  shipSettings: {
    args: { ship: V.ownShip(), marker: V.opt(V.color(), null) },
    run(ctx, { ship, marker }) { ship.marker = marker; },
  },
  clearWarn: {
    args: { ship: V.ownShip() },
    run(ctx, { ship }) { ship.warn = {}; ship.fails = {}; },
  },
  rename: {
    args: { ship: V.ownShip(), name: V.str(24, 1) },
    run({ game, player }, { ship, name }) {
      const taken = game.shipsOf(player.id).some((s) => s.id !== ship.id && s.name.toLowerCase() === name.toLowerCase());
      if (taken) return 'Diesen Namen trägt schon ein anderes deiner Schiffe.';
      ship.name = name;
    },
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
