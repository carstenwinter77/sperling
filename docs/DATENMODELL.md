# Datenmodell (Schema-Version 10)

Quelle der Wahrheit: `src/core/model.ts`. Diese Datei beschreibt sie für Menschen. Bei Abweichungen gilt der Code, und diese Datei wird nachgezogen.

## Gesamtbestand

| Feld | Typ | Beschreibung |
|---|---|---|
| `schemaVersion` | Zahl | aktuell `10` |
| `kunden` | Kunde[] | alle Kunden und markierten Standorte |
| `termine` | Termin[] | Termine und Wiedervorlagen |
| `einstellungen` | Objekt | siehe unten |
| `geraete` | Gerät[] | Vorführbestand (Vorwerk) |
| `leihvorgaenge` | Leihvorgang[] | Verleih an Kunden |
| `reservierungen` | Reservierung[] | Vormerkungen für Vorführgeräte (ab Schema 3) |
| `papierkorb` | Eintrag[] | Gelöschtes, bleibt bis zum endgültigen Löschen (ab Schema 3) |
| `fotoSchluessel` | Objekt | ab 0.10.16: Schlüssel-ID → AES-256-Schlüssel (Base64) für die Kundenfotos. Beim Einspielen einer Sicherung bleiben vorhandene Schlüssel erhalten. |
| `material` | Material[] | Verbrauchsmaterial (ab 0.10.14, ohne Schemawechsel, fehlt = leer) |

## Kunde

| Feld | Typ | Hinweis |
|---|---|---|
| `id` | String | UUID |
| `createdAt`, `updatedAt` | ISO-Datum | |
| `anrede`, `vorname`, `nachname`, `firma` | String | alle optional; ohne Namen heißt der Eintrag nach der Adresse („Standort“) |
| `strasse`, `plz`, `ort`, `telefon`, `email` | String | |
| `lat`, `lng` | Zahl oder `null` | nur gültige Koordinaten, sonst beide `null` |
| `status` | `{pv, wp, vorwerk}` | je ein Status (siehe unten) |
| `pv`, `wp`, `vorwerk` | Objekt | Erfassungsbögen, Felder siehe unten |
| `notizen` | Notiz[] | Gesprächsnotizen |
| `gespraeche` | Gespräch[] | Gespräche mit dem Leitfaden, je Sparte ein Eintrag |
| `enpalKontakte` | EnpalKontakt[] | Gesprächsdokumentation für Enpal (ab Schema 2) |
| `letzterKontaktManuell` | ISO-Datum \| null | von Hand nachgetragener Kontakt (ab 0.9.0). Angezeigt wird der jüngste aus diesem Feld, Gesprächen, Enpal-Kontakten, Notizen, erledigten Terminen und Verleihen (`letzterKontakt()` in `src/core/verlauf.ts`). |
| `fotos` | KundenFoto[] | ab 0.10.16: `{id, sparte (pv/wp/vorwerk), zeitpunkt, notiz, bytes, breite, hoehe}`, höchstens 200. Nur die Beschreibung; die Bilder liegen verschlüsselt in der IndexedDB-Tabelle `fotos`. |
| `produkte` | ProduktMarkierung[] | Produkte im Gespräch (ab Schema 5): Ereignisse `{id, produktId, name, bereich, markierung, zeitpunkt}`; `markierung` ist `interesse`, `spaeter`, `vorhanden`, `kein` oder `''` (aufgehoben). Es gilt das jüngste Ereignis je Produkt. Name und Bereich sind mitgespeichert, damit Verlauf und Texte auch ohne Katalogeintrag funktionieren. Höchstens 2000 Ereignisse je Kunde. |
| `statusVerlauf` | StatusWechsel[] | ab Schema 8: `{zeitpunkt, sparte, von, nach, geschaetzt?}`, älteste zuerst, höchstens 1000. Wird nach jeder Änderung von `store.mutate` ergänzt, wenn der Status einer Sparte vom letzten Eintrag abweicht (`statusVerlaufAbgleichen()`); `geschaetzt: true` = bei der Migration nachgetragen (Anlagedatum, ohne echten Zeitpunkt). Grundlage für Abschlüsse, Abschlussquote, offene Chancen und den Verkaufstrichter (`vertrieb()` in `src/core/auswertung.ts`). |
| `angebote` | Angebot[] | ab Schema 9: `{id, sparte, titel, betrag (Euro oder null), datum, gueltigBis (ISO oder null, nie vor `datum`), status (offen/angenommen/abgelehnt/zurueckgezogen), entschieden (ISO oder null), notiz, createdAt, updatedAt}`, höchstens 200. Nachfass-Wiedervorlagen sind normale Termine mit Titel „Angebot nachfassen: …“ (`nachfassTermine()` in `src/core/vertrieb.ts`). Angebote stehen in keinem Anbieter-Text (R-TEXT unberührt). |
| `auftrag` | Objekt | ab Schema 9: je begonnener Sparte `{schritte: {schlüssel: {datum: 'JJJJ-MM-TT' oder '', erledigt}}, notiz}`. Schritte stehen in `AUFTRAG_SCHRITTE` (PV: vertrag, planung, montage, netz, inbetrieb; WP: vertrag, foerderung, planung, montage, inbetrieb; Vorwerk: vertrag, lieferung, einweisung). Datum ohne Haken = geplant. Unbekannte Sparten/Schritte werden verworfen. |
| `ansprechpartner` | Ansprechpartner[] | ab Schema 9: `{id, name, rolle (entscheider/technik/finanzen/nutzer/sonstiges), funktion, telefon, email, notiz}`, höchstens 30. Löschen legt den Eintrag in „Gelöscht“ (Typ `ansprechpartner`). |
| `haustuer` | HaustuerEintrag[] | ab Schema 9: `{id, zeitpunkt, ergebnis (nicht_da/spaeter/gespraech/kein_interesse/werbeverbot), notiz}`, höchstens 200. Es gilt das jüngste Ergebnis: `werbeverbot` = „Keine Werbung erwünscht“ (Pin mit ⛔, nie in „Unterwegs vorbeischauen“). „Später“, „Gespräch“ und „Kein Interesse“ zählen als Kontakt (`letzterKontakt()`). „Kein Interesse“ setzt Sparten mit Status „Potenzial“ auf „Kein Interesse“. |
| `eigene` | Objekt | Werte der eigenen Felder (ab Schema 4): Schlüssel = Feld-ID aus `einstellungen.felder.eigene`, Wert = Text, Zahl oder `true`/`false`. Datum als `JJJJ-MM-TT`. Werte gelöschter Felder werden beim Löschen entfernt; ausgeblendete bleiben. |

