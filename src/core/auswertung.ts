// Sperling – Auswertungen (rein, ohne DOM, in Node testbar).
// Berichte je Bereich (PV, WP, Vorwerk) oder für alles zusammen, als Tag, Woche, Monat, Kalenderjahr
// oder letzte 365 Tage bis zum gewählten Tag. Jeder Bericht kennt den Vorzeitraum zum Vergleich.
import { AUSGANG, SPARTEN_KEYS, type Daten, type Sparte } from './model.ts';
import { MARKIERUNG_KEYS, type Markierung } from './produkte.ts';
import { tagVon, tagDatum, plusTage, wochenanfang, kalenderwoche, type Tag } from './belegung.ts';

export type Bereich = 'alle' | Sparte;
export type Periode = 'tag' | 'woche' | 'monat' | 'm1' | 'm3' | 'm6' | 'jahr' | '365';
export type Ausgang = keyof typeof AUSGANG;

export const BEREICHE: Record<Bereich, string> = { alle: 'Alles zusammen', pv: 'Photovoltaik', wp: 'Wärmepumpe', vorwerk: 'Vorwerk' };
export const PERIODEN: Record<Periode, string> = { tag: 'Tag', woche: 'Woche', monat: 'Monat', m1: 'Letzter Monat', m3: 'Letzte 3 Monate', m6: 'Letztes halbes Jahr', jahr: 'Kalenderjahr', '365': 'Letzte 365 Tage' };
/** Gleitende Zeiträume in Monaten, die am Stichtag enden. */
const GLEITEND: Partial<Record<Periode, number>> = { m1: 1, m3: 3, m6: 6 };
/** Feste Reihenfolge (Object.keys sortiert '365' als Zahl nach vorn). */
export const PERIODEN_REIHE: Periode[] = ['tag', 'woche', 'monat', 'm1', 'm3', 'm6', 'jahr', '365'];

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const kurzDatum = (t: Tag) => tagDatum(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export interface Zeitraum { von: Tag; bis: Tag; titel: string }

/** Zeitraum der Periode, in der `anker` liegt. Bei '365' endet er am Anker. */
export function zeitraum(periode: Periode, anker: Tag): Zeitraum {
  const d = tagDatum(anker);
  switch (periode) {
    case 'tag':
      return { von: anker, bis: anker, titel: d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) };
    case 'woche': {
      const von = wochenanfang(anker); const bis = plusTage(von, 6);
      return { von, bis, titel: `KW ${kalenderwoche(anker)} · ${kurzDatum(von)} – ${kurzDatum(bis)}` };
    }
    case 'monat': {
      const von = tagVon(new Date(d.getFullYear(), d.getMonth(), 1));
      const bis = tagVon(new Date(d.getFullYear(), d.getMonth() + 1, 0));
      return { von, bis, titel: `${MONATE[d.getMonth()]} ${d.getFullYear()}` };
    }
    case 'jahr':
      return { von: `${d.getFullYear()}-01-01`, bis: `${d.getFullYear()}-12-31`, titel: `Kalenderjahr ${d.getFullYear()}` };
    case 'm1': case 'm3': case 'm6': {
      // gleitend: endet am Stichtag, beginnt am Tag nach demselben Datum N Monate vorher
      const von = plusTage(monateVerschieben(anker, -GLEITEND[periode]!), 1);
      return { von, bis: anker, titel: `${PERIODEN[periode]} · ${kurzDatum(von)} – ${kurzDatum(anker)}` };
    }
    case '365': {
      const von = plusTage(anker, -364);
      return { von, bis: anker, titel: `Letzte 365 Tage · ${kurzDatum(von)} – ${kurzDatum(anker)}` };
    }
  }
}

/** Anker um `n` Perioden verschieben (‹ ›). Monat/Jahr bleiben auf gültigen Tagen (31.03. − 1 Monat = 28./29.02.). */
function monateVerschieben(anker: Tag, monate: number): Tag {
  const d = tagDatum(anker);
  const ziel = new Date(d.getFullYear(), d.getMonth() + monate, 1);
  const letzter = new Date(ziel.getFullYear(), ziel.getMonth() + 1, 0).getDate();
  ziel.setDate(Math.min(d.getDate(), letzter));
  return tagVon(ziel);
}

export function verschieben(periode: Periode, anker: Tag, n: number): Tag {
  if (periode === 'monat' || periode === 'jahr') return monateVerschieben(anker, periode === 'monat' ? n : 12 * n);
  if (GLEITEND[periode]) return monateVerschieben(anker, n * GLEITEND[periode]!);
  return plusTage(anker, n * (periode === 'tag' ? 1 : periode === 'woche' ? 7 : 365));
}

/** Gleich langer Zeitraum direkt davor (Vergleich). */
export function vorzeitraum(periode: Periode, anker: Tag): Zeitraum {
  return zeitraum(periode, verschieben(periode, anker, -1));
}

