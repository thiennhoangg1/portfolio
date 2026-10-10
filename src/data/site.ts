// Everything personal that isn't a project, job, poem, or song lives here.

export const site = {
  name: 'Thien Hoang',
  first: 'Thien',
  last: 'Hoang',
  title: 'Thien Hoang: student & engineer',
  description:
    'Thien Hoang is a computer science student and engineer at WashU who builds software people actually use: restaurant tools, full-stack products, apps, and games, plus music and poetry on the side.',
  email: 'h.thien@wustl.edu',
  linkedin: 'https://www.linkedin.com/in/thien-hoang1',
  github: 'https://github.com/thiennhoangg1',
  location: 'St. Louis, MO',
  timezone: 'America/Chicago',
  roles: ['engineer', 'student', 'restaurant manager', 'poet', 'songwriter'],
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
  { label: 'Managing', value: 'a restaurant, Cafe Mochi' },
  { label: 'Teaching', value: 'Head TA, Intro to AI' },
  { label: 'Finishing', value: 'M.S. in CS, Dec 2026' },
  { label: 'Graduated', value: 'B.S. in Computer Science, WashU, Dec 2025' },
  { label: 'Learning', value: 'Accounting certification' },
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

// Lines that appear when visitors hover over certain words around the site,
// taken from the poems on /poetry.
export const whispers = [
  'kitchen corner—plastic moonlight. a wedge in my hand, golden, glowing, almost warm.',
  'the deluge has the courage to say what our eyes don\'t.',
  'while brilliance feels like a story I tell myself',
  'the gingkos glow like forgiveness',
  'hold a stranger\'s hand longer than my own child\'s.',
  'I love your silence.',
];

// Ranks shown on the About page ("Off the clock"). `proof` is a screenshot in src/assets/hobbies.
export const ranks = [
  { game: 'Chess', rank: '2286', detail: 'Rapid · Chess.com', proof: 'chess' },
  { game: 'Valorant', rank: 'Immortal 3', detail: 'Peak rank', proof: 'valorant' },
  { game: 'Teamfight Tactics', rank: 'Grandmaster', detail: '' },
  { game: 'Overwatch', rank: 'Grandmaster', detail: '' },
  { game: 'Paladins', rank: 'Grandmaster', detail: '' },
];

export const hobbies = ['Rock climbing', 'Weightlifting', 'Reading', 'Chess', 'Competitive games', 'Making music', 'Writing poetry'];

// The "Lab" page's interests section.
export const interests = [
  { title: 'Music', blurb: 'Music I\'ve made, plus a few songs I love.', href: '/music' },
  { title: 'Poetry', blurb: 'Poems about the city at night, rain, exams, and family. Some of them play with color and erasure.', href: '/poetry' },
  { title: 'Games', blurb: 'Unity games, from a team merge game to platformers and a Zelda-style adventure.', href: '/projects/animal-kingdom' },
  { title: 'Hospitality', blurb: 'Running a dining room teaches systems design faster than any class.', href: '/experience' },
  { title: 'Teaching', blurb: 'Explaining search algorithms at office hours until they click.', href: '/experience' },
  { title: 'Building tools', blurb: 'Small apps that remove one annoying task from someone\'s day.', href: '/projects' },
];

export const nowList = {
  reading: 'Dungeon Crawler Carl',
  listening: 'Pylon by beabadoobee',
  learning: 'An accounting certification, plus CS for my M.S.',
};
