import {HOME_QUESTS} from '../shared/homeworld.js';
import {QUEST_DELIVERIES,STUDY_FINDS} from '../shared/advanced-homequests.js';
import {RECIPES,REFINEMENT_RECIPES} from '../shared/goods.js';
import {freeFor} from '../shared/config.js';
import {chargeHome,homeAccess} from './homeworld-operations.js';
import {hexAt,hexKey} from '../shared/hex.js';

const completed=(p,id)=>!!p.homeQuest?.completed[id];
const unlocked=(p,id)=>HOME_QUESTS[id]?.requires.every(id=>completed(p,id));
const has=(h,kind)=>h.structures?.some(b=>b.status==='ready'&&(b.kind===kind||b.upgrades?.includes(kind)));
const delivered=(h,id)=>Object.entries(QUEST_DELIVERIES[id]||{}).every(([g,n])=>(h.questDeliveries?.[id]?.[g]||0)>=n);
const visited=(p,id)=>!!p.homeQuest.visits?.[id];

export function deliverHomeQuest(game,p,e,id,good,amount){
  const error=homeAccess(game,p,e);if(error)return error;
  if(e.id!==p.homeworld||!unlocked(p,id)||completed(p,id))return 'Kein offener freigeschalteter Auftrag an deiner Heimat.';
  const h=e.market.homeworld,required=QUEST_DELIVERIES[id]?.[good];if(!required)return 'Diese Ware wird für diesen Auftrag nicht benötigt.';
  h.questDeliveries||={};h.questDeliveries[id]||={};
  const n=Math.min(amount,required-(h.questDeliveries[id][good]||0));if(n<=0)return 'Diese Materialposition ist vollständig gebunden.';
  const blocked=chargeHome(game,p,e,{credits:0,goods:{[good]:n}});if(blocked)return blocked;
  h.questDeliveries[id][good]=(h.questDeliveries[id][good]||0)+n;
  game.emit('entity',e);
}

export function advancedQuestReady(game,p,e,id){
  const h=e.market.homeworld;if(!unlocked(p,id)||completed(p,id))return false;
  switch(id){
    case 'H07':return has(h,'school')&&(h.trained?.skilled||0)>=10&&(h.produced.plates||0)>=40&&(h.produced.wires||0)>=20&&h.allocations?.some(a=>a.state==='active'&&h.structures.some(b=>b.id===a.id&&b.kind==='school'));
    case 'H08':return !!h.orbital?.small;
    case 'H09':return has(h,'researchWorkshop')&&delivered(h,id)&&visited(p,id);
    case 'H10':return REFINEMENT_RECIPES.some(r=>hasRecipe(h,r)&&Object.entries(RECIPES[r].out).every(([g,n])=>(h.produced[g]||0)>=10));
    case 'H11':return h.population>=250&&h.housing>=h.population&&(h.fullSupplySeconds||0)>=1800;
    case 'H12':return has(h,'researchCenter')&&delivered(h,id);
    case 'H13':return !!p.homeQuest.firstColony;
    case 'H14':return delivered(h,id)&&visited(p,id)&&!!p.relic;
    case 'H15':return !!h.orbital?.large;
    case 'H16':return delivered(h,id)&&[...game.world.entities.values()].filter(e=>e.market?.homeworld?.owner===p.id&&e.market.homeworld.controlLevel>=1).length>=2;
    case 'H17':return delivered(h,id)&&visited(p,id)&&!!p.relic;
    default:return false;
  }
}
const hasRecipe=(h,recipe)=>h.structures.some(b=>b.status==='ready'&&b.kind==='plant'&&b.recipe===recipe);

