import {FIXED,priceWindow,fixedConsumptionPerHour,fixedRref} from './property.js';

export const CIVIL_GOODS = ['water','food','clothing','medicine','consumer'];
export function localDemandPerHour(good, slot, property, rate=slot?.rate||0) {
  if (!property) return rate*3600;
  const {pmin,pmax}=priceWindow(good,slot?.mod||1);
  return fixedConsumptionPerHour(fixedRref(rate,pmin,pmax),property.fixed?.[good]??FIXED.DEFAULT,pmin,pmax);
}
