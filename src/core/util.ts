// Sperling – kleine, DOM-freie Hilfsfunktionen.
// Regel: Diese Datei darf keine Browser-only-APIs außer `crypto` benutzen,
// damit sie in Node-Tests lauffähig bleibt.

/** Beliebiges Objekt aus unsicherer Quelle (Import, Speicher), wird von normalize…() geprüft. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Rec = Record<string, any>;

/** Erzeugt eine zufällige, URL-sichere ID. */
export function uid(): string {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback (ältere Browser): 128 Bit aus getRandomValues
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** HTML-Escaping. JEDER Nutzertext muss hierdurch, bevor er in innerHTML landet. */
export function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Prüft, ob ein String ein gültiges Datum ergibt. */
export function isValidDate(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  const d = new Date(value as string | number | Date);
  return !Number.isNaN(d.getTime());
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO-String -> Wert für <input type="datetime-local"> (lokale Zeit). */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso || !isValidDate(iso)) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Wert aus <input type="datetime-local"> -> ISO-String (UTC). Ungültig -> null. */
export function localInputToIso(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;
  const d = new Date(value); // ohne Zeitzone = lokale Zeit
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso || !isValidDate(iso)) return '–';
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso || !isValidDate(iso)) return '–';
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** Zahl aus Eingabe lesen (Komma oder Punkt). Leer/ungültig -> null. */
export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value).trim().replace(/\s/g, '').replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function debounce<A extends unknown[]>(fn: (...args: A | []) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  const wrapped = (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(...args);
    }, ms);
  };
  const mitFlush = Object.assign(wrapped, { flush: () => {
    if (t) {
      clearTimeout(t);
      t = null;
      fn();
    }
  } });
  return mitFlush;
}

/** Tiefe Kopie für reine JSON-Daten. */
export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Entfernung zwischen zwei Koordinaten in Metern (Haversine). */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function isValidCoord(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

/** Suchtext normalisieren: klein, Umlaute ausgeschrieben, ohne Akzente und Satzzeichen (Kommandozeile, Produktsuche). */
export function suchText(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\be-mail/g, 'email')
    .replace(/[^a-z0-9@]+/g, ' ')
    .trim();
}
