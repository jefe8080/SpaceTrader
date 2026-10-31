/** Allocate game identities only to authored buildings and dry courtyards in a city painting. */
export const PAINTED_LANDSCAPE={x:0,y:0,width:1536,height:1024};
export const paintedSite=(id,x,y,w=110,h=85,painted=true)=>({id,x,y,w,h,painted});
const itemSiteKey=item=>item.homeFacility?'home:'+item.homeFacility:item.homeOrbital?'home:orbital':item.good?item.kind+':'+item.good:item.kind==='fun'?'fun:'+item.building:item.kind;

export function planPaintedCity(entity,items,descriptor,previous=new Map(),recipeCategory=()=>null){
  const all=[...Object.values(descriptor.landmarks),...descriptor.workshops,...descriptor.services,...(descriptor.homePlots||[])];
  const sites=new Map(all.map(s=>[s.id,s])),assignments=new Map(),used=new Set(),factorySites=new Map(),counts={};
  for(const item of items.filter(it=>it.kind==='factory'&&!it.homeFacility&&!it.homeOrbital&&!it.homeStructure).sort((a,b)=>(a.index??0)-(b.index??0))){
    const cat=item.cat||recipeCategory(item.recipe)||descriptor.categories?.[0]||'bio',index=counts[cat]||0;counts[cat]=index+1;
    const s=sites.get('works-'+cat+'-'+index);if(s)factorySites.set(item.key,s);
  }
  for(const item of items){
    let s=descriptor.landmarks[itemSiteKey(item)]||factorySites.get(item.key);
    if(entity.type==='ruins'&&item.plotIndex!==undefined)s=descriptor.homePlots?.[item.plotIndex];
    else if(item.kind==='plot')s=sites.get('works-'+(item.cat||'bio')+'-'+(item.plotIndex??0));
    if(s&&!used.has(s.id)){assignments.set(item.key,s.id);used.add(s.id);}
  }
  for(const item of items){
    if(assignments.has(item.key))continue;
    const s=sites.get(previous.get(item.key));if(s&&!used.has(s.id)){assignments.set(item.key,s.id);used.add(s.id);}
  }
  for(const item of [...items].sort((a,b)=>a.key.localeCompare(b.key))){
    if(assignments.has(item.key))continue;
    const s=descriptor.services.find(s=>!used.has(s.id));
    if(!s)throw new Error('Kein gestalteter Standort für '+entity.type+' / '+item.key);
    assignments.set(item.key,s.id);used.add(s.id);
  }
  const records=items.map(item=>{
    const s=sites.get(assignments.get(item.key)),character=item.kind==='beggar'||item.kind==='dog';
    const box={x:s.x-s.w/2,y:s.y-s.h,width:s.w,height:s.h};
    const polygon=item.kind==='plot'?[{x:s.x,y:s.y-s.h},{x:s.x+s.w/2,y:s.y-s.h/2},{x:s.x,y:s.y},{x:s.x-s.w/2,y:s.y-s.h/2}]:character?null:[{x:box.x+s.w*.18,y:box.y},{x:box.x+s.w*.83,y:box.y},{x:box.x+s.w,y:box.y+s.h*.23},
      {x:box.x+s.w,y:s.y-s.h*.12},{x:box.x+s.w*.78,y:s.y},{x:box.x+s.w*.12,y:s.y},{x:box.x,y:s.y-s.h*.2},{x:box.x,y:box.y+s.h*.25}];
    return {...s,key:item.key,item,character,box,polygon,authored:true};
  });
  return {type:entity.type,authored:true,records,assignments,roads:[],landscape:descriptor.landscape||PAINTED_LANDSCAPE,
    bounds:descriptor.bounds||{x:25,y:25,width:1486,height:974},plaza:descriptor.plaza};
}
