// Sperling – Vertriebswerkzeuge (rein, ohne DOM, in Node testbar):
// Angebote mit Betrag und Frist, Auftragsstand nach dem Abschluss mit Pflege-Wiedervorlagen,
// Ansprechpartner bei Firmen, Ergebnisse an der Haustür, Terminbestätigung an den Kunden und die Tagesroute.
// Datenfelder am Kunden ab Schema 9: angebote, auftrag, ansprechpartner, haustuer (siehe docs/DATENMODELL.md).
import { type Rec, uid, nowIso, isValidDate, parseNumber, distanceMeters } from './util.ts';
import type { Sparte, Kunde, Termin, Daten, StatusKey } from './model.ts';

// model.ts importiert die Normalisierer von hier; deshalb keine Laufzeit-Importe aus model.ts (Kreis).
const SPARTEN: Sparte[] = ['pv', 'wp', 'vorwerk'];
const SPARTE_LABEL: Record<Sparte, string> = { pv: 'Photovoltaik', wp: 'Wärmepumpe', vorwerk: 'Vorwerk' };
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : v === null || v === undefined ? '' : String(v).slice(0, max));
const iso = (v: unknown): string | null => (isValidDate(v) ? new Date(v as string).toISOString() : null);
/** Kalendertag JJJJ-MM-TT oder '' */
const tagWert = (v: unknown): string => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && isValidDate(`${v}T12:00:00`) ? v : '');

