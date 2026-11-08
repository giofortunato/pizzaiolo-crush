import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { T } from './data';

// La pizza si compone con gli ingredienti raccolti. "final" aggiunge le bruciature del forno.
export default function Pizza({ size, lvl, got, spots, seed = 1, final = false }) {
  const cx = size / 2, R = size * 0.47;
  const tn = lvl.need[0];
  const sauce = tn ? Math.min(1, (got[0] || 0) / tn) : 1;

  const cheese = [], toppings = [];
  for (const k in spots) {
    const n = Math.min(got[k] || 0, lvl.need[k]);
    for (let i = 0; i < n; i++) {
      const [x, y, rot] = spots[k][i];
      const px = cx + x * R, py = cx + y * R;
      if (k == 1) cheese.push(<Ellipse key={'m' + i} cx={px} cy={py} rx={size * 0.055} ry={size * 0.045} fill="#fffaf0" rotation={(rot * 180) / Math.PI} origin={`${px}, ${py}`} />);
      else toppings.push({ key: k + '-' + i, e: T[k].e, px, py, rot });
    }
  }

  const burns = [];
  if (final) {
    let s = seed + 5;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2, d = R * (0.87 + 0.1 * rnd());
      burns.push(<Circle key={'b' + i} cx={cx + Math.cos(a) * d} cy={cx + Math.sin(a) * d} r={size * (0.018 + 0.012 * (i % 3))} fill="#3a1d0b" opacity={0.55} />);
    }
  }

  const fs = size * 0.11;
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
          style={[styles.top, { fontSize: fs, width: fs * 1.6, left: t.px - fs * 0.8, top: t.py - fs * 0.7, transform: [{ rotate: `${t.rot * 17}deg` }] }]}
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
