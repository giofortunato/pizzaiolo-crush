// Simulatore per tarare la difficoltà: gioca ogni ordine tante volte con le stesse regole dell'app
// e dice quante volte si vince. Uso: node scripts/sim.mjs [partite per ordine]
//   "a caso"  = sceglie una mossa valida qualsiasi (un giocatore distratto)
//   "attento" = sceglie la mossa che raccoglie più ingredienti richiesti (guarda una mossa avanti)
import { pathToFileURL } from 'node:url';
import { N, BOMB, LEVELS } from '../src/data.js';
import {
  keyOf, findMatches, findMoves, swapCells, planSpecials, clearStep, collapse,
  newBoard, reshuffle, ofType, starsFor, plainCell,
} from '../src/rules.js';

const games = +process.argv[2] || 300;
let seed = 12345;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// Esegue una mossa su `grid` aggiornando `got`. Restituisce quanti ingredienti ancora richiesti ha raccolto.
function play(grid, lvl, got, [[r1, c1], [r2, c2]]) {
  const pick = () => lvl.types[Math.floor(rnd() * lvl.types.length)];
  const wanted = (t) => !!lvl.need[t] && (got[t] || 0) < lvl.need[t];
  let useful = 0;
  const step = (clear, create) => {
    for (const { x } of clearStep(grid, clear, create, wanted).removed) {
      if (x.t >= 90) continue;
      if (wanted(x.t)) useful++;
      got[x.t] = (got[x.t] || 0) + 1;
    }
    for (const h of collapse(grid).holes) grid[h.r][h.c] = { t: pick(), sp: null, hp: 0, lock: false };
  };
  const a = grid[r1][c1], b = grid[r2][c2];
  swapCells(grid, r1, c1, r2, c2);
  let swapped = [a, b];
  if (a.sp === 'bomb' || b.sp === 'bomb') {
    const bomb = a.sp === 'bomb' ? a : b, other = bomb === a ? b : a;
    let keys;
    if (other.sp === 'bomb') { keys = []; for (let i = 0; i < N * N; i++) keys.push(i); other.sp = null; }
    else keys = ofType(grid, other.t);
    bomb.sp = null;
    keys.push(...ofType(grid, BOMB).filter((k) => grid[Math.floor(k / N)][k % N] === bomb));
    step(new Set(keys), new Map());
    swapped = null;
  }
  for (;;) {
    const groups = findMatches(grid);
    if (!groups.length) break;
    const clear = new Set();
    for (const g of groups) for (const [r, c] of g.cells) clear.add(keyOf(r, c));
    const sw = swapped;
    step(clear, planSpecials(groups, (r, c) => !!sw && sw.includes(grid[r][c])));
    swapped = null;
  }
  if (!findMoves(grid, true).length) reshuffle(grid, pick);
  return useful;
}

const done = (lvl, got) => Object.keys(lvl.need).every((k) => (got[k] || 0) >= lvl.need[k]);

export function game(lvl, smart) {
  const grid = newBoard(lvl, rnd), got = {};
  let moves = lvl.moves;
  while (moves > 0 && !done(lvl, got)) {
    const options = findMoves(grid);
    if (!options.length) break;
    let move = options[Math.floor(rnd() * options.length)];
    if (smart) {
      let best = -1;
      const keep = seed;
      for (const m of options) {
        seed = keep; // stessa "fortuna" per ogni prova, poi si rigioca davvero
        const u = play(grid.map((row) => row.map(plainCell)), lvl, { ...got }, m);
        if (u > best) { best = u; move = m; }
      }
      seed = keep;
    }
    play(grid, lvl, got, move);
    moves--;
  }
  return done(lvl, got) ? starsFor(moves, lvl.moves) : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`${games} partite per ordine\n`);
  console.log('ordine'.padEnd(26) + 'a caso   attento   stelle medie (attento)');
  LEVELS.forEach((lvl, i) => {
    const run = (smart) => { let w = 0, s = 0; for (let g = 0; g < games; g++) { const st = game(lvl, smart); if (st) { w++; s += st; } } return [w / games, w ? s / w : 0]; };
    const [lazy] = run(false), [smart, stars] = run(true);
    const pct = (x) => (Math.round(x * 100) + '%').padStart(5);
    console.log(`${String(i + 1).padStart(2)} ${lvl.pizza.padEnd(22)} ${pct(lazy)}    ${pct(smart)}     ${stars.toFixed(1)}`);
  });
}
