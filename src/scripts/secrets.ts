// Achievements for discovering hidden features. Stored in localStorage.
import { blip } from './sound';

export const SECRETS = [
  { id: 'terminal', title: 'Root access', hint: 'Some sites have a command line. Try ⌘K or /.' },
  { id: 'konami', title: 'Old school', hint: '↑ ↑ ↓ ↓ ← → ← → …' },
  { id: 'theme-party', title: 'Disco', hint: 'Flip the lights on and off. Fast.' },
  { id: 'whisper', title: 'Eavesdropper', hint: 'Some words have dotted underlines.' },
  { id: 'big-bang', title: 'Big bang', hint: 'Press and hold the big name on the home page.' },
  { id: 'hire', title: 'Good taste', hint: 'Ask the terminal for permission to hire.' },
  { id: 'matrix', title: 'Red pill', hint: 'There is a command for the simulation.' },
  { id: 'flashlight', title: 'Night owl', hint: 'The terminal can turn the lights off.' },
  { id: 'gravity', title: 'Newton', hint: 'What goes up… (terminal)' },
  { id: 'sleepy', title: 'Lullaby', hint: 'Leave the site alone for a bit.' },
  { id: 'come-back', title: 'Missed you', hint: 'Switch to another tab and come back.' },
  { id: 'console', title: 'Inspector', hint: 'Open the dev tools console.' },
  { id: 'painter', title: 'Painter', hint: 'Change the accent color (footer).' },
  { id: 'musician', title: 'Listener', hint: 'Play a track on the music page.' },
  { id: 'reader', title: 'Read aloud', hint: 'Let a poem be read to you.' },
  { id: 'lost', title: 'Found it', hint: 'Catch the missing page on the 404.' },
  { id: 'vault', title: 'The vault', hint: 'There is a page listing all of these.' },
] as const;

export type SecretId = (typeof SECRETS)[number]['id'];
const KEY = 'th-secrets';

export function found(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); }
}

export function unlock(id: SecretId) {
  const set = found();
  if (set.has(id)) return false;
  set.add(id);
  localStorage.setItem(KEY, JSON.stringify([...set]));
  const s = SECRETS.find((x) => x.id === id)!;
  toast(`Secret found: ${s.title}`, `${set.size} / ${SECRETS.length}`);
  blip('secret');
  window.dispatchEvent(new CustomEvent('secrets:change'));
  return true;
}

export function resetSecrets() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('secrets:change'));
}

export function toast(title: string, meta = '') {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="toast-icon">✦</span><span class="toast-title"></span><span class="toast-meta"></span>`;
  el.querySelector('.toast-title')!.textContent = title;
  el.querySelector('.toast-meta')!.textContent = meta;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 600);
  }, 3600);
}