### Status je Sparte
`unbekannt` · `potenzial` (vermutet) · `interesse` · `termin` · `angebot` · `abschluss` · `kein_interesse`

Für die Karte gilt der „Hauptstatus“ (wichtigster über alle Sparten): abschluss > angebot > termin > interesse > potenzial > kein_interesse > unbekannt.

### Notiz
| Feld | Typ | Hinweis |
|---|---|---|
| `id` | String | |
| `zeitpunkt` | ISO-Datum | automatisch „jetzt“ oder vom Nutzer gesetzt, jederzeit änderbar |
| `text` | String | max. 50.000 Zeichen |
| `sparten` | (`pv`\|`wp`\|`vorwerk`)[] | worüber gesprochen wurde; steuert die Textgeneratoren (R-TEXT) |
| `createdAt`, `updatedAt` | ISO-Datum | |

### Gespräch (Leitfaden)
| Feld | Typ | Hinweis |
|---|---|---|
| `id`, `zeitpunkt` | String, ISO-Datum | |
| `sparte` | `pv`\|`wp`\|`vorwerk` | immer genau eine (R-TEXT) |
| `einwaende` | `{id, text, ergebnis}`[] | `ergebnis`: `ueberzeugt` \| `offen` \| `bleibt` |
| `ausgang` | `termin` \| `test` \| `angebot` \| `abschluss` \| `wiedervorlage` \| `ueberlegen` \| `kein` | Pflicht beim Speichern |
| `naechsterSchritt`, `notiz` | String | |

### EnpalKontakt (Gesprächsdokumentation)
| Feld | Typ | Hinweis |
|---|---|---|
| `id`, `zeitpunkt` | String, ISO-Datum | |
| `art` | `telefon` \| `hausbesuch` \| `sonstiges` | |
| `erreicht` | Boolean | |
| `gespraechspartner` | String | |
| `themen` | (`pv`\|`wp`)[] | nie `vorwerk` (R-TEXT) |
| `ergebnis` | Schlüssel aus `AUSGANG` oder `''` | |
| `naechsterSchritt`, `notiz` | String | |
| `frist` | ISO-Datum oder `null` | Enpal-Frist / Wiedervorlage |
| `createdAt`, `updatedAt` | ISO-Datum | |

