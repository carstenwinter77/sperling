// Sperling – Datenmodell, Feldkatalog, Normalisierung und Migration.
// Siehe docs/DATENMODELL.md. Jede Änderung am Modell: SCHEMA_VERSION erhöhen,
// Migration in migrate() ergänzen, Doku + Tests aktualisieren.

import { type Rec, uid, nowIso, isValidDate, parseNumber, isValidCoord } from './util.ts';
import { normalizeFeldEinstellungen, normalizeEigeneWerte } from './felder.ts';
import { normalizeProduktMarkierung, type ProduktMarkierung } from './produkte.ts';
import { normalizeBausteine } from './bausteine.ts';
import { normalizeFotoListe } from './fotos.ts';
import { normalizeRechnerVorlagen } from './rechnervorlagen.ts';
import { normalizeAngebot, normalizeAuftrag, normalizeNachfassTage, normalizeBereitlegen, normalizeAnsprechpartner, normalizeHaustuer, ANGEBOTE_MAX, ANSPRECHPARTNER_MAX, HAUSTUER_MAX, type HaustuerEintrag } from './vertrieb.ts';

export const SCHEMA_VERSION = 9;

/** Die drei Geschäftszweige, jeder mit eigenem Anbieter und eigenem Textgenerator (R-TEXT). */
export const SPARTEN = {
  pv: { key: 'pv', label: 'Photovoltaik', kurz: 'PV', anbieter: 'Enpal' },
  wp: { key: 'wp', label: 'Wärmepumpe', kurz: 'WP', anbieter: 'GALVANY' },
  vorwerk: { key: 'vorwerk', label: 'Vorwerk', kurz: 'VW', anbieter: 'Vorwerk' },
};
export type Sparte = keyof typeof SPARTEN;
export const SPARTEN_KEYS = Object.keys(SPARTEN) as Sparte[];

/** Status pro Sparte. Reihenfolge = Reihenfolge in Auswahllisten. */
export const STATUS = {
  unbekannt: { label: 'Unbekannt', farbe: '#9aa3ad' },
  potenzial: { label: 'Potenzial (vermutet)', farbe: '#f2b01e' },
  interesse: { label: 'Interesse', farbe: '#2b8be6' },
  termin: { label: 'Termin vereinbart', farbe: '#7a5af5' },
  angebot: { label: 'Angebot erstellt', farbe: '#e66b2b' },
  abschluss: { label: 'Abschluss / Kunde', farbe: '#2fa84f' },
  kein_interesse: { label: 'Kein Interesse', farbe: '#d64545' },
};
export type StatusKey = keyof typeof STATUS;
export const STATUS_KEYS = Object.keys(STATUS) as StatusKey[];

/** Status eines Markers auf der Karte (wichtigster Status über alle Sparten). */
const STATUS_PRIO = ['abschluss', 'angebot', 'termin', 'interesse', 'potenzial', 'kein_interesse', 'unbekannt'];
export function hauptStatus(kunde: { status?: Partial<Record<Sparte, string>> } | null | undefined): string {
  const vals = SPARTEN_KEYS.map((s) => kunde?.status?.[s] ?? 'unbekannt');
  for (const p of STATUS_PRIO) if (vals.includes(p)) return p;
  return 'unbekannt';
}

/**
 * Feldkatalog der Erfassungsbögen. Die UI rendert Formulare daraus,
 * die Textgeneratoren nutzen Label/Einheit. Typen: text, number, select, bool, textarea.
 */
export interface Feld { key: string; label: string; type: 'text' | 'number' | 'select' | 'bool' | 'textarea'; unit?: string; options?: string[] }
export const FELDER: Record<Sparte, Feld[]> = {
  pv: [
    { key: 'dachflaeche', label: 'Nutzbare Dachfläche', type: 'number', unit: 'm²' },
    { key: 'ausrichtung', label: 'Dachausrichtung', type: 'select', options: ['Süd', 'Süd-West', 'Süd-Ost', 'West', 'Ost', 'Ost/West', 'Nord'] },
    { key: 'neigung', label: 'Dachneigung', type: 'number', unit: '°' },
    { key: 'dachform', label: 'Dachform', type: 'select', options: ['Satteldach', 'Walmdach', 'Pultdach', 'Flachdach', 'Mansarddach', 'Zeltdach', 'Sonstiges'] },
    { key: 'eindeckung', label: 'Dacheindeckung', type: 'select', options: ['Ziegel', 'Betondachstein', 'Schiefer', 'Blech/Trapez', 'Bitumen', 'Eternit (prüfen!)', 'Sonstiges'] },
    { key: 'dachzustand', label: 'Dachzustand / Alter', type: 'text' },
    { key: 'verschattung', label: 'Verschattung', type: 'select', options: ['Keine', 'Gering', 'Mittel', 'Stark'] },
    { key: 'stromverbrauch', label: 'Jahresstromverbrauch', type: 'number', unit: 'kWh' },
    { key: 'strompreis', label: 'Aktueller Strompreis', type: 'number', unit: 'ct/kWh' },
    { key: 'personen', label: 'Personen im Haushalt', type: 'number' },
    { key: 'eauto', label: 'E-Auto vorhanden/geplant', type: 'bool' },
    { key: 'wallbox', label: 'Wallbox gewünscht', type: 'bool' },
    { key: 'speicher', label: 'Batteriespeicher gewünscht', type: 'bool' },
    { key: 'zaehlerschrank', label: 'Zählerschrank (Zustand/Alter)', type: 'text' },
    { key: 'bestandsanlage', label: 'Bestehende PV-Anlage', type: 'text' },
    { key: 'bemerkung', label: 'Bemerkung PV', type: 'textarea' },
  ],
  wp: [
    { key: 'heizungsart', label: 'Aktuelle Heizung', type: 'select', options: ['Gas', 'Öl', 'Nachtspeicher', 'Pellets', 'Holz/Kamin', 'Fernwärme', 'Wärmepumpe (alt)', 'Sonstiges'] },
    { key: 'heizungBaujahr', label: 'Baujahr Heizung', type: 'number' },
    { key: 'verbrauchMenge', label: 'Jahresverbrauch Heizung', type: 'number' },
    { key: 'verbrauchEinheit', label: 'Einheit Verbrauch', type: 'select', options: ['kWh', 'Liter', 'm³', 'kg', 'Raummeter'] },
    { key: 'heizkosten', label: 'Heizkosten pro Jahr', type: 'number', unit: '€' },
    { key: 'wohnflaeche', label: 'Beheizte Wohnfläche', type: 'number', unit: 'm²' },
    { key: 'hausBaujahr', label: 'Baujahr Haus', type: 'number' },
    { key: 'daemmung', label: 'Dämmzustand', type: 'select', options: ['Unsaniert', 'Teilsaniert', 'Saniert', 'Neubau-Standard'] },
    { key: 'fenster', label: 'Fenster', type: 'select', options: ['Einfachverglasung', 'Zweifach', 'Dreifach'] },
    { key: 'waermeverteilung', label: 'Wärmeverteilung', type: 'select', options: ['Heizkörper', 'Fußbodenheizung', 'Gemischt'] },
    { key: 'warmwasser', label: 'Warmwasser über Heizung', type: 'bool' },
    { key: 'aufstellort', label: 'Möglicher Aufstellort Außengerät', type: 'text' },
    { key: 'bemerkung', label: 'Bemerkung Wärmepumpe', type: 'textarea' },
  ],
  vorwerk: [
    { key: 'interesseAn', label: 'Interesse an', type: 'select', options: ['Kobold Staubsauger', 'Kobold Saugroboter', 'Kobold Saug-Wischer', 'Zubehör/Service', 'Sonstiges'] },
    { key: 'vorhandenesGeraet', label: 'Vorhandenes Gerät', type: 'text' },
    { key: 'bodenbelaege', label: 'Bodenbeläge', type: 'text' },
    { key: 'flaeche', label: 'Zu reinigende Fläche', type: 'number', unit: 'm²' },
    { key: 'haustiere', label: 'Haustiere', type: 'bool' },
    { key: 'allergien', label: 'Allergiker im Haushalt', type: 'bool' },
    { key: 'vorfuehrung', label: 'Vorführung gewünscht', type: 'bool' },
    { key: 'bemerkung', label: 'Bemerkung Vorwerk', type: 'textarea' },
  ],
};

