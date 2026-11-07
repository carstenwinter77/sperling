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
- **Kalender:** Menü „Kalender“ → Liste, Monat, Woche, Tag oder Geräte (Belegung der Vorführgeräte). Er startet im Monat; die Startansicht stellst du unter Einstellungen → Kalender ein. Neue Termine dauern eine Stunde. Im Monat einen Tag antippen = neuer Termin; auf die Tageszahl tippen = Tagesansicht. In Woche/Tag eine Uhrzeit antippen = Termin über 1 Stunde; für eine andere Dauer den Finger kurz halten und nach unten ziehen.
- **Termin antippen** öffnet die Termin-Karte: Kunde, Adresse, Notiz, letzte Gespräche; Knöpfe Route, Anrufen, E-Mail, Erledigt, In Kalender-App, Bearbeiten, Löschen (mit Sicherheitsabfrage).
- **Termin verschieben:** Finger auf dem Termin halten, bis Griffe erscheinen. Mitte (⠿) = verschieben, in der Woche auch auf einen anderen Tag; Balken oben/unten = früher anfangen oder länger dauern (15-Minuten-Raster). Tipp daneben wählt ab. Im Monat den Termin halten und auf einen anderen Tag ziehen.
- **Leihgaben im Kalender:** ↗ geht raus, ↙ kommt zurück, 📌 Reservierung, ⚠ überfällig. „Leihgaben zeigen“ blendet sie aus. Antippen zeigt Gerät, Kunde und Leihschein.
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
- **Beispielkunden zum Üben/Zeigen:** Einstellungen → Beispielkunden → „Beispielkunden laden“. Später „Beispielkunden entfernen“ – echte Kunden bleiben. Es sind 54 erfundene Kunden rund um Lengede, Peine und Salzgitter mit Produkten, Terminen und Testgeräten. Eine Sicherheitsprüfung bricht ab, falls je ein echter Datensatz betroffen wäre.
- **Potenzial-Markierung löschen:** Auf der Karte die Markierung antippen → 🗑 in der Infobox → bestätigen. Die Markierung landet unter Kunden › Gelöscht und lässt sich wiederherstellen. Der Papierkorb erscheint nur bei Markierungen ohne Fortschritt (Potenzial/unbekannt).
- **Sperren:** am großen Knopf 🔒 oben neben dem Logo (iPad quer, Laptop) oder unter Einstellungen → Sicherheit → „Jetzt sperren“ (überall).
- **Face ID / Touch ID:** Nach dem ersten Entsperren fragt Sperling, ob Face ID genutzt werden soll (oder Einstellungen → Sicherheit). Danach auf dem Sperrbildschirm „Mit Face ID entsperren“. Geht nur in der installierten App, iPhone/iPad ab iOS 18. Nach einem Passwortwechsel neu einrichten.
- **Beispiel-Vorführbestand:** Einstellungen → Beispieldaten → „Beispielbestand laden“ (Kobold-Geräte zum Ausprobieren), später „entfernen“.
- **Hell / Dunkel:** Einstellungen → Darstellung.
- **Gespräch starten:** Kunde → „📞 Gespräch starten“. Links die Kundendaten, rechts Kontaktart, Notizen (Enpal und Vorwerk getrennt), Leitfaden und Abschluss. Das Gespräch bleibt beim Seitenwechsel offen, bis es gespeichert oder verworfen wird. Die Historie steht im Tab „Verlauf“.
- **Suchen und Befehle:** Feld auf der Übersicht, Lupe in der Seitenleiste oder ⌘K / Strg+K. Am Treffer direkt Anrufen, E-Mail, Hinfahren, Notiz, Termin, Gespräch; mit Verb geht es schneller („müller anrufen“).
- **Beratungs-Schutz:** Beim Kunden unten rechts 🛡 tippen – alle anderen Kunden sind ausgeblendet. Aufheben mit Face ID oder Master-Passwort.
- **Letzter Kontakt:** Beim Kunden oben; antippen trägt einen Kontakt von Hand nach. Kundenliste: Filter „Kontakt älter als …“ und Sortierung „Längster Kontakt zuerst“.
- **Belegungskalender:** Kalender → „Geräte“ (oder Bestand → „Belegungskalender“). Über freie Tage wischen reserviert direkt.
- **Auswertungen:** Bereich und Zeitraum wählen, mit ‹ › blättern, „PDF-Bericht“ zum Teilen.
- **Hilfe:** ?-Knopf neben jeder Überschrift; alles unter Einstellungen → Hilfe (dort auch abschaltbar und die Installationsanleitung).

## Drei getrennte Texte

- Beim Kunden unter **Texte** gibt es drei Texte: Photovoltaik (Enpal), Wärmepumpe (GALVANY) und Vorwerk, jeder mit eigener Vorlage und eigenem Empfänger (Einstellungen). Jeder Text enthält nur seinen Bereich.
- Im Gesprächsmodus hat jedes gewählte Thema sein eigenes Notizfeld mit eigenen Bausteinen.
- Ältere Notizen, die Photovoltaik und Wärmepumpe gemeinsam betreffen, stehen in beiden dieser Texte.

## Textbausteine und Diktieren

