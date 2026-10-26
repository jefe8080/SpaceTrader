import { GOODS, RECIPES,REFINEMENT_RECIPES } from '../shared/goods.js';
import { HOMEWORLD, HOME_BUILDINGS, INDUSTRY_GROUPS, CONTROL_MODULES, controlUpgradeCost, industryGroup, industrySpec, homeStorageUsage, homeStorageFree, availableHomeStock, homeGoodCapacity, homeGoodLimit, demolitionPreview, homeStructureSpec, storageLevel, storageUpgradeCost } from '../shared/homeworld.js';
import { coverageAreas } from './coverage.js';
import { planetAccess } from '../shared/planet-access.js';
import {tickCivilMoney} from './real-economy.js';
import {stat} from './markets.js';
import {tickModuleProjects} from './modules.js';
import {tickLogistics,productionAllowed,productionStock,consumeProductionReservation,recordProduction} from './logistics.js';
import {initializePopulation,tickVisitors} from './population.js';
import {ORBITAL_OPERATION,tickOrbital} from './orbital.js';

const QUALIFICATIONS = ['basic', 'skilled', 'specialist'];
const qualified = () => ({ basic: 0, skilled: 0, specialist: 0 });
const completed = (player, quest) => !!player?.homeQuest?.completed[quest];
const ready = (object) => object.status === 'ready';
const notify = (game, entity) => { entity.market.rev = (entity.market.rev || 0) + 1; game.emit('entity', entity); };
const shipsHere = (game, player, entity) => game.shipsOf(player.id).filter(ship => ship.dockedAt === entity.id);

export function initializeHomeOperations(home) {
  home.structures ||= [];
  for (const s of home.structures) if (['silo', 'safeStorage'].includes(s.kind)) s.level = storageLevel(s);
  home.projects ||= []; home.reserves ||= {}; home.reservations ||= {};
  home.trained ||= { skilled: 0, specialist: 0 }; home.nextProject ||= 0; home.expansions ||= 0;
  home.productionCycles ||= {}; home.growthProgress ||= 0;
}

export function homeAccess(game, player, entity) {
  if (entity.type !== 'ruins' || entity.market?.homeworld?.owner !== player.id) return 'Nur auf deiner eigenen Ruinenwelt.';
  if (!planetAccess(player,game.ships,entity,coverageAreas(game,player)).manage) return 'Keine Verbindung: Hauptschiff mit eingebautem Antrieb im eigenen Leitstellennetz oder eigenes Schiff vor Ort erforderlich.';
  if (entity.market.homeworld.warp) return 'Der Standort ist für den Warptransfer gesperrt.';
  return null;
}

export function chargeHome(game, player, entity, cost) {
  if (player.credits < cost.credits) return 'Nicht genug Credits.';
  const ships=shipsHere(game,player,entity), market=entity.market;
  for(const [good,n] of Object.entries(cost.goods)){
    const available=availableHomeStock(market,good)+ships.reduce((sum,ship)=>sum+(ship.cargo[good]||0),0);
    if(available<n)return `Es fehlen ${Math.ceil(n-available)} ${GOODS[good].name} außerhalb geschützter Reserven.`;
  }
  player.credits-=cost.credits;
  for(const [good,n] of Object.entries(cost.goods)){
    let remaining=n,stored=Math.min(remaining,availableHomeStock(market,good));
    market.goods[good].stock-=stored;remaining-=stored;
    for(const ship of ships){const take=Math.min(remaining,ship.cargo[good]||0);if(!take)continue;ship.cargo[good]-=take;remaining-=take;if(!ship.cargo[good])delete ship.cargo[good];}
  }
}
const charge=chargeHome;

