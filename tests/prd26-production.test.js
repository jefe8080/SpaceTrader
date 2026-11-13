import {test} from 'node:test';import assert from 'node:assert/strict';
import {productionPlan} from '../shared/production-plan.js';
import {setGoalReservation} from '../server/goal-reservations.js';
import {availableHomeStock} from '../shared/homeworld.js';
import {Game} from '../server/game.js';
test('Production plan consumes shared stock once, excludes reserves and does not mutate state',()=>{
 const market={goods:{ice:{stock:10}},homeworld:{facilities:{waterworks:{status:'ready',restored:true}},structures:[],reserves:{ice:2}}};
 const before=JSON.stringify(market),p=productionPlan(market,'water',20,['waterworks']);
 assert.equal(JSON.stringify(market),before);assert.equal(p.raw.ice,12);assert.equal(p.steps[0].cycles,10);assert.equal(p.builds.length,0);
 const missing=productionPlan(market,'water',20,[]);assert.equal(missing.raw.water,20);assert.equal(missing.steps.length,0);
});
test('Goal reservations extend the existing map and cannot steal automatic reservations',t=>{
 const g=new Game(':memory:',{seed:42});t.after(()=>g.store.close());const p=g.createPlayer('Reserve'),e=g.world.entities.get(p.homeworld),s=g.shipsOf(p.id)[0];s.dockedAt=e.id;
 e.market.goods.ice.stock=50;const h=e.market.homeworld;h.reservations={'production:abc':{goods:{ice:10}}};
 assert.equal(setGoalReservation(g,p,e,'Ring','ice',20),undefined);assert.equal(availableHomeStock(e.market,'ice'),20);
 assert.match(setGoalReservation(g,p,e,'Ring','ice',45),/ungebundene/);
 assert.equal(setGoalReservation(g,p,e,'Ring','ice',0),undefined);assert.equal(availableHomeStock(e.market,'ice'),40);assert.equal(h.reservations['production:abc'].goods.ice,10);
});
