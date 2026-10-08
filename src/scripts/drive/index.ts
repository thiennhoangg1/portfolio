// Drive mode: a tiny low-poly world of US and international landmarks,
// each one showing part of the portfolio. Loaded on demand by ../driveMode.ts.
import * as THREE from 'three';
import { landmarks, world as W } from '../../data/drive';
import { cssVar } from '../core';
import { audioCtx, blip, soundOn } from '../sound';
import { unlock } from '../secrets';
import { confetti } from '../theme';
import { player } from '../audio';
import { buildCar, CarPhysics } from './car';
import { Controls } from './controls';
import { buildLandmark, disposeMaterials } from './landmarks';
import { accentHex, buildWorld, inLake, label, onBridge, palettes, type Board, type Circle, type Prop } from './world';
import { createHud, type DriveData, type Stop } from './hud';

const KEY = 'th-drive';
type Saved = { x?: number; z?: number; h?: number; stamps?: string[] };
const load = (): Saved => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = (s: Saved) => localStorage.setItem(KEY, JSON.stringify(s));

export interface Mounted { stop(): void }

export async function mount(host: HTMLElement, opts: { onExit(): void; onNavigate(href: string): void }): Promise<Mounted> {
  const data = JSON.parse(host.dataset.drive || '{}') as DriveData;
  await document.fonts?.ready;

  const theme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  let pal = palettes[theme()];
  const accent = cssVar('--accent') || '#ff5b2e';

  // ---- Renderer, scene, camera ----
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'drive-canvas';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(pal.sky);
  scene.fog = new THREE.Fog(pal.sky, 140, 460);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 1500);

  const hemi = new THREE.HemisphereLight(pal.hemiSky, pal.hemiGround, pal.hemiI);
  const sun = new THREE.DirectionalLight(pal.sun, pal.sunI);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 260 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  scene.add(hemi, sun, sun.target);

  // ---- Resume Highway billboards ----
  const dates = (e: DriveData['experience'][number]) => [e.start, e.end].filter(Boolean).join(' – ');
  const boardDefs: { title: string; meta: string; lines: string[]; html?: string }[] = [
    { title: data.education.school, meta: 'Education', lines: data.education.degrees },
    ...data.experience.map((e) => ({ title: e.role, meta: `${e.org} · ${dates(e)}`, lines: e.bullets })),
    { title: 'Skills', meta: 'Languages & tools', lines: [data.skills.languages.join(' · '), data.skills.tools.join(' · ')] },
    {
      title: 'Take it with you', meta: 'The whole thing, on one page', lines: ['Download resume.pdf'],
      html: '<div class="dc-actions"><a class="dc-btn" href="/resume.pdf" target="_blank" rel="noopener">Download resume.pdf ↓</a><a href="mailto:' + data.site.email + '">Email me ↗</a></div>',
    },
  ];
  const step = (W.billboards.to - W.billboards.from) / (boardDefs.length - 1);
  const boards: Board[] = boardDefs.map((b, i) => ({
    x: W.billboards.from + i * step,
    z: (i % 2 ? 1 : -1) * (W.roadWidth / 2 + 6),
    title: b.title,
    lines: [b.meta, ...b.lines.slice(0, 1)],
  }));

  const world = buildWorld(scene, pal, accent, boards);
  const colliders: Circle[] = world.colliders;
  boards.forEach((b) => {
    const rot = b.z < 0 ? -0.55 : Math.PI + 0.55;
    for (const lx of [-3.6, 0, 3.6]) colliders.push([b.x + Math.cos(rot) * lx, b.z - Math.sin(rot) * lx, 0.9]);
  });

  // ---- Landmarks, pads, labels ----
  const padGroup = new THREE.Group();
  scene.add(padGroup);
  const accentColor = new THREE.Color(accentHex(accent));
  const padRing = new THREE.RingGeometry(5.4, 6.2, 40);
  padRing.rotateX(-Math.PI / 2);
  const padDisc = new THREE.CircleGeometry(5.4, 40);
  padDisc.rotateX(-Math.PI / 2);
  const beamGeo = new THREE.CylinderGeometry(5.8, 5.8, 16, 32, 1, true);
  beamGeo.translate(0, 8, 0);
  const ringMat = new THREE.MeshBasicMaterial({ color: accentColor });
  const discMat = new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.22, depthWrite: false });
  const beamMat = new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const beamDone = beamMat.clone();
  beamDone.opacity = 0.035;
  const pads = new Map<string, { beam: THREE.Mesh; ring: THREE.Mesh; label: THREE.Sprite; baseY: number }>();

  for (const lm of landmarks) {
    const built = buildLandmark(lm.id);
    built.group.position.set(lm.x, 0, lm.z);
    built.group.rotation.y = lm.rot ?? 0;
    scene.add(built.group);
    const c = Math.cos(lm.rot ?? 0), s = Math.sin(lm.rot ?? 0);
    let maxR = 0;
    for (const [lx, lz, r] of built.colliders) {
      colliders.push([lm.x + lx * c + lz * s, lm.z - lx * s + lz * c, r]);
      maxR = Math.max(maxR, Math.hypot(lx, lz) + r);
    }
    world.reserve(lm.x, lm.z, maxR + 6);
    world.reserve(lm.pad.x, lm.pad.z, 10);

    const ring = new THREE.Mesh(padRing, ringMat);
    ring.position.set(lm.pad.x, 0.08, lm.pad.z);
    const disc = new THREE.Mesh(padDisc, discMat);
    disc.position.set(lm.pad.x, 0.07, lm.pad.z);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(lm.pad.x, 0, lm.pad.z);
    padGroup.add(ring, disc, beam);

    const sprite = label(lm.name, lm.place, accent);
    const baseY = built.height + 8;
    sprite.position.set(lm.x, baseY, lm.z);
    sprite.scale.set(28, 14, 1);
    scene.add(sprite);
    pads.set(lm.id, { beam, ring, label: sprite, baseY });
  }
  world.plantTrees();

  // ---- Car ----
  const car = buildCar(accentHex(accent));
  scene.add(car);
  const headlight = new THREE.SpotLight(0xfff1cc, 0, 80, 0.5, 0.5, 1.2);
  headlight.position.set(0, 1.1, 2.2);
  headlight.target.position.set(0, 0, 22);
  car.add(headlight, headlight.target);
  const phys = new CarPhysics();
  const saved = load();
  const stamps = new Set<string>(saved.stamps ?? []);
  if (typeof saved.x === 'number' && typeof saved.z === 'number' && Math.hypot(saved.x, saved.z) < W.islandRadius - 4 && !inLake(saved.x, saved.z)) {
    phys.place(saved.x, saved.z, saved.h ?? W.spawn.heading);
  } else phys.place(W.spawn.x, W.spawn.z, W.spawn.heading);
  let lastSafe = { x: phys.x, z: phys.z, h: phys.h };
  const persist = () => save({ x: phys.x, z: phys.z, h: phys.h, stamps: [...stamps] });

  // ---- Stops (landmark pads + billboards) ----
  const stops: Stop[] = [
    ...landmarks.map((lm) => ({ kind: 'landmark' as const, id: lm.id, x: lm.pad.x, z: lm.pad.z, r: 7, lm })),
    ...boards.map((b, i) => ({
      kind: 'board' as const, id: `board-${i}`, x: b.x, z: 0, r: 6.5, index: i, total: boards.length,
      title: boardDefs[i].title, meta: boardDefs[i].meta, lines: boardDefs[i].lines, html: boardDefs[i].html,
    })),
  ];

  // ---- HUD and input ----
  const hud = createHud(host, data, {
    park: () => opts.onExit(),
    navigate: (href) => { persist(); opts.onNavigate(href); },
    play: (id) => {
      const t = data.music.find((m) => m.id === id);
      if (t) player.play(t);
    },
    travel: (id) => {
      if (id === 'highway') { teleport(-140, 2.5, Math.PI / 2); return; }
      const lm = landmarks.find((l) => l.id === id);
      if (!lm) return;
      const dx = lm.x - lm.pad.x, dz = lm.z - lm.pad.z;
      const d = Math.hypot(dx, dz);
      if (d < 1) { teleport(W.spawn.x, W.spawn.z, W.spawn.heading); return; }
      teleport(lm.pad.x - (dx / d) * 16, lm.pad.z - (dz / d) * 16, Math.atan2(dx, dz));
    },
  });
  hud.setStamps(stamps);
  const ink = () => cssVar('--fg') || '#16130f';
  const drawBase = () => hud.drawBase(pal.night
    ? { land: '#26302a', road: '#55555c', water: '#163a4f', ink: '#ece7de' }
    : { land: '#c9d4a8', road: '#5a5652', water: '#8cc6d6', ink: '#16130f' });
  drawBase();

  const controls = new Controls(host, {
    escape: () => (hud.mapOpen() ? hud.toggleMap(false) : opts.onExit()),
    m: () => hud.toggleMap(),
    r: () => { teleport(W.spawn.x, W.spawn.z, W.spawn.heading); },
  });

  // ---- Engine sound (only when site sound is on) ----
  let engine: { osc: OscillatorNode; sub: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  function engineSync() {
    if (soundOn() && !engine) {
      const ctx = audioCtx();
      const osc = ctx.createOscillator(), sub = ctx.createOscillator();
      const gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      osc.type = 'sawtooth'; sub.type = 'square';
      filter.type = 'lowpass'; filter.frequency.value = 500;
      gain.gain.value = 0;
      osc.connect(filter); sub.connect(filter);
      filter.connect(gain).connect(ctx.destination);
      osc.start(); sub.start();
      engine = { osc, sub, gain, filter };
    } else if (!soundOn() && engine) engineStop();
  }
  function engineStop() {
    if (!engine) return;
    const e = engine;
    engine = null;
    e.gain.gain.setTargetAtTime(0, e.gain.context.currentTime, 0.05);
    setTimeout(() => { e.osc.stop(); e.sub.stop(); e.gain.disconnect(); }, 300);
  }

  // ---- Splash effect ----
  const splash = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.2, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  splash.rotation.x = -Math.PI / 2;
  scene.add(splash);

  // ---- State ----
  let sinking = 0;
  let side: 'us' | 'world' = phys.x < 0 ? 'us' : 'world';
  let shake = 0;
  let introT = 0;
  const camPos = new THREE.Vector3(phys.x - 80, 90, phys.z - 60);
  const look = new THREE.Vector3(phys.x, 0, phys.z);
  const tmp = new THREE.Vector3();
  let raf = 0;
  let last = performance.now();
  let frame = 0;
  let saveT = 0;
  let safeT = 0;
  let soundT = 0;
  let inside: string | null = null;

  function teleport(x: number, z: number, h: number) {
    phys.place(x, z, h);
    phys.onRamp = false;
    sinking = 0;
    car.visible = true;
    lastSafe = { x, z, h };
    camPos.set(x - Math.sin(h) * 14, 8, z - Math.cos(h) * 14);
    look.set(x, 1, z);
  }

  function hitProp(p: Prop & { hitAt?: number }, nx: number, nz: number) {
    const sp = phys.speed;
    p.vx = phys.vx * 0.9 + nx * (3 + sp * 0.2);
    p.vz = phys.vz * 0.9 + nz * (3 + sp * 0.2);
    p.vy = 3 + sp * 0.28;
    p.spin.set((Math.random() - 0.5) * sp * 0.6, (Math.random() - 0.5) * sp * 0.4, (Math.random() - 0.5) * sp * 0.6);
    p.hitAt = performance.now();
    phys.vx *= 0.93; phys.vz *= 0.93;
    if (sp > 6) blip('key');
  }

  function physicsStep(dt: number) {
    controls.update();
    const input = hud.mapOpen() || sinking ? { throttle: 0, steer: 0, brake: true, boost: false } : controls;
    const fwd = phys.update(dt, input);

    // Ramps.
    let on: (typeof world.ramps)[number] | null = null;
    for (const r of world.ramps) {
      const fx = Math.sin(r.h), fz = Math.cos(r.h);
      const dx = phys.x - r.x, dz = phys.z - r.z;
      const u = dx * fx + dz * fz;
      const v = dx * fz - dz * fx;
      if (Math.abs(v) < r.width / 2 && Math.abs(u) < r.len / 2) {
        const surface = ((u + r.len / 2) / r.len) * r.height;
        if (phys.y <= surface + 0.5 && phys.vy <= 0.1) { on = r; phys.y = surface; phys.vy = 0; }
      }
    }
    if (!on && phys.onRamp && phys.y > 0.3) {
      // Left the top of a ramp: launch.
      phys.vy = Math.max(3, Math.abs(fwd) * 0.32);
      shake = 0.3;
    }
    phys.onRamp = !!on;

    // Static colliders.
    const cr = phys.radius;
    for (const [x, z, r] of colliders) {
      const dx = phys.x - x, dz = phys.z - z;
      const min = r + cr;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d, nz = dz / d;
      phys.x = x + nx * min;
      phys.z = z + nz * min;
      const vn = phys.vx * nx + phys.vz * nz;
      if (vn < 0) {
        phys.vx -= 1.35 * vn * nx;
        phys.vz -= 1.35 * vn * nz;
        if (vn < -8) { shake = Math.min(1, -vn / 30); blip('click'); }
      }
    }
    // Island edge.
    const rr = Math.hypot(phys.x, phys.z);
    const edge = W.islandRadius - 3;
    if (rr > edge) {
      const nx = phys.x / rr, nz = phys.z / rr;
      phys.x = nx * edge; phys.z = nz * edge;
      const vn = phys.vx * nx + phys.vz * nz;
      if (vn > 0) { phys.vx -= 1.4 * vn * nx; phys.vz -= 1.4 * vn * nz; }
    }

    // Props.
    for (const p of world.props as (Prop & { hitAt?: number })[]) {
      const dx = p.x - phys.x, dz = p.z - phys.z;
      const d = Math.hypot(dx, dz);
      if (d < cr + p.r && phys.y < p.y + 1.6 && phys.speed > 1) hitProp(p, dx / (d || 1), dz / (d || 1));
      const moving = p.y > 0 || Math.abs(p.vx) + Math.abs(p.vz) > 0.05;
      if (moving) {
        p.vy -= 30 * dt;
        p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
        if (p.y < 0) {
          p.y = 0;
          p.vy = Math.abs(p.vy) > 2 ? -p.vy * 0.3 : 0;
          p.vx *= 0.75; p.vz *= 0.75;
          p.spin.multiplyScalar(0.7);
        }
        p.mesh.rotation.x += p.spin.x * dt;
        p.mesh.rotation.y += p.spin.y * dt;
        p.mesh.rotation.z += p.spin.z * dt;
        p.mesh.position.set(p.x, p.y, p.z);
      } else if (p.hitAt && performance.now() - p.hitAt > 20000 && Math.hypot(p.home[0] - phys.x, p.home[1] - phys.z) > 40) {
        // Quietly put it back once you've driven away.
        p.x = p.home[0]; p.z = p.home[1]; p.hitAt = undefined;
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.rotation.set(0, 0, 0);
      }
    }

    // The Atlantic: fall in, splash, respawn.
    if (!sinking && phys.y < 0.3 && inLake(phys.x, phys.z) && !onBridge(phys.x, phys.z)) {
      sinking = 0.001;
      splash.position.set(phys.x, 0.2, phys.z);
      (splash.material as THREE.MeshBasicMaterial).opacity = 0.9;
      splash.scale.setScalar(1);
      hud.announce('Splash!', "that's the Atlantic");
      blip('open');
    }
    if (sinking) {
      sinking += dt;
      phys.y = -sinking * 3;
      phys.vx *= 0.9; phys.vz *= 0.9;
      if (sinking > 1.1) {
        teleport(lastSafe.x, lastSafe.z, lastSafe.h);
      }
    } else if ((safeT += dt) > 0.4) {
      safeT = 0;
      if (!phys.airborne && !inLake(phys.x, phys.z) && Math.abs(phys.x) > W.lake.halfWidth + 6) lastSafe = { x: phys.x, z: phys.z, h: phys.h };
    }
    return fwd;
  }

  function checkStops() {
    let best: Stop | null = null;
    let bestD = Infinity;
    for (const s of stops) {
      const d = Math.hypot(phys.x - s.x, phys.z - s.z);
      if (d < s.r && d < bestD) { best = s; bestD = d; }
    }
    if (best?.id !== inside) {
      if (inside) hud.leave(inside);
      inside = best?.id ?? null;
      if (best) {
        hud.showCard(best);
        if (best.kind === 'landmark') {
          hud.announce(best.lm.name, best.lm.place);
          blip('open');
          if (!stamps.has(best.id)) {
            stamps.add(best.id);
            hud.setStamps(stamps);
            persist();
            if (stamps.size === landmarks.length) { unlock('world-tour'); confetti(); }
          }
        }
      }
    }
    const nowSide = phys.x < -W.lake.halfWidth ? 'us' : phys.x > W.lake.halfWidth ? 'world' : side;
    if (nowSide !== side) {
      side = nowSide;
      hud.announce(side === 'us' ? 'United States' : 'Around the world', side === 'us' ? 'welcome home' : 'passport ready');
    }
  }

  function updateCamera(dt: number, fwd: number, boosting: boolean) {
    const fx = Math.sin(phys.h), fz = Math.cos(phys.h);
    const sp = Math.abs(fwd);
    const dist = 10.5 + sp * 0.12;
    const height = 4.6 + sp * 0.04 + Math.max(0, phys.y) * 0.4;
    tmp.set(phys.x - fx * dist, Math.max(1.5, phys.y + height), phys.z - fz * dist);
    introT = Math.min(1, introT + dt / 2.4);
    const k = introT < 1 ? 1 - Math.exp(-dt * (1.2 + introT * 4)) : 1 - Math.exp(-dt * 5);
    camPos.lerp(tmp, k);
    camera.position.copy(camPos);
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake = Math.max(0, shake - dt * 2);
    }
    tmp.set(phys.x + fx * 5, phys.y + 1.6, phys.z + fz * 5);
    look.lerp(tmp, 1 - Math.exp(-dt * 10));
    camera.lookAt(look);
    const fov = 62 + (boosting ? 10 : 0) * Math.min(1, sp / 40);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 4);
      camera.updateProjectionMatrix();
    }
  }

  function applyTheme() {
    pal = palettes[theme()];
    (scene.background as THREE.Color).setHex(pal.sky);
    (scene.fog as THREE.Fog).color.setHex(pal.sky);
    hemi.color.setHex(pal.hemiSky);
    hemi.groundColor.setHex(pal.hemiGround);
    hemi.intensity = pal.hemiI;
    sun.color.setHex(pal.sun);
    sun.intensity = pal.sunI;
    headlight.intensity = pal.night ? 420 : 0;
    car.userData.headlights.emissiveIntensity = pal.night ? 3 : 0.6;
    world.applyPalette(pal);
    drawBase();
  }
  applyTheme();
  const themeObs = new MutationObserver(applyTheme);
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function resize() {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    frame++;

    const fwd = physicsStep(dt);
    phys.sync(car);
    checkStops();
    updateCamera(dt, fwd, controls.boost);

    // Sun and shadows follow the car.
    sun.position.set(phys.x + 50, 90, phys.z + 35);
    sun.target.position.set(phys.x, 0, phys.z);

    // Pads and labels bob.
    for (const [id, p] of pads) {
      p.beam.material = stamps.has(id) ? beamDone : beamMat;
      p.beam.scale.y = 0.85 + Math.sin(t * 2 + p.beam.position.x) * 0.15;
      p.label.position.y = p.baseY + Math.sin(t * 1.4 + p.baseY) * 0.6;
    }
    if (splash.visible && (splash.material as THREE.MeshBasicMaterial).opacity > 0) {
      splash.scale.multiplyScalar(1 + dt * 3);
      (splash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (splash.material as THREE.MeshBasicMaterial).opacity - dt);
    }
    world.update(t, dt);

    // Engine sound.
    if ((soundT += dt) > 0.5) { soundT = 0; engineSync(); }
    if (engine) {
      const sp = Math.abs(fwd);
      const ctxT = engine.gain.context.currentTime;
      engine.osc.frequency.setTargetAtTime(55 + sp * 4.2 + (controls.boost ? 30 : 0), ctxT, 0.08);
      engine.sub.frequency.setTargetAtTime(27 + sp * 2.1, ctxT, 0.08);
      engine.filter.frequency.setTargetAtTime(380 + sp * 30, ctxT, 0.1);
      engine.gain.gain.setTargetAtTime(sinking ? 0 : 0.018 + Math.min(0.03, sp * 0.0009) + (controls.throttle ? 0.01 : 0), ctxT, 0.1);
    }

    hud.setSpeed(fwd, controls.boost);
    if (frame % 2 === 0) hud.drawMini(phys, stamps, accent, ink());
    if ((saveT += dt) > 3) { saveT = 0; persist(); }

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(tick);
  hud.announce('Gateway Arch', 'start here · st. louis');

  return {
    stop() {
      cancelAnimationFrame(raf);
      persist();
      engineStop();
      themeObs.disconnect();
      ro.disconnect();
      controls.dispose();
      hud.dispose();
      world.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        if (o instanceof THREE.Sprite) { o.material.map?.dispose(); o.material.dispose(); }
      });
      [padRing, padDisc, beamGeo].forEach((g) => g.dispose());
      [ringMat, discMat, beamMat, beamDone].forEach((m) => m.dispose());
      car.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        m?.dispose();
      });
      disposeMaterials();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
