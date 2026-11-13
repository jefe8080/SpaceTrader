import {test} from 'node:test';import assert from 'node:assert/strict';import {Game} from '../server/game.js';import {createTraining,trainingView,trainingCommand,closeTraining} from '../server/war/training.js';
test('Training accepts only tactical commands in an independent game and never mutates real progress',t=>{
 const main=new Game(':memory:',{seed:7}),p=main.createPlayer('Original');t.after(()=>main.store.close());const before=JSON.stringify(p),s=[...main.ships.values()].map(s=>JSON.stringify(s));const training=createTraining();t.after(()=>closeTraining(training));
 const v=trainingView(training,.1),own=v.units.find(u=>u.own);assert.ok(own);assert.equal(trainingCommand(training,{cmd:'battleOrder',battle:v.id,ships:[own.id],order:{t:'hold'}}),undefined);assert.match(trainingCommand(training,{cmd:'trade'}),/taktische/);
 assert.equal(JSON.stringify(p),before);assert.deepEqual([...main.ships.values()].map(s=>JSON.stringify(s)),s);
});
