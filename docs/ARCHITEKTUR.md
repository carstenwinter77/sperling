# Architektur

## Überblick

```
Browser (Tablet / Handy / Laptop)
 ├─ index.html + src/css/app.css + Leaflet/jsPDF (public/vendor/)
 ├─ src/app.ts ............ Start, Sperrbildschirm, Router, Navigation, Auto-Sperre, Fehlerfang
 ├─ src/core/ ............. reine Logik, ohne DOM, in Node testbar
 │   ├─ util.ts .......... Escaping, Datum, Zahlen, Entfernung
 │   ├─ crypto.ts ........ KeyRing: PBKDF2 → AES-GCM, Umschlag-Format
 │   ├─ model.ts ......... Sparten, Status, Feldkatalog, Normalisierung, Migration
 │   ├─ textgen.ts ....... Enpal-/Vorwerk-Texte (strikt getrennt)
 │   ├─ ics.ts ........... Kalenderexport (RFC 5545)
 │   ├─ einwaende.ts ..... Gesprächsleitfaden: Einstiegsfragen, Einwände, Überleitungen
 │   ├─ papierkorb.ts .... Löschen in „Gelöscht“, Wiederherstellen, endgültig löschen
 │   ├─ belegung.ts ...... Belegungskalender: Tage, Balken, freie Zeiträume
 │   ├─ kalender.ts ...... Leihgaben je Tag für den Kalender, Termine ziehen (15-Min-Raster), auf anderen Tag legen
 │   ├─ auswertung.ts .... Zeiträume, Kennzahlen, Vergleich mit dem Vorzeitraum
 │   ├─ gespraech.ts ..... Gesprächsmodus speichern (je Bereich, Notiz je Firma, R-TEXT)
 │   ├─ verlauf.ts ....... Gesprächshistorie, letzter Kontakt
 │   ├─ kartenfilter.ts .. Mehrfachfilter für Karte und Kundenliste (auch eigene Ja/Nein- und Auswahlfelder)
 │   ├─ bausteine.ts ..... Textbausteine: Startliste, prüfen, an Notiz anhängen
 │   ├─ produkte.ts ...... Produktkatalog prüfen, filtern, suchen; Markierungen „Produkte im Gespräch“
 │   ├─ felder.ts ........ Feldverwaltung: Kontaktfelder, eigene Felder, sichtbare Felder, Anzeige je Typ
 │   ├─ suche.ts ......... Kommandozeile: Normalisierung, Bewertung, Gruppen, Verben, Zuletzt
 │   ├─ hilfe.ts ......... Hilfetexte (Themen, Begriffe, Fragen) und Hilfe-Suche
 │   └─ installieren.ts .. Gerät/Browser erkennen, Installationsschritte
 ├─ src/storage/
 │   ├─ db.ts ............ IndexedDB: vault (aktueller Umschlag), history (10), meta (Geräte-ID)
 │   ├─ store.ts ......... Datenzustand im Speicher, mutate(), Speicherkette, Demo-Modus
 │   └─ biometrie.ts ..... Face ID / Touch ID (Passkey + PRF)
 ├─ src/services/geo.ts ... Nominatim (Adresse ↔ Koordinate), gedrosselt
 ├─ src/ui/dom.ts ......... Toast, Dialog, Download, Zwischenablage
 ├─ src/ui/parts.ts ....... Status-Chips, Termin-Dialog, Terminliste, ICS-Export
 ├─ src/ui/theme.ts ...... Hell/Dunkel/Automatisch
 ├─ src/ui/kontakt.ts .... Anrufen, E-Mail (Mailprogramm-Wahl)
 ├─ src/ui/enpaldoku.ts .. Enpal-Gesprächsdokumentation
 ├─ src/ui/navi.ts ....... „Hinfahren“ (Apple Karten / Google Maps)
 ├─ src/ui/badge.ts ...... Zahl am App-Symbol
 ├─ src/ui/update.ts ..... Update-Hinweis, „Was ist neu“ (Texte in src/neuigkeiten.ts)
 ├─ src/ui/kalender.ts ... Monats-/Wochen-/Tagesansicht, Termin per Fingertipp, Griffe zum Verschieben/Ziehen, Leihgaben
 ├─ src/ui/terminkarte.ts  Termin-Karte (Route, Anrufen, E-Mail, Erledigt, Bearbeiten, Löschen)
 ├─ src/ui/kundenansicht.ts  Vollbild zum Herzeigen, Beenden mit Passwort/Face ID
 ├─ src/ui/belege.ts ..... Fotos (verkleinert) und Unterschriftsfeld
 ├─ src/ui/leihschein.ts . Leihschein/Rückgabeschein als PDF (jsPDF aus vendor/)
 ├─ src/ui/kontaktseite.ts  „Meine Kontaktseite“ in den Einstellungen: Link, Teilen, QR-Code (qrcode-generator aus vendor/)
 ├─ src/ui/schutz.ts ..... Beratungs-Schutz: Knopf, Band, Routen-Wächter (Sicht in store.getData())
 ├─ src/ui/suche.ts ...... Kommandozeile (⌘K): Dialog, Aktionen, Zuletzt geöffnet
 ├─ src/ui/hilfe.ts ...... ?-Knöpfe, Installieren-Angebot, Installationshinweis
 ├─ src/ui/gespraechsablauf.ts  laufendes Gespräch im Arbeitsspeicher
 ├─ src/ui/filterpanel.ts  Filterfeld für Karte und Kundenliste
 ├─ src/ui/bausteinverwaltung.ts  Einstellungen → Textbausteine
 ├─ src/ui/produkte.ts ... Kacheln, Produktdetail, Markieren-Block (Kartei, Gesprächsmodus)
 ├─ src/ui/views/produkte.ts  Produktübersicht #/produkte (auch im Beratungs-Schutz)
 ├─ src/data/produkte.json  Produktkatalog (statisch, im Paket)
 ├─ src/ui/felder.ts ..... Formularfelder der Kartei aus der Feldverwaltung (Kartei, Gesprächsmodus)
 ├─ src/ui/feldverwaltung.ts  Einstellungen → Felder (ein-/ausblenden, eigene Felder anlegen/bearbeiten/löschen)
 ├─ src/ui/zeitraum.ts ... Zeitraum wischen mit gesperrten Tagen
 ├─ src/ui/views/ ......... start, kunden, kunde, gespraechsmodus, karte, termine, gespraech, bestand,
 │                          belegung, auswertung, geloescht, hilfe, einstellungen
 ├─ src/sw.ts ............. Offline-Cache der gebauten Dateien (keine Kundendaten)
 └─ src/globals.d.ts ...... projektweite Typen (DOM-Abfragen, Build-Konstanten)
```

