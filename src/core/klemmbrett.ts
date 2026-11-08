// Sperling – digitales Klemmbrett fürs Gespräch (rein, ohne DOM, in Node testbar).
//
// Statt Fragen abzuhaken, hält Jan die ANTWORTEN fest: Ein Punkt ist erledigt, sobald etwas
// eingetragen ist. Zwei Arten von Punkten:
//   feld    – schreibt direkt in die Kundenkartei (FELDER in model.ts), z. B. Stromverbrauch, Heizung
//   antwort – Antwort des Kunden auf eine Bedarfsfrage; landet beim Speichern als Zeile in der
//             Notiz des Bereichs (R-TEXT: nur dieser Bereich)
// Die passende Frage steht klein darunter, als Hilfe, nicht als Pflicht.
//
// Methodik dahinter: SPIN (Situation, Problem/Bedarf, Nutzen), offene Fragen, ehrlicher Denkanstoß,
// freiwilliger nächster Schritt. R-LEITFADEN: keine Druck- oder Manipulationstechniken, keine Preise,
// Förderquoten oder Renditeversprechen; Widerrufsrecht wird aktiv erklärt.
import { FELDER, offenerVerleih, type Sparte, type Daten } from './model.ts';
import { istAus, type FeldEinstellungen } from './felder.ts';

/** Vorwerk: „Gerät dalassen“ öffnet am Klemmbrett die Geräteauswahl aus dem Vorführbestand. */
export const GERAET_DALASSEN = 'Testgerät da gelassen';

export type AbschnittId = 'situation' | 'bedarf' | 'schritt';

export interface FeldPunkt { art: 'feld'; key: string; frage: string }
export interface AntwortPunkt {
  art: 'antwort'; id: string; label: string; frage: string;
  /** Antippbare Antworten; Freitext ist zusätzlich immer möglich */
  optionen?: string[];
  /** Mehrere Optionen gleichzeitig wählbar */
  mehrfach?: boolean;
}
export type Punkt = FeldPunkt | AntwortPunkt;
export interface Abschnitt { id: AbschnittId; titel: string; hinweis: string; punkte: Punkt[] }

const feld = (key: string, frage: string): FeldPunkt => ({ art: 'feld', key, frage });
const antwort = (id: string, label: string, frage: string, optionen?: string[], mehrfach = false): AntwortPunkt =>
  ({ art: 'antwort', id, label, frage, ...(optionen ? { optionen } : {}), ...(mehrfach ? { mehrfach } : {}) });

export const WIDERRUF_HINWEIS = 'Bei Vertrag an der Haustür oder am Telefon kann der Kunde 14 Tage widerrufen. Von dir aus erklären, das schafft Vertrauen.';
const widerruf = antwort('widerruf', 'Widerrufsrecht', WIDERRUF_HINWEIS, ['erklärt', 'kein Vertrag heute']);

const HINWEIS: Record<AbschnittId, string> = {
  situation: 'Fakten, die in die Kartei gehören. Was schon drinsteht, nicht noch einmal fragen.',
  bedarf: 'Herzstück: Was stört, was ist wichtig, was soll besser werden? Die Worte des Kunden notieren.',
  schritt: 'Einen konkreten, freiwilligen nächsten Schritt vereinbaren.',
};
const abschnitt = (id: AbschnittId, titel: string, punkte: Punkt[]): Abschnitt => ({ id, titel, hinweis: HINWEIS[id], punkte });

