import {HOMEWORLD} from './homeworld.js';
export function populationLimits(h){
 const freeHousing=Math.max(0,(h.housing||0)-(h.population||0)),work=h.workforce;
 return {freeHousing,workforceLimit:Math.floor((h.population||0)*HOMEWORLD.population.workforceShare),freeWorkplaces:work?.freeSlots??null,
  blockers:[...(!freeHousing?['Wohnraum vollständig belegt']:[]),...((h.supply?.basic??0)<1?['Grundversorgung nicht vollständig']:[])],
  training:(h.projects||[]).filter(p=>p.kind==='training').reduce((n,p)=>n+(p.count||0),0)};
}
export function knownSiteResources(site,entities){return ['ice','grain','ore','crude','gas','helium3'].map(g=>{
 const sources=[...entities.values()].filter(e=>e.id!==site.id&&e.market?.goods[g]?.role==='produce');sources.sort((a,b)=>Math.hypot(a.x-site.x,a.y-site.y)-Math.hypot(b.x-site.x,b.y-site.y));
 return {good:g,source:sources[0]?.id,distance:sources[0]?Math.hypot(sources[0].x-site.x,sources[0].y-site.y):null};
});}
