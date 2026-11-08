# Änderungsverlauf

## 0.16.0 – 08.11.2026
Vereinbarte Termine sicher eintragen, mit Blick in den Kalender (Schema 13).
- **Zeit im Kalender wählen** (`src/ui/terminwahl.ts`): Neben jedem Termin-Datum (Termin-Fenster, Gesprächsabschluss, Leitfaden, Enpal-Doku) steht „📅 Im Kalender wählen“. Es öffnet den ganzen Kalender (Tag/Woche) mit allen vorhandenen Terminen, Wiedervorlagen und festen Zeiten; freie Zeiten in der Arbeitszeit sind grün, außerhalb grau. Uhrzeit antippen wählt (15-Minuten-Raster), Termin antippen zeigt Details, Dauer wählbar (PV/WP 1,5 Std., Vorwerk 1 Std. vorbelegt).
- **„Du bist sowieso in der Nähe“** (`naheVorschlaege()` in `src/core/terminfinder.ts`): freie Zeiten direkt vor oder nach Terminen im Umkreis von 15 km (Luftlinie, Fahrzeit grob geschätzt, mit Puffer), nächste 2 Wochen, höchstens 5.
- **Überschneidungen:** Warnhinweis, wenn ein Termin sich mit einem anderen Termin oder einer festen Zeit überschneidet oder außerhalb der Arbeitszeit liegt (nur Hinweis, nie Sperre).
- **Arbeitszeit und feste Zeiten** (`src/ui/sperrzeiten.ts`, Kalender „🔒 Feste Zeiten“ und Einstellungen → Allgemein): Arbeitstage, von/bis, Puffer zwischen Terminen; feste Zeiten einmalig (auch mehrere Tage, z. B. Urlaub), jede Woche oder alle 2 Wochen, ganztägig oder von/bis, mit optionalem Ende. Gestreift im Kalender.
- **„Termin vereinbart“ geht nicht mehr verloren:** Das Datum ist Pflicht (Gesprächsmodus, Leitfaden, Enpal-Doku). Wählt Jan das Ergebnis, öffnet sich gleich der Kalender. Kennt er das Datum noch nicht, kreuzt er „Datum noch offen“ an: Sperling legt für den nächsten Werktag die Wiedervorlage „Termin-Datum klären“ an. Das Klemmbrett schätzt kein Termindatum mehr (vorher +3 Tage).
- **Enpal-Doku (Telefonat und Hausbesuch)** legt bei „Termin vereinbart“ einen echten Termin an (Bereich, Adresse als Ort, gewählte Dauer), hebt den Status der Themen und bietet danach die Terminbestätigung an. Auch andere Ergebnisse ziehen den Status mit (wie im Gesprächsmodus).
- **Kalender Woche/Tag:** Die Tageszeile mit dem Datum bleibt beim Scrollen oben stehen (das Raster scrollt in sich, die Stelle bleibt beim Ziehen/Bearbeiten erhalten).
- Schema 13: `einstellungen.arbeitszeit`, `einstellungen.sperrzeiten`.

## 0.15.0 – 08.11.2026
Anrede und Titel als Vorauswahl (Schema 12).
- **Anrede als Auswahl:** Keine Anrede, Frau, Herr, Familie. Statt freier Eingabe ein Auswahlfeld in der Kundenkarte und im Gesprächsmodus.
- **Neues Feld „Titel“** mit Vorauswahl (Dr., Prof., Prof. Dr., Dr. med., Dr. med. dent., Dr.-Ing., Dipl.-Ing., Dipl.-Kfm.) und „Anderer Titel …“ zur freien Eingabe (`TITEL_FREI`, Fenster in `bindeFelder`). Ein- und ausblendbar wie jedes Kontaktfeld (Einstellungen → Felder). ?-Knopf an beiden Feldern mit Hilfethema „Anrede und Titel“.
- **Titel beim Namen:** „Dr. Bernd Muster“ bzw. „Muster, Dr. Bernd“ in Listen, Titeln, Leihschein, Enpal-Doku und Kundenliste-PDF; sortiert wird weiter nach Nachname.
- **Begrüßung** in E-Mails und Terminbestätigungen einheitlich über `anredeZeile()`: „Guten Tag Frau Prof. Dr. Muster,“, „Guten Tag Familie Muster,“; ohne Anrede „Guten Tag Dr. Kim Muster,“. Nur Prof. und Dr. kommen in die Begrüßung (`titelFuerAnrede`), Zusätze wie „med.“ und Diplomgrade nicht.
- **Textvorlagen:** neue Platzhalter `{{titel}}` und `{{begruessung}}`; `{{name}}` enthält den Titel.
- **Export Excel/CSV:** neue Spalten „Anrede“ und „Titel“ nach dem Vornamen.
- **Vorwerk-Listenimport:** „Herr Dr. Max Muster“ oder „Muster, Frau Erika“ wird in Anrede, Titel, Vor- und Nachname zerlegt.
- **Migration:** Bisherige Freitexte werden beim Einlesen aufgeteilt („herr dr.“ → Anrede „Herr“, Titel „Dr.“; „Fr.“ → „Frau“; „Fam.“ → „Familie“). Unbekannte Anreden (z. B. „Eheleute“) bleiben unverändert erhalten und stehen weiter in der Auswahl.

