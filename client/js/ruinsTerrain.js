import * as THREE from 'three';

const anchors = { dock: [-55, 0.35, 116], control: [-24, 0.35, 116], workshop: [7, 0.35, 116], questhouse: [40, 0.35, 116],
  waterworks: [-84, 0.35, -86], foodplant: [-42, 0.35, -86], fueldepot: [0, 0.35, -86], refinery: [42, 0.35, -86], smelter: [84, 0.35, -86],orbital:[74,.35,116] };

export function ruinsLayout() {
  const slots = Object.entries(anchors).map(([id, position]) => ({ id, node: `ruins__${id}`, position, rotation_y: 0, footprint: [22, 18], role: 'home' }));
  for (let i = 0; i < 48; i++) slots.push({ id: `plot_${i}`, node: `ruins__plot_${i}`,
    position: [-84 + (i % 8) * 24, 0.35, -49 + Math.floor(i / 8) * 27], rotation_y: 0, footprint: [20, 22], role: 'plot' });
  return { planet_type: 'ruins', terrain_root: 'planet_ruins', slots };
}

/** Transitional, code-native terrain; approved painted materials are completed in U16. */
export function createRuinsTerrain() {
  const ground = new THREE.Group(), root = new THREE.Group(); root.name = 'planet_ruins'; ground.add(root);
  const terrain = new THREE.Mesh(new THREE.BoxGeometry(224, 5.3, 274), new THREE.MeshStandardMaterial({ color: 0x78875e, roughness: 1 }));
  terrain.name = 'planet_ruins__Terrain'; terrain.position.set(0, -2.35, 15); root.add(terrain);
  terrain.material.name = 'Landscape_ruins_ground';
  const stone = new THREE.MeshStandardMaterial({ color: 0xa99b78, roughness: 1 });
  for (let i = 0; i < 12; i++) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(5, 9 + i % 4 * 3, 6), stone);
    pillar.position.set(i % 2 ? 104 : -104, (9 + i % 4 * 3) / 2 + 0.3, -106 + Math.floor(i / 2) * 45);
    pillar.rotation.z = (i % 3 - 1) * 0.06; root.add(pillar);
  }
  for (const slot of ruinsLayout().slots) {
    const anchor = new THREE.Object3D(); anchor.name = slot.node; anchor.position.fromArray(slot.position); root.add(anchor);
  }
  return ground;
}

export function planRuinsBuildings(items, layout, manifest) {
  const assignments = {}, used = new Set();
  const placements = items.map((item) => {
    const anchor = item.homeFacility || (item.homeOrbital?'orbital':item.kind === 'questhouse' ? 'questhouse' : `plot_${item.plotIndex}`);
    const slot = layout.slots.find((candidate) => candidate.id === anchor);
    const asset = manifest.assets.find((entry) => Object.entries(entry.selector).every(([key, value]) => item[key] === value));
    if (!slot || used.has(slot.id) || !asset) throw new Error(`Ungültiger Ruinenanker: ${anchor}`);
    used.add(slot.id); assignments[item.key] = slot.id;
    return { key: item.key, item, asset: asset.id, url: '/assets/models/' + asset.glb, position: slot.position, rotationY: 0, slotId: slot.id };
  });
  return { placements, assignments };
}
