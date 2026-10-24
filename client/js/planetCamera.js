import { Vector3 } from 'three';

export const OVERVIEW_DIRECTION = new Vector3(78, 134, 185).normalize();

// Orthographic framing keeps the settlement readable as a 2.5D diorama.
export function fitDioramaCamera(box, width, height, area, direction = OVERVIEW_DIRECTION, minSpan = 0) {
  const target = box.getCenter(new Vector3()), d = direction.clone().normalize();
  const right = new Vector3(d.z, 0, -d.x).normalize();
  const up = new Vector3().crossVectors(d, right);
  let halfSpan = minSpan / 2;
  for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y]) for (const z of [box.min.z,box.max.z]) {
    const p = new Vector3(x,y,z).sub(target);
    halfSpan = Math.max(halfSpan, Math.abs(p.dot(right)) * height / Math.max(100,area.width),
      Math.abs(p.dot(up)) * height / Math.max(100,area.height));
  }
  const span = Math.max(1,halfSpan * 2 * 1.1);
  // Orthographic rays at the bottom edge must start above the continued ground,
  // even when UI panels force a wide overview in a portrait viewport.
  const distance = Math.max(260, span * 2 + 100);
  return {target, position:target.clone().addScaledVector(d,distance), zoom:100/span, span};
}
export function buildingViewDirection(rotationY = 0) {
  const yaw = rotationY + Math.PI / 24, elevation = Math.PI / 5;
  return new Vector3(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation));
}

export class CameraFlight {
  constructor(camera, controls) { this.camera = camera; this.controls = controls; this.flight = null; }
  move(pose, immediate = false) {
    if (immediate) {
      this.camera.position.copy(pose.position); this.controls.target.copy(pose.target);
      if (pose.zoom !== undefined) { this.camera.zoom = pose.zoom; this.camera.updateProjectionMatrix(); }
      this.flight = null; return;
    }
    this.flight = { from: this.camera.position.clone(), targetFrom: this.controls.target.clone(),
      to: pose.position.clone(), targetTo: pose.target.clone(), zoomFrom:this.camera.zoom, zoomTo:pose.zoom ?? this.camera.zoom, elapsed: 0 };
  }
  cancel() { this.flight = null; }
  update(dt) {
    const f = this.flight;
    if (!f) return;
    f.elapsed = Math.min(0.65, f.elapsed + dt);
    const k = 1 - Math.pow(1 - f.elapsed / 0.65, 3);
    this.camera.position.lerpVectors(f.from, f.to, k);
    this.controls.target.lerpVectors(f.targetFrom, f.targetTo, k);
    this.camera.zoom = Math.exp(Math.log(f.zoomFrom) + (Math.log(f.zoomTo)-Math.log(f.zoomFrom))*k);
    this.camera.updateProjectionMatrix();
    if (f.elapsed >= 0.65) this.flight = null;
  }
}
