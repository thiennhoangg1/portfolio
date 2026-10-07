// Music engine. Plays real audio files when a track has one, otherwise
// synthesizes a generative ambient sketch. Survives page navigation so
// music keeps playing while visitors browse, with a mini player in the corner.
import { audioCtx } from './sound';
import { $$, cssVar, onPage } from './core';
import { unlock } from './secrets';

type Track = { id: string; title: string; audio?: string; seed: number; key: string; bpm: number };

const KEYS: Record<string, number> = { C: 48, D: 50, E: 52, F: 53, G: 55, A: 57, B: 59 };
const PROGRESSIONS = [[0, 9, 5, 7], [0, 5, 9, 7], [9, 5, 0, 7], [0, 4, 9, 5]];
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

class Engine {
  analyser: AnalyserNode | null = null;
  master: GainNode | null = null;
  current: Track | null = null;
  playing = false;
  started = 0;
  private el: HTMLAudioElement | null = null;
  private elSrc: MediaElementAudioSourceNode | null = null;
  private timer = 0;
  private voices: AudioScheduledSourceNode[] = [];
  private tracks: Track[] = [];

  setTracks(t: Track[]) { this.tracks = t; }

  private graph() {
    const ctx = audioCtx();
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = 0.8;
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.master.connect(this.analyser).connect(ctx.destination);
    }
    return ctx;
  }

  playFirst() {
    if (this.current) return this.play(this.current);
    const t = this.tracks[0] ?? { id: 'default', title: 'Untitled sketch', seed: 3, key: 'D', bpm: 70 };
    this.play(t);
  }

  play(t: Track) {
    this.stopSources();
    const ctx = this.graph();
    this.current = t;
    this.playing = true;
    this.started = ctx.currentTime;
    unlock('musician');
    if (t.audio) {
      if (!this.el) {
        this.el = new Audio();
        this.el.crossOrigin = 'anonymous';
        this.elSrc = ctx.createMediaElementSource(this.el);
        this.elSrc.connect(this.master!);
        this.el.addEventListener('ended', () => { this.playing = false; this.emit(); });
      }
      if (!this.el.src.endsWith(t.audio)) this.el.src = t.audio;
      this.el.play();
    } else {
      this.synth(t);
    }
    this.emit();
  }

  pause() {
    this.playing = false;
    this.el?.pause();
    this.stopSources();
    this.emit();
  }

  toggle(t: Track) {
    if (this.playing && this.current?.id === t.id) this.pause();
    else this.play(t);
  }

  progress() {
    if (this.el && this.current?.audio && this.el.duration) return this.el.currentTime / this.el.duration;
    return null;
  }

  seek(p: number) {
    if (this.el && this.current?.audio && this.el.duration) this.el.currentTime = p * this.el.duration;
  }

  private stopSources() {
    clearTimeout(this.timer);
    const ctx = this.master ? audioCtx() : null;
    for (const v of this.voices) { try { v.stop(ctx ? ctx.currentTime + 0.05 : 0); } catch {} }
    this.voices = [];
  }

  private emit() { window.dispatchEvent(new CustomEvent('player:change')); }

  // A slow pad + bell melody + soft pulse, all derived from the seed.
  private synth(t: Track) {
    const ctx = audioCtx();
    const r = rng(t.seed);
    const root = KEYS[t.key] ?? 48;
    const prog = PROGRESSIONS[Math.floor(r() * PROGRESSIONS.length)];
    const beat = 60 / t.bpm;
    const bar = beat * 4;
    let barIdx = 0;
    let next = ctx.currentTime + 0.05;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.7;
    const delay = ctx.createDelay();
    delay.delayTime.value = beat * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.35;
    delay.connect(fb).connect(delay);
    filter.connect(this.master!);
    delay.connect(this.master!);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 600;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    this.voices.push(lfo);

    const note = (midi: number, start: number, dur: number, type: OscillatorType, vol: number, toDelay = false) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = mtof(midi);
      o.detune.value = (r() - 0.5) * 14;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + Math.min(0.6, dur * 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(filter);
      if (toDelay) g.connect(delay);
      o.start(start);
      o.stop(start + dur + 0.1);
      this.voices.push(o);
      o.onended = () => { this.voices = this.voices.filter((v) => v !== o); };
    };

    const schedule = () => {
      if (!this.playing || this.current !== t) return;
      while (next < ctx.currentTime + bar * 1.5) {
        const deg = prog[barIdx % prog.length];
        const chord = [0, 4, 7, 11].map((i) => root + deg + (i === 4 && [9, 2, 4].includes(deg) ? 3 : i));
        chord.forEach((m) => note(m, next, bar * 1.05, 'triangle', 0.05));
        note(root + deg - 12, next, bar, 'sine', 0.12);
        for (let b = 0; b < 8; b++) {
          if (r() < 0.38) note(root + 24 + PENTA[Math.floor(r() * PENTA.length)], next + b * beat * 0.5, beat * 2.5, 'sine', 0.045, true);
        }
        for (let b = 0; b < 4; b++) note(root - 24, next + b * beat, beat * 0.4, 'sine', b % 2 ? 0.05 : 0.09);
        next += bar;
        barIdx++;
      }
      this.timer = window.setTimeout(schedule, bar * 500);
    };
    schedule();
  }
}

