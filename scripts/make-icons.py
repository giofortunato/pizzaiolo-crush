"""Genera le icone dell'app (una margherita, stessi colori della pizza in gioco).

    python3 scripts/make-icons.py

Richiede Pillow (pip install pillow). Scrive in assets/:
  icon.png                     1024x1024, senza trasparenza (iOS)
  android-icon-foreground.png  512x512, pizza nella zona sicura dell'icona adattiva
  android-icon-background.png  512x512, sfondo legno
  android-icon-monochrome.png  432x432, sagoma bianca (icone a tema di Android 13+)
  splash-icon.png              1024x1024, pizza su sfondo trasparente
  favicon.png                  48x48 (web)
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
SS = 4  # supersampling per bordi lisci

WOOD_DARK = (42, 25, 15)
WOOD = (59, 36, 23)
CRUST_OUT = (217, 154, 82)
CRUST = (233, 181, 110)
DOUGH = (243, 214, 160)
SAUCE = (199, 53, 31)
CHEESE = (255, 250, 240)
BASIL = (47, 143, 78)
BASIL_DARK = (31, 102, 54)
BURN = (58, 29, 11)


def circle(d, cx, cy, r, fill):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)


def blob(d, cx, cy, r, rnd, fill):
    """Macchia di mozzarella irregolare."""
    pts = []
    k = rnd.uniform(0, math.tau)
    for i in range(14):
        a = k + i / 14 * math.tau
        rr = r * rnd.uniform(0.78, 1.12)
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    d.polygon(pts, fill=fill)


def leaf(d, cx, cy, size, angle, fill, vein):
    pts = []
    for i in range(24):
        t = i / 23 * math.pi
        x = math.cos(t) * size
        y = math.sin(t) * size * 0.42
        pts.append((x, y))
    pts += [(x, -y) for x, y in reversed(pts)]
    ca, sa = math.cos(angle), math.sin(angle)
    rot = [(cx + x * ca - y * sa, cy + x * sa + y * ca) for x, y in pts]
    d.polygon(rot, fill=fill)
    d.line([(cx - size * 0.85 * ca, cy - size * 0.85 * sa), (cx + size * 0.85 * ca, cy + size * 0.85 * sa)],
           fill=vein, width=max(1, int(size * 0.07)))


def pizza(size, mono=False):
    """Pizza su sfondo trasparente, diametro = size."""
    S = size * SS
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c, R = S / 2, S / 2 * 0.98
    rnd = random.Random(7)

    if mono:
        white, hole = (255, 255, 255, 255), (0, 0, 0, 0)
        circle(d, c, c, R, white)
        circle(d, c, c, R * 0.84, hole)
        circle(d, c, c, R * 0.74, white)
        for a in range(6):  # tagli delle fette
            ang = a / 6 * math.tau + 0.26
            d.line([(c, c), (c + math.cos(ang) * R * 0.86, c + math.sin(ang) * R * 0.86)], fill=hole, width=int(R * 0.06))
        for x, y, r in ((-0.3, -0.3, 0.13), (0.32, -0.12, 0.12), (-0.05, 0.36, 0.13), (0.05, -0.02, 0.1)):
            circle(d, c + x * R, c + y * R, r * R, hole)
        return img.resize((size, size), Image.LANCZOS)

    # ombra morbida
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([c - R * 0.96, c - R * 0.9, c + R * 0.96, c + R * 1.0], fill=(0, 0, 0, 110))
    img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(S * 0.015)))
    d = ImageDraw.Draw(img)

    circle(d, c, c, R * 0.97, CRUST_OUT)
    circle(d, c, c, R * 0.9, CRUST)
    circle(d, c, c, R * 0.8, DOUGH)
    circle(d, c, c, R * 0.77, SAUCE)

    # mozzarella
    for x, y, r in ((-0.32, -0.3, 0.16), (0.3, -0.36, 0.14), (0.38, 0.12, 0.15), (-0.1, 0.4, 0.16),
                    (-0.45, 0.12, 0.12), (0.05, -0.05, 0.13), (0.15, 0.48, 0.1), (-0.02, -0.52, 0.1)):
        blob(d, c + x * R, c + y * R, r * R, rnd, CHEESE)

    # bruciature sul cornicione
    for i in range(22):
        a = rnd.uniform(0, math.tau)
        dd = R * rnd.uniform(0.84, 0.94)
        circle(d, c + math.cos(a) * dd, c + math.sin(a) * dd, R * rnd.uniform(0.015, 0.03), BURN + (140,))

    # tagli delle fette
    for a in range(6):
        ang = a / 6 * math.tau + 0.26
        d.line([(c, c), (c + math.cos(ang) * R * 0.8, c + math.sin(ang) * R * 0.8)], fill=(150, 35, 20), width=int(R * 0.022))

    # basilico
    for x, y, ang in ((-0.18, -0.12, 0.6), (0.24, 0.3, -0.5), (0.2, -0.2, 2.2), (-0.32, 0.3, 1.4)):
        leaf(d, c + x * R, c + y * R, R * 0.13, ang, BASIL, BASIL_DARK)

    return img.resize((size, size), Image.LANCZOS)


def wood_bg(size):
    S = size * 2
    img = Image.new('RGB', (S, S), WOOD_DARK)
    d = ImageDraw.Draw(img)
    # alone caldo al centro
    for i in range(60, 0, -1):
        t = i / 60
        col = tuple(int(WOOD_DARK[j] + (WOOD[j] + 12 - WOOD_DARK[j]) * (1 - t)) for j in range(3))
        circle(d, S / 2, S / 2, S * 0.75 * t, col)
    return img.filter(ImageFilter.GaussianBlur(S * 0.01)).resize((size, size), Image.LANCZOS)


def on_bg(size, scale):
    bg = wood_bg(size).convert('RGBA')
    p = pizza(int(size * scale))
    off = (size - p.width) // 2
    bg.alpha_composite(p, (off, off))
    return bg


def centered(size, scale, mono=False):
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    p = pizza(int(size * scale), mono)
    off = (size - p.width) // 2
    canvas.alpha_composite(p, (off, off))
    return canvas


def save(img, name):
    img.save(os.path.join(OUT, name), optimize=True)
    print('ok', name, img.size)


if __name__ == '__main__':
    save(on_bg(1024, 0.82).convert('RGB'), 'icon.png')
    # Icona adattiva: Android ritaglia la parte esterna, la zona sicura è il cerchio centrale (66%).
    save(centered(512, 0.66), 'android-icon-foreground.png')
    save(wood_bg(512), 'android-icon-background.png')
    save(centered(432, 0.66, mono=True), 'android-icon-monochrome.png')
    save(centered(1024, 0.6), 'splash-icon.png')
    save(on_bg(48, 0.9).convert('RGB'), 'favicon.png')
