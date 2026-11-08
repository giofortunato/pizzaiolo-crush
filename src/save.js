import AsyncStorage from '@react-native-async-storage/async-storage';

// Salvataggio dei progressi: a che ordine sei arrivato e quanti punti hai.
// Si salva all'inizio di ogni ordine, quindi riaprendo l'app riparti da lì
// (la partita in corso a metà ordine non viene salvata).
const KEY = 'pizzaiolo-crush/progress/v1';

const isCount = (n) => Number.isInteger(n) && n >= 0;

export async function loadProgress() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !isCount(data.lvlIdx) || !isCount(data.score)) return null;
    return { lvlIdx: data.lvlIdx, score: data.score };
  } catch (e) {
    return null;
  }
}

export async function saveProgress({ lvlIdx, score }) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ lvlIdx, score }));
  } catch (e) {}
}
