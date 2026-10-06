import { GOODS, RECIPES, PLANET_TYPES, STATION_TYPES, BELT_TYPES, TIER_NAMES, CARGO_CLASSES, MINE_CLASSES } from '/shared/config.js';
import { state, esc, fmt } from '../state.js';
import { $, registerModal, openModal, setHtml } from './dom.js';
import { goodTag } from '../util.js';

/**
 * Almanach (Taste A): alles erst nach Entdeckung sichtbar, Unentdecktes als "???".
 * Rezepte gelten als entdeckt, sobald ein Markt mit diesem Rezept in Sensorreichweite war.
 */
const card = $('almanacCard');
const view = { tab: 'recipes', good: null, filter: '' };
const tabs = { recipes: 'Rezepte' };
const extraTabs = []; // weitere Reiter (Schiffe, Module) registrieren sich hier

export function registerAlmanacTab(id, label, render) {
  tabs[id] = label;
  extraTabs.push({ id, render });
}

const known = (key) => state.recipes.has(key);

/** Wer produziert bzw. verbraucht eine Ware? Liefert Listen { key, name, kind, known } */
function producersOf(g) {
  const out = [];
  for (const [id, r] of Object.entries(RECIPES)) if (r.out[g]) out.push({ key: 'st:' + id, name: r.name, kind: 'Station', recipe: r });
  for (const [id, p] of Object.entries(PLANET_TYPES)) if (p.produce[g]) out.push({ key: 'pl:' + id, name: p.name, kind: 'Planet' });
  for (const [id, b] of Object.entries(BELT_TYPES)) if (b.good === g) out.push({ key: 'bt:' + id, name: b.name, kind: 'Abbau' });
  for (const [id, s] of Object.entries(STATION_TYPES)) if (s.extract?.includes(g)) out.push({ key: 'st:' + id, name: s.name, kind: 'Station' });
  return out.map((x) => ({ ...x, known: known(x.key) }));
}
function consumersOf(g) {
  const out = [];
  for (const [id, r] of Object.entries(RECIPES)) if (r.in[g]) out.push({ key: 'st:' + id, name: r.name, kind: 'Station', recipe: r });
  for (const [id, p] of Object.entries(PLANET_TYPES)) if (p.consume[g]) out.push({ key: 'pl:' + id, name: p.name, kind: 'Planet' });
  for (const [id, s] of Object.entries(STATION_TYPES)) if (s.consume?.[g] || s.buys?.includes(g)) out.push({ key: 'st:' + id, name: s.name, kind: 'Station' });
  if (GOODS[g].ultra) out.push({ key: 'st:hub', name: 'Handels-Hub', kind: 'Station' });
  return out.map((x) => ({ ...x, known: known(x.key) }));
}

/** Eine Ware ist bekannt, wenn ein entdecktes Rezept, Planet oder Feld sie erzeugt oder verwendet */
export function goodKnown(g) {
  return producersOf(g).some((x) => x.known) || consumersOf(g).some((x) => x.known);
}

const recipeLine = (r) => `${Object.entries(r.in).map(([g, n]) => `${n} ${goodKnown(g) ? GOODS[g].name : '???'}`).join(' + ')} → ${Object.entries(r.out).map(([g, n]) => `${n} ${GOODS[g].name}`).join(' + ')} <span class="muted">(${r.time} s)</span>`;

function render() {
  let h = `<div class="modal-head"><h2>Almanach</h2>
    <div class="tabs">${Object.entries(tabs).map(([id, l]) => `<button class="small${view.tab === id ? ' active' : ''}" data-tab="${id}">${l}</button>`).join('')}</div>
    <span style="flex:1"></span><button data-close="1">✕</button></div>`;
  if (view.tab === 'recipes') h += renderRecipes();
  else h += extraTabs.find((t) => t.id === view.tab)?.render() || '';
  setHtml(card, h);
}

