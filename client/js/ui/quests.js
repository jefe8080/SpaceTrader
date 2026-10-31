// Quests (PRD-2 Kapitel 9): Questtafel im Detailpanel, aktive Quest als eigenes Panel
import { GOODS, QUEST_TYPES, GIVER_LEVELS, MAX_GIVER_LEVEL, QUEST, FACTIONS, giverLevel, shipStats } from '/shared/config.js';
import { state, fmt, esc, myShips } from '../state.js';
import { cmd } from '../net.js';
import { $, setHtml } from './dom.js';
import { bus } from './bus.js';
import { HOME_QUESTS } from '/shared/homeworld.js';
import { selectHomeQuest } from '/shared/quest-selection.js';
import {activeSideQuests,sideQuestLimit,selectedSideQuest,minedQuestProgress,explorationOfferAvailable} from '/shared/side-quests.js';
let selectedHomeQuest = null;
let selectedQuest=null;

const g = (x) => GOODS[x]?.name || x;

/** Beschreibung einer Quest (Angebot oder aktiv) */
export function questText(q) {
  q=liveQuestNames(q);
  const discreet=q.smuggler?'Diskreter Auftrag: Unser Kontakt verlässt sich auf dein Schweigen. ':'';
  return discreet+questDescription(q);
}
function liveQuestNames(q){
  const name=(id,fallback)=>state.entities.get(id)?.name||fallback;
  return {...q,giverName:name(q.giver,q.giverName),sourceName:name(q.source,q.sourceName),pickupName:name(q.pickup,q.pickupName),destName:name(q.dest,q.destName),beltName:name(q.belt,q.beltName),stopNames:q.stops?.map((id,i)=>name(id,q.stopNames?.[i]))||q.stopNames};
}
function questDescription(q) {
  switch (q.type) {
    case 'procure': return `Die örtlichen Vorräte gehen zur Neige. ${q.amount} ${g(q.good)} ${q.source ? `bei ${esc(q.sourceName)} kaufen` : 'beschaffen'} und an ${esc(q.giverName)} liefern`;
    case 'rush': return `In der Werft wartet ein unfertiger Rumpf auf Material. ${q.amount} ${g(q.good)} für den aktuellen Bau an ${esc(q.giverName)} liefern${q.source ? ` (z.B. von ${esc(q.sourceName)})` : ''}`;
    case 'courier': return `Eine versiegelte Sendung wartet auf einen verlässlichen Kapitän. Hole sie bei ${esc(q.pickupName)} ab und bringe sie nach ${esc(q.destName)}.`;
    case 'tour': return `Die Reisenden wollen die Häfen mit eigenen Augen sehen. ${q.tourists} Touristen: ${q.stopNames.map(esc).join(', ')} anfliegen und zurück nach ${esc(q.giverName)} (Passagierkabine)`;
    case 'explore': return q.zone ? `Unsere Karten lassen Fragen offen. Besuche das Sondergebiet ${esc(q.zoneName)} mit einem eigenen Schiff.` : `Im Sektor ${esc(q.sectorName)} fehlen verlässliche Karten. Decke dort ${q.pct} % neue Fläche auf.`;
    case 'mine': return `Die Werft braucht Material aus frischem Abbau. Gewinne selbst ${q.amount} ${g(q.good)}, etwa bei ${esc(q.beltName)}, und liefere sie nach ${esc(q.giverName)}.`;
    default: return q.type;
  }
}

const rewardText = (q) => `<b>${fmt(q.reward.cr)} Cr</b> · ${q.reward.xp} XP${q.faction ? ` · Ruf ${esc(FACTIONS[q.faction].name)}` : ''}`;
const qTitle = (q) => `${QUEST_TYPES[q.type].icon} ${QUEST_TYPES[q.type].name} <span class="badge" title="Questlevel">Q${q.level}</span>`;

/** Warum kann dieses Schiff die Quest nicht annehmen? '' = möglich */
function acceptBlock(q, ship) {
  if (!ship) return 'Ein eigenes Schiff muss hier angedockt sein';
  if (activeSideQuests(state).length>=sideQuestLimit(state)) return `Alle ${sideQuestLimit(state)} Nebenquestslots belegt`;
  const lock = (state.questLock || 0) - state.time;
  if (lock > 0) return `Nach einem Abbruch erst in ${Math.ceil(lock / 60)} min`;
  const st = shipStats(ship);
  if (q.type === 'tour' && st.passenger < q.tourists) return `Braucht Passagierkabinen für ${q.tourists} Touristen`;
  if (q.type === 'mine' && !(st.mining[GOODS[q.good]?.mine||'std'] > 0)) return 'Braucht die passenden Abbaugeräte für diesen Rohstoff';
  return '';
}

