import {pilotLevel} from './progression.js';
import {WORLD} from './config.js';
import {hexAt,hexKey} from './hex.js';
export const SIDE_QUEST_SECTOR_CELLS=Math.round(Math.PI*WORLD.SECTOR_RADIUS**2/WORLD.FOG_CELL**2);
export function explorationOfferAvailable(quest,zoneVisits=[],cells=new Set()){
  if(quest.type!=='explore')return true;
  if(quest.zone)return !zoneVisits.includes(quest.zone);
  if(!quest.sector)return false;
  let known=0;
  for(const key of cells){const [x,y]=key.split(',').map(Number),h=hexAt((x+.5)*WORLD.FOG_CELL,(y+.5)*WORLD.FOG_CELL);if(hexKey(h.q,h.r)===quest.sector)known++;}
  return SIDE_QUEST_SECTOR_CELLS-known>=quest.cells;
}

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