function nodeAt(game,p,home,key,label){
  p.homeQuest.sites||={};
  if(p.homeQuest.sites[key])return game.world.entities.get(p.homeQuest.sites[key]);
  for(let i=0;i<360;i++){
    const angle=(i*137.508+key.length*17)*Math.PI/180,radius=2400+Math.floor(i/60)*700;
    const x=home.x+Math.cos(angle)*radius,y=home.y+Math.sin(angle)*radius,hex=hexAt(x,y);
    if(hexKey(hex.q,hex.r)!==home.sector||game.world.sectorEntities(home.sector).some(e=>Math.hypot(e.x-x,e.y-y)<(e.radius||100)+450))continue;
    const node={id:`${p.id}:archive:${key}`,kind:'station',type:'wreck',name:label,radius:60,x,y,sector:home.sector,system:home.system,noBuy:true,archiveOwner:p.id,archiveKey:key};
    game.world.addEntity(node);p.homeQuest.sites[key]=node.id;game.revealAround(p,x,y,600);game.emit('entity',node);return node;
  }
}
export function revealHomeSites(game,p,home){
  for(const id of ['H09','H14','H17'])if(unlocked(p,id)&&!completed(p,id))nodeAt(game,p,home,id,id==='H17'?'Expedition: geöffnetes Archiv':`Persönliche Archivstelle ${id}`);
  for(const [id,find] of Object.entries(STUDY_FINDS))if(completed(p,find.quest))nodeAt(game,p,home,id,find.name);
}
export function visitHomeSite(game,p,ship,e){
  if(e.archiveOwner!==p.id||!e.archiveKey)return 'Keine persönliche Archivstelle.';
  if(p.manualShip!==ship.id||ship.dockedAt!==e.id||ship.manualDock!==e.id)return 'Das aktive manuelle Schiff muss die Stelle persönlich anfliegen.';
  const key=e.archiveKey,find=STUDY_FINDS[key];
  if(find){
    if(!completed(p,find.quest))return 'Dieses Forschungsprojekt ist noch nicht freigeschaltet.';
    p.homeQuest.finds||={};if(p.homeQuest.finds[key])return 'Diese einmalige Studienvorlage wurde bereits geborgen.';
    if(freeFor(ship,'ore')<30)return 'Die verpackte Studienvorlage benötigt 30 freie normale Frachteinheiten.';
    ship.moduleCargo||={};ship.moduleCargo[key]=(ship.moduleCargo[key]||0)+1;
    p.homeQuest.finds[key]={id:`${p.id}:study:${key}`,at:game.time,ship:ship.id};
    const home=game.world.entities.get(p.homeworld);home.market.homeworld.grants.push({id:`${p.id}:study:${key}`,source:'quest_study_find',module:key,amount:1,recipient:p.id,ship:ship.id});
  }else{
    if(!unlocked(p,key))return 'Die Archivexpedition ist noch nicht freigeschaltet.';
    p.homeQuest.visits||={};if(p.homeQuest.visits[key])return 'Dieser Archivbesuch wurde bereits aufgezeichnet.';
    p.homeQuest.visits[key]={at:game.time,ship:ship.id};
  }
  p.homeQuest.journal.push({id:find?.quest||key,at:game.time,speaker:'Iven',text:find?`${find.name}: eine registrierte Studienvorlage geborgen.`:'Die Aufzeichnung ist menschlich. Herkunft und Alter bleiben unbewiesen.'});
}

export function completeAdvancedQuest(game,p,e,id){
  if(!advancedQuestReady(game,p,e,id))return 'Voraussetzungen noch nicht erfüllt oder Belohnung bereits abgeholt.';
  const q=HOME_QUESTS[id];p.homeQuest.completed[id]={at:game.time};p.credits+=q.credits;game.addXp(p,q.xp);
  p.homeQuest.journal.push({id,at:game.time,speaker:['H09','H10','H12','H14','H17'].includes(id)?'Iven':id==='H11'?'Nela':'Tarek',text:`${q.title}: abgeschlossen.`});
  if(id==='H14'||id==='H17'){
    p.relic.speed=id==='H14'?5:6;
    for(const s of game.shipsOf(p.id))if(p.relic.location.kind==='ship'&&p.relic.location.id===s.id)s.relicSpeed=p.relic.speed;
  }
  revealHomeSites(game,p,e);game.emit('entity',e);
}
