import {GOODS} from '/shared/config.js';
import {colonyCost} from '/shared/colonies.js';
import {state,myShips,esc,fmt} from '../state.js';
import {cmd} from '../net.js';
import {confirmAction} from './dom.js';

export function colonyPanel(e){
  const c=e.colony,cost=c?.cost||colonyCost({homeQuest:state.homeQuest});
  if(!cost)return '<p>Die Kosten überschreiten den sicheren Zahlenbereich.</p>';
  if(c?.owner&&c.owner!==state.me.id)return '<p>Dieser Ruinenstandort ist für die Expedition eines anderen Kapitäns reserviert.</p>';
  const surveyed=state.homeQuest?.surveyedSites?.[e.id],ships=myShips().filter(s=>s.dockedAt===e.id),manual=ships.find(s=>s.id===state.manualShip);
  let html=`<h3>Unbewohnter Ruinenstandort</h3><p>Vor Gründung keine Waren, Bewohner oder arbeitende Anlagen. Persönlich erkunden, wirkliche Materialien anliefern und 20 eigene Auswanderer mit Kabine transportieren.</p><p>${cost.first?'H13-Expedition':'Reguläre Gründung'}: ${fmt(cost.credits)} Cr · ${Object.entries(cost.goods).map(([g,n])=>`${n} ${GOODS[g].name}`).join(', ')} · 300 s Aufbau. Ein Expeditionsspatz wird dauerhaft abgegeben; ein weiteres eigenes Schiff muss hier zur Weiterreise bereitstehen.</p>`;
  if(c?.remaining!==undefined)return html+`<p>Aufbau: ${Math.ceil(Math.max(0,c.until-state.time))} s · 20 Auswanderer und das Expeditionsschiff sind gebunden.</p>`;
  html+=`<p>Erkundung: ${surveyed?'aufgezeichnet':'offen'}</p><button class="small" data-act="colonySurvey" data-ent="${e.id}" data-ship="${manual?.id||''}" ${manual?'':'disabled'}>Standort persönlich erkunden</button>`;
  if(surveyed){
    for(const [g,n] of Object.entries(cost.goods)){const have=c?.deliveries?.[g]||0;html+=`<p>${GOODS[g].name}: ${have} / ${n} gebunden</p>${have<n?`<input aria-label="Gründungslieferung ${GOODS[g].name}" id="colony-${e.id}-${g}" type="number" min="1" max="${n-have}" value="${Math.min(10,n-have)}"><button class="small" data-act="colonyDeliver" data-ent="${e.id}" data-good="${g}">Teilmenge vom angedockten Schiff liefern</button>`:''}`;}
    html+=`<select id="colonyShip-${e.id}" aria-label="Dauerhaftes Expeditionsschiff">${ships.filter(s=>s.type==='spatz').map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><button class="primary" data-act="colonyFound" data-ent="${e.id}">Expedition gründen und Spatz dauerhaft abgeben</button>`;
  }
  return html;
}

