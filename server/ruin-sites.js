// A vacant site reuses a planet already placed by the deterministic sector
// generator. Discovery/founding never creates a new planet or resource package.
export function seedRuinSite(sector,entities){
  if(sector.q===0&&sector.r===0)return;
  const candidates=entities.filter(e=>e.kind==='planet'&&!e.noBuy&&!e.faction&&sector.systems.some(s=>s.id===e.system&&!s.start&&!s.faction));
  const e=candidates.at(-1);if(!e)return;
  e.originalType=e.type;e.type='ruins';e.name=`Unbewohnte Ruinen – ${e.name}`;e.radius=100;e.noBuy=true;e.ruinsSite=true;e.market=null;
}

export function moveWorldEntity(world,e,target){
  for(const [key,ids] of world.cellIndex){const filtered=ids.filter(id=>id!==e.id);if(filtered.length)world.cellIndex.set(key,filtered);else world.cellIndex.delete(key);}
  world.bySector.get(e.sector)?.delete(e.id);world.entities.delete(e.id);
  Object.assign(e,{x:target.x,y:target.y,sector:target.sector,system:target.system});world.addEntity(e);
}
export function removeWorldEntity(world,e){
  for(const [key,ids] of world.cellIndex){const filtered=ids.filter(id=>id!==e.id);if(filtered.length)world.cellIndex.set(key,filtered);else world.cellIndex.delete(key);}
  world.bySector.get(e.sector)?.delete(e.id);world.entities.delete(e.id);
}