### Erfassungsbogen Photovoltaik (`pv`)
dachflaeche (m²) · ausrichtung (Süd … Nord) · neigung (°) · dachform · eindeckung · dachzustand · verschattung · stromverbrauch (kWh) · strompreis (ct/kWh) · personen · eauto (ja/nein) · wallbox (ja/nein) · speicher (ja/nein) · zaehlerschrank · bestandsanlage · bemerkung

### Erfassungsbogen Wärmepumpe (`wp`)
heizungsart (Gas, Öl, Nachtspeicher, Pellets, Holz/Kamin, Fernwärme, Wärmepumpe alt, Sonstiges) · heizungBaujahr · verbrauchMenge + verbrauchEinheit (kWh, Liter, m³, kg, Raummeter) · heizkosten (€) · wohnflaeche (m²) · hausBaujahr · daemmung · fenster · waermeverteilung · warmwasser (ja/nein) · aufstellort · bemerkung

### Erfassungsbogen Vorwerk (`vorwerk`)
interesseAn (Kobold Staubsauger, Saugroboter, Saug-Wischer, Zubehör/Service, Sonstiges) · vorhandenesGeraet · bodenbelaege · flaeche (m²) · haustiere · allergien · vorfuehrung · bemerkung

Jedes dieser Felder (und jedes Kontaktfeld) kann unter Einstellungen → Felder ausgeblendet werden; die Daten bleiben dabei unverändert am Kunden.

Typen: Zahlen sind `null`, wenn leer. Ja/Nein-Felder sind `true`/`false`/`null` (unbeantwortet). Auswahlfelder akzeptieren nur Werte aus der Liste.

## Termin

| Feld | Typ | Hinweis |
|---|---|---|
| `id`, `kundeId` | String | `kundeId` leer = ohne Kunde |
| `art` | `termin` \| `wiedervorlage` | |
| `sparte` | `pv`\|`wp`\|`vorwerk`\|`''` | |
| `titel`, `ort`, `notiz` | String | |
| `beginn` | ISO-Datum | |
| `dauerMin` | Zahl | 1 bis 1440, Standard 60 |
| `erledigt` | Boolean | |
| `bezug` | `{art, id}` | ab Schema 10: wozu eine Wiedervorlage gehört. `art` = `angebot` (id = Angebot), `leihe` (id = Leihvorgang), `pflege` (id = Sparte) oder `''` (kein Bezug, id leer). Beim Abhaken bietet Sperling dazu passende Knöpfe an (Angebot angenommen/abgelehnt, Leihgabe zurück/gekauft/verlängern). Migration 9 → 10 ordnet vorhandene „Angebot nachfassen: …“- und „Nachfragen: Gerät bei …“-Wiedervorlagen über den Titel zu (`bezugNachtragen()` in `src/core/model.ts`). |

## Gerät (Vorführbestand)

| Feld | Typ | Hinweis |
|---|---|---|
| `id`, `name`, `seriennummer`, `zubehoer`, `notiz` | String | |
| `produktId` | String | ab 0.10.14: Bezug zur Produktübersicht (Vorwerk-Katalog), leer bei freier Eingabe |
| `aktiv` | Boolean | `false` = verkauft/ausgemustert, bleibt für den Verlauf erhalten |
| `verkauf` | Objekt oder `null` | ab 0.10.10 (ohne Schemawechsel, fehlt = `null`): `{kundeId, datum, preis, notiz}`; `preis` in Euro oder `null`. `kundeId` wird beim Löschen des Kunden geleert und beim Wiederherstellen zurückgesetzt (Papierkorb-`bezug.geraete`). |

## Material (Verbrauchsmaterial)

