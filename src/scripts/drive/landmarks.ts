// Low-poly landmarks built from primitives (no model files). Each builder
// returns a group centered on its own origin, local circle colliders, and the
// height used to place its floating label.
import * as THREE from 'three';
import type { LandmarkModel } from '../../data/drive';

export interface Built { group: THREE.Group; colliders: [number, number, number][]; height: number }

const cache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: number, opts: THREE.MeshStandardMaterialParameters = {}) {
  const key = `${color}:${JSON.stringify(opts)}`;
  let m = cache.get(key);
  if (!m) cache.set(key, (m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...opts })));
  return m;
}
export function disposeMaterials() {
  cache.forEach((m) => m.dispose());
  cache.clear();
}

const C = {
  steel: 0xd9dde2, stone: 0xcfc6b4, sand: 0xe0c58f, copper: 0x7fbfa8, red: 0xc23b2a,
  white: 0xf4f1ea, marble: 0xf7f3ec, granite: 0x9c958c, bronze: 0x7a6247, cream: 0xf3e6c4,
  orange: 0xf06a2a, gold: 0xe2b33c, slate: 0x4f5a66, glass: 0x9fc6d8, dark: 0x2a2a2e, water: 0x6fb3c9,
};

function mesh(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, opts?: THREE.MeshStandardMaterialParameters) {
  const m = new THREE.Mesh(geo, mat(color, opts));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);

// ---- US ------------------------------------------------------------------

function arch(): Built {
  const g = new THREE.Group();
  // Weighted catenary, 192 m wide and tall in real life; here 34 x 38.
  const pts: THREE.Vector3[] = [];
  const half = 17, H = 38, a = 9.5;
  const k = H / (Math.cosh(half / a) - 1);
  for (let i = 0; i <= 40; i++) {
    const x = -half + (i / 40) * half * 2;
    pts.push(new THREE.Vector3(x, H - k * (Math.cosh(x / a) - 1), 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 80, 1, 3, false);
  // Taper the legs: thicker near the ground.
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = 1 + (1 - v.y / H) * 0.9;
    const c = curve.getPointAt(Math.min(1, Math.max(0, (v.x + half) / (half * 2))));
    pos.setXYZ(i, c.x + (v.x - c.x) * t, c.y + (v.y - c.y) * t, v.z * t);
  }
  geo.computeVertexNormals();
  g.add(mesh(geo, 0xe4e8ec, 0, 0, 0, { metalness: 0.35, roughness: 0.3 }));
  g.rotation.y = Math.PI / 2;
  const wrap = new THREE.Group();
  wrap.add(g);
  return { group: wrap, colliders: [[0, -17, 2.2], [0, 17, 2.2]], height: 44 };
}

function liberty(): Built {
  const g = new THREE.Group();
  g.add(mesh(box(12, 3, 12), C.stone, 0, 1.5, 0));
  g.add(mesh(cyl(4.2, 5, 7, 4), C.stone, 0, 6.5, 0));
  g.children[1].rotation.y = Math.PI / 4;
  g.add(mesh(cyl(1.6, 2.6, 9, 7), C.copper, 0, 14.5, 0));
  g.add(mesh(new THREE.IcosahedronGeometry(1.1, 0), C.copper, 0, 19.8, 0));
  for (let i = 0; i < 7; i++) {
    const s = mesh(new THREE.ConeGeometry(0.22, 1.3, 4), C.copper);
    const ang = -Math.PI * 0.85 + (i / 6) * Math.PI * 0.7;
    s.position.set(Math.sin(ang) * 1.1, 20.6, Math.cos(ang) * 1.1);
    s.lookAt(Math.sin(ang) * 3, 22, Math.cos(ang) * 3);
    s.rotateX(Math.PI / 2);
    g.add(s);
  }
  const arm = mesh(cyl(0.45, 0.55, 6, 5), C.copper, 1.6, 21, 0);
  arm.rotation.z = -0.2;
  g.add(arm);
  g.add(mesh(cyl(0.6, 0.35, 1.2, 6), C.gold, 2.2, 24.4, 0));
  g.add(mesh(new THREE.ConeGeometry(0.55, 1.4, 5), C.orange, 2.2, 25.6, 0, { emissive: 0xff7a1a, emissiveIntensity: 1.2 }));
  const tablet = mesh(box(1.4, 2, 0.4), C.copper, -1.9, 15, 0.8);
  tablet.rotation.z = 0.25;
  g.add(tablet);
  return { group: g, colliders: [[0, 0, 8.4]], height: 30 };
}

function goldengate(): Built {
  const g = new THREE.Group();
  const span = 28, towerH = 22, deckY = 6;
  // Water underneath.
  const water = new THREE.Mesh(new THREE.PlaneGeometry(70, 16), mat(C.water, { roughness: 0.2, metalness: 0.1 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.04;
  water.receiveShadow = true;
  g.add(water);
  for (const x of [-span / 2, span / 2]) {
    for (const z of [-2.6, 2.6]) g.add(mesh(box(1.4, towerH, 1.4), C.red, x, towerH / 2, z));
    for (const y of [deckY + 4, deckY + 10, towerH - 1]) g.add(mesh(box(1.1, 1.2, 5.2), C.red, x, y, 0));
  }
  g.add(mesh(box(span * 2 + 10, 0.9, 5), C.red, 0, deckY, 0));
  // Main cables and suspenders.
  for (const z of [-2.6, 2.6]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 30; i++) {
      const x = -span / 2 + (i / 30) * span;
      const t = (x / (span / 2)) ** 2;
      pts.push(new THREE.Vector3(x, deckY + 1.5 + (towerH - deckY - 1.5) * t, z));
    }
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.18, 4), C.red));
    for (const side of [-1, 1]) {
      const p = [new THREE.Vector3(side * span / 2, towerH, z), new THREE.Vector3(side * (span / 2 + 14), deckY + 1, z)];
      g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 4, 0.18, 4), C.red));
    }
    for (let i = 1; i < 12; i++) {
      const x = -span / 2 + (i / 12) * span;
      const top = deckY + 1.5 + (towerH - deckY - 1.5) * (x / (span / 2)) ** 2;
      g.add(mesh(box(0.08, top - deckY, 0.08), C.red, x, (top + deckY) / 2, z));
    }
  }
  return { group: g, colliders: [[-span / 2, -2.6, 1.3], [-span / 2, 2.6, 1.3], [span / 2, -2.6, 1.3], [span / 2, 2.6, 1.3]], height: 28 };
}

