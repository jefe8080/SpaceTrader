// Prozedurales Audio per WebAudio (PRD-2 Kapitel 7): Effekte und Ambient-Musik, ganz ohne Audiodateien.
// Die Musik ist ein Zufallsgenerator in Moll (Pads, Bass, Arpeggien) und wiederholt sich daher nicht.

const KEY = 'st_audio';
export const prefs = (() => {
  const d = { music: 0.35, sfx: 0.6, mute: false };
  try { return { ...d, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return d; }
})();
const savePrefs = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* Speicher nicht verfügbar */ } };

let ctx = null, master, musicBus, sfxBus, reverb;

/** AudioContext erst nach der ersten Interaktion (Autoplay-Sperre der Browser) */
function ensure() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  sfxBus = ctx.createGain();
  // Hall aus erzeugtem Rauschen (Impulsantwort mit exponentiellem Abklingen)
  reverb = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 3.5);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
  }
  reverb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.45;
  reverb.connect(wet).connect(master);
  musicBus.connect(master);
  musicBus.connect(reverb);
  sfxBus.connect(master);
  applyVolumes();
  return ctx;
}

function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(prefs.mute ? 0 : 1, t, 0.05);
  musicBus.gain.setTargetAtTime(prefs.music * 0.5, t, 0.3);
  sfxBus.gain.setTargetAtTime(prefs.sfx * 0.6, t, 0.05);
}

export function setPref(k, v) {
  prefs[k] = v;
  savePrefs();
  applyVolumes();
  if (k !== 'sfx') syncMusic();
}

// ---------------- Effekte ----------------
/** Ein Ton mit Hüllkurve: f Startfrequenz, f2 Zielfrequenz (Gleiten), dur Dauer, vol Lautstärke */
function tone(t, { f, f2 = f, dur = 0.12, vol = 0.3, type = 'sine', attack = 0.005, out = sfxBus, filter = 0 }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o.connect(g);
  if (filter) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = filter;
    node = node.connect(lp);
  }
  node.connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}
const seq = (t, notes, step, opts) => notes.forEach((f, i) => tone(t + i * step, { ...opts, f }));

const SFX = {
  click: (t) => tone(t, { f: 1500, f2: 1100, dur: 0.035, vol: 0.12, type: 'triangle' }),
  buy: (t) => seq(t, [988, 1319], 0.06, { dur: 0.12, vol: 0.18, type: 'square', filter: 3000 }),
  sell: (t) => seq(t, [1319, 1568, 2093], 0.055, { dur: 0.16, vol: 0.16, type: 'triangle' }),
  dock: (t) => { tone(t, { f: 180, f2: 70, dur: 0.25, vol: 0.4 }); tone(t + 0.08, { f: 784, dur: 0.6, vol: 0.12, type: 'sine', out: reverb }); },
  order: (t) => seq(t, [523, 784], 0.05, { dur: 0.08, vol: 0.14, type: 'triangle' }),
  questAccept: (t) => seq(t, [440, 554, 659], 0.09, { dur: 0.35, vol: 0.18, type: 'triangle' }),
  questDone: (t) => { seq(t, [523, 659, 784, 1047], 0.1, { dur: 0.5, vol: 0.2, type: 'triangle' }); tone(t + 0.4, { f: 1568, dur: 1.2, vol: 0.08, out: reverb }); },
  levelUp: (t) => {
    seq(t, [392, 494, 587, 784, 988, 1175, 1568], 0.07, { dur: 0.45, vol: 0.16, type: 'triangle' });
    tone(t + 0.5, { f: 2349, dur: 1.6, vol: 0.06, out: reverb });
  },
  rankUp: (t) => {
    for (const f of [262, 330, 392, 523]) tone(t, { f, dur: 1.4, vol: 0.12, type: 'sawtooth', attack: 0.08, filter: 1800 });
    seq(t + 0.3, [1047, 1319, 1568], 0.12, { dur: 0.8, vol: 0.1, out: reverb });
  },
  attackWarning: (t) => seq(t,[440,880,440,880],.16,{dur:.2,vol:.28,type:'sawtooth',filter:2200}),
  error: (t) => { tone(t, { f: 150, f2: 110, dur: 0.22, vol: 0.25, type: 'sawtooth', filter: 900 }); tone(t + 0.1, { f: 140, f2: 100, dur: 0.2, vol: 0.2, type: 'sawtooth', filter: 900 }); },
};
export const SFX_NAMES = Object.keys(SFX);

