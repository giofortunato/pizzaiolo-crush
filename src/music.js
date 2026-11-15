// Brani di sottofondo, uno per "umore" della pizza (vedi `mood` in data.js).
// Musica di Sascha Ende (ende.app), licenza CC BY 4.0: i crediti sono in README.md e nella mappa (CREDITS).
//
// Per aggiungere un brano: file in assets/sounds/music/, compresso con
//   afconvert -f m4af -d aac -b 96000 brano.mp3 assets/sounds/music/<umore>.m4a
// e il require qui sotto. Un umore senza brano (null) usa quello di DEFAULT_TRACK.
export const TRACKS = {
  napoletana: require('../assets/sounds/music/napoletana.m4a'), // Italy - Espresso in the Piazza
  piccante: require('../assets/sounds/music/piccante.m4a'),     // Italy - Kitchen Tarantella
  americana: null,  // previsto: Ultimate Tropical Vol. 13
  lenta: null,      // previsto: Italy - Venice by Gondola
  mare: null,       // previsto: Italy - Last Waltz in Palermo
};
export const DEFAULT_TRACK = 'napoletana';
// Volume della musica rispetto agli effetti (0-1). I brani sono già masterizzati: 0.35 li tiene sotto ai pop.
export const MUSIC_VOLUME = 0.35;

export const CREDITS = 'Musica: Sascha Ende (ende.app), licenza CC BY 4.0';
