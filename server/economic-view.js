import {GOODS} from '../shared/goods.js';
import {syncInventoryBasis} from './pilot-profile.js';

/** Append to the existing personal profile, with minute buckets and bounded history. */
export function recordEconomic(game,player,category,amount,extra={}) {
  if(!player||!Number.isFinite(amount))return;
  player.profileStats ||= {since:Date.now(),revenue:0,knownProfit:0,unknownRevenue:0,unknownUnits:0,inventory:{}};
  const ledger=player.profileStats.ledger ||= [];
  const row={time:game.time,category,amount,...extra};
  const last=ledger.slice(-100).reverse().find(x=>Math.floor(x.time/60)===Math.floor(row.time/60)&&['category','ship','place','good','direction'].every(k=>x[k]===row[k]));
  if(last&&Math.floor(last.time/60)===Math.floor(row.time/60)&&['category','ship','place','good'].every(k=>last[k]===row[k])){last.amount+=amount;last.units=(last.units||0)+(row.units||0);}
  else ledger.push(row);
  if(ledger.length>5000)ledger.splice(0,ledger.length-5000);
}

/** Quote the actual trade implementation on detached state. No simulation ticks or writes. */
export function tradePreview(game,player,{ship:shipId,target,good,amount,dir}) {
  const originalShip=game.ships.get(shipId),originalEntity=game.world.entities.get(target);
  if(originalShip?.owner!==player.id||!originalEntity?.market||!game.isKnown(player,originalEntity)||!GOODS[good]||GOODS[good].cls==='passenger'||!['buy','sell'].includes(dir))return {error:'Bekannten Markt, eigenes Schiff und Warenrichtung auswählen.'};
  if(!Number.isInteger(amount)||amount<1||amount>10000)return {error:'Menge zwischen 1 und 10.000 wählen.'};
  const clone=Object.assign(Object.create(Object.getPrototypeOf(game)),game);
  clone.players=structuredClone(game.players);clone.ships=structuredClone(game.ships);clone.ownership=structuredClone(game.ownership);clone.consortia=structuredClone(game.consortia);clone.fsecs=structuredClone(game.fsecs);
  const entity=structuredClone(originalEntity),ship=clone.ships.get(shipId),p=clone.players.get(player.id);
  clone.world=Object.assign(Object.create(Object.getPrototypeOf(game.world)),game.world,{entities:new Map(game.world.entities)});clone.world.entities.set(target,entity);
  clone.emit=()=>{};clone.recordShip=()=>{};clone.shipLog=()=>{};clone.afterTrade=()=>{};
  ship.dockedAt=target;ship.queue=[];
  // A sale plan may describe a future load, but it still uses the real hull capacity.
  const before=syncInventoryBasis(clone,p,good),basis=structuredClone(before);
  const result=clone.tradeImpl(ship,entity,good,amount,dir,0,{manual:false});
  const knownFraction=basis.quantity>0?Math.min(1,basis.known/basis.quantity):0;
  const costPerKnown=basis.known>0?basis.cost/basis.known:null;
  return {time:game.time,ship:shipId,target,good,dir,requested:amount,n:result.n||0,total:result.total||0,reason:result.reason||null,
    knownCost:dir==='sell'&&knownFraction>=1-1e-7&&costPerKnown!=null?result.n*costPerKnown:null,
    fuelCost:ship.relicSpeed?0:null,notice:'Momentaufnahme ohne Sondernachfrage. Anflugzeit, künftige Kurse und Abfertigung sind nicht garantiert. Unbekannte Herstellungskosten bleiben offen.'};
}

export function economicView(game,player) {
  return {time:game.time,ledger:player.profileStats?.ledger||[],inventory:player.profileStats?.inventory||{},
    notice:'Erfasste Geldbewegungen seit Einführung; keine vollständige historische Kontorekonstruktion. Eigenlagertransfers erzeugen keinen Gewinn. Investitionen sind Ausgaben, keine Warenkosten.'};
}
