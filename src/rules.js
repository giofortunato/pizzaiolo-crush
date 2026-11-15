// Regole pure del gioco: niente React, niente animazioni, niente suoni.
// Lavorano su una griglia N×N di celle { t, sp, hp, lock } (o null se vuota),
// quindi si possono provare con `npm test` e usare in scripts/sim.mjs.
import { N, BOMB, DOUGH, T } from './data.js';

export const keyOf = (r, c) => r * N + c;
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

// Un ingrediente vero (non impasto crudo, non Pala).
export const isIng = (x) => !!x && x.t < DOUGH;
// Il giocatore può spostarla? L'impasto crudo e gli ingredienti infarinati no.
export const canMove = (x) => !!x && x.t !== DOUGH && !x.lock;

export function tAt(grid, r, c) {
  const x = grid[r] && grid[r][c];
  return isIng(x) ? x.t : -1;
}

// Tutte le file da 3 o più, orizzontali (h: true) e verticali.
export function findMatches(grid) {
  const g = [];
  for (let r = 0; r < N; r++) {
    let c = 0;
    while (c < N) {
      const t = tAt(grid, r, c); let e = c + 1;
      while (e < N && tAt(grid, r, e) === t) e++;
      if (t >= 0 && e - c >= 3) { const cells = []; for (let x = c; x < e; x++) cells.push([r, x]); g.push({ h: true, t, cells }); }
      c = e;
    }
  }
  for (let c = 0; c < N; c++) {
    let r = 0;
    while (r < N) {
      const t = tAt(grid, r, c); let e = r + 1;
      while (e < N && tAt(grid, e, c) === t) e++;
      if (t >= 0 && e - r >= 3) { const cells = []; for (let y = r; y < e; y++) cells.push([y, c]); g.push({ h: false, t, cells }); }
      r = e;
    }
  }
  return g;
}

export function swapCells(grid, r1, c1, r2, c2) {
  const a = grid[r1][c1]; grid[r1][c1] = grid[r2][c2]; grid[r2][c2] = a;
}

// Tutte le coppie di celle adiacenti che si possono scambiare con effetto.
export function findMoves(grid, onlyFirst = false) {
  const out = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const a = grid[r][c];
    if (!canMove(a)) continue;
    if (a.sp === 'bomb') {
      for (const [dr, dc] of DIRS) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 < 0 || r2 >= N || c2 < 0 || c2 >= N || !canMove(grid[r2][c2])) continue;
        out.push([[r, c], [r2, c2]]);
        if (onlyFirst) return out;
      }
      continue;
    }
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const r2 = r + dr, c2 = c + dc;
      if (r2 >= N || c2 >= N) continue;
      const b = grid[r2][c2];
      if (!canMove(b) || b.sp === 'bomb') continue; // la Pala è già contata dalla sua cella
      // due Forni vicini si possono sempre scambiare: fanno la croce
      if (a.sp && b.sp) { out.push([[r, c], [r2, c2]]); if (onlyFirst) return out; continue; }
      swapCells(grid, r, c, r2, c2);
      const ok = findMatches(grid).length > 0;
      swapCells(grid, r, c, r2, c2);
      if (ok) { out.push([[r, c], [r2, c2]]); if (onlyFirst) return out; }
    }
  }
  return out;
}

// Una mossa valida qualsiasi, o null.
export function findMove(grid) { return findMoves(grid, true)[0] || null; }

// Quali tessere speciali nascono da questi gruppi: Map cella -> 'row' | 'col' | 'bomb'.
// 4 in fila = Forno (riga o colonna), 5 in fila o incrocio a L/T = Pala.
// `isSwapped(r, c)` dice se la cella è una delle due appena scambiate: la speciale nasce lì.
export function planSpecials(groups, isSwapped = () => false) {
  const create = new Map(), inH = new Set(), inV = new Set();
  for (const g of groups) for (const [r, c] of g.cells) (g.h ? inH : inV).add(keyOf(r, c));
  for (const k of inH) if (inV.has(k)) create.set(k, 'bomb');
  for (const g of groups) {
    if (g.cells.length < 4 || g.cells.some(([r, c]) => create.has(keyOf(r, c)))) continue;
    const pos = g.cells.find(([r, c]) => isSwapped(r, c)) || g.cells[g.cells.length >> 1];
    create.set(keyOf(pos[0], pos[1]), g.cells.length >= 5 ? 'bomb' : g.h ? 'row' : 'col');
  }
  return create;
}

