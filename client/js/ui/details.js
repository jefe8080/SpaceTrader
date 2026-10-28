import {canLand,accessTo} from '../planetside.js';
import { GOODS, SHIP_TYPES, STATION_TYPES, PLANET_TYPES, BELT_TYPES, SUPPLY, recipeText, canBuyFrom, canSellTo } from '/shared/config.js';
import { state, myShips, fmt, fmtK, esc, playerColor, playerName, selectedShips, fleetOrder } from '../state.js';
import { socket, cmd } from '../net.js';
import { typeName, entitySprite, shipSprite, goodTag, playerPrice, cargoUsed, statusText, queueText, shipSymbol, hasWarn, flightSecs, fmtDuration, systemName, sectorName } from '../util.js';
import { ZONE_TYPES, ABILITIES } from '/shared/config.js';
import { openAlmanac } from './almanac.js';
import { shipyardSection, hubSection, factionYardSection, outpostSection, bonusBadge, repLine } from './shipyard.js';
import { propertySection, governorSection, handlePropertyAction, handlePropertyChange, storagePrice } from './property.js';
import { FACTIONS } from '/shared/factions.js';
import { shipStats, holdUsage, countModules, MODULES as MODS, holdOf, FLAGSHIP } from '/shared/ships.js';
import { $, setHtml, typing } from './dom.js';
import { barChart, fmtNum, stockBar } from './charts.js';
import { bus } from './bus.js';
import { orderShips } from './orders.js';
import { questBoardSection } from './quests.js';
import { eventSection } from './events.js';
import { enterPlanet } from './planetPanel.js';
import {moduleStockPanel,handleModuleAction} from './modules.js';
import {colonyPanel,warpPanel} from './colonies.js';
import { entityGuideKey, OBJECT_GUIDE } from '/shared/object-guide.js';
import { showGuide } from './objectGuide.js';
import { homeGoodLimit } from '/shared/homeworld.js';

const entName = (id) => esc(state.entities.get(id)?.name || 'unbekannter Ort');
const dockedHereOwn = (id) => myShips().some((s) => s.dockedAt === id);
/** Sektorname an einer Position (oder "Leerraum") */
function sectorOfPoint(p) {
  for (const s of state.sectors.values()) if (Math.hypot(s.bh.x - p.x, s.bh.y - p.y) < 80000) return 'Sektor ' + s.name;
  return 'Leerraum';
}

export function renderDetails() {
  if (typing() && $('details').contains(document.activeElement)) return;
  const el = $('details');
  const sel = state.selected;
  let html = '';
  const multi = selectedShips();
  if (multi.length > 1) html = multiDetails(multi);
  else if (sel?.kind === 'ship') {
    const s = state.ships.get(sel.id);
    if (s) html = shipDetails(s);
  } else if (sel?.kind === 'entity') {
    const e = state.entities.get(sel.id);
    if (e) html = entityDetails(e);
  }
  el.hidden = !html;
  const object = sel && (sel.kind === 'entity' ? state.entities.get(sel.id) : state.ships.get(sel.id));
  const guide = entityGuideKey(sel?.kind === 'ship' && object ? {...object,kind:'ship'} : object);
  if (html && OBJECT_GUIDE[guide]) html = `<button class="small ghost" data-guide-help="${guide}" aria-label="Erklärung anzeigen">? Hilfe</button>` + html;
  setHtml(el, html);
}

$('details').addEventListener('click', ev => {
  const key = ev.target.closest('[data-guide-help]')?.dataset.guideHelp;
  if (key) { ev.stopImmediatePropagation(); showGuide(key); }
}, true);

/** Statistik des gewählten Schiffes bzw. Marktes anfragen */
export function requestStats() {
  const sel = state.selected;
  if (sel?.kind === 'entity' && state.entities.get(sel.id)?.market) socket.emit('stats', { entityId: sel.id });
  if (sel?.kind === 'ship' && state.ships.get(sel.id)?.owner === state.me?.id) socket.emit('shipStats', { ship: sel.id });
}

// ---------- Mehrfachauswahl ----------
function multiDetails(ships) {
  const routes = [...state.routes.values()];
  let h = `<div class="det-head"><div><div class="title">${ships.length} Schiffe ausgewählt</div>
    <div class="type">Rechtsklick: Befehl an alle · Shift: anhängen</div></div></div>
    <div class="chips">${ships.map((s) => `<span class="chip" data-act="selone" data-ship="${s.id}">${shipSymbol(s)} ${esc(s.name)}${hasWarn(s) ? ' ⚠' : ''}</span>`).join('')}</div>
    <div class="section"><div class="btnrow">
      <button data-act="stopAll">■ Stopp</button>
      <button data-act="clearSel">Auswahl aufheben</button>
      <button data-act="newRouteSel">＋ Neue Route</button>
    </div></div>`;
  if (routes.length) {
    h += `<div class="section"><div class="section-title">Route zuweisen</div><div class="btnrow">
      <select id="multiRoute">${routes.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>
      <button data-act="assignSel">Zuweisen</button><button data-act="assignSelAppend" title="an die Queue anhängen">Anhängen</button></div></div>`;
  }
  h += `<div class="section"><div class="section-title">Gruppe</div><div class="btnrow">
    <select id="multiGroup"><option value="">Ohne Gruppe</option>${state.groups.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select>
    <button data-act="groupSel">Verschieben</button></div></div>`;
  return h;
}

