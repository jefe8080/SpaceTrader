import './prd17.js';
import {enterPlanet,leavePlanet} from '/js/ui/planetPanel.js';
const {home,h,ship}=window.prd17;
h.plots=48;h.storage=20000;h.power=3000;h.energy={used:1000,generation:3000};
for(let i=3;i<48;i++){
 const kind=i%3===0?'housing':i%3===1?'solar':'plant',recipe=kind==='plant'?'smelter':undefined;
 const b={id:'qa26-'+i,kind,recipe,status:'ready',plot:i,enabled:true,priority:50,level:1};h.structures.push(b);h.allocations.push({id:b.id,state:'active',power:4,workers:{basic:6}});
}
for(const slot of Object.values(home.market.goods))slot.stock=100;
ship.dockedAt=home.id;leavePlanet();enterPlanet(home.id);
const label=document.createElement('output');label.id='qa26City';label.textContent='QA: 48 bebaute Plätze plus ursprüngliche Anlagen und Orbitalring';label.style='position:fixed;bottom:50px;left:8px;z-index:150;background:#13232e;padding:6px;color:#fff';document.body.append(label);