| Feld | Typ | Hinweis |
|---|---|---|
| `id`, `name`, `notiz` | String | |
| `produktId` | String | Bezug zur Produktübersicht, leer bei freier Eingabe |
| `einheit` | String | z. B. Stück, Packung, Flasche (Standard Stück) |
| `bestand` | Zahl | ganze Zahl ≥ 0 |
| `mindestbestand` | Zahl oder `null` | „Nachbestellen“, sobald `bestand <= mindestbestand`; `null` = kein Hinweis |
| `aktiv` | Boolean | `false` = aus dem Bestand genommen, Verlauf bleibt |
| `buchungen` | Buchung[] | jüngste zuerst, höchstens 300: `{id, zeitpunkt, menge (+/−), grund, kundeId, notiz}`; `grund` = muster, test, eigen, defekt, zugang, korrektur. `kundeId` wird beim Löschen des Kunden geleert und beim Wiederherstellen zurückgesetzt (Papierkorb-`bezug.material`). |

Ein Abgang „muster“ oder „test“ mit Kunde legt beim Kunden zusätzlich eine Vorwerk-Notiz an.

## Leihvorgang

| Feld | Typ | Hinweis |
|---|---|---|
| `id`, `geraetId`, `kundeId` | String | `kundeId` leer, wenn der Kunde gelöscht wurde |
| `ausgabe` | ISO-Datum | |
| `rueckgabeGeplant` | ISO-Datum oder `null` | „zurück bis“, 10:00 Uhr Ortszeit |
| `rueckgabe` | ISO-Datum oder `null` | `null` = noch verliehen |
| `kaufinteresse` | `offen` \| `interesse` \| `gekauft` \| `kein` | |
| `notiz` | String | Zustand, Absprachen |
| `fotosAusgabe`, `fotosRueckgabe` | String[] | JPEG-data-URLs, max. 4, je max. 1,5 MB (ab Schema 3) |
| `unterschriftAusgabe`, `unterschriftRueckgabe` | String | PNG-data-URL oder leer (ab Schema 3) |
| `nameAusgabe`, `nameRueckgabe` | String | Name in Druckbuchstaben zur Unterschrift |

## Reservierung

| Feld | Typ | Hinweis |
|---|---|---|
| `id`, `geraetId`, `kundeId` | String | `kundeId` darf leer sein |
| `von`, `bis` | ISO-Datum | ganze Tage, inklusive; `bis` nie vor `von` |
| `notiz` | String | |

Belegt ist ein Gerät, wenn sich der Zeitraum mit einer Reservierung oder einem Verleih überschneidet (`geraetBelegung()`); ein offener Verleih ohne Datum gilt als belegt bis auf Weiteres.

## Papierkorb-Eintrag

| Feld | Typ | Hinweis |
|---|---|---|
| `typ` | `kunde` \| `notiz` \| `termin` \| `geraet` \| `enpalKontakt` | |
| `objekt` | Objekt | das gelöschte Objekt, unverändert |
| `kundeId` | String | zugehöriger Kunde (bei Notiz/Enpal-Eintrag) |
| `geloeschtAm` | ISO-Datum | nur zur Anzeige; Einträge verfallen nie von selbst (ab 0.9.0) |
| `bezug` | Objekt oder `null` | beim Kunden: IDs der Termine, Verleihe, Reservierungen, die wieder verknüpft werden |

## Einstellungen

