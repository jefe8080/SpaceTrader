import {GOODS} from '/shared/config.js';
import {recipeStock, stockAssessment, storageSummary} from '/shared/production-display.js';
import {fmt, esc} from '../state.js';

export function stockLabel(value, need = null) {
  const assessment = stockAssessment(value, need);
  return `<span class="recipe-stock ${assessment === 'short' ? 'neg' : assessment === 'enough' ? 'pos' : 'muted'}">(${assessment === 'unknown' ? '—' : fmt(value)})</span>`;
}

export function recipeWithStock(market, recipe, id) {
  const side = (entries, input) => Object.entries(entries).map(([good, n]) => `${n} ${esc(GOODS[good]?.name || good)} ${stockLabel(input ? recipeStock(market, good, id) : market?.goods?.[good]?.stock, input ? n : null)}`).join(' + ') || '—';
  return `${side(recipe.in, true)} → ${side(recipe.out, false)}`;
}

const number = n => Number.isFinite(n) ? fmt(n) : '—';
const pair = (need, available, warn = true) => `<span class="${warn && Number.isFinite(need) && Number.isFinite(available) && need > available ? 'neg' : ''}">${number(need)} / ${number(available)}</span>`;
export function planetSummary(entity) {
  const m = entity.market, storage = storageSummary(m), supply = (m?.homeworld || m?.economy)?.supplyOverview;
  return `<b>${esc(entity.name)}</b><div class="kv"><span>Lager</span>${pair(storage?.usage.normal, storage?.capacity.normal, false)}<span>Gefahrgut</span>${pair(storage?.usage.hazard, storage?.capacity.hazard, false)}<span>Arbeitskräfte</span>${pair(supply?.workers.required, supply?.workers.available)}<span class="small-note">Einfach · Fach · Spezial</span><span class="small-note">${['basic','skilled','specialist'].map(q => pair(supply?.qualifications[q]?.required, supply?.qualifications[q]?.available)).join(' · ')}</span><span>Strom</span>${pair(supply?.power.required, supply?.power.available)}</div>`;
}
