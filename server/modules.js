import {MODULES,MODULE_SIZE,cargoFits,freeFor,GOODS} from '../shared/config.js';
import {MODULE_RECIPES,packedModuleCount} from '../shared/module-production.js';
import {homeStorageUsage,availableHomeStock} from '../shared/homeworld.js';
import {homeAccess,chargeHome,initializeHomeOperations} from './homeworld-operations.js';
import {manualActionError} from './coverage.js';
import {ensureCash,receiveMarketCash,spendMarketCash} from './real-economy.js';
import {propBook,strangerBlocked} from './property.js';

const touch=(game,entity)=>{entity.market.rev=(entity.market.rev||0)+1;game.emit('entity',entity);};
const count=(inventory,module)=>inventory?.[module]||0;
const add=(inventory,module,n)=>{inventory[module]=(inventory[module]||0)+n;if(!inventory[module])delete inventory[module];};
export const moduleStorageFree=market=>Math.max(0,market.homeworld?market.homeworld.storage-homeStorageUsage(market).normal:(market.moduleStorage||300)-packedModuleCount(market.moduleInventory)*30);

function presence(game,player,ship,entity){
  if(!entity?.market||ship.dockedAt!==entity.id)return 'Ein eigenes Schiff muss hier angedockt sein.';
  if(entity.market.homeworld&&entity.market.homeworld.facilities.dock.status!=='ready')return 'Zuerst das Dock reparieren.';
  if(player.relic?.operation?.ship===ship.id)return 'Das Schiff ist für die Reliktarbeit reserviert.';
  return manualActionError(game,player,ship,entity);
}

export function transferModule(game,player,ship,entity,module,dir,amount=1){
  const error=presence(game,player,ship,entity);if(error)return error;
  const market=entity.market,prop=game.ownership.get(entity.id),own=prop?.player===player.id;
  if(prop&&!own&&!game.canUseStorage(prop,player.id)&&strangerBlocked(prop))return 'Privates Modullager.';
  if(market.homeworld?.warp)return 'Standort für Warp gesperrt.';
  market.moduleInventory||={};ship.moduleCargo||={};
  let n,cost=0;
  const price=MODULES[module].price*(dir==='buy'?1:.8);
  if(dir==='buy'){
    n=Math.min(amount,count(market.moduleInventory,module),Math.floor(freeFor(ship,'ore')/MODULE_SIZE),own?Infinity:Math.floor(player.credits/price));
    if(n<1)return 'Kein verfügbares Exemplar, zu wenig Credits oder weniger als 30 freie Frachteinheiten.';
    cost=own?0:n*price;
    if(cost){player.credits-=cost;if(prop){game.accountOf(prop.player).credits+=cost;propBook(game,prop,'inc',cost);}else receiveMarketCash(entity,cost);}
    add(market.moduleInventory,module,-n);add(ship.moduleCargo,module,n);
  }else{
    const buyer=prop?game.accountOf(prop.player):ensureCash(entity);
    const funds=own?Infinity:prop?Math.max(0,buyer.credits-(buyer.stopLoss||0)):buyer.cash;
    n=Math.min(amount,count(ship.moduleCargo,module),Math.floor(moduleStorageFree(market)/MODULE_SIZE),own?Infinity:Math.floor(funds/price),own?Infinity:Math.max(0,3-count(market.moduleInventory,module)));
    if(n<1)return 'Kein verpacktes Exemplar, kein Lagerplatz oder keine finanzierte Modulnachfrage.';
    cost=own?0:n*price;
    if(cost){if(prop){buyer.credits-=cost;propBook(game,prop,'exp',cost);}else spendMarketCash(entity,cost);player.credits+=cost;}
    add(ship.moduleCargo,module,-n);add(market.moduleInventory,module,n);
  }
  game.discover(player,'module',module);touch(game,entity);
  if(cost)game.recordShip(ship,dir==='buy'?'buy':'inc',cost);
  game.shipLog(ship,`${dir==='buy'?'Modul geladen':'Modul eingelagert/verkauft'}: ${n} ${MODULES[module].name} bei ${entity.name}`);
}

export function installModule(game,player,ship,module,source='cargo'){
  const entity=game.world.entities.get(ship.dockedAt),error=presence(game,player,ship,entity);if(error)return error;
  const market=entity.market,prop=game.ownership.get(entity.id),own=prop?.player===player.id;
  if(market.homeworld?.warp)return 'Standort für Warp gesperrt.';
  if(prop&&!own&&!game.canUseStorage(prop,player.id)&&strangerBlocked(prop))return 'Privates Modullager.';
  const inventory=source==='cargo'?ship.moduleCargo:market.moduleInventory;
  if(!count(inventory,module))return 'Kein vorhandenes physisches Exemplar.';
  const hypothetical={...ship,modules:[...(ship.modules||[]),module],moduleCargo:{...ship.moduleCargo}};
  if(source==='cargo')add(hypothetical.moduleCargo,module,-1);
  if(!cargoFits(hypothetical))return 'Einbau blockiert: vorhandene Fracht passt danach nicht in die erlaubten Laderäume.';
  const price=source==='cargo'||own?0:MODULES[module].price;
  if(player.credits<price)return 'Nicht genug Credits.';
  if(price){player.credits-=price;if(prop){game.accountOf(prop.player).credits+=price;propBook(game,prop,'inc',price);}else receiveMarketCash(entity,price);}
  add(inventory,module,-1);ship.modules=hypothetical.modules;ship.moduleCargo=hypothetical.moduleCargo;
  game.discover(player,'module',module);touch(game,entity);
  if(price)game.recordShip(ship,'buy',price);
  game.shipLog(ship,`Physisches Modul eingebaut: ${MODULES[module].name}`);
}

