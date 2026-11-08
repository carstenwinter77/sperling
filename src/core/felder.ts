// Sperling – Feldverwaltung (rein, ohne DOM, in Node testbar).
// Jedes Feld der Kundenkartei lässt sich je Kategorie (Kontakt, PV, WP, Vorwerk) ausblenden;
// ausgeblendete Felder behalten ihre Daten. Dazu eigene Felder mit Typ. Die Definitionen liegen
// verschlüsselt in einstellungen.felder, die Werte eigener Felder am Kunden unter kunde.eigene.
// Wichtig: Dieses Modul liest Werte aus model.ts nur innerhalb von Funktionen (Zyklus model ↔ felder).
import { FELDER, type Feld, type Sparte } from './model.ts';
import { type Rec, uid, parseNumber } from './util.ts';
import { ANREDEN, TITEL_VORSCHLAEGE } from './anrede.ts';

export type Kategorie = 'kontakt' | Sparte;
export const KATEGORIEN: { key: Kategorie; label: string }[] = [
  { key: 'kontakt', label: 'Kontakt' },
  { key: 'pv', label: 'Photovoltaik' },
  { key: 'wp', label: 'Wärmepumpe' },
  { key: 'vorwerk', label: 'Vorwerk' },
];
const KATEGORIE_KEYS = KATEGORIEN.map((k) => k.key);

export type FeldTyp = 'text' | 'textarea' | 'number' | 'date' | 'bool' | 'select' | 'tel' | 'email' | 'url';
export const FELD_TYPEN: Record<FeldTyp, string> = {
  text: 'Text (eine Zeile)',
  textarea: 'Langer Text',
  number: 'Zahl (mit Einheit)',
  date: 'Datum',
  bool: 'Ja / Nein',
  select: 'Auswahlliste',
  tel: 'Telefonnummer',
  email: 'E-Mail-Adresse',
  url: 'Link (Internetadresse)',
};
const TYP_KEYS = Object.keys(FELD_TYPEN) as FeldTyp[];

/** Kontaktfelder der Kartei (feste Felder am Kunden). */
export const KONTAKT_FELDER: { key: string; label: string; type: FeldTyp; breit?: boolean; platzhalter?: string; options?: string[]; frei?: string; leer?: string; hilfe?: string }[] = [
  { key: 'anrede', label: 'Anrede', type: 'select', options: [...ANREDEN], leer: 'Keine Anrede', hilfe: 'anrede' },
  { key: 'titel', label: 'Titel', type: 'select', options: TITEL_VORSCHLAEGE, frei: 'Anderer Titel …', leer: 'Kein Titel', hilfe: 'anrede' },
  { key: 'vorname', label: 'Vorname', type: 'text' },
  { key: 'nachname', label: 'Nachname', type: 'text' },
  { key: 'firma', label: 'Firma', type: 'text' },
  { key: 'telefon', label: 'Telefon', type: 'tel' },
  { key: 'email', label: 'E-Mail', type: 'email' },
  { key: 'strasse', label: 'Straße und Hausnummer', type: 'text', breit: true },
  { key: 'plz', label: 'PLZ', type: 'text' },
  { key: 'ort', label: 'Ort', type: 'text' },
];

export interface EigenesFeld { id: string; kategorie: Kategorie; label: string; typ: FeldTyp; einheit: string; optionen: string[] }
export interface FeldEinstellungen { aus: string[]; eigene: EigenesFeld[] }
export const MAX_EIGENE = 100;

/** Ein Feld, wie es Formulare, Texte, Kundenansicht und Filter sehen. `pfad` ist zugleich die ID. */
export interface AnzeigeFeld {
  pfad: string; label: string; type: FeldTyp; unit?: string; options?: string[]; eigen: boolean; intern: boolean; breit?: boolean; platzhalter?: string;
  /** Auswahlliste mit freier Eingabe: Beschriftung des Eintrags, der ein Textfeld öffnet (Titel) */
  frei?: string;
  /** Beschriftung des leeren Eintrags (Standard „–“) */
  leer?: string;
  /** Hilfethema (THEMEN in src/core/hilfe.ts) für den ?-Knopf am Feld */
  hilfe?: string;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function normalizeEigenesFeld(x: unknown): EigenesFeld | null {
  const src: Rec = x && typeof x === 'object' ? x : {};
  const label = str(src.label, 100);
  if (!label) return null;
  const typ = (TYP_KEYS.includes(src.typ) ? src.typ : 'text') as FeldTyp;
  const optionen = typ === 'select' && Array.isArray(src.optionen)
    ? [...new Set(src.optionen.map((o: unknown) => str(o, 100)).filter(Boolean))].slice(0, 50) as string[]
    : [];
  return {
    id: typeof src.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(src.id) ? src.id : uid().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40),
    kategorie: (KATEGORIE_KEYS.includes(src.kategorie) ? src.kategorie : 'kontakt') as Kategorie,
    label,
    typ,
    einheit: typ === 'number' ? str(src.einheit, 30) : '',
    optionen,
  };
}

export function neuesEigenesFeld(teil: Partial<EigenesFeld>): EigenesFeld | null {
  return normalizeEigenesFeld({ ...teil, id: undefined });
}

