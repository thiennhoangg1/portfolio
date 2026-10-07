// Page-specific interactions: poems, gallery lightbox, clocks, the 404 game,
// and the secrets vault.
import { gsap } from 'gsap';
import { $, $$, onPage, pointer, reducedMotion } from './core';
import { found, SECRETS, unlock } from './secrets';
import { confetti } from './theme';
import { startScroll, stopScroll } from './smooth';

// --- Poems: lines write themselves in; optional read-aloud ----------------------------------
onPage(() => {
  const poems = $$('[data-poem]');
  if (!poems.length) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const lines = $$('.poem-line', e.target as HTMLElement);
      if (reducedMotion()) { lines.forEach((l) => l.classList.add('in')); continue; }
      lines.forEach((l, i) => setTimeout(() => l.classList.add('in'), i * 260));
    }
  }, { threshold: 0.2 });
  poems.forEach((p) => io.observe(p));

  const speak = (e: Event) => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-speak]');
    if (!btn || !('speechSynthesis' in window)) return;
    const poem = btn.closest('[data-poem]')!;
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); btn.textContent = 'read aloud'; return; }
    const text = $$('.poem-line', poem as HTMLElement).map((l) => l.textContent).join('\n');
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85; u.pitch = 0.95;
    u.onend = () => { btn.textContent = 'read aloud'; };
    btn.textContent = 'stop';
    speechSynthesis.speak(u);
    unlock('reader');
  };
  document.addEventListener('click', speak);
  return () => { io.disconnect(); document.removeEventListener('click', speak); if ('speechSynthesis' in window) speechSynthesis.cancel(); };
});

// --- Gallery lightbox ------------------------------------------------------------------------
onPage(() => {
  const items = $$('[data-gallery-item]');
  const box = $('[data-lightbox]');
  if (!items.length || !box) return;
  const img = box.querySelector('img')!;
  const count = box.querySelector('.lb-count')!;
  let i = 0;
  const show = (n: number, dir = 0) => {
    i = (n + items.length) % items.length;
    const src = items[i].dataset.full!;
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    if (reducedMotion() || !dir) { img.src = src; return; }
    gsap.to(img, { x: -dir * 80, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => {
      img.src = src;
      gsap.fromTo(img, { x: dir * 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
    } });
  };
  const open = (n: number) => {
    show(n);
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('open'));
    stopScroll();
  };
  const close = () => {
    box.classList.remove('open');
    startScroll();
    setTimeout(() => (box.hidden = true), 400);
  };
  const onClick = (e: Event) => {
    const t = e.target as Element;
    const item = t.closest<HTMLElement>('[data-gallery-item]');
    if (item) { e.preventDefault(); open(items.indexOf(item)); return; }
    if (t.closest('[data-lb-next]')) show(i + 1, 1);
    else if (t.closest('[data-lb-prev]')) show(i - 1, -1);
    else if (t.closest('[data-lb-close]') || t === box) close();
  };
  const onKey = (e: KeyboardEvent) => {
    if (box.hidden) return;
    if (e.key === 'ArrowRight') show(i + 1, 1);
    if (e.key === 'ArrowLeft') show(i - 1, -1);
    if (e.key === 'Escape') close();
  };
  let sx = 0;
  const ts = (e: TouchEvent) => { sx = e.touches[0].clientX; };
  const te = (e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  };
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  box.addEventListener('touchstart', ts, { passive: true });
  box.addEventListener('touchend', te);
  return () => {
    document.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    startScroll();
  };
});

// --- Clocks: St. Louis time + what Thien is probably doing ---------------------------------
function status(h: number, day: number) {
  if (h < 2) return 'probably writing poems';
  if (h < 7) return 'asleep (hopefully)';
  if (h < 9) return 'coffee, then code';
  if (h < 12) return day === 0 || day === 6 ? 'slow morning' : 'in the lab';
  if (h < 16) return 'training models / office hours';
  if (h < 22) return 'running the dining room';
  return 'closing up, then music';
}

export function initClock() {
  const tick = () => {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', second: '2-digit' });
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23', weekday: 'short' }).formatToParts(now);
    const h = parseInt(parts.find((p) => p.type === 'hour')!.value, 10);
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.find((p) => p.type === 'weekday')!.value);
    for (const el of $$('[data-clock]')) el.textContent = fmt.format(now).toLowerCase();
    for (const el of $$('[data-status]')) el.textContent = status(h, wd);
  };
  tick();
  setInterval(tick, 1000);
  document.addEventListener('astro:page-load', tick);
}

// --- 404: catch the missing page ---------------------------------------------------------------
onPage(() => {
  const arena = $('[data-lost-arena]');
  const dot = $('[data-lost]');
  if (!arena || !dot) return;
  let x = 0.5, y = 0.5, raf = 0, caught = false;
  const place = () => {
    const r = arena.getBoundingClientRect();
    dot.style.transform = `translate(${x * (r.width - 60)}px, ${y * (r.height - 60)}px)`;
  };
  const loop = () => {
    const r = arena.getBoundingClientRect();
    const dx = (r.left + x * (r.width - 60) + 30) - pointer.x;
    const dy = (r.top + y * (r.height - 60) + 30) - pointer.y;
    const d = Math.hypot(dx, dy);
    if (!caught && d < 140) {
      // Flee, but get tired over time so it's catchable.
      const tired = Math.min(1, (performance.now() - t0) / 20000);
      const push = (1 - d / 140) * 0.03 * (1 - tired * 0.7);
      x = Math.min(1, Math.max(0, x + (dx / d) * push * 1.2 + (Math.random() - 0.5) * 0.004));
      y = Math.min(1, Math.max(0, y + (dy / d) * push * 1.6));
      if (x <= 0 || x >= 1) x = 0.5 + (Math.random() - 0.5) * 0.4;
    }
    place();
    raf = requestAnimationFrame(loop);
  };
  const t0 = performance.now();
  raf = requestAnimationFrame(loop);
  const catchIt = () => {
    if (caught) return;
    caught = true;
    unlock('lost');
    confetti();
    dot.classList.add('caught');
    const msg = $('[data-lost-msg]');
    if (msg) msg.textContent = 'You found it. Here is a prize: the way home.';
  };
  dot.addEventListener('click', catchIt);
  return () => { cancelAnimationFrame(raf); dot.removeEventListener('click', catchIt); };
});

// --- Secrets vault page ------------------------------------------------------------------------
onPage(() => {
  const list = $('[data-secrets]');
  if (!list) return;
  unlock('vault');
  const render = () => {
    const f = found();
    list.innerHTML = '';
    for (const s of SECRETS) {
      const li = document.createElement('li');
      li.className = f.has(s.id) ? 'found' : '';
      li.innerHTML = `<span class="s-icon">${f.has(s.id) ? '✦' : '?'}</span><span class="s-title"></span><span class="s-hint"></span>`;
      li.querySelector('.s-title')!.textContent = f.has(s.id) ? s.title : '???';
      li.querySelector('.s-hint')!.textContent = s.hint;
      list.appendChild(li);
    }
    const c = $('[data-secrets-count]');
    if (c) c.textContent = `${f.size}/${SECRETS.length}`;
    const bar = $('[data-secrets-bar]');
    if (bar) bar.style.setProperty('--p', String(f.size / SECRETS.length));
  };
  render();
  window.addEventListener('secrets:change', render);
  return () => window.removeEventListener('secrets:change', render);
});