const lastPlayed = {};
/** Effekt abspielen; gleicher Effekt höchstens alle 80 ms */
export function sfx(name) {
  if (prefs.mute || !prefs.sfx || !SFX[name] || !ensure()) return;
  const now = performance.now();
  if (now - (lastPlayed[name] || 0) < 80) return;
  lastPlayed[name] = now;
  SFX[name](ctx.currentTime + 0.01);
}

// ---------------- Planeten-Klang (PRD-3 Kapitel 7) ----------------
/** Klangfarbe je Planetentyp: Wellenform, Tiefpass, Obertöne (Glas), Anschlag */
const TIMBRE = {
  ice: { type: 'sine', filter: 6000, glass: true, attack: 0.005 },
  volcanic: { type: 'sawtooth', filter: 600, attack: 0.02 },
  gasgiant: { type: 'sine', filter: 900, attack: 0.12 },
  ocean: { type: 'triangle', filter: 1500, attack: 0.06 },
  desert: { type: 'square', filter: 1200, attack: 0.01 },
  agrar: { type: 'triangle', filter: 2500, attack: 0.02 },
  urban: { type: 'square', filter: 2600, attack: 0.005 },
  resort: { type: 'sine', filter: 3000, attack: 0.04 },
  jungle: { type: 'triangle', filter: 1800, attack: 0.03 },
  mining: { type: 'sawtooth', filter: 1200, attack: 0.01 },
  colony: { type: 'square', filter: 1800, attack: 0.02 },
  industrial: { type: 'sawtooth', filter: 900, attack: 0.01 },
};
const PENTA = [0, 2, 4, 7, 9];
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let lastTone = { id: null, at: 0 };
/**
 * Jeder Planet klingt immer gleich (für alle Spieler): Seed aus den gerundeten Koordinaten, 2 bis 3 Töne aus einer
 * pentatonischen Skala über 2 Oktaven, Klangfarbe aus dem Planetentyp. Erneuter Klick binnen 1 s: kein Ton.
 */
export function planetTone(e) {
  const now = performance.now();
  if (lastTone.id === e.id && now - lastTone.at < 1000) { lastTone.at = now; return; }
  lastTone = { id: e.id, at: now };
  if (prefs.mute || !prefs.sfx || !ensure()) return;
  let h = 2166136261;
  for (const v of [Math.round(e.x / 100), Math.round(e.y / 100)]) h = Math.imul(h ^ (v | 0), 16777619);
  const r = seededRandom(h);
  const tb = TIMBRE[e.type] || TIMBRE.colony;
  const n = 2 + (r() < 0.5 ? 1 : 0);
  const vib = { rate: 3 + r() * 4, depth: r() < 0.5 ? 0 : 2 + r() * 6 };
  const wet = r() * 0.6;
  let idx = Math.floor(r() * 10); // Stufe in 2 Oktaven Pentatonik
  let t = ctx.currentTime + 0.02;
  for (let i = 0; i < n; i++) {
    const semi = PENTA[idx % 5] + 12 * Math.floor(idx / 5);
    const f = midi(60 + semi);
    const dur = 0.3 + r() * 0.4;
    planetNote(t, f, dur, tb, vib, wet);
    t += dur * (0.55 + r() * 0.3);
    idx = Math.max(0, Math.min(9, idx + [-3, -2, -1, 1, 2, 3][Math.floor(r() * 6)]));
  }
}
function planetNote(t, f, dur, tb, vib, wet) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + tb.attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = tb.filter;
  lp.connect(g);
  g.connect(sfxBus);
  if (wet > 0.05) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w).connect(reverb); }
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = vib.rate;
  lfoGain.gain.value = vib.depth;
  lfo.connect(lfoGain);
  for (const [mul, vol] of tb.glass ? [[1, 1], [2.76, 0.35], [5.4, 0.15]] : [[1, 1]]) {
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = tb.type;
    o.frequency.value = f * mul;
    lfoGain.connect(o.detune);
    og.gain.value = vol * (tb.type === 'square' || tb.type === 'sawtooth' ? 0.35 : 1);
    o.connect(og).connect(lp);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  lfo.start(t);
  lfo.stop(t + dur + 0.05);
}

