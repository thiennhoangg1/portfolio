// A fake shell. Opens with ⌘K / Ctrl+K, "/", or "?".
import { navigate } from 'astro:transitions/client';
import { blip, setSound, soundOn } from './sound';
import { found, resetSecrets, SECRETS, unlock } from './secrets';
import { ACCENTS, confetti, party, setAccent, setTheme } from './theme';
import { flashlight, gravity, matrix, crt, flip } from './eggs';
import { stopScroll, startScroll } from './smooth';
import { player } from './audio';

type Out = string | string[];
type Ctx = { args: string[]; raw: string };

const data = () => JSON.parse(document.getElementById('terminal')?.dataset.site || '{}') as {
  email: string; linkedin: string; github: string;
  pages: { href: string; label: string }[];
  projects: { slug: string; title: string; tagline: string }[];
  whispers: string[];
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const link = (href: string, text = href) => `<a href="${esc(href)}" target="${href.startsWith('/') ? '_self' : '_blank'}" rel="noopener">${esc(text)}</a>`;

function go(href: string) {
  close();
  navigate(href);
  return `→ ${href}`;
}

const commands: Record<string, { desc?: string; run: (c: Ctx) => Out }> = {
  help: {
    desc: 'list commands',
    run: () => [
      '<b>navigation</b>  ls · cd &lt;page&gt; · open &lt;project&gt; · resume',
      '<b>about</b>       whoami · contact · socials · now · skills',
      '<b>vibes</b>       theme [dark|light] · accent &lt;color&gt; · sound [on|off] · play · pause',
      '<b>extras</b>      secrets · poem · clear · exit',
      '<span class="dim">…and a few commands that aren\'t listed. try things.</span>',
    ],
  },
  whoami: {
    desc: 'who is this',
    run: () => [
      'thien hoang: engineer, researcher, restaurant manager, poet.',
      'M.S. computer science @ WashU (Dec 2026). researching when AI should say "i don\'t know."',
      'head TA for intro to AI. builds tools people use on real shifts.',
    ],
  },
  ls: {
    desc: 'list pages / projects / secrets',
    run: ({ args }) => {
      const d = data();
      if (args[0] === 'projects') return d.projects.map((p) => `${link(`/projects/${p.slug}`, p.slug.padEnd(22, ' '))} <span class="dim">${esc(p.tagline)}</span>`);
      if (args[0] === 'secrets') return commands.secrets.run({ args: [], raw: '' });
      if (args[0] === '-a' || args[0] === '-la') return [...d.pages.map((p) => link(p.href, p.label.toLowerCase() + '/')), link('/secrets', '.secrets/'), '.bash_history  .dreams  .unfinished_songs/'];
      return [...d.pages.map((p) => link(p.href, p.label.toLowerCase() + '/')), '<span class="dim">projects: `ls projects`</span>'];
    },
  },
  cd: {
    desc: 'go to a page',
    run: ({ args }) => {
      const target = (args[0] || '').replace(/^\/|\/$/g, '').toLowerCase();
      if (!target || target === '~') return go('/');
      if (target === '..') return go('/');
      if (target === '.secrets' || target === 'secrets') return go('/secrets');
      const page = data().pages.find((p) => p.label.toLowerCase() === target || p.href === `/${target}`);
      return page ? go(page.href) : `cd: no such directory: ${esc(target)}`;
    },
  },
  open: {
    desc: 'open a project',
    run: ({ args }) => {
      const q = args.join(' ').toLowerCase();
      if (!q) return 'usage: open &lt;project&gt;   (see `ls projects`)';
      const p = data().projects.find((x) => x.slug.includes(q) || x.title.toLowerCase().includes(q));
      return p ? go(`/projects/${p.slug}`) : `open: can't find "${esc(q)}"`;
    },
  },
  resume: { desc: 'download resume', run: () => { window.open('/resume.pdf', '_blank'); return 'opening resume.pdf…'; } },
  contact: { run: () => [`email     ${link(`mailto:${data().email}`, data().email)}`, `linkedin  ${link(data().linkedin)}`] },
  socials: { run: () => [`github    ${link(data().github)}`, `linkedin  ${link(data().linkedin)}`] },
  now: {
    run: () => ['researching selective prediction @ WashU', 'managing a restaurant', 'head TA, intro to AI', 'writing poems in the notes app at 2am'],
  },
  skills: { run: () => ['python · typescript · sql · swift · java · c++ · r', 'react · node · postgres · pytorch · tensorflow · opencv · yolov8 · coreml · docker'] },
  theme: {
    run: ({ args }) => {
      const t = args[0] === 'dark' || args[0] === 'light' ? args[0] : 'toggle';
      setTheme(t);
      return `theme → ${t}`;
    },
  },
  accent: {
    run: ({ args }) => {
      if (!args[0]) return `colors: ${Object.keys(ACCENTS).join(', ')} (or a #hex)`;
      return setAccent(args[0]) ? `accent → ${esc(args[0])}` : `unknown color. try: ${Object.keys(ACCENTS).join(', ')}`;
    },
  },
  sound: {
    run: ({ args }) => {
      const on = args[0] ? args[0] === 'on' : !soundOn();
      setSound(on);
      return `sound ${on ? 'on ♪' : 'off'}`;
    },
  },
  play: { run: () => { player.playFirst(); return '♪ playing. (`pause` to stop)'; } },
  pause: { run: () => { player.pause(); return 'paused.'; } },
  secrets: {
    run: () => {
      const f = found();
      return [
        `${f.size} / ${SECRETS.length} secrets found`,
        ...SECRETS.map((s) => (f.has(s.id) ? `<span class="accent">✦</span> ${esc(s.title)}` : `<span class="dim">· ??? — ${esc(s.hint)}</span>`)),
      ];
    },
  },
  poem: { run: () => `<i>${esc(data().whispers[Math.floor(Math.random() * data().whispers.length)])}</i>` },
  clear: { run: () => { out().innerHTML = ''; return []; } },
  exit: { run: () => { close(); return []; } },
  // ---- hidden ----
  sudo: {
    run: ({ args }) => {
      if (args.join(' ').replace(/\s+/g, '-') === 'hire-me' || args.join(' ') === 'hire me' || args[0] === 'hire') {
        unlock('hire');
        confetti();
        return ['[sudo] password for recruiter: ••••••••', '<span class="accent">access granted.</span> excellent decision.', `next step: ${link(`mailto:${data().email}?subject=Let's%20work%20together`, 'send an email')}`];
      }
      return `${esc(args.join(' ') || 'sudo')}: permission denied. (maybe try: sudo hire-me)`;
    },
  },
  matrix: { run: () => { close(); setTimeout(matrix, 300); return []; } },
  flashlight: { run: () => { close(); setTimeout(flashlight, 300); return []; } },
  lights: { run: ({ args }) => commands.flashlight.run({ args, raw: '' }) },
  gravity: { run: () => { close(); setTimeout(gravity, 300); return []; } },
  crt: { run: () => { crt(); return 'crt mode toggled. ↑↑↓↓←→←→BA does the same.'; } },
  glitch: { run: ({ args }) => commands.crt.run({ args, raw: '' }) },
  flip: { run: () => { close(); setTimeout(flip, 300); return []; } },
  party: { run: () => { close(); party(); return []; } },
  disco: { run: ({ args }) => commands.party.run({ args, raw: '' }) },
  coffee: { run: () => ['brewing…', '      ( (', '       ) )', '    ........', '    |      |]', '    \\      /', "     `----'", 'done. ☕ that\'s how the M.S. is getting finished.'] },
  hello: { run: () => 'hi! 👋 type `help` to look around.' },
  hi: { run: () => commands.hello.run({ args: [], raw: '' }) },
  vim: { run: () => 'you are now trapped in vim. just kidding. (:q!)' },
  emacs: { run: () => 'nice try.' },
  rm: { run: () => 'rm: refusing to delete a perfectly good website.' },
  '42': { run: () => 'yes, but what is the question?' },
  date: { run: () => new Date().toString() },
  echo: { run: ({ raw }) => esc(raw.replace(/^echo\s*/, '')) },
  konami: { run: () => '↑ ↑ ↓ ↓ ← → ← → B A' },
  'reset-secrets': { run: () => { resetSecrets(); return 'secrets reset. happy hunting.'; } },
};

const aliases: Record<string, string> = { '?': 'help', man: 'help', projects: 'ls', email: 'contact', cls: 'clear', q: 'exit', ':q': 'exit', ':q!': 'exit', about: 'whoami' };

let el: HTMLElement | null = null;
let input: HTMLInputElement | null = null;
const history: string[] = [];
let hIdx = -1;
const out = () => el!.querySelector<HTMLElement>('.term-out')!;

function print(lines: Out, cls = '') {
  const arr = Array.isArray(lines) ? lines : [lines];
  for (const l of arr) {
    const div = document.createElement('div');
    div.className = `term-line ${cls}`;
    div.innerHTML = l;
    out().appendChild(div);
  }
  out().scrollTop = out().scrollHeight;
}

function exec(raw: string) {
  const line = raw.trim();
  print(`<span class="accent">thien@portfolio</span>:<span class="dim">~</span>$ ${esc(line)}`, 'cmd');
  if (!line) return;
  history.unshift(line);
  hIdx = -1;
  let [name, ...args] = line.split(/\s+/);
  name = aliases[name.toLowerCase()] ?? name.toLowerCase();
  if (line.toLowerCase() === 'ls projects' || raw.trim().toLowerCase() === 'projects') args = ['projects'];
  const cmd = commands[name];
  if (!cmd) return print(`command not found: ${esc(name)}. try \`help\``, 'err');
  print(cmd.run({ args, raw: line }));
}

export function open(prefill = '') {
  if (!el) return;
  el.hidden = false;
  requestAnimationFrame(() => el!.classList.add('open'));
  stopScroll();
  unlock('terminal');
  blip('open');
  input!.value = prefill;
  setTimeout(() => input!.focus(), 50);
}

export function close() {
  if (!el || el.hidden) return;
  el.classList.remove('open');
  startScroll();
  setTimeout(() => { if (el && !el.classList.contains('open')) el.hidden = true; }, 300);
}

export function initTerminal() {
  el = document.getElementById('terminal');
  input = el?.querySelector('input') ?? null;
  if (!el || !input) return;

  print([
    'thien-os v2.6 · type <b>help</b> to begin',
    '<span class="dim">tip: ↑/↓ for history, tab to autocomplete, esc to close</span>',
  ]);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { exec(input!.value); input!.value = ''; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); hIdx = Math.min(history.length - 1, hIdx + 1); input!.value = history[hIdx] ?? ''; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hIdx = Math.max(-1, hIdx - 1); input!.value = hIdx < 0 ? '' : history[hIdx]; }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const v = input!.value;
      const visible = Object.keys(commands);
      const pool = v.includes(' ')
        ? data().pages.map((p) => `${v.split(' ')[0]} ${p.label.toLowerCase()}`).concat(data().projects.map((p) => `open ${p.slug}`))
        : visible;
      const match = pool.find((c) => c.startsWith(v) && c !== v);
      if (match) input!.value = match;
    } else blip('key');
  });

  el.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-term-close]') || e.target === el) close();
    else if (!(e.target as Element).closest('a')) input!.focus();
  });
  el.addEventListener('click', (e) => {
    const a = (e.target as Element).closest('a');
    if (a && a.getAttribute('href')?.startsWith('/') && !a.getAttribute('href')?.endsWith('.pdf')) close();
  });

  document.addEventListener('keydown', (e) => {
    const typing = (e.target as Element).closest('input, textarea, [contenteditable="true"]');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); el!.hidden ? open() : close(); }
    else if (e.key === 'Escape') close();
    else if (!typing && el!.hidden && (e.key === '/' || e.key === '`')) { e.preventDefault(); open(); }
    else if (!typing && el!.hidden && e.key === '?') { e.preventDefault(); open(); exec('help'); }
  });
  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-term-open]')) open();
  });
  document.addEventListener('astro:before-swap', close);
}