const ENPAL_ALT = `Kundenanfrage {{sparten}}

Kunde: {{name}}
Adresse: {{adresse}}
Telefon: {{telefon}}
E-Mail: {{email}}

{{daten}}

Gesprächsnotizen:
{{notizen}}

Viele Grüße
{{absender}}`;

export const DEFAULT_VORLAGEN = {
  pv:
`Kundenanfrage Photovoltaik

Kunde: {{name}}
Adresse: {{adresse}}
Telefon: {{telefon}}
E-Mail: {{email}}

{{daten}}

Gesprächsnotizen:
{{notizen}}

Viele Grüße
{{absender}}`,
  wp:
`Kundenanfrage Wärmepumpe

Kunde: {{name}}
Adresse: {{adresse}}
Telefon: {{telefon}}
E-Mail: {{email}}

{{daten}}

Gesprächsnotizen:
{{notizen}}

Viele Grüße
{{absender}}`,
  vorwerk:
`Vorwerk – Kundeninfo

Kunde: {{name}}
Adresse: {{adresse}}
Telefon: {{telefon}}
E-Mail: {{email}}

{{daten}}

Gesprächsnotizen:
{{notizen}}

Viele Grüße
{{absender}}`,
};

export function emptyData(): Daten {
  return {
    schemaVersion: SCHEMA_VERSION,
    kunden: [],
    termine: [],
    einstellungen: defaultEinstellungen(),
    // Vorführbestand im Auto (Vorwerk) und Verleih; Lieferschein-PDF folgt in Version 2
    geraete: [],
    leihvorgaenge: [],
    // Reservierungen von Vorführgeräten für künftige Termine (ab Schema 3)
    reservierungen: [],
    // Gelöschtes, bleibt bis zum endgültigen Löschen (ab Schema 3)
    papierkorb: [],
    // Verbrauchsmaterial mit Anzahl und Mindestbestand (ab 0.10.14, ohne Schemawechsel ergänzt)
    material: [],
    // Schlüssel für die Kundenfotos (ab 0.10.16): ID -> AES-Schlüssel (Base64), nur im verschlüsselten Bestand
    fotoSchluessel: {},
  };
}

export function defaultEinstellungen(): Einstellungen {
  return normalizeEinstellungen({});
}

/** Was die Kundenansicht zum Herzeigen zeigen darf (Einstellungen). Standard = Verhalten bis 0.8.0. */
export const KUNDENANSICHT_TEILE = {
  kontakt: { label: 'Telefon und E-Mail', standard: false },
  pv: { label: 'Angaben Photovoltaik', standard: true },
  wp: { label: 'Angaben Wärmepumpe', standard: true },
  vorwerk: { label: 'Angaben Vorwerk', standard: true },
  bemerkungen: { label: 'Interne Bemerkungen in den Angaben', standard: false },
  status: { label: 'Interesse/Status je Bereich', standard: false },
  geraete: { label: 'Geliehene Geräte', standard: true },
  termine: { label: 'Kommende Termine', standard: false },
  notizen: { label: 'Gesprächsnotizen und Gesprächsverlauf', standard: false },
};
export type KundenansichtTeil = keyof typeof KUNDENANSICHT_TEILE;

/** Wählbare Umkreise für Nachbarn (Meter). */
export const NACHBAR_RADIEN = [100, 200, 300, 500, 1000, 2000, 5000, 10000, 20000, 50000];
export const radiusText = (m: number) => (m >= 1000 ? `${m / 1000} km` : `${m} m`);

const STANDARD_EINSTELLUNGEN = {
  vorlagen: DEFAULT_VORLAGEN,
  karte: { lat: 51.1657, lng: 10.4515, zoom: 6 },
  autoSperreMin: 15,
  // Empfänger für „Per E-Mail senden“ und Navigations-App (auto = Apple Karten auf Apple-Geräten) stehen in normalizeEinstellungen()
};

export function neuerKunde(partial: Rec = {}) {
  const t = nowIso();
  return normalizeKunde({ id: uid(), createdAt: t, updatedAt: t, ...partial });
}

export function neueNotiz(partial: Rec = {}) {
  const t = nowIso();
  return normalizeNotiz({ id: uid(), zeitpunkt: t, createdAt: t, updatedAt: t, text: '', sparten: [], ...partial });
}

/** Ergebnis eines Verkaufsgesprächs (Gesprächsleitfaden). */
export const AUSGANG = {
  termin: 'Termin vereinbart',
  test: 'Gerät zum Testen da gelassen',
  angebot: 'Angebot / Berechnung gewünscht',
  abschluss: 'Abschluss',
  wiedervorlage: 'Wiedervorlage vereinbart',
  ueberlegen: 'Will es sich überlegen',
  kein: 'Kein Interesse',
};

/** Gespräch mit Einwandbehandlung – immer genau EINE Sparte (R-TEXT). */
export function normalizeGespraech(g: unknown) {
  const src: Rec = g && typeof g === 'object' ? g : {};
  const t = nowIso();
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    zeitpunkt: isValidDate(src.zeitpunkt) ? new Date(src.zeitpunkt).toISOString() : t,
    sparte: (SPARTEN_KEYS.includes(src.sparte) ? src.sparte : 'pv') as Sparte,
    einwaende: Array.isArray(src.einwaende)
      ? src.einwaende.filter((e) => e && typeof e === 'object').map((e) => ({
        id: str(e.id, 50), text: str(e.text, 300), ergebnis: (['ueberzeugt', 'offen', 'bleibt'].includes(e.ergebnis) ? e.ergebnis : 'offen') as 'ueberzeugt' | 'offen' | 'bleibt',
      }))
      : [],
    ausgang: (src.ausgang in AUSGANG ? src.ausgang : '') as keyof typeof AUSGANG | '',
    naechsterSchritt: str(src.naechsterSchritt, 1000),
    notiz: str(src.notiz, 5000),
  };
}