// ---------- Schiff ----------
function shipDetails(s) {
  const def = SHIP_TYPES[s.type];
  const own = s.owner === state.me.id;
  const color = playerColor(s.owner);
  let h = `<div class="det-head"><img src="${shipSprite(s.type, color)}" alt=""><div>
    <div class="title">${s.main ? '<span class="crown" title="Hauptschiff">♛</span> ' : ''}${esc(s.name)}${own ? ` <button class="small ghost" data-act="rename" data-ship="${s.id}" title="Umbenennen">✎</button>` : ''}</div>
    <div class="type">${def.name}${own ? '' : ' · ' + esc(s.task ? 'Station' : playerName(s.owner))}</div></div></div>`;
  if (s.task) return h + npcTaskHtml(s);
  if (!own) return h + `<div class="muted">${def.desc}</div>`;
  const used = cargoUsed(s);
  h += `<div class="status-line">${shipSymbol(s)} ${s.transit ? 'Im Wurmloch …' : statusText(s)}</div>`;
  if (s.offer !== null && s.offer !== undefined) {
    h += `<div class="warnbox">🤝 Im Konsortium für ${fmt(s.offer)} Cr angeboten, gesperrt.
      <button class="small" data-act="cShipDelete" data-ship="${s.id}">Angebot zurückziehen</button></div>`;
  }
  if (s.zone?.length) h += `<div class="zone-line">${s.zone.map((z) => `<span style="color:${ZONE_TYPES[z].color}">◌ ${ZONE_TYPES[z].name}: ${ZONE_TYPES[z].desc}</span>`).join('<br>')}</div>`;
  if(s.relocationHold)h+=`<div class="warnbox">Standorttransfer: ${s.relocationHold.state==='waiting'?'sicher angehalten':'begonnener Abschnitt wird beendet'}.<button class="small" data-act="relocationResume" data-ship="${s.id}">Relokationspause aufheben</button></div>`;
  if (hasWarn(s)) {
    h += `<div class="warnbox">${Object.values(s.warn).map((w) => `<div>⚠ ${esc(w)}</div>`).join('')}
      <button class="small" data-act="clearWarn" data-ship="${s.id}">Quittieren</button></div>`;
  }
  const here = state.entities.get(s.dockedAt);
  const st = shipStats(s), hu = holdUsage(s);
  const mods = Object.entries(countModules(s));
  const mineTxt = Object.entries(st.mining).filter(([, v]) => v > 0).map(([k, v]) => `${{ std: 'Laser', drill: 'Tiefbohrer', acid: 'Säure', gas: 'Gas' }[k]} ${Math.round(v * 10) / 10}/s`).join(', ');
  const up = (l) => (s.upg?.[l] ? ` <span class="badge" title="Upgrade-Stufe">+${s.upg[l]}</span>` : '');
  h += `<div class="kv"><span>Klasse</span><span>${def.cls} · ${def.name}${bonusBadge(s)}</span>
    ${def.ability ? `<span>Fähigkeit</span><span class="ability">★ ${ABILITIES[def.ability]}</span>` : ''}
    <span>Laderaum</span><span>${hu.cargo} / ${st.cargo}${up('cargo')}${st.hazard ? ` · ☢ ${hu.hazard}/${st.hazard}` : ''}${st.passenger ? ` · 👤 ${hu.passenger}/${st.passenger}` : ''}</span>
    <span>Geschwindigkeit</span><span>${Math.round(st.speed)}${up('speed')}</span>
    <span>Bergbau</span><span>${mineTxt || '–'}</span>
    <span>Sensor</span><span>${fmt(st.sensor)}</span>
    ${mods.length ? `<span>Module</span><span>${mods.map(([id, n]) => MODS[id].name + (n > 1 ? ' ×' + n : '')).join(', ')}</span>` : ''}
    <span>Position</span><span>${here ? esc(systemName(here)) + ' · ' : ''}${esc(sectorOfPoint(s))}</span>
    <span>Markerfarbe</span><span><input type="color" class="marker-color" data-ship="${s.id}" value="${s.marker || state.me.color}"></span></div>`;

  // Treibstoff
  if (st.tank > 0) {
    s.tank = st.tank;
    const pct = Math.max(0, Math.min(100, (s.fuel / s.tank) * 100));
    const canFuel = here?.market?.goods.shipfuel && canBuyFrom(here.market.goods.shipfuel);
    h += `<div class="fuel-row"><span class="muted">Treibstoff</span>
      <span class="fuelbar${pct < 15 ? ' low' : ''}"><div style="width:${pct}%"></div></span>
      <span>${s.fuel.toFixed(1)} / ${Math.round(s.tank * 10) / 10}${up('tank')}</span>
      ${canFuel ? `<button class="small" data-act="refuel" data-ship="${s.id}" ${pct > 99 ? 'disabled' : ''}>⛽ Tanken (${playerPrice(here, 'shipfuel', 'buy').toFixed(1)} Cr)</button>` : ''}
      <label class="muted" title="Beim Andocken an einem Markt mit Treibstoff automatisch tanken, wenn der Tank darunter liegt">Auto unter
        <select class="small auto-refuel" data-ship="${s.id}">${[0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9].map((v) => `<option value="${v}" ${Math.abs((s.autoRefuel ?? 0) - v) < 0.01 ? 'selected' : ''}>${v ? Math.round(v * 100) + ' %' : 'aus'}</option>`).join('')}</select></label></div>`;
  }
  h += `<div class="section"><div class="btnrow">
    <button data-act="routeMenu" data-ship="${s.id}">↻ Route …</button>
    <button data-act="stop" data-ship="${s.id}" ${s.queue?.length ? '' : 'disabled'}>■ Stopp</button>
    <button data-act="follow" data-ship="${s.id}">◎ Folgen</button>
    <button data-act="addWait" data-ship="${s.id}" title="Warte-Befehl anhängen">⏱ Warten</button>
    ${flagshipButton(s)}`;
  const docked = s.dockedAt ? state.entities.get(s.dockedAt) : null;
  if (docked?.kind === 'belt' && (st.mining[GOODS[BELT_TYPES[docked.type].good].mine || 'std'] || 0) > 0 && !s.queue?.length) {
    h += `<button data-act="mine" data-ship="${s.id}" data-ent="${docked.id}">⛏ Abbauen</button>`;
  }
  h += `</div></div>`;

  h += `<div class="section"><div class="section-title">Befehlsqueue <span class="muted" style="text-transform:none;letter-spacing:0">· Rechtsklick ersetzt, Mittelklick hängt an</span></div>`;
  if (s.queue?.length) {
    h += `<div class="queue">${s.queue.map((c, i) => `<div class="qitem${i === 0 ? ' cur' : ''}"><span class="qn">${i + 1}</span><span class="qt">${queueText(c)}</span>
      <button class="small" data-act="qup" data-ship="${s.id}" data-qid="${c.qid}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="small" data-act="qdown" data-ship="${s.id}" data-qid="${c.qid}" ${i === s.queue.length - 1 ? 'disabled' : ''}>↓</button>
      <button class="small danger" data-act="qdel" data-ship="${s.id}" data-qid="${c.qid}">✕</button></div>`).join('')}</div>`;
  } else h += `<div class="muted">leer – Schiff ist untätig</div>`;
  h += `</div>`;

  h += `<div class="section"><div class="section-title">Ladung</div>`;
  const cargo = Object.entries(s.cargo || {});
  h += cargo.length||Object.values(s.moduleCargo||{}).some(n=>n>0)
    ? `<div class="cargo-list">${cargo.map(([g, n]) => `<div class="cargo-row">${goodTag(g)}<span class="amt">${n}</span>
        <button class="small danger" data-act="jettison" data-ship="${s.id}" data-good="${g}" title="Abwerfen">✕</button></div>`).join('')}</div>`
    : `<div class="muted">leer</div>`;
  for(const [module,n] of Object.entries(s.moduleCargo||{}))h+=`<div class="cargo-row">Verpackt: ${MODS[module].name}<span class="amt">${n} × 30</span></div>`;
  h += `</div>`;

  if (docked?.kind === 'planet') h += eventSection(docked, s);
  if (docked?.market) h += `<div class="section"><div class="section-title">Markt: ${esc(docked.name)}</div>${marketTable(docked, s)}</div>`;
  if (docked?.market?.strategy === 'shipyard' || docked?.type === 'hub') h += `<div class="muted small-note">Werft- und Lizenzdienste: Station anklicken.</div>`;
  h += shipStatsSection(s);
  if (s.log?.length) {
    h += `<div class="section"><div class="section-title">Logbuch</div><div class="loglines">${s.log.slice(0, 8).map((l) => `<div>${esc(l.msg)}</div>`).join('')}</div></div>`;
  }
  return h;
}

