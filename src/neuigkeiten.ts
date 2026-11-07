// Sperling – „Was ist neu“: kurze, verständliche Liste je Version (neueste zuerst).
// Bei jeder Version mit sichtbaren Änderungen hier einen Eintrag ergänzen (siehe REGELN R-VERSION).
export const NEUIGKEITEN = [
  {
    version: '0.10.0',
    punkte: [
      'Produktübersicht: alle Produkte von Enpal, GALVANY und Vorwerk Kobold mit Daten, Preis (mit Stand) und Link zum Hersteller.',
      'Produkte im Gespräch markieren: beim Kunden und im Gesprächsmodus je Produkt Interesse, Später, Schon vorhanden oder Kein Interesse antippen – steht im Verlauf, in den Texten, im Filter und in den Auswertungen.',
    ],
  },
  { version: '0.9.9', punkte: ['Kontaktseite: Titel unter dem Foto zweizeilig „Selbständiger Berater / für Photovoltaik und Wärmepumpe“.'] },
  {
    version: '0.9.8',
    punkte: [
      'Felder selbst bestimmen: Unter Einstellungen → Felder jedes Feld ein- oder ausblenden. Ausgeblendete Felder behalten ihre Werte.',
      'Eigene Felder anlegen – Text, langer Text, Zahl mit Einheit, Datum, Ja/Nein, Auswahlliste, Telefon, E-Mail oder Link. Sie erscheinen in Kartei, Gesprächsmodus, Texten, Kundenansicht, Suche und Filter.',
    ],
  },
  { version: '0.9.7', punkte: ['Kontaktseite mit echter Anschrift, Arbeitsnummer (auch WhatsApp), Beratungsgebiet und vollständigem Impressum.'] },
  { version: '0.9.6', punkte: ['Der PDF-Bericht über alle Bereiche heißt jetzt „Gesamtauswertung“.'] },
  { version: '0.9.5', punkte: ['Dropbox ist entfernt. Gesichert wird nur noch verschlüsselt in iCloud (Einstellungen → „In iCloud / Dateien sichern“).'] },
  { version: '0.9.4', punkte: ['Kontaktseite: neues Zitat, positiv formulierte Versprechen und eine vollständige Datenschutzerklärung.'] },
  { version: '0.9.3', punkte: ['Kontaktseite: echter Name und neuer Abschnitt „Beratung ohne Druck“ – unverbindlich, ohne Zeitdruck, ehrlich beraten.'] },
  { version: '0.9.2', punkte: ['Bereichsfarben überall: Photovoltaik gelb, Wärmepumpe blau, Vorwerk grün – in Chips, Karten, Reitern und Symbolen.'] },
  {
    version: '0.9.1',
    punkte: ['Meine Kontaktseite (Konzept): öffentliche Seite für Photovoltaik und Wärmepumpe mit Anrufen, WhatsApp, E-Mail, Kontakt speichern und Rückrufwunsch – in den Einstellungen öffnen, teilen oder als QR-Code zeigen.'],
  },
  {
    version: '0.9.0',
    punkte: [
      'Neues Aussehen: grünes Logo, neue Symbole, Bereichsfarben PV gelb, WP blau, Vorwerk grün. Hell/Dunkel jetzt unter Einstellungen.',
      'Gespräch starten direkt beim Kunden: links die Kundendaten, rechts Notizen und Leitfaden, dazu die ganze Gesprächshistorie.',
      'Suche überall (⌘K / Strg+K): Kunden, Geräte, Termine finden und direkt anrufen, Notiz oder Termin anlegen, z. B. „müller anrufen“.',
      'Beratungs-Schutz 🛡: Ein Tipp blendet alle anderen Kunden aus, solange ein Kunde mit aufs Tablet schaut.',
      'Letzter Kontakt bei jedem Kunden; Kundenliste und Karte mit Mehrfachfilter und Sortierung.',
      'Belegungskalender für Vorführgeräte und Auswertungen je Bereich mit PDF-Bericht.',
      'Nachbarn im Umkreis von 100 m bis 50 km, gelöschte Kunden verfallen nie mehr, Kundenansicht frei einstellbar.',
      'Hilfe mit ?-Knöpfen und Anleitung zum Installieren für jedes Gerät.',
    ],
  },
  {
    version: '0.8.0',
    punkte: [
      'Kalender mit Monats-, Wochen- und Tagesansicht: Termin per Fingertipp anlegen, in Woche/Tag auch per Wischen den Zeitraum wählen.',
      '„Hinfahren“ beim Kunden, auf der Karte und bei Terminen öffnet Apple Karten bzw. Google Maps.',
      'Zahl am App-Symbol zeigt heute fällige Aufgaben und überfällige Leihgaben.',
      'Papierkorb: Gelöschtes zurückholen.',
      'Kundenansicht zum Herzeigen: Tablet dem Kunden geben, ohne dass er interne Notizen sieht.',
      'Vorführgeräte reservieren, Fotos und Unterschrift bei Übergabe und Rückgabe, Leihschein als PDF.',
    ],
  },
  { version: '0.7.0', punkte: ['Entsperren mit Face ID / Touch ID.', 'Beispiel-Vorführbestand zum Ausprobieren.'] },
  { version: '0.6.0', punkte: ['Adresssuche auf der Karte, Karte startet am eigenen Standort.'] },
  { version: '0.5.0', punkte: ['Beispielkunden laden und wieder entfernen.'] },
];

/** Versionen vergleichen: 0.10.0 > 0.9.1 */
export function versionVergleich(a, b) {
  const x = String(a).split('.').map(Number);
  const y = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d;
  }
  return 0;
}