/** Kontaktart für die Enpal-Gesprächsdokumentation. */
export const KONTAKTART = {
  telefon: 'Telefonische Kontaktaufnahme',
  hausbesuch: 'Hausbesuch',
  sonstiges: 'Sonstiger Kontakt',
};

/**
 * Enpal-Gesprächsdokumentation (Lead-Nachweis für die Enpal-App).
 * Enthält nur PV/WP-Themen (R-TEXT), nie Vorwerk.
 */
export function normalizeEnpalKontakt(c: unknown) {
  const src: Rec = c && typeof c === 'object' ? c : {};
  const t = nowIso();
  const themen: ('pv' | 'wp')[] = Array.isArray(src.themen) ? [...new Set<'pv' | 'wp'>(src.themen.filter((x: unknown) => x === 'pv' || x === 'wp'))] : [];
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    zeitpunkt: isValidDate(src.zeitpunkt) ? new Date(src.zeitpunkt).toISOString() : t,
    art: (src.art in KONTAKTART ? src.art : 'telefon') as keyof typeof KONTAKTART,
    erreicht: src.erreicht !== false,
    gespraechspartner: str(src.gespraechspartner, 200),
    themen,
    ergebnis: (src.ergebnis in AUSGANG ? src.ergebnis : '') as keyof typeof AUSGANG | '',
    naechsterSchritt: str(src.naechsterSchritt, 1000),
    frist: isValidDate(src.frist) ? new Date(src.frist).toISOString() : null,
    notiz: str(src.notiz, 10000),
    createdAt: (isValidDate(src.createdAt) ? src.createdAt : t) as string,
    updatedAt: (isValidDate(src.updatedAt) ? src.updatedAt : t) as string,
  };
}

export const KAUFINTERESSE = {
  offen: 'Noch offen',
  interesse: 'Interesse am Kauf',
  gekauft: 'Gekauft',
  kein: 'Kein Kaufinteresse',
};

export function neuesGeraet(partial: Rec = {}) {
  const t = nowIso();
  return normalizeGeraet({ id: uid(), createdAt: t, updatedAt: t, ...partial });
}

export function neuerLeihvorgang(partial: Rec = {}) {
  const t = nowIso();
  return normalizeLeihvorgang({ id: uid(), createdAt: t, updatedAt: t, ausgabe: t, ...partial });
}

/** Verkauf eines Bestandsgeräts an einen Kunden (ab 0.10.10, ohne Schemawechsel; fehlt = null). */
function normalizeVerkauf(v: unknown): { kundeId: string; datum: string; preis: number | null; notiz: string } | null {
  if (!v || typeof v !== 'object') return null;
  const s = v as Rec;
  if (!isValidDate(s.datum)) return null;
  const preis = typeof s.preis === 'number' && Number.isFinite(s.preis) && s.preis >= 0 && s.preis < 1e7 ? s.preis : null;
  return { kundeId: typeof s.kundeId === 'string' ? s.kundeId : '', datum: s.datum as string, preis, notiz: str(s.notiz, 2000) };
}

/** Vorführgerät aus dem Auto-Bestand (nur Vorwerk). */
export function normalizeGeraet(g: unknown) {
  const src: Rec = g && typeof g === 'object' ? g : {};
  const t = nowIso();
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    name: str(src.name, 200) || 'Unbenanntes Gerät',
    seriennummer: str(src.seriennummer, 100),
    /** Bezug zur Produktübersicht (Vorwerk-Katalog), leer bei freier Eingabe */
    produktId: str(src.produktId, 120),
    zubehoer: str(src.zubehoer, 1000),
    notiz: str(src.notiz, 5000),
    aktiv: src.aktiv !== false, // false = ausgemustert/verkauft, bleibt für die Historie erhalten
    verkauf: normalizeVerkauf(src.verkauf),
    createdAt: (isValidDate(src.createdAt) ? src.createdAt : t) as string,
    updatedAt: (isValidDate(src.updatedAt) ? src.updatedAt : t) as string,
  };
}

/** Gründe für eine Bestandsbuchung beim Verbrauchsmaterial. `zugang` erhöht, `korrektur` setzt neu, alle anderen verringern. */
export const MATERIAL_GRUND = {
  muster: 'Muster an Kunde ausgegeben',
  test: 'Beim Kunden getestet, entsorgt',
  eigen: 'Selbst verbraucht',
  defekt: 'Defekt oder abgelaufen',
  zugang: 'Zugang (Lieferung)',
  korrektur: 'Bestand gezählt (Korrektur)',
};
export type MaterialGrund = keyof typeof MATERIAL_GRUND;

const ganzzahl = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : parseNumber(v);
  return n === null || !Number.isFinite(n) ? null : Math.min(max, Math.max(min, Math.round(n)));
};

export function normalizeMaterialBuchung(b: unknown) {
  const src: Rec = b && typeof b === 'object' ? b : {};
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    zeitpunkt: isValidDate(src.zeitpunkt) ? new Date(src.zeitpunkt).toISOString() : nowIso(),
    /** Veränderung des Bestands (+ Zugang, − Abgang) */
    menge: ganzzahl(src.menge, -100000, 100000) ?? 0,
    grund: (src.grund in MATERIAL_GRUND ? src.grund : 'korrektur') as MaterialGrund,
    kundeId: typeof src.kundeId === 'string' ? src.kundeId : '',
    notiz: str(src.notiz, 1000),
  };
}

/** Verbrauchsmaterial (Muster, Reinigungsmittel, Filtertüten …) mit Anzahl und Mindestbestand. */
export function normalizeMaterial(m: unknown) {
  const src: Rec = m && typeof m === 'object' ? m : {};
  const t = nowIso();
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    name: str(src.name, 200) || 'Unbenanntes Material',
    /** Bezug zur Produktübersicht (Vorwerk-Katalog), leer bei freier Eingabe */
    produktId: str(src.produktId, 120),
    einheit: str(src.einheit, 30) || 'Stück',
    bestand: ganzzahl(src.bestand, 0, 100000) ?? 0,
    /** Hinweis „nachbestellen“, sobald der Bestand diesen Wert erreicht oder unterschreitet; null = kein Hinweis */
    mindestbestand: src.mindestbestand === null || src.mindestbestand === '' || src.mindestbestand === undefined ? null : ganzzahl(src.mindestbestand, 0, 100000),
    notiz: str(src.notiz, 2000),
    aktiv: src.aktiv !== false,
    /** jüngste zuerst, höchstens 300 */
    buchungen: (Array.isArray(src.buchungen) ? src.buchungen.map(normalizeMaterialBuchung) : []).slice(0, 300),
    createdAt: (isValidDate(src.createdAt) ? src.createdAt : t) as string,
    updatedAt: (isValidDate(src.updatedAt) ? src.updatedAt : t) as string,
  };
}

