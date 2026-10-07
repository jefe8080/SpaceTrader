// Werft- und Hub-Abschnitte des Detailpanels: Schiffe kaufen/verkaufen, Upgrades, Module, Lizenzen
import { GOODS, SHIP_TYPES, SHIP_CLASSES, SHIPYARD, UPGRADES, MODULES, PILOT_LICENSES, MODULE_REFUND, MODULE_SIZE, ABILITIES, FACTIONS,
  RANKS, RANK_NAMES, upgradeCost, shipStats, holdUsage, sellValue, countModules, factionRank } from '/shared/config.js';
import { state, fmt, esc, myShips } from '../state.js';
import { shipSprite } from '../util.js';

const lic = () => PILOT_LICENSES[state.pilot || 1];
const clsBadge = (cls) => `<span class="badge cls-${cls}" title="Klasse ${SHIP_CLASSES[cls].name}, Pilotenlizenz ${SHIP_CLASSES[cls].license}">${SHIP_CLASSES[cls].name}</span>`;

/** Kurzwerte eines Schiffstyps, mit Werftbonus (+5 % je Werftlevel) */
export const typeLine = (t, bonus = 0) => {
  const d = SHIP_TYPES[t];
  const b = (v) => Math.round(v * (1 + bonus));
  return `Laderaum ${fmt(b(d.cargo))} · Tempo ${b(d.speed)}${d.mining ? ' · Bergbau ' + Math.round(d.mining * (1 + bonus) * 10) / 10 : ''} · Tank ${b(d.tank)}`
    + (d.ability ? `<br><span class="ability">★ ${ABILITIES[d.ability]}</span>` : '');
};
/** Hinweis auf den Werftbonus eines Angebots oder Schiffes */
export const bonusBadge = (x) => (x?.bonus ? ` <span class="badge bonus" title="Gebaut in Werft Stufe ${x.yardLvl}: +${Math.round(x.bonus * 100)} % auf Tempo, Fracht, Tank und Abbau">Werft St. ${x.yardLvl} +${Math.round(x.bonus * 100)} %</span>` : '');
/** Fraktionsrang des Spielers */
export const myRank = (f) => factionRank(state.rep?.[f] || 0);

export function shipyardSection(e, dockedShip) {
  const m = e.market;
  const L = lic();
  let h = `<div class="section"><div class="section-title">Schiffe zum Verkauf</div>`;
  if (!m.forSale?.length) h += `<div class="muted">Derzeit keine Schiffe verfügbar.</div>`;
  (m.forSale || []).forEach((it, i) => {
    const d = SHIP_TYPES[it.type];
    const allowed = L.classes.includes(d.cls);
    const full = myShips().length >= L.maxShips;
    const reserved = it.reservedFor && it.reservedFor !== state.me.id && state.time < it.reservedUntil;
    const why = !dockedShip ? 'Ein eigenes Schiff muss hier angedockt sein' : reserved ? `Reserviert für ${it.reservedName} (noch ${Math.ceil((it.reservedUntil - state.time) / 60)} min)`
      : !allowed ? `Pilotenlizenz ${SHIP_CLASSES[d.cls].license} nötig` : full ? `Lizenz erlaubt max. ${L.maxShips} Schiffe` : state.credits < it.price ? 'Nicht genug Credits' : '';
    const resTag = it.reservedFor && state.time < it.reservedUntil ? ` <span class="badge" title="Vorkaufsrecht des Bestellers">bestellt von ${esc(it.reservedName || '?')}</span>` : '';
    h += `<div class="forsale"><img src="${shipSprite(it.type, state.me.color)}" alt=""><div class="info"><b>${d.name}</b> ${clsBadge(d.cls)}${it.upg ? ' <span class="badge">aufgerüstet</span>' : ''}${bonusBadge(it)}${resTag}<br>
      ${typeLine(it.type, it.bonus)}<br><span class="muted">${d.desc}</span></div>
      <div style="text-align:right"><div class="price-tag">${fmt(it.price)} Cr</div>
      <button class="small primary" data-act="buyShip" data-ent="${e.id}" data-idx="${i}" ${why ? 'disabled' : ''} title="${esc(why)}">Kaufen</button></div></div>`;
  });
  if (m.owner) {
    h += `<div class="muted small-note">Spielerwerft: baut nur auf Befehl des Besitzers.</div>`;
  } else if (m.building) {
    h += `<div style="margin-top:6px">🔧 Im Bau: <b>${SHIP_TYPES[m.building.type].name}</b> (noch ${m.building.remaining} s)${m.building.bonus ? ` · Werftbonus +${Math.round(m.building.bonus * 100)} %` : ''}</div>`;
  } else if (m.order) {
    const req = Object.entries(SHIP_TYPES[m.order.type].build).map(([g, n]) => `${GOODS[g].name} ${Math.floor(m.goods[g]?.stock || 0)}/${n}`).join(', ');
    h += `<div style="margin-top:6px" class="muted">Bestellung hat Vorrang · benötigt ${req}</div>`;
  } else if ((m.forSale?.length || 0) < SHIPYARD.MAX_FOR_SALE) {
    const order = SHIPYARD.ORDER[m.yard || 'shipyard'];
    const next = order[(m.nextBuild || 0) % order.length];
    const req = Object.entries(SHIP_TYPES[next].build).map(([g, n]) => `${GOODS[g].name} ${Math.floor(m.goods[g]?.stock || 0)}/${n}`).join(', ');
    h += `<div style="margin-top:6px" class="muted">Nächster Bau: <b>${SHIP_TYPES[next].name}</b> · benötigt ${req}<br>Preis = Materialkosten + 25 % Marge</div>`;
  } else {
    h += `<div style="margin-top:6px" class="muted">Dock voll, keine weiteren Bauten.</div>`;
  }
  h += '</div>';
  if (!m.owner) h += orderSlot(e, dockedShip);
  if (dockedShip) h += refitSection(e, dockedShip);
  return h;
}

