// Sperling – Hilfetexte: Anleitungen je Bereich, Begriffe, häufige Fragen (rein, ohne DOM, in Node testbar).
// Die ?-Knöpfe zeigen den Kurztext eines Themas; die Seite #/hilfe zeigt alles mit Suche.
import { suchText, punkte } from './suche.ts';

/** Nach so vielen Markierungen auf der Karte blendet sich der Hinweis „Tippe lange …“ aus. */
export const KARTEN_HINWEIS_BIS = 3;
/** Karten-Hinweis zeigen? Nur bis Jan sich eingearbeitet hat (einige Markierungen) und nicht weggeklickt. */
export function kartenHinweisSichtbar(markiert: number, weg: boolean): boolean {
  return !weg && !(markiert >= KARTEN_HINWEIS_BIS);
}

export interface Thema { titel: string; kurz: string; schritte?: string[] }

export const THEMEN = {
  start: {
    titel: 'Übersicht',
    kurz: 'Dein Tag auf einen Blick: was heute fällig ist, Kunden je Bereich und Chancen in anderen Bereichen.',
    schritte: [
      'Oben suchst du alles: Kunden, Geräte, Termine, Notizen oder Befehle.',
      '„Als Nächstes“ zeigt den laufenden oder nächsten Termin bzw. die älteste fällige Wiedervorlage, mit Anrufen, Hinfahren, Gespräch starten und Erledigt.',
      'Ein Kreis vor einem Termin hakt ihn ab. Dabei kannst du kurz notieren, wie es ausging, und gleich die nächste Wiedervorlage setzen. Leer lassen hakt nur ab.',
      'Der runde „+“-Knopf unten rechts legt eine Notiz, einen Termin oder einen Kunden an. Auf einer Kundenseite gehört alles automatisch zu diesem Kunden.',
      '„Chancen in anderen Sparten“ zeigt Kunden, die in einem Bereich aktiv sind und im anderen noch offen.',
    ],
  },
  suche: {
    titel: 'Suchen und Befehle',
    kurz: 'Mit der Suche springst du überall hin und erledigst Dinge direkt, ohne erst die Seite zu öffnen.',
    schritte: [
      'Öffnen: Feld auf der Übersicht, Lupe in der Seitenleiste oder ⌘K / Strg+K auf der Tastatur.',
      'Tippe einen Namen, eine Straße, einen Ort, eine Telefonnummer oder ein Gerät.',
      'Am Kunden stehen Knöpfe wie Anrufen, E-Mail, Hinfahren, Notiz, Termin und Gespräch.',
      'Mit einem Verb geht es schneller: „müller anrufen“, „kobold verleihen“, „schmidt termin“.',
      'Pfeiltasten wählen aus, Enter öffnet, Esc schließt.',
    ],
  },
  anrede: {
    titel: 'Anrede und Titel',
    kurz: 'Anrede und Titel wählst du beim Kunden aus einer Liste. Sperling setzt daraus Namen und Begrüßung zusammen.',
    schritte: [
      'Anrede: Frau, Herr, Familie oder keine. E-Mails und Terminbestätigungen beginnen dann mit „Guten Tag Frau Beispiel,“, „Guten Tag Familie Beispiel,“ oder ohne Anrede mit Vor- und Nachnamen.',
      'Titel: Dr., Prof., Prof. Dr., Dipl.-Ing. und weitere. Fehlt einer, „Anderer Titel …“ wählen und frei eintippen.',
      'Der Titel steht vor dem Namen, z. B. „Dr. Anna Beispiel“. Sortiert wird weiter nach dem Nachnamen.',
      'In die Begrüßung kommen nur Prof. und Dr. („Guten Tag Frau Prof. Dr. Beispiel,“). Zusätze wie „med.“ und Diplomgrade lässt Sperling dort weg, wie es üblich ist.',
    ],
  },
  kunden: {
    titel: 'Kundenliste',
    kurz: 'Alle Kunden mit Suche, Filter und Sortierung. Die Farbe zeigt, wie lange der letzte Kontakt her ist.',
    schritte: [
      '„Filter“ wählt Bereiche, Status und Kontaktalter. Mehrere Haken zeigen alles, was zu einem davon passt.',
      'Sortieren nach Name, „Längster Kontakt zuerst“, „Letzter Kontakt zuerst“ oder „Zuletzt angelegt“.',
      'Grün: Kontakt in den letzten 30 Tagen, gelb: bis 90 Tage, rot: länger her oder noch nie.',
      'Rechts in jeder Zeile: 📞 Anrufen, 🚗 Hinfahren, 📝 Notiz und 📅 Termin, ohne den Kunden zu öffnen.',
      'Ganz unten liegt die Liste der gelöschten Kunden.',
    ],
  },
  kunde: {
    titel: 'Kundenkartei',
    kurz: 'Alles zu einem Kunden: Stammdaten, Angaben je Bereich, Notizen, Verlauf, Termine und Texte. Änderungen werden sofort gespeichert.',
    schritte: [
      '„Gespräch starten“ öffnet die geteilte Ansicht: links der Kunde, rechts Notizen und Leitfaden.',
      'Der Knopf „Letzter Kontakt“ zeigt, wann ihr zuletzt Kontakt hattet. Antippen trägt einen Kontakt von Hand nach.',
      '„Nachbarn“ zeigt Kunden in der Nähe; den Umkreis wählst du direkt daneben.',
      'Unter „Verlauf“ steht die ganze Gesprächshistorie als Zeitstrahl.',
      'Unter „Texte“ kopierst du die Zusammenfassung für Enpal oder Vorwerk, immer getrennt.',
      '„Angebot & Auftrag“: Angebote mit Betrag und „gültig bis“ erfassen; auf Wunsch legt Sperling Nachfass-Wiedervorlagen an (Standard nach 3 und 7 Tagen, einstellbar unter Einstellungen → Vertrieb). „Angenommen“ setzt den Abschluss und startet den Auftragsstand (Vertrag, Planung, Montage, Netzanmeldung, Inbetriebnahme). Ist der letzte Schritt abgehakt, schlägt Sperling Pflege-Wiedervorlagen vor.',
      '„Ansprechpartner“ in der Übersicht: bei Firmen, Höfen oder Familien mehrere Personen mit Rolle (entscheidet, Technik, Buchhaltung) und eigener Telefonnummer.',
    ],
  },
  gespraechsmodus: {
    titel: 'Laufendes Gespräch',
    kurz: 'Für das Telefonat oder den Hausbesuch: links die Kundendaten zum Ergänzen, rechts deine Notizen und der Leitfaden.',
    schritte: [
      'Kontaktart wählen und ankreuzen, ob du den Kunden erreicht hast.',
      'Themen antippen, über die ihr sprecht, und mitschreiben. Enpal und Vorwerk haben getrennte Notizen.',
      '„Leitfaden“ zeigt Einwände und Antworten; angetippte Einwände landen im Gespräch.',
      '„Abschluss“ fragt das Ergebnis je Bereich ab und speichert alles auf einmal, auf Wunsch mit Termin.',
      'Du kannst zwischendurch andere Seiten öffnen; das Gespräch bleibt, bis du es speicherst oder verwirfst.',
    ],
  },
  hinweise: {
    titel: 'Ausgeblendete Hinweise',
    kurz: 'Kurze Hinweise wie „Tippe lange auf ein Haus“ auf der Karte verschwinden, sobald du dich eingearbeitet hast (nach drei Markierungen) oder wenn du ✕ tippst. Dieser Knopf zeigt sie wieder an, auch den Installationshinweis auf der Übersicht.',
  },
  karte: {
    titel: 'Karte',
    kurz: 'Kunden und Potenziale auf der Karte, als Satellit oder Straßenkarte.',
    schritte: [
      'Oben eine Adresse suchen, dann „Als Potenzial markieren“ oder „Kunde anlegen“.',
      'Lange auf ein Haus tippen (am Laptop Rechtsklick) markiert genau diese Stelle. Der Hinweis dazu verschwindet nach drei Markierungen oder mit ✕; unter Einstellungen → Hilfe holst du ihn zurück.',
      '„Filter“ zeigt nur bestimmte Bereiche, Status oder lange nicht kontaktierte Kunden.',
      'An der Haustür: In der Infobox eines Hauses mit einem Tipp festhalten, wie es lief (nicht angetroffen, später, Gespräch, kein Interesse, keine Werbung). Bei einem neuen Haus legt das gleich eine Markierung an. „Keine Werbung“ zeigt ein ⛔ am Pin, Sperling schlägt die Adresse nicht mehr vor.',
      '„🚗 Tagesroute“ zeigt die Termine eines Tages nummeriert in zeitlicher Reihenfolge mit Linie dazwischen. Darunter „Unterwegs vorbeischauen“: Kunden nahe der Strecke mit offenem Angebot, fälliger Wiedervorlage, Interesse oder Potenzial, ideal für Lücken oder ausgefallene Termine. Andere Kunden sind dabei ausgeblendet; mit „Andere Kunden zeigen“ kommen sie dazu.',
      'Namen gehen nie an den Kartendienst, nur die gesuchte Adresse. „Ganze Route in Google Maps“ übergibt nur Koordinaten.',
    ],
  },
  termine: {
    titel: 'Kalender',
    kurz: 'Termine, Wiedervorlagen und Leihgaben als Liste, Monat, Woche oder Tag; „Geräte“ zeigt die Belegung der Vorführgeräte.',
    schritte: [
      'Im Monat einen Tag antippen öffnet die Tagesansicht dieses Tages; dort legst du Termine an. In Woche und Tag eine Uhrzeit antippen ergibt eine Stunde; Finger halten und ziehen wählt eine andere Dauer.',
      'Einen Termin kurz antippen öffnet die Termin-Karte: Kunde, Adresse, Notiz, letzte Gespräche und die Knöpfe Route, Anrufen, E-Mail, Termin bestätigen, Erledigt, In Kalender-App, Bearbeiten und Löschen (mit Sicherheitsabfrage).',
      '„Termin bestätigen“ bereitet eine SMS, WhatsApp-Nachricht oder E-Mail an den Kunden vor, mit Datum, Uhrzeit und was er bereitlegen soll (z. B. Stromrechnung, Foto vom Zählerschrank; die Listen je Bereich änderst du unter Einstellungen → Vertrieb). Verschickt wird von deinem Gerät.',
      'In der Tagesansicht öffnet „Route des Tages“ die Karte mit allen Terminen des Tages.',
      'Finger auf einem Termin halten zeigt Griffe: in der Mitte verschieben (in der Woche auch auf einen anderen Tag), oben oder unten länger und kürzer ziehen, im 15-Minuten-Raster. Mit der Maus einfach ziehen. Tipp daneben wählt ab.',
      'Im Monat einen Termin halten und auf einen anderen Tag ziehen; die Uhrzeit bleibt.',
      'Leihgaben (↗ geht raus, ↙ kommt zurück, 📌 Reservierung, ⚠ überfällig) stehen mit im Kalender; der Schalter „Leihgaben zeigen“ blendet sie aus. Antippen zeigt Gerät, Kunde und Leihschein.',
    ],
  },
  gespraech: {
    titel: 'Gesprächsleitfaden',
    kurz: 'Einwände nach dem Vier-Stufen-Modell: auffangen, isolieren, antworten, zum Abschluss führen.',
    schritte: [
      'Bereich wählen, den Einwand des Kunden antippen und die Antwort ablesen.',
      'Danach markieren: ausgeräumt, noch offen oder Kunde bleibt dabei.',
      'Mit „Mit Kundendaten weiter“ geht es nahtlos ins laufende Gespräch beim Kunden.',
    ],
  },
  bestand: {
    titel: 'Vorführbestand',
    kurz: 'Deine Vorführgeräte: was im Auto ist, was verliehen ist und was überfällig ist.',
    schritte: [
      '„Verleihen“: Kunde, Rückgabedatum, Fotos und Unterschrift; danach Leihschein als PDF.',
      '„Reservieren“ hält ein Gerät für einen Zeitraum frei; belegte Tage sind gesperrt.',
      'Bei Rückgabe „Zurückgenommen“ oder „Kunde kauft es“.',
      '„+ Gerät“: aus dem Vorwerk-Katalog wählen füllt die Bezeichnung aus, oder frei eingeben.',
      'Verbrauchsmaterial (Muster, Reinigungsmittel, Filtertüten): mit Anzahl anlegen, „− Verbrauch“ bei Muster, Test beim Kunden oder Eigenverbrauch, „+ Zugang“ bei Lieferung.',
      'Mit Mindestbestand erinnert Sperling ans Nachbestellen: auf der Übersicht, im Bestand und als Zahl am App-Symbol.',
    ],
  },
  belegung: {
    titel: 'Belegungskalender',
    kurz: 'Wann welches Gerät verliehen oder reserviert ist, als Zeitleiste oder Liste.',
    schritte: [
      'In der Zeitleiste über freie Tage wischen, um direkt zu reservieren.',
      'Einen belegten Balken antippen zeigt, wer das Gerät hat.',
      '„Freie finden“ sucht Geräte, die im gewünschten Zeitraum frei sind.',
    ],
  },
  auswertung: {
    titel: 'Auswertungen',
    kurz: 'Wie läuft der Vertrieb? Abschlüsse, Abschlussquote, offene Chancen, Verkaufstrichter und wen du jetzt nachfassen solltest.',
    schritte: [
      'Bereich wählen (alles, PV, WP oder Vorwerk) und den Zeitraum: Woche, Monat, Quartal oder Kalenderjahr; Tag, 1 Monat, 3 Monate, ½ Jahr und 365 Tage unter „Mehr“.',
      'Mit ‹ und › blätterst du in die Vergangenheit. Ein laufender Zeitraum wird mit gleich vielen Tagen davor verglichen (1.–8. November gegen 1.–8. Oktober).',
      'Abschlüsse: Kunden, deren Status auf „Abschluss“ wechselte. Abschlussquote: Anteil der gewonnenen an allen entschiedenen Chancen (Abschluss oder Absage nach Interesse, Termin oder Angebot).',
      'Verkaufstrichter: wie viele Kunden im Zeitraum bis zu welcher Stufe kamen. Die rot markierte Stufe verliert die meisten; darunter steht ein Tipp.',
      '„Jetzt nachfassen“: überfällige Termine und Wiedervorlagen, Angebote ohne Kontakt seit einer Woche und Testgeräte, die zurück müssen. Tippen öffnet den Kunden.',
      'Weitere Zahlen, Gespräche im Verlauf, Fokus je Sparte und meistgefragte Produkte findest du unter „Aktivität im Detail“.',
      '„Fokus je Sparte“ (bei „Alles zusammen“) zeigt, wie sich deine Aufmerksamkeit auf PV, WP und Vorwerk verteilt, wie es sich über die letzten sechs Zeiträume entwickelt hat, und gibt einen Kurztipp, wenn eine Sparte zu kurz kommt.',
      '„PDF-Bericht“ erstellt einen Bericht zum Teilen oder Speichern.',
    ],
  },
  einstellungen: {
    titel: 'Einstellungen',
    kurz: 'Neun Bereiche statt einer langen Liste: Allgemein, Texte & E-Mail, Vertrieb, Kundendaten, Sicherung, Sicherheit & Datenschutz, Kontaktseite, Hilfe, Gelöscht & Beispieldaten.',
    schritte: [
      'Bereich antippen; auf dem iPad quer steht der Inhalt gleich rechts daneben, auf dem Handy führt „‹ Alle Einstellungen“ zurück.',
      'Oben suchen, z. B. „Passwort“ oder „Vorlage“: zeigt passende Einstellungen aus allen Bereichen.',
      'Unter jedem Bereich steht der aktuelle Stand; „Sicherung“ wird orange, wenn die letzte Sicherung älter als eine Woche ist.',
      'Sicherung: regelmäßig „In iCloud sichern“. Kundenansicht und Felder findest du unter „Kundendaten“, die ?-Knöpfe unter „Hilfe“.',
    ],
  },
  geloescht: {
    titel: 'Gelöschte Kunden',
    kurz: 'Gelöschtes geht nie verloren: Es liegt hier, bis du es einzeln und mit Bestätigung endgültig löschst.',
    schritte: ['„Wiederherstellen“ holt den Kunden mit allen Notizen und Terminen zurück.'],
  },
  schutz: {
    titel: 'Beratungs-Schutz 🛡',
    kurz: 'Schaut der Kunde mit aufs Tablet, blendet ein Tipp auf 🛡 alle anderen Kunden aus. Du kannst mit seinen Daten normal weiterarbeiten.',
    schritte: [
      'Den Kunden öffnen, den du berätst, dann unten rechts 🛡 antippen.',
      'Liste, Karte, Nachbarn, Auswertungen, Einstellungen und Suche sind dann aus.',
      'Ausschalten nur mit Face ID oder Master-Passwort.',
    ],
  },
  kundenansicht: {
    titel: 'Kundenansicht zum Herzeigen',
    kurz: 'Eine aufgeräumte Seite nur mit dem, was der Kunde sehen darf. Zum Aus-der-Hand-Geben.',
    schritte: ['Was sichtbar ist, legst du in den Einstellungen fest.', 'Beenden nur mit Master-Passwort oder Face ID.'],
  },
  produkte: {
    titel: 'Produktübersicht',
    kurz: 'Alle Produkte von Enpal, GALVANY und Vorwerk Kobold mit Kurzbeschreibung, technischen Daten und Preis – als Nachschlagewerk im Gespräch.',
    schritte: [
      'Oben den Bereich wählen (Photovoltaik, Wärmepumpe, Vorwerk), darunter eine Kategorie oder suchen.',
      'Produkt antippen: Beschreibung, Daten, Preis mit Stand-Datum, „Passt dazu“ und Link zum Hersteller.',
      'Preise sind Momentaufnahmen der Hersteller-Websites. Vor dem Nennen beim Kunden auf der Quellseite prüfen.',
      'Beim Kunden (Enpal/Vorwerk-Reiter und Gesprächsmodus) unter „🏷️ Produkte“ je Produkt markieren: 👍 Interesse, ⏳ Später, ✓ Schon vorhanden, ✕ Kein Interesse. Nochmal antippen hebt auf.',
      'Markierungen stehen im Verlauf, in den Texten ihres Bereichs, im Filter und in den Auswertungen.',
    ],
  },
  foerderung: {
    titel: 'Förderung und Rechtsgrundlagen',
    kurz: 'Gesetze, Zuschüsse, Steuern und Netzregeln für Photovoltaik und Wärmepumpe in einfacher Sprache, jeweils mit Quelle und Prüfdatum. Keine Rechts- oder Steuerberatung.',
    schritte: [
      'Oben Photovoltaik oder Wärmepumpe wählen, darunter ein Thema (Gesetze, Zuschuss, Steuern, Netz, Region) oder suchen.',
      'Abschnitt antippen: wichtigste Punkte, Tabelle, „Gut zu wissen“ und die Quellen (amtliche sind markiert).',
      '„📋 Kopieren“ legt den Abschnitt mit Quellen, Stand und Hinweis in die Zwischenablage, zum Weiterleiten per Mail oder Nachricht.',
      'Der Rechner „Wann rechnet sich das?“ hat einen eigenen Menüpunkt „Rechner“. Der Link oben auf der Seite führt hin, passend zu Photovoltaik oder Wärmepumpe.',
      '„Was kommt wann“ zeigt Stichtage; ein Tipp springt zum passenden Abschnitt. „Wusstest du?“ zeigt zufällige Fakten.',
      'Förderung ändert sich oft. Vor dem Nennen beim Kunden die Quelle öffnen und den aktuellen Stand prüfen.',
    ],
  },
  rechner: {
    titel: 'Rechner „Wann rechnet sich das?“',
    kurz: 'Grobe Schätzung, nach wie vielen Jahren sich eine Photovoltaikanlage oder Wärmepumpe bezahlt macht. Alle Annahmen sind sichtbar und änderbar, ohne Gewähr.',
    schritte: [
      'Oben Photovoltaik oder Wärmepumpe wählen und die Annahmen anpassen, z. B. Anschaffung, Strompreis oder Gasverbrauch. Das Ergebnis rechnet sofort neu.',
      'Säulen je Jahr zeigen, wann das Minus zum Plus wird. Die Tabelle darunter zeigt dasselbe für andere Anschaffungspreise.',
      'Beim Kunden (Reiter Photovoltaik oder Wärmepumpe) führt „🧮 Wann rechnet sich das?“ direkt hierher. Strompreis, Speicherwunsch, Gas- oder Ölverbrauch und Heizkosten aus der Kartei sind dann schon eingetragen.',
      '„‹ Zurück zum Kunden“ bringt dich an dieselbe Stelle in der Kartei zurück.',
      'Das „?“ neben einem Feld erklärt kurz, was gemeint ist und woher du den Wert bekommst.',
      'Oben die Vorlage wählen: „Privat“ oder „Gewerbe“ (netto) oder eine eigene. Der Rechner startet mit „Privat“ und bleibt danach bei der zuletzt gewählten Vorlage. „⭐ Als Vorlage merken“ speichert die aktuellen Werte als Startwerte; verwalten unter Einstellungen → Vertrieb.',
      '„📋 Kopieren“ legt die Rechnung mit allen Annahmen und dem Hinweis in die Zwischenablage.',
      'Werte werden nicht gespeichert. Kein Angebot und keine Zusage, für eine belastbare Rechnung braucht es ein Angebot.',
    ],
  },
  felder: {
    titel: 'Felder ein- und ausblenden, eigene Felder',
    kurz: 'Bestimme selbst, welche Felder die Kundenkartei zeigt, und lege eigene Felder an. Ausgeblendete Felder behalten ihre Daten.',
    schritte: [
      'Einstellungen → Felder → Bereich aufklappen (Kontakt, Photovoltaik, Wärmepumpe, Vorwerk).',
      'Häkchen weg blendet ein Feld aus, Häkchen setzen zeigt es wieder – samt den alten Werten.',
      '„+ Eigenes Feld“: Bezeichnung, Bereich und Art wählen (Text, langer Text, Zahl mit Einheit, Datum, Ja/Nein, Auswahlliste, Telefon, E-Mail, Link).',
      'Eigene Felder stehen in der Kartei und im Gesprächsmodus, in den Texten ihres Bereichs, in der Kundenansicht und in der Suche.',
      'Ja/Nein-Felder und Auswahllisten kannst du im Filter von Kundenliste und Karte auswählen.',
      'Löschen (🗑) entfernt ein eigenes Feld samt Werten. Wer die Werte behalten will, blendet es nur aus.',
    ],
  },
  bausteine: {
    titel: 'Textbausteine im Gespräch',
    kurz: 'Statt zu tippen: Im Gesprächsmodus kurze Sätze antippen, sie landen als neue Zeile in der Notiz. Tippen geht weiterhin.',
    schritte: [
      'Gesprächsmodus → Notizen: Über dem Notizfeld stehen die Bausteine der gewählten Themen.',
      'Antippen hängt den Satz als neue Zeile an. Danach kannst du ihn im Notizfeld frei ändern.',
      'Enpal und Vorwerk haben getrennte Notizen. Jeder Baustein landet nur in der Notiz seines Bereichs.',
      'Diktieren: Ins Notizfeld tippen und auf der Tastatur das Mikrofon antippen. Das ist die Diktierfunktion des iPad, Sperling selbst nimmt nichts auf.',
      'Einstellungen → Textbausteine: je Bereich hinzufügen, umschreiben, mit ↑ ↓ sortieren, löschen oder die Startliste wiederherstellen.',
    ],
  },
  installieren: {
    titel: 'Sperling als App installieren',
    kurz: 'Installiert startet Sperling wie jede App vom Home-Bildschirm, läuft offline und kann Face ID nutzen.',
    schritte: ['Die Hilfe-Seite zeigt die Schritte für dein Gerät.'],
  },
  sicherung: {
    titel: 'Datensicherung',
    kurz: 'Alle Daten liegen verschlüsselt auf dem Gerät. Sichere sie regelmäßig in iCloud.',
    schritte: [
      'Einstellungen → „In iCloud / Dateien sichern“ → im Teilen-Menü „In Dateien sichern“.',
      'Zurückholen: Einstellungen → „Sicherung einspielen“.',
      'Ohne das Master-Passwort sind die Daten nicht wiederherstellbar. Bitte sicher notieren.',
    ],
  },
} satisfies Record<string, Thema>;
export type ThemaId = keyof typeof THEMEN;

