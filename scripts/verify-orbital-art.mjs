// Real map renderer with isolated public fixtures, no game database.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import express from 'express';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const app=express();app.use('/shared',express.static('shared'));app.use('/qa',express.static('tests/browser'));app.use(express.static('client'));
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
const out=new URL('../docs/qa/orbital-art/',import.meta.url);await mkdir(out,{recursive:true});
const errors=[],failed=[],results=[];let browser;
try {
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:1080}});
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.goto('http://127.0.0.1:'+server.address().port+'/qa/space-art.html');
 await page.waitForFunction(()=>window.qaReady,null,{timeout:30000});
 for(const zoom of [1,.5,.32,.1,.035]) {
  const r=await page.evaluate(z=>window.showOrbitalStages(z),zoom);results.push({zoom,...r});
  assert.deepEqual(r.orbitalStages,['broken','small','partial','large','double']);
  assert.equal(r.drawn.filter(f=>f.startsWith('orbital_')).length,16);
  for(const id of ['broken','small','partial','large','double'])for(const side of ['front','back'])assert.ok(r.drawn.includes(`orbital_${id}_${side}.png`));
  await page.screenshot({path:fileURLToPath(new URL('stages-zoom-'+zoom+'.png',out))});
 }
 for(const surface of [0,4,8,16,24,36]) {
  const r=await page.evaluate(n=>window.showOrbitalStages(1,n),surface);
  assert.deepEqual(r.orbitalStages,['broken','small','partial','large','double']);
 }
 const picking=await page.evaluate(()=>window.checkOrbitalPicking());
 assert.equal(picking.outer?.id,'ring-pick');assert.equal(picking.planet?.id,'ring-pick');assert.equal(picking.gap,null);
 assert.equal(picking.partialCrane?.id,'ring-pick');assert.equal(picking.absentHalf,null);
 const edge=await page.evaluate(()=>window.checkOrbitalEdge());
 assert.ok(edge.drawn.includes('orbital_large_front.png'));assert.ok(edge.drawn.includes('orbital_large_back.png'));
 await page.screenshot({path:fileURLToPath(new URL('edge.png',out))});
 const alpha=await page.evaluate(()=>window.verifyAlpha());
 for(const image of alpha){assert.ok(image.corners.every(a=>a===0),image.key);assert.ok(image.solid>200,image.key);}
 const layerCheck=await page.evaluate(async()=>{
  const {getSprite}=await import('/js/assets.js');const c=document.createElement('canvas');c.width=c.height=1024;const x=c.getContext('2d',{willReadFrequently:true});const rows=[];
  for(const stage of ['broken','small','partial','large','double']){
   const sides=[];
   for(const side of ['back','front']){
    x.clearRect(0,0,1024,1024);x.drawImage(getSprite('space_orbital_'+stage+'_'+side),0,0);
    const d=x.getImageData(0,0,1024,1024).data;let wrong=0,center=0;
    for(let y=0;y<1024;y++)for(let xx=0;xx<1024;xx++){const a=d[(y*1024+xx)*4+3];if(side==='back'?y>=512:y<512)wrong+=a;if(xx>=450&&xx<574&&y>=450&&y<574)center+=a;}
    sides.push({side,wrong,center});
   }
   // Inspect the actual artwork, not only which logical layers were requested.
   const occupied=[];
   for(const side of ['back','front']) {
    x.clearRect(0,0,1024,1024);x.drawImage(getSprite('space_orbital_'+stage+'_'+side),0,0);
    const d=x.getImageData(0,0,1024,1024).data;
    for(let y=0;y<1024;y++){let n=0;for(let xx=502;xx<522;xx++)if(d[(y*1024+xx)*4+3]>=100)n++;if(n>=3)occupied.push(y);}
   }
   occupied.sort((a,b)=>a-b);const bands=[];
   for(const y of occupied){const last=bands.at(-1);if(last&&y-last[1]<=12)last[1]=y;else bands.push([y,y]);}
   rows.push({stage,sides,bands});
  }return rows;
 });
 for(const layer of layerCheck)for(const side of layer.sides){assert.equal(side.wrong,0);assert.equal(side.center,0);}
 for(const layer of layerCheck)if(['partial','large','double'].includes(layer.stage))assert.equal(layer.bands.length,layer.stage==='partial'?1:2,layer.stage+' must contain only the outer ring');
 await page.setViewportSize({width:800,height:650});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.evaluate(()=>window.showOrbitalStages(.5));await page.screenshot({path:fileURLToPath(new URL('small-viewport.png',out))});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await writeFile(new URL('results.json',out),JSON.stringify({results,picking,layerCheck,alphaChecked:alpha.length,errors,failed},null,2)+'\n');
 console.log('Orbital browser QA passed: five states, all surfaces, layered alpha, picking, wide bounds and five zoom levels.');
} catch(error){console.error({errors,failed});throw error;}
finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
