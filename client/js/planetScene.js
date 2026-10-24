import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { planBuildingPlacements } from '/assets/models/planets/placement.js';
import { CameraFlight, fitDioramaCamera, buildingViewDirection } from './planetCamera.js';
import { createPlanetEnvironment } from './planetEnvironment.js';
import { createRuinsTerrain, ruinsLayout, planRuinsBuildings } from './ruinsTerrain.js';
import {paintPlanet,developBuilding,loadPlanetArt,illustrateBuilding,illustrateGround,illustrateEnvironment} from './planetArt.js';

const COLORS = { agrar: 0x739db4, ocean: 0x497fa3, desert: 0xbe946d, mining: 0x706874,
  ice: 0xa6c7de, urban: 0x596481, resort: 0xd6af8c, gasgiant: 0xa98b71,
  jungle: 0x658578, volcanic: 0x5a4447, colony: 0x8294ad, industrial: 0x827d78 };
const jsonCache = new Map(), modelCache = new Map();
const loader = new GLTFLoader();
function cached(map, key, create) {
  if (!map.has(key)) map.set(key, create().catch(error => { map.delete(key); throw error; }));
  return map.get(key);
}
function json(url) {
  return cached(jsonCache, url, async () => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
    return r.json();
  });
}
function model(url) { return cached(modelCache, url, () => loader.loadAsync(url).then(g => g.scene)); }

