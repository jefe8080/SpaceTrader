// Werft- und Hub-Abschnitte des Detailpanels: Schiffe kaufen/verkaufen, Upgrades, Module, Lizenzen
import { GOODS, SHIP_TYPES, SHIP_CLASSES, SHIPYARD, UPGRADES, MODULES, PILOT_LICENSES, MODULE_REFUND, MODULE_SIZE,
  upgradeCost, shipStats, holdUsage, sellValue, countModules } from '/shared/config.js';
import { state, fmt, esc, myShips } from '../state.js';
import { shipSprite } from '../util.js';

const lic = () => PILOT_LICENSES[state.pilot || 1];
const clsBadge = (cls) => `<span class="badge cls-${cls}" title="Klasse ${SHIP_CLASSES[cls].name}, Pilotenlizenz ${SHIP_CLASSES[cls].license}">${SHIP_CLASSES[cls].name}</span>`;

/** Kurzwerte eines Schiffstyps */
export const typeLine = (t) => {
  const d = SHIP_TYPES[t];
  return `Laderaum ${fmt(d.cargo)} · Tempo ${d.speed}${d.mining ? ' · Bergbau ' + d.mining : ''} · Tank ${d.tank}`;
};

export function shipyardSection(e, dockedShip) {
  const m = e.market;
  const L = lic();
  let h = `<div class="section"><div class="section-title">Schiffe zum Verkauf</div>`;
  if (!m.forSale?.length) h += `<div class="muted">Derzeit keine Schiffe verfügbar.</div>`;
  (m.forSale || []).forEach((it, i) => {
    const d = SHIP_TYPES[it.type];
    const allowed = L.classes.includes(d.cls);
    const full = myShips().length >= L.maxShips;
    const why = !dockedShip ? 'Ein eigenes Schiff muss hier angedockt sein' : !allowed ? `Pilotenlizenz ${SHIP_CLASSES[d.cls].license} nötig` : full ? `Lizenz erlaubt max. ${L.maxShips} Schiffe` : state.credits < it.price ? 'Nicht genug Credits' : '';
    h += `<div class="forsale"><img src="${shipSprite(it.type, state.me.color)}" alt=""><div class="info"><b>${d.name}</b> ${clsBadge(d.cls)}${it.upg ? ' <span class="badge">aufgerüstet</span>' : ''}<br>
      ${typeLine(it.type)}<br><span class="muted">${d.desc}</span></div>
      <div style="text-align:right"><div class="price-tag">${fmt(it.price)} Cr</div>
      <button class="small primary" data-act="buyShip" data-ent="${e.id}" data-idx="${i}" ${why ? 'disabled' : ''} title="${esc(why)}">Kaufen</button></div></div>`;
  });
  if (m.owner) {
    h += `<div class="muted small-note">Spielerwerft: baut nur auf Befehl des Besitzers.</div>`;
  } else if (m.building) {
    h += `<div style="margin-top:6px">🔧 Im Bau: <b>${SHIP_TYPES[m.building.type].name}</b> (noch ${m.building.remaining} s)</div>`;
  } else if ((m.forSale?.length || 0) < SHIPYARD.MAX_FOR_SALE) {
    const order = SHIPYARD.ORDER[m.yard || 'shipyard'];
    const next = order[(m.nextBuild || 0) % order.length];
    const req = Object.entries(SHIP_TYPES[next].build).map(([g, n]) => `${GOODS[g].name} ${Math.floor(m.goods[g]?.stock || 0)}/${n}`).join(', ');
    h += `<div style="margin-top:6px" class="muted">Nächster Bau: <b>${SHIP_TYPES[next].name}</b> · benötigt ${req}<br>Preis = Materialkosten + 25 % Marge</div>`;
  } else {
    h += `<div style="margin-top:6px" class="muted">Dock voll, keine weiteren Bauten.</div>`;
  }
  h += '</div>';
  if (dockedShip) h += refitSection(e, dockedShip);
  return h;
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

/** Hub: Lizenzen und Schiffsverkauf */
export function hubSection(e, dockedShip) {
  const cur = lic();
  const next = PILOT_LICENSES[cur.level + 1];
  let h = `<div class="section"><div class="section-title">Pilotenlizenz</div>
    <div class="kv"><span>Aktuell</span><span><b>Stufe ${cur.level}</b> · max. ${cur.maxShips} Schiffe · Klassen ${cur.classes.map((c) => SHIP_CLASSES[c].name).join(', ')} · Upgrades bis Stufe ${cur.maxUpgrade}</span>`;
  if (next) {
    h += `<span>Nächste</span><span>Stufe ${next.level}: ${next.maxShips} Schiffe, Klassen ${next.classes.map((c) => SHIP_CLASSES[c].name).join(', ')}, Upgrades bis ${next.maxUpgrade}</span></div>
      <button class="primary small" data-act="buyLicense" data-kind="pilot" ${!dockedShip || state.credits < next.cost ? 'disabled' : ''} title="${dockedShip ? '' : 'Ein eigenes Schiff muss am Hub angedockt sein'}">Lizenz ${next.level} kaufen: ${fmt(next.cost)} Cr</button>`;
  } else h += `</div><div class="muted">Höchste Stufe erreicht.</div>`;
  h += `</div>`;
  if (dockedShip) h += `<div class="section"><div class="section-title">Schiffsverkauf</div>${sellRow(dockedShip)}</div>`;
  return h;
}