export function upgradeControl(game,player,entity,module) {
  const error=homeAccess(game,player,entity);if(error)return error;
  const home=entity.market.homeworld;initializeHomeOperations(home);home.controlModules||={};
  if(home.controlLevel<1)return 'Zuerst die Leitstelle reparieren.';
  if(home.projects.some(p=>p.kind==='control'))return 'Ein Leitstellenausbau läuft bereits.';
  if(module&&module!=='capacity'&&home.controlModules[module])return 'Dieses Funktionsmodul ist bereits vorhanden.';
  let cost=module?CONTROL_MODULES[module]:controlUpgradeCost(home.controlLevel+1);
  if(!cost)return 'Diese Kosten überschreiten den sicher darstellbaren Zahlenbereich.';
  if(module==='capacity')cost={...cost,credits:Math.round(cost.credits*1.5**(home.controlModules.capacity||0))};
  if(!Number.isSafeInteger(cost.credits))return 'Diese Kosten überschreiten den sicher darstellbaren Zahlenbereich.';
  const teamError=homeConstructionError(home);if(teamError)return teamError;
  const costError=charge(game,player,entity,cost);if(costError)return costError;
  home.projects.push({id:`control_${++home.nextProject}`,kind:'control',module:module||null,level:home.controlLevel+1,until:game.time+cost.seconds,bound:{credits:cost.credits,goods:structuredClone(cost.goods)}});
  notify(game,entity);
}

function buildTeams(home) {
  return Object.values(home.facilities).filter(building=>building.status==='building').length*2
    +home.projects.filter(project=>!['training','module','study'].includes(project.kind)).length*2+(home.orbital?.project?2:0);
}

function trainingReserved(home) {
  const reserved=qualified();
  for(const project of home.projects)if(project.kind==='training')reserved[project.from]+=project.count;
  return reserved;
}

export function homeConstructionError(home) {
  initializeHomeOperations(home);
  const reserved=trainingReserved(home);
  const occupied=QUALIFICATIONS.reduce((n,q)=>n+reserved[q]+(home.workforce?.used?.[q]||0),0)+buildTeams(home)+Math.max(0,(home.workforce?.reserved?.skilled||0)-reserved.skilled);
  return home.workers.basic-reserved.basic-buildTeams(home)-(home.workforce?.used?.basic||0)<2||Math.floor(home.population*.6)-occupied<2
    ? 'Zwei freie einfache Kräfte für ein weiteres Bauteam erforderlich. Ggf. eine Anlage pausieren.' : null;
}

const structureSpec = homeStructureSpec;

export function abortHomeCycle(game,player,entity,id,confirmed) {
  const error=homeAccess(game,player,entity);if(error)return error;
  const building=entity.market.homeworld.structures?.find(s=>s.id===id&&s.kind==='plant'&&s.status==='ready');
  if(!building)return 'Eigene fertiggestellte Produktionsanlage auswählen.';
  if(!confirmed)return 'Zyklusabbruch ausdrücklich bestätigen.';
  building.progress=0;building.enabled=false;notify(game,entity);
}

export function demolishHome(game,player,entity,id,upgrade,confirmed) {
  const error=homeAccess(game,player,entity);if(error)return error;
  const preview=demolitionPreview(entity.market,id,upgrade);if(preview.error)return preview.error;
  const home=entity.market.homeworld;
  const relic=game.players.get(home.owner)?.relic;
  if(home.structures.find(s=>s.id===id)?.kind==='workshop'&&relic?.operation?.world===entity.id)return 'Zuerst die laufende Antriebsarbeit beenden.';
  if(!confirmed)return 'Abriss muss ausdrücklich bestätigt werden; keine Erstattung.';
  if(upgrade){const b=home.structures.find(s=>s.id===id);b.upgrades=b.upgrades.filter(k=>k!==upgrade);}
  else home.structures=home.structures.filter(s=>s.id!==id);
  for(const key of ['storage','hazardStorage','housing'])home[key]-=preview.losses[key];
  home.allocations=(home.allocations||[]).filter(a=>a.id!==id);
  for(const [good,slot] of Object.entries(entity.market.goods))slot.cap=GOODS[good].cls==='normal'?home.storage:GOODS[good].cls==='hazard'?home.hazardStorage:0;
  notify(game,entity);
}

