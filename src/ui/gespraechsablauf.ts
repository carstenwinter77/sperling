// Sperling – laufendes Gespräch: Entwurf im Arbeitsspeicher und gemeinsames Speichern.
// Der Entwurf (Notizen, angetippte Einwände) lebt nur im Arbeitsspeicher, nie im Browser-Speicher
// (R-KRYPTO), und wird beim Sperren verworfen. So bleibt er erhalten, wenn man zwischen Notizen,
// Leitfaden und anderen Seiten wechselt.
// Gespeichert wird je Gruppe (Enpal = PV/WP, Vorwerk) eine eigene Notiz (R-TEXT).
import { nowIso } from '../core/util.ts';
import {
  SPARTEN, STATUS, AUSGANG, KONTAKTART, kundenName, kundenTitel, adresseEinzeilig,
  neueNotiz, neuerTermin, normalizeGespraech, normalizeEnpalKontakt, type Sparte, type StatusKey, type Daten,
} from '../core/model.ts';
import { LEITFADEN, gespraechsNotiz } from '../core/einwaende.ts';
import * as store from '../storage/store.ts';

export type Gruppe = 'enpal' | 'vorwerk';
export const gruppeVon = (s: Sparte): Gruppe => (s === 'vorwerk' ? 'vorwerk' : 'enpal');
export type Verlauf = Record<Sparte, Record<string, string>>;

export interface Entwurf {
  kundeId: string;
  start: string;
  kontaktart: keyof typeof KONTAKTART;
  erreicht: boolean;
  /** Worüber gesprochen wird */
  sparten: Sparte[];
  notiz: Record<Gruppe, string>;
  /** Einwände aus dem Leitfaden: Sparte -> Einwand-ID -> Ergebnis */
  verlauf: Verlauf;
  leitfadenSparte: Sparte;
}

export interface Abschluss {
  sparte: Sparte;
  ausgang: keyof typeof AUSGANG | '';
  status: StatusKey | '';
  schritt: string;
  /** Wiedervorlage/Termin (ISO) oder null */
  wv: string | null;
}

const entwuerfe = new Map<string, Entwurf>();
store.subscribe((d) => { if (!d) entwuerfe.clear(); });

export const leererVerlauf = (): Verlauf => ({ pv: {}, wp: {}, vorwerk: {} });

/** Sparten, über die vermutlich gesprochen wird: alle mit Interesse, sonst alle. */
function vermuteteSparten(kundeId: string): Sparte[] {
  const k = store.findKunde(kundeId);
  if (!k) return ['pv'];
  const mit = (Object.keys(SPARTEN) as Sparte[]).filter((s) => !['unbekannt', 'kein_interesse'].includes(k.status[s]));
  return mit.length ? mit : (Object.keys(SPARTEN) as Sparte[]);
}

export function entwurf(kundeId: string): Entwurf | null { return entwuerfe.get(kundeId) ?? null; }
export function alleEntwuerfe(): Entwurf[] { return [...entwuerfe.values()].filter((e) => store.findKunde(e.kundeId)); }

/** Laufendes Gespräch holen oder neu beginnen. */
export function beginnen(kundeId: string, vorgabe: Partial<Entwurf> = {}): Entwurf {
  let e = entwuerfe.get(kundeId);
  if (!e) {
    const sparten = vorgabe.sparten?.length ? vorgabe.sparten : vermuteteSparten(kundeId);
    e = {
      kundeId, start: nowIso(), kontaktart: 'telefon', erreicht: true, sparten,
      notiz: { enpal: '', vorwerk: '' }, verlauf: leererVerlauf(), leitfadenSparte: sparten[0] || 'pv', ...vorgabe,
    };
    entwuerfe.set(kundeId, e);
  } else if (vorgabe.verlauf) {
    // aus dem Leitfaden kommend: Einwände übernehmen
    for (const s of Object.keys(vorgabe.verlauf) as Sparte[]) Object.assign(e.verlauf[s], vorgabe.verlauf[s]);
    for (const s of vorgabe.sparten || []) if (!e.sparten.includes(s)) e.sparten.push(s);
  }
  return e;
}

export function verwerfen(kundeId: string) { entwuerfe.delete(kundeId); }

export const hatEinwaende = (v: Verlauf, s: Sparte) => Object.keys(v[s]).length > 0;

/** Ist im Entwurf schon etwas festgehalten? */
export function hatInhalt(e: Entwurf): boolean {
  return !!(e.notiz.enpal.trim() || e.notiz.vorwerk.trim() || (Object.keys(e.verlauf) as Sparte[]).some((s) => hatEinwaende(e.verlauf, s)));
}

/**
 * Gespräch beim Kunden speichern (eine Änderung, ein Zeitstempel):
 * - je Sparte mit Ergebnis oder Einwänden ein Eintrag unter „Gespräche“, Status und Wiedervorlage
 * - je Gruppe eine Notiz (Freitext + Einwände + Ergebnis), nur mit Sparten dieser Gruppe (R-TEXT)
 * - bei PV/WP ein Eintrag in der Enpal-Gesprächsdokumentation
 * Gibt die gespeicherten Sparten zurück.
 */
