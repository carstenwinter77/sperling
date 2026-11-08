// Sperling – Kunden auswählen (Reservieren, Verleihen, Termine): Suche statt endloser Liste.
// Rein, ohne DOM, in Node testbar. Gleichnamige Kunden werden über Adresse/Telefon unterschieden.
import { kundenTitel, kundenVergleich, adresseEinzeilig, type Daten, type Kunde } from './model.ts';
import { suchText } from './util.ts';

export interface KundenTreffer { id: string; titel: string; zusatz: string; doppelt: boolean }

const zusatz = (k: Kunde) => [adresseEinzeilig(k), k.telefon].filter(Boolean).join(' · ');

/** Zuletzt benutzte Kunden: „zuletzt geöffnet“, dann jüngste Termine/Verleihe/Reservierungen. */
export function zuletztKunden(data: Daten, max = 6): string[] {
  const ids: string[] = [];
  const dazu = (id: string | undefined | null) => { if (id && !ids.includes(id) && data.kunden.some((k) => k.id === id)) ids.push(id); };
  for (const z of data.einstellungen.zuletzt || []) if (z.art === 'kunde') dazu(z.id);
  const neueste = [
    ...data.termine.map((t) => ({ id: t.kundeId, t: t.updatedAt || t.beginn })),
    ...data.leihvorgaenge.map((l) => ({ id: l.kundeId, t: l.ausgabe })),
    ...(data.reservierungen || []).map((r) => ({ id: r.kundeId, t: r.von })),
  ].filter((x) => x.id).sort((a, b) => (a.t < b.t ? 1 : -1));
  for (const x of neueste) dazu(x.id);
  return ids.slice(0, max);
}

/**
 * Treffer für die Eingabe: alle Wörter müssen in Name, Firma, Adresse oder Telefon vorkommen.
 * Leere Eingabe: zuletzt benutzte Kunden. Namensanfang zählt mehr als ein Treffer irgendwo.
 */
export function kundenSuchen(data: Daten, eingabe: string, max = 8): KundenTreffer[] {
  const woerter = suchText(eingabe).split(/\s+/).filter(Boolean);
  const ziffern = eingabe.replace(/\D/g, '');
  let liste: Kunde[];
  if (!woerter.length) {
    liste = zuletztKunden(data, max).map((id) => data.kunden.find((k) => k.id === id)!).filter(Boolean);
  } else {
    const bewertet = data.kunden.map((k) => {
      const name = suchText(kundenTitel(k));
      const text = suchText([kundenTitel(k), k.firma, k.strasse, k.plz, k.ort].join(' '));
      const tel = (k.telefon || '').replace(/\D/g, '');
      if (!woerter.every((w) => text.includes(w) || (ziffern.length >= 3 && tel.includes(ziffern)))) return null;
      const p = woerter.reduce((s, w) => s + (name.startsWith(w) || name.includes(` ${w}`) ? 3 : name.includes(w) ? 2 : 1), 0);
      return { k, p };
    }).filter((x): x is { k: Kunde; p: number } => !!x);
    liste = bewertet.sort((a, b) => b.p - a.p || kundenVergleich(a.k, b.k)).slice(0, max).map((x) => x.k);
  }
  const namen = new Map<string, number>();
  for (const k of data.kunden) { const n = suchText(kundenTitel(k)); namen.set(n, (namen.get(n) || 0) + 1); }
  return liste.map((k) => ({ id: k.id, titel: kundenTitel(k), zusatz: zusatz(k), doppelt: (namen.get(suchText(kundenTitel(k))) || 0) > 1 }));
}

/** Anzeige eines gewählten Kunden (Titel + Zusatz) oder null. */
export function kundeAnzeige(data: Daten, id: string): KundenTreffer | null {
  const k = data.kunden.find((x) => x.id === id);
  return k ? { id: k.id, titel: kundenTitel(k), zusatz: zusatz(k), doppelt: false } : null;
}
