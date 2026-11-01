import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {PLANET_TYPES, STATION_TYPES, BELT_TYPES} from '../shared/goods.js';
import {SPACE_ART, spaceArtKey, spaceArtUrl, sunArtKey, SUN_COLORS} from '../shared/space-art.js';
import {OBJECT_GUIDE} from '../shared/object-guide.js';
import {orbitalArtStage, orbitalArtKey, orbitalArtParts, orbitalArtScale} from '../shared/orbital-art.js';

test('every space type has its own painted asset, with six ruins states and distinct quest sites',()=>{
  const keys=[];
  for(const [kind,types,prefix] of [['planet',PLANET_TYPES,'pl:'],['station',STATION_TYPES,'st:'],['belt',BELT_TYPES,'bt:']]) {
    for(const type of Object.keys(types)) {
      const key=spaceArtKey({kind,type});keys.push(key);
      assert.ok(SPACE_ART[key],key);assert.equal(OBJECT_GUIDE[prefix+type].image,SPACE_ART[key]);
    }
  }
  assert.equal(new Set(keys).size,keys.length);
  for(const [entity,id] of [[{archiveKey:'H09'},'archive'],[{archiveKey:'sensor'},'study'],[{salvageOwner:'pilot'},'relic']]) {
    const key=spaceArtKey({kind:'station',type:'wreck',...entity});
    assert.equal(key,'space_quest_'+id);assert.equal(OBJECT_GUIDE['quest:'+id].image,SPACE_ART[key]);
  }
  assert.equal(spaceArtKey({kind:'wormhole'}),'space_wormhole');
  assert.equal(spaceArtUrl('unknown'),null);
  SUN_COLORS.forEach((color,i)=>assert.equal(sunArtKey(color.toUpperCase()),'space_sun_'+i));
  assert.equal(sunArtKey(), 'space_sun_0');
});

test('all mapped game images exist, with square RGBA objects and two wide backgrounds',()=>{
  const manifest=['manifest.json','orbital-manifest.json'].flatMap(file=>JSON.parse(readFileSync(new URL('../client/assets/art/space/'+file,import.meta.url))));
  assert.equal(Object.keys(SPACE_ART).length,113);assert.equal(manifest.length,113);
  for(const [key,url] of Object.entries(SPACE_ART)) {
    const png=readFileSync(new URL('../client'+url,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG',url);
    if(!key.includes('background')) {
      const size=key.startsWith('space_orbital_')?1024:512;
      assert.equal(png.readUInt32BE(16),size,url);assert.equal(png.readUInt32BE(20),size,url);
      assert.equal(png[25],6,url);
    } else assert.ok(png.readUInt32BE(16)>png.readUInt32BE(20));
    assert.ok(manifest.some(item=>'space_'+item.id===key),key);
  }
});

test('space map paints the selected ruins image only, with physical rings independent of development',()=>{
  const renderer=readFileSync(new URL('../client/js/render.js',import.meta.url),'utf8');
  const draw=renderer.slice(renderer.indexOf('function drawPlanet(e)'),renderer.indexOf('function drawStation('));
  const rings=readFileSync(new URL('../client/js/orbitalRings.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function drawOrbitalRings','function drawOrbitalRings');
  for(const [stage,count] of [0,4,8,16,24,36].entries())for(const orbital of [{},{small:true},{small:true,largeStage:1},{large:true},{small:true,large:true,doubleYard:true}]) {
    const calls=[],ctx=new Proxy({}, {get:(_,method)=>(...args)=>calls.push({method,args})});
    const entity={id:'home',kind:'planet',type:'ruins',x:20,y:30,radius:50,market:{homeworld:{orbital,structures:Array.from({length:count},()=>({status:'ready'}))}}};
    runInNewContext(`${rings}\n${draw}\ndrawPlanet(entity)`, {ctx,entity,spaceArtKey,orbitalArtStage,orbitalArtKey,orbitalArtParts,orbitalArtScale,px:n=>n,getSprite:key=>({key})});
    const parts=orbitalArtParts(orbitalArtStage(entity));
    const images=calls.filter(c=>c.method==='drawImage');
    assert.deepEqual(images.map(c=>c.args[0].key),[
      ...parts.toReversed().map(p=>orbitalArtKey(p,false)),'space_ruins_'+stage,...parts.map(p=>orbitalArtKey(p,true)),
    ]);
    // No geometric ring or procedural building fallback remains.
    assert.equal(calls.filter(c=>['fillRect','stroke','arc'].includes(c.method)).length,0);
  }
});
