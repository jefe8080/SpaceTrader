import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {GOODS,RECIPES,REFINED_FOR_RAW,REFINEMENT_RECIPES,ULTRA,refinedAmountFor} from '../shared/goods.js';
import {FACTIONS,FACTION_SHIPS} from '../shared/factions.js';
import {industryGroup,industrySpec} from '../shared/homeworld.js';
import {runCommand} from '../server/handlers/index.js';
import {tickHomeworld} from '../server/homeworld.js';
import {canSellTo} from '../shared/config.js';
import {priceCatalog,priceMarkdown} from '../scripts/generate-prd5-prices.js';

function fixture(recipe){
  const game=new Game(':memory:',{seed:42,profile:'homeworld'}),player=game.createPlayer('Veredelung'),entity=game.world.entities.get(player.homeworld),home=entity.market.homeworld;
  player.homeQuest.completed=Object.fromEntries(['H06','H07','H09','H12'].map(id=>[id,{at:0}]));
  home.population=1000;home.workers={basic:100,skilled:30,specialist:20};home.facilities.dock.status='ready';home.facilities.control.status='ready';home.controlLevel=1;
  home.structures=[{id:'solar1',kind:'solar',status:'ready',plot:0},{id:'solar2',kind:'solar',status:'ready',plot:1}];
  if(recipe)home.structures.push({id:'refining',kind:'plant',recipe,buildGroup:industryGroup(recipe),status:'ready',enabled:true,plot:2,progress:0});
  return {game,player,entity,home};
}
const advance=(f,dt)=>{f.game.time+=dt;tickHomeworld(f.game,f.entity,dt);};
const close=f=>f.game.store.close();

test('Sechs konkrete Veredelungen haben korrekte Baugruppen, Klassen und die bestehenden reproduzierbaren Rezeptpreise',()=>{
  assert.deepEqual(Object.fromEntries(ULTRA.map(g=>[g,GOODS[g].base])),{finegold:1143.6,cutdiamonds:2007.3,enricheduranium:1467.9,stableantimatter:3110,refinedexocrystals:2504.6,refinednebulagas:647});
  assert.equal(REFINEMENT_RECIPES.length,6);
  for(const [raw,product] of Object.entries(REFINED_FOR_RAW)){
    assert.equal(GOODS[raw].tier,0);assert(GOODS[product].tier>0);assert.notEqual(raw,product);
    assert.equal(GOODS[product].cls,['enricheduranium','stableantimatter'].includes(product)?'hazard':'normal');
  }
  assert.equal(industryGroup('goldpurifier'),'III');assert.equal(industryGroup('uraniumrefiner'),'IV');assert.equal(industryGroup('antimatterstabilizer'),'V');
  assert.deepEqual(industrySpec('goldpurifier').workers,{basic:4,skilled:4,specialist:0});
  const catalog=priceCatalog();assert.equal(catalog.goods.length,66);assert.equal(catalog.currencies.length,18);assert.equal(priceMarkdown(catalog),priceMarkdown(priceCatalog()));
});

test('Jede Sonderveredelung verbraucht ganze Zutatenzyklen und erzeugt ausschließlich ihren tatsächlichen Output',()=>{
  for(const id of REFINEMENT_RECIPES){
    const f=fixture(id),recipe=RECIPES[id];for(const [g,n] of Object.entries(recipe.in))f.entity.market.goods[g].stock=n;
    advance(f,recipe.time);
    for(const [g,n] of Object.entries(recipe.out)){assert.equal(f.entity.market.goods[g].stock,n,id);assert.equal(f.home.produced[g],n,id);}
    for(const g of Object.keys(recipe.in))assert.equal(f.entity.market.goods[g].stock,0,id);
    const expected=structuredClone(Object.fromEntries(Object.keys(recipe.out).map(g=>[g,f.entity.market.goods[g].stock])));
    advance(f,100);for(const [g,n] of Object.entries(expected))assert.equal(f.entity.market.goods[g].stock,n,id);close(f);
  }
});

test('Spezialistenbedarf und Energie werden tatsächlich zugeteilt, fehlende Qualifikation erzeugt kein Produkt',()=>{
  const f=fixture('uraniumrefiner');f.home.workers.specialist=0;
  for(const [g,n] of Object.entries(RECIPES.uraniumrefiner.in))f.entity.market.goods[g].stock=n;
  advance(f,20);assert.equal(f.entity.market.goods.enricheduranium.stock,0);assert.equal(f.entity.market.goods.uranium.stock,2);
  assert.equal(f.home.allocations.find(a=>a.id==='refining').reason,'Personal fehlt');
  f.home.workers.basic-=2;f.home.workers.specialist=2;advance(f,18);assert.equal(f.entity.market.goods.enricheduranium.stock,1);close(f);
});

