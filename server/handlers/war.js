// PRD 15: Befehle für Stacks, Schlachten, Reparatur, Diplomatie und Raids. Der Server prüft jede Regel selbst.
import { V, CmdError } from './validate.js';
import { manualActionError } from '../coverage.js';
import { stackOf, stackBlocker, detachShip, reorderStack, leaderOf } from '../war/stacks.js';
import { giveOrder } from './ship.js';
import { attackerError, targetError } from '../war/engage.js';
import { ransom, ransomQuote } from '../war/outcome.js';

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
