import { useEffect, useReducer, useRef, useState } from 'react';
import { View, Text, Pressable, Share, StyleSheet, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Game } from './src/engine';
import { T } from './src/data';
import Board from './src/Board';
import Pizza from './src/Pizza';
import { loadProgress, saveProgress } from './src/save';
import { initSound, setMuted } from './src/sound';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <GameScreen />
    </SafeAreaProvider>
  );
}

function GameScreen() {
  const [, rerender] = useReducer((x) => x + 1, 0);
  const gameRef = useRef(null);
  if (!gameRef.current) gameRef.current = new Game(() => rerender(), saveProgress);
  const game = gameRef.current;
  const [ready, setReady] = useState(false);
  const [muted, setMutedState] = useState(false);

  // All'avvio riprende dall'ultimo ordine salvato.
  useEffect(() => {
    let alive = true;
    initSound().then((m) => { if (alive) setMutedState(m); });
    loadProgress().then((saved) => {
      if (!alive) return;
      if (saved) game.restore(saved);
      setReady(true);
    });
    return () => { alive = false; };
  }, [game]);
  const { width, height } = useWindowDimensions();
  const boardW = Math.max(240, Math.min(width - 24, 440, height - 330));
  const lvl = game.lvl;
  const talk = game.talk;

  if (!ready) return <View style={styles.root} />;

  return (
    <SafeAreaView style={styles.root}>
      <View style={[styles.app, { width: Math.min(width, 464) }]}>
        <View style={styles.header}>
          <Text style={styles.h1}>🍕 Pizzaiolo <Text style={{ color: '#f4b942' }}>Crush</Text></Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Pressable
              onPress={() => { setMuted(!muted); setMutedState(!muted); }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={muted ? 'Attiva i suoni' : 'Disattiva i suoni'}
            >
              <Text style={styles.pill}>{muted ? '🔇' : '🔊'}</Text>
            </Pressable>
            <Text style={styles.pill}>Ordine {game.lvlIdx + 1}</Text>
            <Text style={styles.pill}>{game.score} pt</Text>
          </View>
        </View>

        <View style={styles.order}>
          <Text style={styles.face}>{(talk && talk.face) || lvl.face}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderTitle} numberOfLines={1}>{lvl.pizza} per {lvl.who}</Text>
            <Text style={[styles.orderSay, talk && talk.hot && styles.hot]} numberOfLines={2}>{talk ? talk.text : lvl.hi}</Text>
          </View>
          <View style={styles.moves}>
            <Text style={styles.movesN}>{game.moves}</Text>
            <Text style={styles.movesL}>MOSSE</Text>
          </View>
        </View>

        <Board game={game} width={boardW} />

        <View style={styles.bottom}>
          <Pizza size={110} lvl={lvl} got={game.got} spots={game.spots} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.goals}>
              {Object.keys(lvl.need).map((k) => {
                const left = Math.max(0, lvl.need[k] - (game.got[k] || 0));
                return (
                  <Text key={k} style={[styles.goal, !left && styles.goalDone]}>
                    {T[k].e} {left || '✓'}
                  </Text>
                );
              })}
            </View>
            <Text style={styles.tip}>Trascina un ingrediente su uno vicino, o toccane due di fila.</Text>
          </View>
        </View>
      </View>

      {game.modal && <GameModal key={game.modal.type + game.lvlIdx} game={game} />}
    </SafeAreaView>
  );
}