export const KLEMMBRETT: Record<Sparte, Abschnitt[]> = {
  pv: [
    abschnitt('situation', 'Situation', [
      feld('stromverbrauch', 'Wie viel Strom verbrauchen Sie im Jahr? (steht auf der Jahresabrechnung)'),
      feld('strompreis', 'Was zahlen Sie aktuell pro Kilowattstunde?'),
      feld('personen', 'Wie viele Personen leben im Haushalt?'),
      feld('ausrichtung', 'In welche Richtung zeigt das Dach?'),
      feld('dachform', 'Welche Dachform haben Sie?'),
      feld('dachzustand', 'Wie alt ist das Dach, steht daran etwas an?'),
      feld('verschattung', 'Gibt es Bäume oder Gebäude, die Schatten werfen?'),
      feld('eauto', 'Fahren oder planen Sie ein E-Auto?'),
      feld('speicher', 'Wäre ein Speicher interessant, damit Sie abends eigenen Strom nutzen?'),
      feld('zaehlerschrank', 'Wie alt ist der Zählerschrank?'),
    ]),
    abschnitt('bedarf', 'Bedarf', [
      antwort('anlass', 'Anlass', 'Was hat Sie dazu gebracht, sich das Thema gerade jetzt anzusehen?', ['Stromrechnung', 'Nachbar hat eine Anlage', 'Neues E-Auto', 'Neue Heizung', 'Umwelt']),
      antwort('aerger', 'Ärgert am meisten', 'Was ärgert Sie an der Stromrechnung am meisten?', ['Preiserhöhungen', 'Abschläge', 'Abhängigkeit vom Versorger']),
      antwort('wichtig', 'Wichtig ist', 'Was wäre Ihnen wichtiger: wenig Aufwand oder möglichst viel Ersparnis über die Jahre?', ['Wenig Aufwand (Miete)', 'Viel Ersparnis (Kauf)', 'Unabhängigkeit', 'Umwelt'], true),
      antwort('nutzen', 'Wofür das Geld', 'Was würden Sie mit dem gesparten Geld machen?'),
    ]),
    abschnitt('schritt', 'Nächster Schritt', [
      antwort('entscheider', 'Entscheider', 'Wer entscheidet mit, und war er beim Gespräch dabei?', ['Beide dabei', 'Partner fehlt', 'Allein']),
      antwort('schritt', 'Vereinbart', 'Was wäre für Sie ein sinnvoller nächster Schritt?', ['Vor-Ort-Termin', 'Angebot rechnen', 'Unterlagen schicken', 'Später melden']),
      widerruf,
    ]),
  ],
  wp: [
    abschnitt('situation', 'Situation', [
      feld('heizungsart', 'Womit heizen Sie heute?'),
      feld('heizungBaujahr', 'Wie alt ist die Heizung?'),
      feld('verbrauchMenge', 'Wie viel Öl oder Gas brauchen Sie im Jahr?'),
      feld('verbrauchEinheit', 'In welcher Einheit (Liter, kWh, m³)?'),
      feld('heizkosten', 'Was kostet das Heizen im Jahr ungefähr?'),
      feld('wohnflaeche', 'Wie groß ist die beheizte Fläche?'),
      feld('hausBaujahr', 'Wann wurde das Haus gebaut?'),
      feld('daemmung', 'Wurde schon gedämmt oder saniert?'),
      feld('waermeverteilung', 'Heizkörper oder Fußbodenheizung?'),
      feld('aufstellort', 'Wo könnte ein Außengerät stehen?'),
    ]),
    abschnitt('bedarf', 'Bedarf', [
      antwort('ausfall', 'Plan bei Ausfall', 'Was wäre Ihr Plan, wenn die Heizung im nächsten Winter ausfällt?', ['Kein Plan', 'Gleiche Heizung neu', 'Lieber vorher tauschen']),
      antwort('sorgen', 'Sorgen', 'Was haben Sie über Wärmepumpen gehört, und was davon macht Ihnen Sorgen?', ['Lautstärke', 'Altbau geeignet?', 'Stromkosten', 'Anschaffung', 'Bauarbeiten'], true),
      antwort('unabhaengig', 'Unabhängigkeit', 'Wie wichtig ist es Ihnen, unabhängig von Öl- und Gaspreisen zu werden?', ['Sehr wichtig', 'Wichtig', 'Eher egal']),
      antwort('pv', 'Photovoltaik', 'Haben Sie schon eine Solaranlage oder denken darüber nach?', ['Vorhanden', 'Geplant', 'Nein']),
    ]),
    abschnitt('schritt', 'Nächster Schritt', [
      antwort('entscheider', 'Entscheider', 'Wer entscheidet mit, und war er beim Gespräch dabei?', ['Beide dabei', 'Partner fehlt', 'Allein']),
      antwort('schritt', 'Vereinbart', 'Was wäre für Sie ein sinnvoller nächster Schritt?', ['Vor-Ort-Check', 'Angebot', 'Plan für den Tausch', 'Später melden']),
      widerruf,
    ]),
  ],
  vorwerk: [
    abschnitt('situation', 'Situation', [
      feld('vorhandenesGeraet', 'Womit saugen Sie heute?'),
      feld('bodenbelaege', 'Welche Böden haben Sie?'),
      feld('flaeche', 'Wie groß ist die Fläche, die gereinigt wird?'),
      feld('haustiere', 'Gibt es Haustiere?'),
      feld('allergien', 'Gibt es Allergiker im Haushalt?'),
      feld('interesseAn', 'Woran haben Sie Interesse?'),
    ]),
    abschnitt('bedarf', 'Bedarf', [
      antwort('nervt', 'Nervt beim Putzen', 'Was nervt Sie beim Putzen am meisten?', ['Tierhaare', 'Zeitaufwand', 'Schweres Gerät', 'Staub/Allergie', 'Wischen']),
      antwort('zeit', 'Zeitaufwand', 'Wie oft und wie lange saugen Sie?'),
      feld('vorfuehrung', 'Darf ich Ihnen an Ihrem eigenen Sofa zeigen, was Ihr Sauger zurücklässt?'),
      antwort('eindruck', 'Eindruck Vorführung', 'Probieren Sie selbst: Wie fühlt sich das an?', ['Begeistert', 'Positiv', 'Unsicher', 'Kein Interesse']),
    ]),
    abschnitt('schritt', 'Nächster Schritt', [
      antwort('schritt', 'Vereinbart', 'Was wäre für Sie ein sinnvoller nächster Schritt?', [GERAET_DALASSEN, 'Bestellung', 'Nachfragen in 2 Wochen', 'Später melden']),
      widerruf,
    ]),
  ],
};

