import {GOODS,BELT_TYPES,canBuyFrom,canSellTo,freeFor,shipStats} from './config.js';
/** Hard hull/location incompatibilities versus reversible market risks. */
export function routePreflight(route,ships,entities,credits=Infinity){
 const errors=[],warnings=[];if(!route.stops?.length)errors.push('Mindestens einen Halt wählen.');
 if(!ships.length)warnings.push('Keine Schiffe zugewiesen; die Vorlage fährt noch nicht.');
 if(credits<=(route.minBalance||0))warnings.push('Kontostand liegt am oder unter dem Mindestkonto; Einkäufe können warten.');
 for(const [index,stop] of (route.stops||[]).entries()){
  const e=entities.get(stop.targetId);if(!e){errors.push(`Halt ${index+1}: unbekanntes Ziel.`);continue;}
  if(!stop.actions?.length)warnings.push(`${e.name}: keine Aktion vorgesehen.`);
  for(const a of stop.actions||[]){
   const g=a.good||(a.op==='mine'?BELT_TYPES[e.type]?.good:null),slot=e.market?.goods[g];
   if(['buy','sell'].includes(a.op)&&(!slot||!(a.op==='buy'?canBuyFrom(slot):canSellTo(slot))))errors.push(`${e.name}: ${GOODS[g]?.name||g} kann hier nicht ${a.op==='buy'?'gekauft':'verkauft'} werden.`);
   if(a.op==='buy'&&slot?.stock<1)warnings.push(`${e.name}: ${GOODS[g].name} momentan nicht verfügbar.`);
   if(a.op==='sell'&&slot&&slot.cap-slot.stock<1)warnings.push(`${e.name}: aktuell kein Zielplatz für ${GOODS[g].name}.`);
   for(const s of ships){
    if(g&&['buy','sell','mine'].includes(a.op)&&freeFor({...s,cargo:{},moduleCargo:{}},g)<1)errors.push(`${s.name}: kein geeigneter Laderaum für ${GOODS[g]?.name||g}.`);
    if(a.op==='mine'&&!(shipStats(s).mining[GOODS[g]?.mine||'std']>0))errors.push(`${s.name}: passendes Abbaugerät fehlt.`);
   }
  }
 }
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
export function deliveryHealth(records=[],time,started=0,good){
 const all=records.filter(r=>!good||r.good===good),recent=all.filter(r=>r.time>time-3600),seconds=Math.min(3600,Math.max(1,time-started));
 return {last:all.length?Math.max(...all.map(r=>r.time)):null,units:recent.reduce((n,r)=>n+r.units,0),perHour:recent.reduce((n,r)=>n+r.units,0)*3600/seconds};
}
export function recordDelivery(holder,time,good,units,target){
 if(!(units>0))return;holder.deliveries||=[];const last=holder.deliveries.at(-1);
 if(last&&last.good===good&&last.target===target&&Math.floor(last.time/60)===Math.floor(time/60)){last.units+=units;last.time=time;}
 else holder.deliveries.push({time,good,units,target});
 if(holder.deliveries.length>1000)holder.deliveries.splice(0,holder.deliveries.length-1000);
}
