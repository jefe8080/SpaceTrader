import * as THREE from 'three';

let atlasPromise,groundPromise;
export function loadPlanetArt(){
  const loader=new THREE.TextureLoader();
  atlasPromise||=loader.loadAsync('/assets/art/homeworld/buildings.png').then(t=>{t.colorSpace=THREE.SRGBColorSpace;return t;}).catch(error=>{atlasPromise=null;throw error;});
  groundPromise||=loader.loadAsync('/assets/art/homeworld/ground.png').then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}).catch(error=>{groundPromise=null;throw error;});
  return Promise.all([atlasPromise,groundPromise]);
}

export function buildingIllustrationCell(item,entity){
  const status=buildingDevelopment(entity.market?.homeworld,item);
  if(status==='ruined')return 10;if(status==='building')return 11;
  if(item.homeOrbital)return 9;
  if(item.homeFacility)return {waterworks:0,control:1,workshop:2,dock:5,foodplant:4,fueldepot:4,refinery:4,smelter:4}[item.homeFacility]??4;
  const s=entity.market?.homeworld?.structures?.find(s=>s.id===item.homeStructure);
  if(s)return {housing:3,solar:6,school:7,researchWorkshop:7,spaceport:8,silo:5,safeStorage:5,moduleBench:2}[s.kind]??4;
  if(item.kind==='plot')return null;
  if(item.kind==='questhouse')return {education:7,logistics:8,tourism:3,hive:3}[entity.market?.economy?.specialization?.focus]??3;
  return {silo:0,tower:1,store:5,farm:4,drill:4,mine:4,hall:4}[item.look]??4;
}

export function illustrateBuilding(object,item,entity,atlas){
  const cell=buildingIllustrationCell(item,entity);if(cell===null)return ()=>{};
  for(const child of object.children)child.visible=false;
  const texture=atlas.clone();texture.repeat.set(.25,1/3);texture.offset.set(cell%4/4,(2-Math.floor(cell/4))/3);texture.needsUpdate=true;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.06,depthWrite:true});
  const sprite=new THREE.Sprite(material);sprite.scale.set(21,23,1);sprite.position.y=10;object.add(sprite);
  if(item.homeOrbital&&entity.market?.homeworld?.orbital?.large)sprite.scale.set(27,29,1);
  const level=entity.market?.economy?.specialization?.level;
  if(level&&item.kind==='questhouse')sprite.scale.multiplyScalar(1+.15*level);
  const districts=[];
  if(item.kind==='questhouse'&&entity.market?.economy){
    const groups=new Map();for(const b of entity.market.economy.infrastructure||[])groups.set(b.kind,(groups.get(b.kind)||0)+1);
    let i=0;for(const [kind,count] of groups){
      const district=new THREE.Group();district.position.set((i%3-1)*11,0,-10-Math.floor(i/3)*10);district.scale.setScalar(.35+Math.min(.2,count*.025));object.add(district);
      districts.push(illustrateBuilding(district,{homeStructure:'district'},{market:{homeworld:{structures:[{id:'district',kind,status:'ready'}]}}},atlas));i++;
    }
    if(entity.market.economy.projects?.some(p=>p.kind==='infrastructure')){
      const site=new THREE.Group();site.position.set(-12,0,6);site.scale.setScalar(.5);object.add(site);
      districts.push(illustrateBuilding(site,{homeFacility:'dock'},{market:{homeworld:{facilities:{dock:{status:'building'}}}}},atlas));
    }
  }
  return ()=>{districts.forEach(dispose=>dispose());texture.dispose();material.dispose();};
}

export function illustrateGround(root,texture,type){
  if(type!=='ruins')return ()=>{};
  root.traverse(mesh=>{if(!mesh.isMesh||(!mesh.material?.name?.includes('ground')&&!mesh.material?.vertexColors))return;
    const material=mesh.material,previous=material.onBeforeCompile;
    material.color.set(0xffffff);material.vertexColors=false;
    material.onBeforeCompile=shader=>{previous(shader);shader.uniforms.paintGround={value:texture};
      shader.fragmentShader='uniform sampler2D paintGround;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=texture2D(paintGround,pigmentPoint.xz*.008).rgb;');};
    material.needsUpdate=true;
  });
  return ()=>{};
}

export function illustrateEnvironment(group,atlas,type){
  if(type!=='ruins')return ()=>{};
  const disposers=[];
  for(let i=0;i<10;i++){
    const object=new THREE.Group();object.position.set(i%2?155:-155,3,-145+Math.floor(i/2)*78);
    const dispose=illustrateBuilding(object,{homeFacility:'workshop'},{market:{homeworld:{facilities:{workshop:{status:'ruined'}}}}},atlas);
    object.scale.setScalar(1.5+(i%3)*.3);group.add(object);disposers.push(dispose);
  }
  return ()=>disposers.forEach(dispose=>dispose());
}

