// Progressi del giocatore, senza dipendenze dal telefono (si prova con `npm test`).
//   unlocked: quanti ordini hai completato in fila (l'ordine `unlocked` è il prossimo da fare)
//   stars[i], best[i]: stelle e punteggio migliori dell'ordine i
//   current: la partita lasciata a metà, o null
import { levelFor } from './data.js';
import { validGrid, plainCell } from './rules.js';

const isCount = (n) => Number.isInteger(n) && n >= 0;

export const emptyProgress = () => ({ unlocked: 0, stars: {}, best: {} });

function cleanMap(obj, ok) {
  const out = {};
  if (obj && typeof obj === 'object') for (const k in obj) if (isCount(+k) && ok(obj[k])) out[+k] = obj[k];
  return out;
}

function cleanCurrent(cur) {
  if (!cur || typeof cur !== 'object') return null;
  if (!isCount(cur.lvlIdx) || !isCount(cur.score) || !Number.isInteger(cur.moves)) return null;
  const lvl = levelFor(cur.lvlIdx);
  if (cur.moves < 1 || cur.moves > lvl.moves || !validGrid(cur.grid)) return null;
  return {
    lvlIdx: cur.lvlIdx, score: cur.score, moves: cur.moves,
    got: cleanMap(cur.got, isCount),
    nonnoCount: isCount(cur.nonnoCount) ? cur.nonnoCount : 0,
    grid: cur.grid.map((row) => row.map(plainCell)),
  };
}

// Ripulisce un salvataggio letto dal disco. Accetta anche il vecchio formato { lvlIdx, score }.
export function sanitize(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.unlocked === undefined && isCount(data.lvlIdx)) return { ...emptyProgress(), unlocked: data.lvlIdx, current: null };
  if (!isCount(data.unlocked)) return null;
  return {
    unlocked: data.unlocked,
    stars: cleanMap(data.stars, (s) => s === 1 || s === 2 || s === 3),
    best: cleanMap(data.best, isCount),
    current: cleanCurrent(data.current),
  };
}

// Ordine servito: tiene il meglio tra prima e adesso, e sblocca il successivo.
export function recordWin(p, idx, stars, score) {
  const record = score > (p.best[idx] || 0);
  return {
    record,
    progress: {
      unlocked: Math.max(p.unlocked, idx + 1),
      stars: { ...p.stars, [idx]: Math.max(p.stars[idx] || 0, stars) },
      best: { ...p.best, [idx]: Math.max(p.best[idx] || 0, score) },
    },
  };
}

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
export const totalStars = (p) => sum(p.stars);
export const totalScore = (p) => sum(p.best);
