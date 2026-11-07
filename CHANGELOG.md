# Änderungsverlauf

## 0.10.19 – 07.11.2026
- Förderung: Zeitleiste „Was kommt wann“ startet eingeklappt; einmal geöffnet bleibt sie beim Filtern und bei „Noch einer“ offen.

## 0.10.18 – 07.11.2026
- **Rechner „Wann rechnet sich das?“** im Reiter Förderung (`src/core/amortisation.ts`, `src/ui/rechner.ts`): grobe Amortisation für Photovoltaik (Eigenverbrauch, Einspeisevergütung 20 Jahre, Ertragsverlust 0,5 %/Jahr, laufende Kosten) und Wärmepumpe (Vergleich mit Weiterheizen mit Gas/Öl, KfW-Zuschuss auf höchstens 28.000 €, „ohnehin fällig“ für eine sonst nötige neue Heizung). Alle Annahmen änderbar, deutsche Zahlen („15.000“, „7,7“), Grenzen je Feld.
- Ergebnis: Eigenanteil, Vorteil im 1. Jahr, „bezahlt gemacht nach etwa … Jahren“, Stand am Ende, Säulendiagramm je Jahr (mit Textbeschreibung), Tabelle „Bei welcher Anschaffungssumme?“ (−30 % bis +30 %) und Höchstpreis für 15 Jahre. „📋 Kopieren“ mit allen Annahmen und dem Hinweis „ohne Gewähr“. Werte werden nicht gespeichert.

## 0.10.17 – 07.11.2026
- **Neuer Reiter „Förderung“** (`#/foerderung`, `src/core/foerderung.ts`, `src/ui/views/foerderung.ts`): Gesetze, Zuschüsse, Steuern und Netzregeln für Photovoltaik und Wärmepumpe in einfacher Sprache, Stand 07.11.2026. 22 Abschnitte, u. a. Einspeisevergütung (Sätze ab 01.08.2026), geplante EEG-Reform 2027, Solarspitzengesetz, 0 % Umsatzsteuer, § 3 Nr. 72 EStG, KfW 270, Marktstammdatenregister, Balkonkraftwerk, Solarpflicht Niedersachsen, Energy Sharing, Gebäudemodernisierungsgesetz, KfW 458 seit 21.07.2026 und Änderungen 2027, Antragsablauf, BAFA, § 35c EStG, § 14a EnWG, Grenzabstand Wärmepumpe, Wärmeplanung, CO2-Preis, Förderlage in Niedersachsen/Peine/Lengede/Salzgitter.
- Jeder Abschnitt mit Bereich (PV gelb, WP blau, beide), Status (gilt, geplant, ändert sich, läuft aus), Prüfdatum und verlinkten Quellen (amtliche markiert). „📋 Kopieren“ legt Text, Quellen, Stand und Hinweis „keine Rechts- oder Steuerberatung“ in die Zwischenablage.
- Suche mit Hervorhebung, Filter nach Bereich und Thema, „Wusstest du?“, Zeitleiste „Was kommt wann“ (2025 bis 2045, Geplantes gestrichelt, „als Nächstes“ markiert, Tipp springt zum Abschnitt). Barrierefrei: echte Überschriften, Tabellen mit Kopfzellen, Fokus sichtbar, Trefferzahl für Screenreader, „Bewegung reduzieren“ beachtet.
- Eigenes Symbol (`public/assets/marke/foerderung(-hell).png`, Original in `docs/bilder/foerderung-original.png`). Auf dem iPhone unter „Mehr“, auch im Beratungs-Schutz erreichbar, Station in der Rund-Tour, Eintrag in Suche und Hilfe.

