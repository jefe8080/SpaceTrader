
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PRD10_URL||'http://localhost:3010',out=new URL('../docs/qa/prd10/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto(base+'/api/status');
 await page.setContent('<body style="margin:0;background:#080e19"><canvas id="gallery" width="1440" height="1080"></canvas></body>');
 await page.evaluate(async()=>{
  const {loadAssets,getSprite}=await import('/js/assets.js');await loadAssets();
  const {drawPlanetExterior}=await import('/js/planetExterior.js');
  const {PLANET_TYPES}=await import('/shared/config.js');
  const c=document.getElementById('gallery'),ctx=c.getContext('2d');
  ctx.fillStyle='#0b1220';ctx.fillRect(0,0,c.width,c.height);
  ctx.font='26px sans-serif';ctx.fillStyle='#ecf2f9';ctx.fillText('PRD 10 · Äußere Planetenentwicklung',32,42);
  const cards=[
   ['Ruinenwelt',0,0,false,false,'ruins'],['Wiederaufbau · 4 Gebäude',4,1,false,false,'ruins'],['Entwickelt · 12 Gebäude',12,2,false,false,'ruins'],['Metropole · 24 Gebäude',24,3,false,false,'ruins'],
   ['Kleiner Ring · fertig',4,1,true,false,'ruins'],['Großer Ring · fertig',24,3,true,true,'ruins'],['Agrar · Grundzustand',0,0,false,false,'agrar'],['Agrar · 4 Gebäude',4,0,false,false,'agrar'],
   ['Agrar · 12 Gebäude',12,0,false,false,'agrar'],['Ozean · 12 Gebäude',12,0,false,false,'ocean'],['Wüste · 12 Gebäude',12,0,false,false,'desert'],['Industrie · 12 Gebäude',12,0,false,false,'industrial']];
  const sprites=new Map();
  for(const type of new Set(cards.map(c=>c[5]))){let spr;for(let i=0;i<30;i++){spr=getSprite(PLANET_TYPES[type].sprite,null,512);if(spr)break;await new Promise(r=>setTimeout(r,30));}sprites.set(type,spr);}
  cards.forEach(([label,n,level,small,large,type],i)=>{
   const x=180+(i%4)*360,y=220+Math.floor(i/4)*330,r=65;
   const e={id:'qa-'+type,kind:'planet',type,x,y,market:{goods:{}}};
   if(type==='ruins')e.market.homeworld={controlLevel:level,facilities:level?{control:{status:'ready'}}:{},structures:Array.from({length:Math.max(0,n-(level?1:0))},()=>({kind:'housing',status:'ready'})),orbital:{small,large}};
   else e.market.economy={infrastructure:Array.from({length:n},()=>({kind:'solar'}))};
   drawPlanetExterior(ctx,e,r,()=>{const spr=sprites.get(type);ctx.drawImage(spr,x-r*1.28,y-r*1.28,r*2.56,r*2.56);});
   ctx.fillStyle='#d8e4f1';ctx.font='17px sans-serif';ctx.textAlign='center';ctx.fillText(label,x,y+126);ctx.textAlign='left';
  });
 });
 await page.locator('#gallery').screenshot({path:new URL('exterior-stages.png',out).pathname.replace(/^\/([A-Z]:)/,'$1')});
 await page.goto(base);
 await page.locator('#loginName').fill('PRD10-'+Date.now().toString(36));await page.locator('#loginForm button').click();
 await page.waitForSelector('#hud:not([hidden])',{state:'attached'});await page.locator('#btnHelpClose').click();
 await page.evaluate(async()=>{
  const {state}=await import('/js/state.js'),{socket}=await import('/js/net.js');socket.disconnect();
  window.qaCommands=[];socket.emit=(event,payload)=>{if(event==='cmd')window.qaCommands.push(payload);};
  state.homeQuest.eventDialog=null;state.homeQuest.introduction=null;state.homeQuest.scenesSeen=Object.fromEntries(Array.from({length:22},(_,i)=>['H'+String(i).padStart(2,'0'),true]));
  const home=state.entities.get(state.homeworld),h=home.market.homeworld,ship=[...state.ships.values()].find(s=>s.owner===state.me.id);
  ship.dockedAt=home.id;ship.x=home.x;ship.y=home.y;
  h.facilities.dock.status='ready';h.storage=4000;h.hazardStorage=600;h.reserves={ore:80};h.limits={ore:50};
  h.structures=[{id:'qa-silo',kind:'silo',status:'ready',level:2,plot:0}];
  const ui=await import('/js/ui/planetPanel.js');ui.enterPlanet(home.id);
  ui.openBuilding((await import('/js/planetside.js')).scene.items.find(i=>i.homeFacility==='dock'));
 });
 await page.locator('[data-storage-rule="limit"][data-good="ore"][type="number"]').waitFor();
 const ore=page.locator('[data-storage-rule="limit"][data-good="ore"][type="number"]');
 await ore.fill('37');
 await page.evaluate(async()=>{(await import('/js/ui/planetPanel.js')).renderPlanetUi();});
 assert.equal(await ore.inputValue(),'37');
 await ore.press('Enter');
 assert((await page.evaluate(()=>window.qaCommands)).some(c=>c.cmd==='homeLimit'&&c.good==='ore'&&c.amount===37));
 await page.locator('#planetPanel').screenshot({path:new URL('storage-controls.png',out).pathname.replace(/^\/([A-Z]:)/,'$1')});
 await page.locator('summary').filter({hasText:'Alle Lagerlimits gemeinsam ändern'}).click();
 await page.locator('#homeBatchNumber').fill('250');
 assert.match(await page.locator('#homeBatchPreview').innerText(),/normal 250, Gefahrstoffe 250/);
 await page.locator('[data-pp="homeBatchLimits"]').click();
 assert((await page.evaluate(()=>window.qaCommands)).some(c=>c.cmd==='homeLimit'&&c.all&&c.amount===250));
 await page.evaluate(async()=>{
  const {scene}=await import('/js/planetside.js'),ui=await import('/js/ui/planetPanel.js');ui.openBuilding(scene.items.find(i=>i.homeStructure==='qa-silo'));
 });
 await page.locator('[data-pp="homeStorageUpgrade"]').waitFor();assert.match(await page.locator('#planetPanel').innerText(),/Stufe 2 \/ 5/);
 await page.locator('[data-pp="homeDemolish"]').click();
 assert.match(await page.locator('#gameConfirmMessage').innerText(),/Lagerkapazität: −4000/);
 await page.locator('#gameConfirmCancel').click();
 await page.locator('#planetPanel').screenshot({path:new URL('storage-upgrade.png',out).pathname.replace(/^\/([A-Z]:)/,'$1')});
 await page.evaluate(async()=>{(await import('/js/ui/planetPanel.js')).leavePlanet();(await import('/js/ui/routes.js')).openRouteEditor();});
 await page.locator('#reTargetSpace').check();
 await page.locator('#routeCard').screenshot({path:new URL('route-option.png',out).pathname.replace(/^\/([A-Z]:)/,'$1')});
 await fs.writeFile(new URL('results.json',out),JSON.stringify({exterior:'12 Zustände gerendert',errors},null,2));
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