/** Bestellslot einer NPC-Werft: bekannte, erlaubte Typen der Werftgröße, Anzahlung 2 × Katalogpreis */
function orderSlot(e, dockedShip) {
  const m = e.market;
  let h = `<div class="section"><div class="section-title">Bestellslot</div>`;
  if (m.order) {
    return h + `<div>Bestellt: <b>${SHIP_TYPES[m.order.type].name}</b> von ${esc(m.order.name)}${m.order.player === state.me.id ? ' (deine Bestellung)' : ''}</div>
      <div class="muted small-note">Eine neue Bestellung ist erst nach Fertigstellung möglich. Material liefern beschleunigt den Bau.</div></div>`;
  }
  const L = lic();
  const types = Object.entries(SHIP_TYPES).filter(([t, d]) => !d.npc && !d.faction && SHIPYARD.ORDER_CLASSES[e.type]?.includes(d.cls) && state.shipTypes.has(t));
  if (!types.length) return h + `<div class="muted">Bestellbar sind Schiffe der Klassen ${SHIPYARD.ORDER_CLASSES[e.type]?.join(' und ')}, die du im Almanach hast.</div></div>`;
  h += `<div class="btnrow"><select id="orderType">${types.map(([t, d]) => `<option value="${t}" ${L.classes.includes(d.cls) ? '' : 'disabled'}>${d.name} (${d.cls}) · Anzahlung ${fmt(d.price * SHIPYARD.DEPOSIT)} Cr</option>`).join('')}</select>
    <button class="small" data-act="yardOrder" data-ent="${e.id}" ${dockedShip ? '' : 'disabled title="Ein eigenes Schiff muss hier angedockt sein"'}>Bestellen</button></div>
    <div class="muted small-note">Anzahlung 2 × Katalogpreis, keine Erstattung. Die Bestellung hat Vorrang vor der Bauliste; fertig kostet das Schiff den normalen Angebotspreis und ist ${SHIPYARD.RESERVE / 60} min für dich reserviert.</div>`;
  return h + '</div>';
}

