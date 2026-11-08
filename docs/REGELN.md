# Regeln und Konventionen

Diese Regeln gelten für **jede** Änderung an Sperling – egal ob von Mensch oder KI. Wer etwas ändert, prüft vorher diese Liste.

## Fachliche Regeln

**R-TEXT – Strikte Trennung der Textgeneratoren.**
Seit 0.10.4 gibt es drei getrennte Texte, einen je Anbieter: Photovoltaik (Enpal), Wärmepumpe (GALVANY), Vorwerk. Jeder darf nur Stammdaten + seinen eigenen Bereich enthalten. Umsetzung in `src/core/textgen.ts`:
1. `projizieren()` erzeugt eine Kopie, die physisch nur den erlaubten Bereich enthält.
2. Notizen kommen nur in einen Text, wenn sie den eigenen Bereich tragen und sonst keinen. Einzige Ausnahme: ältere Notizen mit genau PV + WP (aus der Zeit des gemeinsamen Enpal-Texts) stehen im PV- und im WP-Text. Mit Vorwerk gemischte oder unmarkierte Notizen erscheinen in keinem Text (die UI zeigt „nicht in Texten“). Der Gesprächsmodus führt je Bereich eine eigene Notiz.
3. Vorlagen können nur feste Platzhalter (`PLATZHALTER`) nutzen, keine Objektpfade.
4. Die Enpal-Gesprächsdokumentation (`enpalKontakte`) erscheint nur in der Photovoltaik-Projektion und zeigt nur das Thema `pv`.
6. Produkt-Markierungen (`kunde.produkte`) kommen nur in die Projektion, wenn ihr Bereich zur Gruppe gehört.
5. Eigene Felder (Feldverwaltung) kommen nur in die Projektion, wenn ihre Kategorie `kontakt` oder eine Sparte der Gruppe ist. Ohne Felddefinitionen enthält die Projektion keine eigenen Werte. Ausgeblendete Felder erscheinen in keinem Text.
Tests in `tests/core.test.mjs` sichern das ab. Diese Tests dürfen nie gelöscht oder abgeschwächt werden.

**R-STAMM – Ein Kunde existiert nur einmal.** Sparten sind Eigenschaften des Kunden, keine Kopien.

**R-ZEIT – Notiz-Zeitstempel:** Standard ist der Moment des Speicherns. Ändert der Nutzer das Zeitfeld, gilt sein Wert. Bearbeiten ist jederzeit möglich. Gespeichert wird immer als ISO-String in UTC.

**R-LOESCH – Nie stillschweigend Daten verwerfen.** Löschen nur nach Bestätigung. Gelöschtes kommt in die Liste „Gelöscht“ (`papierkorb`) und verfällt nie von selbst; endgültig weg ist es erst, wenn es dort einzeln mit Bestätigung gelöscht wird (kein „Alles leeren“). Termine eines gelöschten Kunden bleiben ohne Kundenbezug erhalten. Migration repariert, statt zu verwerfen.

**R-KONTAKT – Anrufen und E-Mail.** Anrufe nur nach Sicherheitsabfrage (`anrufen()` in `src/ui/kontakt.ts`), nie direkte `tel:`-Links. E-Mails werden nur vorbereitet und im Mailprogramm geöffnet; Sperling verschickt selbst nichts. Gmail/Outlook im Browser bekommen Empfänger, Betreff und Text nur, weil der Nutzer es in diesem Moment auslöst (Ausnahme zu R-EXTERN, durch Nutzeraktion). Gleiches gilt für die Terminbestätigung (`bestaetigungSenden()` in `src/ui/vertrieb.ts`): SMS (`sms:`) und WhatsApp (`https://wa.me/…`) bekommen Telefonnummer und den vom Nutzer geprüften Text nur auf Tippen; die Nachricht verschickt immer das Gerät des Nutzers. Der Text nennt keine Anbieter und keine Preise. Bei „Keine Werbung erwünscht“ warnt der Dialog.

**R-ENPAL-DOKU – Gesprächsdokumentation für Enpal.** Jeder Enpal-Kontakt (Telefon, Hausbesuch) wird beim Kunden in `enpalKontakte` gespeichert und als kopierfertiger Text für die Enpal-App angeboten. Der Gesprächsleitfaden legt bei PV/WP automatisch einen Eintrag an. Fristen können als Wiedervorlage in die Termine.

**R-WERBUNG – „Keine Werbung erwünscht“.** Ist das jüngste Haustür-Ergebnis eines Kunden `werbeverbot`, schlägt Sperling ihn nirgends zum Besuch vor (Tagesroute), zeigt beim Kunden ein Warnband und warnt vor einer Terminbestätigung. Aufgehoben wird es nur durch ein neueres Haustür-Ergebnis.

