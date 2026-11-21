import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitize } from './progress';

// Salvataggio: ordini sbloccati, stelle, record e la partita in corso (griglia compresa),
// così chiudendo l'app a metà ordine si riparte dalla stessa mossa.
// Le chiavi usano ancora il vecchio nome del gioco (Pizzaiolo Crush): cambiarle farebbe perdere i salvataggi.
const KEY = 'pizzaiolo-crush/progress/v2';
const OLD_KEY = 'pizzaiolo-crush/progress/v1'; // solo { lvlIdx, score }

export async function loadProgress() {
  try {
    const raw = (await AsyncStorage.getItem(KEY)) || (await AsyncStorage.getItem(OLD_KEY));
    return raw ? sanitize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function saveProgress(data) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}
