export function homeQuestConditions(id,q,h){
  if(!q||!h)return [];
  const facility=(key,label)=>({label,have:h.facilities?.[key]?.status==='ready'?1:0,need:1});
  const amount=(label,have,need)=>({label,have:Math.min(need,Math.floor(have||0)),need});
  switch(id){
    case 'H00':return [amount('Auf der Heimat landen',q.landed?1:0,1)];
    case 'H01':return [facility('dock','Landeplatz repariert')];
    case 'H02':return [facility('waterworks','Wasserwerk repariert'),facility('foodplant','Nahrungsanlage repariert'),amount('Wasser selbst produziert',h.produced?.water,20),amount('Nahrung selbst produziert',h.produced?.food,10)];
    case 'H03':return [amount('Leitstelle Stufe 1',h.controlLevel,1),facility('fueldepot','Treibstoffanlage repariert'),amount('Eis/Getreide automatisch ins Heimatlager geliefert',q.routeDelivery?1:0,1)];
    case 'H04':return [amount('Fund persönlich geborgen',q.salvage?.phase&&q.salvage.phase!=='available'?1:0,1),amount('Fund zur Werkstatt gebracht',q.salvage?.phase==='workshop'?1:0,1),facility('workshop','Werkstatt fertig')];
    case 'H05':return [amount('Versorgter Betrieb in Sekunden',h.suppliedSeconds,600)];
    case 'H06':return [facility('refinery','Raffinerie repariert'),facility('smelter','Schmelzwerk repariert'),amount('Barren selbst produziert',h.produced?.ingots,40)];
    default:return [];
  }
}
