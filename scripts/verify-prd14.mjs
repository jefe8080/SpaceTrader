import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PRD14_URL||'http://localhost:3014',out=path.resolve('docs/qa/prd14');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
const results=[];
const city=async id=>{
 await page.waitForFunction(async id=>{const {getPlanetView,scene}=await import('/js/planetside.js'),v=getPlanetView();return v?.entity?.id===id&&v.selected===scene.selected&&!v.loading&&!v.flight&&document.getElementById('planetStatus').hidden;},id);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.evaluate(async()=>{(await import('/js/planetside.js')).getPlanetView().render(0);});
};
try{
 for(const [width,height] of [[1440,900],[390,844]]){
  await page.setViewportSize({width,height});await page.goto(base+'/dev/prd14.html');await page.waitForFunction(()=>window.prd14Ready);
  await city('qa-home');
  await page.locator('[data-act="housingUpgrade"]').first().click();assert.equal((await page.evaluate(()=>window.qaCommands)).at(-1).cmd,'housingUpgrade');
  await page.screenshot({path:path.join(out,`housing-${width}.png`)});
  await page.evaluate(()=>window.prd14.normal());await city('qa-normal');await page.waitForFunction(()=>document.querySelector('#planetPanel')?.textContent.includes('800 Wohnplätze'));
  await page.screenshot({path:path.join(out,`infrastructure-${width}.png`)});
  await page.evaluate(()=>window.prd14.economy());
  await page.locator('#questBox [data-q="select"][data-quest="second"]').click();
  assert((await page.locator('#questBox').textContent()).includes('Heimat'));
  await page.locator('#questBox [data-q="select"][data-quest="first"]').click();
  await page.locator('#questBox [data-q="deliver"]').click();assert.equal((await page.evaluate(()=>window.qaCommands)).at(-1).quest,'first');
  await page.evaluate(()=>window.prd14.economy());await page.locator('#details [data-section="trade"]').evaluate(e=>e.open=true);
  assert((await page.locator('#details').textContent()).includes('Lokale Verkaufseinnahmen gesamt: 75'));
  await page.locator('#details h4').filter({hasText:'Lokaler Absatz'}).evaluate(e=>e.scrollIntoView({block:'center'}));
  await page.screenshot({path:path.join(out,`sales-${width}.png`)});
  await page.locator('#details [data-section="management"]').evaluate(e=>e.open=true);
  assert((await page.locator('#details').textContent()).includes('Ziviles Konsumbudget: 321'));
  await page.locator('#details p').filter({hasText:'Ziviles Konsumbudget:'}).evaluate(e=>e.scrollIntoView({block:'center'}));
  await page.screenshot({path:path.join(out,`economy-${width}.png`)});
  await page.evaluate(()=>window.prd14.places());await page.locator('[data-filter="type"]').selectOption('belt:ore');await page.locator('[data-filter="good"]').selectOption('ore');
  assert.equal(await page.locator('#tradeRows tr').count(),1);assert.equal(await page.locator('#tradeRows [data-f="buy"]').count(),0);
  assert((await page.locator('#tradeRows').textContent()).includes('Erzfeld'));
  await page.screenshot({path:path.join(out,`places-${width}.png`)});
  await page.locator('[data-f="close"]').click();await page.evaluate(()=>window.prd14.level());
  assert((await page.locator('.level-up-dialog').textContent()).includes('+6 Nebenquestslots'));assert.equal(await page.locator('.level-up-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  await page.screenshot({path:path.join(out,`level-up-${width}.png`)});await page.locator('[data-level-close]').click();
  await page.evaluate(()=>window.prd14.refresh());assert.equal(await page.locator('.level-up-dialog').evaluate(e=>e.open),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  results.push({width,height,checks:'housing, infrastructure, quest selection and delivery ID, budgets, exact sales, ore filter without trade actions, popup close and no repeated popup',errors:[...errors]});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'browser.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
