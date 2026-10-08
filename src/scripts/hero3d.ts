// Loads the 3D car teaser (and three.js) only when its section scrolls near.
import { cssVar, onPage, reducedMotion } from './core';

onPage(() => {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-hero3d]');
  if (!canvas) return;
  let teaser: { play(): void; pause(): void; dispose(): void } | null = null;
  let visible = false;
  let disposed = false;

  const io = new IntersectionObserver(async ([e]) => {
    visible = e.isIntersecting;
    if (!visible) return teaser?.pause();
    if (teaser) return teaser.play();
    const { mountTeaser } = await import('./drive/teaser');
    if (disposed || teaser) return;
    teaser = mountTeaser(canvas, { accent: cssVar('--accent') || '#ff5b2e', still: reducedMotion() });
    canvas.classList.add('ready');
    if (visible) teaser.play();
  }, { rootMargin: '200px 0px' });
  io.observe(canvas);

  return () => {
    disposed = true;
    io.disconnect();
    teaser?.dispose();
  };
});
