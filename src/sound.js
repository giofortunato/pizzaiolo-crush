import { AppState } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Effetti sonori e musica. I file .wav si rigenerano con scripts/make-sounds.py e scripts/make-music.py
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

const MUSIC = require('../assets/sounds/music.wav');

const MUTE_KEY = 'pizzaiolo-crush/muted/v1';
const MUSIC_KEY = 'pizzaiolo-crush/music/v1';
const players = {};
let music = null;
let muted = false;
let musicOn = true;
let ready = false;

// Da chiamare una volta all'avvio. Rispetta il tasto silenzioso dell'iPhone
// e non interrompe la musica di altre app.
export async function initSound() {
  try {
    muted = (await AsyncStorage.getItem(MUTE_KEY)) === '1';
    musicOn = (await AsyncStorage.getItem(MUSIC_KEY)) !== '0';
  } catch {}
  try {
    await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
  } catch {}
  try {
    for (const k in SOURCES) players[k] = createAudioPlayer(SOURCES[k]);
    ready = true;
  } catch {}
  try {
    music = createAudioPlayer(MUSIC);
    music.loop = true;
    music.volume = 0.22; // sottofondo: gli effetti devono restare in primo piano
    // La musica si ferma quando l'app va in secondo piano e riparte al ritorno.
    AppState.addEventListener('change', syncMusic);
  } catch {}
  syncMusic();
  return { muted, music: musicOn };
}

// Fa suonare o tacere la musica secondo interruttori e stato dell'app.
// Sul web il browser la fa partire solo dopo il primo tocco: per questo si richiama anche da lì.
export function syncMusic() {
  if (!music) return;
  try {
    if (musicOn && !muted && AppState.currentState === 'active') music.play();
    else music.pause();
  } catch {}
}

export function setMusic(value) {
  musicOn = value;
  AsyncStorage.setItem(MUSIC_KEY, value ? '1' : '0').catch(() => {});
  syncMusic();
}

export function sfx(name) {
  if (muted || !ready) return;
  const p = players[name];
  if (!p) return;
  try {
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {}
}

export function isMuted() { return muted; }

export function setMuted(value) {
  muted = value;
  AsyncStorage.setItem(MUTE_KEY, value ? '1' : '0').catch(() => {});
  syncMusic();
}