function rushmore(): Built {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(18, 1);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const n = 1 + Math.sin(p.getX(i) * 0.7) * 0.06 + Math.cos(p.getZ(i) * 0.5) * 0.06;
    p.setXYZ(i, p.getX(i) * n, Math.max(-2, y) * 0.75, p.getZ(i) * n);
  }
  geo.computeVertexNormals();
  g.add(mesh(geo, C.granite, 0, 0, 0));
  // Four faces looking south (+z), toward the road.
  [-7, -2.5, 2, 6.5].forEach((x, i) => {
    const y = 6 + (i === 0 ? 1 : i === 3 ? -1 : 0.5);
    const zFace = Math.sqrt(Math.max(0, 17 ** 2 - x * x - (y / 0.75) ** 2)) * 0.98;
    g.add(mesh(new THREE.DodecahedronGeometry(2.1, 0), 0xb9b2a8, x, y, zFace));
    g.add(mesh(box(1.2, 1.4, 1.2), 0xb9b2a8, x, y - 2, zFace + 0.4));
  });
  g.rotation.y = -0.35;
  return { group: g, colliders: [[0, 0, 17]], height: 22 };
}

function needle(): Built {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = mesh(cyl(0.45, 0.9, 30, 5), C.white, Math.sin(a) * 2.2, 15, Math.cos(a) * 2.2);
    leg.rotation.set(Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12);
    g.add(leg);
  }
  g.add(mesh(cyl(1.2, 1.4, 31, 6), 0xe9e4da, 0, 15.5, 0));
  g.add(mesh(cyl(8, 3, 2.4, 12), C.white, 0, 31.5, 0));
  g.add(mesh(cyl(6.4, 7.4, 1.4, 12), C.glass, 0, 33.2, 0, { emissive: 0x6fb7d8, emissiveIntensity: 0.25 }));
  g.add(mesh(new THREE.ConeGeometry(6.8, 2.6, 12), C.orange, 0, 35.2, 0));
  g.add(mesh(cyl(0.12, 0.3, 8, 4), C.steel, 0, 40, 0));
  g.add(mesh(cyl(4, 5, 1.2, 8), C.stone, 0, 0.6, 0));
  return { group: g, colliders: [[0, 0, 4.6]], height: 46 };
}

// ---- World ---------------------------------------------------------------

