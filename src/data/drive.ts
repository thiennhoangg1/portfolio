// Drive mode: which landmark shows which part of the portfolio.
// The world is a small island. US landmarks sit on the west half, world
// landmarks on the east half, and "Resume Highway" runs east from the Arch,
// across the bridge, to the other side. Coordinates are in meters; +x is
// east, +z is south. Swap landmarks or content by editing this file.

export type LandmarkModel =
  | 'arch' | 'liberty' | 'goldengate' | 'rushmore' | 'needle'
  | 'pyramids' | 'bigben' | 'eiffel' | 'colosseum' | 'taj' | 'opera' | 'pisa' | 'tokyo';

/** Card sections built from site data (see hud.ts). */
export type Section =
  | 'about' | 'contact' | 'resume' | 'skills' | 'education' | 'timeline'
  | 'music' | 'poetry' | 'gallery' | 'lab' | 'secrets';

export interface Landmark {
  id: LandmarkModel;
  name: string;
  place: string;
  region: 'us' | 'world';
  /** Model position and the glowing pad you drive into. */
  x: number; z: number;
  pad: { x: number; z: number };
  rot?: number;
  title: string;
  blurb: string;
  sections?: Section[];
  /** Project slugs (src/content/projects) and experience ids (src/content/experience). */
  projects?: string[];
  experience?: string[];
  /** Unplaced projects of this kind also show up here. */
  catchKind?: 'work' | 'research' | 'side';
}

export const landmarks: Landmark[] = [
  // ---- US ----
  {
    id: 'arch', name: 'Gateway Arch', place: 'St. Louis, MO', region: 'us',
    x: -150, z: 0, pad: { x: -150, z: 0 },
    title: 'Home base',
    blurb: 'Where I live, study, and work. Drive east down Resume Highway, or anywhere you like.',
    sections: ['about', 'resume', 'contact'],
  },
  {
    id: 'liberty', name: 'Statue of Liberty', place: 'New York, NY', region: 'us',
    x: -128, z: -82, pad: { x: -118, z: -58 },
    title: 'Hire me',
    blurb: 'Open to software, ML, and research roles. Always happy to talk.',
    sections: ['contact', 'resume'],
  },
  {
    id: 'goldengate', name: 'Golden Gate Bridge', place: 'San Francisco, CA', region: 'us',
    x: -55, z: -98, pad: { x: -55, z: -70 },
    title: 'Industry work',
    blurb: 'Products shipped with startups and teams, used by real people.',
    projects: ['portal', 'luna', 'stave-vision'],
    experience: ['04-portal', '05-tri-snap'],
    catchKind: 'work',
  },
  {
    id: 'rushmore', name: 'Mount Rushmore', place: 'Keystone, SD', region: 'us',
    x: -122, z: 82, pad: { x: -112, z: 52 },
    title: 'Skills, carved in stone',
    blurb: 'The languages and tools I reach for most.',
    sections: ['skills'],
  },
  {
    id: 'needle', name: 'Space Needle', place: 'Seattle, WA', region: 'us',
    x: -55, z: 92, pad: { x: -55, z: 70 },
    title: 'The lab',
    blurb: 'Experiments, generative art, and a vault of hidden secrets.',
    sections: ['lab', 'secrets'],
  },

  // ---- World ----
  {
    id: 'pyramids', name: 'Pyramids of Giza', place: 'Giza, Egypt', region: 'world',
    x: 55, z: -102, pad: { x: 55, z: -74 },
    title: 'Research foundations',
    blurb: 'ML research on clinical decision support and when models should abstain.',
    projects: ['thyroid-cds', 'selective-prediction'],
    experience: ['02-graduate-researcher', '08-test-kitchen'],
    catchKind: 'research',
  },
  {
    id: 'bigben', name: 'Big Ben', place: 'London, UK', region: 'world',
    x: 58, z: -42, pad: { x: 58, z: -22 },
    title: 'The full timeline',
    blurb: 'Every role, in order. The clock is always right here.',
    sections: ['timeline'],
  },
  {
    id: 'eiffel', name: 'Eiffel Tower', place: 'Paris, France', region: 'world',
    x: 55, z: 48, pad: { x: 55, z: 24 },
    title: 'Café life',
    blurb: 'I manage a restaurant, and built the software that runs it.',
    projects: ['restaurant-pos', 'tapcount', 'hours-calculator'],
    experience: ['01-cafe-mochi'],
  },
  {
    id: 'colosseum', name: 'Colosseum', place: 'Rome, Italy', region: 'world',
    x: 122, z: 90, pad: { x: 112, z: 64 },
    title: 'Teaching & security',
    blurb: 'Head TA in front of hundreds of students, plus risk work and analytics.',
    experience: ['03-teaching-assistant', '07-grc-security', '06-cobbs-creek'],
  },
  {
    id: 'taj', name: 'Taj Mahal', place: 'Agra, India', region: 'world',
    x: 120, z: -96, pad: { x: 112, z: -70 },
    title: 'Education & honors',
    blurb: 'Computer science at Washington University in St. Louis.',
    sections: ['education'],
  },
  {
    id: 'opera', name: 'Sydney Opera House', place: 'Sydney, Australia', region: 'world',
    x: 60, z: 110, pad: { x: 58, z: 86 },
    title: 'Music',
    blurb: 'Late-night loops and half-finished songs. Press play.',
    sections: ['music'],
  },
  {
    id: 'pisa', name: 'Leaning Tower of Pisa', place: 'Pisa, Italy', region: 'world',
    x: 132, z: -30, pad: { x: 118, z: -16 },
    title: 'Poetry & photos',
    blurb: 'Short poems from long shifts, and light hitting things.',
    sections: ['poetry', 'gallery'],
  },
  {
    id: 'tokyo', name: 'Tokyo Tower', place: 'Tokyo, Japan', region: 'world',
    x: 132, z: 30, pad: { x: 118, z: 16 },
    title: 'Side projects',
    blurb: 'Small tools that remove one annoying task from someone\'s day.',
    projects: ['gmail-cleaner'],
    catchKind: 'side',
  },
];

export const world = {
  islandRadius: 215,
  ringRadius: 172,
  roadWidth: 12,
  nsRoadX: 95,
  /** The "ocean" between the US and the rest of the world. */
  lake: { halfWidth: 16, halfLength: 135 },
  spawn: { x: -172, z: 0, heading: Math.PI / 2 },
  /** Resume Highway billboards run along z = 0 between these x values. */
  billboards: { from: -132, to: -26 },
};
