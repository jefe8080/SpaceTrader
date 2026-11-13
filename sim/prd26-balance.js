import fs from 'node:fs';import {Game} from '../server/game.js';import {rng} from '../server/worldgen.js';import {SHIP_TYPES} from '../shared/config.js';import {startBattle,tickBattle} from '../server/war/battle.js';
const scenarios=[['Fregatten/Zerstörer',['fregatte','fregatte','fregatte'],['zerstoerer']],['Bomber/Zerstörer',Array(12).fill('bomberstaffel'),['zerstoerer']],['Ion/zwei Kreuzer',['fx_tech'],['kreuzer','kreuzer']],['Bomber/Eskorte',Array(14).fill('bomberstaffel'),['zerstoerer','korvette','korvette']]];
const result=[],random=Math.random;
try{for(const [name,left,right] of scenarios)for(const swap of [false,true])for(const stance of ['defensive','offensive']){
 const runs=[],a=swap?right:left,b=swap?left:right;
 for(let seed=1;seed<=8;seed++){
  Math.random=rng(seed);const game=new Game(':memory:',{seed:77});
  try{const pa=game.createPlayer('A'),pb=game.createPlayer('B'),yard=game.world.entities.get('origin_yard');const mk=(p,types,dx)=>types.map(type=>{const s=game.spawnShip(p,type,yard);Object.assign(s,{dockedAt:null,queue:[],x:yard.x+dx,y:yard.y+2000,tactic:{stance,retreat:{hull:.25,weaponsOut:true,losses:0,systems:false}}});return s;});
   const battle=startBattle(game,mk(pa,a,0),mk(pb,b,400));for(let i=0;i<9000&&!battle.ended;i++)tickBattle(game,battle,.1);runs.push({seed,winner:battle.ended?.winner||null,why:battle.ended?.why||null,open:!battle.ended,seconds:Math.round(battle.t)});
  }finally{game.store.close();}
 }
 const row={name,swap,stance,costA:a.reduce((n,t)=>n+SHIP_TYPES[t].price,0),costB:b.reduce((n,t)=>n+SHIP_TYPES[t].price,0),runs};result.push(row);console.log(name,swap,stance,runs.filter(r=>r.winner==='A').length+':'+runs.filter(r=>r.winner==='B').length);
}}finally{Math.random=random;}
fs.mkdirSync('docs/qa/prd26',{recursive:true});fs.writeFileSync('docs/qa/prd26/balance.json',JSON.stringify(result,null,2));
