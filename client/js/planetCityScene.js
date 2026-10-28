import {GOODS} from '/shared/config.js';
import {productionBubble} from '/shared/production-display.js';
import {CITY_TYPES, planCity, citySprite, cityDevelopment, pickCity} from './planetCityLayout.js';
import {constrainCityPose,fitCityOverview,fitCityFocus} from './planetCityCamera2D.js';

let artPromise;
const terrainPromises=new Map();
function loadImage(src) { return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Stadtgrafik fehlt: '+src));image.src=src;}); }
function loadTerrain(type){if(!terrainPromises.has(type))terrainPromises.set(type,loadImage('/assets/art/cities/'+type+'-city-v2.png').catch(error=>{terrainPromises.delete(type);throw error;}));return terrainPromises.get(type);}
function loadArt() {
  return artPromise ||= loadImage('/assets/art/cities/sprites.png')
    .then(atlas=>{
      const surface=document.createElement('canvas');surface.width=atlas.width;surface.height=atlas.height;
      const context=surface.getContext('2d',{willReadFrequently:true});context.drawImage(atlas,0,0);
      const sprites=Array.from({length:25},(_,i)=>{
        const x0=Math.round(i%5*atlas.width/5),y0=Math.round(Math.floor(i/5)*atlas.height/5);
        const width=Math.round((i%5+1)*atlas.width/5)-x0,height=Math.round((Math.floor(i/5)+1)*atlas.height/5)-y0;
        const data=context.getImageData(x0,y0,width,height),pixels=data.data;
        // Ignore tiny detached fragments at atlas cell boundaries, not parts of the main silhouette.
        const labels=new Int32Array(width*height),components=[];
        for(let p=0;p<labels.length;p++){
          if(labels[p]||pixels[p*4+3]<50)continue;
          const id=components.length+1,queue=[p];labels[p]=id;
          for(let at=0;at<queue.length;at++){
            const q=queue[at],x=q%width,y=Math.floor(q/width);
            for(const n of [x? q-1:-1,x<width-1?q+1:-1,y?q-width:-1,y<height-1?q+width:-1])
              if(n>=0&&!labels[n]&&pixels[n*4+3]>=50){labels[n]=id;queue.push(n);}
          }
          components.push({size:queue.length,edge:queue.some(q=>q%width<4||q%width>width-5||Math.floor(q/width)<18)});
        }
        const largest=Math.max(...components.map(c=>c.size)),threshold=largest*.012;
        let left=width,top=height,right=0,bottom=0;
        for(let p=0;p<labels.length;p++){
          const component=components[labels[p]-1];
          if(!component||component.size<threshold||(component.edge&&component.size<largest*.28)){pixels[p*4+3]=0;continue;}
          const x=p%width,y=Math.floor(p/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
        }
        const image=document.createElement('canvas');image.width=width;image.height=height;image.getContext('2d').putImageData(data,0,0);
        return {image,x:left,y:top,w:right-left+1,h:bottom-top+1};
      });
      return {sprites};
    }).then(async art=>({...art,elevators:await Promise.all(['small','large'].map(size=>loadImage('/assets/orbital_elevator_'+size+'.svg')))})).catch(error=>{artPromise=null;throw error;});
}
function line(ctx,points,color,width) {ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}
function ellipse(ctx,x,y,rx,ry,fill) {ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function drawSprite(ctx,sprite,x,y,w,h) { const ratio=Math.min(w/sprite.w,h/sprite.h),dw=sprite.w*ratio,dh=sprite.h*ratio;ctx.drawImage(sprite.image,sprite.x,sprite.y,sprite.w,sprite.h,x-dw/2,y-dh,dw,dh); }

export class PlanetCityScene {
  constructor(canvas,callbacks) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.callbacks=callbacks;
    this.records=new Map();this.assignments=new Map();this.active=false;this.loading=true;this.epoch=0;
    this.selected=null;this.hover=null;this.names=false;this.time=0;this.pose={x:0,y:0,zoom:1};this.pointers=new Map();
    this.label=document.getElementById('planetLabel');
    this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    canvas.setAttribute('aria-label','Planetare Stadtansicht. Ziehen zum Verschieben, Mausrad zum Zoomen. Mit Tab zu den Stadtorten wechseln.');
    canvas.addEventListener('contextmenu',event=>event.preventDefault());
    canvas.addEventListener('wheel',event=>{if(!this.active)return;event.preventDefault();this.zoomTo(this.pose.zoom*Math.exp(-event.deltaY*.001),event.clientX,event.clientY);},{passive:false});
    canvas.addEventListener('pointerdown',event=>{
      if(!this.active||this.loading||event.button!==0)return;
      if(!this.pointers.size)this.gesture=false;
      this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,sx:event.clientX,sy:event.clientY});
      canvas.setPointerCapture(event.pointerId);
      if(this.pointers.size===2){const [a,b]=[...this.pointers.values()];this.gesture=true;this.pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:this.pose.zoom};}
    });
    canvas.addEventListener('pointermove',event=>{
      const p=this.pointers.get(event.pointerId);
      if(!p){this.hover=this.pick(event.clientX,event.clientY);this.mark();return;}
      const dx=event.clientX-p.x,dy=event.clientY-p.y;p.x=event.clientX;p.y=event.clientY;
      if(this.pointers.size===2&&this.pinch){const[a,b]=[...this.pointers.values()];this.zoomTo(this.pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,this.pinch.distance),(a.x+b.x)/2,(a.y+b.y)/2);}
      else if(this.pointers.size===1&&(this.gesture||Math.hypot(p.x-p.sx,p.y-p.sy)>5)){
        this.gesture=true;this.flight=null;this.pose.x-=dx/this.pose.zoom;this.pose.y-=dy/this.pose.zoom;this.clampPose();
      }
      this.hover=null;this.mark();
    });
    canvas.addEventListener('pointerup',event=>{
      const p=this.pointers.get(event.pointerId);this.pointers.delete(event.pointerId);
      if(this.active&&p&&!this.gesture&&Math.hypot(event.clientX-p.sx,event.clientY-p.sy)<=5)this.callbacks.select(this.pick(event.clientX,event.clientY));
      if(!this.pointers.size)this.pinch=null;
    });
    canvas.addEventListener('pointercancel',()=>{this.pointers.clear();this.pinch=null;this.gesture=true;});
    canvas.addEventListener('pointerleave',()=>{this.hover=null;this.mark();});
    // Spatially located keyboard buttons replace the inaccessible canvas-only / dropdown interaction.
    this.targets=document.createElement('div');this.targets.id='planetCityTargets';this.targets.hidden=true;
    this.targets.setAttribute('aria-label','Orte in der Stadt');document.body.append(this.targets);
  }
  reset(){this.epoch++;this.loading=true;this.selected=null;this.hover=null;this.flight=null;this.pointers.clear();this.targets.replaceChildren();this.mark();}
  show(){this.active=true;this.targets.hidden=false;}
  hide(){this.active=false;this.flight=null;this.pointers.clear();this.pinch=null;this.targets.hidden=true;if(this.label)this.label.hidden=true;}
  async load(entity,items,recipeCategory,valid=()=>true){
    const epoch=++this.epoch;this.loading=true;
    const [art,terrain]=await Promise.all([loadArt(),loadTerrain(entity.type)]);if(epoch!==this.epoch||!valid())return;
    const changed=this.entity?.id!==entity.id;
    this.entity=entity;this.art={...art,terrain};this.theme=CITY_TYPES[entity.type]||CITY_TYPES.colony;
    this.plan=planCity(entity,items,this.assignments.get(entity.id),recipeCategory);this.assignments.set(entity.id,this.plan.assignments);
    this.records=new Map(this.plan.records.map(r=>[r.key,r]));
    this.prepareScenery();this.targets.replaceChildren();
    for(const record of this.plan.records){
      const button=document.createElement('button');button.className='city-target';button.textContent=record.item.label;
      button.setAttribute('aria-label',record.item.label);button.dataset.cityKey=record.key;
      button.addEventListener('focus',()=>{if(this.active){this.hover=record.key;this.fly(this.focusPose(record));this.mark();}});
      button.addEventListener('blur',()=>{this.hover=null;this.mark();});
      button.addEventListener('click',()=>this.callbacks.select(record.key));this.targets.append(button);record.button=button;
    }
    this.loading=false;this.sizeKey='';this.resize();if(changed)this.pose={...this.overview};this.clampPose();
    this.callbacks.status('');this.mark();
  }
  areaFor(w,h){
    const controls=document.getElementById('planetBar');
    const header=document.getElementById('topbar');
    if(controls&&header)controls.style.top=Math.ceil(header.getBoundingClientRect().bottom)+12+'px';
    let left=16,right=w-16,top=Math.max(100,(controls&&!controls.hidden?controls.getBoundingClientRect().bottom:80)+14),bottom=h-24;
    for(const id of ['fleet','planetPanel']){
      const element=document.getElementById(id);if(!element||element.hidden||!element.getClientRects().length)continue;
      const b=element.getBoundingClientRect();
      if(id==='fleet'&&w>1100)left=Math.max(left,b.right+18);
      if(id==='planetPanel'){if(w>1100)right=Math.min(right,b.left-18);else bottom=Math.min(bottom,b.top-14);}
    }
    return{x:left,y:top,width:Math.max(120,right-left),height:Math.max(100,bottom-top)};
  }
  resize(){
    const w=innerWidth,h=innerHeight,area=this.areaFor(w,h),dpr=Math.min(devicePixelRatio||1,2),key=JSON.stringify([w,h,dpr,area]);
    if(key===this.sizeKey)return;this.sizeKey=key;this.area=area;this.dpr=dpr;this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);
    const b=this.plan.bounds;this.overview=this.plan.authored?fitCityOverview(b,this.plan.landscape,{width:w,height:h},area):{x:b.x+b.width/2,y:b.y+b.height/2,zoom:Math.min(area.width/b.width,area.height/b.height)*.95};
    this.fly(this.selected&&this.records.has(this.selected)?this.focusPose(this.records.get(this.selected)):this.overview);
  }
  focusPose(record){return fitCityFocus(record,this.plan.landscape,{width:innerWidth,height:innerHeight},this.area,this.overview.zoom);}
  fly(pose){
    if(this.plan?.authored)pose=constrainCityPose(pose,this.plan.landscape,{width:innerWidth,height:innerHeight},this.area);
    if(this.reducedMotion){this.pose={...pose};this.flight=null;}else this.flight={from:{...this.pose},to:{...pose},elapsed:0};
  }
  clampPose(){
    if(this.plan?.authored){this.pose=constrainCityPose(this.pose,this.plan.landscape,{width:innerWidth,height:innerHeight},this.area);return;}
    const b=this.plan?.bounds;if(!b)return;this.pose.x=Math.max(b.x,Math.min(b.x+b.width,this.pose.x));this.pose.y=Math.max(b.y,Math.min(b.y+b.height,this.pose.y));
  }
  zoomTo(zoom,x,y){if(!this.plan||this.loading)return;this.flight=null;const before=this.toWorld(x,y);this.pose.zoom=Math.max(this.overview.zoom*.8,Math.min(8,zoom));const after=this.toWorld(x,y);this.pose.x+=before.x-after.x;this.pose.y+=before.y-after.y;this.clampPose();}
  toWorld(x,y){const a=this.area;return{x:(x-a.x-a.width/2)/this.pose.zoom+this.pose.x,y:(y-a.y-a.height/2)/this.pose.zoom+this.pose.y};}
  toScreen(x,y){const a=this.area;return{x:a.x+a.width/2+(x-this.pose.x)*this.pose.zoom,y:a.y+a.height/2+(y-this.pose.y)*this.pose.zoom};}
  select(key,force=false){if(!force&&key===this.selected)return;this.selected=this.records.has(key)?key:null;if(this.overview)this.fly(this.selected?this.focusPose(this.records.get(this.selected)):this.overview);this.mark();}
  setNames(value){this.names=value;}
  pick(x,y){
    if(!this.active||this.loading||!this.area)return null;
    const p=this.toWorld(x,y),exact=pickCity(this.plan.records,p.x,p.y);if(exact)return exact;
    // Small figures remain tappable at overview scale; the closest centre resolves expanded targets.
    let closest=null,distance=Infinity;
    for(const r of this.records.values()){
      if(this.plan.authored&&r.w*this.pose.zoom>=44&&r.h*this.pose.zoom>=44)continue;
      const s=this.toScreen(r.x,r.y-r.h/2),dx=Math.abs(x-s.x),dy=Math.abs(y-s.y);
      if(dx<=Math.max(22,r.w*this.pose.zoom/2)&&dy<=Math.max(22,r.h*this.pose.zoom/2)&&dx*dx+dy*dy<distance){closest=r.key;distance=dx*dx+dy*dy;}
    }
    return closest;
  }
  mark(){this.canvas.style.cursor=this.hover?'pointer':'grab';if(this.label)this.label.hidden=true;}
  prepareScenery(){
    // Streets, residences and surroundings belong to the single authored painting for every type.
    this.scenery=null;this.surroundings=null;this.decorations=[];
  }
  drawRecord(ctx,r){
    const item=r.item,cell=citySprite(this.entity,item,GOODS),active=r.key===this.selected||r.key===this.hover;
    if(active){
      ellipse(ctx,r.x,r.y+3,r.w*.45,r.character?8:12,'#f5d28c70');
      if(r.authored&&r.polygon)line(ctx,[...r.polygon,r.polygon[0]],'#ffe1a3bb',1.5/this.pose.zoom);
      else if(!r.authored){ctx.save();ctx.strokeStyle='#ffe1a3';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.strokeRect(r.box.x-5,r.box.y-4,r.w+10,r.h+8);ctx.restore();}
    }
    if(item.homeOrbital && ['orbital-small','orbital-large'].includes(cityDevelopment(this.entity,item))){
      const large=cityDevelopment(this.entity,item)==='orbital-large',w=large?112:88,h=w*1.5;
      ctx.drawImage(this.art.elevators[large?1:0],r.x-w/2,r.y-h,w,h);
      if(active||this.names)this.drawName(ctx,r);return;
    }
    if(r.painted){if(active||this.names)this.drawName(ctx,r);return;}
    if(cell===null){
      if(r.authored){
        // The empty courtyard is already painted and connected; just a small timber site marker.
        line(ctx,[{x:r.x,y:r.y-2},{x:r.x,y:r.y-16}],'#775d3a',2);ctx.fillStyle='#d3bc86';ctx.fillRect(r.x-8,r.y-16,16,7);
        if(active||this.names)this.drawName(ctx,r);return;
      }
      ctx.save();ctx.strokeStyle='#bda270';ctx.fillStyle='#9e936754';ctx.lineWidth=2;ctx.setLineDash([9,6]);ctx.fillRect(r.x-61,r.y-64,122,60);ctx.strokeRect(r.x-61,r.y-64,122,60);ctx.restore();
      for(const x of [-58,58])line(ctx,[{x:r.x+x,y:r.y},{x:r.x+x,y:r.y-31}],'#e3c08b',4);
    }else{
      const orbitalScale=item.homeOrbital?(cityDevelopment(this.entity,item)==='orbital-large'?1.05:.82):1;
      const sway=r.character&&!this.reducedMotion?Math.sin(this.time*1.7+(r.key==='dog'?1:0))*1.5:0;
      drawSprite(ctx,this.art.sprites[cell],r.x,r.y+sway,r.w*orbitalScale,r.h*orbitalScale);
      if(this.entity.type==='ice'&&!r.character){line(ctx,[{x:r.x-39,y:r.y-r.h*.55},{x:r.x+30,y:r.y-r.h*.65}],'#edf1dbbb',5);}
    }
    if(item.good&&!r.authored){
      const color=GOODS[item.good]?.color||'#e6c98c';ctx.fillStyle='#253f3d';ctx.fillRect(r.x-17,r.y-6,34,13);ctx.fillStyle=color;ctx.fillRect(r.x-14,r.y-3,5,7);
      ctx.font='bold 7px system-ui';ctx.textAlign='left';ctx.fillStyle='#eee5cd';ctx.fillText((GOODS[item.good]?.name||item.good).slice(0,3).toUpperCase(),r.x-6,r.y+3);
    }
    const level=item.kind==='questhouse'?this.entity.market?.economy?.specialization?.level:item.homeFacility==='control'?this.entity.market?.homeworld?.controlLevel:0;
    if(level)for(let i=0;i<Math.min(level,8);i++){ctx.fillStyle='#e6be73';ctx.fillRect(r.x-18+i*6,r.y-18,4,6);}
    if(active||this.names)this.drawName(ctx,r);
  }
  drawName(ctx,r){
    const scale=1/this.pose.zoom,text=r.item.label||r.key;ctx.save();ctx.translate(r.x,r.y-r.h-10);ctx.scale(scale,scale);
    ctx.font='12px system-ui';const w=ctx.measureText(text).width+16;ctx.fillStyle='#162c2bea';ctx.strokeStyle='#c9ab73';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(-w/2,-19,w,23,4);ctx.fill();ctx.stroke();ctx.fillStyle='#f6e8c9';ctx.textAlign='center';ctx.fillText(text,0,-3);ctx.restore();
  }
  drawProductionBubble(ctx,r){
    const text=productionBubble(this.entity.market,r.item);if(!text)return;
    const phase=[...r.key].reduce((n,c)=>n+c.charCodeAt(0),0);
    const sway=this.reducedMotion?0:Math.sin(this.time*1.5+phase)*4;
    const s=this.toScreen(r.x,r.y-r.h);
    ctx.save();ctx.translate(s.x+sway,s.y-34);
    ctx.fillStyle='#fff9e9';ctx.strokeStyle='#756143';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(-23,-15,46,28,9);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-5,13);ctx.lineTo(0,19);ctx.lineTo(5,13);ctx.fill();
    ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillStyle='#443c2b';ctx.fillText(text,0,5);ctx.restore();
  }
  render(dt){
    if(!this.active||this.loading||!this.plan)return;this.resize();this.time+=Math.min(dt||0,.06);
    if(this.flight){const f=this.flight;f.elapsed+=Math.min(dt||0,.06);const t=Math.min(1,f.elapsed/.5),k=1-(1-t)**3;for(const key of ['x','y','zoom'])this.pose[key]=f.from[key]+(f.to[key]-f.from[key])*k;if(t===1)this.flight=null;}
    this.clampPose();
    const ctx=this.ctx,a=this.area,p=this.pose;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.fillStyle=this.theme.ground;ctx.fillRect(0,0,innerWidth,innerHeight);
    ctx.save();ctx.translate(a.x+a.width/2,a.y+a.height/2);ctx.scale(p.zoom,p.zoom);ctx.translate(-p.x,-p.y);
    const b=this.plan.landscape;ctx.drawImage(this.art.terrain,b.x,b.y,b.width,b.height);
    for(const r of [...this.records.values()].sort((a,b)=>a.y-b.y))this.drawRecord(ctx,r);
    if(!this.reducedMotion)for(const r of this.records.values()){
      if(r.item.kind!=='factory'||cityDevelopment(this.entity,r.item)!=='ready')continue;
      for(let i=0;i<3;i++){const t=(this.time*.25+i/3)%1;ellipse(ctx,r.x+15+Math.sin(t*5)*6,r.y-115-t*38,4+t*7,3+t*5,`rgba(226,218,191,${(1-t)*.22})`);}
    }
    ctx.restore();
    for(const r of this.records.values()){
      this.drawProductionBubble(ctx,r);
      const s=this.toScreen(r.x,r.y-r.h/2),bw=Math.max(44,r.w*p.zoom),bh=Math.max(44,r.h*p.zoom);
      // Buttons stay transparent until keyboard focused; pointer events always go to the canvas.
      Object.assign(r.button.style,{left:s.x-bw/2+'px',top:s.y-bh/2+'px',width:bw+'px',height:bh+'px'});
      r.button.setAttribute('aria-pressed',String(r.key===this.selected));
    }
  }
}
