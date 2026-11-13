// Deliberately isolated rule prototypes, not a second economy in the saved world.
import {Game} from './game.js';
import {RECIPES,GOODS,sellPrice,freeFor} from '../shared/config.js';
import {ensureCash,spendMarketCash,receiveMarketCash} from './real-economy.js';
import {availableHomeStock} from '../shared/homeworld.js';
import {ensureFactionSectors,receiveGoods,supplyOk} from './war/factions.js';

export function fundContract(game,market,good,amount,seconds=3600){
 const slot=market.market.goods[good],cash=ensureCash(market);
 if(!slot||!['consume','trade'].includes(slot.role)||!Number.isInteger(amount)||amount<1||amount>Math.floor(slot.cap-slot.stock))return {error:'Keine passende reale Abnahme.'};
 const price=sellPrice(good,slot),total=amount*price;
 if(cash.cash<total||!spendMarketCash(market,total))return {error:'Auftraggeber kann die Abnahme nicht finanzieren.'};
 return {target:market.id,good,amount,remaining:amount,price,escrow:total,expires:game.time+seconds,contributions:[],state:'open'};
}
export function deliverContract(game,contract,player,ship){
 if(contract.error||contract.state!=='open')return 'Kein offener Vertrag.';
 if(game.time>=contract.expires)return 'Vertrag abgelaufen; ungenutzte Kaution freigeben.';
 const e=game.world.entities.get(contract.target),slot=e?.market.goods[contract.good];
 if(ship.owner!==player.id||ship.dockedAt!==e?.id)return 'Eigenes Schiff am Abnahmeort erforderlich.';
 const n=Math.floor(Math.min(contract.remaining,ship.cargo[contract.good]||0,slot.cap-slot.stock));if(!n)return 'Keine zulässige Liefermenge.';
 ship.cargo[contract.good]-=n;if(!ship.cargo[contract.good])delete ship.cargo[contract.good];slot.stock+=n;player.credits+=n*contract.price;contract.escrow=Math.max(0,contract.escrow-n*contract.price);contract.remaining-=n;
 contract.contributions.push({player:player.name,n,paid:n*contract.price});if(!contract.remaining)contract.state='completed';return null;
}
export function cancelContract(game,c){if(c.error||c.state==='cancelled')return;if(c.escrow>0)receiveMarketCash(game.world.entities.get(c.target),c.escrow);c.escrow=0;c.state='cancelled';}
export function operateVariant(market,recipeId,cycles,mode){
 const r=RECIPES[recipeId];if(!r||!['standard','efficient'].includes(mode)||!Number.isInteger(cycles)||cycles<1||cycles>100)return {error:'Ungültiger Prototypauftrag.'};
 const factor=mode==='efficient'?.8:1,power=mode==='efficient'?6:4,home=market.homeworld;
 if((home.energy?.generation??home.power)-(home.energy?.used||0)<power)return {error:'Nicht genug freie Energie.'};
 const inputs=Object.fromEntries(Object.entries(r.in).map(([g,n])=>[g,n*cycles*factor]));
 if(Object.entries(inputs).some(([g,n])=>availableHomeStock(market,g)<n))return {error:'Zutaten fehlen außerhalb geschützter Reserven.'};
 for(const [g,n] of Object.entries(inputs))market.goods[g].stock-=n;
 for(const [g,n] of Object.entries(r.out))market.goods[g].stock+=n*cycles;
 return {mode,power,inputs,outputs:Object.fromEntries(Object.entries(r.out).map(([g,n])=>[g,n*cycles])),seconds:r.time*cycles};
}