/**
 * Questtafel eines Planeten oder einer Werft. An Planeten werden Quests nur im Questhaus der planetaren Ansicht
 * angenommen (inHouse), im Detailpanel verweist der Knopf dorthin (PRD-3 6.2).
 */
export function questBoardSection(e, dockedShip, inHouse = false) {
  const m = e.market;
  const lvl = giverLevel(m.qxp || 0);
  const next = GIVER_LEVELS[lvl + 1];
  const offers = (m.board || []).filter(q=>explorationOfferAvailable(q,state.zoneVisits,state.cells));
  let h = `<div class="section"><div class="section-title">Questtafel · Level ${lvl}${next ? ` <span class="muted" style="text-transform:none;letter-spacing:0">(${fmt(m.qxp || 0)} / ${fmt(next)} XP)</span>` : ''}</div>`;
  if (!offers.length) h += `<div class="muted">Keine Aufträge. Neue erscheinen alle ${QUEST.EVERY[0] / 60} bis ${QUEST.EVERY[1] / 60} min (${QUEST.SLOTS[lvl]} ${QUEST.SLOTS[lvl] > 1 ? 'Plätze' : 'Platz'}).</div>`;
  for (const q of offers) {
    const why = acceptBlock(q, dockedShip);
    h += `<div class="quest-offer"><div class="qo-head">${qTitle(q)}<span style="flex:1"></span>${rewardText(q)}</div>
      <div>${questText(q)}</div>
      <div class="qo-foot"><span class="muted">Aufwand ca. ${Math.max(1, Math.round(q.effort))} min bei Tempo 150</span><span style="flex:1"></span>
      ${e.kind === 'planet' && !inHouse
        ? `<button class="small" data-act="land" data-ent="${e.id}" ${dockedShip ? '' : 'disabled'} title="${dockedShip ? 'Landen und im Questhaus annehmen' : 'Ein eigenes Schiff muss hier angedockt sein'}">Im Questhaus annehmen (landen)</button>`
        : `<button class="small primary" data-act="questAccept" data-ent="${e.id}" data-quest="${q.id}" data-ship="${dockedShip?.id || ''}" ${why ? 'disabled' : ''} title="${esc(why)}">Annehmen</button>`}</div></div>`;
  }
  if (lvl < MAX_GIVER_LEVEL) h += `<div class="muted small-note">${e.market?.realEconomy?'Höhere Level verändern Questschwierigkeit und Angebot. Leistung entsteht durch konkrete Infrastruktur.':e.kind === 'planet' ? 'Höhere Level: mehr Produktion und Lager, neue Waren, schwierigere Quests.' : 'Höhere Level: bessere Schiffe (+5 % je Level), schwierigere Quests.'}</div>`;
  return h + '</div>';
}

// ---------- Aktive Quest ----------
const nm = (id) => state.entities.get(id)?.name || '?';
const best = (good) => Math.max(0, ...myShips().map((s) => s.cargo?.[good] || 0));
const minedTotal = (good) => myShips().reduce((a, s) => a + (s.mined?.[good] || 0), 0);

function progressText(q) {
  q=liveQuestNames(q);
  switch (q.type) {
    case 'procure':
    case 'rush': return `An Bord (bestes Schiff): ${Math.min(best(q.good), q.amount)} / ${q.amount} ${g(q.good)}`;
    case 'mine': return `Selbst abgebaut und noch nicht abgegeben: ${Math.min(q.amount,minedQuestProgress(state,q,minedTotal(q.good)))} / ${q.amount} · an Bord: ${Math.min(best(q.good), q.amount)}`;
    case 'courier': return q.state === 'pickup' ? `Abholen bei ${esc(q.pickupName)}` : `Unterwegs mit ${esc(state.ships.get(q.ship)?.name || '?')} nach ${esc(q.destName)}`;
    case 'tour': return q.state === 'return' ? `Alle Halte besucht: zurück nach ${esc(q.giverName)}` : `Halte: ${q.visited.length} / ${q.stops.length} (mit ${esc(state.ships.get(q.ship)?.name || '?')})`;
    case 'explore': return q.zone ? `Ein Schiff in das Gebiet fliegen` : `Aufgedeckt: ${Math.round((q.progress / q.cells) * q.pct * 10) / 10} / ${q.pct} %`;
    default: return '';
  }
}

/** Nächstes Ziel der aktiven Quest (Entity-ID oder Punkt) */
function questTarget(q) {
  switch (q.type) {
    case 'procure':
    case 'rush': return best(q.good) >= q.amount || !q.source ? q.giver : q.source;
    case 'mine': return minedQuestProgress(state,q,minedTotal(q.good)) >= q.amount ? q.giver : q.belt;
    case 'courier': return q.state === 'pickup' ? q.pickup : q.dest;
    case 'tour': return q.state === 'return' ? q.giver : q.stops.find((s) => !q.visited.includes(s));
    case 'explore': return q.zone ? { x: q.zx, y: q.zy } : (state.sectors.get(q.sector)?.bh || null);
    default: return null;
  }
}

