import {HOME_BUILDINGS,HOMEWORLD,availableHomeStock} from '../shared/homeworld.js';
import {WORLD_FOCI,specializationSpec} from '../shared/specializations.js';
import {GOODS} from '../shared/goods.js';
import {remoteManagementError} from './coverage.js';
import {initializePopulation,updatePassengerOffers} from './population.js';
import {stat} from './markets.js';
import {supplyOverview} from '../shared/supply-overview.js';

const INFRASTRUCTURE=['solar','gasGenerator','reactor','housing','school','academy'];
const freeBuilders=h=>Math.min(h.workers.basic-(h.workforce?.used?.basic||0)-(h.projects||[]).reduce((n,j)=>n+(j.kind==='training'?(j.from==='basic'?j.count:0):2),0),Math.floor(h.population*.6)-Object.values(h.workforce?.used||{}).reduce((a,b)=>a+b,0)-(h.projects||[]).reduce((n,j)=>n+(j.kind==='training'?j.count:2),0));
function initialize(e){
  initializePopulation(e);const h=e.market.economy;h.infrastructure||=[];h.projects||=[];h.nextProject||=0;h.reserves||={};
  h.baseHousing??=h.housing;
  return h;
}
export function specializationAccess(game,p,e){
  if(game.profile!=='homeworld'||e.type==='ruins'||e.kind!=='planet')return 'Spezialisierung benötigt einen gewöhnlichen Planeten.';
  if(!game.canManage(game.ownership.get(e.id),p.id))return 'Nur der Besitzer oder ein Handelsmeister darf diesen Standort ausbauen.';
  return remoteManagementError(game,p,e);
}
function charge(game,p,e,cost){
  const prop=game.ownership.get(e.id),payer=game.accountOf(prop.player),ships=game.shipsOf(p.id).filter(s=>s.dockedAt===e.id);
  if(payer.credits<cost.credits)return 'Nicht genug Credits beim Eigentümer.';
  for(const [g,n] of Object.entries(cost.goods))if((e.market.goods[g]?.stock||0)+ships.reduce((n,s)=>n+(s.cargo[g]||0),0)<n)return `Es fehlen ${GOODS[g].name}.`;
  payer.credits-=cost.credits;
  for(const [g,n] of Object.entries(cost.goods)){
    let rest=n,take=Math.min(rest,e.market.goods[g]?.stock||0);if(take)e.market.goods[g].stock-=take;rest-=take;
    for(const s of ships){take=Math.min(rest,s.cargo[g]||0);s.cargo[g]=(s.cargo[g]||0)-take;rest-=take;if(!s.cargo[g])delete s.cargo[g];}
  }
}
export function startSpecialization(game,p,e,focus){
  const error=specializationAccess(game,p,e);if(error)return error;
  if(!WORLD_FOCI[e.type]?.includes(focus))return 'Dieser Schwerpunkt passt nicht zum natürlichen Planetentyp.';
  const h=initialize(e),existing=h.specialization;
  if(h.projects.some(j=>j.kind==='specialization'))return 'Ein Schwerpunktprojekt läuft bereits.';
  const changing=existing&&existing.focus!==focus,level=changing?existing.level:(existing?.level||0)+1,spec=specializationSpec(focus,level);
  if(!spec)return 'Höchste Schwerpunktstufe erreicht.';
  const cost=changing?{credits:Math.round(specializationSpec(existing.focus,existing.level).credits*.25),goods:{},seconds:180}:spec;
  if(freeBuilders(h)<2)return 'Zwei freie Bauarbeiter erforderlich.';
  const blocked=charge(game,p,e,cost);if(blocked)return blocked;
  for(const [g,n] of Object.entries(spec.wear||{}))e.market.goods[g]||={role:'consume',rate:n/3600,stock:0,cap:n*8,mod:1};
  h.projects.push({id:`special_${++h.nextProject}`,kind:'specialization',focus,level,until:game.time+cost.seconds,bound:structuredClone(cost)});
  if(existing)existing.paused=true;
}
export function startWorldInfrastructure(game,p,e,kind){
  const error=specializationAccess(game,p,e);if(error)return error;
  if(!INFRASTRUCTURE.includes(kind))return 'Diese Infrastruktur ist hier nicht zulässig.';
  const h=initialize(e),spec=HOME_BUILDINGS[kind];
  if(h.infrastructure.length+h.projects.filter(j=>j.kind==='infrastructure').length>=48)return 'Alle 48 Infrastrukturplätze belegt.';
  if(kind==='academy'&&!h.infrastructure.some(b=>b.kind==='school'))return 'Zuerst eine Schule bauen.';
  if(spec.quest&&!p.homeQuest?.completed[spec.quest])return `Zuerst ${spec.quest} abschließen.`;
  if(freeBuilders(h)<2)return 'Zwei freie Bauarbeiter erforderlich.';
  const blocked=charge(game,p,e,spec);if(blocked)return blocked;
  for(const [g,n] of Object.entries(spec.fuelPerHour||{}))e.market.goods[g]||={role:'consume',rate:0,stock:0,cap:n*8,mod:1};
  h.projects.push({id:`infra_${++h.nextProject}`,kind:'infrastructure',building:kind,until:game.time+spec.seconds,bound:structuredClone(spec)});
}
export function startWorldTraining(game,p,e,qualification){
  const error=specializationAccess(game,p,e);if(error)return error;
  const h=initialize(e),from=qualification==='skilled'?'basic':'skilled';
  if(!h.schoolCapacity)return 'Eine aktive Schule oder Ausbildungsspezialisierung erforderlich.';
  if(qualification==='specialist'&&!h.infrastructure.some(b=>b.kind==='academy'))return 'Eine Akademie erforderlich.';
  if(h.projects.filter(j=>j.kind==='training').length>=h.schoolCapacity)return 'Alle Lerngruppen belegt.';
  const reserved=h.projects.filter(j=>j.kind==='training'&&j.from===from).reduce((n,j)=>n+j.count,0);
  if(h.workers[from]-reserved-(h.workforce?.used?.[from]||0)<10)return 'Zehn freie Kräfte der Ausgangsqualifikation erforderlich.';
  h.projects.push({id:`train_${++h.nextProject}`,kind:'training',from,to:qualification,count:10,remaining:qualification==='skilled'?120:180});
}

