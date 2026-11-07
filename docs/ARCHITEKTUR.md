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
 │   ├─ auswertung.ts .... Zeiträume, Kennzahlen, Vergleich mit dem Vorzeitraum
 │   ├─ gespraech.ts ..... Gesprächsmodus speichern (je Bereich, Notiz je Firma, R-TEXT)
 │   ├─ verlauf.ts ....... Gesprächshistorie, letzter Kontakt
 │   ├─ kartenfilter.ts .. Mehrfachfilter für Karte und Kundenliste
 │   ├─ suche.ts ......... Kommandozeile: Normalisierung, Bewertung, Gruppen, Verben, Zuletzt
 │   ├─ hilfe.ts ......... Hilfetexte (Themen, Begriffe, Fragen) und Hilfe-Suche
 │   └─ installieren.ts .. Gerät/Browser erkennen, Installationsschritte
 ├─ src/storage/
 │   ├─ db.ts ............ IndexedDB: vault (aktueller Umschlag), history (10), meta (Geräte-ID)
 │   ├─ store.ts ......... Datenzustand im Speicher, mutate(), Speicherkette, Demo-Modus
 │   ├─ dropbox.ts ....... OAuth PKCE, Download/Upload der verschlüsselten Datei
 │   ├─ sync.ts .......... Abgleich „neuester Stand gewinnt“
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
 ├─ src/ui/kalender.ts ... Monats-/Wochen-/Tagesansicht, Termin per Fingertipp
 ├─ src/ui/kundenansicht.ts  Vollbild zum Herzeigen, Beenden mit Passwort/Face ID
 ├─ src/ui/belege.ts ..... Fotos (verkleinert) und Unterschriftsfeld
 ├─ src/ui/leihschein.ts . Leihschein/Rückgabeschein als PDF (jsPDF aus vendor/)
 ├─ src/ui/kontaktseite.ts  „Meine Kontaktseite“ in den Einstellungen: Link, Teilen, QR-Code (qrcode-generator aus vendor/)
 ├─ src/ui/schutz.ts ..... Beratungs-Schutz: Knopf, Band, Routen-Wächter (Sicht in store.getData())
 ├─ src/ui/suche.ts ...... Kommandozeile (⌘K): Dialog, Aktionen, Zuletzt geöffnet
 ├─ src/ui/hilfe.ts ...... ?-Knöpfe, Installieren-Angebot, Installationshinweis
 ├─ src/ui/gespraechsablauf.ts  laufendes Gespräch im Arbeitsspeicher
 ├─ src/ui/filterpanel.ts  Filterfeld für Karte und Kundenliste
 ├─ src/ui/zeitraum.ts ... Zeitraum wischen mit gesperrten Tagen
 ├─ src/ui/views/ ......... start, kunden, kunde, gespraechsmodus, karte, termine, gespraech, bestand,
 │                          belegung, auswertung, geloescht, hilfe, einstellungen
 ├─ src/sw.ts ............. Offline-Cache der gebauten Dateien (keine Kundendaten)
 └─ src/globals.d.ts ...... projektweite Typen (DOM-Abfragen, Build-Konstanten)
```

Build: `npm run build` (Vite) erzeugt `dist/` mit gebündeltem, gehashtem JavaScript/CSS und dem Service Worker samt Dateiliste. `public/` (Icons, Maskottchen, Leaflet, jsPDF, qrcode-generator, Manifest, Kontaktseite) wird unverändert kopiert.

Kontaktseite: `public/kontakt/index.html` ist eine eigenständige öffentliche Werbe- und Kontaktseite (Photovoltaik und Wärmepumpe, ohne Anbieternamen, ohne Vorwerk). Sie nutzt keinen App-Code, keine Kundendaten, keine Cookies, kein Tracking und keine externen Schriften. Alle Kontaktdaten stehen nur im Block `KONTAKT` am Ende der Datei; Texte werden per `textContent` gesetzt. Der Rückrufwunsch wird nirgends gespeichert, sondern als vorbereitete WhatsApp-Nachricht oder E-Mail übergeben. Stand: Konzept mit Platzhalterdaten; Impressum (§ 5 DDG), Datenschutzerklärung und eigenes Hosting folgen. GitHub Actions (`.github/workflows/pages.yml`) prüft, testet, baut und liefert `dist/` bei jedem Push auf `main` nach GitHub Pages aus. Typen: `npm run check` (TypeScript `strict`).

## Datenfluss

1. **Start:** `app.ts` prüft, ob ein Umschlag in IndexedDB liegt → Sperrbildschirm „Entsperren“ oder „Einrichten“.
2. **Entsperren:** `store.unlock(pw)` → `KeyRing.decrypt()` → `migrate()` → Daten im Arbeitsspeicher.
3. **Ändern:** Ansichten rufen `store.mutate(fn)`. Danach nach 400 ms `persist()`.
4. **Speichern:** Gesamter Bestand → JSON → AES-GCM → neuer Umschlag. Der alte Umschlag wandert in `history`. Alle Speichervorgänge laufen nacheinander über eine Promise-Kette.
5. **Sync:** Nach dem Speichern (5 s verzögert), beim Entsperren, beim Zurückkehren zur App und beim Online-Gehen vergleicht `sync.ts` `updatedAt` lokal vs. Dropbox. Neuerer gewinnt: Upload oder `store.adoptEnvelope()`.
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
`app|format|updatedAt|deviceId` sind als AAD gebunden. Dieselbe Datei dient als lokaler Speicher, Backup und Dropbox-Datei.

## Dropbox

- Eigene Dropbox-App mit Zugriff „App folder“ (nur der eigene Unterordner), PKCE-Flow ohne Client-Secret.
- Refresh-Token liegt im verschlüsselten Datenbestand; Access-Token nur im Arbeitsspeicher.
- Nach der Weiterleitung von Dropbox ist die App gesperrt: Der Code wird in `sessionStorage` geparkt und nach dem Entsperren eingelöst.
- Unterschiedlicher Salt auf zwei Geräten ist kein Problem: `KeyRing` leitet pro Salt einen Schlüssel ab und übernimmt beim Laden den Salt der Datei.

## Fehlerbehandlung

Siehe REGELN.md, R-ABSTURZ. Zusätzlich: `mutate()` rollt den Zustand zurück, wenn die Änderungsfunktion wirft; Dialoge räumen sich beim Schließen selbst aus dem DOM.

## Responsives Layout

- < 640 px: eine Spalte, untere Navigationsleiste mit Maskottchen-Symbolen.
- ≥ 640 px: Formulare zweispaltig, Sparten-Kacheln nebeneinander.
- ≥ 900 px (Tablet quer, Laptop): Seitenleiste links, Inhalte zweispaltig.
