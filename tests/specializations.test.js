import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {runCommand} from '../server/handlers/index.js';
import {newProperty} from '../server/property.js';
import {tickRealMarket} from '../server/real-economy.js';
import {tickSpecialization} from '../server/specializations.js';
import {specializationSpec,WORLD_FOCI} from '../shared/specializations.js';
import {GOODS,propertyPrice} from '../shared/config.js';
import {handlingAllowance,recordHandling} from '../server/handling.js';
import {HOME_BUILDINGS} from '../shared/homeworld.js';

function fixture(type='mining'){
  const game=new Game(':memory:',{seed:42,profile:'homeworld'}),player=game.createPlayer('Ausbau');
  for(let q=-1;q<=1;q++)game.world.ensureSector(q,1);
  const e=[...game.world.entities.values()].find(e=>e.type===type&&e.kind==='planet'&&!e.noBuy),h=e.market.economy,s=game.shipsOf(player.id)[0];
  s.dockedAt=e.id;game.revealAround(player,e.x,e.y,1000);game.setOwner(e,player,newProperty(e.id,player.id,game.time));player.credits=1e7;player.homeQuest.completed.H12={at:0};player.homeQuest.completed.H02={at:0};
  h.infrastructure=[{id:'solar1',kind:'solar'},{id:'solar2',kind:'solar'},{id:'solar3',kind:'solar'}];h.projects=[];
  // A warehouse fixture for isolated physical construction and operation checks.
  for(const [g,d] of Object.entries(GOODS))if(d.cls!=='passenger')e.market.goods[g]||={role:'trade',rate:0,cap:10000,stock:0,mod:1};
  return {game,player,e,h,s};
}
const build=(f,focus)=>runCommand(f.game,f.player,{cmd:'worldSpecialize',target:f.e.id,focus});
const stock=(f,goods)=>{for(const [g,n] of Object.entries(goods))f.e.market.goods[g].stock=n;};
const advance=(f,n)=>{f.game.time+=n;tickSpecialization(f.game,f.e,n);};
const close=f=>f.game.store.close();

test('Rohstoffausbau bindet konkrete Kosten und erhöht ausschließlich die gewählte natürliche Richtung',()=>{
  const f=fixture(),cost=specializationSpec('ore',1),base=f.e.market.goods.ore.rate,other=f.e.market.goods.crystals.rate,credits=f.player.credits;stock(f,cost.goods);
  assert.equal(build(f,'ore'),undefined);assert.equal(f.player.credits,credits-cost.credits);assert.equal(f.e.market.goods.plates.stock,0);assert.equal(f.h.specialization,undefined);
  advance(f,120);assert.equal(f.h.specialization.level,1);assert.equal(f.h.specialization.active,false);assert.match(f.h.specialization.reason,/Verschleiß/);
  stock(f,{machinery:10,robots:10});const machinery=f.e.market.goods.machinery.stock;advance(f,60);
  assert.equal(f.h.specialization.active,true);assert.equal(f.e.market.goods.ore.rate,base*1.5);assert.equal(f.e.market.goods.crystals.rate,other);assert(Math.abs(f.e.market.goods.machinery.stock-(machinery-2/60))<1e-9);close(f);
});

test('Stufe II verwendet Faktor 2 gegenüber der Naturbasis, weder Faktor 3 noch gestapelte Betriebskosten',()=>{
  const f=fixture(),base=f.e.market.goods.ore.baseRate;f.h.specialization={focus:'ore',level:1};stock(f,specializationSpec('ore',2).goods);stock(f,{machinery:100,robots:100});assert.equal(build(f,'ore'),undefined);advance(f,180);
  assert.equal(f.h.specialization.level,2);assert.equal(f.e.market.goods.ore.rate,base*2);assert(Math.abs(f.e.market.goods.machinery.stock-(100-8-5*.05))<1e-9);close(f);
});

test('Schwerpunktwechsel pausiert nur den Spezialbetrieb, kostet 25 Prozent und erhält Typ und Einwohner',()=>{
  const f=fixture(),population=f.h.population;f.h.specialization={focus:'ore',level:1};stock(f,{machinery:10,robots:10});advance(f,1);const before=f.player.credits;
  assert.equal(build(f,'crystals'),undefined);assert.equal(f.player.credits,before-6250);assert.equal(f.h.specialization.paused,true);advance(f,100);assert.equal(f.h.specialization.active,false);
  advance(f,80);assert.equal(f.h.specialization.focus,'crystals');assert.equal(f.e.type,'mining');assert.equal(f.h.population,population);assert.equal(f.h.specialization.active,true);assert.match(build(f,'grain'),/passt nicht/);close(f);
});

