import {test} from 'node:test';import assert from 'node:assert/strict';
import {planCity,pickCity} from '../client/js/planetCityLayout.js';
import {fitCityFocus,fitCityOverview} from '../client/js/planetCityCamera2D.js';
test('48 ruin parcels retain unique selection under zoom and all responsive sizes, waterworks has headroom',()=>{
 const plots=Array.from({length:48},(_,i)=>({key:'p'+i,kind:'plot',plotIndex:i}));
 const plan=planCity({type:'ruins'},[...plots,{key:'water',kind:'produce',homeFacility:'waterworks'}]);
 assert.equal(plan.landscape.y,-128);assert.equal(plan.landscape.height,1152);
 for(const [width,height] of [[1600,1000],[390,844],[844,390]]){
  const area={x:12,y:100,width:width-24,height:height-124},overview=fitCityOverview(plan.bounds,plan.landscape,{width,height},area);
  for(const r of plan.records){
   const pose=fitCityFocus(r,plan.landscape,{width,height},area,overview.zoom);
   for(const zoom of [pose.zoom,pose.zoom*2]){
    const sx=area.x+area.width/2+(r.x-pose.x)*zoom,sy=area.y+area.height/2+(r.y-r.h/2-pose.y)*zoom;
    const x=(sx-area.x-area.width/2)/zoom+pose.x,y=(sy-area.y-area.height/2)/zoom+pose.y;
    assert.equal(pickCity(plan.records,x,y),r.key);
   }
  }
 }
 const water=plan.records.find(r=>r.key==='water');assert.ok(water.box.y-plan.landscape.y>128);
});
