import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SHIP_TYPES} from '../shared/ships.js';
import {PAINTED_SHIPS,shipArtUrl,shipScreenSize} from '../client/js/shipArt.js';

test('Jeder Schiffstyp hat eine austauschbare quadratische PNG-Illustration mit Alpha',async()=>{
  assert.equal(PAINTED_SHIPS.size,Object.keys(SHIP_TYPES).length);
  for(const ship of Object.values(SHIP_TYPES)){
    const url=shipArtUrl(ship.sprite);
    assert.ok(url,ship.sprite);
    const png=await readFile(new URL('../client'+url,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG');
    assert.equal(png.readUInt32BE(16),512);
    assert.equal(png.readUInt32BE(20),512);
    assert.equal(png[25],6,'RGBA statt deckendem Rechteck');
  }
  assert.equal(shipArtUrl('station_hub'),null);
});

test('Kleine Schiffe bleiben bis zum Ende der Systemansicht lesbar, große behalten ihren Maßstab',()=>{
  for(const size of [26,40,68,110])for(const zoom of [.035,.05,.1,.32,1,2.5]){
    assert.ok(shipScreenSize(size,zoom)>=24);
    assert.ok(shipScreenSize(size,zoom)>=size*zoom*1.28);
  }
  assert.equal(shipScreenSize(26,.035),24);
  assert.equal(shipScreenSize(110,1),140.8);
});

test('Assetloader lädt PNG einmal pro Typ und erhält SVG-Rückfall sowie Besitzerfarben',async()=>{
  let source=await readFile(new URL('../client/js/assets.js',import.meta.url),'utf8');
  source=source.replace(/import .* from '\/shared\/config.js';/,"const PLANET_TYPES={}, STATION_TYPES={hub:{sprite:'station_hub'}}, BELT_TYPES={}, SHIP_TYPES={spatz:{sprite:'ship_spatz'},wal:{sprite:'ship_wal'}};")
    .replace("'./shipArt.js'",JSON.stringify(new URL('../client/js/shipArt.js',import.meta.url).href));
  const OriginalImage=globalThis.Image,originalFetch=globalThis.fetch,requests=[];
  globalThis.Image=class{
    set src(url){this.url=url;requests.push(url);queueMicrotask(()=>url.includes('ship_wal')?this.onerror():this.onload());}
  };
  globalThis.fetch=async url=>({text:async()=>'<svg fill="#ff00ff">'+url+'</svg>'});
  try{
    const assets=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
    await assets.loadAssets();
    assert.equal(assets.spriteUrl('ship_spatz','#f00'),'/assets/art/ships/ship_spatz.png');
    assert.equal(assets.getSprite('ship_spatz','#f00'),assets.getSprite('ship_spatz','#0f0'));
    assert.equal(requests.filter(x=>x.includes('ship_spatz')).length,1);
    assert.match(decodeURIComponent(assets.spriteUrl('ship_wal','#123456')),/fill="#123456"/);
    assert.match(decodeURIComponent(assets.spriteUrl('station_hub','#abcdef')),/fill="#abcdef"/);
  }finally{globalThis.Image=OriginalImage;globalThis.fetch=originalFetch;}
});
