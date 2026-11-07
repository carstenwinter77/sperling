# Projektstand

> Diese Datei ist die erste Anlaufstelle. Sie wird bei **jeder** Änderung aktualisiert (siehe REGELN.md, R-DOKU).

**Letzte Aktualisierung:** 08.11.2026 · **Version:** 0.10.31

## Echte App vs. Demo – was zum Produktivbetrieb fehlt

Alle Funktionen der Demo laufen auch in der echten App (gleicher Code; die Demo ist nur ein Modus mit Beispieldaten im Arbeitsspeicher). Geprüft am 07.11.2026 im Browser-Test: Einrichten mit Passwort, Kunde, Notiz, Termin/ICS, getrennte Texte, Enpal-Doku, Gesprächsleitfaden, Sperren/Neuladen, iCloud-/Datei-Sicherung und Einspielen, Versionshistorie, Offline-Start über den Service Worker.

Was nur der Auftraggeber/Nutzer erledigen kann:
- [x] **Hosting:** GitHub Pages ist seit 07.11.2026 live unter `https://carstenwinter77.github.io/sperling/` (Browser-Test gegen die Live-Seite grün, Kartenbilder und Adresssuche erreichbar)
- [ ] Auf dem Tablet „Zum Home-Bildschirm“ hinzufügen und Master-Passwort festlegen

Was in der Demo eingeschränkt ist, in der echten App aber funktioniert: Kartenbilder (Satellit/Straße), Adresssuche, Anrufen, Mailprogramm öffnen, Speichern.

## Erledigt (Version 0.10.31)

### Neu in 0.10.31
- [x] Kontaktseite: Förder-Frage für PV und Wärmepumpe, neue Frage zur Kombination.

### Neu in 0.10.30
- [x] Kontaktseite und Datenschutzerklärung: neben dem Sperling-Logo dezent der volle Name „Jan Sperling“ (auf dem Handy ohne Zusatzzeile, in der Datenschutzerklärung auf schmalen Bildschirmen ausgeblendet). Grund: Markenvorsicht, das Logo soll als Personenname erkennbar sein.

### Neu in 0.10.29
- [x] Hinfahren: einmalige Frage nach der Karten-App auf iPhone/iPad, Google Maps/Waze direkt per App-Schema.
- [ ] Auf echtem iPhone prüfen: Google Maps öffnet direkt (installierte Web-App und Safari).

### Neu in 0.10.28
- [x] Kürzere Wege: Abhaken mit „Wie ging's aus?“ und nächster Wiedervorlage, „Als Nächstes“ auf der Übersicht, Schnellknöpfe in der Kundenliste, „+“-Knopf für Notiz/Termin/Kunde.
- [ ] Auf echtem iPad/iPhone prüfen: „+“-Knopf neben 🛡, Schnellknöpfe in der Kundenliste am Handy (eigene Zeile), Diktat in der Schnellnotiz.
- [ ] Noch offen aus dem Vorschlag (mittlerer/kleiner Nutzen): Standort automatisch, Reiter merken/wischen, nach Gespräch in den Kalender, Leihgaben von der Übersicht zurücknehmen, Vorgaben im Termin-Fenster, Schnellfilter, Auswertung merkt sich Zeitraum.

### Neu in 0.10.27
- [x] Kontaktseite: Satz zum Vergleich positiver formuliert.

### Neu in 0.10.26
- [x] Kontaktseite für Privatleute, Unternehmen und Landwirtschaft („Für Zuhause, Betrieb und Hof“, Formularfelder „Anfrage für“/„Firma“).

### Neu in 0.10.25
- [x] Kontaktseite: Unterzeile „So arbeite ich“ freundlicher formuliert.

### Neu in 0.10.24
- [x] Kontaktseite: „Aus Lengede, für die Region“, „So arbeite ich“ (mit Zweite-Meinung-Kasten), „Häufige Fragen“; Datenschutz um externe Links ergänzt.

### Neu in 0.10.23
- [x] Kunden-/Kartenfilter: aktive Auswahl einheitlich mit Farbe und Haken (auch „Kein Kontakt“, Produkte, eigene Felder).

### Neu in 0.10.22
- [x] Auswertungen: prozentuale Veränderung zum Vorzeitraum mit Pfeil und Vorzeichen, auch im PDF.
- [x] Förderung-Symbol mit Sperling und Blatt wie die übrigen Symbole.

