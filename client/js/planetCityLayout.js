import {planAgrarCity} from './planetAgrarLayout.js';
/** Pure visual planning. Keys and economic state belong to buildItems, never to the renderer. */
export const CITY_TYPES = {
  agrar: { name:'Agrarwelt', ground:'#8c9670', road:'#c5b08a', trim:'#849965', shape:0, terrain:0 },
  ocean: { name:'Ozeanwelt', ground:'#447f88', road:'#bdb798', trim:'#6ea8a0', shape:1, terrain:1 },
  desert: { name:'Wüstenwelt', ground:'#c7a073', road:'#e0c599', trim:'#a98453', shape:2, terrain:2 },
  mining: { name:'Bergbauwelt', ground:'#777671', road:'#aaa08b', trim:'#6b7778', shape:3, terrain:3 },
  ice: { name:'Eiswelt', ground:'#bed2d5', road:'#95afb2', trim:'#eff4e9', shape:4, terrain:4 },
  urban: { name:'Stadtwelt', ground:'#697b79', road:'#b1ac99', trim:'#79938c', shape:5, terrain:5 },
  resort: { name:'Ferienwelt', ground:'#b3b78b', road:'#e0c99f', trim:'#7fa3a0', shape:6, terrain:6 },
  gasgiant: { name:'Gasriese', ground:'#9c8882', road:'#a9b3b1', trim:'#d9b48a', shape:7, terrain:7 },
  jungle: { name:'Dschungelwelt', ground:'#526f51', road:'#aaa17c', trim:'#719866', shape:8, terrain:8 },
  volcanic: { name:'Vulkanwelt', ground:'#655e5b', road:'#9c9185', trim:'#c77d48', shape:9, terrain:9 },
  colony: { name:'Koloniewelt', ground:'#8c9b83', road:'#c7b999', trim:'#93ac8c', shape:10, terrain:10 },
  industrial: { name:'Industriewelt', ground:'#79827b', road:'#aaa893', trim:'#7d9992', shape:11, terrain:11 },
  ruins: { name:'Ruinenwelt', ground:'#89917a', road:'#b5aa89', trim:'#7d946c', shape:12, terrain:12 },
};
const includes = (good, list) => list.split(' ').includes(good);
export function storageFamily(good, goods = {}) {
  if (goods[good]?.cls === 'passenger') return 'passenger';
  if (goods[good]?.cls === 'hazard') return 'hazard';
  if (includes(good,'water crude gas helium3 shipfuel fuel hydraulicoil coolant nebulagas refinednebulagas')) return 'tank';
  if (includes(good,'grain biomass')) return 'silo';
  if (good === 'fertilizer') return 'fertilizer';
  if (includes(good,'ice food medicine medtech')) return 'cold';
  if (includes(good,'ore crystals rareearth silicate sulfur gold diamond exocrystals')) return 'bulk';
  if (includes(good,'machinery robots engines shipparts hullparts habitats gears cutters')) return 'machine';
  if (includes(good,'electronics chips computers aicores optics sensors refinedexocrystals cutdiamonds')) return 'tech';
  return 'freight';
}
const FAMILY_CELL = {tank:0,silo:1,cold:2,bulk:3,machine:4,hazard:5,freight:6,passenger:7,tech:8,fertilizer:9};
export function cityDevelopment(entity, item) {
  const home = entity.market?.homeworld;
  if (!home) return 'ready';
  if (item.homeOrbital) return home.orbital?.large ? 'orbital-large' : home.orbital?.small ? 'orbital-small' : home.orbital?.project ? 'building' : 'ruined';
  return (item.homeFacility ? home.facilities?.[item.homeFacility] : home.structures?.find(s=>s.id===item.homeStructure))?.status || 'ready';
}
export function citySprite(entity, item, goods = {}) {
  const development = cityDevelopment(entity,item);
  if (development === 'ruined') return 18;
  if (development === 'building') return 19;
  if (item.homeOrbital) return 24;
  if (item.kind === 'dog') return 23;
  if (item.kind === 'beggar') return 22;
  const structure = entity.market?.homeworld?.structures?.find(s=>s.id===item.homeStructure);
  if (structure) return ({housing:20,solar:21,school:14,researchWorkshop:8,spaceport:17,silo:1,safeStorage:5,moduleBench:16})[structure.kind] ?? 16;
  if (item.homeFacility) return ({dock:17,control:13,workshop:16,waterworks:0,foodplant:12,fueldepot:0,refinery:5,smelter:3})[item.homeFacility] ?? 16;
  if (item.kind === 'plot') return null;
  if (item.kind === 'consume') return FAMILY_CELL[storageFamily(item.good,goods)];
  if (item.kind === 'questhouse') return 13;
  if (item.kind === 'school') return 14;
  if (item.kind === 'fun') return 15;
  if (item.kind === 'smuggler') return 18;
  if (item.kind === 'factory') return 16;
  if (item.good === 'grain') return 10;
  if (item.good === 'biomass') return 11;
  if (item.good === 'food') return 12;
  return FAMILY_CELL[storageFamily(item.good,goods)];
}
export function hashCity(text) { let n=2166136261; for (const c of String(text)) n=Math.imul(n^c.charCodeAt(0),16777619); return n>>>0; }
function slotPosition(slot, type) {
  const shape = CITY_TYPES[type]?.shape || 0;
  const col = slot % 6, row = Math.floor(slot / 6);
  let x = (col-2.5)*210, y = (row-1)*190;
  // The same district grid is connected by distinct boulevard, terrace, harbour and staggered plans.
  if ([0,6,8,12].includes(shape)) x += row%2 ? 48 : -32;
  if ([1,7].includes(shape)) { x += row%2 ? 70 : 0; y += col%2*24; }
  if ([2,4,10].includes(shape)) { x += (row-2)*34; y += Math.abs(col-2.5)*16; }
  if ([3,9].includes(shape)) { x += row%2*65; y += col*12; }
  if ([5,11].includes(shape)) y += col%3*13;
  return {x,y};
}
export function planCity(entity, items, previous = new Map(), recipeCategory) {
  if(entity.type==='agrar')return planAgrarCity(entity,items,previous,recipeCategory);
  const type=entity.type, positions=new Map(), used=new Set();
  const ordinary=items.filter(it=>!['questhouse','beggar','dog'].includes(it.kind));
  // Preserve occupied lots on updates, including factories added after the initial load.
  for (const item of ordinary) {
    const old=previous.get(item.key);
    if (old !== undefined && !used.has(old)) { positions.set(item.key,old); used.add(old); }
  }
  const ordered=[...ordinary].sort((a,b)=>a.key.localeCompare(b.key));
  for (const item of ordered) {
    if (positions.has(item.key)) continue;
    const start=item.kind==='consume'?3:item.kind==='produce'?0:item.kind==='factory'||item.kind==='plot'?18:12;
    let slot=start;
    // Reserve two blocks on either side of the central civic plaza.
    while (used.has(slot) || slot===8 || slot===9 || slot===14 || slot===15) slot++;
    positions.set(item.key,slot); used.add(slot);
  }
  const records=items.map(item=>{
    const character=item.kind==='dog'||item.kind==='beggar';
    const p=item.kind==='questhouse'?{x:0,y:75}:character?{x:item.kind==='dog'?60:-52,y:185}:slotPosition(positions.get(item.key),type);
    const w=character?46:item.kind==='questhouse'?190:180,h=character?55:135;
    return {key:item.key,item,...p,w,h,character,box:{x:p.x-w/2,y:p.y-h,width:w,height:h}};
  });
  const minX=Math.min(-720,...records.map(r=>r.box.x))-60, minY=Math.min(-460,...records.map(r=>r.box.y))-60;
  const maxX=Math.max(720,...records.map(r=>r.box.x+r.w))+60,maxY=Math.max(620,...records.map(r=>r.y))+90;
  const plaza={x:0,y:175};
  const roads=records.filter(r=>!r.character).map(r=>({key:r.key,points:[{x:r.x,y:r.y+8},{x:r.x,y:r.y+22},{x:plaza.x,y:r.y+22},plaza]}));
  return {type,records,assignments:positions,roads,plaza,bounds:{x:minX,y:minY,width:maxX-minX,height:maxY-minY}};
}
/** World coordinates; reverse order agrees with the painter's rendering order. */
export function pickCity(records,x,y) {
  const ordered=[...records].sort((a,b)=>a.y-b.y);
  for (let i=ordered.length-1;i>=0;i--) {
    const r=ordered[i], b=r.box;
    if(x<b.x||x>b.x+b.width||y<b.y||y>b.y+b.height)continue;
    if(r.polygon&&!insideCityPolygon(r.polygon,x,y))continue;
    return r.key;
  }
  return null;
}
function insideCityPolygon(points,x,y){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}
