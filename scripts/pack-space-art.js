// Package ImageGen alpha atlases without redrawing or color-keying subjects.
import {createRequire} from 'node:module';
import {mkdir, readFile, writeFile, copyFile} from 'node:fs/promises';
import {PLANET_TYPES, STATION_TYPES, BELT_TYPES} from '../shared/goods.js';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const source = 'docs/art/prd20/production/', out = 'client/assets/art/space/';
await mkdir(out, {recursive: true});
const groups = [
  {source: '01-planeten-lebendig-v2', columns: 4, rows: 2, ids: ['agrar','ocean','desert','mining','ice','urban','resort','gasgiant'].map(id => 'planet_' + id)},
  {source: '02-planeten-heimat-v2', columns: 3, rows: 2, ids: ['planet_jungle','planet_volcanic','planet_colony','planet_industrial',null]},
  {source: '03-stationen-haefen', columns: 3, rows: 2, ids: ['shipyard','bigyard','factionyard','hub','hotel','outpost'].map(id => 'station_' + id)},
  {source: '04-stationen-fundstellen', columns: 4, rows: 2, ids: ['station_deepmine','station_antimatterlab','station_gasharvester','station_wreck','quest_archive','quest_study','quest_relic']},
  {source: '05-ruinenwelt-progression', columns: 3, rows: 2, ids: Array.from({length:6}, (_, i) => 'ruins_' + i)},
  ...['06-produktion-grundstoffe','07-produktion-materialien','08-produktion-technik','09-produktion-hochtechnologie'].map((name, i) => ({source:name, columns:4, rows:3,
    ids:Object.entries(STATION_TYPES).filter(([, d]) => d.recipe).slice(i*12,i*12+12).map(([id]) => 'station_' + id)})),
  {source: '10-ressourcenfelder', columns:4, rows:3, ids:Object.keys(BELT_TYPES).map(id => 'resource_' + id)},
  {source: '11-sonnen', columns:3, rows:2, ids:Array.from({length:6}, (_,i) => 'sun_' + i)},
  {source: '12-schwarze-loecher-wurmloch', columns:3, rows:1, ids:['blackhole_0','blackhole_1','wormhole']},
  {source: '13-weltraumzonen', columns:3, rows:2, ids:['gravity','ionstorm','nebula','solarwind','plasma'].map(id => 'zone_' + id)},
];
const manifest = [];
// ImageGen may move a row or center its incomplete final row. Split at the
// actual alpha valleys instead of cutting off tips at mathematical grid lines.
function valley(counts, expected, range) {
  const lo=Math.max(1,Math.floor(expected-range)), hi=Math.min(counts.length-2,Math.ceil(expected+range));
  let best=lo, score=Infinity;
  for(let i=lo;i<=hi;i++) {
    const value=counts[i]+counts[i-1]+counts[i+1]+Math.abs(i-expected)*.001;
    if(value<score){score=value;best=i;}
  }
  return best;
}
for (const group of groups) {
  const input = await readFile(source + group.source + '.png');
  const metadata = await sharp(input).metadata();
  if (!metadata.hasAlpha) throw Error('Missing alpha: ' + group.source);
  const atlas=await sharp(input).ensureAlpha().raw().toBuffer();
  const rowDensity=Array(metadata.height).fill(0);
  for(let y=0;y<metadata.height;y++)for(let x=0;x<metadata.width;x++)if(atlas[(y*metadata.width+x)*4+3]>128)rowDensity[y]++;
  const rowCuts=[0,...Array.from({length:group.rows-1},(_,i)=>valley(rowDensity,(i+1)*metadata.height/group.rows,metadata.height/group.rows*.25)),metadata.height];
  const regions=[];
  for(let row=0;row<group.rows;row++) {
    const count=Math.min(group.columns,group.ids.length-row*group.columns);
    if(count<=0)continue;
    const density=Array(metadata.width).fill(0),top=rowCuts[row],bottom=rowCuts[row+1];
    for(let y=top;y<bottom;y++)for(let x=0;x<metadata.width;x++)if(atlas[(y*metadata.width+x)*4+3]>128)density[x]++;
    const left=density.findIndex(n=>n>2),right=density.findLastIndex(n=>n>2)+1;
    const cuts=[0,...Array.from({length:count-1},(_,i)=>valley(density,left+(right-left)*(i+1)/count,(right-left)/count*.3)),metadata.width];
    for(let col=0;col<count;col++)regions.push({left:cuts[col],top,width:cuts[col+1]-cuts[col],height:bottom-top});
  }
  for (const [i, id] of group.ids.entries()) {
    if (!id) continue; // Generic ruins draft is superseded by its six-stage series.
    const {left,top,width,height}=regions[i];
    const {data, info} = await sharp(input).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let x0=width, y0=height, x1=0, y1=0, transparent=0, solid=0;
    for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
      const a=data[(y*width+x)*4+3];
      if (a<8) transparent++;
      if (a>200) solid++;
      if (a>16) {x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    }
    if (transparent < width*height*.02 || solid < 200 || x1<=x0 || y1<=y0) throw Error('Invalid alpha cell: ' + id);
    // Trim by generated alpha, keep original alpha values (including soft effects).
    const file=id+'.png';
    await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1})
      .resize(448,448,{fit:'contain',background:'#00000000'})
      .extend({top:32,bottom:32,left:32,right:32,background:'#00000000'}).png().toFile(out+file);
    manifest.push({id,file,source:group.source+'.png',cell:i,box:[left+x0,top+y0,x1-x0+1,y1-y0+1],native:[x1-x0+1,y1-y0+1]});
  }
}
for (const [sourceName,id] of [['14-weltraum-hintergrund-teal','background_teal'],['15-weltraum-hintergrund-violett','background_violet']]) {
  await copyFile('docs/art/prd20/'+sourceName+'.png',out+id+'.png');
  manifest.push({id,file:id+'.png',source:sourceName+'.png'});
}
const expected = Object.keys(PLANET_TYPES).length-1+6+Object.keys(STATION_TYPES).length+Object.keys(BELT_TYPES).length+3+6+3+5+2;
if(manifest.length!==expected || new Set(manifest.map(x=>x.id)).size!==expected)throw Error('Incomplete or duplicate artwork');
await writeFile(out+'manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Packaged ${manifest.length} space images with genuine alpha.`);
