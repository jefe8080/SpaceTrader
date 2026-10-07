import { V } from './validate.js';
import { acceptQuest, abortQuest, questProgress } from '../quests.js';

export default {
  /** Quest von der Tafel annehmen: ein eigenes Schiff muss beim Questgeber angedockt sein */
  questAccept: {
    args: { ship: V.ownShip(), target: V.entity(), quest: V.str(20, 1) },
    run({ game, player }, { ship, target, quest }) { return acceptQuest(game, player, ship, target, quest); },
  },
  questAbort: {
    args: {},
    run({ game, player }) { return abortQuest(game, player); },
  },
  /** Abliefern bzw. Fortschritt prüfen für ein bereits angedocktes Schiff */
  questDeliver: {
    args: { ship: V.ownShip() },
    run({ game, player }, { ship }) {
      if (!player.quest) return 'Keine aktive Quest.';
      if (!questProgress(game, player, ship)) return 'Hier gibt es für die Quest nichts zu tun (Ort, Schiff oder Ladung passt nicht).';
    },
  },
};
