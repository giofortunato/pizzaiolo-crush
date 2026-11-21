import { useEffect, useReducer, useRef, useState } from 'react';
import { View, Text, Pressable, Share, StyleSheet, Animated, Easing, AccessibilityInfo, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';
import { Nunito_600SemiBold, Nunito_600SemiBold_Italic, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { Game } from './src/engine';
import { T, TOOLS, LOGS, RUSH_SECONDS } from './src/data';
import { C, F } from './src/theme';
import Board, { INSET_X, INSET_Y, cellFor } from './src/Board';
import Pizza from './src/Pizza';
import LevelMap from './src/Map';
import Title, { Loading } from './src/Title';
import { loadProgress, saveProgress } from './src/save';
import { initSound, setMuted, setMusic, playMusic } from './src/sound';
import { initHaptics, setHaptics } from './src/haptic';
import { motion } from './src/motion';
import { useLayout } from './src/layout';
import { dailyStreak } from './src/progress';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Root />
    </SafeAreaProvider>
  );
}

// Luce calda del forno dietro la scacchiera.
function OvenGlow({ width, height }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="42%" rx="60%" ry="45%">
          <Stop offset="0" stopColor={C.ovenGlow} stopOpacity="1" />
          <Stop offset="1" stopColor={C.oven} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#glow)" />
    </Svg>
  );
}

// Misura un elemento rispetto alla finestra; serve per far volare gli ingredienti fino alla pizza.
function useBox() {
  const ref = useRef(null);
  const [box, setBox] = useState(null);
  const onLayout = () => {
    const node = ref.current;
    if (node && node.measureInWindow) node.measureInWindow((x, y, w, h) => setBox({ x, y, w, h }));
  };
  return [ref, box, onLayout];
}

// Un ingrediente che vola dalla scacchiera alla pizza, con un piccolo arco.
function Fly({ e, from, to, onLand }) {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 620, delay: 140, easing: Easing.in(Easing.quad), useNativeDriver: true })
      .start(({ finished }) => finished && onLand());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- parte una volta sola, quando l'ingrediente compare
  }, []);
  const lift = 70, arc = [0, 0.71, 1, 0.71, 0];
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [from.x, to.x] });
  const translateY = v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: arc.map((a, i) => from.y + (to.y - from.y) * (i / 4) - lift * a) });
  const scale = v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 1.35, 0.45] });
  return (
    <Animated.Text style={[styles.fly, { transform: [{ translateX }, { translateY }, { scale }] }]}>{T[e.t].e}</Animated.Text>
  );
}

function FlyLayer({ effects, layer, board, pizza, onLand }) {
  const flies = effects.filter((e) => e.kind === 'fly');
  if (!flies.length || !layer || !board || !pizza) return null;
  const half = styles.fly.width / 2;
  const to = { x: pizza.x - layer.x + pizza.w / 2 - half, y: pizza.y - layer.y + pizza.h / 2 - half };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flies.map((e) => (
        <Fly
          key={e.id} e={e} to={to} onLand={onLand}
          from={{ x: board.x - layer.x + INSET_X + (e.c + 0.5) * board.cell - half, y: board.y - layer.y + INSET_Y + (e.r + 0.5) * board.cell - half }}
        />
      ))}
    </View>
  );
}

// Piccolo balzo ogni volta che `value` cambia; `big` lo rende più vistoso.
function useBump(value, big, enabled = true) {
  const sc = useState(() => new Animated.Value(1))[0];
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!enabled || motion.reduce) return;
    sc.setValue(big ? 1.35 : 1.18);
    Animated.spring(sc, { toValue: 1, speed: 18, bounciness: 12, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deve scattare solo quando cambia `value`
  }, [value]);
  return sc;
}

// Contamosse (o secondi, nell'ora di punta): salta a ogni cambio, pulsa quando ne restano pochi.
function Moves({ moves, low, label = 'mosse' }) {
  const bump = useBump(moves);
  const pulse = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    if (!low || motion.reduce) { pulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [low, pulse]);
  return (
    <Animated.View
      accessible accessibilityLabel={`${moves} ${label} rimaste`}
      style={[styles.moves, low && styles.movesLow, { transform: [{ scale: Animated.multiply(bump, pulse) }] }]}
    >
      <Text style={styles.movesN}>{moves}</Text>
      <Text style={styles.movesL}>{label}</Text>
    </Animated.View>
  );
}

