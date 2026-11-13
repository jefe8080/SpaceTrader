// Disposable in-memory battle UI fixture. No existing player or save is loaded.
import http from 'node:http';
import express from 'express';
import {Server} from 'socket.io';
import {Game} from '../server/game.js';
import {Net} from '../server/net.js';
import {startBattle} from '../server/war/battle.js';
import {GAME_PROTOCOL} from '../shared/protocol.js';
const app=express();app.use(express.static('client'));app.use('/shared',express.static('shared'));
app.get('/api/status',(req,res)=>res.json({protocol:GAME_PROTOCOL}));
const server=http.createServer(app),io=new Server(server),game=new Game(':memory:',{seed:77}),net=new Net(io,game);
const p=game.createPlayer('Kampftest'),q=game.createPlayer('Testgegner'),home=game.world.entities.get('origin_yard');
p.homeQuest.scenesSeen={H00:true};
const spawn=(pl,type,dx)=>{const s=game.spawnShip(pl,type,home);Object.assign(s,{dockedAt:null,queue:[],x:home.x+dx,y:home.y+2000});return s;};
startBattle(game,[spawn(p,'zerstoerer',0)],[spawn(q,'fregatte',400),spawn(q,'fregatte',400),spawn(q,'fregatte',400)]);
setInterval(()=>game.tick(.1),100);
setInterval(()=>net.sendShips(),500);setInterval(()=>net.sendMarkets(),1000);
server.listen(3039,()=>console.log('http://localhost:3039 · Kampftest · injected UI fixture'));