export interface Kennzahlen {
  /** Gespräche: Enpal-Kontakte und Einwand-Gespräche */
  gespraeche: number;
  erreicht: number;
  telefon: number;
  hausbesuch: number;
  ergebnisse: Record<Ausgang, number>;
  abschluesse: number;
  /** Abschlüsse / erreichte Gespräche, 0..1; null ohne erreichte Gespräche */
  abschlussquote: number | null;
  neueKunden: number;
  notizen: number;
  termine: number;
  termineErledigt: number;
  wiedervorlagen: number;
  wiedervorlagenErledigt: number;
  /** nur Vorwerk (und alles zusammen) */
  verleihe: number;
  rueckgaben: number;
  kaeufe: number;
  /** Käufe / Verleihe im Zeitraum; null ohne Verleihe */
  kaufquote: number | null;
  /** Produkte im Gespräch: je Kunde und Produkt der letzte Stand im Zeitraum */
  produkte: Record<Markierung, number>;
  /** meistgefragte Produkte (Interesse) im Zeitraum, höchstens 5 */
  topProdukte: { name: string; anzahl: number }[];
  /** Gespräche je Abschnitt (Stunden-/Tages-/Monatsbalken) */
  /** je Abschnitt: Anzahl Gespräche und Themen-Nennungen (ein Gespräch kann mehrere Themen haben; ohne Thema = ohne) */
  verlauf: { label: string; wert: number; je: VerlaufJe }[];
}

const leereErgebnisse = () => Object.fromEntries(Object.keys(AUSGANG).map((k) => [k, 0])) as Record<Ausgang, number>;

export type VerlaufJe = Record<Sparte | 'ohne', number>;
const leerJe = (): VerlaufJe => ({ ...Object.fromEntries(SPARTEN_KEYS.map((x) => [x, 0])), ohne: 0 } as VerlaufJe);

/** Kennzahlen für Bereich und Zeitraum [von, bis] (Tage inklusive). */
export function kennzahlen(data: Daten, bereich: Bereich, von: Tag, bis: Tag, periode: Periode = 'monat'): Kennzahlen {
  const rein = (iso: string | null | undefined) => { if (!iso) return false; const t = tagVon(iso); return t >= von && t <= bis; };
  const passt = (sparten: readonly string[]) => bereich === 'alle' || sparten.includes(bereich);
  const k: Kennzahlen = {
    gespraeche: 0, erreicht: 0, telefon: 0, hausbesuch: 0, ergebnisse: leereErgebnisse(), abschluesse: 0, abschlussquote: null,
    neueKunden: 0, notizen: 0, termine: 0, termineErledigt: 0, wiedervorlagen: 0, wiedervorlagenErledigt: 0,
    verleihe: 0, rueckgaben: 0, kaeufe: 0, kaufquote: null, verlauf: [],
    produkte: Object.fromEntries(MARKIERUNG_KEYS.map((m) => [m, 0])) as Record<Markierung, number>, topProdukte: [],
  };
  const interesse = new Map<string, number>();
  const abschnitte = verlaufAbschnitte(periode, von, bis);
  const imVerlauf = (iso: string, sparten: readonly string[]) => {
    const a = abschnitte.find((x) => x.passt(iso));
    if (!a) return;
    a.wert++;
    const gueltig = sparten.filter((s): s is Sparte => (SPARTEN_KEYS as readonly string[]).includes(s));
    if (!gueltig.length) a.je.ohne++;
    for (const s of new Set(gueltig)) a.je[s]++;
  };
  const gespraech = (iso: string, erreicht: boolean, ergebnis: Ausgang | '', art: string, sparten: readonly string[]) => {
    k.gespraeche++; imVerlauf(iso, sparten);
    if (erreicht) k.erreicht++;
    if (art === 'telefon') k.telefon++; else if (art === 'hausbesuch') k.hausbesuch++;
    if (ergebnis) k.ergebnisse[ergebnis]++;
  };

  for (const kd of data.kunden) {
    // Neu angelegt: zählt im Bereich, wenn der Kunde dort einen Status hat
    if (rein(kd.createdAt) && (bereich === 'alle' || kd.status[bereich] !== 'unbekannt')) k.neueKunden++;
    for (const n of kd.notizen) if (rein(n.zeitpunkt) && (bereich === 'alle' || n.sparten.includes(bereich))) k.notizen++;
    for (const c of kd.enpalKontakte) {
      if (bereich === 'vorwerk' || !rein(c.zeitpunkt)) continue;
      if (bereich !== 'alle' && !c.themen.includes(bereich)) continue;
      gespraech(c.zeitpunkt, c.erreicht, c.ergebnis, c.art, c.themen);
    }
    for (const g of kd.gespraeche) {
      if (!rein(g.zeitpunkt) || !passt([g.sparte])) continue;
      gespraech(g.zeitpunkt, true, g.ausgang, '', g.sparte ? [g.sparte] : []);
    }
    // Produkte: jüngste Markierung je Produkt innerhalb des Zeitraums
    const letzte = new Map<string, { name: string; markierung: string; zeitpunkt: string }>();
    for (const m of kd.produkte || []) {
      if (!rein(m.zeitpunkt) || !passt([m.bereich])) continue;
      const alt = letzte.get(m.produktId);
      if (!alt || m.zeitpunkt >= alt.zeitpunkt) letzte.set(m.produktId, m);
    }
    for (const m of letzte.values()) {
      if (!m.markierung) continue;
      k.produkte[m.markierung as Markierung]++;
      if (m.markierung === 'interesse') interesse.set(m.name, (interesse.get(m.name) || 0) + 1);
    }
  }
  k.topProdukte = [...interesse].map(([name, anzahl]) => ({ name, anzahl })).sort((a, b) => b.anzahl - a.anzahl || a.name.localeCompare(b.name, 'de')).slice(0, 5);
  k.abschluesse = k.ergebnisse.abschluss;
  k.abschlussquote = k.erreicht ? k.abschluesse / k.erreicht : null;

  for (const t of data.termine) {
    if (!rein(t.beginn) || (bereich !== 'alle' && t.sparte !== bereich)) continue;
    if (t.art === 'termin') { k.termine++; if (t.erledigt) k.termineErledigt++; } else { k.wiedervorlagen++; if (t.erledigt) k.wiedervorlagenErledigt++; }
  }

  if (bereich === 'alle' || bereich === 'vorwerk') {
    for (const l of data.leihvorgaenge) {
      if (rein(l.ausgabe)) { k.verleihe++; if (l.kaufinteresse === 'gekauft') k.kaeufe++; }
      if (rein(l.rueckgabe)) k.rueckgaben++;
    }
    k.kaufquote = k.verleihe ? k.kaeufe / k.verleihe : null;
  }
  k.verlauf = abschnitte.map(({ label, wert, je }) => ({ label, wert, je }));
  return k;
}

