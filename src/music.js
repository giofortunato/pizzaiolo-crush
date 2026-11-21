// Brani di sottofondo, uno per "umore" della pizza (vedi `mood` in data.js).
// Musica di Sascha Ende (ende.app, CC BY 4.0) e da Pixabay (Pixabay Content License): crediti in README.md e nella mappa (CREDITS).
//
// Per aggiungere un brano: file in assets/sounds/music/, compresso con
//   afconvert -f m4af -d aac -b 96000 brano.mp3 assets/sounds/music/<umore>.m4a
// e il require qui sotto. Un umore senza brano (null) usa quello di DEFAULT_TRACK.
export const TRACKS = {
  napoletana: require('../assets/sounds/music/napoletana.m4a'), // Italy - Espresso in the Piazza (Sascha Ende)
  piccante: require('../assets/sounds/music/piccante.m4a'),     // Italy - Kitchen Tarantella (Sascha Ende)
  americana: require('../assets/sounds/music/americana.m4a'),   // Italian Tarantella, Art_Roseman (Pixabay)
  lenta: require('../assets/sounds/music/lenta.m4a'),           // Notte Stellata - Italian Accordion Music, BFCMUSIC (Pixabay)
  mare: require('../assets/sounds/music/mare.m4a'),
  menu: require('../assets/sounds/music/menu.m4a'),             // Italian Pizza, Art_Roseman (Pixabay): schermata iniziale e mappa             // Atlas • Italy, Vadim_Makes_Sound (Pixabay)
};
export const DEFAULT_TRACK = 'napoletana';
// Volume della musica rispetto agli effetti (0-1). I brani sono già masterizzati: 0.35 li tiene sotto ai pop.
export const MUSIC_VOLUME = 0.35;

export const CREDITS = 'Musica: Sascha Ende (ende.app, CC BY 4.0) · Art_Roseman, BFCMUSIC, Vadim_Makes_Sound (Pixabay)';
