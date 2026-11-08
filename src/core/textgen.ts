// Sperling – drei getrennte Textgeneratoren: Photovoltaik (Enpal), Wärmepumpe (GALVANY), Vorwerk.
//
// HARTE REGEL (siehe docs/REGELN.md, R-TEXT): Ein Generator darf NIEMALS Daten
// eines anderen Bereichs sehen oder ausgeben.
// Umsetzung in zwei Stufen:
//   1. projizieren(): baut eine Kopie des Kunden, die NUR Stammdaten + den
//      eigenen Bereich enthält. Alles Weitere arbeitet nur damit.
//   2. Notizen werden nur übernommen, wenn sie den eigenen Bereich tragen und
//      sonst nichts. Einzige Ausnahme: alte gemeinsame PV/WP-Notizen (bis 0.10.3
//      gab es einen gemeinsamen Enpal-Text) erscheinen in beiden Texten, damit
//      nichts verloren geht. Gemischte mit Vorwerk oder unmarkierte Notizen werden
//      ausgelassen (und in der UI als Hinweis gezählt).

import { SPARTEN, STATUS, FELDER, AUSGANG, KONTAKTART, kundenName, adresseEinzeilig, notizenSortiert, type Kunde, type Notiz, type EnpalKontakt, type Feld, type Sparte, type StatusKey, type Einstellungen } from './model.ts';

/** Eine Textgruppe ist genau ein Bereich (seit 0.10.4). */
export type Gruppe = Sparte;
export const GRUPPEN_KEYS: Gruppe[] = ['pv', 'wp', 'vorwerk'];
type EinstellungenTeil = Partial<Pick<Einstellungen, 'absender' | 'vorlagen' | 'felder'>>;
/** Kundenkopie nur mit Stammdaten und den Sparten einer Gruppe (siehe projizieren). */
export interface Projektion extends Pick<Kunde, 'anrede' | 'vorname' | 'nachname' | 'firma' | 'strasse' | 'plz' | 'ort' | 'telefon' | 'email'> {
  status: Partial<Record<Sparte, StatusKey>>;
  notizen: Notiz[];
  enpalKontakte?: EnpalKontakt[];
  pv?: Record<string, unknown>; wp?: Record<string, unknown>; vorwerk?: Record<string, unknown>;
  /** nur Werte eigener Felder der Kategorien Kontakt + eigene Sparten */
  eigene: Record<string, unknown>;
  /** nur Produkt-Markierungen der eigenen Sparten */
  produkte: ProduktMarkierung[];
}
import { formatDateTime } from './util.ts';
import { markierungenText, type ProduktMarkierung } from './produkte.ts';
import { sichtbareFelder, feldText, feldWertLesen, type FeldEinstellungen } from './felder.ts';

interface GruppeInfo { key: Gruppe; label: string; anbieter: string; sparten: Sparte[]; /** Notizen mit diesen Sparten zusammen sind noch erlaubt (alte PV/WP-Notizen) */ verwandt: Sparte[] }
export const GRUPPEN: Record<Gruppe, GruppeInfo> = {
  pv: { key: 'pv', label: 'Photovoltaik (Enpal)', anbieter: 'Enpal', sparten: ['pv'], verwandt: ['pv', 'wp'] },
  wp: { key: 'wp', label: 'Wärmepumpe (GALVANY)', anbieter: 'GALVANY', sparten: ['wp'], verwandt: ['pv', 'wp'] },
  vorwerk: { key: 'vorwerk', label: 'Vorwerk', anbieter: 'Vorwerk', sparten: ['vorwerk'], verwandt: ['vorwerk'] },
};

export const PLATZHALTER = ['name', 'vorname', 'nachname', 'firma', 'anrede', 'adresse', 'telefon', 'email', 'sparten', 'status', 'daten', 'notizen', 'datum', 'absender'];

function gruppeOrThrow(gruppe: string): GruppeInfo {
  const g = GRUPPEN[gruppe as Gruppe];
  if (!g) throw new Error(`Unbekannte Textgruppe: ${gruppe}`);
  return g;
}

/** Gehört eine Notiz ausschließlich zu dieser Gruppe? */
export function notizErlaubt(notiz: { sparten?: Sparte[] }, gruppe: string): boolean {
  const g = gruppeOrThrow(gruppe);
  return Array.isArray(notiz.sparten) && g.sparten.some((s) => notiz.sparten!.includes(s)) && notiz.sparten.every((s) => g.verwandt.includes(s));
}

