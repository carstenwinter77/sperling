// Sperling – Verzahnung der Abläufe (ab 0.14.0): Was eine Auswahl für den nächsten Schritt bedeutet.
// Rein, ohne DOM, in Node testbar. Oberfläche: src/ui/folgeschritte.ts, src/ui/views/gespraechsmodus.ts.
import { AUSGANG, SPARTEN, type Sparte, type StatusKey, type Termin, type Kunde, type Daten } from './model.ts';
import type { Antworten } from './klemmbrett.ts';
import { ortsTag, werktagPlus } from './vertrieb.ts';

export type Ausgang = keyof typeof AUSGANG;

/** Rangfolge der Status im Verkauf: Vorschläge heben nur an, nie ab (außer „Kein Interesse“ und „Abschluss“). */
export const STATUS_RANG: Record<StatusKey, number> = { unbekannt: 0, kein_interesse: 0, potenzial: 1, interesse: 2, termin: 3, angebot: 4, abschluss: 5 };
const anheben = (aktuell: StatusKey, ziel: StatusKey): StatusKey => (STATUS_RANG[ziel] > STATUS_RANG[aktuell] ? ziel : aktuell);

/** Was eine Antwort bei „Vereinbart“ (Klemmbrett) für den Abschluss bedeutet: Ergebnis, Status und Abstand der Wiedervorlage in Tagen. */
export interface AbschlussVorschlag { ausgang: Ausgang | ''; tage: number | null; schritt: string }

const VEREINBART: Record<string, Omit<AbschlussVorschlag, 'schritt'>> = {
  'Vor-Ort-Termin': { ausgang: 'termin', tage: 3 },
  'Vor-Ort-Check': { ausgang: 'termin', tage: 3 },
  'Angebot rechnen': { ausgang: 'angebot', tage: 3 },
  Angebot: { ausgang: 'angebot', tage: 3 },
  'Plan für den Tausch': { ausgang: 'wiedervorlage', tage: 7 },
  'Unterlagen schicken': { ausgang: 'wiedervorlage', tage: 3 },
  'Später melden': { ausgang: 'ueberlegen', tage: 14 },
  'Testgerät da gelassen': { ausgang: 'test', tage: 7 },
  Bestellung: { ausgang: 'abschluss', tage: null },
  'Nachfragen in 2 Wochen': { ausgang: 'wiedervorlage', tage: 14 },
};

/**
 * Vorschlag für den Abschluss eines Bereichs aus den Klemmbrett-Antworten.
 * Mehrere angetippte Antworten: die erste bekannte zählt. „Partner fehlt“ ohne vereinbarten Schritt schlägt
 * einen Termin mit beiden vor. Nicht erreicht: Wiedervorlage am nächsten Tag.
 */
export function abschlussVorschlag(s: Sparte, antworten: Antworten | undefined, erreicht = true): AbschlussVorschlag {
  if (!erreicht) return { ausgang: '', tage: 1, schritt: 'Noch einmal versuchen' };
  const a = antworten?.[s] || {};
  const teile = (a.schritt || '').split(',').map((x) => x.trim()).filter(Boolean);
  const treffer = teile.map((t) => VEREINBART[t]).find(Boolean);
  const partnerFehlt = (a.entscheider || '').includes('Partner fehlt');
  const schritt = a.schritt || (partnerFehlt ? 'Termin mit beiden Entscheidern' : '');
  if (treffer) return { ...treffer, schritt };
  if (partnerFehlt) return { ausgang: 'termin', tage: 7, schritt };
  return { ausgang: '', tage: null, schritt };
}

/** Status, der zu einem Ergebnis passt. Leeres Ergebnis oder ohne Bedeutung: Status bleibt. */
export function statusFuerAusgang(ausgang: Ausgang | '', aktuell: StatusKey): StatusKey {
  switch (ausgang) {
    case 'abschluss': return 'abschluss';
    case 'kein': return 'kein_interesse';
    case 'termin': return anheben(aktuell, 'termin');
    case 'angebot':
    case 'test':
    case 'wiedervorlage':
    case 'ueberlegen': return anheben(aktuell === 'kein_interesse' ? 'unbekannt' : aktuell, 'interesse');
    default: return aktuell;
  }
}

