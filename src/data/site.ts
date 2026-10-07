// Everything personal that isn't a project, job, poem, or song lives here.

export const site = {
  name: 'Thien Hoang',
  first: 'Thien',
  last: 'Hoang',
  title: 'Thien Hoang: engineer, researcher, writer',
  description:
    'Thien Hoang builds AI and software that people actually use: ML research at WashU, full-stack products, and restaurant software, plus music and poetry on the side.',
  email: 'h.thien@wustl.edu',
  linkedin: 'https://www.linkedin.com/in/thien-hoang1',
  github: 'https://github.com/thiennhoangg1',
  location: 'St. Louis, MO',
  timezone: 'America/Chicago',
  roles: ['software engineer', 'ML researcher', 'restaurant manager', 'poet', 'music maker', 'head TA'],
};

export const nav = [
  { href: '/', label: 'Home', key: 'h' },
  { href: '/about', label: 'About', key: 'a' },
  { href: '/experience', label: 'Work', key: 'w' },
  { href: '/projects', label: 'Projects', key: 'p' },
  { href: '/music', label: 'Music', key: 'm' },
  { href: '/poetry', label: 'Poetry', key: 'y' },
  { href: '/gallery', label: 'Gallery', key: 'g' },
  { href: '/lab', label: 'Lab', key: 'l' },
];

export const currently = [
  { label: 'Researching', value: 'when ML models should abstain' },
  { label: 'Managing', value: 'a restaurant, Cafe Mochi' },
  { label: 'Teaching', value: 'Head TA, Intro to AI' },
  { label: 'Finishing', value: 'M.S. in CS, Dec 2026' },
];

export const education = {
  school: 'Washington University in St. Louis',
  degrees: ['M.S. Computer Science, expected Dec 2026', 'B.S. Computer Science, Dec 2025'],
  honors: ['Danforth Scholar', 'Enterprise Scholar', "Chancellor's Fellow", 'Bauer Fellow'],
  coursework: [
    'Data Structures & Algorithms',
    'Intro to AI',
    'Data Science',
    'Data Mining',
    'Responsible Data Science',
    'Mobile App Development',
    'Quantum Computing',
    'Digital Logic Design',
  ],
};

export const skills = {
  languages: ['Python', 'TypeScript', 'SQL', 'Swift', 'Java', 'C++', 'R'],
  tools: [
    'React', 'Node.js', 'PostgreSQL', 'PyTorch', 'TensorFlow', 'scikit-learn',
    'OpenCV', 'YOLOv8', 'CoreML', 'Docker', 'Firebase', 'WebRTC', 'FastAPI', 'Electron',
  ],
};

// Lines that appear when visitors hover over certain words around the site.
// These are placeholders. Swap in lines from your own poems.
export const whispers = [
  'the kitchen is loudest right before it goes quiet',
  'every model is a guess that learned to sound sure',
  'i keep a list of things that made me stop walking',
  'some nights the code compiles and the song does not',
  'to abstain is also an answer',
  'the last table always stays the longest',
];

// Edit these to change the "Lab" page's interests section (placeholder blurbs).
export const interests = [
  { title: 'Music', blurb: 'Late-night loops, chords on repeat, and songs that are half finished on purpose.', href: '/music' },
  { title: 'Poetry', blurb: 'Short poems about kitchens, cities, family, and the space between them.', href: '/poetry' },
  { title: 'Photography', blurb: 'Mostly phone photos of light hitting things at the right time.', href: '/gallery' },
  { title: 'Hospitality', blurb: 'Running a dining room teaches systems design faster than any class.', href: '/experience' },
  { title: 'Teaching', blurb: 'Explaining search algorithms at office hours until they click.', href: '/experience' },
  { title: 'Building tools', blurb: 'Small apps that remove one annoying task from someone\'s day.', href: '/projects' },
];

export const nowList = {
  reading: 'Add a book you are reading',
  listening: 'Add an album on repeat',
  learning: 'Selective prediction & calibration',
};
