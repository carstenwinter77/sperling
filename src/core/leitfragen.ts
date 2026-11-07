// Sperling – geführter Gesprächsablauf in 7 Phasen (rein, ohne DOM, in Node testbar).
//
// Grundlage sind bewährte, kundenorientierte Vertriebsmethoden: SPIN-Fragen (Situation, Problem,
// Auswirkung, Nutzen), aktives Zuhören/Spiegeln, ein ehrlicher Denkanstoß (Challenger), offene
// „Wie/Was“-Fragen und ein klar vorgeschlagener, freiwilliger nächster Schritt.
//
// R-LEITFADEN: keine Druck- oder Manipulationstechniken (künstliche Verknappung, Angstmachen,
// Unterschrift drängen), keine Preise, Förderquoten oder Renditeversprechen. Widerrufsrecht wird aktiv erklärt.
import type { Sparte } from './model.ts';

export type PhaseId = 'vorbereiten' | 'einstieg' | 'situation' | 'problem' | 'zusammenfassen' | 'loesung' | 'schritt';

export interface Phase {
  id: PhaseId;
  /** Kurzname für die Phasenleiste */
  kurz: string;
  titel: string;
  /** Worum es in der Phase geht (ein Satz) */
  ziel: string;
}

export interface Leitfrage {
  id: string;
  frage: string;
  /** Stichwort für die Notiz; ohne Stichwort wird die Frage nur abgehakt (z. B. Vorbereitung, Einstieg). */
  stichwort?: string;
}

export const PHASEN: Phase[] = [
  { id: 'vorbereiten', kurz: 'Vor\u00adbereiten', titel: 'Vorbereiten', ziel: 'Vor dem Gespräch fünf Minuten: Was weiß ich schon, was will ich heute erreichen?' },
  { id: 'einstieg', kurz: 'Einstieg', titel: 'Einstieg und Erlaubnis', ziel: 'Vorstellen, Anlass nennen, Zeit abstimmen und um Erlaubnis für Fragen bitten.' },
  { id: 'situation', kurz: 'Situation', titel: 'Situation verstehen', ziel: 'Wenige, gezielte Faktenfragen. Nicht abfragen, was schon in der Kartei steht.' },
  { id: 'problem', kurz: 'Problem', titel: 'Problem und Auswirkung', ziel: 'Herzstück: Was stört, was kostet es, was passiert, wenn nichts passiert?' },
  { id: 'zusammenfassen', kurz: 'Zusammen\u00adfassen', titel: 'Zusammenfassen', ziel: 'Mit den Worten des Kunden spiegeln. Der Kunde formuliert den Nutzen selbst.' },
  { id: 'loesung', kurz: 'Lösung', titel: 'Lösung und Einwände', ziel: 'Höchstens drei Punkte, jeder an eine Aussage des Kunden geknüpft. Ehrlich sagen, was nicht passt.' },
  { id: 'schritt', kurz: 'Nächster Schritt', titel: 'Nächster Schritt', ziel: 'Einen konkreten, freiwilligen Schritt vorschlagen und festhalten. Bei Vertrag: Widerrufsrecht erklären.' },
];

export const PHASEN_IDS: PhaseId[] = PHASEN.map((p) => p.id);

