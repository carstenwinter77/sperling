// Sperling – Hilfetexte: Anleitungen je Bereich, Begriffe, häufige Fragen (rein, ohne DOM, in Node testbar).
// Die ?-Knöpfe zeigen den Kurztext eines Themas; die Seite #/hilfe zeigt alles mit Suche.
import { suchText, punkte } from './suche.ts';

export interface Thema { titel: string; kurz: string; schritte?: string[] }

export const THEMEN = {
  start: {
    titel: 'Übersicht',
    kurz: 'Dein Tag auf einen Blick: was heute fällig ist, Kunden je Bereich und Chancen in anderen Bereichen.',
    schritte: [
      'Oben suchst du alles: Kunden, Geräte, Termine, Notizen oder Befehle.',
      'Ein Kreis vor einem Termin hakt ihn als erledigt ab.',
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
  kunden: {
    titel: 'Kundenliste',
    kurz: 'Alle Kunden mit Suche, Filter und Sortierung. Die Farbe zeigt, wie lange der letzte Kontakt her ist.',
    schritte: [
      '„Filter“ wählt Bereiche, Status und Kontaktalter. Mehrere Haken zeigen alles, was zu einem davon passt.',
      'Sortieren nach Name, „Längster Kontakt zuerst“, „Letzter Kontakt zuerst“ oder „Zuletzt angelegt“.',
      'Grün: Kontakt in den letzten 30 Tagen, gelb: bis 90 Tage, rot: länger her oder noch nie.',
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
  karte: {
    titel: 'Karte',
    kurz: 'Kunden und Potenziale auf der Karte, als Satellit oder Straßenkarte.',
    schritte: [
      'Oben eine Adresse suchen, dann „Als Potenzial markieren“ oder „Kunde anlegen“.',
      'Lange auf ein Haus tippen (am Laptop Rechtsklick) markiert genau diese Stelle.',
      '„Filter“ zeigt nur bestimmte Bereiche, Status oder lange nicht kontaktierte Kunden.',
      'Namen gehen nie an den Kartendienst, nur die gesuchte Adresse.',
    ],
  },
  termine: {
    titel: 'Termine und Kalender',
    kurz: 'Termine und Wiedervorlagen als Liste, Monat, Woche oder Tag.',
    schritte: [
      'Im Monat einen Tag antippen legt einen Termin an.',
      'In Woche und Tag eine Uhrzeit antippen ergibt eine Stunde; Finger halten und ziehen wählt eine andere Dauer.',
      '📅 am Termin übernimmt ihn in den Kalender des Geräts.',
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
    kurz: 'Gespräche, Abschlüsse, Termine und Verleihe für einen Zeitraum, mit Vergleich zum Zeitraum davor.',
    schritte: [
      'Bereich wählen (alles, PV, WP oder Vorwerk) und den Zeitraum: Tag, Woche, Monat, Kalenderjahr oder letzte 365 Tage.',
      'Mit ‹ und › blätterst du in die Vergangenheit.',
      '„PDF-Bericht“ erstellt einen Bericht zum Teilen oder Speichern.',
    ],
  },
  einstellungen: {
    titel: 'Einstellungen',
    kurz: 'Sicherung, Felder, Passwort und Face ID, Vorlagen, Kundenansicht, Darstellung und Hilfe.',
    schritte: [
      'Sicherung: regelmäßig „In iCloud / Dateien sichern“.',
      'Unter „Kundenansicht zum Herzeigen“ legst du fest, was ein Kunde sehen darf.',
      'Unter „Hilfe“ schaltest du die ?-Knöpfe aus und findest die Installationsanleitung.',
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
