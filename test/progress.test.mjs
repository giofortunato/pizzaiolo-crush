import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/data.js';
import { newBoard } from '../src/rules.js';
import { emptyProgress, sanitize, recordWin, totalStars, totalScore } from '../src/progress.js';

const current = () => ({ lvlIdx: 6, score: 120, moves: 9, got: { 0: 5, 8: 2 }, nonnoCount: 0, grid: newBoard(LEVELS[6]) });

test('sanitize: scarta la spazzatura', () => {
  assert.equal(sanitize(null), null);
  assert.equal(sanitize('ciao'), null);
  assert.equal(sanitize({ unlocked: -1 }), null);
  assert.equal(sanitize({ unlocked: 1.5 }), null);
});

test('sanitize: converte il vecchio salvataggio { lvlIdx, score }', () => {
  assert.deepEqual(sanitize({ lvlIdx: 3, score: 4000 }), { unlocked: 3, stars: {}, best: {}, current: null });
});

test('sanitize: tiene solo stelle e record validi', () => {
  const p = sanitize({ unlocked: 2, stars: { 0: 3, 1: 7, x: 2 }, best: { 0: 900, 1: -5 } });
  assert.deepEqual(p.stars, { 0: 3 });
  assert.deepEqual(p.best, { 0: 900 });
  assert.equal(p.current, null);
});

test('sanitize: la partita in corso passa per JSON e torna uguale', () => {
  const cur = current();
  const p = sanitize(JSON.parse(JSON.stringify({ ...emptyProgress(), unlocked: 6, current: cur })));
  assert.deepEqual(p.current, cur);
});

test('sanitize: partita in corso rotta = nessuna partita, ma i progressi restano', () => {
  const broken = [
    { ...current(), moves: 0 },
    { ...current(), moves: 999 },
    { ...current(), grid: [] },
    { ...current(), score: 'tanti' },
  ];
  for (const cur of broken) {
    const p = sanitize({ unlocked: 6, stars: { 0: 2 }, best: {}, current: cur });
    assert.equal(p.current, null);
    assert.equal(p.unlocked, 6);
    assert.deepEqual(p.stars, { 0: 2 });
  }
});

test('recordWin: sblocca il prossimo e tiene il risultato migliore', () => {
  let { progress: p, record } = recordWin(emptyProgress(), 0, 2, 500);
  assert.equal(record, true);
  assert.deepEqual(p, { unlocked: 1, stars: { 0: 2 }, best: { 0: 500 } });
  ({ progress: p, record } = recordWin(p, 0, 1, 300)); // rigiocato peggio
  assert.equal(record, false);
  assert.deepEqual(p, { unlocked: 1, stars: { 0: 2 }, best: { 0: 500 } });
  ({ progress: p, record } = recordWin(p, 0, 3, 800)); // rigiocato meglio
  assert.equal(record, true);
  ({ progress: p } = recordWin(p, 1, 1, 200));
  assert.equal(p.unlocked, 2);
  assert.equal(totalStars(p), 4);
  assert.equal(totalScore(p), 1000);
});
