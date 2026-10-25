import {GOODS} from '/shared/config.js';
import {CITY_TYPES, planCity, citySprite, cityDevelopment, hashCity, pickCity} from './planetCityLayout.js';
import {constrainCityPose,fitCityOverview} from './planetCityCamera2D.js';

let artPromise;
const terrainPromises=new Map();
const CITY_DECOR={urban:[8,20,14,8],industrial:[16,6,21,20],gasgiant:[8,6,21],mining:[3,16,20],jungle:[20,11,20],volcanic:[5,16,6],colony:[20,21,20]};
function loadImage(src) { return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Stadtgrafik fehlt: '+src));image.src=src;}); }
function loadTerrain(type){if(!terrainPromises.has(type))terrainPromises.set(type,loadImage('/assets/art/cities/'+(type==='agrar'?'agrar-city-v2':type)+'.png').catch(error=>{terrainPromises.delete(type);throw error;}));return terrainPromises.get(type);}
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
    }).catch(error=>{artPromise=null;throw error;});
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
  focusPose(record){return{x:record.x,y:record.y-record.h*.38,zoom:Math.min(2.1,Math.max(this.overview.zoom*1.6,Math.min(this.area.width/410,this.area.height/310)))};}
  fly(pose){
    if(this.plan?.authored)pose=constrainCityPose(pose,this.plan.landscape,{width:innerWidth,height:innerHeight},this.area);
    if(this.reducedMotion){this.pose={...pose};this.flight=null;}else this.flight={from:{...this.pose},to:{...pose},elapsed:0};
  }
  clampPose(){
    if(this.plan?.authored){this.pose=constrainCityPose(this.pose,this.plan.landscape,{width:innerWidth,height:innerHeight},this.area);return;}
    const b=this.plan?.bounds;if(!b)return;this.pose.x=Math.max(b.x,Math.min(b.x+b.width,this.pose.x));this.pose.y=Math.max(b.y,Math.min(b.y+b.height,this.pose.y));
  }
  zoomTo(zoom,x,y){if(!this.plan||this.loading)return;this.flight=null;const before=this.toWorld(x,y);this.pose.zoom=Math.max(this.overview.zoom*.8,Math.min(3,zoom));const after=this.toWorld(x,y);this.pose.x+=before.x-after.x;this.pose.y+=before.y-after.y;this.clampPose();}
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
    // The composed agricultural city is one painting: no generated roads, decor sprites or tiling.
    if(this.plan.authored){this.scenery=null;this.surroundings=null;this.decorations=[];return;}
    const b=this.plan.bounds,padding=180;this.scenery=document.createElement('canvas');
    this.sceneryOrigin={x:b.x-padding,y:b.y-padding};this.scenery.width=Math.ceil(b.width+padding*2);this.scenery.height=Math.ceil(b.height+padding*2);
    const ctx=this.scenery.getContext('2d'),{terrain}=this.art;
    ctx.fillStyle=this.theme.ground;ctx.fillRect(0,0,this.scenery.width,this.scenery.height);
    ctx.drawImage(terrain,0,0,this.scenery.width,this.scenery.height);
    this.surroundings=document.createElement('canvas');this.surroundings.width=this.scenery.width;this.surroundings.height=this.scenery.height;
    this.surroundings.getContext('2d').drawImage(this.scenery,0,0);
    ctx.translate(-this.sceneryOrigin.x,-this.sceneryOrigin.y);
    ctx.globalAlpha=.25;ctx.fillStyle=this.theme.ground;ctx.fillRect(b.x-100,b.y-60,b.width+200,b.height+120);ctx.globalAlpha=1;
    // Broad avenues, fine ink edges, irregular paving, and a shared civic plaza connect the settlement.
    const paving=document.createElement('canvas');paving.width=48;paving.height=32;const pc=paving.getContext('2d');
    pc.fillStyle=this.theme.road;pc.fillRect(0,0,48,32);
    for(let row=0;row<4;row++)for(let col=-1;col<5;col++){
      const x=col*15+(row%2?7:0),y=row*8;pc.fillStyle=(row+col)%3?'#fff1c519':'#5d50331c';pc.fillRect(x+1,y+1,13,6);pc.strokeStyle='#504f3926';pc.lineWidth=.6;pc.strokeRect(x,y,15,8);
    }
    const stone=ctx.createPattern(paving,'repeat');
    const ring=[{x:b.x+90,y:b.y+130},{x:b.x+b.width-90,y:b.y+130},{x:b.x+b.width-90,y:b.y+b.height-95},{x:b.x+90,y:b.y+b.height-95},{x:b.x+90,y:b.y+130}];
    line(ctx,ring,'#544f3c55',20);line(ctx,ring,stone,17);
    line(ctx,[{x:0,y:b.y+130},this.plan.plaza,{x:0,y:b.y+b.height-95}],stone,18);
    for(const road of this.plan.roads){line(ctx,road.points,'#554f4355',34);line(ctx,road.points,this.theme.road,30);line(ctx,road.points,stone,26);}
    ellipse(ctx,0,156,158,115,'#5d57466b');ellipse(ctx,0,156,151,108,stone);
    const seed=hashCity(this.entity.type);
    for(let i=0;i<1600;i++){
      const n=hashCity(seed+':'+i),x=b.x+(n%10000)/10000*b.width,y=b.y+((n>>>10)%10000)/10000*b.height;
      ctx.fillStyle=i%2?'#eee4bd22':'#3e493522';ctx.fillRect(x,y,2+n%3,1);
    }
    this.decorations=[];
    for(let row=0;row<7;row++)for(let col=0;col<12;col++){
      const n=hashCity(this.entity.type+':house:'+row+':'+col);
      const x=b.x+30+col*(b.width-60)/11+(n%33-16),y=b.y+90+row*(b.height-150)/6+((n>>>8)%41-20);
      const box={x:x-50,y:y-92,width:100,height:104};
      const collides=this.plan.records.some(r=>box.x<r.box.x+r.w+28&&box.x+box.width>r.box.x-28&&box.y<r.y+34&&box.y+box.height>r.box.y-22);
      if(collides||Math.hypot(x,y-150)<195)continue;
      const cells=CITY_DECOR[this.entity.type]||[20];
      const cell=this.entity.type==='ruins'&&col%3===0?18:cells[n%cells.length];
      const width=92+n%21;drawSprite(ctx,this.art.sprites[cell],x,y,width,96);
      if(this.entity.type==='ice')line(ctx,[{x:x-26,y:y-43},{x:x+22,y:y-49}],'#edf1dbcc',4);
      this.decorations.push({x,y});
    }
    if(this.entity.type!=='ruins'){
      const x=b.x+185,y=b.y+b.height-180;
      if(!this.plan.records.some(r=>Math.abs(r.x-x)<190&&Math.abs(r.y-y)<140)){
        line(ctx,[{x,y},{x:0,y},this.plan.plaza],stone,24);
        drawSprite(ctx,this.art.sprites[17],x,y,200,150);
      }
    }
    // Small civic planting and lamps frame the square without inventing interactive buildings.
    for(const x of [-125,125])for(const y of [125,215]){
      ellipse(ctx,x,y+3,13,6,'#49473866');line(ctx,[{x,y},{x,y:y-28}],'#554e39',3);
      ellipse(ctx,x,y-28,13,9,this.entity.type==='ice'?'#d7e5d5':this.entity.type==='volcanic'?'#8e7050':'#60794a');
      ellipse(ctx,x-3,y-32,9,6,this.theme.trim);
    }
  }
  drawRecord(ctx,r){
    const item=r.item,cell=citySprite(this.entity,item,GOODS),active=r.key===this.selected||r.key===this.hover;
    if(active){
      ellipse(ctx,r.x,r.y+3,r.w*.45,r.character?8:12,'#f5d28c70');
      if(r.authored&&r.polygon)line(ctx,[...r.polygon,r.polygon[0]],'#ffe1a3bb',1.5/this.pose.zoom);
      else if(!r.authored){ctx.save();ctx.strokeStyle='#ffe1a3';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.strokeRect(r.box.x-5,r.box.y-4,r.w+10,r.h+8);ctx.restore();}
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
  render(dt){
    if(!this.active||this.loading||!this.plan)return;this.resize();this.time+=Math.min(dt||0,.06);
    if(this.flight){const f=this.flight;f.elapsed+=Math.min(dt||0,.06);const t=Math.min(1,f.elapsed/.5),k=1-(1-t)**3;for(const key of ['x','y','zoom'])this.pose[key]=f.from[key]+(f.to[key]-f.from[key])*k;if(t===1)this.flight=null;}
    this.clampPose();
    const ctx=this.ctx,a=this.area,p=this.pose;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.fillStyle=this.theme.ground;ctx.fillRect(0,0,innerWidth,innerHeight);
    ctx.save();ctx.translate(a.x+a.width/2,a.y+a.height/2);ctx.scale(p.zoom,p.zoom);ctx.translate(-p.x,-p.y);
    // Authored cities use a single bounded painting; older types retain their renderer until approval.
    if(this.plan.authored){const b=this.plan.landscape;ctx.drawImage(this.art.terrain,b.x,b.y,b.width,b.height);}
    else {
    const image=this.surroundings,o=this.sceneryOrigin,lo=this.toWorld(0,0),hi=this.toWorld(innerWidth,innerHeight);
    for(let y=Math.floor((lo.y-o.y)/image.height);y<=Math.floor((hi.y-o.y)/image.height);y++)
      for(let x=Math.floor((lo.x-o.x)/image.width);x<=Math.floor((hi.x-o.x)/image.width);x++){
        const flipX=Math.abs(x)%2,flipY=Math.abs(y)%2;ctx.save();ctx.translate(o.x+(x+flipX)*image.width,o.y+(y+flipY)*image.height);ctx.scale(flipX?-1:1,flipY?-1:1);ctx.drawImage(image,0,0);ctx.restore();
      }
    ctx.drawImage(this.scenery,o.x,o.y);
    }
    for(const r of [...this.records.values()].sort((a,b)=>a.y-b.y))this.drawRecord(ctx,r);
    if(!this.reducedMotion)for(const r of this.records.values()){
      if(r.item.kind!=='factory'||cityDevelopment(this.entity,r.item)!=='ready')continue;
      for(let i=0;i<3;i++){const t=(this.time*.25+i/3)%1;ellipse(ctx,r.x+15+Math.sin(t*5)*6,r.y-115-t*38,4+t*7,3+t*5,`rgba(226,218,191,${(1-t)*.22})`);}
    }
    ctx.restore();
    for(const r of this.records.values()){
      const s=this.toScreen(r.x,r.y-r.h/2),bw=Math.max(44,r.w*p.zoom),bh=Math.max(44,r.h*p.zoom);
      // Buttons stay transparent until keyboard focused; pointer events always go to the canvas.
      Object.assign(r.button.style,{left:s.x-bw/2+'px',top:s.y-bh/2+'px',width:bw+'px',height:bh+'px'});
      r.button.setAttribute('aria-pressed',String(r.key===this.selected));
    }
  }
}
