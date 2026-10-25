import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CITY_TYPES, planCity, pickCity, storageFamily, citySprite, cityDevelopment} from '../client/js/planetCityLayout.js';
import {PLANET_TYPES, GOODS, RECIPES, ENTERTAINMENT,recipeCat,extraOptions,factorySlots,RECIPE_CATS,PLANET_EXTRAS} from '../shared/config.js';

function itemsFor(type) {
  const t=PLANET_TYPES[type];
  return [{key:'questhouse',kind:'questhouse'},
    ...Object.keys(t.produce).map(good=>({key:'produce:'+good,kind:'produce',good})),
    ...Object.keys(t.consume).map(good=>({key:'consume:'+good,kind:'consume',good})),
    ...['dog','beggar','school','smuggler'].map(kind=>({key:kind,kind})),
    ...Object.keys(ENTERTAINMENT).map(building=>({key:'fun:'+building,kind:'fun',building})),
    ...Object.entries(factorySlots(type)).flatMap(([cat,count])=>Array.from({length:count},()=>RECIPE_CATS[cat].recipes[0])).map((recipe,index)=>({key:'factory:'+index,kind:'factory',recipe,index})),
    ...Array.from({length:type==='ruins'?8:0},(_,i)=>({key:'plot:'+i,kind:'plot'}))];
}
test('city plans preserve all objects and provide unique unobscured clickable places for all 13 worlds',()=>{
  assert.equal(Object.keys(CITY_TYPES).length,13);
  const layouts=new Set();
  for(const type of Object.keys(CITY_TYPES)) {
    const items=itemsFor(type),entity={id:'test',type},plan=planCity(entity,items,undefined,recipeCat);
    assert.equal(plan.records.length,items.length,type);
    assert.equal(new Set(plan.records.map(r=>r.key)).size,items.length);
    assert.equal(plan.roads.length,type==='ruins'?items.length-2:0);
    layouts.add(JSON.stringify(plan.records.map(r=>[r.x,r.y])));
    for(const r of plan.records) {
      assert.equal(pickCity(plan.records,r.x,r.y-r.h/2),r.key,type+' '+r.key);
      assert.equal(citySprite(entity,r.item,GOODS)===null,r.item.kind==='plot');
      const limit=plan.landscape||plan.bounds;
      assert.ok(r.box.x>=limit.x&&r.y<=limit.y+limit.height,`${type}: ${r.key} outside artwork`);
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
test('all painted inhabited cities retain every service at maximum legal goods and category capacity',()=>{
  const failures=[];
  for(const type of Object.keys(CITY_TYPES).filter(type=>type!=='ruins')){
    const entity={type},items=itemsFor(type);
    for(const good of extraOptions(entity).slice(0,7))items.push({key:'produce:'+good,kind:'produce',good});
    for(const [i,good] of PLANET_EXTRAS[type].entries()){const kind=i===1?'consume':'produce';items.push({key:kind+':'+good,kind,good});}
    const unique=[...new Map(items.map(it=>[it.key,it])).values()],plan=planCity(entity,unique,undefined,recipeCat);
    assert.equal(plan.records.length,unique.length);assert.equal(plan.authored,true);assert.equal(plan.roads.length,0);
    for(const r of plan.records)if(pickCity(plan.records,r.x,r.y-r.h/2)!==r.key)failures.push(type+' '+r.key+' @ '+r.id);
    const next=planCity(entity,[...unique].reverse(),plan.assignments,recipeCat);
    assert.deepEqual([...plan.assignments].sort(),[...next.assignments].sort());
    const base=items.filter(it=>it.kind!=='factory'&&it.kind!=='plot'),plots=Object.entries(factorySlots(type)).flatMap(([cat,n])=>Array.from({length:n},(_,plotIndex)=>({key:`plot:${cat}:${plotIndex}`,kind:'plot',cat,plotIndex})));
    const first=planCity(entity,[...base,...plots],undefined,recipeCat);
    const full=planCity(entity,items,first.assignments,recipeCat);
    for(const r of full.records.filter(r=>r.item.kind==='factory'))assert.ok(first.records.some(p=>p.item.kind==='plot'&&p.id===r.id),type+' factory must occupy its former courtyard');
  }
  assert.deepEqual(failures,[]);
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
