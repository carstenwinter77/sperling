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
 │   ├─ einwaende.ts ..... Gesprächsleitfaden: Einwände, Überleitungen
│   ├─ klemmbrett.ts ... Gesprächs-Klemmbrett: Abschnitte je Bereich (Kartei-Felder + Antworten), Stand, Notiztext (rein, ohne DOM)
 │   ├─ papierkorb.ts .... Löschen in „Gelöscht“, Wiederherstellen, endgültig löschen
 │   ├─ belegung.ts ...... Belegungskalender: Tage, Balken, freie Zeiträume
 │   ├─ kalender.ts ...... Leihgaben je Tag für den Kalender, Termine ziehen (15-Min-Raster), auf anderen Tag legen
 │   ├─ auswertung.ts .... Zeiträume, Kennzahlen, fairer Vergleich, Statusverlauf → Abschlüsse/Trichter, Nachfassliste, Fokus je Sparte
 │   ├─ gespraech.ts ..... Gesprächsmodus speichern (je Bereich, Notiz je Firma, R-TEXT)
 │   ├─ verlauf.ts ....... Gesprächshistorie, letzter Kontakt
 │   ├─ kartenfilter.ts .. Mehrfachfilter für Karte und Kundenliste (auch eigene Ja/Nein- und Auswahlfelder)
 │   ├─ bausteine.ts ..... Textbausteine: Startliste, prüfen, an Notiz anhängen, verschieben
 │   ├─ einstellungsdatei.ts  Einstellungen ohne Kunden übertragen (Paket bauen/prüfen)
 │   ├─ produkte.ts ...... Produktkatalog prüfen, filtern, suchen; Markierungen „Produkte im Gespräch“
 │   ├─ foerderung.ts .... Förderung/Rechtsgrundlagen PV + WP: Abschnitte mit Quellen, Zeitleiste, Filter, Kopiertext
 │   ├─ amortisation.ts .. grober Amortisationsrechner PV/WP (Annahmen, Jahreswerte, Staffel, Höchstpreis, Kopiertext)
 │   ├─ rechnervorlagen.ts  Startwerte des Rechners je Kundentyp (Privat, Gewerbe, eigene), Normalisierung, zuletzt gewählte Vorlage
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
 ├─ src/ui/symbole.ts .... einheitliche Linien-Symbole (Leiste, „Mehr“, Einstellungen), inline SVG
 ├─ src/ui/kontakt.ts .... Anrufen, E-Mail (Mailprogramm-Wahl)
 ├─ src/ui/enpaldoku.ts .. Enpal-Gesprächsdokumentation
 ├─ src/ui/navi.ts ....... „Hinfahren“ (Apple Karten / Google Maps)
 ├─ src/ui/badge.ts ...... Zahl am App-Symbol
 ├─ src/ui/update.ts ..... Update-Hinweis, „Was ist neu“ (Texte in src/neuigkeiten.ts)
 ├─ src/ui/kalender.ts ... Monats-/Wochen-/Tagesansicht, Termin per Fingertipp, Griffe zum Verschieben/Ziehen, Leihgaben
 ├─ src/ui/terminkarte.ts  Termin-Karte (Route, Anrufen, E-Mail, Termin bestätigen, Erledigt, Bearbeiten, Löschen)
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
 ├─ src/demo-gebiet.ts  Beispielkunden im Beratungsgebiet (fester Startwert)
 ├─ src/ui/ziehsortieren.ts  Listen per Griff umsortieren (Zeiger + Pfeiltasten)
 ├─ src/core/anrede.ts  Anrede (Vorauswahl) und Titel: alte Freitexte aufteilen, Titel für die Begrüßung (rein)
 ├─ src/core/kundenexport.ts  Kundenliste als Tabelle, CSV und XLSX (eigene ZIP-Erzeugung, rein, in Node getestet)
 ├─ src/core/listenimport.ts  Vorwerk-PDF-Liste: Zeilen aus Textstücken, Abgleich, Übernahme (rein, in Node getestet)
 ├─ src/ui/kundenexport.ts  Export-Dialog der Kundenliste, PDF mit jsPDF (lazy geladen)
 ├─ src/ui/listenimport.ts  PDF wählen, mit pdf.js lesen (lazy geladen), Vorschau-Dialog
 ├─ src/core/kundenwahl.ts  Kundensuche und „zuletzt benutzt“ für Auswahlfelder (rein)
 ├─ src/core/bestandkunde.ts  Geräte aus Sicht eines Kunden, Verkauf buchen (rein)
 ├─ src/ui/bestandkunde.ts  Block „Aus meinem Bestand“, Geräteauswahl, Verkaufsdialog
 ├─ src/core/feiertage.ts  Feiertage Niedersachsen (Ostern nach Gauß), nur Anzeige
 ├─ src/core/fotos.ts  Kundenfotos: Beschreibung, Statistik, Alter, benutzte Bilddaten (rein)
 ├─ src/storage/fotos.ts  Fotos verkleinern, mit Fotoschlüssel verschlüsseln, Tabelle „fotos“, Sicherung
 ├─ src/storage/fotodatei.ts  Fotos aus der Sicherungsdatei lesen
 ├─ src/ui/kundenfotos.ts  Reiter „Fotos“ und Vollansicht mit Zoom
 ├─ src/ui/tour.ts  Willkommen und Rund-Tour (Hervorhebung der Navigation, Merker tourGesehen)
 ├─ src/core/bestandvorlage.ts  Produkt → Bestand: passt als Gerät/Material, Vorbelegung, „schon im Bestand“ (rein)
 ├─ src/ui/katalogfeld.ts  Bezeichnung mit Katalogsuche für neue Geräte und neues Material
 ├─ src/core/material.ts  Verbrauchsmaterial: buchen, Mindestbestand, Nachbestellliste (rein)
 ├─ src/ui/material.ts  Abschnitt im Bestand, Buchungsdialog, „Muster mitgeben“
 ├─ src/core/abgleich.ts  Abgleich-Urteil (neuer/älter/gleich/Konflikt) für iCloud-Drive-Dateien (rein)
 ├─ src/ui/abgleich.ts  Leiste beim Start, Datei holen, in iCloud sichern, Ersteinrichtung aus Sicherung
 ├─ src/core/schnellwahl.ts  Wiedervorlage-Schnellwahl: Zieldatum je Schritt (rein)
 ├─ src/ui/schnellwahl.ts  Knopfreihe unter datetime-Feldern, ein Klick-Handler am document
 ├─ src/core/vertrieb.ts  Angebote (Frist, Summe, Nachfassen), Auftragsstand und Pflege, Ansprechpartner, Haustür, Terminbestätigung, Tagesroute (rein)
 ├─ src/ui/vertrieb.ts  Reiter „Angebot & Auftrag“, Ansprechpartner und Haustür in der Kundenübersicht, Dialog „Termin bestätigen“
 ├─ src/demo-vertrieb.ts  Beispiel-Angebote, Aufträge, Ansprechpartner, Haustür und ein Tag für die Tagesroute
 ├─ src/core/abhaken.ts  Abhaken mit Notiz und Folge-Wiedervorlage (rein)
 ├─ src/ui/abhaken.ts  Fenster „Wie ging's aus?“ für Haken und Termin-Karte
 ├─ src/core/naechstes.ts  „Als Nächstes“ auf der Übersicht: Auswahl und Zeittext (rein)
 ├─ src/ui/schnellnotiz.ts  Notiz-Fenster ohne Kundenseite (Kundenliste, „+“)
 ├─ src/ui/plusknopf.ts  schwebender „+“-Knopf: Notiz, Termin, neuer Kunde
 ├─ src/ui/kundenwahl.ts  Suchfeld mit Treffern; verstecktes Feld behält den alten Namen
 ├─ tests/testliste-pdf.cjs  erzeugt eine Beispiel-PDF mit erfundenen Daten für die Tests
 ├─ src/ui/produkte.ts ... Kacheln, Produktdetail (mit „Zu meinem Bestand hinzufügen“), Markieren-Block (Kartei, Gesprächsmodus)
 ├─ src/ui/views/produkte.ts  Produktübersicht #/produkte (auch im Beratungs-Schutz)
 ├─ src/ui/rechner.ts .... Rechner „Wann rechnet sich das?“ (Baustein, nur Arbeitsspeicher, übernimmt Kundenangaben)
 ├─ src/ui/views/rechner.ts  Rechner #/rechner?kunde=ID&art=pv|wp (eigener Menüpunkt, auch im Beratungs-Schutz)
 ├─ src/ui/rechnervorlagen.ts  Einstellungen → Vertrieb → Rechner-Vorlagen (Privat, Gewerbe, eigene)
 ├─ src/ui/ruecksprung.ts  merkt Adresse + Scrollstelle vor einem verzahnten Schritt (Links ins Gespräch automatisch), `zurueck()` führt nach dem Abstecher dorthin, Router stellt die Scrollstelle wieder her
 ├─ src/core/verzahnung.ts  was eine Auswahl für den nächsten Schritt bedeutet: „Vereinbart“ → Ergebnis/Status/Wiedervorlage, Status zum Ergebnis, Querverkauf, nächster Stopp (rein)
 ├─ src/ui/folgeschritte.ts  Fenster „Als Nächstes“ nach dem Gespräch (Termin bestätigen, Angebot erfassen, Auftrag, Enpal-Doku, Partner, Querverkauf, nächster Termin)
 ├─ src/ui/views/foerderung.ts  Förderung #/foerderung (auch im Beratungs-Schutz, iPhone und iPad hochkant unter „Mehr“)
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
- < 900 px (Handy und iPad hochkant): Leiste unten mit den Hauptbereichen und „Mehr“ (übrige Bereiche, Rund-Tour, Sperren).
- ≥ 640 px: Formulare zweispaltig, Bereichsleiste der Übersicht nebeneinander, sobald jede Zeile mindestens 300 px hat.
- ≥ 900 px (Tablet quer, Laptop): Seitenleiste links, Inhalte zweispaltig.
