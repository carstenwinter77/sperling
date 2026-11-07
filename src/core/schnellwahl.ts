// Sperling – Schnellwahl für Wiedervorlagen: „in 1 Tag … in 1 Jahr“ statt Kalender blättern.
// Rein, ohne DOM, in Node testbar.

export interface Schritt { id: string; label: string; tage?: number; monate?: number }

export const SCHRITTE: readonly Schritt[] = [
  { id: '1t', label: '1 Tag', tage: 1 },
  { id: '3t', label: '3 Tage', tage: 3 },
  { id: '1w', label: '1 Woche', tage: 7 },
  { id: '2w', label: '2 Wochen', tage: 14 },
  { id: '3w', label: '3 Wochen', tage: 21 },
  { id: '4w', label: '4 Wochen', tage: 28 },
  { id: '3m', label: '3 Monate', monate: 3 },
  { id: '6m', label: '½ Jahr', monate: 6 },
  { id: '12m', label: '1 Jahr', monate: 12 },
];

/** Standard-Uhrzeit, wenn das Feld noch leer ist. */
export const STANDARD_UHRZEIT = { h: 9, m: 0 };

/**
 * Zieldatum ab `heute` (lokale Zeit). Uhrzeit: `uhrzeit` (aus dem bisherigen Feldwert) oder 9:00.
 * Monate am Monatsende werden gekappt (31.01. + 3 Monate = 30.04.). Unbekannter Schritt: null.
 */
export function schrittDatum(heute: Date, id: string, uhrzeit?: { h: number; m: number } | null): Date | null {
  const s = SCHRITTE.find((x) => x.id === id);
  if (!s || Number.isNaN(heute.getTime())) return null;
  const z = uhrzeit && Number.isInteger(uhrzeit.h) && Number.isInteger(uhrzeit.m) && uhrzeit.h >= 0 && uhrzeit.h < 24 && uhrzeit.m >= 0 && uhrzeit.m < 60 ? uhrzeit : STANDARD_UHRZEIT;
  const j = heute.getFullYear(); const mo = heute.getMonth(); const t = heute.getDate();
  if (s.tage) return new Date(j, mo, t + s.tage, z.h, z.m);
  const zielMonat = mo + (s.monate || 0);
  const letzter = new Date(j, zielMonat + 1, 0).getDate();
  return new Date(j, zielMonat, Math.min(t, letzter), z.h, z.m);
}

/** Uhrzeit aus einem datetime-local-Wert („JJJJ-MM-TTTHH:MM“) oder null. */
export function uhrzeitAus(wert: string): { h: number; m: number } | null {
  const m = /T(\d{2}):(\d{2})/.exec(wert || '');
  return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
}
