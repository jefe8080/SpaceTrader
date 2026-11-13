// Real repeatable local flights from identical copies of an earned H06 checkpoint.
import fs from 'node:fs';import {Game} from '../server/game.js';import {runCommand} from './story-command.js';
const source='data/prd26/seed131127-serial/progression-h06.db',results=[];
for(const variant of ['ordinary','relic','relic-and-helper']){
 const file=`data/prd26/relic-${variant}.db`;fs.copyFileSync(source,file);const game=new Game(file);
 try{
  const p=[...game.players.values()][0],home=game.world.entities.get(p.homeworld),ship=game.shipsOf(p.id)[0],helper=game.shipsOf(p.id).find(s=>s.id!==ship.id),ice=[...game.world.entities.values()].find(e=>e.system===home.system&&e.market?.goods.ice?.role==='produce');
  const cmd=(name,args={})=>{const error=runCommand(game,p,{cmd:name,target:home.id,...args});if(error)throw new Error(error);};
  const until=fn=>{let n=0;while(!fn()&&n++<10000)game.tick(1);if(!fn())throw new Error('Flight comparison timed out.');};
  cmd('manualShip',{ship:ship.id});
  if(variant!=='ordinary'){cmd('homeOperation',{id:'workshop',enabled:true,priority:100});game.tick(1);cmd('relicWork',{ship:ship.id,kind:'install'});until(()=>!p.relic.operation);}
  let route;
  if(variant==='relic-and-helper'){cmd('routeSave',{name:'QA Reliktvergleich',stops:[{targetId:home.id,actions:[{op:'waitUntil',good:'ice',cond:'stock<=',value:120,timeout:86400}]},{targetId:ice.id,actions:[{op:'buy',good:'ice',amount:30}]},{targetId:home.id,actions:[{op:'sell',good:'ice',amount:0}]}],assign:[helper.id]});route=[...game.routes.values()].find(r=>r.name==='QA Reliktvergleich');}
  const started=game.time,fuel=ship.fuel,bought=ship.tot?.buy||0;
  const go=e=>{cmd('order',{ships:[ship.id],order:{t:'goto',target:e.id}});until(()=>ship.dockedAt===e.id&&!ship.queue.length);};
  for(let i=0;i<5;i++){go(ice);cmd('trade',{target:ice.id,ship:ship.id,good:'ice',amount:10,dir:'buy'});go(home);cmd('trade',{ship:ship.id,good:'ice',amount:10,dir:'sell'});}
  results.push({variant,seconds:game.time-started,manualIceDelivered:50,helperIceDelivered:route?.deliveries?.reduce((n,r)=>n+r.units,0)||0,fuelUsed:fuel-ship.fuel,manualPurchaseCost:(ship.tot?.buy||0)-bought});
 }finally{game.store.close();}
}
fs.writeFileSync('docs/qa/prd26/relic.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