export const BEGRIFFE: [string, string][] = [
  ['Potenzial', 'Haus oder Kunde, bei dem du Interesse vermutest, aber noch nicht gesprochen hast.'],
  ['Status', 'Wie weit ein Kunde je Bereich ist: unbekannt, Potenzial, Interesse, Termin, Angebot, Abschluss.'],
  ['Wiedervorlage', 'Erinnerung, einen Kunden zu einem Zeitpunkt wieder anzusprechen. Erscheint unter Termine.'],
  ['Enpal-Doku', 'Kopierbarer Text eines Telefonats oder Hausbesuchs für die Enpal-App.'],
  ['Letzter Kontakt', 'Das jüngste Gespräch, Notiz, erledigter Termin oder Verleih. Nachtragen geht von Hand.'],
  ['Cross-Selling', 'Ein Kunde ist in einem Bereich aktiv und im anderen noch offen, z. B. PV-Kunde ohne Wärmepumpe.'],
  ['Einwand', 'Grund, den ein Kunde gegen den Kauf nennt. Der Leitfaden hilft, ihn sachlich zu beantworten.'],
  ['Master-Passwort', 'Schlüssel für alle Daten. Ohne ihn lässt sich nichts entschlüsseln, auch nicht von uns.'],
  ['Kundenansicht', 'Seite zum Herzeigen, nur mit freigegebenen Angaben.'],
  ['Beratungs-Schutz', 'Blendet während einer Beratung alle anderen Kunden aus.'],
  ['Reservierung', 'Vorführgerät für einen Zeitraum vorgemerkt, noch nicht verliehen.'],
];