function pyramids(): Built {
  const g = new THREE.Group();
  const make = (r: number, h: number, x: number, z: number) => {
    const p = mesh(new THREE.ConeGeometry(r, h, 4), C.sand, x, h / 2, z);
    p.rotation.y = Math.PI / 4;
    g.add(p);
  };
  make(15, 19, -6, -2);
  make(11, 14, 14, 4);
  make(7, 9, -22, 9);
  // A small sphinx, facing the road.
  g.add(mesh(box(2.4, 2.2, 7), 0xd2b37a, 6, 1.1, 14));
  g.add(mesh(box(2.2, 2.4, 2.2), 0xd2b37a, 6, 3, 17));
  g.add(mesh(new THREE.ConeGeometry(1.6, 1.6, 4), 0x3b6c8f, 6, 4.6, 17));
  return { group: g, colliders: [[-6, -2, 11], [14, 4, 8], [-22, 9, 5], [6, 15, 2.5]], height: 24 };
}

function clockFace(): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#f3e6c4'; x.beginPath(); x.arc(64, 64, 60, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#2a2420'; x.lineWidth = 5; x.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    x.fillRect(64 + Math.sin(a) * 48 - 2, 64 - Math.cos(a) * 48 - 2, 4, 4);
  }
  x.lineWidth = 5; x.lineCap = 'round';
  x.beginPath(); x.moveTo(64, 64); x.lineTo(64, 28); x.stroke();
  x.beginPath(); x.moveTo(64, 64); x.lineTo(90, 70); x.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.CircleGeometry(2.1, 20), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xfff2c8, emissiveIntensity: 0.25, emissiveMap: tex }));
}

function bigben(): Built {
  const g = new THREE.Group();
  g.add(mesh(box(6.5, 26, 6.5), 0xc9b48a, 0, 13, 0));
  for (let i = 1; i < 6; i++) g.add(mesh(box(6.9, 0.4, 6.9), 0xb39c70, 0, i * 4.3, 0));
  g.add(mesh(box(7.6, 6, 7.6), 0xd8c49a, 0, 29, 0));
  for (let i = 0; i < 4; i++) {
    const f = clockFace();
    const a = (i / 4) * Math.PI * 2;
    f.position.set(Math.sin(a) * 3.82, 29, Math.cos(a) * 3.82);
    f.rotation.y = a;
    g.add(f);
  }
  g.add(mesh(box(6.2, 4, 6.2), 0xc9b48a, 0, 34, 0));
  const roof = mesh(new THREE.ConeGeometry(4.8, 9, 4), 0x4b5a4f, 0, 40.5, 0);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  g.add(mesh(cyl(0.08, 0.25, 4, 4), C.gold, 0, 46.5, 0));
  // Palace of Westminster wing.
  g.add(mesh(box(26, 9, 8), 0xc9b48a, -17, 4.5, 0));
  for (let i = 0; i < 9; i++) g.add(mesh(new THREE.ConeGeometry(0.6, 2.4, 4), 0x4b5a4f, -29 + i * 3, 10.2, 3.6));
  return { group: g, colliders: [[0, 0, 5], [-8, 0, 4.5], [-17, 0, 4.5], [-26, 0, 4.5]], height: 50 };
}

