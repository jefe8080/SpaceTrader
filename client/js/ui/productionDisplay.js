import {GOODS} from '/shared/config.js';
import {recipeStock, stockAssessment, storageSummary} from '/shared/production-display.js';
import {fmt, esc} from '../state.js';

export function stockLabel(value, need = null) {
  const assessment = stockAssessment(value, need);
  return `<span class="recipe-stock ${assessment === 'short' ? 'neg' : assessment === 'enough' ? 'pos' : 'muted'}">(${assessment === 'unknown' ? '—' : fmt(value)})</span>`;
}

export function recipeWithStock(market, recipe, id) {
  const side = (entries, input) => Object.entries(entries).map(([good, n]) => `${n} ${esc(GOODS[good]?.name || good)} ${stockLabel(input ? recipeStock(market, good, id) : market?.goods?.[good]?.stock, input ? n : null)}`).join(' + ') || '—';
  return `<span data-production-recipe="${esc(id)}">${side(recipe.in, true)} → ${side(recipe.out, false)}</span>`;
}

const number = n => Number.isFinite(n) ? fmt(n) : '—';
const pair = (need, available, warn = true) => `<span class="${warn && Number.isFinite(need) && Number.isFinite(available) && need > available ? 'neg' : ''}">${number(need)} / ${number(available)}</span>`;
export function planetSummary(entity) {
  const m = entity.market, storage = storageSummary(m), supply = (m?.homeworld || m?.economy)?.supplyOverview;
  const stat=(label,need,available,warn=true)=>`<div class="supply-stat"><span class="supply-label">${label}</span>${pair(need,available,warn)}</div>`;
  return `<b class="planet-summary-name">${esc(entity.name)}</b><div class="supply-grid">
    ${stat('Lager',storage?.usage.normal,storage?.capacity.normal,false)}
    ${stat('Gefahrgut',storage?.usage.hazard,storage?.capacity.hazard,false)}
    ${stat('Arbeitskräfte',supply?.workers.required,supply?.workers.available)}
    ${['basic','skilled','specialist'].map((q,i)=>stat(['Einfache Arbeit','Fachkräfte','Spezialisten'][i],supply?.qualifications[q]?.required,supply?.qualifications[q]?.available)).join('')}
    ${stat('Strom',supply?.power.required,supply?.power.available)}</div>`;
}
