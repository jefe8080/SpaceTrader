// Unterhaltung der planetaren Ansicht (PRD-3 6.5 und 6.6): Minispiele, Schmugglerhöhle, Bettler, Hund, Schule.
// Glücksspiele würfelt der Server, der Client animiert nur. Geschicklichkeitsspiele laufen im Client.
import { MG, EXTRAS, MINIGAMES, ENTERTAINMENT, COMPLIMENTS, FACTS, planetFeatures, gamesOf, stakeOf, seeded } from '/shared/config.js';
import { state, fmt, esc } from '../state.js';
import { cmd, socket } from '../net.js';
import { $, setHtml, toast } from './dom.js';
import { panelKinds, renderPlanetUi } from './planetPanel.js';
import { questText } from './quests.js';
import { sfx } from '../audio.js';
import { fmtDuration } from '../util.js';
import {activeSideQuests,sideQuestLimit} from '/shared/side-quests.js';

const TAU = Math.PI * 2;
const modal = $('mgModal');
const card = $('mgCard');
const dogOn = () => (state.dogUntil || 0) > state.time;
const level = () => state.level || 1;
const left = () => (!state.mg || state.time - state.mg.start >= MG.WINDOW ? MG.LIMIT : MG.LIMIT - state.mg.n);
const pauseSecs = () => (state.mg ? Math.max(0, state.mg.start + MG.WINDOW - state.time) : 0);

// ---------- Panels der Gebäude ----------
panelKinds.fun = {
  render(it) {
    const feat = planetFeatures(state.landed);
    const games = gamesOf(feat, it.building);
    let h = `<div class="muted">Einsatz ${MG.STAKES.join(', ')} × Pilotenlevel. Ein Gewinn zahlt den Einsatz plus denselben Betrag. Gewinnchance ${Math.round(MG.WIN * 100)} %${dogOn() ? `, mit Hund ${Math.round(MG.WIN_DOG * 100)} %` : ''}.</div>`;
    if (left() <= 0) return h + `<div class="warn" style="margin-top:8px">Der Croupier macht Pause. Weiter in ${fmtDuration(pauseSecs())}.</div>`;
    h += `<table class="market" style="margin-top:6px">${games.map((g) => `<tr><td><b>${MINIGAMES[g].name}</b> <span class="muted small-note">${MINIGAMES[g].kind === 'luck' ? 'Glück' : 'Geschick'}</span></td>
      <td style="white-space:nowrap">${MG.STAKES.map((_, i) => `<button class="small" data-pp="mg" data-game="${g}" data-stake="${i}" ${state.credits < stakeOf(i, level()) ? 'disabled' : ''}>${fmt(stakeOf(i, level()))} Cr</button>`).join(' ')}</td></tr>`).join('')}</table>
      <div class="muted small-note">Noch ${left()} von ${MG.LIMIT} Spielen in dieser Stunde (über alle Planeten).</div>`;
    return h;
  },
  click(d, it) {
    if (d.pp !== 'mg') return false;
    openGame(d.game, Number(d.stake), it.building);
    return false;
  },
};

