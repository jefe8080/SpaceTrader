import { HOME_QUESTS } from '../../shared/homeworld.js';
import { ownHome, homePresent, repairHome, completeHomeQuest } from '../homeworld.js';
import { V } from './validate.js';

export default {
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
