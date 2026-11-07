// Sperling – Kundenfotos (rein, ohne DOM): Beschreibung je Foto im Kunden, die Bilder selbst liegen
// verschlüsselt in einer eigenen IndexedDB-Tabelle (src/storage/fotos.ts). Hier: Normalisieren,
// Zählen, Größe, Fotos ab einem Alter finden, welche Bilddaten noch gebraucht werden.
import { uid, nowIso, isValidDate, type Rec } from './util.ts';

export const FOTO_SPARTEN = { pv: 'Photovoltaik', wp: 'Wärmepumpe', vorwerk: 'Vorwerk' } as const;
export type FotoSparte = keyof typeof FOTO_SPARTEN;
/** Obergrenze je Kunde (Schutz vor vollem Speicher, großzügig für Beratungen mit vielen Bildern). */
export const MAX_FOTOS_JE_KUNDE = 200;

export function normalizeKundenFoto(f: unknown) {
  const src: Rec = f && typeof f === 'object' ? f : {};
  if (typeof src.id !== 'string' || !src.id) return null;
  const zahl = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
  return {
    id: src.id.slice(0, 80),
    sparte: (src.sparte in FOTO_SPARTEN ? src.sparte : 'pv') as FotoSparte,
    zeitpunkt: isValidDate(src.zeitpunkt) ? new Date(src.zeitpunkt).toISOString() : nowIso(),
    notiz: typeof src.notiz === 'string' ? src.notiz.slice(0, 500) : '',
    /** Größe des verkleinerten Bildes in Bytes (für die Speicheranzeige) */
    bytes: zahl(src.bytes),
    breite: zahl(src.breite),
    hoehe: zahl(src.hoehe),
  };
}
export type KundenFoto = NonNullable<ReturnType<typeof normalizeKundenFoto>>;

export function normalizeFotoListe(v: unknown): KundenFoto[] {
  if (!Array.isArray(v)) return [];
  const gesehen = new Set<string>();
  return v.map(normalizeKundenFoto).filter((f): f is KundenFoto => !!f && !gesehen.has(f.id) && !!gesehen.add(f.id)).slice(0, MAX_FOTOS_JE_KUNDE);
}

export const neueFotoId = () => `f-${uid()}`;

interface MitFotos { kunden: { id: string; fotos?: KundenFoto[] }[]; papierkorb?: { typ: string; objekt: unknown }[] }

/** Alle Foto-IDs, deren Bilddaten noch gebraucht werden (auch von Kunden im Papierkorb). */
export function benutzteFotoIds(data: MitFotos): Set<string> {
  const ids = new Set<string>();
  for (const k of data.kunden) for (const f of k.fotos || []) ids.add(f.id);
  for (const e of data.papierkorb || []) {
    if (e.typ !== 'kunde') continue;
    for (const f of normalizeFotoListe((e.objekt as Rec)?.fotos)) ids.add(f.id);
  }
  return ids;
}

/** Anzahl und Größe aller Fotos (ohne Papierkorb). */
export function fotoStatistik(data: MitFotos): { anzahl: number; bytes: number; kunden: number } {
  let anzahl = 0; let bytes = 0; let kunden = 0;
  for (const k of data.kunden) {
    const n = k.fotos?.length || 0;
    if (n) kunden++;
    anzahl += n;
    for (const f of k.fotos || []) bytes += f.bytes;
  }
  return { anzahl, bytes, kunden };
}

/** Fotos, die vor mehr als `tage` Tagen aufgenommen wurden. */
export function fotosAelterAls(data: MitFotos, tage: number, jetzt = new Date()): { kundeId: string; fotoId: string; bytes: number }[] {
  const grenze = new Date(jetzt.getTime() - tage * 86400000).toISOString();
  const out: { kundeId: string; fotoId: string; bytes: number }[] = [];
  for (const k of data.kunden) for (const f of k.fotos || []) if (f.zeitpunkt < grenze) out.push({ kundeId: k.id, fotoId: f.id, bytes: f.bytes });
  return out;
}

/** „1,4 MB“ */
export function groesseText(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(0, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1).replace('.', ',') : Math.round(mb)} MB`;
}