panelKinds.smuggler = {
  render(it, e, ship) {
    const holes = [...state.entities.values()].filter((x) => x.kind === 'wormhole' && x.sector === e.sector).length;
    const o = e.market.smug;
    let h = `<div class="sub-title">Wurmloch-Tipp</div><div class="muted">Für ${fmt(EXTRAS.TIP_COST)} Cr verrät der Schmuggler einen dir unbekannten Wurmloch-Eingang in diesem Sektor. Keine XP.</div>
      <button class="small" data-pp="tip" ${state.credits < EXTRAS.TIP_COST ? 'disabled' : ''}>Tipp kaufen</button> <span class="muted small-note">${holes} Wurmloch-Eingänge hier schon bekannt</span>`;
    h += `<div class="sub-title">Schmuggelauftrag</div>`;
    if (!o) h += `<div class="muted">Gerade kein Auftrag. Komm später wieder.</div>`;
    else {
      const why = !ship ? 'Ein eigenes Schiff muss angedockt sein' : activeSideQuests(state).length>=sideQuestLimit(state) ? 'Alle Nebenquestslots sind belegt' : (state.questLock || 0) > state.time ? 'Nach einem Abbruch gesperrt' : '';
      h += `<div class="quest-offer"><div>${questText(o)}</div><div class="qo-foot"><b>${fmt(o.reward.cr)} Cr</b>&nbsp;<span class="muted">· keine XP, kein Ruf</span><span style="flex:1"></span>
        <button class="small primary" data-pp="smug" ${why ? 'disabled' : ''} title="${esc(why)}">Annehmen</button></div></div>
        <div class="muted small-note">Belegt einen Nebenquestslot (${activeSideQuests(state).length} / ${sideQuestLimit(state)} belegt). Doppelte Belohnung, dafür keine Erfahrung und kein Questgeber-Level.</div>`;
    }
    return h;
  },
  click(d, it, e, ship) {
    if (d.pp === 'tip') { if (confirm(`Wurmloch-Tipp für ${fmt(EXTRAS.TIP_COST)} Cr kaufen?`)) cmd('whTip', { target: e.id }); return false; }
    if (d.pp === 'smug' && ship) { cmd('smugAccept', { target: e.id, ship: ship.id }); return false; }
    return false;
  },
};

let compliment = null;
panelKinds.beggar = {
  render() {
    return `<div class="beggar-row"><div class="bubble">${compliment !== null ? esc(COMPLIMENTS[compliment]) : 'Eine kleine Spende, Kapitän?'}</div></div>
      <button class="small" data-pp="beg" ${state.credits < EXTRAS.BEG_COST ? 'disabled' : ''}>${EXTRAS.BEG_COST} Cr spenden</button>
      <span class="muted small-note">Seltsam: Bei jeder Spende verlieren deine hier angedockten Schiffe 5 % ihres Treibstoffs.</span>`;
  },
  click(d, it, e) { if (d.pp === 'beg') cmd('beg', { target: e.id }); return false; },
};

panelKinds.dog = {
  render() {
    const rest = Math.max(0, (state.dogUntil || 0) - state.time);
    return `<div class="muted">Ein freundlicher Hund. Streicheln bringt Glück: ${Math.round(MG.WIN_DOG * 100)} % statt ${Math.round(MG.WIN * 100)} % bei Minispielen und leichtere Geschicklichkeitsspiele, ${EXTRAS.DOG_SECS / 60} min auf allen Planeten.</div>
      <button class="small primary" data-pp="pet">🐕 Streicheln</button> ${rest > 0 ? `<span class="pos small-note">Wirkt noch ${fmtDuration(rest)}</span>` : ''}`;
  },
  click(d, it, e) { if (d.pp === 'pet') { cmd('dogPet', { target: e.id }); sfx('questAccept'); } return false; },
};

let fact = null;
const CAT = { sci: 'Wissenschaft und Natur', hist: 'Geschichte und Kurioses', geo: 'Geoguessr-Tipp' };
panelKinds.school = {
  render() {
    if (fact === null) fact = Math.floor(Math.random() * FACTS.length);
    const [cat, text] = FACTS[fact];
    return `<div class="chalkboard"><div class="muted small-note">${CAT[cat]}</div><div>${esc(text)}</div></div>
      <button class="small" data-pp="fact">Nächster Fakt</button>`;
  },
  click(d) { if (d.pp === 'fact') { fact = Math.floor(Math.random() * FACTS.length); return true; } return false; },
  open() { fact = null; }, // bei jedem Betreten ein neuer Eintrag
};
panelKinds.beggar.open = () => { compliment = null; };

// ---------- Minispiel-Fenster ----------
let G = null; // laufendes Spiel { game, stake, building, phase, ... }

