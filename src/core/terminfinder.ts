// Sperling – Terminfinder (ab 0.16.0): Arbeitszeit, feste Zeiten blocken (mit Wiederholung), freie Zeiten,
// Vorschläge „du bist sowieso in der Nähe“ und Überschneidungen. Rein, ohne DOM, in Node testbar.
// Oberfläche: src/ui/terminwahl.ts (Kalender zum Auswählen), src/ui/sperrzeiten.ts (Verwaltung).
// Datenfelder: einstellungen.arbeitszeit und einstellungen.sperrzeiten (ab Schema 13, docs/DATENMODELL.md).
import { type Rec, uid, distanceMeters, isValidCoord } from './util.ts';
import type { Daten, Sparte } from './model.ts';

// model.ts importiert die Normalisierer von hier; deshalb keine Laufzeit-Importe aus model.ts (Kreis).

/** Wochentage 1 = Montag … 7 = Sonntag. */
export const WOCHENTAGE_KURZ = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
export const WIEDERHOLUNG = { einmal: 'Einmalig', woechentlich: 'Jede Woche', zweiwoechentlich: 'Alle 2 Wochen' } as const;
export type Wiederholung = keyof typeof WIEDERHOLUNG;
export const SPERRZEITEN_MAX = 100;
/** Raster für Vorschläge und Auswahl im Kalender. */
export const RASTER = 15;
/** Übliche Dauer eines vereinbarten Termins je Bereich (Minuten); im Kalender änderbar. */
export const TERMIN_DAUER: Record<Sparte, number> = { pv: 90, wp: 90, vorwerk: 60 };
export const DAUER_STUFEN = [30, 45, 60, 90, 120, 180] as const;

const z2 = (n: number) => String(n).padStart(2, '0');
/** 'HH:MM' → Minuten seit Mitternacht oder null. */
export function minuten(hhmm: unknown): number | null {
  if (typeof hhmm !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]); const mi = Number(m[2]);
  if (h > 24 || mi > 59 || (h === 24 && mi > 0)) return null;
  return h * 60 + mi;
}
/** Minuten seit Mitternacht → 'HH:MM'. */
export const hhmm = (min: number) => `${z2(Math.floor(min / 60))}:${z2(min % 60)}`;
const zeitWert = (v: unknown, standard: string) => (minuten(v) !== null ? hhmm(minuten(v)!) : standard);
const tagWert = (v: unknown): string => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T12:00:00`).getTime()) ? v : '');
const tageListe = (v: unknown, standard: number[]): number[] => {
  if (!Array.isArray(v)) return standard;
  return [...new Set(v.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))].sort((a, b) => a - b);
};

/** Kalendertag in Ortszeit (JJJJ-MM-TT). */
export function tagKey(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${z2(x.getMonth() + 1)}-${z2(x.getDate())}`;
}
/** 'JJJJ-MM-TT' → Date (Ortszeit, 00:00). */
export function tagDatum(t: string): Date {
  const [y, m, d] = t.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}
