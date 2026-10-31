import {GOODS,propertyBasePrice} from '../shared/config.js';
import {activeSideQuests} from '../shared/side-quests.js';
import {HOMEWORLD} from '../shared/homeworld.js';
import {newProperty} from './property.js';
import {colonyCost} from '../shared/colonies.js';
export {colonyCost} from '../shared/colonies.js';

export function siteError(game,p,e){
  if(!e?.ruinsSite||e.market?.homeworld||e.colony?.owner&&e.colony.owner!==p.id)return 'Kein freier persönlicher Ruinenstandort.';
  const system=game.world.systems.get(e.system);if(!system||system.start||system.faction)return 'Dieses System ist für eine Ruinengründung ungeeignet.';
  const nearby=[...game.world.entities.values()].some(other=>other.id!==e.id&&(other.market?.homeworld||other.colony?.owner)&&(other.system===e.system||Math.hypot(other.x-e.x,other.y-e.y)<HOMEWORLD.placement.minDistance));
  if(nearby)return 'Ein bestehender oder reservierter Ruinenstandort ist zu nah oder belegt dieses System.';
  if([...game.world.entities.values()].some(other=>other.market?.homeworld?.warp&&(other.market.homeworld.warp.target.system===e.system||Math.hypot(other.market.homeworld.warp.target.x-e.x,other.market.homeworld.warp.target.y-e.y)<HOMEWORLD.placement.minDistance)))return 'Ein vorbereiteter Warptransfer reserviert dieses Gebiet.';
  return null;
}
const present=(game,p,e)=>game.shipsOf(p.id).filter(s=>s.dockedAt===e.id);
function unlocked(p){return p.homeQuest.firstColony?!!p.homeQuest.completed.H16:['H10','H11','H12'].every(id=>p.homeQuest.completed[id]);}
export function surveyColony(game,p,e,ship){
  const error=siteError(game,p,e);if(error)return error;
  if(!unlocked(p))return 'H13 setzt H10/H11/H12 voraus; reguläre weitere Gründungen benötigen H16.';
  if(ship.owner!==p.id||p.manualShip!==ship.id||ship.dockedAt!==e.id||ship.manualDock!==e.id)return 'Den Standort mit dem aktiven manuellen Schiff persönlich erkunden.';
  p.homeQuest.surveyedSites||={};p.homeQuest.surveyedSites[e.id]={at:game.time};
}
export function deliverColony(game,p,e,good,amount){
  const error=siteError(game,p,e);if(error)return error;
  if(!unlocked(p)||!p.homeQuest.surveyedSites?.[e.id])return 'Zuerst diesen Standort persönlich erkunden und die nötigen Hauptquests abschließen.';
  if(e.colony?.remaining!==undefined)return 'Der Standort wird bereits aufgebaut.';
  const cost=e.colony?.cost||colonyCost(p);if(!cost)return 'Gründungskosten überschreiten den sicheren Zahlenbereich.';
  const needed=cost.goods[good];if(!needed)return 'Diese Ware gehört nicht zu den Gründungsmaterialien.';
  const delivered=e.colony?.deliveries?.[good]||0,n=Math.min(amount,needed-delivered);if(n<=0)return 'Diese Materialposition ist bereits vollständig gebunden.';
  const ships=present(game,p,e);if(ships.reduce((n,s)=>n+(s.cargo[good]||0),0)<n)return 'Die Teilmenge muss tatsächlich auf eigenen hier angedockten Schiffen liegen.';
  e.colony||={owner:p.id,cost:structuredClone(cost),deliveries:{}};
  let left=n;for(const s of ships){const take=Math.min(left,s.cargo[good]||0);s.cargo[good]=(s.cargo[good]||0)-take;if(!s.cargo[good])delete s.cargo[good];left-=take;}
  e.colony.deliveries[good]=delivered+n;game.emit('entity',e);
}
export function foundColony(game,p,e,ship,confirmed){
  const error=siteError(game,p,e);if(error)return error;
  const c=e.colony;if(!unlocked(p)||!p.homeQuest.surveyedSites?.[e.id]||!c||c.owner!==p.id)return 'Zuerst erkunden und die tatsächlichen Gründungsmaterialien liefern.';
  if(c.remaining!==undefined)return 'Der Standort wird bereits aufgebaut.';
  if(c.cost.first&&[...game.world.entities.values()].some(e=>e.colony?.owner===p.id&&e.colony.remaining!==undefined&&e.colony.cost.first))return 'Die erste H13-Expedition wird bereits aufgebaut.';
  if(!confirmed)return 'Dauerhafte Expeditionsschiffsabgabe ausdrücklich bestätigen.';
  const current=colonyCost(p);
  if(!current)return 'Gründungskosten überschreiten den sicheren Zahlenbereich.';
  if(current.first!==c.cost.first||current.k!==c.cost.k){c.cost=structuredClone(current);game.emit('entity',e);return 'Die Kostenstufe hat sich durch eine andere Gründung geändert. Neue Vorschau prüfen und fehlende Materialien ergänzen.';}
  if(!Object.entries(c.cost.goods).every(([g,n])=>(c.deliveries[g]||0)>=n))return 'Die Gründungsmaterialien sind noch nicht vollständig geliefert.';
  if(p.credits<c.cost.credits)return 'Nicht genug Credits für die gebundenen Gründungskosten.';
  if(!ship||ship.owner!==p.id||ship.type!=='spatz'||ship.dockedAt!==e.id||ship.queue.length||ship.relicSpeed||game.shipOffers.has(ship.id)||activeSideQuests(p).some(q=>q.ship===ship.id)||p.relic?.operation?.ship===ship.id||p.homeQuest.salvage?.phase==='sealed'&&p.homeQuest.salvage.ship===ship.id)return 'Einen untätigen eigenen Expeditionsspatz ohne Relikt, Angebot oder Questbindung bereitstellen.';
  const ships=present(game,p,e);
  if(!ships.some(s=>s.id!==ship.id&&!s.queue.length&&!game.shipOffers.has(s.id)))return 'Ein weiteres verfügbares eigenes Schiff muss zur Weiterreise hier angedockt sein.';
  if(Object.entries(ship.cargo).some(([g,n])=>n>0&&g!=='workers')||Object.values(ship.moduleCargo||{}).some(n=>n>0)||ship.modules?.some(m=>m!=='cabin'))return 'Andere Fracht und Module vor der dauerhaften Abgabe entladen; Kabinen dürfen als Expeditionsinfrastruktur bleiben.';
  const batches=ships.flatMap(s=>(s.passengers||[]).filter(b=>b.kind==='workers'&&b.ownerAtDeparture===p.id&&!b.quest).map(b=>({ship:s,batch:b})));
  if(batches.reduce((n,{batch})=>n+batch.n,0)<20)return '20 tatsächlich transportierte eigene Auswanderer aus eigenem Herkunftsbestand erforderlich.';
  if((ship.cargo.workers||0)>20)return 'Übrige Auswanderer vor der Abgabe auf das andere Schiff umladen.';
  const onboard=(ship.passengers||[]).reduce((n,b)=>n+b.n,0),ownOnboard=(ship.passengers||[]).filter(b=>b.kind==='workers'&&b.ownerAtDeparture===p.id&&!b.quest).reduce((n,b)=>n+b.n,0);
  if(onboard!==ownOnboard||onboard!==(ship.cargo.workers||0))return 'Alle Personen auf dem abzugebenden Schiff müssen nachweislich eigene Auswanderer sein.';
  const workers={basic:0,skilled:0,specialist:0},immigrants=[];let left=20;
  // Prefer the surrendered vessel so no person is left on a removed ship.
  batches.sort((a,b)=>(b.ship.id===ship.id)-(a.ship.id===ship.id));
  for(const {ship:s,batch:b} of batches){if(!left)break;const n=Math.min(left,b.n),taken={basic:0,skilled:0,specialist:0};let qualified=n;for(const q of Object.keys(workers)){const take=Math.min(qualified,b.workers[q]||0);workers[q]+=take;taken[q]=take;b.workers[q]-=take;qualified-=take;}immigrants.push({id:b.id,origin:b.origin,ownerAtDeparture:b.ownerAtDeparture,n,workers:taken});b.n-=n;s.cargo.workers-=n;if(!s.cargo.workers)delete s.cargo.workers;s.passengers=s.passengers.filter(b=>b.n>0);left-=n;}
  if(ship.passengers?.some(b=>b.n>0))throw new Error('Expeditionsschiff enthält nach bindender Vorprüfung verbleibende Personen.');
  p.credits-=c.cost.credits;c.remaining=300;c.started=game.time;c.until=game.time+300;c.workers=workers;c.immigrants=immigrants;c.infrastructureShip={id:ship.id,name:ship.name,type:ship.type,modules:[...(ship.modules||[])],at:game.time};
  if(!c.cost.first)p.homeQuest.regularColonies=(p.homeQuest.regularColonies||0)+1;
  game.removeShip(ship);game.emit('entity',e);
}

