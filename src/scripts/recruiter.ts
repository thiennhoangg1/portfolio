// Recruiter mode: turns off motion, the custom cursor, and easter-egg noise,
// and points to a one-page resume. Persists in localStorage; ?recruiter in a
// URL turns it on (handy for links in applications).
import { recruiterMode } from './core';

const KEY = 'th-recruiter';

export function setRecruiter(on: boolean) {
  localStorage.setItem(KEY, on ? 'on' : 'off');
  // Smooth scrolling and the cursor are set up once at load, so reload into the new mode.
  if (on) location.href = '/resume';
  else location.reload();
}

export function initRecruiter() {
  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('[data-recruiter-toggle]')) return;
    e.preventDefault();
    setRecruiter(!recruiterMode());
  });
  // Strip ?recruiter from the address bar once it has been applied.
  if (/[?&]recruiter\b/.test(location.search)) {
    const url = new URL(location.href);
    url.searchParams.delete('recruiter');
    history.replaceState(history.state, '', url);
  }
}
