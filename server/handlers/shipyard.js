import { GOODS, SHIP_TYPES, SHIP_CLASSES, SHIPYARD, UPGRADES, MODULES, PILOT_LICENSES, MODULE_SIZE, MODULE_REFUND,
  upgradeCost, shipStats, holdUsage, sellValue, countModules, moduleCapacity, pilotLevel, factionRank, RANK_NAMES, FACTIONS } from '../../shared/config.js';
import { V } from './validate.js';

/** Eigenes Schiff ist an einem Ort angedockt, der die Bedingung erfüllt */
const dockedAt = (game, ship, pred) => {
  const e = game.world.entities.get(ship.dockedAt);
  return e && pred(e) ? e : null;
};
const isYard = (e) => e.market?.strategy === 'shipyard' || e.market?.strategy === 'factionyard';
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
      if (item.faction) return 'Fraktionsschiffe gibt es nur über das Angebot der Fraktionswerft.';
      if (item.reservedFor && item.reservedFor !== player.id && game.time < item.reservedUntil) return `Dieses Schiff ist noch ${Math.ceil((item.reservedUntil - game.time) / 60)} min für den Besteller reserviert.`;
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
      if (item.bonus) Object.assign(s, { bonus: item.bonus, yardLvl: item.yardLvl, fuel: shipStats({ ...s, bonus: item.bonus }).tank });
      if (item.upg) Object.assign(s, { upg: item.upg, modules: item.modules || [], upgValue: item.upgValue || 0, fuel: shipStats({ ...s, upg: item.upg }).tank });
      game.shipLog(s, `Neues Schiff gekauft: ${SHIP_TYPES[item.type].name} für ${item.price.toLocaleString('de-DE')} Cr bei ${target.name}`);
    },
  },

  /**
   * Fraktionsschiff: doppelt gesperrt durch Fraktionsrang und Pilotenlizenz.
   * Preis: Credits plus Schiffswährung aus den Laderäumen der hier angedockten eigenen Schiffe.
   */
  buyFactionShip: {
    args: { target: V.entity(), index: V.opt(V.int(0, 10), 0) },
    run({ game, player }, { target, index }) {
      const m = target.market;
      if (m?.strategy !== 'factionyard') return 'Keine Fraktionswerft.';
      const docked = game.shipsOf(player.id).filter((s) => s.dockedAt === target.id);
      if (!docked.length) return 'Eines deiner Schiffe muss an der Fraktionswerft angedockt sein.';
      const item = m.forSale[index];
      if (!item) return 'Unbekanntes Schiff.';
      const d = SHIP_TYPES[item.type];
      const rank = factionRank(player.rep?.[d.faction]);
      if (rank < d.rank) return `${d.name} erfordert Rang ${d.rank} (${RANK_NAMES[d.rank]}) bei ${FACTIONS[d.faction].name}, du hast Rang ${rank}.`;
      const lic = pilotLicense(player);
      if (!lic.classes.includes(d.cls)) return `${d.name} erfordert Pilotenlizenz ${SHIP_CLASSES[d.cls].license}.`;
      if (game.shipsOf(player.id).length >= lic.maxShips) return `Pilotenlizenz ${lic.level} erlaubt höchstens ${lic.maxShips} Schiffe.`;
      const { good, n } = item.currency;
      const have = docked.reduce((s, x) => s + (x.cargo[good] || 0), 0);
      if (have < n) return `Es fehlen ${n - have} ${GOODS[good].name} (in den Laderäumen der angedockten Schiffe).`;
      if (player.credits < item.price) return 'Nicht genug Credits.';
      player.credits -= item.price;
      let rest = n;
      for (const s of docked) {
        const k = Math.min(rest, s.cargo[good] || 0);
        s.cargo[good] -= k;
        if (!s.cargo[good]) delete s.cargo[good];
        rest -= k;
      }
      const s = game.spawnShip(player, item.type, target);
      game.shipLog(s, `Fraktionsschiff ${SHIP_TYPES[item.type].name} erworben`);
    },
  },

  /**
   * Bestellslot einer NPC-Werft: bekannter, erlaubter Typ in der passenden Werftgröße. Anzahlung 2 × Katalogpreis
   * (keine Erstattung). Eine offene Bestellung je Werft für alle Spieler.
   */
  yardOrder: {
    args: { target: V.entity(), type: V.key(SHIP_TYPES) },
    run({ game, player }, { target: e, type }) {
      const m = e.market;
      if (m?.strategy === 'factionyard') return 'Fraktionsschiffe sind an der Fraktionswerft dauerhaft im Angebot.';
      if (m?.strategy !== 'shipyard') return 'Keine Werft.';
      if (m.owner) return 'Spielerwerften haben keinen Bestellslot.';
      if (!game.shipsOf(player.id).some((s) => s.dockedAt === e.id)) return 'Eines deiner Schiffe muss an der Werft angedockt sein.';
      if (m.order) return `Bestellt: ${SHIP_TYPES[m.order.type].name}. Eine neue Bestellung ist erst nach Fertigstellung möglich.`;
      const d = SHIP_TYPES[type];
      if (d.npc || d.faction) return 'Dieser Typ ist nicht bestellbar.';
      if (!player.known.ship.has(type)) return 'Bestellen kannst du nur Schiffe aus deinem Almanach.';
      if (!SHIPYARD.ORDER_CLASSES[e.type]?.includes(d.cls)) return `${e.type === 'bigyard' ? 'Große Werften' : 'Werften'} bauen nur Klasse ${SHIPYARD.ORDER_CLASSES[e.type].join(' und ')}.`;
      const lic = pilotLicense(player);
      if (!lic.classes.includes(d.cls)) return `Für Klasse ${SHIP_CLASSES[d.cls].name} brauchst du Pilotenlizenz ${SHIP_CLASSES[d.cls].license}.`;
      const deposit = d.price * SHIPYARD.DEPOSIT;
      if (player.credits < deposit) return `Die Anzahlung beträgt ${deposit.toLocaleString('de-DE')} Cr.`;
      player.credits -= deposit;
      m.order = { type, player: player.id, name: player.name, paid: deposit, at: Math.round(game.time) };
      game.emit('notice', player, `${d.name} bei ${e.name} bestellt (Anzahlung ${deposit.toLocaleString('de-DE')} Cr).`);
    },
  },

  sellShip: {
    args: { ship: V.ownShip() },
    run({ game, player }, { ship }) {
      const e = dockedAt(game, ship, (x) => isYard(x) || isHub(x));
      if (!e) return 'Schiffe verkaufst du an einer Werft oder am Hub.';
      const giveErr = game.canGiveAway(player, ship);
      if (giveErr) return giveErr;
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
      if (pilotLevel(player.xp) < next.level) return `Pilotenlizenz ${next.level} erfordert Pilotenlevel ${next.level} (Erfahrung aus Quests, Erkundung und Almanach).`;
      if (player.credits < next.cost) return 'Nicht genug Credits.';
      player.credits -= next.cost;
      player.pilot = next.level;
      game.emit('notice', player, `Pilotenlizenz ${next.level} erworben`);
    },
  },
};