export function posOf(grid, x) {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] === x) return [r, c];
  return null;
}

/**
 * Scambio tra tessere speciali (a e b sono già al nuovo posto). Dice quali celle svuotare:
 *   Forno + Forno           -> 'cross': una riga e una colonna insieme
 *   Pala + ingrediente      -> 'type':  tutti gli ingredienti di quel tipo
 *   Pala + Forno            -> 'fire':  tutti quelli di quel tipo diventano Forni e scattano
 *   Pala + Pala             -> 'all':   tutta la scacchiera
 * Restituisce null se è uno scambio normale, da giudicare con findMatches().
 */
export function comboClear(grid, a, b, rnd = Math.random) {
  if (a.sp !== 'bomb' && b.sp !== 'bomb') {
    if (!a.sp || !b.sp) return null;
    a.sp = 'row'; b.sp = 'col';
    return { kind: 'cross', keys: [keyOf(...posOf(grid, a)), keyOf(...posOf(grid, b))] };
  }
  const bomb = a.sp === 'bomb' ? a : b, other = bomb === a ? b : a;
  let keys, kind;
  if (other.sp === 'bomb') {
    kind = 'all'; keys = [];
    for (let i = 0; i < N * N; i++) keys.push(i);
    other.sp = null;
  } else {
    kind = other.sp ? 'fire' : 'type';
    keys = ofType(grid, other.t);
    if (other.sp) for (const k of keys) { const x = grid[Math.floor(k / N)][k % N]; if (!x.sp) x.sp = rnd() < 0.5 ? 'row' : 'col'; }
  }
  bomb.sp = null;
  keys.push(keyOf(...posOf(grid, bomb)));
  return { kind, keys };
}

export function ofType(grid, t) {
  const out = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] && grid[r][c].t === t) out.push(keyOf(r, c));
  return out;
}

// L'ingrediente più presente; quelli che servono ancora (`wanted`) hanno la precedenza.
export function commonType(grid, wanted = () => false) {
  const cnt = {};
  for (const row of grid) for (const x of row) if (isIng(x)) cnt[x.t] = (cnt[x.t] || 0) + 1;
  let best = -1, bc = -1;
  for (const k in cnt) {
    const w = cnt[k] + (wanted(+k) ? 100 : 0);
    if (w > bc) { bc = w; best = +k; }
  }
  return best;
}

/**
 * Toglie dalla griglia le celle di `clear` (Set di chiavi), con tutto quello che ne segue:
 * - le speciali colpite scattano a catena (riga, colonna, Pala);
 * - le celle in `create` non spariscono ma diventano speciali;
 * - l'impasto crudo vicino a una fila (o colpito da una speciale) perde un colpo, a zero sparisce.
 * Modifica `grid` e `clear`. Restituisce cosa è successo, per animazioni e punteggio.
 */
export function clearStep(grid, clear, create = new Map(), wanted = () => false) {
  const matched = [...clear];
  const beams = [];
  let fired = false;
  const queue = [...clear], seen = new Set();
  while (queue.length) {
    const k = queue.pop();
    if (seen.has(k)) continue;
    seen.add(k);
    const r = Math.floor(k / N), c = k % N, x = grid[r][c];
    if (!x || !x.sp || create.has(k)) continue;
    fired = true;
    let extra = [];
    if (x.sp === 'row') { for (let i = 0; i < N; i++) extra.push(keyOf(r, i)); beams.push({ h: true, i: r }); }
    else if (x.sp === 'col') { for (let i = 0; i < N; i++) extra.push(keyOf(i, c)); beams.push({ h: false, i: c }); }
    else if (x.sp === 'bomb') extra = ofType(grid, commonType(grid, wanted));
    for (const e of extra) if (!clear.has(e)) { clear.add(e); queue.push(e); }
  }

  const created = [];
  for (const [k, sp] of create) {
    const x = grid[Math.floor(k / N)][k % N];
    if (!x) continue;
    x.sp = sp; x.lock = false;
    if (sp === 'bomb') x.t = BOMB;
    created.push(x);
  }

  // impasto crudo: colpito direttamente, oppure accanto a una fila
  const hits = new Set();
  for (const k of clear) { const x = grid[Math.floor(k / N)][k % N]; if (x && x.t === DOUGH) hits.add(k); }
  for (const k of matched) {
    const r = Math.floor(k / N), c = k % N;
    if (!grid[r][c] || grid[r][c].t === DOUGH) continue;
    for (const [dr, dc] of DIRS) {
      const y = grid[r + dr] && grid[r + dr][c + dc];
      if (y && y.t === DOUGH) hits.add(keyOf(r + dr, c + dc));
    }
  }

  const removed = [], damaged = [];
  for (const k of clear) {
    if (create.has(k)) continue;
    const r = Math.floor(k / N), c = k % N, x = grid[r][c];
    if (!x || x.t === DOUGH) continue;
    removed.push({ x, r, c });
    grid[r][c] = null;
  }
  for (const k of hits) {
    const r = Math.floor(k / N), c = k % N, x = grid[r][c];
    x.hp--;
    if (x.hp <= 0) { removed.push({ x, r, c }); grid[r][c] = null; } else damaged.push(x);
  }
  return { beams, fired, created, removed, damaged };
}

