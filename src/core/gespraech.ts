// Sperling – Gespräch speichern (rein, ohne DOM, in Node testbar). Oberfläche: src/ui/gespraechsablauf.ts.
import {
  SPARTEN, STATUS, AUSGANG, KONTAKTART, kundenName, kundenTitel, adresseEinzeilig,
  neueNotiz, neuerTermin, normalizeGespraech, normalizeEnpalKontakt, type Sparte, type StatusKey, type Daten,
} from './model.ts';
import { LEITFADEN, gespraechsNotiz } from './einwaende.ts';
import { nowIso } from './util.ts';
import type { Fluss } from './leitfragen.ts';

/** Notizen werden je Bereich getrennt geführt (seit 0.10.4: PV, WP und Vorwerk einzeln, R-TEXT). */
export type Gruppe = Sparte;
export const GRUPPEN_KEYS: Gruppe[] = ['pv', 'wp', 'vorwerk'];
export const gruppeVon = (s: Sparte): Gruppe => s;
export const leereNotizen = (): Record<Gruppe, string> => ({ pv: '', wp: '', vorwerk: '' });
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
  /** Geführter Ablauf (Phase, abgehakte Leitfragen); nur im Arbeitsspeicher */
  fluss?: Fluss;
}

export interface Abschluss {
  sparte: Sparte;
  ausgang: keyof typeof AUSGANG | '';
  status: StatusKey | '';
  schritt: string;
  /** Wiedervorlage/Termin (ISO) oder null */
  wv: string | null;
}

export const leererVerlauf = (): Verlauf => ({ pv: {}, wp: {}, vorwerk: {} });
export const hatEinwaende = (v: Verlauf, s: Sparte) => Object.keys(v[s]).length > 0;

/** Ist im Entwurf schon etwas festgehalten? */
export function hatInhalt(e: Entwurf): boolean {
  return !!(GRUPPEN_KEYS.some((g) => (e.notiz[g] || '').trim()) || (Object.keys(e.verlauf) as Sparte[]).some((s) => hatEinwaende(e.verlauf, s)));
}

/**
 * Gespräch beim Kunden speichern (eine Änderung, ein Zeitstempel):
 * - je Sparte mit Ergebnis oder Einwänden ein Eintrag unter „Gespräche“, Status und Wiedervorlage
 * - je Bereich eine Notiz (Freitext + Einwände + Ergebnis), nur mit diesem Bereich (R-TEXT)
 * - bei Photovoltaik ein Eintrag in der Enpal-Gesprächsdokumentation
 * Gibt die gespeicherten Sparten zurück.
 */
export function speichern(data: Daten, e: Entwurf, abschluesse: Abschluss[], jetzt = nowIso()): Sparte[] {
  const k = data.kunden.find((x) => x.id === e.kundeId);
  if (!k) throw new Error('Kunde nicht gefunden.');
  const gespeichert: Sparte[] = [];
  const notizTeile: Record<Gruppe, string[]> = { pv: [], wp: [], vorwerk: [] };
  const notizSparten: Record<Gruppe, Set<Sparte>> = { pv: new Set(), wp: new Set(), vorwerk: new Set() };
  const notiz = (g: Gruppe) => (e.notiz[g] || '').trim();
  for (const g of GRUPPEN_KEYS) {
    if (notiz(g)) {
      notizTeile[g].push(notiz(g));
      for (const s of e.sparten) if (gruppeVon(s) === g) notizSparten[g].add(s);
    }
  }
  for (const a of abschluesse) {
    const s = a.sparte;
    const g = gruppeVon(s);
    const einwaende = LEITFADEN[s].einwaende.filter((x) => e.verlauf[s][x.id]).map((x) => ({ id: x.id, text: x.kunde, ergebnis: e.verlauf[s][x.id] }));
    if (a.ausgang || einwaende.length) {
      k.gespraeche.push(normalizeGespraech({ zeitpunkt: jetzt, sparte: s, einwaende, ausgang: a.ausgang, naechsterSchritt: a.schritt, notiz: notiz(g) }));
      gespeichert.push(s);
      const zeilen = [gespraechsNotiz(s, e.verlauf[s]), a.ausgang ? `Ergebnis ${SPARTEN[s].label}: ${AUSGANG[a.ausgang]}` : '', a.schritt ? `Nächster Schritt: ${a.schritt}` : ''].filter(Boolean);
      if (zeilen.length) { notizTeile[g].push(zeilen.join('\n')); notizSparten[g].add(s); }
    }
    if (a.status && a.status in STATUS) k.status[s] = a.status;
    if (a.wv) {
      data.termine.push(neuerTermin({
        kundeId: k.id, sparte: s, art: a.ausgang === 'termin' ? 'termin' : 'wiedervorlage', beginn: a.wv, dauerMin: 60,
        titel: `${SPARTEN[s].label}: ${a.schritt || (a.ausgang ? AUSGANG[a.ausgang] : 'Wiedervorlage')} – ${kundenTitel(k)}`, ort: adresseEinzeilig(k), notiz: notiz(g).slice(0, 5000),
      }));
    }
  }
  const art = KONTAKTART[e.kontaktart] || KONTAKTART.telefon;
  for (const g of GRUPPEN_KEYS) {
    // Nicht erreicht: der Versuch wird trotzdem festgehalten
    const versuch = !e.erreicht && e.sparten.some((s) => gruppeVon(s) === g);
    if (!notizTeile[g].length && !versuch) continue;
    if (!notizSparten[g].size) for (const s of e.sparten) if (gruppeVon(s) === g) notizSparten[g].add(s);
    const kopf = `${art}${e.erreicht ? '' : ' (nicht erreicht)'}`;
    k.notizen.push(neueNotiz({ text: [kopf, ...notizTeile[g]].join('\n\n'), sparten: [...notizSparten[g]], zeitpunkt: jetzt }));
  }
  // Enpal-Dokumentation: nur Photovoltaik (Wärmepumpe läuft über GALVANY)
  const enpal = abschluesse.filter((a) => a.sparte === 'pv' && (a.ausgang || hatEinwaende(e.verlauf, a.sparte)));
  const enpalThemen = [...new Set([...enpal.map((a) => a.sparte), ...(notiz('pv') || !e.erreicht ? e.sparten.filter((s) => s === 'pv') : [])])];
  if (enpalThemen.length) {
    const fristen = enpal.map((a) => a.wv).filter(Boolean).sort() as string[];
    k.enpalKontakte.push(normalizeEnpalKontakt({
      zeitpunkt: jetzt, art: e.kontaktart, erreicht: e.erreicht, gespraechspartner: kundenName(k), themen: enpalThemen,
      ergebnis: enpal.find((a) => a.ausgang)?.ausgang || '',
      naechsterSchritt: enpal.map((a) => a.schritt).filter(Boolean).join(' / '),
      frist: fristen[0] || null,
      notiz: [notiz('pv'), ...enpal.map((a) => [a.ausgang ? `${SPARTEN[a.sparte].label}: ${AUSGANG[a.ausgang]}` : '', gespraechsNotiz(a.sparte, e.verlauf[a.sparte])].filter(Boolean).join('\n'))].filter(Boolean).join('\n\n'),
    }));
  }
  k.updatedAt = jetzt;
  return gespeichert;
}

