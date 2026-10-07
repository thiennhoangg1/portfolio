// Home hero: WebGL flow-field shader, cursor image trail, and the
// press-and-hold "big bang" that explodes the name into particles.
import { gsap } from 'gsap';
import { $$, cssVar, finePointer, hexToRgb, lerp, onPage, pointer, reducedMotion } from './core';
import { unlock } from './secrets';

// --- Shader background ---------------------------------------------------------
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform vec2 uMouse; uniform float uTime;
uniform vec3 uBg; uniform vec3 uFg; uniform vec3 uAccent; uniform float uDark;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 1.6;
  vec2 m = uMouse * vec2(uRes.x / uRes.y, 1.0) * 1.6;
  float t = uTime * 0.06;
  float md = exp(-3.0 * length(p - m));
  vec2 q = vec2(fbm(p + t), fbm(p - t + 4.0));
  vec2 r = vec2(fbm(p + 3.0*q + vec2(1.7, 9.2) + t*1.5 + md*0.8), fbm(p + 3.0*q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 2.5*r);
  float bands = smoothstep(0.45, 0.9, f + md * 0.35);
  vec3 col = mix(uBg, mix(uAccent, uFg, 0.15 + 0.2*q.x), bands * (0.55 + 0.25*uDark));
  // Fine contour lines.
  float lines = abs(fract(f * 9.0) - 0.5);
  col = mix(col, uFg, smoothstep(0.03, 0.0, lines) * 0.08);
  // Fade to background at the bottom so content sits cleanly below.
  col = mix(uBg, col, smoothstep(0.0, 0.45, uv.y));
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

function heroShader(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) return;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'), uMouse = U('uMouse'), uTime = U('uTime'), uBg = U('uBg'), uFg = U('uFg'), uAccent = U('uAccent'), uDark = U('uDark');

  const colors = () => {
    gl.uniform3fv(uBg, hexToRgb(cssVar('--bg')));
    gl.uniform3fv(uFg, hexToRgb(cssVar('--fg')));
    gl.uniform3fv(uAccent, hexToRgb(cssVar('--accent')));
    gl.uniform1f(uDark, document.documentElement.dataset.theme === 'dark' ? 1 : 0);
  };
  colors();
  window.addEventListener('theme:change', colors);

  const scale = 0.5; // render at half res; it's soft anyway
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, r.width * scale);
    canvas.height = Math.max(1, r.height * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener('resize', resize);

  let mx = 0.5, my = 0.5, raf = 0, visible = true;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) raf = requestAnimationFrame(draw);
  });
  io.observe(canvas);
  const t0 = performance.now();
  const still = reducedMotion();
  function draw(t: number) {
    const r = canvas.getBoundingClientRect();
    mx = lerp(mx, (pointer.x - r.left) / r.width, 0.05);
    my = lerp(my, 1 - (pointer.y - r.top) / r.height, 0.05);
    gl!.uniform2f(uMouse, mx, my);
    gl!.uniform1f(uTime, still ? 20 : (t - t0) / 1000);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    if (visible && !still) raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);
  canvas.classList.add('ready');

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener('resize', resize);
    window.removeEventListener('theme:change', colors);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}

onPage(() => {
  const c = document.querySelector<HTMLCanvasElement>('[data-hero-canvas]');
  return c ? heroShader(c) : undefined;
});

// --- Image trail -----------------------------------------------------------------------
onPage(() => {
  const area = document.querySelector<HTMLElement>('[data-trail]');
  if (!area || !finePointer() || reducedMotion()) return;
  const srcs: string[] = JSON.parse(area.dataset.trail || '[]');
  if (!srcs.length) return;
  const pool = srcs.slice(0, 10).map((src) => {
    const img = new Image();
    img.src = src;
    img.alt = '';
    img.className = 'trail-img';
    img.decoding = 'async';
    area.appendChild(img);
    return img;
  });
  let idx = 0, lastX = 0, lastY = 0, z = 1;
  const move = (e: PointerEvent) => {
    if ((e.target as Element).closest('a, button, [data-explode]')) return;
    if (Math.hypot(e.clientX - lastX, e.clientY - lastY) < 110) return;
    lastX = e.clientX; lastY = e.clientY;
    const r = area.getBoundingClientRect();
    const img = pool[idx++ % pool.length];
    img.style.zIndex = String(z++);
    gsap.killTweensOf(img);
    gsap.set(img, { x: e.clientX - r.left, y: e.clientY - r.top, xPercent: -50, yPercent: -50 });
    gsap.timeline()
      .fromTo(img, { opacity: 0, scale: 0.4, rotate: (Math.random() - 0.5) * 30 }, { opacity: 1, scale: 1, rotate: (Math.random() - 0.5) * 12, duration: 0.5, ease: 'expo.out' })
      .to(img, { opacity: 0, scale: 0.6, y: '+=60', duration: 0.8, ease: 'power3.in' }, 0.6);
  };
  area.addEventListener('pointermove', move);
  return () => { area.removeEventListener('pointermove', move); pool.forEach((i) => i.remove()); };
});

