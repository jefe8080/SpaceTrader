import test from 'node:test';
import assert from 'node:assert/strict';
import {selectHomeQuest} from '../shared/quest-selection.js';
import {recipeStock,stockAssessment} from '../shared/production-display.js';

test('PRD12: recipe stocks respect protected and bound goods, including own production reservation',()=>{
  const market={goods:{water:{stock:10}},homeworld:{reserves:{water:3},reservations:{build:{goods:{water:2}},'production:p':{goods:{water:2}}},logistics:{orders:[{id:'p',kind:'production',recipe:'test',state:'planned'}]}}};
  assert.equal(recipeStock(market,'water','other'),3);
  assert.equal(recipeStock(market,'water','test'),5);
  assert.equal(recipeStock(market,'missing','test'),null);
  assert.deepEqual([0,1,2,3].map(n=>stockAssessment(n,2)),['short','short','enough','enough']);
  assert.equal(stockAssessment(0),'short');assert.equal(stockAssessment(1),'enough');assert.equal(stockAssessment(undefined,2),'unknown');
});

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
