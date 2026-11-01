// Isolated real-renderer browser QA. No game database or external service.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import express from 'express';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const app=express();app.use('/shared',express.static('shared'));app.use('/qa',express.static('tests/browser'));app.use(express.static('client'));
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
const base='http://127.0.0.1:'+server.address().port,out=new URL('../docs/qa/space-art/',import.meta.url);
await fs.mkdir(out,{recursive:true});
let browser;const errors=[],failed=[],results=[];
try {
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:1050}});
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.goto(base+'/qa/space-art.html');await page.waitForFunction(()=>window.qaReady,null,{timeout:30000});
 await page.waitForFunction(()=>[...document.querySelectorAll('#images img')].every(i=>i.complete&&i.naturalWidth));
 assert.equal(await page.locator('#images img').count(),103);
 const alpha=await page.evaluate(()=>window.verifyAlpha());
 for(const image of alpha){assert.ok(image.corners.every(a=>a===0),image.key);assert.ok(image.solid>200,image.key);}
 for(const zoom of [1,.32,.1,.035,.034,.007,.0034]){
  const result=await page.evaluate(z=>window.showRuins(z),zoom);results.push({scene:'ruins',zoom,...result});
  assert.equal(result.mode,zoom>=.035?'system':zoom>=.0035?'sector':'galaxy');
  assert.deepEqual(result.keys,Array.from({length:6},(_,i)=>'space_ruins_'+i));
  assert.deepEqual(result.thumbnails,Array.from({length:6},(_,i)=>'/assets/art/space/ruins_'+i+'.png'));
  if(zoom>=.035){assert.equal(result.drawn.filter(f=>f.startsWith('ruins_')).length,6);assert.equal(result.picked.id,'ruins-0');}
  if([1,.32,.035,.034].includes(zoom))await page.screenshot({path:fileURLToPath(new URL('ruins-zoom-'+zoom+'.png',out))});
 }
 await page.evaluate(()=>window.showRuins(1,true));await page.screenshot({path:fileURLToPath(new URL('ruins-orbital.png',out))});
 for(const [kind,pages] of [['planet',2],['station',5],['belt',1]])for(let i=0;i<pages;i++){
  const result=await page.evaluate(([k,p])=>window.showObjects(k,p),[kind,i]);results.push({scene:kind,page:i,...result});
  for(const key of result.keys)assert.ok(result.drawn.includes(key.slice(6)+'.png'),key);
  await page.screenshot({path:fileURLToPath(new URL(kind+'-'+i+'.png',out))});
 }
 for(const [name,fn] of [['sites','showSites'],['cosmos','showCosmos'],['zones','showZones']]){
  const result=await page.evaluate(fn=>window[fn](),fn);results.push({scene:name,...result});
  if(name==='cosmos'){assert.equal(result.drawn.filter(f=>f.startsWith('sun_')).length,6);assert.ok(result.drawn.includes('blackhole_0.png'));assert.ok(result.drawn.includes('blackhole_1.png'));}
  if(name==='zones')assert.equal(result.drawn.filter(f=>f.startsWith('zone_')).length,5);
  await page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});
 }
 await page.setViewportSize({width:800,height:650});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const small=await page.evaluate(()=>window.showRuins(.32));assert.ok(small.drawn.some(f=>f.startsWith('ruins_')));
 await page.screenshot({path:fileURLToPath(new URL('small-viewport.png',out))});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await fs.writeFile(new URL('results.json',out),JSON.stringify({images:103,alphaChecked:alpha.length,results,errors,failed},null,2)+'\n');
 console.log('Browser QA passed: 103 images, 101 alpha sprites, six stages, all object types, zoom/picking, orbitals, cosmos and zones.');
} catch(error) {console.error({errors,failed});throw error;}
finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
