import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1600,height:1000},hasTouch:true});
const page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(String(e)));
const output=new URL('../docs/qa/prd8/',import.meta.url);await fs.mkdir(output,{recursive:true});
const settle=async()=>{
  const ready=async()=>{const {getPlanetView,scene}=await import('/js/planetside.js'),{state}=await import('/js/state.js'),v=getPlanetView();return v&&!v.loading&&v.entity?.id===state.landed&&v.records.size===scene.items.length&&document.getElementById('planetStatus').hidden;};
  await page.waitForFunction(ready);await page.waitForTimeout(650);await page.waitForFunction(ready);
};
try{
  await page.goto(process.env.PRD8_URL||'http://localhost:3008');
  await page.locator('#loginName').fill('PRD8-'+Date.now().toString(36));await page.locator('#loginForm button').click();
  await page.waitForSelector('#hud:not([hidden])',{state:'attached'});await page.locator('#btnHelpClose').click();
  await page.evaluate(async()=>{
    const {state}=await import('/js/state.js');window.qaState=state;
    const ship=[...state.ships.values()].find(s=>s.owner===state.me.id),home=state.entities.get(state.homeworld);
    Object.assign(ship,{dockedAt:home.id,x:home.x,y:home.y});
    (await import('/js/ui/planetPanel.js')).enterPlanet(home.id);
  });
  await settle();assert.equal(await page.locator('#planetBuildingSelect').count(),0);
  await page.screenshot({path:fileURLToPath(new URL('ruins-live.png',output))});
  // Exercise a real homeworld's original dialog through a pointer on the new renderer.
  const location=await page.evaluate(async()=>{const v=(await import('/js/planetside.js')).getPlanetView(),r=v.records.get('questhouse');return v.toScreen(r.x,r.y-r.h/2);});
  await page.mouse.click(location.x,location.y);await page.locator('#planetPanel:not([hidden])').waitFor();
  console.log('Selected panel: '+(await page.locator('#planetPanel h2').innerText()));
  await page.screenshot({path:fileURLToPath(new URL('ruins-selected.png',output))});
  assert.match(await page.locator('#planetPanel').innerText(),/Rathaus/i);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#planetPanel').isHidden(),true);
  assert.equal(await page.locator('#planetView').isVisible(),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#planetView').isHidden(),true);
  // Synthetic world fixtures must not receive live server ship positions during visual checks.
  await page.evaluate(async()=>{(await import('/js/net.js')).socket.disconnect();});
  for(const type of ['agrar','ocean','desert','mining','ice','urban','resort','gasgiant','jungle','volcanic','colony','industrial','ruins']){
    await page.evaluate(async type=>{
      const {state}=await import('/js/state.js'),{PLANET_TYPES,planetFeatures}=await import('/shared/config.js');
      const {leavePlanet,enterPlanet}=await import('/js/ui/planetPanel.js');leavePlanet();
      let id='qa8-'+type;
      for(let i=0;i<20000;i++){const candidate='qa8-'+type+i,f=planetFeatures(candidate);if(f.beggar&&f.dog&&f.school&&f.smuggler){id=candidate;break;}}
      const t=PLANET_TYPES[type],goods={};for(const role of ['produce','consume'])for(const good of Object.keys(t[role]))goods[good]={role,stock:100,cap:1000,rate:.1,baseRate:.1};
      const home=type==='ruins'?structuredClone(state.entities.get(state.homeworld).market.homeworld):null;
      if(home){home.structures=[{id:'housing',kind:'housing',plot:0,status:'ready'},{id:'solar',kind:'solar',plot:1,status:'building'}];home.orbital={small:1,large:1};}
      const entity={id,type,kind:'planet',name:'Gestaltungsprüfung '+t.name,x:0,y:0,owner:state.me.id,market:{goods,bld:{fac:['foodplant'],lvl:{}},...(home?{homeworld:home}:{})}};
      state.entities.set(id,entity);state.props.set(id,{manage:true});
      const ship=[...state.ships.values()].find(s=>s.owner===state.me.id);Object.assign(ship,{dockedAt:id,x:0,y:0});
      enterPlanet(id);
    },type);
    await settle();
    const audit=await page.evaluate(async()=>{
      const {getPlanetView,scene}=await import('/js/planetside.js'),v=getPlanetView();v.flight=null;v.pose={...v.overview};v.render(0);
      const misses=[];for(const r of v.records.values()){const p=v.toScreen(r.x,r.y-r.h/2);if(v.pick(p.x,p.y)!==r.key)misses.push(r.key);}
      return {type:v.entity.type,objects:scene.items.length,rendered:v.records.size,misses,zoom:v.pose.zoom,active:v.active,loading:v.loading,landed:window.qaState.landed};
    });
    console.log(JSON.stringify(audit));assert.equal(audit.type,type);assert.equal(audit.rendered,audit.objects);assert.deepEqual(audit.misses,[]);results.push(audit);
    await page.screenshot({path:fileURLToPath(new URL(type+'.png',output))});
    if(type==='agrar'){
      await page.locator('[data-pp="names"]').click();assert.equal(await page.locator('[data-pp="names"]').getAttribute('aria-pressed'),'true');
      await page.screenshot({path:fileURLToPath(new URL('agrar-names.png',output))});await page.locator('[data-pp="names"]').click();
      for(const key of ['consume:water','beggar','dog','factory:foodplant:0']){
        const p=await page.evaluate(async key=>{const v=(await import('/js/planetside.js')).getPlanetView();v.flight=null;v.pose={...v.overview};v.render(0);const r=v.records.get(key);return v.toScreen(r.x,r.y-r.h/2);},key);
        await page.mouse.click(p.x,p.y);await page.locator('#planetPanel:not([hidden])').waitFor();
        await page.waitForTimeout(600);await page.screenshot({path:fileURLToPath(new URL('agrar-'+key.split(':')[0]+'.png',output))});
        await page.keyboard.press('Escape');
      }
      await page.setViewportSize({width:390,height:844});await page.waitForTimeout(650);
      const p=await page.evaluate(async()=>{const v=(await import('/js/planetside.js')).getPlanetView();v.flight=null;v.pose={...v.overview};v.render(0);const r=v.records.get('dog');return v.toScreen(r.x,r.y-r.h/2);});
      await page.touchscreen.tap(p.x,p.y);await page.locator('#planetPanel:not([hidden])').waitFor();await page.waitForTimeout(650);
      const visible=await page.locator('[data-pp="leave"]').boundingBox(),header=await page.locator('#topbar').boundingBox();assert.ok(visible.x>=0&&visible.x+visible.width<=390&&visible.y>=header.y+header.height);
      await page.screenshot({path:fileURLToPath(new URL('mobile-dog.png',output))});await page.keyboard.press('Escape');
      await page.waitForTimeout(650);
      const touch=await context.newCDPSession(page);
      const touchZoom=await page.evaluate(async()=>(await import('/js/planetside.js')).getPlanetView().pose.zoom);
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:145,y:420,id:1},{x:245,y:420,id:2}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:110,y:420,id:1},{x:280,y:420,id:2}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const pinched=await page.evaluate(async()=>(await import('/js/planetside.js')).getPlanetView().pose.zoom);assert.ok(pinched>touchZoom,'pinch zoom');
      assert.equal(await page.locator('#planetPanel').isHidden(),true,'pinch must not select a building');await touch.detach();
      await page.setViewportSize({width:1600,height:1000});await page.waitForTimeout(650);
      // Wheel, drag, automatic focus and spatial keyboard interaction use the live viewer.
      const before=await page.evaluate(async()=>({...((await import('/js/planetside.js')).getPlanetView().pose)}));
      await page.mouse.move(950,500);await page.mouse.wheel(0,-250);
      const zoom=await page.evaluate(async()=>(await import('/js/planetside.js')).getPlanetView().pose.zoom);assert.ok(zoom>before.zoom);
      await page.mouse.move(950,500);await page.mouse.down();await page.mouse.move(1020,540,{steps:5});await page.mouse.up();
      assert.equal(await page.locator('#planetPanel').isHidden(),true);
      await page.locator('[data-pp="overview"]').click();await page.waitForTimeout(650);
      await page.locator('.city-target').filter({hasText:'Hund'}).focus();await page.keyboard.press('Enter');await page.locator('#planetPanel:not([hidden])').waitFor();await page.keyboard.press('Escape');
    }
    console.log('OK '+type+' '+audit.objects+' objects');
  }
  const oldPositions=await page.evaluate(async()=>{
    const v=(await import('/js/planetside.js')).getPlanetView();return [...v.records.values()].map(r=>[r.key,r.x,r.y]);
  });
  await page.evaluate(async()=>{
    const e=qaState.entities.get(qaState.landed),home=e.market.homeworld;
    for(const facility of Object.values(home.facilities))facility.status='ready';
    home.structures[0].status='building';home.structures.push({id:'new-home',kind:'school',plot:2,status:'ready'});home.orbital={project:{}};
  });
  await settle();
  const afterPositions=await page.evaluate(async()=>{
    const {getPlanetView}=await import('/js/planetside.js'),{citySprite}=await import('/js/planetCityLayout.js'),v=getPlanetView();
    for(const r of v.records.values())if(r.item.homeFacility&&citySprite(v.entity,r.item)===18)throw new Error('Ready facility still ruined');
    if(citySprite(v.entity,v.records.get('home:structure:housing').item)!==19)throw new Error('Building state missing');
    if(citySprite(v.entity,v.records.get('home:orbital').item)!==19)throw new Error('Orbital project state missing');
    return [...v.records.values()].map(r=>[r.key,r.x,r.y]);
  });
  for(const [key,x,y] of afterPositions){const old=oldPositions.find(r=>r[0]===key);if(old)assert.deepEqual([x,y],old.slice(1),'stable position '+key);}
  await page.screenshot({path:fileURLToPath(new URL('ruins-development.png',output))});
  assert.deepEqual(errors,[]);
  // A browser-rendered contact sheet makes all 13 actual screenshots reviewable together.
  const gallery=await context.newPage();await gallery.setViewportSize({width:1600,height:1120});
  const cards=await Promise.all(results.map(async r=>`<figure><img src="data:image/png;base64,${(await fs.readFile(new URL(r.type+'.png',output))).toString('base64')}"><figcaption>${r.type} · ${r.objects} Orte</figcaption></figure>`));
  await gallery.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#132827;color:#f0dfbc;font:16px system-ui;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px}figure{margin:0;background:#223b39}img{display:block;width:100%;aspect-ratio:1.6}figcaption{padding:5px 10px}</style>${cards.join('')}`);
  await gallery.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
  await gallery.screenshot({path:fileURLToPath(new URL('all-types.png',output)),fullPage:true});await gallery.close();
  await fs.writeFile(new URL('browser-results.json',output),JSON.stringify({status:'passed',results,errors,checks:['13 types and complete hit selection','real homeworld dialog and Escape','warehouse, beggar, dog, factory panels','mobile controls clear of header','touch tap and pinch without accidental selection','wheel, drag, focus and overview','spatial keyboard activation','live homeworld development updates and stable positions']},null,2));
  console.log('PRD8 browser verification passed');
}finally{await browser.close();}
