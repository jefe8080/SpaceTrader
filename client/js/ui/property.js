// Besitz: Kauf, Verwaltung eigener Planeten und Stationen, eigene Werften, Besitzübersicht (Taste B)
import { GOODS, SHIP_TYPES, RECIPES, GOVERNOR_LICENSES, UNLOCK_NAMES, PROP_UPGRADES, FIXED, CUSTOMS_MAX,
  propertyKind, minGovernorFor, propertyPrice, propUpgradeCost, extraOptions, priceWindow, fixedPrice, fixedConsumptionPerHour, fixedRref, PLANET_TYPES } from '/shared/config.js';
import { state, fmt, fmtK, esc, myShips } from '../state.js';
import { cmd } from '../net.js';
import { shipSprite, typeName, systemName, sectorName, entitySprite } from '../util.js';
import { $, registerModal, openModal, closeModal, setHtml } from './dom.js';
import { bus } from './bus.js';

const gov = () => GOVERNOR_LICENSES[state.governor || 0];
const shipsHere = (e) => myShips().filter((s) => s.dockedAt === e.id);
const onBoard = (e, g) => shipsHere(e).reduce((a, s) => a + (s.cargo?.[g] || 0), 0);

/** Abschnitt im Detailpanel eines Objekts */
export function propertySection(e) {
  const kind = propertyKind(e);
  const prop = state.props.get(e.id);
  if (prop) return manageSection(e, prop);
  if (e.owner) {
    return `<div class="section"><div class="section-title">Besitz</div><div class="kv">
      <span>Besitzer</span><span style="color:${e.ownerColor || '#ccc'}">${esc(e.ownerName || '?')}</span>
      <span>Handel</span><span>${e.market?.mode === 'private' ? 'privat' : 'offen'}</span></div></div>`;
  }
  if (!kind) return '';
  const L = gov();
  const price = propertyPrice(e);
  const owned = state.props.size;
  const why = !L ? 'Gouverneurslizenz nötig (am Hub)' : !L.unlocks.includes(kind) ? `${UNLOCK_NAMES[kind]} ab Gouverneurslizenz ${minGovernorFor(kind)}`
    : owned >= L.maxProps ? `Lizenz erlaubt max. ${L.maxProps} Besitztümer` : !shipsHere(e).length ? 'Ein eigenes Schiff muss hier angedockt sein' : state.credits < price ? 'Nicht genug Credits' : '';
  return `<div class="section"><div class="section-title">Besitz</div>
    <div class="muted">Kaufbar: ${UNLOCK_NAMES[kind]} (ab Gouverneurslizenz ${minGovernorFor(kind)}).</div>
    <button class="small primary" data-act="buyProperty" data-ent="${e.id}" ${why ? 'disabled' : ''} title="${esc(why)}">Kaufen: ${fmt(price)} Cr</button>
    ${why ? `<span class="muted small-note"> ${esc(why)}</span>` : ''}</div>`;
}

