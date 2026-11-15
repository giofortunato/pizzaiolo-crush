export const N = 8;
export const BOMB = 99;

export const DOUGH = 98; // impasto crudo: un ostacolo, non un ingrediente

export const T = [
  { e: '🍅', n: 'Pomodoro' },
  { e: '🧀', n: 'Mozzarella' },
  { e: '🌿', n: 'Basilico' },
  { e: '🍄', n: 'Funghi' },
  { e: '🫒', n: 'Olive' },
  { e: '🌶️', n: 'Peperoncino' },
  { e: '🍍', n: 'Ananas' },
  { e: '🧄', n: 'Aglio' },
  { e: '🐟', n: 'Acciughe' },
  { e: '🍆', n: 'Melanzane' },
  { e: '🧅', n: 'Cipolla' },
  { e: '🥓', n: 'Pancetta' },
  { e: '🥚', n: 'Uovo' },
  { e: '🍟', n: 'Patatine' },
  { e: '🌭', n: 'Würstel' },
  { e: '🥦', n: 'Friarielli' },
  { e: '🍤', n: 'Gamberi' },
];

// Le mosse degli ordini sono tarate con `node scripts/sim.mjs` (difficoltà crescente).
// Ostacoli (dal sesto ordine in poi):
//   flour: quanti ingredienti partono infarinati (non si possono spostare, ma se li allinei vengono via)
//   dough: quanti panetti di impasto crudo (non si spostano; servono due file lì accanto per cuocerli)
export const LEVELS = [
  {
    pizza: 'Margherita', face: '🧑', who: 'Marco', types: [0, 1, 2, 3, 4],
    need: { 0: 12, 1: 12, 2: 6 }, moves: 20,
    hi: 'Una margherita, semplice semplice!',
    win: 'Questa sì che è una margherita!', lose: 'Vabbè, prendo un kebab…',
  },
  {
    pizza: 'Funghi e olive', face: '👩', who: 'Giulia', types: [0, 1, 2, 3, 4],
    need: { 1: 12, 3: 14, 4: 12 }, moves: 19,
    hi: 'Tanti funghi, mi raccomando!',
    win: 'Buonissima, torno domani!', lose: 'Ho una riunione, scappo.',
  },
  {
    pizza: 'Diavola', face: '🧔', who: 'Salvo', types: [0, 1, 2, 3, 4, 5],
    need: { 0: 15, 1: 12, 5: 18 }, moves: 29,
    hi: 'Piccante. Ma piccante davvero.',
    win: 'Brucia! Perfetta! 🔥', lose: 'Troppo lenta, fratello.',
  },
  {
    pizza: 'Hawaiana', face: '🤠', who: 'Kevin (Ohio)', types: [0, 1, 2, 3, 4, 6],
    need: { 0: 12, 1: 12, 6: 15 }, moves: 25, nonno: true,
    hi: 'Pineapple pizza, please! Lots of it!',
    win: 'Best pizza in Italy, dude!', lose: "Okay… I'll go to Domino's.",
  },
  {
    pizza: 'Capricciosa', face: '👵', who: 'Nonna Pina', types: [0, 1, 2, 3, 4, 5],
    need: { 0: 15, 1: 15, 3: 15, 4: 12 }, moves: 27,
    hi: 'Come la faceva mio marito, buonanima.',
    win: 'Brava/o, come una volta!', lose: 'Ai miei tempi era più veloce.',
  },
  {
    pizza: 'Marinara', face: '🧒', who: 'Luca (fuorisede)', types: [0, 2, 7, 4, 3],
    need: { 0: 16, 7: 14, 2: 10 }, moves: 17, flour: 5,
    hi: 'Una marinara, che costa meno.',
    win: 'Con questa arrivo a fine mese!', lose: 'Mi faccio una pasta in bianco.',
  },
  {
    pizza: 'Napoli', face: '👨', who: 'Don Ciro', types: [0, 1, 8, 4, 2],
    need: { 0: 14, 1: 12, 8: 14 }, moves: 16, dough: 3,
    hi: 'Acciughe. E non fare domande.',
    win: 'Bravo guaglione. Ti faccio sapere.', lose: 'Mi hai deluso. Assai.',
  },
  {
    pizza: 'Parmigiana', face: '👩‍🦳', who: 'Zia Rosa', types: [0, 1, 2, 9, 3],
    need: { 0: 14, 1: 14, 9: 16, 2: 8 }, moves: 16, flour: 6,
    hi: 'Le melanzane fritte, eh. Non grigliate.',
    win: 'Quasi come la mia. Quasi.', lose: 'Lo sapevo, dovevo farla io.',
  },
  {
    pizza: 'Boscaiola', face: '🧙', who: 'Bruno il fungaiolo', types: [0, 1, 3, 11, 4, 10],
    need: { 1: 14, 3: 16, 11: 14 }, moves: 24, dough: 4,
    hi: 'I funghi li ho raccolti io. Trattali bene.',
    win: 'Profuma di bosco!', lose: 'Torno nel bosco, lì non si aspetta.',
  },
  {
    pizza: 'Würstel e patatine', face: '👦', who: 'Tommy (8 anni)', types: [0, 1, 13, 14, 2, 4],
    need: { 1: 12, 13: 16, 14: 16 }, moves: 24, flour: 4, dough: 2,
    hi: 'Con tante tante patatine!!!',
    win: 'È LA PIZZA PIÙ BUONA DEL MONDO!', lose: 'Mammaaa, ho fame!',
  },
  {
    pizza: 'Carbonara', face: '🤵', who: 'Fabrizio (romano)', types: [1, 12, 11, 10, 3, 4],
    need: { 1: 12, 12: 16, 11: 16 }, moves: 22, flour: 5, dough: 3,
    hi: 'Senza panna. Guai a te.',
    win: 'Aò, mejo de mi nonna!', lose: 'Me ne vado a Trastevere.',
  },
  {
    pizza: 'Friarielli e provola', face: '👷', who: 'Peppe', types: [0, 1, 15, 5, 7, 4],
    need: { 1: 15, 15: 18, 5: 10 }, moves: 21, dough: 5,
    hi: 'Ho mezz’ora di pausa. Falla bella carica.',
    win: 'Mo sì che torno a faticare!', lose: 'La pausa è finita, mannaggia.',
  },
  {
    pizza: 'Frutti di mare', face: '🧜', who: 'Marina', types: [0, 16, 7, 2, 8, 4],
    need: { 0: 14, 16: 16, 7: 12, 8: 10 }, moves: 20, flour: 6, dough: 2,
    hi: 'Fresca di giornata, mi raccomando.',
    win: 'Sa di mare. Meraviglia!', lose: 'Torno a nuoto, faccio prima.',
  },
  {
    pizza: 'Quattro stagioni', face: '👮', who: 'Il maresciallo', types: [0, 1, 3, 4, 11, 9],
    need: { 0: 14, 1: 14, 3: 12, 4: 12, 11: 12 }, moves: 19, flour: 4, dough: 4,
    hi: 'Mi hanno chiamato per un ananas. Già che ci sono…',
    win: 'Nulla da verbalizzare. Ottima.', lose: 'Qui scatta la multa.',
  },
  {
    pizza: 'Pizza del Nonno', face: '👴', who: 'Nonno Gennaro', types: [0, 1, 2, 5, 3, 4],
    need: { 0: 18, 1: 18, 2: 12, 5: 12 }, moves: 20, flour: 5, dough: 5,
    hi: 'Fammi vedere cosa hai imparato.',
    win: 'Bravo. Mo sì che sei un pizzaiolo.', lose: 'Eh no. Si ricomincia dalla farina.',
  },
];

