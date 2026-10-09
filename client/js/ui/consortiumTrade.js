// Konsortium: Besitz, Kartendaten und Schiffshandel (PRD-3 4.4 bis 4.6) als Bereiche im Konsortiumsfenster
import { WORLD, SHIP_TYPES, UPGRADES, MODULES, PROP_UPGRADES, CONSORTIUM } from '/shared/config.js';
import { hexAt, hexKey } from '/shared/hex.js';
import { state, fmt, esc, myShips } from '../state.js';
import { cmd } from '../net.js';
import { typeName } from '../util.js';
import { extraSections, rerenderConsortium } from './consortium.js';
import { bus } from './bus.js';
import { closeModal } from './dom.js';

const draft = { sector: '', mapPrice: '', ship: '', shipPrice: '' };
const num = (v) => Math.max(0, Math.floor(Number(String(v).replace(/\./g, '')) || 0));

/** Eigene aufgedeckte Zellen je Sektor (zwischengespeichert, bis neue Zellen dazukommen) */
let cellCache = { n: -1, bySector: new Map() };
function cellsBySector() {
  if (cellCache.n === state.cells.size) return cellCache.bySector;
  const m = new Map();
  for (const k of state.cells) {
    const [cx, cy] = k.split(',').map(Number);
    const h = hexAt((cx + 0.5) * WORLD.FOG_CELL, (cy + 0.5) * WORLD.FOG_CELL);
    const key = hexKey(h.q, h.r);
    m.set(key, (m.get(key) || 0) + 1);
  }
  cellCache = { n: state.cells.size, bySector: m };
  return m;
}

function showEntity(id) {
  const e = state.entities.get(id);
  if (!e) return;
  closeModal('consModal');
  state.camera.x = e.x; state.camera.y = e.y; state.camera.zoom = Math.max(state.camera.zoom, 0.12); state.follow = null;
  bus.select({ kind: 'entity', id });
}

extraSections.push({
  key: 'props',
  title: (c) => `Besitz (${c.props} / ${c.maxProps})`,
  render(c) {
    const master = c.rank === 'master';
    if (!c.propList?.length) return `<div class="muted">Noch kein Konsortiumsbesitz. Handelsmeister kaufen vor Ort mit „Für Konsortium kaufen“, jedes Mitglied kann eigenen Besitz übertragen.</div>`;
    return `<table class="market"><tr><th>Objekt</th><th>Handel</th><th>Ausbau</th><th>Erlöse gesamt</th><th></th></tr>
      ${c.propList.map((p) => { const e = state.entities.get(p.entity); return `<tr><td><span class="link" data-c="showProp" data-id="${p.entity}">${esc(p.name)}</span> <span class="muted">${e ? typeName(e) : ''}</span></td>
        <td>${p.mode === 'private' ? 'privat' : 'offen'}${p.customs ? ` · Zoll ${Math.round(p.customs * 100)} %` : ''}</td>
        <td class="small-note">${Object.entries(p.upg || {}).map(([k, v]) => `${PROP_UPGRADES[k].name} ${v}`).join(', ') || '–'}</td>
        <td>${fmt(p.inc)}</td>
        <td>${master ? `<button class="small" data-c="buyOut" data-id="${p.entity}" title="Zum aktuellen Preis aus deinem Privatgeld in den Pool">Herauskaufen</button>` : ''}</td></tr>`; }).join('')}</table>
      <div class="muted small-note">Konsortiumsbesitz zählt nur gegen das Konsortiumslimit. Erlöse fließen gebührenfrei in den Pool.</div>`;
  },
  click(d) {
    if (d.c === 'showProp') { showEntity(d.id); return true; }
    if (d.c === 'buyOut') { if (confirm('Besitz herauskaufen? Der aktuelle Preis inkl. Ausbau geht aus deinem Privatgeld in den Pool.')) cmd('cBuyOut', { target: d.id }); return true; }
    return false;
  },
});

