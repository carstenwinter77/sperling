// Sperling – Produktübersicht (rein, ohne DOM, in Node testbar).
// Der Katalog (src/data/produkte.json) ist öffentliches Nachschlagewissen von den Hersteller-Websites,
// keine Kundendaten. Er wird beim Laden geprüft: Unbekanntes wird übersprungen, nie ein Absturz.
// Bilder werden nur verlinkt (nie kopiert), URLs nur mit https:// (R-XSS, R-EXTERN).
import type { Sparte } from './model.ts';
import { type Rec, uid, nowIso, isValidDate, suchText } from './util.ts';

export const KATEGORIEN: Record<string, string> = {
  'pv-anlage': 'Solaranlage', solarmodul: 'Solarmodul', wechselrichter: 'Wechselrichter', speicher: 'Speicher', wallbox: 'Wallbox',
  energiemanager: 'Energiemanager', stromtarif: 'Stromtarif',
  waermepumpe: 'Wärmepumpe', 'waermepumpe-zubehoer': 'Wärmepumpen-Zubehör',
  akkusauger: 'Akku-Sauger', bodenstaubsauger: 'Bodenstaubsauger', saugroboter: 'Saugroboter', saugwischer: 'Saugwischer', fenstersauger: 'Fenstersauger',
  'aufsatz-zubehoer': 'Aufsätze und Zubehör', reinigungsmittel: 'Reinigungsmittel', set: 'Sets',
  finanzierung: 'Finanzierung', service: 'Service', sonstiges: 'Sonstiges',
};
const BEREICHE: Sparte[] = ['pv', 'wp', 'vorwerk'];

export interface TechDatum { bezeichnung: string; wert: string }
export interface Preis { modell: string; betragEuro: number | null; einheit: string | null; text: string | null; uvp: number | null }
export interface Produkt {
  id: string; quelle: string; bereich: Sparte; bereiche: Sparte[]; kategorie: string; name: string; modell: string;
  kurzbeschreibung: string; technischeDaten: TechDatum[]; preis: Preis | null; quelleUrl: string | null; bildUrl: string | null;
  stand: string; passtZu: string[]; stichworte: string[]; demnaechst: boolean; hinweise: string;
}
export interface Quelle { id: string; name: string; startUrl: string | null }
export interface Katalog { stand: string; hinweis: string; quellen: Quelle[]; produkte: Produkt[]; uebersprungen: number }

const s = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const https = (v: unknown) => (typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v) ? v : null);
const zahl = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const datum = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');

function produktPruefen(x: unknown): Produkt | null {
  const p: Rec = x && typeof x === 'object' ? x : {};
  const id = s(p.id, 100);
  const name = s(p.name, 300);
  if (!id || !/^[a-z0-9-]+$/.test(id) || !name || !BEREICHE.includes(p.bereich) || !(p.kategorie in KATEGORIEN)) return null;
  const zusaetzlich = Array.isArray(p.bereicheZusaetzlich) ? p.bereicheZusaetzlich.filter((b: unknown): b is Sparte => BEREICHE.includes(b as Sparte) && b !== p.bereich) : [];
  const pr: Rec | null = p.preis && typeof p.preis === 'object' ? p.preis : null;
  return {
    id, name,
    quelle: s(p.quelle, 50),
    bereich: p.bereich,
    bereiche: [p.bereich, ...new Set<Sparte>(zusaetzlich)],
    kategorie: p.kategorie,
    modell: s(p.modell, 200),
    kurzbeschreibung: s(p.kurzbeschreibung),
    technischeDaten: Array.isArray(p.technischeDaten)
      ? p.technischeDaten.map((t: Rec) => ({ bezeichnung: s(t?.bezeichnung, 100), wert: s(t?.wert, 500) })).filter((t: TechDatum) => t.bezeichnung && t.wert).slice(0, 40)
      : [],
    preis: pr ? { modell: s(pr.modell, 30), betragEuro: zahl(pr.betragEuro), einheit: s(pr.einheit, 30) || null, text: s(pr.text, 300) || null, uvp: zahl(pr.uvp) } : null,
    quelleUrl: https(p.quelleUrl),
    bildUrl: https(p.bildUrl),
    stand: datum(p.stand),
    passtZu: Array.isArray(p.passtZu) ? p.passtZu.filter((v: unknown) => typeof v === 'string').slice(0, 30) : [],
    stichworte: Array.isArray(p.stichworte) ? p.stichworte.filter((v: unknown) => typeof v === 'string').slice(0, 30) : [],
    demnaechst: p.verfuegbarkeit === 'demnaechst',
    hinweise: s(p.hinweise),
  };
}

/** Katalog prüfen. Doppelte IDs und ungültige Einträge werden übersprungen (gezählt). */
export function katalogPruefen(roh: unknown): Katalog {
  const k: Rec = roh && typeof roh === 'object' ? roh : {};
  const produkte: Produkt[] = [];
  let uebersprungen = 0;
  for (const x of Array.isArray(k.produkte) ? k.produkte : []) {
    const p = produktPruefen(x);
    if (p && !produkte.some((y) => y.id === p.id)) produkte.push(p); else uebersprungen++;
  }
  const ids = new Set(produkte.map((p) => p.id));
  for (const p of produkte) p.passtZu = p.passtZu.filter((id) => ids.has(id) && id !== p.id);
  return {
    stand: datum(k.stand),
    hinweis: s(k.hinweis),
    quellen: Array.isArray(k.quellen) ? k.quellen.map((q: Rec) => ({ id: s(q?.id, 50), name: s(q?.name, 100), startUrl: https(q?.startUrl) })).filter((q: Quelle) => q.id) : [],
    produkte,
    uebersprungen,
  };
}

