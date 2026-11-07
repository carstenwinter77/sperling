// Sperling – Belegungsplan der Vorführgeräte (rein, ohne DOM, in Node testbar).
// Tage werden als 'YYYY-MM-DD' in Ortszeit geführt; Zeiträume sind inklusive.
import type { Daten, Geraet, Leihvorgang, Reservierung } from './model.ts';

export type Tag = string;

const z2 = (n: number) => String(n).padStart(2, '0');
/** Datum/ISO-String -> 'YYYY-MM-DD' (Ortszeit). */
export function tagVon(d: Date | string): Tag {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${z2(x.getMonth() + 1)}-${z2(x.getDate())}`;
}
/** 'YYYY-MM-DD' -> Date (Ortszeit, 00:00). */
export function tagDatum(t: Tag): Date {
  const [y, m, d] = t.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}
export function plusTage(t: Tag, n: number): Tag {
  const d = tagDatum(t);
  d.setDate(d.getDate() + n);
  return tagVon(d);
}
/** Anzahl Tage von a bis b (b - a). */
export function tageZwischen(a: Tag, b: Tag): number {
  return Math.round((tagDatum(b).getTime() - tagDatum(a).getTime()) / 86400000);
}
/** Montag der Woche. */
export function wochenanfang(t: Tag): Tag {
  return plusTage(t, -((tagDatum(t).getDay() + 6) % 7));
}
/** ISO-Kalenderwoche. */
export function kalenderwoche(t: Tag): number {
  const d = tagDatum(t);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // Donnerstag dieser Woche
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

export type BalkenArt = 'verliehen' | 'ueberfaellig' | 'reserviert' | 'frueher';
export interface Balken {
  art: BalkenArt;
  von: Tag;
  /** letzter belegter Tag; null = offen nach rechts (Verleih ohne Rückgabedatum) */
  bis: Tag | null;
  kundeId: string;
  geraetId: string;
  verleih?: Leihvorgang;
  reservierung?: Reservierung;
}

/** Alle Belegungen eines Geräts als Balken (Verleihe und Reservierungen). */
export function balkenFuer(data: Daten, geraetId: string, heute: Tag = tagVon(new Date())): Balken[] {
  const out: Balken[] = [];
  for (const l of data.leihvorgaenge) {
    if (l.geraetId !== geraetId) continue;
    const von = tagVon(l.ausgabe);
    if (l.rueckgabe) {
      out.push({ art: 'frueher', von, bis: tagVon(l.rueckgabe), kundeId: l.kundeId, geraetId, verleih: l });
    } else if (l.rueckgabeGeplant && tagVon(l.rueckgabeGeplant) < heute) {
      // überfällig: belegt bis heute, und solange es nicht zurück ist, auch danach
      out.push({ art: 'ueberfaellig', von, bis: null, kundeId: l.kundeId, geraetId, verleih: l });
    } else {
      out.push({ art: 'verliehen', von, bis: l.rueckgabeGeplant ? tagVon(l.rueckgabeGeplant) : null, kundeId: l.kundeId, geraetId, verleih: l });
    }
  }
  for (const r of data.reservierungen) {
    if (r.geraetId !== geraetId) continue;
    out.push({ art: 'reserviert', von: tagVon(r.von), bis: tagVon(r.bis), kundeId: r.kundeId, geraetId, reservierung: r });
  }
  return out.sort((a, b) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0));
}

/** Überschneidet der Balken den Zeitraum [von, bis]? */
export function imZeitraum(b: Balken, von: Tag, bis: Tag): boolean {
  return b.von <= bis && (b.bis === null || b.bis >= von);
}

/** Ist der Tag durch einen der Balken belegt (frühere Verleihe zählen nicht)? */
export function istBelegt(balken: Balken[], tag: Tag): boolean {
  return balken.some((b) => b.art !== 'frueher' && imZeitraum(b, tag, tag));
}

/** Zeitraum ab `von` höchstens bis vor den ersten belegten Tag kürzen. null, wenn `von` selbst belegt ist. */
export function begrenzen(von: Tag, bis: Tag, belegt: (t: Tag) => boolean): Tag | null {
  if (belegt(von)) return null;
  let t = von;
  while (t < bis) {
    const n = plusTage(t, 1);
    if (belegt(n)) return t;
    t = n;
  }
  return bis;
}

/** Erster freier Tag ab `ab` (höchstens ein Jahr weit gesucht), sonst null. */
export function ersterFreierTag(ab: Tag, belegt: (t: Tag) => boolean): Tag | null {
  let t = ab;
  for (let i = 0; i < 366; i++) { if (!belegt(t)) return t; t = plusTage(t, 1); }
  return null;
}

/** Aktive Geräte, die im ganzen Zeitraum frei sind (kein Verleih, keine Reservierung). */
export function freieGeraete(data: Daten, von: Tag, bis: Tag, heute: Tag = tagVon(new Date())): Geraet[] {
  return data.geraete.filter((g) => g.aktiv && !balkenFuer(data, g.id, heute).some((b) => b.art !== 'frueher' && imZeitraum(b, von, bis)));
}

export type EreignisArt = 'ausgabe' | 'rueckgabe' | 'zurueckErwartet' | 'resvBeginn' | 'resvEnde';
export interface Ereignis { tag: Tag; art: EreignisArt; geraetId: string; kundeId: string; id: string }

/**
 * Liste nach Tagen: was geht raus, was kommt zurück, welche Reservierung beginnt/endet.
 * `ueberfaellig` enthält offene Verleihe mit Rückgabedatum vor heute (stehen oben).
 */
export function agenda(data: Daten, von: Tag, bis: Tag, heute: Tag = tagVon(new Date())): { ueberfaellig: Leihvorgang[]; tage: { tag: Tag; ereignisse: Ereignis[] }[] } {
  const ev: Ereignis[] = [];
  const rein = (tag: Tag) => tag >= von && tag <= bis;
  for (const l of data.leihvorgaenge) {
    const a = tagVon(l.ausgabe);
    if (rein(a)) ev.push({ tag: a, art: 'ausgabe', geraetId: l.geraetId, kundeId: l.kundeId, id: l.id });
    if (l.rueckgabe) {
      const r = tagVon(l.rueckgabe);
      if (rein(r)) ev.push({ tag: r, art: 'rueckgabe', geraetId: l.geraetId, kundeId: l.kundeId, id: l.id });
    } else if (l.rueckgabeGeplant) {
      const r = tagVon(l.rueckgabeGeplant);
      if (r >= heute && rein(r)) ev.push({ tag: r, art: 'zurueckErwartet', geraetId: l.geraetId, kundeId: l.kundeId, id: l.id });
    }
  }
  for (const r of data.reservierungen) {
    const a = tagVon(r.von); const e = tagVon(r.bis);
    if (rein(a)) ev.push({ tag: a, art: 'resvBeginn', geraetId: r.geraetId, kundeId: r.kundeId, id: r.id });
    if (e !== a && rein(e)) ev.push({ tag: e, art: 'resvEnde', geraetId: r.geraetId, kundeId: r.kundeId, id: r.id });
  }
  const reihenfolge: EreignisArt[] = ['ausgabe', 'resvBeginn', 'zurueckErwartet', 'rueckgabe', 'resvEnde'];
  ev.sort((x, y) => (x.tag < y.tag ? -1 : x.tag > y.tag ? 1 : reihenfolge.indexOf(x.art) - reihenfolge.indexOf(y.art)));
  const tage: { tag: Tag; ereignisse: Ereignis[] }[] = [];
  for (const e of ev) {
    const letzter = tage[tage.length - 1];
    if (letzter && letzter.tag === e.tag) letzter.ereignisse.push(e); else tage.push({ tag: e.tag, ereignisse: [e] });
  }
  const ueberfaellig = data.leihvorgaenge
    .filter((l) => !l.rueckgabe && l.rueckgabeGeplant && tagVon(l.rueckgabeGeplant) < heute)
    .sort((a, b) => ((a.rueckgabeGeplant || '') < (b.rueckgabeGeplant || '') ? -1 : 1));
  return { ueberfaellig, tage };
}