export function tickColonies(game,dt){
  for(const e of game.world.entities.values()){
    const c=e.colony;if(!e.ruinsSite||c?.remaining===undefined)continue;
    c.remaining=Math.max(0,c.remaining-dt);if(c.remaining>0)continue;
    const p=game.players.get(c.owner);if(!p)continue;
    const facilities=Object.fromEntries(['dock','control','workshop',...HOMEWORLD.start.basicPlants].map(id=>[id,{status:id==='dock'?'ready':'ruined',progress:0}]));
    const h={owner:p.id,population:20,workers:structuredClone(c.workers),housing:100,baseHousing:100,power:12,storage:2000,hazardStorage:100,certifiedHazardStorage:100,plots:8,facilities,produced:{},suppliedSeconds:0,controlLevel:0,projects:[],structures:[],bootstrap:{},grants:[],founding:{...structuredClone(c),completed:game.time},fixedSiteBase:propertyBasePrice(e)};
    const goods=Object.fromEntries(Object.entries(GOODS).map(([g,d])=>[g,{role:'trade',rate:0,stock:0,cap:d.cls==='normal'?2000:d.cls==='hazard'?100:0,mod:1}]));
    e.ruinsSite=false;e.name=`${p.name}s Ruinenstandort ${[...game.world.entities.values()].filter(e=>e.market?.homeworld?.owner===p.id).length+1}`;e.market={strategy:'homeworld',goods,owner:p.id,mode:'private',eff:.25,homeworld:h};
    game.setOwner(e,p,{...newProperty(e.id,p.id,game.time),mode:'private',personal:true});
    if(c.cost.first)p.homeQuest.firstColony=e.id;
    p.homeQuest.journal.push({id:c.cost.first?'H13':'H16',at:game.time,speaker:'Mira',text:`${e.name}: aus realen Gründungsmaterialien und 20 eigenen Auswanderern aufgebaut.`});
    delete e.colony;game.emit('entity',e);
  }
}
