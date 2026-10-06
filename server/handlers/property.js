import { GOODS, SHIP_TYPES, SHIPYARD, GOVERNOR_LICENSES, UNLOCK_NAMES, PROP_UPGRADES, FIXED, CUSTOMS_MAX, RECYCLE_SHARE, PILOT_LICENSES,
  propertyKind, minGovernorFor, propertyPrice, propUpgradeCost, extraOptions } from '../../shared/config.js';
import { V, CmdError } from './validate.js';
import { newProperty, buildableTypes, propBook } from '../property.js';

/** Eigener Besitz, liefert { e, prop } */
const ownProp = () => (v, ctx) => {
  const e = V.entity()(v, ctx);
  const prop = ctx.game.ownership.get(e.id);
  if (!prop || prop.player !== ctx.player.id) throw new CmdError('Das gehört dir nicht.');
  return { e, prop };
};
const governor = (player) => GOVERNOR_LICENSES[player.governor || 0];
const dockedOwn = (game, player, e) => game.shipsOf(player.id).filter((s) => s.dockedAt === e.id);

/** Waren aus den Laderäumen der angedockten eigenen Schiffe abziehen (falls vollständig vorhanden) */
function takeGoods(ships, goods) {
  for (const [g, n] of Object.entries(goods)) {
    const have = ships.reduce((a, s) => a + (s.cargo[g] || 0), 0);
    if (have < n) return `Es fehlen ${n - have} ${GOODS[g].name} (an Bord der hier angedockten Schiffe).`;
  }
  for (const [g, n] of Object.entries(goods)) {
    let rest = n;
    for (const s of ships) {
      const k = Math.min(rest, s.cargo[g] || 0);
      s.cargo[g] -= k;
      if (!s.cargo[g]) delete s.cargo[g];
      rest -= k;
    }
  }
  return null;
}