function eiffel(): Built {
  const g = new THREE.Group();
  const iron = 0x6e5a43;
  // Four splayed legs.
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = mesh(box(1.6, 15, 1.6), iron);
    leg.position.set(sx * 5.2, 7, sz * 5.2);
    leg.rotation.set(-sz * 0.42, 0, sx * 0.42);
    g.add(leg);
  }
  // Arches between the legs.
  for (let i = 0; i < 4; i++) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.35, 4, 12, Math.PI), mat(iron));
    a.position.y = 0.2;
    const ang = (i / 4) * Math.PI * 2;
    a.position.x = Math.sin(ang) * 7.6; a.position.z = Math.cos(ang) * 7.6;
    a.rotation.y = ang + Math.PI / 2;
    a.castShadow = true;
    g.add(a);
  }
  g.add(mesh(box(11, 1, 11), iron, 0, 13.5, 0));
  const mid = mesh(cyl(2.4, 5.2, 13, 4), iron, 0, 20.5, 0);
  mid.rotation.y = Math.PI / 4;
  g.add(mid);
  g.add(mesh(box(5.2, 0.7, 5.2), iron, 0, 27.2, 0));
  const top = mesh(cyl(0.5, 2.4, 16, 4), iron, 0, 35.5, 0);
  top.rotation.y = Math.PI / 4;
  g.add(top);
  g.add(mesh(box(1.4, 1.4, 1.4), C.gold, 0, 44, 0, { emissive: 0xffcc66, emissiveIntensity: 0.6 }));
  g.add(mesh(cyl(0.08, 0.15, 3, 4), C.steel, 0, 46, 0));
  // Sidewalk café: tables and striped umbrellas.
  for (let i = 0; i < 4; i++) {
    const x = -10 + (i % 2) * 5, z = 10 + Math.floor(i / 2) * 4.5;
    g.add(mesh(cyl(0.7, 0.7, 0.12, 8), C.white, x, 1.0, z));
    g.add(mesh(cyl(0.08, 0.08, 1, 4), C.dark, x, 0.5, z));
    g.add(mesh(cyl(0.06, 0.06, 2.4, 4), C.dark, x, 1.8, z));
    g.add(mesh(new THREE.ConeGeometry(1.8, 0.8, 8), i % 2 ? C.red : C.white, x, 3.1, z));
  }
  g.add(mesh(box(7, 3.6, 3.4), C.cream, -7.5, 1.8, 18.5));
  g.add(mesh(box(7.4, 0.5, 4.4), C.red, -7.5, 3.3, 19.4));
  return { group: g, colliders: [[-5.6, -5.6, 1.4], [5.6, -5.6, 1.4], [-5.6, 5.6, 1.4], [5.6, 5.6, 1.4], [-7.5, 18.5, 3.8]], height: 50 };
}

function colosseum(): Built {
  const g = new THREE.Group();
  const rx = 15, rz = 11.5, N = 34;
  const pillar = box(1.1, 4, 1.1);
  for (let tier = 0; tier < 3; tier++) {
    const y = 2 + tier * 4.4;
    // The south-east chunk has collapsed, as in the real one.
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      if (tier > 0 && a > 0.2 && a < 1.0 + tier * 0.25) continue;
      const p = new THREE.Mesh(pillar, mat(0xd8c3a0));
      p.position.set(Math.cos(a) * rx, y, Math.sin(a) * rz);
      p.rotation.y = -a;
      p.castShadow = true;
      g.add(p);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 3, 48, tier === 0 ? Math.PI * 2 : Math.PI * 2 - (0.9 + tier * 0.25)), mat(0xcbb38c));
    ring.scale.set(rx, rz, 7);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = tier === 0 ? 0 : 1.0 + tier * 0.25;
    ring.position.y = y + 2.2;
    g.add(ring);
  }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 24), mat(0xc9a875));
  floor.scale.set(rx - 4, rz - 4, 1);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.08;
  floor.receiveShadow = true;
  g.add(floor);
  return { group: g, colliders: [[0, 0, 13.8]], height: 20 };
}

function onionDome(r: number, color: number) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const w = Math.sin(t * Math.PI) * (1 + 0.25 * Math.sin(t * Math.PI * 0.9)) * (1 - t * 0.85);
    pts.push(new THREE.Vector2(Math.max(0.02, w * r), t * r * 2.1));
  }
  return mesh(new THREE.LatheGeometry(pts, 12), color);
}

function taj(): Built {
  const g = new THREE.Group();
  g.add(mesh(box(30, 1.6, 30), 0xeee6d8, 0, 0.8, 0));
  const main = mesh(cyl(9.2, 9.2, 12, 8), C.marble, 0, 7.6, 0);
  main.rotation.y = Math.PI / 8;
  g.add(main);
  g.add(mesh(box(5, 9, 0.6), 0xe2d8c6, 0, 6.6, 9));
  g.add(mesh(cyl(4.3, 4.3, 3, 12), C.marble, 0, 15, 0));
  const dome = onionDome(5.6, C.marble);
  dome.position.y = 15.5;
  g.add(dome);
  g.add(mesh(cyl(0.08, 0.2, 3, 4), C.gold, 0, 28.5, 0));
  for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
    const d = onionDome(1.6, C.marble);
    d.position.set(x, 13.6, z);
    g.add(d);
    g.add(mesh(cyl(1.4, 1.4, 1.2, 8), C.marble, x, 13.6, z));
  }
  for (const [x, z] of [[-13.5, -13.5], [13.5, -13.5], [-13.5, 13.5], [13.5, 13.5]]) {
    g.add(mesh(cyl(0.75, 0.95, 16, 8), C.marble, x, 9.6, z));
    for (const y of [6, 11, 16]) g.add(mesh(cyl(1.2, 1.2, 0.4, 8), 0xe2d8c6, x, y, z));
    const d = onionDome(0.9, C.marble);
    d.position.set(x, 17.6, z);
    g.add(d);
  }
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 14), mat(C.water, { roughness: 0.1, metalness: 0.2 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.05, 23);
  g.add(pool);
  return { group: g, colliders: [[0, 0, 15.5], [-13.5, -13.5, 1.2], [13.5, 13.5, 1.2]], height: 32 };
}

