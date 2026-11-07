# Branding: Logo, App-Icon und Bereichs-Icons

Seit 0.9.0 nutzt Sperling das Branding-Set des Auftraggebers (07.11.2026), Original: `docs/bilder/branding-set.png`
(Schriftzug, App-Icon und neun Bereichs-Icons in Dunkel-/Hellgrün). Die frühere Sperling-Figur
(`docs/bilder/maskottchen-entwurf-original.png`) wird nicht mehr verwendet.

`python3 scripts/branding.py` schneidet das Set zu (Beschriftungen unter den Icons fallen weg) und schreibt:

| Datei | Motiv | Verwendung |
|---|---|---|
| `public/assets/marke/logo.png`, `logo-hell.png` | Schriftzug „Sperling“ | Seitenleiste, Sperrbildschirm |
| `public/assets/marke/zeichen.png` | App-Icon (S-Vogel) | Übersicht, Navigation „Übersicht“, PDF-Belege |
| `kunde-neu` | Kunde anlegen | Kundenliste, Navigation „Kunden“ |
| `karte` | Adresse anlegen | Karte, Nachbarn |
| `notizen` | Notizen | Gesprächsnotizen, Leitfaden |
| `termine` | Wiedervorlage | Termine |
| `vorwerk` | Staubsauger | Vorwerk, Bestand |
| `waermepumpe` | Wärmepumpe | Bereich WP |
| `photovoltaik` | Photovoltaik | Bereich PV |
| `statistik` | Auswertungen | Auswertungen, Chancen |
| `einstellungen` | Einstellungen | Einstellungen |

Jedes Bereichs-Icon gibt es als `<name>.png` (für helles Farbschema) und `<name>-hell.png` (helle Fassung
für das dunkle Farbschema); `maskottchen()` in `src/ui/dom.ts` setzt beide ein, CSS zeigt die passende.

App-Icons: `public/assets/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (volle Fläche Dunkelgrün,
iOS/Android runden selbst ab) und `icon-maskable-512.png` (mit Sicherheitsrand für Android).

**Farben** (Tokens in `src/css/app.css`): Akzent Dunkelgrün `#0b4a2a` (dunkles Schema: Hellgrün `#a5d36a`),
Hellgrün `#6a9e2a`. Bereichsfarben: Photovoltaik gelb (`--pv`), Wärmepumpe blau (`--wp`), Vorwerk grün (`--vw`),
je in Hell und Dunkel. Statusfarben (Potenzial, Interesse …) bleiben unabhängig davon.

**Austausch:** neues Set unter `docs/bilder/branding-set.png` ablegen; ändern sich Positionen, die Ausschnitte
oben in `scripts/branding.py` anpassen und das Skript ausführen.
