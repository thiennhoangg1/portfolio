// Time trials on the ring road: a checkered start/finish gate, three
// checkpoints, local best laps, and a ghost car that replays your best lap.
import * as THREE from 'three';
import { world as W } from '../../data/drive';
import { buildCar } from './car';
import { mat } from './landmarks';
import { accentHex, label } from './world';
import type { CarPhysics } from './car';

const LAPS_KEY = 'th-drive-laps';
const GHOST_KEY = 'th-drive-ghost';
const STEP = 0.05; // seconds between ghost samples
const ZONE = 13;

// Gate angles around the ring (x = R cos a, z = R sin a). Start is due south.
const START = Math.PI / 2;
const CHECKPOINTS = [0, -Math.PI / 2, Math.PI];
const at = (a: number) => ({ x: Math.cos(a) * W.ringRadius, z: Math.sin(a) * W.ringRadius });

export const fmt = (t: number) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`;
};

export function loadLaps(): number[] {
  try { return (JSON.parse(localStorage.getItem(LAPS_KEY) || '[]') as number[]).filter((n) => typeof n === 'number'); } catch { return []; }
}

export interface RaceState { status: 'idle' | 'armed' | 'running'; time: number; best: number | null; cp: number; total: number; near: boolean; last: number | null }

export function createRace(scene: THREE.Scene, accent: string, colliders: [number, number, number][], reserve: (x: number, z: number, r: number) => void) {
  const group = new THREE.Group();
  scene.add(group);
  const disposables: { dispose(): void }[] = [];

  // Start/finish gate with a checkered banner.
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const x = c.getContext('2d')!;
  for (let i = 0; i < 32; i++) for (let j = 0; j < 6; j++) {
    x.fillStyle = (i + j) % 2 ? '#111' : '#fff';
    x.fillRect(i * 16, j * 16, 16, 16);
  }
  x.fillStyle = '#111';
  x.fillRect(120, 20, 272, 56);
  x.fillStyle = '#fff';
  x.font = '700 34px "JetBrains Mono Variable", monospace';
  x.textAlign = 'center';
  x.fillText('START · FINISH', 256, 60);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  disposables.push(tex);

  const gate = (a: number, main: boolean, n?: number) => {
    const g = new THREE.Group();
    const p = at(a);
    const span = W.roadWidth + 3;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, main ? 7.5 : 5, 0.6), mat(main ? 0x222226 : 0xf4f1ea));
      post.position.set(side * span / 2, main ? 3.75 : 2.5, 0);
      post.castShadow = true;
      g.add(post);
      if (!main) {
        const flag = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 0.08), mat(accentHex(accent)));
        flag.position.set(side * span / 2 + side * 0.8, 4.4, 0);
        g.add(flag);
      }
    }
    if (main) {
      const banner = new THREE.Mesh(new THREE.BoxGeometry(span + 0.6, 2, 0.3), [mat(0x222226), mat(0x222226), mat(0x222226), mat(0x222226),
        new THREE.MeshStandardMaterial({ map: tex }), new THREE.MeshStandardMaterial({ map: tex })]);
      banner.position.y = 7;
      banner.castShadow = true;
      g.add(banner);
      const line = new THREE.Mesh(new THREE.PlaneGeometry(W.roadWidth, 1.2), new THREE.MeshStandardMaterial({ map: tex }));
      line.rotation.x = -Math.PI / 2;
      line.position.y = 0.06;
      g.add(line);
    } else if (n) {
      const s = label(`Checkpoint ${n}`, 'time trial', accent);
      s.position.y = 8;
      s.scale.set(12, 6, 1);
      g.add(s);
    }
    // The gate spans the road: posts sit on either side, radially.
    g.position.set(p.x, 0, p.z);
    g.rotation.y = -a;
    group.add(g);
    for (const side of [-1, 1]) {
      const r = W.ringRadius + side * span / 2;
      colliders.push([Math.cos(a) * r, Math.sin(a) * r, 0.6]);
    }
    reserve(p.x, p.z, 16);
  };
  gate(START, true);
  CHECKPOINTS.forEach((a, i) => gate(a, false, i + 1));

  // Ghost car.
  const ghost = buildCar(0xffffff);
  ghost.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = false;
    (m.material as THREE.Material).dispose();
    m.material = new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.32, depthWrite: false });
  });
  ghost.visible = false;
  scene.add(ghost);

  let ghostData: { time: number; s: number[] } | null = null;
  try { ghostData = JSON.parse(localStorage.getItem(GHOST_KEY) || 'null'); } catch { ghostData = null; }

  const startPt = at(START);
  const cps = CHECKPOINTS.map(at);
  const state: RaceState = { status: 'idle', time: 0, best: loadLaps()[0] ?? null, cp: 0, total: cps.length, near: false, last: null };
  let visited = new Set<number>();
  let rec: number[] = [];
  let recT = 0;
  let inStart = false;

  function cancel() {
    if (state.status === 'running') state.status = 'idle';
    ghost.visible = false;
    inStart = false;
  }

  /** Returns 'finish' with the lap time when a lap completes. */
  function update(dt: number, car: CarPhysics): { finished: number; best: boolean; first: boolean } | null {
    const dStart = Math.hypot(car.x - startPt.x, car.z - startPt.z);
    state.near = dStart < 70;
    const nowIn = dStart < ZONE;
    let result: { finished: number; best: boolean; first: boolean } | null = null;

    if (state.status === 'running') {
      state.time += dt;
      cps.forEach((p, i) => { if (Math.hypot(car.x - p.x, car.z - p.z) < ZONE) visited.add(i); });
      state.cp = visited.size;
      recT += dt;
      while (recT >= STEP) {
        recT -= STEP;
        rec.push(+car.x.toFixed(2), +car.z.toFixed(2), +car.h.toFixed(3), +car.y.toFixed(2));
      }
      // Ghost playback, interpolated between samples.
      if (ghostData && ghostData.s.length >= 8) {
        const f = state.time / STEP;
        const i = Math.min(Math.floor(f), ghostData.s.length / 4 - 2);
        const k = Math.min(1, f - i);
        const s = ghostData.s;
        const j = i * 4;
        if (i >= 0 && j + 7 < s.length) {
          ghost.visible = true;
          ghost.position.set(s[j] + (s[j + 4] - s[j]) * k, s[j + 3] + (s[j + 7] - s[j + 3]) * k, s[j + 1] + (s[j + 5] - s[j + 1]) * k);
          let dh = s[j + 6] - s[j + 2];
          if (dh > Math.PI) dh -= Math.PI * 2;
          if (dh < -Math.PI) dh += Math.PI * 2;
          ghost.rotation.y = s[j + 2] + dh * k;
        } else ghost.visible = false;
      }
      if (nowIn && !inStart && visited.size === cps.length && state.time > 5) {
        const t = state.time;
        const laps = [...loadLaps(), t].sort((a, b) => a - b).slice(0, 5);
        const first = loadLaps().length === 0;
        localStorage.setItem(LAPS_KEY, JSON.stringify(laps));
        const isBest = state.best === null || t < state.best;
        if (isBest) {
          state.best = t;
          ghostData = { time: t, s: rec };
          try { localStorage.setItem(GHOST_KEY, JSON.stringify(ghostData)); } catch { /* storage full: skip the ghost */ }
        }
        state.last = t;
        result = { finished: t, best: isBest, first };
        state.status = 'armed';
        ghost.visible = false;
      }
    }
    if (!nowIn && inStart && state.status !== 'running') {
      // Rolled out of the start gate: go.
      state.status = 'running';
      state.time = 0;
      visited = new Set();
      state.cp = 0;
      rec = [];
      recT = 0;
    }
    if (nowIn && state.status === 'idle') state.status = 'armed';
    if (!nowIn && !state.near && state.status === 'armed') state.status = 'idle';
    inStart = nowIn;
    return result;
  }

  return {
    state, update, cancel,
    /** Where to put the car for a run: just behind the line, facing it. */
    startSpot() {
      const a = START + 0.16;
      const p = at(a);
      return { x: p.x, z: p.z, h: Math.atan2(startPt.x - p.x, startPt.z - p.z) };
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      ghost.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { (m.material as THREE.Material).dispose(); } });
      scene.remove(group, ghost);
    },
  };
}