## 0.14.6 – 08.11.2026
Korrekturen aus der Fehlerprüfung vom 08.11.2026 (Schema 11).
- **Laufende Gespräche verschlüsselt mitsichern.** Neuer Teil des Bestands `entwuerfe` (Schema 11): alle 20 s bei Änderungen, beim Wechsel in eine andere App, vor dem Sperren und vor „Jetzt aktualisieren“. Nach dem Entsperren kommen sie zurück, mit kurzem Hinweis. Speichern oder Verwerfen entfernt den Entwurf.
- **iCloud-Abgleich:** Ist die Datei älter, aber seit dem letzten Abgleich auf beiden Geräten geändert, fragt Sperling nach („Auf beiden Geräten geändert“) statt „schon aktueller“ zu melden (`abgleichUrteil`). Von Hand eingespielte Sicherungen werden als neuer Stand gespeichert, damit ein späterer Abgleich sie nicht ohne Rückfrage ersetzt.
- **Karten-Pins nach Bereich** (`pinFarbe`/`PIN_FARBEN` in `src/core/kartenfilter.ts`): ein Bereich = Bereichsfarbe, mehrere = Mischfarbe (lila mit weißem Punkt), keiner = grau. Filter grenzt ein. Status im Tooltip und in der Infobox. Legende angepasst.
- **Wiedervorlagen auf Werktage** (`werktagPlus`/`freierTag` in `src/core/vertrieb.ts`): Vorschläge nach dem Gespräch, Nachfassen, Pflege, Widerrufsfrist, Kaufinteresse, Haustür „Später“ überspringen Wochenende und Feiertage in Niedersachsen.
- **Tempo:** letzter Kontakt über einen Index statt Suche je Kunde (`kontaktIndex`), Kundenliste zeichnet lange Listen in Stücken und sucht ab 300 Kunden nach kurzer Tipp-Pause, `mutate` sichert per `structuredClone`.
- **Enpal-Doku** aus dem Gespräch schreibt den Gesprächspartner immer „Vorname Nachname“.
- **Update:** Der Service Worker holt beim Installieren alle Dateien frisch vom Server (`cache: 'reload'`).
- **Versionen** aus der Zeit vor einem Passwortwechsel: Sperling fragt nach dem früheren Passwort und verschlüsselt mit dem aktuellen neu.
- **CSV:** Telefonnummern wie „+49 170 …“ ohne Hochkomma; Formeln bleiben geschützt.
- **Handy:** kein seitliches Verschieben mehr (Auswertungen, Förderung, Kundenkarte, Gesprächsmodus auf schmalen Geräten).

## 0.14.5 – 08.11.2026
- **Produkte direkt in den Bestand übernehmen.** Im Produktdetail der Produktübersicht steht bei Vorwerk-Produkten „➕ Zu meinem Bestand hinzufügen“. Der Knopf legt nichts sofort an, sondern öffnet das gewohnte Fenster „Neues Vorführgerät“ bzw. „Neues Verbrauchsmaterial“, vorbefüllt mit Bezeichnung, Produktbezug (dadurch Bild) und, wo der Katalog ihn kennt, dem Lieferumfang als Zubehör; bei Material Einheit (z. B. „Flasche“ bei 500 ml) und Anzahl 1. Der Cursor steht gleich in der Seriennummer bzw. Anzahl. Bei Sets und Zubehör fragt Sperling vorher, ob es als Vorführgerät oder Material geführt wird. Nach Speichern oder Abbrechen geht es zurück zum Produkt; nach dem Speichern mit kurzer Bestätigung, und das Detail zeigt „Schon in deinem Bestand: …“. Enpal und GALVANY haben keinen eigenen Bestand, dort gibt es den Knopf nicht.
- **Neuer Artikel im Bestand: Bezeichnung mit Katalogsuche.** Statt der langen Auswahlliste sucht das Feld „Bezeichnung“ beim Tippen in der Produktübersicht (Vorwerk) und zeigt bis zu acht Treffer mit Bild. Antippen übernimmt Name, Produktbezug und passende Felder (Zubehör bzw. Einheit, nur wenn dort noch nichts steht); ohne Antippen bleibt es eine freie Eingabe. Die Verknüpfung lässt sich mit ✕ wieder lösen.
- **Produktbild im Bestand:** Geräte und Material aus der Produktübersicht zeigen ein kleines Produktbild (nur verlinkt wie in der Produktübersicht, R-EXTERN).

## 0.14.4 – 08.11.2026
- **Karte: Haustür-Ergebnis als Symbol am Pin.** Neben „Keine Werbung“ (⛔) zeigt der Pin jetzt auch 🚪 „Nicht da“, ⏰ „Später“ und ✋ „Kein Interesse“, sobald das das jüngste Ergebnis an der Tür ist. Das Symbol sitzt in einem kleinen weißen Kreis oben rechts am Pin, damit es auf Satellit und Straße gut erkennbar ist; die Pinfarbe (Status) bleibt. „Gespräch geführt“ bekommt kein Symbol, das zeigt der Status. Die Legende unter der Karte erklärt die vier Symbole, der Tooltip am Pin nennt das Ergebnis.

## 0.14.3 – 08.11.2026
- **Auswertung: Zahlen und Prozente direkt an den Balken.** Verkaufstrichter: rechts an jeder Stufe die Anzahl Kunden und ihr Anteil an allen im Trichter (erste Stufe 100 %); bei „Alles zusammen“ steht im Balken die Zahl je Sparte; zwischen den Stufen wie bisher die Quote zur Vorstufe. Kurze Erklärung unter dem Trichter.
- **Gespräche im Verlauf:** über jeder Säule die Anzahl (leere Zeiträume ohne Zahl, bei vielen Säulen kleiner).
- **Fokus je Sparte → Entwicklung:** Anteil je Sparte in Prozent im Balken.
- **PDF-Bericht:** Trichter mit Zahl je Sparte im Balken, Anzahl und Anteil („74 (100 %)“), Erklärzeile; Säulen im Verlauf mit Anzahl darüber.
- Lesbarkeit: Zahlen im Balken stehen auf einem hellen Schildchen, damit sie auf Gelb, Blau, Grün und den Mustern hell wie dunkel gut lesbar sind.

