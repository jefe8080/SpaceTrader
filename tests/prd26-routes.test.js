import {test} from 'node:test';import assert from 'node:assert/strict';
import {routePreflight,deliveryHealth,recordDelivery} from '../shared/route-preflight.js';
test('Route preflight distinguishes missing hull capability from temporary stock risks',()=>{
 const entities=new Map([['ice',{id:'ice',name:'Eisquelle',market:{goods:{ice:{role:'produce',stock:0,cap:100}}}}]]);
 const route={stops:[{targetId:'ice',actions:[{op:'buy',good:'ice',amount:30}]}]};
 const s={name:'Spatz',type:'spatz',cargo:{},modules:[]};const r=routePreflight(route,[s],entities,0);assert.equal(r.errors.length,0);assert.ok(r.warnings.length>=1);
 entities.get('ice').market.goods.acid={role:'produce',stock:10,cap:100};route.stops[0].actions[0].good='acid';assert.match(routePreflight(route,[s],entities).errors.join(' '),/Laderaum/);
});
test('Delivery rates count real units, use the observed window and expire old deliveries',()=>{
 const h={};recordDelivery(h,50,'ice',10,'home');recordDelivery(h,55,'ice',5,'home');assert.equal(h.deliveries.length,1);
 assert.equal(deliveryHealth(h.deliveries,60,0,'ice').units,15);assert.equal(deliveryHealth(h.deliveries,60,0,'ice').perHour,900);
 assert.equal(deliveryHealth(h.deliveries,4000,0,'ice').units,0);assert.equal(deliveryHealth(h.deliveries,4000,0,'ice').last,55);
});
