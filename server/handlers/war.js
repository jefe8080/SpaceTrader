// PRD 15: Befehle für Stacks, Schlachten, Reparatur, Diplomatie und Raids. Der Server prüft jede Regel selbst.
import { V, CmdError } from './validate.js';
import { manualActionError } from '../coverage.js';
import { stackOf, stackBlocker, detachShip, reorderStack, leaderOf } from '../war/stacks.js';
import { giveOrder } from './ship.js';
import { attackerError, targetError } from '../war/engage.js';
import { ransom, ransomQuote } from '../war/outcome.js';
import { beginRetreat, isActive, defaultTactic } from '../war/battle.js';
import { COMBAT, blueprint } from '../../shared/combat.js';
import { kindFactor } from '../../shared/damage.js';

const battleOf = () => (v, { game }) => { const b = game.battles.get(v); if (!b) throw new CmdError('Diese Schlacht ist beendet.'); return b; };
const ORDER_TYPES = ['move', 'attack', 'escort', 'defend', 'distance', 'hold', 'ceasefire', 'retreat', 'ai', 'priority'];
const num = (lo, hi) => V.num(lo, hi);

const ownStack = () => (v, { game, player }) => {
  const st = game.stacks.get(v);
  if (!st || st.owner !== player.id) throw new CmdError('Unbekannter Stack.');
  return st;
};

