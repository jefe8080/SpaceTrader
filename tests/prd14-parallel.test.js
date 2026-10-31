import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game} from '../server/game.js';
import {runCommand} from '../server/handlers/index.js';
import {boardOf,exploreCells,exploreZone,questProgress} from '../server/quests.js';
import {activeSideQuests} from '../shared/side-quests.js';
import {levelUpBenefits} from '../shared/level-up.js';
import {WORLD} from '../shared/config.js';
const setup=(file=':memory:')=>{
 const game=new Game(file,{profile:'homeworld',seed:42}),p=game.createPlayer('Parallel'),e=game.world.entities.get(p.homeworld),s=game.shipsOf(p.id)[0];
 s.dockedAt=e.id;e.market.homeworld.facilities.dock.status='ready';s.cargo.water=10;
 return {game,p,e,s};
};
const offer=(e,id,type='procure')=>({id,type,giver:e.id,giverName:e.name,good:'water',amount:10,source:null,reward:{cr:100,xp:0}});
test('PRD14: levels 1/2/7 give exact limits; selected deliveries consume real cargo once',()=>{
 for(const [xp,limit] of [[0,1],[100,2],[30000,7]]){
  const {game,p,e,s}=setup();try{
   p.xp=xp;boardOf(e).offers=Array.from({length:limit+1},(_,i)=>offer(e,'q'+i));
   for(let i=0;i<limit;i++)assert.equal(runCommand(game,p,{cmd:'questAccept',ship:s.id,target:e.id,quest:'q'+i}),undefined);
   assert.equal(activeSideQuests(p).length,limit);assert.match(runCommand(game,p,{cmd:'questAccept',ship:s.id,target:e.id,quest:'q'+limit}),/Slots|slots/);
   const credits=p.credits;
   if(limit>1)assert.match(runCommand(game,p,{cmd:'questDeliver',ship:s.id}),/auswählen/);
   assert.equal(runCommand(game,p,{cmd:'questDeliver',ship:s.id,quest:'q0'}),undefined);assert.equal(p.credits,credits+100);assert.equal(s.cargo.water,undefined);assert.equal(activeSideQuests(p).length,limit-1);
   assert.match(runCommand(game,p,{cmd:'questDeliver',ship:s.id,quest:'q0'}),/Quest|Nebenquest/);assert.equal(p.credits,credits+100);
   if(limit>1){assert.match(runCommand(game,p,{cmd:'questDeliver',ship:s.id,quest:'q1'}),/nichts zu tun/);const other=structuredClone(activeSideQuests(p).slice(1));assert.equal(runCommand(game,p,{cmd:'questAbort',quest:'q1'}),undefined);assert.deepEqual(activeSideQuests(p),other);assert(p.questLock>game.time);}
  }finally{game.store.close();}
 }
});
test('PRD14: old active quest and additional independent progress survive a database restart',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prd14-parallel-')),file=path.join(dir,'world.db');let {game,p,e,s}=setup(file);
 try{
  p.xp=600;p.quest={...offer(e,'old'),accepted:1,progress:3,ship:s.id};const old=structuredClone(p.quest);p.quests=[{...offer(e,'extra','courier'),pickup:e.id,dest:'origin_hub',state:'pickup',ship:s.id}];
  const pid=p.id,sid=s.id;game.close();game=new Game(file,{profile:'homeworld'});p=game.players.get(pid);s=game.ships.get(sid);
  assert.deepEqual(p.quest,old);assert.equal(activeSideQuests(p).length,2);assert.equal(questProgress(game,p,s,false),true);assert.equal(p.quests[0].state,'deliver');assert.deepEqual(p.quest,old);
  const second=structuredClone(p.quests[0]);assert.equal(runCommand(game,p,{cmd:'questAbort',quest:'old'}),undefined);assert.deepEqual(activeSideQuests(p),[second]);
 }finally{if(game.store.db.open)game.store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('PRD14: parallel mining cannot reuse the same mined quantities',()=>{
 const {game,p,e,s}=setup();try{
  p.quest={...offer(e,'mine1','mine'),minedBase:0};p.quests=[{...offer(e,'mine2','mine'),minedBase:0}];s.mined={water:10};s.cargo.water=20;
  assert.equal(questProgress(game,p,s,true,'mine1'),true);assert.equal(questProgress(game,p,s,true,'mine2'),false);assert.equal(s.cargo.water,10);
  s.mined.water+=10;assert.equal(questProgress(game,p,s,true,'mine2'),true);assert.equal(s.cargo.water,undefined);
 }finally{game.store.close();}
});
test('PRD14: exploration progresses additional slots and XP emits only real level transitions',()=>{
 const {game,p,e}=setup();try{
  p.quest=offer(e,'delivery');p.quests=[{...offer(e,'zone','explore'),zone:'qa-zone',progress:0}];
  exploreZone(game,p,[{id:'qa-zone'}]);assert.equal(activeSideQuests(p).length,1);assert.equal(p.quest.id,'delivery');
  const sec=game.world.sectors.get(e.sector),x=Math.floor(sec.bh.x/WORLD.FOG_CELL),y=Math.floor(sec.bh.y/WORLD.FOG_CELL);
  p.quests=[{...offer(e,'cells','explore'),sector:e.sector,cells:1,progress:0}];exploreCells(game,p,[`${x},${y}`]);assert.equal(activeSideQuests(p).length,1);
  const events=[];game.on('pilotLevelUp',(_,event)=>events.push(event));p.xp=0;game.addXp(p,99);game.addXp(p,1);game.addXp(p,0);game.addXp(p,30000);
  assert.deepEqual(events,[{before:1,level:2},{before:2,level:7}]);assert.equal(p.pilot,1);
  const benefits=levelUpBenefits(2,7);assert.equal(benefits.additionalSlots,5);assert.equal(benefits.slotLimit,7);assert.deepEqual(benefits.licenses.map(l=>l.level),[3,4,5,6]);assert.equal(levelUpBenefits(7,7),null);
 }finally{game.store.close();}
});