function manageSection(e, prop) {
  const L = gov();
  const max = L?.maxLevel || 0;
  let h = `<div class="section own-prop"><div class="section-title">Dein Besitz · seit ${Math.floor((prop.since || 0) / 3600)} h Spielzeit</div>
    <div class="kv"><span>Saldo</span><span>1 h <b class="${prop.h1 < 0 ? 'neg' : 'pos'}">${fmtK(prop.h1)}</b> · 24 h <b class="${prop.d24 < 0 ? 'neg' : 'pos'}">${fmtK(prop.d24)}</b></span>
    <span>Handel</span><span><select class="small prop-mode" data-ent="${e.id}"><option value="open" ${prop.mode === 'open' ? 'selected' : ''}>offen</option><option value="private" ${prop.mode === 'private' ? 'selected' : ''}>privat</option></select>
      <span class="muted">${prop.mode === 'open' ? 'Fremde und NPC-Versorger handeln, du zahlst Lieferungen' : 'nur du, keine NPC-Versorger'}</span></span>
    <span>Zoll</span><span>${L?.unlocks.includes('customs') ? `<select class="small prop-customs" data-ent="${e.id}">${[0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5].filter((v) => v <= CUSTOMS_MAX).map((v) => `<option value="${v}" ${Math.abs((prop.customs || 0) - v) < 0.001 ? 'selected' : ''}>${Math.round(v * 100)} %</option>`).join('')}</select> <span class="muted">auf Geschäfte von Fremden</span>` : '<span class="muted">ab Gouverneurslizenz 3</span>'}</span></div>
    <div class="muted small-note">Eigenes Lager: Laden und Einlagern kostenlos über die Markttabelle.</div>`;

  // Fixpreis-Verbrauch
  if (e.kind === 'planet') {
    h += `<div class="sub-title">Fixpreis-Verbrauch der Bevölkerung</div><table class="market"><tr><th>Ware</th><th>Position</th><th>Preis</th><th>Verbrauch/h</th></tr>`;
    for (const [g, s] of Object.entries(e.market.goods)) {
      if (s.role !== 'consume') continue;
      const sv = prop.fixed[g] ?? FIXED.DEFAULT;
      const { pmin, pmax } = priceWindow(g, s.mod || 1);
      const rate = (PLANET_TYPES[e.type].consume[g] || s.rate) * (e.size || 1);
      const R = fixedRref(rate, pmin, pmax);
      h += `<tr><td>${GOODS[g].name}</td><td><input type="range" class="prop-fixed" data-ent="${e.id}" data-good="${g}" min="${FIXED.MIN}" max="${FIXED.MAX}" step="0.05" value="${sv}"></td>
        <td>${fixedPrice(pmin, pmax, sv).toFixed(1)}</td><td>${fixedConsumptionPerHour(R, sv, pmin, pmax).toFixed(0)}</td></tr>`;
    }
    h += `</table><div class="muted small-note">Günstiger Preis = mehr Verbrauch: Position 0,3 bringt doppelt so viel Erlös wie 0,7 (bei voller Belieferung).</div>`;
  }

  // Upgrades
  h += `<div class="sub-title">Ausbau (max. Stufe ${max})</div><table class="market"><tr><th>Linie</th><th>Stufe</th><th>Kosten nächste Stufe</th><th></th></tr>`;
  const opts = extraOptions(e);
  for (const [line, u] of Object.entries(PROP_UPGRADES)) {
    const lvl = prop.upg[line] || 0;
    const c = propUpgradeCost(e, line, lvl + 1);
    const goods = Object.entries(c.goods).map(([g, n]) => `<span class="${onBoard(e, g) >= n ? '' : 'neg'}">${n} ${GOODS[g].name}</span>`).join(', ');
    const isYard = e.market.strategy === 'shipyard';
    let extraSel = '';
    if (line === 'extra' && !isYard) {
      const free = opts.filter((o) => !prop.extras.includes(o));
      extraSel = free.length ? `<select class="small" id="extraSel-${e.id}">${free.map((o) => `<option value="${o}">${RECIPES[o]?.name || GOODS[o]?.name || o}</option>`).join('')}</select>` : '<span class="muted">keine Optionen</span>';
    }
    const done = lvl >= max;
    h += `<tr><td title="${esc(u.desc)}">${u.name}${line === 'extra' && prop.extras.length ? `<div class="muted small-note">${prop.extras.map((x) => RECIPES[x]?.name || GOODS[x]?.name).join(', ')}</div>` : ''}${line === 'extra' && isYard ? '<div class="muted small-note">schaltet die nächste Schiffsklasse frei</div>' : ''}</td><td>${lvl}</td>
      <td>${done ? '<span class="muted">Lizenzgrenze</span>' : `${fmt(c.credits)} Cr + ${goods}`}</td>
      <td>${extraSel}<button class="small" data-act="propUpgrade" data-ent="${e.id}" data-line="${line}" ${done || state.credits < c.credits ? 'disabled' : ''}>＋</button></td></tr>`;
  }
  h += `</table><div class="muted small-note">Waren für den Ausbau kommen aus den Laderäumen deiner hier angedockten Schiffe.</div>`;

  if (e.market.strategy === 'shipyard') h += yardSection(e, prop);
  return h + '</div>';
}

