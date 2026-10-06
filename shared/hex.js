// Hex-Raster der Sektoren (pointy-top, axiale Koordinaten q, r). Von Server und Client genutzt.
import { WORLD } from './config.js';

const SQRT3 = Math.sqrt(3);
/** Hex-"Größe" (Mittelpunkt bis Ecke), so dass Nachbarmittelpunkte HEX_SPACING auseinander liegen */
export const HEX_SIZE = WORLD.HEX_SPACING / SQRT3;

export const hexKey = (q, r) => q + ',' + r;
export const parseHexKey = (k) => k.split(',').map(Number);

export function hexCenter(q, r) {
  return { x: HEX_SIZE * SQRT3 * (q + r / 2), y: HEX_SIZE * 1.5 * r };
}

/** Weltposition -> Hex (gerundet) */
export function hexAt(x, y) {
  const q = ((SQRT3 / 3) * x - (1 / 3) * y) / HEX_SIZE;
  const r = ((2 / 3) * y) / HEX_SIZE;
  return hexRound(q, r);
}

function hexRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q), rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq + 0, r: rr + 0 };
}

export const HEX_DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const hexNeighbors = (q, r) => HEX_DIRS.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));

/** Eckpunkte eines Hex (für die Galaxiekarte) */
export function hexCorners(q, r, scale = 1) {
  const c = hexCenter(q, r);
  const out = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    out.push({ x: c.x + HEX_SIZE * scale * Math.cos(a), y: c.y + HEX_SIZE * scale * Math.sin(a) });
  }
  return out;
}