function Goal({ emoji, name, left }) {
  const sc = useBump(left, left === 0);
  return (
    <Animated.View
      accessible accessibilityLabel={left ? `${name}: ne mancano ${left}` : `${name}: fatto`}
      style={[styles.goal, !left && styles.goalDone, { transform: [{ scale: sc }] }]}
    >
      <Text style={styles.goalE}>{emoji}</Text>
      <Text style={styles.goalN}>{left || '✓'}</Text>
    </Animated.View>
  );
}

// Il cliente fa un saltello quando parla.
function Face({ face, talking }) {
  const sc = useBump(talking, true, !!talking);
  return (
    <Animated.View style={[styles.faceWrap, { transform: [{ scale: sc }] }]}>
      <Text style={styles.face}>{face}</Text>
    </Animated.View>
  );
}

// Compare con un balzo, dopo `delay` ms. Per stelle, pizza e finestre.
function Pop({ delay = 0, style, children }) {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.spring(v, { toValue: 1, delay, speed: 14, bounciness: 12, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animazione d'ingresso, una volta sola
  }, []);
  return <Animated.View style={[style, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>{children}</Animated.View>;
}

// Carica salvataggio e caratteri, poi mostra la schermata iniziale, la mappa degli ordini o la partita.
function Root() {
  const [, rerender] = useReducer((x) => x + 1, 0);
  const [game] = useState(() => new Game(() => rerender(), saveProgress));
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState('title');
  const [muted, setMutedState] = useState(false);
  const [music, setMusicState] = useState(true);
  const [haptics, setHapticsState] = useState(true);
  const [fontsLoaded, fontError] = useFonts({ LilitaOne_400Regular, Nunito_600SemiBold, Nunito_600SemiBold_Italic, Nunito_800ExtraBold });
  const layout = useLayout();
  const { width, height } = layout;

  // All'avvio si carica il salvataggio; un ordine lasciato a metà si riprende dalla schermata iniziale.
  useEffect(() => {
    let alive = true;
    initSound().then((snd) => { if (alive) { setMutedState(snd.muted); setMusicState(snd.music); } });
    initHaptics().then((on) => { if (alive) setHapticsState(on); });
    // Rispetta "Riduci movimento" delle impostazioni di accessibilità.
    AccessibilityInfo.isReduceMotionEnabled().then((on) => { motion.reduce = !!on; }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => { motion.reduce = !!on; });
    loadProgress().then((saved) => {
      if (!alive) return;
      game.load(saved);
      setReady(true);
    });
    return () => { alive = false; if (sub && sub.remove) sub.remove(); };
  }, [game]);

  // Musica del menu su schermata iniziale e mappa; in partita la sceglie l'ordine (al momento di infornare).
  useEffect(() => {
    if (ready && screen !== 'game') playMusic('menu');
  }, [ready, screen]);

  // Se i font non arrivano (es. senza rete sul web) si parte lo stesso con quelli di sistema.
  if (!ready || (!fontsLoaded && !fontError)) return <View style={styles.root}><Loading /></View>;

  const settings = {
    muted, music, haptics,
    toggleMute: () => { setMuted(!muted); setMutedState(!muted); },
    toggleMusic: () => { setMusic(!music); setMusicState(!music); },
    toggleHaptics: () => { setHaptics(!haptics); setHapticsState(!haptics); },
  };

  // Dalla mappa: un ordine, la pizza del giorno o l'ora di punta.
  // Se stavi già giocando proprio quello lo riprendi, altrimenti parte da capo.
  const pick = (mode, i) => {
    if (mode === 'rush') game.startRush();
    else if (mode === 'daily') { if (!game.inProgress('daily')) game.startDaily(); }
    else if (!(game.inProgress('level') && game.lvlIdx === i)) game.startLevel(i);
    setScreen('game');
  };
  const toMap = () => { game.leave(); setScreen('map'); };
  const playing = screen === 'game' && game.lvl;

  return (
    <SafeAreaView style={styles.root}>
      <OvenGlow width={width} height={height} />
      {screen === 'title' ? (
        <View style={{ flex: 1, width: layout.colW }}>
          <Title
            layout={layout} game={game}
            onPlay={() => setScreen(game.inProgress('level') || game.inProgress('daily') ? 'game' : 'map')}
            onMap={() => setScreen('map')}
          />
        </View>
      ) : playing ? (
        <GameScreen game={game} onMap={toMap} muted={muted} onMute={settings.toggleMute} />
      ) : (
        <View style={{ flex: 1, width: layout.colW }}><LevelMap game={game} onPick={pick} settings={settings} cols={layout.mapCols} /></View>
      )}
    </SafeAreaView>
  );
}

function GameScreen({ game, onMap, muted, onMute }) {
  const [layerRef, layerBox, onLayerLayout] = useBox();
  const [boardRef, boardBox, onBoardLayout] = useBox();
  const [pizzaRef, pizzaBox, onPizzaLayout] = useBox();
  const pizzaScale = useState(() => new Animated.Value(1))[0];
  const onLand = () => {
    pizzaScale.setValue(1.14);
    Animated.spring(pizzaScale, { toValue: 1, speed: 20, bounciness: 10, useNativeDriver: true }).start();
  };

  const layout = useLayout();
  const { boardW } = layout;
  const lvl = game.lvl;
  const talk = game.talk;
  const rush = game.mode === 'rush';
  const coins = game.progress.coins;

  // Se esci dall'app o cambi scheda del browser, il gioco va in pausa da solo.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st !== 'active') game.pause(); });
    return () => sub.remove();
  }, [game]);

  return (
    <>
      <View ref={layerRef} onLayout={onLayerLayout} style={[styles.app, { width: layout.colW }]}>
        <View style={styles.header}>
          <Text style={[styles.h1, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>Pizzaiolo Pazzo</Text>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => game.pause()} disabled={!game.canPause()} hitSlop={8}
              accessibilityRole="button" accessibilityLabel="Pausa"
              style={[styles.iconBtn, !game.canPause() && { opacity: 0.4 }]}
            >
              <Text style={styles.iconBtnT}>⏸️</Text>
            </Pressable>
            <Pressable onPress={onMap} hitSlop={8} accessibilityRole="button" accessibilityLabel="Mappa degli ordini" style={styles.iconBtn}>
              <Text style={styles.iconBtnT}>🗺️</Text>
            </Pressable>
            <Pressable
              onPress={onMute}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={muted ? 'Attiva i suoni' : 'Disattiva i suoni'}
              style={styles.iconBtn}
            >
              <Text style={styles.iconBtnT}>{muted ? '🔇' : '🔊'}</Text>
            </Pressable>
            <View style={styles.score}>
              <Text style={styles.scoreN}>{game.score}</Text>
              <Text style={styles.scoreL}>punti</Text>
            </View>
          </View>
        </View>

        <View style={styles.order}>
          <Face face={(talk && talk.face) || lvl.face} talking={talk ? talk.text : ''} />
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNo}>{rush ? 'Ora di punta' : game.mode === 'daily' ? 'Pizza del giorno' : `Ordine ${game.lvlIdx + 1}`}</Text>
            <Text style={styles.orderTitle} numberOfLines={1}>{rush ? 'Sala piena!' : `${lvl.pizza} per ${lvl.who}`}</Text>
            <Text style={[styles.orderSay, talk && talk.hot && styles.hot]} numberOfLines={2}>{talk ? talk.text : lvl.hi}</Text>
          </View>
          {rush
            ? <Moves moves={game.timeLeft} label="secondi" low={game.timeLeft <= 10 && !game.over} />
            : <Moves moves={game.moves} low={game.moves <= 3 && !game.over} />}
        </View>

        <View ref={boardRef} onLayout={onBoardLayout} style={{ alignSelf: 'center' }}>
          <Board game={game} width={boardW} />
        </View>

        {rush ? (
          <View style={styles.rushBox}>
            <Text style={styles.rushT}>Record: <Text style={styles.rushN}>{game.progress.rush}</Text> punti</Text>
            <Text style={styles.tip}>Niente ordine e niente mosse contate: fai più file che puoi prima che scada il tempo.</Text>
          </View>
        ) : (
          <View style={styles.bottom}>
            <Animated.View ref={pizzaRef} onLayout={onPizzaLayout} style={{ transform: [{ scale: pizzaScale }] }}>
              <Pizza size={layout.pizza} lvl={lvl} got={game.got} spots={game.spots} />
            </Animated.View>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={styles.goals}>
                {Object.keys(lvl.need).map((k) => (
                  <Goal key={k} emoji={T[k].e} name={T[k].n} left={Math.max(0, lvl.need[k] - (game.got[k] || 0))} />
                ))}
              </View>
              {/* Attrezzi: si pagano in gettoni e non consumano mosse. */}
              <View style={styles.tools}>
                <View style={styles.coins} accessible accessibilityLabel={`${coins} gettoni`}>
                  <Text style={styles.coinsT}>🪙 {coins}</Text>
                </View>
                {Object.keys(TOOLS).map((k) => {
                  const tool = TOOLS[k], on = game.tool === k, poor = coins < tool.cost;
                  return (
                    <Pressable
                      key={k} onPress={() => game.selectTool(k)} hitSlop={4}
                      accessibilityRole="button" accessibilityState={{ selected: on, disabled: poor }}
                      accessibilityLabel={`${tool.n}, costa ${tool.cost} gettoni. ${tool.tip}`}
                      style={[styles.tool, on && styles.toolOn, poor && styles.toolPoor]}
                    >
                      <Text style={styles.toolE}>{tool.e}</Text>
                      <Text style={[styles.toolN, on && { color: C.wood }]}>{tool.cost}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.tip}>
                {game.tool ? TOOLS[game.tool].tip : 'Trascina un ingrediente su uno vicino, oppure toccane due.'}
              </Text>
            </View>
          </View>
        )}

        <FlyLayer
          effects={game.effects} layer={layerBox} pizza={pizzaBox} onLand={onLand}
          board={boardBox && { ...boardBox, cell: cellFor(boardW) }}
        />
      </View>

      {game.modal && <GameModal key={game.modal.type + game.lvlIdx} game={game} onMap={onMap} />}
    </>
  );
}

function GameModal({ game, onMap }) {
  const layout = useLayout();
  const { lvl, modal } = game;
  const [shared, setShared] = useState(false);
  const [sure, setSure] = useState(false);
  let body;
  const toMap = (
    <Pressable onPress={onMap} style={styles.reset} hitSlop={8} accessibilityRole="button">
      <Text style={styles.resetT}>Torna alla mappa</Text>
    </Pressable>
  );

  const daily = game.mode === 'daily';
  if (modal.type === 'start' && game.mode === 'rush') {
    body = (
      <>
        <Text style={styles.big}>{lvl.face}</Text>
        <Text style={styles.h2}>Ora di punta</Text>
        <Text style={styles.quote}>“{lvl.hi}”</Text>
        <Text style={styles.p}>Hai <Text style={styles.strong}>{RUSH_SECONDS} secondi</Text>. Record: <Text style={styles.strong}>{game.progress.rush}</Text> punti.</Text>
        <View style={styles.btns}><Btn label="Via!" onPress={() => game.begin()} /></View>
        {toMap}
      </>
    );
  } else if (modal.type === 'rush') {
    body = (
      <>
        <Text style={styles.big}>⏱️</Text>
        <Text style={styles.h2}>Tempo scaduto!</Text>
        <Text style={styles.p}><Text style={styles.strong}>{game.score} punti</Text>{modal.record ? '. Nuovo record!' : `. Record: ${game.progress.rush}.`}</Text>
        <View style={styles.btns}>
          <Btn alt label={shared ? 'Condiviso ✓' : 'Condividi'} onPress={async () => {
            try { await Share.share({ message: game.shareText() }); setShared(true); } catch {}
          }} />
          <Btn label="Ancora!" onPress={() => game.retry()} />
        </View>
        {toMap}
      </>
    );
  } else if (modal.type === 'start') {
    body = (
      <>
        <Text style={styles.big}>{lvl.face}</Text>
        <Text style={styles.h2}>{daily ? `Pizza del giorno: ${lvl.pizza}` : `${lvl.who} ordina una ${lvl.pizza}`}</Text>
        <Text style={styles.quote}>“{lvl.hi}”</Text>
        <View style={styles.list}>
          {Object.keys(lvl.need).map((k) => (
            <View key={k} style={styles.chip}><Text style={styles.chipE}>{T[k].e}</Text><Text style={styles.chipN}>{lvl.need[k]}</Text></View>
          ))}
        </View>
        <Text style={styles.p}>Hai <Text style={styles.strong}>{lvl.moves} mosse</Text>.</Text>
        {daily && <Text style={styles.small}>Oggi è uguale per tutti. Servila per tenere viva la serie: {dailyStreak(game.progress, game.day)} giorni.</Text>}
        {game.mode === 'level' && game.lvlIdx === 0 && (
          <View style={styles.help}>
            <Text style={styles.helpT}>👉 Allinea 3 ingredienti uguali per metterli sulla pizza.</Text>
            <Text style={styles.helpT}>🔥 <Text style={styles.strong}>4 in fila</Text> accende il Forno: brucia una riga o colonna.</Text>
            <Text style={styles.helpT}>🍕 <Text style={styles.strong}>5 in fila o a L/T</Text> crea la Pala: scambiala con un ingrediente per prenderli tutti.</Text>
          </View>
        )}
        {game.mode === 'level' && game.lvlIdx === 1 && (
          <View style={styles.help}>
            <Text style={styles.helpT}>🪙 Ogni stella nuova vale un <Text style={styles.strong}>gettone</Text>. Sotto la scacchiera li spendi in attrezzi: 🔪 toglie un ingrediente, 🍴 una riga intera.</Text>
            <Text style={styles.helpT}>💥 Scambia tra loro <Text style={styles.strong}>due speciali</Text> (Forni o Pale) per un effetto doppio.</Text>
          </View>
        )}
        {(lvl.flour || lvl.dough) ? (
          <View style={styles.help}>
            {lvl.flour ? <Text style={styles.helpT}>🌫️ <Text style={styles.strong}>Infarinati</Text> ({lvl.flour}): non si spostano. Mettili in fila con gli altri per liberarli.</Text> : null}
            {lvl.dough ? <Text style={styles.helpT}>🫓 <Text style={styles.strong}>Impasto crudo</Text> ({lvl.dough}): non si sposta. Fai due file lì accanto per cuocerlo.</Text> : null}
          </View>
        ) : null}
        <View style={styles.btns}><Btn label="Inforna!" onPress={() => game.begin()} /></View>
        {toMap}
      </>
    );
  } else if (modal.type === 'pause') {
    body = (
      <>
        <Text style={styles.big}>⏸️</Text>
        <Text style={styles.h2}>Pausa</Text>
        <Text style={styles.p}>
          {game.mode === 'rush'
            ? <>Restano <Text style={styles.strong}>{game.timeLeft} secondi</Text>, {game.score} punti.</>
            : <>{lvl.who} aspetta la sua {lvl.pizza}: ti restano <Text style={styles.strong}>{game.moves} mosse</Text>.</>}
        </Text>
        <View style={styles.btns}><Btn label="Continua" onPress={() => game.unpause()} /></View>
        <Pressable
          onPress={() => { if (sure) game.retry(); else setSure(true); }}
          style={styles.reset} hitSlop={8} accessibilityRole="button"
        >
          <Text style={[styles.resetT, sure && styles.resetHot]}>{sure ? 'Sicuro? Tocca ancora per ricominciare' : 'Ricomincia da capo'}</Text>
        </Pressable>
        {toMap}
      </>
    );
  } else if (modal.type === 'resume') {
    body = (
      <>
        <Text style={styles.big}>{lvl.face}</Text>
        <Text style={styles.h2}>Bentornato!</Text>
        <Text style={styles.p}>{lvl.who} aspetta ancora la sua {lvl.pizza}.</Text>
        <View style={styles.list}>
          {Object.keys(lvl.need).map((k) => {
            const left = Math.max(0, lvl.need[k] - (game.got[k] || 0));
            return <View key={k} style={styles.chip}><Text style={styles.chipE}>{T[k].e}</Text><Text style={styles.chipN}>{left || '✓'}</Text></View>;
          })}
        </View>
        <Text style={styles.p}>Ti restano <Text style={styles.strong}>{game.moves} mosse</Text>.</Text>
        <View style={styles.btns}><Btn label="Continua" onPress={() => game.begin()} /></View>
        {toMap}
      </>
    );
  } else if (modal.type === 'win') {
    body = (
      <>
        <Text style={styles.h2}>{lvl.pizza} servita! {lvl.face}</Text>
        <Pop delay={150} style={{ alignSelf: 'center', marginVertical: 6 }}>
          <Pizza size={layout.pizzaFinal} lvl={lvl} got={game.got} spots={game.spots} seed={game.lvlIdx} final />
        </Pop>
        <View style={styles.starsRow}>
          {[0, 1, 2].map((i) => (
            <Pop key={i} delay={500 + i * 220}><Text style={styles.stars}>{i < modal.stars ? '⭐' : '☆'}</Text></Pop>
          ))}
        </View>
        <Text style={styles.quote}>“{lvl.win}”</Text>
        <Text style={styles.small}>Mosse avanzate: {game.moves} (+{modal.bonus} punti). Totale {game.score} punti.{modal.record ? ' Nuovo record!' : ''}</Text>
        {(modal.gained > 0 || modal.streak > 0) && (
          <Text style={styles.reward}>
            {modal.gained > 0 ? `+${modal.gained} 🪙` : ''}{modal.gained > 0 && modal.streak > 0 ? '   ' : ''}{modal.streak > 0 ? `📅 Serie: ${modal.streak} ${modal.streak === 1 ? 'giorno' : 'giorni'}` : ''}
          </Text>
        )}
        <View style={styles.btns}>
          <Btn alt label={shared ? 'Condiviso ✓' : 'Condividi'} onPress={async () => {
            try { await Share.share({ message: game.shareText() }); setShared(true); } catch {}
          }} />
          {daily ? <Btn label="Alla mappa" onPress={onMap} /> : <Btn label="Prossimo ordine" onPress={() => game.next()} />}
        </View>
        {!daily && toMap}
      </>
    );
  } else {
    body = (
      <>
        <Text style={styles.big}>😤</Text>
        <Text style={styles.h2}>{lvl.who} se n’è andato</Text>
        <Text style={styles.quote}>“{lvl.lose}”</Text>
        <View style={styles.list}>
          {Object.keys(lvl.need).filter((k) => (game.got[k] || 0) < lvl.need[k]).map((k) => (
            <View key={k} style={styles.chip}><Text style={styles.chipE}>{T[k].e}</Text><Text style={styles.chipN}>mancano {lvl.need[k] - (game.got[k] || 0)}</Text></View>
          ))}
        </View>
        <View style={styles.btns}>
          {game.canAddLogs() && <Btn alt label={`${LOGS.e} +${LOGS.moves} mosse (${LOGS.cost} 🪙)`} onPress={() => game.addLogs()} />}
          <Btn label="Riprova" onPress={() => game.retry()} />
        </View>
        {game.canAddLogs() && <Text style={styles.small}>Hai {game.progress.coins} 🪙. Con un po’ di legna il forno regge ancora {LOGS.moves} mosse.</Text>}
        {toMap}
      </>
    );
  }

  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => { Animated.spring(v, { toValue: 1, speed: 16, bounciness: 7, useNativeDriver: true }).start(); }, [v]);
  return (
    <Animated.View style={[styles.overlay, { opacity: v }]}>
      <Animated.View style={[styles.card, { maxWidth: layout.cardMax, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }]}>
        {body}
      </Animated.View>
    </Animated.View>
  );
}

function Btn({ label, onPress, alt }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, alt && styles.btnAlt, pressed && styles.btnPressed]}>
      <Text style={[styles.btnT, alt && { color: C.wood }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.oven, alignItems: 'center' },
  app: { flex: 1, paddingHorizontal: 12, paddingTop: 6, gap: 10 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  h1: { color: C.cream, fontFamily: F.display, fontSize: 26, letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,.3)', alignItems: 'center', justifyContent: 'center' },
  iconBtnT: { fontSize: 16 },
  score: { flexDirection: 'row', alignItems: 'baseline', gap: 4, backgroundColor: 'rgba(0,0,0,.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  scoreN: { color: C.saffron, fontFamily: F.display, fontSize: 18 },
  scoreL: { color: C.cream, fontFamily: F.body, fontSize: 12, opacity: 0.8 },

  // La comanda: un foglietto di carta con il cliente, la richiesta e il contamosse.
  order: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.cream, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 4, borderBottomColor: C.creamDark, minHeight: 74 },
  faceWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.creamDark, alignItems: 'center', justifyContent: 'center' },
  face: { fontSize: 30, includeFontPadding: false },
  orderNo: { color: C.tomato, fontFamily: F.bodyBold, fontSize: 11, letterSpacing: 0.2 },
  orderTitle: { color: C.wood, fontFamily: F.display, fontSize: 17, marginTop: -1 },
  orderSay: { color: C.wood, fontFamily: F.bodyItalic, fontSize: 13, opacity: 0.8, lineHeight: 17 },
  hot: { color: C.tomato, opacity: 1, fontFamily: F.bodyBold },
  moves: { backgroundColor: C.tomato, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', minWidth: 60, borderBottomWidth: 3, borderBottomColor: C.tomatoDark },
  movesLow: { backgroundColor: C.saffron, borderBottomColor: C.saffronDark },
  movesN: { color: '#fff', fontFamily: F.display, fontSize: 26, lineHeight: 28, includeFontPadding: false },
  movesL: { color: '#fff', fontFamily: F.bodyBold, fontSize: 10, marginTop: -2 },

  bottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,.35)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  goalDone: { backgroundColor: C.basil },
  goalE: { fontSize: 16, includeFontPadding: false },
  goalN: { color: C.cream, fontFamily: F.display, fontSize: 16, includeFontPadding: false },
  // Attrezzi del pizzaiolo e gettoni.
  tools: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coins: { backgroundColor: 'rgba(0,0,0,.35)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  coinsT: { color: C.saffron, fontFamily: F.display, fontSize: 15, includeFontPadding: false },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.woodLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderBottomWidth: 3, borderBottomColor: '#4e2f1a' },
  toolOn: { backgroundColor: C.saffron, borderBottomColor: C.saffronDark },
  toolPoor: { opacity: 0.45 },
  toolE: { fontSize: 17, includeFontPadding: false },
  toolN: { color: C.cream, fontFamily: F.display, fontSize: 14, includeFontPadding: false },
  rushBox: { gap: 6, paddingHorizontal: 4 },
  rushT: { color: C.cream, fontFamily: F.body, fontSize: 16 },
  rushN: { color: C.saffron, fontFamily: F.display, fontSize: 20 },
  reward: { color: C.basilDark, fontFamily: F.display, fontSize: 17, textAlign: 'center', marginTop: 6 },
  tip: { color: C.cream, fontFamily: F.body, opacity: 0.6, fontSize: 12, lineHeight: 16 },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,10,5,.8)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { backgroundColor: C.cream, borderRadius: 24, padding: 22, width: '100%', maxWidth: 360, borderBottomWidth: 6, borderBottomColor: C.creamDark },
  big: { fontSize: 54, textAlign: 'center', includeFontPadding: false },
  h2: { color: C.wood, fontFamily: F.display, fontSize: 24, textAlign: 'center', marginVertical: 4, lineHeight: 28 },
  p: { color: C.wood, fontFamily: F.body, fontSize: 15, textAlign: 'center', marginVertical: 4 },
  quote: { color: C.wood, fontFamily: F.bodyItalic, fontSize: 15, textAlign: 'center', marginVertical: 4, opacity: 0.85 },
  small: { color: C.wood, fontFamily: F.body, fontSize: 13, textAlign: 'center', opacity: 0.7, marginTop: 2 },
  strong: { fontFamily: F.bodyBold },
  list: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginVertical: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.creamDark, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  chipE: { fontSize: 16, includeFontPadding: false },
  chipN: { color: C.wood, fontFamily: F.display, fontSize: 15, includeFontPadding: false },
  help: { backgroundColor: '#f6e7cc', borderRadius: 14, padding: 12, marginTop: 8, gap: 6 },
  helpT: { color: C.wood, fontFamily: F.body, fontSize: 13.5, lineHeight: 18 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 2 },
  stars: { fontSize: 30, textAlign: 'center', includeFontPadding: false },
  fly: { position: 'absolute', left: 0, top: 0, width: 30, height: 30, lineHeight: 30, fontSize: 24, textAlign: 'center', includeFontPadding: false },
  btns: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  btn: { backgroundColor: C.tomato, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 11, borderBottomWidth: 4, borderBottomColor: C.tomatoDark },
  btnAlt: { backgroundColor: C.saffron, borderBottomColor: C.saffronDark },
  btnPressed: { transform: [{ translateY: 3 }], borderBottomWidth: 1 },
  btnT: { color: '#fff', fontFamily: F.display, fontSize: 18, letterSpacing: 0.3 },
  reset: { alignSelf: 'center', marginTop: 12, padding: 4 },
  resetHot: { color: C.tomato, opacity: 1, fontFamily: F.bodyBold },
  resetT: { color: C.wood, fontFamily: F.body, opacity: 0.6, fontSize: 13, textDecorationLine: 'underline' },
});