## 0.14.2 – 08.11.2026
- **Karten-Hinweis verschwindet nach der Eingewöhnung.** „Tippe lange (oder Rechtsklick) auf ein Haus, um es zu markieren.“ steht nur noch, bis drei Häuser auf der Karte markiert wurden (Potenzial, Kunde anlegen oder Haustür-Ergebnis). Ein ✕ am Hinweis blendet ihn sofort aus. Unter Einstellungen → Hilfe holt „Ausgeblendete Hinweise wieder zeigen“ ihn zurück, ebenso den Installationshinweis der Übersicht. Gemerkt wird das nur auf dem Gerät (`sperling.hilfe`, keine Kundendaten).

## 0.14.1 – 08.11.2026
- **Rechner: Erklärungen zu den Feldern.** Neben jedem Feld steht ein kleines „?“. Ein Tipp klappt darunter eine kurze Erklärung auf, z. B. was „Ohnehin fällig“ oder die Jahresarbeitszahl bedeuten und woher man den Wert bekommt. Ein zweiter Tipp klappt sie wieder zu. Das gilt auch für die Vorlagen in den Einstellungen.

## 0.14.0 – 08.11.2026 (Schema 10)
Abläufe verzahnt: Nach einer Auswahl bietet Sperling gleich den passenden nächsten Schritt an, und nach dem Abstecher geht es an genau die Stelle zurück, von der man kam (Seite, Reiter, Scrollstelle; Regel R-FLOW).
- **Termin und Gespräch gehören zusammen.** „💬 Gespräch starten“ jetzt auch in der Termin-Karte (Kalender, Terminlisten) und in „Jetzt nachfassen“ der Auswertung. Aus einem Termin übernimmt das Gespräch Bereich und Kontaktart (Termin = Hausbesuch, Wiedervorlage = Telefon) und zeigt die Termin-Notiz oben; beim Speichern wird der Termin automatisch abgehakt.
- **„Vereinbart“ stellt den Abschluss vor.** Die Antwort auf dem Klemmbrett (Vor-Ort-Termin, Angebot rechnen, Unterlagen schicken, Später melden, Bestellung …) setzt Ergebnis, Status und ein passendes Datum vor. Ein anderes Ergebnis zieht den Status mit, solange er nicht von Hand geändert wurde. Nicht erreicht: Wiedervorlage morgen. „Partner fehlt“: Termin mit beiden.
- **„Als Nächstes“ nach dem Gespräch.** Statt in den Verlauf zu springen, geht es zurück dorthin, wo das Gespräch gestartet wurde, mit einem Fenster der passenden Schritte: Termin bestätigen, Angebot erfassen, Angebot als angenommen/abgelehnt markieren, Auftragsstand beginnen, Unterlagen mailen, Partner als Ansprechpartner eintragen, Enpal-Doku kopieren, Chance im anderen Bereich (z. B. Solaranlage geplant) und „Weiter zum nächsten Termin“ mit Navi.
- **Wiedervorlagen wissen, wozu sie da sind** (neues Feld `termin.bezug`). Nachfassen eines Angebots fragt beim Abhaken „Angenommen / Abgelehnt / Noch offen“; die Nachfrage zu einem Leihgerät bietet „Kauft / Zurückgenommen / Verlängern / Nur notieren“; Pflege-Wiedervorlagen haben eigene Schnelltexte. Ältere Wiedervorlagen werden über ihren Titel zugeordnet.
- **Haustür führt weiter.** „Gespräch“ öffnet das Klemmbrett mit Kontaktart Hausbesuch (auch für ein neu markiertes Haus), „Später“ fragt gleich nach dem Termin für die Wiedervorlage.
- **Status räumt mit auf.** Wird ein Bereich von Hand auf „Abschluss“ oder „Kein Interesse“ gesetzt, bietet Sperling an, offene Angebote gleich als angenommen/abgelehnt zu markieren (Nachfassen erledigt) bzw. den Auftragsstand zu beginnen.
- **Vorführgerät gekauft:** Auftragsstand Vorwerk (gekauft, übergeben) und Pflege-Wiedervorlagen werden gleich angeboten. Rückgabe mit Kaufinteresse: „Angebot erfassen“ oder „Nachfassen in 1 Woche“.
- **Neuer Termin mit Kunde:** gleich „Jetzt bestätigen“ (SMS, WhatsApp, E-Mail) oder „Später“.
- **Angebot angenommen:** auf Wunsch Wiedervorlage nach der Widerrufsfrist (14 Tage).
- **Auswertung „Jetzt nachfassen“:** je Zeile 📞 Anrufen und 💬 Gespräch starten.

## 0.13.10 – 08.11.2026
- **Rechner: Vorlagen für Privat und Gewerbe.** Oben im Rechner wählst du die Vorlage: „Privat (Einfamilienhaus)“ mit den bisherigen Werten oder „Gewerbe (netto)“ mit typischen Firmenzahlen (30 kWp, 25 ct Strom, mehr Eigenverbrauch, größere Wärmepumpe). Beim ersten Mal startet der Rechner mit „Privat“, danach merkt er sich die zuletzt gewählte Vorlage und startet wieder damit, auch aus der Kundenkartei. Strompreis, Verbrauch und Heizkosten des Kunden kommen wie bisher obendrauf.
- **Eigene Startwerte.** Unter Einstellungen → Vertrieb → „Rechner: Vorlagen“ lassen sich die Werte beider Vorlagen ändern und eigene Vorlagen anlegen, umbenennen und löschen. Im Rechner speichert „⭐ Als Vorlage merken“ die aktuellen Werte in eine Vorlage oder als neue Vorlage.