Build: `npm run build` (Vite) erzeugt `dist/` mit gebündeltem, gehashtem JavaScript/CSS und dem Service Worker samt Dateiliste. `public/` (Icons, Maskottchen, Leaflet, jsPDF, qrcode-generator, Manifest, Kontaktseite) wird unverändert kopiert.

Kontaktseite: `public/kontakt/index.html` ist eine eigenständige öffentliche Werbe- und Kontaktseite (Photovoltaik und Wärmepumpe, ohne Anbieternamen, ohne Vorwerk). Sie nutzt keinen App-Code, keine Kundendaten, keine Cookies, kein Tracking und keine externen Schriften. Alle persönlichen Angaben stehen nur in `public/kontakt/daten.js` (`KONTAKT`), das auch `public/kontakt/datenschutz.html` liest. Die Datenschutzerklärung beschreibt genau das technische Verhalten der Seite (Hosting, keine Cookies/kein Browser-Speicher, keine Fremdinhalte, WhatsApp-Link, Rückruf ohne Server, vCard/Teilen/QR lokal, Weitergabe, Drittland) und MUSS bei jeder technischen Änderung der Kontaktseite mit angepasst werden; Texte werden per `textContent` gesetzt. Der Rückrufwunsch wird nirgends gespeichert, sondern als vorbereitete WhatsApp-Nachricht oder E-Mail übergeben. Barrierefreiheit nach WCAG 2.2 AA (Sprunglink, Landmarks, zugängliche Formularfehler, Fokus nie verdeckt, Kontraste hell/dunkel; geprüft mit axe-core). Animationen (Auftauchen beim Laden und Scrollen, Schnellkontakt-Leiste) nur bei `prefers-reduced-motion: no-preference`; ohne JavaScript ist alles sichtbar (Klasse `js` am `<html>`). Stand: Konzept; Name echt, Telefon, E-Mail und Region noch Platzhalter; Impressum (§ 5 DDG), Datenschutzerklärung und eigenes Hosting folgen. GitHub Actions (`.github/workflows/pages.yml`) prüft, testet, baut und liefert `dist/` bei jedem Push auf `main` nach GitHub Pages aus. Typen: `npm run check` (TypeScript `strict`).

## Datenfluss

1. **Start:** `app.ts` prüft, ob ein Umschlag in IndexedDB liegt → Sperrbildschirm „Entsperren“ oder „Einrichten“.
2. **Entsperren:** `store.unlock(pw)` → `KeyRing.decrypt()` → `migrate()` → Daten im Arbeitsspeicher.
3. **Ändern:** Ansichten rufen `store.mutate(fn)`. Danach nach 400 ms `persist()`.
4. **Speichern:** Gesamter Bestand → JSON → AES-GCM → neuer Umschlag. Der alte Umschlag wandert in `history`. Alle Speichervorgänge laufen nacheinander über eine Promise-Kette.
5. **Sicherung:** Der aktuelle Umschlag wird als `.sperling`-Datei geteilt („In iCloud / Dateien sichern“) oder heruntergeladen. Einspielen übernimmt sie mit `store.adoptEnvelope()`. Einen automatischen Abgleich gibt es nicht (Dropbox wurde in 0.9.5 entfernt).
6. **Sperren:** Offene Änderungen werden gespeichert, dann Passwort, Schlüssel und Klartext verworfen.

## Umschlag-Format (Datei `.sperling`)

```json
{
  "app": "sperling", "format": 1,
  "updatedAt": "2026-11-07T08:00:00.000Z", "deviceId": "…",
  "kdf": { "name": "PBKDF2", "hash": "SHA-256", "iterations": 600000, "salt": "base64" },
  "iv": "base64 (12 Byte)", "ct": "base64 (AES-256-GCM)"
}
```
`app|format|updatedAt|deviceId` sind als AAD gebunden. Dieselbe Datei dient als lokaler Speicher und Sicherungsdatei (iCloud Drive).

## Mehrere Salts

- Unterschiedlicher Salt auf zwei Geräten ist kein Problem: `KeyRing` leitet pro Salt einen Schlüssel ab und übernimmt beim Einspielen den Salt der Datei.

## Fehlerbehandlung

Siehe REGELN.md, R-ABSTURZ. Zusätzlich: `mutate()` rollt den Zustand zurück, wenn die Änderungsfunktion wirft; Dialoge räumen sich beim Schließen selbst aus dem DOM.

## Responsives Layout

- < 640 px: eine Spalte, untere Navigationsleiste mit Maskottchen-Symbolen.
- ≥ 640 px: Formulare zweispaltig, Sparten-Kacheln nebeneinander.
- ≥ 900 px (Tablet quer, Laptop): Seitenleiste links, Inhalte zweispaltig.
