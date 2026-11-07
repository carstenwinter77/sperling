# Architektur

## Überblick

```
Browser (Tablet / Handy / Laptop)
 ├─ index.html + css/app.css + Leaflet (vendor/)
 ├─ js/app.js ............ Start, Sperrbildschirm, Router, Navigation, Auto-Sperre, Fehlerfang
 ├─ js/core/ ............. reine Logik, ohne DOM, in Node testbar
 │   ├─ util.js .......... Escaping, Datum, Zahlen, Entfernung
 │   ├─ crypto.js ........ KeyRing: PBKDF2 → AES-GCM, Umschlag-Format
 │   ├─ model.js ......... Sparten, Status, Feldkatalog, Normalisierung, Migration
 │   ├─ textgen.js ....... Enpal-/Vorwerk-Texte (strikt getrennt)
 │   ├─ ics.js ........... Kalenderexport (RFC 5545)
 │   └─ einwaende.js ..... Gesprächsleitfaden: Einstiegsfragen, Einwände, Überleitungen
 ├─ js/storage/
 │   ├─ db.js ............ IndexedDB: vault (aktueller Umschlag), history (10), meta (Geräte-ID)
 │   ├─ store.js ......... Datenzustand im Speicher, mutate(), Speicherkette, Demo-Modus
 │   ├─ dropbox.js ....... OAuth PKCE, Download/Upload der verschlüsselten Datei
 │   └─ sync.js .......... Abgleich „neuester Stand gewinnt“
 ├─ js/services/geo.js ... Nominatim (Adresse ↔ Koordinate), gedrosselt
 ├─ js/ui/dom.js ......... Toast, Dialog, Download, Zwischenablage
 ├─ js/ui/parts.js ....... Status-Chips, Termin-Dialog, Terminliste, ICS-Export
 ├─ js/ui/theme.js ...... Hell/Dunkel/Automatisch
 ├─ js/ui/views/ ......... start, kunden, kunde, karte, termine, gespraech, bestand, einstellungen
 └─ sw.js ................ Offline-Cache der App-Dateien (keine Kundendaten)
```

Keine Build-Tools: Der Ordner wird so, wie er ist, auf einen statischen Webserver gelegt.

## Datenfluss

1. **Start:** `app.js` prüft, ob ein Umschlag in IndexedDB liegt → Sperrbildschirm „Entsperren“ oder „Einrichten“.
2. **Entsperren:** `store.unlock(pw)` → `KeyRing.decrypt()` → `migrate()` → Daten im Arbeitsspeicher.
3. **Ändern:** Ansichten rufen `store.mutate(fn)`. Danach nach 400 ms `persist()`.
4. **Speichern:** Gesamter Bestand → JSON → AES-GCM → neuer Umschlag. Der alte Umschlag wandert in `history`. Alle Speichervorgänge laufen nacheinander über eine Promise-Kette.
5. **Sync:** Nach dem Speichern (5 s verzögert), beim Entsperren, beim Zurückkehren zur App und beim Online-Gehen vergleicht `sync.js` `updatedAt` lokal vs. Dropbox. Neuerer gewinnt: Upload oder `store.adoptEnvelope()`.
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
