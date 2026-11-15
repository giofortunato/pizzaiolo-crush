import { memo, useEffect, useMemo, useState } from 'react';
import { View, Text, Animated, PanResponder, StyleSheet } from 'react-native';
import { N, T, BOMB, DOUGH } from './data';
import { C, F } from './theme';

export const PAD = 6;

const Tile = memo(function Tile({ tile, t, sp, hp, lock, cell, selected }) {
  const g = cell * 0.05, size = cell - 2 * g;
  // La Pala si riconosce dal tipo: quando viene usata perde `sp` ma resta a schermo finché sparisce.
  const pala = sp === 'bomb' || t >= BOMB;
  const dough = t === DOUGH;
  const tx = useMemo(() => Animated.add(Animated.multiply(tile.cv, cell), PAD + g), [tile, cell, g]);
  const ty = useMemo(() => Animated.add(Animated.multiply(tile.rv, cell), PAD + g), [tile, cell, g]);
  const rotate = useMemo(() => tile.rot.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] }), [tile]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.24, opacity: tile.op, transform: [{ translateX: tx }, { translateY: ty }, { scale: tile.sc }, { rotate }] },
        selected && styles.sel,
        pala && styles.bomb,
        dough && styles.dough,
        dough && hp < 2 && styles.doughHalf,
      ]}
    >
      <Text style={[styles.emoji, { fontSize: size * 0.58 }]}>{pala ? '🍕' : dough ? '🫓' : T[t] ? T[t].e : ''}</Text>
      {lock && <View style={[styles.flour, { borderRadius: size * 0.2 }]} />}
      {sp === 'row' && <View style={[styles.stripe, { left: '10%', right: '10%', bottom: '7%', height: '12%' }]} />}
      {sp === 'col' && <View style={[styles.stripe, { top: '10%', bottom: '10%', right: '7%', width: '12%' }]} />}
    </Animated.View>
  );
});

function Effect({ e, cell }) {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: e.kind === 'beam' ? 380 : 850, useNativeDriver: true }).start(); }, [v, e.kind]);
  if (e.kind === 'fly') return null; // disegnato da App, sopra tutto lo schermo
  if (e.kind === 'beam') {
    const pos = e.h
      ? { left: PAD, right: PAD, top: PAD + e.i * cell + cell * 0.3, height: cell * 0.4 }
      : { top: PAD, bottom: PAD, left: PAD + e.i * cell + cell * 0.3, width: cell * 0.4 };
    return <Animated.View pointerEvents="none" style={[styles.beam, pos, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} />;
  }
  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.float,
        { left: PAD + e.c * cell, top: PAD + e.r * cell, width: cell * 1.6 },
        { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }] },
      ]}
    >
      {e.text}
    </Animated.Text>
  );
}

const BORDER = 6, EDGE_TOP = 2, EDGE_BOTTOM = 5;

// Per chi disegna sopra la scacchiera: dove inizia la griglia dentro al tagliere e quanto è grande una cella.
export const INSET_X = BORDER + PAD, INSET_Y = BORDER + EDGE_TOP + PAD;
export const cellFor = (width) => (width - 2 * BORDER - 2 * PAD) / N;

// Gesti sulla scacchiera: tocco su una cella, oppure trascinamento verso una vicina.
function makePan(cell, game) {
  let drag = null;
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      const c = Math.floor((x - PAD) / cell), r = Math.floor((y - PAD) / cell);
      drag = r >= 0 && r < N && c >= 0 && c < N ? { r, c, moved: false } : null;
    },
    onPanResponderMove: (_, gs) => {
      const d = drag;
      if (!d || d.moved) return;
      if (Math.max(Math.abs(gs.dx), Math.abs(gs.dy)) < cell * 0.35) return;
      d.moved = true;
      if (Math.abs(gs.dx) > Math.abs(gs.dy)) game.swipe(d, 0, Math.sign(gs.dx));
      else game.swipe(d, Math.sign(gs.dy), 0);
    },
    onPanResponderRelease: () => {
      const d = drag;
      drag = null;
      if (d && !d.moved) game.tap(d);
    },
    onPanResponderTerminate: () => { drag = null; },
  });
}

export default function Board({ game, width }) {
  const inner = width - 2 * BORDER;
  const cell = (inner - 2 * PAD) / N;
  const pan = useMemo(() => makePan(cell, game), [cell, game]);

  const sel = game.sel && game.grid[game.sel.r] && game.grid[game.sel.r][game.sel.c];
  return (
    <View style={[styles.frame, { width, height: width + EDGE_TOP + EDGE_BOTTOM }]}>
    <View style={[styles.inner, { width: inner, height: inner }]} {...pan.panHandlers}>
      {[...game.tiles.values()].map((t) => (
        <Tile key={t.id} tile={t} t={t.t} sp={t.sp} hp={t.hp} lock={t.lock} cell={cell} selected={sel === t} />
      ))}
      {game.effects.map((e) => <Effect key={e.id} e={e} cell={cell} />)}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Tagliere di legno: bordo chiaro illuminato da sopra, interno scuro e infarinato.
  frame: { backgroundColor: C.woodLight, borderRadius: 22, padding: BORDER, alignSelf: 'center', borderTopWidth: EDGE_TOP, borderTopColor: C.woodEdge, borderBottomWidth: EDGE_BOTTOM, borderBottomColor: '#4e2f1a', shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  inner: { backgroundColor: '#2a1810', borderRadius: 14, overflow: 'hidden' },
  // Tessere: quadretti di pasta, con lo spigolo in alto più chiaro e quello in basso in ombra.
  tile: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream, borderTopWidth: 2, borderTopColor: '#fffbf2', borderBottomWidth: 4, borderBottomColor: '#d9c29b' },
  sel: { backgroundColor: C.saffron, borderColor: '#fff', borderWidth: 3, borderBottomWidth: 3, borderTopWidth: 3 },
  bomb: { backgroundColor: C.saffron, borderColor: C.tomato, borderWidth: 3, borderTopColor: C.tomato, borderBottomColor: C.tomatoDark },
  // Impasto crudo: panetto pallido; dopo il primo colpo è mezzo cotto (più scuro, bordo tratteggiato).
  dough: { backgroundColor: '#e8d2a6', borderTopColor: '#f5e6c4', borderBottomColor: '#b89a66' },
  doughHalf: { backgroundColor: '#c99a5b', borderWidth: 2, borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#7a4a22', borderStyle: 'dashed' },
  // Farina sopra un ingrediente: velo bianco con bordo, l'ingrediente si intravede sotto.
  flour: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,.62)', borderWidth: 2, borderColor: '#fff', borderStyle: 'dashed' },
  emoji: { includeFontPadding: false, textAlign: 'center', userSelect: 'none' },
  stripe: { position: 'absolute', backgroundColor: C.tomato, borderRadius: 3, borderWidth: 2, borderColor: C.saffron, borderStyle: 'dashed' },
  beam: { position: 'absolute', backgroundColor: '#ffb347', borderRadius: 8, shadowColor: '#ff7a3d', shadowOpacity: 1, shadowRadius: 10 },
  float: { position: 'absolute', userSelect: 'none', color: C.saffron, fontFamily: F.display, fontSize: 22, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
});
