// The island: ground, roads, the "ocean" lake and its bridge, trees, lamps,
// Resume Highway billboards, ramps, knock-over props, clouds, and stars.
import * as THREE from 'three';
import { world } from '../../data/drive';
import { mat } from './landmarks';

export type Circle = [x: number, z: number, r: number];
export interface Ramp { x: number; z: number; h: number; len: number; width: number; height: number }
export interface Prop { mesh: THREE.Mesh; x: number; z: number; y: number; vx: number; vz: number; vy: number; spin: THREE.Vector3; r: number; home: [number, number] }
export interface Board { x: number; z: number; title: string; lines: string[] }

export interface Palette {
  sky: number; ground: number; ground2: number; road: number; line: number; water: number; ocean: number; sand: number;
  sun: number; sunI: number; hemiSky: number; hemiGround: number; hemiI: number; night: boolean;
}

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    sky: 0xf2eee6, ground: 0xc9d4a8, ground2: 0xb6c48f, road: 0x4a4744, line: 0xf2eee6, water: 0x7dbfd2, ocean: 0x8cc6d6, sand: 0xeedcb0,
    sun: 0xfff3e0, sunI: 2.4, hemiSky: 0xfdf6ea, hemiGround: 0x8a8f6a, hemiI: 1.1, night: false,
  },
  dark: {
    sky: 0x0c0d12, ground: 0x243028, ground2: 0x1e2a22, road: 0x2c2c32, line: 0x8b877f, water: 0x123447, ocean: 0x0e2a3a, sand: 0x3a3527,
    sun: 0xa9bcff, sunI: 1.0, hemiSky: 0x4a5a80, hemiGround: 0x1a2018, hemiI: 1.0, night: true,
  },
};

const { roadWidth: RW, ringRadius: RING, islandRadius: ISLAND, nsRoadX: NS, lake } = world;

export function inLake(x: number, z: number) {
  return Math.abs(x) < lake.halfWidth && Math.abs(z) < lake.halfLength;
}
export function onBridge(x: number, z: number) {
  return Math.abs(x) < lake.halfWidth + 1 && Math.abs(z) < RW / 2 + 0.6;
}
function nearRoad(x: number, z: number, pad = 0) {
  const r = Math.hypot(x, z);
  return Math.abs(r - RING) < RW / 2 + pad
    || (Math.abs(z) < RW / 2 + pad && Math.abs(x) < RING)
    || (Math.abs(Math.abs(x) - NS) < RW / 2 + pad && Math.abs(z) < Math.sqrt(RING * RING - NS * NS));
}