/** Stufe 1: Kunde auf Stammdaten + eigene Sparten reduzieren. */
export function projizieren(kunde: Kunde, gruppe: string, fe?: FeldEinstellungen): Projektion {
  const g = gruppeOrThrow(gruppe);
  // Eigene Felder nur, wenn ihre Kategorie Kontakt oder eine Sparte der Gruppe ist (R-TEXT)
  const erlaubt = new Set((fe?.eigene || []).filter((f) => f.kategorie === 'kontakt' || g.sparten.includes(f.kategorie as Sparte)).map((f) => f.id));
  const eigene = Object.fromEntries(Object.entries(kunde.eigene || {}).filter(([id]) => erlaubt.has(id)));
  const p: Projektion = {
    anrede: kunde.anrede, vorname: kunde.vorname, nachname: kunde.nachname, firma: kunde.firma,
    strasse: kunde.strasse, plz: kunde.plz, ort: kunde.ort, telefon: kunde.telefon, email: kunde.email,
    status: {},
    notizen: (kunde.notizen || []).filter((n) => notizErlaubt(n, gruppe)).map((n) => ({ ...n })),
    eigene,
    produkte: (kunde.produkte || []).filter((m) => g.sparten.includes(m.bereich)).map((m) => ({ ...m })),
  };
  for (const s of g.sparten) {
    p.status[s] = kunde.status?.[s] ?? 'unbekannt';
    p[s] = { ...(kunde[s] || {}) };
  }
  // Die Enpal-Gesprächsdokumentation gehört ausschließlich zu Photovoltaik (Enpal).
  if (gruppe === 'pv') {
    p.enpalKontakte = (kunde.enpalKontakte || []).map((c) => ({ ...c, themen: (c.themen || []).filter((t) => g.sparten.includes(t)) }));
  }
  return p;
}

function feldWert(f: Feld, v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (f.type === 'bool') return v ? 'ja' : 'nein';
  if (f.type === 'number') return `${String(v).replace('.', ',')}${f.unit ? ` ${f.unit}` : ''}`;
  return String(v);
}

function datenBlock(p: Projektion, g: GruppeInfo, nur: Sparte[] = g.sparten, fe?: FeldEinstellungen): string {
  const teile: string[] = [];
  // Eigene Kontaktfelder (Feldverwaltung), ausgeblendete nicht
  const kontaktZeilen = fe ? sichtbareFelder('kontakt', fe).filter((f) => f.eigen).map((f) => [f.label, feldText(f, feldWertLesen(p, f))]).filter(([, w]) => w !== null) : [];
  if (kontaktZeilen.length) teile.push(`Weitere Angaben\n${kontaktZeilen.map(([l, w]) => `- ${l}: ${w}`).join('\n')}`);
  for (const s of g.sparten.filter((x) => nur.includes(x))) {
    const zeilen: string[] = [];
    const st = p.status[s];
    if (st && st !== 'unbekannt') zeilen.push(`Status: ${STATUS[st].label}`);
    const prod = markierungenText(p.produkte, s);
    if (prod) zeilen.push(`Produkte – ${prod}`);
    if (fe) {
      for (const f of sichtbareFelder(s, fe)) {
        const w = feldText(f, feldWertLesen(p, f));
        if (w !== null) zeilen.push(`${f.label}: ${w}`);
      }
    } else for (const f of FELDER[s]) {
      const w = feldWert(f, p[s]?.[f.key]);
      if (w !== null) zeilen.push(`${f.label}: ${w}`);
    }
    if (zeilen.length) teile.push(`${SPARTEN[s].label}\n${zeilen.map((z) => `- ${z}`).join('\n')}`);
  }
  return teile.length ? teile.join('\n\n') : '(keine Angaben erfasst)';
}

function notizenBlock(p: Projektion): string {
  const list = notizenSortiert(p);
  if (!list.length) return '(keine)';
  return list.map((n) => `${formatDateTime(n.zeitpunkt)}: ${n.text.trim()}`).join('\n');
}

/** Stufe 2: Kontext für Platzhalter – ausschließlich aus der Projektion. */
export function kontext(kunde: Kunde, gruppe: string, einstellungen: EinstellungenTeil = {}): Record<string, string> {
  const g = gruppeOrThrow(gruppe);
  const p = projizieren(kunde, gruppe, einstellungen.felder);
  const aktiv = g.sparten.filter((s) => !['unbekannt', 'kein_interesse'].includes(p.status[s] ?? 'unbekannt'));
  const spartenLabel = (aktiv.length ? aktiv : g.sparten).map((s) => SPARTEN[s].label).join(' & ');
  return {
    name: kundenName(p, 'vorname') || '(ohne Namen)',
    vorname: p.vorname, nachname: p.nachname, firma: p.firma, anrede: p.anrede,
    adresse: adresseEinzeilig(p) || '–',
    telefon: p.telefon || '–',
    email: p.email || '–',
    sparten: spartenLabel,
    status: g.sparten.map((s) => `${SPARTEN[s].label}: ${STATUS[p.status[s] ?? 'unbekannt'].label}`).join(', '),
    daten: datenBlock(p, g, g.sparten, einstellungen.felder),
    notizen: notizenBlock(p),
    datum: formatDateTime(new Date().toISOString()).slice(0, 10),
    absender: einstellungen.absender || '',
  };
}

