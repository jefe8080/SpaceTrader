import { planetDevelopment } from '/shared/planet-development.js';

const TAU = Math.PI * 2;
function randomFor(id) {
  let seed = 2166136261;
  for (const ch of id) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  return () => { seed = Math.imul(seed ^ seed >>> 15, 1 | seed); seed ^= seed + Math.imul(seed ^ seed >>> 7, 61 | seed); return ((seed ^ seed >>> 14) >>> 0) / 4294967296; };
}

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
  ctx.strokeStyle = large ? '#74d9ef' : '#efca7f'; ctx.lineWidth = radius * .012;
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
      ctx.fillStyle = '#90e5f3'; ctx.fillRect(-radius * .12, -radius * .035, radius * .24, radius * .07);
      ctx.fillStyle = '#33465d'; ctx.fillRect(-radius * .07, -radius * .07, radius * .14, radius * .14);
    }
    ctx.restore();
  }
  ctx.restore();
}

function settlements(ctx, entity, radius, stage) {
  if (!stage) return;
  const ruins = entity.type === 'ruins', random = randomFor(entity.id), density = ruins ? [0, 28, 100, 240][stage] : [0, 16, 36][stage];
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, radius * .96, 0, TAU); ctx.clip();
  // Fixed districts grow into one another as development advances. Their seed
  // depends only on the world, so every player sees the same settled surface.
  const centers = Array.from({ length: 5 }, () => ({ x: (random() - .5) * radius * 1.25, y: (random() - .5) * radius * 1.15 }));
  if (ruins && stage >= 2) {
    ctx.strokeStyle = stage === 3 ? '#efcd7bbb' : '#d4b47777'; ctx.lineWidth = radius * .009;
    ctx.beginPath(); centers.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
  }
  for (let i = 0; i < density; i++) {
    const center = centers[i % centers.length], spread = radius * (ruins ? [0,.34,.5,.72][stage] : .22);
    const x = center.x + (random() - .5) * spread, y = center.y + (random() - .5) * spread;
    const size = radius * (.015 + random() * .025);
    ctx.fillStyle = ruins ? '#28303bd9' : '#3a485a88'; ctx.fillRect(x - size, y - size, size * 2.1, size * 1.5);
    ctx.fillStyle = i % 5 === 0 ? '#b9edfa' : '#f5d18b';
    ctx.globalAlpha = ruins ? .65 + stage * .1 : .65;
    ctx.fillRect(x, y, size * .55, size * .3); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawPlanetExterior(ctx, entity, radius, drawBase) {
  const development = planetDevelopment(entity);
  ctx.save(); ctx.translate(entity.x, entity.y);
  if (development.largeRing) orbital(ctx, radius, true, false);
  if (development.smallRing) orbital(ctx, radius, false, false);
  ctx.restore();
  drawBase();
  ctx.save(); ctx.translate(entity.x, entity.y);
  settlements(ctx, entity, radius, development.stage);
  if (development.smallRing) orbital(ctx, radius, false, true);
  if (development.largeRing) orbital(ctx, radius, true, true);
  ctx.restore();
}
