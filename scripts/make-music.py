"""Genera la musica di fondo in assets/sounds/music.wav.

Una tarantella lenta e originale in La minore, 6/8, scritta qui sotto nota per
nota e sintetizzata da zero (nessun file di terze parti). Quattro sezioni da
otto battute, così non si ripete subito: tema, parte in Do maggiore, tema a
crome, parte cantabile più bassa. Il suono è una corda morbida (poche
armoniche, attacco dolce) con un basso sul primo e sul quarto tempo.
Il file gira in loop: le code delle ultime note rientrano all'inizio.

    python3 scripts/make-music.py
"""
import math
import os
import struct
import wave

RATE = 11025    # basta per un suono morbido, e il file resta piccolo
EIGHTH = 0.19   # durata di una croma, in secondi
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds', 'music.wav')

NAMES = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}


def freq(name):
    sharp = 1 if '#' in name else 0
    return 440 * 2 ** ((NAMES[name[0]] + sharp + 12 * (int(name[-1]) - 4)) / 12)


# Ogni battuta vale sei crome. "A4:2" = La lungo due crome, "-" = pausa. Accanto, l'accordo per il basso.
BARS = [
    # tema
    ('A4:2 C5 E5:2 C5', 'Am'), ('B4:2 D5 E5:2 G#4', 'E'), ('A4:2 C5 E5 A5 E5', 'Am'), ('E5:2 D5 B4:3', 'E'),
    ('A4:2 C5 E5:2 C5', 'Am'), ('D5:2 F5 A5:2 F5', 'Dm'), ('E5 D5 B4 G#4 B4 D5', 'E'), ('A4:3 -:3', 'Am'),
    # parte in Do maggiore
    ('E5:2 G5 E5:2 C5', 'C'), ('D5:2 G5 D5:2 B4', 'G'), ('C5 E5 G5 E5:2 C5', 'C'), ('B4:2 D5 G4:3', 'G'),
    ('A4:2 C5 F5:2 C5', 'F'), ('G4:2 C5 E5:2 C5', 'C'), ('F5 E5 D5 F5 E5 D5', 'Dm'), ('E5:3 G#4:3', 'E'),
    # tema a crome
    ('A4 C5 E5 A5 E5 C5', 'Am'), ('G#4 B4 E5 D5 B4 G#4', 'E'), ('A4 C5 E5 A5 G5 F5', 'Am'), ('E5 D5 C5 B4 A4 G#4', 'E'),
    ('A4 C5 E5 C5 E5 A5', 'Am'), ('D5 F5 A5 F5 D5 F5', 'Dm'), ('E5 G#4 B4 E5 D5 B4', 'E'), ('A4:2 E5 A4:3', 'Am'),
    # parte cantabile, più bassa
    ('F4:3 A4:2 C5', 'F'), ('E4:3 G4:2 C5', 'C'), ('D4:3 F4:2 A4', 'Dm'), ('A4:3 E4:3', 'Am'),
    ('F4:2 A4 C5:2 F5', 'F'), ('E5:2 C5 G4:3', 'C'), ('G#4:2 B4 E5:2 D5', 'E'), ('C5 B4 A4:4', 'Am'),
]
BASS = {'Am': ('A2', 'E3'), 'E': ('E2', 'B2'), 'Dm': ('D3', 'A3'), 'C': ('C3', 'G3'), 'G': ('G2', 'D3'), 'F': ('F2', 'C3')}


def pluck(f, dur, vol):
    """Corda morbida: attacco dolce, quasi solo la fondamentale, coda lunga."""
    n = int(dur * RATE)
    out = []
    for i in range(n):
        t = i / RATE
        a = min(1.0, t / 0.012) * math.exp(-t * 3.2) * min(1.0, (n - i) / (0.03 * RATE))
        s = math.sin(2 * math.pi * f * t)
        s += 0.22 * math.exp(-t * 6) * math.sin(2 * math.pi * 2 * f * t)
        s += 0.06 * math.exp(-t * 10) * math.sin(2 * math.pi * 3 * f * t)
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
        k = 0
        for token in melody.split():
            name, _, length = token.partition(':')
            length = int(length or 1)
            if name != '-':
                accent = 1.0 if k in (0, 3) else 0.8
                put(pluck(freq(name), 0.5 + 0.35 * length, 0.30 * accent), bar + int(k * EIGHTH * RATE))
            k += length
        assert k == 6, (b + 1, melody)
        low, high = BASS[chord]
        put(pluck(freq(low), 1.1, 0.34), bar)
        put(pluck(freq(high), 0.9, 0.22), bar + int(3 * EIGHTH * RATE))

    # Un filtro leggero toglie quel poco di brillante che resta (due passate, così anche il loop resta liscio).
    y = 0.0
    for _ in range(2):
        for i in range(total):
            y += 0.45 * (buf[i] - y)
            buf[i] = y

    peak = max(abs(s) for s in buf)
    gain = 0.8 / peak
    with wave.open(OUT, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(s * gain * 32767)) for s in buf))
    print('ok music', round(total / RATE, 1), 's,', len(BARS), 'battute')


if __name__ == '__main__':
    main()