/** Fotoschlüssel: nur gültige 256-Bit-Schlüssel in Base64. */
export function normalizeFotoSchluessel(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, w] of Object.entries(v as Rec)) if (/^[\w-]{1,40}$/.test(k) && typeof w === 'string' && /^[A-Za-z0-9+/]{43}=$/.test(w)) out[k] = w;
  return out;
}

export function neuesMaterial(partial: Rec = {}) {
  const t = nowIso();
  return normalizeMaterial({ id: uid(), createdAt: t, updatedAt: t, ...partial });
}

/** Ein Verleih: Gerät an Kunde, mit geplanter und tatsächlicher Rückgabe. */
export function normalizeLeihvorgang(l: unknown) {
  const src: Rec = l && typeof l === 'object' ? l : {};
  const t = nowIso();
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    geraetId: typeof src.geraetId === 'string' ? src.geraetId : '',
    kundeId: typeof src.kundeId === 'string' ? src.kundeId : '',
    ausgabe: isValidDate(src.ausgabe) ? new Date(src.ausgabe).toISOString() : t,
    rueckgabeGeplant: isValidDate(src.rueckgabeGeplant) ? new Date(src.rueckgabeGeplant).toISOString() : null,
    rueckgabe: isValidDate(src.rueckgabe) ? new Date(src.rueckgabe).toISOString() : null,
    kaufinteresse: (src.kaufinteresse in KAUFINTERESSE ? src.kaufinteresse : 'offen') as keyof typeof KAUFINTERESSE,
    notiz: str(src.notiz, 5000),
    // Belege (ab Schema 3): Fotos vom Zustand und Unterschrift bei Ausgabe und Rückgabe
    fotosAusgabe: bilderListe(src.fotosAusgabe),
    fotosRueckgabe: bilderListe(src.fotosRueckgabe),
    unterschriftAusgabe: bild(src.unterschriftAusgabe),
    unterschriftRueckgabe: bild(src.unterschriftRueckgabe),
    nameAusgabe: str(src.nameAusgabe, 200),
    nameRueckgabe: str(src.nameRueckgabe, 200),
    createdAt: (isValidDate(src.createdAt) ? src.createdAt : t) as string,
    updatedAt: (isValidDate(src.updatedAt) ? src.updatedAt : t) as string,
  };
}

export const MAX_FOTOS = 4;
const BILD_MAX = 1_500_000; // Zeichen je Bild (data-URL), schützt vor Riesendateien
/** Nur echte Bild-data-URLs (JPEG/PNG) bis zur Maximalgröße, sonst ''. */
export function bild(v: unknown): string {
  return typeof v === 'string' && v.length <= BILD_MAX && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : '';
}
function bilderListe(v: unknown): string[] {
  return Array.isArray(v) ? v.map(bild).filter(Boolean).slice(0, MAX_FOTOS) : [];
}

/** Reservierung eines Vorführgeräts für einen Zeitraum (ganze Tage, von/bis inklusive). */
export function normalizeReservierung(r: unknown) {
  const src: Rec = r && typeof r === 'object' ? r : {};
  const t = nowIso();
  const von = isValidDate(src.von) ? new Date(src.von).toISOString() : t;
  const bisRoh = isValidDate(src.bis) ? new Date(src.bis).toISOString() : von;
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    geraetId: typeof src.geraetId === 'string' ? src.geraetId : '',
    kundeId: typeof src.kundeId === 'string' ? src.kundeId : '',
    von,
    bis: bisRoh < von ? von : bisRoh,
    notiz: str(src.notiz, 2000),
    createdAt: (isValidDate(src.createdAt) ? src.createdAt : t) as string,
    updatedAt: (isValidDate(src.updatedAt) ? src.updatedAt : t) as string,
  };
}

/** Kalendertag in Ortszeit (wie im Belegungsplan, src/core/belegung.ts). */
const TAG = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** Überschneiden sich zwei Zeiträume (tageweise, inklusive)? Werte: ISO-Strings. */
export function ueberschneidet(aVon: string, aBis: string | null | undefined, bVon: string, bBis: string | null | undefined): boolean {
  return TAG(aVon) <= TAG(bBis || bVon) && TAG(bVon) <= TAG(aBis || aVon);
}

/**
 * Ist das Gerät im Zeitraum frei? Prüft Reservierungen und Verleihe (offene Verleihe ohne
 * Rückgabedatum gelten als belegt bis auf Weiteres). `ohneId` blendet einen Eintrag aus (Bearbeiten).
 */
export interface Belegung { art: 'reservierung' | 'verleih'; eintrag: Reservierung | Leihvorgang }
export function geraetBelegung(data: Daten, geraetId: string, von: string, bis: string, ohneId = ''): Belegung[] {
  const konflikte: Belegung[] = [];
  for (const r of data.reservierungen || []) {
    if (r.geraetId === geraetId && r.id !== ohneId && ueberschneidet(von, bis, r.von, r.bis)) konflikte.push({ art: 'reservierung', eintrag: r });
  }
  for (const l of data.leihvorgaenge) {
    if (l.geraetId !== geraetId || l.id === ohneId) continue;
    const ende = l.rueckgabe || l.rueckgabeGeplant || '9999-12-31T00:00:00.000Z';
    if (ueberschneidet(von, bis, l.ausgabe, ende)) konflikte.push({ art: 'verleih', eintrag: l });
  }
  return konflikte;
}

/** Papierkorb-Eintrag: gelöschtes Objekt mit Typ, wiederherstellbar. */
export function normalizePapierkorb(e: unknown) {
  const src: Rec = e && typeof e === 'object' ? e : {};
  const typ = (['kunde', 'notiz', 'termin', 'geraet', 'enpalKontakt', 'ansprechpartner'].includes(src.typ) ? src.typ : null) as 'kunde' | 'notiz' | 'termin' | 'geraet' | 'enpalKontakt' | 'ansprechpartner' | null;
  if (!typ || !src.objekt || typeof src.objekt !== 'object') return null;
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    typ,
    objekt: src.objekt as Rec,
    kundeId: typeof src.kundeId === 'string' ? src.kundeId : '',
    geloeschtAm: isValidDate(src.geloeschtAm) ? new Date(src.geloeschtAm).toISOString() : nowIso(),
    // abhängige Daten eines gelöschten Kunden (Termine/Verleihe, deren Bezug gelöst wurde)
    bezug: src.bezug && typeof src.bezug === 'object' ? { termine: arr(src.bezug.termine), leihvorgaenge: arr(src.bezug.leihvorgaenge), reservierungen: arr(src.bezug.reservierungen), geraete: arr(src.bezug.geraete), material: arr(src.bezug.material) } : null,
  };
}
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

