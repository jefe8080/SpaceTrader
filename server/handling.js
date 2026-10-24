// Shared physical handling budget, persisted with the destination market.
// A ship occupies one service position for the current simulation second;
// the warehouse has a separate total throughput budget per server minute.
export function handlingAllowance(game,e,ship){
  if(game.profile!=='homeworld'||!e.market||e.kind!=='planet')return Infinity;
  const h=e.market.homeworld||e.market.economy;if(!h)return Infinity;
  let docks=h.docks||2,throughput=h.throughput||500;
  for(const b of h.structures||[])if(b.kind==='spaceport'&&h.allocations?.some(a=>a.id===b.id&&a.state==='active')){docks+=2;throughput+=500;}
  const minute=Math.floor(game.time/60),second=Math.floor(game.time);
  const state=e.market.handling||={minute,second,used:0,ships:[]};
  if(state.minute!==minute){state.minute=minute;state.used=0;}
  if(state.second!==second){state.second=second;state.ships=[];}
  if(!state.ships.includes(ship.id)&&state.ships.length>=docks)return 0;
  return Math.max(0,Math.floor(throughput-state.used));
}
export function recordHandling(game,e,ship,n){
  if(n<=0||handlingAllowance(game,e,ship)===Infinity)return;
  const state=e.market.handling;state.used+=n;if(!state.ships.includes(ship.id))state.ships.push(ship.id);
}