| Feld | Hinweis |
|---|---|
| `fotosMitsichern` | Boolean | ab 0.10.16, Standard `true`: Kundenfotos in die Sicherung/iCloud-Datei aufnehmen |
| `absender` | Gruß unter den Texten |
| `vorlagen.pv`, `vorlagen.wp`, `vorlagen.vorwerk` | Textvorlagen mit Platzhaltern, je Bereich (ab Schema 7; vorher `enpal` für PV + WP) |
| `nachfassTage` | Zahlen[] – Tage nach einem Angebot, an denen eine Nachfass-Wiedervorlage entsteht (ab 0.13.0, Standard `[3, 7]`, ganze Tage 1–90, aufsteigend, höchstens 6; leer = kein Nachfassen; `normalizeNachfassTage()` in `src/core/vertrieb.ts`) |
| `bereitlegen` | `{pv, wp, vorwerk}` je Liste von Texten – „Bitte bereitlegen“ in der Terminbestätigung (ab 0.13.0, höchstens 12 Punkte zu je 200 Zeichen; fehlt ein Bereich, gilt `BEREITLEGEN` aus `src/core/vertrieb.ts`) |
| `namensFolge` | `vorname` oder `nachname` – Namen in Listen als „Vorname Nachname“ oder „Nachname, Vorname“ (ab 0.13.6, Standard `vorname`, kein Schemaschritt; Anbieter-Texte und Leihschein immer `vorname`) |
| `ortsFolge` | `ort` oder `strasse` – Kunden ohne Namen: Titel und Sortierung „Ort, Straße“ oder „Straße, PLZ Ort“ (ab 0.13.6, Standard `ort`, kein Schemaschritt) |
| `kalenderStart` | `liste`, `monat`, `woche`, `tag` oder `geraete` – Startansicht des Kalenders (ab Schema 7, Standard `monat`) |
| `karte` | letzte Position, Zoom, Layer (`satellit`/`strasse`) |
| `autoSperreMin` | 0–240, 0 = nie |
| ~~`dropbox`~~ | bis 0.9.4; wird seit 0.9.5 beim Laden verworfen (kein Dropbox-Abgleich mehr) |
| `empfaenger` | `{pv, wp, vorwerk}` – Vorbelegung für „Per E-Mail senden“ (ab Schema 2, je Bereich ab Schema 7) |
| `kartenApp` | `auto` \| `apple` \| `google` \| `waze` – Ziel für „Hinfahren“ (ab Schema 3, `waze` ab 0.10.5) |
| `kundenansicht` | `{kontakt, pv, wp, vorwerk, bemerkungen, status, geraete, termine, notizen}` je `boolean` – was die Kundenansicht zum Herzeigen zeigt (ab 0.9.0, Standard siehe `KUNDENANSICHT_TEILE`) |
| `nachbarRadiusM` | Zahl – Umkreis für „Nachbarn“ in Metern, eine der Stufen 100 … 50 000 (ab 0.9.0, Standard 300) |
| `felder` | `{aus, eigene}` – Feldverwaltung (ab Schema 4). `aus`: Pfade ausgeblendeter Felder (`kontakt.firma`, `pv.neigung`, `eigene.<id>`). `eigene`: höchstens 100 eigene Felder `{id, kategorie: kontakt\|pv\|wp\|vorwerk, label, typ, einheit, optionen}`; `typ` ist `text`, `textarea`, `number` (mit `einheit`), `date`, `bool`, `select` (mit `optionen`), `tel`, `email` oder `url`. Logik in `src/core/felder.ts`. |
| `zuletzt` | `[{art: 'kunde' \| 'geraet', id}]` – „Zuletzt geöffnet“ der Kommandozeile, höchstens 8, neueste zuerst (ab 0.9.0). Titel werden beim Anzeigen frisch aus den Daten geholt; Gelöschtes fällt weg. |

## Produktkatalog (nicht im Store)

`src/data/produkte.json` ist öffentliches Nachschlagewissen (Enpal, GALVANY, Vorwerk Kobold) und liegt im App-Paket, nicht im verschlüsselten Bestand. Format und Erfassung: `katalogVersion`, `stand`, `hinweis`, `quellen[]`, `produkte[]` mit `id`, `quelle`, `bereich`, `bereicheZusaetzlich`, `kategorie`, `name`, `modell`, `kurzbeschreibung`, `technischeDaten[]`, `preis{modell, betragEuro, einheit, text, uvp}`, `quelleUrl`, `bildUrl`, `stand`, `passtZu[]`, `verfuegbarkeit` (`demnaechst`), `hinweise`. `katalogPruefen()` in `src/core/produkte.ts` überspringt Ungültiges und lässt nur `https://`-Adressen zu. Aktualisieren = neue JSON + neue App-Version.

## Beispieldaten

Beispielkunden, -termine, -geräte und -verleihe in der echten App erkennt man am ID-Präfix `demo-` (Beispiel-Vorführbestand: `demob-`) (kein eigenes Feld, keine Schemaänderung). `beispielEntfernen()` in `src/demo.ts` entfernt genau diese. Alle Beispiel-Aktionen laufen über `beispielSicher()` (R-BEISPIEL). Der PDF-Listenimport (0.10.8) legt bei Bedarf die eigenen Vorwerk-Felder `vwliste-sperre`, `vwliste-ewe`, `vwliste-ewe-datum` und `vwliste-bnw` (Typ Text) an und schreibt die Listenwerte nach `kunde.eigene`; keine Schemaänderung. Ab 0.10.7 gibt es 54 Beispielkunden im Beratungsgebiet (Lengede, Raum Peine bis Salzgitter), erzeugt mit festem Startwert in `src/demo-gebiet.ts`.

