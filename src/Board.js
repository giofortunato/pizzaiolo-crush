import { memo, useEffect, useMemo, useRef } from 'react';
import { View, Text, Animated, PanResponder, StyleSheet } from 'react-native';
import { N, T, BOMB } from './data';

export const PAD = 6;

const Tile = memo(function Tile({ tile, t, sp, cell, selected }) {
  const g = cell * 0.05, size = cell - 2 * g;
  // La Pala si riconosce dal tipo: quando viene usata perde `sp` ma resta a schermo finché sparisce.
  const pala = sp === 'bomb' || t >= BOMB;
  const tx = useMemo(() => Animated.add(Animated.multiply(tile.cv, cell), PAD + g), [tile, cell]);
  const ty = useMemo(() => Animated.add(Animated.multiply(tile.rv, cell), PAD + g), [tile, cell]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.24, opacity: tile.op, transform: [{ translateX: tx }, { translateY: ty }, { scale: tile.sc }] },
        selected && styles.sel,
        pala && styles.bomb,
      ]}
    >
      <Text style={[styles.emoji, { fontSize: size * 0.58 }]}>{pala ? '🍕' : T[t] ? T[t].e : ''}</Text>
      {sp === 'row' && <View style={[styles.stripe, { left: '10%', right: '10%', bottom: '7%', height: '12%' }]} />}
      {sp === 'col' && <View style={[styles.stripe, { top: '10%', bottom: '10%', right: '7%', width: '12%' }]} />}
    </Animated.View>
  );
});

function Effect({ e, cell }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: e.kind === 'beam' ? 380 : 850, useNativeDriver: true }).start(); }, []);
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

const BORDER = 4;

export default function Board({ game, width }) {
  const inner = width - 2 * BORDER;
  const cell = (inner - 2 * PAD) / N;
  const cellRef = useRef(cell); cellRef.current = cell;
  const gameRef = useRef(game); gameRef.current = game;
  const drag = useRef(null);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        const cl = cellRef.current;
        const c = Math.floor((x - PAD) / cl), r = Math.floor((y - PAD) / cl);
        drag.current = r >= 0 && r < N && c >= 0 && c < N ? { r, c, moved: false } : null;
      },
      onPanResponderMove: (_, gs) => {
        const d = drag.current;
        if (!d || d.moved) return;
        if (Math.max(Math.abs(gs.dx), Math.abs(gs.dy)) < cellRef.current * 0.35) return;
        d.moved = true;
        if (Math.abs(gs.dx) > Math.abs(gs.dy)) gameRef.current.swipe(d, 0, Math.sign(gs.dx));
        else gameRef.current.swipe(d, Math.sign(gs.dy), 0);
      },
      onPanResponderRelease: () => {
        const d = drag.current;
        drag.current = null;
        if (d && !d.moved) gameRef.current.tap(d);
      },
      onPanResponderTerminate: () => { drag.current = null; },
    })
  ).current;

  const sel = game.sel && game.grid[game.sel.r] && game.grid[game.sel.r][game.sel.c];
  return (
    <View style={[styles.frame, { width, height: width }]}>
    <View style={{ width: inner, height: inner }} {...pan.panHandlers}>
      {[...game.tiles.values()].map((t) => (
        <Tile key={t.id} tile={t} t={t.t} sp={t.sp} cell={cell} selected={sel === t} />
      ))}
      {game.effects.map((e) => <Effect key={e.id} e={e} cell={cell} />)}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: '#2e1b10', borderRadius: 18, borderWidth: BORDER, borderColor: '#7a4f30', overflow: 'hidden', alignSelf: 'center' },
  tile: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff4e0', borderBottomWidth: 3, borderBottomColor: '#e2cfae' },
  sel: { backgroundColor: '#ffd27a', borderColor: '#fff', borderWidth: 2 },
  bomb: { backgroundColor: '#f4b942', borderColor: '#d6402b', borderWidth: 3 },
  emoji: { includeFontPadding: false, textAlign: 'center', userSelect: 'none' },
  stripe: { position: 'absolute', backgroundColor: '#d6402b', borderRadius: 3, borderWidth: 2, borderColor: '#f4b942', borderStyle: 'dashed' },
  beam: { position: 'absolute', backgroundColor: '#ffb347', borderRadius: 8, shadowColor: '#ff7a3d', shadowOpacity: 1, shadowRadius: 10 },
  float: { position: 'absolute', userSelect: 'none', color: '#fff', fontWeight: '800', fontSize: 20, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
});