## 0.10.16 – 07.11.2026
- **Kundenfotos** (`src/core/fotos.ts`, `src/storage/fotos.ts`, `src/ui/kundenfotos.ts`): neuer Reiter „Fotos“ beim Kunden, getrennt nach Photovoltaik, Wärmepumpe und Vorwerk. Aufnehmen oder mehrere aus den Fotos wählen; bis 200 Fotos je Kunde. Verkleinert auf 1600 px (JPEG) plus Vorschaubild, zusammen etwa 150 bis 300 KB je Foto.
- **Vollansicht:** Tipp aufs Foto; Zoom mit zwei Fingern, Doppeltipp, Mausrad oder + und −; Wischen bzw. Pfeiltasten zum nächsten Foto; Löschen.
- **Verschlüsselt:** Bilder liegen in einer eigenen IndexedDB-Tabelle `fotos` (Datenbank-Version 2), verschlüsselt mit einem zufälligen Fotoschlüssel (AES-GCM, 256 Bit). Der Schlüssel steht nur im verschlüsselten Bestand (`fotoSchluessel`), daher bleibt ein neues Master-Passwort ohne Folgen für die Fotos.
- **Sicherung und Gerätewechsel:** Die iCloud-Sicherung enthält die Fotos (verschlüsselt), abschaltbar unter Einstellungen → Kundenfotos (`einstellungen.fotosMitsichern`). Beim Einspielen bleiben die Fotoschlüssel des Geräts erhalten.
- **Einstellungen → Kundenfotos:** Anzahl und Größe, Fotos älter als 3 Monate bis 3 Jahre löschen. Endgültig gelöschte Kunden nehmen ihre Fotos mit; verwaiste Bilddaten räumt Sperling nach dem Start auf.

## 0.10.15 – 07.11.2026
- **Willkommen und Rund-Tour** (`src/ui/tour.ts`): Beim ersten Start auf einem Gerät (auch in der Demo) begrüßt Sperling mit „Tour starten“ oder „Später“. Die Tour hebt 13 Stationen nacheinander hervor (Übersicht, Suche, Kunden, Karte, Kalender, Gespräch, Bestand, Produkte, Auswertungen, Einstellungen, Sperren, Beratungs-Schutz, Abschluss), mit Weiter/Zurück, Pfeiltasten und Esc. Auf dem iPhone zeigt sie auf „Mehr“, wenn ein Bereich dort liegt. Wartet, bis andere Dialoge (z. B. Face ID einrichten) zu sind.
- Wieder aufrufbar: Hilfe-Seite, Einstellungen → Hilfe, „Mehr“ auf dem iPhone, Suche („Tour“). Merker `tourGesehen` in `sperling.hilfe` (Gerätevorliebe).

## 0.10.14 – 07.11.2026
- **Gerät aus dem Vorwerk-Katalog anlegen:** „+ Gerät“ hat eine Auswahl aus der Produktübersicht (nach Kategorie), die die Bezeichnung füllt; neues Feld `geraet.produktId`.
- **Verbrauchsmaterial** (`src/core/material.ts`, `src/ui/material.ts`): Muster, Reinigungsmittel, Filtertüten usw. mit Anzahl und Einheit, auch aus dem Katalog. „− Verbrauch“ mit Grund (Muster an Kunde, beim Kunden getestet und entsorgt, selbst verbraucht, defekt/abgelaufen), „+ Zugang“, gezählter Bestand als Korrektur. Verlauf je Material.
- **Mindestbestand:** Erreicht der Bestand den Mindestbestand, erscheint „Nachbestellen“ im Bestand und auf der Übersicht, zählt in der Zahl am App-Symbol und meldet sich direkt nach der Buchung.
- **Kundenansicht:** „🧴 Muster mitgeben“ bucht den Abgang und schreibt eine Vorwerk-Notiz beim Kunden.
- **Beratungs-Schutz:** Das 🛡 unten rechts erscheint nur noch, wenn ein Kunde geöffnet ist (oder der Schutz an ist).

## 0.10.13 – 07.11.2026
- **Auswertungen: Fokus je Sparte** (`fokusBericht` in `src/core/auswertung.ts`): Bei „Alles zusammen“ zeigt ein Abschnitt den Anteil von Photovoltaik, Wärmepumpe und Vorwerk an Gesprächen, Notizen, Terminen und Wiedervorlagen, mit Veränderung in Punkten gegenüber dem Vorzeitraum. Dazu die Entwicklung über die letzten sechs Zeiträume (Tage, Wochen, Monate oder Jahre, je nach gewähltem Zeitraum) und ein Urteil (ausgeglichen, Schwerpunkt, sehr einseitig).
- **Kurztipp:** Kommt eine Sparte zu kurz (unter 15 % oder um 15 Punkte oder mehr gesunken), nennt Sperling überfällige Wiedervorlagen und offene Kunden (Interesse, Termin, Angebot) bzw. Potenzial-Kunden dieser Sparte zum Gegensteuern. Sparten ohne Kunden und Aktivität werden nicht angemahnt.
- In den einzelnen Sparten steht oben der Anteil an allem, was im Zeitraum gemacht wurde. Der PDF-Bericht enthält den Fokus mit Tipp und bleibt auf einer Seite.

