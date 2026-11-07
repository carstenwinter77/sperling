// Grober Amortisationsrechner für Photovoltaik und Wärmepumpe: „Ab wann hat sich die Anlage bezahlt gemacht?“
// Nur Orientierung mit vereinfachten, frei änderbaren Annahmen, ohne Gewähr. Keine Kundendaten, DOM-frei und testbar.

export const RECHNER_HINWEIS = 'Grobe Schätzung mit vereinfachten Annahmen, ohne Gewähr. Kein Angebot und keine Zusage. '
  + 'Tatsächliche Kosten, Erträge, Preise und Förderung weichen ab. Für eine belastbare Rechnung braucht es ein Angebot und eine Beratung vor Ort.';

export type Rechner = 'pv' | 'wp';

export interface Feld { key: string; label: string; einheit: string; min: number; max: number; schritt: number; hilfe?: string }

/** PV: Annahmen (alles änderbar). */
export const PV_STANDARD = {
  investition: 18000, // € brutto, Anlage mit Montage (0 % USt)
  leistung: 10, // kWp
  ertrag: 900, // kWh je kWp und Jahr, grob für Niedersachsen
  eigenverbrauch: 35, // % des Solarstroms, den man selbst nutzt (ohne Speicher eher 25–35, mit Speicher eher 50–70)
  strompreis: 35, // ct/kWh, heutiger Bezugspreis
  verguetung: 7.7, // ct/kWh, Einspeisevergütung (Inbetriebnahme bis 31.12.2026)
  steigerung: 2, // % Strompreissteigerung pro Jahr
  betrieb: 150, // €/Jahr für Versicherung, Wartung, Zähler
  zuschuss: 0, // € Zuschüsse, falls vorhanden
  jahre: 25,
};
export type PvAnnahmen = typeof PV_STANDARD;

export const PV_FELDER: Feld[] = [
  { key: 'investition', label: 'Anschaffung', einheit: '€', min: 0, max: 200000, schritt: 500, hilfe: 'Gesamtpreis mit Montage, Speicher und Zähler' },
  { key: 'leistung', label: 'Leistung', einheit: 'kWp', min: 0.5, max: 100, schritt: 0.5 },
  { key: 'ertrag', label: 'Ertrag je kWp', einheit: 'kWh/Jahr', min: 500, max: 1300, schritt: 10, hilfe: 'In Niedersachsen meist 850 bis 1.000' },
  { key: 'eigenverbrauch', label: 'Eigenverbrauch', einheit: '%', min: 0, max: 100, schritt: 1, hilfe: 'Ohne Speicher etwa 25 bis 35 %, mit Speicher etwa 50 bis 70 %' },
  { key: 'strompreis', label: 'Strompreis heute', einheit: 'ct/kWh', min: 0, max: 100, schritt: 0.5, hilfe: 'Arbeitspreis laut eigener Stromrechnung' },
  { key: 'verguetung', label: 'Einspeisevergütung', einheit: 'ct/kWh', min: 0, max: 30, schritt: 0.01, hilfe: 'Für Anlagen ab 2027 noch offen, siehe EEG-Reform' },
  { key: 'steigerung', label: 'Strompreis steigt um', einheit: '% pro Jahr', min: -5, max: 15, schritt: 0.5 },
  { key: 'betrieb', label: 'Laufende Kosten', einheit: '€/Jahr', min: 0, max: 5000, schritt: 10, hilfe: 'Versicherung, Wartung, Zähler' },
  { key: 'zuschuss', label: 'Zuschuss', einheit: '€', min: 0, max: 100000, schritt: 100 },
  { key: 'jahre', label: 'Betrachtung', einheit: 'Jahre', min: 5, max: 30, schritt: 1 },
];

/** Wärmepumpe: Annahmen (alles änderbar). Vergleich mit dem Weiterheizen mit Gas oder Öl. */
export const WP_STANDARD = {
  investition: 30000, // € brutto mit Einbau
  foerderung: 50, // % Zuschuss (KfW 458: 30 bis 80 %)
  sowieso: 0, // € Kosten, die ohnehin anfallen würden (z. B. neue Gasheizung)
  waermebedarf: 20000, // kWh Wärme pro Jahr
  brennstoffpreis: 11, // ct/kWh Gas bzw. Öl, inkl. CO2-Preis
  wirkungsgrad: 90, // % der alten Heizung
  jaz: 3.5, // Jahresarbeitszahl der Wärmepumpe
  wpstrompreis: 28, // ct/kWh Wärmepumpentarif
  steigerungFossil: 4, // % pro Jahr (Bio-Anteil, CO2-Preis)
  steigerungStrom: 2, // % pro Jahr
  wartungAlt: 250, // €/Jahr Wartung, Schornsteinfeger
  wartungWp: 150, // €/Jahr
  jahre: 20,
};
export type WpAnnahmen = typeof WP_STANDARD;
/** Förderfähige Kosten erste Wohneinheit KfW 458 (seit 21.07.2026). */
export const WP_FOERDER_HOECHST = 28000;