/** Kalendertag in Ortszeit (JJJJ-MM-TT). */
export function ortsTag(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
/** Tag + n Tage um `stunde` Uhr Ortszeit als ISO-String. */
export function tagPlus(tag: string, n: number, stunde = 10): string {
  const [j, m, t] = tag.split('-').map(Number);
  return new Date(j!, m! - 1, t! + n, stunde, 0, 0, 0).toISOString();
}

export function euro(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '–';
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
}

// ---------- Angebote ----------

export const ANGEBOT_STATUS = {
  offen: 'Offen',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
  zurueckgezogen: 'Zurückgezogen / ersetzt',
};
export type AngebotStatus = keyof typeof ANGEBOT_STATUS;
export const ANGEBOTE_MAX = 200;
/** Nach so vielen Tagen legt Sperling auf Wunsch eine Nachfass-Wiedervorlage an. */
export const NACHFASS_TAGE = [3, 7];

export function normalizeAngebot(a: unknown) {
  const src: Rec = a && typeof a === 'object' ? a : {};
  const t = nowIso();
  const b = typeof src.betrag === 'number' ? src.betrag : parseNumber(src.betrag);
  const datum = iso(src.datum) || t;
  const bis = iso(src.gueltigBis);
  return {
    id: typeof src.id === 'string' && src.id ? src.id.slice(0, 100) : uid(),
    sparte: (SPARTEN.includes(src.sparte) ? src.sparte : 'pv') as Sparte,
    /** z. B. „PV 9,8 kWp mit Speicher“ */
    titel: str(src.titel, 200),
    /** Euro brutto, null = nicht bekannt */
    betrag: b !== null && Number.isFinite(b) && b >= 0 && b < 1e8 ? Math.round(b * 100) / 100 : null,
    datum,
    gueltigBis: bis && bis >= datum ? bis : null,
    status: (src.status in ANGEBOT_STATUS ? src.status : 'offen') as AngebotStatus,
    /** Wann angenommen/abgelehnt/zurückgezogen (null solange offen) */
    entschieden: src.status in ANGEBOT_STATUS && src.status !== 'offen' ? iso(src.entschieden) : null,
    notiz: str(src.notiz, 5000),
    createdAt: iso(src.createdAt) || t,
    updatedAt: iso(src.updatedAt) || t,
  };
}
export type Angebot = ReturnType<typeof normalizeAngebot>;

export function neuesAngebot(partial: Rec = {}): Angebot {
  const t = nowIso();
  return normalizeAngebot({ id: uid(), datum: t, createdAt: t, updatedAt: t, ...partial });
}

/** Offen und über die Frist hinaus? */
export function angebotAbgelaufen(a: Angebot, jetzt = nowIso()): boolean {
  return a.status === 'offen' && !!a.gueltigBis && a.gueltigBis < jetzt;
}

export interface OffenesAngebot { kunde: Kunde; angebot: Angebot; tageOffen: number; abgelaufen: boolean; tageBisFrist: number | null }
/** Alle offenen Angebote über alle Kunden, älteste zuerst. */
export function offeneAngebote(kunden: readonly Kunde[], jetzt = nowIso(), sparte: Sparte | '' = ''): OffenesAngebot[] {
  const j = new Date(jetzt).getTime();
  const out: OffenesAngebot[] = [];
  for (const k of kunden) for (const a of k.angebote || []) {
    if (a.status !== 'offen' || (sparte && a.sparte !== sparte)) continue;
    out.push({
      kunde: k, angebot: a,
      tageOffen: Math.max(0, Math.floor((j - new Date(a.datum).getTime()) / 86400000)),
      abgelaufen: angebotAbgelaufen(a, jetzt),
      tageBisFrist: a.gueltigBis ? Math.ceil((new Date(a.gueltigBis).getTime() - j) / 86400000) : null,
    });
  }
  return out.sort((x, y) => (x.angebot.datum < y.angebot.datum ? -1 : 1));
}

/** Summe der bekannten Beträge (Angebote ohne Betrag zählen nicht mit). */
export function angebotsSumme(liste: readonly { angebot: Angebot }[] | readonly Angebot[]): number {
  let s = 0;
  for (const x of liste) { const a = 'angebot' in x ? x.angebot : x; if (a.betrag !== null) s += a.betrag; }
  return Math.round(s * 100) / 100;
}

export const nachfassTitel = (a: Pick<Angebot, 'titel' | 'sparte'>) => `Angebot nachfassen: ${a.titel || SPARTE_LABEL[a.sparte]}`;

/** Wiedervorlagen zum Nachfassen (Tag 3 und 7 nach dem Angebot, 10 Uhr); vergangene Tage entfallen. */
export function nachfassTermine(a: Angebot, kundeId: string, jetzt = nowIso()): Rec[] {
  const tag = ortsTag(a.datum);
  return NACHFASS_TAGE.map((n) => ({
    kundeId, sparte: a.sparte, art: 'wiedervorlage', titel: nachfassTitel(a), beginn: tagPlus(tag, n), dauerMin: 15,
    notiz: `${n} Tage nach dem Angebot vom ${tag.split('-').reverse().join('.')}${a.betrag !== null ? ` (${euro(a.betrag)})` : ''}. Fragen, ob alles verständlich ist und was noch offen ist.`,
  })).filter((t) => t.beginn > jetzt);
}

/** Offene Nachfass-Wiedervorlagen eines Angebots (für „erledigt“ beim Annehmen/Ablehnen). */
export function offeneNachfass(termine: readonly Termin[], kundeId: string, a: Angebot): Termin[] {
  const titel = nachfassTitel(a);
  return termine.filter((t) => t.kundeId === kundeId && !t.erledigt && t.art === 'wiedervorlage' && t.sparte === a.sparte && t.titel === titel);
}

// ---------- Auftragsstand nach dem Abschluss ----------

export interface AuftragSchritt { key: string; label: string; hinweis: string }
export const AUFTRAG_SCHRITTE: Record<Sparte, AuftragSchritt[]> = {
  pv: [
    { key: 'vertrag', label: 'Vertrag unterschrieben', hinweis: 'Widerrufsfrist 14 Tage' },
    { key: 'planung', label: 'Planung / Technik-Check', hinweis: 'Dach, Zählerschrank, Belegung' },
    { key: 'montage', label: 'Montage', hinweis: 'Termin mit dem Montageteam' },
    { key: 'netz', label: 'Netzanmeldung / Zählertausch', hinweis: 'über den Netzbetreiber' },
    { key: 'inbetrieb', label: 'Inbetriebnahme', hinweis: 'Anlage läuft' },
  ],
  wp: [
    { key: 'vertrag', label: 'Vertrag unterschrieben', hinweis: 'Widerrufsfrist 14 Tage' },
    { key: 'foerderung', label: 'Förderantrag gestellt', hinweis: 'vor Beginn der Arbeiten' },
    { key: 'planung', label: 'Vor-Ort-Termin / Planung', hinweis: 'Heizlast, Aufstellort' },
    { key: 'montage', label: 'Einbau', hinweis: 'Termin mit dem Einbauteam' },
    { key: 'inbetrieb', label: 'Inbetriebnahme', hinweis: 'Anlage läuft' },
  ],
  vorwerk: [
    { key: 'vertrag', label: 'Gekauft / bestellt', hinweis: '' },
    { key: 'lieferung', label: 'Geliefert / übergeben', hinweis: '' },
    { key: 'einweisung', label: 'Einweisung gemacht', hinweis: 'Bedienung, Pflege, Zubehör' },
  ],
};

function normalizeAuftragSparte(sparte: Sparte, v: unknown) {
  const src: Rec = v && typeof v === 'object' ? v : {};
  const roh: Rec = src.schritte && typeof src.schritte === 'object' ? src.schritte : {};
  const schritte: Record<string, { datum: string; erledigt: boolean }> = {};
  for (const s of AUFTRAG_SCHRITTE[sparte]) {
    const x: Rec = roh[s.key] && typeof roh[s.key] === 'object' ? roh[s.key] : {};
    schritte[s.key] = { datum: tagWert(x.datum), erledigt: x.erledigt === true };
  }
  return { schritte, notiz: str(src.notiz, 5000) };
}
export type AuftragSparte = ReturnType<typeof normalizeAuftragSparte>;
export type Auftrag = Partial<Record<Sparte, AuftragSparte>>;

/** Nur Sparten, für die ein Auftrag begonnen wurde. */
export function normalizeAuftrag(v: unknown): Auftrag {
  const src: Rec = v && typeof v === 'object' ? v : {};
  const out: Auftrag = {};
  for (const s of SPARTEN) if (src[s] && typeof src[s] === 'object') out[s] = normalizeAuftragSparte(s, src[s]);
  return out;
}

export function neuerAuftrag(sparte: Sparte, vertragTag = ''): AuftragSparte {
  return normalizeAuftragSparte(sparte, { schritte: vertragTag ? { vertrag: { datum: vertragTag, erledigt: true } } : {} });
}

export interface AuftragStand {
  erledigt: number; gesamt: number;
  /** zuletzt erledigter Schritt */
  zuletzt: AuftragSchritt | null;
  /** nächster offener Schritt mit geplantem Tag ('' = ohne Termin) */
  naechster: (AuftragSchritt & { datum: string }) | null;
  fertig: boolean;
  /** Tag des letzten Schritts, wenn fertig */
  fertigAm: string;
}
export function auftragStand(sparte: Sparte, a: AuftragSparte | undefined): AuftragStand {
  const schritte = AUFTRAG_SCHRITTE[sparte];
  let erledigt = 0; let zuletzt: AuftragSchritt | null = null; let naechster: AuftragStand['naechster'] = null;
  for (const s of schritte) {
    const x = a?.schritte[s.key];
    if (x?.erledigt) { erledigt++; zuletzt = s; } else if (!naechster) naechster = { ...s, datum: x?.datum || '' };
  }
  const letzter = schritte[schritte.length - 1]!;
  const fertig = !!a?.schritte[letzter.key]?.erledigt;
  return { erledigt, gesamt: schritte.length, zuletzt, naechster: fertig ? null : naechster, fertig, fertigAm: fertig ? a!.schritte[letzter.key]!.datum : '' };
}

/** Kurzer Satz für Kundenliste und Kopiertext, z. B. „Montage geplant am 12.03.2027 (2 von 5)“. */
export function auftragText(sparte: Sparte, a: AuftragSparte | undefined): string {
  if (!a) return '';
  const st = auftragStand(sparte, a);
  if (st.fertig) return `Fertig${st.fertigAm ? ` seit ${st.fertigAm.split('-').reverse().join('.')}` : ''}`;
  const n = st.naechster;
  const teil = n ? (n.datum ? `${n.label} geplant am ${n.datum.split('-').reverse().join('.')}` : `Als Nächstes: ${n.label}`) : '';
  return `${teil} (${st.erledigt} von ${st.gesamt})`;
}

/** Kundentext auf die Frage „Wie weit ist mein Auftrag?“ (zum Kopieren, nur eine Sparte, R-TEXT). */
export function auftragKundentext(sparte: Sparte, a: AuftragSparte, anrede: string, absender = ''): string {
  const zeilen = AUFTRAG_SCHRITTE[sparte].map((s) => {
    const x = a.schritte[s.key]!;
    const d = x.datum ? x.datum.split('-').reverse().join('.') : '';
    return `${x.erledigt ? '✓' : '○'} ${s.label}${x.erledigt ? (d ? ` (${d})` : '') : d ? ` – geplant am ${d}` : ''}`;
  });
  return `${anrede}\n\nhier der aktuelle Stand zu Ihrem Auftrag ${SPARTE_LABEL[sparte]}:\n\n${zeilen.join('\n')}\n\nBei Fragen melden Sie sich gern jederzeit.\n\nViele Grüße${absender ? `\n${absender}` : ''}`;
}

export interface PflegeVorschlag { key: string; titel: string; beginn: string; sparte: Sparte; notiz: string }
/** Wiedervorlagen zur Kundenpflege nach dem letzten Auftragsschritt (Zufriedenheit, Jahrestag/Wartung). */
export function pflegeVorschlaege(sparte: Sparte, fertigAm: string, jetzt = nowIso()): PflegeVorschlag[] {
  const tag = fertigAm || ortsTag(jetzt);
  const v = (key: string, n: number, titel: string, notiz: string): PflegeVorschlag => ({ key, titel, beginn: tagPlus(tag, n), sparte, notiz });
  const liste: Record<Sparte, PflegeVorschlag[]> = {
    pv: [
      v('zufrieden', 28, 'Nachfragen: Läuft die PV-Anlage wie erwartet?', 'Zufriedenheit, App/Monitoring verstanden? Bei Zufriedenheit nach einer Empfehlung fragen.'),
      v('jahr', 365, 'Ein Jahr PV-Anlage: Bilanz besprechen', 'Ertrag und Eigenverbrauch des ersten Jahres. Interesse an Speicher, Wallbox oder Wärmepumpe?'),
    ],
    wp: [
      v('zufrieden', 28, 'Nachfragen: Ist es mit der Wärmepumpe warm genug?', 'Zufriedenheit, Einstellungen verstanden? Bei Zufriedenheit nach einer Empfehlung fragen.'),
      v('heizperiode', 180, 'Nach der Heizperiode: Verbrauch besprechen', 'Stromverbrauch der Wärmepumpe, Komfort. Passt PV dazu?'),
      v('wartung', 365, 'Wärmepumpe: jährliche Wartung', 'An die Wartung erinnern.'),
    ],
    vorwerk: [
      v('zufrieden', 14, 'Nachfragen: Zufrieden mit dem neuen Gerät?', 'Bedienung, Zubehör, Fragen? Bei Zufriedenheit nach einer Empfehlung fragen.'),
      v('service', 365, 'Vorwerk: Service nach einem Jahr', 'Gerät prüfen, Verschleißteile, Zubehör und Verbrauchsmaterial anbieten.'),
    ],
  };
  return liste[sparte].filter((x) => x.beginn > jetzt);
}

/** Pflege-Wiedervorlage schon vorhanden (gleicher Kunde, Sparte, Titel)? */
export function pflegeVorhanden(termine: readonly Termin[], kundeId: string, p: Pick<PflegeVorschlag, 'titel' | 'sparte'>): boolean {
  return termine.some((t) => t.kundeId === kundeId && t.sparte === p.sparte && t.titel === p.titel);
}

// ---------- Ansprechpartner (Firmen, Höfe, Haushalte mit mehreren Beteiligten) ----------

export const ROLLEN = {
  entscheider: 'Entscheidet',
  technik: 'Technik / Haustechnik',
  finanzen: 'Buchhaltung / Finanzen',
  nutzer: 'Nutzt es im Alltag',
  sonstiges: 'Sonstiges',
};
export type Rolle = keyof typeof ROLLEN;
export const ANSPRECHPARTNER_MAX = 30;

export function normalizeAnsprechpartner(a: unknown) {
  const src: Rec = a && typeof a === 'object' ? a : {};
  return {
    id: typeof src.id === 'string' && src.id ? src.id.slice(0, 100) : uid(),
    name: str(src.name, 200),
    rolle: (src.rolle in ROLLEN ? src.rolle : 'sonstiges') as Rolle,
    /** Funktion im Betrieb, frei, z. B. „Geschäftsführer“, „Hofnachfolger“ */
    funktion: str(src.funktion, 200),
    telefon: str(src.telefon, 100),
    email: str(src.email, 200),
    notiz: str(src.notiz, 2000),
  };
}
export type Ansprechpartner = ReturnType<typeof normalizeAnsprechpartner>;

// ---------- Haustür ----------

export const HAUSTUER = {
  nicht_da: { label: 'Nicht angetroffen', kurz: 'Nicht da', symbol: '🚪', kontakt: false },
  spaeter: { label: 'Später wiederkommen', kurz: 'Später', symbol: '⏰', kontakt: true },
  gespraech: { label: 'Gespräch geführt', kurz: 'Gespräch', symbol: '💬', kontakt: true },
  kein_interesse: { label: 'Kein Interesse', kurz: 'Kein Interesse', symbol: '✋', kontakt: true },
  werbeverbot: { label: 'Keine Werbung erwünscht', kurz: 'Keine Werbung', symbol: '⛔', kontakt: false },
};
export type HaustuerErgebnis = keyof typeof HAUSTUER;
export const HAUSTUER_KEYS = Object.keys(HAUSTUER) as HaustuerErgebnis[];
export const HAUSTUER_MAX = 200;

export function normalizeHaustuer(h: unknown) {
  const src: Rec = h && typeof h === 'object' ? h : {};
  if (!(src.ergebnis in HAUSTUER)) return null;
  return {
    id: typeof src.id === 'string' && src.id ? src.id.slice(0, 100) : uid(),
    zeitpunkt: iso(src.zeitpunkt) || nowIso(),
    ergebnis: src.ergebnis as HaustuerErgebnis,
    notiz: str(src.notiz, 2000),
  };
}
export type HaustuerEintrag = NonNullable<ReturnType<typeof normalizeHaustuer>>;

export function neuerHaustuerEintrag(ergebnis: HaustuerErgebnis, notiz = '', zeitpunkt = nowIso()): HaustuerEintrag {
  return normalizeHaustuer({ id: uid(), ergebnis, notiz, zeitpunkt })!;
}

/** Jüngstes Haustür-Ergebnis oder null. */
export function letzteHaustuer(k: { haustuer?: HaustuerEintrag[] }): HaustuerEintrag | null {
  let best: HaustuerEintrag | null = null;
  for (const h of k.haustuer || []) if (!best || h.zeitpunkt > best.zeitpunkt) best = h;
  return best;
}

/** „Keine Werbung erwünscht“ gilt, solange es das jüngste Haustür-Ergebnis ist. */
export function werbeverbot(k: { haustuer?: HaustuerEintrag[] }): boolean {
  return letzteHaustuer(k)?.ergebnis === 'werbeverbot';
}

/**
 * Statusänderung durch ein Haustür-Ergebnis: „Kein Interesse“ setzt nur Sparten, die bisher nur vermutet
 * waren (Potenzial), auf „Kein Interesse“. „Gespräch geführt“ hebt vermutete Sparten nicht an (das entscheidet Jan).
 */
export function haustuerStatus(status: Record<Sparte, StatusKey>, ergebnis: HaustuerErgebnis): Record<Sparte, StatusKey> {
  const neu = { ...status };
  if (ergebnis === 'kein_interesse') for (const s of SPARTEN) if (neu[s] === 'potenzial') neu[s] = 'kein_interesse';
  return neu;
}

// ---------- Terminbestätigung ----------

export const BEREITLEGEN: Record<Sparte, string[]> = {
  pv: ['die letzte Stromrechnung (Jahresabrechnung)', 'ein Foto vom Zählerschrank', 'falls vorhanden: Pläne oder Maße vom Dach'],
  wp: ['die letzte Abrechnung für Gas, Öl oder Strom der Heizung', 'ein Foto vom Typenschild der Heizung', 'Wohnfläche und Baujahr des Hauses'],
  vorwerk: ['Ihr jetziges Gerät, falls wir vergleichen möchten', 'Ihre Fragen und Wünsche, gern auf einem Zettel'],
};

const WOCHENTAG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export function anredeZeile(k: Pick<Kunde, 'anrede' | 'vorname' | 'nachname'> | null | undefined): string {
  if (!k) return 'Guten Tag,';
  const an = (k.anrede || '').trim();
  if (k.nachname && /^(frau|herr)$/i.test(an)) return `Guten Tag ${an[0]!.toUpperCase()}${an.slice(1).toLowerCase()} ${k.nachname},`;
  const name = [k.vorname, k.nachname].filter(Boolean).join(' ');
  return name ? `Guten Tag ${name},` : 'Guten Tag,';
}

export interface BestaetigungOptionen { bereitlegen: string[]; absender?: string; ort?: string }
/** Text der Terminbestätigung (SMS, WhatsApp oder E-Mail). Ohne Anbieternamen, ohne Preise. */
export function terminBestaetigung(t: Pick<Termin, 'beginn' | 'sparte' | 'dauerMin'>, k: Pick<Kunde, 'anrede' | 'vorname' | 'nachname'> | null, o: BestaetigungOptionen): string {
  const d = new Date(t.beginn);
  const tag = `${WOCHENTAG[d.getDay()]}, ${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  const uhr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const thema = t.sparte ? ` zur Beratung ${SPARTE_LABEL[t.sparte]}` : '';
  const teile = [
    anredeZeile(k),
    `gern bestätige ich unseren Termin${thema} am ${tag} um ${uhr} Uhr${o.ort ? ` (${o.ort})` : ''}.`,
  ];
  if (o.bereitlegen.length) teile.push(`Damit wir die Zeit gut nutzen, legen Sie bitte bereit, falls zur Hand:\n${o.bereitlegen.map((b) => `- ${b}`).join('\n')}`);
  teile.push('Falls der Termin doch nicht passt, geben Sie mir bitte kurz Bescheid, dann finden wir einen neuen.');
  teile.push(`Viele Grüße${o.absender ? `\n${o.absender}` : ''}`);
  return teile.join('\n\n');
}

/** Telefonnummer für WhatsApp (international ohne +, deutsche 0… → 49…). '' wenn unbrauchbar. */
export function waNummer(nr: string): string {
  let s = String(nr || '').trim();
  const plus = s.startsWith('+');
  s = s.replace(/\D/g, '');
  if (!plus) {
    if (s.startsWith('00')) s = s.slice(2);
    else if (s.startsWith('0')) s = `49${s.slice(1)}`;
  }
  return s.length >= 8 && s.length <= 15 ? s : '';
}
/** Nummer für sms: (Ziffern, + am Anfang erlaubt). */
export function smsNummer(nr: string): string {
  return String(nr || '').replace(/(?!^\+)[^\d]/g, '');
}
export const waUrl = (nr: string, text: string) => `https://wa.me/${waNummer(nr)}?text=${encodeURIComponent(text)}`;
/** „?&body=“ versteht iOS und Android. */
export const smsUrl = (nr: string, text: string) => `sms:${smsNummer(nr)}?&body=${encodeURIComponent(text)}`;

// ---------- Tagesroute ----------

export interface Stopp { termin: Termin; kunde: Kunde | null; lat: number | null; lng: number | null; nr: number }
/** Termine (keine Wiedervorlagen) eines Tages in zeitlicher Reihenfolge, mit Standort des Kunden. */
export function tagesStopps(data: Pick<Daten, 'termine' | 'kunden'>, tag: string): Stopp[] {
  const liste = data.termine.filter((t) => t.art === 'termin' && ortsTag(t.beginn) === tag).sort((a, b) => (a.beginn < b.beginn ? -1 : a.beginn > b.beginn ? 1 : 0));
  return liste.map((t, i) => {
    const k = t.kundeId ? data.kunden.find((x) => x.id === t.kundeId) || null : null;
    return { termin: t, kunde: k, lat: k?.lat ?? null, lng: k?.lng ?? null, nr: i + 1 };
  });
}

/** Fahrstrecke Luftlinie in km zwischen den Stopps mit Standort (grobe Schätzung). */
export function streckeKm(stopps: readonly Stopp[]): number {
  const p = stopps.filter((s) => s.lat !== null && s.lng !== null);
  let m = 0;
  for (let i = 1; i < p.length; i++) m += distanceMeters(p[i - 1]!.lat!, p[i - 1]!.lng!, p[i]!.lat!, p[i]!.lng!);
  return Math.round(m / 100) / 10;
}

/** Abstand eines Punkts zur Strecke a–b in Metern (flache Näherung, reicht für einige Kilometer). */
export function abstandZurStrecke(lat: number, lng: number, a: [number, number], b: [number, number]): number {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180); const ky = 110540;
  const px = (lng - a[1]) * kx; const py = (lat - a[0]) * ky;
  const bx = (b[1] - a[1]) * kx; const by = (b[0] - a[0]) * ky;
  const l2 = bx * bx + by * by;
  const t = l2 ? Math.max(0, Math.min(1, (px * bx + py * by) / l2)) : 0;
  return Math.hypot(px - t * bx, py - t * by);
}

export interface UnterwegsTreffer { kunde: Kunde; abstandM: number; grund: string; gewicht: number }
/**
 * Kunden entlang der Route, bei denen sich ein Besuch lohnt (für Lücken oder ausgefallene Termine):
 * offenes Angebot, fällige Wiedervorlage, Interesse oder Potenzial. Nie mit „Keine Werbung erwünscht“.
 */
export function unterwegs(data: Pick<Daten, 'termine' | 'kunden'>, stopps: readonly Stopp[], radiusM = 1500, max = 15, jetzt = nowIso()): UnterwegsTreffer[] {
  const pkt = stopps.filter((s) => s.lat !== null && s.lng !== null).map((s) => [s.lat!, s.lng!] as [number, number]);
  if (!pkt.length) return [];
  const imPlan = new Set(stopps.map((s) => s.kunde?.id).filter(Boolean));
  const faellig = new Set(data.termine.filter((t) => !t.erledigt && t.art === 'wiedervorlage' && t.beginn <= jetzt && t.kundeId).map((t) => t.kundeId));
  const out: UnterwegsTreffer[] = [];
  for (const k of data.kunden) {
    if (imPlan.has(k.id) || k.lat === null || k.lng === null || werbeverbot(k)) continue;
    let ab = Infinity;
    if (pkt.length === 1) ab = distanceMeters(k.lat, k.lng, pkt[0]![0], pkt[0]![1]);
    else for (let i = 1; i < pkt.length; i++) ab = Math.min(ab, abstandZurStrecke(k.lat, k.lng, pkt[i - 1]!, pkt[i]!));
    if (ab > radiusM) continue;
    const st = SPARTEN.map((s) => k.status[s]);
    let grund = ''; let gewicht = 0;
    if ((k.angebote || []).some((a) => a.status === 'offen')) { grund = 'Angebot offen'; gewicht = 4; }
    else if (faellig.has(k.id)) { grund = 'Wiedervorlage fällig'; gewicht = 3; }
    else if (st.includes('interesse') || st.includes('termin')) { grund = 'Interesse'; gewicht = 2; }
    else if (st.includes('potenzial')) { grund = letzteHaustuer(k)?.ergebnis === 'nicht_da' ? 'Potenzial, zuletzt nicht angetroffen' : 'Potenzial'; gewicht = 1; }
    if (!gewicht) continue;
    out.push({ kunde: k, abstandM: Math.round(ab), grund, gewicht });
  }
  return out.sort((a, b) => b.gewicht - a.gewicht || a.abstandM - b.abstandM).slice(0, max);
}

/** Route mit allen Stopps in Google Maps (nur Koordinaten, keine Namen; R-EXTERN). '' unter 2 Stopps. */
export function googleRoute(stopps: readonly Pick<Stopp, 'lat' | 'lng'>[]): string {
  const p = stopps.filter((s) => s.lat !== null && s.lng !== null).map((s) => `${s.lat},${s.lng}`);
  if (p.length < 2) return '';
  const wp = p.slice(1, -1).slice(0, 8);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(p[0]!)}&destination=${encodeURIComponent(p[p.length - 1]!)}${wp.length ? `&waypoints=${encodeURIComponent(wp.join('|'))}` : ''}&travelmode=driving`;
}