## 0.10.12 – 07.11.2026
- **Abgleich über iCloud Drive** (`src/core/abgleich.ts`, `src/ui/abgleich.ts`): Nach dem Entsperren eine Leiste „Neueren Stand aus iCloud holen“ (einmal je Sitzung, abschaltbar unter Einstellungen → Datensicherung), bei Änderungen seit dem letzten Abgleich zusätzlich „Diesen Stand in iCloud sichern“. Übernommen wird nur ein neuerer Stand; wurde auf beiden Geräten geändert, fragt Sperling nach (der bisherige Stand bleibt in den Versionen). Merkt sich den Stand des letzten Abgleichs (`meta.abgleichStand`, nur auf dem Gerät). Safari erlaubt keinen automatischen Zugriff auf iCloud Drive, deshalb ein Tipp zum Wählen der Datei.
- **Ersteinrichtung auf einem weiteren Gerät:** „Vom anderen Gerät übernehmen (iCloud)“ auf dem Startbildschirm. Sicherung wählen, bisheriges Passwort eingeben, fertig; kein neues Passwort (`store.einrichtenAusSicherung`).
- **iPhone:** Leiste unten mit fünf großen Tippflächen (Übersicht, Kunden, Karte, Kalender, Mehr); Gespräch, Bestand, Produkte, Auswertungen, Einstellungen, Suchen und Sperren unter „Mehr“. Keine Seite ist mehr breiter als der Bildschirm (der rechte Rand wurde im Hochformat abgeschnitten); geprüft auf iPhone SE, iPhone 13, iPad mini und Laptop.
- **Beratungs-Schutz:** schmaler, heller Balken „🛡 Nur <Kunde> · Aufheben“ statt des großen grünen.

## 0.10.11 – 07.11.2026
- **Feiertage im Kalender** (Niedersachsen, lokal berechnet, `src/core/feiertage.ts`): Neujahr, Karfreitag, Ostermontag, 1. Mai, Christi Himmelfahrt, Pfingstmontag, 3. Oktober, Reformationstag (ab 2018), 1. und 2. Weihnachtstag. Im Monat Name unter dem Datum und getönte Fläche, in Woche/Tag im Spaltenkopf, in der Liste beim Termin, im Termin-Dialog als Hinweis. Termine bleiben möglich.

## 0.10.10 – 07.11.2026
- **Aus der Kundenansicht verleihen oder verkaufen:** Block „📦 Aus meinem Bestand“ in der Übersicht des Kunden (Leihgaben und gekaufte Geräte des Kunden, Knöpfe „Gerät verleihen“/„Gerät verkaufen“). Geräteauswahl mit Lage je Gerät (für den Kunden reserviert zuerst, belegte ausgegraut, nie Namen anderer Kunden). Verleihen öffnet den bekannten Dialog mit vorausgefülltem Kunden. Verkaufen: Datum, Preis (optional), Notiz, Häkchen „Vorwerk-Status auf Abschluss / Kunde“ vorausgewählt; Gerät verlässt den Bestand, `geraet.verkauf` hält Kunde/Datum/Preis, eine Leihgabe beim Kunden wird als „gekauft“ abgeschlossen, Reservierungen ab dem Verkaufstag fallen weg (Anzahl im Hinweis). „Verkaufen“ auch im Bestand, Liste „Verkauft“ dort (`src/core/bestandkunde.ts`, `src/ui/bestandkunde.ts`).
- **Dialoge** schließen auch per Klick/Tipp auf den Hintergrund; sind Eingaben geändert (auch Unterschrift), fragt Sperling vorher „Eingaben verwerfen?“. Esc fragt ebenso.
- **Auswertungen:** Bei „Alles zusammen“ sind die Säulen „Gespräche im Verlauf“ nach Thema gestapelt (Photovoltaik gelb, Wärmepumpe blau gestreift, Vorwerk grün gepunktet), mit Legende und Werten im Tooltip; im PDF ebenso. Neue Zeiträume „1 Monat“, „3 Monate“ (Wochensäulen), „½ Jahr“, jeweils gleitend bis zum Stichtag. Der PDF-Bericht passt immer auf eine Seite (Zeilen und Schrift passen sich an, Ergebnisse und Produkte nebeneinander, lange Texte gekürzt).