/** Code-native ink and pigment treatment; keeps original geometry and picking. */
export function paintPlanet(root,{outlines=false}={}){
  const resources=[];const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const mesh of meshes){
    const original=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const painted=original.map(source=>{
      if(source.isShaderMaterial)return source;
      const material=new THREE.MeshToonMaterial({color:source.color||0xffffff,vertexColors:source.vertexColors,
        map:source.map,transparent:source.transparent,opacity:source.opacity,side:source.side,
        emissive:source.emissive||0x000000,emissiveIntensity:source.emissiveIntensity??1});
      material.name=source.name;
      material.onBeforeCompile=shader=>{
        shader.vertexShader='varying vec3 pigmentPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npigmentPoint=(modelMatrix*vec4(position,1.)).xyz;');
        shader.fragmentShader='varying vec3 pigmentPoint;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          vec3 p=pigmentPoint;
          float grain=fract(sin(dot(floor(p.xz*9.),vec2(12.9898,78.233)))*43758.5453);
          float wash=sin(p.x*.37+sin(p.z*.23)*2.)*sin(p.z*.41+p.y*.27);
          float ink=pow(max(0.,sin(p.x*4.+p.z*2.+sin(p.z*.2))),24.);
          diffuseColor.rgb *= .94 + .075*wash + .055*grain;
          diffuseColor.rgb *= 1.-.07*ink;
        `);
      };
      resources.push(material);return material;
    });
    mesh.material=Array.isArray(mesh.material)?painted:painted[0];
    if(outlines&&mesh.geometry.attributes.position.count<12000){
      const geometry=new THREE.EdgesGeometry(mesh.geometry,32),material=new THREE.LineBasicMaterial({color:0x302e30,transparent:true,opacity:.52});
      const ink=new THREE.LineSegments(geometry,material);ink.userData.artInk=true;mesh.add(ink);resources.push(geometry,material);
    }
  }
  return ()=>resources.forEach(r=>r.dispose());
}

export function buildingDevelopment(home,item){
  if(!home)return 'ready';
  if(item.homeOrbital)return home.orbital?.large?'orbital-large':home.orbital?.small?'orbital-small':home.orbital?.project?'building':'ruined';
  const building=item.homeFacility?home.facilities[item.homeFacility]:home.structures?.find(s=>s.id===item.homeStructure);
  return building?.status||'ready';
}

/** Distinct physical silhouettes, without adding a single economic anchor. */
export function developBuilding(object,item,entity){
  const home=entity.market?.homeworld,status=buildingDevelopment(home,item);
  const owned=[];
  const solid=(geometry,color,x,y,z)=>{const material=new THREE.MeshStandardMaterial({color,roughness:1});owned.push(geometry,material);const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);object.add(m);return m;};
  if(status==='ruined'||status==='building'){
    for(const child of object.children)child.visible=false;
    for(let i=0;i<5;i++){const wall=solid(new THREE.BoxGeometry(2.5,2+i%3,5),0x9f916b,-6+i*3,1+i%3*.5,(i%2-.5)*5);wall.rotation.z=(i%3-1)*.18;}
    if(status==='building')for(const x of [-7,7])for(const z of [-6,6])solid(new THREE.CylinderGeometry(.2,.2,9,5),0xd6a762,x,4,z);
  }else if(item.homeOrbital){
    for(const child of object.children)child.visible=false;
    const large=status==='orbital-large';
    const ring=solid(new THREE.TorusGeometry(large?10:7,.8,5,48,Math.PI*(large?2:1.55)),0x6a9993,0,16,0);ring.rotation.x=Math.PI/2;
    for(const x of [-6,6])solid(new THREE.BoxGeometry(1.2,14,1.2),0xb5a27c,x,7,0);
    solid(new THREE.BoxGeometry(9,2,7),0x5c7b7b,0,1,0);
  }else if(home&&item.kind!=='plot'){
    solid(new THREE.BoxGeometry(1.2,.45,.5),0xffce79,0,3.5,5);
    if(item.homeStructure){const s=home.structures.find(s=>s.id===item.homeStructure);if(s?.kind==='housing')for(let i=0;i<3;i++)solid(new THREE.BoxGeometry(3,3+i%2,3),0xc2ad83,-4+i*4,1.5,-5);}
    if(item.homeFacility==='control')for(let i=1;i<(home.controlLevel||0);i++)solid(new THREE.TorusGeometry(2+i,.18,4,20),0x65aba5,0,5+i,0).rotation.x=Math.PI/2;
  }
  const focus=entity.market?.economy?.specialization;
  if(focus&&item.kind==='questhouse')for(let i=0;i<focus.level;i++)solid(new THREE.BoxGeometry(2,4+i*2,2),0x64a39a,-5+i*5,2+i,-4);
  return ()=>owned.forEach(r=>r.dispose());
}
