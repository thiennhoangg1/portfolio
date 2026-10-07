import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tagline: z.string(),
      year: z.string(),
      role: z.string(),
      stack: z.array(z.string()),
      kind: z.enum(['work', 'research', 'side']),
      order: z.number().default(99),
      featured: z.boolean().default(false),
      cover: image().optional(),
      link: z.string().url().optional(),
      repo: z.string().url().optional(),
      credits: z.string().optional(),
    }),
});

const experience = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/experience' }),
  schema: z.object({
    role: z.string(),
    org: z.string(),
    location: z.string(),
    start: z.string(),
    end: z.string().default('Present'),
    order: z.number(),
    current: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

const poems = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/poems' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    sample: z.boolean().default(false),
    order: z.number().default(99),
  }),
});

const music = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/music' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    mood: z.string(),
    // Path under /public (e.g. "/music/song.mp3"). Without it, the player
    // synthesizes a generative sketch from `seed`, `key`, and `bpm`.
    audio: z.string().optional(),
    embed: z.string().url().optional(),
    seed: z.number().default(1),
    key: z.enum(['C', 'D', 'E', 'F', 'G', 'A', 'B']).default('C'),
    bpm: z.number().default(72),
    sample: z.boolean().default(false),
    order: z.number().default(99),
  }),
});

export const collections = { projects, experience, poems, music };
