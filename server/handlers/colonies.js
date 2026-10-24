import {V} from './validate.js';
import {surveyColony,deliverColony,foundColony} from '../colonies.js';
import {quoteWarp,startWarp} from '../warp.js';
import {GOODS} from '../../shared/config.js';
import {orderError} from './ship.js';
export default {
  colonySurvey:{args:{target:V.entity(),ship:V.ownShip()},run({game,player},{target,ship}){return surveyColony(game,player,target,ship);}},
  colonyDeliver:{args:{target:V.entity(),good:V.key(GOODS),amount:V.int(1,1e6)},run({game,player},{target,good,amount}){return deliverColony(game,player,target,good,amount);}},
  colonyFound:{args:{target:V.entity(),ship:V.ownShip(),confirmed:V.bool()},run({game,player},{target,ship,confirmed}){return foundColony(game,player,target,ship,confirmed);}},
  warpQuote:{args:{target:V.entity(),system:V.str(100,1),x:V.opt(V.num(-1e12,1e12)),y:V.opt(V.num(-1e12,1e12))},run({game,player},{target,system,x,y}){return quoteWarp(game,player,target,system,x,y);}},
  warpStart:{args:{target:V.entity(),quote:V.int(1,1e9),confirmed:V.bool()},run({game,player},{target,quote,confirmed}){return startWarp(game,player,target,quote,confirmed);}},
  relocationResume:{args:{ship:V.ownShip()},run({game,player},{ship}){
    if(!ship.relocationHold||ship.relocationHold.state!=='waiting')return 'Zuerst den begonnenen Abschnitt sicher beenden.';
    if(game.world.entities.get(ship.relocationHold.home)?.market?.homeworld?.warp)return 'Standorttransfer zuerst abschließen.';
    if(ship.queue[0]){
      const c=ship.queue[0],error=orderError(game,ship,c,false);if(error)return error;
      if(['move','goto','dock','mine','wait'].includes(c.t))c.manualDirect=player.manualShip===ship.id&&(c.t!=='dock'||(c.actions?.length||0)<=1);
    }
    delete ship.relocationHold;ship.nav=null;delete ship.coverageLeg;if(ship.warn)delete ship.warn.relocation;
  }},
};