// Fa cadere le celle nei buchi. Restituisce chi si è mosso e quali celle in alto restano da riempire
// (`from` = riga di partenza fuori dallo schermo, per l'animazione di caduta).
export function collapse(grid) {
  const moved = [], holes = [];
  for (let c = 0; c < N; c++) {
    let w = N - 1;
    for (let r = N - 1; r >= 0; r--) {
      const x = grid[r][c];
      if (!x) continue;
      if (w !== r) { grid[w][c] = x; grid[r][c] = null; moved.push({ x, r: w, c }); }
      w--;
    }
    for (let r = w; r >= 0; r--) holes.push({ r, c, from: r - (w + 1) });
  }
  return { moved, holes };
}

// Scacchiera iniziale: nessuna fila già fatta, almeno una mossa possibile,
// più gli ostacoli del livello (`dough` panetti di impasto crudo, `flour` ingredienti infarinati).
export function newBoard(lvl, rnd = Math.random) {
  const pick = () => lvl.types[Math.floor(rnd() * lvl.types.length)];
  for (;;) {
    const g = [];
    for (let r = 0; r < N; r++) {
      g.push([]);
      for (let c = 0; c < N; c++) {
        let t;
        do { t = pick(); } while (
          (c >= 2 && g[r][c - 1].t === t && g[r][c - 2].t === t) ||
          (r >= 2 && g[r - 1][c].t === t && g[r - 2][c].t === t)
        );
        g[r].push({ t, sp: null, hp: 0, lock: false });
      }
    }
    const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c]);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const s = cells[i]; cells[i] = cells[j]; cells[j] = s; }
    let dough = lvl.dough || 0, flour = lvl.flour || 0;
    for (const [r, c] of cells) {
      if (dough > 0 && r >= 3) { g[r][c].t = DOUGH; g[r][c].hp = 2; dough--; }
      else if (flour > 0) { g[r][c].lock = true; flour--; }
    }
    if (findMove(g)) return g;
  }
}

// Rimescola gli ingredienti normali finché c'è una mossa e nessuna fila già fatta.
export function reshuffle(grid, pick) {
  for (let i = 0; i < 100; i++) {
    for (const row of grid) for (const x of row) if (x && !x.sp && x.t !== DOUGH) x.t = pick();
    if (!findMatches(grid).length && findMove(grid)) return true;
  }
  return false;
}

export function starsFor(moves, startMoves) {
  const r = moves / startMoves;
  return r >= 0.35 ? 3 : r >= 0.12 ? 2 : 1;
}

// Una griglia salvata è utilizzabile?
export function validGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== N) return false;
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== N) return false;
    for (const x of row) {
      if (!x || !Number.isInteger(x.t)) return false;
      if (!(x.t >= 0 && x.t < T.length) && x.t !== DOUGH && x.t !== BOMB) return false;
      if (x.sp != null && !['row', 'col', 'bomb'].includes(x.sp)) return false;
      if (x.t === DOUGH && !(x.hp >= 1 && x.hp <= 2)) return false;
      if ((x.t === BOMB) !== (x.sp === 'bomb')) return false;
    }
  }
  return true;
}

export const plainCell = (x) => ({ t: x.t, sp: x.sp || null, hp: x.hp || 0, lock: !!x.lock });
