// Sperling – Filter für Karte und Kundenliste mit Mehrfachauswahl (rein, testbar).
// Leere Auswahl heißt „alle“. Ein Kunde erscheint, wenn mindestens eine gewählte Sparte
// einen gewählten Status hat. Ohne Status-Auswahl zählt bei gewählten Sparten jedes Interesse
// (also nicht „unbekannt“ und nicht „kein Interesse“).
import { SPARTEN_KEYS, hauptStatus, type Kunde, type Sparte, type StatusKey } from './model.ts';

/** Kontakt-Filter: '' = egal, Zahl = länger als so viele Tage kein Kontakt (oder noch nie), 'nie' = noch nie */
export type KontaktFilter = '' | '30' | '60' | '90' | '180' | '365' | 'nie';
export const KONTAKT_FILTER: [KontaktFilter, string][] = [['30', 'über 30 Tage'], ['60', 'über 60 Tage'], ['90', 'über 90 Tage'], ['180', 'über ½ Jahr'], ['365', 'über 1 Jahr'], ['nie', 'noch nie']];

export interface KartenFilter { sparten: Sparte[]; status: StatusKey[]; kontakt: KontaktFilter }
export const leererKartenFilter = (): KartenFilter => ({ sparten: [], status: [], kontakt: '' });
export const filterAktiv = (f: KartenFilter) => f.sparten.length + f.status.length + (f.kontakt ? 1 : 0);

/** Passt der Kontakt-Stand? `tage` = Tage seit letztem Kontakt, null = noch nie. */
export function kontaktPasst(tage: number | null, f: KontaktFilter): boolean {
  if (!f) return true;
  if (f === 'nie') return tage === null;
  return tage === null || tage > Number(f);
}

export function passt(k: Pick<Kunde, 'status'>, f: KartenFilter, tageSeitKontakt: number | null = null): boolean {
  if (!kontaktPasst(tageSeitKontakt, f.kontakt)) return false;
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