export function upgradeStorage(game, player, entity, id) {
  const error = homeAccess(game, player, entity); if (error) return error;
  const home = entity.market.homeworld; initializeHomeOperations(home);
  const building = home.structures.find(s => s.id === id);
  if (!building || building.status !== 'ready') return 'Ein fertiggestelltes eigenes Lager auswählen.';
  const level = storageLevel(building) + 1, cost = storageUpgradeCost(building.kind, level);
  if (!cost) return 'Dieses Lager ist nicht weiter ausbaubar (höchstens Stufe 5).';
  if (building.upgrading || home.projects.some(p => p.target === id)) return 'Ein Ausbau läuft bereits.';
  const teamError = homeConstructionError(home); if (teamError) return teamError;
  const costError = charge(game, player, entity, cost); if (costError) return costError;
  const project = 'storage_' + ++home.nextProject; building.upgrading = project;
  home.projects.push({id:project, kind:'storageUpgrade', target:id, level, until:game.time+cost.seconds, bound:structuredClone(cost)});
  notify(game, entity);
}

export function homeBuild(game,player,entity,kind,recipe,parentId,requestedPlot) {
  const error=homeAccess(game,player,entity);if(error)return error;
  const home=entity.market.homeworld;initializeHomeOperations(home);
  let spec=HOME_BUILDINGS[kind], parent=null;
  if(kind==='plant'){
    const group=industrySpec(recipe);
    if(!group)return 'Unbekanntes Industrierezept.';
    spec={...group,name:RECIPES[recipe].name};
    if(group.facility&&!home.structures.some(s=>ready(s)&&(s.kind===group.facility||s.upgrades?.includes(group.facility))))return 'Die erforderliche Forschungsinfrastruktur fehlt.';
  }
  if(!spec)return 'Unbekanntes Bauvorhaben.';
  if(!completed(player,spec.quest))return `Zuerst ${spec.quest} abschließen.`;
  if(spec.parent){
    parent=home.structures.find(s=>s.id===parentId&&s.kind===spec.parent&&ready(s));
    if(!parent)return 'Eine betriebsbereite passende Grundanlage auswählen.';
    if(parent.upgrading||parent.upgrades?.includes(kind))return 'Diese Anlage wird bereits erweitert oder besitzt diesen Ausbau.';
  }
  if(kind==='land'){
    if(home.plots>=HOMEWORLD.start.maxPlots)return 'Alle 48 regulären Plätze sind bereits erschlossen.';
    if(home.projects.some(p=>p.kind==='land'))return 'Eine Flächenerweiterung läuft bereits.';
    spec={...spec,credits:Math.round(spec.credits*1.4**home.expansions)};
  }
  const teamError=homeConstructionError(home);if(teamError)return teamError;
  const occupied=new Set(home.structures.map(s=>s.plot).filter(p=>p!==null&&p!==undefined));
  const plot=parent||kind==='land'?null:requestedPlot??Array.from({length:home.plots},(_,i)=>i).find(i=>!occupied.has(i));
  if(plot===undefined)return 'Keine freien erschlossenen Bauplätze.';
  if(plot!==null&&(plot>=home.plots||occupied.has(plot)))return 'Dieser Bauplatz ist nicht erschlossen oder bereits belegt.';
  const costError=charge(game,player,entity,spec);if(costError)return costError;
  const id=`project_${++home.nextProject}`,until=game.time+spec.seconds;
  if(parent){parent.upgrading=id;home.projects.push({id,kind:'upgrade',target:parent.id,upgrade:kind,until,bound:{credits:spec.credits,goods:structuredClone(spec.goods)}});}
  else if(kind==='land')home.projects.push({id,kind:'land',until,bound:{credits:spec.credits,goods:structuredClone(spec.goods)}});
  else{
    const structure={id,kind,recipe:kind==='plant'?recipe:null,buildGroup:kind==='plant'?industryGroup(recipe):null,plot,status:'building',readyAt:until,enabled:true,priority:kind==='housing'&&player.homeQuest?.storyPriority==='housing'?95:50,progress:0};
    home.structures.push(structure);home.projects.push({id:'build_'+id,kind:'construction',target:id,until,bound:{credits:spec.credits,goods:structuredClone(spec.goods)}});
  }
  notify(game,entity);
}

