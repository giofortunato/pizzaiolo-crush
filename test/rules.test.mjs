import { test } from 'node:test';
import assert from 'node:assert/strict';
import { N, BOMB, DOUGH, LEVELS, T, levelFor } from '../src/data.js';
import {
  keyOf, findMatches, findMove, findMoves, planSpecials, clearStep, collapse,
  newBoard, reshuffle, starsFor, validGrid, commonType, canMove,
} from '../src/rules.js';

// Griglia da 8 righe di testo. Cifre = ingredienti, D = impasto crudo, P = Pala,
// lettere minuscole a-e = ingredienti 0-4 infarinati, '.' = riempitivo che non fa mai fila.
function board(rows) {
  let filler = 0;
  return rows.map((row, r) => [...row.padEnd(N, '.')].map((ch, c) => {
    if (ch === 'D') return { t: DOUGH, sp: null, hp: 2, lock: false };
    if (ch === 'P') return { t: BOMB, sp: 'bomb', hp: 0, lock: false };
    if (ch >= 'a' && ch <= 'e') return { t: ch.charCodeAt(0) - 97, sp: null, hp: 0, lock: true };
    if (ch === '.') return { t: 10 + ((r * 2 + c + Math.floor(c / 2) + filler) % 5), sp: null, hp: 0, lock: false };
    return { t: +ch, sp: null, hp: 0, lock: false };
  }));
}
const EMPTY = ['', '', '', '', '', '', '', ''];
const rows = (o) => EMPTY.map((_, i) => o[i] || '');
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

test('il riempitivo dei test non crea file né mosse', () => {
  const g = board(EMPTY);
  assert.equal(findMatches(g).length, 0);
  assert.equal(findMove(g), null);
});

test('findMatches: file orizzontali e verticali', () => {
  const g = board(rows({ 0: '000', 3: '...1', 4: '...1', 5: '...1', 6: '...1' }));
  const m = findMatches(g);
  assert.equal(m.length, 2);
  assert.deepEqual(m[0], { h: true, t: 0, cells: [[0, 0], [0, 1], [0, 2]] });
  assert.equal(m[1].h, false);
  assert.equal(m[1].cells.length, 4);
});

test('findMatches: impasto e Pala non fanno fila', () => {
  assert.equal(findMatches(board(rows({ 0: 'DDD', 1: 'PPP' }))).length, 0);
});

test('findMatches: gli ingredienti infarinati contano', () => {
  assert.equal(findMatches(board(rows({ 0: '0a0' }))).length, 1);
});

test('findMove: trova lo scambio che chiude una fila', () => {
  const g = board(rows({ 0: '00.0' }));
  assert.deepEqual(findMove(g), [[0, 2], [0, 3]]);
});

test('findMove: non propone di spostare tessere bloccate', () => {
  assert.equal(findMove(board(rows({ 0: '00.a' }))), null); // l'unico 0 utile è infarinato
  assert.equal(findMove(board(rows({ 0: '00D0' }))), null); // in mezzo c'è l'impasto
});

test('findMove: la Pala si scambia con qualsiasi vicino spostabile', () => {
  const g = board(rows({ 0: 'P' }));
  assert.equal(findMoves(g).length, 2);
  const stuck = board(rows({ 0: 'PD', 1: 'a' }));
  assert.equal(findMove(stuck), null);
});

test('planSpecials: 3 niente, 4 Forno, 5 Pala, incrocio Pala', () => {
  const plan = (o, sw) => planSpecials(findMatches(board(rows(o))), sw);
  assert.equal(plan({ 0: '000' }).size, 0);
  assert.deepEqual([...plan({ 0: '0000' }).values()], ['row']);
  assert.deepEqual([...plan({ 0: '1', 1: '1', 2: '1', 3: '1' }).values()], ['col']);
  assert.deepEqual([...plan({ 0: '00000' }).values()], ['bomb']);
  const cross = plan({ 0: '000', 1: '0', 2: '0' });
  assert.deepEqual([...cross], [[keyOf(0, 0), 'bomb']]);
});

test('planSpecials: la speciale nasce dove hai scambiato', () => {
  const g = findMatches(board(rows({ 0: '0000' })));
  assert.deepEqual([...planSpecials(g, (r, c) => c === 3).keys()], [keyOf(0, 3)]);
});

test('clearStep: toglie la fila e basta', () => {
  const g = board(rows({ 0: '000' }));
  const res = clearStep(g, new Set([0, 1, 2]));
  assert.equal(res.removed.length, 3);
  assert.equal(res.fired, false);
  assert.equal(g[0][0], null);
  assert.ok(g[0][3]);
});

test('clearStep: il Forno brucia tutta la riga, anche a catena', () => {
  const g = board(rows({ 2: '000' }));
  g[2][1].sp = 'row';
  g[2][6].sp = 'col';
  const res = clearStep(g, new Set([keyOf(2, 0), keyOf(2, 1), keyOf(2, 2)]));
  assert.equal(res.beams.length, 2);
  assert.equal(res.removed.length, N + N - 1);
  assert.ok(g[2].every((x) => x === null));
  assert.ok(g.every((row) => row[6] === null));
});

test('clearStep: la cella che diventa speciale resta, e perde la farina', () => {
  const g = board(rows({ 0: '0a00' }));
  const create = new Map([[1, 'row']]);
  const res = clearStep(g, new Set([0, 1, 2, 3]), create);
  assert.equal(res.removed.length, 3);
  assert.equal(g[0][1].sp, 'row');
  assert.equal(g[0][1].lock, false);
  assert.equal(res.created.length, 1);
});

