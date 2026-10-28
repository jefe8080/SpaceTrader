import test from 'node:test';
import assert from 'node:assert/strict';
import {selectHomeQuest} from '../shared/quest-selection.js';
import {recipeStock,stockAssessment} from '../shared/production-display.js';
import {productionBubble} from '../shared/production-display.js';
import {productionBlockReason} from '../server/homeworld-operations.js';
import {RECIPES} from '../shared/goods.js';

test('PRD12: bubbles follow actual stall reason, manual pause wins, ruins and construction are excluded',()=>{
  const building={id:'p',recipe:'smelter',status:'ready'},item={homeStructure:'p'},market={homeworld:{structures:[building],allocations:[{id:'p',state:'paused',reason:'Zutaten fehlen'}]}};
  assert.equal(productionBubble(market,item),'???');
  for(const reason of ['Energie fehlt','Personal fehlt','Lager voll','Produktionsziel erreicht']){
    market.homeworld.allocations[0].reason=reason;assert.equal(productionBubble(market,item),null);
  }
  building.enabled=false;assert.equal(productionBubble(market,item),'Zzz');
  for(const status of ['ruined','building']){building.status=status;assert.equal(productionBubble(market,item),null);}
});

test('PRD12: production reasons distinguish targets, unavailable ingredients and full storage',()=>{
  const recipe=RECIPES.smelter;
  const market={goods:Object.fromEntries([...Object.keys(recipe.in),...Object.keys(recipe.out)].map(g=>[g,{stock:0}])),homeworld:{storage:2000,hazardStorage:100,reservations:{},reserves:{},logistics:{orders:[]}}};
  assert.equal(productionBlockReason(market,recipe,'smelter'),'Zutaten fehlen');
  for(const [g,n] of Object.entries(recipe.in))market.goods[g].stock=n;
  assert.equal(productionBlockReason(market,recipe,'smelter'),null);
  market.homeworld.storage=0;assert.equal(productionBlockReason(market,recipe,'smelter'),'Lager voll');
  market.homeworld.logistics.orders.push({kind:'production',recipe:'smelter',state:'delivered',cycles:1,target:1});
  assert.equal(productionBlockReason(market,recipe,'smelter'),'Produktionsziel erreicht');
});

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