- Im Gesprächsmodus stehen über dem Notizfeld kurze Sätze je Bereich. Antippen hängt den Satz als neue Zeile an die Notiz an; danach frei weiterschreiben.
- Enpal und Vorwerk haben getrennte Notizen, ein Baustein landet nur in der Notiz seines Bereichs.
- Diktieren: ins Notizfeld tippen und auf der iPad-Tastatur das Mikrofon antippen.
- **Einstellungen → Textbausteine:** je Bereich hinzufügen, umschreiben (Feld ändern), am Griff ⠿ ziehen oder mit ↑ ↓ sortieren (auf dem Griff gehen auch die Pfeiltasten), löschen, Startliste wiederherstellen.

## Produkte

- **Produkte** (Seitenleiste, am Handy über Gespräch oder die Suche): Reiter Photovoltaik, Wärmepumpe, Vorwerk, Kategorien und Suche. Produkt antippen für Daten, Preis mit Stand und Link zum Hersteller.
- Beim Kunden im Reiter Enpal bzw. Vorwerk und im Gesprächsmodus unter **„🏷️ Produkte“** je Produkt antippen: 👍 Interesse, ⏳ Später, ✓ Schon vorhanden, ✕ Kein Interesse. Nochmal antippen hebt auf.
- Markierungen stehen im Verlauf, in den Texten des Bereichs, im Filter (Gruppe „Produkte“) und in den Auswertungen („Produkt-Interessen“, „Meistgefragte Produkte“).

## Felder anpassen

- Einstellungen → **Felder**: je Bereich (Kontakt, Photovoltaik, Wärmepumpe, Vorwerk) Häkchen weg = Feld ausgeblendet. Die eingetragenen Werte bleiben erhalten.
- **„+ Eigenes Feld“**: Bezeichnung, Bereich und Art (Text, langer Text, Zahl mit Einheit, Datum, Ja/Nein, Auswahlliste, Telefon, E-Mail, Link). Eigene Felder stehen in Kartei, Gesprächsmodus, den Texten ihres Bereichs, Kundenansicht und Suche; Ja/Nein und Auswahllisten auch im Filter.
- 🗑 löscht ein eigenes Feld samt Werten (mit Rückfrage). Zum Behalten nur ausblenden.

## Vorwerk-Liste importieren

- Kunden → **„📄 PDF-Liste importieren“** und die PDF wählen. Sie wird nur auf dem Gerät gelesen.
- Die Vorschau zeigt je Zeile **neu**, **geändert** (mit den Änderungen) oder **gleich**. Häkchen weg = Zeile wird nicht übernommen. Unten stehen Kunden, die nicht mehr in der Liste sind; gelöscht wird nichts.
- Sperre, EWE, EWE-Datum und BNW stehen danach in eigenen Vorwerk-Feldern, Notizen als Vorwerk-Notiz. Neue Kunden bekommen Vorwerk „Potenzial“ und einen Kartenpunkt, wenn die Adresse gefunden wird.

## Wiedervorlage schnell setzen

- Unter dem Datum einer Wiedervorlage stehen Knöpfe **In 1 Tag, 3 Tage, 1–4 Wochen, 3 Monate, ½ Jahr, 1 Jahr**. Antippen setzt das Datum ab heute; die schon eingestellte Uhrzeit bleibt, sonst 9:00 Uhr. Über das Kalenderfeld lässt sich jedes Datum weiter frei wählen.

## Kunden auswählen

- Bei Termin, Reservieren, Verleihen und im Gesprächsleitfaden: Name, Straße, Ort oder Telefon eintippen und den Treffer antippen. Ohne Eingabe stehen die zuletzt benutzten Kunden oben. „gleicher Name“ zeigt Namensvettern; Adresse und Telefon stehen darunter. „Ändern“ wählt neu.

## 4. Datensicherung

- **iCloud (iPad/iPhone):** Einstellungen → **„In iCloud / Dateien sichern“** → „Jetzt sichern“ → im Teilen-Menü **„In Dateien sichern“** → iCloud Drive → Ordner (z. B. „Sperling“) → Sichern. Die Datei ist verschlüsselt.
- **Zurückholen / neues Gerät:** Master-Passwort einrichten → Einstellungen → **„Sicherung einspielen“** → Datei in iCloud Drive wählen → Passwort der Sicherung eingeben.
- Die Übersicht erinnert nach 7 Tagen an eine neue Sicherung.
- **Nur Einstellungen übertragen:** Einstellungen → Datensicherung → „Einstellungen sichern“ (verschlüsselt, ohne Kunden) und auf dem anderen Gerät „Einstellungen einlesen“. Übernimmt Vorlagen, Empfänger, Textbausteine, Felder, Kalender, Navigation, Kundenansicht, Farbschema und Mailprogramm.
- **Zweites Gerät:** Es gibt keinen automatischen Abgleich. Auf dem einen Gerät sichern, auf dem anderen einspielen; am besten hauptsächlich auf einem Gerät arbeiten.
- Am Laptop: **Sicherung herunterladen** erzeugt dieselbe verschlüsselte `.sperling`-Datei.
- Einspielen fragt nach dem Passwort der Sicherung. Der vorherige Stand bleibt unter „Automatische Versionen“ erhalten.
- **Passwort vergessen = Daten nicht wiederherstellbar.** Passwort sicher notieren.
