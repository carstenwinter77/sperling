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
- **Kalender:** Menü „Kalender“ → Liste, Monat, Woche, Tag oder Geräte (Belegung der Vorführgeräte). Er startet im Monat; die Startansicht stellst du unter Einstellungen → Kalender ein. Neue Termine dauern eine Stunde. Im Monat einen Tag antippen (egal wo, auch auf einen Termin) = Tagesansicht dieses Tages; neue Termine legst du dort oder mit „+ Neu“ an. In Woche/Tag eine Uhrzeit antippen = Termin über 1 Stunde; für eine andere Dauer den Finger kurz halten und nach unten ziehen.
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
- **Gerät aus dem Katalog:** Bestand → „+ Gerät“ → „Aus dem Vorwerk-Katalog“ wählen; die Bezeichnung wird übernommen.
- **Verbrauchsmaterial:** Bestand → „🧴 Material“ → „+ Material“ (aus dem Katalog oder frei), Anzahl, Einheit und Mindestbestand. „− Verbrauch“ bei Muster, Test beim Kunden (danach entsorgt), Eigenverbrauch oder Defekt; „+ Zugang“ bei Lieferung; unter „Bearbeiten“ den gezählten Bestand eintragen. Erreicht der Bestand den Mindestbestand, steht „🛒 Nachbestellen“ auf der Übersicht und im Bestand. Beim Kunden: „🧴 Muster mitgeben“.
- **Belegungskalender:** Kalender → „Geräte“ (oder Bestand → „Belegungskalender“). Über freie Tage wischen reserviert direkt.
- **Auswertungen:** Oben stehen Abschlüsse, Abschlussquote, offene Chancen und Gespräche, darunter der Verkaufstrichter (wo bleiben Kunden hängen? Rechts je Stufe Anzahl und Anteil in Prozent, im Balken die Zahl je Sparte, dazwischen wie viele weiterkamen) und „Jetzt nachfassen“ (überfällige Wiedervorlagen, stille Angebote, fällige Testgeräte); bei „Alles zusammen“ die Sparten nebeneinander. Ein laufender Zeitraum wird mit gleich vielen Tagen davor verglichen. Alles Weitere unter „Aktivität im Detail“. Zeitraum wählen (Woche, Monat, Quartal, Kalenderjahr, weitere unter „Mehr“), mit ‹ › blättern. Über jeder Säule steht die Anzahl; bei „Alles zusammen“ zeigen die Säulen die Themen in ihren Farben. „PDF-Bericht“ (immer eine Seite) zum Teilen. Bei „Alles zusammen“ zeigt „Fokus je Sparte“, wie sich deine Arbeit auf PV, WP und Vorwerk verteilt, die Entwicklung über die letzten sechs Zeiträume und einen Kurztipp, wenn eine Sparte zu kurz kommt (unter 15 % oder um 15 Punkte gesunken).
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

## Kundenliste exportieren
- Kunden → **„⬇ Export“** (neben der Sortierung, auf dem Handy nur „⬇“). Exportiert wird genau die Liste, die gerade zu sehen ist: erst suchen, filtern und sortieren, dann exportieren.
- **PDF** zum Ausdrucken, **Excel-Tabelle** (.xlsx) zum Weiterbearbeiten oder **CSV** für andere Programme. Auf iPad/iPhone öffnet sich das Teilen-Menü (z. B. „In Dateien sichern“ oder AirDrop), am Computer wird die Datei heruntergeladen.
- Bei Sortierung „Name A–Z“ trennen Buchstaben die Liste (bleiben beim Scrollen oben stehen), ebenso im PDF und in Excel. Die CSV-Datei hat keine Trennzeilen.
- Enthalten sind Name, Firma, Adresse, Telefon, E-Mail, Status je Bereich und letzter Kontakt, keine Notizen oder Fotos.
- Die Datei ist **nicht verschlüsselt**. Nur an Berechtigte weitergeben und löschen, wenn sie nicht mehr gebraucht wird.

