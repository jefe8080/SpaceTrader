import {MODULES} from '../../shared/ships.js';
import {V} from './validate.js';
import {transferModule,installModule,removePhysicalModule,startModuleProject} from '../modules.js';

export default {
  moduleTransfer:{
    args:{ship:V.ownShip(),target:V.entity(),module:V.key(MODULES),dir:V.oneOf('buy','sell'),amount:V.opt(V.int(1,100),1)},
    run({game,player},{ship,target,module,dir,amount}){return transferModule(game,player,ship,target,module,dir,amount);},
  },
  moduleInstall:{
    args:{ship:V.ownShip(),module:V.key(MODULES),source:V.opt(V.oneOf('cargo','warehouse'),'cargo')},
    run({game,player},{ship,module,source}){return installModule(game,player,ship,module,source);},
  },
  moduleRemove:{
    args:{ship:V.ownShip(),module:V.key(MODULES),destination:V.opt(V.oneOf('cargo','warehouse'),'cargo')},
    run({game,player},{ship,module,destination}){return removePhysicalModule(game,player,ship,module,destination);},
  },
  homeModuleCraft:{
    args:{target:V.entity(),module:V.key(MODULES),study:V.bool()},
    run({game,player},{target,module,study}){return startModuleProject(game,player,target,module,study);},
  },
};