export function warpPanel(e){
  const h=e.market?.homeworld;if(h?.owner!==state.me.id||!state.homeQuest?.completed.H16)return '';
  let html='<h3>Warpservice</h3><p>Alle angedockten Schiffe müssen starten. Keine Flottenschiffe werden versetzt. Nach Bestätigung pausiert der Standort fünf Minuten und sperrt alle Lager-, Bau- und Werkstattänderungen. Sperrfrist danach: 24 Stunden Serverlaufzeit.</p>';
  if(h.warp)return html+`<p>Vorbereitung: ${Math.ceil(h.warp.remaining)} s · ${fmt(h.warp.price.total)} Cr gebunden · Ziel ${esc(state.systems.get(h.warp.target.system)?.name||h.warp.target.system)}. Bestände gesperrt.</p>`;
  if((h.warpCooldownUntil||0)>state.time)return html+`<p>Sperrfrist: ${Math.ceil((h.warpCooldownUntil-state.time)/3600)} Serverstunden verbleibend.</p>`;
  const systems=[...state.systems.values()].filter(s=>!s.start&&!s.faction&&s.id!==e.system);
  html+=`<label>Zielsystem <select id="warpSystem-${e.id}">${systems.map(s=>`<option value="${s.id}">${esc(s.name)} · ${s.sector}</option>`).join('')}</select></label><button class="small" data-act="warpQuote" data-ent="${e.id}">Freie Zielposition und Preisvorschau berechnen</button>`;
  const q=h.warpQuote;
  if(q){const price=q.price;html+=`<div class="quest-offer"><b>Ziel: ${esc(state.systems.get(q.target.system)?.name||q.target.system)} (${Math.round(q.target.x)}, ${Math.round(q.target.y)})</b><p>Grundpreis ${fmt(price.base)} + Standortanteil ${price.siteCharge.toLocaleString('de-DE',{maximumFractionDigits:2})} (20 % von ${fmt(price.site)}) + Bestände ${fmt(price.cargo)} = <b>${fmt(price.total)} Cr</b>, auf volle Cr aufgerundet.</p><p>Mitgeführt: ${Object.entries(price.goods).map(([g,n])=>`${fmt(n)} ${GOODS[g].name}`).join(', ')||'keine Waren'} · ${Object.values(price.modules).reduce((a,b)=>a+b,0)} verpackte Module · ${price.hulls.length} gebundene/fertige Orbitalrümpfe. Eingelagerter Reliktantrieb bleibt derselben Welt zugeordnet.</p><p>Neue eigene Netzgebiete: ${q.coverage.map(a=>a.kind==='circle'?`Systemzone, Radius ${Math.round(a.radius)}`:`Hexgebiet ${a.q}, ${a.r}, ${a.rings} Ringe`).join('; ')}.</p><p>Betroffene Routen: ${q.affectedRoutes.map(r=>esc(r.name)).join(', ')||'keine'} · anfliegende Schiffe: ${q.affectedShips.length} · weitere Welten: ${q.otherWorlds.map(w=>esc(w.name)).join(', ')||'keine'}. Begonnene Abschnitte enden sicher; eigene Transportaufträge pausieren zur erneuten Freigabe.</p><button class="primary" data-act="warpStart" data-ent="${e.id}" data-quote="${q.id}">Transfer mit dieser Preisobergrenze bestätigen</button></div>`;}
  return html;
}
export function handleColonyAction(d){
  switch(d.act){
    case 'colonySurvey':cmd('colonySurvey',{target:d.ent,ship:d.ship});return true;
    case 'colonyDeliver':cmd('colonyDeliver',{target:d.ent,good:d.good,amount:Number(document.getElementById(`colony-${d.ent}-${d.good}`)?.value)});return true;
    case 'colonyFound':{const ship=document.getElementById(`colonyShip-${d.ent}`)?.value;confirmAction('20 eigene Auswanderer und dieser Spatz werden dauerhaft zur neuen Siedlung. Ein weiteres Schiff muss hier bleiben. Gründungskosten und alle gelieferten Materialien werden gebunden. Jetzt endgültig gründen?',()=>cmd('colonyFound',{target:d.ent,ship,confirmed:true}));return true;}
    case 'warpQuote':cmd('warpQuote',{target:d.ent,system:document.getElementById(`warpSystem-${d.ent}`)?.value});return true;
    case 'warpStart':confirmAction('Bestätigten Warptransfer starten? Fünf Minuten Standortpause mit gesperrtem Lager, danach 24 Stunden Sperrfrist. Alle angedockten Schiffe müssen vorher starten.',()=>cmd('warpStart',{target:d.ent,quote:Number(d.quote),confirmed:true}));return true;
    case 'relocationResume':cmd('relocationResume',{ship:d.ship});return true;
  }
  return false;
}
