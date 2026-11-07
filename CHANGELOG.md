# Änderungsverlauf

## 0.9.2 – 07.11.2026
- **Bereichsfarben überall:** Status-Chips, Interesse-Karten, Erfassungsbögen, Gesprächsmodus, Leitfaden-Reiter und die Produktsymbole der Bereichs-Icons in PV gelb, WP blau, Vorwerk grün (hell und dunkel).

## 0.9.1 – 07.11.2026
- Klick auf das Sperling-Logo in der Seitenleiste führt zur Übersicht.
- **Meine Kontaktseite (Konzept):** eigenständige Seite `kontakt/` für Photovoltaik und Wärmepumpe (ohne Anbieter) mit Anrufen, WhatsApp, E-Mail, vCard und Rückrufwunsch ohne Server. In der App unter Einstellungen: öffnen, Link teilen, QR-Code (offline erzeugt, als Bild speicherbar). Noch mit Platzhalterdaten; Impressum, Datenschutz und eigene Adresse folgen.

## 0.9.0 – 07.11.2026
- **TypeScript und Vite:** Code in TypeScript, Build mit Vite, Auslieferung über GitHub Actions nach GitHub Pages.
- **Gesprächsmodus:** „Gespräch starten“ beim Kunden öffnet eine geteilte Ansicht (links Kundendaten bearbeitbar, rechts Kontaktart, Notizen je Firma, eingebetteter Leitfaden, Abschluss je Bereich). Läuft weiter beim Seitenwechsel. Gesprächshistorie als Zeitstrahl im Tab „Verlauf“.
- **Kommandozeile:** Suchfeld auf der Übersicht, Lupe in der Seitenleiste, ⌘K / Strg+K. Findet Kunden, Notizen, Termine, Geräte, Einwände, Bereiche und Befehle; Aktionen direkt am Treffer; Verb-Erkennung („müller anrufen“); „Zuletzt geöffnet“.
- **Beratungs-Schutz 🛡:** zeigt nur den beratenen Kunden; Aufheben mit Face ID oder Master-Passwort.
- **Letzter Kontakt** je Kunde (automatisch oder von Hand), Farbe in der Kundenliste.
- **Mehrfachfilter** für Karte und Kundenliste (Bereiche, Status, Kontaktalter), Sortierung der Kundenliste.
- **Belegungskalender** für Vorführgeräte (Zeitleiste, Liste, „Freie finden“, Zeitraum wischen).
- **Auswertungen** je Bereich für Tag, Woche, Monat, Kalenderjahr und letzte 365 Tage, Vergleich mit dem Vorzeitraum, PDF-Bericht.
- **Nachbarn** im Umkreis von 100 m bis 50 km.
- **Gelöscht** statt Papierkorb: nichts verfällt, endgültig löschen nur einzeln mit Bestätigung.
- **Kundenansicht** zum Herzeigen in den Einstellungen konfigurierbar.
- **Hilfe:** ?-Knöpfe mit Kurzhilfe, Hilfe-Seite mit Anleitungen, Begriffen, Fragen und Suche; Installationshilfe je Gerät und Browser. Abschaltbar.
- **Branding:** grünes Farbkonzept aus dem Branding-Set, neues Logo, App-Icon und Bereichs-Icons (hell und dunkel), Bereichsfarben. Hell/Dunkel nur noch in den Einstellungen; Einstellungen mit Programmversion ganz unten in der Navigation.

## 0.8.0 – 07.11.2026
- **Kalender** unter Termine: Ansichten Liste, Monat, Woche, Tag. Termin per Fingertipp anlegen (Monat: Tag antippen; Woche/Tag: Uhrzeit antippen = 1 Stunde, kurz halten und ziehen = Zeitraum). Reservierte Geräte erscheinen im Monat als 📌.
- **Hinfahren**: Navigation mit Apple Karten oder Google Maps beim Kunden, auf der Karte und bei Terminen (Einstellungen → Navigation).
- **Zahl am App-Symbol**: heute fällige Termine und überfällige Leihgaben.
- **Update-Hinweis** mit „Jetzt aktualisieren“ und „Was ist neu“ nach dem Update.
- **Papierkorb**: gelöschte Kunden, Notizen, Termine und Enpal-Einträge 30 Tage wiederherstellbar.
- **Kundenansicht** zum Herzeigen: nur Name, Adresse, Erfassungsbogen und Leihgeräte; Beenden nur mit Master-Passwort oder Face ID.
- **Vorführgeräte reservieren** mit Prüfung auf Überschneidungen; Reservierung in Verleih umwandeln.
- **Fotos und Unterschrift** bei Übergabe und Rückgabe; **Leihschein / Rückgabeschein als PDF** zum Teilen oder Speichern.
- Datenmodell Schema 3 (ältere Daten werden automatisch übernommen).

