import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game} from '../server/game.js';
import {GOODS,STATION_TYPES,buyPrice,sellPrice,NPC_OWNER} from '../shared/config.js';
import {preparePublicEntity,tickRealMarket,ensureCash,dispatchRealSupply,loadRealSupply,finishRealSupply,tickCivilMoney} from '../server/real-economy.js';
import {runCommand} from '../server/handlers/index.js';
import {questProgress} from '../server/quests.js';
import {applyLevel} from '../server/markets.js';
import {updateShip} from '../server/ships.js';

const fixture=()=>{const game=new Game(':memory:',{seed:42,profile:'homeworld'}),player=game.createPlayer('Bilanz');return {game,player,home:game.world.entities.get(player.homeworld),ship:game.shipsOf(player.id)[0]};};
const slot=(role,stock=0,rate=0,cap=100)=>({role,stock,rate,cap,mod:1});
function market(f,id,goods,extra={}){
  const entity={id,kind:'planet',type:'mining',radius:50,sector:f.home.sector,system:f.home.system,x:f.home.x+1000,y:f.home.y,market:{strategy:'planet',realEconomy:true,goods,...extra}};
  f.game.world.addEntity(entity);ensureCash(entity);return entity;
}
const close=f=>f.game.store.close();
const approximately=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('Frische und spätere Sektoren haben keine öffentliche Verarbeitung, Fertigwaren oder unregistrierte Anfangsangebote',()=>{
  const f=fixture();for(let q=-2;q<=2;q++)for(let r=-2;r<=2;r++)f.game.world.ensureSector(q,r);
  let reserves=0;
  for(const entity of f.game.world.entities.values()){
    if(entity.type==='ruins'||entity.market?.strategy==='homeResource')continue;
    assert(!STATION_TYPES[entity.type]?.recipe);const m=entity.market;if(!m)continue;
    assert.deepEqual(m.modules,[]);
    if(entity.id==='origin_yard'){assert.equal(m.forSale.length,1);assert.equal(m.forSale[0].source,'public_start_exception');assert(m.provenance.some(p=>p.id===m.forSale[0].id));}
    else assert.equal(m.forSale?.length||0,0);
    for(const [g,s] of Object.entries(m.goods)){
      if(GOODS[g].cls==='passenger'){assert(s.stock<=m.economy.population);assert.equal(s.rate,0);if(s.stock)assert(m.provenance.some(p=>p.source==='existing_population'));continue;}
      if(GOODS[g].tier>0)assert.equal(s.stock,0);
      if(s.role==='produce')assert.equal(GOODS[g].tier,0);
      if(s.stock>0){const provenance=m.provenance.find(p=>p.good===g);assert(provenance);assert.equal(provenance.amount,s.stock);reserves++;}
    }
  }
  assert(reserves>100);close(f);
});

test('Reale Förderung arbeitet unversorgt mit 25 %, versorgt mit 100 % und driftet keine Handelsbestände',()=>{
  const f=fixture(),e=market(f,'extract',{ore:slot('produce',0,1,10000),food:slot('consume',0,.1),electronics:slot('trade',7)});
  tickRealMarket(f.game,e,10);assert.equal(e.market.goods.ore.stock,2.5);assert.equal(e.market.goods.electronics.stock,7);
  e.market.goods.food.stock=2;tickRealMarket(f.game,e,10);assert.equal(e.market.goods.ore.stock,12.5);approximately(e.market.goods.food.stock,2-1000*.1*10/3600);
  e.market.goods.ore.stock=9999;tickRealMarket(f.game,e,10);assert.equal(e.market.goods.ore.stock,10000);close(f);
});

test('NPC-Nachfragebudget ist endlich, vom Angebot unabhängig und durch zwei Stunden begrenzt',()=>{
  const f=fixture(),e=market(f,'cash',{food:slot('consume',0,.1)}),cash=e.market.economy;
  tickRealMarket(f.game,e,3600);approximately(cash.cash,cash.rate);
  tickRealMarket(f.game,e,36000);approximately(cash.cash,2*cash.rate);
  const rate=cash.rate;e.market.goods.food.stock=1e6;tickRealMarket(f.game,e,1);assert.equal(cash.rate,rate);assert(cash.cash<=2*rate);close(f);
});

