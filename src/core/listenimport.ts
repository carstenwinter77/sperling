// Sperling – Vorwerk-Kundenliste aus einer digitalen PDF übernehmen (rein, ohne DOM, in Node testbar).
// Eingabe sind die Textstücke mit Position, wie pdf.js sie liefert (je Seite). Die Spalten werden an
// der Kopfzeile erkannt: Name, Straße, PLZ, Ort, Telefon, Sperre, EWE, EWE-Belegdatum, BNW, Notizen.
// EWE, EWE-Belegdatum, BNW und Sperre werden unverändert als Text übernommen (eigene Vorwerk-Felder).
// Die PDF verlässt das Gerät nie (R-EXTERN); gelesen wird nur im Arbeitsspeicher.
import { neuerKunde, neueNotiz, type Daten, type Kunde } from './model.ts';
import { normalizeEigenesFeld, type EigenesFeld } from './felder.ts';
import type { Rec } from './util.ts';
import { ANREDEN, anredeTeilen, titelNormalisieren } from './anrede.ts';

export interface TextStueck { str: string; x: number; y: number; w?: number }
export type Spalte = 'name' | 'strasse' | 'plz' | 'ort' | 'telefon' | 'sperre' | 'ewe' | 'eweDatum' | 'bnw' | 'notiz';

/** Erkennung der Kopfzeile: Texte (klein, ohne Sonderzeichen) → Spalte. Reihenfolge = Vorrang. */
const KOPF: [RegExp, Spalte][] = [
  [/^(ewe-?)?beleg(datum|-?datum)?$|^ewe-?datum$|^ewe-?belegdatum$/, 'eweDatum'],
  [/^ewe$/, 'ewe'],
  [/^bnw$/, 'bnw'],
  [/^sperre$|^gesperrt$|^sperrvermerk$/, 'sperre'],
  [/^name$|^kunde$|^nachname,?vorname$|^name,?vorname$/, 'name'],
  [/^stra(ss|ß)e$|^str\.?$|^anschrift$|^adresse$/, 'strasse'],
  [/^plz$/, 'plz'],
  [/^ort$|^wohnort$|^stadt$/, 'ort'],
  [/^telefon$|^tel\.?$|^telefonnummer$|^rufnummer$/, 'telefon'],
  [/^notiz(en)?$|^bemerkung(en)?$|^info$/, 'notiz'],
];
export const SPALTEN_LABEL: Record<Spalte, string> = {
  name: 'Name', strasse: 'Straße', plz: 'PLZ', ort: 'Ort', telefon: 'Telefon', sperre: 'Sperre', ewe: 'EWE', eweDatum: 'EWE-Belegdatum', bnw: 'BNW', notiz: 'Notizen',
};

/** Eigene Vorwerk-Felder für die Listenwerte (feste IDs, damit ein erneuter Import dieselben Felder trifft). */
export const LISTEN_FELDER: { spalte: Spalte; id: string; label: string }[] = [
  { spalte: 'sperre', id: 'vwliste-sperre', label: 'Sperre (Vorwerk-Liste)' },
  { spalte: 'ewe', id: 'vwliste-ewe', label: 'EWE' },
  { spalte: 'eweDatum', id: 'vwliste-ewe-datum', label: 'EWE-Belegdatum' },
  { spalte: 'bnw', id: 'vwliste-bnw', label: 'BNW' },
];

const norm = (s: string) => s.toLowerCase().replace(/[\s.:/()_]+/g, '').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
const kopfSpalte = (s: string): Spalte | null => {
  const n = norm(s).replace(/ae/g, 'a').replace(/ue/g, 'u').replace(/oe/g, 'o');
  const roh = norm(s);
  for (const [re, sp] of KOPF) if (re.test(roh) || re.test(n) || re.test(s.toLowerCase().replace(/\s+/g, ''))) return sp;
  return null;
};

