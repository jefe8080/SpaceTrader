// Extract the outer alpha island; reuse exactly the same inner ring at all stages.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE||'sharp');
const root='docs/art/prd21/production/',out='client/assets/art/space/';
await mkdir(out,{recursive:true});const manifest=[];
for(const id of ['broken','small','partial','large','double']) {
 const {data,info}=await sharp(await readFile(root+id+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info;
 if(w!==h)throw Error('Square source required: '+id);
 if(['partial','large','double'].includes(id)) {
  const labels=new Int32Array(w*h),queue=new Int32Array(w*h),parts=[];
  for(let start=0;start<w*h;start++) {
   if(labels[start]||data[start*4+3]<80)continue;
   const label=parts.length+1;let head=0,n=1,x0=w,x1=0;queue[0]=start;labels[start]=label;
   while(head<n) {
    const p=queue[head++],x=p%w,y=Math.floor(p/w);x0=Math.min(x0,x);x1=Math.max(x1,x);
    for(const q of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(q>=0&&!labels[q]&&data[q*4+3]>=80){labels[q]=label;queue[n++]=q;}
   }
   parts.push({label,n,x0,x1});
  }
  const outer=parts.filter(p=>p.x1-p.x0>w*.8).sort((a,b)=>b.n-a.n)[0];
  if(!outer)throw Error('No separated outer ring: '+id);
  // Near-transparent generator noise can bridge two separate rings. Identify
  // the opaque outer structure first, then recover only its nearby alpha edge.
  let mask=Uint8Array.from(labels,label=>label===outer.label?1:0);
  for(let pass=0;pass<6;pass++) {
   const next=Uint8Array.from(mask);
   for(let p=0;p<w*h;p++)if(!mask[p]&&data[p*4+3]>=2){
    const x=p%w,y=Math.floor(p/w);
    if((x>0&&mask[p-1])||(x<w-1&&mask[p+1])||(y>0&&mask[p-w])||(y<h-1&&mask[p+w]))next[p]=1;
   }
   mask=next;
  }
  for(let p=0;p<w*h;p++)if(!mask[p])data[p*4+3]=0;
 }
 let left=w,right=0,transparent=0;
 for(let p=0;p<w*h;p++){const a=data[p*4+3];if(a<8)transparent++;if(a>16){left=Math.min(left,p%w);right=Math.max(right,p%w);}}
 if(transparent<w*h*.4)throw Error('Background not transparent: '+id);
 const side=Math.round(w*896/(right-left+1)),pad=Math.floor((1024-side)/2);
 if(pad<16)throw Error('Insufficient margin: '+id);
 const normalized=await sharp(data,{raw:info}).resize(side,side).extend({left:pad,right:1024-side-pad,top:pad,bottom:1024-side-pad,background:'#00000000'}).ensureAlpha().raw().toBuffer();
 // No planet may be baked into an orbital sprite.
 for(let y=450;y<574;y++)for(let x=450;x<574;x++) {
  const p=(y*1024+x)*4+3;
  if(normalized[p]>8)throw Error('Nonempty center: '+id);
  normalized[p]=0; // Remove only near-zero mask noise in the verified empty opening.
 }
 for(const front of [false,true]) {
  const pixels=Buffer.from(normalized);
  if(front)pixels.fill(0,0,512*1024*4);else pixels.fill(0,512*1024*4);
  const key='orbital_'+id+'_'+(front?'front':'back'),file=key+'.png';
  await sharp(pixels,{raw:{width:1024,height:1024,channels:4}}).png().toFile(out+file);
  manifest.push({id:key,file,source:root+id+'.png',anchor:[512,512],sourceSize:w,normalizedSize:1024,side,pad});
 }
}
await writeFile(out+'orbital-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Packaged 10 aligned transparent orbital layers.');