### Neu in 0.10.21 (Befunde aus dem Rundumcheck)
- [x] iPad hochkant: „Mehr“ in der Leiste (Produkte, Sperren erreichbar), Tour-Texte angepasst.
- [x] Handy: Kundennamen in Liste und Kartei vollständig lesbar.
- [x] Tour-Karte verdeckt das Ziel nicht mehr (iPhone SE), Feiertagsnamen ohne Trennung mitten im Wort.
- [x] Barrierefreiheit (axe, WCAG AA): Kontraste, Namen, Rollen, Tippflächen. Bewusst offen: abgeblendete Demo-Abschnitte in den Einstellungen, Termin-Einträge im Kalender am Laptop (Maus) unter 24 px.

### Neu in 0.10.20
- [x] Förderung: Rechner ohne seitliches Scrollen bei 320 px, Quellenlinks auf Touch mindestens 24 px hoch.

### Neu in 0.10.19
- [x] Förderung: Zeitleiste „Was kommt wann“ standardmäßig eingeklappt (Zustand bleibt beim Neuzeichnen erhalten).

### Neu in 0.10.18
- [x] Rechner „Wann rechnet sich das?“ (PV und Wärmepumpe) im Reiter Förderung (`src/core/amortisation.ts`, `src/ui/rechner.ts`), Annahmen änderbar, Staffel nach Anschaffungssumme, Kopieren mit Annahmen, ohne Gewähr. 3 Unit-Tests, Browser-Test erweitert.
- [ ] Beispielwerte (Strompreis 35 ct, WP-Tarif 28 ct, Gas 11 ct, 900 kWh/kWp) mit dem Nutzer abstimmen.

### Neu in 0.10.17
- [x] Reiter **Förderung** (`src/core/foerderung.ts`, `src/ui/views/foerderung.ts`): 22 Abschnitte zu EEG, Solarspitzengesetz, Steuern, KfW/BAFA, GModG, § 14a EnWG, CO2-Preis und Förderlage in Niedersachsen/Region, jeweils mit Quellen und Prüfdatum; Suche, Filter, Zeitleiste, „Wusstest du?“, Kopieren mit Quellen; Station in der Rund-Tour. Stand 07.11.2026, recherchiert über Bundestag, BNetzA, BMWE, KfW, BAFA, gesetze-im-internet.de, KEAN, NBank, Landkreis Peine. 5 Unit-Tests, Browser-Test erweitert.
- [ ] Inhalte regelmäßig prüfen (`STAND` und `geprueft` in `src/core/foerderung.ts`), spätestens nach Beschluss der EEG-Reform (Drucksache 21/7867), zum 01.02.2027 (KfW-Absenkung) und wenn die Wärmepumpen-Sätze ab 1. Quartal 2027 feststehen.
- [ ] Nicht geprüft und deshalb weggelassen: Smart-Meter-Pflicht ab 7 kW, Netzbetreiber für Lengede/Salzgitter, Beträge Modul 1 nach § 14a.

### Neu in 0.10.16
- [x] Kundenfotos je Sparte, verkleinert und verschlüsselt, Vollansicht mit Zoom, in der iCloud-Sicherung (abschaltbar), alte Fotos löschen.
- [ ] Auf echtem iPhone/iPad prüfen: Kamera und Fotoauswahl, Pinch-Zoom, Größe der Sicherungsdatei mit vielen Fotos.

### Neu in 0.10.15
- [x] Willkommen und Rund-Tour beim ersten Start, wieder aufrufbar über Hilfe, Einstellungen, „Mehr“ und Suche.

### Neu in 0.10.14
- [x] Gerät aus dem Vorwerk-Katalog anlegen.
- [x] Verbrauchsmaterial mit Anzahl, Verbrauch/Zugang/Korrektur, Mindestbestand und Hinweis „Nachbestellen“ (Übersicht, Bestand, App-Symbol); Muster aus der Kundenansicht.
- [x] 🛡-Knopf nur, wenn ein Kunde geöffnet oder der Schutz an ist.

### Neu in 0.10.13
- [x] Auswertungen: Fokus je Sparte (Anteile, Veränderung, Entwicklung über 6 Zeiträume, Urteil, Kurztipp), auch im PDF.