function openGame(game, stake, building) {
  if (left() <= 0) { toast('Der Croupier macht Pause.'); return; }
  G = { game, stake, building, cr: stakeOf(stake, level()), phase: 'ready', choice: {} };
  if (game === 'highlow') G.choice.first = 2 + Math.floor(Math.random() * 13);
  if (game === 'roulette') G.choice.color = 'red';
  if (game === 'horses') G.choice.horse = 0;
  modal.hidden = false;
  draw();
}
function closeGame() {
  if (G?.phase === 'playing' && MINIGAMES[G.game].kind === 'skill') finishSkill(false);
  cancelAnimationFrame(G?.raf);
  G = null;
  modal.hidden = true;
  renderPlanetUi();
}

const HELP = {
  dice: 'Du und die Bank würfeln mit zwei Würfeln. Höhere Augensumme gewinnt, Gleichstand gewinnt die Bank.',
  highlow: 'Ist die nächste Karte höher oder tiefer? Gleich verliert.',
  slots: 'Drei gleiche Symbole gewinnen.',
  roulette: 'Setze auf Rot oder Schwarz. Die grüne Null gewinnt immer die Bank.',
  horses: 'Wette auf ein Pferd. Gewinnt es, verdoppelt sich dein Einsatz.',
  stoplight: 'Stoppe den Lichtpunkt in der grünen Mitte (Leertaste oder Klick).',
  shells: 'Merk dir, unter welchem Hütchen die Kugel liegt, und folge ihm.',
  cans: 'Triff in der Schwerelosigkeit drei Dosen. Wirf mit einem Klick, der Ball braucht einen Moment.',
  ore: 'Finde das Erz im Sand. Jeder Hammerschlag verrät, ob du heiß, warm oder kalt liegst.',
};

function draw() {
  if (!G) return;
  const name = MINIGAMES[G.game].name;
  let controls = '';
  if (G.phase === 'ready') {
    if (G.game === 'highlow') controls = `<button class="primary" data-mg="guess" data-v="higher" ${G.choice.first >= 14 ? 'disabled' : ''}>Höher</button><button class="primary" data-mg="guess" data-v="lower" ${G.choice.first <= 2 ? 'disabled' : ''}>Tiefer</button>`;
    else if (G.game === 'roulette') controls = `<button data-mg="color" data-v="red" class="${G.choice.color === 'red' ? 'active' : ''}">🔴 Rot</button><button data-mg="color" data-v="black" class="${G.choice.color === 'black' ? 'active' : ''}">⚫ Schwarz</button><button class="primary" data-mg="play">Drehen</button>`;
    else if (G.game === 'horses') controls = [0, 1, 2, 3, 4].map((h) => `<button data-mg="horse" data-v="${h}" class="${G.choice.horse === h ? 'active' : ''}">${HORSES[h].name}</button>`).join('') + `<button class="primary" data-mg="play">Wetten</button>`;
    else controls = `<button class="primary" data-mg="play">${MINIGAMES[G.game].kind === 'skill' ? 'Start' : 'Spielen'}</button>`;
  } else if (G.phase === 'done') {
    controls = `<span class="${G.win ? 'pos' : 'neg'}"><b>${G.win ? `Gewonnen: +${fmt(G.cr)} Cr` : `Verloren: −${fmt(G.cr)} Cr`}</b></span>
      <button data-mg="again" ${left() <= 0 || state.credits < G.cr ? 'disabled' : ''}>Nochmal</button>`;
  }
  setHtml(card, `<div class="modal-head"><h2>${esc(name)}</h2><span class="muted">${esc(ENTERTAINMENT[G.building]?.name || '')} · Einsatz ${fmt(G.cr)} Cr${dogOn() ? ' · 🐕 Hund hilft' : ''}</span><span style="flex:1"></span><button data-mg="close">✕</button></div>
    <div class="muted small-note">${HELP[G.game]}</div>
    <canvas id="mgCanvas" width="520" height="300"></canvas>
    <div class="btnrow mg-controls">${controls}</div>
    <div class="muted small-note">Noch ${left()} von ${MG.LIMIT} Spielen in dieser Stunde.</div>`);
  paint();
}

