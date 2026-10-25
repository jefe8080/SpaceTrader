import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {runCommand} from '../server/handlers/index.js';
test('Routenlöschung entfernt nur Befehle dieser Route und lässt fremde Vorlagen unangetastet',()=>{
 const game=new Game(':memory:',{seed:3});
 try {
  const player=game.createPlayer('Route-QA'),other=game.createPlayer('Andere'),ship=game.shipsOf(player.id)[0];
  const r={id:'qa',owner:player.id,name:'Vorlage',stops:[{targetId:'origin_hub',actions:[]}],minBalance:0};game.routes.set(r.id,r);
  ship.queue=[{t:'wait',secs:10},{t:'route',route:r.id},{t:'route',route:'andere'}];
  assert.ok(runCommand(game,other,{cmd:'routeDelete',route:r.id}));assert.ok(game.routes.has(r.id));
  assert.equal(runCommand(game,player,{cmd:'routeDelete',route:r.id}),undefined);
  assert.deepEqual(ship.queue,[{t:'wait',secs:10},{t:'route',route:'andere'}]);assert.equal(game.routes.has(r.id),false);
 } finally {game.store.close();}
});
test('Routenspeichern hält 16-Stopplimit und setzt nur ungültige laufende Indizes zurück',()=>{
 const game=new Game(':memory:',{seed:3});
 try {
  const player=game.createPlayer('Route-QA'),ship=game.shipsOf(player.id)[0];
  const r={id:'qa',owner:player.id,name:'Vorlage',stops:[{targetId:'origin_hub',actions:[]}],minBalance:0};game.routes.set(r.id,r);
  const stop={targetId:'origin_hub',actions:[]};
  assert.ok(runCommand(game,player,{cmd:'routeSave',id:r.id,name:'Zu lang',stops:Array.from({length:17},()=>stop)}));
  assert.equal(r.name,'Vorlage');assert.equal(r.stops.length,1);
  ship.queue=[{t:'route',route:r.id,idx:8,phase:'actions'},{t:'route',route:r.id,idx:0,phase:'actions'}];
  assert.equal(runCommand(game,player,{cmd:'routeSave',id:r.id,name:'Gespeichert',stops:[stop],minBalance:100}),undefined);
  assert.equal(r.name,'Gespeichert');assert.equal(r.minBalance,100);
  assert.equal(ship.queue[0].idx,0);assert.equal(ship.queue[0].phase,'travel');assert.equal(ship.queue[1].phase,'actions');
 } finally {game.store.close();}
});
test('Schiffsabwahl wird mit dem Routenentwurf gespeichert und erhält andere Queue-Einträge',()=>{
 const game=new Game(':memory:',{seed:3});
 try {
  const player=game.createPlayer('Route-QA'),other=game.createPlayer('Fremd'),ship=game.shipsOf(player.id)[0],foreign=game.shipsOf(other.id)[0];
  const r={id:'qa',owner:player.id,name:'Vorlage',stops:[{targetId:'origin_hub',actions:[]}],minBalance:0};game.routes.set(r.id,r);
  ship.queue=[{t:'route',route:r.id},{t:'wait',secs:10}];foreign.queue=[{t:'route',route:r.id}];
  assert.ok(runCommand(game,player,{cmd:'routeSave',id:r.id,name:'Nicht speichern',stops:r.stops,unassign:[foreign.id]}));
  assert.equal(r.name,'Vorlage');assert.equal(ship.queue.length,2);
  assert.equal(runCommand(game,player,{cmd:'routeSave',id:r.id,name:'Abgewählt',stops:r.stops,unassign:[ship.id]}),undefined);
  assert.deepEqual(ship.queue,[{t:'wait',secs:10}]);assert.equal(foreign.queue.length,1);
 } finally {game.store.close();}
});
