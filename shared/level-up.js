import {PILOT_LICENSES} from './ships.js';
import {MAX_PILOT_LEVEL,PILOT_LEVELS} from './progression.js';
export function levelUpBenefits(before,level){
  if(!Number.isInteger(before)||!Number.isInteger(level)||before<1||level<=before||level>MAX_PILOT_LEVEL)return null;
  return {before,level,additionalSlots:level-before,slotLimit:level,title:PILOT_LEVELS[level].title||null,
    licenses:PILOT_LICENSES.filter(l=>l&&l.level>before&&l.level<=level)};
}
