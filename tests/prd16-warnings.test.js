import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../server/game.js';import {startBattle,joinBattle} from '../server/war/battle.js';
test('Only new attacks warn defenders, simultaneous battles remain separate, joining is silent',()=>{
 const game=new Game(':memory:',{seed:3});try{
 const a=game.createPlayer('A'),d=game.createPlayer('D'),yard=game.world.entities.get('origin_yard');
 const ship=(p)=>{const s=game.spawnShip(p,'korvette',yard);s.dockedAt=null;s.state='idle';s.queue=[];return s;};
 const warnings=[];game.on('attackWarning',(p,w)=>warnings.push([p.id,w]));
 const b=startBattle(game,[ship(a)],[ship(d)]);assert.equal(warnings.length,1);assert.equal(warnings[0][0],d.id);assert.equal(warnings[0][1].id,b.id);assert.ok(warnings[0][1].targets.length);
 joinBattle(game,b,[ship(d)],'B');assert.equal(warnings.length,1);
 const b2=startBattle(game,[ship(a)],[ship(d)]);assert.equal(warnings.length,2);assert.notEqual(b.id,b2.id);
 const planet=game.world.entities.get(d.homeworld);if(planet){startBattle(game,[ship(a)],[],{planet});assert.equal(warnings.length,3);assert.ok(warnings[2][1].targets.includes(planet.name));}
 }finally{game.store.close();}
});