// --- Big bang: hold the name to explode it ------------------------------------------------
onPage(() => {
  const el = document.querySelector<HTMLElement>('[data-explode]');
  if (!el) return;
  let timer = 0, busy = false;

  const boom = (ox: number, oy: number) => {
    busy = true;
    el.classList.remove('charging');
    unlock('big-bang');
    const chars = $$('.char', el);
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    document.getElementById('chrome')!.appendChild(canvas);
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    const ctx = canvas.getContext('2d')!;
    // Draw the text into an offscreen canvas to sample its pixels.
    const off = document.createElement('canvas');
    off.width = canvas.width; off.height = canvas.height;
    const octx = off.getContext('2d')!;
    octx.scale(dpr, dpr);
    for (const c of chars) {
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      octx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      octx.fillStyle = '#000';
      octx.textBaseline = 'alphabetic';
      octx.fillText(c.textContent ?? '', r.left, r.top + r.height * 0.78);
    }
    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const step = Math.round(4 * dpr);
    const ps: { x: number; y: number; hx: number; hy: number; vx: number; vy: number; c: string }[] = [];
    const fg = cssVar('--fg'), ac = cssVar('--accent');
    for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) {
      if (data[(y * off.width + x) * 4 + 3] > 128) {
        const hx = x / dpr, hy = y / dpr;
        const ang = Math.atan2(hy - oy, hx - ox) + (Math.random() - 0.5) * 0.8;
        const sp = 6 + Math.random() * 22;
        ps.push({ x: hx, y: hy, hx, hy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, c: Math.random() < 0.18 ? ac : fg });
      }
    }
    el.style.visibility = 'hidden';
    ctx.scale(dpr, dpr);
    const start = performance.now();
    const size = step / dpr;
    const frame = (t: number) => {
      const age = t - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const home = age > 1300;
      for (const p of ps) {
        if (home) {
          p.vx += (p.hx - p.x) * 0.02; p.vy += (p.hy - p.y) * 0.02;
          p.vx *= 0.82; p.vy *= 0.82;
        } else {
          p.vx *= 0.93; p.vy *= 0.93; p.vy += 0.05;
        }
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, size, size);
      }
      if (age < 3300) requestAnimationFrame(frame);
      else { canvas.remove(); el.style.visibility = ''; busy = false; }
    };
    requestAnimationFrame(frame);
  };

  const down = (e: PointerEvent) => {
    if (busy || reducedMotion()) return;
    el.classList.add('charging');
    const { clientX, clientY } = e;
    timer = window.setTimeout(() => boom(clientX, clientY), 900);
  };
  const cancel = () => { clearTimeout(timer); el.classList.remove('charging'); };
  el.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', cancel);
  el.addEventListener('pointerleave', cancel);
  return () => {
    cancel();
    el.removeEventListener('pointerdown', down);
    window.removeEventListener('pointerup', cancel);
    el.removeEventListener('pointerleave', cancel);
  };
});

// --- Floating hover preview for project lists -------------------------------------------------
onPage(() => {
  const list = document.querySelector<HTMLElement>('[data-hover-list]');
  const box = document.querySelector<HTMLElement>('[data-hover-preview]');
  if (!list || !box || !finePointer()) return;
  const img = box.querySelector('img')!;
  let x = pointer.x, y = pointer.y, on = false, raf = 0, rot = 0;
  const loop = () => {
    x = lerp(x, pointer.x, 0.12);
    y = lerp(y, pointer.y, 0.12);
    rot = lerp(rot, Math.max(-14, Math.min(14, (pointer.x - x) * 0.15)), 0.1);
    box.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${rot}deg) scale(${on ? 1 : 0.6})`;
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const over = (e: PointerEvent) => {
    const row = (e.target as Element).closest<HTMLElement>('[data-preview]');
    if (!row) return;
    if (img.getAttribute('src') !== row.dataset.preview) {
      img.src = row.dataset.preview!;
      gsap.fromTo(img, { scale: 1.3, filter: 'blur(8px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.6, ease: 'expo.out' });
    }
    on = true;
    box.classList.add('on');
  };
  const leave = () => { on = false; box.classList.remove('on'); };
  list.addEventListener('pointerover', over);
  list.addEventListener('pointerleave', leave);
  return () => { cancelAnimationFrame(raf); list.removeEventListener('pointerover', over); list.removeEventListener('pointerleave', leave); };
});
