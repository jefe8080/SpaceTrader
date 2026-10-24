import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const ENVIRONMENT_RADIUS = 5000;
const SEA = new Set(['ocean', 'resort']);

/** Far scenery is deliberately separate from playable bounds, anchors and picking. */
export function createPlanetEnvironment(ground, type) {
  const group = new THREE.Group();
  group.name = 'planet_environment';
  group.userData.interactive = false;
  const owned = new Set();
  const keep = (resource) => { owned.add(resource); return resource; };
  const materials = [];
  ground.traverse((object) => {
    if (object.isMesh) materials.push(...(Array.isArray(object.material) ? object.material : [object.material]));
  });
  const find = (suffix, fallback) => materials.find((m) => m.name?.endsWith('_' + suffix))?.color ?? new THREE.Color(fallback);
  const surface = (color) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide }));
  const plane = (height, material) => {
    const mesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(ENVIRONMENT_RADIUS * 2, ENVIRONMENT_RADIUS * 2)), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = height;
    mesh.receiveShadow = false;
    group.add(mesh);
    return mesh;
  };

  if (type === 'gasgiant') {
    // Opaque deep cloud deck plus two translucent layers, all below the platforms.
    for (const [height, opacity, offset] of [[-65, 1, 0], [-43, 0.42, 31], [-24, 0.28, 77]]) {
      const material = keep(new THREE.ShaderMaterial({
        transparent: opacity < 1, depthWrite: opacity === 1, side: THREE.DoubleSide,
        uniforms: { opacity: { value: opacity }, offset: { value: offset } },
        vertexShader: 'varying vec2 worldXZ; void main(){vec4 p=modelMatrix*vec4(position,1.);worldXZ=p.xz;gl_Position=projectionMatrix*viewMatrix*p;}',
        fragmentShader: `varying vec2 worldXZ; uniform float opacity; uniform float offset;
          void main(){ vec2 p=worldXZ*.018+offset;
            float bands=sin(p.y+sin(p.x*.6)*1.4)*.5+.5;
            float curls=sin(p.x*2.+cos(p.y*1.8))*sin(p.y*2.7+p.x*.5)*.5+.5;
            vec3 color=mix(vec3(.28,.25,.30),vec3(.78,.64,.48),bands*.65+curls*.35);
            gl_FragColor=vec4(color,opacity);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }));
      plane(height, material);
    }
  } else {
    if (SEA.has(type)) {
      const water = surface(find('water', 0x237891));
      // Same level as the existing ocean, just above its bounded water mesh.
      plane(-0.159, water);
      const lines = keep(new THREE.BufferGeometry());
      const vertices = [];
      for (let z = -1200; z <= 1200; z += 23) for (let x = -1200; x <= 1200; x += 47) {
        const shift = Math.sin(z * 0.07 + x) * 11;
        if (Math.abs(x) < 105 && Math.abs(z) < 100) continue;
        vertices.push(x + shift, -0.14, z, x + shift + 9, -0.14, z + 0.4);
      }
      lines.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      group.add(new THREE.LineSegments(lines, keep(new THREE.LineBasicMaterial({ color: 0x84bfbd, transparent: true, opacity: 0.28 }))));
    }
    if (type !== 'ocean') {
      const edges = [];
      ground.updateMatrixWorld(true);
      ground.traverse((object) => {
        if (!object.isMesh) return;
        let parent = object;
        while (parent && !parent.name.includes('__Terrain')) parent = parent.parent;
        if (!parent) return;
        const geometry = object.geometry, positions = geometry.attributes.position, index = geometry.index;
        const kept = [], count = index?.count ?? positions.count;
        for (let i = 0; i < count; i += 3) {
          const ids = [0, 1, 2].map((j) => index ? index.getX(i + j) : i + j);
          const points = ids.map((id) => new THREE.Vector3().fromBufferAttribute(positions, id).applyMatrix4(object.matrixWorld));
          const bottom = points.filter((p) => Math.abs(p.y + 5) < 0.001);
          if (bottom.length && bottom.length < 3) {
            const top = points.filter((p) => Math.abs(p.y + 5) >= 0.001);
            if (top.length === 2) edges.push(top);
          } else kept.push(...ids);
        }
        if (kept.length !== count) {
          // Never alter cached GLTF geometry shared by other visits/planets.
          const clone = keep(geometry.clone());
          clone.setIndex(kept);
          object.geometry = clone;
        }
      });
      const positions = [], colors = [];
      const color = find('ground', 0x76826a);
      const rings = type === 'resort' ? [1, 1.3] : [1, 1.2, 1.4, 1.8, 2.4, 3, 4, 5, 7, 10, 15, 25, 50, 80];
      const point = (edge, factor) => {
        const x = edge.x * factor, z = edge.z * factor;
        const blend = Math.min(1, factor - 1);
        const y = type === 'resort' ? (factor === 1 ? edge.y : -0.17)
          : edge.y * (1 - blend) + blend * (3 + 3 * Math.sin(x * 0.018) * Math.cos(z * 0.022));
        return new THREE.Vector3(x, y, z);
      };
      for (const edge of edges) for (let band = 0; band < rings.length - 1; band++) {
        const a = point(edge[0], rings[band]), b = point(edge[1], rings[band]);
        const c = point(edge[1], rings[band + 1]), d = point(edge[0], rings[band + 1]);
        const upward = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).y >= 0;
        for (const p of (upward ? [a, b, c, a, c, d] : [a, c, b, a, d, c])) {
          positions.push(p.x, p.y, p.z);
          const shade = band === 0 ? 1 : 0.96 + 0.06 * Math.sin(p.x * 0.03 + p.z * 0.02);
          colors.push(color.r * shade, color.g * shade, color.b * shade);
        }
      }
      const raw = new THREE.BufferGeometry();
      raw.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      raw.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const geometry = keep(mergeVertices(raw)); raw.dispose();
      geometry.computeVertexNormals();
      const material = surface(0xffffff); material.vertexColors = true;
      group.add(new THREE.Mesh(geometry, material));
      group.userData.boundaryEdges = edges.length;
      if (type !== 'resort' && type !== 'ruins') {
        const wooded = ['agrar', 'jungle', 'colony'].includes(type);
        const decoration = new THREE.InstancedMesh(keep(wooded ? new THREE.ConeGeometry(3, 9, 5) : new THREE.DodecahedronGeometry(3, 0)),
          surface(find(wooded ? 'dark_leaf' : 'rock', 0x64705b)), 140);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < 140; i++) {
          const angle = i * 2.39996, radius = 140 + (i % 37) * 8;
          const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
          const height = 3 + 3 * Math.sin(x * 0.018) * Math.cos(z * 0.022);
          dummy.position.set(x, height + (wooded ? 4 : 0.5), z);
          dummy.scale.setScalar(0.7 + (i % 7) * 0.12); dummy.rotation.y = angle;
          dummy.updateMatrix(); decoration.setMatrixAt(i, dummy.matrix);
        }
        group.add(decoration);
      }
    }
  }
  // The far edge is well outside all supported overview/focus/pan states.
  group.userData.radius = ENVIRONMENT_RADIUS;
  group.userData.dispose = () => { for (const resource of owned) resource.dispose(); };
  return group;
}