/** Draw wrapped text on a canvas; returns the y after the last line. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 99) {
  const words = text.split(' ');
  let line = '';
  let n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      if (++n >= maxLines) { ctx.fillText(`${line}…`, x, y); return y + lh; }
      ctx.fillText(line, x, y);
      line = words[i];
      y += lh;
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lh; }
  return y;
}

export function buildWorld(scene: THREE.Scene, pal: Palette, accent: string, boards: Board[]) {
  const colliders: Circle[] = [];
  const disposables: { dispose(): void }[] = [];
  const themed = {
    ground: new THREE.MeshStandardMaterial({ color: pal.ground, flatShading: true, roughness: 1 }),
    ground2: new THREE.MeshStandardMaterial({ color: pal.ground2, flatShading: true, roughness: 1 }),
    road: new THREE.MeshStandardMaterial({ color: pal.road, roughness: 0.95 }),
    line: new THREE.MeshStandardMaterial({ color: pal.line, roughness: 0.8 }),
    water: new THREE.MeshStandardMaterial({ color: pal.water, roughness: 0.15, metalness: 0.2, flatShading: true }),
    ocean: new THREE.MeshStandardMaterial({ color: pal.ocean, roughness: 0.2, metalness: 0.15, flatShading: true }),
    sand: new THREE.MeshStandardMaterial({ color: pal.sand, flatShading: true, roughness: 1 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xfff1cc, emissive: 0xffd98a, emissiveIntensity: pal.night ? 2 : 0.1 }),
  };
  Object.values(themed).forEach((m) => disposables.push(m));
  const root = new THREE.Group();
  scene.add(root);

  // Ocean with gentle low-poly waves.
  const oceanGeo = new THREE.PlaneGeometry(1400, 1400, 60, 60);
  oceanGeo.rotateX(-Math.PI / 2);
  const ocean = new THREE.Mesh(oceanGeo, themed.ocean);
  ocean.position.y = -1.2;
  ocean.receiveShadow = true;
  root.add(ocean);
  const oceanBase = Float32Array.from((oceanGeo.attributes.position as THREE.BufferAttribute).array);

  // Beach and ground.
  const beach = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND + 10, ISLAND + 18, 2.4, 72), themed.sand);
  beach.position.y = -1.25;
  beach.receiveShadow = true;
  root.add(beach);
  const groundGeo = new THREE.CircleGeometry(ISLAND, 72);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, themed.ground);
  ground.receiveShadow = true;
  root.add(ground);
  // Patches of darker grass.
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * (ISLAND - 50);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (inLake(x, z)) continue;
    const p = new THREE.Mesh(new THREE.CircleGeometry(6 + Math.random() * 12, 7), themed.ground2);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.01, z);
    p.receiveShadow = true;
    root.add(p);
  }

  // Roads.
  const ringGeo = new THREE.RingGeometry(RING - RW / 2, RING + RW / 2, 128);
  ringGeo.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, themed.road);
  ring.position.y = 0.03;
  ring.receiveShadow = true;
  root.add(ring);
  const strip = (w: number, d: number, x: number, z: number, m = themed.road, y = 0.035) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, y, z);
    s.receiveShadow = true;
    root.add(s);
    return s;
  };
  strip(RING * 2, RW, 0, 0);
  const nsLen = Math.sqrt(RING * RING - NS * NS) * 2;
  strip(RW, nsLen, -NS, 0);
  strip(RW, nsLen, NS, 0);

  // Dashed center lines (instanced).
  const dashes: THREE.Matrix4[] = [];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  for (let a = 0; a < Math.PI * 2; a += 6 / RING) {
    q.setFromAxisAngle(up, -a);
    dashes.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * RING, 0.05, Math.sin(a) * RING), q, one));
  }
  q.setFromAxisAngle(up, Math.PI / 2);
  for (let x = -RING + 8; x < RING - 8; x += 6) if (!(Math.abs(x + NS) < 7 || Math.abs(x - NS) < 7)) dashes.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.05, 0), q, one));
  q.identity();
  for (const nx of [-NS, NS]) for (let z = -nsLen / 2 + 6; z < nsLen / 2 - 6; z += 6) if (Math.abs(z) > 7) dashes.push(new THREE.Matrix4().compose(new THREE.Vector3(nx, 0.05, z), q, one));
  const dashGeo = new THREE.PlaneGeometry(0.35, 2.6);
  dashGeo.rotateX(-Math.PI / 2);
  const dashMesh = new THREE.InstancedMesh(dashGeo, themed.line, dashes.length);
  dashes.forEach((d, i) => dashMesh.setMatrixAt(i, d));
  root.add(dashMesh);

  // The lake ("the Atlantic") and its bridge.
  const lakeMesh = strip(lake.halfWidth * 2, lake.halfLength * 2, 0, 0, themed.water, 0.04);
  lakeMesh.receiveShadow = true;
  for (const sx of [-1, 1]) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, lake.halfLength * 2), themed.sand);
    bank.position.set(sx * (lake.halfWidth + 0.6), 0.1, 0);
    root.add(bank);
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(lake.halfWidth * 2 + 6, 0.5, RW + 1.5), mat(0x8d8378));
  deck.position.set(0, -0.2, 0);
  deck.receiveShadow = true;
  root.add(deck);
  strip(lake.halfWidth * 2 + 6, RW, 0, 0, themed.road, 0.07);
  for (const sz of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(lake.halfWidth * 2 + 6, 0.8, 0.3), mat(0xd9d4cc));
    rail.position.set(0, 0.45, sz * (RW / 2 + 0.6));
    rail.castShadow = true;
    root.add(rail);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(lake.halfWidth + 2, 0.4, 4, 20, Math.PI), mat(accentHex(accent)));
    arc.position.set(0, 0, sz * (RW / 2 + 0.6));
    arc.castShadow = true;
    root.add(arc);
  }
  // Sign over the lake.
  const sign = label('THE ATLANTIC', 'US ← → WORLD', accent);
  sign.position.set(0, 14, 0);
  sign.scale.set(16, 8, 1);
  root.add(sign);
  disposables.push(sign.material, (sign.material as THREE.SpriteMaterial).map!);

  // Trees (instanced): avoid roads, the lake, and landmark zones.
  const avoid: Circle[] = [];
  const treeSpots: [number, number, number][] = [];
  const reserve = (x: number, z: number, r: number) => avoid.push([x, z, r]);
  const free = (x: number, z: number) => !inLake(x, z) && Math.abs(x) > lake.halfWidth + 3 && !nearRoad(x, z, 3) && avoid.every(([ax, az, ar]) => Math.hypot(x - ax, z - az) > ar);

  // Lamp posts along the highway.
  const lampSpots: [number, number][] = [];
  for (let x = -RING + 14; x < RING - 10; x += 22) {
    if (Math.abs(x) < lake.halfWidth + 4 || Math.abs(Math.abs(x) - NS) < 10) continue;
    lampSpots.push([x, x % 44 === 0 ? -RW / 2 - 1.6 : RW / 2 + 1.6]);
  }
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 5);
  const poles = new THREE.InstancedMesh(poleGeo, mat(0x3a3a40), lampSpots.length);
  const bulbs = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.3, 0.6), themed.bulb, lampSpots.length);
  lampSpots.forEach(([x, z], i) => {
    poles.setMatrixAt(i, m4.makeTranslation(x, 3.5, z));
    bulbs.setMatrixAt(i, m4.makeTranslation(x, 7, z - Math.sign(z) * 0.5));
    colliders.push([x, z, 0.4]);
  });
  poles.castShadow = true;
  root.add(poles, bulbs);

  // Billboards along Resume Highway.
  boards.forEach((b) => {
    const side = Math.sign(b.z);
    const g = new THREE.Group();
    const tex = boardTexture(b, accent);
    disposables.push(tex);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: pal.night ? 0.55 : 0.05 }));
    face.position.y = 5.6;
    face.userData.board = true;
    const back = new THREE.Mesh(new THREE.BoxGeometry(9.4, 4.9, 0.3), mat(0x2f2f34));
    back.position.set(0, 5.6, -0.2);
    back.castShadow = true;
    g.add(face, back);
    for (const px of [-3, 3]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), mat(0x2f2f34));
      post.position.set(px, 2, -0.2);
      post.castShadow = true;
      g.add(post);
    }
    g.position.set(b.x, 0, b.z);
    // Face the road, angled toward oncoming (eastbound) traffic.
    g.rotation.y = side < 0 ? -0.55 : Math.PI + 0.55;
    root.add(g);
    reserve(b.x, b.z, 7);
  });

  // Ramps: one onto the bridge each way (jump the Atlantic), plus a stunt ramp.
  const ramps: Ramp[] = [
    { x: -27, z: -3, h: Math.PI / 2, len: 8, width: 5, height: 1.8 },
    { x: 27, z: 3, h: -Math.PI / 2, len: 8, width: 5, height: 1.8 },
    { x: -80, z: 36, h: Math.PI / 2, len: 9, width: 7, height: 2.4 },
    { x: 80, z: -2.5, h: Math.PI / 2, len: 7, width: 5, height: 1.4 },
  ];
  for (const r of ramps) {
    const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(r.len, 0), new THREE.Vector2(r.len, r.height)]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: r.width, bevelEnabled: false });
    geo.translate(0, 0, -r.width / 2);
    geo.rotateY(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat(accentHex(accent), { roughness: 0.5 }));
    // After rotateY(-90°) the ramp rises along +z; turn it to face heading h.
    m.position.set(r.x - Math.sin(r.h) * r.len / 2, 0, r.z - Math.cos(r.h) * r.len / 2);
    m.rotation.y = r.h;
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(r.width, 0.06, 0.5), mat(0xffffff));
    stripe.position.set(r.x + Math.sin(r.h) * (r.len / 2 - 0.25), r.height - 0.1, r.z + Math.cos(r.h) * (r.len / 2 - 0.25));
    stripe.rotation.y = r.h;
    root.add(stripe);
    reserve(r.x, r.z, 14);
  }

  // Knock-over props: a cone slalom on the world side and a crate stack after the stunt ramp.
  const props: Prop[] = [];
  const coneGeo = new THREE.ConeGeometry(0.45, 1.2, 6);
  coneGeo.translate(0, 0.6, 0);
  const crateGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
  crateGeo.translate(0, 0.8, 0);
  const addProp = (geo: THREE.BufferGeometry, color: number, x: number, z: number, y: number, r: number) => {
    const mesh = new THREE.Mesh(geo, mat(color));
    mesh.castShadow = true;
    mesh.position.set(x, y, z);
    root.add(mesh);
    props.push({ mesh, x, z, y, vx: 0, vz: 0, vy: 0, spin: new THREE.Vector3(), r, home: [x, z] });
  };
  for (let i = 0; i < 10; i++) addProp(coneGeo, 0xff6a1a, 30 + i * 4.5, i % 2 ? 2.4 : -2.4, 0, 0.5);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - row; i++) addProp(crateGeo, 0xb5884f, -50, 30 + i * 1.7 + row * 0.85, row * 1.6, 0.9);
  for (let i = 0; i < 6; i++) addProp(coneGeo, 0xff6a1a, -150 + (i - 2.5) * 3.2, 22, 0, 0.5);
  reserve(-50, 32, 8);

  function plantTrees() {
    let tries = 0;
    while (treeSpots.length < 260 && tries++ < 6000) {
      const a = Math.random() * Math.PI * 2, r = 12 + Math.sqrt(Math.random()) * (ISLAND - 18);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!free(x, z)) continue;
      treeSpots.push([x, z, 0.7 + Math.random() * 0.8]);
    }
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 2, 5), mat(0x6b4f36), treeSpots.length);
    const leafGeo = new THREE.ConeGeometry(1.8, 4.5, 6);
    const leafRound = new THREE.IcosahedronGeometry(2, 0);
    const pines = treeSpots.filter((_, i) => i % 3 !== 0);
    const rounds = treeSpots.filter((_, i) => i % 3 === 0);
    const pineMesh = new THREE.InstancedMesh(leafGeo, mat(0x4f7d4a), pines.length);
    const roundMesh = new THREE.InstancedMesh(leafRound, mat(0x7aa25a), rounds.length);
    const s = new THREE.Vector3();
    const qq = new THREE.Quaternion();
    treeSpots.forEach(([x, z, k], i) => {
      s.set(k, k, k);
      trunk.setMatrixAt(i, m4.compose(new THREE.Vector3(x, k, z), qq.identity(), s));
      colliders.push([x, z, 0.6 * k]);
    });
    pines.forEach(([x, z, k], i) => { s.set(k, k, k); pineMesh.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 2 * k + 2.2 * k, z), qq.setFromAxisAngle(up, x), s)); });
    rounds.forEach(([x, z, k], i) => { s.set(k, k * 1.1, k); roundMesh.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 2 * k + 1.6 * k, z), qq.setFromAxisAngle(up, z), s)); });
    for (const t of [trunk, pineMesh, roundMesh]) { t.castShadow = true; t.receiveShadow = true; root.add(t); }
  }

  // Clouds (day) and stars (night).
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, transparent: true, opacity: 0.92 });
  disposables.push(cloudMat);
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + Math.random() * 4, 0), cloudMat);
      puff.position.set(j * 5 - 7, Math.random() * 2, Math.random() * 4);
      c.add(puff);
    }
    const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 260;
    c.position.set(Math.cos(a) * r, 55 + Math.random() * 30, Math.sin(a) * r);
    clouds.add(c);
  }
  scene.add(clouds);
  const starGeo = new THREE.BufferGeometry();
  const sp: number[] = [];
  for (let i = 0; i < 900; i++) {
    const t = Math.random() * Math.PI * 2, p = Math.random() * Math.PI * 0.45;
    sp.push(Math.cos(t) * Math.sin(p) * 600, Math.cos(p) * 600, Math.sin(t) * Math.sin(p) * 600);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
  disposables.push(starGeo, starMat);

  function applyPalette(p: Palette) {
    themed.ground.color.setHex(p.ground);
    themed.ground2.color.setHex(p.ground2);
    themed.road.color.setHex(p.road);
    themed.line.color.setHex(p.line);
    themed.water.color.setHex(p.water);
    themed.ocean.color.setHex(p.ocean);
    themed.sand.color.setHex(p.sand);
    themed.bulb.emissiveIntensity = p.night ? 2 : 0.1;
    root.traverse((o) => {
      if ((o as THREE.Mesh).userData.board) ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = p.night ? 0.55 : 0.05;
    });
    clouds.visible = !p.night;
    stars.visible = p.night;
  }
  applyPalette(pal);

  const pos = oceanGeo.attributes.position as THREE.BufferAttribute;
  function update(t: number, dt: number) {
    for (let i = 0; i < pos.count; i++) {
      const x = oceanBase[i * 3], z = oceanBase[i * 3 + 2];
      pos.setY(i, Math.sin(x * 0.05 + t * 0.8) * 0.35 + Math.cos(z * 0.06 + t * 0.6) * 0.35);
    }
    pos.needsUpdate = true;
    oceanGeo.computeVertexNormals();
    clouds.children.forEach((c, i) => {
      c.position.x += dt * (1.5 + (i % 3));
      if (c.position.x > 320) c.position.x = -320;
    });
  }

  return {
    colliders, ramps, props, reserve, plantTrees, applyPalette, update, root,
    lampSpots,
    dispose() {
      disposables.forEach((d) => d.dispose());
      root.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      scene.remove(root, clouds, stars);
      clouds.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    },
  };
}

export function accentHex(accent: string) {
  const n = parseInt(accent.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return Number.isNaN(n) ? 0xff5b2e : n;
}

function boardTexture(b: Board, accent: string) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#f2eee6';
  x.fillRect(0, 0, 1024, 512);
  x.fillStyle = accent;
  x.fillRect(0, 0, 1024, 18);
  x.fillRect(0, 494, 1024, 18);
  x.fillStyle = '#8d857a';
  x.font = '500 30px "JetBrains Mono Variable", monospace';
  x.fillText('RESUME HIGHWAY', 56, 84);
  x.fillStyle = '#16130f';
  x.font = '600 68px "Fraunces Variable", Georgia, serif';
  let y = wrapText(x, b.title, 56, 170, 912, 74, 2);
  x.font = '400 36px "Inter Tight Variable", system-ui, sans-serif';
  x.fillStyle = '#5d564c';
  for (const l of b.lines) y = wrapText(x, l, 56, y + 8, 912, 44, 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A camera-facing sign: big title plus a small subtitle. */
export function label(title: string, sub: string, accent: string) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const x = c.getContext('2d')!;
  x.textAlign = 'center';
  x.fillStyle = 'rgba(12,12,14,0.78)';
  const r = 36;
  x.beginPath();
  x.roundRect(16, 40, 480, 176, r);
  x.fill();
  x.fillStyle = accent;
  x.font = '500 26px "JetBrains Mono Variable", monospace';
  x.fillText(sub.toUpperCase(), 256, 100);
  x.fillStyle = '#f2eee6';
  let size = 50;
  do x.font = `600 ${size}px "Fraunces Variable", Georgia, serif`;
  while (x.measureText(title).width > 440 && --size > 26);
  x.fillText(title, 256, 166);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  return sprite;
}
