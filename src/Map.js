import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LEVELS, levelFor } from './data';
import { totalStars, totalScore } from './progress';
import { C, F } from './theme';

// La mappa degli ordini: quelli serviti con le loro stelle (si possono rifare per migliorarle),
// il prossimo da servire in evidenza, gli altri chiusi.
export default function LevelMap({ game, onPick }) {
  const p = game.progress;
  const [confirm, setConfirm] = useState(false);
  // Si vedono tutti gli ordini del giro in cui sei; finito un giro compare il successivo, più difficile.
  const count = LEVELS.length * (Math.floor(p.unlocked / LEVELS.length) + 1);
  const resumable = game.inProgress() ? game.lvlIdx : -1;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.h1}>Pizzaiolo Crush</Text>
        <View style={styles.totals}>
          <Text style={styles.total}>⭐ {totalStars(p)}<Text style={styles.totalOf}> / {count * 3}</Text></Text>
          <Text style={styles.total}>{totalScore(p)}<Text style={styles.totalOf}> punti</Text></Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {Array.from({ length: count }, (_, i) => {
          const lvl = levelFor(i);
          const open = i <= p.unlocked, next = i === p.unlocked, stars = p.stars[i] || 0;
          const label = `Ordine ${i + 1}, ${lvl.pizza}` + (open ? (stars ? `, ${stars} stelle su 3` : ', da servire') : ', chiuso');
          return (
            <Pressable
              key={i} disabled={!open} onPress={() => onPick(i)}
              accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !open }}
              style={({ pressed }) => [styles.node, next && styles.nodeNext, !open && styles.nodeLocked, pressed && styles.nodePressed]}
            >
              <Text style={styles.no}>{i + 1}</Text>
              <Text style={styles.face}>{open ? lvl.face : '🔒'}</Text>
              <Text style={styles.pizza} numberOfLines={2}>{lvl.pizza}</Text>
              {open && !next && <Text style={styles.stars}>{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</Text>}
              {next && <Text style={styles.play}>{resumable === i ? 'Riprendi' : 'Gioca'}</Text>}
              {open && !next && resumable === i && <Text style={styles.badge}>in corso</Text>}
              {open && (lvl.dough || lvl.flour) ? <Text style={styles.ob}>{lvl.dough ? '🫓' : ''}{lvl.flour ? '🌫️' : ''}</Text> : null}
            </Pressable>
          );
        })}
        <View style={styles.footer}>
          {p.unlocked > 0 && (
            <Pressable
              onPress={() => { if (confirm) { setConfirm(false); game.reset(); } else setConfirm(true); }}
              hitSlop={8} accessibilityRole="button" style={styles.reset}
            >
              <Text style={[styles.resetT, confirm && styles.resetHot]}>
                {confirm ? 'Sicuro? Tocca ancora per cancellare stelle e record' : 'Ricomincia da capo'}
              </Text>
            </Pressable>
          )}
          {confirm && (
            <Pressable onPress={() => setConfirm(false)} hitSlop={8} accessibilityRole="button" style={styles.reset}>
              <Text style={styles.resetT}>Annulla</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 12, paddingTop: 6, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  h1: { color: C.cream, fontFamily: F.display, fontSize: 26, letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  totals: { alignItems: 'flex-end' },
  total: { color: C.saffron, fontFamily: F.display, fontSize: 16 },
  totalOf: { color: C.cream, fontFamily: F.body, fontSize: 12, opacity: 0.8 },

  list: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, paddingBottom: 24 },
  // Ogni ordine è una comanda di carta, come quella in cima alla partita.
  node: { width: '31.5%', minHeight: 132, backgroundColor: C.cream, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: C.creamDark },
  nodeNext: { backgroundColor: C.saffron, borderBottomColor: C.saffronDark },
  nodeLocked: { opacity: 0.35 },
  nodePressed: { transform: [{ translateY: 3 }], borderBottomWidth: 1 },
  no: { position: 'absolute', left: 8, top: 6, color: C.tomato, fontFamily: F.display, fontSize: 14 },
  ob: { position: 'absolute', right: 6, top: 6, fontSize: 11 },
  face: { fontSize: 34, includeFontPadding: false, marginTop: 6 },
  pizza: { color: C.wood, fontFamily: F.display, fontSize: 13.5, lineHeight: 16, textAlign: 'center', marginTop: 2, minHeight: 32 },
  stars: { fontSize: 14, marginTop: 2, color: C.wood, includeFontPadding: false },
  play: { color: '#fff', fontFamily: F.display, fontSize: 14, backgroundColor: C.tomato, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 2, marginTop: 2, overflow: 'hidden' },
  badge: { color: C.tomato, fontFamily: F.bodyBold, fontSize: 10, marginTop: 1 },

  footer: { width: '100%', alignItems: 'center', gap: 4, marginTop: 6 },
  reset: { padding: 6 },
  resetT: { color: C.cream, fontFamily: F.body, opacity: 0.6, fontSize: 13, textDecorationLine: 'underline' },
  resetHot: { color: C.saffron, opacity: 1, fontFamily: F.bodyBold },
});