export default {
  buyProperty: {
    args: { target: V.entity() },
    run({ game, player }, { target: e }) {
      const kind = propertyKind(e);
      if (!kind) return 'Dieses Objekt ist nicht käuflich (Hub, Fraktionscluster oder Startsystem).';
      if (game.ownership.has(e.id)) return 'Das gehört schon jemandem.';
      const gov = governor(player);
      if (!gov) return 'Für Besitz brauchst du eine Gouverneurslizenz (am Hub).';
      if (!gov.unlocks.includes(kind)) return `${UNLOCK_NAMES[kind]} erfordern Gouverneurslizenz ${minGovernorFor(kind)}.`;
      const owned = [...game.ownership.values()].filter((p) => p.player === player.id).length;
      if (owned >= gov.maxProps) return `Gouverneurslizenz ${gov.level} erlaubt höchstens ${gov.maxProps} Besitztümer.`;
      if (!dockedOwn(game, player, e).length) return 'Kauf nur vor Ort: ein eigenes Schiff muss angedockt sein.';
      const price = propertyPrice(e);
      if (player.credits < price) return 'Nicht genug Credits.';
      player.credits -= price;
      const prop = newProperty(e.id, player.id, game.time);
      if (e.kind === 'planet') for (const [g, s] of Object.entries(e.market.goods)) if (s.role === 'consume') prop.fixed[g] = FIXED.DEFAULT;
      game.setOwner(e, player, prop);
      game.emit('notice', player, `${e.name} gehört jetzt dir.`);
    },
  },

  propMode: {
    args: { target: ownProp(), mode: V.oneOf('open', 'private') },
    run({ game }, { target: { e, prop }, mode }) { prop.mode = mode; game.refreshProperty(e); },
  },

  propCustoms: {
    args: { target: ownProp(), value: V.num(0, CUSTOMS_MAX) },
    run({ game, player }, { target: { e, prop }, value }) {
      if (!governor(player)?.unlocks.includes('customs')) return 'Zoll erfordert Gouverneurslizenz 3.';
      prop.customs = Math.round(value * 100) / 100;
      game.refreshProperty(e);
    },
  },

  propFixed: {
    args: { target: ownProp(), good: V.key(GOODS), s: V.num(FIXED.MIN, FIXED.MAX) },
    run(ctx, { target: { e, prop }, good, s }) {
      if (e.kind !== 'planet' || e.market.goods[good]?.role !== 'consume') return 'Fixpreise gibt es nur für den Verbrauch eigener Planeten.';
      prop.fixed[good] = Math.round(s * 100) / 100;
    },
  },

  propUpgrade: {
    args: { target: ownProp(), line: V.key(PROP_UPGRADES), extra: V.opt(V.str(30)) },
    run({ game, player }, { target: { e, prop }, line, extra }) {
      const lvl = (prop.upg[line] || 0) + 1;
      const max = governor(player)?.maxLevel || 0;
      if (lvl > max) return `Gouverneurslizenz ${player.governor} erlaubt höchstens Ausbaustufe ${max}.`;
      if (line === 'extra') {
        const opts = extraOptions(e);
        if (e.market.strategy !== 'shipyard') {
          if (!extra || !opts.includes(extra)) return 'Bitte eine Zusatzproduktion aus der Liste wählen.';
          if (prop.extras.includes(extra)) return 'Diese Produktion läuft schon.';
        }
      }
      const cost = propUpgradeCost(e, line, lvl);
      if (player.credits < cost.credits) return 'Nicht genug Credits.';
      const err = takeGoods(dockedOwn(game, player, e), cost.goods);
      if (err) return err;
      player.credits -= cost.credits;
      propBook(game, prop, 'exp', cost.credits);
      prop.upg[line] = lvl;
      if (line === 'extra' && extra) prop.extras.push(extra);
      game.refreshProperty(e);
      game.emit('notice', player, `${e.name}: ${PROP_UPGRADES[line].name} Stufe ${lvl}`);
    },
  },

  // ---------- Eigene Werften ----------
  yardBuild: {
    args: { target: ownProp(), type: V.key(SHIP_TYPES) },
    run(ctx, { target: { e, prop }, type }) {
      const m = e.market;
      if (m.strategy !== 'shipyard') return 'Keine Werft.';
      if (!buildableTypes(e, prop).includes(type)) return 'Diese Klasse kann die Werft (noch) nicht bauen.';
      if (m.building) return 'Die Werft baut bereits.';
      const req = SHIP_TYPES[type].build;
      for (const [g, n] of Object.entries(req)) if ((m.goods[g]?.stock || 0) < n) return `Es fehlen ${Math.ceil(n - (m.goods[g]?.stock || 0))} ${GOODS[g].name} im Werftlager.`;
      for (const [g, n] of Object.entries(req)) m.goods[g].stock -= n;
      m.building = { type, remaining: SHIPYARD.BUILD_TIME[SHIP_TYPES[type].cls] };
    },
  },
  yardClaim: {
    args: { target: ownProp(), index: V.int(0, 50) },
    run({ game, player }, { target: { e }, index }) {
      const item = e.market.forSale[index];
      if (!item?.own) return 'Kein Schiff im Werftbestand.';
      const lic = PILOT_LICENSES[player.pilot || 1];
      if (game.shipsOf(player.id).length >= lic.maxShips) return `Pilotenlizenz ${lic.level} erlaubt höchstens ${lic.maxShips} Schiffe.`;
      if (!lic.classes.includes(SHIP_TYPES[item.type].cls)) return 'Für diese Klasse fehlt dir die Pilotenlizenz.';
      e.market.forSale.splice(index, 1);
      const s = game.spawnShip(player, item.type, e);
      game.shipLog(s, `In die Flotte übernommen von ${e.name}`);
    },
  },
  yardSale: {
    args: { target: ownProp(), on: V.bool() },
    run({ game }, { target: { e }, on }) { e.market.yardSale = on; game.refreshProperty(e); },
  },
  yardPrice: {
    args: { target: ownProp(), index: V.int(0, 50), price: V.int(0, 1e10) },
    run(ctx, { target: { e }, index, price }) {
      const item = e.market.forSale[index];
      if (!item?.own) return 'Kein Schiff im Werftbestand.';
      item.price = price;
    },
  },
  /** Recycling: 50 % der Baumaterialien gehen ins Werftlager */
  recycle: {
    args: { ship: V.ownShip() },
    run({ game, player }, { ship }) {
      const e = game.world.entities.get(ship.dockedAt);
      const prop = e && game.ownership.get(e.id);
      if (!prop || prop.player !== player.id || e.market.strategy !== 'shipyard') return 'Recycling nur an einer eigenen Werft.';
      if (game.shipsOf(player.id).length <= 1) return 'Dein letztes Schiff kannst du nicht recyceln.';
      if (Object.keys(ship.cargo).length) return 'Erst den Laderaum leeren.';
      const req = SHIP_TYPES[ship.type].build || {};
      for (const [g, n] of Object.entries(req)) {
        const k = Math.floor(n * RECYCLE_SHARE);
        if (!e.market.goods[g]) e.market.goods[g] = { role: 'consume', rate: 0, cap: Math.max(300, k * 2), baseCap: Math.max(300, k * 2), stock: 0, mod: 1 };
        const slot = e.market.goods[g];
        slot.stock = Math.min(slot.cap, slot.stock + k);
      }
      game.removeShip(ship);
      game.emit('notice', player, `${ship.name} recycelt, Material im Werftlager von ${e.name}`);
      game.refreshProperty(e);
    },
  },
};

