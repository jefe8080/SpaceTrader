export const COMBAT_PAGE_SIZE = 25;
export function combatHistoryPage(reports, query='', result='', page=0) {
  const needle=query.trim().toLocaleLowerCase('de');
  const filtered=reports.filter(r=>{
    if(result && r.result!==result)return false;
    if(!needle)return true;
    const fields=[...(r.enemies||[]),r.location?.sector,r.location?.sectorName,r.location?.planet?.name,r.location?.x,r.location?.y,
      ...(r.ships||[]).flatMap(s=>[s.name,s.typeName,s.type,s.ownerName,s.factionName]),
      ...(r.lost||[]),...(r.captured||[]),...(r.prisoners||[]),...(r.retreated||[])];
    return fields.some(v=>String(v||'').toLocaleLowerCase('de').includes(needle));
  });
  const pages=Math.max(1,Math.ceil(filtered.length/COMBAT_PAGE_SIZE));
  page=Math.min(Math.max(0,page),pages-1);
  return { reports:filtered.slice(page*COMBAT_PAGE_SIZE,(page+1)*COMBAT_PAGE_SIZE),page,pages,total:filtered.length };
}
