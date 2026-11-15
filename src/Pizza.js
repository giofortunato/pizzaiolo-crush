import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { T } from './data';

// Macchia di mozzarella irregolare: una curva chiusa che passa vicino a un cerchio
// con raggio che varia un po'. "shape" la rende diversa per ogni pezzo, ma sempre uguale tra un render e l'altro.
function blobPath(cx, cy, r, rotDeg, shape) {
  let s = shape + 1;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const n = 8, rot = (rotDeg * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2, rr = r * (0.8 + rnd() * 0.35);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  // curve morbide: ogni punto è un controllo, si passa per i punti medi
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = `M${mid(pts[n - 1], pts[0]).join(',')}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i], m = mid(p, pts[(i + 1) % n]);
    d += ` Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)}`;
  }
  return d + ' Z';
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// La pizza si compone con gli ingredienti raccolti. "final" aggiunge le bruciature del forno.
export default function Pizza({ size, lvl, got, spots, seed = 1, final = false }) {
  const cx = size / 2, R = size * 0.47;
  const tn = lvl.need[0];
  const sauce = tn ? Math.min(1, (got[0] || 0) / tn) : 1;

  // Più pezzi ci sono, più sono piccoli, così non si sovrappongono.
  let nTop = 0;
  for (const k in spots) if (+k !== 1) nTop += spots[k].length;
  const fs = size * clamp(0.36 / Math.sqrt(Math.max(1, nTop)), 0.07, 0.12);
  const nCheese = (spots[1] || []).length;
  const cheeseR = size * clamp(0.25 / Math.sqrt(Math.max(1, nCheese)), 0.04, 0.065);

  const cheese = [], toppings = [];
  for (const k in spots) {
    const n = Math.min(got[k] || 0, lvl.need[k]);
    for (let i = 0; i < n; i++) {
      const [x, y, rot, shape] = spots[k][i];
      const px = cx + x * R, py = cx + y * R;
      if (+k === 1) {
        cheese.push(<Path key={'ms' + i} d={blobPath(px + size * 0.006, py + size * 0.01, cheeseR, rot, shape)} fill="#7a1d0e" opacity={0.25} />);
        cheese.push(<Path key={'m' + i} d={blobPath(px, py, cheeseR, rot, shape)} fill="#fff3d6" />);
        cheese.push(<Circle key={'mh' + i} cx={px - cheeseR * 0.25} cy={py - cheeseR * 0.25} r={cheeseR * 0.35} fill="#fffdf6" opacity={0.8} />);
      } else toppings.push({ key: k + '-' + i, e: T[k].e, px, py, rot });
    }
  }

  const burns = [];
  if (final) {
    let s = seed + 5;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 18; i++) {
      const a = rnd() * Math.PI * 2, d = R * (0.88 + 0.06 * rnd());
      burns.push(<Circle key={'b' + i} cx={cx + Math.cos(a) * d} cy={cx + Math.sin(a) * d} r={size * (0.007 + 0.006 * rnd())} fill="#5a2d10" opacity={0.45} />);
    }
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cx} r={R} fill="#d99a52" />
        <Circle cx={cx} cy={cx} r={R * 0.93} fill="#e9b56e" />
        <Circle cx={cx} cy={cx} r={R * 0.84} fill="#f3d6a0" />
        {sauce > 0 && <Circle cx={cx} cy={cx} r={R * 0.82 * (0.55 + 0.45 * sauce)} fill="#c7351f" opacity={0.35 + 0.65 * sauce} />}
        {cheese}
        {burns}
      </Svg>
      {toppings.map((t) => (
        <Text
          key={t.key}
          style={[styles.top, { fontSize: fs, lineHeight: fs * 1.25, width: fs * 1.6, left: t.px - fs * 0.8, top: t.py - fs * 0.62, transform: [{ rotate: `${t.rot}deg` }] }]}
        >
          {t.e}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', textAlign: 'center', includeFontPadding: false },
});
