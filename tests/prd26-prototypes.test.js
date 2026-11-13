import {test} from 'node:test';import assert from 'node:assert/strict';import {runPrototype,fundContract,deliverContract,cancelContract} from '../server/prototypes.js';import {Game} from '../server/game.js';import {ensureCash} from '../server/real-economy.js';
test('Every bounded prototype runs in a disposable world and cooperative money/material are conserved',()=>{
 for(const [kind,choice] of [['contract'],['cooperation'],['production','standard'],['production','efficient'],['exploration','survey'],['exploration','salvage'],['diplomacy']]){
  const r=runPrototype(kind,choice);assert.equal(r.isolated,true);
  if(r.result.contract){const b=r.result.before,a=r.result.after;assert.ok(Math.abs(b.cash+b.creditsA+b.creditsB-a.cash-a.creditsA-a.creditsB)<1e-7);assert.equal(a.water-b.water,20);assert.equal(r.result.contract.escrow,0);}
  if(kind==='diplomacy'){assert.equal(r.result.passageDuring,true);assert.equal(r.result.passageAfterExpiry,false);}
 }
 const standard=runPrototype('production','standard').result,efficient=runPrototype('production','efficient').result;assert.equal(standard.after.water,efficient.after.water);assert.ok(efficient.after.ice>standard.after.ice);assert.ok(efficient.operation.power>standard.operation.power);
});
test('Contracts reject missing finance, duplicate delivery and double cancellation',t=>{
 const g=new Game(':memory:',{seed:26});t.after(()=>g.store.close());const p=g.createPlayer('A'),s=g.shipsOf(p.id)[0],e=[...g.world.entities.values()].find(e=>e.market?.goods.water?.role==='consume');e.market.goods.water.stock=0;ensureCash(e).cash=0;
 assert.ok(fundContract(g,e,'water',10).error);ensureCash(e).cash=10000;const c=fundContract(g,e,'water',10);s.dockedAt=e.id;s.cargo.water=10;assert.equal(deliverContract(g,c,p,s),null);assert.match(deliverContract(g,c,p,s),/offener/);const cash=ensureCash(e).cash;cancelContract(g,c);cancelContract(g,c);assert.equal(ensureCash(e).cash,cash);
});