## 0.10.9 – 07.11.2026
- **Schnellwahl für Wiedervorlagen:** Unter jedem Wiedervorlage-Datum (Termin-Dialog, Gesprächsabschluss im Leitfaden und Gesprächsmodus, Enpal-Doku-Frist) Knöpfe „In 1 Tag, 3 Tage, 1–4 Wochen, 3 Monate, ½ Jahr, 1 Jahr“. Ab heute gerechnet; die eingestellte Uhrzeit bleibt, sonst 9:00. Monatsende wird gekappt (31.08. + ½ Jahr = 28.02.). Kalenderauswahl bleibt (`src/core/schnellwahl.ts`, `src/ui/schnellwahl.ts`).

## 0.10.8 – 07.11.2026
- **Vorwerk-Liste als PDF importieren** (Kunden → „📄 PDF-Liste importieren“): Die Tabelle (Name, Straße, PLZ/Ort, Telefon, Sperre, EWE, EWE-Datum, BNW, Notizen) wird mit pdf.js auf dem Gerät gelesen (`src/core/listenimport.ts`, `src/ui/listenimport.ts`). Vorschau mit Neu/Geändert/Gleich, Auswahl je Zeile, Liste der Kunden, die nicht mehr in der Liste stehen (es wird nichts gelöscht). Doppelte Zeilen werden zusammengeführt; gleiche Telefonnummer und Adresse mit anderem Namen gilt als Haushalt. Sperre/EWE/EWE-Datum/BNW landen in eigenen Vorwerk-Feldern (`vwliste-*`), neue Kunden bekommen Vorwerk „Potenzial“ und eine Notiz. Standorte werden nur über die Adresse gesucht. Test mit selbst erzeugter Beispiel-PDF (`tests/testliste-pdf.cjs`, erfundene Daten).
- **Kundenauswahl per Suche** überall (Termin, Reservieren, Verleihen, Gesprächsleitfaden): Suchfeld nach Name, Straße, Ort oder Telefon, ohne Eingabe die zuletzt benutzten Kunden; gleichnamige Kunden sind markiert und über Adresse/Telefon unterscheidbar (`src/core/kundenwahl.ts`, `src/ui/kundenwahl.ts`).

## 0.10.7 – 07.11.2026
- **Beispielkunden:** 54 erfundene Kunden im Beratungsgebiet (Lengede mit Ortsteilen, Peine, Vechelde, Ilsede, Hohenhameln, Söhlde, Wendeburg, Edemissen, Salzgitter), alle Bereiche und Status, Produkte aus dem erweiterten Katalog, Termine, Wiedervorlagen, Testgeräte. Fester Startwert, daher immer gleich.
- **Produktkatalog** auf 79 Produkte erweitert (Enpal 20, GALVANY 10, Vorwerk 49).
- **R-BEISPIEL:** `beispielSicher()` prüft jede Beispiel-Aktion gegen alle echten Datensätze und bricht sonst ohne Änderung ab. Demo-Modus speichert nie und startet nie über echte Daten. Beispielgeräte mit echter Reservierung bleiben.
- **Karte:** 🗑 in der Infobox von Potenzial-Markierungen, mit Sicherheitsabfrage, landet im Papierkorb.
- **Menü:** Sperren als eigener Knopf oben neben dem Logo, Einstellungen unten mit Trennlinie; „Jetzt sperren“ unter Einstellungen → Sicherheit.

## 0.10.6 – 07.11.2026
- **Geführter Gesprächsleitfaden in 7 Phasen** (`src/core/leitfragen.ts`): Vorbereiten, Einstieg, Situation, Problem, Zusammenfassen, Lösung, Nächster Schritt. Grundlage sind seriöse Vertriebsmethoden (SPIN-Fragen, aktives Zuhören, ehrlicher Denkanstoß, offene Fragen, klarer nächster Schritt); keine Druck- oder Manipulationstechniken (R-LEITFADEN).
- Leitfragen je Bereich (Enpal, GALVANY, Vorwerk) zum Antippen: Haken, das Stichwort fliegt in die Notiz des Bereichs, die Antwort wird dahinter getippt oder diktiert. Phasenleiste mit Fortschritt, Wischen oder Antippen wechselt die Phase, „Einwand?“ springt zur Einwandbehandlung.
- Einwände: Rückfrage zuerst, Antwort erst nach „Rückfrage gestellt · Antwort zeigen“. Letzte Phase mit „Widerrufsrecht erklärt“ (Satz in der Notiz).
- Gesprächsmodus: Notiz direkt unter dem Leitfaden; beim Abschließen eine Gesprächsbilanz, das Maskottchen erscheint bei Termin, Test, Angebot oder Abschluss.
- Sanfte Animationen (Karten gleiten, Haken federn, Phasenpunkt pulsiert); bei „Bewegung reduzieren“ nur ruhige Überblendungen.

