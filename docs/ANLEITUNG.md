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
- HTTPS ist Pflicht (Verschlüsselung und Offline-Modus funktionieren nur damit).
- Danach auf dem Tablet die Adresse öffnen und **„Zum Home-Bildschirm hinzufügen“** (iPad/iPhone: Teilen-Menü; Android/Chrome: Menü → App installieren). Ab dann startet Sperling wie eine normale App, auch offline.

Kundendaten liegen dabei **nie** auf dem Webserver, nur die Programmdateien.

## 3. Bedienung in Kürze

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
- **Gespräch starten:** Kunde → „📞 Gespräch starten“. Links die Kundendaten, rechts Kontaktart, Notizen (Enpal und Vorwerk getrennt), Leitfaden und Abschluss. Das Gespräch bleibt beim Seitenwechsel offen, bis es gespeichert oder verworfen wird. Die Historie steht im Tab „Verlauf“.
- **Suchen und Befehle:** Feld auf der Übersicht, Lupe in der Seitenleiste oder ⌘K / Strg+K. Am Treffer direkt Anrufen, E-Mail, Hinfahren, Notiz, Termin, Gespräch; mit Verb geht es schneller („müller anrufen“).
- **Beratungs-Schutz:** Beim Kunden unten rechts 🛡 tippen – alle anderen Kunden sind ausgeblendet. Aufheben mit Face ID oder Master-Passwort.
- **Letzter Kontakt:** Beim Kunden oben; antippen trägt einen Kontakt von Hand nach. Kundenliste: Filter „Kontakt älter als …“ und Sortierung „Längster Kontakt zuerst“.
- **Belegungskalender:** Bestand → „Belegungskalender“. Über freie Tage wischen reserviert direkt.
- **Auswertungen:** Bereich und Zeitraum wählen, mit ‹ › blättern, „PDF-Bericht“ zum Teilen.
- **Hilfe:** ?-Knopf neben jeder Überschrift; alles unter Einstellungen → Hilfe (dort auch abschaltbar und die Installationsanleitung).

## Produkte

- **Produkte** (Seitenleiste, am Handy über Gespräch oder die Suche): Reiter Photovoltaik, Wärmepumpe, Vorwerk, Kategorien und Suche. Produkt antippen für Daten, Preis mit Stand und Link zum Hersteller.
- Beim Kunden im Reiter Enpal bzw. Vorwerk und im Gesprächsmodus unter **„🏷️ Produkte“** je Produkt antippen: 👍 Interesse, ⏳ Später, ✓ Schon vorhanden, ✕ Kein Interesse. Nochmal antippen hebt auf.
- Markierungen stehen im Verlauf, in den Texten des Bereichs, im Filter (Gruppe „Produkte“) und in den Auswertungen („Produkt-Interessen“, „Meistgefragte Produkte“).

## Felder anpassen

- Einstellungen → **Felder**: je Bereich (Kontakt, Photovoltaik, Wärmepumpe, Vorwerk) Häkchen weg = Feld ausgeblendet. Die eingetragenen Werte bleiben erhalten.
- **„+ Eigenes Feld“**: Bezeichnung, Bereich und Art (Text, langer Text, Zahl mit Einheit, Datum, Ja/Nein, Auswahlliste, Telefon, E-Mail, Link). Eigene Felder stehen in Kartei, Gesprächsmodus, den Texten ihres Bereichs, Kundenansicht und Suche; Ja/Nein und Auswahllisten auch im Filter.
- 🗑 löscht ein eigenes Feld samt Werten (mit Rückfrage). Zum Behalten nur ausblenden.

## 4. Datensicherung

- **iCloud (iPad/iPhone):** Einstellungen → **„In iCloud / Dateien sichern“** → „Jetzt sichern“ → im Teilen-Menü **„In Dateien sichern“** → iCloud Drive → Ordner (z. B. „Sperling“) → Sichern. Die Datei ist verschlüsselt.
- **Zurückholen / neues Gerät:** Master-Passwort einrichten → Einstellungen → **„Sicherung einspielen“** → Datei in iCloud Drive wählen → Passwort der Sicherung eingeben.
- Die Übersicht erinnert nach 7 Tagen an eine neue Sicherung.
- **Zweites Gerät:** Es gibt keinen automatischen Abgleich. Auf dem einen Gerät sichern, auf dem anderen einspielen; am besten hauptsächlich auf einem Gerät arbeiten.
- Am Laptop: **Sicherung herunterladen** erzeugt dieselbe verschlüsselte `.sperling`-Datei.
- Einspielen fragt nach dem Passwort der Sicherung. Der vorherige Stand bleibt unter „Automatische Versionen“ erhalten.
- **Passwort vergessen = Daten nicht wiederherstellbar.** Passwort sicher notieren.
