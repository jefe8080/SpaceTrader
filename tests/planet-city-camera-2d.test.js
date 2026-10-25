import {test} from 'node:test';
import assert from 'node:assert/strict';
import {constrainCityPose,fitCityOverview,fitCityFocus} from '../client/js/planetCityCamera2D.js';
const landscape={x:0,y:0,width:2400,height:1600},bounds={x:400,y:260,width:1700,height:1100};
test('a finite painting covers all four viewport corners at every pan and zoom limit',()=>{
  for(const [width,height] of [[1600,1000],[390,844],[844,390],[3440,1440],[768,1024]]){
    for(const panel of [false,true]){
      const area={x:width>1100?290:12,y:140,width:width-(width>1100?320:24)-(panel&&width>1100?370:0),height:height-160-(panel&&width<=1100?height*.38:0)};
      for(const zoom of [.001,.4,1,3,100])for(const x of [-1e6,1200,1e6])for(const y of [-1e6,800,1e6]){
        const p=constrainCityPose({x,y,zoom},landscape,{width,height},area);
        for(const sx of [0,width])for(const sy of [0,height]){
          const wx=p.x+(sx-area.x-area.width/2)/p.zoom,wy=p.y+(sy-area.y-area.height/2)/p.zoom;
          assert.ok(wx>=-1e-7&&wx<=landscape.width+1e-7,`${width}x${height}: horizontal edge`);
          assert.ok(wy>=-1e-7&&wy<=landscape.height+1e-7,`${width}x${height}: vertical edge`);
        }
      }
      const p=fitCityOverview(bounds,landscape,{width,height},area);
      assert.ok(Number.isFinite(p.x+p.y+p.zoom));
    }
  }
});
test('landmarks near painting borders focus inside usable space, including mobile header and open panels',()=>{
  const scene={x:0,y:0,width:1536,height:1024};
  for(const [width,height] of [[1600,1000],[390,844],[844,390],[2560,1080]])for(const panel of [false,true]){
    const area={x:width>1100?316:12,y:158,width:width-(width>1100?332:24)-(panel&&width>1100?370:0),height:Math.max(100,height-182-(panel&&width<=1100?height*.38:0))};
    const overview=fitCityOverview({x:25,y:25,width:1486,height:974},scene,{width,height},area);
    for(const [x,y] of [[61,500],[661,36],[1435,24],[1400,950],[422,73]]){
      const p=fitCityFocus({x,y:y+20,h:40},scene,{width,height},area,overview.zoom);
      const sx=area.x+area.width/2+(x-p.x)*p.zoom,sy=area.y+area.height/2+(y-p.y)*p.zoom;
      assert.ok(sx>=area.x+10&&sx<=area.x+area.width-10,`horizontal focus ${width}x${height}`);
      assert.ok(sy>=area.y+10&&sy<=area.y+area.height-10,`vertical focus ${width}x${height}`);
    }
  }
});
