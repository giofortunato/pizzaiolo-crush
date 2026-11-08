import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Effetti sonori. I file .wav si rigenerano con: python3 scripts/make-sounds.py
const SOURCES = {
  swap: require('../assets/sounds/swap.wav'),
  bad: require('../assets/sounds/bad.wav'),
  pop1: require('../assets/sounds/pop1.wav'),
  pop2: require('../assets/sounds/pop2.wav'),
  pop3: require('../assets/sounds/pop3.wav'),
  pop4: require('../assets/sounds/pop4.wav'),
  special: require('../assets/sounds/special.wav'),
  fire: require('../assets/sounds/fire.wav'),
  nonno: require('../assets/sounds/nonno.wav'),
  win: require('../assets/sounds/win.wav'),
  lose: require('../assets/sounds/lose.wav'),
};

const MUTE_KEY = 'pizzaiolo-crush/muted/v1';
const players = {};
let muted = false;
let ready = false;

// Da chiamare una volta all'avvio. Rispetta il tasto silenzioso dell'iPhone
// e non interrompe la musica di altre app.
export async function initSound() {
  try {
    muted = (await AsyncStorage.getItem(MUTE_KEY)) === '1';
  } catch (e) {}
  try {
    await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
  } catch (e) {}
  try {
    for (const k in SOURCES) players[k] = createAudioPlayer(SOURCES[k]);
    ready = true;
  } catch (e) {}
  return muted;
}

export function sfx(name) {
  if (muted || !ready) return;
  const p = players[name];
  if (!p) return;
  try {
    p.seekTo(0).catch(() => {});
    p.play();
  } catch (e) {}
}

export function isMuted() { return muted; }

export function setMuted(value) {
  muted = value;
  AsyncStorage.setItem(MUTE_KEY, value ? '1' : '0').catch(() => {});
}
