import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PRD11_URL||'http://localhost:3011';
const out=new URL('../docs/qa/prd11/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const shot=async name=>page.screenshot({path:new URL(name,out).pathname.replace(/^\/([A-Z]:)/,'$1')});
try {
  await page.goto(base);
  await page.locator('#loginName').fill('PRD11-'+Date.now().toString(36));
  await page.locator('#loginForm button').click();
  await page.locator('#btnHelpClose').click();
  await page.waitForFunction(async()=>!!(await import('/js/state.js')).state.homeworld);
  await page.evaluate(async()=>{
    const {state}=await import('/js/state.js');
    const {socket}=await import('/js/net.js');
    socket.disconnect();window.commands=[];
    socket.emit=(event,payload)=>{if(event==='cmd')window.commands.push(payload);};
    state.homeQuest.introduction=null;state.homeQuest.eventDialog=null;
    state.guideRead=[];
    const ui=await import('/js/ui/index.js');
    const hub=[...state.entities.values()].find(e=>e.type==='hub')||{id:'qa-hub',kind:'station',type:'hub',name:'QA Hub',x:0,y:0,radius:150,market:{goods:{},strategy:'hub'}};
    state.entities.set(hub.id,hub);
    window.qaHub=hub.id;ui.select({kind:'entity',id:hub.id});
  });
  await page.locator('.object-guide-dialog[open]').waitFor();
  await shot('introduction-wide.png');
  await page.locator('[data-guide-understood]').click();
  assert.equal(await page.evaluate(async()=>{const {state}=await import('/js/state.js');return state.selected.id===window.qaHub&&state.guideRead.includes('st:hub');}),true);
  await page.evaluate(async()=>{(await import('/js/ui/index.js')).select({kind:'entity',id:window.qaHub});});
  assert.equal(await page.locator('.object-guide-dialog[open]').count(),0);
  await page.locator('#details [data-guide-help]').click();
  assert.equal(await page.locator('.object-guide-dialog[open]').count(),1);
  await page.setViewportSize({width:390,height:844});
  await shot('introduction-narrow.png');
  assert.equal(await page.locator('.object-guide-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.locator('[data-guide-understood]').click();
  await page.setViewportSize({width:1440,height:1000});
  await page.keyboard.press('a');await page.locator('[data-tab="buildings"]').click();
  await page.locator('#almanacCard details').first().locator('summary').click();
  await shot('almanac-buildings.png');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#almanacCard').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await shot('almanac-narrow.png');
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#almanacCard [data-close]').click();
  await page.evaluate(async()=>{
    const {state}=await import('/js/state.js'),ui=await import('/js/ui/planetPanel.js');
    const home=state.entities.get(state.homeworld),h=home.market.homeworld;
    const ships=[...state.ships.values()].filter(s=>s.owner===state.me.id),ship=ships[0];
    ship.dockedAt=home.id;ship.x=home.x;ship.y=home.y;
    h.facilities.dock.status='ready';h.orbital={small:true,large:false,inventory:[],jobs:{}};
    state.guideRead.push('building:orbital-small','building:orbital-large');
    ui.enterPlanet(home.id);
  });
  await page.waitForFunction(async()=>!!(await import('/js/planetside.js')).getPlanetView()?.records?.size);
  await page.evaluate(async()=>{
    const {scene}=await import('/js/planetside.js');
    (await import('/js/ui/planetPanel.js')).openBuilding(scene.items.find(it=>it.homeFacility==='dock'));
  });
  await page.locator('.object-guide-dialog[open]').waitFor();
  await page.locator('[data-guide-understood]').click();
  assert.equal(await page.locator('#planetPanel').isVisible(),true);
  assert.match(await page.locator('#planetPanel h2').innerText(),/Landeplatz/i);
  await page.evaluate(async()=>{
    const {scene}=await import('/js/planetside.js');
    (await import('/js/ui/planetPanel.js')).openBuilding(scene.items.find(it=>it.homeOrbital));
  });
  await page.waitForTimeout(700);await shot('orbital-small.png');
  await page.evaluate(async()=>{
    const {state}=await import('/js/state.js');state.entities.get(state.homeworld).market.homeworld.orbital.large=true;
    (await import('/js/ui/planetPanel.js')).renderPlanetUi();
  });
  await page.waitForTimeout(700);await shot('orbital-large.png');
  await page.evaluate(()=>{window.commands=[];});
  const shipIds=await page.evaluate(async()=>{
    const {state}=await import('/js/state.js');
    const first=[...state.ships.values()].find(s=>s.owner===state.me.id);
    const second={...first,id:'qa-second',name:'Zweites Testschiff',x:first.x+200,y:first.y+100,dockedAt:null,vx:12,vy:4,queue:[]};
    delete second.rx;delete second.ry;
    state.ships.set(second.id,second);(await import('/js/ui/index.js')).renderAll();
    return [first.id,second.id];
  });
  for(const [i,zoom]of [0.002,0.03,0.9,0.3].entries()){
    const id=shipIds[i%2];
    await page.evaluate(async zoom=>{const {state}=await import('/js/state.js');state.camera.zoom=zoom;},zoom);
    await page.locator(`#fleetList [data-ship="${id}"]`).dblclick();
    await page.waitForTimeout(150);
    const result=await page.evaluate(async()=>{const {state}=await import('/js/state.js');return {landed:state.landed,follow:state.follow,selected:state.selected.id,zoom:state.camera.zoom};});
    assert.deepEqual(result,{landed:null,follow:id,selected:id,zoom:0.3});
    assert.equal(await page.evaluate(async()=>{
      const {state}=await import('/js/state.js'),s=state.ships.get(state.follow);
      return Math.hypot((s.rx??s.x)-state.camera.x,(s.ry??s.y)-state.camera.y)*state.camera.zoom<40;
    }),true);
    assert.equal(await page.locator('#planetPanel').isVisible(),false);
  }
  // A running keyboard zoom flight must not overwrite a repeated ship focus.
  await page.keyboard.press('3');
  await page.locator(`#fleetList [data-ship="${shipIds[1]}"]`).dblclick();
  await page.waitForTimeout(650);
  assert.equal(await page.evaluate(async()=>(await import('/js/state.js')).state.camera.zoom),0.3);
  await shot('fleet-focus.png');
  assert.equal(await page.evaluate(()=>window.commands.filter(c=>c.cmd!=='guideRead').length),0);
  assert.deepEqual(errors,[]);
  // Exercise actual fallback geometry with a live WebGL render, separately from the city canvas.
  await page.evaluate(async()=>{
    const THREE=await import('three');
    const {developBuilding}=await import('/js/planetArt.js');
    const canvas=document.createElement('canvas');canvas.id='fallback-preview';
    canvas.style='position:fixed;inset:0;z-index:10000;width:100vw;height:100vh';document.body.append(canvas);
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(1440,1000);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#152c30');
    scene.add(new THREE.HemisphereLight(0xffedcb,0x374e47,3));
    const light=new THREE.DirectionalLight(0xffe4bc,4);light.position.set(-20,60,40);scene.add(light);
    for(const large of [false,true]){
      const group=new THREE.Group();group.position.x=large?24:-24;
      developBuilding(group,{homeOrbital:true},{market:{homeworld:{orbital:{small:true,large}}}});scene.add(group);
    }
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x737e63}));ground.rotation.x=-Math.PI/2;ground.position.y=-.1;scene.add(ground);
    const camera=new THREE.PerspectiveCamera(42,1.44,.1,1000);camera.position.set(75,65,110);camera.lookAt(0,25,0);renderer.render(scene,camera);
  });
  await shot('orbital-fallback.png');
  await fs.writeFile(new URL('browser-results.json',out),JSON.stringify({ok:true,errors,checks:['first-contact continuation','repeat without introduction','help reopen','390px dialog overflow','building almanac','small/large surface elevators','planet exit and same/other ship focus at four zooms','cancel running camera flight','no movement or paid commands']},null,2));
  console.log('PRD11 browser checks passed');
} finally { await browser.close(); }
