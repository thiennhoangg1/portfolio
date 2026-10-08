// Per-page motion: reveals, split text, parallax, magnetic, tilt, scramble,
// timeline drawing, and horizontal scroll sections.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $$, clamp, finePointer, onPage, reducedMotion } from './core';

gsap.registerPlugin(ScrollTrigger);

// --- Scroll reveals ---------------------------------------------------------
onPage(() => {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal], [data-unmask]').forEach((el) => io.observe(el));
  return () => io.disconnect();
});

// --- Split text: words slide up from behind a mask ---------------------------
export function splitWords(el: HTMLElement) {
  if (el.dataset.splitDone) return $$('.split-word', el);
  el.dataset.splitDone = '1';
  const walk = (node: Node): Node[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? '').split(/(\s+)/).filter(Boolean).map((w) => {
        if (/^\s+$/.test(w)) return document.createTextNode(w);
        const line = document.createElement('span');
        line.className = 'split-line';
        line.style.display = 'inline-block';
        const word = document.createElement('span');
        word.className = 'split-word';
        word.textContent = w;
        line.appendChild(word);
        return line;
      });
    }
    if (node instanceof HTMLElement && node.tagName !== 'BR') {
      const kids = Array.from(node.childNodes).flatMap(walk);
      node.replaceChildren(...kids);
    }
    return [node];
  };
  el.replaceChildren(...Array.from(el.childNodes).flatMap(walk));
  return $$('.split-word', el);
}

onPage(() => {
  if (reducedMotion()) return;
  const tweens: gsap.core.Tween[] = [];
  for (const el of $$('[data-split]')) {
    const words = splitWords(el);
    const immediate = el.dataset.split === 'load';
    tweens.push(gsap.from(words, {
      yPercent: 115,
      rotate: 4,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.045,
      delay: immediate ? 0.15 : 0,
      scrollTrigger: immediate ? undefined : { trigger: el, start: 'top 88%' },
    }));
  }
  return () => tweens.forEach((t) => t.kill());
});

// --- Parallax ----------------------------------------------------------------
onPage(() => {
  if (reducedMotion()) return;
  const ctx = gsap.context(() => {
    for (const el of $$('[data-parallax]')) {
      const amt = parseFloat(el.dataset.parallax || '0.15');
      gsap.fromTo(el, { yPercent: -amt * 100 }, {
        yPercent: amt * 100,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }
    // Images zoom out slightly as they scroll into view.
    for (const el of $$('[data-zoom]')) {
      gsap.fromTo(el, { scale: 1.25 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }
  });
  return () => ctx.revert();
});

// --- Count up numbers ----------------------------------------------------------
onPage(() => {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      io.unobserve(el);
      const to = parseFloat(el.dataset.count!);
      const suffix = el.dataset.suffix ?? '';
      if (reducedMotion()) { el.textContent = to + suffix; continue; }
      const obj = { v: 0 };
      gsap.to(obj, { v: to, duration: 2, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString() + suffix; } });
    }
  });
  $$('[data-count]').forEach((el) => io.observe(el));
  return () => io.disconnect();
});

// --- Magnetic elements ---------------------------------------------------------
onPage(() => {
  if (!finePointer() || reducedMotion()) return;
  const offs: (() => void)[] = [];
  for (const el of $$('[data-magnetic]')) {
    const strength = parseFloat(el.dataset.magnetic || '0.35');
    const inner = el.querySelector<HTMLElement>('[data-magnetic-inner]');
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      gsap.to(el, { x: x * strength, y: y * strength, duration: 0.6, ease: 'power3.out' });
      if (inner) gsap.to(inner, { x: x * strength * 0.5, y: y * strength * 0.5, duration: 0.6, ease: 'power3.out' });
    };
    const leave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.35)' });
      if (inner) gsap.to(inner, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.35)' });
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    offs.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
  }
  return () => offs.forEach((f) => f());
});

