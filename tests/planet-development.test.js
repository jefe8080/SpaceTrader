
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planetDevelopment} from '../shared/planet-development.js';
import {serializeEntity} from '../server/net.js';
function world(n,level){return {id:'world',kind:'planet',type:'ruins',market:{goods:{},homeworld:{controlLevel:level,facilities:{control:{status:'ready'}},structures:Array.from({length:n-1},(_,i)=>({id:String(i),status:'ready',kind:'housing'}))}}};}
test('PRD10: Ruinenstufen verlangen beide Schwellen und zählen nur fertige Bodengebäude',()=>{
 for(const [n,l,stage] of [[3,1,0],[4,0,0],[4,1,1],[11,2,1],[12,1,1],[12,2,2],[23,3,2],[24,2,2],[24,3,3]])assert.equal(planetDevelopment(world(n,l)).stage,stage);
 const e=world(24,3);e.market.homeworld.structures[0].status='building';assert.equal(planetDevelopment(e).stage,2);
 e.market.homeworld.structures[0].status='ready';e.market.homeworld.structures[0].enabled=false;
 e.market.homeworld.energy={generation:0};e.market.homeworld.workforce={};assert.equal(planetDevelopment(e).stage,3);
 e.market.homeworld.structures.pop();assert.equal(planetDevelopment(e).stage,2);
 e.market.homeworld.orbital={small:true,large:false,largeStage:1,project:{kind:'large'}};
 assert.deepEqual([planetDevelopment(e).smallRing,planetDevelopment(e).largeRing],[true,false]);
 e.market.homeworld.orbital.large=true;assert.equal(planetDevelopment(e).largeRing,true);
});
test('PRD10: öffentliche Serialisierung liefert allen Spielern dieselbe Entwicklung',()=>{
 const e=world(24,3);e.market.homeworld.orbital={small:true,large:true};
 assert.deepEqual(planetDevelopment(serializeEntity(e)),planetDevelopment(e));
});
test('PRD10: andere bebaubare Welten zeigen 0/4/12, unbebaubare bleiben unverändert',()=>{
 for(const type of ['agrar','ocean','desert','mining','ice','urban','resort','gasgiant','jungle','volcanic','colony','industrial']){
  const e={kind:'planet',type,market:{goods:{},economy:{infrastructure:[]}}};
  assert.equal(planetDevelopment(e).stage,0);
  e.market.economy.infrastructure=Array.from({length:4},()=>({kind:'solar'}));assert.equal(planetDevelopment(e).stage,1);
  e.market.economy.infrastructure=Array.from({length:12},()=>({kind:'solar'}));assert.equal(planetDevelopment(e).stage,2);
  assert.equal(planetDevelopment(e).smallRing,false);
 }
 const e={kind:'planet',type:'barren',market:{economy:{infrastructure:Array(30).fill({})}}};assert.equal(planetDevelopment(e).stage,0);
});
