import {SHIP_TYPES,SHIPYARD,GOODS,YARD_MARGIN,shipStats} from '../shared/config.js';
import {stat} from './markets.js';

export function preparePhysicalYard(entity){
  const m=entity.market;if(!['shipyard','factionyard'].includes(m.strategy))return;
  m.yardCatalog=m.strategy==='factionyard'?Object.keys(SHIP_TYPES).filter(t=>SHIP_TYPES[t].faction===entity.faction):[...new Set(SHIPYARD.ORDER[entity.type]||[])];
  m.nextBuild=0;m.physicalShipsBuilt=0;
  for(const type of m.yardCatalog)for(const [good,n] of Object.entries(SHIP_TYPES[type].build)){
    m.goods[good]||={role:'consume',rate:0,stock:0,cap:1,mod:1};m.goods[good].cap=Math.max(m.goods[good].cap,Math.ceil(n*1.2));m.goods[good].baseCap=m.goods[good].cap;
  }
  if(entity.id==='origin_yard'){
    const item={id:'origin_yard:initial-spatz',source:'public_start_exception',type:'spatz',price:2500,fuel:SHIP_TYPES.spatz.tank};
    m.forSale.push(item);m.provenance.push({...item,claimedBy:null});
  }
}

export function startPhysicalBuild(game,entity,type,order=null){
  const m=entity.market,d=SHIP_TYPES[type];
  if(m.building)return 'Die Werft baut bereits.';
  if(!m.yardCatalog?.includes(type))return 'Dieser Schiffstyp gehört nicht zum Baukatalog dieser Werft.';
  if(m.forSale.length>=SHIPYARD.MAX_FOR_SALE&&!order)return 'Kein freier Platz im Werftbestand.';
  for(const [good,n] of Object.entries(d.build))if((m.goods[good]?.stock||0)<n)return `Es fehlen ${Math.ceil(n-(m.goods[good]?.stock||0))} ${GOODS[good].name} im Werftlager.`;
  let cost=0;
  for(const [good,n] of Object.entries(d.build)){m.goods[good].stock-=n;cost+=n*GOODS[good].base*(m.goods[good].mod||1);stat(m,game.time,'c',good,n);}
  m.building={id:`${entity.id}:built:${++m.physicalShipsBuilt}`,source:'materials',type,remaining:SHIPYARD.BUILD_TIME[d.cls],price:Math.round(cost*(1+YARD_MARGIN)/100)*100,materials:structuredClone(d.build),...(order?{order:structuredClone(order)}:{})};
}

export function tickPhysicalYard(game,entity,dt){
  const m=entity.market;
  if(m.building){
    m.building.remaining-=dt;if(m.building.remaining>0)return;
    const build=m.building,d=SHIP_TYPES[build.type],item={id:build.id,source:'materials',type:build.type,price:build.price,materials:build.materials,fuel:0,...(m.owner?{own:true}:{})};
    if(d.faction)Object.assign(item,{faction:true,currency:structuredClone(d.currency)});
    if(build.order){const order=build.order;Object.assign(item,{ordered:true,reservedFor:order.player,reservedName:order.name,reservedUntil:game.time+SHIPYARD.RESERVE});m.order=null;}
    initializeNewHull(item);m.forSale.push(item);m.building=null;stat(m,game.time,'n',null,1);m.rev=(m.rev||0)+1;return;
  }
  if(m.owner||(!m.order&&m.forSale.length>=SHIPYARD.MAX_FOR_SALE))return;
  const catalog=m.order?[m.order.type]:m.yardCatalog||[];
  for(let i=0;i<catalog.length;i++){
    const index=m.order?0:((m.nextBuild||0)+i)%catalog.length,type=catalog[index];
    if(Object.entries(SHIP_TYPES[type].build).every(([g,n])=>(m.goods[g]?.stock||0)>=n)){
      startPhysicalBuild(game,entity,type,m.order);m.nextBuild=(index+1)%catalog.length;return;
    }
  }
}

export function applyPhysicalHull(ship,item){
  ship.fuel=item.fuel||0;ship.upg=structuredClone(item.upg||{});ship.modules=[...(item.modules||[])];ship.upgValue=item.upgValue||0;
  ship.bonus=item.bonus||0;ship.yardLvl=item.yardLvl||0;ship.hullSource=item.id;
  initializeNewHull(item);
  ship.fuel=item.fuel??0;
}

export function initializeNewHull(item){
  if(item.initialFuelGranted || !['materials','public_start_exception'].includes(item.source))return;
  item.fuel=shipStats({type:item.type,upg:item.upg||{},modules:item.modules||[],bonus:item.bonus||0}).tank;
  item.initialFuelGranted=true;
}

export function migrateNewHullInventory(game){
  for(const e of game.world.entities.values()){
    for(const item of e.market?.forSale||[])initializeNewHull(item);
    for(const item of e.market?.homeworld?.orbital?.inventory||[])initializeNewHull(item);
  }
}
