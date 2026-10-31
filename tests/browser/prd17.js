import './prd14.js';
import {state} from '/js/state.js';import {SHIP_TYPES} from '/shared/ships.js';import {homePanel} from '/js/ui/homeworld.js';import {enterPlanet,leavePlanet,openBuilding,renderPlanetUi} from '/js/ui/planetPanel.js';import {scene} from '/js/planetside.js';import {openAlmanac,refreshAlmanac} from '/js/ui/almanac.js';import '/js/ui/almanacShips.js';
const home=state.entities.get('qa-home'),h=home.market.homeworld,ship=state.ships.get('qa-ship');h.orbital={small:true,large:true,doubleYard:true,jobs:{},inventory:[]};state.pilot=6;state.shipTypes=new Set(Object.keys(SHIP_TYPES));state.homeQuest.completed.H16=true;state.homeQuest.completed.H09=true;
const controls=document.createElement('div');controls.style='position:fixed;left:5px;bottom:5px;z-index:150;background:#101b27;padding:6px;display:flex;flex-wrap:wrap;gap:5px';controls.innerHTML=['Rathaus','Orbitalring','Schiffe','Aktualisieren','Wohnhäuser'].map((name,i)=>'<button data-qa="'+i+'">'+name+'</button>').join('');document.body.append(controls);
controls.onclick=e=>{const i=e.target.dataset.qa;if(i===undefined)return;if(i==='3'){h.energy.used++;renderPlanetUi();refreshAlmanac();return;}leavePlanet();if(i==='2'){openAlmanac();document.querySelector('[data-tab="ships"]')?.click();return;}ship.dockedAt=home.id;enterPlanet(home.id);if(i!=='4')openBuilding(scene.items.find(it=>i==='0'?it.kind==='questhouse':it.homeOrbital),true);};
window.prd17={home,h,ship,scene,refresh:renderPlanetUi};
controls.querySelector('[data-qa="1"]').click();window.prd17Ready=true;

import {initRenderer,render,pickAt} from '/js/render.js';import {COMBAT} from '/shared/combat.js';import {cellKey} from '/shared/config.js';
const mapButton=document.createElement('button');mapButton.textContent='Abfangkreis';controls.append(mapButton);
let mapActive=false;const view=document.getElementById('view');initRenderer(view);
mapButton.onclick=()=>{leavePlanet();state.entities.clear();state.ships.clear();state.camera.x=0;state.camera.y=0;state.camera.zoom=.004;state.hover=null;state.selected=null;state.selection.clear();for(let x=-100;x<=100;x++)for(let y=-100;y<=100;y++)state.cells.add(cellKey(x,y));state.ships.set('range-ship',{id:'range-ship',name:'Abfanggruppe',type:'kreuzer',owner:'qa',x:0,y:0,rx:0,ry:0,vx:0,vy:0,angle:0,ra:0,recv:performance.now(),queue:[],interceptRange:COMBAT.INTERCEPT});mapActive=true;};
view.addEventListener('pointermove',e=>{if(mapActive)state.hover=pickAt(e.clientX,e.clientY);});view.addEventListener('pointerleave',()=>{if(mapActive)state.hover=null;});
const systemButton=document.createElement('button');systemButton.textContent='Abfangkreis System';systemButton.onclick=()=>{mapButton.click();state.camera.zoom=.04;state.camera.x=70000;state.hover={kind:'ship',id:'range-ship'};};controls.append(systemButton);
const levelControls=document.createElement('div');for(const level of [1,2,3]){const b=document.createElement('button');b.textContent='Haus '+level;b.onclick=()=>{ship.dockedAt=home.id;enterPlanet(home.id);openBuilding(scene.items.find(it=>it.homeStructure==='housing-'+level),true);};levelControls.append(b);}controls.append(levelControls);
function mapFrame(now){if(mapActive&&!state.landed)render(now,.016);requestAnimationFrame(mapFrame);}requestAnimationFrame(mapFrame);

const supplyButton=document.createElement('button');supplyButton.textContent='Baumaterial bereit';supplyButton.onclick=()=>{for(const s of Object.values(home.market.goods))s.stock=100000;renderPlanetUi();};controls.append(supplyButton);
const commandReport=document.createElement('output');commandReport.id='qa-command';controls.append(commandReport);document.addEventListener('click',()=>{commandReport.textContent=JSON.stringify(window.qaCommands.at(-1)||{});});