### Neu in 0.10.12
- [x] Abgleich über iCloud Drive beim Start (nur Neueres, Rückfrage bei Änderungen auf beiden Seiten).
- [x] Ersteinrichtung aus einer Sicherung, ohne neues Passwort.
- [x] iPhone: Leiste mit 5 Tippflächen + „Mehr“; Überlauf nach rechts behoben (geprüft iPhone SE/13, iPad mini, Laptop).
- [x] Beratungs-Schutz-Balken dezent.
- [ ] Auf echtem iPhone prüfen: Drehen nicht mehr nötig, Abgleich-Leiste, Dateiauswahl aus iCloud Drive.

### Neu in 0.10.11
- [x] Feiertage (Niedersachsen) in Monat, Woche, Tag, Liste und Termin-Dialog (`src/core/feiertage.ts`).

### Neu in 0.10.10
- [x] Verleihen/Verkaufen direkt aus der Kundenansicht, Verkauf als `geraet.verkauf` (`src/core/bestandkunde.ts`, `src/ui/bestandkunde.ts`).
- [x] Alle Dialoge schließen per Hintergrund, mit Rückfrage bei geänderten Eingaben (`dialog()` in `src/ui/dom.ts`).
- [x] Auswertung: Säulen nach Thema gestapelt (Farbe + Muster + Legende), Zeiträume 1/3/6 Monate gleitend, PDF immer eine Seite.

### Neu in 0.10.9
- [x] Schnellwahl für Wiedervorlagen (1 Tag bis 1 Jahr) in Termin-Dialog, Gesprächsabschluss und Enpal-Doku (`src/ui/schnellwahl.ts`).

### Neu in 0.10.8
- [x] Vorwerk-Liste als PDF importieren (`src/core/listenimport.ts`, `src/ui/listenimport.ts`, pdf.js lokal). Vorschau mit Auswahl, Abgleich gegen den Bestand, nichts wird gelöscht. Getestet mit erzeugter Beispiel-PDF (`tests/testliste-pdf.cjs`).
- [ ] Mit einer echten Vorwerk-PDF prüfen (Spaltenerkennung), echte PDF nie ins Repo.
- [x] Kundenauswahl per Suche statt langer Liste in Termin, Reservieren, Verleihen und Gesprächsleitfaden (`src/ui/kundenwahl.ts`).

### Neu in 0.10.7
- [x] 54 Beispielkunden im Beratungsgebiet mit Produkten aus dem erweiterten Katalog (79 Produkte), Terminen, Testgeräten (`src/demo-gebiet.ts`).
- [x] R-BEISPIEL: Sicherheitsprüfung `beispielSicher()`, Demo-Modus speichert nie.
- [x] Karte: Potenzial-Markierung über 🗑 in der Infobox löschen (Papierkorb).
- [x] Sperren oben neben dem Logo, Einstellungen unten mit Trennlinie; „Jetzt sperren“ in Einstellungen.

### Neu in 0.10.6
- [x] **Geführter Gesprächsleitfaden** (`src/core/leitfragen.ts`, `src/ui/views/gespraech.ts`): 7 Phasen mit Phasenleiste (Wischen/Antippen), Leitfragen je Bereich mit Stichwort in die Notiz, Denkanstoß je Anbieter, Einwände mit Rückfrage vor Antwort, „Widerrufsrecht erklärt“, Gesprächsbilanz mit Maskottchen, Animationen mit „Bewegung reduzieren“. Zustand nur im Entwurf (Arbeitsspeicher), kein Schemawechsel. 2 neue Unit-Tests, Browser-Test erweitert. Grundlage: Vorschlagsdokument „Gesprächsleitfäden: Strategien erfolgreicher Berater“ (freigegeben 07.11.2026, ohne Konfetti).
- [ ] Auf echtem iPad testen: Wischen zwischen Phasen, Stichwort-Flug, Diktat in der Leitfaden-Notiz

### Neu in 0.10.5
- [x] Textbausteine per Griff sortieren (`src/ui/ziehsortieren.ts`).
- [x] Einstellungen sichern/einlesen ohne Kunden (`src/core/einstellungsdatei.ts`). Offen: automatischer Abgleich zwischen Geräten (braucht einen Dienst, Entscheidung offen).
- [x] Navigation: Waze. Produktdetail: Link kopieren.

### Neu in 0.10.4
- [x] **Drei getrennte Texte** je Anbieter (PV/Enpal, WP/GALVANY, Vorwerk), Notizen und Reiter je Bereich, Schema 7.
- [x] Kalender-Startansicht wählbar (Standard Monat), Termine standardmäßig 1 Stunde.

