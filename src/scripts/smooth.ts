// Smooth scrolling (Lenis) wired into GSAP's ticker and ScrollTrigger.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $$, clamp, reducedMotion } from './core';

gsap.registerPlugin(ScrollTrigger);

export let lenis: Lenis | null = null;
let velocity = 0;

export function initSmooth() {
  if (!reducedMotion()) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', (l: Lenis) => {
      velocity = l.velocity;
      ScrollTrigger.update();
    });
    gsap.ticker.add((t) => lenis?.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const bar = document.getElementById('progress');
  // Skew elements with scroll velocity, and update the progress bar.
  let skew = 0;
  gsap.ticker.add(() => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    if (!lenis) return;
    skew += (clamp(velocity * 0.25, -8, 8) - skew) * 0.12;
    for (const el of $$('[data-skew]')) el.style.transform = `skewY(${skew.toFixed(2)}deg)`;
    velocity *= 0.9;
  });

  document.addEventListener('astro:after-swap', () => {
    lenis?.scrollTo(0, { immediate: true });
  });
  document.addEventListener('astro:page-load', () => {
    requestAnimationFrame(() => ScrollTrigger.refresh());
  });
  document.addEventListener('astro:before-swap', () => {
    ScrollTrigger.getAll().forEach((t) => t.kill());
  });
}

export const stopScroll = () => lenis?.stop();
export const startScroll = () => lenis?.start();
