// Grober Amortisationsrechner für Photovoltaik und Wärmepumpe: „Ab wann hat sich die Anlage bezahlt gemacht?“
// Nur Orientierung mit vereinfachten, frei änderbaren Annahmen, ohne Gewähr. Keine Kundendaten, DOM-frei und testbar.

export const RECHNER_HINWEIS = 'Grobe Schätzung mit vereinfachten Annahmen, ohne Gewähr. Kein Angebot und keine Zusage. '
  + 'Tatsächliche Kosten, Erträge, Preise und Förderung weichen ab. Für eine belastbare Rechnung braucht es ein Angebot und eine Beratung vor Ort.';

export type Rechner = 'pv' | 'wp';

export interface Feld { key: string; label: string; einheit: string; min: number; max: number; schritt: number; hilfe?: string }

/** Ausführlichere Erklärung je Feld (hinter dem „?“ am Feld), in einfacher Sprache. */
export const ERKLAERUNG: Record<Rechner, Record<string, string>> = {
  pv: {
    investition: 'Was die Anlage komplett kostet: Module, Wechselrichter, Montage, Gerüst, Zähler und, falls gewünscht, Speicher. Am besten den Betrag aus dem Angebot nehmen. Privat fällt seit 2023 keine Mehrwertsteuer an.',
    leistung: 'Größe der Anlage in Kilowatt-Peak (kWp), also die Höchstleistung aller Module zusammen. Faustregel: etwa 5 bis 6 m² Dachfläche je kWp. Ein Einfamilienhaus hat meist 8 bis 12 kWp.',
    ertrag: 'Wie viel Strom 1 kWp im Jahr erzeugt. Hängt von Ausrichtung, Neigung und Schatten ab: Süddach eher 950 bis 1.000, Ost/West eher 800 bis 850, mit Schatten weniger. Der Rechner zieht pro Jahr 0,5 % für die Alterung der Module ab.',
    eigenverbrauch: 'Anteil des Solarstroms, den der Haushalt selbst nutzt, statt ihn einzuspeisen. Selbst genutzter Strom spart den teuren Bezugspreis, eingespeister bringt nur die Vergütung. Speicher, E-Auto oder Wärmepumpe erhöhen den Anteil.',
    strompreis: 'Was eine Kilowattstunde Strom heute kostet (Arbeitspreis, ohne Grundgebühr). Steht auf der Stromrechnung. Je höher der Preis, desto mehr spart jede selbst genutzte Kilowattstunde.',
    verguetung: 'Geld je eingespeister Kilowattstunde, 20 Jahre lang fest. Gilt der Satz zum Tag der Inbetriebnahme. Für neue Anlagen ab 2027 ist sie noch offen, Details unter Förderung.',
    steigerung: 'Um wie viel Prozent der Strompreis jedes Jahr steigt. Niemand weiß das genau. 2 % ist eine vorsichtige Annahme; mit 0 sieht man, wie es ohne Preissteigerung aussähe.',
    betrieb: 'Kosten pro Jahr für den Betrieb: Versicherung, Wartung, Zählermiete, ab und zu Reinigung. Rücklagen für einen neuen Wechselrichter nach 12 bis 15 Jahren gehören auch hier hinein.',
    zuschuss: 'Geld, das es zur Anlage dazugibt, z. B. von der Gemeinde oder dem Land. Wird von der Anschaffung abgezogen. Für Privatleute gibt es derzeit selten einen Zuschuss.',
    jahre: 'Über wie viele Jahre gerechnet wird. Module halten meist 25 bis 30 Jahre. Die Einspeisevergütung gibt es nur 20 Jahre, danach rechnet der Rechner ohne sie weiter.',
  },
  wp: {
    investition: 'Was die Wärmepumpe komplett kostet: Gerät, Einbau, Elektrik, Ausbau der alten Heizung und nötige Umbauten an Heizkörpern. Am besten den Betrag aus dem Angebot nehmen.',
    foerderung: 'Zuschuss der KfW in Prozent: 30 % Grundförderung, dazu je nach Fall Klimageschwindigkeits- und Einkommensbonus, zusammen höchstens 80 %. Gefördert werden höchstens 28.000 € Kosten. Details unter Förderung.',
    sowieso: 'Geld, das der Kunde ohnehin ausgeben müsste, auch ohne Wärmepumpe, z. B. weil die alte Heizung kaputt ist und eine neue Gasheizung etwa 12.000 € kosten würde. Wird abgezogen, gezählt wird dann nur der Mehrpreis. Läuft die alte Heizung noch, bleibt es bei 0.',
    waermebedarf: 'Wie viel Wärme das Haus im Jahr braucht (Heizen und Warmwasser). Ungefähr: bisheriger Gasverbrauch in kWh mal Wirkungsgrad, bei Öl Liter mal 10 mal Wirkungsgrad. Kommt der Rechner aus der Kundenkartei, rechnet er das selbst aus.',
    brennstoffpreis: 'Was eine Kilowattstunde Gas oder Öl heute kostet. Gas: steht auf der Rechnung. Öl: Literpreis durch 10, also 1,10 € je Liter ≈ 11 ct/kWh.',
    wirkungsgrad: 'Wie viel der eingekauften Energie die alte Heizung als Wärme ins Haus bringt. Neue Brennwertkessel etwa 95 %, ältere Kessel 80 bis 90 %, sehr alte eher weniger.',
    jaz: 'Jahresarbeitszahl: wie viel Wärme die Wärmepumpe aus 1 kWh Strom macht, übers Jahr gemittelt. 3,5 heißt: aus 1 kWh Strom werden 3,5 kWh Wärme. Fußbodenheizung und gute Dämmung bringen mehr, alte Heizkörper eher 3.',
    wpstrompreis: 'Strompreis für die Wärmepumpe. Viele Versorger haben günstigere Wärmepumpentarife (eigener Zähler). Ohne eigenen Tarif den normalen Strompreis eintragen.',
    steigerungFossil: 'Um wie viel Prozent Gas oder Öl jedes Jahr teurer werden. Der CO2-Preis steigt planmäßig, und ab 2029 muss Bio-Anteil beigemischt werden. Deshalb ist die Annahme hier höher als beim Strom.',
    steigerungStrom: 'Um wie viel Prozent der Strom für die Wärmepumpe jedes Jahr teurer wird. 2 % ist eine vorsichtige Annahme.',
    wartungAlt: 'Was die alte Heizung pro Jahr nebenbei kostet: Wartung, Schornsteinfeger, bei Gas auch die Grundgebühr. Fällt mit der Wärmepumpe weg.',
    wartungWp: 'Was die Wärmepumpe pro Jahr nebenbei kostet: Wartung, ggf. Zählergebühr für den Wärmepumpentarif.',
    jahre: 'Über wie viele Jahre gerechnet wird. Wärmepumpen halten meist 15 bis 20 Jahre.',
  },
};

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

