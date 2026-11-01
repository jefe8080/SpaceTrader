// Lädt Schiffs-PNGs und SVGs; SVG-Akzente werden weiter in Canvas-Caches eingefärbt.
import { PLANET_TYPES, STATION_TYPES, BELT_TYPES, SHIP_TYPES } from '/shared/config.js';
import { shipArtUrl } from './shipArt.js';
import { SPACE_ART, spaceArtUrl } from '/shared/space-art.js';

const SPRITES = [...new Set([...Object.keys(SPACE_ART), ...[PLANET_TYPES, STATION_TYPES, BELT_TYPES, SHIP_TYPES].flatMap((t) => Object.values(t).map((d) => d.sprite))])];
const PLACEHOLDER = /#ff00ff/gi;

const sources = new Map(); // name -> SVG-Text
const cache = new Map();   // key -> canvas | 'loading'
const urlCache = new Map();
const painted = new Map(); // name -> geladenes, transparentes PNG

export async function loadAssets() {
  await Promise.all(SPRITES.map(async (n) => {
    const art = spaceArtUrl(n) || shipArtUrl(n);
    if (art) {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = art;
        });
        painted.set(n, img);
        return;
      } catch (error) {
        if (spaceArtUrl(n)) throw new Error('Weltraumgrafik fehlt: ' + art, {cause: error});
        // Ships retain their SVG fallback.
      }
    }
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
  if (painted.has(name)) return painted.get(name);
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
  if (painted.has(name)) return spaceArtUrl(name) || shipArtUrl(name);
  const key = `${name}|${color}`;
  if (!urlCache.has(key)) {
    const svg = svgFor(name, color);
    if (!svg) return '';
    urlCache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  }
  return urlCache.get(key);
}
