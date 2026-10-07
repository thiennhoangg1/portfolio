# Thien Hoang · Portfolio

A creative personal site built with [Astro](https://astro.build), GSAP, and Lenis.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs static files to dist/
```

## Adding content

Everything is a file. Add one, save, and it appears on the site.

| What | Where | Notes |
|---|---|---|
| Project | `src/content/projects/my-project.md` | Copy an existing file for the frontmatter. Add `cover: ./my-image.png` (image next to the .md file) for a real cover; otherwise generative art is made from the file name. `featured: true` puts it on the home page. `kind` is `work`, `research`, or `side`. |
| Job | `src/content/experience/09-name.md` | `order` controls position. Bullets go in the body. |
| Poem | `src/content/poems/title.md` | Write the poem as plain text. Blank lines separate stanzas. Remove `sample: true`. |
| Song | `src/content/music/title.md` | Put the audio file in `public/music/` and set `audio: /music/song.mp3`, or set `embed:` to a Spotify/SoundCloud embed URL. Without either, the player synthesizes a generative sketch. |
| Photo | `src/assets/photos/` | Any jpg/png/webp. Shows in the gallery, about collage, home image trail, and lab. Delete the `placeholder-*.jpg` files once you have your own. Captions: `src/data/photos.ts`. |
| Bio, links, "currently", whispers, interests | `src/data/site.ts` | |
| Resume | `public/resume.pdf` | Replace the file to update the download. |

## Hidden features

- **Terminal:** press `⌘K`, `/`, or `?`. Try `help`, `ls projects`, `sudo hire-me`, `matrix`, `flashlight`, `gravity`, `flip`, `party`, `coffee`.
- **Secrets:** 17 achievements, tracked in the nav (✦ 0/17). The full list is at `/secrets` (the ◆ in the footer).
- Konami code (CRT mode), hold the name on the home page, toggle the theme 6× fast, hover dotted-underlined words, idle for 45s, switch tabs, the devtools console, footer accent colors, and a game on the 404 page.
- To add a new secret, add it to `SECRETS` in `src/scripts/secrets.ts` and call `unlock('id')` wherever it should trigger.

## Code map

- `src/layouts/Base.astro`: page shell. `Chrome.astro` holds UI that persists across navigation (cursor, terminal, toasts, mini player).
- `src/scripts/app.ts`: entry point. Page-level effects register with `onPage()` (in `core.ts`) so they re-run after each client-side navigation.
- `motion.ts` (reveals, split text, parallax, magnetic, tilt, timeline, horizontal scroll), `hero.ts` (shader, image trail, big bang, hover previews), `terminal.ts`, `eggs.ts`, `audio.ts`, `pages.ts`, `theme.ts`, `cursor.ts`.
- Animations respect `prefers-reduced-motion`.

## Deploy

Any static host works. On Vercel: import the repo, and it detects Astro automatically. You can also run `npx vercel`.
