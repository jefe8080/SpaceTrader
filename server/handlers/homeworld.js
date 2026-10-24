import { HOME_QUESTS, HOME_BUILDINGS, CONTROL_MODULES } from '../../shared/homeworld.js';
import { GOODS, RECIPES } from '../../shared/goods.js';
import { ownHome, homePresent, repairHome, completeHomeQuest } from '../homeworld.js';
import { V } from './validate.js';
import { relicSalvage, relicDeliver, relicWork } from '../relic.js';
import { homeBuild, restoreBasicPlant, trainHome, setHomeReserve, setHomeOperation, upgradeControl, homeAccess } from '../homeworld-operations.js';

export default {
  homeTax:{
    args:{target:V.entity(),percent:V.num(0,40)},
    run({game,player},{target,percent}){
      const error=homeAccess(game,player,target);if(error)return error;
      const home=target.market.homeworld;home.civil||={budget:0,gross:0,taxes:0,consumptionPayments:0};home.civil.taxRate=percent/100;
    },
  },
  homeControlUpgrade:{
    args:{target:V.entity(),module:V.opt(V.key(CONTROL_MODULES))},
    run({game,player},{target,module}){return upgradeControl(game,player,target,module);},
  },
  homeBuild: {
    args: { target: V.entity(), kind: V.oneOf(...Object.keys(HOME_BUILDINGS), 'plant'), recipe: V.opt(V.key(RECIPES)), parent: V.opt(V.str(40)), plot: V.opt(V.int(0, 47)) },
    run({ game, player }, { target, kind, recipe, parent, plot }) { return homeBuild(game, player, target, kind, recipe, parent, plot); },
  },
  homeRestore: {
    args: { target: V.entity(), facility: V.str(40, 1) },
    run({ game, player }, { target, facility }) { return restoreBasicPlant(game, player, target, facility); },
  },
  homeTrain: {
    args: { target: V.entity(), qualification: V.oneOf('skilled', 'specialist') },
    run({ game, player }, { target, qualification }) { return trainHome(game, player, target, qualification); },
  },
  homeReserve: {
    args: { target: V.entity(), good: V.key(GOODS), amount: V.int(0, 1e9) },
    run({ game, player }, { target, good, amount }) { return setHomeReserve(game, player, target, good, amount); },
  },
  homeOperation: {
    args: { target: V.entity(), id: V.str(40, 1), enabled: V.bool(), priority: V.int(0, 100) },
    run({ game, player }, { target, id, enabled, priority }) { return setHomeOperation(game, player, target, id, enabled, priority); },
  },
  manualShip: {
    args: { ship: V.ownShip() },
    run({ player }, { ship }) { player.manualShip = ship.id; },
  },
  relicSalvage: {
    args: { ship: V.ownShip(), target: V.entity() },
    run({ game, player }, { ship, target }) { return relicSalvage(game, player, ship, target); },
  },
  relicDeliver: {
    args: { ship: V.ownShip(), target: V.entity() },
    run({ game, player }, { ship, target }) { return relicDeliver(game, player, ship, target); },
  },
  relicWork: {
    args: { ship: V.ownShip(), target: V.entity(), kind: V.oneOf('install', 'remove') },
    run({ game, player }, { ship, target, kind }) { return relicWork(game, player, ship, target, kind); },
  },
  homeDialogRead: {
    args: { scene: V.oneOf('H00') },
    run({ player }, { scene }) {
      if (!player.homeQuest) return 'Keine Heimatgeschichte verfügbar.';
      player.homeQuest.scenesSeen ||= {};
      player.homeQuest.scenesSeen[scene] = true;
    },
  },
  homeLand: {
    args: { target: V.entity() },
    run({ game, player }, { target }) {
      if (!ownHome(game, player, target) || !homePresent(game, player, target)) return 'An deiner Heimatwelt muss ein eigenes Schiff angedockt sein.';
      player.homeQuest.landed = true;
    },
  },
  homeRepair: {
    args: { target: V.entity(), facility: V.str(40, 1) },
    run({ game, player }, { target, facility }) { return repairHome(game, player, target, facility); },
  },
  homeQuestComplete: {
    args: { target: V.entity(), quest: V.key(HOME_QUESTS) },
    run({ game, player }, { target, quest }) { return completeHomeQuest(game, player, target, quest); },
  },
};