/** Was aus der Kundenkartei in den Rechner übernommen wurde (Werte + lesbare Liste). */
export interface Uebernahme<T> { werte: Partial<T>; liste: string[] }

const zahlOk = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const feldVon = (felder: Feld[], key: string) => felder.find((f) => f.key === key)!;
const imRahmen = (f: Feld, n: number) => n >= f.min && n <= f.max;

/**
 * Annahmen aus den Angaben beim Kunden (Photovoltaik-Bogen: Strompreis, Speicher).
 * Nur Werte, die sicher passen; der Rest bleibt bei den Beispielwerten. Wird nirgends gespeichert.
 */
export function pvAusKunde(angaben: Record<string, unknown> | null | undefined): Uebernahme<PvAnnahmen> {
  const a = angaben || {};
  const werte: Partial<PvAnnahmen> = {}; const liste: string[] = [];
  if (zahlOk(a.strompreis) && imRahmen(feldVon(PV_FELDER, 'strompreis'), a.strompreis)) {
    werte.strompreis = a.strompreis; liste.push(`Strompreis ${a.strompreis.toLocaleString('de-DE')} ct/kWh`);
  }
  if (a.speicher === true) { werte.eigenverbrauch = 60; liste.push('Speicher gewünscht: Eigenverbrauch 60 %'); }
  return { werte, liste };
}

/** kWh Brennstoff aus Menge und Einheit (Gas: 1 m³ ≈ 10 kWh, Heizöl: 1 Liter ≈ 10 kWh). */
function brennstoffKwh(menge: number, einheit: unknown, art: string): number | null {
  if (einheit === 'kWh') return menge;
  if (einheit === 'Liter' && art === 'Öl') return menge * 10;
  if (einheit === 'm³' && art === 'Gas') return menge * 10;
  return null;
}

/**
 * Annahmen aus dem Wärmepumpen-Bogen: Wärmebedarf aus dem bisherigen Gas- oder Ölverbrauch,
 * Brennstoffpreis aus den Heizkosten. Nur für Gas- und Ölheizungen, sonst passt der Vergleich nicht.
 */
export function wpAusKunde(angaben: Record<string, unknown> | null | undefined): Uebernahme<WpAnnahmen> {
  const a = angaben || {};
  const werte: Partial<WpAnnahmen> = {}; const liste: string[] = [];
  const art = a.heizungsart === 'Gas' || a.heizungsart === 'Öl' ? a.heizungsart : '';
  if (!art || !zahlOk(a.verbrauchMenge)) return { werte, liste };
  const kwh = brennstoffKwh(a.verbrauchMenge, a.verbrauchEinheit, art);
  if (kwh === null) return { werte, liste };
  const bedarf = Math.round((kwh * (WP_STANDARD.wirkungsgrad / 100)) / 500) * 500;
  if (imRahmen(feldVon(WP_FELDER, 'waermebedarf'), bedarf)) {
    werte.waermebedarf = bedarf;
    liste.push(`Wärmebedarf aus ${a.verbrauchMenge.toLocaleString('de-DE')} ${String(a.verbrauchEinheit)} ${art} im Jahr`);
  }
  if (zahlOk(a.heizkosten)) {
    const ct = Math.round((a.heizkosten / kwh) * 1000) / 10;
    if (imRahmen(feldVon(WP_FELDER, 'brennstoffpreis'), ct)) {
      werte.brennstoffpreis = ct; liste.push(`${art}preis ${ct.toLocaleString('de-DE')} ct/kWh aus ${euro(a.heizkosten)} Heizkosten`);
    }
  }
  return { werte, liste };
}
