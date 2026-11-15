// Progressi del giocatore, senza dipendenze dal telefono (si prova con `npm test`).
//   unlocked: quanti ordini hai completato in fila (l'ordine `unlocked` è il prossimo da fare)
//   stars[i], best[i]: stelle e punteggio migliori dell'ordine i
//   coins: gettoni per gli attrezzi (uno per ogni stella nuova, due per la pizza del giorno)
//   stats: pizze servite, partite iniziate, combo più lunga
//   rush: record dell'Ora di punta
//   daily: ultimo giorno in cui hai servito la pizza del giorno, e da quanti giorni di fila
//   current: la partita lasciata a metà, o null
import { LEVELS, levelFor } from './data.js';
import { validGrid, plainCell } from './rules.js';

const isCount = (n) => Number.isInteger(n) && n >= 0;
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const START_COINS = 3;
export const DAILY_COINS = 2;

export const emptyProgress = () => ({
  unlocked: 0, stars: {}, best: {}, coins: START_COINS,
  stats: { served: 0, games: 0, combo: 0 }, rush: 0, daily: { last: null, streak: 0 },
});

// ---------- pizza del giorno ----------
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dayNumber = (key) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
export const isDay = (key) => typeof key === 'string' && DAY.test(key) && !Number.isNaN(dayNumber(key));

// Generatore di numeri "a caso" ma sempre uguali a parità di seme: serve per dare a tutti la stessa scacchiera.
export function seeded(seed) {
  let s = (seed % 2147483646) + 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// L'ordine del giorno: uno dei quindici, scelto dalla data. `seed` genera la scacchiera di partenza.
export function dailyLevel(key) {
  const n = dayNumber(key);
  const idx = Math.floor(seeded(n * 7919)() * LEVELS.length);
  return { idx, seed: n * 104729 + 17, lvl: { ...LEVELS[idx], daily: true } };
}

export const dailyDone = (p, key) => p.daily.last === key;
// Serie in corso: vale anche se oggi non hai ancora giocato ma ieri sì.
export function dailyStreak(p, key) {
  if (!p.daily.last) return 0;
  const gap = dayNumber(key) - dayNumber(p.daily.last);
  return gap === 0 || gap === 1 ? p.daily.streak : 0;
}

export function recordDaily(p, key) {
  if (dailyDone(p, key)) return p;
  return { ...p, coins: p.coins + DAILY_COINS, daily: { last: key, streak: dailyStreak(p, key) + 1 } };
}

// ---------- salvataggio ----------
function cleanMap(obj, ok) {
  const out = {};
  if (obj && typeof obj === 'object') for (const k in obj) if (isCount(+k) && ok(obj[k])) out[+k] = obj[k];
  return out;
}

function cleanCurrent(cur) {
  if (!cur || typeof cur !== 'object') return null;
  if (!isCount(cur.lvlIdx) || !isCount(cur.score) || !Number.isInteger(cur.moves)) return null;
  const daily = cur.mode === 'daily';
  if (daily && !isDay(cur.day)) return null;
  const lvl = daily ? dailyLevel(cur.day).lvl : levelFor(cur.lvlIdx);
  // la legna può aggiungere mosse oltre quelle di partenza
  if (cur.moves < 1 || cur.moves > lvl.moves + 100 || !validGrid(cur.grid)) return null;
  return {
    mode: daily ? 'daily' : 'level', day: daily ? cur.day : null,
    lvlIdx: cur.lvlIdx, score: cur.score, moves: cur.moves,
    got: cleanMap(cur.got, isCount),
    nonnoCount: isCount(cur.nonnoCount) ? cur.nonnoCount : 0,
    grid: cur.grid.map((row) => row.map(plainCell)),
  };
}

// Ripulisce un salvataggio letto dal disco. Accetta anche i formati più vecchi, a cui mancano dei campi.
export function sanitize(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.unlocked === undefined && isCount(data.lvlIdx)) return { ...emptyProgress(), unlocked: data.lvlIdx, current: null };
  if (!isCount(data.unlocked)) return null;
  const stars = cleanMap(data.stars, (s) => s === 1 || s === 2 || s === 3);
  const st = data.stats || {}, dl = data.daily || {};
  const last = isDay(dl.last) ? dl.last : null;
  return {
    unlocked: data.unlocked,
    stars,
    best: cleanMap(data.best, isCount),
    // chi aveva già delle stelle prima dei gettoni li riceve tutti insieme
    coins: isCount(data.coins) ? data.coins : START_COINS + sum(stars),
    stats: { served: isCount(st.served) ? st.served : 0, games: isCount(st.games) ? st.games : 0, combo: isCount(st.combo) ? st.combo : 0 },
    rush: isCount(data.rush) ? data.rush : 0,
    daily: { last, streak: last && isCount(dl.streak) ? dl.streak : 0 },
    current: cleanCurrent(data.current),
  };
}

// Ordine servito: tiene il meglio tra prima e adesso, sblocca il successivo, un gettone per ogni stella nuova.
export function recordWin(p, idx, stars, score) {
  const record = score > (p.best[idx] || 0);
  const gained = Math.max(0, stars - (p.stars[idx] || 0));
  return {
    record, gained,
    progress: {
      ...p,
      unlocked: Math.max(p.unlocked, idx + 1),
      stars: { ...p.stars, [idx]: Math.max(p.stars[idx] || 0, stars) },
      best: { ...p.best, [idx]: Math.max(p.best[idx] || 0, score) },
      coins: p.coins + gained,
    },
  };
}

export const totalStars = (p) => sum(p.stars);
export const totalScore = (p) => sum(p.best);
