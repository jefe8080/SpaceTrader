// Almanach-Reiter Schiffe und Module: sichtbar sind gesehene oder gekaufte Typen
import { GOODS, SHIP_TYPES, SHIP_CLASSES, MODULES, MODULE_SIZE, moduleCapacity } from '/shared/config.js';
import { state, fmt, esc } from '../state.js';
import { registerAlmanacTab } from './almanac.js';
import { shipSprite } from '../util.js';

const SOURCE = { shipyard: 'jede Werft', bigyard: 'große Werft', faction: 'nur im Fraktionscluster' };

function renderShips() {
  const types = Object.entries(SHIP_TYPES).filter(([, d]) => !d.npc);
  const n = types.filter(([t]) => state.shipTypes.has(t)).length;
  let h = `<div class="toolbar"><span class="muted">${n} von ${types.length} Schiffstypen gesehen</span></div><div class="alm-cards">`;
  for (const cls of Object.keys(SHIP_CLASSES)) {
    const list = types.filter(([, d]) => d.cls === cls);
    if (!list.length) continue;
    h += `<div class="alm-tier">Klasse ${SHIP_CLASSES[cls].name} · Pilotenlizenz ${SHIP_CLASSES[cls].license} · ${SOURCE[SHIP_CLASSES[cls].yard]}</div>`;
    for (const [t, d] of list) {
      if (!state.shipTypes.has(t)) { h += `<div class="alm-card unknown"><div class="muted">???</div></div>`; continue; }
      const seen = state.shipPrices[t];
      h += `<div class="alm-card"><img src="${shipSprite(t, state.me.color)}" alt="">
        <div><b>${d.name}</b> <span class="badge">${SHIP_CLASSES[d.cls].name}</span>${d.faction ? ` <span class="muted">${esc(d.factionName || '')}</span>` : ''}
        <div class="kv small"><span>Laderaum</span><span>${fmt(d.cargo)}</span><span>Tempo</span><span>${d.speed}</span>
        <span>Tank</span><span>${d.tank}</span><span>Bergbau</span><span>${d.mining || '–'}</span>
        <span>Preis</span><span>${seen ? fmt(seen) + ' Cr (zuletzt gesehen)' : 'ca. ' + fmt(d.price) + ' Cr'}${d.currency ? ` + ${fmt(d.currency.n)} ${GOODS[d.currency.good].name}` : ''}</span>
        <span>Material</span><span>${Object.entries(d.build || {}).map(([g, k]) => `${k} ${GOODS[g].name}`).join(', ') || '–'}</span></div>
        <div class="muted small-note">${esc(d.desc)}</div></div></div>`;
    }
  }
  return h + '</div>';
}

function renderModules() {
  const list = Object.entries(MODULES);
  let h = `<div class="toolbar"><span class="muted">Ein Modul belegt ${MODULE_SIZE} Frachteinheiten. Jedes weitere gleiche Modul bringt +5 Kapazität (1: ${moduleCapacity(1)}, 2: ${moduleCapacity(2)}, 3: ${moduleCapacity(3)}) bzw. +100 % Abbau plus Kombo-Bonus.
    Erhältlich an großen Werften (1-2 Module) und in Fraktionssystemen. Ausbau an jeder Werft mit 50 % Erstattung.</span></div><div class="alm-cards">`;
  for (const [id, m] of list) {
    if (!state.moduleTypes.has(id)) { h += `<div class="alm-card unknown"><div class="muted">???</div></div>`; continue; }
    h += `<div class="alm-card"><div><b>${m.name}</b><div class="kv small"><span>Preis</span><span>${fmt(m.price)} Cr</span>
      <span>Wirkung</span><span>${m.cap ? (m.cap === 'hazard' ? 'Laderaum für Gefahrgut' : 'Platz für Passagiere') : `Abbau ${m.rate}/s`}</span></div>
      <div class="muted small-note">${esc(m.desc)}</div></div></div>`;
  }
  return h + '</div>';
}

registerAlmanacTab('ships', 'Schiffe', renderShips);
registerAlmanacTab('modules', 'Module', renderModules);