export const FRAGEN: [string, string][] = [
  ['„Hinfahren“ öffnet die falsche Karten-App.', 'Unter Einstellungen → „Hinfahren“ öffnet die App wählen (Google Maps, Apple Karten oder Waze). Auf iPhone und iPad fragt Sperling beim ersten Mal von selbst, weil eine Web-App die Standard-Karten-App nicht erkennen kann.'],
  ['Was bedeutet „(+25 %)“ in den Auswertungen?', 'Die Veränderung gegenüber dem Vorzeitraum in Prozent. Davor steht die Differenz als Zahl, der Pfeil zeigt die Richtung (▲ mehr, ▼ weniger, ▶ gleich). „(neu)“ heißt: im Vorzeitraum war es 0. Bei Quoten steht die Veränderung in Prozentpunkten (Pkt.).'],
  ['Wie viele Fotos passen auf das Gerät?', 'Je Foto etwa 150 bis 300 KB, je Kunde bis 200 Fotos. Unter Einstellungen → Kundenfotos siehst du die Gesamtgröße und kannst alte Fotos löschen oder sie aus der iCloud-Sicherung herausnehmen.'],
  ['Wo finde ich die Rund-Tour?', 'Oben auf dieser Hilfe-Seite („Rund-Tour starten“), in den Einstellungen unter Hilfe, auf dem iPhone und dem iPad hochkant unter „Mehr“ und über die Suche („Tour“). Beim ersten Start bietet Sperling sie einmal an.'],
  ['Wo liegen meine Daten?', 'Nur auf deinem Gerät, verschlüsselt mit deinem Master-Passwort. Sicherungen legst du selbst verschlüsselt in iCloud Drive ab. Der Webserver kennt nur das Programm.'],
  ['Ich habe das Master-Passwort vergessen.', 'Dann lassen sich die Daten leider nicht entschlüsseln. Deshalb das Passwort sicher notieren und regelmäßig sichern.'],
  ['Wie bekomme ich Sperling aufs Tablet?', 'Adresse im Browser öffnen und zum Home-Bildschirm hinzufügen. Die Hilfe-Seite zeigt die Schritte für dein Gerät.'],
  ['Funktioniert Sperling ohne Internet?', 'Ja. Nur Karte und Adresssuche brauchen Netz.'],
  ['Wie nutze ich zwei Geräte?', 'Auf dem einen Gerät „In iCloud / Dateien sichern“, auf dem anderen „Sicherung einspielen“ und die Datei aus iCloud Drive wählen. Es gibt keinen automatischen Abgleich, deshalb am besten hauptsächlich auf einem Gerät arbeiten.'],
  ['Ich habe einen Kunden gelöscht.', 'Kunden → ganz unten „Gelöscht“ → Wiederherstellen. Nichts verfällt von selbst.'],
  ['Warum fragt Sperling vor jedem Anruf nach?', 'Damit kein Anruf aus Versehen startet, etwa beim Scrollen. Am Tablet kannst du die Nummer auch kopieren.'],
  ['Landen Enpal- und Vorwerk-Notizen zusammen?', 'Nein. Sie werden immer getrennt gespeichert und nie in den Text der anderen Firma übernommen.'],
  ['Wie schalte ich die ?-Knöpfe aus?', 'Einstellungen → Hilfe → „?-Knöpfe anzeigen“ ausschalten. Die Hilfe-Seite bleibt erreichbar.'],
];

