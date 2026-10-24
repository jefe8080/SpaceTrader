import { GOODS, FLAGSHIP } from '../../shared/config.js';
import { V, CmdError } from './validate.js';
import { tradeAction } from './route.js';
import { pointCovered, manualActionError } from '../coverage.js';

const MAX_QUEUE = 30;

/** Ein Queue-Befehl vom Client -> bereinigter Befehl */
const queueCmd = (v, ctx) => {
  const t = V.oneOf('move', 'goto', 'dock', 'mine', 'wait', 'route', 'harvest')(v?.t);
  switch (t) {
    case 'move':
    case 'harvest': return { t, x: V.num(-1e9, 1e9)(v.x), y: V.num(-1e9, 1e9)(v.y) };
    case 'goto': return { t, target: V.entity()(v.target, ctx).id };
    case 'mine': {
      const e = V.entity()(v.target, ctx);
      if (e.kind !== 'belt') throw new CmdError('Abbau nur in Asteroidenfeldern möglich.');
      return { t, target: e.id };
    }
    case 'dock': {
      const e = V.entity()(v.target, ctx);
      const actions = V.arr(tradeAction, 8)(v.actions ?? []).filter((a) => a.op !== 'mine' && a.op !== 'waitUntil');
      for (const a of actions) {
        if (a.op === 'refuel') { if (!e.market?.goods.shipfuel) throw new CmdError(`Bei ${e.name} gibt es keinen Schiffstreibstoff.`); continue; }
        if (!e.market?.goods[a.good]) throw new CmdError(`${GOODS[a.good].name} wird bei ${e.name} nicht gehandelt.`);
      }
      return { t, target: e.id, actions };
    }
    case 'wait': return { t, secs: V.int(1, 86400)(v.secs) };
    case 'route': return { t, route: V.ownRoute()(v.route, ctx).id, rounds: V.opt(V.int(0, 1000), 0)(v.rounds) };
  }
};

/** Befehl an Schiff übergeben: ersetzen oder anhängen */
export function giveOrder(game, ship, cmd, append) {
  const player = game.players.get(ship.owner);
  if (game.profile === 'homeworld') {
    if (player?.relic?.operation?.ship === ship.id) return 'Das Schiff ist für die laufende Reliktarbeit gesperrt.';
    if (ship.relicSpeed && (cmd.t === 'route' || cmd.t === 'harvest' || append || (cmd.t === 'dock' && cmd.actions?.length > 1))) return 'Der Reliktträger unterstützt keine Automatisierung oder Befehlsfolgen.';
    const target = cmd.target ? game.world.entities.get(cmd.target) : cmd.x !== undefined ? cmd : ship;
    const error = manualActionError(game, player, ship, target);
    if (error) return error;
    if (!pointCovered(game, player, ship) || !pointCovered(game, player, target)) {
      if (append || cmd.t === 'route' || cmd.t === 'harvest' || (cmd.t === 'dock' && cmd.actions?.length > 1)) return 'Außerhalb der Abdeckung sind nur einzelne manuelle Direktbefehle erlaubt.';
    }
    cmd = { ...cmd, manualDirect: !append && cmd.t !== 'route' && cmd.t !== 'harvest' && (cmd.t !== 'dock' || (cmd.actions?.length || 0) <= 1) };
  }
  if (cmd.t === 'route' && ship.main) return `${ship.name} ist dein Hauptschiff und fährt keine Routen.`;
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
    args: { ship: V.ownShip(), marker: V.opt(V.color()), autoRefuel: V.opt(V.num(0, 0.95)) },
    run(ctx, { ship, marker, autoRefuel }) {
      if (marker !== undefined) ship.marker = marker;
      if (autoRefuel !== undefined) ship.autoRefuel = Math.round(autoRefuel * 100) / 100;
    },
  },
  refuel: {
    args: { ship: V.ownShip() },
    run({ game }, { ship }) {
      const e = game.world.entities.get(ship.dockedAt);
      if (!e) return 'Schiff ist nicht angedockt.';
      const res = game.refuel(ship, e);
      if (!res.ok) return `Tanken nicht möglich: ${res.reason}`;
    },
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
  /** Hauptschiff ernennen (ship) oder abberufen (ship = null), 5 min Sperre nach jeder Änderung */
  flagship: {
    args: { ship: V.opt(V.ownShip(), null) },
    run({ game, player }, { ship }) {
      if (game.profile === 'homeworld') return 'Wähle das aktive manuelle Schiff; den Reliktantrieb wechselst du ausschließlich in einer eigenen Werkstatt.';
      const wait = (player.flagshipAt ?? -Infinity) + FLAGSHIP.COOLDOWN - game.time;
      if (wait > 0) return `Das Hauptschiff kannst du erst in ${Math.ceil(wait / 60)} min wieder wechseln.`;
      const cur = game.shipsOf(player.id).find((s) => s.main);
      if (cur === ship || (!cur && !ship)) return;
      if (cur) { cur.main = false; cur.nav = null; game.shipLog(cur, 'Als Hauptschiff abberufen'); }
      if (ship) {
        ship.main = true;
        ship.nav = null; // Weg mit neuer Geschwindigkeit planen
        ship.queue = ship.queue.filter((c) => c.t !== 'route');
        game.shipLog(ship, 'Zum Hauptschiff ernannt: Tempo ×4, Verbrauch ×4 pro Sekunde, keine Routen');
      }
      player.flagshipAt = game.time;
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
