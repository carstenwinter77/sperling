# Regeln und Konventionen

Diese Regeln gelten für **jede** Änderung an Sperling – egal ob von Mensch oder KI. Wer etwas ändert, prüft vorher diese Liste.

## Fachliche Regeln

**R-TEXT – Strikte Trennung der Textgeneratoren.**
Der Enpal-Text darf nur Stammdaten + Photovoltaik + Wärmepumpe enthalten, der Vorwerk-Text nur Stammdaten + Vorwerk. Umsetzung in `src/core/textgen.ts`:
1. `projizieren()` erzeugt eine Kopie, die physisch nur die erlaubten Sparten enthält.
2. Notizen kommen nur in einen Text, wenn sie mindestens eine Sparte haben und **alle** Sparten zur Gruppe gehören. Gemischte oder unmarkierte Notizen erscheinen in keinem Text (die UI zeigt „nicht in Texten“).
3. Vorlagen können nur feste Platzhalter (`PLATZHALTER`) nutzen, keine Objektpfade.
4. Die Enpal-Gesprächsdokumentation (`enpalKontakte`) erscheint nur in der Enpal-Projektion, ihre Themen sind nur `pv`/`wp`.
Tests in `tests/core.test.mjs` sichern das ab. Diese Tests dürfen nie gelöscht oder abgeschwächt werden.

**R-STAMM – Ein Kunde existiert nur einmal.** Sparten sind Eigenschaften des Kunden, keine Kopien.

**R-ZEIT – Notiz-Zeitstempel:** Standard ist der Moment des Speicherns. Ändert der Nutzer das Zeitfeld, gilt sein Wert. Bearbeiten ist jederzeit möglich. Gespeichert wird immer als ISO-String in UTC.

**R-LOESCH – Nie stillschweigend Daten verwerfen.** Löschen nur nach Bestätigung. Gelöschtes kommt in die Liste „Gelöscht“ (`papierkorb`) und verfällt nie von selbst; endgültig weg ist es erst, wenn es dort einzeln mit Bestätigung gelöscht wird (kein „Alles leeren“). Termine eines gelöschten Kunden bleiben ohne Kundenbezug erhalten. Migration repariert, statt zu verwerfen.

**R-KONTAKT – Anrufen und E-Mail.** Anrufe nur nach Sicherheitsabfrage (`anrufen()` in `src/ui/kontakt.ts`), nie direkte `tel:`-Links. E-Mails werden nur vorbereitet und im Mailprogramm geöffnet; Sperling verschickt selbst nichts. Gmail/Outlook im Browser bekommen Empfänger, Betreff und Text nur, weil der Nutzer es in diesem Moment auslöst (Ausnahme zu R-EXTERN, durch Nutzeraktion).

**R-ENPAL-DOKU – Gesprächsdokumentation für Enpal.** Jeder Enpal-Kontakt (Telefon, Hausbesuch) wird beim Kunden in `enpalKontakte` gespeichert und als kopierfertiger Text für die Enpal-App angeboten. Der Gesprächsleitfaden legt bei PV/WP automatisch einen Eintrag an. Fristen können als Wiedervorlage in die Termine.

## Sicherheit

**R-KRYPTO** – Kundendaten verlassen den Arbeitsspeicher nur verschlüsselt (IndexedDB, Backup/iCloud-Datei, Dropbox). Nie `localStorage` oder `sessionStorage` für Kundendaten. Ausnahmen: in `sessionStorage` der kurzlebige Dropbox-OAuth-Code/-Verifier während der Anmeldung; in `localStorage` nur das gewählte Farbschema (`sperling.farbschema`) das gewählte Mailprogramm (`sperling.mailprogramm`) die zuletzt gesehene Version für „Was ist neu“ (`sperling.version`) und die Hilfe-Vorlieben des Geräts (`sperling.hilfe`: ?-Knöpfe an/aus, „auf diesem Gerät installiert“, Installationshinweis weggeklickt). „Zuletzt geöffnet“ der Kommandozeile enthält Kunden-IDs und liegt deshalb im verschlüsselten Bestand (`einstellungen.zuletzt`). Fotos und Unterschriften sind Kundendaten und liegen nur im verschlüsselten Bestand; das PDF entsteht im Arbeitsspeicher und verlässt das Gerät nur, wenn der Nutzer es teilt.

**R-XSS** – Jeder Nutzertext, der in `innerHTML` landet, geht durch `esc()` aus `src/core/util.ts`. Auch Attribute (`value="${esc(x)}"`). Neue Ansichten werden im E2E-Test mit einem `<img onerror>`-Namen geprüft.

