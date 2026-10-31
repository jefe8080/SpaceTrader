import {SHIP_TYPES} from './ships.js';
import {blueprint,maxHull,WEAPONS,armorFactor} from './combat.js';
export const SHIP_CATEGORIES={civil:'Zivil',multi:'Multifunktion',war:'Kriegsschiff'};
export const SHIP_RATING_LIMITS={speed:[90,150,230,300],defense:[500,1500,3500,7000],cargo:[30,160,520,1800],attack:[1,60,150,350]};
const rating=(value,key)=>1+SHIP_RATING_LIMITS[key].filter(limit=>value>=limit).length;
export function shipComparison(type){
  const d=SHIP_TYPES[type],bp=blueprint(type);
  const shield=bp.shields.reduce((n,s)=>n+s.max,0);
  const defense=maxHull(type)*bp.armor.reduce((n,a)=>n+1/armorFactor(a,0),0)/bp.armor.length+shield;
  // Theoretical sustained output, full squadron, all arcs. Ion disruption and PD
  // are described in the weapon list; their actual damage still contributes.
  const attack=bp.weapons.reduce((n,m)=>{const w=WEAPONS[m.w];return n+w.dmg*w.rof*(bp.squad?.n||1)*(w.ramp||1)*(bp.ability==='frontbeam'&&m.w==='beam'?1.3:bp.ability==='siege'&&m.w==='torpedo'?1.25:1);},0);
  return {category:bp.cls,tier:bp.tier,shield,defense,attack,ratings:{speed:rating(d.speed,'speed'),defense:rating(defense,'defense'),cargo:rating(d.cargo,'cargo'),attack:rating(attack,'attack')}};
}
export function compareShipTypes([a,da],[b,db]){
  const tiers={craft:0,S:0,M:1,L:2,XL:3};
  return tiers[blueprint(a).tier]-tiers[blueprint(b).tier]||da.price-db.price||a.localeCompare(b);
}