export const WP_FELDER: Feld[] = [
  { key: 'investition', label: 'Anschaffung', einheit: '€', min: 0, max: 150000, schritt: 500, hilfe: 'Wärmepumpe mit Einbau und Nebenarbeiten' },
  { key: 'foerderung', label: 'Zuschuss', einheit: '%', min: 0, max: 80, schritt: 1, hilfe: 'KfW 458: 30 bis 80 %, auf höchstens 28.000 € Kosten' },
  { key: 'sowieso', label: 'Ohnehin fällig', einheit: '€', min: 0, max: 60000, schritt: 500, hilfe: 'Muss die alte Heizung sowieso ersetzt werden: Kosten einer neuen Gas- oder Ölheizung' },
  { key: 'waermebedarf', label: 'Wärmebedarf', einheit: 'kWh/Jahr', min: 1000, max: 100000, schritt: 500, hilfe: 'Etwa der bisherige Gasverbrauch in kWh, mal Wirkungsgrad' },
  { key: 'brennstoffpreis', label: 'Gas- bzw. Ölpreis', einheit: 'ct/kWh', min: 0, max: 50, schritt: 0.5, hilfe: '1 Liter Heizöl ≈ 10 kWh' },
  { key: 'wirkungsgrad', label: 'Wirkungsgrad alte Heizung', einheit: '%', min: 50, max: 110, schritt: 1 },
  { key: 'jaz', label: 'Jahresarbeitszahl', einheit: '', min: 1.5, max: 6, schritt: 0.1, hilfe: 'Gut geplant im Bestand meist 3 bis 4' },
  { key: 'wpstrompreis', label: 'Strompreis Wärmepumpe', einheit: 'ct/kWh', min: 0, max: 80, schritt: 0.5 },
  { key: 'steigerungFossil', label: 'Gas/Öl steigt um', einheit: '% pro Jahr', min: -5, max: 20, schritt: 0.5, hilfe: 'CO2-Preis und Bio-Anteil machen Gas und Öl eher teurer' },
  { key: 'steigerungStrom', label: 'Strom steigt um', einheit: '% pro Jahr', min: -5, max: 15, schritt: 0.5 },
  { key: 'wartungAlt', label: 'Wartung alte Heizung', einheit: '€/Jahr', min: 0, max: 3000, schritt: 10 },
  { key: 'wartungWp', label: 'Wartung Wärmepumpe', einheit: '€/Jahr', min: 0, max: 3000, schritt: 10 },
  { key: 'jahre', label: 'Betrachtung', einheit: 'Jahre', min: 5, max: 30, schritt: 1 },
];

export interface Ergebnis {
  /** Eigener Anteil an der Anschaffung (nach Zuschuss, abzüglich „ohnehin fällig“). */
  eigenanteil: number;
  /** Vorteil je Jahr (Index 0 = Jahr 1). */
  jahr: number[];
  /** Stand nach Jahr n (Index 0 = Jahr 1), beginnt bei -eigenanteil. */
  kumuliert: number[];
  /** Jahr, in dem die Anlage sich bezahlt gemacht hat (mit Kommastelle), null wenn nicht im Zeitraum. */
  amortisation: number | null;
  /** Stand am Ende des Zeitraums. */
  ende: number;
  vorteilJahr1: number;
}

