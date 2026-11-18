// Deterministic doodle art used as project covers when no image is set:
// a flat pastel page with hand-drawn shapes scattered over it.
// Same seed => same artwork, so each project keeps its own look.

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const palettes = [
  ['#fbefc4', '#ff8a6b'],
  ['#dcecff', '#ffd84d'],
  ['#fde3ec', '#8cc8ff'],
  ['#dcf5e7', '#ff9ec4'],
  ['#ebe4ff', '#ffd84d'],
  ['#ffe9d6', '#8ee6b8'],
];
const INK = '#1d1a24';

// Each doodle is drawn around (0,0) at roughly 100px, then placed with a transform.
const shapes: ((fill: string) => string)[] = [
  // star
  (f) => `<path d="M0 -48 L13 -15 L48 -14 L20 8 L30 44 L0 23 L-30 44 L-20 8 L-48 -14 L-13 -15 Z" fill="${f}"/>`,
  // squiggle
  () => `<path d="M-60 0 C -45 -30, -30 30, -15 0 S 15 -30, 30 0 S 60 30, 70 0" fill="none"/>`,
  // spiral
  () => `<path d="M0 0 C 6 -6, 14 2, 8 10 C 0 20, -18 12, -16 -4 C -14 -24, 14 -30, 26 -10 C 38 12, 18 36, -6 34 C -34 32, -44 4, -32 -20" fill="none"/>`,
  // circle
  (f) => `<circle r="30" fill="${f}"/><path d="M-36 -6 C -30 -40, 30 -44, 38 -4" fill="none"/>`,
  // zigzag
  () => `<path d="M-60 10 L-40 -15 L-20 10 L0 -15 L20 10 L40 -15 L60 10" fill="none"/>`,
  // heart
  (f) => `<path d="M0 30 C -40 4, -44 -26, -20 -30 C -8 -32, 0 -22, 0 -14 C 0 -22, 8 -32, 20 -30 C 44 -26, 40 4, 0 30 Z" fill="${f}"/>`,
  // sparkle
  () => `<path d="M0 -36 V36 M-36 0 H36 M-20 -20 L20 20 M20 -20 L-20 20" fill="none"/>`,
  // arrow
  () => `<path d="M-50 20 C -20 -20, 20 -20, 45 0 M30 -14 L46 0 L28 10" fill="none"/>`,
  // cloud
  (f) => `<path d="M-40 16 C -60 16, -58 -12, -36 -10 C -34 -34, 0 -36, 6 -16 C 18 -32, 46 -22, 38 0 C 58 2, 54 24, 36 22 Z" fill="${f}"/>`,
];

export function genArt(seedStr: string, w = 1200, h = 900) {
  const r = rng(hashString(seedStr));
  const [bg, pop] = palettes[Math.floor(r() * palettes.length)];
  const unit = Math.min(w, h) / 900;
  const parts: string[] = [];

  // Spread doodles on a jittered grid so they don't pile up.
  const cols = 4, rows = 3;
  for (let gx = 0; gx < cols; gx++) for (let gy = 0; gy < rows; gy++) {
    if (r() < 0.45) continue;
    const x = ((gx + 0.2 + r() * 0.6) / cols) * w;
    const y = ((gy + 0.2 + r() * 0.6) / rows) * h;
    const shape = shapes[Math.floor(r() * shapes.length)];
    const scale = (0.9 + r() * 1.1) * unit * 1.4;
    const rot = (r() - 0.5) * 60;
    const fill = r() < 0.5 ? pop : '#fffaf0';
    parts.push(`<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${rot.toFixed(0)}) scale(${scale.toFixed(2)})">${shape(fill)}</g>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><rect width="100%" height="100%" fill="${bg}"/><g stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke">${parts.join('')}</g></svg>`;
  return { svg, url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, accent: pop };
}
