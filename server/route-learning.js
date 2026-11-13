export function recordHomeRouteDelivery(game,ship,target,good,amount,route){
  const player=game.players.get(ship.owner),q=player?.homeQuest;
  if(!q?.active?.H03||q.completed.H03||amount<=0||!['ice','grain'].includes(good)||target.id!==player.homeworld)return;
  if(!route||route.owner!==player.id||!ship.queue.some(c=>c.t==='route'&&c.route===route.id)||!route.stops.every(s=>game.world.entities.get(s.targetId)?.system===target.system))return;
  if(!route.stops.some(s=>s.targetId!==target.id&&s.actions.some(a=>a.op==='buy'&&a.good===good)))return;
  q.routeDelivery={home:target.id,route:route.id,ship:ship.id,good,amount,at:game.time};
}
