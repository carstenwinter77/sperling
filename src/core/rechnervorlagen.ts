// Vorlagen für den Rechner „Wann rechnet sich das?“: Startwerte je Kundentyp (Privat, Gewerbe, eigene).
// Gespeichert verschlüsselt in einstellungen.rechnerVorlagen (ab 0.13.10, ohne Schemawechsel ergänzt). DOM-frei und testbar.
import { PV_STANDARD, WP_STANDARD, PV_FELDER, WP_FELDER, type PvAnnahmen, type WpAnnahmen, type Feld, type Rechner } from './amortisation.ts';

export interface RechnerVorlage { id: string; name: string; pv: PvAnnahmen; wp: WpAnnahmen }

export const VORLAGE_PRIVAT = 'privat';
export const VORLAGE_GEWERBE = 'gewerbe';
export const VORLAGEN_MAX = 12;
export const VORLAGE_NAME_MAX = 40;

/** Gewerbe: netto, größere Anlage, niedrigerer Arbeitspreis, mehr Eigenverbrauch (Arbeit am Tag). */
export const GEWERBE_PV: PvAnnahmen = {
  investition: 39000, leistung: 30, ertrag: 900, eigenverbrauch: 50, strompreis: 25, verguetung: 7,
  steigerung: 2, betrieb: 400, zuschuss: 0, jahre: 25,
};
/** Gewerbe-Wärmepumpe: netto, größerer Bedarf. Zuschuss 0 %, weil Firmen über andere Programme gefördert werden. */
export const GEWERBE_WP: WpAnnahmen = {
  investition: 60000, foerderung: 0, sowieso: 0, waermebedarf: 60000, brennstoffpreis: 9, wirkungsgrad: 90,
  jaz: 3.3, wpstrompreis: 22, steigerungFossil: 4, steigerungStrom: 2, wartungAlt: 500, wartungWp: 350, jahre: 20,
};

export const WERKS_VORLAGEN: readonly RechnerVorlage[] = Object.freeze([
  { id: VORLAGE_PRIVAT, name: 'Privat (Einfamilienhaus)', pv: { ...PV_STANDARD }, wp: { ...WP_STANDARD } },
  { id: VORLAGE_GEWERBE, name: 'Gewerbe (netto)', pv: { ...GEWERBE_PV }, wp: { ...GEWERBE_WP } },
]);

/** Kurzer Hinweis, der im Rechner unter der Vorlage steht. */
export const VORLAGE_HINWEIS: Record<string, string> = {
  [VORLAGE_GEWERBE]: 'Netto-Werte. Förderung für Firmen läuft über andere Programme, den Zuschuss bitte selbst eintragen. Steuerliche Vorteile wie die Abschreibung sind nicht eingerechnet.',
};

export const istWerksvorlage = (id: string) => WERKS_VORLAGEN.some((v) => v.id === id);
export const werksVorlage = (id: string) => WERKS_VORLAGEN.find((v) => v.id === id);
export const felderFuer = (art: Rechner): Feld[] => (art === 'pv' ? PV_FELDER : WP_FELDER);

/** Werte einer Sparte: nur bekannte Felder, Zahlen in den Feldgrenzen, Fehlendes aus `std`. */
export function vorlagenWerte<T extends PvAnnahmen | WpAnnahmen>(src: unknown, felder: Feld[], std: T): T {
  const s = src && typeof src === 'object' ? src as Record<string, unknown> : {};
  const out = { ...std } as Record<string, number>;
  for (const f of felder) {
    const n = typeof s[f.key] === 'number' ? s[f.key] as number : NaN;
    if (Number.isFinite(n)) out[f.key] = Math.min(f.max, Math.max(f.min, n));
  }
  return out as T;
}

const nameLesen = (n: unknown, ersatz: string) => (typeof n === 'string' && n.trim() ? n.trim().slice(0, VORLAGE_NAME_MAX) : ersatz);

/** Immer zuerst Privat und Gewerbe (änderbar, nicht löschbar), dann eigene Vorlagen (höchstens VORLAGEN_MAX insgesamt). */
export function normalizeRechnerVorlagen(src: unknown): RechnerVorlage[] {
  const liste = Array.isArray(src) ? src.filter((x) => x && typeof x === 'object') as Record<string, unknown>[] : [];
  const werk = WERKS_VORLAGEN.map((w) => {
    const v = liste.find((x) => x.id === w.id);
    return { id: w.id, name: nameLesen(v?.name, w.name), pv: vorlagenWerte(v?.pv, PV_FELDER, w.pv), wp: vorlagenWerte(v?.wp, WP_FELDER, w.wp) };
  });
  const ids = new Set(werk.map((v) => v.id));
  const eigene: RechnerVorlage[] = [];
  for (const v of liste) {
    const id = typeof v.id === 'string' && /^[\w-]{1,40}$/.test(v.id) ? v.id : '';
    if (!id || ids.has(id) || werk.length + eigene.length >= VORLAGEN_MAX) continue;
    ids.add(id);
    eigene.push({ id, name: nameLesen(v.name, 'Eigene Vorlage'), pv: vorlagenWerte(v.pv, PV_FELDER, PV_STANDARD), wp: vorlagenWerte(v.wp, WP_FELDER, WP_STANDARD) });
  }
  return [...werk, ...eigene];
}

/** Vorlage, mit der der Rechner für einen Kunden startet: mit Firma „Gewerbe“, sonst „Privat“. */
export const vorlageFuerKunde = (k: { firma?: unknown } | null | undefined) => (typeof k?.firma === 'string' && k.firma.trim() ? VORLAGE_GEWERBE : VORLAGE_PRIVAT);

/** Weicht eine Werksvorlage von der Auslieferung ab? (für „angepasst“ und „Auf Werkseinstellung“) */
export function angepasst(v: RechnerVorlage): boolean {
  const w = werksVorlage(v.id);
  if (!w) return false;
  return w.name !== v.name || JSON.stringify(w.pv) !== JSON.stringify(v.pv) || JSON.stringify(w.wp) !== JSON.stringify(v.wp);
}

export const neueVorlagenId = () => `v-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
