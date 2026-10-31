import {blueprint,maxHull,WEAPONS,ARMOR} from '/shared/combat.js';
import {shipComparison} from '/shared/ship-comparison.js';
import {esc,fmt} from '../state.js';
export function shipRatings(type){const r=shipComparison(type).ratings;return '<p class="ship-ratings">'+Object.entries({speed:'Tempo',defense:'Verteidigung',cargo:'Frachtraum',attack:'Angriff'}).map(([k,label])=>`<span title="Flottenweiter Vergleich, 1 bis 5">${label}: <b>${r[k]}/5</b></span>`).join(' · ')+'</p>';}
export function shipCombatInfo(type){
 const bp=blueprint(type),c=shipComparison(type),sides=['Bug','Heck','Backbord','Steuerbord'],shieldNames={bow:'Bug',stern:'Heck',port:'Backbord',starboard:'Steuerbord',omni:'Rundumschild'};
 const weapons=new Map();for(const m of bp.weapons)weapons.set(m.w,(weapons.get(m.w)||0)+1);
 return `<div class="small-note"><p>Lebenspunkte: ${fmt(maxHull(type))}${bp.squad?` (${bp.squad.n} Fluggeräte × ${bp.squad.hull})`:''} · Schild: ${fmt(c.shield)} (${bp.shields.map(s=>shieldNames[s.k]+': '+s.max).join(' / ')||'keine Sektoren'})</p><p>Panzerung: ${bp.armor.map((a,i)=>`${sides[i]} ${Math.round((ARMOR[a]||0)*100)} %`).join(' · ')}</p><p>Bewaffnung: ${[...weapons].map(([id,n])=>{const w=WEAPONS[id];return `${n} × ${esc(w.name)}: ${w.dmg} Schaden × ${w.rof}/s${bp.squad?' je Fluggerät':''} (${esc(w.role||w.type)})`;}).join('; ')||'unbewaffnet'}</p><p>Theoretischer Gesamtschaden: ${fmt(c.attack)}/s bei vollständiger Bewaffnung, voller Staffel und allen Feuerwinkeln; Treffer, Munition und Schildwirkung verändern das Ergebnis.</p></div>`;
}
