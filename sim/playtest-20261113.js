// Additional playtest probes. Isolated worlds; never opens an existing save.
import fs from 'node:fs';
import {Game} from '../server/game.js';
import {simulateOnboarding} from './homeworld-onboarding.js';
import {rng} from '../server/worldgen.js';
import {startBattle,tickBattle} from '../server/war/battle.js';
import {SHIP_TYPES,GOODS,RECIPES,buyPrice,sellPrice} from '../shared/config.js';
import {maxHull} from '../shared/combat.js';
const out='docs/qa/playtest-2026-11-13';
fs.mkdirSync(out,{recursive:true});
const results={onboarding:[],battles:[],recipes:[]};
for(const seed of (process.argv.includes('--combat-only')?[]:[7,77,2026])){
  const r=simulateOnboarding({seed,decisionSeconds:30});
  results.onboarding.push({seed,stages:r.stages,credits:r.credits,stock:r.stock});
  console.log('onboarding',seed,r.serverSeconds);
}
const scenarios=[
  ['mirror',['korvette'],['korvette']],
  ['frigates-destroyer',['fregatte','fregatte','fregatte'],['zerstoerer']],
  ['squadrons-cruiser',['abfangstaffel','abfangstaffel','abfangstaffel','abfangstaffel','bomberstaffel','bomberstaffel'],['kreuzer']],
  ['ion-cruiser',['fx_tech'],['kreuzer']],
  ['ion-equal-budget',['fx_tech'],['kreuzer','kreuzer']],
  ['bombers-destroyer',Array(20).fill('bomberstaffel'),['zerstoerer']],
  ['escort',['korvette','korvette'],['lastesel','korvette']],
  ['civilian',['korvette'],['lastesel']],
];
const original=Math.random;
try{
  for(const [name,a,b] of scenarios){
    const runs=[];
    for(let seed=1;seed<=10;seed++){
      Math.random=rng(seed);
      const game=new Game(':memory:',{seed:77});
      try{
        const pa=game.createPlayer('A'),pb=game.createPlayer('B'),yard=game.world.entities.get('origin_yard');
        const spawn=(p,types,dx)=>types.map(type=>{const s=game.spawnShip(p,type,yard);Object.assign(s,{dockedAt:null,queue:[],x:yard.x+dx,y:yard.y+2000});return s;});
        const A=spawn(pa,a,0),B=spawn(pb,b,400);
        // Both sides use their actual default policies, without asymmetric overrides.
        const battle=startBattle(game,A,B);
        for(let i=0;i<18000&&!battle.ended;i++)tickBattle(game,battle,.05);
        const hull=ships=>ships.reduce((sum,s)=>sum+(game.ships.has(s.id)?s.dmg.hull:0),0)/ships.reduce((sum,s)=>sum+maxHull(s.type),0);
        runs.push({seed,ended:battle.ended||null,tacticalSeconds:Math.round(battle.t),hullA:hull(A),hullB:hull(B),owners:A.concat(B).map(s=>({type:s.type,owner:s.owner,exists:game.ships.has(s.id)}))});
      }finally{game.store.close();}
    }
    results.battles.push({name,a,b,costA:a.reduce((n,t)=>n+SHIP_TYPES[t].price,0),costB:b.reduce((n,t)=>n+SHIP_TYPES[t].price,0),runs});
    console.log('battle',name,runs.map(r=>r.ended?.winner||r.ended?.why||'open').join(','));
  }
}finally{Math.random=original;}
// Controlled same-location quotes, NOT whole-chain profitability or market availability.
for(const [id,r] of Object.entries(RECIPES)){
  const quotes=[.2,.5,.8].map(fill=>{
    const slot={stock:100*fill,cap:100,mod:1};
    const input=Object.entries(r.in).reduce((sum,[g,n])=>sum+n*buyPrice(g,slot),0);
    const revenue=Object.entries(r.out).reduce((sum,[g,n])=>sum+n*sellPrice(g,slot),0);
    return {fill,input,revenue,margin:revenue-input};
  });
  results.recipes.push({id,in:r.in,out:r.out,quotes});
}
fs.writeFileSync(out+(process.argv.includes('--combat-only')?'/combat.json':'/probes.json'),JSON.stringify(results,null,2));
