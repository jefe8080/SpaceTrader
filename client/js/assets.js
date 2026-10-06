// Lädt die SVG-Grafiken, ersetzt die Platzhalterfarbe #ff00ff und rastert sie in Canvas-Caches.
import { PLANET_TYPES, STATION_TYPES, BELT_TYPES, SHIP_TYPES } from '/shared/config.js';

const SPRITES = [...new Set([PLANET_TYPES, STATION_TYPES, BELT_TYPES, SHIP_TYPES].flatMap((t) => Object.values(t).map((d) => d.sprite)))];
const PLACEHOLDER = /#ff00ff/gi;

const sources = new Map(); // name -> SVG-Text
const cache = new Map();   // key -> canvas | 'loading'
const urlCache = new Map();

export async function loadAssets() {
  await Promise.all(SPRITES.map(async (n) => {
    const res = await fetch(`/assets/${n}.svg`);
    sources.set(n, await res.text());
  }));
}

function svgFor(name, color) {
  const src = sources.get(name);
  if (!src) return null;
  return color ? src.replace(PLACEHOLDER, color) : src;
}

/** Liefert ein gerastertes Canvas oder null, solange es noch lädt. */
export function getSprite(name, color = null, px = 256) {
  const key = `${name}|${color}|${px}`;
  const c = cache.get(key);
  if (c && c !== 'loading') return c;
  if (c === 'loading') return null;
  const svg = svgFor(name, color);
  if (!svg) return null;
  cache.set(key, 'loading');
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    cv.getContext('2d').drawImage(img, 0, 0, px, px);
    cache.set(key, cv);
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return null;
}

/** Data-URL zur Verwendung in <img> im HTML-UI */
export function spriteUrl(name, color = null) {
  const key = `${name}|${color}`;
  if (!urlCache.has(key)) {
    const svg = svgFor(name, color);
    if (!svg) return '';
    urlCache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  }
  return urlCache.get(key);
}