export function speichern(data: Daten, e: Entwurf, abschluesse: Abschluss[], jetzt = nowIso()): Sparte[] {
  const k = data.kunden.find((x) => x.id === e.kundeId);
  if (!k) throw new Error('Kunde nicht gefunden.');
  const gespeichert: Sparte[] = [];
  const notizTeile: Record<Gruppe, string[]> = { enpal: [], vorwerk: [] };
  const notizSparten: Record<Gruppe, Set<Sparte>> = { enpal: new Set(), vorwerk: new Set() };
  for (const g of ['enpal', 'vorwerk'] as Gruppe[]) {
    if (e.notiz[g].trim()) {
      notizTeile[g].push(e.notiz[g].trim());
      for (const s of e.sparten) if (gruppeVon(s) === g) notizSparten[g].add(s);
    }
  }
  for (const a of abschluesse) {
    const s = a.sparte;
    const g = gruppeVon(s);
    const einwaende = LEITFADEN[s].einwaende.filter((x) => e.verlauf[s][x.id]).map((x) => ({ id: x.id, text: x.kunde, ergebnis: e.verlauf[s][x.id] }));
    if (a.ausgang || einwaende.length) {
      k.gespraeche.push(normalizeGespraech({ zeitpunkt: jetzt, sparte: s, einwaende, ausgang: a.ausgang, naechsterSchritt: a.schritt, notiz: e.notiz[g].trim() }));
      gespeichert.push(s);
      const zeilen = [gespraechsNotiz(s, e.verlauf[s]), a.ausgang ? `Ergebnis ${SPARTEN[s].label}: ${AUSGANG[a.ausgang]}` : '', a.schritt ? `Nächster Schritt: ${a.schritt}` : ''].filter(Boolean);
      if (zeilen.length) { notizTeile[g].push(zeilen.join('\n')); notizSparten[g].add(s); }
    }
    if (a.status && a.status in STATUS) k.status[s] = a.status;
    if (a.wv) {
      data.termine.push(neuerTermin({
        kundeId: k.id, sparte: s, art: a.ausgang === 'termin' ? 'termin' : 'wiedervorlage', beginn: a.wv, dauerMin: a.ausgang === 'termin' ? 60 : 15,
        titel: `${SPARTEN[s].label}: ${a.schritt || (a.ausgang ? AUSGANG[a.ausgang] : 'Wiedervorlage')} – ${kundenTitel(k)}`, ort: adresseEinzeilig(k), notiz: e.notiz[g].trim().slice(0, 5000),
      }));
    }
  }
  const art = KONTAKTART[e.kontaktart] || KONTAKTART.telefon;
  for (const g of ['enpal', 'vorwerk'] as Gruppe[]) {
    if (!notizTeile[g].length) continue;
    const kopf = `${art}${e.erreicht ? '' : ' (nicht erreicht)'}`;
    k.notizen.push(neueNotiz({ text: [kopf, ...notizTeile[g]].join('\n\n'), sparten: [...notizSparten[g]], zeitpunkt: jetzt }));
  }
  // Enpal-Dokumentation: ein Eintrag für PV und WP zusammen
  const enpal = abschluesse.filter((a) => gruppeVon(a.sparte) === 'enpal' && (a.ausgang || hatEinwaende(e.verlauf, a.sparte)));
  const enpalThemen = [...new Set([...enpal.map((a) => a.sparte), ...(e.notiz.enpal.trim() ? e.sparten.filter((s) => s !== 'vorwerk') : [])])];
  if (enpalThemen.length) {
    const fristen = enpal.map((a) => a.wv).filter(Boolean).sort() as string[];
    k.enpalKontakte.push(normalizeEnpalKontakt({
      zeitpunkt: jetzt, art: e.kontaktart, erreicht: e.erreicht, gespraechspartner: kundenName(k), themen: enpalThemen,
      ergebnis: enpal.find((a) => a.ausgang)?.ausgang || '',
      naechsterSchritt: enpal.map((a) => a.schritt).filter(Boolean).join(' / '),
      frist: fristen[0] || null,
      notiz: [e.notiz.enpal.trim(), ...enpal.map((a) => [a.ausgang ? `${SPARTEN[a.sparte].label}: ${AUSGANG[a.ausgang]}` : '', gespraechsNotiz(a.sparte, e.verlauf[a.sparte])].filter(Boolean).join('\n'))].filter(Boolean).join('\n\n'),
    }));
  }
  k.updatedAt = jetzt;
  return gespeichert;
}

/** Bequem: speichern über den Store und Entwurf verwerfen. */
export function abschliessen(e: Entwurf, abschluesse: Abschluss[]): Sparte[] {
  let sparten: Sparte[] = [];
  store.mutate((d) => { sparten = speichern(d, e, abschluesse); });
  verwerfen(e.kundeId);
  return sparten;
}