export function changeRefinement(game,player,entity,id,recipe){
  const error=homeAccess(game,player,entity);if(error)return error;
  const home=entity.market.homeworld,building=home.structures?.find(s=>s.id===id&&s.status==='ready'&&s.kind==='plant');
  if(!building||!REFINEMENT_RECIPES.includes(building.recipe)||!REFINEMENT_RECIPES.includes(recipe))return 'Eine vorhandene Veredelungsanlage und ein Sonderveredelungsrezept auswählen.';
  const ranks=['I','II','III','IV','V'],spec=industrySpec(recipe),grade=building.buildGroup||industryGroup(building.recipe);
  if(ranks.indexOf(industryGroup(recipe))>ranks.indexOf(grade))return 'Für die höhere Baugruppe ist eine entsprechend gebaute neue Anlage erforderlich.';
  if(!completed(player,spec.quest))return `Zuerst ${spec.quest} abschließen.`;
  if(spec.facility&&!home.structures.some(s=>ready(s)&&(s.kind===spec.facility||s.upgrades?.includes(spec.facility))))return 'Die erforderliche Forschungsinfrastruktur fehlt.';
  building.buildGroup=grade;building.recipe=recipe;building.progress=0;notify(game,entity);
}

export function restoreBasicPlant(game,player,entity,facility) {
  const error=homeAccess(game,player,entity);if(error)return error;
  const home=entity.market.homeworld;initializeHomeOperations(home);
  const building=home.facilities[facility];
  if(!HOMEWORLD.start.basicPlants.includes(facility)||!ready(building))return 'Eine reparierte Grundanlage auswählen.';
  if(building.restored||building.upgrading)return 'Diese Anlage ist bereits ausgebaut oder wird erweitert.';
  const teamError=homeConstructionError(home);if(teamError)return teamError;
  const errorCost=charge(game,player,entity,HOMEWORLD.industry.restore);if(errorCost)return errorCost;
  const id=`project_${++home.nextProject}`;building.upgrading=id;
  home.projects.push({id,kind:'restore',target:facility,until:game.time+60,bound:structuredClone(HOMEWORLD.industry.restore)});
  notify(game,entity);
}

export function trainHome(game,player,entity,to) {
  const error=homeAccess(game,player,entity);if(error)return error;
  const home=entity.market.homeworld;initializeHomeOperations(home);
  const schools=home.structures.filter(s=>s.kind==='school'&&ready(s)&&s.enabled!==false&&(to!=='specialist'||s.upgrades?.includes('academy')));
  const available=schools.filter(s=>!home.projects.some(p=>p.kind==='training'&&p.school===s.id));
  if(!available.length)return 'Keine freie geeignete Schule oder Akademie.';
  const spec=HOMEWORLD.population.training[to],from=to==='skilled'?'basic':'skilled',reserved=trainingReserved(home);
  if(home.workers[from]-reserved[from]-(home.workforce?.used?.[from]||0)-(from==='basic'?buildTeams(home):0)<spec.count)return 'Nicht genügend freie Einwohner dieser Qualifikation.';
  home.projects.push({id:`training_${++home.nextProject}`,kind:'training',school:available[0].id,from,to,count:spec.count,remaining:spec.seconds});
  notify(game,entity);
}

export function setHomeLimit(game,player,entity,good,amount,all=false) {
  const error=homeAccess(game,player,entity);if(error)return error;
  const home=entity.market.homeworld;home.limits||={};
  if(!all&&amount>homeGoodCapacity(entity.market,good))return 'Lagerlimit darf die physische Lagerkapazität nicht überschreiten.';
  for(const g of all?Object.keys(entity.market.goods):[good])if(['normal','hazard'].includes(GOODS[g]?.cls))home.limits[g]=Math.min(amount,homeGoodCapacity(entity.market,g));
  notify(game,entity);
}

