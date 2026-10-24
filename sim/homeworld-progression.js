// Optimistic single-player planner. Every purchase, flight, production cycle,
// quest reward, passenger and hull uses the real server. No injected resources.
import fs from 'node:fs';
import {simulateOnboarding} from './homeworld-onboarding.js';
import {runCommand} from '../server/handlers/index.js';
import {HOME_BUILDINGS,industrySpec,availableHomeStock} from '../shared/homeworld.js';
import {GOODS,RECIPES,shipStats,freeFor,SHIP_TYPES,sellPrice,buyPrice} from '../shared/config.js';
import {MODULE_RECIPES} from '../shared/module-production.js';
import {QUEST_DELIVERIES} from '../shared/advanced-homequests.js';
import {siteError} from '../server/colonies.js';
import {Game} from '../server/game.js';
import {rng} from '../server/worldgen.js';
import {evaluateProgression} from './progression-report.js';

const events=[];
function progress({game,player:p,home:e,ship}){
  if(!fs.existsSync('data/prd5/progression-h06.db')){game.save();game.store.db.prepare('VACUUM INTO ?').run('data/prd5/progression-h06.db');}
  const h=e.market.homeworld,started=game.time;let current=ship,earned=0,quests=0,depth=0,funding=false,exports=0;
  const making=new Set();
  const dependsOnMaking=(g,seen=new Set())=>{if(making.has(g))return true;if(seen.has(g))return false;seen.add(g);const recipe=Object.values(RECIPES).find(r=>r.out[g]);return Object.keys(recipe?.in||{}).some(input=>dependsOnMaking(input,seen));};
  const log=(action,extra={})=>{const row={seconds:game.time,action,credits:Math.round(p.credits),...extra};events.push(row);console.error(JSON.stringify(row));if(/^H\d\d$/.test(action)){game.save();const snapshot=`data/prd5/progression-${action}.db`;if(!fs.existsSync(snapshot))game.store.db.prepare('VACUUM INTO ?').run(snapshot);}};
  const cmd=(name,args={})=>{if(!process.argv.includes('--quick'))game.tick(2);const error=runCommand(game,p,{cmd:name,target:e.id,...args});if(error)throw new Error(`${name}: ${error}`);};
  const tick=(seconds=5)=>{if(game.time>144000)throw new Error('Fortschritt überschreitet 40 Stunden.');game.tick(seconds);};
  const until=(condition,label,limit=14400)=>{const end=game.time+limit;while(!condition()&&game.time<end)tick();if(!condition())throw new Error(`Zeitlimit ${label}`);};
  const go=target=>{
    if(current.dockedAt===target.id&&!current.queue.length)return;
    cmd('manualShip',{ship:current.id});
    if(!game.isKnown(p,target)){cmd('order',{ships:[current.id],order:{t:'move',x:target.x,y:target.y}});until(()=>!current.queue.length,'Erkundungsflug '+target.id);}
    cmd('order',{ships:[current.id],order:{t:'goto',target:target.id}});until(()=>current.dockedAt===target.id&&!current.queue.length,'Flug '+target.id);
  };
  const transfer=(target,good,n,dir)=>{cmd('trade',{target:target.id,ship:current.id,good,amount:Math.ceil(n),dir});tick(1);};
  const pause=()=>{
    for(const [id,b] of [...Object.entries(h.facilities),...(h.structures||[]).map(b=>[b.id,b])]){
      if(b.status!=='ready'||['dock','control'].includes(id)||['solar','housing','silo'].includes(b.kind))continue;
      if(b.enabled!==false)cmd('homeOperation',{id,enabled:false,priority:50});
    }tick();
  };
  const active=(id,enabled=true)=>cmd('homeOperation',{id,enabled,priority:70});
  const stock=g=>availableHomeStock(e.market,g);
  function finance(amount){
    if(p.credits>=amount)return;
    if(current.modules?.includes('cabin')){go(e);cmd('moduleRemove',{ship:current.id,module:'cabin',destination:'warehouse'});}
    for(const [g,n] of Object.entries(current.cargo))if(n>0){go(e);transfer(e,g,n,'sell');}
    while(p.credits<amount){
      if(!funding){
        const products=['finegold','electronics','plates','ingots','fuel'];let sale;
        for(const good of products){
          if(dependsOnMaking(good))continue;
          const recipe=Object.entries(RECIPES).find(([,r])=>r.out[good])?.[0];
          if(!h.facilities[recipe]&&!h.structures.some(b=>b.recipe===recipe))continue;
          const buyers=[...game.world.entities.values()].filter(x=>x!==e&&!x.market?.homeworld&&x.market?.goods[good]&&['consume','trade'].includes(x.market.goods[good].role)&&x.market.goods[good].cap-x.market.goods[good].stock>=20&&(x.market.economy?.cash||0)>sellPrice(good,x.market.goods[good])*20);
          buyers.sort((a,b)=>sellPrice(good,b.market.goods[good])/(Math.hypot(b.x-e.x,b.y-e.y)+10000)-sellPrice(good,a.market.goods[good])/(Math.hypot(a.x-e.x,a.y-e.y)+10000));
          if(buyers[0]){sale={good,buyer:buyers[0]};break;}
        }
        if(sale){
          funding=true;
          try{
            const before=p.credits;make(sale.good,stock(sale.good)+20);go(e);transfer(e,sale.good,20,'buy');
            const visited=new Set();
            while(current.cargo[sale.good]>0&&visited.size<8){
              const buyers=[...game.world.entities.values()].filter(x=>x!==e&&!visited.has(x.id)&&!x.market?.homeworld&&x.market?.goods[sale.good]&&x.market.goods[sale.good].stock<x.market.goods[sale.good].cap&&(x.market.economy?.cash||0)>sellPrice(sale.good,x.market.goods[sale.good]));
              buyers.sort((a,b)=>sellPrice(sale.good,b.market.goods[sale.good])/(Math.hypot(b.x-current.x,b.y-current.y)+10000)-sellPrice(sale.good,a.market.goods[sale.good])/(Math.hypot(a.x-current.x,a.y-current.y)+10000));if(!buyers[0])break;
              go(buyers[0]);visited.add(buyers[0].id);game.trade(current,buyers[0],sale.good,current.cargo[sale.good],'sell',0,{manual:true});tick(1);
            }
            go(e);if(current.cargo[sale.good])transfer(e,sale.good,current.cargo[sale.good],'sell');
            exports++;log('Export',{good:sale.good,net:Math.round(p.credits-before),exports});
          }
          finally{funding=false;}
          continue;
        }
      }
      let offers=[...game.world.entities.values()].filter(x=>x.market&&x.sector===e.sector).flatMap(giver=>(giver.market.board?.offers||[]).filter(o=>o.type==='courier').map(o=>({giver,o,score:o.reward.cr/(o.effort+Math.hypot(current.x-giver.x,current.y-giver.y)/shipStats(current).speed/60+1)})));
      offers.sort((a,b)=>b.score-a.score);const choice=offers[0];
      if(!choice){tick(60);continue;}
      go(choice.giver);cmd('questAccept',{target:choice.giver.id,ship:current.id,quest:choice.o.id});
      const reward=choice.o.reward.cr;
      for(let steps=0;p.quest&&steps<5;steps++)go(game.world.entities.get(p.quest.state==='pickup'?p.quest.pickup:p.quest.dest));
      if(p.quest)throw new Error('Kurierauftrag endet nicht.');
      earned+=reward;quests++;
    }
    go(e);log('Finanzierung',{earned,quests});
  }
  function raw(g,n){
    const required=Math.max(0,n-stock(g));if(!required)return;
    if(GOODS[g].cls==='hazard'&&!current.modules?.includes('shielded')){ensureModule('shielded');go(e);cmd('moduleInstall',{ship:current.id,module:'shielded',source:'warehouse'});}
    let left=required;
    while(left>1e-6){
      const sources=[...game.world.entities.values()].filter(x=>x!==e&&!x.market?.homeworld&&x.market?.goods[g]?.role==='produce'&&x.market.goods[g].stock>=1);
      sources.sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y));
      if(!sources.length)throw new Error('Keine reale Rohstoffquelle '+g);
      const source=sources[0];
      const n=Math.min(Math.ceil(left),freeFor(current,g),Math.floor(source.market.goods[g].stock));
      if(n<1)throw new Error('Kein Frachtraum für '+g);
      finance(Math.max(1000,n*buyPrice(g,{...source.market.goods[g],stock:Math.max(0,source.market.goods[g].stock-n)})+500));go(source);
      const before=current.cargo[g]||0;transfer(source,g,n,'buy');const loaded=(current.cargo[g]||0)-before;
      go(e);transfer(e,g,loaded,'sell');left-=loaded;
    }
  }
  function ingredients(goods){let passes=0;while(Object.entries(goods).some(([g,n])=>stock(g)<n)){if(++passes>20)throw new Error('Zutatenplan konvergiert nicht.');for(const [g,n] of Object.entries(goods))make(g,n);}}
  function construction(kind,recipe,parent){
    go(e);pause();const spec=kind==='plant'?industrySpec(recipe):HOME_BUILDINGS[kind];
    // Preserve real working capital once expensive raw refining inputs are
    // available. Spending the last credits on a building strands procurement.
    const workingCapital=p.homeQuest.completed.H10?20000:2500;
    if(kind!=='land'&&!spec.parent&&(h.structures||[]).filter(b=>b.plot!==null&&b.plot!==undefined).length>=h.plots)construction('land');
    ingredients(spec.goods);finance(spec.credits+workingCapital);ingredients(spec.goods);go(e);pause();
    if(kind!=='land'&&!spec.parent&&h.structures.filter(b=>b.plot!==null&&b.plot!==undefined).length>=h.plots){construction('land');ingredients(spec.goods);finance(spec.credits+workingCapital);go(e);pause();}
    go(e);pause();cmd('homeBuild',{kind,recipe,parent:parent?.id});
    until(()=>!h.projects.some(j=>['construction','upgrade','land'].includes(j.kind)),'Bau '+kind);
    log('Bau',{kind,recipe});return kind==='plant'?h.structures.find(b=>b.recipe===recipe):h.structures.find(b=>b.kind===kind);
  }
  const building=kind=>h.structures?.find(b=>b.kind===kind||b.upgrades?.includes(kind));
  function ensureModule(module){
    if((e.market.moduleInventory?.[module]||0)>0)return;
    const bench=building('moduleBench')||construction('moduleBench');ingredients(MODULE_RECIPES[module].goods);go(e);pause();active(bench.id);tick();
    cmd('homeModuleCraft',{module,study:false});until(()=>!h.projects.some(j=>j.kind==='module'),'Modul '+module);
  }
  function staff(spec){
    const needS=spec.workers?.specialist||0,needF=spec.workers?.skilled||0;
    if(h.workers.specialist<needS){
      const school=building('school')||construction('school');
      if(!school.upgrades?.includes('academy'))construction('academy',null,school);
      make('water',60);make('food',30);go(e);pause();active(school.id);tick();cmd('homeTrain',{qualification:'specialist'});
      until(()=>!h.projects.some(j=>j.kind==='training'),'Spezialistenausbildung');
    }
    if(h.workers.skilled<needF+2){
      const school=building('school')||construction('school');make('water',60);make('food',30);go(e);pause();active(school.id);tick();cmd('homeTrain',{qualification:'skilled'});
      until(()=>!h.projects.some(j=>j.kind==='training'),'Fachausbildung');
    }
  }
  function factory(recipe){
    if(h.facilities[recipe]){
      const b=h.facilities[recipe];if(!b.restored&&!funding&&!['waterworks','foodplant'].includes(recipe)&&p.credits>=7250&&stock('ingots')>=6){go(e);pause();cmd('homeRestore',{facility:recipe});until(()=>!h.projects.some(j=>j.kind==='restore'),'Wiederherstellung');}
      return recipe;
    }
    let b=h.structures.find(b=>b.recipe===recipe);if(!b){const spec=industrySpec(recipe);if(spec.facility&&!building(spec.facility))construction(spec.facility);if(spec.power>=32&&h.structures.filter(b=>b.kind==='solar').length<2)construction('solar');staff(spec);b=construction('plant',recipe);}return b.id;
  }
  function make(g,n){
    if(stock(g)>=n)return;
    if(++depth>35)throw new Error('Produktionszyklus bei '+g);
    if(making.has(g))throw new Error('Rekursiver Herstellungsplan '+g);making.add(g);
    try{
      const entry=Object.entries(RECIPES).find(([,r])=>r.out[g]);
      if(!entry){raw(g,n);return;}
      const [recipe,r]=entry,id=factory(recipe),margin=['water','food'].includes(g)?n*.25+10:['clothing','medicine','consumer'].includes(g)?n*.1+2:0,cycles=Math.ceil((n-stock(g)+margin)/r.out[g]);
      ingredients(Object.fromEntries(Object.entries(r.in).map(([input,qty])=>[input,qty*cycles])));
      go(e);pause();active(id);until(()=>stock(g)>=n,'Produktion '+g);active(id,false);tick();
    }finally{depth--;making.delete(g);}
  }
  function quest(id){go(e);cmd('homeQuestComplete',{quest:id});log(id,{population:h.population});}
  function deliverQuest(id){for(const [g,total] of Object.entries(QUEST_DELIVERIES[id]||{})){const n=total-(h.questDeliveries?.[id]?.[g]||0);if(n<=0)continue;make(g,n);go(e);cmd('homeQuestDeliver',{quest:id,good:g,amount:n});}}
  function supplies(){make('water',160);make('food',80);}
  try{
    go(e);pause();if(p.relic.location.kind!=='ship'){active('workshop');tick();cmd('relicWork',{ship:current.id,kind:'install'});until(()=>!p.relic.operation,'Antriebseinbau');pause();}
    if(!p.homeQuest.completed.H07){
    construction('school');const school=building('school');make('water',60);make('food',30);active(school.id);tick();cmd('homeTrain',{qualification:'skilled'});until(()=>!h.projects.some(j=>j.kind==='training'),'erste Ausbildung');
    construction('solar');
    make('plates',stock('plates')+Math.max(0,40-(h.produced.plates||0)));make('wires',20);go(e);pause();active(school.id);tick();quest('H07');
    }
    if(!p.homeQuest.completed.H08){
    deliverQuest('H08');go(e);pause();
    const donated=game.shipsOf(p.id).find(s=>s.id!==current.id);if(!donated)throw new Error('Kein realer Expeditionsspatz');
    current=donated;go(e);for(const [g,n] of Object.entries(current.cargo))transfer(e,g,n,'sell');
    current=ship;cmd('manualShip',{ship:ship.id});cmd('homeOrbital',{large:false,ship:donated.id,confirmed:true});until(()=>h.orbital.small,'kleiner Ring');quest('H08');
    }
    if(!p.homeQuest.completed.H09){construction('researchWorkshop');deliverQuest('H09');go(game.world.entities.get(p.homeQuest.sites.H09));cmd('homeArchiveVisit',{target:current.dockedAt,ship:current.id});quest('H09');}
    if(!p.homeQuest.completed.H10){make('finegold',10);quest('H10');}supplies();
    if(!p.homeQuest.completed.H11){
    construction('housing');ensureModule('cabin');go(e);if(current.modules?.includes('shielded'))cmd('moduleRemove',{ship:current.id,module:'shielded',destination:'warehouse'});
    while(h.population<250){
      go(e);finance(3000);cmd('moduleInstall',{ship:current.id,module:'cabin',source:'warehouse'});
      const source=[...game.world.entities.values()].filter(x=>x!==e&&x.kind==='planet'&&x.market?.economy?.population>100).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
      go(source);transfer(source,'workers',Math.min(30,250-h.population),'buy');go(e);transfer(e,'workers',current.cargo.workers,'sell');cmd('moduleRemove',{ship:current.id,module:'cabin',destination:'warehouse'});
    }
    if(e.market.moduleInventory?.shielded)cmd('moduleInstall',{ship:current.id,module:'shielded',source:'warehouse'});
    supplies();until(()=>h.fullSupplySeconds>=1800,'Grundversorgung');quest('H11');
    }
    if(!p.homeQuest.completed.H12){if(!building('researchCenter'))construction('researchCenter',null,building('researchWorkshop'));deliverQuest('H12');quest('H12');}
    log('H13-Materialphase');ingredients({plates:100,machinery:20,habitats:4});finance(110000);
    const site=[...game.world.entities.values()].filter(x=>x.ruinsSite&&!siteError(game,p,x)).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
    go(site);cmd('colonySurvey',{target:site.id,ship:current.id});
    for(const [g,total] of Object.entries({plates:100,machinery:20,habitats:4})){
      let left=total;while(left){go(e);const n=Math.min(left,freeFor(current,g));transfer(e,g,n,'buy');go(site);cmd('colonyDeliver',{target:site.id,good:g,amount:n});left-=n;}
    }
    go(e);ingredients(SHIP_TYPES.spatz.build);go(e);pause();cmd('homeOrbitalBuild',{type:'spatz'});until(()=>h.orbital.inventory.length,'Expeditionsrumpf');cmd('homeOrbitalClaim',{id:h.orbital.inventory[0].id});
    const expedition=game.shipsOf(p.id).find(s=>s.id!==ship.id);current=expedition;cmd('manualShip',{ship:current.id});
    cmd('moduleInstall',{ship:current.id,module:'cabin',source:'warehouse'});transfer(e,'workers',20,'buy');go(site);
    current=ship;go(site);cmd('colonyFound',{target:site.id,ship:expedition.id,confirmed:true});until(()=>!!p.homeQuest.firstColony,'Expeditionsaufbau');quest('H13');
    return {completed:true,seconds:game.time,elapsed:game.time-started,earned,quests,exports,credits:Math.round(p.credits),produced:h.produced,
      worlds:[...game.world.entities.values()].filter(x=>x.market?.homeworld?.owner===p.id).map(x=>({id:x.id,population:x.market.homeworld.population,workers:x.market.homeworld.workers,plots:x.market.homeworld.plots,controlLevel:x.market.homeworld.controlLevel,grants:x.market.homeworld.grants,founding:x.market.homeworld.founding})),
      ships:game.shipsOf(p.id).map(s=>({id:s.id,type:s.type,modules:s.modules,relicSpeed:s.relicSpeed,dockedAt:s.dockedAt})),events};
  }catch(error){log('FEHLER',{message:error.message});return {completed:false,seconds:game.time,earned,quests,error:error.message,allocations:h.allocations,stock:Object.fromEntries(Object.entries(e.market.goods).filter(([g,s])=>s.stock>0&&GOODS[g].cls!=='passenger').map(([g,s])=>[g,s.stock])),events};}
}
let result;
const resumeIndex=process.argv.indexOf('--resume');
if((process.argv.includes('--quick')||resumeIndex>=0)&&fs.existsSync('data/prd5/progression-h06.db')){
  // Debug reruns start from the unchanged real H06 checkpoint; only the full
  // uninterrupted run is accepted as a final progression timing result.
  fs.copyFileSync(resumeIndex>=0?process.argv[resumeIndex+1]:'data/prd5/progression-h06.db','data/prd5/progression-debug.db');
  const game=new Game('data/prd5/progression-debug.db',{profile:'homeworld'}),player=[...game.players.values()][0];Math.random=rng(42);
  try{result={debugResume:true,advanced:progress({game,player,home:game.world.entities.get(player.homeworld),ship:game.shipsOf(player.id)[0]})};}finally{game.close();}
}else result=simulateOnboarding({seed:42,decisionSeconds:30,continueWith:progress});
if(!result.debugResume){
  result.corridors=evaluateProgression(result);
}
fs.mkdirSync('docs/qa/prd5-u17',{recursive:true});fs.writeFileSync('docs/qa/prd5-u17/progression.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result.advanced,null,2));if(!result.advanced.completed||Object.values(result.corridors||{}).some(c=>!c.accepted))process.exitCode=1;