export class PlanetScene {
  constructor(canvas, callbacks) {
    this.canvas = canvas; this.callbacks = callbacks;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.world = new THREE.Scene();
    this.world.add(new THREE.HemisphereLight(0xe3f2ff, 0x74634d, 1.8));
    const sun = new THREE.DirectionalLight(0xffefd3, 2.2);
    sun.position.set(-60, 100, 60); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 85, bottom: -85, near: 1, far: 240 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.08;
    this.world.add(sun);
    this.camera = new THREE.OrthographicCamera(-50,50,50,-50,0.1,20000);
    this.controls = { target: new THREE.Vector3() };
    this.flight = new CameraFlight(this.camera, this.controls);
    this.records = new Map(); this.assignments = new Map();
    this.ray = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.active = false; this.epoch = 0; this.selected = null; this.hover = null;
    this.label = document.getElementById('planetLabel');
    this.highlight = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffdf7e, depthTest: true }));
    this.highlight.renderOrder = 10; this.highlight.visible = false;
    this.world.add(this.highlight);
    const pointers = new Map();
    let gesture = false, drag = null, pinch = null;
    const basePose = () => this.selected && this.records.has(this.selected) ? this.focusPose(this.records.get(this.selected)) : this.overview;
    const zoomTo = zoom => {
      if (!this.active || this.loading || this.flight.flight) return;
      const base = basePose();
      if (!base) return;
      this.camera.zoom = THREE.MathUtils.clamp(zoom,base.zoom*.85,base.zoom*1.15);
      this.camera.updateProjectionMatrix();
    };
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      zoomTo(this.camera.zoom*Math.exp(-e.deltaY*.0007));
    }, {passive:false});
    canvas.addEventListener('pointerdown', e => {
      if (!this.active || this.loading) return;
      if (!pointers.size) { gesture = false; drag = null; pinch = null; }
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,button:e.button});
      canvas.setPointerCapture(e.pointerId);
      if (pointers.size>1) {
        gesture = true; drag = null;
        const [a,b]=[...pointers.values()];
        pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:this.camera.zoom};
      }
    });
    canvas.addEventListener('pointermove', e => {
      const p=pointers.get(e.pointerId);
      if (!p) { this.hover=this.pick(e.clientX,e.clientY); this.mark(); return; }
      p.x=e.clientX;p.y=e.clientY;
      if (pointers.size>1 && pinch) {
        const [a,b]=[...pointers.values()];
        zoomTo(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance);
      } else if (pointers.size===1 && !pinch && p.button===0 && Math.hypot(p.x-p.startX,p.y-p.startY)>5) {
        gesture=true;
        if (!drag) {
          this.flight.cancel();
          drag={x:p.x,y:p.y,target:this.controls.target.clone(),position:this.camera.position.clone()};
        }
        const base=basePose();
        if (base) {
          const direction=drag.position.clone().sub(drag.target).normalize();
          const right=new THREE.Vector3(direction.z,0,-direction.x).normalize();
          const forward=new THREE.Vector3(-direction.x,0,-direction.z).normalize();
          const units=100/(this.camera.zoom*innerHeight);
          const target=drag.target.clone().addScaledVector(right,-(p.x-drag.x)*units)
            .addScaledVector(forward,(p.y-drag.y)*units/Math.max(.3,direction.y));
          const limit=this.selected?8:24;
          target.x=THREE.MathUtils.clamp(target.x,base.target.x-limit,base.target.x+limit);
          target.z=THREE.MathUtils.clamp(target.z,base.target.z-limit,base.target.z+limit);
          this.camera.position.copy(drag.position).add(target.clone().sub(drag.target));
          this.controls.target.copy(target);
        }
      }
      this.hover=null;this.mark();
    });
    canvas.addEventListener('pointerup', e => {
      const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);
      if (this.active && p && p.button===0 && !gesture &&
          Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<=5) this.callbacks.select(this.pick(e.clientX,e.clientY));
      if (!pointers.size) { drag=null;pinch=null; }
    });
    canvas.addEventListener('pointercancel', () => { pointers.clear();gesture=true;drag=null;pinch=null; });
    canvas.addEventListener('pointerleave', () => { this.hover=null;this.mark(); });
    this.clearPointers = () => { pointers.clear();gesture=true;drag=null;pinch=null; };
  }
  reset() { this.epoch++; this.loading = true; if (this.group) this.group.visible = false; if (this.environment) this.environment.visible = false; this.selected = null; this.overview = null; this.flight.cancel(); this.hover = null; this.mark(); }
  show() { this.active = true;  }
  hide() {
    if (!this.active) return;
    this.active = false;  this.flight.cancel();
    this.clearPointers(); this.label.hidden = true;
  }
  async load(e, items, recipeCategory, valid) {
    const epoch = ++this.epoch;
    this.loading = true;
    if (this.group) this.group.visible = false;
    if (this.environment) this.environment.visible = false;
    const base = '/assets/models/', groundBase = base + 'planets/';
    const [manifest, planets] = await Promise.all([json(base + 'manifest.json'), json(groundBase + 'manifest.json')]);
    const descriptor = planets.assets.find(x => x.planet_type === e.type);
    if (!descriptor && e.type !== 'ruins') throw new Error('Missing planet model: ' + e.type);
    const [layout, terrain] = e.type === 'ruins' ? [ruinsLayout(), createRuinsTerrain()]
      : await Promise.all([json(groundBase + descriptor.layout), model(groundBase + descriptor.glb)]);
    const plan = e.type === 'ruins' ? planRuinsBuildings(items, layout, manifest) : planBuildingPlacements(items, layout, manifest, {
      planetId: e.id, recipeCategory, previous: this.assignments.get(e.id),
    });
    const [templates,[atlas,groundTexture]] = await Promise.all([Promise.all(plan.placements.map(p => model(p.url))),loadPlanetArt()]);
    if (epoch !== this.epoch || !valid()) return;
    const group = new THREE.Group();
    const ground = terrain.clone(true); group.add(ground);
    const root = ground.getObjectByName(layout.terrain_root);
    if (!root) throw new Error('Missing terrain root: ' + layout.terrain_root);
    const records = new Map();
    const artDisposers=[paintPlanet(ground)];
    artDisposers.push(illustrateGround(ground,groundTexture,e.type));
    plan.placements.forEach((p, i) => {
      const object = templates[i].clone(true);
      object.position.fromArray(p.position); object.rotation.y = p.rotationY;
      object.userData.buildingKey = p.key;
      artDisposers.push(developBuilding(object,p.item,e));
      artDisposers.push(paintPlanet(object,{outlines:true}));
      artDisposers.push(illustrateBuilding(object,p.item,e,atlas));
      root.add(object);
      records.set(p.key, { object, item: p.item, placement: p });
    });
    group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.updateMatrixWorld(true);
    for (const r of records.values()) r.box = new THREE.Box3().setFromObject(r.object);
    const changedPlanet = this.planetId !== e.id || !this.overview;
    if (this.group) {this.world.remove(this.group);this.group.userData.disposeArt?.();}
    if (this.environment) { this.world.remove(this.environment); this.environment.userData.dispose(); }
    this.loading = false;
    this.group = group;group.userData.disposeArt=()=>artDisposers.forEach(dispose=>dispose()); this.world.add(group); this.records = records;
    this.bounds = new THREE.Box3().setFromObject(group);
    this.environment = createPlanetEnvironment(ground, e.type);
    const disposeEnvironment=this.environment.userData.dispose,disposePaint=paintPlanet(this.environment);
    illustrateGround(this.environment,groundTexture,e.type);
    const disposeDecor=illustrateEnvironment(this.environment,atlas,e.type);
    this.environment.userData.dispose=()=>{disposeDecor();disposePaint();disposeEnvironment();};
    this.world.add(this.environment);
    this.planetId = e.id; this.assignments.set(e.id, plan.assignments);
    this.world.background = new THREE.Color(COLORS[e.type] ?? COLORS.colony);
    this.renderer.shadowMap.needsUpdate = true;
    this.resize();
    if (changedPlanet) {
      this.selected = null;
      this.overview = fitDioramaCamera(this.bounds,innerWidth,innerHeight,this.area);
      this.flight.move(this.overview, true);
    }
    this.mark();
    this.callbacks.status('');
  }
  areaFor(w, h) {
    let left = 16, top = 100, right = w - 16, bottom = h - 20;
    for (const id of ['fleet', 'planetBar', 'planetPanel']) {
      const el = document.getElementById(id);
      if (!el || el.hidden || !el.getClientRects().length) continue;
      const b = el.getBoundingClientRect();
      if (id === 'planetBar') top = Math.max(top, b.bottom + 12);
      else if (id === 'fleet' && w > 1100) left = Math.max(left, b.right + 16);
      else if (id === 'planetPanel') {
        if (w > 1100) right = Math.min(right, b.left - 20);
        else bottom = Math.min(bottom, b.top - 12);
      }
    }
    return { x: left, y: top, width: Math.max(140, right - left), height: Math.max(120, bottom - top) };
  }
  resize() {
    const w = innerWidth, h = innerHeight, area = this.areaFor(w, h);
    const signature = JSON.stringify([w,h,devicePixelRatio,area]);
    if (signature === this.sizeKey) return;
    this.sizeKey = signature; this.area = area;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    this.renderer.setSize(w,h,false);
    this.camera.left=-50*w/h;this.camera.right=50*w/h;this.camera.top=50;this.camera.bottom=-50;
    this.camera.setViewOffset(w,h, w / 2 - (area.x + area.width / 2), h / 2 - (area.y + area.height / 2), w,h);
    this.camera.updateProjectionMatrix();
    if (this.bounds && this.overview) {
      this.overview = fitDioramaCamera(this.bounds,w,h,area);
      this.flight.move(this.selected && this.records.has(this.selected) ? this.focusPose(this.records.get(this.selected)) : this.overview);
    }
  }
  focusPose(record) {
    const direction=buildingViewDirection(record.placement.rotationY);
    return fitDioramaCamera(record.box,innerWidth,innerHeight,this.area,direction,
      Math.max(45,(this.overview?.span ?? 150)*.2));
  }
  select(key, force = false) {
    if (!force && key === this.selected && (!key || this.records.has(key))) return;
    this.selected = key;
    if (!this.bounds || !this.overview) return;
    if (key && this.records.has(key)) {
      this.flight.move(this.focusPose(this.records.get(key)));
    } else if (!key) this.flight.move(this.overview);
    this.mark();
  }
  pick(x,y) {
    if (!this.active || this.loading || !this.group) return null;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2);
    this.ray.setFromCamera(this.pointer,this.camera);
    const hit = this.ray.intersectObjects([...this.records.values()].map(r=>r.object), true)[0];
    let object = hit?.object;
    while (object) {
      if (object.userData.buildingKey) return object.userData.buildingKey;
      object = object.parent;
    }
    return null;
  }
  mark() {
    const r = this.records.get(this.hover ?? this.selected);
    this.canvas.style.cursor = this.hover ? 'pointer' : 'grab';
    this.highlight.visible = !!r;
    this.label.hidden = !r || !this.active;
    if (!r) return;
    const b = r.box, y = b.min.y + 0.08;
    this.highlight.geometry.dispose();
    this.highlight.geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(b.min.x-0.5,y,b.min.z-0.5),new THREE.Vector3(b.max.x+0.5,y,b.min.z-0.5),
      new THREE.Vector3(b.max.x+0.5,y,b.max.z+0.5),new THREE.Vector3(b.min.x-0.5,y,b.max.z+0.5),
    ]);
    this.label.textContent = r.item.label;
  }
  render(dt) {
    if (!this.active || !this.group) return;
    this.resize(); this.flight.update(dt); this.camera.lookAt(this.controls.target); this.camera.updateMatrixWorld();
    const r = this.records.get(this.hover ?? this.selected);
    if (r) {
      const p = r.box.getCenter(new THREE.Vector3()); p.y = r.box.max.y + 1;
      p.project(this.camera);
      this.label.hidden = p.z > 1 || p.z < -1;
      this.label.style.left = Math.max(8, Math.min(innerWidth-180,(p.x+1)*innerWidth/2)) + 'px';
      this.label.style.top = Math.max(50,(1-p.y)*innerHeight/2-28) + 'px';
    }
    this.renderer.render(this.world,this.camera);
  }
}