export function renderQuestBox() {
  const quests=activeSideQuests(state),q=selectedSideQuest(state,selectedQuest)||quests[0];selectedQuest=q?.id||null;
  const box = $('questBox');
  box.hidden = !q && !state.homeworld && !state.war?.friendQuest;
  const selection = selectHomeQuest(HOME_QUESTS, state.homeQuest, selectedHomeQuest);
  selectedHomeQuest = selection.id;
  const home = HOME_QUESTS[selection.id];
  const navigation = selection.count > 1 ? `<button class="small" data-q="homePrev" aria-label="Vorherige Hauptquest">‹</button><span>${selection.index+1}/${selection.count}</span><button class="small" data-q="homeNext" aria-label="Nächste Hauptquest">›</button>` : '';
  const fq = state.war?.friendQuest;
  const friendSummary = fq ? `<div class="qb-head">🤝 Freundschaftsquest</div><p>Bringe ${Object.entries(fq.gift).map(([good, n]) => `${n} ${g(good)}`).join(' und ')} als Geschenk zum Verwaltungsplaneten einer frei gewählten Fraktion.</p><hr>` : '';
  const homeSummary = (state.homeworld && home ? `<div class="qb-head">⌂ Hauptquest · ${selection.id}<span style="flex:1"></span>${navigation}</div><p>${esc(home.title)}: ${esc(home.goal)}</p><button class="small" data-q="homeTarget">Heimat zeigen</button><hr>` : '') + friendSummary;
  if (!q) { setHtml(box, homeSummary); return; }
  const t = questTarget(q);
  const docked = myShips().filter((s) => s.dockedAt);
  const tabs=`<p>Nebenquests: ${quests.length} / ${sideQuestLimit(state)} Slots</p><div class="btnrow">${quests.map((quest,i)=>`<button class="small" data-q="select" data-quest="${quest.id}" aria-pressed="${quest===q}" title="${esc(quest.giverName||quest.id)}">${i+1} · ${QUEST_TYPES[quest.type].name}</button>`).join('')}</div>`;
  setHtml(box, `${homeSummary}${tabs}<div class="qb-head">${qTitle(q)}<span style="flex:1"></span><button class="small ghost" data-q="abort" title="Abbrechen: 10 min Sperre${q.faction ? ', kleiner Rufverlust' : ''}">✕</button></div>
    <div class="qb-text">${questText(q)}</div>
    <div class="qb-prog">${progressText(q)}</div>
    <div class="qb-foot">${rewardText(q)}<span style="flex:1"></span>
      ${t ? `<button class="small" data-q="target">◎ ${typeof t === 'string' ? esc(nm(t)) : 'Ziel'}</button>` : ''}
      ${docked.length && ['procure', 'rush', 'mine'].includes(q.type) && docked.some((s) => s.dockedAt === q.giver) ? `<button class="small primary" data-q="deliver" data-ship="${docked.find((s) => s.dockedAt === q.giver).id}">Questabgabe (kein Handelsverkauf)</button>` : ''}</div>`);
}

$('questBox').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-q]');
  if(b?.dataset.q==='select'){selectedQuest=b.dataset.quest;renderQuestBox();return;}
  const q = selectedSideQuest(state,selectedQuest)||activeSideQuests(state)[0];
  if (['homePrev','homeNext'].includes(b?.dataset.q)) {
    selectedHomeQuest = selectHomeQuest(HOME_QUESTS, state.homeQuest, selectedHomeQuest, b.dataset.q === 'homeNext' ? 1 : -1).id;
    renderQuestBox();
    return;
  }
  if (b?.dataset.q === 'homeTarget') {
    const home = state.entities.get(state.homeworld);
    if (home) { state.follow = null; state.camera.x = home.x; state.camera.y = home.y; bus.select({ kind: 'entity', id: home.id }); }
    return;
  }
  if (!b || !q) return;
  if (b.dataset.q === 'abort') {
    if (confirm(`Quest abbrechen? Danach ${QUEST.ABORT_LOCK / 60} min keine neue Quest${q.faction ? ' und kleiner Rufverlust bei der Fraktion' : ''}.`)) cmd('questAbort',{quest:q.id});
  } else if (b.dataset.q === 'deliver') cmd('questDeliver', { ship: b.dataset.ship,quest:q.id });
  else if (b.dataset.q === 'target') {
    const t = questTarget(q);
    const e = typeof t === 'string' ? state.entities.get(t) : null;
    const p = e || t;
    if (p) { state.follow = null; state.camera.x = p.x; state.camera.y = p.y; }
    if (e) bus.select({ kind: 'entity', id: e.id });
  }
});
