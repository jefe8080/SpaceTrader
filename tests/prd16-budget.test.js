import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../server/game.js';import {ensureCash,tickRealMarket,tickCivilMoney} from '../server/real-economy.js';
import {HOMEWORLD} from '../shared/homeworld.js';
test('Legacy cash-only planet recovers bounded civil income, zero inhabitants remain zero',()=>{
 const game=new Game(':memory:',{seed:42,profile:'homeworld'});
 try{
 const p=game.createPlayer('Budget');const e=[...game.world.entities.values()].find(e=>e.kind==='planet'&&e.type!=='ruins'&&e.market);
 e.market.economy={cash:0};ensureCash(e);const h=e.market.economy;assert.ok(h.population>0);assert.ok(h.workers);
 for(const s of Object.values(e.market.goods))s.stock=0;
 tickRealMarket(game,e,60);assert.ok(h.civil.budget>0);assert.ok(Number.isFinite(h.cash));const income=h.civil.incomePerHour;
 h.civil.budget=0;tickRealMarket(game,e,60);assert.ok(h.civil.budget>0);assert.equal(h.civil.incomePerHour,income);
 for(let i=0;i<100;i++)tickRealMarket(game,e,3600);
 assert.ok(h.civil.budget<=h.civil.incomePerHour*.8*HOMEWORLD.money.civilianBudgetHours+1e-7);
 const saved=JSON.parse(JSON.stringify(h));e.market.economy=saved;ensureCash(e);assert.equal(e.market.economy.population,h.population);
 e.market.economy.population=0;e.market.economy.civil.budget=0;ensureCash(e);tickCivilMoney(game,e,3600);assert.equal(e.market.economy.civil.budget,0);
 }finally{game.store.close();}
});
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
test('Saved legacy planet budget recovers after restart and stays finite on another restart',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prd16-budget-')),file=path.join(dir,'save.db');let game=new Game(file,{profile:'homeworld',seed:42});
 try{
 game.createPlayer('Altstand');const e=[...game.world.entities.values()].find(e=>e.kind==='planet'&&e.type!=='ruins'&&e.market);const id=e.id;e.market.economy={cash:0};game.save();game.store.close();game=new Game(file,{profile:'homeworld',seed:42});
 const loaded=game.world.entities.get(id);tickRealMarket(game,loaded,60);assert.ok(loaded.market.economy.civil.budget>0);assert.ok(Number.isFinite(loaded.market.economy.cash));game.save();game.store.close();game=new Game(file,{profile:'homeworld',seed:42});
 const again=game.world.entities.get(id);assert.ok(again.market.economy.civil.budget>0);const before=again.market.economy.civil.gross;tickRealMarket(game,again,60);assert.ok(again.market.economy.civil.gross>before);
 }finally{game.store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
