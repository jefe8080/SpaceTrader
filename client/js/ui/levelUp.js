import {socket} from '../net.js';
import {levelUpBenefits} from '/shared/level-up.js';
import {esc,fmt} from '../state.js';
let dialog,range;
export function showLevelUp(event){
  let benefit=levelUpBenefits(event.before,event.level);if(!benefit)return;
  if(!dialog){
    dialog=document.createElement('dialog');dialog.className='level-up-dialog';dialog.setAttribute('aria-labelledby','levelUpTitle');
    dialog.addEventListener('click',e=>{if(e.target.closest('[data-level-close]'))dialog.close();});
    dialog.addEventListener('close',()=>{range=null;});document.body.append(dialog);
  }
  if(dialog.open&&range)benefit=levelUpBenefits(Math.min(range.before,event.before),Math.max(range.level,event.level));
  range=benefit;
  dialog.innerHTML=`<h2 id="levelUpTitle">Pilotenlevel ${benefit.level} erreicht</h2>${benefit.title?`<p>${esc(benefit.title)}</p>`:''}<p>+${benefit.additionalSlots} Nebenquestslot${benefit.additionalSlots===1?'':'s'}: Du kannst jetzt insgesamt ${benefit.slotLimit} Nebenquests gleichzeitig annehmen. Hauptquests belegen keinen dieser Slots.</p>${benefit.licenses.length?`<p>Diese Pilotenlizenzen kannst du jetzt separat am Hub kaufen:</p><ul>${benefit.licenses.map(l=>`<li>Lizenz ${l.level}: ${fmt(l.cost)} Cr · Schiffsklassen ${l.classes.join(', ')} · Schiffsausbau bis Stufe ${l.maxUpgrade} nach dem Lizenzkauf.</li>`).join('')}</ul><p>Der Levelaufstieg vergibt keine Lizenz automatisch.</p>`:'<p>Für dieses Level wird keine weitere Pilotenlizenz angeboten.</p>'}<button class="primary" data-level-close>Verstanden</button>`;
  if(!dialog.open)dialog.showModal();
}
socket.on('pilotLevelUp',showLevelUp);