/** Fragen, die für alle Bereiche gelten. */
const ALLGEMEIN: Partial<Record<PhaseId, Leitfrage[]>> = {
  vorbereiten: [
    { id: 'a-vorb-verlauf', frage: 'Letzte Notizen und frühere Einwände angesehen' },
    { id: 'a-vorb-zusage', frage: 'Offene Zusagen von mir geprüft (Unterlagen, Rückruf, Rechnung)' },
    { id: 'a-vorb-ziel', frage: 'Ziel für heute festgelegt, z. B. Vor-Ort-Termin oder Testphase' },
  ],
  einstieg: [
    { id: 'a-ein-zeit', frage: 'Wir hatten etwa 45 Minuten vereinbart, passt das noch für Sie?' },
    { id: 'a-ein-erlaubnis', frage: 'Darf ich Ihnen erst ein paar Fragen stellen, damit ich nichts empfehle, was nicht zu Ihnen passt?' },
    { id: 'a-ein-anlass', frage: 'Was hat Sie dazu gebracht, sich das Thema gerade jetzt anzusehen?', stichwort: 'Anlass' },
  ],
  zusammenfassen: [
    { id: 'a-zus-spiegeln', frage: 'Habe ich das richtig verstanden: Ihnen sind vor allem … und … wichtig?', stichwort: 'Wichtig ist' },
    { id: 'a-zus-gewinn', frage: 'Was wäre für Sie der größte Gewinn, wenn das gelöst ist?', stichwort: 'Größter Gewinn' },
    { id: 'a-zus-fehlt', frage: 'Habe ich etwas vergessen, das Ihnen wichtig ist?', stichwort: 'Noch wichtig' },
  ],
  loesung: [
    { id: 'a-loe-anknuepfen', frage: 'Sie sagten, … ist Ihnen wichtig. Deshalb würde ich hier … vorschlagen.' },
    { id: 'a-loe-gefuehl', frage: 'Wie klingt das für Sie?', stichwort: 'Reaktion' },
  ],
  schritt: [
    { id: 'a-sch-sinnvoll', frage: 'Was wäre für Sie ein sinnvoller nächster Schritt?', stichwort: 'Nächster Schritt' },
    { id: 'a-sch-fehlt', frage: 'Was müsste passieren, damit sich das für Sie richtig anfühlt?', stichwort: 'Damit es passt' },
    { id: 'a-sch-melden', frage: 'Falls es heute nicht passt: Darf ich mich in ein paar Monaten noch einmal melden?', stichwort: 'Wieder melden' },
    { id: 'a-sch-empfehlung', frage: 'Wen kennen Sie, für den das Thema auch interessant sein könnte? (nur nach einem guten Gespräch)', stichwort: 'Empfehlung' },
  ],
};

