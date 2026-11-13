// Lautsprecher-Menü im HUD: Regler für Musik und Effekte, Stummschalter (gespeichert im localStorage)
import { prefs, setPref, sfx } from '../audio.js';
import { $ } from './dom.js';
import {motionMode,setMotionMode} from '../displayPrefs.js';

const btn = $('btnAudio');
const menu = $('audioMenu');

function render() {
  btn.textContent = prefs.mute ? '🔇' : prefs.music + prefs.sfx > 0 ? '🔊' : '🔈';
  menu.innerHTML = `<div class="menu-sep">Ton</div>
    <label class="audio-row"><span>Musik</span><input type="range" min="0" max="1" step="0.05" data-pref="music" value="${prefs.music}"></label>
    <label class="audio-row"><span>Effekte</span><input type="range" min="0" max="1" step="0.05" data-pref="sfx" value="${prefs.sfx}"></label>
    <label class="audio-row"><input type="checkbox" data-pref="mute" ${prefs.mute ? 'checked' : ''}> <span>Stumm</span></label>
    <label class="audio-row"><span>Angriffswarnungen</span><input type="checkbox" data-pref="warnings" ${prefs.warnings!==false?'checked':''}></label><label class="audio-row"><span>Bewegung</span><select id="motionPreference"><option value="system" ${motionMode()==='system'?'selected':''}>Systemeinstellung</option><option value="reduce" ${motionMode()==='reduce'?'selected':''}>Reduziert</option><option value="full" ${motionMode()==='full'?'selected':''}>Vollständig</option></select></label><p class="muted small-note">Musik und Effekte getrennt einstellbar. Angriffswarnungen bleiben zusätzlich sichtbar.</p>`;
}

btn.addEventListener('click', () => {
  menu.hidden = !menu.hidden;
  if (menu.hidden) return;
  render();
  const rc = btn.getBoundingClientRect();
  menu.style.left = Math.min(rc.left, innerWidth - menu.offsetWidth - 8) + 'px';
  menu.style.top = rc.bottom + 4 + 'px';
});
menu.addEventListener('input', (ev) => {
  if(ev.target.id==='motionPreference'){setMotionMode(ev.target.value);return;}
  const k = ev.target.dataset.pref;
  if (!k) return;
  setPref(k, ['mute','warnings'].includes(k) ? ev.target.checked : Number(ev.target.value));
  btn.textContent = prefs.mute ? '🔇' : '🔊';
  if (k === 'sfx') sfx('click');
});
addEventListener('mousedown', (ev) => { if (!menu.hidden && !menu.contains(ev.target) && ev.target !== btn) menu.hidden = true; });

// Klickgeräusch für alle Schaltflächen
addEventListener('click', (ev) => { if (ev.target.closest?.('button') && ev.target !== btn) sfx('click'); }, true);

render();
