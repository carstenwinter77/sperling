# Projektstand

> Diese Datei ist die erste Anlaufstelle. Sie wird bei **jeder** Änderung aktualisiert (siehe REGELN.md, R-DOKU).

**Letzte Aktualisierung:** 07.11.2026 · **Version:** 0.3.1

## Erledigt (Version 0.3.0)

### Neu in 0.3.0
- [x] **Enpal-Gesprächsdokumentation** (Tab „Enpal-Doku“ beim Kunden): Telefonat oder Hausbesuch dokumentieren (Zeitpunkt, erreicht, Gesprächspartner, Themen PV/WP, Ergebnis, nächster Schritt, Frist, Gesprächsinhalt). Kopierfertiger Text je Kontakt und als Gesamtverlauf für die Enpal-App. Frist optional als Wiedervorlage, überfällige Fristen rot. Der Gesprächsleitfaden fragt „Wie war der Kontakt?“ und legt bei PV/WP automatisch einen Eintrag an. Schema 2 (`enpalKontakte`).
- [x] **Anrufen** mit Sicherheitsabfrage (Nummer groß, „Nummer kopieren“ oder „Jetzt anrufen“)
- [x] **E-Mail schreiben**: Empfänger, Betreff, Text vorausgefüllt; Standard-Mailprogramm, Gmail oder Outlook im Browser; Wahl pro Gerät merkbar. Zu lange Texte für mailto werden vollständig in die Zwischenablage gelegt. Texte-Tab: „Per E-Mail senden“ mit Empfängern aus den Einstellungen.


### Neu in 0.2.0
- [x] Vorführbestand (`#/bestand`): Geräte mit Seriennummer/Zubehör, Verleih an Kunden mit „zurück bis“, Nachfrage-Erinnerung als Wiedervorlage, Kaufinteresse (offen / Interesse / kein), Rücknahme, Verkauf (Gerät verlässt Bestand, Kunde → Abschluss), Verlauf, „überfällig“-Markierung, Hinweis auf der Übersicht
- [x] Gesprächsleitfaden (`#/gespraech`, Knopf beim Kunden): Einstiegsfragen, Einwände je Sparte (PV 10, WP 10, Vorwerk 8, inkl. allgemeiner Einwände wie „muss ich überlegen“, „Partner fragen“, „Unterlagen schicken“, „kein Interesse“) nach Vier-Stufen-Methode: Auffangen → Isolieren → Argumentieren → Abschlussfrage, mit benannter Technik (Bumerang, Relativieren, Bedingungsfrage, Rückfrage, Referenz, Vorteil-Nachteil, Ausprobieren), Ergebnis je Einwand, Überleitungen zwischen den Sparten, Speichern als **getrennte Notiz je Sparte** + Status setzen
- [x] **Gesprächsergebnisse beim Kunden**: Beim Abschluss je Sparte „Worauf lief es hinaus?“ (Termin, Testgerät, Angebot, Abschluss, Wiedervorlage, überlegen, kein Interesse), nächster Schritt, optional Wiedervorlage/Termin mit Datum, Status. Gespeichert als strukturierter Eintrag `kunde.gespraeche` + Notiz der Sparte. Neuer Tab „Gespräche“ beim Kunden.
- [x] **Folgegespräch**: Bisherige Gespräche der Sparte werden oben angezeigt; früher genannte Einwände sind markiert („früher: …“). Tippt man einen schon bekannten Einwand an, erscheint „Schon einmal besprochen am …“ mit damaligem Ergebnis, Vereinbarung und einem Satz zum Erinnern; darunter folgt trotzdem die volle Einwandbehandlung.
- [x] Inhalte in `js/core/einwaende.js` (ohne Preise/Förderquoten, R-LEITFADEN)

