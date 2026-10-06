import { GOODS, SHIP_TYPES } from '../../shared/config.js';
import { V } from './validate.js';

export default {
  trade: {
    args: { ship: V.ownShip(), target: V.entity(), good: V.key(GOODS), dir: V.oneOf('buy', 'sell'), amount: V.opt((v) => (v === 'max' ? Infinity : V.int(1, 1e6)(v)), 1) },
    run({ game }, { ship, target, good, dir, amount }) {
      if (ship.orders.type === 'route') return 'Schiff fährt eine Route. Erst stoppen.';
      const res = game.trade(ship, target, good, amount, dir);
      if (!res.n) return res.reason || (dir === 'buy' ? 'Kauf nicht möglich (Credits, Laderaum oder Bestand).' : 'Verkauf nicht möglich (Lager voll?).');
    },
  },
  buyShip: {
    args: { target: V.entity(), index: V.int(0, 20) },
    run({ game, player }, { target, index }) {
      if (target.market?.strategy !== 'shipyard') return 'Keine Werft.';
      const docked = [...game.ships.values()].some((s) => s.owner === player.id && s.dockedAt === target.id);
      if (!docked) return 'Eines deiner Schiffe muss an der Werft angedockt sein.';
      const item = target.market.forSale[index];
      if (!item) return 'Schiff nicht mehr verfügbar.';
      if (player.credits < item.price) return 'Nicht genug Credits.';
      player.credits -= item.price;
      target.market.forSale.splice(index, 1);
      const s = game.spawnShip(player, item.type, target);
      game.shipLog(s, `Neues Schiff gekauft: ${SHIP_TYPES[item.type].name} bei ${target.name}`);
    },
  },
};