### Neu in 0.10.3
- [x] **Kalender** mit Leihgaben und Reiter „Geräte“, **Termin-Karte**, Termine mit Griffen verschieben und ziehen (`src/core/kalender.ts`, `src/ui/terminkarte.ts`).
- [x] Symbol „Produkte“; Produktbilder auf dem Gerät zwischengespeichert.

### Neu in 0.10.1
- [x] **Textbausteine im Gesprächsmodus** (`src/core/bausteine.ts`, `src/ui/bausteinverwaltung.ts`, Schema 6), Diktat-Hinweis statt eigener Spracheingabe.

### Neu in 0.10.0
- [x] **Produktübersicht** (`src/core/produkte.ts`, `src/ui/views/produkte.ts`, Katalog `src/data/produkte.json`, 46 Einträge inkl. GALVANY).
- [x] **Produkte im Gespräch markieren** (`kunde.produkte`, Schema 5): Kartei, Gesprächsmodus, Verlauf, Texte, Filter, Auswertungen. 39 Unit-Tests.

### Neu in 0.9.8
- [x] **Feldverwaltung** (`src/core/felder.ts`, `src/ui/feldverwaltung.ts`): Felder je Kategorie ein-/ausblenden (Daten bleiben), eigene Felder mit 9 Typen; in Kartei, Gesprächsmodus, Texten (R-TEXT), Kundenansicht, Suche und Filter. Schema 4. 37 Unit-Tests.

### Neu in 0.9.7
- [x] Kontaktseite mit echten Kontaktdaten, Impressum und Datenschutz-Aufsichtsbehörde; Barrierefreiheit geprüft.
- [x] **0.10.2:** Kontaktseite als Entwurf gekennzeichnet (roter Balken); in der App Warnung, Teilen und QR-Code ausgeblendet (`ENTWURF` in `src/ui/kontaktseite.ts`).

### Neu in 0.9.6
- [x] Auswertungs-PDF „Alles zusammen“ heißt „Gesamtauswertung“.

### Neu in 0.9.5
- [x] **Dropbox entfernt:** kein Dropbox-Abgleich mehr, Sicherung nur noch als verschlüsselte Datei in iCloud Drive. Alte Dropbox-Zugangsdaten werden beim nächsten Speichern aus dem Bestand gelöscht. Kommandozeile: „Daten in iCloud sichern“ führt zum Sicherungsknopf. Datenschutzerklärung der Kontaktseite angepasst.

### Neu in 0.9.4
- [x] Kontaktseite: neues Zitat, positive Versprechen, Datenschutzerklärung (`public/kontakt/datenschutz.html`), Daten zentral in `public/kontakt/daten.js`.

### Neu in 0.9.3
- [x] Kontaktseite mit echtem Namen und Abschnitt „Beratung ohne Druck“ (unverbindlich, kein Zeitdruck, ehrlich). Platzhalter: nur noch Kontaktdaten und Impressum.

### Neu in 0.9.2
- [x] Bereichsfarben (PV gelb, WP blau, Vorwerk grün) in Chips, Karten, Bögen, Gesprächsmodus, Leitfaden und Icons (`scripts/branding.py` färbt das Produktsymbol ein).

### Neu in 0.9.1
- [x] **Kontaktseite (Konzept)** `public/kontakt/` (eigenständig, kein App-Code, `noindex`), in der App `src/ui/kontaktseite.ts` (Einstellungen: öffnen, teilen, QR-Code mit `public/vendor/qrcode/`).
- [ ] Echte Kontaktdaten, Impressum (§ 5 DDG), Datenschutzerklärung, eigene Domain bzw. Hosting

### Neu in 0.9.0

