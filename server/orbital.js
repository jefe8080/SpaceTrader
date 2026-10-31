import {SHIP_TYPES,SHIPYARD,PILOT_LICENSES,factionRank} from '../shared/config.js';
import {activeSideQuests} from '../shared/side-quests.js';
import {homeAccess,homeConstructionError,chargeHome} from './homeworld-operations.js';
import {QUEST_DELIVERIES} from '../shared/advanced-homequests.js';
import {applyPhysicalHull,initializeNewHull} from './physical-yards.js';

export const ORBITAL_OPERATION={small:{power:20,workers:{basic:8,skilled:6}},large:{power:60,workers:{skilled:10,specialist:4}}};
const readyMaterials=(h,id)=>Object.entries(QUEST_DELIVERIES[id]).every(([g,n])=>(h.questDeliveries?.[id]?.[g]||0)>=n);
export function startOrbital(game,p,e,large,ship,confirmed){
  const error=homeAccess(game,p,e);if(error)return error;
  const h=e.market.homeworld,o=h.orbital||={small:false,large:false,largeStage:0,jobs:{},inventory:[],next:0,infrastructureShips:[]};
  if(e.id!==p.homeworld)return 'Der erste Ring wird an deiner Hauptheimat aufgebaut.';
  if(o.project)return 'Ein Orbitalbauabschnitt läuft bereits.';
  const id=large?'H15':'H08';
  if(!(large?['H08','H12']:['H07']).every(id=>p.homeQuest.completed[id]))return 'Die erforderlichen Hauptquests fehlen.';
  if(large?o.large:o.small)return 'Diese Orbitalstufe ist bereits fertig.';
  if(!readyMaterials(h,id))return 'Zuerst die vollständigen Questmaterialien liefern.';
  const staff=homeConstructionError(h);if(staff)return staff;
  if(!large){
    if(!confirmed)return 'Dauerhafte Schiffsabgabe ausdrücklich bestätigen.';
    if(!ship||ship.owner!==p.id||ship.type!=='spatz'||ship.dockedAt!==e.id||ship.queue.length||ship.relicSpeed||game.shipOffers.has(ship.id)||activeSideQuests(p).some(q=>q.ship===ship.id)||p.relic?.operation?.ship===ship.id||p.homeQuest.salvage?.phase==='sealed'&&p.homeQuest.salvage.ship===ship.id)return 'Einen eigenen untätigen Spatz ohne Relikt und Questbindung hier andocken.';
    if(Object.values(ship.cargo).some(n=>n>0)||Object.values(ship.moduleCargo||{}).some(n=>n>0)||ship.modules?.length)return 'Fracht und wiederverwendbare Module vor der dauerhaften Abgabe entladen beziehungsweise ausbauen.';
    if(game.shipsOf(p.id).length<2)return 'Mindestens ein steuerbares Schiff muss übrig bleiben.';
    o.infrastructureShips.push({id:ship.id,name:ship.name,type:ship.type,hullSource:ship.hullSource||null,at:game.time,purpose:'Kleiner Orbitalring'});game.removeShip(ship);
  }
  o.project={kind:large?'large':'small',stage:large?(o.largeStage||0)+1:1,remaining:600,bound:large&&o.largeStage?{}:structuredClone(QUEST_DELIVERIES[id])};
  game.emit('entity',e);
}

export function orbitalBuild(game,p,e,type){
  const error=homeAccess(game,p,e);if(error)return error;
  const h=e.market.homeworld,o=h.orbital,d=SHIP_TYPES[type];
  if(!o?.small||!d||d.npc)return 'Dieser Schiffstyp gehört nicht zum Orbitalbaukatalog.';
  const large=['L','XL'].includes(d.cls),slot=large?'large':'small';
  if(!['S','M','L','XL'].includes(d.cls)||large&&!o.large)return 'Dafür muss der große Ring fertig sein.';
  const license=PILOT_LICENSES[p.pilot||1];if(!license.classes.includes(d.cls))return 'Die passende Pilotenlizenz fehlt.';
  if(d.faction&&factionRank(p.rep?.[d.faction]||0)<d.rank)return 'Der erforderliche Fraktionsrang fehlt.';
  if(o.jobs[slot])return 'Dieser Orbitalbauplatz ist bereits belegt.';
  if(o.inventory.length+Object.keys(o.jobs).length>=12)return 'Alle zwölf Ausgabeplätze sind belegt.';
  const goods={...d.build};if(d.currency)goods[d.currency.good]=(goods[d.currency.good]||0)+d.currency.n;
  const blocked=chargeHome(game,p,e,{credits:0,goods});if(blocked)return blocked;
  o.jobs[slot]={id:`${e.id}:orbital:${++o.next}`,type,remaining:SHIPYARD.BUILD_TIME[d.cls],materials:structuredClone(d.build),currency:d.currency?structuredClone(d.currency):null,slot,output:'orbitalInventory'};
  game.emit('entity',e);
}
export function claimOrbital(game,p,e,id){
  const error=homeAccess(game,p,e);if(error)return error;
  const o=e.market.homeworld.orbital,item=o?.inventory.find(i=>i.id===id);if(!item)return 'Kein vorhandenes Schiff mit dieser Kennung.';
  const license=PILOT_LICENSES[p.pilot||1];if(!license.classes.includes(SHIP_TYPES[item.type].cls))return 'Passende Pilotenlizenz erforderlich.';
  const type=SHIP_TYPES[item.type];if(type.faction&&factionRank(p.rep?.[type.faction]||0)<type.rank)return 'Der erforderliche Fraktionsrang fehlt.';
  const ship=game.spawnShip(p,item.type,e);applyPhysicalHull(ship,item);o.inventory.splice(o.inventory.indexOf(item),1);game.emit('entity',e);
}
export function tickOrbital(game,e,dt){
  const h=e.market.homeworld,o=h.orbital;if(!o)return;
  if(o.project){
    o.project.remaining=Math.max(0,o.project.remaining-dt);
    if(o.project.remaining===0){if(o.project.kind==='small')o.small=true;else{o.largeStage=o.project.stage;if(o.largeStage===2)o.large=true;}o.project=null;game.emit('entity',e);}
  }
  const active=slot=>h.allocations.some(a=>a.id===`orbital:${slot}`&&a.state==='active');
  for(const [slot,j] of Object.entries(o.jobs)){
    const running=slot==='small'?active('small'):active('large')&&(!o.jobs.small||active('small'));j.paused=!running;
    if(!running)continue;j.remaining=Math.max(0,j.remaining-dt);
    if(j.remaining===0){const item={id:j.id,type:j.type,source:'materials',materials:j.materials,currencyPaid:j.currency,fuel:0};initializeNewHull(item);o.inventory.push(item);delete o.jobs[slot];game.emit('entity',e);}
  }
}
