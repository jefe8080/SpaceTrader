import './prd14.js';
import {state} from '/js/state.js';
import {SHIP_TYPES} from '/shared/ships.js';
import {STUDY_FINDS} from '/shared/advanced-homequests.js';
import {homePanel} from '/js/ui/homeworld.js';
import {enterPlanet,leavePlanet,openBuilding,renderPlanetUi} from '/js/ui/planetPanel.js';
import {scene} from '/js/planetside.js';
import {showGuide} from '/js/ui/objectGuide.js';
import {showAttackWarning} from '/js/ui/battle.js';
import {openAlmanac} from '/js/ui/almanac.js';
import '/js/ui/almanacShips.js';
const home=state.entities.get('qa-home'),h=home.market.homeworld,ship=state.ships.get('qa-ship');
h.controlLevel=1;h.orbital={small:true,large:true,jobs:{},inventory:[]};
state.shipTypes=new Set(Object.keys(SHIP_TYPES));
state.homeQuest.completed.H09={at:0};state.homeQuest.sites={test:'collected',H09:'archive'};state.homeQuest.visits={H09:{at:0}};state.homeQuest.finds={};
const controls=document.createElement('div');controls.style='position:fixed;left:5px;bottom:5px;z-index:150;background:#101b27;padding:6px;display:flex;flex-wrap:wrap;gap:5px';
controls.innerHTML=['Rathaus','Lager','Orbitalring','Erklärung','Schiffe','Warnungen','Aktualisieren'].map((name,i)=>`<button data-qa="${i}">${name}</button>`).join('');document.body.append(controls);
controls.onclick=e=>{const i=e.target.dataset.qa;if(i===undefined)return;if(i==='3'){showGuide('st:smelter');return;}if(i==='4'){leavePlanet();openAlmanac();document.querySelector('[data-tab="ships"]')?.click();return;}if(i==='5'){for(let j=0;j<2;j++)showAttackWarning({id:'qa-attack-'+j,attacker:'Testflotte '+j,location:'QA-Heimat',targets:['Frachter','Heimat']});return;}if(i==='6'){h.civil.budget++;renderPlanetUi();return;}
 ship.dockedAt=home.id;if(state.landed)leavePlanet();enterPlanet(home.id);const item=scene.items.find(it=>i==='0'?it.kind==='questhouse':i==='1'?it.homeFacility==='dock':it.homeOrbital);if(item)openBuilding(item,true);
};
const report=document.createElement('output');report.id='qaReport';controls.append(report);
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
try{
 ship.dockedAt=home.id;enterPlanet(home.id);openBuilding(scene.items.find(it=>it.homeFacility==='dock'),true);
 const panel=document.querySelector('#planetPanel'),ids=['storage-overview','storage-limits','storage-modules','storage-population','storage-prices'];
 for(const id of ids)assert(panel.querySelector('#'+id),'Missing '+id);
 for(const id of ids)assert(panel.querySelector('#'+id).parentElement===panel,'Independent section '+id);
 for(const id of ids)assert(!panel.querySelector('#'+id).open,'Initially closed '+id);
 panel.querySelector('#storage-overview').open=true;h.civil.budget++;renderPlanetUi();assert(panel.querySelector('#storage-overview').open,'Open state preserved');
 panel.querySelector('#storage-overview').open=false;h.civil.budget++;renderPlanetUi();assert(!panel.querySelector('#storage-overview').open,'Closed state preserved');
 const oldFinds=state.homeQuest.finds;state.homeQuest.finds=Object.fromEntries(Object.keys(STUDY_FINDS).map(id=>[id,{at:0}]));
 const town=homePanel(home,{kind:'questhouse'},ship);assert(!town.includes('Forschungsfund zeigen'),'Collected research hidden');state.homeQuest.finds=oldFinds;
 openBuilding(scene.items.find(it=>it.homeOrbital),true);
 const hulls=[...panel.querySelectorAll('[data-pp="homeOrbitalBuild"]')].map(b=>b.dataset.type),expected=Object.values(SHIP_TYPES).filter(d=>!d.npc).length;
 assert(hulls.length===expected&&new Set(hulls).size===expected,'Every hull exactly once');assert(panel.querySelectorAll('h4').length===3,'Three ship categories');
 openBuilding(scene.items.find(it=>it.homeFacility==='dock'),true);
 report.textContent='QA: Lager, Rathaus und 39 Schiffe bestanden';
}catch(error){report.textContent='FEHLER: '+error.message;console.error(error);}