card.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-mg]');
  if (!b || b.disabled || !G) return;
  const d = b.dataset;
  switch (d.mg) {
    case 'close': closeGame(); return;
    case 'again': openGame(G.game, G.stake, G.building); return;
    case 'color': G.choice.color = d.v; draw(); return;
    case 'horse': G.choice.horse = Number(d.v); draw(); return;
    case 'guess': G.choice.guess = d.v; play(); return;
    case 'play': play(); return;
  }
});
modal.addEventListener('mousedown', (ev) => { if (ev.target === modal) closeGame(); });

function play() {
  G.phase = 'wait';
  const args = { target: state.landed, building: G.building, game: G.game, stake: G.stake };
  if (MINIGAMES[G.game].kind === 'luck') cmd('mgPlay', { ...args, choice: G.choice });
  else cmd('mgStart', args);
  draw();
}
/** Fehler vom Server (z. B. Limit): Spiel zurücksetzen */
socket.on('errorMsg', () => { if (G?.phase === 'wait') { G.phase = 'ready'; draw(); } });

socket.on('mg', (d) => {
  if (d.game === 'beggar') { compliment = d.compliment; sfx('sell'); renderPlanetUi(); return; }
  if (d.game === 'dog' || d.game === 'tip') { renderPlanetUi(); return; }
  if (!G || d.game !== G.game) return;
  if (d.start) { startSkill(d); return; }
  if (d.done) { G.phase = 'done'; G.win = d.win; sfx(d.win ? 'questDone' : 'error'); draw(); return; }
  // Glücksspiel: Ergebnis animieren
  G.result = d;
  G.phase = 'anim';
  G.t0 = performance.now();
  animate();
});

const ANIM_MS = { dice: 1800, highlow: 1400, slots: 2600, roulette: 3200, horses: 7000 };
function animate() {
  if (!G) return;
  const p = (performance.now() - G.t0) / ANIM_MS[G.game];
  paint(Math.min(1, p));
  if (p < 1) { G.raf = requestAnimationFrame(animate); return; }
  G.phase = 'done';
  G.win = G.result.win;
  sfx(G.win ? 'questDone' : 'error');
  draw();
}

// ---------- Zeichnen ----------
const HORSES = [{ name: 'Komet', color: '#ef5350' }, { name: 'Nebel', color: '#ab47bc' }, { name: 'Quasar', color: '#42a5f5' }, { name: 'Pulsar', color: '#66bb6a' }, { name: 'Nova', color: '#ffa726' }];
const ctxOf = () => document.getElementById('mgCanvas')?.getContext('2d');

