import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../server/game.js';import {startBattle,tickBattle,tickBattles} from '../server/war/battle.js';
import {COMBAT} from '../shared/combat.js';
function fixture(){const g=new Game(':memory:',{seed:3});const a=g.createPlayer('A'),d=g.createPlayer('D'),yard=g.world.entities.get('origin_yard');const s=p=>{const x=g.spawnShip(p,'fregatte',yard);x.dockedAt=null;x.queue=[];x.x+=p===a?-300:300;return x;};const b=startBattle(g,[s(a)],[s(d)]);return {g,b};}
function seeded(){let x=42;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296;};}
test('Half-speed server ticks match identical simulated battle time including ship damage and projectiles',()=>{
 const random=Math.random;Math.random=seeded();const normal=fixture();Math.random=seeded();const slow=fixture();
 try{
 Math.random=seeded();for(let i=0;i<400;i++)tickBattle(normal.g,normal.b,.05);
 Math.random=seeded();for(let i=0;i<400;i++)tickBattles(slow.g,.1);
 assert.equal(COMBAT.TIME_SCALE,.5);assert.equal(slow.b.t,normal.b.t);
 assert.deepEqual(slow.b.units,normal.b.units);assert.deepEqual(slow.b.projectiles,normal.b.projectiles);
 assert.deepEqual([...slow.g.ships.values()].map(s=>s.dmg),[...normal.g.ships.values()].map(s=>s.dmg));
 const snapshot=JSON.parse(JSON.stringify(slow.b)),t=snapshot.t;slow.g.battles.set(snapshot.id,snapshot);tickBattles(slow.g,2);assert.ok(Math.abs(snapshot.t-t-1)<1e-8);
 }finally{Math.random=random;normal.g.store.close();slow.g.store.close();}
});