// Attrezzi del pizzaiolo: si pagano in gettoni (uno per ogni stella nuova) e non consumano mosse.
export const TOOLS = {
  knife: { e: '🔪', n: 'Coltello', cost: 1, tip: 'Tocca un ingrediente per toglierlo.' },
  fork: { e: '🍴', n: 'Forchetta', cost: 2, tip: 'Tocca una riga per infilzarla tutta.' },
};
// Legna nel forno: 5 mosse in più quando il cliente sta per andarsene.
export const LOGS = { e: '🪵', cost: 3, moves: 5 };

// Ora di punta: niente ordine, solo punti finché dura il tempo.
export const RUSH_SECONDS = 60;
export const RUSH = {
  pizza: 'Ora di punta', face: '⏱️', who: 'tutti', types: [0, 1, 2, 3, 4, 5], need: {}, moves: 1, rush: true,
  hi: 'Sala piena! Più file fai, più punti prendi.',
};

export const NONNO = [
  "Mamma mia! L'ananas sulla pizza?!",
  'Ma che state facendo?! 😱',
  'Napoli piange…',
  'Io chiamo i carabinieri!',
  'Non è pizza, è frutta!',
];

export const PRAISE = ['Che maestria!', 'Mamma che combo!', 'Sei un artista!', 'Spettacolo!', 'Da manuale!'];

// Dopo l'ultimo ordine si ricomincia, con richieste più grandi e un ostacolo in più per tipo.
export function levelFor(i) {
  const base = LEVELS[i % LEVELS.length];
  const round = Math.floor(i / LEVELS.length);
  if (!round) return base;
  const need = {};
  for (const k in base.need) need[k] = Math.round(base.need[k] * (1 + round * 0.25));
  return {
    ...base, need, moves: base.moves + round * 2,
    flour: Math.min(12, (base.flour || 0) + round), dough: Math.min(10, (base.dough || 0) + round),
  };
}
