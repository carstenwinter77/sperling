// Sperling – Abhaken mit Folgeschritt: Wiedervorlage/Termin erledigen, dabei kurz notieren,
// wie es ausging, und gleich die nächste Wiedervorlage setzen. Rein, ohne DOM, in Node testbar.
import { neueNotiz, neuerTermin, type Termin, type Kunde } from './model.ts';

export interface AbhakenEingabe {
  /** Was ist rausgekommen? Leer: keine Notiz. */
  text: string;
  /** Beginn der nächsten Wiedervorlage als ISO-String, leer: keine. */
  folgeBeginn: string;
  /** Titel der nächsten Wiedervorlage, leer: Titel des erledigten Termins. */
  folgeTitel?: string;
}

/** Notiztext: Titel des erledigten Termins als Bezug, dann der eingegebene Text. */
export function notizText(t: Pick<Termin, 'titel' | 'art'>, text: string): string {
  const titel = t.titel.trim() || (t.art === 'termin' ? 'Termin' : 'Wiedervorlage');
  return `${titel} erledigt: ${text.trim()}`;
}

/**
 * Wendet das Abhaken auf die Daten an (innerhalb von store.mutate aufrufen):
 * Termin erledigt, optional Notiz beim Kunden (Bereich des Termins, R-TEXT) und Folge-Wiedervorlage.
 * Ohne Kunde gibt es keine Notiz. Gibt die neu angelegte Wiedervorlage zurück (oder null).
 */
export function abhakenAnwenden(
  data: { termine: Termin[]; kunden: Kunde[] },
  terminId: string,
  e: AbhakenEingabe,
  jetzt = new Date().toISOString(),
): Termin | null {
  const t = data.termine.find((x) => x.id === terminId);
  if (!t) return null;
  t.erledigt = true;
  t.updatedAt = jetzt;
  const k = t.kundeId ? data.kunden.find((x) => x.id === t.kundeId) : undefined;
  const text = e.text.trim();
  if (k && text) {
    k.notizen.push(neueNotiz({ text: notizText(t, text), zeitpunkt: jetzt, sparten: t.sparte ? [t.sparte] : [] }));
    k.updatedAt = jetzt;
  }
  if (!e.folgeBeginn || Number.isNaN(new Date(e.folgeBeginn).getTime())) return null;
  const folge = neuerTermin({
    art: 'wiedervorlage',
    titel: (e.folgeTitel || '').trim() || t.titel,
    kundeId: t.kundeId,
    sparte: t.sparte,
    beginn: e.folgeBeginn,
    dauerMin: t.dauerMin,
    ort: t.ort,
  });
  data.termine.push(folge);
  return folge;
}
