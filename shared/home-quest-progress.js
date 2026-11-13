import {QUEST_DELIVERIES} from './advanced-homequests.js';
import {GOODS,RECIPES,REFINEMENT_RECIPES} from './goods.js';
export function homeQuestConditions(id,q,h){
  if(!q||!h)return [];
  const facility=(key,label)=>({label,have:h.facilities?.[key]?.status==='ready'?1:0,need:1});
  const amount=(label,have,need)=>({label,have:Math.min(need,Math.floor(have||0)),need});
  const has=kind=>h.structures?.some(b=>b.status==='ready'&&(b.kind===kind||b.upgrades?.includes(kind)));
  const deliveries=Object.entries(QUEST_DELIVERIES[id]||{}).map(([g,n])=>amount(GOODS[g].name+' geliefert',h.questDeliveries?.[id]?.[g],n));
  switch(id){
    case 'H00':return [amount('Auf der Heimat landen',q.landed?1:0,1)];
    case 'H01':return [facility('dock','Landeplatz repariert')];
    case 'H02':return [facility('waterworks','Wasserwerk repariert'),facility('foodplant','Nahrungsanlage repariert'),amount('Wasser selbst produziert',h.produced?.water,20),amount('Nahrung selbst produziert',h.produced?.food,10)];
    case 'H03':return [amount('Leitstelle Stufe 1',h.controlLevel,1),facility('fueldepot','Treibstoffanlage repariert'),amount('Eis/Getreide automatisch ins Heimatlager geliefert',q.routeDelivery?1:0,1)];
    case 'H04':return [amount('Fund persönlich geborgen',q.salvage?.phase&&q.salvage.phase!=='available'?1:0,1),amount('Fund zur Werkstatt gebracht',q.salvage?.phase==='workshop'?1:0,1),facility('workshop','Werkstatt fertig')];
    case 'H05':return [amount('Versorgter Betrieb in Sekunden',h.suppliedSeconds,600)];
    case 'H06':return [facility('refinery','Raffinerie repariert'),facility('smelter','Schmelzwerk repariert'),amount('Barren selbst produziert',h.produced?.ingots,40)];
    case 'H07':return [amount('Schule betriebsbereit',has('school')?1:0,1),amount('Schule in Betrieb',h.allocations?.some(a=>a.state==='active'&&h.structures?.some(b=>b.id===a.id&&b.kind==='school'))?1:0,1),amount('Fachkräfte selbst ausgebildet',h.trained?.skilled,10),amount('Platten selbst hergestellt',h.produced?.plates,40),amount('Kabel selbst hergestellt',h.produced?.wires,20)];
    case 'H08':return [...deliveries,amount('Kleiner Ring fertig',h.orbital?.small?1:0,1)];
    case 'H09':return [...deliveries,amount('Forschungswerkstatt fertig',has('researchWorkshop')?1:0,1),amount('Archiv persönlich besucht',q.visits?.[id]?1:0,1)];
    case 'H10':return [amount('Sonderveredelung und 10 eigene Produkte',REFINEMENT_RECIPES.some(r=>h.structures?.some(b=>b.status==='ready'&&b.recipe===r)&&Object.keys(RECIPES[r].out).every(g=>h.produced?.[g]>=10))?1:0,1)];
    case 'H11':return [amount('Einwohner',h.population,250),amount('Wohnraum für alle Einwohner',h.housing,h.population),amount('Volle Versorgung in Sekunden',h.fullSupplySeconds,1800)];
    case 'H12':return [...deliveries,amount('Forschungszentrum fertig',has('researchCenter')?1:0,1)];
    case 'H13':return [amount('Zweite Welt gegründet',q.firstColony?1:0,1)];
    case 'H14':case 'H17':return [...deliveries,amount('Archiv persönlich besucht',q.visits?.[id]?1:0,1),amount('Relikt vorhanden',q.relicPresent?1:0,1)];
    case 'H15':return [...deliveries,amount('Großer Ring fertig',h.orbital?.large?1:0,1)];
    case 'H16':return [...deliveries,amount('Eigene Welten mit Leitstelle',q.ownedControlCount,2)];
    default:return deliveries;
  }
}