export function removePhysicalModule(game,player,ship,module,destination='cargo'){
  const entity=game.world.entities.get(ship.dockedAt),error=presence(game,player,ship,entity);if(error)return error;
  const market=entity.market;if(market.homeworld?.warp)return 'Standort für Warp gesperrt.';
  const index=(ship.modules||[]).indexOf(module);if(index<0)return 'Modul nicht eingebaut.';
  const modules=ship.modules.filter((_,i)=>i!==index),moduleCargo={...ship.moduleCargo};
  if(destination==='cargo')add(moduleCargo,module,1);
  else if(market.owner!==player.id||moduleStorageFree(market)<30)return 'Ein eigenes Lager mit 30 freien Einheiten auswählen.';
  if(!cargoFits({...ship,modules,moduleCargo}))return 'Ausbau blockiert: Fracht oder Passagiere passen danach nicht in die verbleibenden Bereiche.';
  ship.modules=modules;ship.moduleCargo=moduleCargo;
  if(destination==='warehouse'){market.moduleInventory||={};add(market.moduleInventory,module,1);}
  touch(game,entity);
  game.shipLog(ship,`Physisches Modul ausgebaut: ${MODULES[module].name} · ${destination==='warehouse'?'Lager':'Fracht'}`);
}

export function knownModuleBlueprints(game,player){
  const all=new Set(player.moduleBlueprints||[]);
  for(const e of game.world.entities.values())if(e.market?.homeworld?.owner===player.id)for(const module of e.market.homeworld.moduleBlueprints||[])all.add(module);
  return [...all];
}

function facilityFor(home,module,study){
  const wanted=study?(MODULE_RECIPES[module].facility==='moduleBench'?'researchWorkshop':MODULE_RECIPES[module].facility):MODULE_RECIPES[module].facility;
  return home.structures.find(s=>s.status==='ready'&&s.enabled!==false&&(s.kind===wanted||s.upgrades?.includes(wanted))&&!home.projects.some(p=>['module','study'].includes(p.kind)&&p.facility===s.id));
}

export function startModuleProject(game,player,entity,module,study=false){
  const error=homeAccess(game,player,entity);if(error)return error;
  const home=entity.market.homeworld,recipe=MODULE_RECIPES[module];initializeHomeOperations(home);
  const known=knownModuleBlueprints(game,player).includes(module);
  if(study&&known)return 'Dieser Bauplan ist bereits bekannt.';
  if(!study&&!known)return 'Zuerst ein vorhandenes Exemplar studieren oder den Grundbauplan freischalten.';
  if(study&&[...game.world.entities.values()].some(e=>e.market?.homeworld?.owner===player.id&&e.market.homeworld.projects?.some(p=>p.kind==='study'&&p.module===module)))return 'Dieses Modul wird bereits studiert.';
  const facility=facilityFor(home,module,study);if(!facility)return 'Keine freie geeignete Modulwerkbank oder Forschungsanlage.';
  if(study){
    entity.market.moduleInventory||={};
    const carrier=game.shipsOf(player.id).find(s=>s.dockedAt===entity.id&&count(s.moduleCargo,module)>0);
    const inventory=count(entity.market.moduleInventory,module)>0?entity.market.moduleInventory:carrier?.moduleCargo;
    if(!inventory)return 'Ein reales verpacktes Studienexemplar im Lager oder an Bord vor Ort erforderlich.';
    add(inventory,module,-1);
  }else{
    const recovered=Object.entries(recipe.goods).reduce((sum,[g,n])=>sum+(GOODS[g].cls==='normal'?Math.min(n,availableHomeStock(entity.market,g)):0),0);
    if(moduleStorageFree(entity.market)+recovered<30)return 'Für das fertige Modul müssen 30 normale Lagereinheiten reservierbar sein.';
    const costError=chargeHome(game,player,entity,{credits:0,goods:recipe.goods});if(costError)return costError;
    home.moduleOutputReserved=(home.moduleOutputReserved||0)+30;
  }
  home.projects.push({id:`module_${++home.nextProject}`,kind:study?'study':'module',module,facility:facility.id,remaining:study?Math.min(120,recipe.seconds):recipe.seconds,bound:study?{module}:structuredClone(recipe.goods)});
  touch(game,entity);
}

export function tickModuleProjects(game,entity,dt){
  const home=entity.market.homeworld,player=game.players.get(home.owner),pending=[];
  for(const project of home.projects){
    if(!['module','study'].includes(project.kind)){pending.push(project);continue;}
    const active=home.allocations.some(a=>a.id===project.facility&&a.state==='active');project.paused=!active;
    if(active)project.remaining=Math.max(0,project.remaining-dt);
    if(project.remaining>0){pending.push(project);continue;}
    if(project.kind==='study'){
      home.moduleBlueprints||=[];if(!home.moduleBlueprints.includes(project.module))home.moduleBlueprints.push(project.module);
      player.moduleBlueprints=knownModuleBlueprints(game,player);
    }else{
      home.moduleOutputReserved-=30;entity.market.moduleInventory||={};add(entity.market.moduleInventory,project.module,1);
      home.modulesProduced||={};add(home.modulesProduced,project.module,1);
    }
    touch(game,entity);
  }
  home.projects=pending;
}
