// Sperling – Filter der Karte mit Mehrfachauswahl (rein, testbar).
// Leere Auswahl heißt „alle“. Ein Kunde erscheint, wenn mindestens eine gewählte Sparte
// einen gewählten Status hat. Ohne Status-Auswahl zählt bei gewählten Sparten jedes Interesse
// (also nicht „unbekannt“ und nicht „kein Interesse“).
import { SPARTEN_KEYS, hauptStatus, type Kunde, type Sparte, type StatusKey } from './model.ts';

export interface KartenFilter { sparten: Sparte[]; status: StatusKey[] }
export const leererKartenFilter = (): KartenFilter => ({ sparten: [], status: [] });

export function passt(k: Pick<Kunde, 'status'>, f: KartenFilter): boolean {
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
