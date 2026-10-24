// Physical exemplars; a packed module occupies 30 normal freight units.
export const MODULE_RECIPES={
  cabin:{goods:{plates:8,plastics:4,textiles:2},seconds:60,facility:'moduleBench'},
  shielded:{goods:{plates:8,glass:4,hydraulicoil:2},seconds:60,facility:'moduleBench'},
  acidex:{goods:{alloys:4,machinery:2,coolant:2},seconds:90,facility:'researchWorkshop'},
  sensor:{goods:{sensors:4,computers:2,powercells:2},seconds:90,facility:'researchWorkshop'},
  gascoll:{goods:{alloys:6,machinery:2,sensors:2},seconds:90,facility:'researchCenter'},
  drill:{goods:{alloys:8,machinery:4,robots:2},seconds:120,facility:'researchCenter'},
};
export const packedModuleCount=inventory=>Object.values(inventory||{}).reduce((sum,n)=>sum+n,0);
