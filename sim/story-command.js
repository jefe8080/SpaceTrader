import { runCommand as command } from '../server/handlers/index.js';
import { syncHomeQuests } from '../server/quest-activation.js';

// A simulated player explicitly confirms introductions between gameplay actions.
export function acknowledgeStories(game,player) {
  syncHomeQuests(game,player);
  for(let i=0;i<20;i++){
    const scene=player.homeQuest?.eventDialog||player.homeQuest?.introduction;
    if(!scene)return;
    const error=command(game,player,{cmd:'homeDialogRead',scene});
    if(error)throw Error(error);
  }
  throw Error('Quest introduction queue did not settle');
}
export function runCommand(game,player,message){
  acknowledgeStories(game,player);
  const result=command(game,player,message);
  acknowledgeStories(game,player);
  return result;
}
