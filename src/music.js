// Brani di sottofondo, uno per "umore" della pizza (vedi `mood` in data.js).
// Musica di Sascha Ende (ende.app, licenza CC BY 4.0) e brani generati con Suno: crediti in README.md e nella mappa (CREDITS).
//
// Per aggiungere un brano: file in assets/sounds/music/, compresso con
//   afconvert -f m4af -d aac -b 96000 brano.mp3 assets/sounds/music/<umore>.m4a
// e il require qui sotto. Un umore senza brano (null) usa quello di DEFAULT_TRACK.
export const TRACKS = {
  napoletana: require('../assets/sounds/music/napoletana.m4a'), // Italy - Espresso in the Piazza (Sascha Ende)
  piccante: require('../assets/sounds/music/piccante.m4a'),     // Italy - Kitchen Tarantella (Sascha Ende)
  americana: require('../assets/sounds/music/americana.m4a'),   // generato con Suno: ukulele e steel drum
  lenta: require('../assets/sounds/music/lenta.m4a'),           // generato con Suno: fisarmonica e chitarra
  mare: require('../assets/sounds/music/mare.m4a'),             // generato con Suno: valzer con mandolino
};
export const DEFAULT_TRACK = 'napoletana';
// Volume della musica rispetto agli effetti (0-1). I brani sono già masterizzati: 0.35 li tiene sotto ai pop.
export const MUSIC_VOLUME = 0.35;

export const CREDITS = 'Musica: Sascha Ende (ende.app), licenza CC BY 4.0 · altri brani generati con Suno';