export function tagPlus(t: string, n: number): string {
  const d = tagDatum(t);
  d.setDate(d.getDate() + n);
  return tagKey(d);
}
/** Wochentag 1 (Mo) … 7 (So). */
export const wochentag = (t: string) => ((tagDatum(t).getDay() + 6) % 7) + 1;
/** Zeitpunkt (ISO) an einem Tag um `min` Minuten nach Mitternacht (Ortszeit). */
export function zeitpunkt(t: string, min: number): string {
  const d = tagDatum(t);
  d.setMinutes(min);
  return d.toISOString();
}
/** Minuten seit Mitternacht (Ortszeit) eines Zeitpunkts. */
export function minutenVon(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
const tageZwischen = (a: string, b: string) => Math.round((tagDatum(b).getTime() - tagDatum(a).getTime()) / 86400000);

// ---------- Arbeitszeit ----------

export interface Arbeitszeit { tage: number[]; von: string; bis: string; pufferMin: number }
export const ARBEITSZEIT: Arbeitszeit = { tage: [1, 2, 3, 4, 5], von: '08:00', bis: '18:00', pufferMin: 15 };
export function normalizeArbeitszeit(v: unknown): Arbeitszeit {
  const src: Rec = v && typeof v === 'object' ? v : {};
  let von = zeitWert(src.von, ARBEITSZEIT.von);
  let bis = zeitWert(src.bis, ARBEITSZEIT.bis);
  if (minuten(bis)! <= minuten(von)!) { von = ARBEITSZEIT.von; bis = ARBEITSZEIT.bis; }
  const p = Number(src.pufferMin);
  return {
    tage: tageListe(src.tage, [...ARBEITSZEIT.tage]),
    von, bis,
    pufferMin: Number.isInteger(p) && p >= 0 && p <= 120 ? p : ARBEITSZEIT.pufferMin,
  };
}

// ---------- Feste Zeiten (Sperrzeiten) ----------

export interface Sperrzeit {
  id: string;
  titel: string;
  wiederholung: Wiederholung;
  /** Wochentage bei Wiederholung (1 = Mo … 7 = So) */
  tage: number[];
  /** Einmalig: erster Tag; mit Wiederholung: gilt ab diesem Tag */
  datum: string;
  /** Letzter Tag (einschließlich) oder '' = ohne Ende; einmalig mit `bisDatum` = mehrere Tage (Urlaub) */
  bisDatum: string;
  ganztags: boolean;
  von: string;
  bis: string;
}

export function normalizeSperrzeit(v: unknown): Sperrzeit | null {
  if (!v || typeof v !== 'object') return null;
  const src = v as Rec;
  const wiederholung = (src.wiederholung in WIEDERHOLUNG ? src.wiederholung : 'einmal') as Wiederholung;
  const datum = tagWert(src.datum);
  if (!datum) return null;
  let tage = tageListe(src.tage, []);
  if (!tage.length) tage = [wochentag(datum)];
  let bisDatum = tagWert(src.bisDatum);
  if (bisDatum && bisDatum < datum) bisDatum = '';
  const ganztags = src.ganztags === true;
  let von = zeitWert(src.von, '12:00');
  let bis = zeitWert(src.bis, '13:00');
  if (!ganztags && minuten(bis)! <= minuten(von)!) { if (minuten(von)! >= 23 * 60) von = '23:00'; bis = hhmm(Math.min(24 * 60, minuten(von)! + 60)); }
  return {
    id: typeof src.id === 'string' && src.id ? src.id.slice(0, 100) : uid(),
    titel: typeof src.titel === 'string' && src.titel.trim() ? src.titel.trim().slice(0, 100) : 'Nicht verfügbar',
    wiederholung, tage, datum, bisDatum, ganztags, von, bis,
  };
}
export function normalizeSperrzeiten(v: unknown): Sperrzeit[] {
  return (Array.isArray(v) ? v.map(normalizeSperrzeit).filter((x): x is Sperrzeit => !!x) : []).slice(0, SPERRZEITEN_MAX);
}
export function neueSperrzeit(partial: Rec = {}): Sperrzeit {
  return normalizeSperrzeit({ id: uid(), datum: tagKey(new Date()), ...partial })!;
}

/** Gilt die feste Zeit an diesem Tag? */
export function giltAm(s: Sperrzeit, t: string): boolean {
  if (t < s.datum) return false;
  if (s.bisDatum && t > s.bisDatum) return false;
  if (s.wiederholung === 'einmal') return s.bisDatum ? true : t === s.datum;
  if (!s.tage.includes(wochentag(t))) return false;
  if (s.wiederholung === 'zweiwoechentlich') {
    // Woche des Starttags zählt als erste Woche; dann jede zweite
    const montag = (x: string) => tagPlus(x, 1 - wochentag(x));
    const wochen = Math.round(tageZwischen(montag(s.datum), montag(t)) / 7);
    return wochen % 2 === 0;
  }
  return true;
}

/** Lesbare Beschreibung, z. B. „Jede Woche Mi 14:00–18:00“ oder „03.12.–07.12. ganztägig“. */
export function sperrzeitText(s: Sperrzeit): string {
  const d = (x: string) => { const [, m, t] = x.split('-'); return `${t}.${m}.`; };
  const zeit = s.ganztags ? 'ganztägig' : `${s.von}–${s.bis}`;
  if (s.wiederholung === 'einmal') return `${s.bisDatum && s.bisDatum !== s.datum ? `${d(s.datum)}–${d(s.bisDatum)}` : d(s.datum)} ${zeit}`;
  const tage = s.tage.map((n) => WOCHENTAGE_KURZ[n]).join(', ');
  return `${WIEDERHOLUNG[s.wiederholung]} ${tage} ${zeit}${s.bisDatum ? ` (bis ${d(s.bisDatum)})` : ''}`;
}

// ---------- Belegung eines Tages ----------

export type BelegungArt = 'termin' | 'wiedervorlage' | 'sperre';
export interface Belegt {
  art: BelegungArt;
  vonMin: number;
  bisMin: number;
  titel: string;
  terminId?: string;
  kundeId?: string;
  sperrzeitId?: string;
  erledigt?: boolean;
}
type DatenTeil = Pick<Daten, 'termine' | 'kunden'> & { einstellungen: { arbeitszeit: Arbeitszeit; sperrzeiten: Sperrzeit[] } };

/** Feste Zeiten an einem Tag als Minuten-Spannen. */
export function sperrenAm(liste: readonly Sperrzeit[], t: string): Belegt[] {
  return liste.filter((s) => giltAm(s, t)).map((s) => ({
    art: 'sperre' as const, vonMin: s.ganztags ? 0 : minuten(s.von)!, bisMin: s.ganztags ? 24 * 60 : minuten(s.bis)!, titel: s.titel, sperrzeitId: s.id,
  }));
}

/** Alles, was an einem Tag im Kalender steht: Termine, Wiedervorlagen, feste Zeiten (nach Beginn sortiert). */
export function belegungAm(d: DatenTeil, t: string, ohneTerminId = ''): Belegt[] {
  const out: Belegt[] = [];
  for (const x of d.termine) {
    if (x.id === ohneTerminId || tagKey(x.beginn) !== t) continue;
    const von = minutenVon(x.beginn);
    out.push({ art: x.art, vonMin: von, bisMin: Math.min(24 * 60, von + x.dauerMin), titel: x.titel, terminId: x.id, kundeId: x.kundeId, erledigt: x.erledigt });
  }
  out.push(...sperrenAm(d.einstellungen.sperrzeiten, t));
  return out.sort((a, b) => a.vonMin - b.vonMin || a.bisMin - b.bisMin);
}

/** Blockiert eine Belegung die Zeit? Termine (offen) und feste Zeiten ja; Wiedervorlagen sind nur Erinnerungen. */
const blockiert = (b: Belegt) => b.art === 'sperre' || (b.art === 'termin' && !b.erledigt);

export interface Luecke { vonMin: number; bisMin: number }
/**
 * Freie Zeiten eines Tages innerhalb der Arbeitszeit, mindestens `dauerMin` lang. Um Termine bleibt der Puffer
 * (Fahrt, Überziehen) frei. Heute beginnt die Suche frühestens jetzt (auf das Raster aufgerundet).
 */
export function freieZeitenAm(d: DatenTeil, t: string, dauerMin: number, jetzt = new Date(), ohneTerminId = ''): Luecke[] {
  const az = d.einstellungen.arbeitszeit;
  if (!az.tage.includes(wochentag(t)) || t < tagKey(jetzt)) return [];
  let start = minuten(az.von)!;
  const ende = minuten(az.bis)!;
  if (t === tagKey(jetzt)) start = Math.max(start, Math.ceil((jetzt.getHours() * 60 + jetzt.getMinutes() + 1) / RASTER) * RASTER);
  const belegt = belegungAm(d, t, ohneTerminId).filter(blockiert)
    .map((b) => (b.art === 'termin' ? { von: b.vonMin - az.pufferMin, bis: b.bisMin + az.pufferMin } : { von: b.vonMin, bis: b.bisMin }))
    .sort((a, b) => a.von - b.von);
  const out: Luecke[] = [];
  let pos = start;
  for (const b of belegt) {
    if (b.von > pos) out.push({ vonMin: pos, bisMin: Math.min(b.von, ende) });
    pos = Math.max(pos, b.bis);
    if (pos >= ende) break;
  }
  if (pos < ende) out.push({ vonMin: pos, bisMin: ende });
  return out.filter((l) => l.bisMin - l.vonMin >= dauerMin);
}

/** Passt [von, von+dauer] vollständig in eine freie Zeit? */
export const passt = (luecken: readonly Luecke[], von: number, dauerMin: number) => luecken.some((l) => von >= l.vonMin && von + dauerMin <= l.bisMin);

// ---------- Vorschläge „in der Nähe“ ----------

/** Grobe Fahrzeit aus der Luftlinie: Umwege ×1,3 bei 40 km/h, mindestens 5 Minuten. */
export function fahrMinuten(meter: number): number {
  return Math.max(5, Math.round(((meter / 1000) * 1.3 / 40) * 60));
}

export interface NaheVorschlag {
  beginn: string;
  dauerMin: number;
  /** Bezugstermin, an den sich der Vorschlag anschließt */
  terminId: string;
  lage: 'nach' | 'vor';
  abstandM: number;
  fahrMin: number;
  /** z. B. „nach 9:00–10:30 Müller (Peine)“ */
  grund: string;
}

/**
 * Freie Zeiten direkt vor oder nach Terminen in der Nähe des Kunden (Luftlinie bis `maxKm`), über die
 * nächsten `tage` Tage ab heute. Sortiert nach Abstand, dann nach Datum; höchstens `max` Vorschläge.
 */
export function naheVorschlaege(d: DatenTeil, ziel: { lat: number | null; lng: number | null; kundeId?: string },
  o: { dauerMin: number; jetzt?: Date; tage?: number; maxKm?: number; max?: number; ohneTerminId?: string }): NaheVorschlag[] {
  if (!isValidCoord(ziel.lat, ziel.lng)) return [];
  const jetzt = o.jetzt || new Date();
  const az = d.einstellungen.arbeitszeit;
  const maxM = (o.maxKm ?? 15) * 1000;
  const heute = tagKey(jetzt);
  const out: NaheVorschlag[] = [];
  for (let i = 0; i < (o.tage ?? 14); i++) {
    const t = tagPlus(heute, i);
    const frei = freieZeitenAm(d, t, o.dauerMin, jetzt, o.ohneTerminId);
    if (!frei.length) continue;
    const termine = d.termine.filter((x) => x.art === 'termin' && !x.erledigt && x.id !== o.ohneTerminId && tagKey(x.beginn) === t && x.kundeId && x.kundeId !== ziel.kundeId);
    for (const x of termine) {
      const k = d.kunden.find((y) => y.id === x.kundeId);
      if (!k || !isValidCoord(k.lat, k.lng)) continue;
      const m = distanceMeters(ziel.lat!, ziel.lng!, k.lat!, k.lng!);
      if (m > maxM) continue;
      const fahrt = fahrMinuten(m);
      const von = minutenVon(x.beginn); const bis = von + x.dauerMin;
      const name = [k.nachname || k.firma || k.vorname, k.ort].filter(Boolean);
      const wer = name.length > 1 ? `${name[0]} (${name[1]})` : name[0] || x.titel;
      const nach = Math.ceil((bis + Math.max(az.pufferMin, fahrt)) / RASTER) * RASTER;
      const vor = Math.floor((von - Math.max(az.pufferMin, fahrt) - o.dauerMin) / RASTER) * RASTER;
      const kandidaten: [number, 'nach' | 'vor'][] = [[nach, 'nach'], [vor, 'vor']];
      for (const [start, lage] of kandidaten) {
        if (start < 0 || !passt(frei, start, o.dauerMin)) continue;
        const beginn = zeitpunkt(t, start);
        if (out.some((v) => v.beginn === beginn)) continue;
        out.push({ beginn, dauerMin: o.dauerMin, terminId: x.id, lage, abstandM: Math.round(m), fahrMin: fahrt, grund: `${lage} ${hhmm(von)}–${hhmm(bis)} ${wer}` });
      }
    }
  }
  return out.sort((a, b) => a.abstandM - b.abstandM || (a.beginn < b.beginn ? -1 : 1)).slice(0, o.max ?? 5)
    .sort((a, b) => (a.beginn < b.beginn ? -1 : 1));
}

// ---------- Überschneidungen ----------

export interface Konflikt { art: BelegungArt | 'ausserhalb'; titel: string; vonMin: number; bisMin: number }
/** Was sich mit einem geplanten Termin überschneidet (offene Termine, feste Zeiten) und ob er außerhalb der Arbeitszeit liegt. */
export function ueberschneidungen(d: DatenTeil, beginn: string, dauerMin: number, ohneTerminId = ''): Konflikt[] {
  const t = tagKey(beginn);
  const von = minutenVon(beginn); const bis = von + dauerMin;
  const out: Konflikt[] = belegungAm(d, t, ohneTerminId).filter((b) => blockiert(b) && b.vonMin < bis && b.bisMin > von)
    .map((b) => ({ art: b.art, titel: b.titel, vonMin: b.vonMin, bisMin: b.bisMin }));
  const az = d.einstellungen.arbeitszeit;
  if (!az.tage.includes(wochentag(t)) || von < minuten(az.von)! || bis > minuten(az.bis)!) out.push({ art: 'ausserhalb', titel: 'außerhalb deiner Arbeitszeit', vonMin: minuten(az.von)!, bisMin: minuten(az.bis)! });
  return out;
}
/** Kurzer Warnsatz zu den Überschneidungen oder ''. */
export function konfliktText(k: readonly Konflikt[]): string {
  if (!k.length) return '';
  return `Achtung: ${k.map((x) => (x.art === 'ausserhalb' ? x.titel : `überschneidet sich mit ${hhmm(x.vonMin)}–${hhmm(x.bisMin)} ${x.titel}`)).join('; ')}.`;
}
