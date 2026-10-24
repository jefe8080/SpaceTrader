import { hexAt, hexCorners, hexNeighbors, HEX_SIZE } from './hex.js';

export function coveredPoint(areas, point) {
  const hex = hexAt(point.x, point.y);
  return areas.some(a => a.kind === 'circle' ? Math.hypot(point.x-a.x,point.y-a.y)<=a.radius+1e-7
    : [hex,...hexNeighbors(hex.q,hex.r)].some(h=>Math.max(Math.abs(h.q-a.q),Math.abs(h.r-a.r),Math.abs(h.q+h.r-a.q-a.r))<=a.rings&&polygonInterval(point,point,hexCorners(h.q,h.r))));
}

// Clip the actual segment against each convex footprint; merge intervals, so
// adjacent own networks connect without overlooking a narrow uncovered gap.
function polygonInterval(from,to,polygon) {
  let low=0,high=1;
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],ex=b.x-a.x,ey=b.y-a.y;
    const start=ex*(from.y-a.y)-ey*(from.x-a.x),delta=ex*(to.y-from.y)-ey*(to.x-from.x);
    if(Math.abs(delta)<1e-9){if(start < -1e-6)return null;continue;}
    const t=-start/delta;if(delta>0)low=Math.max(low,t);else high=Math.min(high,t);
    if(low>high+1e-10)return null;
  }
  return [Math.max(0,low),Math.min(1,high)];
}

export function coveredSegment(areas,from,to) {
  const dx=to.x-from.x,dy=to.y-from.y,length2=dx*dx+dy*dy;
  if(!length2)return coveredPoint(areas,from);
  const intervals=[];
  for(const area of areas){
    if(area.kind==='circle'){
      const px=from.x-area.x,py=from.y-area.y,b=2*(px*dx+py*dy),c=px*px+py*py-area.radius**2;
      const discriminant=b*b-4*length2*c;if(discriminant<0)continue;
      const root=Math.sqrt(discriminant),low=Math.max(0,(-b-root)/(2*length2)),high=Math.min(1,(-b+root)/(2*length2));
      if(low<=high)intervals.push([low,high]);
    }else{
      for(let dq=-area.rings;dq<=area.rings;dq++)for(let dr=Math.max(-area.rings,-dq-area.rings);dr<=Math.min(area.rings,-dq+area.rings);dr++){
        const polygon=hexCorners(area.q+dq,area.r+dr),center={x:(polygon[0].x+polygon[3].x)/2,y:(polygon[0].y+polygon[3].y)/2};
        if(center.x+HEX_SIZE<Math.min(from.x,to.x)||center.x-HEX_SIZE>Math.max(from.x,to.x)||center.y+HEX_SIZE<Math.min(from.y,to.y)||center.y-HEX_SIZE>Math.max(from.y,to.y))continue;
        const interval=polygonInterval(from,to,polygon);if(interval)intervals.push(interval);
      }
    }
  }
  intervals.sort((a,b)=>a[0]-b[0]);let end=0;
  for(const [low,high] of intervals){if(low>end+1e-9)return false;end=Math.max(end,high);if(end>=1-1e-9)return true;}
  return false;
}