extraSections.push({
  key: 'maps',
  title: (c) => `Kartendaten (${c.maps?.length || 0})`,
  render(c) {
    const by = cellsBySector();
    const sectors = [...by.entries()].filter(([k]) => state.sectors.has(k)).sort((a, b) => b[1] - a[1]);
    const total = (Math.PI * WORLD.SECTOR_RADIUS ** 2) / WORLD.FOG_CELL ** 2;
    const sel = draft.sector || sectors[0]?.[0] || '';
    let h = `<div class="btnrow"><select id="cmSector">${sectors.map(([k, n]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>Sektor ${esc(state.sectors.get(k).name)}: ${fmt(n)} Zellen (${Math.min(100, Math.round((n / total) * 1000) / 10).toLocaleString("de-DE")} %)</option>`).join('')}</select>
      <input id="cmPrice" type="number" min="0" step="1000" placeholder="Preis" value="${esc(draft.mapPrice)}" style="width:110px">
      <button class="small" data-c="mapOffer" ${sel ? '' : 'disabled'}>Anbieten</button></div>
      <div class="muted small-note">Käufer erhalten deinen Stand zum Kaufzeitpunkt (Zellen, Systeme, Zonen, Wurmlöcher), ohne XP und Almanach. Du erhältst ${Math.round(CONSORTIUM.SALE_SHARE * 100)} % des Preises. Das Angebot bleibt, bis du es löschst.</div>`;
    if (c.maps?.length) {
      h += `<table class="market" style="margin-top:6px"><tr><th>Sektor</th><th>Anbieter</th><th>Zellen</th><th>Preis</th><th></th></tr>
        ${c.maps.map((o) => `<tr><td>${esc(o.sectorName)}</td><td>${esc(o.sellerName)}</td><td>${fmt(o.cells)} (${o.pct.toLocaleString("de-DE")} %)</td><td>${fmt(o.price)} Cr</td>
          <td>${o.own ? `<button class="small danger" data-c="mapDelete" data-id="${o.id}">Löschen</button>` : `<button class="small primary" data-c="mapBuy" data-id="${o.id}" ${state.credits < o.price ? 'disabled' : ''}>Kaufen</button>`}</td></tr>`).join('')}</table>`;
    }
    return h;
  },
  click(d) {
    switch (d.c) {
      case 'mapOffer': cmd('cMapOffer', { sector: draft.sector || document.getElementById('cmSector')?.value, price: num(draft.mapPrice) }); return true;
      case 'mapDelete': cmd('cMapDelete', { id: d.id }); return true;
      case 'mapBuy': if (confirm('Kartendaten kaufen?')) cmd('cMapBuy', { id: d.id }); return true;
    }
    return false;
  },
  input(t) {
    if (t.id === 'cmPrice') draft.mapPrice = t.value;
    if (t.id === 'cmSector') draft.sector = t.value;
  },
});

/** Warum kann dieses Schiff nicht angeboten werden? '' = möglich */
function offerBlock(s) {
  if (s.offer !== null && s.offer !== undefined) return 'schon angeboten';
  if (s.main) return 'Hauptschiff';
  if (s.state !== 'docked') return 'nicht angedockt';
  if (Object.keys(s.cargo || {}).length) return 'Laderaum nicht leer';
  if (s.queue?.length) return 'hat Befehle';
  if (myShips().filter((x) => x !== s && (x.offer === null || x.offer === undefined)).length < 1) return 'letztes Schiff';
  return '';
}

extraSections.push({
  key: 'ships',
  title: (c) => `Schiffshandel (${c.ships?.length || 0})`,
  render(c) {
    const ships = myShips();
    const sel = draft.ship && ships.some((s) => s.id === draft.ship) ? draft.ship : ships.find((s) => !offerBlock(s))?.id || '';
    let h = `<div class="btnrow"><select id="csShip">${ships.map((s) => { const why = offerBlock(s); return `<option value="${s.id}" ${s.id === sel ? 'selected' : ''} ${why ? 'disabled' : ''}>${esc(s.name)} (${SHIP_TYPES[s.type].name})${why ? ' · ' + why : ''}</option>`; }).join('')}</select>
      <input id="csPrice" type="number" min="0" step="1000" placeholder="Preis" value="${esc(draft.shipPrice)}" style="width:110px">
      <button class="small" data-c="shipOffer" ${sel ? '' : 'disabled'}>Anbieten</button></div>
      <div class="muted small-note">Angedockt, leerer Laderaum, keine Befehle, nicht Hauptschiff, nicht das letzte Schiff. Das Schiff ist während des Angebots gesperrt und wechselt beim Kauf an Ort und Stelle den Besitzer. Du erhältst ${Math.round(CONSORTIUM.SALE_SHARE * 100)} %.</div>`;
    if (c.ships?.length) {
      h += `<table class="market" style="margin-top:6px"><tr><th>Schiff</th><th>Anbieter</th><th>Ausstattung</th><th>Ort</th><th>Preis</th><th></th></tr>
        ${c.ships.map((o) => `<tr><td><b>${esc(o.name)}</b> <span class="badge cls-${SHIP_TYPES[o.type].cls}">${SHIP_TYPES[o.type].name}</span></td><td>${esc(o.sellerName)}</td>
          <td class="small-note">${[...Object.entries(o.upg).filter(([, v]) => v).map(([k, v]) => `${UPGRADES[k]?.name || k} +${v}`), ...o.modules.map((m) => MODULES[m]?.name || m)].join(', ') || '–'}${o.bonus ? ` · Werftbonus +${Math.round(o.bonus * 100)} %` : ''}</td>
          <td>${esc(o.at)}</td><td>${fmt(o.price)} Cr</td>
          <td>${o.own ? `<button class="small danger" data-c="shipDelete" data-id="${o.ship}">Zurückziehen</button>` : `<button class="small primary" data-c="shipBuy" data-id="${o.ship}" ${state.credits < o.price ? 'disabled' : ''}>Kaufen</button>`}</td></tr>`).join('')}</table>`;
    }
    return h;
  },
  click(d) {
    switch (d.c) {
      case 'shipOffer': {
        const id = draft.ship || document.getElementById('csShip')?.value;
        if (id && confirm('Schiff im Konsortium anbieten? Es ist bis zum Verkauf oder Zurückziehen gesperrt.')) cmd('cShipOffer', { ship: id, price: num(draft.shipPrice) });
        return true;
      }
      case 'shipDelete': cmd('cShipDelete', { ship: d.id }); return true;
      case 'shipBuy': if (confirm('Schiff kaufen? Es wechselt an Ort und Stelle zu dir.')) cmd('cShipBuy', { ship: d.id }); return true;
    }
    return false;
  },
  input(t) {
    if (t.id === 'csPrice') draft.shipPrice = t.value;
    if (t.id === 'csShip') draft.ship = t.value;
  },
  change(t) { if (t.id === 'csShip' || t.id === 'cmSector') rerenderConsortium(); },
});