/** Hauptschiff ernennen bzw. abberufen, mit Sperre nach jeder Änderung */
function flagshipButton(s) {
  if (state.homeworld) return `<button data-act="manualShip" data-ship="${s.id}" ${state.manualShip === s.id ? 'disabled' : ''}>${state.manualShip === s.id ? '● Manuell aktiv' : 'Manuell steuern'}</button>${s.relicSpeed ? `<span class="badge">Relikt ×${s.relicSpeed} · treibstofffrei</span>` : ''}`;
  const wait = (state.flagshipAt ?? -Infinity) + FLAGSHIP.COOLDOWN - state.time;
  const lock = wait > 0 ? ` disabled title="Wechsel erst in ${Math.ceil(wait / 60)} min möglich"` : '';
  if (s.main) return `<button data-act="flagship" data-ship=""${lock} title="Hauptschiff abberufen">♛ Abberufen</button>`;
  return `<button data-act="flagship" data-ship="${s.id}"${lock || ' title="Tempo ×4, Verbrauch ×4 pro Sekunde, keine Routen"'}>♛ Hauptschiff</button>`;
}

function shipStatsSection(s) {
  const st = state.shipStats.get(s.id);
  let h = `<div class="section"><div class="section-title">Statistik</div>`;
  if (!st) return h + `<div class="muted">wird geladen …</div></div>`;
  const P = [['all', 'gesamt'], ['d24', '24 h'], ['h1', '1 h']];
  const row = (label, f, k = fmt) => `<tr><td>${label}</td>${P.map(([p]) => `<td>${k(f(st[p]))}</td>`).join('')}</tr>`;
  const exp = (x) => x.buy + x.fuel + x.upg;
  h += `<table class="market stats"><tr><th></th>${P.map(([, l]) => `<th>${l}</th>`).join('')}</tr>
    ${row('Flüge', (x) => x.f)}
    ${row('Einnahmen', (x) => x.inc)}
    ${row('Ausgaben', exp)}
    ${row('<span class="muted">· Einkauf</span>', (x) => x.buy)}
    ${row('<span class="muted">· Treibstoff</span>', (x) => x.fuel)}
    ${row('<span class="muted">· Upgrades</span>', (x) => x.upg)}
    ${row('<b>Saldo</b>', (x) => x.inc - exp(x), (v) => `<b class="${v < 0 ? 'neg' : 'pos'}">${fmtK(v)}</b>`)}
    ${row('Strecke', (x) => x.dist, (v) => fmtK(v).replace('+', ''))}</table>`;
  return h + '</div>';
}