test('Reservierte NPC-Kasse zählt zur Obergrenze des noch nicht ausgegebenen Budgets',()=>{
  const f=fixture(),target=market(f,'escrow-target',{food:slot('consume',0,.1)}),cash=target.market.economy;
  cash.cash=cash.rate;const npc=f.game.spawnNpcShip(target);npc.queue=[{t:'supply',real:true,stationId:target.id,cash:cash.rate}];
  tickRealMarket(f.game,target,36000);approximately(cash.cash+npc.queue[0].cash,2*cash.rate);assert.equal(cash.granted,0);close(f);
});

test('Öffentliche Verkäufe belasten tatsächliche Kasse; Einkäufe bringen dieselben Credits zurück',()=>{
  const f=fixture(),e=market(f,'counterparty',{food:slot('consume',0,.1),ore:slot('produce',50,0)});
  f.ship.dockedAt=e.id;f.ship.cargo={food:20};e.market.economy.cash=sellPrice('food',e.market.goods.food)*2+.001;
  const cash=e.market.economy.cash,credits=f.player.credits;
  const sale=f.game.trade(f.ship,e,'food',20,'sell');assert.equal(sale.n,2);
  approximately(f.player.credits-credits,cash-e.market.economy.cash);assert.equal(f.ship.cargo.food,18);
  assert.equal(f.game.trade(f.ship,e,'food',20,'sell').n,0);
  const before=e.market.economy.cash,buy=f.game.trade(f.ship,e,'ore',5,'buy');assert.equal(buy.n,5);approximately(e.market.economy.cash-before,buy.total);close(f);
});

test('Händler finanzieren Käufe nur mit Kasse und vorhandener zahlungsfähiger Zielnachfrage',()=>{
  const f=fixture(),trader=market(f,'trader',{ingots:slot('trade')}),buyer=market(f,'buyer',{ingots:slot('consume',0,.1)});
  trader.market.economy.cash=10000;f.ship.dockedAt=trader.id;f.ship.cargo={ingots:5};
  assert.equal(f.game.trade(f.ship,trader,'ingots',5,'sell').n,0);
  buyer.market.economy.cash=10000;assert.equal(f.game.trade(f.ship,trader,'ingots',5,'sell').n,5);assert.equal(trader.market.goods.ingots.stock,5);close(f);
});

test('NPC-Abholung reserviert echte Kasse und bezahlt nur tatsächlich geladene ungeschützte Ware',()=>{
  const f=fixture(),destination=market(f,'demand',{ingots:slot('consume',0,.1)});
  f.game.ownership.get(f.home.id).mode='open';f.home.market.goods.ingots.stock=30;f.home.market.homeworld.reserves={ingots:25};
  destination.market.economy.cash=10000;const startCash=destination.market.economy.cash,credits=f.player.credits;
  dispatchRealSupply(f.game,destination);
  const npc=[...f.game.ships.values()].find(s=>s.owner===NPC_OWNER&&s.queue[0]?.stationId===destination.id);assert(npc);
  const order=npc.queue[0];assert.equal(order.amount,5);approximately(destination.market.economy.cash+order.cash,startCash);
  loadRealSupply(f.game,npc,f.home,order);order.phase='toStation';
  assert.equal(npc.cargo.ingots,5);assert.equal(f.home.market.goods.ingots.stock,25);
  approximately(f.player.credits-credits,startCash-destination.market.economy.cash-order.cash);
  assert(finishRealSupply(f.game,npc,destination));assert.equal(destination.market.goods.ingots.stock,5);assert.equal(f.game.ships.has(npc.id),false);
  approximately(startCash-destination.market.economy.cash,f.player.credits-credits);close(f);
});