/** Eigene Werft: Bau auf Befehl, Bestand, Verkauf an andere, Recycling */
function yardSection(e, prop) {
  const m = e.market;
  const x = prop.upg.extra || 0;
  const classes = e.type === 'bigyard' ? (x ? ['S', 'M', 'L', 'XL'] : ['S', 'M', 'L']) : (x ? ['S', 'M'] : ['S']);
  const types = Object.entries(SHIP_TYPES).filter(([, d]) => !d.npc && !d.faction && classes.includes(d.cls));
  let h = `<div class="sub-title">Werft: Bau auf Befehl (Klassen ${classes.join(', ')})</div>`;
  if (m.building) h += `<div>🔧 Im Bau: <b>${SHIP_TYPES[m.building.type].name}</b> (noch ${m.building.remaining} s)</div>`;
  else {
    h += `<table class="market"><tr><th>Typ</th><th>Material (Werftlager)</th><th></th></tr>` + types.map(([t, d]) => {
      const ok = Object.entries(d.build).every(([g, n]) => (m.goods[g]?.stock || 0) >= n);
      return `<tr><td>${d.name} <span class="badge cls-${d.cls}">${d.cls}</span></td><td class="small-note">${Object.entries(d.build).map(([g, n]) => `<span class="${(m.goods[g]?.stock || 0) >= n ? '' : 'neg'}">${n} ${GOODS[g].name}</span>`).join(', ')}</td>
        <td><button class="small" data-act="yardBuild" data-ent="${e.id}" data-type="${t}" ${ok ? '' : 'disabled'}>Bauen</button></td></tr>`;
    }).join('') + `</table>`;
  }
  h += `<div class="sub-title">Werftbestand <label class="muted"><input type="checkbox" class="yard-sale" data-ent="${e.id}" ${m.yardSale ? 'checked' : ''}> an andere Spieler verkaufen</label></div>`;
  const own = (m.forSale || []).map((it, i) => ({ it, i })).filter(({ it }) => it.own);
  if (!own.length) h += `<div class="muted">leer</div>`;
  for (const { it, i } of own) {
    h += `<div class="forsale"><img src="${shipSprite(it.type, state.me.color)}" alt=""><div class="info"><b>${SHIP_TYPES[it.type].name}</b></div>
      <div style="text-align:right">Preis <input type="number" class="yard-price" data-ent="${e.id}" data-idx="${i}" value="${it.price}" min="0" style="width:110px"> Cr<br>
      <button class="small primary" data-act="yardClaim" data-ent="${e.id}" data-idx="${i}">In Flotte übernehmen</button></div></div>`;
  }
  const docked = shipsHere(e);
  if (docked.length) {
    h += `<div class="sub-title">Recycling (50 % des Materials ins Werftlager)</div><div class="btnrow">${docked.map((s) => `<button class="small danger" data-act="recycle" data-ship="${s.id}" ${myShips().length <= 1 ? 'disabled' : ''}>${esc(s.name)} recyceln</button>`).join('')}</div>`;
  }
  return h;
}

/** Entwurf der Fraktionsdaten (überlebt das Neuzeichnen des Panels) */
const draft = { name: '', color: null };
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'facName') draft.name = ev.target.value;
  if (ev.target.id === 'facColor') draft.color = ev.target.value;
});

/** Gouverneurslizenz am Hub */
export function governorSection(dockedShip) {
  const cur = gov();
  const next = GOVERNOR_LICENSES[(state.governor || 0) + 1];
  let h = `<div class="section"><div class="section-title">Gouverneurslizenz</div><div class="kv">
    <span>Aktuell</span><span>${cur ? `<b>Stufe ${cur.level}</b> · max. ${cur.maxProps} Besitztümer · Ausbau bis ${cur.maxLevel} · ${cur.unlocks.map((u) => UNLOCK_NAMES[u]).join(', ')}` : 'keine'}</span>
    ${state.faction ? `<span>Fraktion</span><span style="color:${state.faction.color}"><b>${esc(state.faction.name)}</b></span>` : ''}`;
  if (next) {
    h += `<span>Nächste</span><span>Stufe ${next.level}: ${next.maxProps} Besitztümer, Ausbau bis ${next.maxLevel}, ${next.unlocks.map((u) => UNLOCK_NAMES[u]).join(', ')}</span></div>`;
    if (!state.faction) h += `<div class="form-row"><label>Name deiner Fraktion <input id="facName" class="fac-draft" maxlength="24" placeholder="z.B. Nordkontor" value="${esc(draft.name)}"></label><label>Farbe <input id="facColor" class="fac-draft" type="color" value="${draft.color || state.me.color}"></label></div>`;
    h += `<button class="primary small" data-act="buyGovernor" ${!dockedShip || state.credits < next.cost ? 'disabled' : ''} title="${dockedShip ? '' : 'Ein eigenes Schiff muss am Hub angedockt sein'}">Lizenz ${next.level} kaufen: ${fmt(next.cost)} Cr</button>`;
  } else h += `</div><div class="muted">Höchste Stufe erreicht.</div>`;
  return h + '</div>';
}