function npcTaskHtml(s) {
  const t = s.task;
  const status = t.phase === 'toSource' ? (s.state === 'mining' ? 'baut ab' : 'Anflug zur Quelle') : 'Rückflug zur Station';
  return `<div class="muted">${SHIP_TYPES[s.type].desc}</div>
    <div class="kv" style="margin-top:6px"><span>Station</span><span>${entName(t.stationId)}</span>
    <span>Auftrag</span><span>${GOODS[t.good].name} von ${entName(t.sourceId)} holen</span>
    <span>Status</span><span>${status}</span>
    <span>Ladung</span><span>${cargoUsed(s)} / ${SHIP_TYPES[s.type].cargo}</span></div>`;
}

// ---------- Markt ----------
function supplyText(m) {
  const sup = m.supply;
  if (!sup) return 'Rohstoffe vorhanden';
  const g = GOODS[sup.good]?.name || '?';
  if (sup.state === 'active') return `Versorger unterwegs, holt ${g} von ${entName(sup.sourceId)}`;
  if (sup.state === 'cooldown') return `Lieferung ${g} eingetroffen`;
  if (sup.state === 'nosource') return `⚠ Keine Quelle für ${g} im Umkreis von ${fmt(SUPPLY.RANGE)}`;
  return '–';
}

const ROLE_LABEL = { produce: 'verkauft', consume: 'kauft', trade: 'Händler' };

export function marketTable(e, ship) {
  const onRoute = ship?.queue?.[0]?.t === 'route';
  const canTrade = ship && ship.dockedAt === e.id && !onRoute;
  const mine = e.owner === state.me.id;
  const member = !mine && state.props.get(e.id)?.cons;
  const customs = !mine && !member && e.owner ? (e.market.customs || 0) : 0;
  const rows = Object.entries(e.market.goods).filter(([g])=>!state.homeworld||GOODS[g].cls!=='passenger').filter(([g, sl]) => e.type !== 'ruins' || e.market.homeworld?.knownGoods?.[g] || (sl.cap > 0 && (sl.stock > 0 || ship?.cargo?.[g] || ['ore','ice','grain','gas','helium3','crude','water','food','shipfuel','fuel','ingots'].includes(g)))).map(([g, sl]) => {
    if (e.market.homeworld) sl = { ...sl, cap: homeGoodLimit(e.market, g) };
    if (mine) return ownRow(e, g, sl, canTrade ? ship : null);
    if (member) return memberRow(e, g, sl, canTrade ? ship : null);
    const buy = canBuyFrom(sl), sell = canSellTo(sl);
    let act = '';
    if (canTrade) {
      if (buy) act += ['1', '10', 'max'].map((a) => `<button class="small" data-act="trade" data-dir="buy" data-ship="${ship.id}" data-ent="${e.id}" data-good="${g}" data-amt="${a}">${a === 'max' ? 'Max' : '+' + a}</button>`).join(' ');
      if (sell && ship.cargo?.[g]) act += (act ? ' ' : '') + ['1', '10', 'max'].map((a) => `<button class="small" data-act="trade" data-dir="sell" data-ship="${ship.id}" data-ent="${e.id}" data-good="${g}" data-amt="${a}">${a === 'max' ? 'Alle' : '−' + a}</button>`).join(' ');
    }
    const barCol = sl.role === 'produce' ? '#81c784' : sl.role === 'trade' ? '#4fc3f7' : '#ffb74d';
    const prices = [];
    if (buy) prices.push(`<span class="price-buy" title="Einkaufspreis für dich">K ${(playerPrice(e, g, 'buy') * (1 + customs)).toFixed(1)}</span>`);
    if (sell) prices.push(`<span class="price-sell" title="Verkaufserlös für dich">V ${(playerPrice(e, g, 'sell') * (1 - customs)).toFixed(1)}</span>`);
    return `<tr><td><span class="link-good" data-act="alm" data-good="${g}" title="Im Almanach zeigen">${goodTag(g)}</span> <span class="role role-${sl.role}">${ROLE_LABEL[sl.role]}</span>${GOODS[g].cls !== 'normal' ? ` <span title="${GOODS[g].cls === 'hazard' ? 'Gefahrgut' : 'Passagiere'}">${GOODS[g].cls === 'hazard' ? '☢' : '👤'}</span>` : ''}</td>
      <td>${stockBar(sl.stock, sl.cap, barCol)} <span class="muted">${Math.floor(sl.stock)}/${sl.cap}</span></td>
      <td>${prices.join('<br>')}</td>
      <td style="white-space:nowrap">${act}</td></tr>`;
  });
  let h = `<table class="market"><tr><th>Ware</th><th>Lager</th><th>Preis</th><th></th></tr>${rows.join('')}</table>`;
  if(!e.owner&&e.market.economy)h=`<p class="muted">Marktkasse: ${fmt(e.market.economy.cash)} Cr · begrenzte Nachfrage ${fmt(e.market.economy.rate)} Cr/h. Angebote garantieren keinen Ankauf.</p>`+h;
  if(state.homeworld)h+=moduleStockPanel(e,ship);
  if (mine && canTrade) {
    // Waren an Bord, die das Lager noch nicht führt, können nicht eingelagert werden
  }
  if (customs) h += `<div class="muted small-note">Zoll ${Math.round(customs * 100)} % ist in den Preisen enthalten.</div>`;
  if (ship && ship.dockedAt === e.id && onRoute) h += `<div class="muted small-note">Schiff fährt eine Route, manueller Handel erst nach Stopp.</div>`;
  else if (!ship) h += `<div class="muted small-note">Zum Handeln ein eigenes Schiff hier andocken.</div>`;
  return h;
}

