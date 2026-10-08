// The car: a low-poly mesh (also used by the homepage teaser) and arcade
// physics. Heading 0 faces +z; forward = (sin h, cos h).
import * as THREE from 'three';

export interface CarMesh extends THREE.Group {
  userData: {
    body: THREE.Group;
    paint: THREE.MeshStandardMaterial;
    wheels: THREE.Mesh[];
    front: THREE.Object3D[];
    headlights: THREE.MeshStandardMaterial;
  };
}

export function buildCar(color: THREE.ColorRepresentation): CarMesh {
  const car = new THREE.Group() as CarMesh;
  const body = new THREE.Group();
  car.add(body);

  const paint = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.35, metalness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1c20, flatShading: true, roughness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x223040, flatShading: true, roughness: 0.1, metalness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.25, metalness: 0.9 });
  const headlights = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xfff1c4, emissiveIntensity: 0.6 });
  const tail = new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff2a1f, emissiveIntensity: 0.8 });

  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    body.add(m);
    return m;
  };

  // Chassis, hood, and cabin.
  box(2.2, 0.55, 4.3, paint, 0, 0.72, 0);
  box(2.0, 0.22, 1.3, paint, 0, 1.08, 1.35).rotation.x = 0.08;
  const cabin = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 1.12, 0.62, 4, 1), glass);
  cabin.rotation.y = Math.PI / 4;
  cabin.scale.set(1.25, 1, 1.55);
  cabin.position.set(0, 1.3, -0.35);
  cabin.castShadow = true;
  body.add(cabin);
  box(1.55, 0.08, 1.45, paint, 0, 1.64, -0.4);
  // Bumpers, lights, spoiler, and a racing stripe.
  box(2.26, 0.3, 0.25, dark, 0, 0.55, 2.18);
  box(2.26, 0.3, 0.25, dark, 0, 0.55, -2.18);
  const hl = new THREE.BoxGeometry(0.5, 0.18, 0.08);
  [-0.68, 0.68].forEach((x) => {
    const h = new THREE.Mesh(hl, headlights); h.position.set(x, 0.82, 2.16); body.add(h);
    const t = new THREE.Mesh(hl, tail); t.position.set(x, 0.82, -2.16); body.add(t);
  });
  box(0.36, 0.02, 4.32, new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }), 0, 1.0, 0);
  box(0.1, 0.35, 0.1, dark, -0.7, 1.15, -1.95);
  box(0.1, 0.35, 0.1, dark, 0.7, 1.15, -1.95);
  box(1.9, 0.07, 0.42, paint, 0, 1.34, -2.0);
  box(0.12, 0.12, 0.3, chrome, -0.55, 0.4, -2.3);

  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.42, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.44, 6);
  hubGeo.rotateZ(Math.PI / 2);
  const wheels: THREE.Mesh[] = [];
  const front: THREE.Object3D[] = [];
  for (const [x, z] of [[-1.08, 1.38], [1.08, 1.38], [-1.08, -1.38], [1.08, -1.38]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.46, z);
    const w = new THREE.Mesh(wheelGeo, dark);
    w.castShadow = true;
    w.add(new THREE.Mesh(hubGeo, chrome));
    pivot.add(w);
    car.add(pivot);
    wheels.push(w);
    if (z > 0) front.push(pivot);
  }

  car.userData = { body, paint, wheels, front, headlights };
  return car;
}

export interface Input { throttle: number; steer: number; brake: boolean; boost: boolean }

const ACCEL = 22;
const MAX = 34;
const MAX_BOOST = 50;
const MAX_REV = 12;
const TURN = 2.3;
const GRAVITY = 30;

export class CarPhysics {
  x = 0; z = 0; y = 0;
  vx = 0; vz = 0; vy = 0;
  h = 0;
  steer = 0;
  wheelSpin = 0;
  lean = 0;
  pitch = 0;
  readonly radius = 1.9;

  get speed() { return Math.hypot(this.vx, this.vz); }
  get forward() { return Math.sin(this.h) * this.vx + Math.cos(this.h) * this.vz; }
  /** Set while driving up a ramp, so ramps count as ground. */
  onRamp = false;
  get airborne() { return !this.onRamp && (this.y > 0.05 || this.vy > 0); }

  place(x: number, z: number, h: number) {
    this.x = x; this.z = z; this.h = h;
    this.y = this.vx = this.vz = this.vy = 0;
  }

  update(dt: number, inp: Input) {
    const fx = Math.sin(this.h), fz = Math.cos(this.h);
    const rx = Math.cos(this.h), rz = -Math.sin(this.h);
    let fwd = this.vx * fx + this.vz * fz;
    let lat = this.vx * rx + this.vz * rz;
    const air = this.airborne;
    const grip = air ? 0.2 : 1;

    // Throttle, reverse, brake, drag.
    const max = inp.boost ? MAX_BOOST : MAX;
    if (inp.throttle > 0) fwd += inp.throttle * ACCEL * (inp.boost ? 1.6 : 1) * dt * grip * (fwd < 0 ? 2 : 1);
    else if (inp.throttle < 0) fwd += inp.throttle * (fwd > 0 ? ACCEL * 1.8 : ACCEL * 0.7) * dt * grip;
    if (inp.brake && !air) fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd), 26 * dt);
    fwd -= fwd * (inp.throttle === 0 ? 0.9 : 0.25) * dt * grip;
    if (fwd > max) fwd = Math.max(max, fwd - 30 * dt);
    if (fwd < -MAX_REV) fwd = -MAX_REV;

    // Steering scales with speed; holding the brake loosens grip for drifts.
    this.steer += (inp.steer - this.steer) * Math.min(1, dt * 10);
    const turnScale = Math.max(-1, Math.min(1, fwd / 7)) * (1 - 0.35 * Math.min(1, Math.abs(fwd) / MAX_BOOST));
    this.h -= this.steer * TURN * turnScale * dt * (air ? 0.3 : 1) * (inp.brake ? 1.35 : 1);
    lat *= Math.exp(-dt * (air ? 0.5 : inp.brake ? 1.6 : 9));

    const nfx = Math.sin(this.h), nfz = Math.cos(this.h);
    const nrx = Math.cos(this.h), nrz = -Math.sin(this.h);
    this.vx = nfx * fwd + nrx * lat;
    this.vz = nfz * fwd + nrz * lat;
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Vertical: jumps from ramps.
    if (air) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; }
    }

    this.wheelSpin += fwd * dt / 0.46;
    this.lean += ((-this.steer * Math.min(1, Math.abs(fwd) / 25) * 0.08 + lat * 0.01) - this.lean) * Math.min(1, dt * 6);
    const accelPitch = inp.throttle > 0 ? -0.025 : inp.brake || inp.throttle < 0 ? 0.035 : 0;
    this.pitch += ((air ? -this.vy * 0.01 : accelPitch) - this.pitch) * Math.min(1, dt * 5);
    return fwd;
  }

  /** Copy state onto the mesh. */
  sync(mesh: CarMesh, groundY = 0) {
    mesh.position.set(this.x, this.y + groundY, this.z);
    mesh.rotation.y = this.h;
    mesh.userData.body.rotation.set(this.pitch, 0, this.lean);
    for (const w of mesh.userData.wheels) w.rotation.x = this.wheelSpin;
    for (const f of mesh.userData.front) f.rotation.y = -this.steer * 0.45;
  }
}