- [x] **TypeScript + Vite**, Auslieferung per GitHub Actions nach GitHub Pages (Pages-Quelle „GitHub Actions“).
- [x] **Belegungskalender** (`#/belegung`, `src/core/belegung.ts`): Zeitleiste 1/4 Wochen/3 Monate, Liste, „Freie finden“, Zeitraum wischen mit gesperrten Tagen beim Reservieren/Verleihen.
- [x] **Auswertungen** (`#/auswertung`, `src/core/auswertung.ts`): Bereich alles/PV/WP/Vorwerk; Tag, Woche, Monat, Kalenderjahr, letzte 365 Tage bis zum gewählten Tag; Vergleich Vorzeitraum; PDF-Bericht.
- [x] **Nachbarn** im Umkreis 100 m – 50 km (`einstellungen.nachbarRadiusM`).
- [x] **Gelöscht** (`#/geloescht`): kein Verfall, endgültig nur einzeln.
- [x] **Gesprächsmodus** (`#/kunde/:id/gespraech`): geteilte Ansicht, Leitfaden eingebettet, Notiz je Firma (R-TEXT), Abschluss je Bereich; Gesprächshistorie (Tab „Verlauf“).
- [x] **Mehrfachfilter** Karte und Kundenliste, Sortierung, **Letzter Kontakt** (`letzterKontaktManuell`).
- [x] **Kundenansicht** konfigurierbar (`einstellungen.kundenansicht`).
- [x] **Beratungs-Schutz** (`src/ui/schutz.ts`, Sicht in `store.getData()`), Aufheben mit Face ID/Passwort.
- [x] **Kommandozeile** (`src/core/suche.ts`, `src/ui/suche.ts`): ⌘K/Strg+K, Aktionen, Verben, Zuletzt geöffnet (`einstellungen.zuletzt`). Am Handy keine Lupe in der unteren Leiste (kein Platz), dort über das Feld auf der Übersicht.
- [x] **Hilfe** (`src/core/hilfe.ts`, `src/ui/hilfe.ts`, `#/hilfe`): ?-Knöpfe, Anleitungen, Begriffe, Fragen, Suche; **Installationshilfe** (`src/core/installieren.ts`) je Gerät/Browser mit eigenem Installieren-Knopf (Chrome/Edge/Samsung). Abschaltbar (`localStorage sperling.hilfe`).
- [x] **Branding** (`scripts/branding.py`, `public/assets/marke/`, `docs/MASKOTTCHEN.md`): grünes Farbkonzept hell/dunkel, Bereichsfarben PV gelb/WP blau/Vorwerk grün, neues Logo, App-Icon, Bereichs-Icons; Hell/Dunkel nur in Einstellungen; Einstellungen + Version unten links.
- [ ] Auf echtem iPad testen: Gesprächsmodus, Suche mit Bildschirmtastatur, Installationshilfe, neue Icons auf dem Home-Bildschirm

## Erledigt (Version 0.8.0)

### Neu in 0.8.0 (Funktionen 1–7 und 9 aus der WASNWO-Liste, dazu Kalender)
- [x] **Kalender** (Termine → Liste | Monat | Woche | Tag, Ansicht steht in der Adresse): Monat – Tag antippen legt Termin an (10:00, heute: nächste Stunde), Tageszahl öffnet die Tagesansicht. Woche/Tag – Raster 6–22 Uhr in halben Stunden; Antippen = 1 Stunde, Finger 0,35 s halten und ziehen (Maus: gleich ziehen) = Zeitraum. Termin antippen = bearbeiten/löschen. Reservierungen im Monat als 📌.
- [x] **1 Hinfahren** (`src/ui/navi.ts`): Apple Karten, Google Maps oder Waze (ab 0.10.5), Wahl unter Einstellungen → Navigation (`kartenApp`). Die in iOS gewählte Standard-Navi-App kann eine Web-App nicht direkt aufrufen.
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
- [x] **iCloud-Sicherung (Stufe 1):** Einstellungen → „In iCloud / Dateien sichern“ öffnet das Teilen-Menü („In Dateien sichern“ → iCloud Drive); ohne Teilen-Menü (Laptop) wird heruntergeladen. Einspielen aus iCloud Drive über „Sicherung einspielen“ (Dateiauswahl ohne Filter, damit iOS `.sperling` nicht ausgraut). Anzeige „Letzte Sicherung“, Erinnerung auf der Übersicht nach 7 Tagen.
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
- [x] Backup herunterladen / einspielen, Versionen wiederherstellen, Passwort ändern, alles löschen
- [x] Datenschutzhinweis in den Einstellungen
- [x] Maskottchen: 10 freigestellte Sperlinge als Bereichssymbole, App-Icon (seit 0.9.0 ersetzt durch das Branding-Set)
- [x] Demo-Modus mit Beispielkunden (`?demo`), nichts wird gespeichert
- [x] Tablet-/Laptop-Layout mit Seitenleiste ab 900 px, Handy mit unterer Leiste
- [x] Hell / Dunkel / Automatisch (Einstellungen → Darstellung), Wahl pro Gerät gespeichert