/** Offener (nicht zurückgegebener) Leihvorgang eines Geräts oder null. */
export function offenerVerleih(data: Daten, geraetId: string): Leihvorgang | null {
  return data.leihvorgaenge.find((l) => l.geraetId === geraetId && !l.rueckgabe) || null;
}

export function neuerTermin(partial: Rec = {}) {
  const t = nowIso();
  return normalizeTermin({ id: uid(), createdAt: t, updatedAt: t, ...partial });
}

// ---------- Normalisierung: macht aus beliebigem (auch kaputtem) Input gültige Objekte ----------

const str = (v: unknown, max = 5000): string => (typeof v === 'string' ? v.slice(0, max) : v === null || v === undefined ? '' : String(v).slice(0, max));

function normalizeFelder(sparte: Sparte, input: unknown): Rec {
  const out: Rec = {};
  const src: Rec = input && typeof input === 'object' ? input : {};
  for (const f of FELDER[sparte]) {
    const v = src[f.key];
    if (f.type === 'number') out[f.key] = parseNumber(v);
    else if (f.type === 'bool') out[f.key] = v === true ? true : v === false ? false : null;
    else if (f.type === 'select') out[f.key] = typeof v === 'string' && (f.options || []).includes(v) ? v : '';
    else out[f.key] = str(v, f.type === 'textarea' ? 20000 : 500);
  }
  return out;
}

export function normalizeNotiz(n: unknown) {
  const src: Rec = n && typeof n === 'object' ? n : {};
  const t = nowIso();
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    zeitpunkt: isValidDate(src.zeitpunkt) ? new Date(src.zeitpunkt).toISOString() : t,
    text: str(src.text, 50000),
    sparten: Array.isArray(src.sparten) ? [...new Set<Sparte>(src.sparten.filter((s: Sparte) => SPARTEN_KEYS.includes(s)))] : [] as Sparte[],
    createdAt: (isValidDate(src.createdAt) ? src.createdAt : t) as string,
    updatedAt: (isValidDate(src.updatedAt) ? src.updatedAt : t) as string,
  };
}

/** Ein Statuswechsel je Sparte (ab Schema 8). `geschaetzt`: nachgetragen ohne echten Zeitpunkt (Migration). */
export function normalizeStatusWechsel(w: unknown) {
  const src: Rec = w && typeof w === 'object' ? w : {};
  if (!isValidDate(src.zeitpunkt) || !SPARTEN_KEYS.includes(src.sparte) || !STATUS_KEYS.includes(src.nach)) return null;
  return {
    zeitpunkt: new Date(src.zeitpunkt).toISOString(),
    sparte: src.sparte as Sparte,
    von: (STATUS_KEYS.includes(src.von) ? src.von : 'unbekannt') as StatusKey,
    nach: src.nach as StatusKey,
    ...(src.geschaetzt === true ? { geschaetzt: true as const } : {}),
  };
}
export type StatusWechsel = NonNullable<ReturnType<typeof normalizeStatusWechsel>>;
export const STATUS_VERLAUF_MAX = 1000;

/** Letzter bekannter Status einer Sparte laut Verlauf ('unbekannt' ohne Einträge). */
export function letzterVerlaufStatus(verlauf: readonly StatusWechsel[], s: Sparte): StatusKey {
  for (let i = verlauf.length - 1; i >= 0; i--) if (verlauf[i]!.sparte === s) return verlauf[i]!.nach;
  return 'unbekannt';
}

/**
 * Statusverlauf an den aktuellen Status angleichen: Weicht der Status einer Sparte vom letzten Verlaufseintrag ab,
 * wird ein Wechsel mit `zeitpunkt` angehängt. Läuft nach jeder Änderung (store.mutate) und bei der Migration.
 * Gibt zurück, ob etwas ergänzt wurde.
 */
export function statusVerlaufAbgleichen(k: { status: Record<Sparte, StatusKey>; statusVerlauf: StatusWechsel[] }, zeitpunkt: string, geschaetzt = false): boolean {
  let neu = false;
  for (const s of SPARTEN_KEYS) {
    const von = letzterVerlaufStatus(k.statusVerlauf, s);
    if (von === k.status[s]) continue;
    k.statusVerlauf.push({ zeitpunkt, sparte: s, von, nach: k.status[s], ...(geschaetzt ? { geschaetzt: true as const } : {}) });
    neu = true;
  }
  if (neu && k.statusVerlauf.length > STATUS_VERLAUF_MAX) k.statusVerlauf.splice(0, k.statusVerlauf.length - STATUS_VERLAUF_MAX);
  return neu;
}