/** Upgrades, Module und Verkauf für ein hier angedocktes eigenes Schiff */
function refitSection(e, s) {
  const L = lic();
  const own = e.market.owner === state.me.id;
  const disc = own ? 0.5 : 1;
  let h = `<div class="section"><div class="section-title">Werftdienste für ${esc(s.name)}${own ? ' · Selbstkosten' : ''}</div>
    <table class="market"><tr><th>Upgrade</th><th>Stufe</th><th>Nächste</th><th></th></tr>`;
  for (const [line, u] of Object.entries(UPGRADES)) {
    const lvl = s.upg?.[line] || 0;
    const cost = Math.round(upgradeCost(s.type, lvl + 1) * disc);
    const max = lvl >= L.maxUpgrade;
    h += `<tr><td title="${esc(u.desc)}">${u.name}</td><td>${lvl} / ${L.maxUpgrade}</td>
      <td>${max ? `<span class="muted">${lvl >= 6 ? 'Maximum' : 'Lizenz ' + (L.level + 1)}</span>` : fmt(cost) + ' Cr'}</td>
      <td><button class="small" data-act="upgrade" data-ship="${s.id}" data-line="${line}" ${max || state.credits < cost ? 'disabled' : ''}>＋</button></td></tr>`;
  }
  h += `</table>`;
  const counts = countModules(s);
  const st = shipStats(s);
  const freeCargo = st.cargo - holdUsage(s).cargo;
  if (Object.keys(counts).length) {
    h += `<div class="sub-title">Eingebaute Module</div>` + Object.entries(counts).map(([id, n]) => `<div class="cargo-row">${MODULES[id].name} ×${n}
      <span class="amt"></span><button class="small danger" data-act="removeModule" data-ship="${s.id}" data-module="${id}" title="Ausbauen, ${Math.round(MODULE_REFUND * 100)} % Erstattung: ${fmt(MODULES[id].price * MODULE_REFUND)} Cr">Ausbauen</button></div>`).join('');
  }
  const offers = own ? Object.keys(MODULES) : e.market.modules || [];
  if (offers.length) {
    h += `<div class="sub-title">Module im Angebot</div>` + offers.map((id) => {
      const cost = Math.round(MODULES[id].price * disc);
      const why = freeCargo < MODULE_SIZE ? `Braucht ${MODULE_SIZE} freie Frachteinheiten` : state.credits < cost ? 'Nicht genug Credits' : '';
      return `<div class="cargo-row" title="${esc(MODULES[id].desc)}">${MODULES[id].name} <span class="muted">${fmt(cost)} Cr</span>
        <span class="amt"></span><button class="small" data-act="buyModule" data-ship="${s.id}" data-module="${id}" ${why ? 'disabled' : ''} title="${esc(why)}">Einbauen</button></div>`;
    }).join('');
  }
  h += sellRow(s) + '</div>';
  return h;
}

function sellRow(s) {
  const v = sellValue(s);
  return `<div class="btnrow" style="margin-top:8px"><button class="small danger" data-act="sellShip" data-ship="${s.id}" ${myShips().length <= 1 ? 'disabled title="Letztes Schiff"' : ''}>Schiff verkaufen: ${fmt(v)} Cr</button>
    <span class="muted small-note">60 % Marktpreis + 50 % der Upgrades und Module</span></div>`;
}

/** Ruf bei einer Fraktion: Rang und Fortschritt zum nächsten */
export function repLine(f) {
  const rep = Math.floor(state.rep?.[f] || 0), r = myRank(f), next = RANKS[r + 1];
  return `Dein Ruf bei ${esc(FACTIONS[f].name)}: <b>Rang ${r} · ${RANK_NAMES[r]}</b>${next ? ` (${fmt(rep)} / ${fmt(next)})` : ` (${fmt(rep)})`}`;
}

