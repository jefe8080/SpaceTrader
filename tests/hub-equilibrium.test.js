import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {tickMarket} from '../server/markets.js';
import {dispatchRealSupply,ensureCash} from '../server/real-economy.js';
import {ECON,targetOf,NPC_OWNER,ULTRA} from '../shared/config.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('Auch gespeicherte Hubs erhalten historische Drift mit individuellen Rollenzielen',()=>{
  const game=new Game(':memory:',{seed:42,profile:'homeworld'});
  try{
    const hub=game.world.entities.get('origin_hub'),m=hub.market;
    const trades=Object.values(m.goods).filter(s=>s.role==='trade');
    const fuel=m.goods.shipfuel;trades.splice(trades.indexOf(fuel),1);
    const a=trades[0],b=trades[1];a.stock=0;b.stock=b.cap;
    const ta=targetOf(a)*a.cap,tb=targetOf(b)*b.cap,oldB=b.stock;
    const rare=m.goods[ULTRA[0]];rare.stock=0;const tr=targetOf(rare)*rare.cap;
    // Simulate a previously saved market with the post-PRD5 fuel trade role.
    fuel.role='trade';fuel.rate=0;fuel.baseRate=0;fuel.stock=0;fuel.target=.67;
    tickMarket(hub,ECON.HALF_LIFE,ECON.HALF_LIFE,game);
    near(a.stock,ta/2);near(b.stock,tb+(oldB-tb)/2);near(rare.stock,tr/2);
    assert.equal(rare.role,'consume');assert.equal(fuel.role,'produce');assert.equal(fuel.target,.67);
    assert.equal(fuel.rate,1.2);assert.equal(fuel.baseRate,1.2);
    fuel.stock=0;tickMarket(hub,1,ECON.HALF_LIFE+1,game);
    assert(fuel.stock>0&&fuel.stock<=1.2);
    const count=game.ships.size;ensureCash(hub).cash=1e7;dispatchRealSupply(game,hub);
    assert.equal(game.ships.size,count);
  }finally{game.store.close();}
});

test('Hub-Handelswaren sind kaufbar und ohne externe Zielnachfrage wieder verkäuflich',()=>{
  const game=new Game(':memory:',{seed:42,profile:'homeworld'});
  try{
    const player=game.createPlayer('Hubhandel'),hub=game.world.entities.get('origin_hub');
    const ship=game.shipsOf(player.id)[0];ship.dockedAt=hub.id;ship.x=hub.x;ship.y=hub.y;
    const good=Object.keys(hub.market.goods).find(g=>hub.market.goods[g].role==='trade'&&g!=='shipfuel');
    const slot=hub.market.goods[good];slot.stock=0;
    tickMarket(hub,ECON.HALF_LIFE,ECON.HALF_LIFE,game);
    player.credits=1e8;ensureCash(hub).cash=1e8;
    assert.equal(game.trade(ship,hub,good,1,'buy').n,1);
    assert.equal(game.trade(ship,hub,good,1,'sell').n,1);
    assert.equal([...game.ships.values()].filter(s=>s.owner===NPC_OWNER).length,0);
  }finally{game.store.close();}
});