### Kern
- [x] PWA-Grundgerüst: `index.html`, `manifest.webmanifest`, Service Worker (`sw.js`) für Offline-Betrieb
- [x] Verschlüsselung: PBKDF2-SHA-256 (600.000 Iterationen) → AES-256-GCM, Kopfdaten per AAD gegen Manipulation geschützt
- [x] Lokale Speicherung in IndexedDB, nur verschlüsselte Umschläge; automatische Versionshistorie (letzte 10 Stände)
- [x] Zentraler Datenzustand mit `mutate()`, verzögertem Speichern, Speicherkette ohne Überholvorgänge, Rückrollen bei Fehlern
- [x] Datenmodell mit Normalisierung und Migration (repariert kaputte/alte Daten ohne Absturz)
- [x] Auto-Sperre nach Inaktivität (einstellbar), Speichern beim Verlassen/Ausblenden der Seite

### Funktionen
- [x] Kunden: Stammdaten, Suche, Filter nach Sparte und Status
- [x] Interesse je Sparte (PV, Wärmepumpe, Vorwerk): unbekannt · Potenzial · Interesse · Termin · Angebot · Abschluss · kein Interesse
- [x] Gesprächsnotizen pro Kunde mit Zeitstempel: automatisch „jetzt“, frei änderbar, nachträglich editierbar; Markierung, über welche Sparten gesprochen wurde
- [x] Aus einer Notiz direkt eine Wiedervorlage / einen Termin anlegen
- [x] Erfassungsbogen Photovoltaik (16 Felder), Wärmepumpe (13 Felder), Vorwerk (8 Felder)
- [x] Termine & Wiedervorlagen: überfällig / heute / demnächst / erledigt, Export als `.ics` (einzeln oder alle offenen), Erinnerung 30 Min. vorher
- [x] Karte (Leaflet): Satellit (Esri) und Straßenkarte (OSM), farbige Pins nach Status, Filter, „Mein Standort“
- [x] Langes Tippen / Rechtsklick auf ein Haus → Adressvorschlag (Nominatim) → „Als Potenzial markieren“ oder „Kunde anlegen“
- [x] Adresse → Koordinate („Standort aus Adresse ermitteln“)
- [x] Nachbarn im Umkreis von 300 m beim Kunden
- [x] Übersicht: fällige Aufgaben, Kennzahlen je Sparte, **Cross-Selling-Chancen** (aktiv in einer Sparte, andere noch offen)
- [x] Zwei strikt getrennte Textgeneratoren (Enpal: PV+WP / Vorwerk) mit Kopier-Knopf und anpassbaren Vorlagen
- [x] Dropbox-Abgleich (OAuth PKCE, nur verschlüsselte Datei, neuester Stand gewinnt)
- [x] Backup herunterladen / einspielen, Versionen wiederherstellen, Passwort ändern, alles löschen
- [x] Datenschutzhinweis in den Einstellungen
- [x] Maskottchen: 10 freigestellte Sperlinge als Bereichssymbole, App-Icon
- [x] Demo-Modus mit Beispielkunden (`?demo`), nichts wird gespeichert
- [x] Tablet-/Laptop-Layout mit Seitenleiste ab 900 px, Handy mit unterer Leiste
- [x] Hell / Dunkel / Automatisch (Einstellungen → Darstellung, Schnellumschalter ◐), Wahl pro Gerät gespeichert

### Qualität
- [x] 15 Unit-Tests (Kryptografie, Migration, Text-Trennung, ICS, Hilfsfunktionen, Gesprächsnotiz, Leihvorgang) – alle grün
- [x] E2E-Test im Browser (Einrichten, Kunde, Notiz mit eigenem Zeitstempel, Termin + ICS, Texttrennung, Sperren/Entsperren, falsches Passwort, XSS-Versuch, Backup ohne Klartext, Historie, Löschen, kaputte Routen) – grün
- [x] Demo-Link für die Vorstellung am 07.11.2026: https://claude.ai/artifact/CeAMGAuqUtQoZxjn1Fb7sC (privat, muss zum Weitergeben über „Teilen“ freigegeben werden)