test('Hive-Ausbau schafft Wohnraum, aber keine Einwohner; Energie und qualifizierte Kräfte begrenzen den Betrieb',()=>{
  const f=fixture('urban'),population=f.h.population;stock(f,specializationSpec('hive',1).goods);assert.equal(build(f,'hive'),undefined);advance(f,180);assert.equal(f.h.population,population);assert.equal(f.h.housing,2000);
  f.h.infrastructure=[];advance(f,1);assert.equal(f.h.specialization.active,false);assert.match(f.h.specialization.reason,/Energie/);assert.equal(f.h.population,population);close(f);
});

test('Ausbildung reserviert vorhandene Personen, nutzt echte Schulkapazität und erzeugt keine Bevölkerung',()=>{
  const f=fixture('urban'),population=f.h.population;f.h.specialization={focus:'education',level:1};f.h.supplyFactor=1;advance(f,0);
  assert.equal(f.h.schoolCapacity,2);const skilled=f.h.workers.skilled,basic=f.h.workers.basic;
  const train=()=>runCommand(f.game,f.player,{cmd:'worldTrain',target:f.e.id,qualification:'skilled'});
  assert.equal(train(),undefined);assert.equal(train(),undefined);assert.match(train(),/belegt/);f.h.supplyFactor=.25;advance(f,120);assert.equal(f.h.workers.skilled,skilled);
  f.h.supplyFactor=1;advance(f,120);assert.equal(f.h.workers.skilled,skilled+20);assert.equal(f.h.workers.basic,basic-20);assert(f.h.population>=population&&f.h.population<=population+1);close(f);
});

test('Infrastruktur bindet Waren, läuft parallel und liefert reale Energie ohne Rezeptfabriken',()=>{
  const f=fixture();f.h.infrastructure=[];stock(f,{ingots:20,glass:8});
  const construct=()=>runCommand(f.game,f.player,{cmd:'worldInfrastructure',target:f.e.id,kind:'solar'});
  assert.equal(construct(),undefined);assert.equal(construct(),undefined);assert.equal(f.e.market.goods.ingots.stock,0);assert.equal(f.h.projects.length,2);advance(f,60);assert.equal(f.h.energy.generation,52);assert.equal(f.h.infrastructure.length,2);
  assert.match(runCommand(f.game,f.player,{cmd:'facBuild',target:f.e.id,recipe:'smelter'}),/Ruinenwelten/);close(f);
});

test('Questgeberlevel erzeugt weder zusätzliches Angebot noch höheren Besitzwert oder Rohstoffausstoß',()=>{
  const f=fixture(),price=propertyPrice(f.e),rate=f.e.market.goods.ore.rate;f.game.addGiverXp(f.e,1e8);
  assert.equal(propertyPrice(f.e),price);assert.equal(f.e.market.goods.ore.rate,rate);assert.equal(f.e.market.goods.electronics.stock,0);close(f);
});

test('Ziviler Grundbedarf folgt realer Einwohnerzahl; Unterversorgung zerstört keine Einwohner',()=>{
  const f=fixture(),population=f.h.population;stock(f,{water:1000,food:1000});f.h.housing=population;
  tickRealMarket(f.game,f.e,3600);assert(f.h.population>=population);assert(Math.abs(f.e.market.goods.water.stock-(1000-population*.2))<1e-8);assert(Math.abs(f.e.market.goods.food.stock-(1000-population*.1))<1e-8);
  stock(f,{water:0,food:0});const before=f.h.population;tickRealMarket(f.game,f.e,7*86400);assert.equal(f.h.population,before);close(f);
});

test('Alle Rohstoffrichtungen haben bei Grundversorgung mehr zusätzlichen Rohwarenwert als ihren Verschleiß',()=>{
  const f=fixture();let checked=0;
  for(const [type,focuses] of Object.entries(WORLD_FOCI))for(const focus of focuses){
    const spec=specializationSpec(focus,1);if(!spec.factor)continue;
    const e=[...f.game.world.entities.values()].find(e=>e.type===type&&e.market?.goods[focus]?.role==='produce');if(!e)continue;
    const extra=e.market.goods[focus].baseRate*3600*(spec.factor-1)*GOODS[focus].base,wear=Object.entries(spec.wear).reduce((n,[g,a])=>n+a*GOODS[g].base,0);assert(extra>wear,`${type}/${focus}: ${extra} <= ${wear}`);checked++;
  }
  assert(checked>=15);close(f);
});