## Migration

`migrate(input)` wird bei jedem Laden ausgeführt. Sie
- lehnt Daten aus einer **neueren** Version mit klarer Meldung ab (nie halb lesen),
- normalisiert jedes Objekt (fehlende Felder ergänzen, ungültige Werte zu `null`/Standard),
- entfernt doppelte Kunden-IDs,
- hängt verwaiste Termine vom Kunden ab, statt sie zu löschen.

**Einstellungsdatei** (ab 0.10.5, `src/core/einstellungsdatei.ts`): `{art: 'sperling-einstellungen', schemaVersion, erstellt, einstellungen, geraet: {farbschema, mailprogramm}}`, ohne `zuletzt`, verschlüsselt im selben Umschlag wie die Sicherung (`deviceId: 'einstellungen'`). „Sicherung einspielen“ lehnt sie ab, damit keine Kunden verloren gehen.

Schema 1 → 2: `enpalKontakte` und `einstellungen.empfaenger` kommen hinzu; die Normalisierung ergänzt sie leer. Schema 2 → 3: `reservierungen`, `papierkorb`, `einstellungen.kartenApp` und die Beleg-Felder am Leihvorgang kommen hinzu (leer). 0.9.0 bleibt bei Schema 3: die neuen Felder (`letzterKontaktManuell`, `kundenansicht`, `nachbarRadiusM`, `zuletzt`) ergänzt die Normalisierung mit Standardwerten. Schema 6 → 7 (drei Texte, Kalender-Start): `vorlagen` und `empfaenger` je Bereich; eine eigene frühere Enpal-Vorlage bzw. ein Enpal-Empfänger gilt für PV und WP, die unveränderte alte Standardvorlage wird durch die neuen ersetzt; `kalenderStart` kommt mit `monat` hinzu. Schema 5 → 6 (Textbausteine): `einstellungen.bausteine` kommt hinzu; fehlt ein Bereich, gilt die Startliste aus `src/core/bausteine.ts`. Schema 4 → 5 (Produkte im Gespräch): `kunde.produkte` kommt hinzu (leer). Schema 3 → 4 (Feldverwaltung): `kunde.eigene` und `einstellungen.felder` kommen hinzu (leer); das frühere `einstellungen.dropbox` wird verworfen. Schema 7 → 8 (Statusverlauf): `kunde.statusVerlauf` kommt hinzu; jeder Status ungleich „Unbekannt“ wird als geschätzter Wechsel zum Anlagedatum nachgetragen. Schema 8 → 9 (Vertriebswerkzeuge): `kunde.angebote`, `kunde.auftrag`, `kunde.ansprechpartner` und `kunde.haustuer` kommen hinzu (leer); `einstellungen.nachfassTage` und `einstellungen.bereitlegen` ergänzt die Normalisierung mit den Standardwerten (kein eigener Schemaschritt). Künftige Versionen ergänzen schrittweise Blöcke `if (v < 10) { … }`.

## Kundenfotos (IndexedDB-Tabelle `fotos`, ab Datenbank-Version 2)

Je Foto ein Datensatz `{id, schluessel, iv, ct, tiv, tct}`: Vollbild (`ct`, 1600 px JPEG) und Vorschau (`tct`, 320 px), jeweils AES-GCM mit dem Fotoschlüssel `schluessel` und zusätzlichen Daten `sperling-foto|<id>|voll` bzw. `|vorschau`. Klartext gibt es nur als Blob-URL im Arbeitsspeicher, beim Sperren verworfen. Bilddaten, die kein Kunde (auch keiner im Papierkorb) mehr nennt, werden nach dem Start gelöscht.

**Sicherungsdatei:** der Umschlag wie bisher, bei `einstellungen.fotosMitsichern` zusätzlich `fotos: [{id, schluessel, iv, ct, tiv, tct}]` (Base64, weiter verschlüsselt). Ältere Versionen ignorieren das Feld. Die automatischen Versionen auf dem Gerät enthalten keine Fotos.

## Gerätespeicher (nicht in der Sicherung)

`meta.abgleichStand` (ab 0.10.12): Stand (`updatedAt`) des letzten Abgleichs über iCloud Drive (Datei geholt oder gesichert). `meta.abgleichAus`: `true` = beim Start nicht fragen. Beide nur in IndexedDB des Geräts, ohne Kundendaten.