## Vorwerk-Liste importieren

- Kunden → **„📄 PDF-Liste importieren“** und die PDF wählen. Sie wird nur auf dem Gerät gelesen.
- Die Vorschau zeigt je Zeile **neu**, **geändert** (mit den Änderungen) oder **gleich**. Häkchen weg = Zeile wird nicht übernommen. Unten stehen Kunden, die nicht mehr in der Liste sind; gelöscht wird nichts.
- Sperre, EWE, EWE-Datum und BNW stehen danach in eigenen Vorwerk-Feldern, Notizen als Vorwerk-Notiz. Neue Kunden bekommen Vorwerk „Potenzial“ und einen Kartenpunkt, wenn die Adresse gefunden wird.

## Gerät verleihen oder verkaufen beim Kunden

- In der Übersicht des Kunden steht **„📦 Aus meinem Bestand“**: seine Leihgaben und gekauften Geräte.
- **Gerät verleihen**: Gerät antippen, „Weiter“, dann wie gewohnt Zeitraum, Fotos, Unterschrift. Für ihn reservierte Geräte stehen oben, belegte sind ausgegraut.
- **Gerät verkaufen**: Gerät wählen, Datum und optional Preis eintragen. Das Häkchen setzt den Vorwerk-Status auf „Abschluss / Kunde“ und lässt sich abwählen. Das Gerät verlässt den Bestand; hatte der Kunde es geliehen, ist die Leihgabe damit erledigt.

## Kundenfotos

- Kunde öffnen → Reiter **„Fotos“**. Je Sparte (Photovoltaik, Wärmepumpe, Vorwerk) „📷 Aufnehmen“ oder „🖼 Auswählen“ (mehrere auf einmal).
- Tipp aufs Foto: Vollansicht. Mit zwei Fingern oder Doppeltipp zoomen, wischen zum nächsten Foto, 🗑 löscht.
- Die Fotos werden verkleinert und verschlüsselt gespeichert und kommen mit in die iCloud-Sicherung. Abschalten und alte Fotos löschen: Einstellungen → Kundenfotos.

## Rund-Tour

- Beim ersten Start fragt Sperling, ob du eine kurze Tour möchtest. Später startest du sie unter Hilfe („🧭 Rund-Tour starten“), in den Einstellungen unter Hilfe, auf dem iPhone und dem iPad hochkant unter „Mehr“ oder über die Suche („Tour“).
- Weiter und Zurück mit den Knöpfen oder den Pfeiltasten, Esc oder „Beenden“ schließt.

## Zwischen Geräten wechseln (iPad, iPhone, Laptop)

- **Erstes Mal auf einem weiteren Gerät:** Auf dem Startbildschirm „☁️ Vom anderen Gerät übernehmen (iCloud)“ tippen, die Sicherungsdatei aus iCloud Drive wählen und das bisherige Master-Passwort eingeben. Ein neues Passwort ist nicht nötig.
- **Vor dem Wechsel:** „In iCloud sichern“ (Einstellungen → Datensicherung oder die Leiste oben) und die Datei in iCloud Drive/Sperling ablegen.
- **Nach dem Wechsel:** Beim Öffnen fragt Sperling „Neueren Stand aus iCloud holen?“. Datei wählen; übernommen wird nur ein neuerer Stand. Wurde auf beiden Geräten etwas geändert, fragt Sperling nach; der bisherige Stand bleibt unter „Versionen“.
- Ganz automatisch geht es nicht: Safari lässt eine Web-App nur Dateien lesen, die du selbst auswählst.

## Fenster schließen

- Ein Tipp neben ein Fenster (auf den abgedunkelten Hintergrund) oder Esc schließt es ohne Speichern. Hast du schon etwas eingetragen, fragt Sperling vorher nach.

## Feiertage

- Der Kalender zeigt die gesetzlichen Feiertage in Niedersachsen mit Namen (Monat, Woche, Tag, Liste und beim Anlegen eines Termins). Termine an Feiertagen sind trotzdem möglich.

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
