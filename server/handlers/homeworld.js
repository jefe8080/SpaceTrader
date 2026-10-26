import { renamePlanet } from '../planet-name.js';
import { acknowledgeHomeStory } from '../quest-activation.js';
import { HOME_QUESTS, HOME_BUILDINGS, CONTROL_MODULES } from '../../shared/homeworld.js';
import { GOODS, RECIPES } from '../../shared/goods.js';
import { ownHome, homePresent, repairHome, completeHomeQuest } from '../homeworld.js';
import { V } from './validate.js';
import {HOME_STORY,storyAvailable} from '../../shared/home-story.js';
import { relicSalvage, relicDeliver, relicWork } from '../relic.js';
import {createLogistics,cancelLogistics} from '../logistics.js';
import {deliverHomeQuest,visitHomeSite} from '../homequests.js';
import {startOrbital,orbitalBuild,claimOrbital} from '../orbital.js';
import {SHIP_TYPES} from '../../shared/config.js';
import { homeBuild, restoreBasicPlant, trainHome, setHomeReserve, setHomeOperation, upgradeControl, homeAccess,changeRefinement,upgradeStorage,demolishHome,setHomeLimit } from '../homeworld-operations.js';

export default {
  homeRename:{args:{target:V.entity(),name:v=>v},run({game,player},{target,name}){return renamePlanet(game,player,target,name);}},
  homeQuestDeliver:{args:{target:V.entity(),quest:V.key(HOME_QUESTS),good:V.key(GOODS),amount:V.int(1,1e6)},run({game,player},{target,quest,good,amount}){return deliverHomeQuest(game,player,target,quest,good,amount);}},
  homeArchiveVisit:{args:{target:V.entity(),ship:V.ownShip()},run({game,player},{target,ship}){return visitHomeSite(game,player,ship,target);}},
  homeOrbital:{args:{target:V.entity(),large:V.bool(),ship:V.opt(V.ownShip()),confirmed:V.opt(V.bool(),false)},run({game,player},{target,large,ship,confirmed}){return startOrbital(game,player,target,large,ship,confirmed);}},
  homeOrbitalBuild:{args:{target:V.entity(),type:V.key(SHIP_TYPES)},run({game,player},{target,type}){return orbitalBuild(game,player,target,type);}},
  homeOrbitalClaim:{args:{target:V.entity(),id:V.str(100,1)},run({game,player},{target,id}){return claimOrbital(game,player,target,id);}},
  homeLogistics:{
    args:{target:V.entity(),kind:V.oneOf('supply','production','sales'),good:V.opt(V.key(GOODS)),recipe:V.opt(V.key(RECIPES)),amount:V.int(1,1e6),limit:V.num(0,1e9),budget:V.num(0,1e9),emergency:V.opt(V.num(0,1e9),0),priority:V.int(0,100),ships:V.ownShips(),locations:V.arr(V.entity(),100)},
    run({game,player},{target,...spec}){return createLogistics(game,player,target,spec);},
  },
  homeLogisticsCancel:{
    args:{target:V.entity(),id:V.str(40,1)},
    run({game,player},{target,id}){return cancelLogistics(game,player,target,id);},
  },
  homeRecipeChange:{
    args:{target:V.entity(),id:V.str(40,1),recipe:V.key(RECIPES)},
    run({game,player},{target,id,recipe}){return changeRefinement(game,player,target,id,recipe);},
  },
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
  homeDemolish: {
    args: { target: V.entity(), id: V.str(40,1), upgrade: V.opt(V.key(HOME_BUILDINGS)), confirmed: V.opt(V.bool(),false) },
    run({game,player},{target,id,upgrade,confirmed}) { return demolishHome(game,player,target,id,upgrade,confirmed); },
  },
  homeStorageUpgrade: {
    args: { target: V.entity(), id: V.str(40, 1) },
    run({ game, player }, { target, id }) { return upgradeStorage(game, player, target, id); },
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
  homeLimit: {
    args: {target:V.entity(), good:V.opt(V.key(GOODS)), amount:V.int(0,1e9), all:V.opt(V.bool(),false)},
    run({game,player},{target,good,amount,all}) { if(!all&&!good)return 'Rohstoff auswählen.';return setHomeLimit(game,player,target,good,amount,all); },
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
  homeStoryPriority:{
    args:{priority:V.oneOf('housing','supply')},
    run({game,player},{priority}){
      if(!storyAvailable(player.homeQuest,'H11'))return 'Diese Siedlungsentscheidung ist noch nicht verfügbar.';
      const entity=game.world.entities.get(player.homeworld),error=homeAccess(game,player,entity);if(error)return error;
      const home=entity.market.homeworld;player.homeQuest.storyPriority=priority;
      for(const id of ['waterworks','foodplant'])home.facilities[id].priority=priority==='supply'?95:80;
      for(const building of home.structures||[])if(building.kind==='housing')building.priority=priority==='housing'?95:50;
    },
  },
  homeDialogRead: {
    args: { scene: V.key(HOME_STORY) },
    run({ game, player }, { scene }) { return acknowledgeHomeStory(game, player, scene); },
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
