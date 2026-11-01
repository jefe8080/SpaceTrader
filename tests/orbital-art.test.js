import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orbitalArtStage,orbitalArtParts,orbitalArtScale,orbitalHitTest} from '../shared/orbital-art.js';
import {serializeEntity} from '../server/net.js';
const world=orbital=>({id:'home',kind:'planet',type:'ruins',market:{goods:{},homeworld:{orbital}}});

test('all five orbital images follow completed construction and survive public serialization',()=>{
 for(const [orbital,stage] of [[undefined,'broken'],[{},'broken'],[{small:true},'small'],[{small:true,largeStage:1},'partial'],[{small:true,largeStage:2},'large'],[{small:true,large:true},'large'],[{small:true,large:true,doubleYard:true},'double']]){
  assert.equal(orbitalArtStage(world(orbital)),stage);
  assert.equal(orbitalArtStage(serializeEntity(world(orbital))),stage);
 }
 assert.equal(orbitalArtStage({kind:'planet',type:'ruins'}),'broken');
 assert.equal(orbitalArtStage({kind:'planet',type:'agrar'}),null);
 assert.equal(orbitalArtStage({kind:'station',type:'hub'}),null);
});
test('unfinished work and surface development do not display completed orbital upgrades early',()=>{
 for(const [orbital,stage] of [[{project:{kind:'small',remaining:1}},'broken'],[{small:true,project:{kind:'large',stage:1}},'small'],[{small:true,largeStage:1,project:{kind:'large',stage:2}},'partial'],[{small:true,large:true,project:{kind:'doubleYard'}},'large']]){
  const e=world(orbital);e.market.homeworld.structures=Array(50).fill({status:'ready'});e.market.homeworld.controlLevel=10;
  assert.equal(orbitalArtStage(e),stage);
 }
});
test('one fixed inner ring is reused and outer diameter remains fixed for all large stages',()=>{
 assert.deepEqual(orbitalArtParts(null),[]);
 assert.deepEqual(orbitalArtParts('broken'),['broken']);
 assert.deepEqual(orbitalArtParts('small'),['small']);
 for(const stage of ['partial','large','double']){
  assert.deepEqual(orbitalArtParts(stage),['small',stage]);
  assert.equal(orbitalArtScale(stage),6.4);
 }
});
test('ring selection reaches the wider footprint without selecting the empty gap or absent half',()=>{
 const e=world({small:true,large:true});
 assert.equal(orbitalHitTest(e,180,0,100),true);
 assert.equal(orbitalHitTest(e,280,0,100),true);
 assert.equal(orbitalHitTest(e,230,0,100),false);
 assert.equal(orbitalHitTest(e,0,0,100),false);
 assert.equal(orbitalHitTest(e,400,0,100),false);
 e.market.homeworld.orbital={small:true,largeStage:1};
 assert.equal(orbitalHitTest(e,0,-280*.58,100),true);
 assert.equal(orbitalHitTest(e,240,80,100),true);
 assert.equal(orbitalHitTest(e,0,280*.58,100),false);
});
