import {MODULES,GOODS} from '/shared/config.js';
import {MODULE_RECIPES} from '/shared/module-production.js';
import {state,esc,myShips} from '../state.js';
import {cmd} from '../net.js';

export function moduleStockPanel(entity,ship,attribute='act'){
  const own=entity.market.owner===state.me.id;
  let html='<h3>Physische Module</h3><p class="muted">Verpackt je 30 normale Frachteinheiten. Einbau verbraucht ein Exemplar, Ausbau erhält es ohne Rückerstattung.</p><table class="market"><tr><th>Modul</th><th>Lager / Fracht</th><th></th></tr>';
  for(const [id,spec] of Object.entries(MODULES)){
    const stored=entity.market.moduleInventory?.[id]||0,carried=ship?.moduleCargo?.[id]||0,installed=ship?.modules?.filter(m=>m===id).length||0;
    const button=(action,text,extra='',disabled=false)=>`<button class="small" data-${attribute}="${action}" data-module="${id}" data-ship="${ship?.id||''}" data-ent="${entity.id}" ${extra} ${disabled?'disabled':''}>${text}</button>`;
    html+=`<tr><td>${spec.name}${own?'':`<div class="muted">${spec.price} Cr Kauf / ${Math.round(spec.price*.8)} Cr Verkauf</div>`}</td><td>${stored} / ${carried}${installed?' · '+installed+' eingebaut':''}</td><td>`;
    if(ship){
      html+=button('moduleTransfer','Laden','data-dir="buy"',!stored)+button('moduleTransfer',own?'Einlagern':'Verkaufen','data-dir="sell"',!carried);
      if(carried)html+=button('moduleInstall','Fracht einbauen','data-source="cargo"');
      if(stored)html+=button('moduleInstall',own?'Lager einbauen':'Kaufen und einbauen','data-source="warehouse"');
      if(installed){html+=button('moduleRemove','In Fracht ausbauen','data-destination="cargo"');if(own)html+=button('moduleRemove','Ins Lager ausbauen','data-destination="warehouse"');}
    }
    html+='</td></tr>';
  }
  return html+'</table>';
}

export function handleModuleAction(data){
  const action=data.act||data.pp;
  if(action==='moduleTransfer')cmd(action,{ship:data.ship,target:data.ent,module:data.module,dir:data.dir,amount:1});
  else if(action==='moduleInstall')cmd(action,{ship:data.ship,module:data.module,source:data.source});
  else if(action==='moduleRemove')cmd(action,{ship:data.ship,module:data.module,destination:data.destination});
  else return false;
  return true;
}

export function moduleCraftPanel(entity){
  const home=entity.market.homeworld,known=new Set([...(state.moduleBlueprints||[]),...(home.moduleBlueprints||[])]);
  let html='<h3>Modulfertigung und Studium</h3><p class="muted">Ein Auftrag je freier geeigneter Anlage. Fehlende Energie oder Kräfte pausieren; gebundene Zutaten werden nicht nochmals abgebucht.</p>';
  for(const [id,recipe] of Object.entries(MODULE_RECIPES)){
    const exemplars=(entity.market.moduleInventory?.[id]||0)+myShips().filter(s=>s.dockedAt===entity.id).reduce((sum,s)=>sum+(s.moduleCargo?.[id]||0),0);
    html+=`<div class="quest-offer"><b>${MODULES[id].name}</b><p>${Object.entries(recipe.goods).map(([g,n])=>n+' '+GOODS[g].name).join(', ')} · ${recipe.seconds} s</p>
      <div class="muted">${recipe.facility==='moduleBench'?'Einfache Modulwerkbank':recipe.facility==='researchWorkshop'?'Forschungswerkstatt':'Forschungszentrum'} · Bauplan ${known.has(id)?'bekannt':'unbekannt'}</div>`;
    if(known.has(id))html+=`<button class="small" data-pp="homeModuleCraft" data-module="${id}">Ein Exemplar fertigen</button>`;
    else html+=`<button class="small" data-pp="homeModuleCraft" data-module="${id}" data-study="true" ${exemplars?'':'disabled'}>Exemplar studieren und verbrauchen · ${Math.min(120,recipe.seconds)} s</button>`;
    html+='</div>';
  }
  for(const project of home.projects?.filter(p=>['module','study'].includes(p.kind))||[])html+=`<p>${project.kind==='study'?'Studium':'Fertigung'} ${esc(MODULES[project.module].name)}: ${Math.ceil(project.remaining)} s ${project.paused?'· pausiert':''}</p>`;
  return html;
}