/** Fragen je Bereich (Enpal, GALVANY, Vorwerk). */
const JE_SPARTE: Record<Sparte, Partial<Record<PhaseId, Leitfrage[]>>> = {
  pv: {
    vorbereiten: [
      { id: 'pv-vorb-dach', frage: 'Eigentümer? Dach (Ausrichtung, Alter, Verschattung) bekannt?' },
      { id: 'pv-vorb-beide', frage: 'Sind beim Termin beide Entscheider dabei?' },
    ],
    situation: [
      { id: 'pv-sit-rechnung', frage: 'Wie hoch ist Ihre Stromrechnung im Jahr ungefähr?', stichwort: 'Stromkosten/Jahr' },
      { id: 'pv-sit-entwicklung', frage: 'Wie haben sich Ihre Stromkosten in den letzten Jahren entwickelt?', stichwort: 'Entwicklung Stromkosten' },
      { id: 'pv-sit-dach', frage: 'Wie alt ist das Dach, und steht in den nächsten Jahren etwas daran an?', stichwort: 'Dach' },
      { id: 'pv-sit-plaene', frage: 'Planen Sie in den nächsten Jahren ein E-Auto, eine Wärmepumpe oder einen Pool?', stichwort: 'Pläne (E-Auto, WP …)' },
    ],
    problem: [
      { id: 'pv-pro-aerger', frage: 'Was ärgert Sie an der Stromrechnung am meisten?', stichwort: 'Ärgert am meisten' },
      { id: 'pv-pro-zukunft', frage: 'Was heißt die nächste Preiserhöhung für Ihr Haushaltsbudget?', stichwort: 'Auswirkung Preiserhöhung' },
      { id: 'pv-pro-wichtig', frage: 'Was wäre Ihnen wichtiger: möglichst wenig Aufwand oder möglichst viel Ersparnis über die Jahre?', stichwort: 'Aufwand oder Ersparnis' },
      { id: 'pv-pro-geld', frage: 'Was würden Sie mit dem gesparten Geld machen?', stichwort: 'Wofür das Geld' },
    ],
    schritt: [
      { id: 'pv-sch-termin', frage: 'Sollen wir einen Termin machen, an dem Sie beide da sind? Dann rechne ich mit Ihren echten Verbrauchswerten.', stichwort: 'Termin mit beiden' },
    ],
  },
  wp: {
    vorbereiten: [
      { id: 'wp-vorb-haus', frage: 'Baujahr, Dämmung, Heizkörper oder Fußbodenheizung bekannt?' },
      { id: 'wp-vorb-verbrauch', frage: 'Verbrauch (Liter Öl / kWh Gas pro Jahr) erfragt oder notiert?' },
    ],
    situation: [
      { id: 'wp-sit-heizung', frage: 'Wie heizen Sie heute, und wie alt ist die Heizung?', stichwort: 'Heizung/Alter' },
      { id: 'wp-sit-verbrauch', frage: 'Wie viel Öl oder Gas brauchen Sie im Jahr ungefähr?', stichwort: 'Verbrauch/Jahr' },
      { id: 'wp-sit-waerme', frage: 'Heizkörper oder Fußbodenheizung? Wo könnte ein Außengerät stehen?', stichwort: 'Heizflächen/Aufstellort' },
      { id: 'wp-sit-pv', frage: 'Haben Sie schon eine PV-Anlage oder denken darüber nach?', stichwort: 'PV vorhanden/geplant' },
    ],
    problem: [
      { id: 'wp-pro-ausfall', frage: 'Was wäre Ihr Plan, wenn die Heizung im nächsten Winter ausfällt?', stichwort: 'Plan bei Ausfall' },
      { id: 'wp-pro-sorgen', frage: 'Was haben Sie bisher über Wärmepumpen gehört, und was davon macht Ihnen Sorgen?', stichwort: 'Sorgen/Mythen' },
      { id: 'wp-pro-unabhaengig', frage: 'Wie wichtig ist es Ihnen, unabhängig von Öl- und Gaspreisen zu werden?', stichwort: 'Unabhängigkeit' },
    ],
    schritt: [
      { id: 'wp-sch-check', frage: 'Sollen wir einen Vor-Ort-Check machen? Dann sehen wir ehrlich, ob es bei Ihnen passt.', stichwort: 'Vor-Ort-Check' },
      { id: 'wp-sch-plan', frage: 'Ihre Heizung läuft noch: Sollen wir einen Plan für den Tausch machen und uns in einigen Monaten wieder sprechen?', stichwort: 'Plan für Tausch' },
    ],
  },
  vorwerk: {
    vorbereiten: [
      { id: 'vw-vorb-geraet', frage: 'Vorführgerät und Zubehör dabei und geladen?' },
      { id: 'vw-vorb-haushalt', frage: 'Böden, Haustiere, Allergien aus der Kartei bekannt?' },
    ],
    situation: [
      { id: 'vw-sit-boeden', frage: 'Welche Böden haben Sie, und wie groß ist die Wohnung?', stichwort: 'Böden/Fläche' },
      { id: 'vw-sit-haushalt', frage: 'Gibt es Haustiere, Kinder oder Allergiker im Haushalt?', stichwort: 'Haushalt' },
      { id: 'vw-sit-geraet', frage: 'Womit saugen Sie heute, und wie oft?', stichwort: 'Jetziges Gerät' },
    ],
    problem: [
      { id: 'vw-pro-nervt', frage: 'Was nervt Sie beim Putzen am meisten?', stichwort: 'Nervt beim Putzen' },
      { id: 'vw-pro-zeit', frage: 'Wie lange dauert das Saugen bei Ihnen?', stichwort: 'Zeitaufwand' },
      { id: 'vw-pro-zeigen', frage: 'Darf ich Ihnen an Ihrem eigenen Sofa zeigen, was Ihr jetziger Sauger zurücklässt?', stichwort: 'Vorführung' },
      { id: 'vw-pro-gewinn', frage: 'Was würden Sie mit der gewonnenen Zeit machen?', stichwort: 'Gewonnene Zeit' },
    ],
    loesung: [
      { id: 'vw-loe-selbst', frage: 'Probieren Sie selbst: Wie fühlt sich das an?', stichwort: 'Eindruck Vorführung' },
    ],
    schritt: [
      { id: 'vw-sch-test', frage: 'Möchten Sie den Kobold ein paar Tage in Ruhe zu Hause testen?', stichwort: 'Testphase' },
      { id: 'vw-sch-nachfragen', frage: 'Darf ich mich nach zwei Wochen melden und fragen, wie es läuft?', stichwort: 'Nachfragen' },
    ],
  },
};