// ---------- Ereignisse (im Detailpanel) ----------
export function handlePropertyAction(d) {
  switch (d.act) {
    case 'buyProperty': if (confirm('Objekt kaufen?')) cmd('buyProperty', { target: d.ent }); return true;
    case 'propUpgrade': {
      const sel = document.getElementById('extraSel-' + d.ent);
      cmd('propUpgrade', { target: d.ent, line: d.line, extra: d.line === 'extra' ? sel?.value : undefined });
      return true;
    }
    case 'yardBuild': cmd('yardBuild', { target: d.ent, type: d.type }); return true;
    case 'yardClaim': cmd('yardClaim', { target: d.ent, index: Number(d.idx) }); return true;
    case 'recycle': if (confirm('Schiff recyceln? Es wird zerlegt.')) cmd('recycle', { ship: d.ship }); return true;
    case 'buyGovernor': cmd('buyLicense', { kind: 'governor', name: draft.name.trim() || undefined, color: draft.color || state.me.color }); return true;
  }
  return false;
}
export function handlePropertyChange(el) {
  if (el.classList.contains('prop-mode')) cmd('propMode', { target: el.dataset.ent, mode: el.value });
  else if (el.classList.contains('prop-customs')) cmd('propCustoms', { target: el.dataset.ent, value: Number(el.value) });
  else if (el.classList.contains('prop-fixed')) cmd('propFixed', { target: el.dataset.ent, good: el.dataset.good, s: Number(el.value) });
  else if (el.classList.contains('yard-sale')) cmd('yardSale', { target: el.dataset.ent, on: el.checked });
  else if (el.classList.contains('yard-price')) cmd('yardPrice', { target: el.dataset.ent, index: Number(el.dataset.idx), price: Math.max(0, Math.floor(Number(el.value) || 0)) });
  else return false;
  return true;
}

// ---------- Besitzübersicht (Taste B) ----------
const card = $('propsCard');
function renderProps() {
  const L = gov();
  const list = [...state.props.values()].map((p) => ({ p, e: state.entities.get(p.entity) })).filter((x) => x.e);
  let h = `<div class="modal-head"><h2>Besitz</h2><span class="muted">${list.length} / ${L?.maxProps || 0}${state.faction ? ` · <span style="color:${state.faction.color}">${esc(state.faction.name)}</span>` : ''}</span><span style="flex:1"></span><button data-p="close">✕</button></div>`;
  if (!L) h += `<div class="muted">Mit einer Gouverneurslizenz (am Hub) kannst du Stationen und Planeten kaufen.</div>`;
  if (L && !list.length) h += `<div class="muted">Noch kein Besitz. Wähle eine Station, dock ein Schiff an und kaufe sie im Detailpanel.</div>`;
  h += `<div class="fav-list">` + list.map(({ p, e }) => `<div class="fav-row"><img src="${entitySprite(e)}" alt=""><div class="fav-main">
    <div><b class="link" data-p="show" data-id="${e.id}">${esc(e.name)}</b> <span class="muted">${typeName(e)} · ${esc(systemName(e))} · ${esc(sectorName(e))}</span></div>
    <div class="small-note">${p.mode === 'private' ? 'privat' : 'offen'}${p.customs ? ` · Zoll ${Math.round(p.customs * 100)} %` : ''} · Ausbau ${Object.entries(p.upg).map(([k, v]) => `${PROP_UPGRADES[k].name} ${v}`).join(', ') || '–'}</div></div>
    <div class="fav-side"><div>1 h <b class="${p.h1 < 0 ? 'neg' : 'pos'}">${fmtK(p.h1)}</b></div><div>24 h <b class="${p.d24 < 0 ? 'neg' : 'pos'}">${fmtK(p.d24)}</b></div></div></div>`).join('') + `</div>`;
  setHtml(card, h);
}
card.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-p]');
  if (!b) return;
  if (b.dataset.p === 'close') closeModal('propsModal');
  if (b.dataset.p === 'show') {
    const e = state.entities.get(b.dataset.id);
    state.camera.x = e.x; state.camera.y = e.y; state.camera.zoom = Math.max(state.camera.zoom, 0.12); state.follow = null;
    bus.select({ kind: 'entity', id: e.id });
  }
});
registerModal('propsModal', renderProps);
export const openProps = () => openModal('propsModal');
