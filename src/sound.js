import { AppState } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRACKS, DEFAULT_TRACK, MUSIC_VOLUME } from './music';

// Effetti sonori (scripts/make-sounds.py) e musica di sottofondo (brani in music.js).
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
const MUSIC_KEY = 'pizzaiolo-crush/music/v1';
const players = {};
let muted = false;
let musicOn = false; // spenta finché il giocatore non la accende dalla mappa
let ready = false;

// Da chiamare una volta all'avvio. Rispetta il tasto silenzioso dell'iPhone
// e non interrompe la musica di altre app.
export async function initSound() {
  try {
    muted = (await AsyncStorage.getItem(MUTE_KEY)) === '1';
    musicOn = (await AsyncStorage.getItem(MUSIC_KEY)) === '1';
  } catch {}
  try {
    await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
  } catch {}
  try {
    for (const k in SOURCES) players[k] = createAudioPlayer(SOURCES[k]);
    ready = true;
  } catch {}
  // La musica si ferma quando l'app va in secondo piano e riparte al ritorno.
  AppState.addEventListener('change', syncMusic);
  return { muted, music: musicOn };
}

// ---------- musica ----------
// La musica parte quando si inforna (playMusic con l'umore dell'ordine) e si ferma a pizza finita (stopMusic).
// Sulla mappa non suona. Ogni cambio passa da una dissolvenza breve.
let mood = null;        // umore richiesto, o null se deve tacere
let player = null;      // brano in corso
let playerSrc = null;
const fades = new Map();
const FADE_MS = 400, STEPS = 10;

function ramp(p, to, done) {
  clearInterval(fades.get(p));
  let n = 0;
  const from = p.volume, timer = setInterval(() => {
    n++;
    try { p.volume = from + (to - from) * (n / STEPS); } catch {}
    if (n >= STEPS) { clearInterval(timer); fades.delete(p); if (done) done(); }
  }, FADE_MS / STEPS);
  fades.set(p, timer);
}

function fadeOutAndDrop(p) {
  ramp(p, 0, () => { try { p.pause(); p.remove(); } catch {} });
}

export function playMusic(which) { mood = which || DEFAULT_TRACK; syncMusic(); }
export function stopMusic() { mood = null; syncMusic(); }

function syncMusic() {
  const src = mood ? TRACKS[mood] || TRACKS[DEFAULT_TRACK] : null;
  const want = !!src && musicOn && !muted && AppState.currentState === 'active';
  try {
    if (!want) {
      if (player) ramp(player, 0, () => { try { player && player.pause(); } catch {} });
      return;
    }
    if (player && playerSrc !== src) { fadeOutAndDrop(player); player = null; }
    if (!player) {
      player = createAudioPlayer(src);
      player.loop = true;
      player.volume = 0;
      playerSrc = src;
    }
    player.play();
    ramp(player, MUSIC_VOLUME);
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
