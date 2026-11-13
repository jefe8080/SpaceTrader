let mode='system';try{mode=localStorage.getItem('st_motion')||'system';}catch{}
const media=matchMedia('(prefers-reduced-motion: reduce)');
export const motionReduced=()=>mode==='reduce'||mode==='system'&&media.matches;
export const motionMode=()=>mode;
function apply(){document.documentElement.dataset.reducedMotion=String(motionReduced());dispatchEvent(new Event('display-preferences'));}
export function setMotionMode(value){if(!['system','reduce','full'].includes(value))return;mode=value;try{localStorage.setItem('st_motion',value);}catch{}apply();}
media.addEventListener?.('change',apply);apply();