export function normalizeKunde(k: unknown) {
  const src: Rec = k && typeof k === 'object' ? k : {};
  const t = nowIso();
  const status = {} as Record<Sparte, StatusKey>;
  for (const s of SPARTEN_KEYS) {
    const v = src.status?.[s];
    status[s] = STATUS_KEYS.includes(v) ? v : 'unbekannt';
  }
  const lat = parseNumber(src.lat);
  const lng = parseNumber(src.lng);
  const coordOk = lat !== null && lng !== null && isValidCoord(lat, lng);
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    createdAt: (isValidDate(src.createdAt) ? src.createdAt : t) as string,
    updatedAt: (isValidDate(src.updatedAt) ? src.updatedAt : t) as string,
    anrede: str(src.anrede, 50),
    vorname: str(src.vorname, 200),
    nachname: str(src.nachname, 200),
    firma: str(src.firma, 200),
    strasse: str(src.strasse, 300),
    plz: str(src.plz, 20),
    ort: str(src.ort, 200),
    telefon: str(src.telefon, 100),
    email: str(src.email, 200),
    lat: coordOk ? lat : null,
    lng: coordOk ? lng : null,
    status,
    pv: normalizeFelder('pv', src.pv),
    wp: normalizeFelder('wp', src.wp),
    vorwerk: normalizeFelder('vorwerk', src.vorwerk),
    notizen: Array.isArray(src.notizen) ? src.notizen.map(normalizeNotiz) : [],
    gespraeche: Array.isArray(src.gespraeche) ? src.gespraeche.map(normalizeGespraech) : [],
    enpalKontakte: Array.isArray(src.enpalKontakte) ? src.enpalKontakte.map(normalizeEnpalKontakt) : [],
    /** Von Hand gesetzter letzter Kontakt (ab 0.9.0); wirksam ist der jüngere aus Hand und Verlauf */
    letzterKontaktManuell: (isValidDate(src.letzterKontaktManuell) ? new Date(src.letzterKontaktManuell).toISOString() : null) as string | null,
    /** Werte der eigenen Felder (ab Schema 4), Schlüssel = ID aus einstellungen.felder.eigene */
    eigene: normalizeEigeneWerte(src.eigene),
    /** Produkte im Gespräch (ab Schema 5): Markierungs-Ereignisse, jüngstes je Produkt gilt */
    produkte: (Array.isArray(src.produkte) ? src.produkte.map(normalizeProduktMarkierung).filter((x): x is ProduktMarkierung => !!x) : []).slice(-2000),
    /** Fotos je Sparte (ab 0.10.16): nur Beschreibung, die Bilder liegen verschlüsselt in der Tabelle „fotos“ */
    fotos: normalizeFotoListe(src.fotos),
    /** Statuswechsel je Sparte mit Datum (ab Schema 8), älteste zuerst; Grundlage für den Verkaufstrichter */
    statusVerlauf: (Array.isArray(src.statusVerlauf) ? src.statusVerlauf.map(normalizeStatusWechsel).filter((x): x is StatusWechsel => !!x) : [])
      .sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? -1 : a.zeitpunkt > b.zeitpunkt ? 1 : 0)).slice(-STATUS_VERLAUF_MAX),
    /** Angebote je Sparte mit Betrag und Frist (ab Schema 9), src/core/vertrieb.ts */
    angebote: (Array.isArray(src.angebote) ? src.angebote.map(normalizeAngebot) : []).slice(-ANGEBOTE_MAX),
    /** Auftragsstand nach dem Abschluss je Sparte (ab Schema 9); nur begonnene Sparten */
    auftrag: normalizeAuftrag(src.auftrag),
    /** Weitere Ansprechpartner mit Rolle, vor allem bei Firmen und Höfen (ab Schema 9) */
    ansprechpartner: (Array.isArray(src.ansprechpartner) ? src.ansprechpartner.map(normalizeAnsprechpartner) : []).slice(0, ANSPRECHPARTNER_MAX),
    /** Ergebnisse an der Haustür (ab Schema 9), jüngstes gilt */
    haustuer: (Array.isArray(src.haustuer) ? src.haustuer.map(normalizeHaustuer).filter((x): x is HaustuerEintrag => !!x) : []).slice(-HAUSTUER_MAX),
  };
}

export function normalizeTermin(tm: unknown) {
  const src: Rec = tm && typeof tm === 'object' ? tm : {};
  const t = nowIso();
  const dauer = parseNumber(src.dauerMin);
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    kundeId: typeof src.kundeId === 'string' ? src.kundeId : '',
    sparte: (SPARTEN_KEYS.includes(src.sparte) ? src.sparte : '') as Sparte | '',
    art: (src.art === 'termin' ? 'termin' : 'wiedervorlage') as 'termin' | 'wiedervorlage',
    titel: str(src.titel, 300),
    beginn: isValidDate(src.beginn) ? new Date(src.beginn).toISOString() : t,
    dauerMin: dauer !== null && dauer > 0 && dauer <= 24 * 60 ? Math.round(dauer) : 60,
    ort: str(src.ort, 500),
    notiz: str(src.notiz, 5000),
    erledigt: src.erledigt === true,
    createdAt: (isValidDate(src.createdAt) ? src.createdAt : t) as string,
    updatedAt: (isValidDate(src.updatedAt) ? src.updatedAt : t) as string,
  };
}

/** „Zuletzt geöffnet“ in der Kommandozeile: nur Art und ID, verschlüsselt im Store (R-KRYPTO). */
export interface ZuletztEintrag { art: 'kunde' | 'geraet'; id: string }
export const ZULETZT_MAX = 8;
export function normalizeZuletzt(v: unknown): ZuletztEintrag[] {
  if (!Array.isArray(v)) return [];
  const out: ZuletztEintrag[] = [];
  for (const x of v) {
    if (!x || typeof x !== 'object') continue;
    const { art, id } = x as Rec;
    if ((art === 'kunde' || art === 'geraet') && typeof id === 'string' && id && id.length <= 100 && !out.some((y) => y.art === art && y.id === id)) out.push({ art, id });
    if (out.length >= ZULETZT_MAX) break;
  }
  return out;
}

/** Eigene Vorlage (nicht leer, nicht die alte Standardvorlage) oder ''. */
const vorlage = (v: unknown) => (typeof v === 'string' && v.trim() && v !== ENPAL_ALT ? v : '');

