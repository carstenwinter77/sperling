# Projektstand

> Diese Datei ist die erste Anlaufstelle. Sie wird bei **jeder** Änderung aktualisiert (siehe REGELN.md, R-DOKU).

**Letzte Aktualisierung:** 07.11.2026 · **Version:** 0.8.0

## Echte App vs. Demo – was zum Produktivbetrieb fehlt

Alle Funktionen der Demo laufen auch in der echten App (gleicher Code; die Demo ist nur ein Modus mit Beispieldaten im Arbeitsspeicher). Geprüft am 07.11.2026 im Browser-Test: Einrichten mit Passwort, Kunde, Notiz, Termin/ICS, getrennte Texte, Enpal-Doku, Gesprächsleitfaden, Sperren/Neuladen, iCloud-/Datei-Sicherung und Einspielen, Versionshistorie, Offline-Start über den Service Worker.

Was nur der Auftraggeber/Nutzer erledigen kann:
- [x] **Hosting:** GitHub Pages ist seit 07.11.2026 live unter `https://carstenwinter77.github.io/sperling/` (Browser-Test gegen die Live-Seite grün, Kartenbilder und Adresssuche erreichbar)
- [ ] **Dropbox-App anlegen** (nur wenn Dropbox-Abgleich gewünscht, Anleitung Abschnitt 3) – sonst iCloud-Sicherung nutzen
- [ ] Auf dem Tablet „Zum Home-Bildschirm“ hinzufügen und Master-Passwort festlegen

Was in der Demo eingeschränkt ist, in der echten App aber funktioniert: Kartenbilder (Satellit/Straße), Adresssuche, Anrufen, Mailprogramm öffnen, Speichern.

## Erledigt (Version 0.8.0)

### Neu in 0.8.0 (Funktionen 1–7 und 9 aus der WASNWO-Liste, dazu Kalender)
- [x] **Kalender** (Termine → Liste | Monat | Woche | Tag, Ansicht steht in der Adresse): Monat – Tag antippen legt Termin an (10:00, heute: nächste Stunde), Tageszahl öffnet die Tagesansicht. Woche/Tag – Raster 6–22 Uhr in halben Stunden; Antippen = 1 Stunde, Finger 0,35 s halten und ziehen (Maus: gleich ziehen) = Zeitraum. Termin antippen = bearbeiten/löschen. Reservierungen im Monat als 📌.
- [x] **1 Hinfahren** (`src/ui/navi.ts`): Apple Karten bzw. Google Maps, Wahl unter Einstellungen → Navigation (`kartenApp`).
- [x] **2 Zahl am App-Symbol** (`src/ui/badge.ts`): heute offene Termine + überfällige Leihgaben (wo `setAppBadge` unterstützt wird, iOS ab 16.4 als installierte App).
- [x] **3 Update-Hinweis** (`src/ui/update.ts`, `src/neuigkeiten.ts`): neue Version wartet, Leiste „Jetzt aktualisieren“, danach „Was ist neu“.
- [x] **4 Papierkorb** (`src/core/papierkorb.ts`): Kunde (mit Rückverknüpfung von Terminen/Verleihen/Reservierungen), Notiz, Termin, Enpal-Eintrag; ab 0.9.0 ohne Verfall, Liste „Gelöscht“ unter Kunden (`#/geloescht`), endgültig nur einzeln mit Bestätigung.
- [x] **5 Kundenansicht** (`src/ui/kundenansicht.ts`): Vollbild, Inhalt in Einstellungen wählbar (`einstellungen.kundenansicht`, Standard ohne Notizen/Bemerkungen); Navigation gesperrt; Beenden mit Passwort oder Face ID.
- [x] **6 Leihschein-PDF** (`src/ui/leihschein.ts`, jsPDF lokal): Leihschein und Rückgabeschein mit Unterschrift, Teilen/Speichern.
- [x] **7 Fotos** bei Übergabe und Rückgabe (max. 4, verkleinert auf 1280 px, verschlüsselt).
- [x] **9 Reservieren** von Vorführgeräten mit Konfliktprüfung gegen Reservierungen und Verleihe.
- [ ] Auf echtem iPad testen: Wischen im Kalender, Teilen-Menü für PDF, Zahl am App-Symbol