**R-EXTERN** – An Dritte gehen nur: Kartenausschnitte (Esri/OSM), Koordinaten oder eingegebene Adresse (Nominatim), die verschlüsselte Datei (Dropbox). Nie Namen, Telefonnummern oder Notizen. Die Adresssuche der Karte prüft deshalb zuerst lokal, ob der Suchtext ein Kundenname ist; dann geht keine Anfrage raus.

**R-PASSWORT** – Mindestens 8 Zeichen. Keine Wiederherstellung, keine Hintertür. Face ID/Touch ID ist nur eine Abkürzung: Das Passwort liegt dafür AES-verschlüsselt mit einem Schlüssel aus der Passkey-PRF-Erweiterung in IndexedDB (`meta.biometrie`), nie im Klartext. Ohne PRF kein Face ID. Passwortwechsel löscht diesen Eintrag.

## Technik

**R-ÄNDERN** – Daten nur über `store.mutate(fn)` ändern. Ausnahme: reine Ansichtswerte (Kartenposition), die keinen eigenen Speichervorgang brauchen.

**R-SCHEMA** – Jede Änderung am Datenmodell: `SCHEMA_VERSION` erhöhen, Migrationsschritt in `migrate()` ergänzen, `normalize…()` anpassen, `docs/DATENMODELL.md` und Tests aktualisieren. Ältere Daten müssen immer weiter lesbar bleiben.

**R-ABSTURZ** – Keine Ansicht darf die App zum Absturz bringen:
- Der Router fängt Fehler jeder Ansicht ab und zeigt eine Fehlerseite.
- Globale Handler (`error`, `unhandledrejection`) zeigen einen Hinweis statt still zu scheitern.
- Netzwerkzugriffe haben Timeouts und verständliche deutsche Fehlermeldungen.
- Eingaben werden validiert (`parseNumber`, `localInputToIso`, `isValidCoord`), ungültige Werte werden `null`, nie `NaN`.
- Speicherfehler setzen `dirty` zurück auf `true`, damit nichts verloren geht.

**R-KEINE-ABHÄNGIGKEITEN** – Kein Framework. TypeScript mit Build-Schritt (Vite) seit 0.9.0; zur Laufzeit nur eigener Code. Entwicklungs-Abhängigkeiten: `vite`, `typescript`, `@types/node`. Laufzeit-Bibliotheken: Leaflet 1.9.4 (Karte) und jsPDF 4.2.1 (PDF, nur bei Bedarf nachgeladen), beide lokal in `public/vendor/` (offline-fähig, MIT-Lizenz). Neue Bibliotheken nur lokal einbinden und hier begründen.

**R-TYPEN** – `npm run check` muss 0 Fehler zeigen (`strict`). Datentypen werden aus den `normalize…()`-Funktionen abgeleitet (`Kunde`, `Termin` … in `src/core/model.ts`), nie doppelt gepflegt. `querySelector` liefert projektweit Eingabefelder statt `null` (`src/globals.d.ts`): nur für Elemente, die die Ansicht gerade selbst gerendert hat; was fehlen kann, mit `?.`. `any` nur mit Begründung im Kommentar.

**R-SW** – Der Service Worker (`src/sw.ts`) bekommt Dateiliste und Version beim Build eingesetzt (Plugin in `vite.config.ts`). Von Hand ist nichts nachzutragen; neue statische Dateien gehören nach `public/`.

**R-VERSION** – Die Versionsnummer steht nur in `package.json`. App (`__APP_VERSION__`) und Service-Worker-Cache übernehmen sie beim Build. Eintrag in `CHANGELOG.md` und in `src/neuigkeiten.ts` („Was ist neu“).

**R-TEST** – Vor jeder Auslieferung: `npm test` und `npm run test:e2e` grün. Neue Kernlogik bekommt Unit-Tests.

**R-DOKU** – Nach jeder Änderung `docs/STAND.md` (erledigt/offen) aktualisieren; bei neuen Regeln diese Datei; bei Strukturänderungen `ARCHITEKTUR.md`.

## Stil

- Sprache in UI, Kommentaren und Doku: **Deutsch**. Bezeichner überwiegend deutsch (`kunde`, `termine`, `mutate` als Ausnahme für den etablierten Begriff).
- UI-Texte sagen, was passiert („Gespeichert“, „Sicherung herunterladen“), Fehler sagen, was zu tun ist.
- Touch-Ziele mindestens 44 px hoch. Mobile zuerst, Tablet ab 640 px, Seitenleiste ab 900 px.
- Farben nur als CSS-Variablen in `:root` (`css/app.css`), dunkle Werte in den beiden Dunkel-Blöcken darunter. Keine festen Farbwerte in Komponenten-Regeln, sonst bricht der Dark Mode. Status-Farben nur in `STATUS` (`model.js`).
- Keine nativen `alert/confirm/prompt` – immer `dialog()` / `bestaetigen()` aus `src/ui/dom.ts`.
