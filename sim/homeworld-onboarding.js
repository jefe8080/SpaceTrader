// Reproducible PRD-5 onboarding: actual flights, purchases, transfers and server time.
// node sim/homeworld-onboarding.js [--seed 42] [--db data/prd5/qa-new.db]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { rng } from '../server/worldgen.js';
import {GOODS} from '../shared/goods.js';

export function simulateOnboarding({ seed = 42, dbFile = ':memory:', name = 'Heimat Simulation',continueWith,decisionSeconds=0 } = {}) {
  if (dbFile !== ':memory:' && fs.existsSync(dbFile)) throw new Error('Für die Simulation einen neuen Datenpfad wählen.');
  const originalRandom = Math.random;
  Math.random = rng(seed);
  let game;
  try {
    game = new Game(dbFile, { profile: 'homeworld', seed });
    const player = game.createPlayer(name), home = game.world.entities.get(player.homeworld), ship = game.shipsOf(player.id)[0];
    const stages = [];let decisions=0;
    const command = (cmd, fields = {}) => {
      if(decisionSeconds>0)game.tick(decisionSeconds);decisions++;
      const error = runCommand(game, player, { cmd, target: home.id, ...fields });
      if (error) throw new Error(`${cmd}: ${error}`);
    };
    const until = (condition, label, maximum = 3600) => {
      for (let i = 0; i < maximum && !condition(); i++) game.tick(1);
      if (!condition()) throw new Error(`Zeitlimit: ${label}`);
    };
    const go = (target) => { command('order', { ships: [ship.id], order: { t: 'goto', target: target.id } }); until(()=>ship.dockedAt===target.id&&!ship.queue.length, 'Flug '+target.name); };
    const claim = (id) => { command('homeQuestComplete', { quest: id }); stages.push({ id, seconds: game.time, credits: Math.round(player.credits), ships: game.shipsOf(player.id).length }); };
    const repair = (facility) => { command('homeRepair',{facility}); until(()=>home.market.homeworld.facilities[facility].status==='ready',facility); };
    const deliver = (good, quantity) => {
      const sources = [...game.world.entities.values()].filter(e=>e.system===home.system&&e.market?.goods[good]?.role==='produce');
      const source=sources.sort((a,b)=>Math.hypot(a.x-home.x,a.y-home.y)-Math.hypot(b.x-home.x,b.y-home.y))[0];
      if(!source)throw new Error('Keine Quelle: '+good);
      while(quantity>0){
        go(source);
        const before=ship.cargo[good]||0;
        command('trade',{target:source.id,ship:ship.id,good,amount:Math.min(30,quantity),dir:'buy'});
        const loaded=(ship.cargo[good]||0)-before;quantity-=loaded;
        go(home);command('trade',{ship:ship.id,good,amount:loaded,dir:'sell'});
      }
    };
    go(home);command('homeLand');claim('H00');repair('dock');claim('H01');
    repair('waterworks');repair('foodplant');deliver('ice',30);deliver('grain',20);
    until(()=>home.market.homeworld.produced.water>=20&&home.market.homeworld.produced.food>=10,'Grundproduktion');claim('H02');
    const wreck=game.world.entities.get(player.homeQuest.salvage.wreck);
    go(wreck);command('relicSalvage',{target:wreck.id,ship:ship.id});go(home);command('relicDeliver',{ship:ship.id});
    until(()=>home.market.homeworld.facilities.workshop.status==='ready','Werkstatt');claim('H04');
    repair('control');repair('fueldepot');
    command('routeSave',{name:'Lokale Eisversorgung',stops:[{targetId:home.id,actions:[]}],assign:[]});claim('H03');
    until(()=>home.market.homeworld.suppliedSeconds>=600,'Versorgungsbetrieb');claim('H05');
    repair('refinery');repair('smelter');deliver('crude',44);deliver('ore',44);
    until(()=>home.market.homeworld.produced.ingots>=40,'Barrenproduktion');claim('H06');
    const result = { seed, decisionSeconds,decisions,stages, serverSeconds: game.time, credits: Math.round(player.credits),
      produced: home.market.homeworld.produced, stock: Object.fromEntries(Object.entries(home.market.goods).filter(([,s])=>s.stock>0).map(([g,s])=>[g,Math.round(s.stock*100)/100])),
      grants: home.market.homeworld.grants, relic: player.relic, population: home.market.homeworld.population,
      civilianMoney:home.market.homeworld.civil,
      publicMarkets:[...game.world.entities.values()].filter(e=>e.market&&!e.market.homeworld).length,
      publicManufacturedStock:Object.fromEntries(Object.keys(home.market.goods).filter(g=>GOODS[g].tier>0).map(g=>[g,[...game.world.entities.values()].filter(e=>e.market&&!e.market.homeworld).reduce((sum,e)=>sum+(e.market.goods[g]?.stock||0),0)]).filter(([,n])=>n>0)) };
    if(continueWith)result.advanced=continueWith({game,player,home,ship,stages});
    game.save();
    return result;
  } finally { if (game?.store.db.open) game.store.close(); Math.random = originalRandom; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option=(name,fallback)=>{const index=process.argv.indexOf('--'+name);return index<0?fallback:process.argv[index+1];};
  console.log(JSON.stringify(simulateOnboarding({seed:Number(option('seed',42)),dbFile:option('db',':memory:'),decisionSeconds:Number(option('decision-seconds',0))}),null,2));
}