function GameModal({ game }) {
  const { lvl, modal } = game;
  const [shared, setShared] = useState(false);
  let body;

  if (modal.type === 'start') {
    body = (
      <>
        <Text style={styles.big}>{lvl.face}</Text>
        <Text style={styles.h2}>{lvl.who} ordina una {lvl.pizza}</Text>
        <Text style={styles.p}>“{lvl.hi}”</Text>
        <View style={styles.list}>
          {Object.keys(lvl.need).map((k) => <Text key={k} style={styles.chip}>{T[k].e} {lvl.need[k]}</Text>)}
        </View>
        <Text style={styles.p}>Hai <Text style={{ fontWeight: '800' }}>{lvl.moves} mosse</Text>.</Text>
        {game.lvlIdx === 0 && (
          <View style={styles.help}>
            <Text style={styles.helpT}>👉 Allinea 3 ingredienti uguali per metterli sulla pizza.</Text>
            <Text style={styles.helpT}>🔥 <Text style={{ fontWeight: '800' }}>4 in fila</Text> → Forno: brucia una riga o colonna.</Text>
            <Text style={styles.helpT}>🍕 <Text style={{ fontWeight: '800' }}>5 in fila o a L/T</Text> → Pala: scambiala con un ingrediente per prenderli tutti.</Text>
          </View>
        )}
        <View style={styles.btns}><Btn label="Inforna!" onPress={() => game.begin()} /></View>
        {game.lvlIdx > 0 && (
          <Pressable onPress={() => game.restore({ lvlIdx: 0, score: 0 })} style={styles.reset} hitSlop={8}>
            <Text style={styles.resetT}>Ricomincia da capo</Text>
          </Pressable>
        )}
      </>
    );
  } else if (modal.type === 'win') {
    body = (
      <>
        <Text style={styles.h2}>{lvl.pizza} servita! {lvl.face}</Text>
        <View style={{ alignSelf: 'center', marginVertical: 6 }}>
          <Pizza size={190} lvl={lvl} got={game.got} spots={game.spots} seed={game.lvlIdx} final />
        </View>
        <Text style={styles.stars}>{'⭐'.repeat(modal.stars)}{'☆'.repeat(3 - modal.stars)}</Text>
        <Text style={styles.p}>“{lvl.win}”</Text>
        <Text style={[styles.p, { opacity: 0.7 }]}>Mosse avanzate: {game.moves} (+{modal.bonus} pt) · Totale {game.score} pt</Text>
        <View style={styles.btns}>
          <Btn alt label={shared ? 'Condiviso ✓' : 'Condividi'} onPress={async () => {
            try { await Share.share({ message: game.shareText() }); setShared(true); } catch (e) {}
          }} />
          <Btn label="Prossimo ordine" onPress={() => game.next()} />
        </View>
      </>
    );
  } else {
    body = (
      <>
        <Text style={styles.big}>😤</Text>
        <Text style={styles.h2}>{lvl.who} se n'è andato</Text>
        <Text style={styles.p}>“{lvl.lose}”</Text>
        <View style={styles.list}>
          {Object.keys(lvl.need).filter((k) => (game.got[k] || 0) < lvl.need[k]).map((k) => (
            <Text key={k} style={styles.chip}>{T[k].e} mancano {lvl.need[k] - (game.got[k] || 0)}</Text>
          ))}
        </View>
        <View style={styles.btns}><Btn label="Riprova" onPress={() => game.retry()} /></View>
      </>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>{body}</View>
    </View>
  );
}

function Btn({ label, onPress, alt }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, alt && styles.btnAlt, pressed && { transform: [{ translateY: 3 }] }]}>
      <Text style={[styles.btnT, alt && { color: '#3b2417' }]}>{label}</Text>
    </Pressable>
  );
}

const cream = '#fff4e0', wood = '#3b2417';
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2a190f', alignItems: 'center' },
  app: { flex: 1, paddingHorizontal: 12, paddingTop: 8, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { color: cream, fontSize: 21, fontWeight: '800' },
  pill: { color: cream, backgroundColor: 'rgba(0,0,0,.35)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontWeight: '700', fontSize: 13, overflow: 'hidden' },
  order: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: cream, borderRadius: 16, padding: 10, borderBottomWidth: 4, borderBottomColor: '#c9a77c', minHeight: 70 },
  face: { fontSize: 36 },
  orderTitle: { color: wood, fontWeight: '800', fontSize: 15 },
  orderSay: { color: wood, opacity: 0.8, fontSize: 13 },
  hot: { color: '#d6402b', opacity: 1, fontWeight: '700' },
  moves: { backgroundColor: '#d6402b', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', minWidth: 58 },
  movesN: { color: '#fff', fontSize: 24, fontWeight: '800' },
  movesL: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  goal: { color: cream, backgroundColor: 'rgba(0,0,0,.35)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, fontWeight: '700', fontSize: 16, overflow: 'hidden' },
  goalDone: { backgroundColor: '#2f8f4e' },
  tip: { color: cream, opacity: 0.65, fontSize: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,10,5,.75)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { backgroundColor: cream, borderRadius: 22, padding: 20, width: '100%', maxWidth: 360, borderBottomWidth: 6, borderBottomColor: '#c9a77c' },
  big: { fontSize: 54, textAlign: 'center' },
  h2: { color: wood, fontSize: 22, fontWeight: '800', textAlign: 'center', marginVertical: 4 },
  p: { color: wood, fontSize: 15, textAlign: 'center', marginVertical: 4 },
  list: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginVertical: 8 },
  chip: { color: wood, backgroundColor: '#f1dfc0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, fontWeight: '700', overflow: 'hidden' },
  help: { backgroundColor: '#f6e7cc', borderRadius: 12, padding: 10, marginTop: 8, gap: 4 },
  helpT: { color: wood, fontSize: 13.5 },
  stars: { fontSize: 30, textAlign: 'center', letterSpacing: 4 },
  btns: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  btn: { backgroundColor: '#d6402b', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: 4, borderBottomColor: '#8f2416' },
  btnAlt: { backgroundColor: '#e9d3ae', borderBottomColor: '#b9996b' },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 16 },
  reset: { alignSelf: 'center', marginTop: 12, padding: 4 },
  resetT: { color: wood, opacity: 0.6, fontSize: 13, textDecorationLine: 'underline' },
});