test('clearStep: la Pala colpita prende l’ingrediente che serve', () => {
  const g = board(rows({ 0: '000P', 5: '4.4', 6: '3.3.3.3' }));
  const res = clearStep(g, new Set([0, 1, 2, 3]), new Map(), (t) => t === 4);
  assert.equal(commonType(board(rows({ 5: '4.4', 6: '3.3.3.3' })), (t) => t === 4), 4);
  assert.equal(res.removed.filter((e) => e.x.t === 4).length, 2);
  assert.equal(res.removed.filter((e) => e.x.t === 3).length, 0);
});

test('clearStep: l’impasto accanto a una fila si cuoce in due colpi', () => {
  const g = board(rows({ 0: '000', 1: '.D' }));
  let res = clearStep(g, new Set([0, 1, 2]));
  assert.equal(g[1][1].hp, 1);
  assert.equal(res.damaged.length, 1);
  assert.equal(res.removed.length, 3);
  g[0][0] = { t: 1, sp: null, hp: 0, lock: false };
  g[0][1] = { t: 1, sp: null, hp: 0, lock: false };
  g[0][2] = { t: 1, sp: null, hp: 0, lock: false };
  res = clearStep(g, new Set([0, 1, 2]));
  assert.equal(g[1][1], null);
  assert.equal(res.removed.length, 4);
});

test('clearStep: il raggio colpisce l’impasto sulla riga ma non quello accanto', () => {
  const g = board(rows({ 2: '000..D', 3: '.....D' }));
  g[2][1].sp = 'row';
  clearStep(g, new Set([keyOf(2, 0), keyOf(2, 1), keyOf(2, 2)]));
  assert.equal(g[2][5].hp, 1);
  assert.equal(g[3][5].hp, 2);
});

test('collapse: le tessere cadono e restano i buchi in alto', () => {
  const g = board(EMPTY);
  const top = g[0][0], mid = g[3][0];
  g[4][0] = null; g[5][0] = null;
  const { moved, holes } = collapse(g);
  assert.equal(g[5][0], mid);
  assert.equal(g[2][0], top);
  assert.equal(moved.length, 4);
  assert.deepEqual(holes, [{ r: 1, c: 0, from: -1 }, { r: 0, c: 0, from: -2 }]);
  assert.equal(g[0][0], null);
});

test('newBoard: niente file pronte, almeno una mossa, ostacoli giusti', () => {
  for (let i = 0; i < LEVELS.length * 2; i++) {
    const lvl = levelFor(i);
    for (let s = 1; s <= 20; s++) {
      const g = newBoard(lvl, rng(s * 7919 + i));
      assert.equal(findMatches(g).length, 0);
      assert.ok(findMove(g));
      assert.ok(validGrid(g));
      const flat = g.flat();
      assert.equal(flat.filter((x) => x.t === DOUGH).length, lvl.dough || 0);
      assert.equal(flat.filter((x) => x.lock).length, lvl.flour || 0);
      assert.ok(flat.every((x) => x.t === DOUGH || lvl.types.includes(x.t)));
      assert.ok(g.slice(0, 3).flat().every((x) => x.t !== DOUGH));
    }
  }
});

test('reshuffle: lascia stare impasto e speciali, e trova una mossa', () => {
  const g = board(rows({ 0: 'D', 1: '.P' }));
  const r = rng(5), types = [0, 1, 2, 3, 4];
  assert.equal(reshuffle(g, () => types[Math.floor(r() * 5)]), true);
  assert.equal(g[0][0].t, DOUGH);
  assert.equal(g[1][1].sp, 'bomb');
  assert.equal(findMatches(g).length, 0);
  assert.ok(findMove(g));
});

test('starsFor: soglie delle stelle', () => {
  assert.equal(starsFor(7, 20), 3);
  assert.equal(starsFor(6, 20), 2);
  assert.equal(starsFor(3, 20), 2);
  assert.equal(starsFor(2, 20), 1);
  assert.equal(starsFor(0, 20), 1);
});

test('validGrid: rifiuta salvataggi rotti', () => {
  const ok = board(rows({ 0: 'DP0a' }));
  assert.equal(validGrid(ok), true);
  assert.equal(validGrid(null), false);
  assert.equal(validGrid(ok.slice(1)), false);
  const hole = board(EMPTY); hole[2][2] = null;
  assert.equal(validGrid(hole), false);
  const bad = board(EMPTY); bad[0][0].t = 55;
  assert.equal(validGrid(bad), false);
  const fake = board(EMPTY); fake[0][0].sp = 'bomb';
  assert.equal(validGrid(fake), false);
});

test('canMove', () => {
  const g = board(rows({ 0: 'Da0P' }));
  assert.deepEqual(g[0].slice(0, 4).map(canMove), [false, false, true, true]);
});

test('livelli: ingredienti richiesti presenti sulla scacchiera, dati completi', () => {
  LEVELS.forEach((l) => {
    for (const k in l.need) assert.ok(l.types.includes(+k), `${l.pizza}: manca ${k}`);
    for (const t of l.types) assert.ok(T[t], `${l.pizza}: tipo ${t} sconosciuto`);
    assert.equal(new Set(l.types).size, l.types.length);
    for (const f of ['pizza', 'face', 'who', 'hi', 'win', 'lose']) assert.ok(l[f]);
  });
});

test('levelFor: dal secondo giro crescono richieste, mosse e ostacoli', () => {
  const a = levelFor(0), b = levelFor(LEVELS.length);
  assert.equal(a, LEVELS[0]);
  assert.equal(b.need[0], 15);
  assert.equal(b.moves, a.moves + 2);
  assert.equal(b.flour, 1);
  assert.equal(b.dough, 1);
});
