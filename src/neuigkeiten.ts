// Sperling – „Was ist neu“: kurze, verständliche Liste je Version (neueste zuerst).
// Bei jeder Version mit sichtbaren Änderungen hier einen Eintrag ergänzen (siehe REGELN R-VERSION).
export const NEUIGKEITEN = [
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
