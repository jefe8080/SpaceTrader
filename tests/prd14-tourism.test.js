import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {initializePopulation,passengerTrade,tickVisitors} from '../server/population.js';
import {ensureCash,tickRealMarket} from '../server/real-economy.js';
import {newProperty} from '../server/property.js';
test('PRD14: own resorts and orbital hotels retain bounded visitors through stay and return',()=>{
 const game=new Game(':memory:',{profile:'homeworld',seed:42});
 try{
  const p=game.createPlayer('Hotel'),home=game.world.entities.get(p.homeworld),ship=game.shipsOf(p.id)[0];
  ship.modules=['cabin'];home.market.homeworld.facilities.dock.status='ready';ship.dockedAt=home.id;
  assert.equal(passengerTrade(game,ship,home,'tourists',10,'buy',0,true).n,10);
  const batch=structuredClone(ship.passengers),population=home.market.homeworld.population;
  const other={id:'hotel-test',kind:'station',type:'hotel',market:{realEconomy:true,goods:{tourists:{role:'consume',rate:.4,stock:0,cap:1200},food:{role:'consume',rate:.3,stock:0,cap:100}}}};
  game.world.addEntity(other);ensureCash(other);initializePopulation(other);ship.dockedAt=other.id;
  const h=other.market.economy;assert.equal(h.visitorCapacity,480);
  assert.equal(passengerTrade(game,ship,other,'tourists',10,'sell').n,10);assert.equal(h.visitors[0].n,10);
  game.time=1199;tickRealMarket(game,other,1);assert.equal(h.visitors[0].ready,false);
  tickVisitors(other,1200);assert(h.visitors[0].ready);assert.equal(passengerTrade(game,ship,other,'tourists',10,'buy').n,10);
  ship.dockedAt=home.id;assert.equal(passengerTrade(game,ship,home,'tourists',10,'sell').n,10);assert.equal(home.market.homeworld.population,population+10);
  ship.passengers=structuredClone(batch);ship.cargo.tourists=10;
  ship.passengers[0].origin='elsewhere';const before=JSON.stringify(ship.passengers);
  const refused=passengerTrade(game,ship,home,'tourists',10,'sell');assert.match(refused.reason,/keine touristischen Gästeplätze/);assert.equal(JSON.stringify(ship.passengers),before);
  const resort={id:'resort-test',kind:'planet',type:'resort',market:{goods:{},economy:{population:100}}};initializePopulation(resort);
  game.ownership.set(resort.id,newProperty(resort.id,p.id,0));ship.dockedAt=resort.id;
  assert.equal(passengerTrade(game,ship,resort,'tourists',10,'sell').n,10);
  resort.market.economy.visitorCapacity=10;ship.passengers=structuredClone(batch);ship.cargo.tourists=10;
  assert.match(passengerTrade(game,ship,resort,'tourists',10,'sell').reason,/10 \/ 10/);
 }finally{game.store.close();}
});
