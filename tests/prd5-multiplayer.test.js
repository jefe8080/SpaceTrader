import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {runCommand,acknowledgeStories} from './home-story-helper.js';
import {pointCovered} from '../server/coverage.js';
import {HOMEWORLD} from '../shared/homeworld.js';

const command=(g,p,cmd,args={})=>runCommand(g,p,{cmd,...args});
const at=(ship,e)=>{ship.dockedAt=e.id;ship.x=e.x;ship.y=e.y;ship.queue=[];};
function begin(g,p){
  const home=g.world.entities.get(p.homeworld),ship=g.shipsOf(p.id)[0];at(ship,home);
  assert.equal(command(g,p,'homeLand',{target:home.id}),undefined);
  assert.equal(command(g,p,'homeQuestComplete',{target:home.id,quest:'H00'}),undefined);
  assert.equal(command(g,p,'homeRepair',{target:home.id,facility:'dock'}),undefined);
  g.tick(15);assert.equal(home.market.homeworld.facilities.dock.status,'ready');
  assert.equal(command(g,p,'homeQuestComplete',{target:home.id,quest:'H01'}),undefined);
  return {home,ship};
}

test('Gleichzeitige und später beitretende Spieler erhalten unabhängigen Einstieg ohne gemeinsame Gratisbestände',()=>{
  const g=new Game(':memory:',{profile:'homeworld',seed:42});
  try{
    const a=g.createPlayer('Früh'),b=g.createPlayer('Parallel'),first=begin(g,a),second=begin(g,b);
    g.time+=86400;const late=g.createPlayer('Später'),third=begin(g,late);
    const worlds=[first.home,second.home,third.home];
    for(let i=0;i<worlds.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(worlds[i].x-worlds[j].x,worlds[i].y-worlds[j].y)>=HOMEWORLD.placement.minDistance);
    for(const [p,{home,ship}] of [[a,first],[b,second],[late,third]]){
      assert.equal(home.market.homeworld.owner,p.id);assert.equal(g.ownership.get(home.id).personal,true);
      assert.equal(g.shipsOf(p.id).length,1);assert.equal(ship.type,'spatz');assert.equal(p.relic,undefined);
      assert.equal(home.market.homeworld.facilities.waterworks.status,'ruined');
      assert.equal(home.market.homeworld.grants.filter(x=>x.source==='start_exception').length,3);
      assert.ok(command(g,p,'homeQuestComplete',{target:home.id,quest:'H00'}));
    }
    assert.notEqual(first.home.market.goods,second.home.market.goods);
  }finally{g.close();}
});

test('Konsortium teilt weder persönliche Heimatverwaltung noch Leitstellennetze automatisch',()=>{
  const g=new Game(':memory:',{profile:'homeworld',seed:42});
  try{
    const a=g.createPlayer('Anna'),b=g.createPlayer('Bert'),aa=begin(g,a),bb=begin(g,b),hub=g.world.entities.get('origin_hub');
    // Qualification for consortium creation is this test's declared prerequisite.
    a.xp=200;at(aa.ship,hub);assert.equal(command(g,a,'cFound',{name:'Gemeinsamer Handel',color:'#ff8800'}),undefined);
    assert.equal(command(g,a,'cInvite',{name:b.name}),undefined);assert.equal(command(g,b,'cAnswer',{id:a.consortium,accept:true}),undefined);
    assert.equal(command(g,a,'cPromote',{player:b.id}),undefined);
    aa.home.market.homeworld.controlLevel=1;aa.home.market.homeworld.facilities.control.status='ready';
    assert.equal(pointCovered(g,a,aa.home),true);assert.equal(pointCovered(g,b,aa.home),false);
    at(bb.ship,aa.home);g.revealAround(b,aa.home.x,aa.home.y,1000);
    assert.match(command(g,b,'homeRepair',{target:aa.home.id,facility:'waterworks'}),/eigenen|eigene|deiner/);
    assert.ok(command(g,b,'routeSave',{name:'Fremdes Netz',stops:[{targetId:aa.home.id,actions:[]}],assign:[bb.ship.id]}));
    assert.equal(g.ownership.get(aa.home.id).player,a.id);assert.equal(g.ownership.get(bb.home.id).player,b.id);
  }finally{g.close();}
});

test('Realer Rohstoffhandel zwischen Spielern hat Gegenkasse und erhält die gesamte Ware',()=>{
  const g=new Game(':memory:',{profile:'homeworld',seed:42});
  try{
    const a=g.createPlayer('Verkäufer'),b=g.createPlayer('Käufer'),aa=begin(g,a),bb=begin(g,b);
    const source=[...g.world.entities.values()].find(e=>e.market?.goods.ore?.role==='produce'&&!e.market.homeworld);
    at(aa.ship,source);g.revealAround(a,source.x,source.y,1000);
    const rawBefore=source.market.goods.ore.stock;
    assert.equal(command(g,a,'trade',{target:source.id,ship:aa.ship.id,good:'ore',dir:'buy',amount:10}),undefined);
    assert.equal(source.market.goods.ore.stock,rawBefore-10);
    at(aa.ship,aa.home);assert.equal(command(g,a,'trade',{target:aa.home.id,ship:aa.ship.id,good:'ore',dir:'sell',amount:10}),undefined);
    assert.equal(command(g,a,'propMode',{target:aa.home.id,mode:'open'}),undefined);
    at(bb.ship,aa.home);g.revealAround(b,aa.home.x,aa.home.y,1000);
    // The same berth is rate limited; a later server second provides a slot.
    g.tick(1);
    const totalMoney=a.credits+b.credits;
    assert.equal(command(g,b,'trade',{target:aa.home.id,ship:bb.ship.id,good:'ore',dir:'buy',amount:10}),undefined);
    assert.ok(Math.abs(a.credits+b.credits-totalMoney)<1e-7);
    assert.equal(bb.ship.cargo.ore,10);assert.equal(aa.home.market.goods.ore.stock,0);
    assert.equal((aa.ship.cargo.ore||0)+(bb.ship.cargo.ore||0)+aa.home.market.goods.ore.stock,10);
  }finally{g.close();}
});
