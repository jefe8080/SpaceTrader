import {paintedSite as s} from './planetPaintedLayout.js';
/** Twelve inspected expansion courtyards, each hosting four small parcels inside its stone perimeter.
 * The surrounding architecture and all connecting streets are painted, not generated here.
 */
const courts=[
  [681,635],[840,677],[1069,618],[1344,642],
  [1402,571],[676,741],[1025,762],[1195,893],
  [860,845],[1073,921],[1355,826],[1218,548],
];
const offsets=[[-2,-12],[30,0],[-34,0],[-2,12]];
export const HOME_CITY={
  landscape:{x:0,y:-128,width:1536,height:1152},
  bounds:{x:25,y:-103,width:1486,height:1102},
  type:'ruins',plaza:{x:498,y:510},categories:[],workshops:[],services:[],
  landmarks:{
    questhouse:s('home-town-hall',459,481,267,140),
    'home:dock':s('home-dock',301,207,145,103,false),
    'home:control':s('home-control',711,266,155,110,false),
    'home:workshop':s('home-workshop',460,333,155,103,false),
    'home:waterworks':s('home-waterworks',422,121,145,96,false),
    'home:foodplant':s('home-foodplant',986,208,155,103,false),
    'home:fueldepot':s('home-fueldepot',1414,435,140,95,false),
    'home:refinery':s('home-refinery',824,439,150,104,false),
    'home:smelter':s('home-smelter',1017,566,119,86,false),
    'home:orbital':s('home-orbital',1168,353,170,136,false),
  },
  homePlots:courts.flatMap(([x,y],court)=>offsets.map(([dx,dy],part)=>s('home-lot-'+(court*4+part),x+dx,y+dy,48,24,false))),
};
