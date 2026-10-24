import { HOME_QUESTS } from '../../shared/homeworld.js';
import { ownHome, homePresent, repairHome, completeHomeQuest } from '../homeworld.js';
import { V } from './validate.js';
import { relicSalvage, relicDeliver, relicWork } from '../relic.js';

export default {
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
