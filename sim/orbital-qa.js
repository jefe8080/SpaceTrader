// Isolated UI fixture: paid API transitions with abbreviated server-time setup.
import fs from 'node:fs';
import {Game} from '../server/game.js';
import {tickHomeworld} from '../server/homeworld.js';
import {runCommand} from '../server/handlers/index.js';
import {QUEST_DELIVERIES} from '../shared/advanced-homequests.js';
import {SHIP_TYPES} from '../shared/config.js';
import {revealHomeSites} from '../server/homequests.js';
const file=process.argv[2]||'data/prd5/qa-u14.db';if(fs.existsSync(file))throw new Error('QA-Datei existiert bereits. Neuen Pfad wählen.');
const game=new Game(file,{seed:42,profile:'homeworld'}),p=game.createPlayer('U14 Orbital'),e=game.world.entities.get(p.homeworld),h=e.market.homeworld,s=game.shipsOf(p.id)[0];
p.homeQuest.completed=Object.fromEntries(Array.from({length:8},(_,i)=>[`H${String(i).padStart(2,'0')}`,{at:0}]));p.homeQuest.scenesSeen={H00:true};p.credits=1e6;p.pilot=2;
h.population=500;h.workers={basic:180,skilled:90,specialist:30};h.facilities.dock.status='ready';h.facilities.control.status='ready';h.controlLevel=1;
h.structures=Array.from({length:6},(_,i)=>({id:`solar${i}`,kind:'solar',status:'ready',plot:i}));s.dockedAt=e.id;s.queue=[];
for(const [g,n] of Object.entries(QUEST_DELIVERIES.H08)){
  e.market.goods[g].stock=n;const error=runCommand(game,p,{cmd:'homeQuestDeliver',target:e.id,quest:'H08',good:g,amount:n});if(error)throw new Error(error);
}
const donated=game.spawnShip(p,'spatz',e);donated.dockedAt=e.id;
const error=runCommand(game,p,{cmd:'homeOrbital',target:e.id,large:false,ship:donated.id,confirmed:true});if(error)throw new Error(error);
game.time=590;tickHomeworld(game,e,590);
for(const [g,n] of Object.entries(SHIP_TYPES.spatz.build))e.market.goods[g].stock=n;
e.market.goods.water.stock=1000;e.market.goods.food.stock=1000;revealHomeSites(game,p,e);game.close();console.log(JSON.stringify({file,player:p.name,ringRemaining:h.orbital.project.remaining,donated:donated.id},null,2));