## 0.10.5 – 07.11.2026
- **Textbausteine per Griff sortieren** (Finger, Maus, Pfeiltasten auf dem Griff), Pfeilknöpfe bleiben.
- **Einstellungen übertragen:** „Einstellungen sichern“/„Einstellungen einlesen“ unter Datensicherung. Verschlüsselte Datei ohne Kunden; „Sicherung einspielen“ lehnt sie ab.
- **Navigation:** Waze als Ziel für „Hinfahren“; Hinweis, dass die iOS-Standard-Navi-App aus einer Web-App nicht erreichbar ist.
- **Produktdetail:** „Link kopieren“ neben „Beim Hersteller ansehen“.

## 0.10.4 – 07.11.2026
- **Drei getrennte Texte** (R-TEXT neu): Photovoltaik (Enpal), Wärmepumpe (GALVANY), Vorwerk. Vorlagen und Empfänger je Bereich, Gesprächsmodus mit einer Notiz je Bereich, Kartei-Reiter „Photovoltaik“ und „Wärmepumpe“ statt „PV & Wärmepumpe“ (alter Link `?tab=enpal` führt zu Photovoltaik). Alte PV+WP-Notizen stehen in beiden Texten. Enpal-Doku nur noch für Photovoltaik. Schema 7.
- **Kalender** startet im Monat; Startansicht unter Einstellungen → Kalender (`einstellungen.kalenderStart`).
- Neue Termine und automatische Wiedervorlagen dauern standardmäßig 60 Minuten.

## 0.10.3 – 07.11.2026
- **Kalender** statt „Termine“: Reiter Liste, Monat, Woche, Tag, Geräte (Belegungskalender, `#/belegung` gehört jetzt zum Kalender). Leihgaben, Rückgaben, Reservierungen und überfällige Leihgaben als Einträge im Monat und als Ganztagszeile in Woche/Tag, ein-/ausblendbar; Antippen öffnet die Belegungs-Details (`src/core/kalender.ts`).
- **Termin-Karte** (`src/ui/terminkarte.ts`): Kunde, Adresse, Notiz, letzte Gespräche; Route, Anrufen (mit Sicherheitsabfrage), E-Mail, Erledigt, In Kalender-App, Bearbeiten, Löschen mit Sicherheitsabfrage. Auch aus der Terminliste.
- **Termine ziehen:** Finger halten = Griffe; Mitte verschiebt (auch auf andere Tage der Woche), oben/unten ändern Beginn/Ende im 15-Minuten-Raster; Maus zieht direkt. Monat: Termin auf anderen Tag ziehen, Uhrzeit bleibt.
- Symbol „Produkte“ in Menü und Produktübersicht.
- Produktbilder werden vom Service Worker nach dem ersten Abruf zwischengespeichert (eigener Cache, übersteht Updates, höchstens 300 Bilder).

## 0.10.2 – 07.11.2026
- Kontaktseite (öffentlich und Datenschutz): roter Balken „ENTWURF – NOCH NICHT VERWENDEN!“.
- Einstellungen → Meine Kontaktseite: dieselbe Warnung; „Link teilen“ und „QR-Code“ ausgeblendet, solange `ENTWURF` in `src/ui/kontaktseite.ts` gesetzt ist.

## 0.10.1 – 07.11.2026
- **Textbausteine** im Gesprächsmodus: Chips je Bereich über dem Notizfeld hängen den Satz als neue Zeile an (Enpal und Vorwerk getrennt, R-TEXT). Startliste je Bereich, pflegbar unter Einstellungen → Textbausteine (hinzufügen, ändern, sortieren, löschen, Startliste wiederherstellen). Schema 6 (`einstellungen.bausteine`).
- Hinweis auf die Diktierfunktion der Tastatur. Bewusst keine eigene Spracheingabe (Web Speech schickt Audio an Dritte, R-EXTERN).
- Hilfe-Thema „Textbausteine im Gespräch“.