### Neu in 0.7.0
- [x] **Entsperren mit Face ID / Touch ID** (iPhone, iPad, Mac; Android: Fingerabdruck): Passkey mit PRF-Erweiterung, daraus abgeleiteter Schlüssel verschlüsselt das Master-Passwort auf dem Gerät. Angebot nach dem ersten Entsperren, Ein/Aus unter Einstellungen → Sicherheit. Passwort bleibt immer gültig. Passwortwechsel schaltet Face ID ab (neu einrichten). Ohne PRF (vor iOS/iPadOS 18) wird Face ID nicht angeboten. Browser-Test mit virtuellem Authenticator (mit und ohne PRF).
- [x] **Beispiel-Vorführbestand (Vorwerk):** Einstellungen → Beispieldaten → „Beispielbestand laden“: sieben Kobold-Geräte/Zubehör ohne Kunden, markiert „Beispiel“, Seriennummern „BSP-…“. Entfernen lässt Geräte mit Verleih-Verlauf stehen.
- [ ] Auf echtem iPhone/iPad testen (Face ID braucht die installierte App über https, iOS 18+)


### Neu in 0.6.0
- [x] **Adresssuche auf der Karte:** Suchfeld oben; Treffer aus den eigenen Kunden (👤) und vom Adressdienst (📍), bei eindeutigem Treffer direkt hineinzoomen (Hausnummer: Zoom 19) mit Popup „Als Potenzial markieren / Kunde anlegen“. Passt der Suchtext auf einen Kundennamen, wird nur lokal gesucht (R-EXTERN).
- [x] **Standort beim Öffnen der Karte:** zoomt automatisch auf den eigenen Standort (blauer Punkt), außer ein Kunde wird gezeigt oder man hat die Karte schon selbst bewegt. Knopf ◎ springt jederzeit zurück.


### Neu in 0.5.0
- [x] **Beispielkunden in der echten App:** Einstellungen → Beispielkunden → „Laden“ fügt die fünf Demo-Kunden mit Notizen, Gesprächen, Enpal-Doku, Terminen, Vorführgeräten und Verleih ein (markiert „Beispiel“). „Entfernen“ löscht sie wieder vollständig; echte Kunden bleiben, echte Termine bei Beispielkunden verlieren nur den Bezug, ein echt verliehenes Beispielgerät bleibt.


### Neu in 0.4.0
- [x] **iCloud-Sicherung (Stufe 1):** Einstellungen → „In iCloud / Dateien sichern“ öffnet das Teilen-Menü („In Dateien sichern“ → iCloud Drive); ohne Teilen-Menü (Laptop) wird heruntergeladen. Einspielen aus iCloud Drive über „Sicherung einspielen“ (Dateiauswahl ohne Filter, damit iOS `.sperling` nicht ausgraut). Anzeige „Letzte Sicherung“, Erinnerung auf der Übersicht nach 7 Tagen, wenn kein Dropbox-Abgleich läuft.
- [x] Browser wird um dauerhaften Speicher gebeten (`navigator.storage.persist`).
- [x] Persönliche Angaben des Auftraggebers aus Code, Doku und Git-Historie entfernt (0.3.1).


### Neu in 0.3.0
- [x] **Enpal-Gesprächsdokumentation** (Tab „Enpal-Doku“ beim Kunden): Telefonat oder Hausbesuch dokumentieren (Zeitpunkt, erreicht, Gesprächspartner, Themen PV/WP, Ergebnis, nächster Schritt, Frist, Gesprächsinhalt). Kopierfertiger Text je Kontakt und als Gesamtverlauf für die Enpal-App. Frist optional als Wiedervorlage, überfällige Fristen rot. Der Gesprächsleitfaden fragt „Wie war der Kontakt?“ und legt bei PV/WP automatisch einen Eintrag an. Schema 2 (`enpalKontakte`).
- [x] **Anrufen** mit Sicherheitsabfrage (Nummer groß, „Nummer kopieren“ oder „Jetzt anrufen“)
- [x] **E-Mail schreiben**: Empfänger, Betreff, Text vorausgefüllt; Standard-Mailprogramm, Gmail oder Outlook im Browser; Wahl pro Gerät merkbar. Zu lange Texte für mailto werden vollständig in die Zwischenablage gelegt. Texte-Tab: „Per E-Mail senden“ mit Empfängern aus den Einstellungen.


