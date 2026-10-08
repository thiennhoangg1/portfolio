// Turns drive mode on and off. The 3D world (three.js) is only downloaded
// the first time someone starts driving.
import { navigate } from 'astro:transitions/client';
import { reducedMotion } from './core';
import { startScroll, stopScroll } from './smooth';
import { unlock } from './secrets';
import { blip } from './sound';

let running: { stop(): void } | null = null;
let session = 0;

const host = () => document.getElementById('drive');
export const driving = () => document.documentElement.classList.contains('driving');

export async function startDrive() {
  const el = host();
  if (!el || driving()) return;
  if (reducedMotion() && !confirm('Drive mode has a lot of motion. Continue?')) return;
  const id = ++session;
  document.documentElement.classList.add('driving');
  stopScroll();
  el.hidden = false;
  el.innerHTML = '<div class="drive-loading"><span class="drive-loading-car" aria-hidden="true">🚗</span><span class="mono">warming up the engine…</span></div>';
  requestAnimationFrame(() => el.classList.add('open'));
  blip('open');
  try {
    const { mount } = await import('./drive/index');
    if (id !== session) return;
    const m = await mount(el, {
      onExit: stopDrive,
      onNavigate: (href) => { stopDrive(); navigate(href); },
    });
    if (id !== session) { m.stop(); return; }
    running = m;
    el.querySelector('.drive-loading')?.remove();
    unlock('road-trip');
  } catch (err) {
    console.error(err);
    stopDrive();
  }
}

export function stopDrive() {
  const el = host();
  session++;
  running?.stop();
  running = null;
  document.documentElement.classList.remove('driving');
  startScroll();
  if (!el) return;
  el.classList.remove('open');
  setTimeout(() => {
    if (!driving()) { el.hidden = true; el.innerHTML = ''; }
  }, 450);
}

export const toggleDrive = () => (driving() ? stopDrive() : startDrive());

export function initDriveMode() {
  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('[data-drive-toggle]')) return;
    e.preventDefault();
    toggleDrive();
  });
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || driving()) return;
    if ((e.target as Element).closest('input, textarea, select, [contenteditable="true"]')) return;
    if (!document.getElementById('terminal')?.hidden) return;
    if (e.key === 'd' || e.key === 'D') startDrive();
  });
}
