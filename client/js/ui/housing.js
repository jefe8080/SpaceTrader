import {housingLevel,housingUpgradeCost,homeStructureSpec} from '/shared/homeworld.js';
import {GOODS} from '/shared/config.js';
import {fmt,esc} from '../state.js';
export function housingPanel(e,b){
  const level=housingLevel(b),spec=homeStructureSpec(b),cost=housingUpgradeCost(level+1);
  return `<div class="housing-card"><img src="/assets/art/cities/housing-${level}.png" alt="Wohnhaus Stufe ${level}" style="width:120px;height:140px;object-fit:contain"><p>Wohnhaus ${esc(b.id)} · Stufe ${level} / 3 · ${spec.housing} Wohnplätze insgesamt · ${spec.power} Energie</p>${b.upgrading?'<p>Ausbau läuft; bisherige Kapazität bleibt nutzbar.</p>':cost&&b.status!=='building'?`<p>Nächste Stufe: ${fmt(cost.credits)} Cr · ${Object.entries(cost.goods).map(([g,n])=>`${n} ${GOODS[g].name}`).join(', ')} · ${cost.seconds} s · ${2**level} Energie insgesamt · zwei freie Bauarbeiter</p><button class="small" data-act="housingUpgrade" data-ent="${e.id}" data-id="${b.id}">Wohnhaus auf Stufe ${level+1} ausbauen</button>`:'<p>Keine weitere Ausbaustufe verfügbar.</p>'}</div>`;
}