/** Ehrlicher Denkanstoß je Bereich (Challenger): eine neue Sichtweise, kein Druck. */
export const IMPULS: Record<Sparte, string> = {
  pv: 'Viele denken, PV lohnt sich nur mit hoher Einspeisevergütung. Der eigentliche Wert liegt im Eigenverbrauch: Jede selbst genutzte Kilowattstunde ersetzt teuren Netzstrom.',
  wp: 'Die eigentliche Frage ist nicht „Wärmepumpe ja oder nein“, sondern „geplant tauschen oder im Notfall tauschen müssen“. Ein geplanter Tausch lässt Zeit für Förderantrag und die passende Größe.',
  vorwerk: 'Erleben überzeugt mehr als jedes Argument: den Kunden selbst bedienen lassen, Pausen aushalten und fragen „Wie fühlt sich das an?“ statt selbst zu loben.',
};

/** Antworten des laufenden Gesprächs: Bereich -> Punkt-ID -> Text. Nur im Arbeitsspeicher (Entwurf). */
export type Antworten = Record<Sparte, Record<string, string>>;
export const leereAntworten = (): Antworten => ({ pv: {}, wp: {}, vorwerk: {} });
export const MAX_ANTWORT = 2000;

export const punktId = (s: Sparte, p: Punkt) => (p.art === 'feld' ? `${s}.${p.key}` : p.id);

/** Abschnitte eines Bereichs ohne ausgeblendete Kartei-Felder (Feldverwaltung). */
export function abschnitte(s: Sparte, fe?: FeldEinstellungen): Abschnitt[] {
  const bekannt = new Set(FELDER[s].map((f) => f.key));
  return KLEMMBRETT[s].map((a) => ({
    ...a,
    punkte: a.punkte.filter((p) => p.art !== 'feld' || (bekannt.has(p.key) && !istAus(fe, `${s}.${p.key}`))),
  }));
}

/** Bezeichnung eines Punkts (Feld: Label aus der Kartei). */
export function punktLabel(s: Sparte, p: Punkt): string {
  if (p.art === 'antwort') return p.label;
  return FELDER[s].find((f) => f.key === p.key)?.label || p.key;
}

const leer = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && !v.trim());

/** Ist der Punkt ausgefüllt? Felder werden am Kunden gelesen, Antworten im Entwurf. */
export function erledigt(s: Sparte, p: Punkt, kunde: Record<string, any> | null, a: Antworten): boolean {
  if (p.art === 'feld') return !leer(kunde?.[s]?.[p.key]);
  return !leer(a[s]?.[p.id]);
}