function paint(p = 0) {
  const c = ctxOf();
  if (!c || !G) return;
  c.fillStyle = '#0b1328';
  c.fillRect(0, 0, 520, 300);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const r = G.result?.outcome;
  switch (G.game) {
    case 'dice': {
      const roll = () => 1 + Math.floor(Math.random() * 6);
      const you = G.phase === 'anim' && p < 1 ? [roll(), roll()] : r?.you || [1, 1];
      const bank = G.phase === 'anim' && p < 1 ? [roll(), roll()] : r?.bank || [1, 1];
      label(c, 'Du', 130, 60); label(c, 'Bank', 390, 60);
      die(c, 90, 150, you[0]); die(c, 170, 150, you[1]); die(c, 350, 150, bank[0]); die(c, 430, 150, bank[1]);
      if (r && (G.phase === 'done' || p >= 1)) { label(c, you[0] + you[1], 130, 240, 28); label(c, bank[0] + bank[1], 390, 240, 28); }
      break;
    }
    case 'highlow': {
      playingCard(c, 170, 150, G.choice.first);
      if (r && G.phase !== 'wait') { if (p > 0.5 || G.phase === 'done') playingCard(c, 350, 150, r.next); else back(c, 350, 150, p); }
      else back(c, 350, 150, 0);
      break;
    }
    case 'slots': {
      const sym = ['🚀', '🪐', '⭐', '💎', '☄️', '👾'];
      for (let i = 0; i < 3; i++) {
        c.fillStyle = '#1a2340'; c.fillRect(110 + i * 110, 90, 90, 120);
        const stop = 0.45 + i * 0.25;
        const s = r && (p >= stop || G.phase === 'done') ? r.reels[i] : sym[Math.floor((performance.now() / 70 + i * 2) % sym.length)];
        c.font = '54px "Segoe UI Emoji", sans-serif'; c.fillText(G.phase === 'ready' ? '❔' : s, 155 + i * 110, 152);
      }
      break;
    }
    case 'roulette': {
      const n = r?.number ?? 0;
      const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
      const col = (x) => (x === 0 ? '#2e7d32' : RED.includes(x) ? '#c62828' : '#212121');
      const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
      const target = -ORDER.indexOf(n) * (TAU / 37);
      const ease = 1 - (1 - p) ** 3;
      const ang = G.phase === 'ready' || G.phase === 'wait' ? performance.now() / 2000 : target + (1 - ease) * TAU * 4;
      for (let i = 0; i < 37; i++) {
        const a0 = ang + i * TAU / 37 - Math.PI / 2 - TAU / 74;
        c.fillStyle = col(ORDER[i]);
        c.beginPath(); c.moveTo(260, 150); c.arc(260, 150, 120, a0, a0 + TAU / 37); c.fill();
        c.save(); c.translate(260, 150); c.rotate(a0 + TAU / 74 + Math.PI / 2); c.fillStyle = '#fff'; c.font = '10px sans-serif'; c.fillText(ORDER[i], 0, -105); c.restore();
      }
      c.fillStyle = '#ffd54f'; c.beginPath(); c.moveTo(260, 22); c.lineTo(252, 8); c.lineTo(268, 8); c.fill();
      c.fillStyle = '#0b1328'; c.beginPath(); c.arc(260, 150, 60, 0, TAU); c.fill();
      if (r && (G.phase === 'done' || p >= 1)) label(c, n, 260, 150, 36, col(n) === '#212121' ? '#ddd' : col(n));
      else label(c, G.choice.color === 'red' ? 'Rot' : 'Schwarz', 260, 150, 18);
      break;
    }
    case 'horses': {
      // Rennen: Positionen aus dem Seed, der Sieger kommt zuerst ins Ziel
      const rr = seeded(r?.seed || 1);
      const speeds = HORSES.map(() => 0.85 + rr() * 0.1);
      if (r) speeds[r.winner] = 1;
      for (let i = 0; i < 5; i++) {
        const y = 40 + i * 52;
        c.fillStyle = i % 2 ? '#3e2723' : '#4e342e'; c.fillRect(20, y - 20, 480, 40);
        const wob = (k) => 0.04 * Math.sin(k * 9 + i * 2) * (1 - k);
        const k = G.phase === 'anim' ? Math.min(1, p * speeds[i] + wob(p)) : G.phase === 'done' && r ? speeds[i] : 0;
        const x = 40 + k * 430;
        c.fillStyle = HORSES[i].color; c.fillRect(x - 16, y - 8, 30, 14); c.beginPath(); c.arc(x + 16, y - 10, 7, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.font = '11px sans-serif'; c.textAlign = 'left'; c.fillText(HORSES[i].name + (G.choice.horse === i ? ' ★' : ''), 26, y - 12); c.textAlign = 'center';
      }
      c.fillStyle = '#fff'; c.fillRect(472, 18, 3, 264);
      break;
    }
    default: if (G.skill) G.skill.paint(c); else label(c, G.phase === 'wait' ? '…' : 'Bereit?', 260, 150, 24);
  }
  if (G.phase === 'wait') label(c, '…', 260, 280, 18);
}
function label(c, t, x, y, size = 16, color = '#e3ecff') { c.font = `700 ${size}px "Segoe UI", sans-serif`; c.fillStyle = color; c.fillText(String(t), x, y); }
function die(c, x, y, n) {
  c.fillStyle = '#fafafa'; c.fillRect(x - 32, y - 32, 64, 64);
  const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  c.fillStyle = '#212121';
  for (const [dx, dy] of P[n]) { c.beginPath(); c.arc(x + dx * 17, y + dy * 17, 6, 0, TAU); c.fill(); }
}
const CARD = { 11: 'B', 12: 'D', 13: 'K', 14: 'A' };
function playingCard(c, x, y, v) {
  c.fillStyle = '#fafafa'; c.fillRect(x - 50, y - 75, 100, 150);
  label(c, CARD[v] || v, x, y, 44, '#c62828');
  label(c, '♦', x, y + 50, 22, '#c62828');
}
function back(c, x, y, p) {
  const w = 100 * Math.abs(Math.cos(p * Math.PI));
  c.fillStyle = '#1565c0'; c.fillRect(x - w / 2, y - 75, w, 150);
  c.strokeStyle = '#90caf9'; c.strokeRect(x - w / 2 + 6, y - 69, Math.max(0, w - 12), 138);
}

// ---------- Geschicklichkeitsspiele ----------
function startSkill(d) {
  G.id = d.id;
  G.phase = 'playing';
  const rng = seeded(d.seed);
  const dog = d.dog;
  G.skill = SKILL[G.game](rng, dog);
  draw();
  const loop = () => {
    if (!G || G.phase !== 'playing') return;
    G.skill.update?.(performance.now());
    paint();
    G.raf = requestAnimationFrame(loop);
  };
  G.raf = requestAnimationFrame(loop);
}
function finishSkill(success) {
  if (!G || G.phase !== 'playing') return;
  G.phase = 'wait';
  cancelAnimationFrame(G.raf);
  cmd('mgFinish', { id: G.id, success });
  paint();
}
const canvasPos = (ev) => { const cv = document.getElementById('mgCanvas'); const rc = cv.getBoundingClientRect(); return [(ev.clientX - rc.left) * (520 / rc.width), (ev.clientY - rc.top) * (300 / rc.height)]; };
card.addEventListener('mousedown', (ev) => { if (ev.target.id === 'mgCanvas' && G?.phase === 'playing') G.skill.click?.(...canvasPos(ev)); });
addEventListener('keydown', (ev) => { if (G?.phase === 'playing' && ev.key === ' ') { ev.preventDefault(); G.skill.click?.(260, 150); } });

/**
 * Schwierigkeit auf ca. 60 % Erfolg kalibriert (Annahme, im Spiel zu prüfen). Der Hund macht die Zielzone breiter,
 * das Tempo langsamer und gibt einen Versuch mehr.
 */
const SKILL = {
  stoplight(rng, dog) {
    const zone = dog ? 64 : 46, speed = (dog ? 380 : 500) * (0.9 + rng() * 0.2);
    let tries = dog ? 2 : 1, x = 40, dir = 1, msg = '', last = performance.now();
    return {
      update(now) { const dt = (now - last) / 1000; last = now; x += dir * speed * dt; if (x > 480) { x = 480; dir = -1; } if (x < 40) { x = 40; dir = 1; } },
      paint(c) {
        c.fillStyle = '#263238'; c.fillRect(40, 140, 440, 20);
        c.fillStyle = '#2e7d32'; c.fillRect(260 - zone / 2, 136, zone, 28);
        c.fillStyle = '#fff59d'; c.shadowColor = '#fff59d'; c.shadowBlur = 16; c.beginPath(); c.arc(x, 150, 10, 0, TAU); c.fill(); c.shadowBlur = 0;
        label(c, `Versuche: ${tries}`, 260, 230, 14); if (msg) label(c, msg, 260, 90, 18, '#ffb74d');
      },
      click() {
        if (Math.abs(x - 260) <= zone / 2) return finishSkill(true);
        tries--;
        msg = 'Daneben!';
        if (tries <= 0) finishSkill(false);
      },
    };
  },
  shells(rng, dog) {
    const swaps = dog ? 6 : 9, step = dog ? 520 : 380;
    const pos = [0, 1, 2]; // Hütchen -> Platz
    const ball = Math.floor(rng() * 3);
    const seq = Array.from({ length: swaps }, () => { const a = Math.floor(rng() * 3); let b = Math.floor(rng() * 2); if (b >= a) b++; return [a, b]; });
    const t0 = performance.now() + 1400;
    let tries = dog ? 2 : 1, shown = -1, msg = '', ended = false;
    const X = (p) => 130 + p * 130;
    const state2 = () => {
      const k = (performance.now() - t0) / step;
      const n = Math.max(0, Math.min(swaps, Math.floor(k)));
      const P = [0, 1, 2];
      for (let i = 0; i < n; i++) { const [a, b] = seq[i]; const ia = P.indexOf(a), ib = P.indexOf(b); [P[ia], P[ib]] = [P[ib], P[ia]]; }
      return { P, n, frac: k - Math.floor(k), k };
    };
    return {
      paint(c) {
        const { P, n, frac, k } = state2();
        for (let cup = 0; cup < 3; cup++) {
          let x = X(P.indexOf(cup)), y = 170;
          if (k > 0 && n < swaps) {
            const [a, b] = seq[n];
            const ia = P.indexOf(a), ib = P.indexOf(b);
            if (cup === P[ia] || cup === P[ib]) {
              const from = X(P.indexOf(cup)), to = cup === P[ia] ? X(ib) : X(ia);
              x = from + (to - from) * frac; y = 170 + (cup === P[ia] ? -1 : 1) * Math.sin(frac * Math.PI) * 30;
            }
          }
          const lifted = k < 0 || shown === cup || ended;
          if (cup === ball && lifted) { c.fillStyle = '#ffeb3b'; c.beginPath(); c.arc(x, 200, 10, 0, TAU); c.fill(); }
          c.fillStyle = '#c62828';
          c.beginPath(); c.moveTo(x - 36, y + 30 - (lifted ? 40 : 0)); c.lineTo(x - 22, y - 30 - (lifted ? 40 : 0)); c.lineTo(x + 22, y - 30 - (lifted ? 40 : 0)); c.lineTo(x + 36, y + 30 - (lifted ? 40 : 0)); c.fill();
        }
        label(c, k < 0 ? 'Hier ist die Kugel …' : n < swaps ? '' : `Wo ist die Kugel? Versuche: ${tries}`, 260, 50, 16); if (msg) label(c, msg, 260, 270, 16, '#ffb74d');
      },
      click(mx) {
        const { P, n } = state2();
        if (n < swaps || ended) return;
        const place = Math.round((mx - 130) / 130);
        if (place < 0 || place > 2) return;
        const cup = P[place];
        shown = cup;
        if (cup === ball) { ended = true; return finishSkill(true); }
        tries--;
        msg = 'Leer!';
        if (tries <= 0) { ended = true; finishSkill(false); }
      },
    };
  },
  cans(rng, dog) {
    const R = dog ? 22 : 17, v = dog ? 0.75 : 1;
    const cans = Array.from({ length: 4 }, () => ({ x: 60 + rng() * 400, y: 50 + rng() * 200, vx: (rng() < 0.5 ? -1 : 1) * (70 + rng() * 50) * v, vy: (rng() < 0.5 ? -1 : 1) * (50 + rng() * 40) * v, hit: false, rot: rng() * TAU }));
    let throws = dog ? 5 : 4, need = 3, balls = [], last = performance.now(), msg = '';
    return {
      update(now) {
        const dt = (now - last) / 1000; last = now;
        for (const k of cans) {
          if (k.hit) { k.vy += 300 * dt; }
          k.x += k.vx * dt; k.y += k.vy * dt; k.rot += dt;
          if (!k.hit) { if (k.x < 30 || k.x > 490) k.vx *= -1; if (k.y < 30 || k.y > 250) k.vy *= -1; }
        }
        for (const b of balls) {
          if (b.done || now < b.at) continue;
          b.done = true;
          const k = cans.find((x) => !x.hit && Math.hypot(x.x - b.x, x.y - b.y) <= R + 6);
          if (k) { k.hit = true; k.vx *= 0.3; need--; msg = 'Treffer!'; } else msg = 'Daneben';
          if (need <= 0) return finishSkill(true);
          if (throws <= 0 && balls.every((x) => x.done)) return finishSkill(false);
        }
      },
      paint(c) {
        for (const k of cans) {
          c.save(); c.translate(k.x, k.y); c.rotate(k.rot); c.fillStyle = k.hit ? '#616161' : '#90a4ae'; c.fillRect(-R * 0.6, -R, R * 1.2, R * 2); c.fillStyle = '#e53935'; c.fillRect(-R * 0.6, -R * 0.3, R * 1.2, R * 0.6); c.restore();
        }
        const now = performance.now();
        for (const b of balls) if (!b.done) { const q = 1 - (b.at - now) / 250; c.fillStyle = '#ffeb3b'; c.beginPath(); c.arc(260 + (b.x - 260) * q, 290 + (b.y - 290) * q, 6, 0, TAU); c.fill(); }
        label(c, `Würfe: ${throws} · noch ${need} Dosen`, 260, 285, 13); if (msg) label(c, msg, 260, 18, 14, '#ffb74d');
      },
      click(mx, my) {
        if (throws <= 0) return;
        throws--;
        balls.push({ x: mx, y: my, at: performance.now() + 250 });
      },
    };
  },
  ore(rng, dog) {
    const N = 6, ore = [Math.floor(rng() * N), Math.floor(rng() * N)];
    let hits = dog ? 5 : 4;
    const dug = new Map();
    const S = 40, ox = 260 - (N * S) / 2, oy = 20;
    return {
      paint(c) {
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
          const k = dug.get(i + ',' + j);
          c.fillStyle = k ? (k === 'ore' ? '#ffb74d' : '#6d4c41') : (i + j) % 2 ? '#d7b98a' : '#cfae7a';
          c.fillRect(ox + i * S, oy + j * S, S - 2, S - 2);
          if (k) label(c, { ore: '⛏', hot: '🔥', warm: '♨', cold: '❄' }[k], ox + i * S + S / 2, oy + j * S + S / 2, 16, '#fff');
        }
        label(c, `Hammerschläge: ${hits} · 🔥 heiß, ♨ warm, ❄ kalt`, 260, 280, 13);
      },
      click(mx, my) {
        const i = Math.floor((mx - ox) / S), j = Math.floor((my - oy) / S);
        if (i < 0 || j < 0 || i >= N || j >= N || dug.has(i + ',' + j) || hits <= 0) return;
        hits--;
        const d = Math.max(Math.abs(i - ore[0]), Math.abs(j - ore[1]));
        dug.set(i + ',' + j, d === 0 ? 'ore' : d === 1 ? 'hot' : d === 2 ? 'warm' : 'cold');
        if (d === 0) return finishSkill(true);
        if (hits <= 0) { dug.set(ore.join(','), 'ore'); finishSkill(false); }
      },
    };
  },
};

// ---------- Hund im HUD ----------
export function renderDogBuff() {
  const el = $('dogBuff');
  const rest = Math.max(0, (state.dogUntil || 0) - state.time);
  el.hidden = rest <= 0;
  if (rest > 0) el.textContent = `🐕 ${Math.ceil(rest / 60)} min`;
}
export const mgOpen = () => !!G;
export { closeGame };