/** Textstücke zu Zeilen (gleiche Höhe ± Toleranz), von oben nach unten, je Zeile von links nach rechts. */
export function zeilenBilden(stuecke: TextStueck[], toleranz = 3): TextStueck[][] {
  const sortiert = stuecke.filter((s) => s && typeof s.str === 'string' && s.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const zeilen: { y: number; teile: TextStueck[] }[] = [];
  for (const s of sortiert) {
    const z = zeilen.find((r) => Math.abs(r.y - s.y) <= toleranz);
    if (z) z.teile.push(s); else zeilen.push({ y: s.y, teile: [s] });
  }
  return zeilen.sort((a, b) => b.y - a.y).map((z) => z.teile.sort((a, b) => a.x - b.x));
}

export interface Kopf { spalten: { spalte: Spalte; x: number }[] }

/** Kopfzeile erkennen: mindestens Name und drei weitere bekannte Spalten. */
export function kopfErkennen(zeile: TextStueck[]): Kopf | null {
  const spalten: { spalte: Spalte; x: number }[] = [];
  // Mehrwortige Köpfe („EWE Belegdatum“) auch zusammengesetzt prüfen
  for (let i = 0; i < zeile.length; i++) {
    const zwei = i + 1 < zeile.length ? kopfSpalte(`${zeile[i]!.str}${zeile[i + 1]!.str}`) : null;
    const eins = kopfSpalte(zeile[i]!.str);
    const sp = zwei && zwei !== eins && (zwei === 'eweDatum') ? zwei : eins;
    if (sp && !spalten.some((x) => x.spalte === sp)) { spalten.push({ spalte: sp, x: zeile[i]!.x }); if (sp === zwei && zwei !== eins) i++; }
  }
  if (!spalten.some((s) => s.spalte === 'name') || spalten.length < 4) return null;
  return { spalten: spalten.sort((a, b) => a.x - b.x) };
}

export type Zeile = Partial<Record<Spalte, string>>;

/** Eine Datenzeile den Spalten zuordnen: jedes Stück gehört zur Spalte, deren Kopf links davon am nächsten liegt. */
function zuordnen(teile: TextStueck[], kopf: Kopf): Zeile {
  const z: Zeile = {};
  for (const t of teile) {
    let sp = kopf.spalten[0]!;
    for (const k of kopf.spalten) if (t.x >= k.x - 6) sp = k;
    const alt = z[sp.spalte];
    z[sp.spalte] = alt ? `${alt} ${t.str.trim()}` : t.str.trim();
  }
  return z;
}

const istKopfWiederholung = (z: Zeile) => Object.values(z).filter((v) => v && kopfSpalte(v)).length >= 3;
const istFusszeile = (teile: TextStueck[]) => teile.length <= 3 && /^(seite\s*\d+(\s*(von|\/)\s*\d+)?|\d+\s*\/\s*\d+|stand[:\s].*|gedruckt.*)$/i.test(teile.map((t) => t.str).join(' ').trim());

/**
 * Seiten (Textstücke je Seite) → Datenzeilen. Folgeseiten ohne eigene Kopfzeile nutzen die letzte.
 * Eine Zeile ohne Name, Straße und Telefon, aber mit Notiz, setzt die Notiz der vorigen fort.
 */
export function zeilenAusSeiten(seiten: TextStueck[][]): { zeilen: Zeile[]; kopf: Kopf | null } {
  let kopf: Kopf | null = null;
  const zeilen: Zeile[] = [];
  for (const seite of seiten) {
    const reihen = zeilenBilden(seite);
    // Hat die Seite eine eigene Kopfzeile, zählt nur, was darunter steht (Titel, Bezirk, Datum darüber nicht)
    const kopfIndex = reihen.findIndex((r) => kopfErkennen(r));
    for (const teile of kopfIndex >= 0 ? reihen.slice(kopfIndex) : reihen) {
      const k = kopfErkennen(teile);
      if (k) { kopf = k; continue; }
      if (!kopf || istFusszeile(teile)) continue;
      const z = zuordnen(teile, kopf);
      if (istKopfWiederholung(z)) continue;
      // Nur ein langer Text in der ersten Spalte, sonst nichts: Zwischenüberschrift, kein Kunde
      if (z.name && Object.keys(z).length === 1 && (z.name.length > 40 || /\d{2}\.\d{2}\.\d{4}|seite|stand|liste|bezirk/i.test(z.name))) continue;
      const vorige = zeilen[zeilen.length - 1];
      if (!z.name && !z.strasse && !z.telefon && !z.plz) {
        // Fortsetzung (umgebrochene Notiz oder Ort) der vorigen Zeile
        if (vorige) for (const [sp, v] of Object.entries(z) as [Spalte, string][]) vorige[sp] = vorige[sp] ? `${vorige[sp]} ${v}` : v;
        continue;
      }
      zeilen.push(z);
    }
  }
  return { zeilen, kopf };
}

// ---------- Abgleich ----------

export interface ListenEintrag {
  anrede: string; titel: string; vorname: string; nachname: string; strasse: string; plz: string; ort: string; telefon: string; notiz: string;
  werte: Record<string, string>; // feldId → Text (Sperre, EWE, EWE-Belegdatum, BNW)
}

/**
 * Name: „Nachname, Vorname“ oder „Vorname Nachname“ (letztes Wort = Nachname).
 * Anrede und Titel am Anfang („Herr Dr. Max Muster“, „Muster, Frau Dr. Erika“) kommen in eigene Felder (ab 0.15.0).
 */
export function nameTeilen(name: string): { anrede: string; titel: string; vorname: string; nachname: string } {
  const n = (name || '').replace(/\s+/g, ' ').trim();
  if (n.includes(',')) {
    const [nach, ...vor] = n.split(',');
    const v = vorspannAbtrennen(vor.join(',').trim());
    return { anrede: v.anrede, titel: v.titel, vorname: v.rest, nachname: nach!.trim() };
  }
  const v = vorspannAbtrennen(n);
  const w = v.rest.split(' ').filter(Boolean);
  if (w.length <= 1) return { anrede: v.anrede, titel: v.titel, vorname: '', nachname: v.rest || n };
  return { anrede: v.anrede, titel: v.titel, vorname: w.slice(0, -1).join(' '), nachname: w[w.length - 1]! };
}

/** Führende Anrede- und Titelwörter abtrennen („Herr Dr. Max“ → Herr, Dr., „Max“). */
function vorspannAbtrennen(text: string): { anrede: string; titel: string; rest: string } {
  const woerter = text.split(' ').filter(Boolean);
  let anrede = ''; const titel: string[] = [];
  while (woerter.length > 1) {
    const w = woerter[0]!;
    const a = anredeTeilen(w);
    if (!anrede && !titel.length && a.anrede && (ANREDEN as readonly string[]).includes(a.anrede)) { anrede = a.anrede; woerter.shift(); continue; }
    if (/^(dr|prof|dipl|med|dent|rer|nat|phil|jur|ing)\b[.-]?/i.test(w) && /[.-]/.test(w)) { titel.push(w); woerter.shift(); continue; }
    break;
  }
  return { anrede, titel: titelNormalisieren(titel.join(' ')), rest: woerter.join(' ') };
}

/** Straße mit PLZ/Ort, falls die Liste „Musterweg 1, 38268 Lengede“ in einer Spalte hat. */
function adresseTeilen(z: Zeile): { strasse: string; plz: string; ort: string } {
  let strasse = (z.strasse || '').trim(); let plz = (z.plz || '').trim(); let ort = (z.ort || '').trim();
  const m = strasse.match(/^(.*?),?\s+(\d{5})\s+(.+)$/);
  if (m && !plz) { strasse = m[1]!.trim(); plz = m[2]!; ort = ort || m[3]!.trim(); }
  const p = plz.match(/^(\d{5})\s+(.+)$/);
  if (p) { plz = p[1]!; ort = ort || p[2]!.trim(); }
  return { strasse, plz, ort };
}

export function eintragAusZeile(z: Zeile): ListenEintrag | null {
  if (!z.name?.trim()) return null;
  const { anrede, titel, vorname, nachname } = nameTeilen(z.name);
  const werte: Record<string, string> = {};
  for (const f of LISTEN_FELDER) { const v = (z[f.spalte] || '').trim(); if (v) werte[f.id] = v.slice(0, 500); }
  return { anrede, titel, vorname, nachname, ...adresseTeilen(z), telefon: (z.telefon || '').trim().slice(0, 60), notiz: (z.notiz || '').trim().slice(0, 4000), werte };
}

const schluessel = (s: string) => (s || '').toLowerCase().replace(/str\.?(\s|$)/g, 'strasse$1').replace(/ß/g, 'ss').replace(/[^a-z0-9äöü]/g, '');
const telSchluessel = (t: string) => (t || '').replace(/^\+49/, '0').replace(/\D/g, '');
const personSchluessel = (e: { vorname?: string; nachname?: string }) => `${schluessel(e.nachname || '')}|${schluessel(e.vorname || '')}`;
const adressSchluessel = (e: { strasse?: string; plz?: string }) => `${schluessel(e.strasse || '')}|${schluessel(e.plz || '')}`;

export type AbgleichArt = 'neu' | 'geaendert' | 'gleich';
export interface AbgleichPosten { art: AbgleichArt; eintrag: ListenEintrag; kundeId: string | null; aenderungen: string[] }
export interface Abgleich { posten: AbgleichPosten[]; zusammengefasst: number; fehlen: { id: string; titel: string }[] }

/**
 * Liste mit dem Bestand abgleichen. Gleiche Person (Vor- + Nachname) an gleicher Adresse = derselbe Kunde
 * (Dubletten in der Liste werden zusammengeführt). Gleiche Telefonnummer an gleicher Adresse, aber anderer
 * Name = gleicher Haushalt, zweite Person, keine Dublette. „Fehlen“: Kunden mit Listenwerten, die nicht mehr
 * in der Liste stehen (nur Hinweis, es wird nichts gelöscht).
 */
export function abgleichen(data: Daten, eintraege: ListenEintrag[]): Abgleich {
  const eindeutig = new Map<string, ListenEintrag>();
  let zusammengefasst = 0;
  for (const e of eintraege) {
    const k = `${personSchluessel(e)}#${adressSchluessel(e)}`;
    const da = eindeutig.get(k);
    if (da) {
      zusammengefasst++;
      da.telefon ||= e.telefon; da.ort ||= e.ort; da.plz ||= e.plz;
      if (e.notiz && !da.notiz.includes(e.notiz)) da.notiz = [da.notiz, e.notiz].filter(Boolean).join(' · ');
      for (const [f, v] of Object.entries(e.werte)) da.werte[f] ||= v;
    } else eindeutig.set(k, { ...e, werte: { ...e.werte } });
  }
  const posten: AbgleichPosten[] = [];
  const getroffen = new Set<string>();
  for (const e of eindeutig.values()) {
    const k = data.kunden.find((x) => personSchluessel(x) === personSchluessel(e) && adressSchluessel(x) === adressSchluessel(e))
      || data.kunden.find((x) => personSchluessel(x) === personSchluessel(e) && !!e.telefon && telSchluessel(x.telefon) === telSchluessel(e.telefon));
    if (!k) { posten.push({ art: 'neu', eintrag: e, kundeId: null, aenderungen: [] }); continue; }
    getroffen.add(k.id);
    const aenderungen: string[] = [];
    if (e.telefon && telSchluessel(k.telefon) !== telSchluessel(e.telefon)) aenderungen.push('Telefon');
    if (e.strasse && adressSchluessel(k) !== adressSchluessel(e)) aenderungen.push('Adresse');
    if (e.ort && schluessel(k.ort) !== schluessel(e.ort)) aenderungen.push('Ort');
    for (const f of LISTEN_FELDER) {
      const neu = e.werte[f.id] || '';
      if (String(k.eigene?.[f.id] ?? '') !== neu) aenderungen.push(f.label);
    }
    if (e.notiz && !k.notizen.some((n) => n.text.includes(e.notiz))) aenderungen.push('Notiz');
    posten.push({ art: aenderungen.length ? 'geaendert' : 'gleich', eintrag: e, kundeId: k.id, aenderungen });
  }
  const fehlen = data.kunden
    .filter((k) => !getroffen.has(k.id) && LISTEN_FELDER.some((f) => k.eigene?.[f.id]))
    .map((k) => ({ id: k.id, titel: [k.vorname, k.nachname].filter(Boolean).join(' ') || k.strasse || 'Kunde' }));
  return { posten, zusammengefasst, fehlen };
}

/** Fehlende Listenfelder als eigene Vorwerk-Felder anlegen (bestehende bleiben, auch umbenannte). */
export function listenFelderSicherstellen(data: Daten) {
  const eigene = data.einstellungen.felder.eigene;
  for (const f of LISTEN_FELDER) {
    if (!eigene.some((e: EigenesFeld) => e.id === f.id)) {
      const neu = normalizeEigenesFeld({ id: f.id, kategorie: 'vorwerk', label: f.label, typ: 'text' });
      if (neu) eigene.push(neu);
    }
  }
}

/**
 * Abgleich übernehmen: neue Kunden anlegen, geänderte aktualisieren (nur Werte aus der Liste, nichts
 * wird gelöscht; leere Listenwerte überschreiben nichts). Notizen aus der Liste werden als Vorwerk-Notiz
 * ergänzt, wenn sie noch nicht vorhanden sind. Rückgabe: Anzahl neu / geändert.
 */
export function uebernehmen(data: Daten, abgleich: Abgleich, auswahl: (p: AbgleichPosten) => boolean = () => true, jetzt = new Date().toISOString()) {
  listenFelderSicherstellen(data);
  let neu = 0; let geaendert = 0;
  const notizDazu = (k: Kunde, text: string) => {
    if (text && !k.notizen.some((n) => n.text.includes(text))) k.notizen.push(neueNotiz({ text: `Aus Vorwerk-Liste: ${text}`, sparten: ['vorwerk'], zeitpunkt: jetzt }));
  };
  for (const p of abgleich.posten) {
    if (p.art === 'gleich' || !auswahl(p)) continue;
    const e = p.eintrag;
    if (p.art === 'neu') {
      const k = neuerKunde({ anrede: e.anrede, titel: e.titel, vorname: e.vorname, nachname: e.nachname, strasse: e.strasse, plz: e.plz, ort: e.ort, telefon: e.telefon,
        status: { pv: 'unbekannt', wp: 'unbekannt', vorwerk: 'potenzial' }, eigene: { ...e.werte } });
      notizDazu(k, e.notiz);
      data.kunden.push(k);
      neu++;
      continue;
    }
    const k = data.kunden.find((x) => x.id === p.kundeId);
    if (!k) continue;
    if (e.telefon) k.telefon = e.telefon;
    if (e.strasse) k.strasse = e.strasse;
    if (e.plz) k.plz = e.plz;
    if (e.ort) k.ort = e.ort;
    k.eigene = { ...(k.eigene || {}), ...e.werte } as Rec as Kunde['eigene'];
    notizDazu(k, e.notiz);
    k.updatedAt = jetzt;
    geaendert++;
  }
  return { neu, geaendert };
}