export function setHomeReserve(game,player,entity,good,amount) {
  const error=homeAccess(game,player,entity);if(error)return error;
  initializeHomeOperations(entity.market.homeworld);
  if(amount>homeGoodCapacity(entity.market,good))return 'Sperrmenge darf die physische Lagerkapazität nicht überschreiten.';
  entity.market.homeworld.reserves[good]=amount;
  notify(game,entity);
}

export function setHomeOperation(game,player,entity,id,enabled,priority) {
  const error=homeAccess(game,player,entity);if(error)return error;
  const home=entity.market.homeworld;initializeHomeOperations(home);
  const building=(Object.hasOwn(home.facilities,id)?home.facilities[id]:null)||home.structures.find(s=>s.id===id);
  if(!building)return 'Unbekannte Anlage.';
  if((id==='workshop'||building.kind==='workshop')&&!enabled&&player.relic?.operation?.world===entity.id)return 'Während der Antriebsarbeit bleibt die Werkstatt reserviert.';
  if(['dock','control'].includes(id)&&!enabled)return 'Grundlegender Lager- und Leitstellenbetrieb bleibt durch Notversorgung erhalten.';
  building.enabled=enabled;building.priority=priority;
  notify(game,entity);
}

function completeConstruction(game,entity,now) {
  const home=entity.market.homeworld;
  for(const [id,building] of Object.entries(home.facilities))if(building.status==='building'&&now>=building.readyAt){
    building.status='ready';building.completedAt=building.readyAt;delete building.readyAt;
    home.capitalCosts||=[];home.capitalCosts.push({id:`${id}:repair`,cost:structuredClone(building.bound||{credits:0,goods:{}})});
    if(id==='control')home.controlLevel=1;
    notify(game,entity);
  }
  const pending=[];
  for(const project of home.projects){
    if(['training','module','study'].includes(project.kind)||now<project.until){pending.push(project);continue;}
    home.capitalCosts||=[];home.capitalCosts.push({id:project.id,cost:structuredClone(project.bound||{credits:0,goods:{}})});
    if(project.kind==='construction'){
      const building=home.structures.find(s=>s.id===project.target);building.status='ready';building.completedAt=project.until;delete building.readyAt;building.bound=project.bound;
    }else if(project.kind==='storageUpgrade'){
      const building=home.structures.find(s=>s.id===project.target);building.level=project.level;delete building.upgrading;
    }else if(project.kind==='upgrade'){
      const building=home.structures.find(s=>s.id===project.target);building.upgrades||=[];building.upgrades.push(project.upgrade);delete building.upgrading;
    }else if(project.kind==='restore'){
      const building=home.facilities[project.target];building.restored=true;delete building.upgrading;
    }else if(project.kind==='land'){home.plots=Math.min(48,home.plots+4);home.expansions++;}
    else if(project.kind==='control'){
      if(project.module){home.controlModules||={};home.controlModules[project.module]=(home.controlModules[project.module]||0)+1;}
      else home.controlLevel=project.level;
    }
    notify(game,entity);
  }
  home.projects=pending;
}

function productionAvailable(market,recipe,id) {
  if(id&&!productionAllowed(market,id))return false;
  if(!Object.entries(recipe.in).every(([g,n])=>(id?productionStock(market,g,id):availableHomeStock(market,g))>=n))return false;
  const delta={normal:0,hazard:0};
  for(const [g,n] of Object.entries(recipe.out)){const cls=GOODS[g]?.cls;if(cls in delta)delta[cls]+=n;}
  for(const [g,n] of Object.entries(recipe.in)){const cls=GOODS[g]?.cls;if(cls in delta)delta[cls]-=n;}
  for(const [g,n] of Object.entries(recipe.out))if(market.goods[g].stock+n-(recipe.in[g]||0)>homeGoodLimit(market,g)+1e-8)return false;
  const used=homeStorageUsage(market),home=market.homeworld;
  return used.normal+delta.normal<=home.storage+1e-8&&used.hazard+delta.hazard<=home.hazardStorage+1e-8;
}

