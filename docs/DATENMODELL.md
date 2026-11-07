# Datenmodell (Schema-Version 2)

Quelle der Wahrheit: `js/core/model.js`. Diese Datei beschreibt sie für Menschen. Bei Abweichungen gilt der Code, und diese Datei wird nachgezogen.

## Gesamtbestand

| Feld | Typ | Beschreibung |
|---|---|---|
| `schemaVersion` | Zahl | aktuell `2` |
| `kunden` | Kunde[] | alle Kunden und markierten Standorte |
| `termine` | Termin[] | Termine und Wiedervorlagen |
| `einstellungen` | Objekt | siehe unten |
| `geraete` | Gerät[] | Vorführbestand (Vorwerk) |
| `leihvorgaenge` | Leihvorgang[] | Verleih an Kunden |

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

## Gerät (Vorführbestand)

| Feld | Typ | Hinweis |
|---|---|---|
| `id`, `name`, `seriennummer`, `zubehoer`, `notiz` | String | |
| `aktiv` | Boolean | `false` = verkauft/ausgemustert, bleibt für den Verlauf erhalten |

## Leihvorgang

| Feld | Typ | Hinweis |
|---|---|---|
| `id`, `geraetId`, `kundeId` | String | `kundeId` leer, wenn der Kunde gelöscht wurde |
| `ausgabe` | ISO-Datum | |
| `rueckgabeGeplant` | ISO-Datum oder `null` | „zurück bis“, 10:00 Uhr Ortszeit |
| `rueckgabe` | ISO-Datum oder `null` | `null` = noch verliehen |
| `kaufinteresse` | `offen` \| `interesse` \| `gekauft` \| `kein` | |
| `notiz` | String | Zustand, Absprachen |

## Einstellungen

| Feld | Hinweis |
|---|---|
| `absender` | Gruß unter den Texten |
| `vorlagen.enpal`, `vorlagen.vorwerk` | Textvorlagen mit Platzhaltern |
| `karte` | letzte Position, Zoom, Layer (`satellit`/`strasse`) |
| `autoSperreMin` | 0–240, 0 = nie |
| `dropbox` | `appKey`, `refreshToken`, `pfad`, `letzterSync` |
| `empfaenger` | `{enpal, vorwerk}` – Vorbelegung für „Per E-Mail senden“ (ab Schema 2) |

## Migration

`migrate(input)` wird bei jedem Laden ausgeführt. Sie
- lehnt Daten aus einer **neueren** Version mit klarer Meldung ab (nie halb lesen),
- normalisiert jedes Objekt (fehlende Felder ergänzen, ungültige Werte zu `null`/Standard),
- entfernt doppelte Kunden-IDs,
- hängt verwaiste Termine vom Kunden ab, statt sie zu löschen.

Schema 1 → 2: `enpalKontakte` und `einstellungen.empfaenger` kommen hinzu; die Normalisierung ergänzt sie leer. Künftige Versionen ergänzen schrittweise Blöcke `if (v < 3) { … }`.
