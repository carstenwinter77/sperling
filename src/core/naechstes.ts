// Sperling – „Als Nächstes“ auf der Übersicht: der eine Termin, um den es jetzt geht.
// Rein, ohne DOM, in Node testbar.
import type { Termin } from './model.ts';

export interface Naechstes { termin: Termin; lage: 'laeuft' | 'gleich' | 'heute' | 'ueberfaellig' | 'faellig' }

/**
 * Reihenfolge: (1) ein Termin, der gerade läuft oder heute noch beginnt (der früheste),
 * (2) sonst die älteste überfällige oder heute fällige Wiedervorlage/Termin. Sonst null.
 * „gleich“ = beginnt in höchstens 60 Minuten.
 */
export function alsNaechstes(termine: Termin[], jetzt = new Date()): Naechstes | null {
  const offen = termine.filter((t) => !t.erledigt).sort((a, b) => (a.beginn < b.beginn ? -1 : a.beginn > b.beginn ? 1 : 0));
  const tagesende = new Date(jetzt); tagesende.setHours(23, 59, 59, 999);
  const tagesanfang = new Date(jetzt); tagesanfang.setHours(0, 0, 0, 0);
  const jetztMs = jetzt.getTime();
  const termin = offen.find((t) => {
    if (t.art !== 'termin') return false;
    const b = new Date(t.beginn).getTime();
    const ende = b + (t.dauerMin || 0) * 60000;
    return ende >= jetztMs && b <= tagesende.getTime();
  });
  if (termin) {
    const b = new Date(termin.beginn).getTime();
    return { termin, lage: b <= jetztMs ? 'laeuft' : b - jetztMs <= 3600000 ? 'gleich' : 'heute' };
  }
  const faellig = offen.find((t) => new Date(t.beginn).getTime() <= tagesende.getTime());
  if (!faellig) return null;
  return { termin: faellig, lage: new Date(faellig.beginn).getTime() < tagesanfang.getTime() ? 'ueberfaellig' : 'faellig' };
}

/** Kurzer Zeittext für die Karte, z. B. „in 25 Min.“, „seit 10:00“, „überfällig seit 3 Tagen“. */
export function zeitText(n: Naechstes, jetzt = new Date()): string {
  const b = new Date(n.termin.beginn);
  const uhr = b.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const min = Math.round((b.getTime() - jetzt.getTime()) / 60000);
  switch (n.lage) {
    case 'laeuft': return `läuft seit ${uhr} Uhr`;
    case 'gleich': return min <= 1 ? 'jetzt' : `in ${min} Min. (${uhr} Uhr)`;
    case 'heute': return `heute um ${uhr} Uhr`;
    case 'faellig': return 'heute fällig';
    default: {
      const a = new Date(b); a.setHours(0, 0, 0, 0);
      const h = new Date(jetzt); h.setHours(0, 0, 0, 0);
      const tage = Math.round((h.getTime() - a.getTime()) / 86400000);
      return tage === 1 ? 'seit gestern fällig' : `überfällig seit ${tage} Tagen`;
    }
  }
}
