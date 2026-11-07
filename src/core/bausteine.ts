// Sperling – Textbausteine für die Gesprächsnotizen (rein, ohne DOM, in Node testbar).
// Je Bereich eine Liste kurzer Sätze, die im Gesprächsmodus per Antippen an die Notiz angehängt werden.
// Die Liste ist in den Einstellungen pflegbar. Fehlt sie (ältere Daten), gilt die Startliste.
import type { Sparte } from './model.ts';

export const MAX_BAUSTEINE = 60;
export const MAX_BAUSTEIN_LAENGE = 200;
const BEREICHE: Sparte[] = ['pv', 'wp', 'vorwerk'];

export type Bausteine = Record<Sparte, string[]>;

export const STANDARD_BAUSTEINE: Bausteine = {
  pv: [
    'Interesse an einer Solaranlage',
    'Dach nach Süden ausgerichtet',
    'Dach muss bald saniert werden',
    'Speicher gewünscht',
    'E-Auto vorhanden oder geplant, Wallbox interessant',
    'Hoher Stromverbrauch',
    'Mieten statt kaufen interessant',
    'Kaufen bevorzugt',
    'Möchte Angebote vergleichen',
    'Partner soll beim nächsten Termin dabei sein',
    'Rückruf gewünscht',
    'Unterlagen per E-Mail schicken',
  ],
  wp: [
    'Heizung älter als 20 Jahre',
    'Heizt mit Gas',
    'Heizt mit Öl',
    'Fußbodenheizung vorhanden',
    'Heizkörper vorhanden',
    'Fragen zur Förderung',
    'Platz für die Außeneinheit klären',
    'Kombination mit Solaranlage interessant',
    'Haus gedämmt',
    'Vor-Ort-Termin für die Heizlast vereinbaren',
  ],
  vorwerk: [
    'Vorführung gewünscht',
    'Kobold zum Testen dagelassen',
    'Hat schon einen älteren Kobold',
    'Interesse an Saugroboter',
    'Haustiere im Haushalt',
    'Viele Hartböden',
    'Viele Teppiche',
    'Allergiker im Haushalt',
    'Fragt nach Ratenzahlung',
    'Zubehör oder Beutel nachbestellen',
    'Service oder Wartung gewünscht',
    'Empfehlung von Bekannten',
  ],
};

const bereinigen = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, MAX_BAUSTEIN_LAENGE) : '');

/** Eine Liste prüfen: nur Text, ohne Leere und Doppelte, höchstens MAX_BAUSTEINE. */
export function bausteinListe(v: unknown): string[] {
  const out: string[] = [];
  for (const x of Array.isArray(v) ? v : []) {
    const t = bereinigen(x);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= MAX_BAUSTEINE) break;
  }
  return out;
}

/** Fehlt ein Bereich (ältere Daten), gilt die Startliste. Eine bewusst geleerte Liste bleibt leer. */
export function normalizeBausteine(v: unknown): Bausteine {
  const src = v && typeof v === 'object' ? v as Record<string, unknown> : {};
  return Object.fromEntries(BEREICHE.map((b) => [b, Array.isArray(src[b]) ? bausteinListe(src[b]) : [...STANDARD_BAUSTEINE[b]]])) as Bausteine;
}

/** Baustein als eigene Zeile an die Notiz hängen. */
export function bausteinAnhaengen(notiz: string, baustein: string): string {
  const t = bereinigen(baustein);
  if (!t) return notiz;
  const basis = notiz.replace(/[ \t]+$/, '');
  return basis && !basis.endsWith('\n') ? `${basis}\n${t}` : `${basis}${t}`;
}

/** Eintrag von Position `von` nach `nach` verschieben (neue Liste; ungültige Positionen ändern nichts). */
export function verschieben<T>(liste: T[], von: number, nach: number): T[] {
  const l = [...liste];
  if (!Number.isInteger(von) || !Number.isInteger(nach) || von < 0 || nach < 0 || von >= l.length || nach >= l.length) return l;
  const [x] = l.splice(von, 1);
  l.splice(nach, 0, x as T);
  return l;
}