### Neu in 0.2.0
- [x] Vorführbestand (`#/bestand`): Geräte mit Seriennummer/Zubehör, Verleih an Kunden mit „zurück bis“, Nachfrage-Erinnerung als Wiedervorlage, Kaufinteresse (offen / Interesse / kein), Rücknahme, Verkauf (Gerät verlässt Bestand, Kunde → Abschluss), Verlauf, „überfällig“-Markierung, Hinweis auf der Übersicht
- [x] Gesprächsleitfaden (`#/gespraech`, Knopf beim Kunden): Einstiegsfragen, Einwände je Sparte (PV 10, WP 10, Vorwerk 8, inkl. allgemeiner Einwände wie „muss ich überlegen“, „Partner fragen“, „Unterlagen schicken“, „kein Interesse“) nach Vier-Stufen-Methode: Auffangen → Isolieren → Argumentieren → Abschlussfrage, mit benannter Technik (Bumerang, Relativieren, Bedingungsfrage, Rückfrage, Referenz, Vorteil-Nachteil, Ausprobieren), Ergebnis je Einwand, Überleitungen zwischen den Sparten, Speichern als **getrennte Notiz je Sparte** + Status setzen
- [x] **Gesprächsergebnisse beim Kunden**: Beim Abschluss je Sparte „Worauf lief es hinaus?“ (Termin, Testgerät, Angebot, Abschluss, Wiedervorlage, überlegen, kein Interesse), nächster Schritt, optional Wiedervorlage/Termin mit Datum, Status. Gespeichert als strukturierter Eintrag `kunde.gespraeche` + Notiz der Sparte. Neuer Tab „Gespräche“ beim Kunden.
- [x] **Folgegespräch**: Bisherige Gespräche der Sparte werden oben angezeigt; früher genannte Einwände sind markiert („früher: …“). Tippt man einen schon bekannten Einwand an, erscheint „Schon einmal besprochen am …“ mit damaligem Ergebnis, Vereinbarung und einem Satz zum Erinnern; darunter folgt trotzdem die volle Einwandbehandlung.
- [x] Inhalte in `src/core/einwaende.ts` (ohne Preise/Förderquoten, R-LEITFADEN)

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
- [ ] Vorführbestand: Leihgaben auch im Vorwerk-Tab des Kunden anzeigen
- [ ] Fotos pro Kunde (Dach, Zählerschrank, Heizung) – verschlüsselt, mit Größenbegrenzung
- [ ] Offline-Kartenbilder für ein Gebiet vorladen (Kachel-Cache mit Größenlimit)
- [ ] Mehrere Notizen-Filter (nur Sparte X), Volltextsuche in Notizen
- [ ] Sortierung der Kundenliste (zuletzt bearbeitet, PLZ)

### Geplant: Umstellung auf TypeScript (Wunsch Auftraggeber, 07.11.2026)
- [ ] Nach den WASNWO-Funktionen und dem Kalender: Code auf TypeScript umstellen (wie die anderen Apps des Auftraggebers), Build mit Vite, Auslieferung über GitHub Actions nach GitHub Pages. Tests bleiben grün; R-KEINE-ABHÄNGIGKEITEN wird dafür angepasst (Build-Schritt erlaubt, Laufzeit weiter ohne Framework).

### Version 2
- [x] **Lieferscheine** zum Vorführbestand: seit 0.8.0 als Leihschein/Rückgabeschein mit Unterschrift und Fotos
- [ ] **iCloud Stufe 2:** automatischer Abgleich über CloudKit JS (braucht Apple-Developer-Konto, 99 €/Jahr). Stufe 1 (manuelle Sicherung) ist seit 0.4.0 da.
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