## 0.13.9 – 08.11.2026
- **Kundenliste exportieren** (Kunden → „⬇ Export“ neben der Sortierung, `src/core/kundenexport.ts`, `src/ui/kundenexport.ts`): genau die angezeigte Liste (Suche, Filter, Sortierung und Namensanzeige aus 0.13.6) als **PDF** (A4 quer, Kopfzeile auf jeder Seite, Seitenzahlen, Hinweis „Vertraulich“), als **Excel-Tabelle** (.xlsx: fette, fixierte Kopfzeile mit Filter, alle Zellen als Text, damit PLZ und Telefonnummern führende Nullen behalten) oder als **CSV** (Semikolon, UTF-8, öffnet in deutschem Excel richtig; Zellen, die mit `=`, `+`, `-` oder `@` beginnen, bekommen ein `'` davor). Spalten: Nachname, Vorname, Firma, Straße, PLZ, Ort, Telefon, E-Mail, Status je Bereich, letzter Kontakt. Notizen, Gespräche, Fotos und eigene Felder werden nicht exportiert.
- **Buchstaben-Trenner** bei „Name A–Z“: In der Kundenliste steht vor jedem neuen Anfangsbuchstaben eine farbige Trennzeile, die beim Scrollen oben stehen bleibt (`anfangsbuchstabe` in `src/core/model.ts`, passend zu `kundenVergleich`; Umlaute zählen zum Grundbuchstaben, Ziffern und Sonstiges als „#“). Im PDF ebenfalls Trennbalken, nie allein am Seitenende, auf einer neuen Seite mitten im Buchstaben als „H (Fortsetzung)“. In Excel getönte Trennzeilen. Die CSV-Datei bleibt ohne Trennzeilen, damit andere Programme sie sauber einlesen. Bei anderer Sortierung gibt es keine Trenner. Einträge ohne Namen erscheinen im PDF mit ihrem Listentitel (Ort, Straße).
- **Datenschutz:** Die Datei entsteht nur auf dem Gerät (keine Bibliothek, kein Dienst; die Excel-Datei erzeugt Sperling selbst) und geht über das Teilen-Menü nur dorthin, wohin der Nutzer sie schickt. Der Dialog weist darauf hin, dass die Datei nicht verschlüsselt ist. Ergänzt in Einstellungen → Sicherheit & Datenschutz → „Was wohin geht“ und in R-KRYPTO/R-EXTERN.
- 3 neue Unit-Tests (Tabelle ohne Notizen, CSV-Schutz, gültige XLSX), Browser-Test lädt CSV, Excel und PDF einer gesuchten Liste herunter und vergleicht die Anzahl.

## 0.13.8 – 08.11.2026
- **Übersicht: Bereichsleiste statt großer Kacheln.** Photovoltaik, Wärmepumpe und Vorwerk stehen in je einer schmalen, farbigen Zeile mit drei Zahlen-Knöpfen: Potenzial, in Arbeit, Kunden. Ein Tipp auf eine Zahl öffnet die Kundenliste, schon gefiltert nach Bereich und Status. Ein Tipp auf den Namen öffnet wie bisher den ganzen Bereich. Auf dem iPad quer nimmt die Leiste 62 statt 194 Pixel Höhe ein, auf dem Handy 198 statt 331.

## 0.13.7 – 08.11.2026
- **Einträge ohne Namen stehen zwischen den Namen.** In „Name A–Z“ zählt bei Einträgen ohne Namen der Ort (oder die Straße, je nach Einstellung) wie ein Name, z. B. „Lengede, Lindenweg 8“ zwischen „Lehmann“ und „Meier“. Bisher standen sie gesammelt am Ende.

## 0.13.6 – 08.11.2026
- **Kunden nach Nachname sortieren.** „Name A–Z“ in der Kundenliste geht jetzt nach dem Nachnamen, dann nach dem Vornamen (vorher nach dem Vornamen). Einträge ohne Namen, etwa ein Pin auf der Karte, stehen danach und sind nach Ort und dann Straße sortiert (Hausnummern der Größe nach).
- **Neue Einstellung „Namen in Listen“** (Einstellungen → Kundendaten): Namen als „Vorname Nachname“ oder „Nachname, Vorname“ anzeigen, und Einträge ohne Namen mit „Ort, dann Straße“ oder „Straße, dann Ort“ benennen und sortieren. Texte für Enpal, GALVANY und Vorwerk sowie Leihscheine schreiben den Namen weiter als „Vorname Nachname“.

## 0.13.5 – 08.11.2026
- **Gespräch: „Zuletzt“ kompakter.** Links steht nur noch eine Zeile mit Datum und Anfang des letzten Eintrags. Ein Tipp klappt die letzten drei Gespräche/Notizen auf (je höchstens drei Zeilen) mit Knopf „Ganzer Verlauf“.

## 0.13.4 – 08.11.2026
- **Rechner „Wann rechnet sich das?“ als eigener Menüpunkt.** Der Rechner steht nicht mehr unter Förderung, sondern hat in der Leiste links einen eigenen Knopf „Rechner“ mit Taschenrechner-Symbol (Handy und iPad hochkant: unter „Mehr“). Die Förderung verweist mit einem Link darauf.
- **Aus dem Kunden direkt in den Rechner.** In der Kundenkartei (Reiter Photovoltaik und Wärmepumpe) führt „🧮 Wann rechnet sich das?“ in den Rechner, mit den Angaben des Kunden schon eingetragen: Strompreis und Speicherwunsch bei Photovoltaik, Wärmebedarf aus dem Gas- oder Ölverbrauch und Gaspreis aus den Heizkosten bei der Wärmepumpe. „‹ Zurück zum Kunden“ bringt einen an dieselbe Stelle in der Kartei zurück.

## 0.13.3 – 08.11.2026
- **Produktübersicht: Sparte auf einen Blick.** Jede Produktkachel hat jetzt einen farbigen Rahmen und eine leicht getönte Fläche in der Bereichsfarbe (Photovoltaik gelb, Wärmepumpe blau, Vorwerk grün) und oben links auf dem Bild ein Etikett mit dem Namen der Sparte. So ist die Zuordnung auch dann klar, wenn das Herstellerbild sie nicht verrät. Funktioniert im hellen und dunklen Farbschema.

## 0.13.2 – 08.11.2026
- **Klemmbrett Vorwerk: Gerät gleich dalassen.** Tippt man beim nächsten Schritt „Testgerät da gelassen“ an, klappt darunter die Auswahl der freien Vorführgeräte aus dem Bestand auf. Ein Tipp auf ein Gerät öffnet den bekannten Verleih-Dialog mit vorausgefülltem Kunden: Rückgabedatum, Zustandsfotos, Unterschrift des Kunden auf dem Tablet, danach Leihschein als PDF. Anschließend steht am Klemmbrett „✓ Gerät übergeben … · unterschrieben“ mit Knopf zum Leihschein; schon verliehene Geräte des Kunden stehen ebenfalls dort. Ausgemusterte und verliehene Geräte werden nicht angeboten. Nach Unterschrift und Leihschein steht das Klemmbrett wieder genau an der Stelle, an der man war.

## 0.13.1 – 08.11.2026
- **Belegungskalender: Titelzeile bleibt oben.** Bei vielen Geräten scrollte die Datumszeile nach oben weg. Jetzt bleibt sie stehen: auf Tablet und Computer klebt sie oben an der Seite (unter dem Demo-Band), auf dem Handy scrollt die Geräteliste in einem eigenen Bereich unter der festen Zeile.

## 0.13.0 – 08.11.2026
- **Angebote mit Betrag und Frist** (Kunde → Reiter „Angebot & Auftrag“, `src/core/vertrieb.ts`, `src/ui/vertrieb.ts`): Bereich, Bezeichnung, Betrag, Datum, „gültig bis“, Notiz. Auf Wunsch legt Sperling Nachfass-Wiedervorlagen an (Abstände unter **Einstellungen → Vertrieb** frei wählbar, Standard 3 und 7 Tage, bis zu 6 Abstände, leer = aus) und setzt den Status auf „Angebot erstellt“. Summe der offenen Angebote, Hinweis „Frist abgelaufen“. „Angenommen“ setzt den Abschluss, beginnt den Auftragsstand und hakt die Nachfass-Wiedervorlagen ab; „Abgelehnt“ und „Ersetzt“ ebenso ohne Abschluss.
- **Auftragsstand nach dem Abschluss:** Schritte je Bereich (PV: Vertrag, Planung, Montage, Netzanmeldung, Inbetriebnahme; WP mit Förderantrag; Vorwerk: Kauf, Lieferung, Einweisung) mit Haken und Datum (ohne Haken = geplant), Fortschrittsbalken, Notiz und „Stand für den Kunden kopieren“. Ist der letzte Schritt abgehakt, schlägt Sperling **Pflege-Wiedervorlagen** vor (Zufriedenheit nach 4 bzw. 2 Wochen, Jahresbilanz, WP nach der Heizperiode und Wartung, Vorwerk-Service nach einem Jahr).
- **Termin bestätigen** (Termin-Karte): fertiger Text mit Datum, Uhrzeit, Adresse und „Bitte bereitlegen“ je Bereich (abwählbar; Listen unter **Einstellungen → Vertrieb** selbst festlegen, ein Punkt pro Zeile, zurücksetzbar), Versand per SMS, WhatsApp oder E-Mail vom eigenen Gerät, oder kopieren.
- **Tagesroute** (Karte → „🚗 Tagesroute“, Kalender-Tagesansicht → „Route des Tages“): Termine eines Tages nummeriert in zeitlicher Reihenfolge mit Linie, Luftlinien-Kilometer, Hinfahren je Stopp, ganze Route in Google Maps (nur Koordinaten). Darunter „Unterwegs vorbeischauen“: Kunden nahe der Strecke mit offenem Angebot, fälliger Wiedervorlage, Interesse oder Potenzial (Umkreis wählbar). Andere Kunden sind während der Route ausgeblendet; „Andere Kunden zeigen“ blendet sie ein.
- **Ansprechpartner** (Kundenübersicht): mehrere Personen mit Rolle (entscheidet, Technik, Buchhaltung, Nutzer), Funktion, Telefon, E-Mail, Notiz; Anrufen/E-Mail direkt, Löschen über „Gelöscht“ wiederherstellbar. Hinweis, wenn niemand als „Entscheidet“ markiert ist.
- **Haustür-Ergebnis mit einem Tipp** (Kundenübersicht und Infobox auf der Karte, auch für noch nicht markierte Häuser): nicht angetroffen, später, Gespräch, kein Interesse, keine Werbung. Erscheint im Verlauf, zählt (außer „nicht angetroffen“/„keine Werbung“) als Kontakt. „Kein Interesse“ setzt vermutete Bereiche auf „Kein Interesse“. „Keine Werbung“: ⛔ am Pin, Warnband beim Kunden, nie in Vorschlägen (neue Regel R-WERBUNG).
- **Schema 9:** `kunde.angebote`, `kunde.auftrag`, `kunde.ansprechpartner`, `kunde.haustuer` (leer ergänzt); neue Einstellungen `nachfassTage` und `bereitlegen` mit Standardwerten. Neuer Einstellungsbereich „Vertrieb“. 5 neue Unit-Tests, Browser-Test erweitert (Kunde mit XSS-Namen, Angebot bis Pflege, Terminbestätigung, Tagesroute und Haustür in der Demo).
- **Demo:** Bäckerei Test mit drei Ansprechpartnern und offenem PV-Angebot, Anna Beispiel mit geplanter Montage, Haustür-Ergebnisse, Angebote und Aufträge bei den Gebietskunden, übermorgen ein voller Tag für die Tagesroute.

## 0.12.1 – 08.11.2026
- **Textvorlagen: Platzhalter per Knopf.** Unter jeder Vorlage (Einstellungen → Texte & E-Mail) stehen Knöpfe mit verständlichen Namen („+ Vorname“, „+ Adresse“, „+ Kundendaten“ …). Ein Tipp fügt den Platzhalter an der Schreibmarke ein (markierter Text wird ersetzt); die Vorlage behält den Fokus, die Tastatur auf dem iPad bleibt offen, gespeichert wird sofort. Abtippen von `{{…}}` ist nicht mehr nötig.

## 0.12.0 – 08.11.2026
- **Gespräch als digitales Klemmbrett** (ersetzt den Leitfaden mit 7 Phasen aus 0.10.6). Im Gesprächsmodus ist „📋 Klemmbrett“ die erste Seite: je Bereich drei Abschnitte (Situation, Bedarf, Nächster Schritt) mit Punkten zum Ausfüllen statt Fragen zum Abhaken. Kartei-Felder (z. B. Stromverbrauch, Dachausrichtung, Heizungsart, Bodenbeläge) werden direkt in die Kundenkartei geschrieben; Auswahlfelder als große Antipp-Knöpfe. Gesprächsantworten (Anlass, was ärgert, was wichtig ist, Entscheider, nächster Schritt, Widerrufsrecht) per Antippen plus eigenem Text; sie landen beim Speichern als „Frage: Antwort“-Zeilen in der Notiz des jeweiligen Bereichs (R-TEXT). Unter jedem Punkt eine kleine Formulierungshilfe. Erledigte Punkte bekommen Haken und Farbe, Zähler je Abschnitt und ein Fortschrittsring zeigen, was noch fehlt. Ausgeblendete Kartei-Felder erscheinen nicht.
- **Vorbereitung:** oben aufklappbar, was aus früheren Gesprächen bekannt ist und was heute noch zu klären ist.
- **Einwand-Knopf** schwebt unten rechts und öffnet ein Fenster von unten: Einwand wählen, erst die Rückfrage, dann „Antwort zeigen“. „Zurück zum Gespräch“ führt ans Klemmbrett zurück, nichts geht verloren; die Zahl am Knopf zählt behandelte Einwände.
- **Abschließen:** Die Gesprächsbilanz zeigt je Bereich „x von y erfasst“, behandelte Einwände, „Widerrufsrecht erklärt“ und was noch offen ist. Der nächste Schritt vom Klemmbrett ist vorausgefüllt.
- Die Seite „Gespräch“ ohne laufendes Gespräch zeigt einen Spickzettel (die wichtigsten Fragen je Abschnitt) und die Einwände. `src/core/leitfragen.ts` entfällt, neu `src/core/klemmbrett.ts`. Kein Schemawechsel, Antworten nur im Entwurf (Arbeitsspeicher).

## 0.11.1 – 08.11.2026
- **Einstellungen übersichtlicher.** Statt 17 Kästen untereinander gibt es acht Bereiche (Allgemein, Texte & E-Mail, Kundendaten, Sicherung, Sicherheit & Datenschutz, Meine Kontaktseite, Hilfe, Gelöscht & Beispieldaten), jeweils mit einer Zeile zum aktuellen Stand. Auf dem iPad quer steht links die Liste und rechts der Inhalt; auf Handy und iPad hochkant öffnet ein Tipp den Bereich als eigene Seite (`#/einstellungen?bereich=…`, auch aus der Suche, der Sicherungs-Erinnerung und dem Kunden-Texte-Tab erreichbar). Suchfeld über alle Bereiche, Ein/Aus als Schalter, lange Erklärungen eingeklappt hinter „ⓘ“, Textvorlagen je Bereich aufklappbar, „Automatisch sperren“ als Auswahl, „Alle Daten löschen“ abgesetzt im Gefahrenbereich, „Fotos mitsichern“ jetzt bei der Sicherung. Alle Bereiche werden gezeichnet und nur ein-/ausgeblendet, daher bleiben IDs und Verhalten gleich.
- **Einheitliche Symbole** in Menüleiste, „Mehr“-Menü und Einstellungen (`src/ui/symbole.ts`): schlichte Linien-Symbole in Sperling-Grün mit heller Füllfläche, passen sich hell/dunkel an. Ersetzen die kleinen Logo-Bildchen, die nebeneinander schwer zu unterscheiden waren.

## 0.11.0 – 08.11.2026
- **Auswertungen nach Vertriebssicht neu geordnet** (`src/ui/views/auswertung.ts`): oben vier Kernzahlen (Abschlüsse, Abschlussquote, offene Chancen, Gespräche), darunter **Verkaufstrichter** (Potenzial → Interesse → Termin → Angebot → Abschluss mit Quote je Übergang, schwächste Stufe markiert, Tipp), **Jetzt nachfassen** (überfällige Termine/Wiedervorlagen, Angebote ohne Kontakt seit 7 Tagen ohne kommenden Termin, Testgeräte mit fälliger Rückgabe; Tippen öffnet den Kunden) und bei „Alles zusammen“ **Sparten im Vergleich** als Tabelle. Die bisherigen Inhalte (weitere Kennzahlen, Gespräche im Verlauf, Fokus je Sparte, Ergebnisse, meistgefragte Produkte) stehen eingeklappt unter „Aktivität im Detail“.
- **Fairer Vergleich:** Läuft der Zeitraum noch (Woche, Monat, Quartal, Jahr), zählt er bis heute und wird mit gleich vielen Tagen des Vorzeitraums verglichen (z. B. 1.–8. November gegen 1.–8. Oktober statt gegen den ganzen Oktober).
- **Zeiträume:** Woche, Monat, Quartal (neu), Kalenderjahr direkt; Tag, 1 Monat, 3 Monate, ½ Jahr und 365 Tage unter „Mehr“. Datumsfeld entfällt, „Heute“ erscheint nur beim Blättern.
- **Statusverlauf (Schema 8):** Jede Statusänderung je Sparte wird mit Datum gespeichert (`kunde.statusVerlauf`), egal wo der Status geändert wird (zentral in `store.mutate`). Vorhandene Status werden bei der Umstellung als geschätzter Wechsel zum Anlagedatum nachgetragen. Abschlüsse und Abschlussquote zählen jetzt Statuswechsel („Abschluss“ bzw. offene Chance → „Kein Interesse“), nicht mehr Gesprächsergebnisse.
- **PDF-Bericht:** Kernzahlen als Kästen und Verkaufstrichter mit Tipp; weiterhin eine Seite, ohne Kundennamen (die Nachfassliste steht nicht im PDF).
- **Demo:** Beispielkunden haben einen Statusverlauf über mehrere Monate, ein Anlagedatum und Gespräche zu jedem Schritt; dazu mehr Absagen, damit Trichter, Abschlussquote und Vergleich realistisch aussehen.

## 0.10.35 – 08.11.2026
- **Karte: Standort-Knopf gibt immer Rückmeldung.** Auf dem iPad 6 passierte im WLAN beim Tippen auf ◎ gar nichts. Jetzt erscheint sofort „Standort wird gesucht …“ und der Knopf pulsiert. Antwortet Safari nach 30 Sekunden nicht, zeigt Sperling, wo die Standort-Einstellungen auf dem iPad stehen. Grobe und genaue Ortung laufen nacheinander statt gleichzeitig, weil zwei parallele Anfragen auf älterem iPad-Safari teils ohne Antwort bleiben.

## 0.10.34 – 08.11.2026
- **iPad: runde Knöpfe bleiben rund.** Die „?“-Hilfeknöpfe und andere runde Knöpfe/Punkte wirkten auf älterem iPad-Safari (iPad 6, iOS 17) gestaucht. Sie haben jetzt kein Standard-Polster mehr, schrumpfen in Flex-Zeilen nicht und halten das Seitenverhältnis 1:1 (`aspect-ratio`). Dazu `text-size-adjust: 100 %`, damit Safari die Schrift beim Drehen nicht aufbläht.
- **iPad quer (900–1199 px): schmale Seitenleiste.** Statt 220 px breiter Leiste eine 96 px schmale Leiste mit Bild über dem Text; der Inhalt bekommt rund 120 px mehr Breite (Monatskalender, Übersicht, Kunde).

## 0.10.33 – 08.11.2026
- **Karte, eigener Standort:** Auf iPads ohne Mobilfunk (kein GPS) lief die genaue Ortung oft in die Zeitgrenze, dann zoomte die Karte nicht. Jetzt erst schnelle, grobe Ortung (WLAN) und Hinzoomen, danach genaues Nachbessern; ein hellblauer Kreis zeigt die Ungenauigkeit. Ein einzelnes Antippen der Karte verhindert das Hinzoomen nicht mehr (nur echtes Verschieben/Zoomen). Ist der Standortzugriff aus, sagt Sperling, wo man ihn einschaltet.

## 0.10.32 – 08.11.2026
- **Kalender, Monat:** Ein Tipp auf einen Tag öffnet jetzt immer die Tagesansicht dieses Tages, auch wenn man dabei einen Termin trifft. Vorher öffnete ein Tipp auf einen Termin dessen Karte und ein Tipp auf eine freie Stelle das Fenster „Neuer Termin“. Termine verschieben (Finger halten und ziehen) bleibt; neue Termine in der Tagesansicht oder mit „+ Neu“.

## 0.10.31 – 08.11.2026
- Kontaktseite, Häufige Fragen: „Gibt es Fördermittel?“ deckt jetzt Photovoltaik (0 % Umsatzsteuer, KfW-Kredit, Einspeisevergütung im Wandel) und Wärmepumpe ab, mit Hinweis auf eigene Programme für Unternehmen und Landwirtschaft. Neue Frage „Passen Photovoltaik und Wärmepumpe zusammen?“.

## 0.10.30 – 07.11.2026
- **Kontaktseite:** Neben dem Sperling-Logo steht jetzt dezent der volle Name „Jan Sperling“ mit „Berater für Photovoltaik und Wärmepumpe“, abgetrennt durch einen feinen Strich (Name aus `daten.js`). Auf dem Handy nur der Name. Die Datenschutzerklärung zeigt den Namen ebenfalls neben dem Logo. Hintergrund: Vorsicht wegen einer eingetragenen Marke mit „Sperling“ im Energiebereich; der volle Personenname macht klar, dass es um Jan als Person geht.

## 0.10.29 – 07.11.2026
- **Hinfahren/Route mit der richtigen Karten-App:** Eine Web-App kann die Standard-Karten-App des iPhones nicht erkennen; bisher öffnete „Automatisch“ dort immer Apple Karten. Jetzt fragt Sperling beim ersten „Hinfahren“ auf iPhone/iPad einmal „Womit navigierst du?“ (Google Maps, Apple Karten, Waze) und merkt sich die Wahl (`einstellungen.kartenApp`). Google Maps und Waze öffnen auf iPhone/iPad direkt über ihr App-Schema (`comgooglemaps://`, `waze://`), ohne App nach kurzer Zeit die Web-Fassung. Gilt für alle Hinfahren-/Route-Knöpfe (Kunde, Karte, Übersicht, Termine, Kundenliste, Suche), da `src/ui/navi.ts` die Links zentral abfängt.

## 0.10.28 – 07.11.2026
- **Kürzere Wege** (aus dem Vorschlag „Weniger Klicks“, Punkte 1–4):
  - **Abhaken mit Folgeschritt** (`src/core/abhaken.ts`, `src/ui/abhaken.ts`): Der Haken in Terminlisten und „✓ Erledigt“ in der Termin-Karte öffnen ein kleines Fenster „Wie ging's aus?“ mit Schnelltexten, Notiz (geht mit dem Bereich des Termins zum Kunden, R-TEXT) und Schnellwahl für die nächste Wiedervorlage (gleicher Kunde, Bereich und Titel, änderbar). Leer lassen = nur abhaken. Erledigtes wird mit einem Tipp wieder offen.
  - **„Als Nächstes“ auf der Übersicht** (`src/core/naechstes.ts`): laufender oder heute noch beginnender Termin, sonst die älteste fällige Wiedervorlage; Knöpfe Anrufen, Hinfahren, Gespräch starten, Erledigt; Titel öffnet die Termin-Karte.
  - **Schnellknöpfe** in der Kundenliste (📞 Anrufen mit Sicherheitsabfrage, 🚗 Hinfahren, 📝 Schnellnotiz, 📅 Termin) und 📞 in Terminlisten.
  - **„+“-Knopf** (`src/ui/plusknopf.ts`) auf Übersicht, Kunden, Kundenseite und Kalender: Notiz (`src/ui/schnellnotiz.ts`, Kunde per Suche, optional Wiedervorlage), Termin/Wiedervorlage, neuer Kunde. Auf der Kundenseite automatisch diesem Kunden zugeordnet. Nicht im Beratungs-Schutz, Gesprächsmodus und auf der Karte.
  - 3 neue Unit-Tests, Browser-Test erweitert. Kein Schemawechsel.

## 0.10.27 – 07.11.2026
- Kontaktseite: Satz zum Vergleich positiver formuliert („Ich bin überzeugt: Ein gutes Angebot hält jedem Vergleich stand.“).

## 0.10.26 – 07.11.2026
- Kontaktseite: spricht auch Unternehmen und landwirtschaftliche Betriebe an. Neuer Abschnitt „Für Zuhause, Betrieb und Hof“, neutralere Texte, FAQ zu Unternehmen. Rückrufformular mit „Anfrage für“ und „Firma (optional)“; Datenschutzerklärung nennt die neuen Felder.

## 0.10.25 – 07.11.2026
- Kontaktseite: Unterzeile bei „So arbeite ich“ freundlicher („Offen und transparent: So läuft die Zusammenarbeit mit mir.“).

## 0.10.24 – 07.11.2026
- **Kontaktseite** (`public/kontakt/index.html`): neue Abschnitte „Aus Lengede, für die Region“ (Über mich, Vorteile, Orte), „So arbeite ich“ (selbständig, Vergütung durch das Fachunternehmen, zweite Meinung mit Link zur Energieberatung der Verbraucherzentrale) und „Häufige Fragen“. Datenschutzerklärung: Satz zu externen Links.

## 0.10.23 – 07.11.2026
- **Filter unter Kunden und Karte:** Jede aktive Auswahl ist jetzt sichtbar markiert, mit Farbe, kräftigem Rand und Haken ✓. Vorher sah man bei „Kein Kontakt“, „Produkte“ und eigenen Feldern nur am Text darunter, was gefiltert wird. Produkte in ihren Farben (Interesse grün, Später orange, Schon vorhanden blau, Kein Interesse rot), Bereiche und Status wie bisher in ihrer Farbe, zusätzlich mit Haken.

## 0.10.22 – 07.11.2026
- **Auswertungen: prozentuale Veränderung.** Jede Kennzahl zeigt neben der Differenz die Veränderung in Prozent zum Vorzeitraum, mit Pfeil (▲ ▼ ▶) und Vorzeichen, nicht nur über die Farbe erkennbar, z. B. „▼ −10 (−43 %)“. War der Vorzeitraum 0, steht „(neu)“; Quoten bleiben in Prozentpunkten. Bildschirmleser hören „gestiegen/gesunken, vorher …“. Im PDF-Bericht Spalte „Veränderung (%)“, grün/rot gefärbt (`veraenderung()` liefert `prozent`, neu `veraenderungText()`).
- **Förderung-Symbol** jetzt als ganzes Logo mit Sperling und Blatt, in den Farben der übrigen Symbole (hell und dunkel).

## 0.10.21 – 07.11.2026
- **iPad hochkant (640–899 px):** Leiste unten wie am iPhone mit „Mehr“; Produkte, Förderung, Sperren und die übrigen Bereiche sind dort wieder erreichbar. Rund-Tour: „Zu finden unter „Mehr““ statt „Auf dem iPhone …“.
- **Kundenliste und Kundenkartei am Handy:** Name bekommt die ganze Breite und bricht um; Kontakt-Alter und PV/WP/VW stehen darunter.
- **Rund-Tour:** Karte legt sich nie über das markierte Feld (oben/unten nach Platz, notfalls scrollbar).
- **Kalender Monat:** Feiertagsnamen brechen nur an Wortfugen um („Weihnachts-tag“); am schmalen Handy rote Tageszahl, Name im Titel und für Bildschirmleser.
- **Barrierefreiheit:** Kontraste (Demo-Band, Kontakt-Alter, „überfällig“, Löschen-Knopf dunkel, Vormonatstage, Zähler im aktiven Bereichs-Chip, „bald verfügbar“, Auswertungs-Veränderung, erledigte Termine), Face-ID-Knopf mit Namen, Bereichs-Umschalter ohne falsche Tab-Rolle, Kundenwahl-Liste benannt und per Tastatur scrollbar, Termin-Titel als eigener Knopf statt verschachtelter Schaltfläche, Überschrift auf der Karte, Tippflächen auf Touch mindestens 24 px.
- Aufgeräumt: zwei alte Testbilder aus dem Repo entfernt, Kommentar ohne Personennamen.

## 0.10.20 – 07.11.2026
- Förderung: Rechner passt auf kleine Handys (320 px) ohne seitliches Scrollen (Fieldset und Raster mit `min-width: 0`, Reiterknöpfe dürfen umbrechen). Quellenlinks auf Touch-Geräten mit größerer Tippfläche (mindestens 24 px).

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
