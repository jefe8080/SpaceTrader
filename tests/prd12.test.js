import test from 'node:test';
import assert from 'node:assert/strict';
import {selectHomeQuest} from '../shared/quest-selection.js';

test('PRD12: display selection wraps, survives updates and falls back after completion',()=>{
  const quests={a:{},b:{},c:{}},progress={active:{a:true,b:true,c:true},completed:{}};
  assert.deepEqual(selectHomeQuest(quests,progress,'b'),{id:'b',index:1,count:3});
  assert.equal(selectHomeQuest(quests,progress,'a',-1).id,'c');
  assert.equal(selectHomeQuest(quests,progress,'c',1).id,'a');
  progress.completed.b=true;
  assert.equal(selectHomeQuest(quests,progress,'b').id,'a');
  assert.deepEqual(progress.active,{a:true,b:true,c:true});
  assert.equal(selectHomeQuest(quests,null,'a').count,0);
});
