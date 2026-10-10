// Easter eggs: konami/CRT, matrix rain, flashlight, gravity, flip, idle sleep,
// tab-away title, devtools greeting, and hidden poem whispers.
import { gsap } from 'gsap';
import { $$, pointer, reducedMotion } from './core';
import { unlock } from './secrets';

const html = document.documentElement;

export function crt() {
  html.classList.toggle('crt');
  unlock('konami');
}

export function flip() {
  html.classList.add('upside-down');
  setTimeout(() => html.classList.remove('upside-down'), 3000);
}

export function flashlight() {
  const on = html.classList.toggle('flashlight');
  if (on) {
    unlock('flashlight');
    const off = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { html.classList.remove('flashlight'); window.removeEventListener('keydown', off); }
    };
    window.addEventListener('keydown', off);
  }
}

export function matrix() {
  unlock('matrix');
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas matrix';
  document.getElementById('chrome')!.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  canvas.width = innerWidth; canvas.height = innerHeight;
  const size = 16;
  const cols = Math.ceil(innerWidth / size);
  const drops = Array.from({ length: cols }, () => Math.random() * -50);
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789THIENHOANG';
  const accent = getComputedStyle(html).getPropertyValue('--accent').trim();
  const start = performance.now();
  const frame = (t: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${size}px "JetBrains Mono Variable", monospace`;
    drops.forEach((y, i) => {
      ctx.fillStyle = Math.random() < 0.03 ? '#fff' : accent;
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * size, y * size);
      drops[i] = y * size > canvas.height && Math.random() > 0.975 ? 0 : y + 1;
    });
    if (t - start < 6500) requestAnimationFrame(frame);
    else gsap.to(canvas, { opacity: 0, duration: 0.8, onComplete: () => canvas.remove() });
  };
  requestAnimationFrame(frame);
}

export function gravity() {
  unlock('gravity');
  const els = $$('main h1, main h2, main h3, main p, main img, main .tag, main .btn, main li').filter((e) => {
    const r = e.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  });
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    gsap.to(el, { y: innerHeight - r.top + 200, rotate: (Math.random() - 0.5) * 70, duration: 1 + Math.random() * 0.8, ease: 'power2.in', delay: Math.random() * 0.4 });
  });
  setTimeout(() => {
    gsap.to(els, { y: 0, rotate: 0, duration: 1.2, ease: 'elastic.out(1, 0.6)', stagger: 0.01, onComplete: () => els.forEach((e) => gsap.set(e, { clearProps: 'transform' })) });
  }, 3000);
}

function konami() {
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let i = 0;
  window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    i = k === code[i] ? i + 1 : k === code[0] ? 1 : 0;
    if (i === code.length) { i = 0; crt(); }
  });
}

function idle() {
  const overlay = document.getElementById('sleep');
  if (!overlay) return;
  let t = 0;
  const wake = () => {
    if (overlay.classList.contains('on')) {
      overlay.classList.remove('on');
      unlock('sleepy');
    }
    clearTimeout(t);
    t = window.setTimeout(() => { if (!document.hidden && !document.documentElement.classList.contains('recruiter')) overlay.classList.add('on'); }, 45000);
  };
  ['pointermove', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
  wake();
}

function tabAway() {
  let original = document.title;
  let timer = 0;
  const frames = ['come back 👀', 'come back 👀 ', 'i made more poems', 'come back 👀'];
  document.addEventListener('visibilitychange', () => {
    clearInterval(timer);
    if (document.documentElement.classList.contains('recruiter')) return;
    if (document.hidden) {
      original = document.title;
      let i = 0;
      document.title = frames[0];
      timer = window.setInterval(() => { document.title = frames[++i % frames.length]; }, 2000);
    } else {
      document.title = 'welcome back ✦';
      unlock('come-back');
      setTimeout(() => { document.title = original; }, 1600);
    }
  });
  document.addEventListener('astro:page-load', () => { original = document.title; });
}

function devtools() {
  const accent = getComputedStyle(html).getPropertyValue('--accent').trim() || '#ff5b2e';
  console.log(
    `%c
 ████████╗██╗  ██╗██╗███████╗███╗   ██╗
 ╚══██╔══╝██║  ██║██║██╔════╝████╗  ██║
    ██║   ███████║██║█████╗  ██╔██╗ ██║
    ██║   ██╔══██║██║██╔══╝  ██║╚██╗██║
    ██║   ██║  ██║██║███████╗██║ ╚████║
    ╚═╝   ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═══╝`,
    `color:${accent};font-weight:bold`,
  );
  console.log('%chey, you opened the console. curious people are my favorite people.', 'font-size:14px');
  console.log('%ctry: thien.secret()   ·   thien.hire()   ·   or press ⌘K on the page', 'color:gray');
  (window as any).thien = {
    secret() { unlock('console'); return '✦ secret unlocked. check the page.'; },
    hire() { location.href = 'mailto:h.thien@wustl.edu?subject=Saw%20your%20console'; return 'opening mail…'; },
    help() { return 'thien.secret(), thien.hire()'; },
  };
}

function whispers() {
  const pop = document.getElementById('whisper-pop');
  if (!pop) return;
  let typing = 0;
  document.addEventListener('pointerover', (e) => {
    const w = (e.target as Element).closest<HTMLElement>('.whisper');
    if (!w) return;
    const line = w.dataset.line ?? '';
    clearInterval(typing);
    pop.textContent = '';
    pop.classList.add('show');
    let i = 0;
    typing = window.setInterval(() => {
      pop.textContent = line.slice(0, ++i);
      if (i >= line.length) clearInterval(typing);
    }, reducedMotion() ? 0 : 28);
    unlock('whisper');
    const leave = () => { pop.classList.remove('show'); clearInterval(typing); w.removeEventListener('pointerleave', leave); };
    w.addEventListener('pointerleave', leave);
  });
  const follow = () => {
    pop.style.left = `${Math.min(pointer.x + 16, innerWidth - 300)}px`;
    pop.style.top = `${pointer.y - 70}px`;
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);
}

export function initEggs() {
  konami();
  idle();
  tabAway();
  devtools();
  whispers();
}