/** Ersetzt {{platzhalter}}. Unbekannte Platzhalter werden zu leerem Text. */
export function rendern(vorlage: unknown, ctx: Record<string, unknown>): string {
  return String(vorlage ?? '').replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (_, key) =>
    PLATZHALTER.includes(key) && ctx[key] !== undefined && ctx[key] !== null ? String(ctx[key]) : '');
}

export function generiereText(kunde: Kunde, gruppe: string, einstellungen: EinstellungenTeil = {}): string {
  const vorlage = einstellungen.vorlagen?.[gruppe as Gruppe];
  return rendern(vorlage, kontext(kunde, gruppe, einstellungen)).replace(/\n{3,}/g, '\n\n').trim();
}

/** Zählt Notizen, die wegen Mischung/fehlender Sparte in keinem Text erscheinen. */
export function ausgelasseneNotizen(kunde: Kunde): number {
  return (kunde.notizen || []).filter((n) => !GRUPPEN_KEYS.some((g) => notizErlaubt(n, g))).length;
}

// ---------- Enpal-Gesprächsdokumentation (Lead-Nachweis) ----------

function kontaktBlock(p: Projektion, c: EnpalKontakt): string {
  const themen: Sparte[] = c.themen.length ? c.themen : ['pv'];
  const z = [
    `${KONTAKTART[c.art] || 'Kontakt'} am ${formatDateTime(c.zeitpunkt)} Uhr`,
    `Kunde erreicht: ${c.erreicht ? 'ja' : 'nein'}${c.gespraechspartner ? ` – Gesprächspartner: ${c.gespraechspartner}` : ''}`,
    `Themen: ${themen.map((t) => SPARTEN[t].label).join(', ')}`,
    `Aktueller Status: ${themen.map((t) => `${SPARTEN[t].label} ${STATUS[p.status[t] ?? 'unbekannt'].label}`).join(', ')}`,
    c.ergebnis ? `Ergebnis: ${AUSGANG[c.ergebnis]}` : '',
    c.naechsterSchritt ? `Nächster Schritt: ${c.naechsterSchritt}` : '',
    c.frist ? `Frist / Wiedervorlage: ${formatDateTime(c.frist)} Uhr` : '',
  ].filter(Boolean);
  if (c.notiz.trim()) z.push('', 'Gesprächsinhalt:', c.notiz.trim());
  return z.join('\n');
}

function kundenKopf(p: Projektion): string {
  return [
    `Kunde: ${kundenName(p, 'vorname') || '(ohne Namen)'}`,
    `Adresse: ${adresseEinzeilig(p) || '–'}`,
    `Telefon: ${p.telefon || '–'}`,
    `E-Mail: ${p.email || '–'}`,
  ].join('\n');
}

/**
 * Kopierfertiger Text EINES Kontakts für die Enpal-App.
 * Arbeitet nur mit der Enpal-Projektion (R-TEXT): Vorwerk kann nicht vorkommen.
 */
export function enpalDokuText(kunde: Kunde, kontaktId: string, einstellungen: EinstellungenTeil = {}): string {
  const p = projizieren(kunde, 'pv', einstellungen.felder);
  const c = (p.enpalKontakte || []).find((x) => x.id === kontaktId);
  if (!c) return '';
  const g = GRUPPEN.pv;
  const daten = datenBlock(p, g, c.themen.length ? c.themen : g.sparten, einstellungen.felder);
  return [
    'Gesprächsdokumentation Enpal',
    '',
    kundenKopf(p),
    '',
    kontaktBlock(p, c),
    '',
    'Erfasste Daten:',
    daten,
    einstellungen.absender ? `\nDokumentiert von: ${einstellungen.absender}` : '',
  ].filter((x) => x !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Alle Enpal-Kontakte eines Kunden chronologisch (älteste zuerst). */
export function enpalVerlaufText(kunde: Kunde, einstellungen: EinstellungenTeil = {}): string {
  const p = projizieren(kunde, 'pv');
  const liste = [...(p.enpalKontakte || [])].sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? -1 : 1));
  if (!liste.length) return '';
  return [
    'Gesprächsdokumentation Enpal – Verlauf',
    '',
    kundenKopf(p),
    ...liste.flatMap((c, i) => ['', `--- Kontakt ${i + 1} ---`, kontaktBlock(p, c)]),
    einstellungen.absender ? `\nDokumentiert von: ${einstellungen.absender}` : '',
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
