import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { N, DOUGH, T, NONNO, PRAISE, levelFor } from './data';
import {
  keyOf, canMove, findMatches, findMove, swapCells, planSpecials, clearStep, collapse,
  newBoard, reshuffle, ofType, starsFor, plainCell,
} from './rules';
import { emptyProgress, recordWin } from './progress';
import { sfx } from './sound';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const haptic = (kind = 'light') => {
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else Haptics.impactAsync(kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

/**
 * Il gioco, fuori da React: stato, animazioni, suoni.
 * Le regole pure (file, mosse, speciali, ostacoli) stanno in rules.js.
 * Lo schermo si iscrive con onChange() e ridisegna quando serve; onSave() scrive su disco.
 */
export class Game {
  constructor(onChange, onSave) {
    this.onChange = onChange || (() => {});
    this.onSave = onSave || (() => {});
    this.uid = 0;
    this.progress = emptyProgress();
    this.effects = [];
    this.talk = null;
    // Finché non parte un ordine (startLevel o resume) non c'è niente in tavola.
    this.lvl = null;
    this.lvlIdx = 0;
    this.score = 0; // punti dell'ordine in corso
    this.moves = this.startMoves = 0;
    this.got = {};
    this.spots = {};
    this.tiles = new Map();
    this.grid = [];
    this.modal = null;
    this.over = true;
    this.busy = false;
    this.sel = null;
  }

  emit() { this.onChange(); }

  // ---------- salvataggio ----------
  // Carica i progressi letti dal disco. Restituisce true se c'era una partita a metà (ora pronta a riprendere).
  load(saved) {
    if (!saved) return false;
    this.progress = { unlocked: saved.unlocked, stars: saved.stars, best: saved.best };
    if (!saved.current) return false;
    this.resume(saved.current);
    return true;
  }

  snapshot() {
    return {
      lvlIdx: this.lvlIdx, score: this.score, moves: this.moves, got: { ...this.got }, nonnoCount: this.nonnoCount,
      grid: this.grid.map((row) => row.map(plainCell)),
    };
  }

  // Scrive progressi e partita in corso. Si chiama solo a scacchiera ferma, quindi la griglia è completa.
  persist() {
    this.onSave({ ...this.progress, current: this.over ? null : this.snapshot() });
  }

  // C'è un ordine iniziato e non ancora finito?
  inProgress() { return !!this.lvl && (!this.over || (!!this.modal && this.modal.type === 'resume')); }

  // Cancella tutto: progressi, stelle e partita in corso.
  reset() {
    this.clearHint();
    this.progress = emptyProgress();
    this.lvl = null; this.modal = null; this.over = true;
    this.persist();
    this.emit();
  }

  // ---------- livello ----------
  setup(idx, cells) {
    this.clearHint();
    this.lvlIdx = idx;
    this.lvl = levelFor(idx);
    this.startMoves = this.lvl.moves;
    this.over = true;
    this.busy = false;
    this.sel = null;
    this.talk = null;
    this.tiles = new Map();
    this.grid = cells.map((row, r) => row.map((x, c) => this.makeTile(x, r, c)));
    this.genSpots();
  }

  startLevel(idx = this.lvlIdx) {
    this.setup(idx, newBoard(levelFor(idx)));
    this.moves = this.startMoves;
    this.score = 0;
    this.got = {};
    this.nonnoCount = 0;
    this.modal = { type: 'start' };
    this.emit();
  }

  resume(cur) {
    this.setup(cur.lvlIdx, cur.grid);
    this.moves = cur.moves;
    this.score = cur.score;
    this.got = { ...cur.got };
    this.nonnoCount = cur.nonnoCount || 0;
    this.modal = { type: 'resume' };
    this.emit();
  }

  begin() { this.modal = null; this.over = false; this.persist(); this.emit(); this.armHint(); }
  next() { this.startLevel(this.lvlIdx + 1); }
  retry() { this.startLevel(); }

  pick() { const ts = this.lvl.types; return ts[Math.floor(Math.random() * ts.length)]; }

  // Posizioni degli ingredienti sulla pizza, in coordinate relative al raggio (0 = centro, 1 = bordo).
  // spots[k][i] = [x, y, rotazione in gradi, forma]. L'i-esimo pezzo di k appare quando ne hai raccolti i+1.
  genSpots() {
    let seed = this.lvlIdx * 97 + 13;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    // "Best candidate": tra alcuni punti a caso sceglie quello più lontano da quelli già messi,
    // così gli ingredienti si distribuiscono in modo uniforme invece di ammucchiarsi.
    // Conta anche la distanza dai pezzi dello stesso tipo (pesata di meno), così ogni ingrediente
    // copre tutta la pizza invece di finire tutto da una parte. Il bordo conta come un vicino,
    // per non schiacciarli contro il cornicione.
    const spread = (types, maxR) => {
      const pts = [];
      for (const k of types) {
        let best = null, bestScore = -1;
        for (let j = 0; j < 24; j++) {
          const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * maxR;
          const x = Math.cos(a) * d, y = Math.sin(a) * d;
          let score = (maxR - d) + 0.07;
          for (const p of pts) {
            const dist = Math.hypot(p[0] - x, p[1] - y);
            score = Math.min(score, p[2] === k ? dist * 0.6 : dist);
          }
          if (score > bestScore) { bestScore = score; best = [x, y, k]; }
        }
        pts.push(best);
      }
      return pts;
    };

    this.spots = {};
    const need = this.lvl.need;

    // Ingredienti (non pomodoro né mozzarella), con i tipi alternati nell'ordine in cui compaiono.
    const slots = [];
    for (const k in need) {
      if (+k === 0 || +k === 1) continue;
      this.spots[k] = [];
      for (let i = 0; i < need[k]; i++) slots.push({ k, i, p: (i + 0.5) / need[k] });
    }
    slots.sort((a, b) => a.p - b.p);
    spread(slots.map((sl) => sl.k), 0.74).forEach(([x, y], j) => {
      this.spots[slots[j].k][slots[j].i] = [x, y, (rnd() - 0.5) * 50, 0];
    });

    // Mozzarella: posizioni a parte, sotto gli altri ingredienti.
    if (need[1]) {
      this.spots[1] = spread(Array(need[1]).fill(1), 0.7).map(([x, y]) => [x, y, rnd() * 360, Math.floor(rnd() * 1e6)]);
    }
  }

  // ---------- tessere ----------
  // `src` è una cella delle regole: { t, sp, hp, lock }. La tessera aggiunge posizione e animazioni.
  makeTile(src, r, c, fromRow = r) {
    const tile = {
      id: ++this.uid, ...plainCell(src), r, c,
      rv: new Animated.Value(fromRow), cv: new Animated.Value(c),
      sc: new Animated.Value(1), op: new Animated.Value(1), rot: new Animated.Value(0),
    };
    this.tiles.set(tile.id, tile);
    return tile;
  }

  move(tile, r, c) {
    tile.r = r; tile.c = c;
    const cfg = { useNativeDriver: true, speed: 22, bounciness: 5 };
    Animated.parallel([
      Animated.spring(tile.rv, { ...cfg, toValue: r }),
      Animated.spring(tile.cv, { ...cfg, toValue: c }),
    ]).start();
  }

  pop(tile) {
    Animated.parallel([
      Animated.timing(tile.sc, { toValue: 0.1, duration: 170, useNativeDriver: true }),
      Animated.timing(tile.op, { toValue: 0, duration: 170, useNativeDriver: true }),
    ]).start();
  }

  // Scossone a destra e sinistra: mossa non valida.
  shake(tile) {
    const t = (v, d = 45) => Animated.timing(tile.rot, { toValue: v, duration: d, useNativeDriver: true });
    Animated.sequence([t(-10), t(10), t(-7), t(7), t(0)]).start();
  }

  // Rimbalzo: è nata una tessera speciale.
  bounce(tile) {
    Animated.sequence([
      Animated.timing(tile.sc, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.spring(tile.sc, { toValue: 1, speed: 20, bounciness: 14, useNativeDriver: true }),
    ]).start();
  }

  // ---------- suggerimento ----------
  // Se il giocatore sta fermo qualche secondo, due tessere scambiabili ondeggiano.
  armHint() {
    this.clearHint();
    this.hintTimer = setTimeout(() => this.showHint(), 5000);
  }

  clearHint() {
    clearTimeout(this.hintTimer);
    this.hintTimer = null;
    if (this.hintAnim) { this.hintAnim.stop(); this.hintAnim = null; }
    if (this.hintTiles) {
      for (const t of this.hintTiles) { t.rot.setValue(0); t.sc.setValue(1); }
      this.hintTiles = null;
    }
  }

  showHint() {
    if (this.busy || this.over || this.modal) return;
    const m = findMove(this.grid);
    if (!m) return;
    const tiles = m.map(([r, c]) => this.grid[r][c]).filter(Boolean);
    this.hintTiles = tiles;
    const wobble = (t) => Animated.sequence([
      Animated.parallel([
        Animated.timing(t.rot, { toValue: -8, duration: 90, useNativeDriver: true }),
        Animated.timing(t.sc, { toValue: 1.1, duration: 90, useNativeDriver: true }),
      ]),
      Animated.timing(t.rot, { toValue: 8, duration: 140, useNativeDriver: true }),
      Animated.timing(t.rot, { toValue: -6, duration: 120, useNativeDriver: true }),
      Animated.timing(t.rot, { toValue: 0, duration: 90, useNativeDriver: true }),
      Animated.timing(t.sc, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]);
    this.hintAnim = Animated.parallel(tiles.map(wobble));
    this.hintAnim.start(({ finished }) => {
      if (!finished) return;
      this.hintAnim = null;
      this.hintTimer = setTimeout(() => this.showHint(), 3000);
    });
  }

  // ---------- input ----------
  // Impasto crudo e ingredienti infarinati non si spostano: la tessera si scuote e basta.
  refuse(tile) {
    this.sel = null;
    this.shake(tile);
    haptic('error'); sfx('bad');
    this.emit();
  }

  tap(p) {
    if (this.busy || this.over) return;
    this.armHint();
    const tile = this.grid[p.r][p.c];
    if (!canMove(tile)) return this.refuse(tile);
    const s = this.sel;
    if (s && Math.abs(s.r - p.r) + Math.abs(s.c - p.c) === 1) { this.sel = null; this.trySwap(s.r, s.c, p.r, p.c); return; }
    this.sel = s && s.r === p.r && s.c === p.c ? null : p;
    this.emit();
  }

  swipe(p, dr, dc) {
    const r2 = p.r + dr, c2 = p.c + dc;
    if (r2 < 0 || r2 >= N || c2 < 0 || c2 >= N) return;
    this.sel = null;
    this.trySwap(p.r, p.c, r2, c2);
  }

  async trySwap(r1, c1, r2, c2) {
    if (this.busy || this.over) return;
    const a = this.grid[r1][c1], b = this.grid[r2][c2];
    if (!canMove(a) || !canMove(b)) { this.armHint(); return this.refuse(canMove(a) ? b : a); }
    this.busy = true;
    this.clearHint();
    swapCells(this.grid, r1, c1, r2, c2); this.move(a, r2, c2); this.move(b, r1, c1);
    sfx('swap');
    this.emit();
    await wait(200);

    if (a.sp === 'bomb' || b.sp === 'bomb') {
      this.moves--;
      const bomb = a.sp === 'bomb' ? a : b, other = bomb === a ? b : a;
      let keys;
      if (other.sp === 'bomb') { keys = []; for (let i = 0; i < N * N; i++) keys.push(i); this.say('Forno a 900 gradi! 🔥'); other.sp = null; }
      else keys = ofType(this.grid, other.t);
      bomb.sp = null; keys.push(keyOf(bomb.r, bomb.c));
      haptic('heavy'); sfx('fire');
      await this.clearSet(new Set(keys), new Map(), 2);
      await this.resolve(null);
    } else {
      if (!findMatches(this.grid).length) {
        swapCells(this.grid, r1, c1, r2, c2); this.move(a, r1, c1); this.move(b, r2, c2);
        haptic('error'); sfx('bad');
        await wait(200);
        this.shake(a); this.shake(b);
        await wait(240);
        this.busy = false; this.emit();
        this.armHint();
        return;
      }
      this.moves--;
      await this.resolve([a, b]);
    }
    if (!this.done() && this.moves > 0 && !findMove(this.grid)) await this.shuffle();
    this.busy = false;
    this.checkEnd();
    if (!this.over) { this.persist(); this.armHint(); }
  }

  async resolve(swapped) {
    let combo = 0;
    while (true) {
      const groups = findMatches(this.grid);
      if (!groups.length) break;
      combo++;
      const clear = new Set();
      for (const g of groups) for (const [r, c] of g.cells) clear.add(keyOf(r, c));
      const sw = swapped;
      const create = planSpecials(groups, (r, c) => !!sw && sw.includes(this.grid[r][c]));
      await this.clearSet(clear, create, combo);
      swapped = null;
    }
    if (combo >= 3) { this.say(PRAISE[Math.floor(Math.random() * PRAISE.length)]); haptic('heavy'); }
    return combo;
  }

  // Applica clearStep() delle regole e ci mette sopra animazioni, suoni e punti.
  async clearSet(clear, create, combo) {
    const wanted = (t) => !!this.lvl.need[t] && (this.got[t] || 0) < this.lvl.need[t];
    const { beams, fired, created, removed, damaged } = clearStep(this.grid, clear, create, wanted);
    for (const b of beams) this.fx({ kind: 'beam', ...b });
    for (const t of created) this.bounce(t);
    for (const t of damaged) this.bounce(t);
    if (created.length) { haptic('heavy'); sfx('special'); }
    else if (fired) sfx('fire');

    let pine = 0, sr = 0, scc = 0;
    const flown = {};
    for (const { x: t, r, c } of removed) {
      if (wanted(t.t) && (flown[t.t] || 0) < 2) {
        flown[t.t] = (flown[t.t] || 0) + 1;
        this.fx({ kind: 'fly', t: t.t, r, c });
      }
      this.collect(t.t);
      if (t.t === 6) pine++;
      sr += r; scc += c;
      this.pop(t);
    }
    const n = removed.length;
    const pts = n * 10 * combo;
    this.score += pts;
    if (n) { this.fx({ kind: 'float', text: '+' + pts, r: sr / n, c: scc / n }); haptic('light'); if (!created.length && !fired) sfx('pop' + Math.min(combo, 4)); }
    if (pine && this.lvl.nonno) sfx('nonno');
    if (pine && this.lvl.nonno) this.say(NONNO[this.nonnoCount++ % NONNO.length], '👴', true);
    this.emit();
    await wait(180);
    removed.forEach(({ x }) => this.tiles.delete(x.id));
    await this.gravity();
    await wait(280);
  }

  async gravity() {
    const { moved, holes } = collapse(this.grid);
    for (const m of moved) this.move(m.x, m.r, m.c);
    const fresh = holes.map((h) => (this.grid[h.r][h.c] = this.makeTile({ t: this.pick() }, h.r, h.c, h.from)));
    this.emit();
    await nextFrame();
    for (const t of fresh) this.move(t, t.r, t.c);
  }

  async shuffle() {
    this.say('Rimescolo gli ingredienti…');
    reshuffle(this.grid, () => this.pick());
    this.emit();
    await wait(300);
  }

  // ---------- stato ----------
  collect(t) {
    if (t >= DOUGH) return;
    this.got[t] = (this.got[t] || 0) + 1;
    if (this.lvl.need[t] && this.got[t] === this.lvl.need[t]) this.say(`${T[t].n}: perfetto così!`);
  }

  done() { for (const k in this.lvl.need) if ((this.got[k] || 0) < this.lvl.need[k]) return false; return true; }

  stars() { return starsFor(this.moves, this.startMoves); }

  async checkEnd() {
    if (this.over) return;
    if (this.done()) {
      this.over = true;
      const bonus = this.moves * 50;
      this.score += bonus;
      const stars = this.stars();
      const { progress, record } = recordWin(this.progress, this.lvlIdx, stars, this.score);
      this.progress = progress;
      this.persist();
      haptic('success'); sfx('win');
      this.emit();
      await wait(400);
      this.modal = { type: 'win', bonus, stars, record };
      this.emit();
    } else if (this.moves <= 0) {
      this.over = true;
      this.persist();
      haptic('error'); sfx('lose');
      await wait(400);
      this.modal = { type: 'lose' };
      this.emit();
    }
  }

  say(text, face, hot) {
    clearTimeout(this.talkTimer);
    this.talk = { text, face, hot };
    this.talkTimer = setTimeout(() => { this.talk = null; this.emit(); }, 2400);
    this.emit();
  }

  fx(e) {
    const id = ++this.uid;
    this.effects = [...this.effects, { ...e, id }];
    setTimeout(() => { this.effects = this.effects.filter((x) => x.id !== id); this.emit(); }, 900);
  }

  shareText() {
    return `🍕 Pizzaiolo Crush — ${this.lvl.pizza} servita in ${this.startMoves - this.moves} mosse ${'⭐'.repeat(this.stars())} (${this.score} pt)`;
  }
}