function renderRecipes() {
  const goods = Object.keys(GOODS);
  const nKnown = goods.filter(goodKnown).length;
  const f = view.filter.toLowerCase();
  let list = '';
  for (let t = 0; t <= 5; t++) {
    const gs = goods.filter((g) => GOODS[g].tier === t);
    const items = gs.map((g) => {
      const k = goodKnown(g);
      if (f && !(k && GOODS[g].name.toLowerCase().includes(f))) return '';
      return `<div class="alm-item${view.good === g ? ' sel' : ''}${k ? '' : ' unknown'}" data-good="${k ? g : ''}">
        ${k ? goodTag(g) : '<span class="muted">???</span>'}${k && GOODS[g].cls !== 'normal' ? ` <span class="cls cls-${GOODS[g].cls}" title="${CARGO_CLASSES[GOODS[g].cls]}">${GOODS[g].cls === 'hazard' ? '☢' : '👤'}</span>` : ''}${k && GOODS[g].ultra ? ' <span class="ultra" title="ultraselten">◆</span>' : ''}</div>`;
    }).join('');
    if (items.trim()) list += `<div class="alm-tier">${t} · ${TIER_NAMES[t]}</div>${items}`;
  }
  let det = '<div class="muted">Ware auswählen.</div>';
  const g = view.good;
  if (g && goodKnown(g)) {
    const d = GOODS[g];
    const prods = producersOf(g), cons = consumersOf(g);
    const row = (x) => x.known ? `<div>${x.kind === 'Planet' ? '🪐' : x.kind === 'Abbau' ? '⛏' : '🏭'} <b>${esc(x.name)}</b>${x.recipe ? `<div class="muted small-note">${recipeLine(x.recipe)}</div>` : ''}</div>` : '';
    const unknownN = (l) => l.filter((x) => !x.known).length;
    det = `<h3>${goodTag(g)}</h3>
      <div class="kv"><span>Stufe</span><span>${d.tier} · ${TIER_NAMES[d.tier]}</span>
      <span>Frachtklasse</span><span>${CARGO_CLASSES[d.cls]}${d.cls === 'hazard' ? ' (Geschirmte Kammer)' : d.cls === 'passenger' ? ' (Passagierkabine)' : ''}</span>
      <span>Abbauklasse</span><span>${d.mine ? MINE_CLASSES[d.mine] : '–'}</span>
      <span>Basispreis</span><span>${fmt(d.base)} Cr</span>
      ${d.ultra ? '<span>Hinweis</span><span>Ultraselten: wird nur am Handels-Hub angekauft</span>' : ''}</div>
      ${chainGraph(g)}
      <div class="section"><div class="section-title">Hergestellt in</div>${prods.map(row).join('')}${unknownN(prods) ? `<div class="muted">??? (${unknownN(prods)} unentdeckt)</div>` : ''}</div>
      <div class="section"><div class="section-title">Verwendet bzw. verbraucht in</div>${cons.map(row).join('')}${unknownN(cons) ? `<div class="muted">??? (${unknownN(cons)} unentdeckt)</div>` : ''}${!cons.length ? '<div class="muted">–</div>' : ''}</div>`;
  }
  return `<div class="toolbar"><input id="almFilter" placeholder="Ware suchen" value="${esc(view.filter)}"><span class="muted">${nKnown} von ${goods.length} Waren entdeckt</span></div>
    <div class="alm-grid"><div class="alm-list">${list}</div><div class="alm-detail">${det}</div></div>`;
}

/** Ketten-Graph: Vorstufen → Ware → Nachstufen (nur entdeckte Rezepte) */
function chainGraph(g) {
  const pre = new Set(), post = new Set();
  for (const [id, r] of Object.entries(RECIPES)) {
    if (!known('st:' + id)) continue;
    if (r.out[g]) Object.keys(r.in).forEach((x) => pre.add(x));
    if (r.in[g]) Object.keys(r.out).forEach((x) => post.add(x));
  }
  const L = [...pre], R = [...post];
  const rows = Math.max(L.length, R.length, 1);
  const W = 560, rowH = 26, H = rows * rowH + 10;
  const XL = 190, XC = 280, XR = 370; // rechte Kante links, Mitte, linke Kante rechts
  const y = (i, n) => 5 + (H - 10) * ((i + 0.5) / n);
  const widthOf = (gid) => Math.min(150, (goodKnown(gid) ? GOODS[gid].name : '???').length * 6.6 + 20);
  const node = (x0, yy, gid) => {
    const name = goodKnown(gid) ? GOODS[gid].name : '???';
    const tw = widthOf(gid);
    return `<g class="cg-node" data-good="${goodKnown(gid) ? gid : ''}"><rect x="${x0}" y="${yy - 10}" width="${tw}" height="20" rx="10" fill="${GOODS[gid].color}33" stroke="${GOODS[gid].color}"/>
      <text x="${x0 + tw / 2}" y="${yy + 4}" text-anchor="middle">${esc(name)}</text></g>`;
  };
  let s = '';
  const cy = H / 2, cw = widthOf(g);
  const cl = XC - cw / 2, cr = XC + cw / 2;
  L.forEach((x, i) => { const yy = y(i, L.length); s += `<path d="M${XL} ${yy} C${(XL + cl) / 2} ${yy} ${(XL + cl) / 2} ${cy} ${cl} ${cy}" class="cg-edge"/>`; });
  R.forEach((x, i) => { const yy = y(i, R.length); s += `<path d="M${cr} ${cy} C${(cr + XR) / 2} ${cy} ${(cr + XR) / 2} ${yy} ${XR} ${yy}" class="cg-edge"/>`; });
  L.forEach((x, i) => { s += node(XL - widthOf(x), y(i, L.length), x); });
  R.forEach((x, i) => { s += node(XR, y(i, R.length), x); });
  s += node(cl, cy, g);
  if (!L.length && !R.length) return `<div class="muted small-note">Noch keine Kettenglieder entdeckt.</div>`;
  return `<svg class="chain-graph" viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${s}</svg>`;
}

card.addEventListener('click', (ev) => {
  if (ev.target.closest('[data-close]')) { $('almanac').hidden = true; return; }
  const t = ev.target.closest('[data-tab]');
  if (t) { view.tab = t.dataset.tab; render(); return; }
  const it = ev.target.closest('[data-good]');
  if (it?.dataset.good) { view.good = it.dataset.good; render(); }
});
card.addEventListener('input', (ev) => {
  if (ev.target.id === 'almFilter') {
    view.filter = ev.target.value;
    render();
    const el = $('almFilter');
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
});

registerModal('almanac', render, null, { live: false });
export const openAlmanac = (good = null) => { if (good) { view.tab = 'recipes'; view.good = good; } openModal('almanac'); };
export const refreshAlmanac = () => { if (!$('almanac').hidden) render(); };