export default {
  /** Ausgewähltes Schiff zu einem anderen eigenen Schiff schicken; der Stack entsteht erst beim Zusammentreffen */
  stackJoin: {
    args: { ships: V.ownShips(24), target: V.ownShip() },
    run({ game, player }, { ships, target }) {
      const err = stackBlocker(game, target);
      if (err) return err;
      for (const s of ships) {
        if (s === target || (s.stack && s.stack === target.stack)) continue;
        const blocked = stackBlocker(game, s) || manualActionError(game, player, s, leaderOf(game, target));
        if (blocked) return blocked;
      }
      for (const s of ships) {
        if (s === target || (s.stack && s.stack === target.stack)) continue;
        const leading = stackOf(game, s)?.members[0] === s.id;
        if (s.stack && !leading) detachShip(game, s);
        s.queue = [{ t: 'join', ship: target.id, qid: ++s.qid }];
        s.nav = null;
        game.shipLog(s, `Fliegt zu ${target.name}, um einen Stack zu bilden`);
      }
    },
  },
  stackDetach: {
    args: { ship: V.ownShip() },
    run({ game }, { ship }) {
      if (!ship.stack) return 'Das Schiff gehört keinem Stack an.';
      if (ship.battle) return 'Während der Schlacht bleibt der Stack bestehen.';
      if (stackOf(game, ship)?.routeKey) return 'Routenstacks löst du über die Stacknummer im Routeneditor.';
      detachShip(game, ship);
    },
  },
  stackMove: {
    args: { stack: ownStack(), ship: V.ownShip(), dir: V.oneOf(-1, 1) },
    run({ game }, { stack, ship, dir }) {
      if (ship.stack !== stack.id) return 'Das Schiff gehört nicht zu diesem Stack.';
      return reorderStack(game, stack, ship.id, dir);
    },
  },
  /** Ausdrücklicher Angriffsbefehl; normale Flugbefehle sind keine Angriffe */
  attack: {
    args: { ships: V.ownShips(24), target: (v, { game }) => { const t = game.ships.get(v); if (!t) throw new CmdError('Unbekanntes Ziel.'); return t; } },
    run({ game, player }, { ships, target }) {
      for (const s of ships) {
        if (s.captive || s.battle) return `${s.name} ist nicht einsatzbereit.`;
        const err = attackerError(game, s) || targetError(game, s, target);
        if (err) return err;
        if (s.repairHold) return `${s.name} muss vor erneutem Kampfeinsatz repariert werden.`;
      }
      if (target.owner !== player.id && !game.isKnown(player, target)) return 'Ziel liegt außerhalb deiner Erfassung.';
      for (const s of ships) {
        const err = giveOrder(game, s, { t: 'attack', target: target.id }, false);
        if (err) return err;
      }
    },
  },
  /** Taktische Befehle: nur eigene Einheiten, auch im Konsortium keine fremden */
  battleOrder: {
    args: { battle: battleOf(), ships: V.arr(V.str(32, 1), 60), order: (v) => {
      if (!v || !ORDER_TYPES.includes(v.t)) throw new CmdError('Unbekannter Befehl.');
      const o = { t: v.t };
      if (v.t === 'move' || v.t === 'defend') { o.x = num(0, COMBAT.MAP.W)(v.x); o.y = num(0, COMBAT.MAP.H)(v.y); }
      if (['attack', 'escort', 'distance'].includes(v.t)) o.target = V.str(32, 1)(v.target);
      if (v.t === 'attack' && v.sys) o.sys = V.str(24, 1)(v.sys);
      if (v.t === 'attack') o.evade = V.bool()(v.evade);
      if (v.t === 'distance') o.d = num(100, 3000)(v.d ?? 900);
      if (v.t === 'priority') o.p = v.p ? V.oneOf('weapons', 'engines', 'shields')(v.p) : null;
      return o;
    } },
    run({ game, player }, { battle: b, ships, order }) {
      const units = ships.map((id) => b.units[id]).filter(Boolean);
      if (!units.length) return 'Keine Einheiten gewählt.';
      if (units.some((u) => u.owner !== player.id)) return 'Nur eigene Einheiten sind steuerbar.';
      for (const u of units) {
        if (!isActive(u)) continue;
        const ship = game.ships.get(u.ship);
        if (order.t === 'ai') { u.ai = true; u.order = null; continue; }
        if (order.t === 'priority') { u.prio = order.p; continue; }
        if (order.t === 'retreat') { beginRetreat(game, b, u, 'Befehl'); continue; }
        if (order.target) {
          const t = b.units[order.target];
          if (!t || !isActive(t)) return 'Ziel nicht verfügbar.';
          if (order.t === 'attack' && t.side === u.side) return 'Nur gegnerische Einheiten angreifen.';
          if (order.t === 'escort' && t.side !== u.side) return 'Eskorte nur für die eigene Seite.';
          if (order.t !== 'escort' && !b.known[u.side][t.ship]?.live) return 'Ziel ist nicht erfasst.';
          if (order.sys && !b.known[u.side][t.ship]?.sys.includes(order.sys)) return 'Systemposition ist nicht bekannt.';
        }
        const bp = blueprint(ship.type);
        const moving = ['move', 'defend', 'escort', 'distance'].includes(order.t);
        if (moving && !bp.squad && kindFactor(u, ship, 'engine', b.t) === 0 && (!bp.systems.some((s) => s.kind === 'thrust') || kindFactor(u, ship, 'thrust', b.t) === 0)) return `${ship.name} ist bewegungsunfähig.`;
        if (u.state === 'retreating' && order.t !== 'ceasefire') { u.state = 'fight'; u.prep = 0; }
        u.ai = false;
        u.order = order;
      }
    },
  },
  /** Taktische Grundhaltung, Rückzugspolitik und Schadenskontrollpriorität; getrennt speicherbar je Schiff */
  battleTactic: {
    args: { ship: V.ownShip(false, true), stance: V.opt(V.oneOf('offensive', 'defensive', 'escort')), hull: V.opt(V.num(0, 0.95)), weaponsOut: V.opt(V.bool()),
      losses: V.opt(V.num(0, 1)), systems: V.opt(V.bool()), dcPrio: V.opt(V.str(24, 1)) },
    run({ game }, { ship, stance, hull, weaponsOut, losses, systems, dcPrio }) {
      const t = ship.tactic ||= structuredClone(defaultTactic(ship.type));
      if (stance) t.stance = stance;
      for (const [k, v] of Object.entries({ hull, weaponsOut, losses, systems })) if (v !== undefined) t.retreat[k] = v;
      const u = ship.battle && game.battles.get(ship.battle)?.units[ship.id];
      if (u) {
        u.stance = t.stance; u.retreat = { ...t.retreat };
        if (dcPrio !== undefined) u.dcPrio = blueprint(ship.type).systems.some((s) => s.id === dcPrio) ? dcPrio : null;
      }
    },
  },
  /** Freikauf eines eigenen gefangenen Schiffes: fester Preis, vorher angezeigt */
  ransom: {
    args: { ship: V.ownShip(true, true), price: V.int(0, 1e12) },
    run({ game, player }, { ship, price }) {
      const q = ransomQuote(game, ship);
      if (!q) return 'Das Schiff ist nicht gefangen.';
      if (q.price !== price) return `Der Freikaufpreis beträgt ${q.price} Cr.`;
      return ransom(game, player, ship) || undefined;
    },
  },
  /** Stacknummer 1-9 je Schiff innerhalb einer Route (0 = keine Nummer, eigenständig) */
  routeStackNo: {
    args: { route: V.ownRoute(), ship: V.ownShip(), n: V.int(0, 9) },
    run({ game }, { route, ship, n }) {
      route.stackNo ||= {};
      if (!n) delete route.stackNo[ship.id];
      else route.stackNo[ship.id] = n;
      if (!n && stackOf(game, ship)?.routeKey?.startsWith(route.id + ':')) detachShip(game, ship);
      game.emit('routes');
    },
  },
};

export { giveOrder };