export function runPrototype(kind,choice='standard'){
 const game=new Game(':memory:',{seed:26});
 try{
  const p=game.createPlayer('Pilot A'),q=game.createPlayer('Pilot B'),s=game.shipsOf(p.id)[0],other=game.shipsOf(q.id)[0],home=game.world.entities.get(p.homeworld),h=home.market.homeworld;
  let result;
  if(['contract','cooperation'].includes(kind)){
   const buyer=[...game.world.entities.values()].find(e=>e.market?.goods.water?.role==='consume');if(!buyer)throw new Error('Kein Wasserabnehmer im Szenario.');
   buyer.market.goods.water.stock=0;buyer.market.goods.water.cap=Math.max(100,buyer.market.goods.water.cap);ensureCash(buyer).cash=10000;
   s.dockedAt=buyer.id;s.cargo={water:kind==='cooperation'?10:20};other.dockedAt=buyer.id;other.cargo={water:10};
   const before={cash:ensureCash(buyer).cash,creditsA:p.credits,creditsB:q.credits,water:buyer.market.goods.water.stock};
   const c=fundContract(game,buyer,'water',20,3600);deliverContract(game,c,p,s);if(kind==='cooperation')deliverContract(game,c,q,other);
   result={before,contract:c,after:{cash:ensureCash(buyer).cash,creditsA:p.credits,creditsB:q.credits,water:buyer.market.goods.water.stock},decision:'20 echte Einheiten, Preis und eine Stunde Laufzeit vor Annahme; Geld beim Auftraggeber gebunden. Kooperative Beiträge werden einzeln vergütet. Nur abgeschirmter Prototyp; parallele öffentliche Kapazitätsreservierung ist vor Liveintegration zusätzlich erforderlich.'};
  }else if(kind==='production'){
   home.market.goods.ice.stock=20;home.market.goods.water.stock=0;h.energy={generation:12,used:0};
   result={before:{ice:20,water:0},operation:operateVariant(home.market,'waterworks',5,choice==='efficient'?'efficient':'standard'),after:{ice:home.market.goods.ice.stock,water:home.market.goods.water.stock},decision:'Fünf Zyklen Wasserwerk: Standard 10 Eis/4 Energie gegen sparsam 8 Eis/6 Energie; gleiche Ausbeute und Zeit. Erprobungswerte, keine Änderung gespeicherter Rezepte. Größere Lieferketten und Energieengpässe müssen den Nutzen bestätigen.'};
  }else if(kind==='exploration'){
   const source=[...game.world.entities.values()].find(e=>e.market?.goods.ice?.role==='produce'),wreck={stock:{ingots:10},claimed:false};
   if(choice==='survey'){game.revealAround(p,source.x,source.y,2500);result={choice:'Kartografie',known:game.isKnown(p,source),source:source.name,remainingWreck:wreck.stock.ingots,decision:'Quelle aufklären oder endlichen Materialfund bergen: Informationsgewinn gegen sofortige vorhandene Fracht.'};}
   else{const n=Math.min(wreck.stock.ingots,freeFor(s,'ingots'));wreck.stock.ingots-=n;s.cargo.ingots=n;wreck.claimed=true;result={choice:'Bergung',cargo:s.cargo,remainingWreck:wreck.stock.ingots,decision:'Endlicher bereitgestellter Fund; keine neue Währung, keine wiederholbare Materialerzeugung.'};}
  }else if(kind==='diplomacy'){
   for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)game.world.ensureSector(x,y);ensureFactionSectors(game);const fs=[...game.fsecs.values()][0];if(!fs)throw new Error('Keine Fraktion im Szenario.');
   s.cargo={water:40,food:40};for(const [g,n] of Object.entries(s.cargo)){receiveGoods(fs,g,n);s.cargo[g]=0;}
   const pact={faction:fs.faction,expires:game.time+3600,required:{water:40,food:40},cancelled:false};const allowed=()=>!pact.cancelled&&game.time<pact.expires;
   const during=allowed();game.time+=3601;result={pact,supplied:supplyOk(fs),passageDuring: during,passageAfterExpiry:allowed(),decision:'Versorgung gegen zeitlich begrenzten Durchflug ist als Regelprototyp geprüft. Er nutzt bestehende Fraktionsvorräte; Grenzschutz-/Diplomatieintegration bleibt vor einer Livefreigabe erforderlich. Kein dauerhafter Freundschaftsersatz.'};
  }else return {error:'Unbekannter Prototyp.'};
  return {kind,isolated:true,notice:'Getrennte In-Memory-Testwelt mit ausdrücklich bereitgestellten Beispielressourcen. Dein normaler Spielstand, Geld, Fortschritt und Belohnungen bleiben unverändert.',result};
 }finally{game.store.close();}
}
