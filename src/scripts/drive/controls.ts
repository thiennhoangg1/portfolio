// Keyboard and touch input for drive mode.
import type { Input } from './car';

const KEYS = {
  up: ['w', 'arrowup'], down: ['s', 'arrowdown'], left: ['a', 'arrowleft'], right: ['d', 'arrowright'],
  brake: [' '], boost: ['shift'],
};

export class Controls implements Input {
  throttle = 0;
  steer = 0;
  brake = false;
  boost = false;
  private held = new Set<string>();
  private touch = { throttle: 0, steer: 0, brake: false, boost: false, active: false };
  private offs: (() => void)[] = [];

  constructor(host: HTMLElement, actions: Record<string, () => void>) {
    const typing = (e: Event) => (e.target as Element)?.closest?.('input, textarea, [contenteditable="true"]');
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (Object.values(KEYS).some((l) => l.includes(k))) e.preventDefault();
      this.held.add(k);
      if (!e.repeat && actions[k]) { e.preventDefault(); actions[k](); }
    };
    const up = (e: KeyboardEvent) => this.held.delete(e.key.toLowerCase());
    const blur = () => this.held.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    this.offs.push(() => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    });
    if (matchMedia('(pointer: coarse)').matches) this.mountTouch(host);
  }

  private is(list: string[]) { return list.some((k) => this.held.has(k)); }

  update() {
    const t = this.touch;
    this.throttle = (this.is(KEYS.up) ? 1 : 0) - (this.is(KEYS.down) ? 1 : 0) || t.throttle;
    this.steer = (this.is(KEYS.right) ? 1 : 0) - (this.is(KEYS.left) ? 1 : 0) || t.steer;
    this.brake = this.is(KEYS.brake) || t.brake;
    this.boost = this.is(KEYS.boost) || t.boost;
  }

  /** Left thumb: joystick (up = gas, sideways = steer). Right thumb: boost and drift buttons. */
  private mountTouch(host: HTMLElement) {
    const pad = document.createElement('div');
    pad.className = 'drive-touch';
    pad.innerHTML = `
      <div class="drive-stick" aria-hidden="true"><span></span></div>
      <div class="drive-btns">
        <button type="button" data-t="brake" aria-label="Drift / brake">drift</button>
        <button type="button" data-t="boost" aria-label="Boost">boost</button>
      </div>`;
    host.appendChild(pad);
    const stick = pad.querySelector<HTMLElement>('.drive-stick')!;
    const knob = stick.querySelector('span')!;
    let id = -1;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const r = stick.getBoundingClientRect();
      const R = r.width / 2;
      let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.touch.steer = Math.abs(dx / R) < 0.12 ? 0 : dx / R;
      this.touch.throttle = Math.abs(dy / R) < 0.12 ? 0 : -dy / R;
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      knob.style.transform = '';
      this.touch.steer = this.touch.throttle = 0;
    };
    stick.addEventListener('pointerdown', (e) => { id = e.pointerId; stick.setPointerCapture(id); move(e); });
    stick.addEventListener('pointermove', move);
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    pad.querySelectorAll<HTMLButtonElement>('[data-t]').forEach((b) => {
      const k = b.dataset.t as 'brake' | 'boost';
      const on = (e: PointerEvent) => { e.preventDefault(); this.touch[k] = true; b.classList.add('on'); };
      const off = () => { this.touch[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointerleave', off);
      b.addEventListener('pointercancel', off);
    });
    this.offs.push(() => pad.remove());
  }

  dispose() {
    this.offs.forEach((f) => f());
  }
}
