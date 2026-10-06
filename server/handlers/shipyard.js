import { SHIP_TYPES, SHIP_CLASSES, UPGRADES, MODULES, PILOT_LICENSES, MODULE_SIZE, MODULE_REFUND,
  upgradeCost, shipStats, holdUsage, sellValue, countModules, moduleCapacity } from '../../shared/config.js';
import { V } from './validate.js';

/** Eigenes Schiff ist an einem Ort angedockt, der die Bedingung erfüllt */
const dockedAt = (game, ship, pred) => {
  const e = game.world.entities.get(ship.dockedAt);
  return e && pred(e) ? e : null;
};
const isYard = (e) => e.market?.strategy === 'shipyard';
const isHub = (e) => e.type === 'hub';
/** Module erhältlich: große Werften (1-2 Module), Fraktionsstationen (60 % des Katalogs) */
const offersModule = (e, id) => (e.market?.modules || []).includes(id);

export function pilotLicense(player) { return PILOT_LICENSES[player.pilot || 1]; }

export default {
  buyShip: {
    args: { target: V.entity(), index: V.int(0, 20) },
    run({ game, player }, { target, index }) {
      if (!isYard(target)) return 'Keine Werft.';
      const docked = game.shipsOf(player.id).some((s) => s.dockedAt === target.id);
      if (!docked) return 'Eines deiner Schiffe muss an der Werft angedockt sein.';
      const m = target.market;
      const item = m.forSale[index];
      if (!item) return 'Schiff nicht mehr verfügbar.';
      if (m.owner && m.owner !== player.id && !m.yardSale) return 'Diese Werft verkauft nicht an andere Spieler.';
      const lic = pilotLicense(player);
      const cls = SHIP_TYPES[item.type].cls;
      if (!lic.classes.includes(cls)) return `Für Klasse ${SHIP_CLASSES[cls].name} brauchst du Pilotenlizenz ${SHIP_CLASSES[cls].license}.`;
      if (game.shipsOf(player.id).length >= lic.maxShips) return `Pilotenlizenz ${lic.level} erlaubt höchstens ${lic.maxShips} Schiffe.`;
      if (player.credits < item.price) return 'Nicht genug Credits.';
      player.credits -= item.price;
      if (m.owner && m.owner !== player.id) game.players.get(m.owner).credits += item.price; // Verkauf aus Spielerwerft
      m.forSale.splice(index, 1);
      const s = game.spawnShip(player, item.type, target);
      if (item.upg) Object.assign(s, { upg: item.upg, modules: item.modules || [], upgValue: item.upgValue || 0, fuel: shipStats({ ...s, upg: item.upg }).tank });
      game.shipLog(s, `Neues Schiff gekauft: ${SHIP_TYPES[item.type].name} für ${item.price.toLocaleString('de-DE')} Cr bei ${target.name}`);
    },
  },

  sellShip: {
    args: { ship: V.ownShip() },
    run({ game, player }, { ship }) {
      const e = dockedAt(game, ship, (x) => isYard(x) || isHub(x));
      if (!e) return 'Schiffe verkaufst du an einer Werft oder am Hub.';
      if (game.shipsOf(player.id).length <= 1) return 'Dein letztes Schiff kannst du nicht verkaufen.';
      if (Object.keys(ship.cargo).length) return 'Erst den Laderaum leeren.';
      const value = sellValue(ship);
      player.credits += value;
      game.removeShip(ship);
      game.emit('log', ship, `${ship.name} für ${value.toLocaleString('de-DE')} Cr verkauft`);
    },
  },

  upgrade: {
    args: { ship: V.ownShip(), line: V.key(UPGRADES) },
    run({ game, player }, { ship, line }) {
      const e = dockedAt(game, ship, isYard);
      if (!e) return 'Upgrades gibt es an Werften.';
      const lvl = (ship.upg?.[line] || 0) + 1;
      const max = pilotLicense(player).maxUpgrade;
      if (lvl > max) return `Pilotenlizenz ${player.pilot} erlaubt höchstens Stufe ${max}.`;
      // Eigene Werft: Einbau zum Selbstkostenpreis (halber Preis)
      const own = e.market.owner === player.id;
      const cost = Math.round(upgradeCost(ship.type, lvl) * (own ? 0.5 : 1));
      if (player.credits < cost) return 'Nicht genug Credits.';
      player.credits -= cost;
      ship.upg = { ...ship.upg, [line]: lvl };
      ship.upgValue = (ship.upgValue || 0) + cost;
      game.recordShip(ship, 'upg', cost);
      game.shipLog(ship, `Upgrade ${UPGRADES[line].name} Stufe ${lvl} für ${cost.toLocaleString('de-DE')} Cr`);
    },
  },

  buyModule: {
    args: { ship: V.ownShip(), module: V.key(MODULES) },
    run({ game, player }, { ship, module }) {
      const e = dockedAt(game, ship, (x) => offersModule(x, module) || (x.market?.owner === player.id && isYard(x)));
      if (!e) return 'Dieses Modul wird hier nicht angeboten.';
      const st = shipStats(ship);
      if (st.cargo - holdUsage(ship).cargo < MODULE_SIZE) return `Ein Modul braucht ${MODULE_SIZE} freie Frachteinheiten.`;
      const own = e.market.owner === player.id;
      const cost = Math.round(MODULES[module].price * (own ? 0.5 : 1));
      if (player.credits < cost) return 'Nicht genug Credits.';
      player.credits -= cost;
      ship.modules = [...(ship.modules || []), module];
      ship.upgValue = (ship.upgValue || 0) + cost;
      game.recordShip(ship, 'upg', cost);
      game.discover(player, 'module', module);
      game.shipLog(ship, `Modul eingebaut: ${MODULES[module].name} (${cost.toLocaleString('de-DE')} Cr)`);
    },
  },

  removeModule: {
    args: { ship: V.ownShip(), module: V.key(MODULES) },
    run({ game, player }, { ship, module }) {
      if (!dockedAt(game, ship, isYard)) return 'Module baust du an einer Werft aus.';
      const i = (ship.modules || []).indexOf(module);
      if (i < 0) return 'Modul nicht eingebaut.';
      const n = countModules(ship)[module] - 1;
      const cap = MODULES[module].cap;
      if (cap && holdUsage(ship)[cap] > moduleCapacity(n)) return 'Erst die Ladung aus diesem Bereich entladen.';
      const refund = Math.round(MODULES[module].price * MODULE_REFUND);
      ship.modules = ship.modules.filter((_, k) => k !== i);
      ship.upgValue = Math.max(0, (ship.upgValue || 0) - MODULES[module].price);
      player.credits += refund;
      game.shipLog(ship, `Modul ausgebaut: ${MODULES[module].name}, ${refund.toLocaleString('de-DE')} Cr erstattet`);
    },
  },

  buyLicense: {
    args: { kind: V.oneOf('pilot', 'governor'), name: V.opt(V.str(24, 2)), color: V.opt(V.color()) },
    run({ game, player }, args) {
      const atHub = game.shipsOf(player.id).some((s) => isHub(game.world.entities.get(s.dockedAt) || {}));
      if (!atHub) return 'Lizenzen gibt es nur am Handels-Hub (ein eigenes Schiff muss dort angedockt sein).';
      if (args.kind === 'governor') return game.buyGovernor(player, args);
      const next = PILOT_LICENSES[(player.pilot || 1) + 1];
      if (!next) return 'Höchste Pilotenlizenz erreicht.';
      if (player.credits < next.cost) return 'Nicht genug Credits.';
      player.credits -= next.cost;
      player.pilot = next.level;
      game.emit('notice', player, `Pilotenlizenz ${next.level} erworben`);
    },
  },
};
