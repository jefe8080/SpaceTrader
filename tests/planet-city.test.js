import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CITY_TYPES, planCity, pickCity, storageFamily, citySprite, cityDevelopment} from '../client/js/planetCityLayout.js';
import {PLANET_TYPES, GOODS, RECIPES, ENTERTAINMENT,recipeCat,extraOptions} from '../shared/config.js';

function itemsFor(type) {
  const t=PLANET_TYPES[type];
  return [{key:'questhouse',kind:'questhouse'},
    ...Object.keys(t.produce).map(good=>({key:'produce:'+good,kind:'produce',good})),
    ...Object.keys(t.consume).map(good=>({key:'consume:'+good,kind:'consume',good})),
    ...['dog','beggar','school','smuggler'].map(kind=>({key:kind,kind})),
    ...Object.keys(ENTERTAINMENT).map(building=>({key:'fun:'+building,kind:'fun',building})),
    ...(type==='agrar'?['waterworks','foodplant','weavery','refinery']:Object.keys(RECIPES).slice(0,8)).map((recipe,index)=>({key:'factory:'+index,kind:'factory',recipe,index})),
    ...Array.from({length:type==='agrar'?0:8},(_,i)=>({key:'plot:'+i,kind:'plot'}))];
}
test('city plans preserve all objects and provide unique unobscured clickable places for all 13 worlds',()=>{
  assert.equal(Object.keys(CITY_TYPES).length,13);
  const layouts=new Set();
  for(const type of Object.keys(CITY_TYPES)) {
    const items=itemsFor(type),entity={id:'test',type},plan=planCity(entity,items,undefined,recipeCat);
    assert.equal(plan.records.length,items.length,type);
    assert.equal(new Set(plan.records.map(r=>r.key)).size,items.length);
    assert.equal(plan.roads.length,type==='agrar'?0:items.length-2);
    layouts.add(JSON.stringify(plan.records.map(r=>[r.x,r.y])));
    for(const r of plan.records) {
      assert.equal(pickCity(plan.records,r.x,r.y-r.h/2),r.key,type+' '+r.key);
      assert.equal(citySprite(entity,r.item,GOODS)===null,r.item.kind==='plot');
      assert.ok(r.box.x>=plan.bounds.x&&r.y<=plan.bounds.y+plan.bounds.height);
      for(const other of plan.authored?[]:plan.records) {
        if(r.key===other.key)continue;
        const a=r.box,b=other.box;
        assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`${type}: overlapping ${r.key}/${other.key}`);
      }
    }
    assert.equal(pickCity(plan.records,1e6,1e6),null);
  }
  assert.equal(layouts.size,13);
});
test('additional commodities and changing market order do not move existing agricultural sites',()=>{
  const entity={type:'agrar'},items=itemsFor('agrar'),first=planCity(entity,items,undefined,recipeCat);
  const changed=items.filter(it=>it.key!=='plot:0').reverse();changed.push({kind:'produce',key:'produce:preserves',good:'preserves'});
  const next=planCity(entity,changed,first.assignments,recipeCat);
  for(const r of next.records) { const old=first.records.find(o=>o.key===r.key);if(old)assert.deepEqual([r.x,r.y],[old.x,old.y]); }
  assert.equal(new Set(next.assignments.values()).size,next.assignments.size);
});
test('agricultural factories replace their exact category plot in the painted workshop quarter',()=>{
  const entity={type:'agrar'},base=itemsFor('agrar').filter(it=>it.kind!=='factory');
  const plots=[0,1,2].map(plotIndex=>({key:'plot:bio:'+plotIndex,kind:'plot',cat:'bio',plotIndex}));
  plots.push({key:'plot:chem:0',kind:'plot',cat:'chem',plotIndex:0});
  const first=planCity(entity,[...base,...plots],undefined,recipeCat);
  const built=planCity(entity,[...base,...plots.slice(1),{key:'factory:foodplant:0',kind:'factory',recipe:'foodplant',index:0}],first.assignments,recipeCat);
  const plot=first.records.find(r=>r.key==='plot:bio:0'),factory=built.records.find(r=>r.key==='factory:foodplant:0');
  assert.deepEqual([factory.id,factory.x,factory.y],[plot.id,plot.x,plot.y]);
  assert.equal(factory.painted,false);
  for(const r of built.records){const old=first.records.find(p=>p.key===r.key);if(old)assert.deepEqual([r.x,r.y],[old.x,old.y]);}
});
test('agricultural layout accommodates maximum legacy extra production plus all level goods and factory slots',()=>{
  const entity={type:'agrar'},items=itemsFor('agrar');
  for(const good of extraOptions(entity).slice(0,7))items.push({key:'produce:'+good,kind:'produce',good});
  for(const [good,kind] of [['preserves','produce'],['medicine','consume'],['textiles','produce']])items.push({key:kind+':'+good,kind,good});
  const plan=planCity(entity,items,undefined,recipeCat);
  assert.equal(plan.records.length,items.length);assert.equal(new Set(plan.assignments.values()).size,items.length);
  assert.equal(plan.roads.length,0);assert.equal(plan.authored,true);
  for(const r of plan.records)assert.equal(pickCity(plan.records,r.x,r.y-r.h/2),r.key);
});
test('warehouses cover goods and distinguish agricultural imports by silhouette',()=>{
  assert.equal(new Set(['water','fertilizer','machinery','consumer'].map(g=>storageFamily(g,GOODS))).size,4);
  assert.equal(storageFamily('workers',GOODS),'passenger');assert.equal(storageFamily('acid',GOODS),'hazard');
  for(const good of Object.keys(GOODS))assert.ok(Number.isInteger(citySprite({},{kind:'consume',good},GOODS)),good);
  assert.equal(citySprite({},{kind:'beggar'}),22);assert.equal(citySprite({},{kind:'dog'}),23);
});
test('homeworld facilities, construction, structures and orbital stages retain their visual state',()=>{
  const entity={type:'ruins',market:{homeworld:{facilities:{waterworks:{status:'ruined'}},structures:[{id:'x',kind:'solar',status:'building'}],orbital:{}}}};
  const facility={homeFacility:'waterworks'},structure={homeStructure:'x'},orbital={homeOrbital:true};
  assert.equal(citySprite(entity,facility),18);assert.equal(citySprite(entity,structure),19);assert.equal(citySprite(entity,orbital),18);
  entity.market.homeworld.facilities.waterworks.status='building';assert.equal(citySprite(entity,facility),19);
  entity.market.homeworld.facilities.waterworks.status='ready';assert.equal(citySprite(entity,facility),0);
  entity.market.homeworld.structures[0].status='ready';assert.equal(citySprite(entity,structure),21);
  entity.market.homeworld.orbital.project={};assert.equal(citySprite(entity,orbital),19);
  entity.market.homeworld.orbital.small=1;assert.equal(cityDevelopment(entity,orbital),'orbital-small');assert.equal(citySprite(entity,orbital),24);
  entity.market.homeworld.orbital.large=1;assert.equal(cityDevelopment(entity,orbital),'orbital-large');
});
