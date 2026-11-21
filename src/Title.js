import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Animated, Easing } from 'react-native';
import { Game } from './engine';
import { levelFor } from './data';
import Pizza from './Pizza';
import { C, F } from './theme';
import { motion } from './motion';
import { CREDITS } from './music';

// Mentre si caricano salvataggio e caratteri: niente font personalizzati, solo il forno che si accende.
export function Loading() {
  return (
    <View style={styles.loading} accessibilityLabel="Caricamento">
      <Text style={styles.loadingE}>🍕</Text>
      <ActivityIndicator color={C.saffron} />
      <Text style={styles.loadingT}>Accendo il forno…</Text>
    </View>
  );
}

// Pizza da vetrina: una Capricciosa completa, con gli ingredienti messi come in partita.
function useShowPizza() {
  return useState(() => {
    const g = new Game();
    g.lvlIdx = 4;
    g.lvl = levelFor(4);
    g.genSpots();
    return { lvl: g.lvl, spots: g.spots, got: { ...g.lvl.need } };
  })[0];
}

// Schermata iniziale: titolo, pizza che gira piano, pulsante per giocare.
export default function Title({ layout, game, onPlay, onMap }) {
  const show = useShowPizza();
  const spin = useState(() => new Animated.Value(0))[0];
  const enter = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, speed: 10, bounciness: 8, useNativeDriver: true }).start();
    if (motion.reduce) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 40000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin, enter]);

  // Un ordine lasciato a metà si riprende dal pulsante grande.
  const resume = game.inProgress('level') || game.inProgress('daily');
  const size = Math.min(layout.width * (layout.wide ? 0.5 : 0.72), layout.height * 0.4, 380);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const big = layout.wide;

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ alignItems: 'center', opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }}>
        <Text style={[styles.title, big && styles.titleBig]} accessibilityRole="header">Pizzaiolo{'\n'}Pazzo</Text>
        <Text style={[styles.tag, big && styles.tagBig]}>Allinea gli ingredienti, servi i clienti.</Text>
      </Animated.View>

      <Animated.View style={{ transform: [{ rotate }] }} accessible accessibilityLabel="Una pizza capricciosa">
        <Pizza size={size} lvl={show.lvl} got={show.got} spots={show.spots} seed={4} final />
      </Animated.View>

      <View style={styles.btns}>
        <Pressable
          onPress={onPlay} accessibilityRole="button" accessibilityLabel={resume ? `Continua: ${game.lvl.pizza}` : 'Gioca'}
          style={({ pressed }) => [styles.play, big && styles.playBig, pressed && styles.pressed]}
        >
          <Text style={[styles.playT, big && styles.playTBig]}>{resume ? 'Continua' : 'Gioca'}</Text>
          {resume && <Text style={styles.playS}>{game.lvl.pizza} per {game.lvl.who}</Text>}
        </Pressable>
        {resume && (
          <Pressable onPress={onMap} hitSlop={8} accessibilityRole="button" style={styles.link}>
            <Text style={styles.linkT}>Mappa degli ordini</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.credits}>{CREDITS}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingE: { fontSize: 64 },
  loadingT: { color: C.cream, fontSize: 16, opacity: 0.8 },

  wrap: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: C.cream, fontFamily: F.display, fontSize: 52, lineHeight: 54, textAlign: 'center', textShadowColor: C.tomatoDark, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0 },
  titleBig: { fontSize: 84, lineHeight: 86 },
  tag: { color: C.saffron, fontFamily: F.bodyBold, fontSize: 15, marginTop: 10, textAlign: 'center' },
  tagBig: { fontSize: 20 },
  btns: { alignItems: 'center', gap: 6 },
  play: { backgroundColor: C.tomato, borderRadius: 22, paddingHorizontal: 54, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 6, borderBottomColor: C.tomatoDark, minWidth: 220 },
  playBig: { paddingHorizontal: 80, paddingVertical: 18, minWidth: 320 },
  pressed: { transform: [{ translateY: 4 }], borderBottomWidth: 2 },
  playT: { color: '#fff', fontFamily: F.display, fontSize: 30, letterSpacing: 0.5 },
  playTBig: { fontSize: 40 },
  playS: { color: '#fff', fontFamily: F.body, fontSize: 13, opacity: 0.9, marginTop: -2 },
  link: { padding: 6 },
  linkT: { color: C.cream, fontFamily: F.body, fontSize: 14, opacity: 0.75, textDecorationLine: 'underline' },
  credits: { color: C.cream, fontFamily: F.body, fontSize: 10.5, opacity: 0.4, textAlign: 'center' },
});
