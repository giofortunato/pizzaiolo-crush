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
  prepareMusic();
  // La musica si ferma quando l'app va in secondo piano e riparte al ritorno.
  AppState.addEventListener('change', syncMusic);
  return { muted, music: musicOn };
}

// ---------- musica ----------
// La musica parte quando si inforna (playMusic con l'umore dell'ordine) e si ferma a pizza finita (stopMusic).
// Sulla mappa non suona. I brani si preparano all'avvio (prepareMusic), così all'"Inforna!" sono già carichi:
// al primo avvio un brano creato all'ultimo momento a volte non si caricava affatto.
let mood = null;          // umore richiesto, o null se deve tacere
let current = null;       // lettore che sta suonando (o sfumando verso il silenzio)
const tracks = new Map(); // file -> lettore, uno per brano
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

function trackFor(src) {
  let p = tracks.get(src);
  if (p) return p;
  p = createAudioPlayer(src);
  p.loop = true;
  p.volume = 0;
  // Appena il brano è caricato, se è proprio quello che deve suonare, parte.
  p.addListener('playbackStatusUpdate', (st) => {
    if (st.isLoaded && current === p && wanted() && !p.playing) { try { p.play(); } catch {} }
  });
  tracks.set(src, p);
  return p;
}

function prepareMusic() {
  try { for (const k in TRACKS) if (TRACKS[k]) trackFor(TRACKS[k]); } catch {}
}

const srcFor = (m) => (m ? TRACKS[m] || TRACKS[DEFAULT_TRACK] : null);
const wanted = () => !!srcFor(mood) && musicOn && !muted && AppState.currentState === 'active';

export function playMusic(which) { mood = which || DEFAULT_TRACK; syncMusic(); }
export function stopMusic() { mood = null; syncMusic(); }

function silence(p) { ramp(p, 0, () => { if (p !== current || !wanted()) try { p.pause(); } catch {} }); }

function syncMusic() {
  try {
    if (!wanted()) { if (current) silence(current); return; }
    const next = trackFor(srcFor(mood));
    if (current && current !== next) silence(current);
    if (current !== next) { try { next.seekTo(0).catch(() => {}); } catch {} }
    current = next;
    next.play();
    ramp(next, MUSIC_VOLUME);
    // Rete di sicurezza: se dopo un attimo il brano non suona ancora, si riprova.
    setTimeout(() => { if (current === next && wanted() && !next.playing) { try { next.play(); } catch {} } }, 1500);
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