function opera(): Built {
  const g = new THREE.Group();
  g.add(mesh(box(34, 2.4, 20), 0xd6c2a6, 0, 1.2, 0));
  const shell = (s: number, x: number, z: number, ry: number) => {
    const geo = new THREE.SphereGeometry(s, 10, 6, 0, Math.PI, 0, Math.PI / 2);
    const m = mesh(geo, C.white, x, 2.4, z);
    m.scale.set(0.55, 1.25, 1);
    m.rotation.set(0, ry, -0.35);
    g.add(m);
  };
  shell(9, -8, -3, Math.PI / 2);
  shell(7.4, -1, -3, Math.PI / 2);
  shell(5.6, 5, -3, Math.PI / 2);
  shell(6.4, -5, 5, Math.PI / 2);
  shell(4.6, 1, 5, Math.PI / 2);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 18), mat(C.water, { roughness: 0.2, metalness: 0.1 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.04, 17);
  water.receiveShadow = true;
  g.add(water);
  return { group: g, colliders: [[-10, 0, 9], [0, 0, 9], [10, 0, 9]], height: 18 };
}

function pisa(): Built {
  const g = new THREE.Group();
  const tower = new THREE.Group();
  const tiers = 7, h = 3.6;
  tower.add(mesh(cyl(3.6, 3.8, h, 14), C.marble, 0, h / 2, 0));
  for (let i = 1; i < tiers; i++) {
    tower.add(mesh(cyl(3.3, 3.3, h, 14), C.marble, 0, h / 2 + i * h, 0));
    tower.add(mesh(cyl(3.75, 3.75, 0.35, 14), 0xe2d8c6, 0, i * h, 0));
    for (let j = 0; j < 14; j++) {
      const a = (j / 14) * Math.PI * 2;
      tower.add(mesh(cyl(0.14, 0.14, h - 0.4, 4), 0xe9e2d4, Math.cos(a) * 3.6, i * h + h / 2, Math.sin(a) * 3.6));
    }
  }
  tower.add(mesh(cyl(2.4, 2.6, 3, 12), C.marble, 0, tiers * h + 1.5, 0));
  tower.rotation.z = -0.09;
  g.add(tower);
  g.add(mesh(box(14, 3, 6), C.marble, -12, 1.5, 4));
  g.add(mesh(cyl(4.4, 4.4, 0.4, 14), 0xbfe0b0, 0, 0.2, 0));
  return { group: g, colliders: [[0, 0, 4.4], [-12, 4, 4]], height: 34 };
}

function tokyo(): Built {
  const g = new THREE.Group();
  const sections = [[7.2, 5.4], [5.4, 4], [4, 3], [3, 2.2], [2.2, 1.5], [1.5, 0.9], [0.9, 0.4]];
  let y = 0;
  sections.forEach(([rb, rt], i) => {
    const h = 6;
    const s = mesh(cyl(rt, rb, h, 4), i % 2 ? C.white : C.orange, 0, y + h / 2, 0);
    s.rotation.y = Math.PI / 4;
    g.add(s);
    // Lattice frame for a see-through look.
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(s.geometry), new THREE.LineBasicMaterial({ color: 0x3a1f14 }));
    edges.position.copy(s.position);
    edges.rotation.copy(s.rotation);
    g.add(edges);
    y += h;
    if (i === 2 || i === 4) g.add(mesh(box(rt * 2.4, 1.6, rt * 2.4), C.glass, 0, y, 0, { emissive: 0x9fd0ff, emissiveIntensity: 0.3 }));
  });
  g.add(mesh(cyl(0.08, 0.2, 6, 4), C.steel, 0, y + 3, 0));
  return { group: g, colliders: [[0, 0, 6]], height: 50 };
}

const builders: Record<LandmarkModel, () => Built> = {
  arch, liberty, goldengate, rushmore, needle, pyramids, bigben, eiffel, colosseum, taj, opera, pisa, tokyo,
};

export function buildLandmark(id: LandmarkModel): Built {
  return builders[id]();
}