test('Logistikschwerpunkt erweitert tatsächlich gemeinsame Abfertigung und minutenbegrenzten Umschlag',()=>{
  const f=fixture('industrial');f.h.specialization={focus:'logistics',level:1};advance(f,0);
  assert.equal(f.h.throughput,1500);assert.equal(f.h.docks,6);
  recordHandling(f.game,f.e,f.s,1495);assert.equal(handlingAllowance(f.game,f.e,f.s),5);
  f.e.market.goods.ore.stock=100;assert.equal(f.game.trade(f.s,f.e,'ore',30,'buy').n,5);assert.equal(handlingAllowance(f.game,f.e,f.s),0);
  f.game.time+=60;assert.equal(handlingAllowance(f.game,f.e,f.s),1500);
  for(let i=0;i<5;i++)recordHandling(f.game,f.e,{id:`other${i}`},1);
  assert.equal(handlingAllowance(f.game,f.e,{id:'sixth'}),1500-5);recordHandling(f.game,f.e,{id:'sixth'},1);assert.equal(handlingAllowance(f.game,f.e,{id:'seventh'}),0);close(f);
});

test('Gasgenerator benötigt tatsächlichen Brennstoff und der Reaktor ausschließlich veredelte Betriebsmittel',()=>{
  const f=fixture();f.h.infrastructure=[];stock(f,HOME_BUILDINGS.gasGenerator.goods);f.player.homeQuest.completed.H06={at:0};
  assert.equal(runCommand(f.game,f.player,{cmd:'worldInfrastructure',target:f.e.id,kind:'gasGenerator'}),undefined);advance(f,90);assert.equal(f.h.energy.generation,12);
  stock(f,{gas:20});advance(f,1800);assert.equal(f.h.energy.generation,92);assert.equal(f.e.market.goods.gas.stock,10);
  f.h.infrastructure=[{id:'reactor',kind:'reactor'}];f.h.workers.basic-=2;f.h.workers.specialist=2;stock(f,{uranium:100,enricheduranium:0,coolant:100});advance(f,1);assert.equal(f.h.energy.generation,12);
  stock(f,{enricheduranium:2,coolant:10});advance(f,1800);assert.equal(f.h.energy.generation,512);assert.equal(f.e.market.goods.enricheduranium.stock,1);assert.equal(f.e.market.goods.coolant.stock,5);assert.equal(f.e.market.goods.uranium.stock,100);close(f);
});

test('Fünf Minuten realer Spezialbetrieb liefern Faktor 1,5/2/3 bei exakt zugehörigem Verschleiß',()=>{
  const f=fixture(),slot=f.e.market.goods.ore,base=slot.baseRate;f.h.baseHousing=f.h.population;
  for(let level=1;level<=3;level++){
    f.h.specialization={focus:'ore',level};stock(f,{water:1000,food:1000,machinery:1000,robots:1000});slot.stock=0;
    const spec=specializationSpec('ore',level);let produced=0;
    for(let seconds=0;seconds<300;seconds+=5){f.game.time+=5;tickRealMarket(f.game,f.e,5);produced+=slot.stock;slot.stock=0;}
    assert(Math.abs(produced-base*300*spec.factor)<1e-6);
    for(const [g,n] of Object.entries(spec.wear))assert(Math.abs(f.e.market.goods[g].stock-(1000-n/12))<1e-6);
    const extra=(produced-base*300)*GOODS.ore.base,cost=Object.entries(spec.wear).reduce((n,[g,a])=>n+a/12*GOODS[g].base,0);assert(extra>cost);
  }
  close(f);
});

test('Geänderte Produktions- und Verbrauchsraten werden als vollständige Marktstruktur übertragen',()=>{
  const f=fixture(),base=f.e.market.goods.ore.rate;f.h.specialization={focus:'ore',level:1};stock(f,{machinery:20,robots:20,food:100,water:100});
  const changed=[];f.game.on('entity',e=>{if(e.id===f.e.id)changed.push({ore:e.market.goods.ore.rate,machinery:e.market.goods.machinery.rate});});
  tickRealMarket(f.game,f.e,1);assert(changed.some(e=>e.ore===base*1.5&&e.machinery===2/3600));close(f);
});
