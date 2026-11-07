#!/usr/bin/env python3
"""Schneidet das Branding-Set (docs/bilder/branding-set.png) in Logo, App-Icons und Bereichs-Icons.

Aufruf: python3 scripts/branding.py   (braucht Pillow und numpy)
Erzeugt in public/assets/: icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
und in public/assets/marke/: logo(-hell).png, zeichen.png und je Bereich <name>.png + <name>-hell.png
(„-hell“ = helle Fassung für das dunkle Farbschema). Die Beschriftungen unter den Icons werden weggelassen.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'docs/bilder/branding-set.png'
OUT = ROOT / 'public/assets'
MARKE = OUT / 'marke'
DUNKELGRUEN = (4, 56, 28)

# Ausschnitte (x0, y0, x1, y1) im Original 2172 × 724
LOGO = (238, 26, 1477, 409)
APP = (1560, 26, 1929, 409)
ICON_Y = (467, 637)
ICONS = [  # x-Bereiche der neun Icons von links nach rechts
    ('kunde-neu', 59, 246), ('karte', 296, 485), ('notizen', 531, 712), ('termine', 761, 948),
    ('vorwerk', 997, 1181), ('waermepumpe', 1227, 1417), ('photovoltaik', 1462, 1649),
    ('statistik', 1705, 1878), ('einstellungen', 1941, 2120),
]


def quadrat(img: Image.Image, groesse: int, rand: float = 0.04) -> Image.Image:
    """Mittig auf transparentes Quadrat setzen und skalieren."""
    w, h = img.size
    s = int(max(w, h) * (1 + 2 * rand))
    c = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    c.paste(img, ((s - w) // 2, (s - h) // 2), img)
    return c.resize((groesse, groesse), Image.LANCZOS)


def hell(img: Image.Image) -> Image.Image:
    """Dunkelgrün → helles Mintgrün, Hellgrün etwas aufhellen (für dunklen Hintergrund)."""
    a = np.array(img).astype(np.float32)
    rgb = a[:, :, :3]
    lum = rgb.mean(axis=2)
    dunkel = lum < 70
    rgb[dunkel] = (226, 242, 214)
    sonst = ~dunkel
    rgb[sonst] = np.clip(rgb[sonst] * 1.15 + 20, 0, 255)
    a[:, :, :3] = rgb
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


# Bereichsfarben für das Produktsymbol der Bereichs-Icons: (hell: Fläche, Linie), (dunkles Schema: Fläche, Linie)
BEREICHSFARBE = {
    'photovoltaik': (((224, 168, 0), (168, 122, 0)), ((255, 210, 74), (255, 226, 140))),
    'waermepumpe': (((47, 127, 214), (29, 79, 140)), ((106, 174, 255), (169, 205, 255))),
}
# Bereich des Produktsymbols (Anteile von Breite/Höhe); der Vogel links oben bleibt grün
PRODUKT = {'photovoltaik': [(0.40, 0.45), (0.66, 0.0)], 'waermepumpe': [(0.45, 0.42)]}


def einfaerben(img: Image.Image, name: str, farben) -> Image.Image:
    """Produktsymbol in der Bereichsfarbe: helle Teile als Fläche, dunkle als Linie."""
    a = np.array(img).astype(np.float32)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    bereich = np.zeros((h, w), bool)
    for fx, fy in PRODUKT[name]:
        bereich |= (xx >= w * fx) & (yy >= h * fy)
    bereich &= a[:, :, 3] > 0
    lum = a[:, :, :3].mean(axis=2)
    flaeche, linie = farben
    a[bereich & (lum >= 70), :3] = flaeche
    a[bereich & (lum < 70), :3] = linie
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def zuschneiden(im: Image.Image, box) -> Image.Image:
    teil = im.crop(box)
    bb = teil.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    return teil.crop(bb) if bb else teil


def main():
    MARKE.mkdir(parents=True, exist_ok=True)
    im = Image.open(SRC).convert('RGBA')

    logo = zuschneiden(im, LOGO)
    logo = logo.resize((640, round(640 * logo.height / logo.width)), Image.LANCZOS)
    logo.save(MARKE / 'logo.png', optimize=True)
    hell(logo).save(MARKE / 'logo-hell.png', optimize=True)

    app = zuschneiden(im, APP)
    quadrat(app, 256, 0.02).save(MARKE / 'zeichen.png', optimize=True)
    # Homescreen-Icons: volle Fläche in Dunkelgrün (iOS und Android runden selbst ab)
    for name, groesse, anteil in [('icon-512.png', 512, 1.0), ('icon-192.png', 192, 1.0), ('apple-touch-icon.png', 180, 1.0), ('icon-maskable-512.png', 512, 0.78)]:
        c = Image.new('RGBA', (groesse, groesse), DUNKELGRUEN + (255,))
        innen = round(groesse * anteil * 1.06) if anteil == 1.0 else round(groesse * anteil)
        z = app.resize((innen, innen), Image.LANCZOS)
        c.paste(z, ((groesse - innen) // 2, (groesse - innen) // 2), z)
        c.convert('RGB').save(OUT / name, optimize=True)

    for name, x0, x1 in ICONS:
        ic = quadrat(zuschneiden(im, (x0, ICON_Y[0], x1, ICON_Y[1])), 192)
        h = hell(ic)
        if name in BEREICHSFARBE:
            h = einfaerben(h, name, BEREICHSFARBE[name][1])
            ic = einfaerben(ic, name, BEREICHSFARBE[name][0])
        ic.save(MARKE / f'{name}.png', optimize=True)
        h.save(MARKE / f'{name}-hell.png', optimize=True)
    print('fertig:', sorted(p.name for p in MARKE.iterdir()))


if __name__ == '__main__':
    main()
