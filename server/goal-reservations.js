import {homeAccess,initializeHomeOperations} from './homeworld-operations.js';
import {availableHomeStock} from '../shared/homeworld.js';
/** Extend the existing reservations map; never touch production:/logistics: entries. */
export function setGoalReservation(game,player,entity,label,good,amount){
 const err=homeAccess(game,player,entity);if(err)return err;
 const h=entity.market.homeworld;initializeHomeOperations(h);
 const key='goal:'+label;
 if(!h.reservations[key]&&Object.keys(h.reservations).filter(k=>k.startsWith('goal:')).length>=30)return 'Höchstens 30 eigene Reservierungsziele.';
 const old=h.reservations[key]?.goods[good]||0,available=availableHomeStock(entity.market,good)+old;
 if(amount>available)return 'Nur bereits vorhandene, ungebundene Waren können reserviert werden.';
 if(!amount){if(h.reservations[key]){delete h.reservations[key].goods[good];if(!Object.keys(h.reservations[key].goods).length)delete h.reservations[key];}}
 else{h.reservations[key]||={kind:'goal',label,goods:{}};h.reservations[key].goods[good]=amount;}
 entity.market.rev=(entity.market.rev||0)+1;game.emit('entity',entity);
}
