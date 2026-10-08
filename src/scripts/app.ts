// Entry point. Global features start once; page features re-run on every
// navigation via onPage() (see core.ts).
import { startLifecycle } from './core';
import { initSmooth } from './smooth';
import { initCursor } from './cursor';
import { initTheme } from './theme';
import { initSound, setSound, soundOn } from './sound';
import { initTerminal } from './terminal';
import { initEggs } from './eggs';
import { initMiniPlayer } from './audio';
import { initClock } from './pages';
import { initDriveMode } from './driveMode';
import { found, SECRETS } from './secrets';
import './motion';
import './hero';
import './hero3d';

document.documentElement.classList.add('js');

initSmooth();
initCursor();
initTheme();
initSound();
initTerminal();
initEggs();
initMiniPlayer();
initClock();
initDriveMode();

// Secrets counter in the nav.
const syncSecrets = () => {
  document.querySelectorAll<HTMLElement>('[data-secret-count]').forEach((el) => {
    el.textContent = `${found().size}/${SECRETS.length}`;
  });
};
window.addEventListener('secrets:change', syncSecrets);
document.addEventListener('astro:page-load', syncSecrets);

// Sound toggle.
document.addEventListener('click', (e) => {
  if ((e.target as Element).closest('[data-sound-toggle]')) setSound(!soundOn());
});

// Mobile menu.
document.addEventListener('click', (e) => {
  const t = e.target as Element;
  if (t.closest('[data-menu-toggle]')) document.documentElement.classList.toggle('menu-open');
  else if (t.closest('.menu a')) document.documentElement.classList.remove('menu-open');
});
document.addEventListener('astro:before-swap', () => document.documentElement.classList.remove('menu-open'));

// Astro replaces <html> attributes on navigation; carry our state over.
const KEEP = ['js', 'has-cursor', 'crt', 'flashlight', 'lenis', 'lenis-smooth', 'driving'];
document.addEventListener('astro:before-swap', (e) => {
  const cur = document.documentElement;
  const next = (e as unknown as { newDocument: Document }).newDocument.documentElement;
  KEEP.forEach((c) => cur.classList.contains(c) && next.classList.add(c));
  next.dataset.theme = cur.dataset.theme;
  next.dataset.sound = cur.dataset.sound;
  const accent = cur.style.getPropertyValue('--accent');
  if (accent) next.style.setProperty('--accent', accent);
});

// Mark the current nav link.
document.addEventListener('astro:page-load', () => {
  const path = location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll<HTMLAnchorElement>('[data-nav] a').forEach((a) => {
    const href = a.getAttribute('href')!;
    const active = href === '/' ? path === '/' : path.startsWith(href);
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
});

startLifecycle();