test('Voller Liefermarkt erhält bezahlte Restladung über Neustart, spätere Entladung dupliziert keine Auszahlung',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'prd5-cargo-')),file=path.join(directory,'world.db');
  let game=new Game(file,{seed:42,profile:'homeworld'}),player=game.createPlayer('Transport'),home=game.world.entities.get(player.homeworld);
  const destination=game.world.entities.get('origin_yard');destination.market.goods.ingots=slot('consume',100,0,100);ensureCash(destination).cash=100;
  const npc=game.spawnNpcShip(destination);npc.cargo={ingots:10};npc.queue=[{t:'supply',real:true,stationId:destination.id,sourceId:home.id,good:'ingots',cash:30,phase:'toStation'}];
  const id=npc.id;assert.equal(finishRealSupply(game,npc,destination),false);assert.equal(npc.cargo.ingots,10);assert.equal(destination.market.economy.cash,130);
  game.close();game=new Game(file,{profile:'homeworld'});const loaded=game.ships.get(id),target=game.world.entities.get(destination.id);
  assert.equal(loaded.cargo.ingots,10);assert.equal(loaded.queue[0].cash,0);target.market.goods.ingots.stock=95;
  assert.equal(finishRealSupply(game,loaded,target),false);assert.equal(loaded.cargo.ingots,5);target.market.goods.ingots.stock=90;
  assert(finishRealSupply(game,loaded,target));assert.equal(target.market.goods.ingots.stock,95);assert.equal(target.market.economy.cash,130);
  game.store.close();fs.rmSync(directory,{recursive:true,force:true});
});

test('Bürger teilen ein Einkommen in Steuern, bezahlten Konsum und begrenzten Rest, Betrieb zahlt nichts doppelt',()=>{
  const f=fixture(),home=f.home.market.homeworld;home.supplyFactor=1;home.employmentFactor=1;
  const credits=f.player.credits;tickCivilMoney(f.game,f.home,3600,{water:5});
  const civil=home.civil;assert.equal(civil.gross,400);assert.equal(civil.taxes,80);
  approximately(civil.gross,civil.taxes+civil.consumptionPayments+civil.budget+civil.unspentExpired);
  approximately(f.player.credits-credits,civil.taxes+civil.consumptionPayments);
  const old=f.player.credits;f.ship.dockedAt=f.home.id;home.facilities.dock.status='ready';f.ship.cargo={ore:10};f.game.trade(f.ship,f.home,'ore',10,'sell');assert.equal(f.player.credits,old);
  assert.equal(runCommand(f.game,f.player,{cmd:'homeTax',target:f.home.id,percent:40}),undefined);assert.equal(civil.taxRate,.4);
  assert.match(runCommand(f.game,f.player,{cmd:'homeTax',target:f.home.id,percent:41}),/Zahl/);close(f);
});

test('Beschaffungsquest wartet bei vollem Lager und erhält gesamte Ladung bis zur wirklichen Übergabe',()=>{
  const f=fixture(),e=market(f,'quest-buyer',{ore:slot('consume',100,0,100)});
  f.player.quest={id:'q-test',type:'procure',giver:e.id,good:'ore',amount:10,reward:0,xp:0};f.ship.dockedAt=e.id;f.ship.cargo={ore:10};
  assert.equal(questProgress(f.game,f.player,f.ship),false);assert.equal(f.ship.cargo.ore,10);assert(f.player.quest);close(f);
});

test('Questgeberlevel erzeugt weder Waren noch Förderbonus und unberechtigte Fabrikbauten werden abgewiesen',()=>{
  const f=fixture(),e=market(f,'plain',{ore:slot('produce',10,1)}),before=structuredClone(e.market.goods);
  e.market.lvl=100;applyLevel(e);assert.deepEqual(e.market.goods,before);
  f.player.known.visit.add(e.id);f.ship.dockedAt=e.id;
  const credits=f.player.credits,error=runCommand(f.game,f.player,{cmd:'facBuild',target:e.id,recipe:'waterworks'});
  assert.match(error,/eigenen Planeten/);assert.equal(f.player.credits,credits);close(f);
});

test('NPC-Versorger fliegt tatsächlich Quelle und Ziel an und hält Waren- und Geldbilanz ein',()=>{
  const f=fixture(),source=market(f,'flight-source',{ingots:slot('produce',30)}),target=market(f,'flight-target',{ingots:slot('consume',0,.1)});
  source.x=f.home.x+1000;target.x=f.home.x+3000;target.market.economy.cash=10000;
  const before=target.market.economy.cash+source.market.economy.cash;
  dispatchRealSupply(f.game,target);const npc=[...f.game.ships.values()].find(s=>s.owner===NPC_OWNER&&s.queue[0]?.stationId===target.id);assert(npc);
  const id=npc.id;
  for(let i=0;i<200&&f.game.ships.has(id);i++){f.game.time++;updateShip(npc,1,f.game);}
  assert.equal(f.game.ships.has(id),false);assert.equal(source.market.goods.ingots.stock+target.market.goods.ingots.stock,30);
  assert(target.market.goods.ingots.stock>0);approximately(source.market.economy.cash+target.market.economy.cash,before);close(f);
});