/** Eingabe lesen: deutsche Schreibweise („15.000“, „7,7“), Grenzen beachten. Ungültig → Standardwert. */
export function zahlLesen(eingabe: unknown, feld: Feld, standard: number): number {
  let s = String(eingabe ?? '').trim().replace(/\s|€|%/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = s === '' ? NaN : Number(s);
  if (!Number.isFinite(n)) return standard;
  return Math.min(feld.max, Math.max(feld.min, n));
}

function auswerten(eigenanteil: number, jahr: number[]): Ergebnis {
  const kumuliert: number[] = [];
  let stand = -eigenanteil;
  let amortisation: number | null = eigenanteil <= 0 ? 0 : null;
  jahr.forEach((v, i) => {
    const vorher = stand;
    stand += v;
    kumuliert.push(stand);
    if (amortisation === null && vorher < 0 && stand >= 0) amortisation = i + (v > 0 ? -vorher / v : 1);
  });
  return { eigenanteil, jahr, kumuliert, amortisation, ende: stand, vorteilJahr1: jahr[0] ?? 0 };
}

const ganzJahre = (n: number) => Math.max(1, Math.min(30, Math.round(n)));

/** PV: Ersparnis durch Eigenverbrauch + Einspeisevergütung (20 Jahre) − laufende Kosten. Ertrag sinkt 0,5 % pro Jahr. */
export function rechnePv(a: PvAnnahmen): Ergebnis {
  const jahre = ganzJahre(a.jahre);
  const werte: number[] = [];
  for (let t = 0; t < jahre; t++) {
    const kwh = a.leistung * a.ertrag * Math.pow(1 - 0.005, t);
    const eigen = kwh * (a.eigenverbrauch / 100);
    const ersparnis = eigen * (a.strompreis / 100) * Math.pow(1 + a.steigerung / 100, t);
    const einspeisung = t < 20 ? (kwh - eigen) * (a.verguetung / 100) : 0;
    werte.push(ersparnis + einspeisung - a.betrieb);
  }
  return auswerten(a.investition - a.zuschuss, werte);
}

/** Zuschuss in € für die Wärmepumpe (Prozent auf höchstens 28.000 € Kosten). */
export function wpZuschuss(a: Pick<WpAnnahmen, 'investition' | 'foerderung'>): number {
  return Math.min(a.investition, WP_FOERDER_HOECHST) * (a.foerderung / 100);
}

/** WP: eingesparte Brennstoff- und Wartungskosten − Strom- und Wartungskosten der Wärmepumpe. */
export function rechneWp(a: WpAnnahmen): Ergebnis {
  const jahre = ganzJahre(a.jahre);
  const werte: number[] = [];
  for (let t = 0; t < jahre; t++) {
    const alt = (a.waermebedarf / (a.wirkungsgrad / 100)) * (a.brennstoffpreis / 100) * Math.pow(1 + a.steigerungFossil / 100, t) + a.wartungAlt;
    const neu = (a.waermebedarf / a.jaz) * (a.wpstrompreis / 100) * Math.pow(1 + a.steigerungStrom / 100, t) + a.wartungWp;
    werte.push(alt - neu);
  }
  return auswerten(a.investition - wpZuschuss(a) - a.sowieso, werte);
}

/** „Bei welcher Anschaffungssumme?“: Amortisation für mehrere Anschaffungspreise rund um den eingegebenen Wert. */
export function staffel(rechner: Rechner, a: PvAnnahmen | WpAnnahmen, faktoren = [0.7, 0.85, 1, 1.15, 1.3]): { investition: number; ergebnis: Ergebnis }[] {
  return faktoren.map((f) => {
    const investition = Math.round((a.investition * f) / 500) * 500;
    const ergebnis = rechner === 'pv' ? rechnePv({ ...(a as PvAnnahmen), investition }) : rechneWp({ ...(a as WpAnnahmen), investition });
    return { investition, ergebnis };
  });
}

/** Höchster Anschaffungspreis (auf 500 € gerundet), bei dem sich die Anlage innerhalb von `jahre` Jahren bezahlt macht. */
export function hoechstpreis(rechner: Rechner, a: PvAnnahmen | WpAnnahmen, jahre: number): number {
  let lo = 0; let hi = 300000;
  const ok = (inv: number) => {
    const e = rechner === 'pv' ? rechnePv({ ...(a as PvAnnahmen), investition: inv, jahre: Math.max(jahre, a.jahre) }) : rechneWp({ ...(a as WpAnnahmen), investition: inv, jahre: Math.max(jahre, a.jahre) });
    return e.amortisation !== null && e.amortisation <= jahre;
  };
  if (!ok(0)) return 0;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
  return Math.floor(lo / 500) * 500;
}

export const euro = (n: number) => `${Math.round(n).toLocaleString('de-DE')} €`;
export const jahreText = (n: number | null) => (n === null ? 'nicht im Zeitraum' : n === 0 ? 'sofort' : `nach etwa ${n.toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} Jahren`);

/** Text zum Weiterleiten mit allen Annahmen und dem Hinweis. */
export function rechnerText(rechner: Rechner, a: PvAnnahmen | WpAnnahmen, e: Ergebnis): string {
  const felder = rechner === 'pv' ? PV_FELDER : WP_FELDER;
  const zeilen = [
    rechner === 'pv' ? 'Grobe Amortisation Photovoltaik' : 'Grobe Amortisation Wärmepumpe (Vergleich mit Weiterheizen mit Gas/Öl)',
    '',
    `Eigenanteil: ${euro(e.eigenanteil)}${rechner === 'wp' ? ` (Zuschuss ${euro(wpZuschuss(a as WpAnnahmen))})` : ''}`,
    `Vorteil im 1. Jahr: ${euro(e.vorteilJahr1)}`,
    `Bezahlt gemacht: ${jahreText(e.amortisation)}`,
    `Stand nach ${e.kumuliert.length} Jahren: ${euro(e.ende)}`,
    '',
    'Annahmen:',
    ...felder.map((f) => `– ${f.label}: ${((a as Record<string, number>)[f.key]).toLocaleString('de-DE')}${f.einheit ? ` ${f.einheit}` : ''}`),
    '',
    `Hinweis: ${RECHNER_HINWEIS}`,
  ];
  return zeilen.join('\n');
}
