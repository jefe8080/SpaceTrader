export function colonyCost(p){
  const first=!p.homeQuest.firstColony,k=first?0:p.homeQuest.regularColonies||0,factor=first?1:1.25**k;
  const credits=first?100000:Math.round(250000*1.6**k),goods=Object.fromEntries(Object.entries({plates:100,machinery:20,habitats:4,...(first?{}:{computers:10})}).map(([g,n])=>[g,Math.ceil(n*factor)]));
  if(!Number.isSafeInteger(credits)||Object.values(goods).some(n=>!Number.isSafeInteger(n)))return null;
  return {first,k,credits,goods,people:20,seconds:300};
}