### Qualität
- [x] 34 Unit-Tests (u. a. Kryptografie, Migration, Text-Trennung, ICS, Belegung, Auswertungen, Gesprächsmodus, Filter, Suche, Hilfe, Installationshilfe) – alle grün
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

### Geplant: Version 0.10.0 (Wünsche vom 07.11.2026)
- [x] **Feldverwaltung** (seit 0.9.8). Offen: Zuordnung eigener Felder beim Vorwerk-Listenimport (kommt mit dem Import).
- [x] **Produktübersicht** (seit 0.10.0; `#/produkte`, Daten Enpal, GALVANY für Wärmepumpen, Vorwerk; Bilder nur verlinkt, Preise mit Stand).
- [x] **Produkte im Gespräch markieren** (seit 0.10.0): Interesse, kein Interesse, schon vorhanden, später – beim Kunden gespeichert, filter- und auswertbar.
- [ ] **Vorwerk-Listenimport** aus PDF (pdf.js lokal), Abgleich neu/geändert/gleich/fehlt, Dubletten zusammenführen.
- [ ] **Gekaufte Vorwerk-Geräte** mit Servicewartung nach 1 Jahr und **Zubehör-Nachbestellungen**.
- [x] **Textbausteine** im Gesprächsmodus (seit 0.10.1), Diktat über die Tastatur.
- [x] **Kalender statt Termine** (seit 0.10.3; auf echtem iPad testen: Halten und Ziehen mit dem Finger): ein Kalender mit Terminen, Leihgaben, Rückgaben, Reservierungen und Geräteansicht (bisher Belegungskalender). Termin antippen = Detailkarte mit Route, Anrufen, E-Mail, Bearbeiten, Löschen (mit Sicherheitsabfrage). Finger halten = Griffe zum Verschieben und Länger/Kürzer-Ziehen; im Monat auf anderen Tag schieben.
- [ ] **Willkommen und Rundtour** beim ersten Start, jederzeit wieder aufrufbar.
- [ ] **Beispielkunden** erweitern, damit jede Funktion gezeigt wird.
- [x] ~~Umstellung auf TypeScript~~ (erledigt in 0.9.0)

### Version 2
- [x] **Lieferscheine** zum Vorführbestand: seit 0.8.0 als Leihschein/Rückgabeschein mit Unterschrift und Fotos
- [ ] **iCloud Stufe 2:** automatischer Abgleich über CloudKit JS (braucht Apple-Developer-Konto, 99 €/Jahr). Stufe 1 (manuelle Sicherung) ist seit 0.4.0 da.
- [ ] CSV-Export, falls Enpal/Vorwerk strukturierte Daten brauchen
- [ ] Enpal-Doku: Felder an das tatsächliche Formular der Enpal-App anpassen, sobald ein Beispiel vorliegt (Reihenfolge/Bezeichnungen)
- [ ] Übersicht: anstehende Enpal-Fristen gesondert hervorheben

## Bekannte Einschränkungen
- **Letzter Stand gewinnt:** Wird auf zwei Geräten offline gearbeitet, überschreibt der spätere Stand den früheren. Der verdrängte Stand bleibt aber in der lokalen Versionshistorie und kann wiederhergestellt werden.
- **Passwort vergessen = Daten weg.** Es gibt bewusst keine Hintertür.
- **iOS:** Safari kann Website-Daten nach längerer Nichtnutzung löschen, wenn die App nicht zum Home-Bildschirm hinzugefügt ist. Deshalb: zum Home-Bildschirm hinzufügen und regelmäßig in iCloud sichern.
- **Demo-Link:** Im claude.ai-Artifact sind Kartenbilder und Adresssuche gesperrt (Sicherheitsregeln der Plattform). Die Demo zeigt deshalb vereinfachte Straßen. Anrufen und Mailprogramm öffnen kann dort ebenfalls blockiert sein; in der installierten App funktioniert es.
- **mailto-Länge:** Manche Mailprogramme schneiden lange mailto-Links ab. Sperling übergibt dann einen gekürzten Text und legt den vollständigen in die Zwischenablage.
- Kartenkacheln (Esri/OSM) und Adresssuche brauchen Internet. Nominatim erlaubt max. 1 Anfrage/Sekunde (in der App gedrosselt).

## Ablage
- Quellcode: GitHub-Repo (Zweig `main`); lokale Arbeitskopie beim Auftraggeber als git-Klon, Aktualisierung mit `git pull`.
- Aktuelle Kopie: Projektablage `sperling/` (Claude-Projekt „Sperling“).