## 0.7.0 – 07.11.2026
- Entsperren mit Face ID / Touch ID (Passkey mit PRF; Master-Passwort bleibt gültig).
- Beispiel-Vorführbestand (Kobold-Geräte) separat laden und entfernen.

## 0.6.0 – 07.11.2026
- Karte: Adresssuche mit Hineinzoomen und Markieren; Kunden werden lokal gefunden, Namen gehen nie an den Adressdienst.
- Karte zoomt beim Öffnen auf den eigenen Standort (blauer Punkt).

## 0.5.0 – 07.11.2026
- Beispielkunden in der passwortgeschützten App laden und wieder entfernen (Einstellungen → Beispielkunden), in Listen als „Beispiel“ markiert.

## 0.4.0 – 07.11.2026
- **iCloud-Sicherung:** verschlüsselte Sicherung über das Teilen-Menü in iCloud Drive ablegen und von dort einspielen; Anzeige der letzten Sicherung und Erinnerung nach 7 Tagen.
- Dauerhaften Browser-Speicher anfordern (schützt vor automatischem Löschen).
- Anleitung für GitHub Pages; Browser-Test deckt Enpal-Doku, Leitfaden, iCloud-Sicherung und Einspielen im echten Modus ab.

## 0.3.1 – 07.11.2026
- Persönliche Angaben des Auftraggebers aus Code und Doku entfernt (Vorbereitung für öffentliches Repo / GitHub Pages).

## 0.3.0 – 07.11.2026
- **Enpal-Gesprächsdokumentation** je Kontakt (Telefon, Hausbesuch) mit kopierfertigem Text für die Enpal-App, Gesamtverlauf, Fristen als Wiedervorlage; automatisch aus dem Gesprächsleitfaden. Datenmodell Schema 2 (ältere Daten werden automatisch übernommen).
- **Anrufen** aus der App mit Sicherheitsabfrage.
- **E-Mail schreiben** mit vorausgefülltem Betreff und Text, Wahl Standard-Mailprogramm / Gmail / Outlook, pro Gerät merkbar; Texte per E-Mail senden.

## 0.2.0 – 07.11.2026
- **Vorführbestand** (Vorwerk-Geräte im Auto): Geräte anlegen, an Kunden verleihen, Rückgabedatum, automatische Nachfrage-Erinnerung, Kaufinteresse, Rücknahme oder Verkauf, Verlauf. Notizen und Vorwerk-Status beim Kunden werden automatisch gepflegt.
- **Gesprächsleitfaden mit Einwandbehandlung** nach Vier-Stufen-Methode (Auffangen, Isolieren, Argumentieren, Abschlussfrage) mit benannter Vertriebstechnik je Einwand; Einstiegsfragen und typische Einwände je Sparte, Ergebnis markieren, Überleitungen zu den anderen Sparten, Speichern als getrennte Notizen je Sparte.
- Gesprächsergebnisse werden je Sparte beim Kunden gespeichert (Tab „Gespräche“), mit nächstem Schritt und optionaler Wiedervorlage.
- Folgegespräche: Hinweis „Schon einmal besprochen“ mit damaligem Ergebnis, bevor die Einwandbehandlung erneut startet.
- Hell/Dunkel-Modus.

## 0.1.0 – 07.11.2026
Erste Version.
- PWA mit Offline-Betrieb, verschlüsselter lokaler Speicherung (AES-256-GCM) und Versionshistorie
- Kunden mit Interesse je Sparte (PV, Wärmepumpe, Vorwerk), Erfassungsbögen
- Gesprächsnotizen mit automatischem, änderbarem Zeitstempel und Sparten-Markierung
- Karte mit Satellit/Straße, Pins nach Status, Haus markieren mit Adressvorschlag, Nachbarn im Umkreis
- Termine/Wiedervorlagen mit Kalenderexport (.ics)
- Getrennte Textgeneratoren Enpal / Vorwerk mit anpassbaren Vorlagen
- Dropbox-Abgleich, Backup/Import, Passwort ändern
- Maskottchen-Symbole, Hell/Dunkel-Modus, Demo-Modus
- Unit- und Browser-Tests
