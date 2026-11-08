// Sperling – Abgleich zwischen Geräten über eine Sicherungsdatei in iCloud Drive (angestoßen, nicht automatisch:
// Safari lässt eine Web-App nur Dateien lesen, die der Nutzer selbst wählt). Rein, in Node testbar.

export type AbgleichUrteil = 'neuer' | 'konflikt' | 'gleich' | 'aelter' | 'ungueltig';

/**
 * Vergleicht den Stand einer Datei mit dem Stand auf dem Gerät.
 * - neuer: Datei ist neuer, hier hat sich seit dem letzten Abgleich nichts geändert → übernehmen.
 * - konflikt: Datei ist neuer, aber auch hier wurde seit dem letzten Abgleich etwas geändert → nachfragen.
 * - konflikt auch, wenn die Datei älter ist, aber seit dem letzten Abgleich auf BEIDEN Geräten etwas geändert wurde
 *   (sonst gingen die Änderungen vom anderen Gerät beim nächsten „In iCloud sichern“ verloren, ab 0.14.6).
 * - gleich / aelter: nichts zu tun.
 * Zeitstempel sind ISO-Strings (UTC), daher als Text vergleichbar.
 */
export function abgleichUrteil(dateiStand: unknown, lokalStand: string | null, letzterAbgleich: string | null): AbgleichUrteil {
  if (typeof dateiStand !== 'string' || Number.isNaN(Date.parse(dateiStand))) return 'ungueltig';
  if (!lokalStand) return 'neuer';
  if (dateiStand === lokalStand) return 'gleich';
  if (dateiStand < lokalStand) {
    // Datei älter: Wurde sie seit dem letzten Abgleich auf dem anderen Gerät geändert? Dann hat jede Seite etwas, das der anderen fehlt.
    if (letzterAbgleich && dateiStand > letzterAbgleich && lokalStand > letzterAbgleich) return 'konflikt';
    return 'aelter';
  }
  // Datei ist neuer. Hat sich hier seit dem letzten Abgleich etwas getan?
  if (letzterAbgleich && lokalStand <= letzterAbgleich) return 'neuer';
  return 'konflikt';
}

/** Soll beim Start gefragt werden? Nicht im Demo-Modus, nicht wenn abgeschaltet, höchstens einmal je Sitzung. */
export function beimStartFragen(o: { demo: boolean; abgeschaltet: boolean; schonGefragt: boolean }): boolean {
  return !o.demo && !o.abgeschaltet && !o.schonGefragt;
}
