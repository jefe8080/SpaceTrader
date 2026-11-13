import {test} from 'node:test';import assert from 'node:assert/strict';import {populationLimits,knownSiteResources} from '../shared/settlement-planning.js';
test('Population limits separate housing, employment and reserved training',()=>{
 const r=populationLimits({population:100,housing:100,supply:{basic:.5},workforce:{freeSlots:12},projects:[{kind:'training',count:10}]});assert.equal(r.workforceLimit,60);assert.equal(r.freeWorkplaces,12);assert.equal(r.training,10);assert.equal(r.blockers.length,2);
});
test('Colony comparison uses only supplied known entities and leaves missing sources unknown',()=>{
 const sources=new Map([['a',{id:'a',x:100,y:0,market:{goods:{ice:{role:'produce'}}}}]]);const r=knownSiteResources({id:'site',x:0,y:0},sources);assert.equal(r.find(x=>x.good==='ice').distance,100);assert.equal(r.find(x=>x.good==='grain').source,undefined);
});