export function tickSpecialization(game,e,dt){
  if(e.kind!=='planet'||e.type==='ruins')return;
  const h=initialize(e),m=e.market;
  const pending=[];
  for(const j of h.projects){
    if(j.kind==='training'||j.until>game.time){pending.push(j);continue;}
    if(j.kind==='specialization')h.specialization={focus:j.focus,level:j.level};
    else if(j.kind==='infrastructure')h.infrastructure.push({id:j.id,kind:j.building});
  }
  h.projects=pending;
  h.housing=h.baseHousing;h.visitorCapacity=e.type==='resort'?50:0;h.schoolCapacity=0;h.docks=2;h.throughput=500;
  const reserved={basic:0,skilled:0,specialist:0},used={basic:0,skilled:0,specialist:0};
  for(const j of h.projects)if(j.kind==='training')reserved[j.from]+=j.count;else reserved.basic+=2;
  const allocations=[];let generation=12,power=0;
  const assign=(id,spec)=>{
    const missing=power+(spec.power||0)>generation?'Energie fehlt':Object.values(used).reduce((a,b)=>a+b,0)+Object.values(spec.workers||{}).reduce((a,b)=>a+b,0)+Object.values(reserved).reduce((a,b)=>a+b,0)>Math.floor(h.population*.6)||Object.keys(used).some(q=>h.workers[q]-reserved[q]-used[q]<(spec.workers[q]||0))?'Personal fehlt':null;
    if(missing){allocations.push({id,state:'paused',reason:missing});return false;}
    for(const q of Object.keys(used))used[q]+=spec.workers[q]||0;power+=spec.power||0;allocations.push({id,state:'active'});return true;
  };
  const consume=(goods,factor)=>{if(!Object.entries(goods).every(([g,n])=>availableHomeStock(m,g)+1e-8>=n*factor))return false;for(const [g,n] of Object.entries(goods)){m.goods[g].stock=Math.max(0,m.goods[g].stock-n*factor);stat(m,game.time,'c',g,n*factor);}return true;};
  for(const slot of Object.values(m.goods)){if(slot.specialUse){slot.rate=slot.baseRate||0;delete slot.specialUse;}}
  const operatingDemand=(goods)=>{for(const [g,n] of Object.entries(goods||{})){const slot=m.goods[g];if(slot&&slot.role!=='produce'){slot.baseRate??=slot.rate;slot.rate=(slot.specialUse?slot.rate:0)+n/3600;slot.specialUse=true;}}};
  for(const b of h.infrastructure){
    const spec=HOME_BUILDINGS[b.kind];h.housing+=spec.housing||0;
    if(!spec.generation)continue;
    operatingDemand(spec.fuelPerHour);
    if(spec.fuelPerHour&&!Object.entries(spec.fuelPerHour).every(([g,n])=>availableHomeStock(m,g)+1e-8>=n*dt/3600)){allocations.push({id:b.id,state:'paused',reason:'Generatorbrennstoff fehlt'});continue;}
    if(assign(b.id,{...spec,power:0})&&(!spec.fuelPerHour||consume(spec.fuelPerHour,dt/3600)))generation+=spec.generation;
  }
  for(const b of h.infrastructure){const spec=HOME_BUILDINGS[b.kind];if(spec.generation)continue;if(assign(b.id,spec)&&b.kind==='school')h.schoolCapacity++;}
  const s=h.specialization,spec=s&&specializationSpec(s.focus,s.level);
  if(spec){
    operatingDemand(spec.wear);
    const wear=spec.wear&&!Object.entries(spec.wear).every(([g,n])=>availableHomeStock(m,g)+1e-8>=n*dt/3600);
    s.active=!s.paused&&!wear&&assign('specialization',spec);
    s.reason=s.paused?'Schwerpunktwechsel läuft':wear?'Verschleißmaterial fehlt':s.active?null:allocations.at(-1)?.reason;
    if(s.active){
      if(spec.wear)consume(spec.wear,dt/3600);
      if(spec.housing)h.housing=Math.max(h.housing,spec.housing);
      h.visitorCapacity+=spec.visitorCapacity||0;h.schoolCapacity+=spec.schoolCapacity||0;
      h.docks+=spec.docks||0;h.throughput+=spec.throughput||0;
    }
  }
  for(const [g,slot] of Object.entries(m.goods))if(slot.role==='produce'){slot.baseRate??=slot.rate;slot.rate=slot.baseRate*(s?.active&&s.focus===g?spec.factor||1:1);}
  let groups=h.schoolCapacity;
  for(const j of h.projects.filter(j=>j.kind==='training')){
    if(!groups||(h.supplyFactor||0)<1){j.reason='Schulbetrieb oder Grundversorgung fehlt';continue;}
    groups--;
    delete j.reason;j.remaining-=dt;
    if(j.remaining<=0){h.workers[j.from]-=j.count;h.workers[j.to]+=j.count;}
  }
  h.projects=h.projects.filter(j=>j.kind!=='training'||j.remaining>0);
  h.workforce={used,reserved};h.energy={used:power,generation};h.allocations=allocations;
  h.supplyOverview=supplyOverview(h.population,h.workers,[...h.infrastructure.map(b=>HOME_BUILDINGS[b.kind]),...(spec&&!s.paused?[spec]:[])],reserved,generation);
  h.employmentFactor=.5+.5*Math.min(1,Object.values(used).reduce((a,b)=>a+b,0)/Math.max(1,Math.floor(h.population*.6)));
  if((h.supplyFactor||0)>=1){h.growthProgress+=Math.min(h.population*.02,s?.active&&spec.growthCap||100)*dt/3600;const n=Math.min(Math.floor(h.growthProgress),Math.max(0,h.housing-h.population));h.population+=n;h.growthProgress-=n;h.workers.basic+=Math.min(n,Math.max(0,Math.floor(h.population*.6)-Object.values(h.workers).reduce((a,b)=>a+b,0)));}
  updatePassengerOffers(e);
}
