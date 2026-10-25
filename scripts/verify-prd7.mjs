import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const pilotName='PRD7-'+Date.now().toString(36);
const errors=[];page.on('pageerror',error=>errors.push(String(error)));
const output=new URL(process.env.PRD7_QA_DIR||'../docs/qa/prd7/',import.meta.url);await fs.mkdir(output,{recursive:true});
try {
  await page.goto(process.env.PRD7_URL||'http://localhost:3007');
  assert.deepEqual(await (await page.request.get(new URL('/api/status',page.url()).href)).json(),{protocol:7,profile:'homeworld'});
  await page.locator('#loginName').fill(pilotName);await page.locator('#loginForm button').click();
  await page.waitForSelector('#hud:not([hidden])',{state:'attached'});
  await page.waitForFunction(async()=>!!(await import('/js/state.js')).state.profile);
  await page.evaluate(async()=>{
    const {state}=await import('/js/state.js');window.qaState=state;
  });
  // Exercise the actual first-entry flow; never inject tutorial acknowledgements.
  await page.locator('#help:not([hidden])').waitFor();
  assert.equal(await page.locator('#homeStory').isHidden(),true);
  assert.ok(await page.evaluate(()=>qaState.homeQuest.active.H00));
  await page.locator('#btnHelpClose').click();
  const clickOwnShip=async()=>{
    const [x,y]=await page.evaluate(async()=>{
      const {state}=await import('/js/state.js'),{worldToScreen}=await import('/js/render.js');
      const ship=[...state.ships.values()].find(s=>s.owner===state.me.id);
      return worldToScreen(ship.x,ship.y);
    });
    await page.mouse.click(x,y);
  };
  await clickOwnShip();
  await page.locator('#homeStory:not([hidden])').waitFor();
  await page.locator('#homeStory img').evaluate(img=>img.decode());
  await page.screenshot({path:fileURLToPath(new URL('first-contact.png',output))});
  // Reload before acknowledgement: H00 remains active and its text is not lost.
  await page.reload();
  await page.locator('#loginName').fill(pilotName);await page.locator('#loginForm button').click();
  await page.waitForFunction(async()=>!!(await import('/js/state.js')).state.profile);
  await page.evaluate(async()=>{window.qaState=(await import('/js/state.js')).state;});
  assert.equal(await page.locator('#help').isHidden(),true);
  await clickOwnShip();
  await page.locator('#homeStory:not([hidden])').waitFor();
  await page.locator('#homeStory .primary[data-story-close]').click();
  await page.waitForFunction(()=>qaState.homeQuest.scenesSeen?.H00);
  await page.waitForTimeout(400);
  assert.equal(await page.locator('#homeStory').isHidden(),true);
  await page.locator('#pilotProfile summary').click();await page.locator('#btnPilotInfo').click();
  await page.locator('#pilotInfoBody').getByText('Fraktionsruf',{exact:true}).waitFor();
  assert.ok((await page.locator('#pilotInfoBody').innerText()).includes('Nicht erfasst'));
  await page.screenshot({path:fileURLToPath(new URL('profile-desktop.png',output))});
  await page.locator('[data-close="pilotInfoModal"]').click();
  const boxes=[];
  for(const width of [1440,1280,1024,768,390]){
    await page.setViewportSize({width,height:1000});
    const box=await page.evaluate(()=>{
      const b=document.getElementById('btnMarker').getBoundingClientRect(),bar=document.getElementById('topbar').getBoundingClientRect();
      const nav=[...document.querySelectorAll('.main-nav>details')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};});
      return {width:innerWidth,x:b.x,y:b.y,right:b.right,bottom:b.bottom,barBottom:bar.bottom,nav};
    });
    assert.ok(box.x>=0&&box.right<=width&&box.y>=0&&box.bottom<=box.barBottom,JSON.stringify(box));
    assert.ok(box.nav.every(n=>box.right<=n.x||box.x>=n.right||box.bottom<=n.y||box.y>=n.bottom),'marker overlaps navigation');
    const before=await page.locator('#btnMarker').innerText();await page.locator('#btnMarker').click();
    assert.notEqual(await page.locator('#btnMarker').innerText(),before);
    assert.equal(await page.locator('#zoomInfo').count(),0);boxes.push(box);
    await page.screenshot({path:fileURLToPath(new URL(`map-${width}.png`,output))});
  }
  await page.setViewportSize({width:1440,height:1000});
  // Isolated UI fixture: the server permission tests cover the authoritative rules.
  await page.evaluate(async()=>{
    const {state}=await import('/js/state.js'),home=state.entities.get(state.homeworld),ship=[...state.ships.values()].find(s=>s.owner===state.me.id);
    const {socket}=await import('/js/net.js');socket.disconnect();
    ship.dockedAt=home.id;
    const {enterPlanet,openBuilding}=await import('/js/ui/planetPanel.js');
    enterPlanet(home.id);openBuilding({kind:'questhouse',key:'questhouse',label:'Rathaus'});
  });
  await page.locator('#planetPanel').getByText('Planetenübersicht',{exact:true}).click();
  await page.locator('#homePlanetName').waitFor();
  await page.waitForFunction(()=>document.getElementById('planetStatus').hidden,{},{timeout:60000});
  await page.screenshot({path:fileURLToPath(new URL('town-hall.png',output))});
  await page.evaluate(async()=>{
    for(const ship of qaState.ships.values())ship.dockedAt=null;
    (await import('/js/ui/index.js')).renderAll();
  });
  assert.equal(await page.locator('#planetPanel').isVisible(),true);
  assert.ok((await page.locator('#planetBar').innerText()).includes('Verbindung verloren'));
  assert.equal(await page.locator('[data-pp="homeRename"]').isDisabled(),true);
  await page.screenshot({path:fileURLToPath(new URL('connection-lost.png',output))});
  await page.evaluate(async()=>{
    const ship=[...qaState.ships.values()].find(s=>s.owner===qaState.me.id);
    qaState.relic={speed:4,location:{kind:'ship',id:ship.id}};
    qaState.manualShip='different-selected-ship';
    qaState.coverage=[{kind:'circle',x:ship.x,y:ship.y,radius:1000}];
    (await import('/js/ui/index.js')).renderAll();
  });
  assert.ok((await page.locator('#planetBar').innerText()).includes('Fernverbindung aktiv'));
  assert.equal(await page.locator('[data-pp="homeRename"]').isEnabled(),true);
  await page.screenshot({path:fileURLToPath(new URL('remote-restored.png',output))});
  const second=await page.context().newPage();
  second.on('pageerror',error=>errors.push(String(error)));
  await second.goto(process.env.PRD7_URL||'http://localhost:3007');
  await second.locator('#loginName').fill(pilotName+'b');await second.locator('#loginForm button').click();
  await second.locator('#help:not([hidden])').waitFor();
  assert.equal(await second.evaluate(()=>localStorage.getItem('st_help_seen_2')),'1');
  await second.screenshot({path:fileURLToPath(new URL('new-pilot-help.png',output))});
  await second.close();
  // Reproduce the legacy server payload without changing tutorial game state.
  await page.evaluate(async()=>{(await import('/js/net.js')).socket.emitEvent(['welcome',{}]);});
  assert.ok((await page.locator('#loginError').innerText()).includes('Spielserver neu starten'));
  assert.equal(await page.locator('#hud').isHidden(),true);
  await page.screenshot({path:fileURLToPath(new URL('server-version-mismatch.png',output))});
  assert.deepEqual(errors,[]);
  await fs.writeFile(new URL('browser-results.json',output),JSON.stringify({status:'passed',boxes,errors},null,2));
  console.log('PRD7 browser verification passed: profile, dialogue confirmation, town hall, connection loss and 5 viewports.');
} finally {await browser.close();}