export interface Stand { erledigt: number; gesamt: number; offen: string[] }

/** Wie viel des Klemmbretts ist ausgefüllt, und was fehlt noch (Bezeichnungen)? */
export function stand(s: Sparte, kunde: Record<string, any> | null, a: Antworten, fe?: FeldEinstellungen, nur?: AbschnittId): Stand {
  const punkte = abschnitte(s, fe).filter((x) => !nur || x.id === nur).flatMap((x) => x.punkte);
  const offen = punkte.filter((p) => !erledigt(s, p, kunde, a)).map((p) => punktLabel(s, p));
  return { erledigt: punkte.length - offen.length, gesamt: punkte.length, offen };
}

/** Antwort setzen (leer = entfernen). */
export function antwortSetzen(a: Antworten, s: Sparte, id: string, wert: string): void {
  const t = String(wert ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_ANTWORT);
  if (!a[s]) a[s] = {};
  if (t) a[s][id] = t; else delete a[s][id];
}

/**
 * Antippbare Option ein-/ausschalten. Einzelwahl: ersetzt eine andere gewählte Option, Freitext bleibt.
 * Mehrfachwahl: Option wird ergänzt oder entfernt. Teile werden mit „, “ getrennt.
 */
export function optionUmschalten(alt: string, option: string, optionen: string[], mehrfach = false): string {
  const teile = (alt || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (teile.includes(option)) return teile.filter((x) => x !== option).join(', ');
  const frei = teile.filter((x) => !optionen.includes(x));
  const gewaehlt = mehrfach ? [...teile.filter((x) => optionen.includes(x)), option] : [option];
  gewaehlt.sort((x, y) => optionen.indexOf(x) - optionen.indexOf(y));
  return [...gewaehlt, ...frei].join(', ');
}

export const optionGewaehlt = (wert: string, option: string) => (wert || '').split(',').map((x) => x.trim()).includes(option);

/** Notiz-Zeilen aus den Antworten eines Bereichs, in Klemmbrett-Reihenfolge („Label: Antwort“). */
export function klemmbrettText(s: Sparte, a: Antworten | undefined): string {
  if (!a?.[s]) return '';
  return KLEMMBRETT[s].flatMap((x) => x.punkte)
    .filter((p): p is AntwortPunkt => p.art === 'antwort' && !leer(a[s][p.id]))
    .map((p) => `${p.label}: ${a[s][p.id]}`)
    .join('\n');
}

/** Vorschlag für „Nächster Schritt“ beim Abschließen aus der Antwort „Vereinbart“. */
export const istGeraetPunkt = (s: Sparte, p: Punkt) => s === 'vorwerk' && p.art === 'antwort' && p.id === 'schritt';

/** Was beim Kunden schon steht (offene Leihen) und welche aktiven Vorführgeräte frei sind. */
export function geraeteFuerKunde(data: Daten, kundeId: string) {
  const verliehen = data.leihvorgaenge
    .filter((l) => l.kundeId === kundeId && !l.rueckgabe)
    .map((l) => ({ leihe: l, name: data.geraete.find((g) => g.id === l.geraetId)?.name || 'Gerät' }));
  const frei = data.geraete.filter((g) => g.aktiv && !offenerVerleih(data, g.id));
  return { verliehen, frei };
}

export const schrittVorschlag = (s: Sparte, a: Antworten | undefined) => a?.[s]?.schritt || '';

/** Freitext-Anteil einer Antwort (alles, was keine antippbare Option ist). */
export function freiAnteil(wert: string, optionen: string[] = []): string {
  return (wert || '').split(',').map((x) => x.trim()).filter((x) => x && !optionen.includes(x)).join(', ');
}

/** Antwort aus gewählten Optionen und neuem Freitext zusammensetzen. */
export function mitFreitext(wert: string, optionen: string[], frei: string): string {
  const gewaehlt = (wert || '').split(',').map((x) => x.trim()).filter((x) => optionen.includes(x));
  return [...gewaehlt, frei.trim()].filter(Boolean).join(', ');
}
