"""Genera la musica di fondo in assets/sounds/music.wav.

Una tarantella originale in La minore, 6/8, scritta qui sotto nota per nota e
sintetizzata da zero (nessun file di terze parti): un mandolino pizzicato per
la melodia e un basso sul primo e sul quarto tempo. Il file si ripete in loop:
le code delle ultime note rientrano all'inizio, così non si sente lo stacco.

    python3 scripts/make-music.py
"""
import math
import os
import struct
import wave

RATE = 16000
EIGHTH = 0.165  # durata di una croma, in secondi
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds', 'music.wav')

NAMES = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}


def freq(name):
    sharp = 1 if '#' in name else 0
    return 440 * 2 ** ((NAMES[name[0]] + sharp + 12 * (int(name[-1]) - 4)) / 12)


# Sedici battute da sei crome. '-' = pausa. Accanto, l'accordo per il basso.
BARS = [
    ('A4 C5 E5 A5 E5 C5', 'Am'), ('B4 D5 E5 G#5 E5 D5', 'E'), ('A4 C5 E5 A5 G5 F5', 'Am'), ('E5 D5 C5 B4 A4 G#4', 'E'),
    ('A4 C5 E5 A5 E5 C5', 'Am'), ('D5 F5 A5 D6 A5 F5', 'Dm'), ('E5 G#5 B5 E6 D6 B5', 'E'), ('A5 E5 C5 A4 - -', 'Am'),
    ('C5 E5 G5 C6 G5 E5', 'C'), ('B4 D5 G5 B5 G5 D5', 'G'), ('C5 E5 G5 C6 B5 A5', 'C'), ('G5 F5 E5 D5 C5 B4', 'G'),
    ('A4 C5 E5 A5 E5 C5', 'Am'), ('D5 F5 A5 D6 A5 F5', 'Dm'), ('E5 G#5 B5 E6 D6 B5', 'E'), ('A5 E5 C5 A4 A4 -', 'Am'),
]
BASS = {'Am': ('A2', 'E3'), 'E': ('E2', 'B2'), 'Dm': ('D3', 'A3'), 'C': ('C3', 'G3'), 'G': ('G2', 'D3')}


def pluck(f, dur, vol):
    """Corda pizzicata: attacco secco, armoniche che si spengono prima della fondamentale."""
    n = int(dur * RATE)
    out = []
    for i in range(n):
        t = i / RATE
        a = min(1.0, t / 0.004) * math.exp(-t * 5.5)
        s = math.sin(2 * math.pi * f * t)
        s += 0.45 * math.exp(-t * 9) * math.sin(2 * math.pi * 2 * f * t)
        s += 0.22 * math.exp(-t * 14) * math.sin(2 * math.pi * 3 * f * t)
        out.append(s * a * vol)
    return out


def main():
    total = int(len(BARS) * 6 * EIGHTH * RATE)
    buf = [0.0] * total

    def put(samples, start):
        for i, s in enumerate(samples):
            buf[(start + i) % total] += s  # la coda rientra all'inizio: loop senza stacco

    for b, (melody, chord) in enumerate(BARS):
        bar = int(b * 6 * EIGHTH * RATE)
        for k, name in enumerate(melody.split()):
            if name == '-':
                continue
            accent = 1.0 if k in (0, 3) else 0.75
            put(pluck(freq(name), 0.6, 0.30 * accent), bar + int(k * EIGHTH * RATE))
        low, high = BASS[chord]
        put(pluck(freq(low), 0.9, 0.42), bar)
        put(pluck(freq(high), 0.7, 0.30), bar + int(3 * EIGHTH * RATE))

    peak = max(abs(s) for s in buf)
    gain = 0.8 / peak
    with wave.open(OUT, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(s * gain * 32767)) for s in buf))
    print('ok music', round(total / RATE, 1), 's')


if __name__ == '__main__':
    main()