/** Abschnitte für den Verlauf: Tag = Stunden 7–20 Uhr (Rand gesammelt), Woche/Monat = Tage, Jahr/365 = Monate. */
function verlaufAbschnitte(periode: Periode, von: Tag, bis: Tag) {
  const out: { label: string; wert: number; je: VerlaufJe; passt: (iso: string) => boolean }[] = [];
  if (periode === 'tag') {
    for (let h = 7; h <= 20; h++) {
      out.push({ label: `${h}`, wert: 0, je: leerJe(), passt: (iso) => { const s = new Date(iso).getHours(); return h === 7 ? s <= 7 : h === 20 ? s >= 20 : s === h; } });
    }
  } else if (periode === 'm3') {
    // Wochenbalken (KW), erste/letzte Woche angeschnitten
    for (let t = wochenanfang(von); t <= bis; t = plusTage(t, 7)) {
      const start = t; const ende = plusTage(t, 6);
      out.push({ label: `KW ${kalenderwoche(t)}`, wert: 0, je: leerJe(), passt: (iso) => { const x = tagVon(iso); return x >= start && x <= ende; } });
    }
  } else if (periode === 'woche' || periode === 'monat' || periode === 'm1') {
    for (let t = von; t <= bis; t = plusTage(t, 1)) {
      const tag = t;
      out.push({ label: periode === 'woche' ? tagDatum(tag).toLocaleDateString('de-DE', { weekday: 'short' }) : periode === 'm1' && tagDatum(tag).getDate() === 1 ? `1.${tagDatum(tag).getMonth() + 1}.` : String(tagDatum(tag).getDate()), wert: 0, je: leerJe(), passt: (iso) => tagVon(iso) === tag });
    }
  } else {
    const start = tagDatum(von);
    for (let i = 0; i < 13; i++) {
      const m = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const schluessel = tagVon(m).slice(0, 7);
      if (`${schluessel}-01` > bis) break;
      out.push({ label: MONATE[m.getMonth()]!.slice(0, 3), wert: 0, je: leerJe(), passt: (iso) => tagVon(iso).slice(0, 7) === schluessel });
    }
  }
  return out;
}

/** Veränderung gegenüber dem Vorzeitraum, z. B. „+3“ oder „−12 %“. Quoten in Prozentpunkten. */
export function veraenderung(jetzt: number | null, vorher: number | null, quote = false): { text: string; richtung: 'auf' | 'ab' | 'gleich' } | null {
  if (jetzt === null || vorher === null) return null;
  const diff = quote ? Math.round((jetzt - vorher) * 100) : jetzt - vorher;
  if (diff === 0) return { text: '±0', richtung: 'gleich' };
  const zahl = `${diff > 0 ? '+' : '−'}${Math.abs(diff)}`;
  return { text: quote ? `${zahl} Pkt.` : zahl, richtung: diff > 0 ? 'auf' : 'ab' };
}

export const prozent = (q: number | null) => (q === null ? '–' : `${Math.round(q * 100)} %`);

/** Vollständiger Bericht inkl. Vorzeitraum. */
export function bericht(data: Daten, bereich: Bereich, periode: Periode, anker: Tag = tagVon(new Date())) {
  const z = zeitraum(periode, anker);
  const vz = vorzeitraum(periode, anker);
  return { bereich, periode, anker, zeitraum: z, vorzeitraum: vz, jetzt: kennzahlen(data, bereich, z.von, z.bis, periode), vorher: kennzahlen(data, bereich, vz.von, vz.bis, periode) };
}
export type Bericht = ReturnType<typeof bericht>;
