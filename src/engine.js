import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { N, BOMB, T, NONNO, PRAISE, levelFor } from './data';
import { sfx } from './sound';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const haptic = (kind = 'light') => {
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else Haptics.impactAsync(kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

/**
 * Tutta la logica del gioco vive qui, fuori da React.
 * Lo schermo si iscrive con onChange() e ridisegna quando serve.
 */
export class Game {
  constructor(onChange, onCheckpoint) {
    this.onChange = () => {};
    this.onCheckpoint = () => {};
    this.uid = 0;
    this.lvlIdx = 0;
    this.score = 0;
    this.effects = [];
    this.talk = null;
    this.startLevel();
    this.onChange = onChange; // collegato solo dopo il primo livello, per non ridisegnare durante il render
    this.onCheckpoint = onCheckpoint || (() => {}); // idem: il livello 0 iniziale non deve sovrascrivere un salvataggio
  }

  emit() { this.onChange(); }

  // Riprende da un salvataggio (o riparte da zero con restore({ lvlIdx: 0, score: 0 })).
  restore({ lvlIdx, score }) {
    this.lvlIdx = lvlIdx;
    this.score = score;
    this.startLevel();
  }

  // ---------- livello ----------
  startLevel() {
    this.lvl = levelFor(this.lvlIdx);
    this.onCheckpoint({ lvlIdx: this.lvlIdx, score: this.score });
    this.moves = this.startMoves = this.lvl.moves;
    this.got = {};
    this.nonnoCount = 0;
    this.over = true;
    this.busy = false;
    this.sel = null;
    this.talk = null;
    this.tiles = new Map();
    this.grid = [];
    for (let r = 0; r < N; r++) {
      this.grid.push([]);
      for (let c = 0; c < N; c++) {
        let t;
        do { t = this.pick(); } while (
          (c >= 2 && this.grid[r][c - 1].t === t && this.grid[r][c - 2].t === t) ||
          (r >= 2 && this.grid[r - 1][c].t === t && this.grid[r - 2][c].t === t)
        );
        this.grid[r].push(this.makeTile(t, r, c));
      }
    }
    if (!this.hasMoves()) return this.startLevel();
    this.genSpots();
    this.modal = { type: 'start' };
    this.emit();
  }

  begin() { this.modal = null; this.over = false; this.emit(); }
  next() { this.lvlIdx++; this.startLevel(); }
  retry() { this.startLevel(); }

  pick() { const ts = this.lvl.types; return ts[Math.floor(Math.random() * ts.length)]; }

  genSpots() {
    let seed = this.lvlIdx * 97 + 13;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    this.spots = {};
    for (const k in this.lvl.need) {
      if (k == 0) continue;
      this.spots[k] = [];
      for (let i = 0; i < this.lvl.need[k]; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.72;
        this.spots[k].push([Math.cos(a) * d, Math.sin(a) * d, rnd() * Math.PI * 2]);
      }
    }
  }

  // ---------- tessere ----------
  makeTile(t, r, c, fromRow = r) {
    const tile = {
      id: ++this.uid, t, sp: null, r, c,
      rv: new Animated.Value(fromRow), cv: new Animated.Value(c),
      sc: new Animated.Value(1), op: new Animated.Value(1),
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

  // ---------- regole ----------
  tAt(r, c) { const x = this.grid[r] && this.grid[r][c]; return x && x.t < BOMB ? x.t : -1; }

  findMatches() {
    const g = [];
    for (let r = 0; r < N; r++) {
      let c = 0;
      while (c < N) {
        const t = this.tAt(r, c); let e = c + 1;
        while (e < N && this.tAt(r, e) === t) e++;
        if (t >= 0 && e - c >= 3) { const cells = []; for (let x = c; x < e; x++) cells.push([r, x]); g.push({ h: true, t, cells }); }
        c = e;
      }
    }
    for (let c = 0; c < N; c++) {
      let r = 0;
      while (r < N) {
        const t = this.tAt(r, c); let e = r + 1;
        while (e < N && this.tAt(e, c) === t) e++;
        if (t >= 0 && e - r >= 3) { const cells = []; for (let y = r; y < e; y++) cells.push([y, c]); g.push({ h: false, t, cells }); }
        r = e;
      }
    }
    return g;
  }

  swapG(r1, c1, r2, c2) { const a = this.grid[r1][c1]; this.grid[r1][c1] = this.grid[r2][c2]; this.grid[r2][c2] = a; }

  hasMoves() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (this.grid[r][c].sp === 'bomb') return true;
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 >= N || c2 >= N) continue;
        this.swapG(r, c, r2, c2);
        const ok = this.findMatches().length > 0;
        this.swapG(r, c, r2, c2);
        if (ok) return true;
      }
    }
    return false;
  }

  commonType() {
    const cnt = {};
    for (const row of this.grid) for (const t of row) if (t && t.t < BOMB) cnt[t.t] = (cnt[t.t] || 0) + 1;
    let best = -1, bc = -1;
    for (const k in cnt) {
      const w = cnt[k] + (this.lvl.need[k] && (this.got[k] || 0) < this.lvl.need[k] ? 100 : 0);
      if (w > bc) { bc = w; best = +k; }
    }
    return best;
  }

  ofType(t) {
    const out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (this.grid[r][c] && this.grid[r][c].t === t) out.push(r * N + c);
    return out;
  }

  // ---------- input ----------
  tap(p) {
    if (this.busy || this.over) return;
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
    this.busy = true;
    const a = this.grid[r1][c1], b = this.grid[r2][c2];
    this.swapG(r1, c1, r2, c2); this.move(a, r2, c2); this.move(b, r1, c1);
    sfx('swap');
    this.emit();
    await wait(200);

    if (a.sp === 'bomb' || b.sp === 'bomb') {
      this.moves--;
      const bomb = a.sp === 'bomb' ? a : b, other = bomb === a ? b : a;
      let keys;
      if (other.sp === 'bomb') { keys = []; for (let i = 0; i < N * N; i++) keys.push(i); this.say('Forno a 900 gradi! 🔥'); other.sp = null; }
      else keys = this.ofType(other.t);
      bomb.sp = null; keys.push(bomb.r * N + bomb.c);
      haptic('heavy'); sfx('fire');
      await this.clearSet(new Set(keys), new Map(), 2);
      await this.resolve(null);
    } else {
      if (!this.findMatches().length) {
        this.swapG(r1, c1, r2, c2); this.move(a, r1, c1); this.move(b, r2, c2);
        haptic('error'); sfx('bad');
        await wait(220);
        this.busy = false; this.emit();
        return;
      }
      this.moves--;
      await this.resolve([a, b]);
    }
    if (!this.done() && this.moves > 0 && !this.hasMoves()) await this.shuffle();
    this.busy = false;
    this.checkEnd();
  }

  async resolve(swapped) {
    let combo = 0;
    while (true) {
      const groups = this.findMatches();
      if (!groups.length) break;
      combo++;
      const clear = new Set(), create = new Map(), inH = new Set(), inV = new Set();
      for (const g of groups) for (const [r, c] of g.cells) { const k = r * N + c; clear.add(k); (g.h ? inH : inV).add(k); }
      for (const k of clear) if (inH.has(k) && inV.has(k)) create.set(k, 'bomb');
      for (const g of groups) {
        if (g.cells.length < 4 || g.cells.some(([r, c]) => create.has(r * N + c))) continue;
        const pos = (swapped && g.cells.find(([r, c]) => swapped.includes(this.grid[r][c]))) || g.cells[g.cells.length >> 1];
        create.set(pos[0] * N + pos[1], g.cells.length >= 5 ? 'bomb' : g.h ? 'row' : 'col');
      }
      await this.clearSet(clear, create, combo);
      swapped = null;
    }
    if (combo >= 3) { this.say(PRAISE[Math.floor(Math.random() * PRAISE.length)]); haptic('heavy'); }
    return combo;
  }

  async clearSet(clear, create, combo) {
    // effetti a catena delle tessere speciali
    const queue = [...clear], done = new Set();
    let fired = false;
    while (queue.length) {
      const k = queue.pop();
      if (done.has(k)) continue;
      done.add(k);
      const r = Math.floor(k / N), c = k % N, tile = this.grid[r][c];
      if (!tile || !tile.sp || create.has(k)) continue;
      fired = true;
      let extra = [];
      if (tile.sp === 'row') { for (let x = 0; x < N; x++) extra.push(r * N + x); this.fx({ kind: 'beam', h: true, i: r }); }
      else if (tile.sp === 'col') { for (let y = 0; y < N; y++) extra.push(y * N + c); this.fx({ kind: 'beam', h: false, i: c }); }
      else if (tile.sp === 'bomb') extra = this.ofType(this.commonType());
      for (const e of extra) if (!clear.has(e)) { clear.add(e); queue.push(e); }
    }
    // nuove tessere speciali
    for (const [k, sp] of create) {
      const t = this.grid[Math.floor(k / N)][k % N];
      if (!t) continue;
      t.sp = sp;
      if (sp === 'bomb') t.t = BOMB;
    }
    if (create.size) { haptic('heavy'); sfx('special'); }
    else if (fired) sfx('fire');
    // rimozione
    let n = 0, pine = 0, sr = 0, scc = 0;
    const popped = [];
    for (const k of clear) {
      if (create.has(k)) continue;
      const r = Math.floor(k / N), c = k % N, t = this.grid[r][c];
      if (!t) continue;
      this.collect(t.t);
      if (t.t === 6) pine++;
      n++; sr += r; scc += c;
      this.pop(t); popped.push(t); this.grid[r][c] = null;
    }
    const pts = n * 10 * combo;
    this.score += pts;
    if (n) { this.fx({ kind: 'float', text: '+' + pts, r: sr / n, c: scc / n }); haptic('light'); if (!create.size && !fired) sfx('pop' + Math.min(combo, 4)); }
    if (pine && this.lvl.nonno) sfx('nonno');
    if (pine && this.lvl.nonno) this.say(NONNO[this.nonnoCount++ % NONNO.length], '👴', true);
    this.emit();
    await wait(180);
    popped.forEach((t) => this.tiles.delete(t.id));
    await this.gravity();
    await wait(280);
  }

  async gravity() {
    const fresh = [];
    for (let c = 0; c < N; c++) {
      let w = N - 1;
      for (let r = N - 1; r >= 0; r--) {
        const t = this.grid[r][c];
        if (t) { if (w !== r) { this.grid[w][c] = t; this.grid[r][c] = null; this.move(t, w, c); } w--; }
      }
      const k = w + 1;
      for (let r = w; r >= 0; r--) {
        const t = this.makeTile(this.pick(), r, c, r - k);
        this.grid[r][c] = t;
        fresh.push(t);
      }
    }
    this.emit();
    await nextFrame();
    for (const t of fresh) this.move(t, t.r, t.c);
  }

  async shuffle() {
    this.say('Rimescolo gli ingredienti…');
    for (let i = 0; i < 100; i++) {
      for (const row of this.grid) for (const t of row) if (!t.sp) t.t = this.pick();
      if (!this.findMatches().length && this.hasMoves()) break;
    }
    this.emit();
    await wait(300);
  }

  // ---------- stato ----------
  collect(t) {
    if (t >= BOMB) return;
    this.got[t] = (this.got[t] || 0) + 1;
    if (this.lvl.need[t] && this.got[t] === this.lvl.need[t]) this.say(`${T[t].n}: perfetto così!`);
  }

  done() { for (const k in this.lvl.need) if ((this.got[k] || 0) < this.lvl.need[k]) return false; return true; }

  stars() { const r = this.moves / this.startMoves; return r >= 0.35 ? 3 : r >= 0.12 ? 2 : 1; }

  async checkEnd() {
    if (this.over) return;
    if (this.done()) {
      this.over = true;
      const bonus = this.moves * 50;
      this.score += bonus;
      haptic('success'); sfx('win');
      this.emit();
      await wait(400);
      this.modal = { type: 'win', bonus, stars: this.stars() };
      this.emit();
    } else if (this.moves <= 0) {
      this.over = true;
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