/** Zeile im eigenen Lager: kostenlos laden und einlagern */
function ownRow(e, g, sl, ship) {
  let act = '';
  if (ship) {
    act = ['10', 'max'].map((a) => `<button class="small" data-act="trade" data-dir="buy" data-ship="${ship.id}" data-ent="${e.id}" data-good="${g}" data-amt="${a}" title="Laden (kostenlos)">${a === 'max' ? '⇧ Max' : '⇧' + a}</button>`).join(' ');
    if (ship.cargo?.[g]) act += ' ' + ['10', 'max'].map((a) => `<button class="small" data-act="trade" data-dir="sell" data-ship="${ship.id}" data-ent="${e.id}" data-good="${g}" data-amt="${a}" title="Einlagern (kostenlos)">${a === 'max' ? '⇩ Alle' : '⇩' + a}</button>`).join(' ');
  }
  return `<tr><td>${goodTag(g)} <span class="role role-${sl.role}">${ROLE_LABEL[sl.role]}</span></td>
    <td>${stockBar(sl.stock, sl.cap, '#81c784')} <span class="muted">${Math.floor(sl.stock)}/${sl.cap}</span></td>
    <td><span class="muted" title="${e.type === 'ruins' ? 'Eigene Lagertransfers sind kostenlos' : 'Marktpreis für Fremde'}">${e.type === 'ruins' ? 'kostenlos' : playerPrice(e, g, canBuyFrom(sl) ? 'buy' : 'sell').toFixed(1)}</span></td>
    <td style="white-space:nowrap">${act}</td></tr>`;
}

/** Zeile im Konsortiumslager: Entnehmen und Einlagern zum Fixpreis */
function memberRow(e, g, sl, ship) {
  const pr = storagePrice(e, g);
  let act = '';
  if (ship) {
    act = ['10', 'max'].map((a) => `<button class="small" data-act="trade" data-dir="buy" data-ship="${ship.id}" data-ent="${e.id}" data-good="${g}" data-amt="${a}" title="Entnehmen, du zahlst an den Pool">${a === 'max' ? '⇧ Max' : '⇧' + a}</button>`).join(' ');
    if (ship.cargo?.[g]) act += ' ' + ['10', 'max'].map((a) => `<button class="small" data-act="trade" data-dir="sell" data-ship="${ship.id}" data-ent="${e.id}" data-good="${g}" data-amt="${a}" title="Einlagern, der Pool zahlt">${a === 'max' ? '⇩ Alle' : '⇩' + a}</button>`).join(' ');
  }
  return `<tr><td>${goodTag(g)} <span class="role role-${sl.role}">${ROLE_LABEL[sl.role]}</span></td>
    <td>${stockBar(sl.stock, sl.cap, '#ffb74d')} <span class="muted">${Math.floor(sl.stock)}/${sl.cap}</span></td>
    <td><span title="Fixpreis im Konsortiumslager">${pr.toFixed(1)}</span></td>
    <td style="white-space:nowrap">${act}</td></tr>`;
}

