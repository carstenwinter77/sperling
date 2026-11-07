// Sperling – Kalender-Logik ohne DOM (in Node testbar): Leihgaben im Kalender, Termine verschieben/ziehen.
import type { Daten } from './model.ts';
import { kundenTitel } from './model.ts';
import { agenda, tagVon, type EreignisArt, type Tag } from './belegung.ts';

export const RASTER_MIN = 15;
export const MIN_DAUER = 15;

export type GeraetEintragArt = EreignisArt | 'ueberfaellig';
export interface GeraetEintrag {
  tag: Tag; art: GeraetEintragArt; geraetId: string; geraet: string; kundeId: string; kunde: string;
  /** Leihvorgang- oder Reservierungs-ID */
  id: string; reservierung: boolean;
}

export const GERAET_EINTRAG_TEXT: Record<GeraetEintragArt, { icon: string; text: string }> = {
  ausgabe: { icon: '↗', text: 'geht raus' },
  rueckgabe: { icon: '↙', text: 'kam zurück' },
  zurueckErwartet: { icon: '↙', text: 'kommt zurück' },
  resvBeginn: { icon: '📌', text: 'Reservierung beginnt' },
  resvEnde: { icon: '📌', text: 'Reservierung endet' },
  ueberfaellig: { icon: '⚠', text: 'überfällig' },
};

/**
 * Leihgaben, Rückgaben und Reservierungen je Tag für den Kalender.
 * Überfällige Leihgaben stehen zusätzlich am heutigen Tag, wenn er im Zeitraum liegt.
 */
export function geraeteEintraege(data: Daten, von: Tag, bis: Tag, heute: Tag = tagVon(new Date())): Map<Tag, GeraetEintrag[]> {
  const geraet = (id: string) => data.geraete.find((g) => g.id === id)?.name || 'Gerät';
  const kunde = (id: string) => { const k = data.kunden.find((x) => x.id === id); return k ? kundenTitel(k) : ''; };
  const out = new Map<Tag, GeraetEintrag[]>();
  const rein = (e: GeraetEintrag) => { const l = out.get(e.tag) || []; l.push(e); out.set(e.tag, l); };
  const { ueberfaellig, tage } = agenda(data, von, bis, heute);
  if (heute >= von && heute <= bis) {
    for (const l of ueberfaellig) rein({ tag: heute, art: 'ueberfaellig', geraetId: l.geraetId, geraet: geraet(l.geraetId), kundeId: l.kundeId, kunde: kunde(l.kundeId), id: l.id, reservierung: false });
  }
  for (const t of tage) {
    for (const e of t.ereignisse) {
      rein({ tag: e.tag, art: e.art, geraetId: e.geraetId, geraet: geraet(e.geraetId), kundeId: e.kundeId, kunde: kunde(e.kundeId), id: e.id, reservierung: e.art === 'resvBeginn' || e.art === 'resvEnde' });
    }
  }
  return out;
}

const runden = (min: number) => Math.round(min / RASTER_MIN) * RASTER_MIN;

/**
 * Neuer Beginn und neue Dauer nach dem Ziehen (15-Minuten-Raster).
 * modus 'schieben': Beginn um deltaMin und deltaTage, Dauer bleibt.
 * modus 'oben': Beginn verschieben, Ende bleibt. modus 'unten': Ende verschieben.
 * Die Dauer ist mindestens MIN_DAUER und höchstens 24 Stunden.
 */
export function gezogen(beginnIso: string, dauerMin: number, modus: 'schieben' | 'oben' | 'unten', deltaMin: number, deltaTage = 0): { beginn: string; dauerMin: number } {
  const b = new Date(beginnIso);
  const d = Math.min(Math.max(Math.round(dauerMin) || 60, MIN_DAUER), 1440);
  const dm = runden(deltaMin);
  if (Number.isNaN(b.getTime())) return { beginn: beginnIso, dauerMin: d };
  if (modus === 'schieben') {
    const n = new Date(b);
    n.setDate(n.getDate() + deltaTage);
    n.setMinutes(n.getMinutes() + dm);
    // auf das Raster setzen
    n.setMinutes(runden(n.getMinutes()), 0, 0);
    return { beginn: n.toISOString(), dauerMin: d };
  }
  if (modus === 'oben') {
    const neuD = Math.min(Math.max(d - dm, MIN_DAUER), 1440);
    const n = new Date(b.getTime() + (d - neuD) * 60000);
    return { beginn: n.toISOString(), dauerMin: neuD };
  }
  return { beginn: b.toISOString(), dauerMin: Math.min(Math.max(d + dm, MIN_DAUER), 1440) };
}

/** Termin auf einen anderen Tag legen, Uhrzeit bleibt (Monatsansicht). */
export function aufTag(beginnIso: string, tag: Tag): string {
  const b = new Date(beginnIso);
  const [y, m, d] = tag.split('-').map(Number);
  if (Number.isNaN(b.getTime()) || !y || !m || !d) return beginnIso;
  const n = new Date(y, m - 1, d, b.getHours(), b.getMinutes(), 0, 0);
  return n.toISOString();
}
