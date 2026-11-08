"""Genera gli effetti sonori del gioco in assets/sounds/*.wav.

Sono sintetizzati da zero (nessun file di terze parti). Per cambiarli
modifica le funzioni qui sotto e rilancia:

    python3 scripts/make-sounds.py
"""
import math
import os
import random
import struct
import wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')


def env(i, n, attack=0.005, release=0.6):
    """Inviluppo: attacco rapido, coda che sfuma."""
    t = i / RATE
    a = min(1.0, t / attack) if attack else 1.0
    rel_start = n * (1 - release)
    r = 1.0 if i < rel_start else max(0.0, 1 - (i - rel_start) / (n - rel_start))
    return a * r


def tone(dur, f0, f1=None, wave_fn=math.sin, vol=0.5, attack=0.005, release=0.6, vibrato=0.0):
    n = int(dur * RATE)
    f1 = f0 if f1 is None else f1
    out, ph = [], 0.0
    for i in range(n):
        k = i / n
        f = f0 * (f1 / f0) ** k  # glissando esponenziale
        if vibrato:
            f *= 1 + vibrato * math.sin(2 * math.pi * 7 * i / RATE)
        ph += 2 * math.pi * f / RATE
        out.append(wave_fn(ph) * vol * env(i, n, attack, release))
    return out


def soft_square(ph):
    s = math.sin(ph)
    return math.tanh(3 * s) * 0.8


def noise(dur, vol=0.5, release=0.9, lowpass=0.15):
    n = int(dur * RATE)
    out, y = [], 0.0
    rnd = random.Random(42)
    for i in range(n):
        k = i / n
        a = lowpass + (1 - k) * 0.25  # il filtro si chiude: "fuuu" che si spegne
        y += a * (rnd.uniform(-1, 1) - y)
        out.append(y * vol * 2.2 * env(i, n, 0.02, release))
    return out


def seq(*parts, gap=0.0):
    out = []
    for p in parts:
        out += p + [0.0] * int(gap * RATE)
    return out


def mix(a, b):
    n = max(len(a), len(b))
    return [(a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(n)]


def note(name):
    names = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
    return 440 * 2 ** ((names[name[0]] + 12 * (int(name[1]) - 4)) / 12)


def save(name, samples):
    os.makedirs(OUT, exist_ok=True)
    peak = max(1e-9, max(abs(s) for s in samples))
    gain = min(1.0, 0.9 / peak)
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s * gain)) * 32767)) for s in samples))


def pop(f):
    return tone(0.09, f * 1.6, f, vol=0.6, release=0.8)


SOUNDS = {
    # scambio di due ingredienti
    'swap': lambda: tone(0.08, 320, 640, vol=0.25, release=0.7),
    # mossa non valida
    'bad': lambda: seq(tone(0.07, 220, 200, soft_square, 0.3), tone(0.1, 170, 150, soft_square, 0.3), gap=0.03),
    # match: più alto a ogni combo
    'pop1': lambda: pop(520),
    'pop2': lambda: pop(620),
    'pop3': lambda: pop(740),
    'pop4': lambda: pop(880),
    # nasce una tessera speciale
    'special': lambda: seq(*(tone(0.07, note(n), vol=0.35, release=0.5) for n in ('C6', 'E6', 'G6', 'C7'))),
    # Forno / Pala in azione
    'fire': lambda: mix(noise(0.45, 0.5), tone(0.45, 180, 70, vol=0.25, release=0.8)),
    # il nonno brontola
    'nonno': lambda: seq(tone(0.16, 150, 120, soft_square, 0.35, vibrato=0.06), tone(0.22, 135, 95, soft_square, 0.35, vibrato=0.06), gap=0.04),
    # pizza servita
    'win': lambda: seq(*(tone(d, note(n), wave_fn=soft_square, vol=0.3, release=0.4) for n, d in
                         (('C5', 0.11), ('E5', 0.11), ('G5', 0.11), ('C6', 0.35)))),
    # cliente se ne va
    'lose': lambda: seq(*(tone(d, note(n), wave_fn=soft_square, vol=0.3, release=0.5, vibrato=v) for n, d, v in
                          (('G4', 0.18, 0), ('F4', 0.18, 0), ('D4', 0.18, 0), ('B3', 0.45, 0.02)))),
}

if __name__ == '__main__':
    for name, make in SOUNDS.items():
        save(name, make())
        print('ok', name)