export interface HilfeTreffer { art: 'thema' | 'begriff' | 'frage'; id: string; titel: string; text: string; punkte: number }

/** Durchsucht Anleitungen, Begriffe und Fragen; bester Treffer zuerst. */
export function hilfeSuchen(eingabe: string): HilfeTreffer[] {
  const e = suchText(eingabe);
  if (!e) return [];
  const woerter = e.split(' ');
  const alle: Omit<HilfeTreffer, 'punkte'>[] = [
    ...Object.entries(THEMEN).map(([id, t]) => ({ art: 'thema' as const, id, titel: t.titel, text: [t.kurz, ...(('schritte' in t ? t.schritte : []) as string[])].join(' ') })),
    ...BEGRIFFE.map(([titel, text], i) => ({ art: 'begriff' as const, id: `b${i}`, titel, text })),
    ...FRAGEN.map(([titel, text], i) => ({ art: 'frage' as const, id: `f${i}`, titel, text })),
  ];
  return alle
    .map((x) => {
      const titelN = suchText(x.titel);
      const p = punkte({ text: suchText(`${x.titel} ${x.text}`), titelN }, woerter, e);
      // Wörter im Titel zählen doppelt, damit das passende Thema vor beiläufigen Erwähnungen steht
      return { ...x, punkte: p ? p + woerter.filter((w) => titelN.includes(w)).length * 3 : 0 };
    })
    .filter((x) => x.punkte > 0)
    .sort((a, b) => b.punkte - a.punkte);
}