**R-LEITFADEN – Seriöse Gesprächsführung.** Klemmbrett-Fragen (`src/core/klemmbrett.ts`) und Einwandbehandlung (`src/core/einwaende.ts`) nutzen nur kundenorientierte Methoden: Fragen, Zuhören, ehrliche Empfehlung, freiwilliger nächster Schritt. Keine künstliche Verknappung, kein Angstmachen, kein Drängen zur Unterschrift, keine Preise, Förderquoten oder Renditeversprechen (UWG §§ 4a, 5, 7). Das Widerrufsrecht (14 Tage bei Haustür- und Telefonverträgen) wird aktiv erklärt. Ein Unit-Test prüft verbotene Formulierungen.

**R-FLOW – Verzahnen, dann zurück.** Führt eine Auswahl zu einem klaren nächsten Schritt, bietet Sperling ihn direkt an (Fenster oder vorausgefülltes Feld), statt Jan suchen zu lassen. Vorschläge sind immer änderbar und nie Pflicht; „Nein, danke“/„Später“/„Fertig“ beendet sie. Ist der Abstecher erledigt oder abgebrochen, geht es an genau die Stelle zurück, von der Jan kam (Seite, Reiter, Scrollstelle; `src/ui/ruecksprung.ts`). Neue Abstecher merken sich die Stelle vor dem Wechsel (`ruecksprung.merken()`, Links ins Gespräch automatisch) und kehren mit `ruecksprung.zurueck()` zurück. Logik der Vorschläge rein und getestet in `src/core/verzahnung.ts`.

## Sicherheit

**R-KRYPTO** – Kundendaten verlassen den Arbeitsspeicher nur verschlüsselt (IndexedDB, Backup/iCloud-Datei). Nie `localStorage` oder `sessionStorage` für Kundendaten. Ausnahmen: in `localStorage` nur das gewählte Farbschema (`sperling.farbschema`) das gewählte Mailprogramm (`sperling.mailprogramm`) die zuletzt gesehene Version für „Was ist neu“ (`sperling.version`) und die Hilfe-Vorlieben des Geräts (`sperling.hilfe`: ?-Knöpfe an/aus, „auf diesem Gerät installiert“, Installationshinweis weggeklickt, Rund-Tour gesehen). „Zuletzt geöffnet“ der Kommandozeile enthält Kunden-IDs und liegt deshalb im verschlüsselten Bestand (`einstellungen.zuletzt`). Fotos und Unterschriften sind Kundendaten und liegen nur verschlüsselt vor (Belege im Bestand; Kundenfotos in der Tabelle `fotos`, verschlüsselt mit dem Fotoschlüssel aus dem verschlüsselten Bestand); das PDF entsteht im Arbeitsspeicher und verlässt das Gerät nur, wenn der Nutzer es teilt. Gleiches gilt für den Export der Kundenliste (PDF, Excel, CSV, seit 0.13.9): Er ist eine bewusste, unverschlüsselte Ausnahme auf Tippen, der Dialog sagt das deutlich; exportiert werden nur Stammdaten, Status und letzter Kontakt, nie Notizen, Gespräche, Fotos oder eigene Felder.

**R-BEISPIEL** – Beispieldaten dürfen echte Kunden, Termine, Geräte, Leihvorgänge, Reservierungen, Papierkorb und Einstellungen nie verändern oder entfernen. Umsetzung: (1) Beispiele tragen das ID-Präfix `demo-` bzw. `demob-`, echte IDs sind UUIDs. (2) Jede Beispiel-Aktion läuft über `beispielSicher()` in `src/demo.ts`: Sie arbeitet auf einer Kopie, vergleicht danach jeden echten Datensatz mit dem Stand vorher und übernimmt nur, wenn alles Echte unverändert ist und nichts ohne Beispiel-Kennung dazukam; sonst Abbruch ohne jede Änderung. (3) Geräte mit echtem Verleih oder echter Reservierung bleiben beim Entfernen erhalten. (4) Der Demo-Modus speichert nie (`doSave()` verweigert) und startet nie über einen entsperrten echten Bestand. (5) Jede Speicherung legt den vorherigen Stand als automatische Version ab. Tests: „Sicherheitsprüfung“ in `tests/core.test.mjs`.

**R-XSS** – Jeder Nutzertext, der in `innerHTML` landet, geht durch `esc()` aus `src/core/util.ts`. Auch Attribute (`value="${esc(x)}"`). Neue Ansichten werden im E2E-Test mit einem `<img onerror>`-Namen geprüft.

**R-EXTERN** – An Dritte gehen nur: Kartenausschnitte (Esri/OSM), Koordinaten oder eingegebene Adresse (Nominatim), Abrufe der Produktbilder bei den Herstellern (nur verlinkt, ohne Referrer, ohne Kundenbezug; der Service Worker speichert jedes Bild nach dem ersten Abruf auf dem Gerät zwischen, Cache `sperling-produktbilder-v1`, damit es nur einmal geladen wird; Bilder nie ins Repo). Die verschlüsselte Sicherungsdatei verlässt das Gerät nur, wenn der Nutzer sie selbst teilt (iCloud Drive). Eine importierte PDF-Liste wird nur auf dem Gerät gelesen (pdf.js, keine Übertragung); für neue Kunden wird nur die Adresse geokodiert. Nie Namen, Telefonnummern oder Notizen. Der Export der Kundenliste schickt nichts an Dritte; die Datei geht nur über das Teilen-Menü oder den Download dorthin, wohin der Nutzer sie selbst gibt. Die Adresssuche der Karte prüft deshalb zuerst lokal, ob der Suchtext ein Kundenname ist; dann geht keine Anfrage raus. „Ganze Route in Google Maps“ (Tagesroute) übergibt nur Koordinaten der Termine, keine Namen oder Adressen, und nur auf Tippen. Quellenlinks im Reiter „Förderung“ öffnen nur auf Tippen (neuer Tab, `noopener noreferrer`), die Seite selbst lädt nichts von außen.

