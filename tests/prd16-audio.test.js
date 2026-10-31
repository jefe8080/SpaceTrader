import {test} from 'node:test';import assert from 'node:assert/strict';
test('Attack tone respects mute and SFX volume; concurrent new battles each sound once',async()=>{
 const saved=Object.fromEntries(['window','localStorage','addEventListener','removeEventListener','performance'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 let oscillators=0;const gains=[];const param=()=>({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
 const node=()=>({connect(target){return target;}});
 class Context{constructor(){this.currentTime=1;this.sampleRate=8;this.destination=node();this.state='running';}createGain(){const n={...node(),gain:param()};gains.push(n);return n;}createConvolver(){return node();}createBuffer(ch,n){return {getChannelData:()=>new Float32Array(n)};}createOscillator(){oscillators++;return {...node(),frequency:param(),start(){},stop(){}};}createBiquadFilter(){return {...node(),frequency:param()};}}
 try{
 Object.assign(globalThis,{window:{AudioContext:Context},localStorage:{getItem:()=>'{"music":0}',setItem(){}},addEventListener(){},removeEventListener(){}});Object.defineProperty(globalThis,'performance',{value:{now:()=>1000},configurable:true});
 const audio=await import('../client/js/audio.js');audio.sfx('attackWarning');assert.equal(oscillators,4);audio.sfx('attackWarning');assert.equal(oscillators,8,'separate simultaneous attacks');
 audio.setPref('sfx',.25);assert.equal(gains[2].gain.value,.15);
 audio.setPref('mute',true);assert.equal(gains[0].gain.value,0);audio.sfx('attackWarning');assert.equal(oscillators,8);
 audio.setPref('sfx',0);audio.setPref('mute',false);audio.sfx('attackWarning');assert.equal(oscillators,8);
 }finally{for(const [key,descriptor]of Object.entries(saved))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});
