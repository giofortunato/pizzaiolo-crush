export const N = 8;
export const BOMB = 99;

export const T = [
  { e: '🍅', n: 'Pomodoro' },
  { e: '🧀', n: 'Mozzarella' },
  { e: '🌿', n: 'Basilico' },
  { e: '🍄', n: 'Funghi' },
  { e: '🫒', n: 'Olive' },
  { e: '🌶️', n: 'Peperoncino' },
  { e: '🍍', n: 'Ananas' },
];

export const LEVELS = [
  {
    pizza: 'Margherita', face: '🧑', who: 'Marco', types: [0, 1, 2, 3, 4],
    need: { 0: 12, 1: 12, 2: 6 }, moves: 20,
    hi: 'Una margherita, semplice semplice!',
    win: 'Questa sì che è una margherita!', lose: 'Vabbè, prendo un kebab…',
  },
  {
    pizza: 'Funghi e olive', face: '👩', who: 'Giulia', types: [0, 1, 2, 3, 4],
    need: { 1: 12, 3: 14, 4: 12 }, moves: 22,
    hi: 'Tanti funghi, mi raccomando!',
    win: 'Buonissima, torno domani!', lose: 'Ho una riunione, scappo.',
  },
  {
    pizza: 'Diavola', face: '🧔', who: 'Salvo', types: [0, 1, 2, 3, 4, 5],
    need: { 0: 15, 1: 12, 5: 18 }, moves: 22,
    hi: 'Piccante. Ma piccante davvero.',
    win: 'Brucia! Perfetta! 🔥', lose: 'Troppo lenta, fratello.',
  },
  {
    pizza: 'Hawaiana', face: '🤠', who: 'Kevin (Ohio)', types: [0, 1, 2, 3, 4, 6],
    need: { 0: 12, 1: 12, 6: 15 }, moves: 24, nonno: true,
    hi: 'Pineapple pizza, please! Lots of it!',
    win: 'Best pizza in Italy, dude!', lose: "Okay… I'll go to Domino's.",
  },
  {
    pizza: 'Capricciosa', face: '👵', who: 'Nonna Pina', types: [0, 1, 2, 3, 4, 5],
    need: { 0: 15, 1: 15, 3: 15, 4: 12 }, moves: 26,
    hi: 'Come la faceva mio marito, buonanima.',
    win: 'Brava/o, come una volta!', lose: 'Ai miei tempi era più veloce.',
  },
];

export const NONNO = [
  "Mamma mia! L'ananas sulla pizza?!",
  'Ma che state facendo?! 😱',
  'Napoli piange…',
  'Io chiamo i carabinieri!',
  'Non è pizza, è frutta!',
];

export const PRAISE = ['Che maestria!', 'Mamma che combo!', 'Sei un artista!', 'Spettacolo!', 'Da manuale!'];

// Dopo l'ultimo ordine si ricomincia, con richieste più grandi.
export function levelFor(i) {
  const base = LEVELS[i % LEVELS.length];
  const round = Math.floor(i / LEVELS.length);
  const need = {};
  for (const k in base.need) need[k] = Math.round(base.need[k] * (1 + round * 0.25));
  return { ...base, need, moves: base.moves + round * 2 };
}
