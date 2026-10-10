// Games shown in the Arcade in drive mode. Add one entry per game.
//
//   embed: a URL that can load in an iframe (an itch.io embed link, or a web
//          build in /public/games/<name>/index.html → "/games/<name>/index.html").
//          Shows a "Play" button that opens the game right inside drive mode.
//   play:  any other link (itch.io page, Steam, App Store). Opens in a new tab.
//   video: optional trailer link. repo: optional source link.

export interface Game {
  title: string;
  blurb: string;
  year?: string;
  made?: string; // engine / language, e.g. "Unity · C#"
  embed?: string;
  project?: string; // slug in src/content/projects, for a "Project page" link
  play?: string;
  video?: string;
  repo?: string;
}

export const games: Game[] = [
  {
    title: 'Animal Kingdom',
    blurb: 'Drop animals, merge matching pairs into bigger ones, and switch to the underwater world. Team project.',
    year: '2026',
    made: 'Unity · C#',
    embed: '/games/animal-kingdom/index.html',
    project: 'animal-kingdom',
  },
  {
    title: 'Unity Game Prototypes',
    blurb: 'Platformers, a space shooter, a physics maze, and a Zelda-style adventure.',
    year: '2026',
    made: 'Unity · C#',
    project: 'game-prototypes',
  },
];
