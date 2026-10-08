// Drive mode overlay UI: info cards, area titles, passport, mini-map,
// speedometer, quick-travel map, and controls help.
import { landmarks, world, type Landmark, type Section } from '../../data/drive';
import { found, SECRETS } from '../secrets';

export interface DriveData {
  site: { name: string; roles: string[]; description: string; email: string; linkedin: string; github: string; location: string };
  education: { school: string; degrees: string[]; honors: string[]; coursework: string[] };
  skills: { languages: string[]; tools: string[] };
  projects: { slug: string; title: string; tagline: string; kind: 'work' | 'research' | 'side'; year: string; role: string; stack: string[] }[];
  experience: { id: string; role: string; org: string; location: string; start: string; end: string; tags: string[]; bullets: string[] }[];
  music: { id: string; title: string; mood: string; audio?: string; seed: number; key: string; bpm: number }[];
  poems: { id: string; title: string }[];
}

export type Stop =
  | { kind: 'landmark'; id: string; x: number; z: number; r: number; lm: Landmark }
  | { kind: 'board'; id: string; x: number; z: number; r: number; index: number; total: number; title: string; meta: string; lines: string[]; html?: string };

export interface HudHandlers {
  park(): void;
  travel(id: string): void;
  navigate(href: string): void;
  play(trackId: string): void;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const dates = (e: DriveData['experience'][number]) => [e.start, e.end].filter(Boolean).join(' – ');
const ML = ['PyTorch', 'TensorFlow', 'scikit-learn', 'OpenCV', 'YOLOv8', 'CoreML'];
const WEB = ['React', 'Node.js', 'PostgreSQL', 'FastAPI', 'Firebase', 'WebRTC', 'Electron'];

/** Projects not explicitly placed anywhere land at the first landmark that catches their kind. */
export function assignProjects(data: DriveData) {
  const placed = new Set(landmarks.flatMap((l) => l.projects ?? []));
  const extra = new Map<string, string[]>();
  for (const p of data.projects) {
    if (placed.has(p.slug)) continue;
    const lm = landmarks.find((l) => l.catchKind === p.kind) ?? landmarks.find((l) => l.id === 'tokyo')!;
    extra.set(lm.id, [...(extra.get(lm.id) ?? []), p.slug]);
  }
  return extra;
}

export function createHud(host: HTMLElement, data: DriveData, h: HudHandlers) {
  const extra = assignProjects(data);
  const chips = (list: string[]) => `<div class="dc-chips">${list.map((s) => `<span>${esc(s)}</span>`).join('')}</div>`;
  const nav = (href: string, text: string) => `<a href="${esc(href)}" data-drive-nav>${esc(text)} →</a>`;
  const ext = (href: string, text: string) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)} ↗</a>`;

  const sections: Record<Section, () => string> = {
    about: () => `<p class="dc-lead">${esc(data.site.name)}: ${esc(data.site.roles.slice(0, 4).join(' · '))}.</p><p>${esc(data.site.description)}</p>`,
    resume: () => `<div class="dc-actions"><a class="dc-btn" href="/resume.pdf" target="_blank" rel="noopener">Download resume.pdf ↓</a>${nav('/about', 'About')}${nav('/experience', 'Work')}</div>`,
    contact: () => `<div class="dc-actions"><a class="dc-btn" href="mailto:${esc(data.site.email)}">${esc(data.site.email)}</a>${ext(data.site.linkedin, 'LinkedIn')}${ext(data.site.github, 'GitHub')}</div>`,
    skills: () => {
      const tools = data.skills.tools;
      const faces = [
        ['Languages', data.skills.languages],
        ['Machine learning', tools.filter((t) => ML.includes(t))],
        ['Web & apps', tools.filter((t) => WEB.includes(t))],
        ['Tools', tools.filter((t) => !ML.includes(t) && !WEB.includes(t))],
      ] as const;
      return faces.map(([t, l]) => `<h4>${t}</h4>${chips([...l])}`).join('');
    },
    education: () => `<p class="dc-lead">${esc(data.education.school)}</p><ul>${data.education.degrees.map((d) => `<li>${esc(d)}</li>`).join('')}</ul><h4>Honors</h4>${chips(data.education.honors)}<h4>Coursework</h4>${chips(data.education.coursework)}`,
    timeline: () => `<ol class="dc-timeline">${data.experience.map((e) => `<li><b>${esc(e.role)}</b><span>${esc(e.org)}</span><span class="dc-dim">${esc(dates(e))}</span></li>`).join('')}</ol><div class="dc-actions">${nav('/experience', 'Full timeline')}<a class="dc-btn" href="/resume.pdf" target="_blank" rel="noopener">Resume ↓</a></div>`,
    music: () => `<ul class="dc-list">${data.music.map((m) => `<li><button type="button" class="dc-play" data-play="${esc(m.id)}" aria-label="Play ${esc(m.title)}">▶</button><div><b>${esc(m.title)}</b><span class="dc-dim">${esc(m.mood)}</span></div></li>`).join('')}</ul><div class="dc-actions">${nav('/music', 'Music page')}</div>`,
    poetry: () => `<ul class="dc-list">${data.poems.map((p) => `<li><div><b>${esc(p.title)}</b></div></li>`).join('')}</ul><div class="dc-actions">${nav('/poetry', 'Read the poems')}</div>`,
    gallery: () => `<div class="dc-actions">${nav('/gallery', 'Photo gallery')}</div>`,
    lab: () => `<p>Generative art, interests, and what I'm up to now.</p><div class="dc-actions">${nav('/lab', 'Visit the Lab')}</div>`,
    secrets: () => `<p>You've found <b>${found().size} / ${SECRETS.length}</b> secrets. Driving here counts.</p><div class="dc-actions">${nav('/secrets', 'Open the vault')}</div>`,
  };

  const projectHtml = (slug: string) => {
    const p = data.projects.find((x) => x.slug === slug);
    if (!p) return '';
    return `<article class="dc-item"><div class="dc-meta">${esc(p.kind)} · ${esc(p.year)}</div><h4>${esc(p.title)}</h4><p>${esc(p.tagline)}</p>${chips(p.stack.slice(0, 5))}${nav(`/projects/${p.slug}`, 'Open project')}</article>`;
  };
  const jobHtml = (id: string) => {
    const e = data.experience.find((x) => x.id === id);
    if (!e) return '';
    return `<article class="dc-item"><div class="dc-meta">${esc(dates(e))} · ${esc(e.location)}</div><h4>${esc(e.role)}</h4><p class="dc-org">${esc(e.org)}</p><ul>${e.bullets.slice(0, 2).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>${chips(e.tags)}</article>`;
  };

  function landmarkHtml(lm: Landmark) {
    const projects = [...(lm.projects ?? []), ...(extra.get(lm.id) ?? [])];
    return `
      <p class="dc-eyebrow">${esc(lm.name)} · ${esc(lm.place)}</p>
      <h3>${esc(lm.title)}</h3>
      <p class="dc-blurb">${esc(lm.blurb)}</p>
      ${(lm.sections ?? []).map((s) => `<section>${sections[s]()}</section>`).join('')}
      ${lm.experience?.length ? `<h4 class="dc-h">Experience</h4>${lm.experience.map(jobHtml).join('')}` : ''}
      ${projects.length ? `<h4 class="dc-h">Projects</h4>${projects.map(projectHtml).join('')}` : ''}`;
  }

  function boardHtml(s: Extract<Stop, { kind: 'board' }>) {
    return `
      <p class="dc-eyebrow">Resume Highway · ${s.index + 1} / ${s.total}</p>
      <h3>${esc(s.title)}</h3>
      <p class="dc-blurb">${esc(s.meta)}</p>
      ${s.html ?? `<ul>${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`}`;
  }

  // ---- DOM ----
  const total = landmarks.length;
  host.insertAdjacentHTML('beforeend', `
    <div class="drive-hud">
      <div class="dh-top">
        <div class="dh-brand mono"><span class="accent">✦</span> World tour <span class="dim">· drive mode</span></div>
        <div class="dh-tools">
          <button type="button" class="dh-pass mono" data-dh-map aria-label="Open map and passport"><span class="dh-pass-n">0/${total}</span> <span class="dh-pass-label">passport</span></button>
          <button type="button" class="dh-btn mono" data-sound-toggle aria-label="Toggle sound">♪</button>
          <button type="button" class="dh-btn dh-park mono" data-dh-park>Park <span class="dim">esc</span></button>
        </div>
      </div>
      <div class="dh-announce" aria-live="polite"><span class="dh-a-place mono"></span><span class="dh-a-name"></span></div>
      <aside class="dh-card" aria-live="polite"><button type="button" class="dh-card-x" aria-label="Close card">×</button><div class="dh-card-body"></div></aside>
      <div class="dh-bottom">
        <canvas class="dh-minimap" width="180" height="180" aria-hidden="true"></canvas>
        <div class="dh-speed"><span class="dh-mph">0</span><span class="mono dim">mph</span></div>
      </div>
      <p class="dh-help mono">W A S D / arrows to drive · space drift · shift boost · M map · R reset · esc park</p>
      <div class="dh-map" hidden>
        <div class="dh-map-panel">
          <div class="dh-map-head"><h3>Where to?</h3><button type="button" class="dh-btn mono" data-dh-map>close · M</button></div>
          <div class="dh-map-cols">
            ${(['us', 'world'] as const).map((r) => `
              <div><p class="mono dim">${r === 'us' ? 'United States' : 'Around the world'}</p>
              ${landmarks.filter((l) => l.region === r).map((l) => `<button type="button" class="dh-dest" data-travel="${l.id}"><span class="dh-stamp" data-stamp="${l.id}">✦</span><span><b>${esc(l.name)}</b><small>${esc(l.title)}</small></span></button>`).join('')}
              </div>`).join('')}
          </div>
          <button type="button" class="dh-dest dh-dest-road" data-travel="highway"><span class="dh-stamp on">↦</span><span><b>Resume Highway</b><small>Billboards with my whole resume, Arch → bridge</small></span></button>
        </div>
      </div>
    </div>`);
  const $ = <T extends HTMLElement>(s: string) => host.querySelector<T>(s)!;
  const card = $('.dh-card');
  const cardBody = $('.dh-card-body');
  const announceEl = $('.dh-announce');
  const mapEl = $('.dh-map');
  const mph = $('.dh-mph');
  const speedEl = $('.dh-speed');
  const help = $('.dh-help');
  const mini = $<HTMLCanvasElement>('.dh-minimap');
  setTimeout(() => help.classList.add('fade'), 9000);

  let current: string | null = null;
  let dismissed: string | null = null;

  const onClick = (e: MouseEvent) => {
    const t = e.target as Element;
    const a = t.closest<HTMLAnchorElement>('a[data-drive-nav]');
    if (a) { e.preventDefault(); h.navigate(a.getAttribute('href')!); return; }
    const play = t.closest<HTMLElement>('[data-play]');
    if (play) { h.play(play.dataset.play!); return; }
    if (t.closest('[data-dh-park]')) h.park();
    else if (t.closest('[data-dh-map]')) toggleMap();
    else if (t.closest('.dh-card-x')) { dismissed = current; hideCard(); }
    else if (t.closest('[data-travel]')) { h.travel(t.closest<HTMLElement>('[data-travel]')!.dataset.travel!); toggleMap(false); }
    else if (t === mapEl) toggleMap(false);
  };
  host.addEventListener('click', onClick);
  // Keep wheel/touch scrolling inside cards from reaching the page.
  card.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

  function showCard(stop: Stop) {
    if (current === stop.id || dismissed === stop.id) return;
    current = stop.id;
    cardBody.innerHTML = stop.kind === 'landmark' ? landmarkHtml(stop.lm) : boardHtml(stop);
    cardBody.scrollTop = 0;
    card.classList.toggle('compact', stop.kind === 'board');
    card.classList.add('open');
  }
  function hideCard() {
    current = null;
    card.classList.remove('open');
  }
  function leave(id: string) {
    if (dismissed === id) dismissed = null;
    if (current === id) hideCard();
  }

  let announceT = 0;
  function announce(name: string, place: string) {
    $('.dh-a-name').textContent = name;
    $('.dh-a-place').textContent = place;
    announceEl.classList.remove('show');
    void announceEl.offsetWidth;
    announceEl.classList.add('show');
    clearTimeout(announceT);
    announceT = window.setTimeout(() => announceEl.classList.remove('show'), 2600);
  }

  function setStamps(set: Set<string>) {
    $('.dh-pass-n').textContent = `${set.size}/${total}`;
    host.querySelectorAll<HTMLElement>('[data-stamp]').forEach((el) => el.classList.toggle('on', set.has(el.dataset.stamp!)));
  }

  function toggleMap(force?: boolean) {
    const open = force ?? mapEl.hidden;
    mapEl.hidden = !open;
    return open;
  }
  const mapOpen = () => !mapEl.hidden;

  let lastMph = -1;
  function setSpeed(ms: number, boosting: boolean) {
    const v = Math.round(Math.abs(ms) * 2.237);
    if (v !== lastMph) { mph.textContent = String(v); lastMph = v; }
    speedEl.classList.toggle('boost', boosting && v > 5);
  }

  // ---- Mini-map ----
  const dpr = Math.min(2, devicePixelRatio || 1);
  const SIZE = 180;
  mini.width = mini.height = SIZE * dpr;
  const R = world.islandRadius + 12;
  const sc = SIZE / (R * 2);
  const mx = (x: number) => (x + R) * sc;
  const mz = (z: number) => (z + R) * sc;
  const base = document.createElement('canvas');
  base.width = base.height = SIZE * dpr;
  function drawBase(colors: { land: string; road: string; water: string; ink: string }) {
    const c = base.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, SIZE, SIZE);
    c.fillStyle = colors.water;
    c.beginPath(); c.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = colors.land;
    c.beginPath(); c.arc(SIZE / 2, SIZE / 2, world.islandRadius * sc, 0, Math.PI * 2); c.fill();
    c.fillStyle = colors.water;
    c.fillRect(mx(-world.lake.halfWidth), mz(-world.lake.halfLength), world.lake.halfWidth * 2 * sc, world.lake.halfLength * 2 * sc);
    c.strokeStyle = colors.road;
    c.lineWidth = 2.4;
    c.beginPath(); c.arc(SIZE / 2, SIZE / 2, world.ringRadius * sc, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(mx(-world.ringRadius), mz(0)); c.lineTo(mx(world.ringRadius), mz(0)); c.stroke();
    const ns = Math.sqrt(world.ringRadius ** 2 - world.nsRoadX ** 2);
    for (const x of [-world.nsRoadX, world.nsRoadX]) { c.beginPath(); c.moveTo(mx(x), mz(-ns)); c.lineTo(mx(x), mz(ns)); c.stroke(); }
  }
  function drawMini(car: { x: number; z: number; h: number }, stamps: Set<string>, accent: string, ink: string) {
    const c = mini.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, mini.width, mini.height);
    c.drawImage(base, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const l of landmarks) {
      c.fillStyle = stamps.has(l.id) ? accent : ink;
      c.globalAlpha = stamps.has(l.id) ? 1 : 0.55;
      c.beginPath(); c.arc(mx(l.pad.x), mz(l.pad.z), 3.2, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    c.save();
    c.translate(mx(car.x), mz(car.z));
    c.rotate(-car.h + Math.PI);
    c.fillStyle = accent;
    c.strokeStyle = '#fff';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 5); c.lineTo(0, 2.5); c.lineTo(-5, 5); c.closePath();
    c.fill(); c.stroke();
    c.restore();
  }

  return {
    showCard, hideCard, leave, announce, setStamps, setSpeed, toggleMap, mapOpen, drawBase, drawMini,
    get current() { return current; },
    dispose() {
      clearTimeout(announceT);
      host.removeEventListener('click', onClick);
    },
  };
}
