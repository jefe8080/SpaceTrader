import { RECIPES, factorySlots, factoryCost, recipeCat, RECIPE_CATS, isConsortiumOwner } from '../../shared/config.js';
import { V, CmdError } from './validate.js';
import { takeGoods, dockedOwn } from './property.js';
import { clog } from '../consortium.js';
import { remoteManagementError } from '../coverage.js';
import {startSpecialization,startWorldInfrastructure,startWorldTraining,specializationAccess} from '../specializations.js';
import {WORLD_FOCI} from '../../shared/specializations.js';

/** Planet, an dem ein eigenes Schiff angedockt ist (Voraussetzung für die planetare Ansicht) */
const landedPlanet = () => (v, ctx) => {
  const e = V.entity()(v, ctx);
  const error=remoteManagementError(ctx.game,ctx.player,e);if(error)throw new CmdError(error);
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
  worldSpecialize:{args:{target:V.entity(),focus:V.oneOf(...new Set(Object.values(WORLD_FOCI).flat()))},run({game,player},{target,focus}){return startSpecialization(game,player,target,focus);}},
  worldInfrastructure:{args:{target:V.entity(),kind:V.oneOf('solar','gasGenerator','reactor','housing','school','academy')},run({game,player},{target,kind}){return startWorldInfrastructure(game,player,target,kind);}},
  worldTrain:{args:{target:V.entity(),qualification:V.oneOf('skilled','specialist')},run({game,player},{target,qualification}){return startWorldTraining(game,player,target,qualification);}},
  worldTax:{args:{target:V.entity(),percent:V.num(0,40)},run({game,player},{target,percent}){const error=specializationAccess(game,player,target);if(error)return error;target.market.economy.civil||={budget:0,gross:0,taxes:0,consumptionPayments:0};target.market.economy.civil.taxRate=percent/100;}},
  /** Fabrik auf einem Bauplatz eines eigenen Planeten (PRD-3 6.4) */
  facBuild: {
    args: { target: landedPlanet(), recipe: V.key(RECIPES) },
    run({ game, player }, { target: e, recipe }) {
      if (e.type === 'ruins') return 'Nutze die Heimat-Bauverwaltung für eigene Industrieanlagen.';
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
