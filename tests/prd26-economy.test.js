import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {tradePreview,recordEconomic,economicView} from '../server/economic-view.js';
test('Trade preview matches a real moving-price batch without changing live state',t=>{
 const g=new Game(':memory:',{seed:42});t.after(()=>g.store.close());const p=g.createPlayer('Quote'),s=g.shipsOf(p.id)[0];
 const e=[...g.world.entities.values()].find(e=>e.market?.goods.ice?.role==='produce');g.revealAround(p,e.x,e.y,2000);s.dockedAt=e.id;
 const before=JSON.stringify({p,s,e});const q=tradePreview(g,p,{ship:s.id,target:e.id,good:'ice',amount:20,dir:'buy'});
 assert.equal(JSON.stringify({p,s,e}),before);assert.ok(q.n>0);const r=g.tradeImpl(s,e,'ice',20,'buy');assert.equal(q.n,r.n);assert.equal(q.total,r.total);
 assert.ok(tradePreview(g,p,{ship:'not-owned',target:e.id,good:'ice',amount:20,dir:'buy'}).error);
});
test('Ledger groups interleaved civil payments and keeps free transfers separate from profit',()=>{
 const g={time:10},p={};recordEconomic(g,p,'Steuern',1,{place:'a'});recordEconomic(g,p,'Ziviler Absatz',2,{place:'a',good:'water'});recordEconomic(g,p,'Steuern',3,{place:'a'});recordEconomic(g,p,'Eigenlagertransfer',0,{ship:'s',units:10});
 const rows=economicView(g,p).ledger;assert.equal(rows.length,3);assert.equal(rows[0].amount,4);assert.equal(rows[2].amount,0);
});
