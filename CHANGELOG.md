# Änderungsverlauf

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
