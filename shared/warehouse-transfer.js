import {freeFor} from './ships.js';
import {availableHomeStock,homeStorageFree} from './homeworld.js';
/** Same limits as ordinary transfers; protection remains part of the shared stock. */
export function warehouseTransfer(market,ship,good,direction) {
  if(!ship)return {amount:0,reason:'Kein eigenes Schiff angedockt'};
  const available=direction==='buy'?(market.homeworld?availableHomeStock(market,good):market.goods[good]?.stock||0):ship.cargo?.[good]||0;
  const space=direction==='buy'?freeFor(ship,good):homeStorageFree(market,good);
  const amount=Math.max(0,Math.floor(Math.min(available,space)));
  return {amount,reason:amount?'':available<1?(direction==='buy'?'Kein unreservierter Bestand':'Keine passende Ware an Bord'):(direction==='buy'?'Kein passender Frachtraum frei':'Lagerkapazität oder Warenlimit erreicht')};
}