/** Fraktionswerft: L, XL und Spezialschiff, doppelt gesperrt durch Fraktionsrang und Pilotenlizenz */
export function factionYardSection(e, dockedShip) {
  const items = e.market.forSale || [];
  if (!items.length) return '';
  const L = lic();
  const docked = myShips().filter((s) => s.dockedAt === e.id);
  let h = `<div class="section"><div class="section-title">Fraktionsschiffe</div><div class="muted small-note">${repLine(e.faction)} · Ruf gibt es für Quests auf Planeten der Fraktion.</div>`;
  items.forEach((it, i) => {
    const d = SHIP_TYPES[it.type];
    const have = docked.reduce((a, s) => a + (s.cargo?.[it.currency.good] || 0), 0);
    const rankOk = myRank(d.faction) >= d.rank, licOk = L.classes.includes(d.cls);
    const why = !dockedShip ? 'Ein eigenes Schiff muss hier angedockt sein' : !rankOk ? `Fraktionsrang ${d.rank} (${RANK_NAMES[d.rank]}) nötig`
      : !licOk ? `Pilotenlizenz ${SHIP_CLASSES[d.cls].license} nötig` : myShips().length >= L.maxShips ? `Lizenz erlaubt max. ${L.maxShips} Schiffe`
        : have < it.currency.n ? `Es fehlen ${it.currency.n - have} ${GOODS[it.currency.good].name}` : state.credits < it.price ? 'Nicht genug Credits' : '';
    h += `<div class="forsale"><img src="${shipSprite(it.type, state.me.color)}" alt=""><div class="info"><b>${d.name}</b> ${clsBadge(d.cls)}
      <span class="badge${rankOk ? '' : ' neg'}" title="Nötiger Fraktionsrang">Rang ${d.rank}</span><br>
      ${typeLine(it.type)}<br><span class="muted">${esc(d.desc)}</span></div>
      <div style="text-align:right"><div class="price-tag">${fmt(it.price)} Cr</div><div class="price-tag">+ ${fmt(it.currency.n)} ${GOODS[it.currency.good].name}</div>
      <div class="muted small-note">an Bord: ${fmt(have)}</div>
      <button class="small primary" data-act="buyFactionShip" data-ent="${e.id}" data-idx="${i}" ${why ? 'disabled' : ''} title="${esc(why)}">Kaufen</button></div></div>`;
  });
  return h + '</div>';
}

/** Außenposten einer Fraktion: Module (60 % des Katalogs) */
export function outpostSection(e, dockedShip) {
  const mods = e.market.modules || [];
  if (!mods.length) return '';
  let h = `<div class="section"><div class="section-title">Module im Angebot</div>`;
  const st = dockedShip && shipStats(dockedShip);
  const free = st ? st.cargo - holdUsage(dockedShip).cargo : 0;
  for (const id of mods) {
    const why = !dockedShip ? 'Ein eigenes Schiff muss hier angedockt sein' : free < MODULE_SIZE ? `Braucht ${MODULE_SIZE} freie Frachteinheiten` : state.credits < MODULES[id].price ? 'Nicht genug Credits' : '';
    h += `<div class="cargo-row" title="${esc(MODULES[id].desc)}">${MODULES[id].name} <span class="muted">${fmt(MODULES[id].price)} Cr</span><span class="amt"></span>
      <button class="small" data-act="buyModule" data-ship="${dockedShip?.id || ''}" data-module="${id}" ${why ? 'disabled' : ''} title="${esc(why)}">Einbauen</button></div>`;
  }
  return h + `<div class="muted small-note">Ausbau an jeder Werft (50 % Erstattung).</div></div>`;
}

/** Hub: Lizenzen und Schiffsverkauf */
export function hubSection(e, dockedShip) {
  const cur = lic();
  const next = PILOT_LICENSES[cur.level + 1];
  let h = `<div class="section"><div class="section-title">Pilotenlizenz</div>
    <div class="kv"><span>Aktuell</span><span><b>Stufe ${cur.level}</b> · max. ${cur.maxShips} Schiffe · Klassen ${cur.classes.map((c) => SHIP_CLASSES[c].name).join(', ')} · Upgrades bis Stufe ${cur.maxUpgrade}</span>`;
  if (next) {
    const lvlOk = (state.level || 1) >= next.level;
    const why = !dockedShip ? 'Ein eigenes Schiff muss am Hub angedockt sein' : !lvlOk ? `Erfordert Pilotenlevel ${next.level}` : state.credits < next.cost ? 'Nicht genug Credits' : '';
    h += `<span>Nächste</span><span>Stufe ${next.level}: ${next.maxShips} Schiffe, Klassen ${next.classes.map((c) => SHIP_CLASSES[c].name).join(', ')}, Upgrades bis ${next.maxUpgrade}</span>
      <span>Voraussetzung</span><span class="${lvlOk ? '' : 'neg'}">Pilotenlevel ${next.level} (aktuell ${state.level || 1})</span></div>
      <button class="primary small" data-act="buyLicense" data-kind="pilot" ${why ? 'disabled' : ''} title="${esc(why)}">Lizenz ${next.level} kaufen: ${fmt(next.cost)} Cr</button>`;
  } else h += `</div><div class="muted">Höchste Stufe erreicht.</div>`;
  h += `</div>`;
  if (dockedShip) h += `<div class="section"><div class="section-title">Schiffsverkauf</div>${sellRow(dockedShip)}</div>`;
  return h;
}
