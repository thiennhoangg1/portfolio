import type { ImageMetadata } from 'astro';
import { captions } from '../data/photos';

// Every image dropped into src/assets/photos shows up in the gallery,
// the about page, and the home page image trail.
const files = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.{jpg,jpeg,png,webp,avif}', { eager: true });

export const photos = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, mod]) => {
    const file = path.split('/').pop()!;
    return { file, src: mod.default, caption: captions[file] ?? '' };
  });
