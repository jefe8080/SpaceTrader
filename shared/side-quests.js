import {pilotLevel} from './progression.js';

/** Read old saves in place: the original quest remains the first slot. */
export function activeSideQuests(player){
  const out=[];
  for(const q of [player.quest,...(player.quests||[])])if(q&&!out.some(x=>x===q||q.id&&x.id===q.id))out.push(q);
  return out;
}
export const sideQuestLimit=player=>pilotLevel(player.xp||0);
export const selectedSideQuest=(player,id)=>{
  const quests=activeSideQuests(player);
  return id?quests.find(q=>q.id===id):quests.length===1?quests[0]:null;
};
export function removeSideQuest(player,quest){
  if(player.quest===quest){player.quest=null;if(player.quests?.length)player.quest=player.quests.shift();}
  else if(player.quests)player.quests=player.quests.filter(q=>q!==quest);
}
export function minedQuestProgress(player,quest,total){
  return Math.max(0,total-(quest.minedBase||0)-Math.max(0,(player.questMinedUsed?.[quest.good]||0)-(quest.minedClaimBase||0)));
}