// ---------- Objekt ----------
let locationSection = '';
let locationShip = '';
function entityDetails(e) {
  const fav = !!state.favorites[e.id], m=e.market;
  const ships=fleetOrder();
  if (!ships.some(s=>s.id===locationShip)) locationShip=selectedShips()[0]?.id || ships[0]?.id || '';
  const dockedHere=ships.filter(s=>s.dockedAt===e.id);
  const myDocked=dockedHere.find(s=>s.id===locationShip) || dockedHere.find(s=>s.queue?.[0]?.t!=='route') || dockedHere[0];
  let h=`<div class="det-head"><img src="${entitySprite(e)}" alt=""><div style="flex:1"><div class="title">${esc(e.name)}</div><div class="type">${typeName(e)} · ${esc(systemName(e))} · ${esc(sectorName(e))} · ${esc(e.ownerName || (e.owner ? playerName(e.owner) : 'NPC'))}</div></div>
  ${e.kind==='planet' && m?`<button data-act="land" data-ent="${e.id}" ${canLand(e.id)?'':'disabled'}>${accessTo(e.id).remote&&!accessTo(e.id).local?'Fernverwaltung öffnen':'Landen'}</button>`:''}
  <button class="star" data-act="fav" data-ent="${e.id}" aria-label="Favorit umschalten" aria-pressed="${fav}">${fav?'★':'☆'}</button></div>`;
  if(ships.length) h+=`<div class="location-orders"><label>Schiff <select id="locationShip">${ships.map(s=>`<option value="${s.id}" ${s.id===locationShip?'selected':''}>${esc(s.name)}${s.dockedAt===e.id?' · angedockt':''}</option>`).join('')}</select></label><button data-act="sendSelected" data-ent="${e.id}" title="Shift: anhängen">Anfliegen</button></div>`;
  let infrastructure='';
  if (e.kind === 'planet') {
    infrastructure += e.ruinsSite?colonyPanel(e):e.type === 'ruins' ? `<p>Persönliche, unverkäufliche Ruinenwelt. Rathaus, Reparaturen und Bauverwaltung sind bei Landung oder über dein Hauptschiff im eigenen Leitstellennetz erreichbar.</p><div class="kv"><span>Einwohner / Wohnraum</span><span>${m.homeworld.population} / ${m.homeworld.housing}</span><span>Leitstelle</span><span>Stufe ${m.homeworld.controlLevel}</span><span>Reguläre Bauplätze</span><span>${m.homeworld.plots}</span></div>` : `<div class="muted">${PLANET_TYPES[e.type].desc}</div>
      <div class="kv" style="margin-top:6px"><span>Versorgung</span><span>${Math.round(m.eff * 100)} % Produktionsleistung</span></div>`;
  } else if (e.kind === 'station') {
    const def = STATION_TYPES[e.type];
    if (def.recipe) {
      infrastructure += `<div class="kv"><span>Verarbeitung</span><span>${recipeText(def.recipe)} (${def.recipe.time}s)</span>
        <span>Status</span><span>${m.eff >= 1 ? 'läuft' : m.eff > 0 ? 'langsam (keine Nahrung)' : 'steht still'}</span>
        <span>Versorgung</span><span>${supplyText(m)}</span></div>`;
    } else if (def.consume) {
      infrastructure += `<div class="muted">Kauft ${Object.keys(def.consume).map((g) => GOODS[g].name).join(', ')}.</div>`;
    } else if (def.buys) {
      infrastructure += `<div class="muted">Kauft Baumaterial und baut daraus Schiffe.</div>`;
    } else if (def.extract) {
      const g = Object.keys(m.goods).find((x) => GOODS[x].ultra);
      infrastructure += `<div class="kv"><span>Förderung</span><span>${g ? goodTag(g) : '?'} (ultraselten, nur am Hub verkäuflich)</span><span>Status</span><span>${m.eff >= 1 ? 'läuft' : 'langsam (keine Nahrung)'}</span></div>`;
    } else if (def.outpost) {
      infrastructure += `<div class="muted">${esc(FACTIONS[e.faction]?.desc || '')} Bietet Module an und fragt dauerhaft ${GOODS[FACTIONS[e.faction]?.currency]?.name || '?'} nach.</div>`;
    } else if (def.factionyard) {
      infrastructure += `<div class="muted">Werft der ${esc(FACTIONS[e.faction]?.name || 'Fraktion')}. Das Fraktionsschiff kostet Credits und ${GOODS[FACTIONS[e.faction]?.currency]?.name || '?'}.</div>`;
    } else if (e.type === 'hub') {
      infrastructure += `<div class="muted">Handelszentrum des Sektors: verkauft Schiffstreibstoff, kauft alle ultraseltenen Waren und handelt eine breite Auswahl.</div>`;
    }
  } else if (e.kind === 'wormhole') {
    const w = state.wh.get(e.wh);
    const exit = w && (w.a.id === e.id ? w.b : w.a);
    const ex = exit && state.entities.get(exit.id);
    infrastructure += `<div class="kv"><span>Ziel</span><span>${exit ? esc(ex ? ex.name + ' · ' + systemName(ex) + ' · ' + sectorName(ex) : 'bekannt (' + sectorOfPoint(exit) + ')') : 'unbekannt – erst durchfliegen'}</span>
      <span>Durchflug</span><span>5 s, kostenlos, kein Treibstoff</span></div>
      <div class="muted" style="margin-top:6px">Rechtsklick mit Schiff: hineinfliegen. Bekannte Verbindungen nutzt die Navigation automatisch.</div>`;
  } else if (e.kind === 'belt') {
    infrastructure += `<div class="kv"><span>Rohstoff</span><span>${goodTag(BELT_TYPES[e.type].good)}</span><span>Ergiebigkeit</span><span>${Math.round(e.richness * 100)} %</span></div>
      <div class="muted" style="margin-top:6px">Schiffe mit Bergbauausrüstung können hier abbauen (Rechtsklick).</div>`;
  }
  if(m?.strategy==='shipyard') infrastructure+=shipyardSection(e,myDocked);
  if(e.type==='hub') infrastructure+=hubSection(e,myDocked)+governorSection(myDocked);
  if(m?.strategy==='factionyard') infrastructure+=factionYardSection(e,myDocked);
  if(e.type==='outpost') infrastructure+=outpostSection(e,myDocked);
  if(m?.homeworld) infrastructure+=warpPanel(e);
  if(e.faction && e.kind==='planet') infrastructure+=`<div class="muted">${repLine(e.faction)}</div>`;
  let quests=m && e.type!=='ruins' && (e.kind==='planet'||m.strategy==='shipyard')?questBoardSection(e,myDocked):'';
  if(e.salvageOwner===state.me.id) quests+=`<p>Persönlicher versiegelter Reliktfund. Nur das aktive manuelle Schiff kann ihn bergen.</p><button data-act="relicSalvage" data-ent="${e.id}" data-ship="${state.manualShip||''}" ${dockedHere.some(s=>s.id===state.manualShip)&&state.homeQuest?.salvage?.phase==='available'?'':'disabled'}>Versiegelten Fund bergen</button>`;
  if(e.archiveOwner===state.me.id) quests+=`<p>Persönliche Archiv-/Forschungsstelle. Studienvorlagen benötigen 30 freie Frachteinheiten.</p><button data-act="homeArchiveVisit" data-ent="${e.id}" data-ship="${state.manualShip||''}" ${dockedHere.some(s=>s.id===state.manualShip)?'':'disabled'}>Archiv untersuchen / Vorlage bergen</button>`;
  const trade=m?marketTable(e,myDocked)+(e.kind==='planet'?eventSection(e,myDocked):'')+(e.type!=='ruins'?statsSection(e):''):'';
  const management=(m && e.type!=='ruins'?propertySection(e):'')+(fav?`<label>Notiz <input class="fav-note" data-ent="${e.id}" maxlength="120" value="${esc(state.favorites[e.id].note||'')}"></label>`:'');
  const sections=[['trade','Handel',trade],['services','Infrastruktur & Dienste',infrastructure],['quests','Aufträge',quests],['management','Besitz & Verwaltung',management]].filter(([,,body])=>body);
  if(!sections.some(([id])=>id===locationSection)) locationSection='';
  for(const [id,label,body] of sections) h+=`<details class="location-section" data-section="${id}" ${locationSection===id?'open':''}><summary>${label}</summary>${body}</details>`;
  return h;
}

