// Homepage teaser: the drive-mode car on a slowly spinning turntable. It turns
// toward the pointer and rolls with scroll. Loaded only when it scrolls into view.
import * as THREE from 'three';
import { buildCar } from './car';
import { accentHex } from './world';

export function mountTeaser(canvas: HTMLCanvasElement, opts: { accent: string; still: boolean }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(9, 5.2, 11);
  camera.lookAt(0, 0.9, 0);

  scene.add(new THREE.HemisphereLight(0xfff8ee, 0x6a6458, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(6, 10, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(new THREE.Color(accentHex(opts.accent)), 2);
  rim.position.set(-6, 3, -6);
  scene.add(rim);

  const stage = new THREE.Group();
  scene.add(stage);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.35, 48), new THREE.MeshStandardMaterial({ color: 0x24242a, roughness: 0.6, metalness: 0.2 }));
  disc.position.y = -0.18;
  disc.receiveShadow = true;
  stage.add(disc);
  const ringMat = new THREE.MeshBasicMaterial({ color: accentHex(opts.accent) });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.05, 6, 64), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.01;
  stage.add(ring);

  const car = buildCar(accentHex(opts.accent));
  stage.add(car);

  let w = 0, h = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    if (r.width === w && r.height === h) return;
    w = r.width; h = r.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };

  let px = 0, targetPx = 0;
  const onMove = (e: PointerEvent) => { targetPx = (e.clientX / innerWidth - 0.5) * 2; };
  window.addEventListener('pointermove', onMove, { passive: true });

  let raf = 0;
  let spin = -0.6;
  let wheel = 0;
  let last = performance.now();
  let lastScroll = scrollY;
  let running = false;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    resize();
    const sv = scrollY - lastScroll;
    lastScroll = scrollY;
    px += (targetPx - px) * Math.min(1, dt * 3);
    spin += dt * 0.35 + sv * 0.004;
    wheel += dt * 4 + sv * 0.05;
    stage.rotation.y = spin + px * 0.6;
    car.userData.wheels.forEach((m) => (m.rotation.x = wheel));
    car.userData.body.rotation.z = Math.sin(now / 600) * 0.012;
    car.position.y = Math.abs(Math.sin(now / 900)) * 0.04;
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  };

  return {
    play() {
      if (running) return;
      if (opts.still) { resize(); renderer.render(scene, camera); return; }
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    pause() { running = false; cancelAnimationFrame(raf); },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
    },
  };
}
