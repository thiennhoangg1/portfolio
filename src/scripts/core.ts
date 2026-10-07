// Shared runtime helpers: page lifecycle (works with Astro's ClientRouter),
// motion preferences, and pointer state.

type Cleanup = void | (() => void);
type PageInit = () => Cleanup;

const inits: PageInit[] = [];
let cleanups: (() => void)[] = [];

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => window.matchMedia('(pointer: fine)').matches;

/** Register a function that runs on every page load and may return a cleanup. */
export function onPage(fn: PageInit) {
  inits.push(fn);
}

export function startLifecycle() {
  document.addEventListener('astro:page-load', () => {
    for (const fn of inits) {
      try {
        const c = fn();
        if (typeof c === 'function') cleanups.push(c);
      } catch (err) {
        console.error(err);
      }
    }
  });
  document.addEventListener('astro:before-swap', () => {
    for (const c of cleanups) {
      try { c(); } catch (err) { console.error(err); }
    }
    cleanups = [];
  });
}

/** Live pointer position shared by cursor, flashlight, whispers, etc. */
export const pointer = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0 };
window.addEventListener('pointermove', (e) => {
  pointer.vx = e.clientX - pointer.x;
  pointer.vy = e.clientY - pointer.y;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  document.documentElement.style.setProperty('--mx', `${e.clientX}px`);
  document.documentElement.style.setProperty('--my', `${e.clientY}px`);
}, { passive: true });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel as any) as T | null;
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel as any)) as T[];

export function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h || '000000', 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