// --- 3D tilt with glare ------------------------------------------------------------
onPage(() => {
  if (!finePointer() || reducedMotion()) return;
  const offs: (() => void)[] = [];
  for (const el of $$('[data-tilt]')) {
    const max = parseFloat(el.dataset.tilt || '10');
    const glare = el.querySelector<HTMLElement>('.glare');
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      gsap.to(el, { rotateY: (px - 0.5) * max * 2, rotateX: -(py - 0.5) * max * 2, transformPerspective: 900, duration: 0.5, ease: 'power3.out' });
      if (glare) {
        glare.style.opacity = '1';
        glare.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgb(255 255 255 / 0.35), transparent 55%)`;
      }
    };
    const leave = () => {
      gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
      if (glare) glare.style.opacity = '0';
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    offs.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
  }
  return () => offs.forEach((f) => f());
});

// --- Text scramble ----------------------------------------------------------------------
const GLYPHS = '!<>-_\\/[]{}—=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const running = new WeakMap<HTMLElement, number>();

export function scramble(el: HTMLElement, to = el.dataset.text ?? el.textContent ?? '', duration = 700) {
  if (reducedMotion()) { el.textContent = to; return; }
  el.dataset.text = to;
  cancelAnimationFrame(running.get(el) ?? 0);
  const start = performance.now();
  const tick = (t: number) => {
    const p = clamp((t - start) / duration, 0, 1);
    const revealed = Math.floor(p * to.length);
    let out = '';
    for (let i = 0; i < to.length; i++) {
      if (i < revealed || to[i] === ' ') out += to[i];
      else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
    el.textContent = out;
    if (p < 1) running.set(el, requestAnimationFrame(tick));
  };
  running.set(el, requestAnimationFrame(tick));
}

onPage(() => {
  const els = $$('[data-scramble]');
  const enter = (e: Event) => scramble(e.currentTarget as HTMLElement);
  els.forEach((el) => {
    el.dataset.text ??= el.textContent ?? '';
    el.addEventListener('pointerenter', enter);
  });
  return () => els.forEach((el) => el.removeEventListener('pointerenter', enter));
});

// --- Rotating words ("I am a ___") -------------------------------------------------------
onPage(() => {
  const el = document.querySelector<HTMLElement>('[data-rotate-words]');
  if (!el) return;
  const words = JSON.parse(el.dataset.rotateWords!);
  let i = 0;
  const id = setInterval(() => {
    i = (i + 1) % words.length;
    scramble(el, words[i], 600);
  }, 2600);
  return () => clearInterval(id);
});

// --- Timeline line draws as you scroll ------------------------------------------------------
onPage(() => {
  const tl = document.querySelector<HTMLElement>('[data-timeline]');
  if (!tl) return;
  const ctx = gsap.context(() => {
    const fill = tl.querySelector('.timeline-fill');
    if (fill) {
      gsap.fromTo(fill, { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: tl, start: 'top 60%', end: 'bottom 60%', scrub: reducedMotion() ? false : 0.5 },
      });
    }
    for (const item of $$('.timeline-item', tl)) {
      ScrollTrigger.create({ trigger: item, start: 'top 60%', onToggle: (s) => item.classList.toggle('active', s.isActive || s.progress > 0), end: 'max' });
    }
  });
  return () => ctx.revert();
});

// --- Horizontal scrolling section ----------------------------------------------------------
onPage(() => {
  const sec = document.querySelector<HTMLElement>('[data-hscroll]');
  if (!sec || reducedMotion()) return;
  const track = sec.querySelector<HTMLElement>('[data-hscroll-track]')!;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const dist = () => track.scrollWidth - innerWidth + 80;
    // Coverflow: cards turn and sink back in 3D the farther they are from center.
    const items = Array.from(track.children) as HTMLElement[];
    const flow = () => {
      const mid = innerWidth / 2;
      for (const el of items) {
        const r = el.getBoundingClientRect();
        const d = clamp((r.left + r.width / 2 - mid) / innerWidth, -1, 1);
        el.style.transform = `translateZ(${(-Math.abs(d) * 220).toFixed(1)}px) rotateY(${(-d * 32).toFixed(2)}deg)`;
        el.style.opacity = String(1 - Math.abs(d) * 0.35);
      }
    };
    gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      onUpdate: flow,
      scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${dist()}`, scrub: 0.8, pin: true, invalidateOnRefresh: true, anticipatePin: 1, onRefresh: flow },
    });
    flow();
    return () => items.forEach((el) => { el.style.transform = ''; el.style.opacity = ''; });
  });
  return () => mm.revert();
});

// --- 3D character flip: letters rotate up into place, like a split-flap board ---
function splitChars(el: HTMLElement) {
  if (el.dataset.flipDone) return $$('.flip-char', el);
  el.dataset.flipDone = '1';
  el.setAttribute('aria-label', el.textContent ?? '');
  const walk = (node: Node): Node[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? '').split(/(\s+)/).filter(Boolean).map((w) => {
        if (/^\s+$/.test(w)) return document.createTextNode(w);
        const word = document.createElement('span');
        word.className = 'flip-word';
        word.setAttribute('aria-hidden', 'true');
        for (const ch of w) {
          const c = document.createElement('span');
          c.className = 'flip-char';
          c.textContent = ch;
          word.appendChild(c);
        }
        return word;
      });
    }
    if (node instanceof HTMLElement) node.replaceChildren(...Array.from(node.childNodes).flatMap(walk));
    return [node];
  };
  el.replaceChildren(...Array.from(el.childNodes).flatMap(walk));
  return $$('.flip-char', el);
}

onPage(() => {
  if (reducedMotion()) return;
  const tweens: gsap.core.Tween[] = [];
  for (const el of $$('[data-flip3d]')) {
    const chars = splitChars(el);
    tweens.push(gsap.from(chars, {
      rotateX: -100,
      yPercent: 40,
      z: -80,
      opacity: 0,
      transformOrigin: '50% 50% -0.4em',
      duration: 1.1,
      ease: 'expo.out',
      stagger: { each: 0.035, from: 'start' },
      scrollTrigger: { trigger: el, start: 'top 88%' },
    }));
  }
  return () => tweens.forEach((t) => t.kill());
});
