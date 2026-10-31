import './prd12.js';
import {state} from '/js/state.js';
import {GOODS,PLANET_TYPES,BELT_TYPES} from '/shared/config.js';
import {renderQuestBox} from '/js/ui/quests.js';
import {renderDetails} from '/js/ui/details.js';
import {openFavorites} from '/js/ui/favorites.js';
import {enterPlanet,leavePlanet,renderPlanetUi,openBuilding} from '/js/ui/planetPanel.js';
import {scene} from '/js/planetside.js';
import {showLevelUp} from '/js/ui/levelUp.js';
import {socket} from '/js/net.js';
import {loadAssets} from '/js/assets.js';
await loadAssets();
window.qaCommands=[];socket.emit=(event,payload)=>{if(event==='cmd')window.qaCommands.push(payload);};
Object.assign(state,{profile:'homeworld',xp:100,level:2,pilot:1,credits:1e7,governor:3,favorites:{}});state.me.color='#83c8bb';
state.homeQuest={active:{H02:true},completed:{H02:true,H06:true},sites:{},scenesSeen:{}};
const home=state.entities.get('qa-home'),h=home.market.homeworld;home.owner='qa';h.population=100;h.housing=1600;h.energy={used:7,generation:20};h.civil={budget:321,incomePerHour:200,taxRate:.2,purchaseLimited:true};
h.structures=[1,2,3].map((level,i)=>({id:'housing-'+level,kind:'housing',status:'ready',level,plot:i,enabled:true}));
const property=id=>({entity:id,player:'qa',manage:true,mode:'open',fixed:{water:.3},upg:{},extras:[],since:0});state.props.set(home.id,property(home.id));
const ship=state.ships.get('qa-ship');Object.assign(ship,{type:'spatz',name:'Questkurier',modules:['cabin'],fuel:10,cargo:{water:10},passengers:[],mined:{}});
const normal={id:'qa-normal',kind:'planet',type:'agrar',name:'Sonnental',x:200,y:100,owner:'qa',size:1,market:{realEconomy:true,strategy:'planet',owner:'qa',mode:'open',eff:1,goods:{water:{role:'consume',stock:120,cap:1000,rate:.05,mod:1}},bld:{lvl:{},fac:[]},economy:{cash:777,population:1000,housing:2600,workers:{basic:480,skilled:120,specialist:0},infrastructure:[1,2,3].map(level=>({id:'infra-'+level,kind:'housing',level})),civil:{budget:321,incomePerHour:1600,taxRate:.2,purchaseLimited:true},visitors:[],visitorCapacity:0}}};
state.entities.set(normal.id,normal);state.props.set(normal.id,property(normal.id));
for(const type of Object.keys(PLANET_TYPES))if(type!=='ruins')state.entities.set('type-'+type,{id:'type-'+type,kind:'planet',type,name:'Bekannt: '+PLANET_TYPES[type].name,x:400,y:100,market:{goods:{}}});
for(const [type,def] of Object.entries(BELT_TYPES))state.entities.set('belt-'+type,{id:'belt-'+type,kind:'belt',type,name:def.name,x:600,y:100,richness:1});
const quest=id=>({id,type:'procure',giver:normal.id,giverName:normal.name,good:'water',amount:10,source:null,level:1,reward:{cr:100,xp:10},ship:ship.id});
state.quest=quest('first');state.quests=[{...quest('second'),giver:home.id,giverName:'Heimat'}];
state.stats.set(normal.id,{now:1,buckets:36,bucketSecs:300,data:[],localSales:{quantities:{water:7.5},revenue:{water:75},total:75}});
window.prd14={
 home:level=>{ship.dockedAt=home.id;enterPlanet(home.id);openBuilding(scene.items.find(i=>i.homeStructure==='housing-'+level),true);},
 normal:()=>{ship.dockedAt=normal.id;enterPlanet(normal.id);openBuilding(scene.items.find(i=>i.worldInfrastructure==='infra-3'),true);},
 economy:()=>{leavePlanet();ship.dockedAt=normal.id;state.selected={kind:'entity',id:normal.id};renderDetails();},
 places:()=>{leavePlanet();openFavorites();},
 level:()=>showLevelUp({before:1,level:7}),
 refresh:()=>{renderQuestBox();renderPlanetUi();renderDetails();},
};
document.querySelector('body > div:last-child')?.remove();
renderQuestBox();window.prd14.home(1);window.prd14Ready=true;
