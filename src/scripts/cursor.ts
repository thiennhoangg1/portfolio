// Custom cursor: a precise dot, a lagging ring, and contextual labels.
import { finePointer, lerp, pointer, recruiterMode, reducedMotion } from './core';

export function initCursor() {
  if (!finePointer() || recruiterMode()) return;
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  const label = document.getElementById('cursor-label');
  if (!dot || !ring || !label) return;
  document.documentElement.classList.add('has-cursor');

  let rx = pointer.x, ry = pointer.y;
  let visible = false;

  window.addEventListener('pointermove', () => {
    if (!visible) {
      visible = true;
      ring.classList.add('on');
      dot.classList.add('on');
    }
  });
  document.documentElement.addEventListener('pointerleave', () => {
    visible = false;
    ring.classList.remove('on');
    dot.classList.remove('on');
  });
  window.addEventListener('pointerdown', () => ring.classList.add('down'));
  window.addEventListener('pointerup', () => ring.classList.remove('down'));

  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element;
    const labeled = t.closest<HTMLElement>('[data-cursor]');
    const interactive = t.closest('a, button, input, textarea, [role="button"], [data-hover]');
    const text = labeled?.dataset.cursor ?? '';
    label.textContent = text;
    ring.classList.toggle('label', !!text);
    ring.classList.toggle('hover', !text && !!interactive);
    ring.classList.toggle('text', !text && !interactive && !!t.closest('p, li, .prose, h1, h2, h3'));
  });

  const speed = reducedMotion() ? 1 : 0.16;
  const loop = () => {
    rx = lerp(rx, pointer.x, speed);
    ry = lerp(ry, pointer.y, speed);
    dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
    const stretch = Math.min(Math.hypot(pointer.x - rx, pointer.y - ry) / 120, 0.35);
    const angle = Math.atan2(pointer.y - ry, pointer.x - rx);
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch})`;
    label.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
