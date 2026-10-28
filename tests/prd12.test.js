import test from 'node:test';
import assert from 'node:assert/strict';
import {selectHomeQuest} from '../shared/quest-selection.js';
import {recipeStock,stockAssessment} from '../shared/production-display.js';
import {productionBubble} from '../shared/production-display.js';
import {productionBlockReason} from '../server/homeworld-operations.js';
import {RECIPES} from '../shared/goods.js';
import {supplyOverview} from '../shared/supply-overview.js';
import {storageSummary} from '../shared/production-display.js';
import {Game} from '../server/game.js';
import {tickHomeworld} from '../server/homeworld.js';
import {serializeMarket} from '../server/net.js';

test('PRD12: legacy factory status follows production readiness and ownership in network data',()=>{
  const r=RECIPES.smelter,m={owner:'p',goods:Object.fromEntries([...Object.keys(r.in),...Object.keys(r.out)].map(g=>[g,{stock:0,cap:100}])),bld:{lvl:{},factories:[{recipe:'smelter'}]}};
  assert.equal(serializeMarket(m).factoryStates[0].reason,'Zutaten fehlen');
  for(const [g,n] of Object.entries(r.in))m.goods[g].stock=n;
  assert.equal(serializeMarket(m).factoryStates[0].reason,null);
  for(const g of Object.keys(r.out))m.goods[g].stock=100;
  assert.equal(serializeMarket(m).factoryStates[0].reason,'Lager voll');
  delete m.owner;assert.equal(serializeMarket(m).factoryStates[0].reason,'Kein Besitz');
});

test('PRD12: supply counts desired operation and project demand once against employment limits',()=>{
  const overview=supplyOverview(100,{basic:90,skilled:10,specialist:0},[{power:120,workers:{basic:20,skilled:12}}],{basic:2,skilled:5},100);
  assert.deepEqual(overview.power,{required:120,available:100});
  assert.deepEqual(overview.workers,{required:39,available:60});
  assert.deepEqual(overview.qualifications.skilled,{required:17,available:10});
  assert.equal(overview.qualifications.basic.available,60);
});

test('PRD12: desired demand survives ingredient stall, excludes paused plants and construction',()=>{
  const game=new Game(':memory:',{profile:'homeworld',seed:42});
  try{
    const p=game.createPlayer('PRD12 supply'),e=game.world.entities.get(p.homeworld),h=e.market.homeworld;
    h.structures=[{id:'plant',kind:'plant',recipe:'smelter',status:'ready',enabled:true,plot:0}];
    tickHomeworld(game,e,1);
    assert.equal(h.supplyOverview.power.required,4);
    assert.equal(h.allocations.find(a=>a.id==='plant').reason,'Zutaten fehlen');
    h.structures[0].enabled=false;tickHomeworld(game,e,1);
    assert.equal(h.supplyOverview.power.required,0);
    h.structures[0].enabled=true;h.structures[0].status='building';tickHomeworld(game,e,1);
    assert.equal(h.supplyOverview.power.required,0);
  }finally{game.close();}
});

test('PRD12: separate storage includes physical modules and reserved output places',()=>{
  const m={goods:{ore:{stock:10},chemicals:{stock:3}},moduleInventory:{a:2},homeworld:{storage:2000,hazardStorage:100,moduleOutputReserved:30}};
  assert.deepEqual(storageSummary(m),{usage:{normal:100,hazard:3},capacity:{normal:2000,hazard:100}});
  delete m.homeworld;m.goods.ore.cap=200;m.goods.chemicals.cap=20;
  assert.deepEqual(storageSummary(m).capacity,{normal:200,hazard:20});
  assert.equal(storageSummary(null),null);
});

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