function runProduction(market,building,recipe,dt,speed,now) {
  const id=building.recipe||building.facility;
  if(!productionAvailable(market,recipe,id))return;
  building.progress=(building.progress||0)+dt*speed;
  let cycles=Math.floor((building.progress+1e-9)/recipe.time);
  // Each iteration is a full physical recipe cycle; no partial inputs or outputs.
  let completedCycles=0;
  while(cycles-->0&&productionAvailable(market,recipe,id)){
    consumeProductionReservation(market,id);recordProduction(market,id);
    for(const [g,n] of Object.entries(recipe.in)){market.goods[g].stock-=n;stat(market,now,'c',g,n);}
    for(const [g,n] of Object.entries(recipe.out)){market.goods[g].stock+=n;market.homeworld.produced[g]=(market.homeworld.produced[g]||0)+n;stat(market,now,'p',g,n);}
    building.progress-=recipe.time;completedCycles++;
  }
  building.progress=Math.min(recipe.time,Math.max(0,building.progress));
  market.homeworld.productionCycles[id]=(market.homeworld.productionCycles[id]||0)+completedCycles;
}

function populationStep(entity,dt,now) {
  const market=entity.market,home=market.homeworld;
  home.civilConsumption={};
  const consume=(good,amount)=>{
    const reserved=Object.values(home.reservations).reduce((sum,item)=>sum+(item.goods[good]||0),0);
    const taken=Math.min(Math.max(0,(market.goods[good]?.stock||0)-reserved),amount);
    if(market.goods[good])market.goods[good].stock-=taken;
    home.civilConsumption[good]=(home.civilConsumption[good]||0)+taken;
    stat(market,now,'c',good,taken);
    return amount>0?taken/amount:1;
  };
  const supply={};
  for(const [good,amount] of Object.entries(HOMEWORLD.population.needPerHour))supply[good]=consume(good,home.population*amount*dt/3600);
  const basic=Math.min(supply.water,supply.food),comfortScale=Math.min(1,home.population/1000);
  let comfort=0;
  for(const [good,amount] of Object.entries(HOMEWORLD.population.comfortPerHour))comfort+=consume(good,home.population*amount*comfortScale*dt/3600)/3;
  home.supply={...supply,basic,comfort};home.supplyFactor=.25+.75*basic+.25*basic*comfort;
  if(basic>=1-1e-8){
    home.growthProgress+=Math.min(home.population*HOMEWORLD.population.growthPerHour,HOMEWORLD.population.maxGrowthPerHour)*dt/3600;
    const growth=Math.min(Math.floor(home.growthProgress+1e-9),Math.max(0,home.housing-home.population));
    if(growth>0){home.population+=growth;home.growthProgress-=growth;home.workers.basic+=Math.max(0,Math.floor(home.population*.6)-QUALIFICATIONS.reduce((sum,q)=>sum+home.workers[q],0));}
    if(home.population>=home.housing)home.growthProgress=Math.min(home.growthProgress,1);
  }
  return basic>=1-1e-8;
}