## Offen / geplant

### Als Nächstes (Version 0.2)
- [ ] Mit dem Nutzer die Felder der Erfassungsbögen gegen das echte Enpal-/Vorwerk-Formular prüfen
- [ ] Einwände und Gegenargumente mit dem Nutzer überarbeiten; später in den Einstellungen selbst bearbeitbar machen
- [ ] Vorführbestand: Leihgaben auch im Vorwerk-Tab des Kunden anzeigen, Fotos vom Zustand bei Ausgabe/Rückgabe
- [ ] Hosting festlegen (Vorschlag: GitHub Pages oder Cloudflare Pages, kostenlos, HTTPS) und Dropbox-App anlegen
- [ ] Fotos pro Kunde (Dach, Zählerschrank, Heizung) – verschlüsselt, mit Größenbegrenzung
- [ ] Offline-Kartenbilder für ein Gebiet vorladen (Kachel-Cache mit Größenlimit)
- [ ] Mehrere Notizen-Filter (nur Sparte X), Volltextsuche in Notizen
- [ ] Sortierung der Kundenliste (zuletzt bearbeitet, PLZ)

### Version 2
- [ ] **Lieferscheine** zum Vorführbestand: Unterschrift auf dem Tablet, PDF-Lieferschein bei Ausgabe und Rückgabe (Bestand und Verleih sind seit 0.2.0 vorhanden)
- [ ] **iCloud als Speicherort** (Wunsch Auftraggeber, 07.11.2026): Stufe 1 – verschlüsselte Sicherung per Teilen-Menü in „Dateien → iCloud Drive“ sichern und von dort einspielen (ohne Apple-Konto-Anbindung). Stufe 2 – automatischer Abgleich über CloudKit JS (braucht Apple-Developer-Konto, 99 €/Jahr).
- [ ] CSV-Export, falls Enpal/Vorwerk strukturierte Daten brauchen
- [ ] Enpal-Doku: Felder an das tatsächliche Formular der Enpal-App anpassen, sobald ein Beispiel vorliegt (Reihenfolge/Bezeichnungen)
- [ ] Übersicht: anstehende Enpal-Fristen gesondert hervorheben

## Bekannte Einschränkungen
- **Letzter Stand gewinnt:** Wird auf zwei Geräten offline gearbeitet, überschreibt der spätere Stand den früheren. Der verdrängte Stand bleibt aber in der lokalen Versionshistorie und kann wiederhergestellt werden.
- **Passwort vergessen = Daten weg.** Es gibt bewusst keine Hintertür.
- **iOS:** Safari kann Website-Daten nach längerer Nichtnutzung löschen, wenn die App nicht zum Home-Bildschirm hinzugefügt ist. Deshalb: zum Home-Bildschirm hinzufügen und Dropbox-Sync oder regelmäßige Backups nutzen.
- **Demo-Link:** Im claude.ai-Artifact sind Kartenbilder und Adresssuche gesperrt (Sicherheitsregeln der Plattform). Die Demo zeigt deshalb vereinfachte Straßen. Anrufen und Mailprogramm öffnen kann dort ebenfalls blockiert sein; in der installierten App funktioniert es.
- **mailto-Länge:** Manche Mailprogramme schneiden lange mailto-Links ab. Sperling übergibt dann einen gekürzten Text und legt den vollständigen in die Zwischenablage.
- Kartenkacheln (Esri/OSM) und Adresssuche brauchen Internet. Nominatim erlaubt max. 1 Anfrage/Sekunde (in der App gedrosselt).

## Ablage
- Quellcode: GitHub-Repo (Zweig `main`); lokale Arbeitskopie beim Auftraggeber als git-Klon, Aktualisierung mit `git pull`.
- Aktuelle Kopie: Projektablage `sperling/` (Claude-Projekt „Sperling“).
