// Verpackt die mit Imagegen freigestellten Tafeln. Keine Neuzeichnung/Retusche.
// SHARP_MODULE kann auf eine bereits installierte Sharp-Bibliothek verweisen.
import {createRequire} from 'node:module';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const root = path.resolve('docs/art/ships');
const out = path.resolve('client/assets/art/ships');
await mkdir(out, {recursive:true});
const groups = [
  {file:'civilian-atlas.png', columns:7, rows:2, ids:['spatz','maulwurf','kolibri','lastesel','grubenhund','bussard','pelikan','seekuh','mammut','wal','kondor','titan','leviathan','versorger']},
  {file:'factions-1-atlas.png', columns:3, rows:3, ids:['fl_miners','fx_miners','f_miners','fl_tech','fx_tech','f_tech','fl_nomads','fx_nomads','f_nomads']},
  {file:'factions-2-atlas.png', columns:3, rows:3, ids:['fl_order','fx_order','f_order','fl_league','fx_league','f_league','fl_syndicate','fx_syndicate','f_syndicate']},
];
const manifest=[];
for (const group of groups) {
  const input=await readFile(path.join(root,group.file));
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h}=info;
  // Imagegen liefert teils einen weichen Hintergrund in der Alpha-Maske.
  // Nur die hochkonfidente Motivmaske verpacken, keine rechteckige Restfläche.
  if(group.columns===3)for(let p=3;p<data.length;p+=4)data[p]=data[p]>=235?255:0;
  const labels=new Int32Array(w*h), parts=[];
  const queue=new Int32Array(w*h);
  // Zusammenhängende Alpha-Inseln statt starrer Zellen: die Freistellung kann
  // Abstände verändern. So werden über Zellgrenzen ragende Spitzen erhalten.
  for(let start=0;start<w*h;start++) {
    if(labels[start] || data[start*4+3]<24) continue;
    const id=parts.length+1;
    let head=0,tail=1,minX=w,minY=h,maxX=0,maxY=0;
    queue[0]=start;labels[start]=id;
    while(head<tail) {
      const p=queue[head++],x=p%w,y=Math.floor(p/w);
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1]) {
        if(n<0||labels[n]||data[n*4+3]<24)continue;
        labels[n]=id;queue[tail++]=n;
      }
    }
    parts.push({id,n:tail,minX,minY,maxX,maxY});
  }
  const main=parts.toSorted((a,b)=>b.n-a.n).slice(0,group.ids.length);
  if(main.some(p=>p.n<1000))throw new Error(`Unvollständige Freistellung: ${group.file}`);
  main.sort((a,b)=>(a.minY+a.maxY)-(b.minY+b.maxY));
  const ordered=[];
  for(let row=0;row<group.rows;row++)ordered.push(...main.slice(row*group.columns,(row+1)*group.columns).sort((a,b)=>(a.minX+a.maxX)-(b.minX+b.maxX)));
  console.log(group.file, ordered.map(p=>({n:p.n,box:[p.minX,p.minY,p.maxX,p.maxY]})));
  const assignments=new Map(main.map(p=>[p.id,p.id]));
  for(const p of parts) {
    if(assignments.has(p.id))continue;
    const cx=(p.minX+p.maxX)/2,cy=(p.minY+p.maxY)/2;
    const nearest=main.toSorted((a,b)=>distance(a,cx,cy)-distance(b,cx,cy))[0];
    // Einzelne Partikel nur in unmittelbarer Nähe des Schiffs übernehmen.
    if(distance(nearest,cx,cy)<15)assignments.set(p.id,nearest.id);
  }
  for(let i=0;i<ordered.length;i++) {
    const p=ordered[i],pixels=Buffer.alloc(data.length);
    for(let j=0;j<labels.length;j++)if(assignments.get(labels[j])===p.id)data.copy(pixels,j*4,j*4,j*4+4);
    const png=await sharp(pixels,{raw:{width:w,height:h,channels:4}}).trim({background:'#00000000',threshold:1})
      .resize(448,448,{fit:'contain',background:'#00000000'})
      .extend({top:32,bottom:32,left:32,right:32,background:'#00000000'}).png().toBuffer();
    const file=`ship_${group.ids[i]}.png`;
    await writeFile(path.join(out,file),png);
    manifest.push({id:group.ids[i],file,source:group.file});
  }
}
await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
function distance(p,x,y){return Math.hypot(Math.max(p.minX-x,0,x-p.maxX),Math.max(p.minY-y,0,y-p.maxY));}
