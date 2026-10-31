import { V } from './validate.js';
import { acceptQuest, abortQuest, questProgress } from '../quests.js';
import {activeSideQuests,selectedSideQuest} from '../../shared/side-quests.js';

export default {
  /** Quest von der Tafel annehmen: ein eigenes Schiff muss beim Questgeber angedockt sein */
  questAccept: {
    args: { ship: V.ownShip(), target: V.entity(), quest: V.str(20, 1) },
    run({ game, player }, { ship, target, quest }) { return acceptQuest(game, player, ship, target, quest); },
  },
  questAbort: {
    args: {quest:V.opt(V.str(20,1))},
    run({ game, player },{quest}) { return abortQuest(game, player,quest); },
  },
  /** Abliefern bzw. Fortschritt prüfen für ein bereits angedocktes Schiff */
  questDeliver: {
    args: { ship: V.ownShip(),quest:V.opt(V.str(20,1)) },
    run({ game, player }, { ship,quest }) {
      if (!activeSideQuests(player).length) return 'Keine aktive Quest.';
      if(!selectedSideQuest(player,quest))return 'Bitte eine aktive Nebenquest eindeutig auswählen.';
      if (!questProgress(game, player, ship,true,quest)) return 'Hier gibt es für die Quest nichts zu tun (Ort, Schiff oder Ladung passt nicht).';
    },
  },
};
