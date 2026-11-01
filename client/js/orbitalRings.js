// Physical completed orbital structures, independent of surface development.
const TAU=Math.PI*2;
function orbital(ctx, radius, large, front) {
  const scale = large ? 2.18 : 1.48, width = large ? .14 : .065;
  ctx.save(); ctx.rotate(-.34); ctx.scale(1, .39);
  const start = front ? 0 : Math.PI, end = start + Math.PI;
  ctx.strokeStyle = large ? '#304754' : '#435261'; ctx.lineWidth = radius * width;
  ctx.beginPath(); ctx.arc(0, 0, radius * scale, start, end); ctx.stroke();
  for (const lane of [-1, 1]) {
    ctx.strokeStyle = large ? '#d7e9e3' : '#9bb4c3'; ctx.lineWidth = radius * .013;
    ctx.beginPath(); ctx.arc(0, 0, radius * (scale + lane * width / 2), start, end); ctx.stroke();
  }
  ctx.strokeStyle = large ? '#dbb675' : '#efca7f'; ctx.lineWidth = radius * .012;
  ctx.beginPath(); ctx.arc(0, 0, radius * scale, start, end); ctx.stroke();
  const count = large ? 64 : 32;
  for (let i = 0; i < count; i++) {
    const a = i * TAU / count;
    if ((Math.sin(a) >= 0) !== front) continue;
    const x = Math.cos(a) * radius * scale, y = Math.sin(a) * radius * scale;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = i % 8 === 0 ? '#d6e9ed' : '#6e8796';
    ctx.fillRect(-radius * width * .7, -radius * .018, radius * width * 1.4, radius * .036);
    if (large && i % 8 === 0) {
      ctx.fillStyle = '#e0c58b'; ctx.fillRect(-radius * .12, -radius * .035, radius * .24, radius * .07);
      ctx.fillStyle = '#33465d'; ctx.fillRect(-radius * .07, -radius * .07, radius * .14, radius * .14);
    }
    ctx.restore();
  }
  ctx.restore();
}


export function drawOrbitalRings(ctx, entity, radius, front) {
  const rings=entity.market?.homeworld?.orbital;
  if(!rings)return;
  ctx.save();ctx.translate(entity.x,entity.y);
  if(rings.large)orbital(ctx,radius,true,front);
  if(rings.small)orbital(ctx,radius,false,front);
  ctx.restore();
}
