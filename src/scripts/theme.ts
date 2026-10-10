// Dark/light theme with a circular reveal, plus accent colors.
import { reducedMotion } from './core';
import { unlock } from './secrets';

export const ACCENTS: Record<string, string> = {
  ember: '#ff5b2e',
  cobalt: '#4a63ff',
  lime: '#b6f03c',
  violet: '#a46bff',
  rose: '#ff6fae',
  teal: '#14c8b0',
};

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function apply(theme: 'dark' | 'light') {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('th-theme', theme);
  window.dispatchEvent(new CustomEvent('theme:change'));
}

const flips: number[] = [];

export function setTheme(theme: 'dark' | 'light' | 'toggle', origin?: { x: number; y: number }) {
  const next = theme === 'toggle' ? (currentTheme() === 'dark' ? 'light' : 'dark') : theme;
  if (next === currentTheme()) return;

  const now = Date.now();
  flips.push(now);
  while (flips.length && now - flips[0] > 4000) flips.shift();
  if (flips.length >= 6) {
    flips.length = 0;
    party();
  }

  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } };
  if (!doc.startViewTransition || reducedMotion()) return apply(next);

  const x = origin?.x ?? innerWidth - 60;
  const y = origin?.y ?? 40;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.documentElement.classList.add('theme-anim');
  const t = doc.startViewTransition(() => apply(next));
  t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 750, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  });
  t.finished.finally(() => document.documentElement.classList.remove('theme-anim'));
}

export function setAccent(name: string) {
  const hex = ACCENTS[name] ?? (/^#[0-9a-f]{6}$/i.test(name) ? name : null);
  if (!hex) return false;
  document.documentElement.style.setProperty('--accent', hex);
  localStorage.setItem('th-accent', hex);
  window.dispatchEvent(new CustomEvent('theme:change'));
  unlock('painter');
  return true;
}

export function party() {
  unlock('theme-party');
  document.documentElement.classList.add('party');
  confetti();
  setTimeout(() => document.documentElement.classList.remove('party'), 5000);
}

export function confetti(count = 140) {
  if (reducedMotion()) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  document.getElementById('chrome')?.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(devicePixelRatio, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const colors = Object.values(ACCENTS);
  const ps = Array.from({ length: count }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200,
    y: innerHeight * 0.4,
    vx: (Math.random() - 0.5) * 18,
    vy: -Math.random() * 18 - 6,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    w: 6 + Math.random() * 8,
    h: 4 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  const tick = (t: number) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of ps) {
      p.vy += 0.45; p.vx *= 0.99;
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t - start < 3500) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}

export function initTheme() {
  syncFavicon();
  window.addEventListener('theme:change', syncFavicon);
  document.addEventListener('astro:after-swap', syncFavicon);
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest('[data-theme-toggle]');
    if (btn) setTheme('toggle', { x: e.clientX, y: e.clientY });
    const sw = (e.target as Element).closest<HTMLElement>('[data-accent]');
    if (sw) setAccent(sw.dataset.accent!);
  });
  // Follow the OS setting unless the visitor picked a theme themselves.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('th-theme')) apply(e.matches ? 'dark' : 'light');
  });
}

// --- Favicon: the arch takes on the visitor's accent color -----------------------------
function lighten(hex: string, amt: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => mix(c).toString(16).padStart(2, '0')).join('')}`;
}

export function syncFavicon() {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]');
  const hex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  if (!link || !/^#[0-9a-f]{6}$/i.test(hex)) return;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighten(hex, 0.45)}"/><stop offset="1" stop-color="${hex}"/></linearGradient><radialGradient id="g" cx=".5" cy=".95" r=".7"><stop offset="0" stop-color="${hex}" stop-opacity=".55"/><stop offset="1" stop-color="${hex}" stop-opacity="0"/></radialGradient></defs><rect width="64" height="64" rx="15" fill="#0c0c0e"/><rect width="64" height="64" rx="15" fill="url(#g)"/><path d="M12 56C14.5 30 21 10 32 10s17.5 20 20 46" fill="none" stroke="url(#a)" stroke-width="7" stroke-linecap="round"/><path d="M32 31c.8 6.2 4.8 10.2 11 11-6.2.8-10.2 4.8-11 11-.8-6.2-4.8-10.2-11-11 6.2-.8 10.2-4.8 11-11z" fill="#fff"/></svg>`;
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