test('Dauerhaft blockierte Restladung wird einem anderen zahlungsfähigen Abnehmer real angeboten',()=>{
  const f=fixture(),target=market(f,'full-target',{ingots:slot('consume',100,0,100)}),alternative=market(f,'alternative',{ingots:slot('consume',0,.1)});
  alternative.x=target.x+1000;alternative.market.economy.cash=10000;
  const npc=f.game.spawnNpcShip(target);npc.cargo={ingots:10};npc.queue=[{t:'supply',real:true,stationId:target.id,sourceId:f.home.id,good:'ingots',cash:0,phase:'toStation'}];
  assert.equal(finishRealSupply(f.game,npc,target),false);f.game.time=61;
  assert.equal(finishRealSupply(f.game,npc,target),false);assert.equal(npc.queue[0].deliveryTargetId,alternative.id);
  const cash=target.market.economy.cash+alternative.market.economy.cash,id=npc.id;
  for(let i=0;i<100&&f.game.ships.has(id);i++){f.game.time++;updateShip(npc,1,f.game);}
  assert.equal(f.game.ships.has(id),false);assert.equal(alternative.market.goods.ingots.stock,10);
  approximately(target.market.economy.cash+alternative.market.economy.cash,cash);assert(target.market.economy.cash>0);close(f);
});

test('NPC-Planeten kaufen nicht am Hub, aber weiterhin bei echten Produzenten',()=>{
  const f=fixture();try{
    const hub=f.game.world.entities.get('origin_hub');
    const target=market(f,'hub-ban-target',{water:slot('consume',0)});
    target.x=hub.x+100;target.y=hub.y;ensureCash(target).cash=1e6;
    hub.market.goods.water={...slot('trade',1000,0,2000)};
    const producer=market(f,'hub-ban-producer',{water:slot('produce',100)});
    producer.x=hub.x+200;producer.y=hub.y;
    f.game.world.sectorEntities=()=>[target,hub];
    dispatchRealSupply(f.game,target);
    assert.equal([...f.game.ships.values()].filter(s=>s.owner===NPC_OWNER).length,0);
    assert.equal(f.game.findSource(target,'water'),null);
    target.market.supCd={};f.game.world.sectorEntities=()=>[target,hub,producer];
    assert.equal(f.game.findSource(target,'water').id,producer.id);
    dispatchRealSupply(f.game,target);
    const transport=[...f.game.ships.values()].find(s=>s.owner===NPC_OWNER);
    assert.equal(transport.queue[0].sourceId,producer.id);
  }finally{close(f);}
});

test('Gespeicherter Hub-Einkauf kehrt ohne Einkauf zurück und erstattet das reservierte Geld',()=>{
  const f=fixture();try{
    const hub=f.game.world.entities.get('origin_hub');
    const target=market(f,'saved-hub-target',{water:slot('consume',0)});
    const transport=f.game.spawnNpcShip(target,true);
    transport.queue=[{t:'supply',stationId:target.id,sourceId:hub.id,good:'water',amount:10,phase:'toSource',real:true,haul:true,cash:500}];
    f.game.markNpc(transport,true);
    const money=ensureCash(target).cash,stock=hub.market.goods.water.stock;
    // Even a direct load call must enforce the restriction.
    loadRealSupply(f.game,transport,hub,transport.queue[0]);
    assert.deepEqual(transport.cargo,{});
    updateShip(transport,1,f.game);
    assert.equal(transport.queue[0].phase,'toStation');
    assert.equal(hub.market.goods.water.stock,stock);
    // Cargo already paid for before the update must still be delivered.
    transport.cargo.water=3;
    transport.queue[0].deliveryTargetId=hub.id;
    updateShip(transport,1,f.game);
    assert.equal(f.game.ships.has(transport.id),false);
    assert.equal(ensureCash(target).cash,money+500);
    assert.equal(target.market.goods.water.stock,3);
    assert.equal(f.game.npcBusy.has(target.id+':water'),false);
  }finally{close(f);}
});
