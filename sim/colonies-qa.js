// Isolated browser setup, not a full progression/balance simulation.
import fs from 'node:fs';
import {Game} from '../server/game.js';
import {runCommand} from '../server/handlers/index.js';
import {siteError,tickColonies,colonyCost} from '../server/colonies.js';
import {passengerTrade} from '../server/population.js';
import {tickHomeworld} from '../server/homeworld.js';
const file=process.argv[2]||'data/prd5/qa-u15.db';if(fs.existsSync(file))throw new Error('QA-Datei existiert bereits. Neuen Pfad wählen.');
const game=new Game(file,{seed:42,profile:'homeworld'}),p=game.createPlayer('U15 Expansion'),home=game.world.entities.get(p.homeworld),h=home.market.homeworld,expedition=game.shipsOf(p.id)[0];
p.homeQuest.completed=Object.fromEntries(Array.from({length:13},(_,i)=>[`H${String(i).padStart(2,'0')}`,{at:0}]));p.homeQuest.scenesSeen={H00:true};p.credits=3e6;p.pilot=5;
h.facilities.dock.status='ready';h.facilities.control.status='ready';h.controlLevel=1;expedition.dockedAt=home.id;expedition.modules=['cabin'];passengerTrade(game,expedition,home,'workers',20,'buy');
for(const [q,r] of [[3,0],[4,0]])game.world.ensureSector(q,r);
const site=[...game.world.entities.values()].find(e=>e.ruinsSite&&!siteError(game,p,e));game.revealAround(p,site.x,site.y,1500);game.discover(p,'system',site.system);game.discover(p,'sector',site.sector);
const rootShip=game.spawnShip(p,'spatz',home);rootShip.dockedAt=home.id;const carrier=game.spawnShip(p,'lastesel',site);carrier.dockedAt=site.id;
expedition.dockedAt=site.id;expedition.manualDock=site.id;
const command=(cmd,args)=>{const error=runCommand(game,p,{cmd,...args});if(error)throw new Error(error);};
command('colonySurvey',{target:site.id,ship:expedition.id});
for(const [g,n] of Object.entries(colonyCost(p).goods)){carrier.cargo[g]=n;command('colonyDeliver',{target:site.id,good:g,amount:n});}
command('colonyFound',{target:site.id,ship:expedition.id,confirmed:true});game.time+=300;tickColonies(game,300);command('homeQuestComplete',{target:home.id,quest:'H13'});
command('manualShip',{ship:carrier.id});carrier.cargo.ingots=4;command('homeRepair',{target:site.id,facility:'control'});game.time+=30;tickHomeworld(game,site,30);
for(const [g,n] of Object.entries({powercells:20,computers:10})){home.market.goods[g].stock=n;command('homeQuestDeliver',{target:home.id,quest:'H16',good:g,amount:n});}
command('homeQuestComplete',{target:home.id,quest:'H16'});
const target=[...game.world.systems.values()].find(s=>s.sector==='4,0'&&!s.start&&!s.faction);game.discover(p,'system',target.id);game.discover(p,'sector',target.sector);
rootShip.dockedAt=null;rootShip.x=home.x+home.radius+500;rootShip.y=home.y;game.revealAround(p,home.x,home.y,2000);game.close();console.log(JSON.stringify({file,player:p.name,home:home.id,colony:site.id,colonyName:site.name,targetSystem:target.id,targetName:target.name},null,2));
