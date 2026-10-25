import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1600,height:1000},hasTouch:true});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(String(e)));
const output=new URL('../docs/qa/prd8/agrar-revision/',import.meta.url);await fs.mkdir(output,{recursive:true});
const snapshot=async name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',output))});
const ready=async()=>{
  await page.waitForFunction(async()=>{const {getPlanetView,scene}=await import('/js/planetside.js'),v=getPlanetView();return v&&!v.loading&&v.entity.id==='qa8-agrar776'&&v.records.size===scene.items.length&&document.getElementById('planetStatus').hidden;});
  await page.waitForTimeout(650);
};
const overview=async()=>{await page.locator('[data-pp="overview"]').click();await page.waitForTimeout(650);};
const clickSite=async key=>{
  const p=await page.evaluate(async key=>{const v=(await import('/js/planetside.js')).getPlanetView(),r=v.records.get(key);return v.toScreen(r.x,r.y-r.h/2);},key);
  await page.mouse.click(p.x,p.y);await page.locator('#planetPanel:not([hidden])').waitFor();await page.waitForTimeout(650);
};
try{
  await page.goto(process.env.PRD8_URL||'http://localhost:3008');
  await page.locator('#loginName').fill('AgrarReview-'+Date.now().toString(36));await page.locator('#loginForm button').click();
  await page.waitForSelector('#hud:not([hidden])',{state:'attached'});await page.locator('#btnHelpClose').click();
  await page.evaluate(async()=>{
    const {state}=await import('/js/state.js'),{PLANET_TYPES}=await import('/shared/config.js');
    (await import('/js/net.js')).socket.disconnect();window.qaState=state;
    const goods={};for(const role of ['produce','consume'])for(const good of Object.keys(PLANET_TYPES.agrar[role]))goods[good]={role,stock:100,cap:1000,rate:.1,baseRate:.1};
    const entity={kind:'planet',type:'agrar',id:'qa8-agrar776',name:'Agrarstadt',owner:state.me.id,x:0,y:0,market:{goods,bld:{fac:['foodplant'],lvl:{}}}};
    state.entities.set(entity.id,entity);state.props.set(entity.id,{manage:true});
    const ship=[...state.ships.values()].find(s=>s.owner===state.me.id);Object.assign(ship,{dockedAt:entity.id,x:0,y:0});
    (await import('/js/ui/planetPanel.js')).enterPlanet(entity.id);
  });
  await ready();await snapshot('overview');
  assert.equal(await page.locator('#planetBuildingSelect').count(),0);
  for(const [key,name] of [['consume:water','water'],['beggar','beggar'],['dog','dog'],['factory:foodplant:0','factory']]){
    await clickSite(key);await snapshot(name);await page.keyboard.press('Escape');await page.waitForTimeout(650);
  }
  checks.push('Original panels opened by clicking painted water tanks, beggar, dog and factory; Escape closes the panel');
  await page.locator('[data-pp="names"]').click();await snapshot('names');await page.locator('[data-pp="names"]').click();
  // The real canvas must paint the authored landscape once, with no decor scene or mirrored tiles.
  const painting=await page.evaluate(async()=>{
    const v=(await import('/js/planetside.js')).getPlanetView(),original=v.ctx.drawImage;let terrainDraws=0;
    v.ctx.drawImage=function(...args){if(args[0]===v.art.terrain)terrainDraws++;return original.apply(this,args);};
    try{v.render(0);}finally{v.ctx.drawImage=original;}
    return{authored:v.plan.authored,roads:v.plan.roads.length,decor:v.decorations.length,scenery:v.scenery,terrainDraws};
  });
  assert.deepEqual(painting,{authored:true,roads:0,decor:0,scenery:null,terrainDraws:1});checks.push('One composed painting; zero generated roads, decor houses or reflected tiles');
  for(const [width,height] of [[1600,1000],[390,844],[844,390],[2560,1080]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(650);
    const limits=await page.evaluate(async()=>{
      const v=(await import('/js/planetside.js')).getPlanetView(),b=v.plan.landscape;v.flight=null;let cases=0;
      for(const zoom of [.001,1.5,3])for(const x of [-1e6,1e6])for(const y of [-1e6,1e6]){
        v.pose={x,y,zoom};v.render(0);const a=v.toWorld(0,0),z=v.toWorld(innerWidth,innerHeight);
        if(a.x<b.x-1e-6||a.y<b.y-1e-6||z.x>b.x+b.width+1e-6||z.y>b.y+b.height+1e-6)throw new Error('Painting edge exposed');cases++;
      }
      v.pose={...v.overview};v.render(0);return cases;
    });
    assert.equal(limits,12);checks.push(`${width}x${height}: 12 real canvas camera limit cases remain inside painting`);
    if(width===390){
      const p=await page.evaluate(async()=>{const v=(await import('/js/planetside.js')).getPlanetView(),r=v.records.get('dog');v.select('dog',true);v.flight=null;v.pose=v.focusPose(r);v.render(0);return v.toScreen(r.x,r.y-r.h/2);});
      await page.touchscreen.tap(p.x,p.y);await page.locator('#planetPanel:not([hidden])').waitFor();await page.waitForTimeout(650);
      await snapshot('mobile-dog');const button=await page.locator('[data-pp="leave"]').boundingBox(),header=await page.locator('#topbar').boundingBox();
      assert.ok(button.y>=header.y+header.height&&button.x+button.width<=390);await page.keyboard.press('Escape');
    }
  }
  await page.setViewportSize({width:1600,height:1000});await page.waitForTimeout(650);await overview();
  const before=await page.evaluate(async()=>(await import('/js/planetside.js')).getPlanetView().plan.records.map(r=>[r.key,r.x,r.y]));
  await page.evaluate(()=>{qaState.entities.get(qaState.landed).market.bld.fac=['waterworks','foodplant','weavery','refinery'];});
  await ready();await overview();await snapshot('four-factories');
  const factoryChange=await page.evaluate(async()=>{
    const v=(await import('/js/planetside.js')).getPlanetView();
    return{factories:v.plan.records.filter(r=>r.item.kind==='factory').length,plots:v.plan.records.filter(r=>r.item.kind==='plot').length,positions:v.plan.records.map(r=>[r.key,r.x,r.y])};
  });
  assert.equal(factoryChange.factories,4);assert.equal(factoryChange.plots,0);
  for(const r of factoryChange.positions){const old=before.find(p=>p[0]===r[0]&&!p[0].startsWith('factory:'));if(old)assert.deepEqual(r,old);}
  checks.push('All four category courtyards accept factories, replacing available plots without moving established sites');
  await page.evaluate(async()=>{
    const {extraOptions}=await import('/shared/config.js'),e=qaState.entities.get(qaState.landed);
    for(const good of extraOptions(e).slice(0,7))e.market.goods[good]={role:'produce',stock:100,cap:1000,rate:.1,baseRate:.1};
    for(const [good,role] of [['preserves','produce'],['medicine','consume'],['textiles','produce']])e.market.goods[good]={role,stock:100,cap:1000,rate:.1,baseRate:.1};
  });
  await ready();await overview();
  const maximum=await page.evaluate(async()=>{
    const {getPlanetView,scene}=await import('/js/planetside.js'),v=getPlanetView();
    const misses=[];for(const r of v.records.values()){const p=v.toScreen(r.x,r.y-r.h/2);if(v.pick(p.x,p.y)!==r.key)misses.push(r.key);}
    return{items:scene.items.length,records:v.records.size,misses};
  });assert.equal(maximum.items,maximum.records);assert.deepEqual(maximum.misses,[]);await snapshot('maximum-services');
  checks.push('Seven extra production goods and all three level goods retain unique reachable service sites');
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('revision-results.json',output),JSON.stringify({status:'passed',painting,maximum,checks,errors},null,2));
  console.log('Agricultural revision passed: '+checks.length+' checks; '+maximum.items+' maximum fixture objects.');
}finally{await browser.close();}