// ---------- Marktstatistik ----------
function chartSeries(e) {
  const m = e.market;
  const def = e.kind === 'station' ? STATION_TYPES[e.type] : null;
  if (def?.recipe) {
    const g = Object.keys(def.recipe.out)[0];
    return { label: `Produziert: ${GOODS[g].name}`, unit: GOODS[g].name, get: (d) => d.p[g] || 0 };
  }
  if (m.strategy === 'shipyard') return { label: 'Gebaute Schiffe', unit: 'Schiffe', get: (d) => d.n || 0 };
  if (def?.consume) {
    const g = Object.keys(def.consume)[0];
    return { label: `Aufgenommen: ${GOODS[g].name}`, unit: GOODS[g].name, get: (d) => d.c[g] || 0 };
  }
  const g = Object.entries(m.goods).find(([, s]) => s.role === 'produce')?.[0] || Object.keys(m.goods)[0];
  return { label: `Produziert: ${GOODS[g].name}`, unit: GOODS[g].name, get: (d) => d.p[g] || 0 };
}

function statsSection(e) {
  const st = state.stats.get(e.id);
  let h = `<div class="section"><div class="section-title">Statistik · letzte 3 Stunden</div>`;
  if (!st) return h + `<div class="muted">wird geladen …</div></div>`;
  const byB = new Map(st.data.map((d) => [d.b, d]));
  const series = chartSeries(e);
  const vals = [];
  for (let k = st.buckets - 1; k >= 0; k--) {
    const d = byB.get(st.now - k);
    vals.push(d ? series.get(d) : 0);
  }
  h += barChart(vals, series, st.bucketSecs);
  const tot = { p: {}, c: {}, i: {}, o: {} };
  let cycles = 0;
  for (const d of st.data) {
    if (d.b <= st.now - st.buckets) continue;
    cycles += d.n || 0;
    for (const k of Object.keys(tot)) for (const [g, v] of Object.entries(d[k])) tot[k][g] = (tot[k][g] || 0) + v;
  }
  const goods = Object.keys(GOODS).filter((g) => e.market.goods[g] || Object.values(tot).some((t) => t[g]));
  const cell = (v) => (v ? fmtNum(v) : '<span class="muted">–</span>');
  h += `<table class="market stats"><tr><th>Ware</th><th>Produziert</th><th>Verbraucht</th><th title="Von Schiffen geliefert">Angeliefert</th><th title="Von Schiffen abgeholt">Abgeholt</th></tr>
    ${goods.map((g) => `<tr><td>${goodTag(g)}</td><td>${cell(tot.p[g])}</td><td>${cell(tot.c[g])}</td><td>${cell(tot.i[g])}</td><td>${cell(tot.o[g])}</td></tr>`).join('')}</table>`;
  if (e.market.strategy === 'factory') h += `<div class="muted small-note">${fmt(cycles)} Produktionszyklen in 3 h</div>`;
  return h + '</div>';
}

