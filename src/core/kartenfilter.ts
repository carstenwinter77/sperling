// Sperling – Filter für Karte und Kundenliste mit Mehrfachauswahl (rein, testbar).
// Leere Auswahl heißt „alle“. Ein Kunde erscheint, wenn mindestens eine gewählte Sparte
// einen gewählten Status hat. Ohne Status-Auswahl zählt bei gewählten Sparten jedes Interesse
// (also nicht „unbekannt“ und nicht „kein Interesse“).
import { SPARTEN_KEYS, hauptStatus, type Kunde, type Sparte, type StatusKey } from './model.ts';
import { filterbareFelder, filterWert, type FeldEinstellungen } from './felder.ts';
import { aktuelleMarkierungen, type Markierung, type ProduktMarkierung } from './produkte.ts';

/** Kontakt-Filter: '' = egal, Zahl = länger als so viele Tage kein Kontakt (oder noch nie), 'nie' = noch nie */
export type KontaktFilter = '' | '30' | '60' | '90' | '180' | '365' | 'nie';
export const KONTAKT_FILTER: [KontaktFilter, string][] = [['30', 'über 30 Tage'], ['60', 'über 60 Tage'], ['90', 'über 90 Tage'], ['180', 'über ½ Jahr'], ['365', 'über 1 Jahr'], ['nie', 'noch nie']];

/** `eigen`: je eigenem Feld (ID) die gewählten Werte ('ja'/'nein', Option, '' = ohne Angabe). */
/** `produkt`: Kunde hat mindestens ein Produkt (der gewählten Bereiche) mit einer dieser Markierungen. */
export interface KartenFilter { sparten: Sparte[]; status: StatusKey[]; kontakt: KontaktFilter; eigen: Record<string, string[]>; produkt: Markierung[] }
export const leererKartenFilter = (): KartenFilter => ({ sparten: [], status: [], kontakt: '', eigen: {}, produkt: [] });
export const filterAktiv = (f: KartenFilter) => f.sparten.length + f.status.length + (f.kontakt ? 1 : 0) + Object.values(f.eigen || {}).filter((w) => w.length).length + (f.produkt?.length ? 1 : 0);

/** Passen die Produkt-Markierungen? */
export function produktPasst(k: { produkte?: ProduktMarkierung[] }, f: KartenFilter): boolean {
  if (!f.produkt?.length) return true;
  for (const m of aktuelleMarkierungen(k.produkte).values()) {
    if ((!f.sparten.length || f.sparten.includes(m.bereich)) && m.markierung && f.produkt.includes(m.markierung)) return true;
  }
  return false;
}

/** Passt der Kontakt-Stand? `tage` = Tage seit letztem Kontakt, null = noch nie. */
export function kontaktPasst(tage: number | null, f: KontaktFilter): boolean {
  if (!f) return true;
  if (f === 'nie') return tage === null;
  return tage === null || tage > Number(f);
}

/** Passen die eigenen Felder? Jedes Feld mit Auswahl muss passen (und), innerhalb eines Feldes reicht ein Wert (oder). */
export function eigenePassen(k: { eigene?: Record<string, unknown> }, f: KartenFilter, fe?: FeldEinstellungen): boolean {
  const felder = filterbareFelder(fe);
  for (const [id, werte] of Object.entries(f.eigen || {})) {
    if (!werte.length) continue;
    const def = felder.find((x) => x.id === id);
    if (def && !werte.includes(filterWert(k, def))) return false;
  }
  return true;
}

export function passt(k: Pick<Kunde, 'status'> & { eigene?: Record<string, unknown>; produkte?: ProduktMarkierung[] }, f: KartenFilter, tageSeitKontakt: number | null = null, fe?: FeldEinstellungen): boolean {
  if (!kontaktPasst(tageSeitKontakt, f.kontakt)) return false;
  if (!eigenePassen(k, f, fe)) return false;
  if (!produktPasst(k, f)) return false;
  // Nur Produktfilter gewählt (Bereiche dienen dann nur zur Eingrenzung der Produkte)
  if (f.produkt?.length && !f.status.length) return true;
  if (!f.sparten.length && !f.status.length) return true;
  const sparten = f.sparten.length ? f.sparten : SPARTEN_KEYS;
  return sparten.some((s) => (f.status.length ? f.status.includes(k.status[s]) : !['unbekannt', 'kein_interesse'].includes(k.status[s])));
}

/** Pin-Farbe: bester passender Status der gewählten Sparten. */
export function pinStatus(k: Pick<Kunde, 'status'>, f: KartenFilter): string {
  if (!f.sparten.length && !f.status.length) return hauptStatus(k);
  const sparten = f.sparten.length ? f.sparten : SPARTEN_KEYS;
  const teil = { status: Object.fromEntries(sparten.filter((s) => !f.status.length || f.status.includes(k.status[s])).map((s) => [s, k.status[s]])) };
  return hauptStatus(teil as Pick<Kunde, 'status'>);
}

/**
 * Farbe des Karten-Pins nach Bereich (ab 0.14.6): Geht es beim Kunden um genau einen Bereich, hat der Pin dessen
 * Farbe (PV gelb, Wärmepumpe blau, Vorwerk grün); bei mehreren Bereichen eine eigene Mischfarbe; ohne laufenden
 * Bereich (alles unbekannt oder kein Interesse) grau. „Gemeint“ ist ein Bereich, wenn sein Status weder
 * „Unbekannt“ noch „Kein Interesse“ ist; ein Filter grenzt auf die gewählten Bereiche und Status ein.
 */
export type PinFarbe = Sparte | 'misch' | 'leer';
export function pinBereiche(k: Pick<Kunde, 'status'>, f: KartenFilter = leererKartenFilter()): Sparte[] {
  const sparten = f.sparten.length ? f.sparten : SPARTEN_KEYS;
  return sparten.filter((s) => (f.status.length ? f.status.includes(k.status[s]) : true) && !['unbekannt', 'kein_interesse'].includes(k.status[s]));
}
export function pinFarbe(k: Pick<Kunde, 'status'>, f: KartenFilter = leererKartenFilter()): PinFarbe {
  const b = pinBereiche(k, f);
  return b.length === 1 ? b[0]! : b.length > 1 ? 'misch' : 'leer';
}
export const PIN_FARBEN: Record<PinFarbe, { label: string; css: string }> = {
  pv: { label: 'Photovoltaik', css: 'var(--pv)' },
  wp: { label: 'Wärmepumpe', css: 'var(--wp)' },
  vorwerk: { label: 'Vorwerk', css: 'var(--vw)' },
  misch: { label: 'Mehrere Bereiche', css: 'var(--pin-misch)' },
  leer: { label: 'Noch offen / kein Interesse', css: 'var(--pin-leer)' },
};
