import { OBJECT_GUIDE } from '/shared/object-guide.js';
import { state, esc } from '../state.js';
import { cmd } from '../net.js';
import { registerAlmanacTab } from './almanac.js';
import { STATION_TYPES } from '/shared/goods.js';
import { spriteUrl } from '../assets.js';

export function guideHtml(key) {
  const d = OBJECT_GUIDE[key];
  if (!d) return '';
  const station=key.startsWith('st:')&&STATION_TYPES[key.slice(3)];
  const image=station&&!d.frame ? spriteUrl(station.sprite,station.accent)||d.image : d.image;
  const picture=d.frame?`<svg class="guide-art" viewBox="${d.frame.join(' ')}" role="img" aria-label="${esc(d.name)}"><image href="${image}" width="1536" height="1024"/></svg>`:`<img src="${image}" alt="${esc(d.name)}">`;
  return `<article class="object-guide">${picture}<h3>${esc(d.name)}</h3><p>${esc(d.intro)}</p><ul>${d.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></article>`;
}
for (const [id,label,categories] of [['buildings','Gebäude',['Gebäude','Stationen']],['objects','Weltobjekte',['Planeten','Ressourcenfelder','Schiffe','Fundstellen','Weltobjekte']]]) {
  registerAlmanacTab(id,label,() => Object.values(OBJECT_GUIDE).filter(d => categories.includes(d.category)).map(d => `<details><summary>${esc(d.name)}</summary>${guideHtml(d.key)}</details>`).join(''));
}

let pending = null;
const dialog = document.createElement('dialog');
dialog.className = 'object-guide-dialog';
dialog.setAttribute('aria-label','Objekterklärung');
document.body.append(dialog);
dialog.addEventListener('cancel', () => { pending = null; });
dialog.addEventListener('click', ev => {
  if (!ev.target.closest('[data-guide-understood]')) return;
  const next = pending; pending = null;
  dialog.close();
  if (!next || next.player !== state.me?.id) return;
  if (next.first) {
    state.guideRead ||= [];
    if (!state.guideRead.includes(next.key)) state.guideRead.push(next.key);
    cmd('guideRead', { key: next.key });
  }
  next.open?.();
});
export function showGuide(key, open = null, first = false) {
  if (!OBJECT_GUIDE[key]) { open?.(); return false; }
  pending = { key, open, first, player: state.me?.id };
  dialog.innerHTML = guideHtml(key) + '<button data-guide-understood>Verstanden</button>';
  if (!dialog.open) dialog.showModal();
  return true;
}
export function firstGuide(key, open) {
  if (!OBJECT_GUIDE[key] || state.guideRead?.includes(key)) return false;
  showGuide(key,open,true);
  return true;
}
export function resetGuide() { pending = null; dialog.close(); }
