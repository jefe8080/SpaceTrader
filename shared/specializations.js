export const WORLD_FOCI={agrar:['grain','biomass'],ocean:['crude','biomass'],desert:['silicate','sulfur'],mining:['ore','crystals','rareearth'],ice:['ice'],gasgiant:['gas','helium3'],jungle:['biomass','crude'],volcanic:['sulfur','rareearth','acid'],urban:['hive','education'],resort:['tourism'],colony:['settlement'],industrial:['logistics']};
export const FOCUS_NAMES={hive:'Hive World',education:'Ausbildungszentrum',tourism:'Tourismus',settlement:'Besiedlungsbüro',logistics:'Logistikzentrum'};
const infrastructure=[{plates:12,electronics:6},{computers:4,robots:4},{computers:10,robots:10,aicores:2}];
const tourism=[{plates:8,textiles:4,electronics:2},{plates:20,clothing:8,electronics:4},{habitats:10,luxury:10,medtech:4}];
const logistics=[{plates:20,electronics:8},{machinery:10,computers:8},{machinery:20,robots:10,aicores:4}];
export function specializationSpec(focus,level){
  if(!Number.isInteger(level)||level<1||level>3)return null;
  const i=level-1,cost=[50000,150000,400000][i];
  if(focus==='settlement')return level===1?{credits:25000,goods:{plates:12,electronics:4},seconds:120,power:4,workers:{basic:0,skilled:4,specialist:0},growthCap:200}:null;
  const base={credits:cost,seconds:180};
  if(focus==='hive')return {...base,goods:{habitats:[2,6,16][i],machinery:[4,10,24][i]},housing:[2000,10000,50000][i],power:[20,80,300][i],workers:{basic:[10,30,100][i],skilled:[2,6,20][i],specialist:[0,2,5][i]}};
  if(focus==='education')return {...base,goods:infrastructure[i],schoolCapacity:[2,3,4][i],power:[8,20,50][i],workers:{basic:[2,4,8][i],skilled:[4,8,16][i],specialist:[0,2,4][i]}};
  if(focus==='tourism')return {...base,goods:tourism[i],visitorCapacity:[100,300,1000][i],power:[8,20,60][i],workers:{basic:[10,25,60][i],skilled:[2,4,8][i],specialist:[0,0,2][i]}};
  if(focus==='logistics')return {...base,goods:logistics[i],docks:[4,8,16][i],throughput:[1000,2000,4000][i],power:[10,25,60][i],workers:{basic:[10,20,40][i],skilled:[2,6,12][i],specialist:[0,0,2][i]}};
  if(!Object.values(WORLD_FOCI).some(f=>f.includes(focus)))return null;
  return {credits:[25000,75000,200000][i],goods:[{plates:20,machinery:4},{machinery:8,robots:4},{machinery:12,robots:8,aicores:2}][i],seconds:[120,180,180][i],factor:[1.5,2,3][i],power:[10,25,60][i],workers:{basic:[10,20,40][i],skilled:[2,4,8][i],specialist:0},wear:{machinery:[2,5,10][i],robots:[1,2,4][i]}};
}
