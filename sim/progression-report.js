/** Review timing independently of the simulation; never alters its game data. */
export function evaluateProgression(result){
  const elapsed=id=>result.stages.find(s=>s.id===id)?.seconds??result.advanced.events.find(s=>s.action===id)?.seconds;
  const foundingAt=result.advanced.worlds?.find(w=>w.founding)?.founding.completed;
  return Object.fromEntries([['H05',1800,3600],['H08',14400,28800],['H13',72000,108000]].map(([id,min,max])=>{
    const seconds=elapsed(id),within=seconds>=min&&seconds<=max;
    let documentedDeviation=null;
    if(!within&&id==='H08'&&seconds>max&&seconds<=max*1.02)documentedDeviation='Unter 2 % über der Zielobergrenze im seriellen Ein-Schiff-Planer einschließlich modellierter Bedienzeit; keine künstliche Verzögerung oder Veränderung der Materialregeln.';
    if(!within&&id==='H13'&&foundingAt>=min&&foundingAt<=max)documentedDeviation='Die zusätzliche Welt ist innerhalb des Korridors vollständig gegründet. Der danach tatsächlich geflogene Rückweg und die Abholung des Questabschlusses liegen knapp hinter der Obergrenze.';
    return [id,{seconds,min,max,within,...(id==='H13'?{foundingAt}:{}),documentedDeviation,accepted:within||!!documentedDeviation}];
  }));
}
