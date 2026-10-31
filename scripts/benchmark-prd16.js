import {performance} from 'node:perf_hooks';
import {Game} from '../server/game.js';
import {startBattle,tickBattle} from '../server/war/battle.js';
const g=new Game(':memory:',{seed:3});
try{
 const a=g.createPlayer('Bench-A'),d=g.createPlayer('Bench-D'),yard=g.world.entities.get('origin_yard');
 const spawn=p=>Array.from({length:6},()=>{const s=g.spawnShip(p,'kreuzer',yard);s.dockedAt=null;s.queue=[];s.x+=p===a?-300:300;return s;});
 const b=startBattle(g,spawn(a),spawn(d)),initial=structuredClone(b),ships=structuredClone(g.ships);
 const results={};
 for(const scale of [1,.5]){const samples=[];for(let round=0;round<6;round++){
  const battle=structuredClone(initial);g.battles=new Map([[battle.id,battle]]);g.ships=structuredClone(ships);let seed=42;const random=Math.random;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const t=performance.now();for(let i=0;i<400;i++)tickBattle(g,battle,.1*scale);const ms=performance.now()-t;Math.random=random;if(round)samples.push(ms);
 }results[scale]={ticks:400,units:12,medianMs:+samples.sort((a,b)=>a-b)[2].toFixed(2),samplesMs:samples.map(x=>+x.toFixed(2))};}
 console.log(JSON.stringify(results,null,2));
}finally{g.store.close();}
