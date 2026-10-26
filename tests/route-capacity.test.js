
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planRoutePurchase,reserveRoutePurchase,syncRouteReservations,releaseRouteDelivery} from '../server/route-capacity.js';
function fixture(targets=[['a',50],['b',50]]){
 const route={id:'r',owner:'p',onlyWithTargetSpace:true,stops:[{targetId:'shop',actions:[{op:'buy',good:'ore'}]},...targets.map(([target])=>({targetId:target,actions:[{op:'sell',good:'ore',amount:0}]}))]};
 const entities=new Map(targets.map(([id,cap])=>[id,{id,kind:'planet',market:{goods:{ore:{role:'consume',cap,stock:0},grain:{role:'consume',cap,stock:0}}}}]));
 const game={world:{entities},ships:new Map(),routes:new Map([['r',route]]),ownership:new Map(),canUseStorage:()=>false};
 const ship={id:'s',owner:'p',cargo:{},queue:[{t:'route',route:'r',idx:0}]};game.ships.set('s',ship);
 return {game,ship,route,entities};
}
const sum=p=>p.reduce((n,r)=>n+r.amount,0);
test('PRD10: unterschiedliche Ziele addieren sich, doppelte Planeten zählen physisch nur einmal',()=>{
 for(const [targets,expected] of [[[['a',50],['b',50]],100],[[['a',50],['a',50]],50]]){
  const f=fixture(targets);assert.equal(sum(planRoutePurchase(f.game,f.ship,f.route,'ore',1000)),expected);
 }
 const f=fixture();f.route.stops[1].actions[0].amount=20;f.route.stops[2].actions[0].amount=30;
 assert.equal(sum(planRoutePurchase(f.game,f.ship,f.route,'ore',1000)),50);
 f.route.stops=[f.route.stops[0]];assert.equal(sum(planRoutePurchase(f.game,f.ship,f.route,'ore',1000)),0);
});
test('PRD10: 80 reservierte Einheiten lassen schiffsübergreifend nur 20 frei; Restfracht zählt',()=>{
 const f=fixture([['a',100]]),plan=planRoutePurchase(f.game,f.ship,f.route,'ore',80);
 f.ship.cargo.ore=80;reserveRoutePurchase(f.ship,plan,80);
 const other={id:'s2',owner:'p',cargo:{},queue:[{t:'route',route:'r'}]};f.game.ships.set(other.id,other);
 assert.equal(sum(planRoutePurchase(f.game,other,f.route,'ore',100)),20);
 assert.equal(sum(planRoutePurchase(f.game,f.ship,f.route,'ore',100)),20);
 f.ship.cargo.ore=30;releaseRouteDelivery(f.ship,'a','ore',50);f.entities.get('a').market.goods.ore.stock=50;
 assert.equal(sum(planRoutePurchase(f.game,other,f.route,'ore',100)),20);
 f.ship.queue=[];assert.equal(sum(planRoutePurchase(f.game,other,f.route,'ore',100)),50);
});
test('PRD10: gemeinsame Klassenkapazität, Rohstofflimit und andere Lagerklasse',()=>{
 const f=fixture([['a',100]]),m=f.entities.get('a').market;
 m.goods.chemicals={role:'consume',cap:100,stock:0};
 m.homeworld={storage:100,hazardStorage:30,limits:{ore:90},reserves:{}};
 f.route.stops[1].actions.push({op:'sell',good:'grain'},{op:'sell',good:'chemicals'});
 const plan=planRoutePurchase(f.game,f.ship,f.route,'ore',80);f.ship.cargo.ore=80;reserveRoutePurchase(f.ship,plan,80);
 assert.equal(sum(planRoutePurchase(f.game,f.ship,f.route,'ore',100)),10);
 assert.equal(sum(planRoutePurchase(f.game,f.ship,f.route,'grain',100)),20);
 assert.equal(sum(planRoutePurchase(f.game,f.ship,f.route,'chemicals',100)),30);
 m.moduleInventory={cargo:1};assert.equal(sum(planRoutePurchase(f.game,f.ship,f.route,'grain',100)),0);
});
test('PRD10: Routenänderung, Option, Abbruch und Wiederherstellung hinterlassen keine Doppelreservierungen',()=>{
 const f=fixture([['a',100]]);f.ship.cargo.ore=80;
 let saved=syncRouteReservations(f.game);assert.equal(sum(saved),80);
 f.ship.queue=JSON.parse(JSON.stringify(f.ship.queue));assert.equal(sum(syncRouteReservations(f.game)),80);
 delete f.ship.queue[0].destinationReservations;assert.equal(sum(syncRouteReservations(f.game)),80);
 f.route.onlyWithTargetSpace=false;assert.equal(sum(syncRouteReservations(f.game)),0);assert.equal(f.ship.queue[0].destinationReservations,undefined);
 f.route.onlyWithTargetSpace=true;assert.equal(sum(syncRouteReservations(f.game)),80);
 f.route.stops[1].actions=[];assert.equal(sum(syncRouteReservations(f.game)),0);
 f.game.routes.delete('r');assert.equal(sum(syncRouteReservations(f.game)),0);
});
test('PRD10: Ziele nach Rückkehr zum Einkauf und unzugängliche Lager sind ausgeschlossen',()=>{
 const f=fixture([['a',50],['shop',100],['b',100]]);
 assert.equal(sum(planRoutePurchase(f.game,f.ship,f.route,'ore',1000)),50);
 f.game.ownership.set('a',{player:'other',mode:'private'});
 assert.equal(sum(planRoutePurchase(f.game,f.ship,f.route,'ore',1000)),0);
});
