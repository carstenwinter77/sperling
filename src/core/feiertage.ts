// Sperling – gesetzliche Feiertage in Niedersachsen, lokal berechnet (kein externer Dienst).
// Termine bleiben an Feiertagen möglich; der Kalender zeigt den Feiertag nur an.

/** Ostersonntag (gregorianisch, Gauß/Anonymous-Algorithmus) als [Monat 1–12, Tag]. */
export function ostersonntag(jahr: number): [number, number] {
  const a = jahr % 19; const b = Math.floor(jahr / 100); const c = jahr % 100;
  const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return [monat, tag];
}

const pad = (n: number) => String(n).padStart(2, '0');
const schluessel = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const cache = new Map<number, Map<string, string>>();

/** Alle Feiertage eines Jahres: Datum (JJJJ-MM-TT) → Name. */
export function feiertage(jahr: number): Map<string, string> {
  const vorhanden = cache.get(jahr);
  if (vorhanden) return vorhanden;
  const m = new Map<string, string>();
  if (!Number.isInteger(jahr) || jahr < 1900 || jahr > 2200) return m;
  const [om, ot] = ostersonntag(jahr);
  const ostern = (plus: number) => schluessel(new Date(jahr, om - 1, ot + plus));
  m.set(`${jahr}-01-01`, 'Neujahr');
  m.set(ostern(-2), 'Karfreitag');
  m.set(ostern(1), 'Ostermontag');
  m.set(`${jahr}-05-01`, 'Tag der Arbeit');
  m.set(ostern(39), 'Christi Himmelfahrt');
  m.set(ostern(50), 'Pfingstmontag');
  m.set(`${jahr}-10-03`, 'Tag der Deutschen Einheit');
  if (jahr >= 2018) m.set(`${jahr}-10-31`, 'Reformationstag');
  m.set(`${jahr}-12-25`, '1. Weihnachtstag');
  m.set(`${jahr}-12-26`, '2. Weihnachtstag');
  cache.set(jahr, m);
  return m;
}

/** Name des Feiertags an diesem Tag (JJJJ-MM-TT oder Date, Ortszeit) oder null. */
export function feiertag(tag: string | Date): string | null {
  const key = typeof tag === 'string' ? tag.slice(0, 10) : schluessel(tag);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  return feiertage(Number(key.slice(0, 4))).get(key) || null;
}