// ---------- Ereignisse ----------
const det = $('details');
det.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (handlePropertyAction(d)) return;
  switch (d.act) {
    case 'homeArchiveVisit':cmd('homeArchiveVisit',{target:d.ent,ship:d.ship});break;
    case 'moduleTransfer':case 'moduleInstall':case 'moduleRemove':handleModuleAction(d);break;
    case 'rename': {
      const s = state.ships.get(d.ship);
      const name = prompt('Neuer Name (max. 24 Zeichen)', s?.name || '');
      if (name?.trim()) cmd('rename', { ship: d.ship, name: name.trim().slice(0, 24) });
      break;
    }
    case 'routeMenu': bus.openRouteMenu(d.ship, b); break;
    case 'stop': cmd('stop', { ships: [d.ship] }); break;
    case 'follow': state.follow = d.ship; break;
    case 'addWait': {
      const secs = Number(prompt('Wie viele Sekunden warten?', '30'));
      if (secs > 0) cmd('order', { ships: [d.ship], order: { t: 'wait', secs: Math.floor(secs) }, append: true });
      break;
    }
    case 'mine': cmd('order', { ships: [d.ship], order: { t: 'mine', target: d.ent }, append: false }); break;
    case 'sendSelected': { const ship=state.ships.get(locationShip); if(ship) orderShips([ship],state.entities.get(d.ent),ev.shiftKey); break; }
    case 'send': orderShips([state.ships.get(d.ship)], state.entities.get(d.ent), ev.shiftKey); break;
    case 'qup': cmd('queueMove', { ship: d.ship, qid: Number(d.qid), dir: -1 }); break;
    case 'qdown': cmd('queueMove', { ship: d.ship, qid: Number(d.qid), dir: 1 }); break;
    case 'qdel': cmd('queueRemove', { ship: d.ship, qid: Number(d.qid) }); break;
    case 'clearWarn': cmd('clearWarn', { ship: d.ship }); break;
    case 'land': enterPlanet(d.ent); break;
    case 'cShipDelete': cmd('cShipDelete', { ship: d.ship }); break;
    case 'refuel': cmd('refuel', { ship: d.ship }); break;
    case 'questAccept': cmd('questAccept', { ship: d.ship, target: d.ent, quest: d.quest }); break;
    case 'flagship':
      if (d.ship && state.ships.get(d.ship)?.queue?.some((c) => c.t === 'route') && !confirm('Das Hauptschiff fährt keine Routen. Routenbefehle aus der Queue entfernen?')) break;
      cmd('flagship', { ship: d.ship || null });
      break;
    case 'alm': openAlmanac(d.good); break;
    case 'jettison': if (confirm(`${GOODS[d.good].name} wirklich abwerfen?`)) cmd('jettison', { ship: d.ship, good: d.good }); break;
    case 'trade': cmd('trade', { ship: d.ship, target: d.ent, good: d.good, dir: d.dir, amount: d.amt }); break;
    case 'manualShip': cmd('manualShip', { ship: d.ship }); break;
    case 'relicSalvage': cmd('relicSalvage', { ship: d.ship, target: d.ent }); break;
    case 'buyShip': cmd('buyShip', { target: d.ent, index: Number(d.idx) }); break;
    case 'yardOrder': {
      const t = $('orderType')?.value;
      if (t && confirm(`${SHIP_TYPES[t].name} bestellen? Die Anzahlung wird sofort fällig und nicht erstattet.`)) cmd('yardOrder', { target: d.ent, type: t });
      break;
    }
    case 'factionOrder':if(confirm(`${SHIP_TYPES[d.type].name} bestellen? Anzahlung ${fmt(SHIP_TYPES[d.type].price*2)} Cr, Materiallieferung bleibt erforderlich.`))cmd('yardOrder',{target:d.ent,type:d.type});break;
    case 'upgrade': cmd('upgrade', { ship: d.ship, line: d.line }); break;
    case 'buyModule': cmd('buyModule', { ship: d.ship, module: d.module }); break;
    case 'removeModule': cmd('removeModule', { ship: d.ship, module: d.module }); break;
    case 'sellShip': if (confirm('Schiff wirklich verkaufen?')) cmd('sellShip', { ship: d.ship }); break;
    case 'buyLicense': cmd('buyLicense', { kind: d.kind }); break;
    case 'buyFactionShip': cmd('buyFactionShip', { target: d.ent, index: Number(d.idx || 0) }); break;
    case 'fav': cmd('favorite', { target: d.ent, on: !state.favorites[d.ent] }); break;
    case 'selone': state.selection.clear(); bus.select({ kind: 'ship', id: d.ship }); break;
    case 'stopAll': cmd('stop', { ships: selectedShips().map((s) => s.id) }); break;
    case 'clearSel': state.selection.clear(); bus.select(null); break;
    case 'newRouteSel': bus.openRouteEditor(null, { assign: selectedShips().map((s) => s.id) }); break;
    case 'assignSel':
    case 'assignSelAppend':
      cmd('routeAssign', { route: $('multiRoute').value, ships: selectedShips().map((s) => s.id), append: d.act === 'assignSelAppend' });
      break;
    case 'groupSel': cmd('shipGroup', { ships: selectedShips().map((s) => s.id), group: $('multiGroup').value || null }); break;
  }
});

det.addEventListener('change', (ev) => {
  const el = ev.target;
  if(el.id==='locationShip') { locationShip=el.value; renderDetails(); return; }
  if (el.classList.contains('marker-color')) cmd('shipSettings', { ship: el.dataset.ship, marker: el.value });
  if (el.classList.contains('auto-refuel')) cmd('shipSettings', { ship: el.dataset.ship, autoRefuel: Number(el.value) });
  handlePropertyChange(el);
  if (el.classList.contains('fav-note')) cmd('favoriteNote', { target: el.dataset.ent, note: el.value.slice(0, 120) });
});

// Hover-Anzeige für die Diagrammbalken
det.addEventListener('mouseover', (ev) => {
  const t = ev.target.closest('[data-tip]');
  const ro = det.querySelector('.chart-readout');
  if (ro) ro.textContent = t ? t.dataset.tip : ro.dataset.default;
});


det.addEventListener('toggle', ev=>{
  const section=ev.target;
  if(!section.matches('.location-section') || !section.isConnected) return;
  if(section.open) {
    locationSection=section.dataset.section;
    for(const other of det.querySelectorAll('.location-section')) if(other!==section) other.open=false;
  } else if(locationSection===section.dataset.section) locationSection='';
},true);

// Update disclosure state synchronously for keyboard activation, click and touch.
det.addEventListener('click',ev=>{
  const summary=ev.target.closest('.location-section>summary');
  if(!summary)return;
  ev.preventDefault();
  const section=summary.parentElement, next=!section.open;
  for(const other of det.querySelectorAll('.location-section'))other.open=other===section && next;
  locationSection=next?section.dataset.section:'';
});