/** Ehrlicher Denkanstoß je Bereich (Challenger): eine neue Sichtweise, kein Druck. */
export const IMPULS: Record<Sparte, string> = {
  pv: 'Viele denken, PV lohnt sich nur mit hoher Einspeisevergütung. Der eigentliche Wert liegt im Eigenverbrauch: Jede selbst genutzte Kilowattstunde ersetzt teuren Netzstrom.',
  wp: 'Die eigentliche Frage ist nicht „Wärmepumpe ja oder nein“, sondern „geplant tauschen oder im Notfall tauschen müssen“. Ein geplanter Tausch lässt Zeit für Förderantrag und die passende Größe.',
  vorwerk: 'Erleben überzeugt mehr als jedes Argument: Den Kunden selbst bedienen lassen, Pausen aushalten und fragen „Wie fühlt sich das an?“ statt selbst zu loben. Die Vorführung endet mit einer Frage, nicht mit einem Preis.',
};

/** Satz für die Notiz, wenn das Widerrufsrecht erklärt wurde. */
export const WIDERRUF_NOTIZ = 'Widerrufsrecht (14 Tage) erklärt.';
export const WIDERRUF_HINWEIS = 'Bei Vertrag an der Haustür oder am Telefon: Der Kunde kann 14 Tage widerrufen. Von dir aus erklären, das schafft Vertrauen.';

/** Leitfragen einer Phase für einen Bereich: erst die bereichseigenen, dann die allgemeinen. */
export function leitfragen(s: Sparte, p: PhaseId): Leitfrage[] {
  return [...(JE_SPARTE[s]?.[p] || []), ...(ALLGEMEIN[p] || [])];
}

/** Alle Leitfragen eines Bereichs (z. B. für Tests oder Suche). */
export function alleLeitfragen(s: Sparte): Leitfrage[] {
  return PHASEN_IDS.flatMap((p) => leitfragen(s, p));
}

export function phase(id: PhaseId): Phase {
  return PHASEN.find((p) => p.id === id) || PHASEN[0]!;
}

export function phasenIndex(id: string): number {
  const i = PHASEN_IDS.indexOf(id as PhaseId);
  return i < 0 ? 0 : i;
}

/** Nachbarphase (Schritt -1 oder +1), am Rand bleibt es stehen. */
export function nachbar(id: PhaseId, schritt: number): PhaseId {
  const i = Math.min(PHASEN_IDS.length - 1, Math.max(0, phasenIndex(id) + schritt));
  return PHASEN_IDS[i]!;
}

/** Stichpunkt-Zeile für die Notiz; der Nutzer schreibt oder diktiert die Antwort dahinter. */
export function stichpunkt(f: Leitfrage): string {
  return f.stichwort ? `${f.stichwort}: ` : '';
}

/** Zustand des geführten Ablaufs; lebt nur im Arbeitsspeicher (Entwurf), nie im Browser-Speicher. */
export interface Fluss {
  phase: PhaseId;
  /** Bereich -> abgehakte Leitfrage-IDs */
  gefragt: Record<Sparte, string[]>;
  /** Bereiche, in denen das Widerrufsrecht erklärt wurde */
  widerruf: Sparte[];
}

export const neuerFluss = (): Fluss => ({ phase: 'vorbereiten', gefragt: { pv: [], wp: [], vorwerk: [] }, widerruf: [] });

/** Leitfrage ab-/anhaken. Liefert true, wenn sie jetzt abgehakt ist. */
export function umschalten(f: Fluss, s: Sparte, frageId: string): boolean {
  const liste = f.gefragt[s] || (f.gefragt[s] = []);
  const i = liste.indexOf(frageId);
  if (i >= 0) { liste.splice(i, 1); return false; }
  liste.push(frageId);
  return true;
}

/** Wie viele Leitfragen je Phase in diesem Bereich abgehakt sind. */
export function fortschritt(f: Fluss, s: Sparte): Record<PhaseId, number> {
  const ids = new Set(f.gefragt[s] || []);
  const out = {} as Record<PhaseId, number>;
  for (const p of PHASEN_IDS) out[p] = leitfragen(s, p).filter((q) => ids.has(q.id)).length;
  return out;
}

/** Anzahl abgehakter Leitfragen über alle Bereiche. */
export function anzahlGefragt(f: Fluss): number {
  return Object.values(f.gefragt).reduce((n, l) => n + (l?.length || 0), 0);
}
