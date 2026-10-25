/** Pure filtering/sorting model. Null always means unavailable, never a zero quote. */
export const defaultTradeView = () => ({ search:'', type:'', system:'', sector:'', good:'', direction:'', price:'', quantity:'', favorites:false, pin:false, sort:'name', descending:false, ship:'' });
export function compareTradeRows(a,b,view) {
  if(view.pin && a.favorite!==b.favorite) return a.favorite?-1:1;
  const key=['buy','sell','quantity'].includes(view.sort)&&!view.good?'name':view.sort;
  const av=a[key],bv=b[key];
  if(av==null && bv!=null)return 1;
  if(bv==null && av!=null)return -1;
  const order=av==null?0:typeof av==='number'?av-bv:String(av).localeCompare(String(bv),'de',{numeric:true});
  return (view.descending?-order:order)||String(a.id).localeCompare(String(b.id),'de',{numeric:true});
}
export function filterTradeRows(rows,v) {
  return rows.filter(r=>(!v.search||r.name.toLocaleLowerCase('de').includes(v.search.toLocaleLowerCase('de')))
    &&(!v.type||r.kind===v.type)&&(!v.system||r.system===v.system)&&(!v.sector||r.sector===v.sector)
    &&(!v.favorites||r.favorite)&&(!v.good||r.hasGood)
    &&(!v.direction||r[v.direction]!=null)
    &&(v.price==='' || !v.good || !v.direction || (r[v.direction]!=null && (v.direction==='buy'?r.buy<=Number(v.price):r.sell>=Number(v.price))))
    &&(v.quantity==='' || !v.good || (r.quantity!=null&&r.quantity>=Number(v.quantity))))
    .sort((a,b)=>compareTradeRows(a,b,v));
}
/** Retain row positions and membership on network updates, including filter changes from prices. */
export function reconcileTradeRows(previous, next, explicit=false) {
  const ids=next.map(r=>r.id);
  if(explicit||previous===null)return {ids,pending:false};
  return {ids:previous,pending:previous.length!==ids.length||previous.some((id,i)=>id!==ids[i])};
}
