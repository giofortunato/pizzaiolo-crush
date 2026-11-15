// Brani di sottofondo, uno per "umore" della pizza (vedi `mood` in data.js).
//
// Per usare brani veri: metti i file (mp3, m4a o wav) in assets/sounds/music/ e scrivi qui il require,
// per esempio   piccante: require('../assets/sounds/music/piccante.mp3'),
// Un umore senza brano (null) usa quello di DEFAULT_TRACK. Scegli brani senza royalty e con licenza
// che permetta l'uso in un'app (es. Pixabay Content License); segna la fonte in README.md.
export const TRACKS = {
  napoletana: require('../assets/sounds/music.wav'), // tarantella sintetizzata (scripts/make-music.py), da sostituire
  piccante: null,   // Diavola, Carbonara, Ora di punta: veloce, minore
  americana: null,  // Hawaiana, Würstel e patatine: maggiore, saltellante
  lenta: null,      // Funghi e olive, Capricciosa, Parmigiana, Boscaiola: cantabile, tranquilla
  mare: null,       // Frutti di mare, Quattro stagioni: valzer, aperto
};
export const DEFAULT_TRACK = 'napoletana';
// Volume della musica rispetto agli effetti (0-1). I brani veri sono già masterizzati: 0.35 li tiene sotto ai pop.
export const MUSIC_VOLUME = 0.35;
