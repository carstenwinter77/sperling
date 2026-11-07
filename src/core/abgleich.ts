// Sperling – Abgleich zwischen Geräten über eine Sicherungsdatei in iCloud Drive (angestoßen, nicht automatisch:
// Safari lässt eine Web-App nur Dateien lesen, die der Nutzer selbst wählt). Rein, in Node testbar.

export type AbgleichUrteil = 'neuer' | 'konflikt' | 'gleich' | 'aelter' | 'ungueltig';

/**
 * Vergleicht den Stand einer Datei mit dem Stand auf dem Gerät.
 * - neuer: Datei ist neuer, hier hat sich seit dem letzten Abgleich nichts geändert → übernehmen.
 * - konflikt: Datei ist neuer, aber auch hier wurde seit dem letzten Abgleich etwas geändert → nachfragen.
 * - gleich / aelter: nichts zu tun.
 * Zeitstempel sind ISO-Strings (UTC), daher als Text vergleichbar.
 */
export function abgleichUrteil(dateiStand: unknown, lokalStand: string | null, letzterAbgleich: string | null): AbgleichUrteil {
  if (typeof dateiStand !== 'string' || Number.isNaN(Date.parse(dateiStand))) return 'ungueltig';
  if (!lokalStand) return 'neuer';
  if (dateiStand === lokalStand) return 'gleich';
  if (dateiStand < lokalStand) return 'aelter';
  // Datei ist neuer. Hat sich hier seit dem letzten Abgleich etwas getan?
  if (letzterAbgleich && lokalStand <= letzterAbgleich) return 'neuer';
  return 'konflikt';
}

/** Soll beim Start gefragt werden? Nicht im Demo-Modus, nicht wenn abgeschaltet, höchstens einmal je Sitzung. */
export function beimStartFragen(o: { demo: boolean; abgeschaltet: boolean; schonGefragt: boolean }): boolean {
  return !o.demo && !o.abgeschaltet && !o.schonGefragt;
}