test('Erste Veredelungsanlage ist vor ihrem H10-Nachweis baubar und bindet die konkrete Baugruppe III',()=>{
  const f=fixture();f.player.credits=60000;f.entity.market.goods.plates.stock=12;f.entity.market.goods.wires.stock=8;
  assert.equal(f.player.homeQuest.completed.H10,undefined);
  assert.equal(runCommand(f.game,f.player,{cmd:'homeBuild',target:f.entity.id,kind:'plant',recipe:'goldpurifier',plot:2}),undefined);
  assert.equal(f.player.credits,55000);assert.equal(f.entity.market.goods.plates.stock,0);assert.equal(f.entity.market.goods.wires.stock,0);
  advance(f,120);assert.equal(f.home.structures.find(s=>s.recipe==='goldpurifier').status,'ready');close(f);
});

test('Hubs und Fraktionsmärkte fragen Produkte nach, keine ihrer sechs Rohformen',()=>{
  const f=fixture();for(let q=1;q<7;q++)f.game.world.ensureSector(q,0);
  let hubs=0,factions=0;
  for(const entity of f.game.world.entities.values()){
    if(!entity.market||!(entity.type==='hub'||entity.faction))continue;
    for(const raw of Object.keys(REFINED_FOR_RAW))assert(!entity.market.goods[raw]||!canSellTo(entity.market.goods[raw]),`${entity.id}: ${raw}`);
    if(entity.type==='hub'){hubs++;for(const product of ULTRA)assert.equal(entity.market.goods[product].role,'consume');}
    if(entity.faction){factions++;assert.equal(entity.market.goods[FACTIONS[entity.faction].currency].role,'consume');}
  }
  assert(hubs>0&&factions>0);close(f);
});

test('Alle 18 Fraktionszahlungen erhalten den bisherigen Warenwert bis auf die vorgeschriebene Aufrundung',()=>{
  for(const ship of Object.values(FACTION_SHIPS)){
    const old=ship.rawCurrency,newCurrency=ship.currency;
    assert.equal(newCurrency.good,REFINED_FOR_RAW[old.good]);assert.equal(newCurrency.n,refinedAmountFor(old.good,old.n));
    const before=old.n*GOODS[old.good].base,after=newCurrency.n*GOODS[newCurrency.good].base;
    assert(after>=before);assert(after-before<GOODS[newCurrency.good].base);assert.equal(FACTIONS[ship.faction].currency,newCurrency.good);
  }
});

test('Rohformen bleiben zwischen Spielern als echte Waren handelbar',()=>{
  const f=fixture(),buyer=f.game.createPlayer('Rohstoffkäufer'),ship=f.game.shipsOf(buyer.id)[0];
  f.game.ownership.get(f.entity.id).mode='open';f.entity.market.goods.gold.stock=5;buyer.credits=100000;
  f.game.revealAround(buyer,f.entity.x,f.entity.y,1000);ship.dockedAt=f.entity.id;
  const credits=f.player.credits;
  assert.equal(runCommand(f.game,buyer,{cmd:'trade',ship:ship.id,target:f.entity.id,good:'gold',dir:'buy',amount:5}),undefined);
  assert.equal(ship.cargo.gold,5);assert.equal(f.entity.market.goods.gold.stock,0);assert(f.player.credits>credits);close(f);
});

test('Rezeptwechsel kündigt Fortschrittsverlust an und dupliziert weder Zutaten noch Zyklusfortschritt',()=>{
  const f=fixture('goldpurifier');f.entity.market.goods.gold.stock=2;f.entity.market.goods.chemicals.stock=1;advance(f,6);
  assert.equal(f.home.structures[2].progress,6);assert.equal(f.entity.market.goods.gold.stock,2);
  assert.equal(runCommand(f.game,f.player,{cmd:'homeRecipeChange',target:f.entity.id,id:'refining',recipe:'diamondcutter'}),undefined);
  assert.equal(f.home.structures[2].progress,0);f.entity.market.goods.diamond.stock=2;f.entity.market.goods.cutters.stock=1;advance(f,15);
  assert.equal(f.entity.market.goods.cutdiamonds.stock,1);assert.equal(f.entity.market.goods.finegold.stock,0);assert.equal(f.entity.market.goods.gold.stock,2);
  assert.match(runCommand(f.game,f.player,{cmd:'homeRecipeChange',target:f.entity.id,id:'refining',recipe:'antimatterstabilizer'}),/höhere Baugruppe/);close(f);
});

test('Reaktor benötigt reale veredelte Betriebsmittel; Rohuran ersetzt keinen Brennstoff',()=>{
  const f=fixture();f.home.structures=[{id:'reactor',kind:'reactor',status:'ready',plot:0}];
  f.entity.market.goods.uranium.stock=2;f.entity.market.goods.coolant.stock=10;
  advance(f,3600);assert.equal(f.home.energy.generation,12);assert.equal(f.entity.market.goods.uranium.stock,2);assert.equal(f.entity.market.goods.coolant.stock,10);
  f.entity.market.goods.enricheduranium.stock=2;advance(f,3600);assert.equal(f.home.energy.generation,512);
  assert(Math.abs(f.entity.market.goods.enricheduranium.stock)<1e-7);assert(Math.abs(f.entity.market.goods.coolant.stock)<1e-7);assert.equal(f.entity.market.goods.uranium.stock,2);
  advance(f,1);assert.equal(f.home.energy.generation,12);close(f);
});
