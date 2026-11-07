# Anleitung

## 1. Lokal ausprobieren (Mac)

1. Ordner `Sperling` öffnen, Doppelklick auf `start.command` (beim ersten Mal: Rechtsklick → Öffnen).
2. Der Browser öffnet `http://localhost:8765`. Master-Passwort festlegen.
3. Demo ohne Speicherung: `http://localhost:8765/?demo`

## 2. Für Tablet und Handy bereitstellen (Hosting)

Sperling ist eine statische Web-App. Empfehlung: **GitHub Pages** oder **Cloudflare Pages** (kostenlos, HTTPS).

- Den ganzen Ordner hochladen, außer `tests/`, `docs/`, `sperling-demo.html`, `start.command`.
- HTTPS ist Pflicht (Verschlüsselung, Offline-Modus und Dropbox funktionieren nur damit).
- Danach auf dem Tablet die Adresse öffnen und **„Zum Home-Bildschirm hinzufügen“** (iPad/iPhone: Teilen-Menü; Android/Chrome: Menü → App installieren). Ab dann startet Sperling wie eine normale App, auch offline.

Kundendaten liegen dabei **nie** auf dem Webserver, nur die Programmdateien.

## 3. Dropbox einrichten (einmalig)

1. https://www.dropbox.com/developers/apps → **Create app** → „Scoped access“ → **„App folder“** → Name z. B. `Sperling-Sync`.
2. Tab **Permissions**: `files.content.read` und `files.content.write` aktivieren → Submit.
3. Tab **Settings** → **Redirect URIs**: die Adresse eintragen, die Sperling unter Einstellungen → Dropbox anzeigt (z. B. `https://…/sperling/`). Für jedes Gerät mit anderer Adresse ebenfalls.
4. **App key** kopieren und in Sperling unter Einstellungen → Dropbox eintragen → „Mit Dropbox verbinden“.
5. Nach der Anmeldung kehrt man zu Sperling zurück, entsperrt – fertig.
6. Auf dem zweiten Gerät: **dasselbe Master-Passwort** einrichten, App-Key eintragen, verbinden. Sperling holt automatisch den neuesten Stand.

## 4. Bedienung in Kürze

- **Haus markieren:** Karte → lange auf das Haus tippen (Laptop: Rechtsklick) → „Als Potenzial markieren“ oder „Kunde anlegen“. Die Adresse wird vorgeschlagen.
- **Gesprächsnotiz:** Kunde → Notizen → Text, Sparten ankreuzen, Zeitpunkt bleibt „jetzt“ oder wird geändert. Häkchen „danach Wiedervorlage anlegen“ für einen separaten Termin (z. B. Vorwerk-Vorführung).
- **Texte für Enpal bzw. Vorwerk:** Kunde → Texte → „In Zwischenablage kopieren“. Notizen erscheinen nur in dem Text, zu dessen Sparten sie ausschließlich gehören.
- **Kalender:** Bei jedem Termin 📅 → `.ics`-Datei öffnen → wird in den Kalender übernommen.
- **Vorführgerät verleihen:** Bestand → Gerät → Verleihen → Kunde und „zurück bis“. Die Nachfrage-Erinnerung erscheint unter Termine. Bei Rückgabe „Zurückgenommen“ oder „Kunde kauft es“.
- **Telefonat mit Einwänden:** Kunde → „Gesprächsleitfaden“ (oder Leiste → Gespräch). Sparte wählen, Einwand antippen, Gegenargumente vorlesen, Ergebnis markieren. Am Ende „Als Notiz speichern“.
- **Enpal-Dokumentation:** Kunde → Enpal-Doku → „Telefonat dokumentieren“ bzw. „Hausbesuch dokumentieren“ → Speichern → „Text kopieren“ → in der Enpal-App beim Lead einfügen. Beim Gesprächsleitfaden entsteht der Eintrag automatisch.
- **Anrufen / E-Mail:** Kunde → Übersicht → „Anrufen“ (mit Rückfrage) oder „E-Mail schreiben“. Mailprogramm wählen, Häkchen „merken“ setzt es als Vorauswahl. Änderbar unter Einstellungen → E-Mail.
- **Hell / Dunkel:** Einstellungen → Darstellung.

## 5. Datensicherung

- Einstellungen → **Sicherung herunterladen** erzeugt eine verschlüsselte `.sperling`-Datei. Regelmäßig machen, auch mit Dropbox.
- Einspielen fragt nach dem Passwort der Sicherung. Der vorherige Stand bleibt unter „Automatische Versionen“ erhalten.
- **Passwort vergessen = Daten nicht wiederherstellbar.** Passwort sicher notieren.
