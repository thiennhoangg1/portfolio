// Tiny synthesized UI sounds. Off by default; toggled from the nav or terminal.

const KEY = 'th-sound';
let ctx: AudioContext | null = null;

export const soundOn = () => localStorage.getItem(KEY) === 'on';

export function setSound(on: boolean) {
  localStorage.setItem(KEY, on ? 'on' : 'off');
  document.documentElement.dataset.sound = on ? 'on' : 'off';
  if (on) blip('click');
}

export function audioCtx() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

type Kind = 'hover' | 'click' | 'secret' | 'key' | 'open';

export function blip(kind: Kind) {
  if (!soundOn()) return;
  const c = audioCtx();
  const t = c.currentTime;
  const notes: Record<Kind, number[]> = {
    hover: [1320],
    click: [660, 990],
    key: [880 + Math.random() * 300],
    open: [440, 660, 880],
    secret: [523.25, 659.25, 783.99, 1046.5],
  };
  const gainPeak = kind === 'hover' || kind === 'key' ? 0.025 : 0.06;
  notes[kind].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = kind === 'secret' ? 'triangle' : 'sine';
    o.frequency.value = f;
    const start = t + i * 0.06;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gainPeak, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + (kind === 'secret' ? 0.5 : 0.12));
    o.connect(g).connect(c.destination);
    o.start(start);
    o.stop(start + 0.6);
  });
}

export function initSound() {
  document.documentElement.dataset.sound = soundOn() ? 'on' : 'off';
  let last: Element | null = null;
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as Element).closest('a, button, [data-sound]');
    if (t && t !== last) blip('hover');
    last = t;
  });
  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a, button')) blip('click');
  });
}
