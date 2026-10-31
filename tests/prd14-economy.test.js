import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {consumeCivilGood,tickCivilMoney} from '../server/real-economy.js';
import {localDemandPerHour} from '../shared/local-demand.js';
import {localSalesSummary} from '../shared/local-sales.js';
import {runCommand} from '../server/handlers/index.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
test('PRD14: demand and actual sales respond to price, preserve reserves and cannot spend absent money',()=>{
  const game=new Game(':memory:',{profile:'homeworld',seed:42});
  try{
    const p=game.createPlayer('Absatz'),e=game.world.entities.get(p.homeworld),h=e.market.homeworld,prop=game.ownership.get(e.id),s=e.market.goods.water;
    game.shipsOf(p.id)[0].dockedAt=e.id;
    assert.equal(runCommand(game,p,{cmd:'propFixed',target:e.id,good:'water',s:.3}),undefined);assert.equal(prop.fixed.water,.3);
    assert.match(runCommand(game,p,{cmd:'propFixed',target:e.id,good:'ingots',s:.3}),/zivilen Verbrauch/);
    const run=price=>{prop.fixed.water=price;s.stock=1000;h.civil={budget:10000,consumptionPayments:0};consumeCivilGood(game,e,'water',.01,100);return 1000-s.stock;};
    const high=run(.7),low=run(.3);assert(low>high);assert(Math.abs(low-localDemandPerHour('water',s,prop,.01)/36)<1e-8);
    s.stock=20;h.reserves={water:19};h.civil.budget=1e4;consumeCivilGood(game,e,'water',10,100);assert.equal(s.stock,19);
    h.reserves={};s.stock=20;h.civil.budget=3;const credits=p.credits,prior=localSalesSummary(e.market,game.time).total;
    consumeCivilGood(game,e,'water',10,100);assert(Math.abs(p.credits-credits-3)<1e-8);assert.equal(h.civil.budget,0);
    assert.equal(localSalesSummary(e.market,game.time).total-prior,3);assert(h.civil.purchaseLimited);
    const stock=s.stock;consumeCivilGood(game,e,'water',10,100);assert.equal(s.stock,stock);
    tickCivilMoney(game,e,1);assert(h.civil.incomePerHour>0);
  }finally{game.store.close();}
});

test('PRD14: persisted local sales reload without another owner credit',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prd14-sales-')),file=path.join(dir,'world.db');let game=new Game(file,{profile:'homeworld',seed:42});
 try{
  const p=game.createPlayer('Absatzneustart'),e=game.world.entities.get(p.homeworld),h=e.market.homeworld;
  h.civil={budget:1000,consumptionPayments:0};e.market.goods.water.stock=100;game.time=10;consumeCivilGood(game,e,'water',.01,100);
  const credits=p.credits,sales=localSalesSummary(e.market,game.time),pid=p.id,eid=e.id;game.close();game=new Game(file,{profile:'homeworld'});
  assert.equal(game.players.get(pid).credits,credits);assert.deepEqual(localSalesSummary(game.world.entities.get(eid).market,game.time),sales);
  game.statsFor(game.players.get(pid),eid);assert.equal(game.players.get(pid).credits,credits);
 }finally{if(game.store.db.open)game.store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
