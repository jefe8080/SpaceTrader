// Isolated UI fixture; never opens a saved game. node scripts/dev-prd22.js
import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { Game } from '../server/game.js';
import { Net } from '../server/net.js';
import { startBattle, endBattle } from '../server/war/battle.js';
import { storeCombatReport } from '../server/war/history.js';
const app=express();app.use(express.static('client'));app.use('/shared',express.static('shared'));
const server=http.createServer(app), io=new Server(server), game=new Game(':memory:',{seed:22}), net=new Net(io,game);
const p=game.createPlayer('QA22'), q=game.createPlayer('Historiengegner');
const yard=game.world.entities.get('origin_yard');
const a=game.spawnShip(p,'korvette',yard), d=game.spawnShip(q,'lastesel',yard);
for(const s of [a,d]){s.dockedAt=null;s.queue=[];}
const b=startBattle(game,[a],[d]);game.time+=20;endBattle(game,b,'A');
const template=p.war.reports[0];
for(let i=1;i<31;i++)storeCombatReport(p,{...template,battle:'qa'+i,result:['win','loss','draw'][i%3],endedAt:Date.now()+i*1000});
p.war.reports.push({battle:'old',t:1,result:'loss',enemies:['Alter Gegner'],lost:['Altes Schiff'],prisoners:[],captured:[],retreated:[],loot:{}});
setInterval(()=>net.sendShips(),500);
server.listen(3022,()=>console.log('Isolated PRD22 QA: http://localhost:3022 · QA22'));
process.on('SIGINT',()=>{game.store.close();server.close();process.exit();});
