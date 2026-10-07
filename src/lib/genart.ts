// Deterministic generative SVG art used as project covers when no image is set.
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
  ['#ff5b2e', '#ffb347', '#2a1a14', '#f2d9c4'],
  ['#3b5bff', '#9ab3ff', '#0d1030', '#ffd9a8'],
  ['#b6f03c', '#2f6f4f', '#0f1a12', '#f0ffd0'],
  ['#a46bff', '#ff6fae', '#1a0f2a', '#ffe0f0'],
  ['#00c2a8', '#ffcf3f', '#0b1f1f', '#e6fff8'],
  ['#ff6fae', '#ff9f43', '#2b0f1c', '#fff1e0'],
];

export function genArt(seedStr: string, w = 1200, h = 900) {
  const r = rng(hashString(seedStr));
  const [a, b, dark, light] = palettes[Math.floor(r() * palettes.length)];
  const style = Math.floor(r() * 3);
  const parts: string[] = [];

  // Soft blurred blobs for the base.
  for (let i = 0; i < 5; i++) {
    const cx = r() * w, cy = r() * h, rad = (0.25 + r() * 0.35) * w;
    parts.push(`<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(0)}" fill="${[a, b, light][i % 3]}" opacity="${(0.45 + r() * 0.4).toFixed(2)}"/>`);
  }
  const blobs = `<g filter="url(#blur)">${parts.join('')}</g>`;

  // Foreground motif varies by style.
  const fg: string[] = [];
  if (style === 0) {
    // Concentric rings.
    const cx = w * (0.3 + r() * 0.4), cy = h * (0.3 + r() * 0.4);
    for (let i = 1; i < 14; i++) fg.push(`<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${i * 38}" fill="none" stroke="${dark}" stroke-opacity="${(0.5 - i * 0.03).toFixed(2)}" stroke-width="1.2"/>`);
  } else if (style === 1) {
    // Flowing lines.
    for (let i = 0; i < 22; i++) {
      const y = (i / 22) * h + r() * 20;
      const amp = 30 + r() * 90;
      fg.push(`<path d="M0 ${y.toFixed(0)} C ${w * 0.3} ${(y - amp).toFixed(0)}, ${w * 0.6} ${(y + amp).toFixed(0)}, ${w} ${(y - amp / 2).toFixed(0)}" fill="none" stroke="${dark}" stroke-opacity="0.35" stroke-width="1"/>`);
    }
  } else {
    // Dot grid that swells toward a point.
    const px = r() * w, py = r() * h;
    for (let x = 30; x < w; x += 44) for (let y = 30; y < h; y += 44) {
      const d = Math.hypot(x - px, y - py) / w;
      fg.push(`<circle cx="${x}" cy="${y}" r="${Math.max(0.6, 7 - d * 12).toFixed(1)}" fill="${dark}" fill-opacity="0.55"/>`);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><defs><filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(w / 9).toFixed(0)}"/></filter><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/></filter></defs><rect width="100%" height="100%" fill="${light}"/>${blobs}${fg.join('')}<rect width="100%" height="100%" filter="url(#n)"/></svg>`;
  return { svg, url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, accent: a };
}