export function normalizeFeldEinstellungen(x: unknown): FeldEinstellungen {
  const src: Rec = x && typeof x === 'object' ? x : {};
  const eigene: EigenesFeld[] = [];
  for (const e of Array.isArray(src.eigene) ? src.eigene : []) {
    const f = normalizeEigenesFeld(e);
    if (f && !eigene.some((y) => y.id === f.id)) eigene.push(f);
    if (eigene.length >= MAX_EIGENE) break;
  }
  const aus = Array.isArray(src.aus) ? [...new Set(src.aus.filter((p: unknown) => typeof p === 'string' && p.length <= 80 && /^[a-z]+\.[A-Za-z0-9_-]+$/.test(p)))] as string[] : [];
  return { aus, eigene };
}

/** Werte eigener Felder am Kunden: nur einfache Werte, Schlüssel = Feld-ID. Typprüfung beim Anzeigen. */
export function normalizeEigeneWerte(x: unknown): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!x || typeof x !== 'object') return out;
  let n = 0;
  for (const [k, v] of Object.entries(x as Rec)) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(k) || ++n > MAX_EIGENE * 2) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 20000);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}

const pfadEigen = (f: EigenesFeld) => `eigene.${f.id}`;

function eingebaut(kat: Kategorie): AnzeigeFeld[] {
  if (kat === 'kontakt') return KONTAKT_FELDER.map((f) => ({ pfad: `kontakt.${f.key}`, label: f.label, type: f.type, eigen: false, intern: false, breit: f.breit, platzhalter: f.platzhalter, options: f.options, frei: f.frei, leer: f.leer, hilfe: f.hilfe }));
  return FELDER[kat].map((f: Feld) => ({ pfad: `${kat}.${f.key}`, label: f.label, type: f.type, unit: f.unit, options: f.options, eigen: false, intern: f.key === 'bemerkung' }));
}

/** Alle Felder einer Kategorie (eingebaute, dann eigene), auch ausgeblendete. */
export function alleFelder(kat: Kategorie, fe: FeldEinstellungen | undefined): AnzeigeFeld[] {
  const eigene = (fe?.eigene || []).filter((f) => f.kategorie === kat).map((f): AnzeigeFeld => ({
    pfad: pfadEigen(f), label: f.label, type: f.typ, unit: f.einheit || undefined, options: f.typ === 'select' ? f.optionen : undefined, eigen: true, intern: false, breit: f.typ === 'textarea',
  }));
  return [...eingebaut(kat), ...eigene];
}

export const istAus = (fe: FeldEinstellungen | undefined, pfad: string) => !!fe?.aus.includes(pfad);

/** Nur die eingeschalteten Felder einer Kategorie. */
export function sichtbareFelder(kat: Kategorie, fe: FeldEinstellungen | undefined): AnzeigeFeld[] {
  return alleFelder(kat, fe).filter((f) => !istAus(fe, f.pfad));
}

/** Wert eines Feldes am Kunden. Kontaktfelder liegen direkt am Kunden. */
export function feldWertLesen(k: Rec, f: AnzeigeFeld): unknown {
  const [kopf, key] = f.pfad.split('.');
  if (kopf === 'kontakt') return k[key];
  return k[kopf]?.[key];
}

/** Datenpfad zum Speichern (Kontaktfelder ohne Präfix). */
export const speicherPfad = (f: AnzeigeFeld) => (f.pfad.startsWith('kontakt.') ? f.pfad.slice(8) : f.pfad);

/** Wert für Text, Kundenansicht und Verlauf; null = leer oder passt nicht zum Typ. */
export function feldText(f: Pick<AnzeigeFeld, 'type' | 'unit' | 'options'>, v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  switch (f.type) {
    case 'bool': return v === true ? 'ja' : v === false ? 'nein' : null;
    case 'number': {
      const n = typeof v === 'number' ? v : parseNumber(v);
      return n === null ? null : `${n.toLocaleString('de-DE', { maximumFractionDigits: 3 })}${f.unit ? ` ${f.unit}` : ''}`;
    }
    case 'date': {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
      const [j, m, t] = v.split('-');
      return `${t}.${m}.${j}`;
    }
    case 'select': return typeof v === 'string' && (!f.options || f.options.includes(v)) ? v : null;
    default: return typeof v === 'string' ? (v.trim() || null) : null;
  }
}

/** Eigene Felder, nach denen Karte und Kundenliste filtern können (Ja/Nein und Auswahlliste, eingeschaltet). */
export function filterbareFelder(fe: FeldEinstellungen | undefined): EigenesFeld[] {
  return (fe?.eigene || []).filter((f) => (f.typ === 'bool' || (f.typ === 'select' && f.optionen.length)) && !istAus(fe, pfadEigen(f)));
}
/** Filterwert eines Kunden für ein filterbares Feld: 'ja' / 'nein' / Option / '' (leer). */
export function filterWert(k: { eigene?: Record<string, unknown> }, f: EigenesFeld): string {
  const v = k.eigene?.[f.id];
  if (f.typ === 'bool') return v === true ? 'ja' : v === false ? 'nein' : '';
  return typeof v === 'string' && f.optionen.includes(v) ? v : '';
}