## 0.10.0 – 07.11.2026
- **Produktübersicht** `#/produkte`: 46 Produkte (Enpal PV/WP, GALVANY WP, Vorwerk Kobold) aus `src/data/produkte.json`, Reiter je Bereich, Kategorien, Suche, Detail mit technischen Daten, Preis mit Stand, „Passt dazu“, Link zum Hersteller, Kennzeichen „bald verfügbar“. Bilder nur verlinkt, offline Bereichs-Icon. Im Beratungs-Schutz erlaubt, in der Kommandozeile suchbar.
- **Produkte im Gespräch markieren:** Kartei (Enpal/Vorwerk) und Gesprächsmodus, je Produkt Interesse / Später / Schon vorhanden / Kein Interesse; Verlauf, Texte (R-TEXT), Filter „Produkte“, Auswertungen „Produkt-Interessen“ und „Meistgefragte Produkte“ (auch im PDF). Schema 5.
- Kontaktseite: Schritt 2 „Beratung vor Ort“ richtet sich nach dem Vorhaben.
- Test: E2E wartet nach „Gespräch verwerfen“ robust auf die Kundenseite.

## 0.9.9 – 07.11.2026
- Kontaktseite: Titel unter dem Foto zweizeilig.

## 0.9.8 – 07.11.2026
- **Feldverwaltung:** Einstellungen → Felder: jedes Feld je Bereich (Kontakt, PV, WP, Vorwerk) ein-/ausblendbar, Daten bleiben erhalten. Eigene Felder (Text, langer Text, Zahl mit Einheit, Datum, Ja/Nein, Auswahlliste, Telefon, E-Mail, Link) anlegen, bearbeiten, löschen. Eigene Felder in Kartei, Gesprächsmodus, Texten ihres Bereichs (R-TEXT), Kundenansicht, Suche; Ja/Nein und Auswahllisten im Filter von Kundenliste und Karte. Schema 4.
- **Kontaktseite:** „Selbständiger Berater für Photovoltaik und Wärmepumpe“ unter dem Foto, im Kontaktbereich, in der vCard und im Impressum; freundlichere Streitschlichtung; Platzhalter für die USt-IdNr.

## 0.9.7 – 07.11.2026
- **Kontaktseite:** echte Anschrift und Arbeitsnummer (auch WhatsApp), Beratungsgebiet zwischen Peine und Salzgitter, vollständiges Impressum (§ 5 DDG, § 18 MStV, VSBG), Aufsichtsbehörde LfD Niedersachsen, Scroll-Animationen, Schnellkontakt-Leiste auf Handy und Tablet, barrierefrei geprüft (axe-core ohne Verstöße).

## 0.9.6 – 07.11.2026
- Auswertungs-PDF über alle Bereiche trägt den Titel „Gesamtauswertung“.

## 0.9.5 – 07.11.2026
- **Dropbox entfernt:** Abgleich, Einstellungen-Abschnitt, Anmeldung und Statusanzeige sind raus. Gesichert wird nur noch als verschlüsselte Datei in iCloud Drive. Gespeicherte Dropbox-Zugangsdaten werden beim nächsten Speichern verworfen. Hilfe, Kommandozeile („Daten in iCloud sichern“), Anleitung, Regeln und Datenschutzerklärung der Kontaktseite angepasst.

## 0.9.4 – 07.11.2026
- **Kontaktseite:** neues Zitat („Ich berate so, wie ich selbst beraten werden möchte …“), Versprechen positiv formuliert, Datenschutzerklärung `kontakt/datenschutz.html` (im Footer verlinkt), persönliche Daten zentral in `kontakt/daten.js`. Keine Fremd-Requests, keine Cookies, kein Storage.

## 0.9.3 – 07.11.2026
- **Kontaktseite:** echter Name, Leiste „Unverbindlich · Ohne Druck · Ehrlich beraten“, neuer Abschnitt „Beratung ohne Druck – mein Versprechen“ mit drei Karten; Zitat, Ablauf und Rückruf-Hinweis angepasst. Platzhalter sind nur noch Kontaktdaten und Impressum.

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
