
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planBuildingPlacements } from './placement.js';
const read = relative => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
const specs = read('./specs.json');
const manifest = read('../manifest.json');
const planets = read('./manifest.json');
const lookMap = {
  farm: ['grain','biomass','food','fertilizer','textiles','preserves'],
  drill: ['crude','gas','helium3','shipfuel','fuel','chemicals','acid'],
  silo: ['water','ice','coolant'],
  mine: ['ore','crystals','rareearth','silicate','sulfur','raremetals','ingots','cutters'],
  tower: ['tourists','workers']
};
const lookOf = good => Object.keys(lookMap).find(k => lookMap[k].includes(good)) ?? 'hall';
const combinations = [];
const fun = ['tavern','casino','fair','racetrack','mine'];
for (let a=0;a<fun.length;a++) for(let b=a+1;b<fun.length;b++)
  for(let c=b+1;c<fun.length;c++) combinations.push([fun[a],fun[b],fun[c]]);
function fixtures(spec, attractions, mixedPlots=false) {
  const items = [{kind:'questhouse'},
    ...spec.produce.map(good=>({kind:'produce',good,look:lookOf(good)})),
    ...spec.consume.map(good=>({kind:'consume',good,look:'store'})),
    ...attractions.map(building=>({kind:'fun',building})),
    ...['smuggler','school','beggar','dog'].map(kind=>({kind}))];
  let index=0;
  for (const [cat,count] of Object.entries(spec.factory_categories))
    for(let i=0;i<count;i++) items.push(mixedPlots && i%2
      ? {kind:'plot',cat}
      : {kind:'factory',recipe:cat+'_fixture_'+i,index:index++});
  return items;
}
const options = {planetId:'test-planet',recipeCategory:recipe=>recipe.split('_')[0]};
for (const [type,spec] of Object.entries(specs)) {
  const descriptor = planets.assets.find(a=>a.planet_type===type);
  const layout = read('./'+descriptor.layout);
  test(type+': maximum facilities fit; no duplicate slots; categories and dimensions',()=>{
    assert.equal(layout.slots.length,29);
    const pads=layout.slots.filter(s=>s.role==='factory');
    for(const [cat,n] of Object.entries(spec.factory_categories))
      assert.equal(pads.filter(s=>s.category===cat).length,n);
    for(const combo of combinations) for(const mixed of [false,true]) {
      const items=fixtures(spec,combo,mixed);
      const result=planBuildingPlacements(items,layout,manifest,options);
      assert.equal(result.placements.length,items.length);
      assert.equal(new Set(result.placements.map(p=>p.slotId)).size,items.length);
      for(const p of result.placements) {
        const meta=read('../'+p.asset+'/asset.json');
        const slot=layout.slots.find(s=>s.id===p.slotId);
        assert(meta.dimensions_m[0]<=slot.footprint[0]);
        assert(meta.dimensions_m[1]<=slot.footprint[1]);
        assert(meta.dimensions_m[2]<=slot.clearance_height);
        if(p.item.kind==='factory') assert.equal(slot.category,options.recipeCategory(p.item.recipe));
        if(p.item.kind==='plot') assert.equal(slot.category,p.item.cat);
        if(p.asset==='racetrack') assert.equal(slot.role,'large');
        if(p.asset==='questhouse') assert.equal(slot.id,'slot_01');
      }
    }
  });
  test(type+': deterministic and existing buildings keep position after additions/removals',()=>{
    const items=fixtures(spec,['tavern','casino','racetrack']);
    const before=planBuildingPlacements(items,layout,manifest,options);
    assert.deepEqual(before,planBuildingPlacements(items,layout,manifest,options));
    const added=[...items,{kind:'consume',look:'store',good:'extra-test-good'}];
    const after=planBuildingPlacements(added,layout,manifest,{...options,previous:before.assignments});
    for(const [key,slot] of Object.entries(before.assignments)) assert.equal(after.assignments[key],slot);
    const removed=items.filter(i=>i.kind!=='school');
    const next=planBuildingPlacements(removed,layout,manifest,{...options,previous:after.assignments});
    for(const [key,slot] of Object.entries(next.assignments)) assert.equal(before.assignments[key],slot);
  });
  test(type+': elevated footprints are separated and fronts visible in overview',()=>{
    const heights=layout.slots.filter(s=>s.role!=='prop').map(s=>s.position[1]);
    assert.ok(Math.max(...heights)-Math.min(...heights)>2, 'building terraces have real elevation');
    assert.ok(layout.layout_id.startsWith('landscape_v2_'));
    for(let i=0;i<layout.slots.length;i++) {
      const a=layout.slots[i];
      for(const b of layout.slots.slice(i+1)) {
        const overlapX=Math.abs(a.position[0]-b.position[0])<(a.footprint[0]+b.footprint[0])/2;
        const overlapZ=Math.abs(a.position[2]-b.position[2])<(a.footprint[1]+b.footprint[1])/2;
        assert(!(overlapX&&overlapZ),a.id+' / '+b.id);
      }
      if(a.role==='prop')continue;
      assert.ok(Math.cos(a.rotation_y)>.9, 'front +Z remains visible');
      assert.ok(a.position[1]>.5, 'anchor follows raised terrain');
    }
  });
}
test('reports overflow, duplicate identities and missing assets',()=>{
  const layout=read('./'+planets.assets.find(a=>a.planet_type==='agrar').layout);
  assert.throws(()=>planBuildingPlacements(Array.from({length:30},(_,i)=>({kind:'consume',good:'g'+i,look:'store'})),layout,manifest),/No free/);
  assert.throws(()=>planBuildingPlacements([{kind:'questhouse'},{kind:'questhouse'}],layout,manifest),/Duplicate/);
  assert.throws(()=>planBuildingPlacements([{kind:'unknown'}],layout,manifest),/No model/);
});
test('factory jobs with a known category precede unrestricted factory jobs',()=>{
  const layout=read('./agrar/layout.json');
  const result=planBuildingPlacements([
    {kind:'factory',recipe:'unknown',index:0},
    {kind:'plot',cat:'chem'}
  ],layout,manifest);
  assert.equal(result.placements.find(p=>p.item.kind==='plot').slotId,
    layout.slots.find(s=>s.category==='chem').id);
});