export const player = new Engine();

// --- Visualizer ----------------------------------------------------------------------
function visualize(canvas: HTMLCanvasElement, isActive: () => boolean, mode: 'bars' | 'ring') {
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(devicePixelRatio, 2);
  let raf = 0;
  const bins = new Uint8Array(128);
  const draw = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w < 10 || h < 4) { raf = requestAnimationFrame(draw); return; }
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const live = isActive() && player.analyser;
    if (live) player.analyser!.getByteFrequencyData(bins);
    const accent = cssVar('--accent');
    const fg = cssVar('--fg-3');
    const t = performance.now() / 1000;
    if (mode === 'bars') {
      const n = Math.min(48, Math.floor(w / 6)), gap = w < 120 ? 2 : 3, bw = (w - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const v = live ? bins[Math.floor(i * 1.6)] / 255 : 0.06 + Math.sin(t * 1.5 + i * 0.4) * 0.03;
        const bh = Math.max(2, v * h);
        ctx.fillStyle = live ? accent : fg;
        ctx.globalAlpha = live ? 0.4 + v * 0.6 : 0.5;
        ctx.beginPath();
        ctx.roundRect(i * (bw + gap), (h - bh) / 2, bw, bh, bw / 2);
        ctx.fill();
      }
    } else {
      const cx = w / 2, cy = h / 2, base = Math.min(w, h) * 0.28;
      ctx.beginPath();
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const v = live ? bins[i % 64] / 255 : 0.05 + Math.sin(t + i * 0.3) * 0.02;
        const rr = base + v * base * 0.9;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = live ? accent : fg;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}

// --- Page players --------------------------------------------------------------------
onPage(() => {
  const els = $$('[data-track]');
  if (!els.length) return;
  const tracks: Track[] = els.map((el) => JSON.parse(el.dataset.track!));
  player.setTracks(tracks);
  const stops: (() => void)[] = [];

  const sync = () => {
    els.forEach((el, i) => {
      const active = player.playing && player.current?.id === tracks[i].id;
      el.classList.toggle('playing', active);
      el.querySelector('[data-play]')?.setAttribute('aria-label', active ? `Pause ${tracks[i].title}` : `Play ${tracks[i].title}`);
    });
  };

  els.forEach((el, i) => {
    const btn = el.querySelector('[data-play]');
    const onClick = () => player.toggle(tracks[i]);
    btn?.addEventListener('click', onClick);
    const canvas = el.querySelector<HTMLCanvasElement>('canvas');
    if (canvas) stops.push(visualize(canvas, () => player.playing && player.current?.id === tracks[i].id, (canvas.dataset.mode as 'bars' | 'ring') ?? 'bars'));
    const bar = el.querySelector<HTMLElement>('[data-progress]');
    if (bar) {
      const seek = (e: PointerEvent) => {
        const r = bar.getBoundingClientRect();
        player.seek((e.clientX - r.left) / r.width);
      };
      bar.addEventListener('pointerdown', seek);
      const id = setInterval(() => {
        const p = player.current?.id === tracks[i].id ? player.progress() : null;
        bar.style.setProperty('--p', p === null ? (player.current?.id === tracks[i].id && player.playing ? '1' : '0') : String(p));
        bar.classList.toggle('infinite', p === null && player.current?.id === tracks[i].id && player.playing);
      }, 200);
      stops.push(() => clearInterval(id));
    }
    stops.push(() => btn?.removeEventListener('click', onClick));
  });
  window.addEventListener('player:change', sync);
  sync();
  return () => { stops.forEach((s) => s()); window.removeEventListener('player:change', sync); };
});

// --- Mini player (persistent) -------------------------------------------------------------
export function initMiniPlayer() {
  const mini = document.getElementById('mini-player');
  if (!mini) return;
  const title = mini.querySelector('.mini-title')!;
  const btn = mini.querySelector('button')!;
  const canvas = mini.querySelector('canvas')!;
  visualize(canvas, () => player.playing, 'bars');
  const sync = () => {
    mini.classList.toggle('on', !!player.current);
    mini.classList.toggle('playing', player.playing);
    title.textContent = player.current?.title ?? '';
    btn.setAttribute('aria-label', player.playing ? 'Pause' : 'Play');
  };
  btn.addEventListener('click', () => (player.playing ? player.pause() : player.current && player.play(player.current)));
  window.addEventListener('player:change', sync);
}
