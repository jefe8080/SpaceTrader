// Isolated browser fixture, deliberately not a progression/balance simulation.
import fs from 'node:fs';
import {Game} from '../server/game.js';
import {tickHomeworld} from '../server/homeworld.js';
const file=process.argv[2]||'data/prd5/qa-u12.db';
if(fs.existsSync(file))throw new Error('QA-Datei existiert bereits. Einen neuen Pfad verwenden.');
const game=new Game(file,{seed:42,profile:'homeworld'}),player=game.createPlayer('U12 Leitstelle'),entity=game.world.entities.get(player.homeworld),h=entity.market.homeworld,ship=game.shipsOf(player.id)[0];
player.homeQuest.scenesSeen={H00:true};player.homeQuest.completed={H00:{at:0},H01:{at:0},H02:{at:0},H03:{at:0}};player.credits=100000;
h.facilities.dock.status='ready';h.facilities.control.status='ready';h.controlLevel=1;h.controlModules={dispatch:1,production:1,sales:1};h.workers={basic:40,skilled:20,specialist:0};
h.structures=[{id:'qa-solar',kind:'solar',status:'ready',plot:0}];
ship.dockedAt=entity.id;ship.queue=[];ship.cargo={};
const source=[...game.world.entities.values()].find(e=>e.system===entity.system&&e.market?.goods.ice?.role==='produce');game.revealAround(player,source.x,source.y,1000);
tickHomeworld(game,entity,1);game.close();console.log(JSON.stringify({file,player:player.name,home:entity.id,ship:ship.id,source:source.id,sourceName:source.name},null,2));
