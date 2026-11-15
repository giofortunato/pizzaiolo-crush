import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LEVELS, levelFor } from './data';
import { totalStars, totalScore, dayKey, dailyLevel, dailyDone, dailyStreak, DAILY_COINS } from './progress';
import { C, F } from './theme';
import { CREDITS } from './music';

const RUSH_UNLOCK = 3; // l'ora di punta si apre dopo tre ordini serviti

// Interruttore tondo delle impostazioni (suoni, musica, vibrazione).
function Toggle({ on, emoji, off, label, onPress }) {
  return (
    <Pressable
      onPress={onPress} hitSlop={6} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={[styles.toggle, !on && styles.toggleOff]}
    >
      <Text style={styles.toggleT}>{on ? emoji : off}</Text>
    </Pressable>
  );
}

// La mappa: impostazioni, pizza del giorno, ora di punta e gli ordini.
// Quelli serviti mostrano le stelle (si possono rifare per migliorarle), il prossimo è in evidenza, gli altri chiusi.
export default function LevelMap({ game, onPick, settings, cols = 3 }) {
  const nodeW = cols === 3 ? '31.5%' : `${(100 - (cols - 1) * 1.6) / cols}%`;
  const p = game.progress;
  const [confirm, setConfirm] = useState(false);
  // Si vedono tutti gli ordini del giro in cui sei; finito un giro compare il successivo, più difficile.
  const count = LEVELS.length * (Math.floor(p.unlocked / LEVELS.length) + 1);
  const resumable = game.inProgress('level') ? game.lvlIdx : -1;
  const today = dayKey();
  const daily = dailyLevel(today).lvl, dailyOk = dailyDone(p, today), streak = dailyStreak(p, today);
  const rushOpen = p.unlocked >= RUSH_UNLOCK;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.h1}>Pizzaiolo Crush</Text>
        <View style={styles.totals}>
          <Text style={styles.total}>⭐ {totalStars(p)}<Text style={styles.totalOf}> / {count * 3}</Text></Text>
          <Text style={styles.total}>{totalScore(p)}<Text style={styles.totalOf}> punti</Text></Text>
        </View>
      </View>

      <View style={styles.bar}>
        <View style={styles.coins} accessible accessibilityLabel={`${p.coins} gettoni`}>
          <Text style={styles.coinsT}>🪙 {p.coins}</Text>
          <Text style={styles.coinsL}>gettoni</Text>
        </View>
        <View style={styles.toggles}>
          <Toggle on={!settings.muted} emoji="🔊" off="🔇" label="Effetti sonori" onPress={settings.toggleMute} />
          <Toggle on={settings.music} emoji="🎵" off="🎵" label="Musica" onPress={settings.toggleMusic} />
          <Toggle on={settings.haptics} emoji="📳" off="📴" label="Vibrazione" onPress={settings.toggleHaptics} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => onPick('daily')} accessibilityRole="button"
          accessibilityLabel={`Pizza del giorno: ${daily.pizza}. ${dailyOk ? 'Già servita oggi' : 'Da servire'}. Serie di ${streak} giorni`}
          style={({ pressed }) => [styles.special, dailyOk && styles.specialDone, pressed && styles.nodePressed]}
        >
          <Text style={styles.specialE}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.specialT}>Pizza del giorno: {daily.pizza}</Text>
            <Text style={styles.specialS}>
              {dailyOk ? 'Servita ✓ Torna domani.' : game.inProgress('daily') ? 'In corso: tocca per riprendere.' : `Uguale per tutti, vale ${DAILY_COINS} 🪙.`}
              {streak > 0 ? ` Serie: ${streak} ${streak === 1 ? 'giorno' : 'giorni'}.` : ''}
            </Text>
          </View>
        </Pressable>
        <Pressable
          disabled={!rushOpen} onPress={() => onPick('rush')} accessibilityRole="button" accessibilityState={{ disabled: !rushOpen }}
          accessibilityLabel={rushOpen ? `Ora di punta. Record ${p.rush} punti` : `Ora di punta, chiusa: servi ${RUSH_UNLOCK} ordini per aprirla`}
          style={({ pressed }) => [styles.special, !rushOpen && styles.nodeLocked, pressed && styles.nodePressed]}
        >
          <Text style={styles.specialE}>{rushOpen ? '⏱️' : '🔒'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.specialT}>Ora di punta</Text>
            <Text style={styles.specialS}>{rushOpen ? `60 secondi, più punti che puoi. Record: ${p.rush}.` : `Servi ${RUSH_UNLOCK} ordini per aprirla.`}</Text>
          </View>
        </Pressable>
        {Array.from({ length: count }, (_, i) => {
          const lvl = levelFor(i);
          const open = i <= p.unlocked, next = i === p.unlocked, stars = p.stars[i] || 0;
          const label = `Ordine ${i + 1}, ${lvl.pizza}` + (open ? (stars ? `, ${stars} stelle su 3` : ', da servire') : ', chiuso');
          return (
            <Pressable
              key={i} disabled={!open} onPress={() => onPick('level', i)}
              accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !open }}
              style={({ pressed }) => [styles.node, { width: nodeW }, next && styles.nodeNext, !open && styles.nodeLocked, pressed && styles.nodePressed]}
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
          <Text style={styles.stats}>
            Pizze servite: {p.stats.served} · Partite: {p.stats.games} · Combo più lunga: ×{p.stats.combo}
          </Text>
          <Text style={styles.credits}>{CREDITS}</Text>
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

  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  coins: { flexDirection: 'row', alignItems: 'baseline', gap: 5, backgroundColor: 'rgba(0,0,0,.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  coinsT: { color: C.saffron, fontFamily: F.display, fontSize: 17 },
  coinsL: { color: C.cream, fontFamily: F.body, fontSize: 12, opacity: 0.8 },
  toggles: { flexDirection: 'row', gap: 8 },
  toggle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,.3)', alignItems: 'center', justifyContent: 'center' },
  toggleOff: { opacity: 0.4 },
  toggleT: { fontSize: 17 },

  // Pizza del giorno e ora di punta: comande larghe in cima alla lista.
  special: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.cream, borderRadius: 16, paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 4, borderBottomColor: C.creamDark },
  specialDone: { backgroundColor: '#dff0d8', borderBottomColor: '#b5d6a7' },
  specialE: { fontSize: 28, includeFontPadding: false },
  specialT: { color: C.wood, fontFamily: F.display, fontSize: 16 },
  specialS: { color: C.wood, fontFamily: F.body, fontSize: 12.5, opacity: 0.8, lineHeight: 16 },
  credits: { color: C.cream, fontFamily: F.body, fontSize: 11, opacity: 0.45, textAlign: 'center' },
  stats: { color: C.cream, fontFamily: F.body, fontSize: 12.5, opacity: 0.7, textAlign: 'center', marginBottom: 4 },

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
