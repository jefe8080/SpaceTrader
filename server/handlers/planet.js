import { GOODS, RECIPES, BUILDING, buildingUpgradeCost, upgradeValue, factorySlots, factoryCost, recipeCat, RECIPE_CATS, isConsortiumOwner } from '../../shared/config.js';
import { V, CmdError } from './validate.js';
import { takeGoods, dockedOwn } from './property.js';
import { applyLevel } from '../markets.js';
import { clog } from '../consortium.js';

/** Planet, an dem ein eigenes Schiff angedockt ist (Voraussetzung für die planetare Ansicht) */
const landedPlanet = () => (v, ctx) => {
  const e = V.entity()(v, ctx);
  if (e.kind !== 'planet' || !e.market) throw new CmdError('Nur Planeten haben eine planetare Ansicht.');
  return e;
};

/** Zahler eines Ausbaus: Konsortiumsplaneten zahlt der Pool (nur Handelsmeister), sonst der Spieler */
function payerFor(game, player, e) {
  const prop = game.ownership.get(e.id);
  if (prop && isConsortiumOwner(prop.player) && game.canManage(prop, player.id)) return { payer: game.accountOf(prop.player), cons: game.accountOf(prop.player) };
  return { payer: player, cons: null };
}

export default {
  /**
   * Gebäude-Ausbau (PRD-3 6.3): jeder Spieler mit angedocktem Schiff bis Level 6, Level 7 bis 10 nur der Besitzer
   * (bzw. Handelsmeister). Credits plus Waren aus den Laderäumen, Questgeber-XP aus dem Ausbauwert, keine Piloten-XP.
   */
  bldUpgrade: {
    args: { target: landedPlanet(), good: V.key(GOODS) },
    run({ game, player }, { target: e, good }) {
      const ships = dockedOwn(game, player, e);
      if (!ships.length) return 'Ein eigenes Schiff muss hier angedockt sein.';
      const s = e.market.goods[good];
      if (!s || (s.role !== 'produce' && s.role !== 'consume') || s.fac) return 'Für diese Ware gibt es hier kein Gebäude.';
      const b = game.buildingsOf(e);
      const lvl = (b.lvl[good] || 0) + 1;
      const prop = game.ownership.get(e.id);
      const max = game.canManage(prop, player.id) ? BUILDING.MAX_OWNER : BUILDING.MAX_PUBLIC;
      if (lvl > max) return max === BUILDING.MAX_PUBLIC ? `Level ${lvl} bis ${BUILDING.MAX_OWNER} nur für den Besitzer des Planeten.` : 'Höchstes Level erreicht.';
      const cost = buildingUpgradeCost(e, lvl);
      const { payer, cons } = payerFor(game, player, e);
      if (payer.credits < cost.credits) return cons ? 'Nicht genug Credits im Pool.' : 'Nicht genug Credits.';
      const err = takeGoods(ships, cost.goods);
      if (err) return err;
      payer.credits -= cost.credits;
      b.lvl[good] = lvl;
      applyLevel(e);
      game.addGiverXp(e, upgradeValue(cost) / BUILDING.XP_CR);
      if (cons) { clog(game, cons, player.id, 'upgrade', cost.credits, `${e.name}: Gebäude ${GOODS[good].name} ${lvl}`); game.emit('consortium', cons); }
      game.emit('entity', e);
      game.emit('notice', player, `${e.name}: Gebäude ${GOODS[good].name} auf Level ${lvl}`);
    },
  },

  /** Fabrik auf einem Bauplatz eines eigenen Planeten (PRD-3 6.4) */
  facBuild: {
    args: { target: landedPlanet(), recipe: V.key(RECIPES) },
    run({ game, player }, { target: e, recipe }) {
      const prop = game.ownership.get(e.id);
      if (!game.canManage(prop, player.id)) return 'Fabriken baust du nur auf eigenen Planeten (Konsortium: Handelsmeister).';
      const ships = dockedOwn(game, player, e);
      if (!ships.length) return 'Ein eigenes Schiff muss hier angedockt sein.';
      const cat = recipeCat(recipe);
      const b = game.buildingsOf(e);
      const used = b.factories.filter((f) => recipeCat(f.recipe) === cat).length;
      const slots = factorySlots(e.type)[cat] || 0;
      if (used >= slots) return `Keine freien Bauplätze der Kategorie ${RECIPE_CATS[cat].name} (${used} / ${slots}).`;
      const cost = factoryCost(recipe);
      const { payer, cons } = payerFor(game, player, e);
      if (payer.credits < cost.credits) return cons ? 'Nicht genug Credits im Pool.' : 'Nicht genug Credits.';
      const err = takeGoods(ships, cost.goods);
      if (err) return err;
      payer.credits -= cost.credits;
      b.factories.push({ recipe, prog: 0 });
      game.refreshProperty(e);
      if (cons) { clog(game, cons, player.id, 'factory', cost.credits, `${e.name}: ${RECIPES[recipe].name}`); game.emit('consortium', cons); }
      game.emit('notice', player, `${e.name}: ${RECIPES[recipe].name} gebaut`);
    },
  },

  /** Abriss jederzeit, ohne Erstattung */
  facDemolish: {
    args: { target: landedPlanet(), index: V.int(0, 20) },
    run({ game, player }, { target: e, index }) {
      const prop = game.ownership.get(e.id);
      if (!game.canManage(prop, player.id)) return 'Abreißen darf nur der Besitzer (Konsortium: Handelsmeister).';
      const b = game.buildingsOf(e);
      const f = b.factories[index];
      if (!f) return 'Keine Fabrik auf diesem Bauplatz.';
      b.factories.splice(index, 1);
      // Lagerplätze, die nur diese Fabrik brauchte, fallen weg
      const needed = new Set(b.factories.flatMap((x) => [...Object.keys(RECIPES[x.recipe].in), ...Object.keys(RECIPES[x.recipe].out)]));
      for (const [g, s] of Object.entries(e.market.goods)) if (s.fac && !needed.has(g)) delete e.market.goods[g];
      game.refreshProperty(e);
      game.emit('notice', player, `${e.name}: ${RECIPES[f.recipe].name} abgerissen`);
    },
  },
};
