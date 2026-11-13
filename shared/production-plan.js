import {GOODS,RECIPES} from './goods.js';
import {availableHomeStock,industrySpec,HOMEWORLD} from './homeworld.js';
/** A sequential material plan; each shared unit can be spent at most once. */
export function productionPlan(market,good,amount,knownRecipes=Object.keys(RECIPES)) {
 const h=market.homeworld,stock=Object.fromEntries(Object.keys(GOODS).map(g=>[g,availableHomeStock(market,g)])),raw={},steps=[],builds=new Map(),known=new Set(knownRecipes),cycles={};
 function visit(g,n,path=[]){
  const take=Math.min(stock[g]||0,n);stock[g]=(stock[g]||0)-take;n-=take;if(n<=1e-7)return;
  const entry=Object.entries(RECIPES).find(([id,r])=>known.has(id)&&r.out[g]);
  if(!entry||path.includes(g)){raw[g]=(raw[g]||0)+n;return;}
  const [id,r]=entry,count=Math.ceil(n/r.out[g]);cycles[id]=(cycles[id]||0)+count;
  const original=h?.facilities?.[id],built=h?.structures?.find(b=>b.recipe===id&&b.status==='ready'),building=original?.status==='ready'?original:built;
  const speed=building&&building===original&&!original.restored?HOMEWORLD.industry.repairedSpeed:1;
  if(!building&&!builds.has(id))builds.set(id,{id,...industrySpec(id),repair:!!original});
  for(const [input,need] of Object.entries(r.in))visit(input,need*count,[...path,g]);
  for(const [output,yieldN] of Object.entries(r.out))stock[output]=(stock[output]||0)+yieldN*count;
  stock[g]-=n;steps.push({recipe:id,cycles:count,seconds:r.time*count/speed,ready:!!building,reason:building?.enabled===false?'Anlage pausiert':h?.allocations?.find(a=>a.id===(building?.id||id))?.reason||null});
 }
 if(!GOODS[good]||!Number.isInteger(amount)||amount<1||amount>100000)return {error:'Gültige Ware und Menge 1–100.000 auswählen.'};
 visit(good,amount);
 return {good,amount,raw,steps,builds:[...builds.values()],seconds:steps.reduce((n,s)=>n+s.seconds,0),
  constructionGoods:[...builds.values()].reduce((tot,b)=>{for(const [g,n] of Object.entries(b.repair?HOMEWORLD.industry.repair.goods:b.goods||{}))tot[g]=(tot[g]||0)+n;return tot;},{}),
  credits:[...builds.values()].reduce((n,b)=>n+(b.repair?HOMEWORLD.industry.repair.credits:b.credits||0),0)};
}
export function constructionImpact(home,spec){
 const energy=home.energy||{},work=home.workforce?.free||{};
 return {power:spec.power||0,generation:spec.generation||0,freePower:(energy.generation??home.power??0)-(energy.used||0)+(spec.generation||0)-(spec.power||0),workers:spec.workers||{},short:Object.entries(spec.workers||{}).filter(([q,n])=>n>(work[q]||0)).map(([q])=>q)};
}