**R-FOERDERUNG – Förderinhalte.** Jeder Abschnitt in `src/core/foerderung.ts` hat mindestens eine Quelle (amtliche bevorzugt) und ein Prüfdatum; Geplantes ist als „Geplant“ gekennzeichnet, nie als geltendes Recht. Der Hinweis „keine Rechts- oder Steuerberatung“ steht auf der Seite und in jedem Kopiertext. Kein Verkaufsdruck (wie R-LEITFADEN), keine Renditeversprechen. Unit-Tests sichern Quellen, Hinweis und Ton ab. Der Rechner „Wann rechnet sich das?“ zeigt nur Schätzungen mit sichtbaren, änderbaren Annahmen und dem Hinweis „ohne Gewähr“ (auch im Kopiertext); er speichert nichts. Übernommene Kundenangaben (seit 0.13.4) bleiben nur im Arbeitsspeicher und werden beim Öffnen ohne Kunden verworfen.

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

**R-KEINE-ABHÄNGIGKEITEN** – Kein Framework. TypeScript mit Build-Schritt (Vite) seit 0.9.0; zur Laufzeit nur eigener Code. Entwicklungs-Abhängigkeiten: `vite`, `typescript`, `@types/node`. Laufzeit-Bibliotheken: Leaflet 1.9.4 (Karte), jsPDF 4.2.1 (PDF, nur bei Bedarf nachgeladen) und qrcode-generator 1.4.4 (QR-Code für „Meine Kontaktseite“, offline erzeugt, nur bei Bedarf nachgeladen; klein, ohne eigene Abhängigkeiten), alle lokal in `public/vendor/` (offline-fähig, MIT-Lizenz). Neue Bibliotheken nur lokal einbinden und hier begründen.

**R-TYPEN** – `npm run check` muss 0 Fehler zeigen (`strict`). Datentypen werden aus den `normalize…()`-Funktionen abgeleitet (`Kunde`, `Termin` … in `src/core/model.ts`), nie doppelt gepflegt. `querySelector` liefert projektweit Eingabefelder statt `null` (`src/globals.d.ts`): nur für Elemente, die die Ansicht gerade selbst gerendert hat; was fehlen kann, mit `?.`. `any` nur mit Begründung im Kommentar.

**R-SW** – Der Service Worker (`src/sw.ts`) bekommt Dateiliste und Version beim Build eingesetzt (Plugin in `vite.config.ts`). Von Hand ist nichts nachzutragen; neue statische Dateien gehören nach `public/`.

**R-VERSION** – Die Versionsnummer steht nur in `package.json`. App (`__APP_VERSION__`) und Service-Worker-Cache übernehmen sie beim Build. Eintrag in `CHANGELOG.md` und in `src/neuigkeiten.ts` („Was ist neu“).

**R-TEST** – Vor jeder Auslieferung: `npm test` und `npm run test:e2e` grün. Neue Kernlogik bekommt Unit-Tests.

**R-DOKU** – Nach jeder Änderung `docs/STAND.md` (erledigt/offen) aktualisieren; bei neuen Regeln diese Datei; bei Strukturänderungen `ARCHITEKTUR.md`.

## Stil

- Sprache in UI, Kommentaren und Doku: **Deutsch**. Bezeichner überwiegend deutsch (`kunde`, `termine`, `mutate` als Ausnahme für den etablierten Begriff).
- UI-Texte sagen, was passiert („Gespeichert“, „Sicherung herunterladen“), Fehler sagen, was zu tun ist.
- Touch-Ziele mindestens 44 px hoch (Hauptknöpfe), kleine Ziele auf Touch nie unter 24 px. Mobile zuerst, Tablet ab 640 px, Seitenleiste ab 900 px; darunter muss jeder Bereich über die Leiste oder „Mehr“ erreichbar sein.
- Textkontrast mindestens 4,5:1 (WCAG AA) in hell und dunkel; Farbe nie als einziges Merkmal.
- Farben nur als CSS-Variablen in `:root` (`css/app.css`), dunkle Werte in den beiden Dunkel-Blöcken darunter. Keine festen Farbwerte in Komponenten-Regeln, sonst bricht der Dark Mode. Status-Farben nur in `STATUS` (`model.js`).
- Keine nativen `alert/confirm/prompt` – immer `dialog()` / `bestaetigen()` aus `src/ui/dom.ts`.
