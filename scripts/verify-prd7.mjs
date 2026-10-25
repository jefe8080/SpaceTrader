import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',error=>errors.push(String(error)));
const output=new URL('../docs/qa/prd7/',import.meta.url);await fs.mkdir(output,{recursive:true});
try {
  await page.goto(process.env.PRD7_URL||'http://localhost:3007');
  await page.locator('#loginName').fill('PRD7-'+Date.now().toString(36));await page.locator('#loginForm button').click();
  await page.waitForSelector('#hud:not([hidden])',{state:'attached'});
  await page.waitForFunction(async()=>!!(await import('/js/state.js')).state.profile);
  await page.evaluate(async()=>{
    const {state}=await import('/js/state.js');window.qaState=state;
    document.getElementById('help').hidden=true;state.homeStoryShipClicked=true;
    (await import('/js/ui/index.js')).renderAll();
  });
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
  assert.deepEqual(errors,[]);
  await fs.writeFile(new URL('browser-results.json',output),JSON.stringify({status:'passed',boxes,errors},null,2));
  console.log('PRD7 browser verification passed: profile, dialogue confirmation, town hall, connection loss and 5 viewports.');
} finally {await browser.close();}
