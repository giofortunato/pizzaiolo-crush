import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/data.js';
import { newBoard } from '../src/rules.js';
import {
  emptyProgress, sanitize, recordWin, totalStars, totalScore,
  dayKey, dayNumber, isDay, seeded, dailyLevel, dailyDone, dailyStreak, recordDaily,
} from '../src/progress.js';

const current = () => ({ lvlIdx: 6, score: 120, moves: 9, got: { 0: 5, 8: 2 }, nonnoCount: 0, grid: newBoard(LEVELS[6]) });

test('sanitize: scarta la spazzatura', () => {
  assert.equal(sanitize(null), null);
  assert.equal(sanitize('ciao'), null);
  assert.equal(sanitize({ unlocked: -1 }), null);
  assert.equal(sanitize({ unlocked: 1.5 }), null);
});

test('sanitize: converte il vecchio salvataggio { lvlIdx, score }', () => {
  assert.deepEqual(sanitize({ lvlIdx: 3, score: 4000 }), { ...emptyProgress(), unlocked: 3, current: null });
});

test('sanitize: tiene solo stelle e record validi', () => {
  const p = sanitize({ unlocked: 2, stars: { 0: 3, 1: 7, x: 2 }, best: { 0: 900, 1: -5 } });
  assert.deepEqual(p.stars, { 0: 3 });
  assert.deepEqual(p.best, { 0: 900 });
  assert.equal(p.current, null);
});

test('sanitize: un salvataggio senza gettoni ne riceve 3 più uno per stella', () => {
  const old = sanitize({ unlocked: 2, stars: { 0: 3, 1: 2 }, best: {} });
  assert.equal(old.coins, 8);
  assert.deepEqual(old.stats, { served: 0, games: 0, combo: 0 });
  assert.deepEqual(old.daily, { last: null, streak: 0 });
  assert.equal(old.rush, 0);
  assert.equal(sanitize({ unlocked: 2, stars: { 0: 3 }, best: {}, coins: 0 }).coins, 0);
  assert.equal(sanitize({ unlocked: 0, daily: { last: 'ieri', streak: 9 } }).daily.streak, 0);
});

test('sanitize: la partita in corso passa per JSON e torna uguale', () => {
  const cur = { ...current(), mode: 'level', day: null };
  const p = sanitize(JSON.parse(JSON.stringify({ ...emptyProgress(), unlocked: 6, current: cur })));
  assert.deepEqual(p.current, cur);
  const daily = { ...current(), mode: 'daily', day: '2026-11-15', lvlIdx: dailyLevel('2026-11-15').idx };
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify({ ...emptyProgress(), current: daily }))).current, daily);
});

test('sanitize: partita in corso rotta = nessuna partita, ma i progressi restano', () => {
  const broken = [
    { ...current(), moves: 0 },
    { ...current(), moves: 999 },
    { ...current(), grid: [] },
    { ...current(), score: 'tanti' },
    { ...current(), mode: 'daily', day: 'domani' },
  ];
  for (const cur of broken) {
    const p = sanitize({ unlocked: 6, stars: { 0: 2 }, best: {}, current: cur });
    assert.equal(p.current, null);
    assert.equal(p.unlocked, 6);
    assert.deepEqual(p.stars, { 0: 2 });
  }
});

test('recordWin: sblocca il prossimo, tiene il meglio, un gettone per stella nuova', () => {
  let { progress: p, record, gained } = recordWin(emptyProgress(), 0, 2, 500);
  assert.equal(record, true);
  assert.equal(gained, 2);
  assert.deepEqual(p, { ...emptyProgress(), unlocked: 1, stars: { 0: 2 }, best: { 0: 500 }, coins: 5 });
  ({ progress: p, record, gained } = recordWin(p, 0, 1, 300)); // rigiocato peggio
  assert.equal(record, false);
  assert.equal(gained, 0);
  assert.equal(p.coins, 5);
  ({ progress: p, record, gained } = recordWin(p, 0, 3, 800)); // rigiocato meglio
  assert.equal(record, true);
  assert.equal(gained, 1);
  ({ progress: p } = recordWin(p, 1, 1, 200));
  assert.equal(p.unlocked, 2);
  assert.equal(p.coins, 7);
  assert.equal(totalStars(p), 4);
  assert.equal(totalScore(p), 1000);
});

test('pizza del giorno: stessa per tutti nello stesso giorno, cambia nei giorni', () => {
  const a = dailyLevel('2026-11-15'), b = dailyLevel('2026-11-15');
  assert.deepEqual(a, b);
  assert.equal(a.lvl.daily, true);
  assert.deepEqual(newBoard(a.lvl, seeded(a.seed)), newBoard(b.lvl, seeded(b.seed)));
  const month = new Set();
  for (let d = 1; d <= 30; d++) month.add(dailyLevel(`2026-11-${String(d).padStart(2, '0')}`).idx);
  assert.ok(month.size >= 8, `solo ${month.size} pizze diverse in un mese`);
});

test('dayKey usa la data locale', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(dayNumber('2026-03-01') - dayNumber('2026-02-28'), 1);
  assert.equal(isDay('2026-11-15'), true);
  assert.equal(isDay('15/11/2026'), false);
});

test('recordDaily: serie di giorni e gettoni, una volta al giorno', () => {
  let p = recordDaily(emptyProgress(), '2026-11-14');
  assert.deepEqual(p.daily, { last: '2026-11-14', streak: 1 });
  assert.equal(p.coins, 5);
  assert.equal(recordDaily(p, '2026-11-14'), p); // già fatta oggi
  assert.equal(dailyStreak(p, '2026-11-15'), 1); // ieri sì, oggi non ancora
  p = recordDaily(p, '2026-11-15');
  assert.deepEqual(p.daily, { last: '2026-11-15', streak: 2 });
  assert.equal(dailyDone(p, '2026-11-15'), true);
  assert.equal(dailyStreak(p, '2026-11-17'), 0); // saltato un giorno
  p = recordDaily(p, '2026-11-17');
  assert.equal(p.daily.streak, 1);
  p = recordDaily(p, '2026-12-01');
  assert.equal(recordDaily(p, '2026-12-02').daily.streak, 2); // cambio di mese
});