function operationStep(game,entity,dt,now) {
  const market=entity.market,home=market.homeworld;
  completeConstruction(game,entity,now);
  home.storage=HOMEWORLD.start.storage;home.hazardStorage=home.certifiedHazardStorage??(completed(game.players.get(home.owner),'H06')?HOMEWORLD.start.hazardStorage:0);home.housing=home.baseHousing??HOMEWORLD.start.housing;
  for(const building of home.structures.filter(ready)){
    const spec=structureSpec(building);home.storage+=spec.storage||0;home.hazardStorage+=spec.hazardStorage||0;home.housing+=spec.housing||0;
  }
  for(const [good,slot] of Object.entries(market.goods))slot.cap=GOODS[good].cls==='normal'?home.storage:GOODS[good].cls==='hazard'?home.hazardStorage:0;
  const fullySupplied=ready(home.facilities.dock)?populationStep(entity,dt,now):false;
  if(fullySupplied)home.fullSupplySeconds=(home.fullSupplySeconds||0)+dt;
  if(fullySupplied&&completed(game.players.get(home.owner),'H03'))home.suppliedSeconds+=dt;
  const reserved=trainingReserved(home),remaining={...home.workers},used=qualified();
  for(const q of QUALIFICATIONS)remaining[q]-=reserved[q];remaining.basic-=buildTeams(home);
  const relicWork=game.players.get(home.owner)?.relic?.operation?.world===entity.id;
  if(relicWork)remaining.skilled-=2;
  const allocations=[];
  const flows={};
  const flow=(good,field,amount)=>{flows[good]||={produce:0,consume:0};flows[good][field]+=amount;};
  for(const [good,n] of Object.entries(HOMEWORLD.population.needPerHour))flow(good,'consume',home.population*n);
  let generation=HOMEWORLD.start.power,powerUsed=0;
  const staffAvailable=(spec)=>QUALIFICATIONS.every(q=>remaining[q]>=(spec.workers[q]||0))&&QUALIFICATIONS.reduce((n,q)=>n+used[q]+(spec.workers[q]||0)+reserved[q],0)+buildTeams(home)+(relicWork?2:0)<=Math.floor(home.population*.6);
  const assign=(id,spec,reason=null)=>{
    if(reason){allocations.push({id,state:'paused',reason,power:0,workers:qualified()});return false;}
    if(!staffAvailable(spec)){allocations.push({id,state:'paused',reason:'Personal fehlt',power:0,workers:qualified()});return false;}
    for(const q of QUALIFICATIONS){remaining[q]-=spec.workers[q]||0;used[q]+=spec.workers[q]||0;}
    powerUsed+=spec.power||0;allocations.push({id,state:'active',power:spec.power||0,workers:{...spec.workers}});return true;
  };
  const structures=home.structures.filter(ready).sort((a,b)=>(b.priority??50)-(a.priority??50)||a.id.localeCompare(b.id));
  for(const building of structures){
    const spec=structureSpec(building);if(!spec.generation)continue;
    const fueled=Object.entries(spec.fuelPerHour||{}).every(([g,n])=>availableHomeStock(market,g)+1e-8>=n*dt/3600);
    if(assign(building.id,spec,building.enabled===false?'Pausiert':!fueled?'Betriebsmittel fehlen':null)){
      generation+=spec.generation;
      for(const [g,n] of Object.entries(spec.fuelPerHour||{})){market.goods[g].stock=Math.max(0,market.goods[g].stock-n*dt/3600);flow(g,'consume',n);stat(market,now,'c',g,n*dt/3600);}
    }
  }
  const units=[];
  for(const [id,count] of Object.entries(home.controlModules||{}))for(let i=0;i<count;i++)units.push({id:`control:${id}:${i}`,building:{},spec:CONTROL_MODULES[id],priority:70});
  if(home.orbital?.jobs?.small)units.push({id:'orbital:small',building:{},spec:ORBITAL_OPERATION.small,priority:61});
  if(home.orbital?.jobs?.large){
    const spec=home.orbital.jobs.small?ORBITAL_OPERATION.large:{power:80,workers:{basic:8,skilled:16,specialist:4}};
    units.push({id:'orbital:large',building:{},spec,priority:60});
  }
  for(const [id,building] of Object.entries(home.facilities)){
    if(!ready(building))continue;
    let spec;
    if(RECIPES[id])spec=building.restored?INDUSTRY_GROUPS.I:{power:1,workers:{basic:4}};
    else if(id==='dock')spec={power:2,workers:{basic:2}};
    else if(id==='control')spec={power:2+home.controlLevel,workers:{basic:2,skilled:home.controlLevel>=2?2:0,specialist:home.controlLevel>=4?Math.floor(home.controlLevel/4):0}};
    else if(id==='workshop'&&relicWork&&building.enabled!==false)spec={power:2,workers:{skilled:2}};
    else continue;
    units.push({id,building,spec,recipe:RECIPES[id],relicWorkshop:id==='workshop',priority:id==='workshop'?110:building.priority??(['dock','control'].includes(id)?100:['waterworks','foodplant','fueldepot'].includes(id)?80:50)});
  }
  for(const building of structures){
    const spec=structureSpec(building);if(spec.generation)continue;
    if(building.kind==='workshop'&&(!relicWork||units.some(unit=>unit.relicWorkshop)||building.enabled===false))continue;
    units.push({id:building.id,building,spec,recipe:building.kind==='plant'?RECIPES[building.recipe]:null,relicWorkshop:building.kind==='workshop',priority:building.kind==='workshop'?110:building.priority??50});
  }
  units.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
  for(const unit of units){
    const {id,building,spec,recipe}=unit;
    if(unit.relicWorkshop&&relicWork)remaining.skilled+=2;
    const reason=id==='orbital:large'&&home.orbital.jobs.small&&!allocations.some(a=>a.id==='orbital:small'&&a.state==='active')?'Grundring nicht in Betrieb':building.enabled===false?'Pausiert':recipe&&!productionAvailable(market,recipe,building.recipe||id)?'Produktionsziel erreicht, Zutaten fehlen, Reserve geschützt oder Lager voll':powerUsed+(spec.power||0)>generation?'Energie fehlt':null;
    const emergency=['dock','control'].includes(id)&&reason==='Energie fehlt';
    if(emergency){allocations.push({id,state:'emergency',reason:'Unabhängige Notversorgung erhält Lagerzugang und Reichweite',power:0,workers:qualified()});continue;}
    if(!assign(id,spec,reason)){building.blocked=reason||'Personal fehlt';continue;}
    building.blocked=null;
    if(recipe){
      const speed=building.kind==='plant'||building.restored?1:HOMEWORLD.industry.repairedSpeed;
      for(const [g,n] of Object.entries(recipe.in))flow(g,'consume',n*speed*3600/recipe.time);
      for(const [g,n] of Object.entries(recipe.out))flow(g,'produce',n*speed*3600/recipe.time);
      building.facility=id;runProduction(market,building,recipe,Math.min(dt,Math.max(0,now-(building.completedAt??-Infinity))),speed,now);
    }
  }
  const pending=[];
  for(const project of home.projects){
    if(project.kind!=='training'){pending.push(project);continue;}
    const schoolActive=allocations.some(item=>item.id===project.school&&item.state==='active');
    if(fullySupplied&&schoolActive)project.remaining=Math.max(0,project.remaining-dt);
    project.paused=!(fullySupplied&&schoolActive);
    if(project.remaining>0){pending.push(project);continue;}
    home.workers[project.from]-=project.count;home.workers[project.to]+=project.count;reserved[project.from]-=project.count;remaining[project.to]+=project.count;home.trained[project.to]+=project.count;notify(game,entity);
  }
  home.projects=pending;
  home.energy={generation,used:powerUsed,free:Math.max(0,generation-powerUsed)};
  home.workforce={total:{...home.workers},used,reserved:{...reserved,basic:reserved.basic+buildTeams(home),skilled:reserved.skilled+(relicWork?2:0)},free:remaining,freeSlots:Math.max(0,Math.floor(home.population*.6)-QUALIFICATIONS.reduce((n,q)=>n+used[q]+reserved[q],0)-buildTeams(home)-(relicWork?2:0))};
  home.allocations=allocations;
  tickModuleProjects(game,entity,dt);
  tickOrbital(game,entity,dt);
  home.flows=flows;
  home.employmentFactor=.5+.5*Math.min(1,QUALIFICATIONS.reduce((sum,q)=>sum+used[q],0)/Math.max(1,Math.floor(home.population*.6)));
  tickCivilMoney(game,entity,dt,ready(home.facilities.dock)?home.civilConsumption:{});
  home.power=generation;
}

export function tickHomeOperations(game,entity,dt) {
  const home=entity.market.homeworld;initializeHomeOperations(home);
  if(home.warp)return;
  dt=Math.min(dt,Math.max(0,game.time-(home.warpResumedAt??-Infinity)));if(dt<=0)return;
  initializePopulation(entity);
  let remaining=dt;
  while(remaining>0){const step=Math.min(10,remaining),now=game.time-remaining+step;operationStep(game,entity,step,now);remaining-=step;}
  tickLogistics(game,entity);
  tickVisitors(entity,game.time);
}
