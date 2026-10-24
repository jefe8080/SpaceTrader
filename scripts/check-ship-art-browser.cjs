// Gegen den isolierten statischen QA-Server ausführen, keine Datenbank nötig.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXE?{executablePath:process.env.BROWSER_EXE}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1360,height:820}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.SHIP_QA_URL || 'http://127.0.0.1:3016/qa/ships.html');
    await page.waitForFunction(()=>window.qaReady,null,{timeout:15000});
    for(const zoom of [1,.32,.1,.035,.034,.007]){
      const result=await page.evaluate(z=>window.showZoom(z),zoom);
      assert.equal(result.images,zoom>=.035?32:0);
      assert.equal(result.mode,zoom>=.035?'system':'sector');
      assert.equal(result.picked?.id,'spatz');
      if([1,.035,.034].includes(zoom))await page.screenshot({path:`docs/qa/ship-art/zoom-${zoom}.png`});
      console.log(zoom,result);
    }
    assert.equal(await page.locator('#cards img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth===512)),true);
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