export function normalizeEinstellungen(e: unknown) {
  const d = STANDARD_EINSTELLUNGEN;
  const src: Rec = e && typeof e === 'object' ? e : {};
  const autoSperre = parseNumber(src.autoSperreMin);
  const karte = src.karte && typeof src.karte === 'object' ? src.karte : {};
  const kLat = parseNumber(karte.lat);
  const kLng = parseNumber(karte.lng);
  const kZoom = parseNumber(karte.zoom);
  return {
    /** Kundenfotos in die Sicherung/iCloud-Datei aufnehmen (ab 0.10.16, Standard an) */
    fotosMitsichern: src.fotosMitsichern !== false,
    absender: str(src.absender, 500),
    // Ab Schema 7 je Bereich eine Vorlage. Eine eigene frühere Enpal-Vorlage gilt für PV und WP weiter.
    vorlagen: {
      pv: vorlage(src.vorlagen?.pv) || vorlage(src.vorlagen?.enpal) || d.vorlagen.pv,
      wp: vorlage(src.vorlagen?.wp) || vorlage(src.vorlagen?.enpal) || d.vorlagen.wp,
      vorwerk: vorlage(src.vorlagen?.vorwerk) || d.vorlagen.vorwerk,
    },
    karte: {
      lat: kLat !== null && kLng !== null && isValidCoord(kLat, kLng) ? kLat : d.karte.lat,
      lng: kLat !== null && kLng !== null && isValidCoord(kLat, kLng) ? kLng : d.karte.lng,
      zoom: kZoom !== null && kZoom >= 1 && kZoom <= 20 ? kZoom : d.karte.zoom,
      layer: (karte.layer === 'strasse' ? 'strasse' : 'satellit') as 'strasse' | 'satellit',
    },
    autoSperreMin: autoSperre !== null && autoSperre >= 0 && autoSperre <= 240 ? Math.round(autoSperre) : d.autoSperreMin,
    // früheres Feld „dropbox“ (App-Key, Token) wird bewusst nicht übernommen und verschwindet beim nächsten Speichern
    empfaenger: {
      pv: str(src.empfaenger?.pv ?? src.empfaenger?.enpal, 300),
      wp: str(src.empfaenger?.wp ?? src.empfaenger?.enpal, 300),
      vorwerk: str(src.empfaenger?.vorwerk, 300),
    },
    kartenApp: (['auto', 'apple', 'google', 'waze'].includes(src.kartenApp) ? src.kartenApp : 'auto') as 'auto' | 'apple' | 'google' | 'waze',
    kundenansicht: Object.fromEntries(Object.entries(KUNDENANSICHT_TEILE).map(([k, v]) => [k, typeof src.kundenansicht?.[k] === 'boolean' ? src.kundenansicht[k] : v.standard])) as Record<KundenansichtTeil, boolean>,
    /** Umkreis für „Nachbarn“ beim Kunden (Meter), eine der NACHBAR_RADIEN-Stufen */
    nachbarRadiusM: NACHBAR_RADIEN.includes(Number(src.nachbarRadiusM)) ? Number(src.nachbarRadiusM) : 300,
    /** Kommandozeile: zuletzt geöffnete Kunden/Geräte (ab 0.9.0) */
    zuletzt: normalizeZuletzt(src.zuletzt),
    /** Feldverwaltung (ab Schema 4): ausgeblendete Felder (Pfade) und eigene Felder */
    felder: normalizeFeldEinstellungen(src.felder),
    /** Ansicht, mit der der Kalender startet (ab Schema 7) */
    /** Namensreihenfolge in Listen und Titeln (ab 0.13.6, Standard „Vorname Nachname“) */
    namensFolge: (src.namensFolge === 'nachname' ? 'nachname' : 'vorname') as NamensFolge,
    /** Kunden ohne Namen: Ort oder Straße zuerst (ab 0.13.6, Standard Ort) */
    ortsFolge: (src.ortsFolge === 'strasse' ? 'strasse' : 'ort') as OrtsFolge,
    kalenderStart: (['liste', 'monat', 'woche', 'tag', 'geraete'].includes(src.kalenderStart) ? src.kalenderStart : 'monat') as 'liste' | 'monat' | 'woche' | 'tag' | 'geraete',
    /** Textbausteine je Bereich für die Gesprächsnotizen (ab Schema 6) */
    bausteine: normalizeBausteine(src.bausteine),
    /** Nachfass-Abstände in Tagen nach einem Angebot (ab 0.13.0, Standard 3 und 7; leer = keine) */
    nachfassTage: normalizeNachfassTage(src.nachfassTage),
    /** „Bitte bereitlegen“-Listen der Terminbestätigung je Bereich (ab 0.13.0) */
    bereitlegen: normalizeBereitlegen(src.bereitlegen),
    /** Startwerte des Rechners je Kundentyp (ab 0.13.10): Privat, Gewerbe und eigene Vorlagen */
    rechnerVorlagen: normalizeRechnerVorlagen(src.rechnerVorlagen),
  };
}

/** Bringt geladene Daten auf die aktuelle Schema-Version und repariert Fehlerhaftes. */
export function migrate(input: unknown): Daten {
  if (!input || typeof input !== 'object') return emptyData();
  const v = Number.isInteger((input as Rec).schemaVersion) ? (input as Rec).schemaVersion as number : 0;
  if (v > SCHEMA_VERSION) {
    throw new Error(`Die Daten stammen aus einer neueren Sperling-Version (Schema ${v}). Bitte App aktualisieren.`);
  }
  const data: Rec = { ...(input as Rec) };
  // v1 → v2: Kunden bekommen enpalKontakte (leer), Einstellungen bekommen empfaenger.
  // v2 → v3: reservierungen, papierkorb, kartenApp, Fotos/Unterschriften am Verleih (alles leer ergänzt).
  // Beides ergänzt normalize…() unten; ältere Daten bleiben vollständig lesbar.
  // v3 → v4: kunde.eigene und einstellungen.felder (Feldverwaltung), beides leer ergänzt.
  // v4 → v5: kunde.produkte (Produkte im Gespräch markieren), leer ergänzt.
  // v5 → v6: einstellungen.bausteine (Textbausteine im Gesprächsmodus), mit Startliste ergänzt.
  // v6 → v7: Texte je Bereich (PV, WP, Vorwerk): vorlagen/empfaenger.enpal → pv und wp (normalizeEinstellungen).
  // v7 → v8: kunde.statusVerlauf. Vorhandene Status werden als geschätzter Wechsel zum Anlagedatum nachgetragen
  // (später abweichende Status zum letzten Änderungsdatum), damit Trichter und Abschlüsse sofort etwas zeigen.
  // v8 → v9: kunde.angebote, kunde.auftrag, kunde.ansprechpartner, kunde.haustuer (Vertriebswerkzeuge), alles leer ergänzt.
  // Künftige Migrationen hier schrittweise: if (v < 10) { ... }
  const kunden = Array.isArray(data.kunden) ? data.kunden.map(normalizeKunde) : [];
  for (const k of kunden) statusVerlaufAbgleichen(k, v < 8 || !k.statusVerlauf.length ? k.createdAt : k.updatedAt, true);
  // Doppelte IDs verhindern (z. B. nach manuellem Zusammenführen)
  const seen = new Set();
  const kundenUnique = kunden.filter((k) => (seen.has(k.id) ? false : (seen.add(k.id), true)));
  const kundenIds = new Set(kundenUnique.map((k) => k.id));
  const termine = Array.isArray(data.termine)
    ? data.termine.map(normalizeTermin).map((t) => (t.kundeId === '' || kundenIds.has(t.kundeId) ? t : { ...t, kundeId: '' }))
    : [];
  // Regel: Nie stillschweigend Daten verwerfen. Verwaiste Termine bleiben erhalten (ohne Kundenbezug).
  return {
    schemaVersion: SCHEMA_VERSION,
    kunden: kundenUnique,
    termine,
    einstellungen: normalizeEinstellungen(data.einstellungen),
    geraete: Array.isArray(data.geraete) ? data.geraete.map(normalizeGeraet) : [],
    // Verleih an gelöschte Kunden bleibt erhalten (ohne Kundenbezug), siehe R-LOESCH
    leihvorgaenge: Array.isArray(data.leihvorgaenge)
      ? data.leihvorgaenge.map(normalizeLeihvorgang).map((l) => (l.kundeId === '' || kundenIds.has(l.kundeId) ? l : { ...l, kundeId: '' }))
      : [],
    reservierungen: Array.isArray(data.reservierungen)
      ? data.reservierungen.map(normalizeReservierung).map((r) => (r.kundeId === '' || kundenIds.has(r.kundeId) ? r : { ...r, kundeId: '' }))
      : [],
    // Gelöschtes verfällt nie von selbst (R-LOESCH)
    papierkorb: Array.isArray(data.papierkorb)
      ? data.papierkorb.map(normalizePapierkorb).filter((e): e is PapierkorbEintrag => !!e)
      : [],
    fotoSchluessel: normalizeFotoSchluessel(data.fotoSchluessel),
    material: Array.isArray(data.material)
      ? data.material.map(normalizeMaterial).map((m) => ({ ...m, buchungen: m.buchungen.map((b) => (b.kundeId === '' || kundenIds.has(b.kundeId) ? b : { ...b, kundeId: '' })) }))
      : [],
  };
}

