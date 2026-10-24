import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, OrthographicCamera, Raycaster, Vector2, Vector3 } from 'three';
import { createPlanetEnvironment } from '../client/js/planetEnvironment.js';
import { fitDioramaCamera, buildingViewDirection } from '../client/js/planetCamera.js';

const base = new URL('../client/assets/models/planets/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', base)));
const sizes = [[390, 844], [1024, 768], [1440, 900], [1920, 1080], [2560, 1080]];

for (const descriptor of manifest.assets) test(`${descriptor.planet_type}: separates scenery, retains anchors and covers viewport limits`, async () => {
  const buffer = fs.readFileSync(new URL(descriptor.glb, base));
  const { scene } = await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
  const layout = JSON.parse(fs.readFileSync(new URL(descriptor.layout, base)));
  const original = scene.clone(true);
  const bounds = new Box3().setFromObject(scene);
  const geometryBefore = new Map();
  scene.traverse(o => { if (o.isMesh) geometryBefore.set(o.uuid, o.geometry); });
  const environment = createPlanetEnvironment(scene, descriptor.planet_type);
  environment.updateMatrixWorld(true);
  assert.equal(environment.parent, null);
  assert.equal(environment.userData.interactive, false);
  if (!['ocean', 'gasgiant'].includes(descriptor.planet_type)) assert.ok(environment.userData.boundaryEdges > 100);
  for (const slot of layout.slots) {
    assert.deepEqual(scene.getObjectByName(slot.node).position.toArray(), original.getObjectByName(slot.node).position.toArray());
  }
  original.traverse(o => { if (o.isMesh) assert.ok([...geometryBefore.values()].includes(o.geometry)); });
  const ray = new Raycaster();
  for (const [width, height] of sizes) {
    const area = { x: width > 1100 ? 316 : 12, y: 140, width: Math.max(140, width - (width > 1100 ? 700 : 24)), height: Math.max(120, height - 400) };
    const overview = fitDioramaCamera(bounds, width, height, area);
    const anchor = new Vector3().fromArray(layout.slots[0].position);
    const focus = fitDioramaCamera(new Box3(anchor.clone().addScalar(-8), anchor.clone().addScalar(8)), width, height, area, buildingViewDirection(), 80);
    const camera = new OrthographicCamera(-50 * width / height, 50 * width / height, 50, -50, 0.1, 20000);
    camera.setViewOffset(width, height, width / 2 - (area.x + area.width / 2), height / 2 - (area.y + area.height / 2), width, height);
    for (const [pose, offset] of [[overview, 24], [overview, -24], [focus, 8], [focus, -8]]) {
      camera.position.copy(pose.position).add(new Vector3(offset, 0, -offset));
      camera.lookAt(pose.target.clone().add(new Vector3(offset, 0, -offset)));
      camera.zoom = pose.zoom * 0.85;
      camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
      for (const [x, y] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        ray.setFromCamera(new Vector2(x, y), camera);
        assert.ok(ray.intersectObject(environment, true).length || ray.intersectObject(scene, true).length, `${width}×${height} ${offset} (${x},${y})`);
      }
    }
  }
  environment.userData.dispose();
});