/** Datum der Wiedervorlage `tage` Tage nach `jetzt`, 10 Uhr Ortszeit (ISO); fällt es auf Wochenende/Feiertag, der nächste Werktag. */
export function wvDatum(tage: number, jetzt = new Date()): string {
  return werktagPlus(ortsTag(jetzt), tage);
}

/** Chancen in einem anderen Bereich aus den Klemmbrett-Antworten (nur, wenn dort noch nichts läuft). */
export interface Querverkauf { sparte: Sparte; grund: string }
export function querverkauf(k: Pick<Kunde, 'status'>, antworten: Antworten | undefined, besprochen: readonly Sparte[]): Querverkauf[] {
  const out: Querverkauf[] = [];
  const offen = (s: Sparte) => !besprochen.includes(s) && ['unbekannt'].includes(k.status[s]);
  const hat = (s: Sparte, id: string, wert: string) => (antworten?.[s]?.[id] || '').split(',').map((x) => x.trim()).includes(wert);
  if (offen('pv') && hat('wp', 'pv', 'Geplant')) out.push({ sparte: 'pv', grund: 'Bei der Wärmepumpe gesagt: Solaranlage ist geplant.' });
  if (offen('wp') && hat('pv', 'anlass', 'Neue Heizung')) out.push({ sparte: 'wp', grund: 'Bei Photovoltaik als Anlass genannt: neue Heizung.' });
  return out;
}

/** Offene Angebote eines Bereichs (für „Status ändern räumt mit auf“). */
export function offeneAngeboteBereich(k: Pick<Kunde, 'angebote'>, s: Sparte) {
  return k.angebote.filter((a) => a.sparte === s && a.status === 'offen');
}

/**
 * Nächster Termin des Tages nach `jetzt` (ohne den gerade besuchten Kunden), für „Weiter zum nächsten Stopp“.
 * Nur Termine (keine Wiedervorlagen), nicht erledigt, noch nicht vorbei.
 */
export function naechsterStopp(data: Pick<Daten, 'termine'>, jetzt = new Date(), ausserKunde = ''): Termin | null {
  const tag = ortsTag(jetzt);
  const jetztIso = jetzt.toISOString();
  return data.termine
    .filter((t) => t.art === 'termin' && !t.erledigt && t.kundeId !== ausserKunde && ortsTag(t.beginn) === tag && new Date(new Date(t.beginn).getTime() + t.dauerMin * 60000).toISOString() > jetztIso)
    .sort((a, b) => (a.beginn < b.beginn ? -1 : a.beginn > b.beginn ? 1 : 0))[0] || null;
}

/** Kontaktart für ein Gespräch aus einem Termin: Termin vor Ort = Hausbesuch, Wiedervorlage = Telefon. */
export const kontaktartFuerTermin = (t: Pick<Termin, 'art'>) => (t.art === 'termin' ? 'hausbesuch' : 'telefon') as 'hausbesuch' | 'telefon';

/** Bereiche eines Gesprächs aus einem Termin: der Bereich des Termins, sonst null (dann vermutet Sperling selbst). */
export const spartenFuerTermin = (t: Pick<Termin, 'sparte'>): Sparte[] | null => (t.sparte ? [t.sparte] : null);

/** Wiedervorlage zum Ende der Widerrufsfrist (14 Tage) nach einem angenommenen Angebot. */
export function widerrufWiedervorlage(kundeId: string, s: Sparte, angenommenAm: string) {
  return {
    kundeId, sparte: s, art: 'wiedervorlage' as const, dauerMin: 15, beginn: werktagPlus(ortsTag(angenommenAm), 15),
    titel: `${SPARTEN[s].label}: Widerrufsfrist vorbei – nachfragen, ob alles klar ist`,
    notiz: 'Die 14 Tage Widerrufsfrist sind um. Kurz melden: Gibt es noch Fragen? Wie geht es weiter (nächster Auftragsschritt)?',
  };
}