// ---------- Typen (aus den Normalisierern abgeleitet, damit Code und Typ nie auseinanderlaufen) ----------

export type Kunde = ReturnType<typeof normalizeKunde>;
export type Notiz = ReturnType<typeof normalizeNotiz>;
export type Gespraech = ReturnType<typeof normalizeGespraech>;
export type EnpalKontakt = ReturnType<typeof normalizeEnpalKontakt>;
export type Termin = ReturnType<typeof normalizeTermin>;
export type Geraet = ReturnType<typeof normalizeGeraet>;
export type Leihvorgang = ReturnType<typeof normalizeLeihvorgang>;
export type Reservierung = ReturnType<typeof normalizeReservierung>;
export type Material = ReturnType<typeof normalizeMaterial>;
export type MaterialBuchung = ReturnType<typeof normalizeMaterialBuchung>;
export type PapierkorbEintrag = NonNullable<ReturnType<typeof normalizePapierkorb>>;
export type Einstellungen = ReturnType<typeof normalizeEinstellungen>;
export interface Daten {
  schemaVersion: number;
  kunden: Kunde[];
  termine: Termin[];
  einstellungen: Einstellungen;
  geraete: Geraet[];
  leihvorgaenge: Leihvorgang[];
  reservierungen: Reservierung[];
  papierkorb: PapierkorbEintrag[];
  material: Material[];
  fotoSchluessel: Record<string, string>;
}
/** Adressfelder, wie sie Kunde und Formulare gemeinsam haben. */
export type MitAdresse = Partial<Pick<Kunde, 'vorname' | 'nachname' | 'firma' | 'strasse' | 'plz' | 'ort'>>;

// ---------- Anzeige-Helfer ----------

/** Namensreihenfolge in Listen und Titeln: „Vorname Nachname“ oder „Nachname, Vorname“ (ab 0.13.6). */
export type NamensFolge = 'vorname' | 'nachname';
/** Kunden ohne Namen: Titel und Sortierung beginnen mit dem Ort oder mit der Straße (ab 0.13.6). */
export type OrtsFolge = 'ort' | 'strasse';
/** Aktuelle Anzeige-Einstellung; setzt der Store bei jedem Zugriff aus den Einstellungen. */
const anzeige: { namensFolge: NamensFolge; ortsFolge: OrtsFolge } = { namensFolge: 'vorname', ortsFolge: 'ort' };
export function anzeigeSetzen(e: { namensFolge?: NamensFolge; ortsFolge?: OrtsFolge } | null | undefined) {
  anzeige.namensFolge = e?.namensFolge === 'nachname' ? 'nachname' : 'vorname';
  anzeige.ortsFolge = e?.ortsFolge === 'strasse' ? 'strasse' : 'ort';
}

/** Name des Kunden. Ohne `folge` gilt die Einstellung; Anbieter-Texte und Belege geben 'vorname' fest vor. */
export function kundenName(k: MitAdresse, folge: NamensFolge = anzeige.namensFolge): string {
  const vn = (k.vorname || '').trim();
  const nn = (k.nachname || '').trim();
  const name = folge === 'nachname' && vn && nn ? `${nn}, ${vn}` : [vn, nn].filter(Boolean).join(' ');
  if (name && k.firma) return `${name} (${k.firma})`;
  return name || k.firma || '';
}

/** Adresse für Kunden ohne Namen, je nach Einstellung „Ort, Straße“ oder „Straße, PLZ Ort“. */
function adresseTitel(k: MitAdresse, folge: OrtsFolge): string {
  if (folge === 'strasse') return adresseEinzeilig(k);
  const ortTeil = (k.ort || '').trim() || (k.plz || '').trim();
  return [ortTeil, (k.strasse || '').trim()].filter(Boolean).join(', ');
}

export function kundenTitel(k: MitAdresse, folge: OrtsFolge = anzeige.ortsFolge): string {
  return kundenName(k) || adresseTitel(k, folge) || 'Unbenannter Standort';
}

const vergleich = new Intl.Collator('de', { numeric: true, sensitivity: 'base' });
/**
 * Sortierung „Name A–Z“: Kunden mit Namen nach Nachname, dann Vorname, dann Firma
 * (nur Vorname oder nur Firma zählt wie ein Nachname). Einträge ohne Namen stehen
 * dazwischen, je nach Einstellung mit dem Ort (dann Straße) oder der Straße (dann Ort) als Name.
 */
export function kundenVergleich(a: MitAdresse, b: MitAdresse, folge: OrtsFolge = anzeige.ortsFolge): number {
  const t = (s?: string) => (s || '').trim();
  const schluessel = (k: MitAdresse): string[] => {
    const nn = t(k.nachname) || t(k.vorname) || t(k.firma);
    if (nn) return [nn, t(k.nachname) ? t(k.vorname) : '', t(k.firma)];
    const ort = t(k.ort) || t(k.plz);
    return folge === 'strasse' ? [t(k.strasse), ort, t(k.plz)] : [ort, t(k.strasse), t(k.plz)];
  };
  const sa = schluessel(a);
  const sb = schluessel(b);
  for (let i = 0; i < sa.length; i++) {
    const x = sa[i]!, y = sb[i]!;
    if (x === y) continue;
    if (!x) return 1; // Leeres ans Ende
    if (!y) return -1;
    const c = vergleich.compare(x, y);
    if (c) return c;
  }
  return 0;
}

/**
 * Buchstabe für die Trenner in „Name A–Z“ (Kundenliste und Export, ab 0.13.9). Passt zu `kundenVergleich`:
 * erster Buchstabe des ersten Sortierschlüssels, Umlaute zum Grundbuchstaben (Ä → A), alles andere „#“.
 */
export function anfangsbuchstabe(k: MitAdresse, folge: OrtsFolge = anzeige.ortsFolge): string {
  const t = (s?: string) => (s || '').trim();
  const ort = t(k.ort) || t(k.plz);
  const erster = t(k.nachname) || t(k.vorname) || t(k.firma) || (folge === 'strasse' ? t(k.strasse) || ort : ort || t(k.strasse));
  const z = erster.normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase();
  return z >= 'A' && z <= 'Z' ? z : '#';
}

export function adresseEinzeilig(k: MitAdresse): string {
  const ortTeil = [k.plz, k.ort].filter(Boolean).join(' ');
  return [k.strasse, ortTeil].filter(Boolean).join(', ');
}

/** Notizen absteigend nach Zeitpunkt (neueste zuerst). */
export function notizenSortiert<N extends { zeitpunkt: string }>(k: { notizen?: N[] }): N[] {
  return [...(k.notizen || [])].sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? 1 : a.zeitpunkt > b.zeitpunkt ? -1 : 0));
}
