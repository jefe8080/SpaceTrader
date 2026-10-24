// Isolated UI fixture. Does not claim a complete paid progression simulation.
import fs from 'node:fs';
import {Game} from '../server/game.js';
import {newProperty} from '../server/property.js';
import {tickRealMarket} from '../server/real-economy.js';
const file=process.argv[2]||'data/prd5/qa-u13.db';if(fs.existsSync(file))throw new Error('QA-Datei existiert bereits. Neuen Pfad wählen.');
const game=new Game(file,{seed:42,profile:'homeworld'}),player=game.createPlayer('U13 Aufbau'),ship=game.shipsOf(player.id)[0];
game.world.ensureSector(1,1);const e=[...game.world.entities.values()].find(e=>e.type==='mining'&&!e.noBuy);
game.setOwner(e,player,newProperty(e.id,player.id,game.time));player.credits=1e6;player.governor=3;player.homeQuest.scenesSeen={H00:true};player.homeQuest.completed.H02={at:0};
ship.modules=['cabin'];ship.dockedAt=e.id;ship.x=e.x+e.radius+100;ship.y=e.y;game.revealAround(player,e.x,e.y,3000);
const h=e.market.economy;h.infrastructure=[{id:'qa-solar',kind:'solar'}];h.projects=[];
for(const [g,n] of Object.entries({plates:20,machinery:14,robots:10,food:1000,water:1000}))e.market.goods[g]||={role:'trade',rate:0,cap:2000,stock:0,mod:1};
for(const [g,n] of Object.entries({plates:20,machinery:14,robots:10,food:1000,water:1000}))e.market.goods[g].stock=n;
tickRealMarket(game,e,0);game.close();console.log(JSON.stringify({file,player:player.name,planet:e.name,id:e.id,population:h.population},null,2));