// ---------------- Musik ----------------
// Moll-Tonleiter (natürlich) und Akkordstufen; Grundton wechselt gelegentlich
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DEGREES = [0, 3, 4, 5, 6, 2]; // i, iv, v, VI, VII, III
const NEXT = { 0: [3, 5, 6, 4], 3: [0, 4, 5, 6], 4: [0, 5, 3], 5: [3, 6, 0, 2], 6: [0, 2, 5], 2: [5, 3, 6] };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

const music = { on: false, timer: null, next: 0, root: 57, degree: 0, chordEnd: 0, arpStep: 0, pattern: [], chord: [], bars: 0 };

/** Akkordtöne (Halbtöne über dem Grundton) einer Stufe der Moll-Tonleiter */
function chordOf(deg) {
  const n = (i) => MINOR[(deg + i) % 7] + 12 * Math.floor((deg + i) / 7);
  return [n(0), n(2), n(4), n(6)];
}

function pad(t, notes, dur) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(400, t);
  lp.frequency.linearRampToValueAtTime(900 + Math.random() * 700, t + dur / 2);
  lp.frequency.linearRampToValueAtTime(450, t + dur);
  lp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.07, t + dur * 0.35);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.5);
  lp.connect(g).connect(musicBus);
  for (const n of notes) {
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midi(n);
      o.detune.value = det + (Math.random() - 0.5) * 4;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 1.6);
    }
  }
}

function bass(t, note, dur) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = midi(note);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.12, t + 1.2);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.8);
  o.connect(g).connect(musicBus);
  o.start(t);
  o.stop(t + dur + 1);
}

function pluck(t, note, vol) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = Math.random() < 0.7 ? 'triangle' : 'sine';
  o.frequency.value = midi(note);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  o.connect(g).connect(musicBus);
  o.start(t);
  o.stop(t + 1.5);
}

/** Neues Arpeggio-Muster: Akkordtöne in zufälliger Folge mit Pausen */
function newPattern() {
  const len = pick([6, 8, 8, 12]);
  return Array.from({ length: len }, () => (Math.random() < 0.28 ? null : Math.floor(Math.random() * 6)));
}

/** Planung mit Vorlauf: alles bis 1,5 s in die Zukunft wird eingetaktet */
function schedule() {
  const ahead = ctx.currentTime + 1.5;
  const step = 0.3;
  while (music.next < ahead) {
    const t = music.next;
    if (t >= music.chordEnd) {
      // neuer Akkord: 8 bis 14 s, gelegentlich neuer Grundton und neues Muster
      music.degree = pick(NEXT[music.degree]);
      if (++music.bars % 12 === 0) music.root = 52 + Math.floor(Math.random() * 10);
      const dur = 8 + Math.random() * 6;
      music.chord = chordOf(music.degree).map((n) => n + music.root);
      pad(t, music.chord.slice(0, 3 + (Math.random() < 0.5 ? 1 : 0)), dur);
      bass(t, music.chord[0] - 24, dur);
      if (Math.random() < 0.6 || !music.pattern.length) music.pattern = newPattern();
      music.arp = Math.random() < 0.75; // manche Akkorde ohne Arpeggio
      music.chordEnd = t + dur;
    }
    if (music.arp) {
      const k = music.pattern[music.arpStep % music.pattern.length];
      if (k !== null && k !== undefined) {
        const tones = [...music.chord, ...music.chord.map((n) => n + 12)];
        pluck(t, tones[k % tones.length] + 12, 0.035 + Math.random() * 0.03);
      }
      music.arpStep++;
    }
    music.next += step;
  }
}

function syncMusic() {
  const want = !prefs.mute && prefs.music > 0 && !!ctx;
  if (want && !music.on) {
    music.on = true;
    music.next = ctx.currentTime + 0.2;
    music.chordEnd = 0;
    music.timer = setInterval(schedule, 250);
  } else if (!want && music.on) {
    music.on = false;
    clearInterval(music.timer);
  }
}

// Erste Interaktion schaltet Audio frei und startet die Musik
const unlock = () => {
  if (!ensure()) return;
  syncMusic();
  removeEventListener('pointerdown', unlock, true);
  removeEventListener('keydown', unlock, true);
};
addEventListener('pointerdown', unlock, true);
addEventListener('keydown', unlock, true);
