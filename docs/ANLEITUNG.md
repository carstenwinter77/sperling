# Anleitung

## 1. Lokal ausprobieren (Mac)

1. Ordner `Sperling` öffnen, Doppelklick auf `start.command` (beim ersten Mal: Rechtsklick → Öffnen). Beim ersten Start werden die Werkzeuge installiert (Node.js nötig).
2. Der Browser öffnet `http://localhost:8765`. Master-Passwort festlegen.
3. Demo ohne Speicherung: `http://localhost:8765/?demo`

## 2. Für Tablet und Handy bereitstellen (Hosting)

Sperling ist eine statische Web-App. Gewählt: **GitHub Pages** (kostenlos, HTTPS, Updates kommen automatisch mit jedem Push).

1. GitHub → Repo `sperling` → Settings → General → ganz unten „Change visibility“ → **Public** (mit kostenlosem Konto nötig; im Repo liegen keine Kundendaten).
2. Settings → **Pages** → Source **„GitHub Actions“** (seit 0.9.0; vorher „Deploy from a branch“). Bei jedem Push auf `main` prüft, testet und baut GitHub die App und stellt sie bereit (Reiter „Actions“ zeigt den Lauf).
3. Nach 2–3 Minuten: `https://carstenwinter77.github.io/sperling/`
4. Empfehlung: Zwei-Faktor-Anmeldung für das GitHub-Konto einschalten (wer das Konto übernimmt, könnte den Code ändern).

Andere Anbieter (z. B. Cloudflare Pages) gehen genauso: `npm run build` ausführen und den Ordner `dist/` hochladen.
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

- **Adresse finden:** Karte → oben Adresse eingeben (z. B. „Lindenweg 4 Hannover“) → Suchen. Die Karte zoomt hinein und bietet „Als Potenzial markieren“ / „Kunde anlegen“ an. Beim Öffnen springt die Karte auf deinen Standort (Standortzugriff erlauben).
- **Haus markieren:** Karte → lange auf das Haus tippen (Laptop: Rechtsklick) → „Als Potenzial markieren“ oder „Kunde anlegen“. Die Adresse wird vorgeschlagen.
- **Gesprächsnotiz:** Kunde → Notizen → Text, Sparten ankreuzen, Zeitpunkt bleibt „jetzt“ oder wird geändert. Häkchen „danach Wiedervorlage anlegen“ für einen separaten Termin (z. B. Vorwerk-Vorführung).
- **Texte für Enpal bzw. Vorwerk:** Kunde → Texte → „In Zwischenablage kopieren“. Notizen erscheinen nur in dem Text, zu dessen Sparten sie ausschließlich gehören.
- **Kalender in Sperling:** Termine → Monat, Woche oder Tag. Im Monat einen Tag antippen = neuer Termin; auf die Tageszahl tippen = Tagesansicht. In Woche/Tag eine Uhrzeit antippen = Termin über 1 Stunde; für eine andere Dauer den Finger kurz halten und nach unten ziehen. Termin antippen = bearbeiten oder löschen.
- **In den Gerätekalender übernehmen:** Bei jedem Termin 📅 → `.ics`-Datei öffnen.
- **Hinfahren:** 🚗 beim Kunden, auf der Karte oder beim Termin öffnet die Navigation (Apple Karten oder Google Maps, Einstellungen → Navigation).
- **Gerät reservieren:** Bestand → Gerät → Reservieren → Kunde und Zeitraum. Belegte Zeiträume werden abgelehnt. Am Tag selbst „Jetzt verleihen“.
- **Leihschein:** Beim Verleihen Fotos vom Zustand machen und den Kunden auf dem Tablet unterschreiben lassen. Danach „Teilen / Speichern“ schickt das PDF per Mail oder legt es in Dateien ab. Bei der Rücknahme genauso (Rückgabeschein).
- **Kundenansicht:** Kunde → „Kundenansicht“ → Tablet dem Kunden geben. Was er sieht, legst du unter Einstellungen → „Kundenansicht zum Herzeigen“ fest (Standard: Name, Adresse, Erfassungsbögen ohne Bemerkungen, Leihgeräte; wahlweise auch Telefon/E-Mail, Status, kommende Termine, Gesprächsnotizen). Andere Kunden sieht er nie. Beenden nur mit Master-Passwort oder Face ID.
- **Gelöscht:** Versehentlich gelöscht? Kunden → ganz unten „Gelöscht“ → Wiederherstellen. Nichts verfällt von selbst; endgültig weg ist ein Eintrag erst, wenn du ihn dort einzeln endgültig löschst.
- **Vorführgerät verleihen:** Bestand → Gerät → Verleihen → Kunde und „zurück bis“. Die Nachfrage-Erinnerung erscheint unter Termine. Bei Rückgabe „Zurückgenommen“ oder „Kunde kauft es“.
- **Telefonat mit Einwänden:** Kunde → „Gesprächsleitfaden“ (oder Leiste → Gespräch). Sparte wählen, Einwand antippen, Gegenargumente vorlesen, Ergebnis markieren. Am Ende „Als Notiz speichern“.
- **Enpal-Dokumentation:** Kunde → Enpal-Doku → „Telefonat dokumentieren“ bzw. „Hausbesuch dokumentieren“ → Speichern → „Text kopieren“ → in der Enpal-App beim Lead einfügen. Beim Gesprächsleitfaden entsteht der Eintrag automatisch.
- **Anrufen / E-Mail:** Kunde → Übersicht → „Anrufen“ (mit Rückfrage) oder „E-Mail schreiben“. Mailprogramm wählen, Häkchen „merken“ setzt es als Vorauswahl. Änderbar unter Einstellungen → E-Mail.
- **Beispielkunden zum Üben/Zeigen:** Einstellungen → Beispielkunden → „Beispielkunden laden“. Später „Beispielkunden entfernen“ – echte Kunden bleiben.
- **Face ID / Touch ID:** Nach dem ersten Entsperren fragt Sperling, ob Face ID genutzt werden soll (oder Einstellungen → Sicherheit). Danach auf dem Sperrbildschirm „Mit Face ID entsperren“. Geht nur in der installierten App, iPhone/iPad ab iOS 18. Nach einem Passwortwechsel neu einrichten.
- **Beispiel-Vorführbestand:** Einstellungen → Beispieldaten → „Beispielbestand laden“ (Kobold-Geräte zum Ausprobieren), später „entfernen“.
- **Hell / Dunkel:** Einstellungen → Darstellung.

## 5. Datensicherung

- **iCloud (iPad/iPhone):** Einstellungen → **„In iCloud / Dateien sichern“** → „Jetzt sichern“ → im Teilen-Menü **„In Dateien sichern“** → iCloud Drive → Ordner (z. B. „Sperling“) → Sichern. Die Datei ist verschlüsselt.
- **Zurückholen / neues Gerät:** Master-Passwort einrichten → Einstellungen → **„Sicherung einspielen“** → Datei in iCloud Drive wählen → Passwort der Sicherung eingeben.
- Ohne Dropbox erinnert die Übersicht nach 7 Tagen an eine neue Sicherung.
- Am Laptop: **Sicherung herunterladen** erzeugt dieselbe verschlüsselte `.sperling`-Datei.
- Einspielen fragt nach dem Passwort der Sicherung. Der vorherige Stand bleibt unter „Automatische Versionen“ erhalten.
- **Passwort vergessen = Daten nicht wiederherstellbar.** Passwort sicher notieren.