/** Produkte eines Bereichs (auch zusätzlich zugeordnete), Kategorien in Katalog-Reihenfolge. */
export function produkteFuer(kat: Katalog, bereich: Sparte | 'alle'): Produkt[] {
  return bereich === 'alle' ? kat.produkte : kat.produkte.filter((p) => p.bereiche.includes(bereich));
}

/** Kategorien, die in der Liste vorkommen, in fester Reihenfolge. */
export function kategorienIn(liste: Produkt[]): string[] {
  const da = new Set(liste.map((p) => p.kategorie));
  return Object.keys(KATEGORIEN).filter((k) => da.has(k));
}

export function produktSuchen(liste: Produkt[], q: string): Produkt[] {
  const woerter = suchText(q).split(/\s+/).filter(Boolean);
  if (!woerter.length) return liste;
  return liste.filter((p) => {
    const heu = suchText([p.name, p.modell, p.kurzbeschreibung, KATEGORIEN[p.kategorie], p.quelle, ...p.stichworte].join(' '));
    return woerter.every((w) => heu.includes(w));
  });
}

const euro = (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
/** Preiszeile für Kachel und Detail; '' wenn keiner bekannt. */
export function preisText(p: Produkt): string {
  if (!p.preis) return '';
  if (p.preis.text) return p.preis.text;
  if (p.preis.betragEuro !== null) return `${euro(p.preis.betragEuro)}${p.preis.einheit && p.preis.einheit !== 'einmalig' ? ` ${p.preis.einheit}` : ''}`;
  return '';
}
export const standText = (iso: string) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '');

// ---------- Produkte im Gespräch: Markierungen beim Kunden ----------

export const MARKIERUNGEN = {
  interesse: { label: 'Interesse', kurz: '👍' },
  spaeter: { label: 'Später', kurz: '⏳' },
  vorhanden: { label: 'Schon vorhanden', kurz: '✓' },
  kein: { label: 'Kein Interesse', kurz: '✕' },
};
export type Markierung = keyof typeof MARKIERUNGEN;
export const MARKIERUNG_KEYS = Object.keys(MARKIERUNGEN) as Markierung[];

/**
 * Eine Markierung ist ein Ereignis (für die Historie). Name und Bereich werden mitgespeichert,
 * damit Verlauf und Texte auch funktionieren, wenn das Produkt nicht mehr im Katalog steht.
 * `markierung: ''` = Markierung aufgehoben.
 */
export function normalizeProduktMarkierung(x: unknown) {
  const src: Rec = x && typeof x === 'object' ? x : {};
  const produktId = s(src.produktId, 100);
  if (!produktId || !BEREICHE.includes(src.bereich)) return null;
  return {
    id: typeof src.id === 'string' && src.id ? src.id.slice(0, 100) : uid(),
    produktId,
    name: s(src.name, 300) || produktId,
    bereich: src.bereich as Sparte,
    markierung: (MARKIERUNG_KEYS.includes(src.markierung) ? src.markierung : '') as Markierung | '',
    zeitpunkt: isValidDate(src.zeitpunkt) ? new Date(src.zeitpunkt).toISOString() : nowIso(),
  };
}
export type ProduktMarkierung = NonNullable<ReturnType<typeof normalizeProduktMarkierung>>;

/** Aktueller Stand je Produkt (jüngstes Ereignis), ohne aufgehobene. */
export function aktuelleMarkierungen(liste: ProduktMarkierung[] | undefined): Map<string, ProduktMarkierung> {
  const m = new Map<string, ProduktMarkierung>();
  for (const e of [...(liste || [])].sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? -1 : a.zeitpunkt > b.zeitpunkt ? 1 : 0))) m.set(e.produktId, e);
  for (const [id, e] of m) if (!e.markierung) m.delete(id);
  return m;
}

/** Neues Ereignis; gleiche Markierung erneut = aufheben. */
export function markierungSetzen(liste: ProduktMarkierung[], p: Pick<Produkt, 'id' | 'name' | 'bereich'>, markierung: Markierung, zeitpunkt = nowIso()): ProduktMarkierung {
  const jetzt = aktuelleMarkierungen(liste).get(p.id);
  const e = normalizeProduktMarkierung({ produktId: p.id, name: p.name, bereich: p.bereich, markierung: jetzt?.markierung === markierung ? '' : markierung, zeitpunkt })!;
  liste.push(e);
  return e;
}

/** Kurzfassung für Texte und Kartei: „Interesse: A, B · Später: C“ je Bereich. */
export function markierungenText(liste: ProduktMarkierung[] | undefined, bereich: Sparte): string {
  const akt = [...aktuelleMarkierungen(liste).values()].filter((e) => e.bereich === bereich);
  return MARKIERUNG_KEYS.map((m) => {
    const namen = akt.filter((e) => e.markierung === m).map((e) => e.name);
    return namen.length ? `${MARKIERUNGEN[m].label}: ${namen.join(', ')}` : '';
  }).filter(Boolean).join(' · ');
}
