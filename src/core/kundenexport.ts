// Sperling – Kundenliste als Tabelle (Excel/CSV), DOM-frei und testbar.
// Alles entsteht im Arbeitsspeicher; die Datei verlässt das Gerät nur, wenn der Nutzer sie teilt (R-KRYPTO, R-EXTERN).
// Bewusst nicht enthalten: Notizen, Gespräche, Fotos, Unterschriften, eigene Felder (zu persönlich für eine Liste).
import { SPARTEN, SPARTEN_KEYS, STATUS, kundenName, kundenTitel, adresseEinzeilig, anfangsbuchstabe, type StatusKey } from './model.ts';

/** Ein Eintrag der angezeigten Liste: Kunde + Datum des letzten Kontakts (ISO oder null). */
export interface ExportEintrag {
  k: {
    vorname?: string; nachname?: string; firma?: string; strasse?: string; plz?: string; ort?: string;
    telefon?: string; email?: string; status?: Partial<Record<string, string>>;
  };
  kontakt: string | null;
}

export const SPALTEN = ['Nachname', 'Vorname', 'Firma', 'Straße', 'PLZ', 'Ort', 'Telefon', 'E-Mail',
  ...SPARTEN_KEYS.map((s) => SPARTEN[s].label), 'Letzter Kontakt'] as const;

/** Statuslabel ohne Klammerzusatz, „Unbekannt“ bleibt leer (übersichtlicher in der Tabelle). */
export function statusText(v: string | undefined): string {
  if (!v || v === 'unbekannt' || !(v in STATUS)) return '';
  return STATUS[v as StatusKey].label.replace(/\s*\(.*\)$/, '');
}

/** Datum TT.MM.JJJJ (lokal), leer bei fehlendem/ungültigem Wert. */
export function datumText(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Tabellenzeilen in der Reihenfolge der Liste (erste Zeile = Spaltenköpfe). */
export function tabelle(eintraege: readonly ExportEintrag[]): string[][] {
  return [[...SPALTEN], ...eintraege.map(({ k, kontakt }) => [
    s(k.nachname), s(k.vorname), s(k.firma), s(k.strasse), s(k.plz), s(k.ort), s(k.telefon), s(k.email),
    ...SPARTEN_KEYS.map((sp) => statusText(k.status?.[sp])), datumText(kontakt),
  ])];
}

/**
 * Buchstaben-Trenner für „Name A–Z“ (ab 0.13.9): je Eintrag der Buchstabe, wenn er sich gegenüber dem
 * vorigen ändert, sonst null. Bei anderer Sortierung alles null.
 */
export function trenner(eintraege: readonly ExportEintrag[], mitBuchstaben: boolean): (string | null)[] {
  let vorher = '';
  return eintraege.map(({ k }) => {
    if (!mitBuchstaben) return null;
    const b = anfangsbuchstabe(k);
    if (b === vorher) return null;
    vorher = b;
    return b;
  });
}

/** Tabelle mit Trennzeilen (nur Spalte A gefüllt) für Excel; `trennZeilen` enthält deren Zeilennummern (0 = Kopf). */
export function tabelleMitTrennern(eintraege: readonly ExportEintrag[], mitBuchstaben: boolean): { zeilen: string[][]; trennZeilen: Set<number> } {
  const [kopf, ...daten] = tabelle(eintraege);
  const t = trenner(eintraege, mitBuchstaben);
  const zeilen: string[][] = [kopf!]; const trennZeilen = new Set<number>();
  daten.forEach((z, i) => {
    if (t[i]) { trennZeilen.add(zeilen.length); zeilen.push([t[i]!]); }
    zeilen.push(z);
  });
  return { zeilen, trennZeilen };
}

/** Zeilen für das PDF: kompakter (Name, Adresse, Kontakt, Bereiche, letzter Kontakt). */
export function pdfZeilen(eintraege: readonly ExportEintrag[]): string[][] {
  return eintraege.map(({ k, kontakt }) => [
    kundenTitel(k),
    adresseEinzeilig(k),
    [s(k.telefon), s(k.email)].filter(Boolean).join('\n'),
    SPARTEN_KEYS.map((sp) => { const t = statusText(k.status?.[sp]); return t ? `${SPARTEN[sp].kurz}: ${t}` : ''; }).filter(Boolean).join('\n'),
    datumText(kontakt),
  ]);
}

/** Dateiname mit Datum, z. B. „Kundenliste-2026-11-08.xlsx“. */
export function dateiname(endung: string, jetzt = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `Kundenliste-${jetzt.getFullYear()}-${p(jetzt.getMonth() + 1)}-${p(jetzt.getDate())}.${endung}`;
}

// ---------- CSV (Semikolon, UTF-8 mit BOM: so öffnet deutsches Excel Umlaute und Spalten richtig) ----------

/** Telefonnummer wie „+49 170 1234567“ oder „+49 (5344) 12-34“: nur Ziffern und Trennzeichen, kann keine Formel ausführen. */
const TELEFON = /^\+\d[\d ()/.-]{3,30}$/;

/**
 * Schutz vor Formel-Einschleusung: Zellen, die mit = + - @ oder Steuerzeichen beginnen, bekommen ein ' davor.
 * Ausnahme (ab 0.14.6): reine Telefonnummern mit „+“, sonst stünde in der Tabelle „'+49 …“.
 */
export function csvZelle(v: string): string {
  let t = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(t) && !TELEFON.test(t)) t = `'${t}`;
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function csv(zeilen: readonly (readonly string[])[]): string {
  return `﻿${zeilen.map((z) => z.map(csvZelle).join(';')).join('\r\n')}\r\n`;
}

// ---------- XLSX (Office Open XML, eigene kleine ZIP-Erzeugung ohne Bibliothek, R-KEINE-ABHÄNGIGKEITEN) ----------

const xmlEsc = (t: string) => t
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Spaltenbuchstabe: 0 → A, 25 → Z, 26 → AA. */
export function spalte(i: number): string {
  let n = i + 1; let r = '';
  while (n > 0) { const m = (n - 1) % 26; r = String.fromCharCode(65 + m) + r; n = Math.floor((n - 1) / 26); }
  return r;
}

let crcTabelle: Uint32Array | null = null;
export function crc32(daten: Uint8Array): number {
  if (!crcTabelle) {
    crcTabelle = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcTabelle[n] = c >>> 0; }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < daten.length; i++) c = crcTabelle[(c ^ daten[i]!) & 0xFF]! ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** ZIP ohne Kompression („stored“). Reicht für Excel und hält den Code klein. */
export function zip(dateien: { name: string; inhalt: string | Uint8Array }[], jetzt = new Date()): Uint8Array {
  const enc = new TextEncoder();
  const zeit = ((jetzt.getHours() << 11) | (jetzt.getMinutes() << 5) | (jetzt.getSeconds() >> 1)) & 0xFFFF;
  const datum = (((jetzt.getFullYear() - 1980) << 9) | ((jetzt.getMonth() + 1) << 5) | jetzt.getDate()) & 0xFFFF;
  const teile: Uint8Array[] = []; const zentral: Uint8Array[] = [];
  let versatz = 0;
  for (const f of dateien) {
    const name = enc.encode(f.name);
    const daten = typeof f.inhalt === 'string' ? enc.encode(f.inhalt) : f.inhalt;
    const crc = crc32(daten);
    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034B50, true); kopf.setUint16(4, 20, true); kopf.setUint16(6, 0x0800, true); kopf.setUint16(8, 0, true);
    kopf.setUint16(10, zeit, true); kopf.setUint16(12, datum, true); kopf.setUint32(14, crc, true);
    kopf.setUint32(18, daten.length, true); kopf.setUint32(22, daten.length, true); kopf.setUint16(26, name.length, true); kopf.setUint16(28, 0, true);
    teile.push(new Uint8Array(kopf.buffer), name, daten);
    const z = new DataView(new ArrayBuffer(46));
    z.setUint32(0, 0x02014B50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true); z.setUint16(10, 0, true);
    z.setUint16(12, zeit, true); z.setUint16(14, datum, true); z.setUint32(16, crc, true);
    z.setUint32(20, daten.length, true); z.setUint32(24, daten.length, true); z.setUint16(28, name.length, true);
    z.setUint32(42, versatz, true);
    zentral.push(new Uint8Array(z.buffer), name);
    versatz += 30 + name.length + daten.length;
  }
  const zGroesse = zentral.reduce((a, b) => a + b.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054B50, true); ende.setUint16(8, dateien.length, true); ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, zGroesse, true); ende.setUint32(16, versatz, true);
  const alle = [...teile, ...zentral, new Uint8Array(ende.buffer)];
  const out = new Uint8Array(alle.reduce((a, b) => a + b.length, 0));
  let p = 0;
  for (const t of alle) { out.set(t, p); p += t.length; }
  return out;
}

/**
 * Excel-Arbeitsmappe mit einem Blatt. Alle Zellen sind Text (PLZ und Telefon behalten führende Nullen,
 * keine Formeln möglich). Kopfzeile fett, fixiert, mit Filter; Spaltenbreiten nach Inhalt.
 */
export function xlsx(zeilen: readonly (readonly string[])[], blatt = 'Kundenliste', jetzt = new Date(), trennZeilen: ReadonlySet<number> = new Set()): Uint8Array {
  const breite = (i: number) => Math.min(50, Math.max(8, ...zeilen.filter((_, r) => !trennZeilen.has(r)).map((z) => Math.max(...String(z[i] ?? '').split('\n').map((t) => t.length)) + 2)));
  const spaltenAnzahl = Math.max(1, ...zeilen.map((z) => z.length));
  const letzte = `${spalte(spaltenAnzahl - 1)}${Math.max(1, zeilen.length)}`;
  // Trennzeile: über alle Spalten getönt, Buchstabe fett (Stil 2)
  const reihen = zeilen.map((z, r) => (trennZeilen.has(r)
    ? `<row r="${r + 1}" ht="20" customHeight="1">${Array.from({ length: spaltenAnzahl }, (_, c) => (c === 0 && z[0] ? `<c r="A${r + 1}" t="inlineStr" s="2"><is><t>${xmlEsc(z[0])}</t></is></c>` : `<c r="${spalte(c)}${r + 1}" s="2"/>`)).join('')}</row>`
    : `<row r="${r + 1}">${z.map((v, c) => (v === '' ? '' : `<c r="${spalte(c)}${r + 1}" t="inlineStr"${r === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`)).join('')}</row>`)).join('');
  const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + `<cols>${Array.from({ length: spaltenAnzahl }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${breite(i)}" customWidth="1"/>`).join('')}</cols>`
    + `<sheetData>${reihen}</sheetData>`
    + (zeilen.length > 1 ? `<autoFilter ref="A1:${letzte}"/>` : '')
    + '</worksheet>';
  const blattName = xmlEsc(blatt.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Kundenliste');
  const iso = jetzt.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return zip([
    { name: '[Content_Types].xml', inhalt: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>' },
    { name: '_rels/.rels', inhalt: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>' },
    { name: 'docProps/core.xml', inhalt: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Kundenliste</dc:title><dc:creator>Sperling</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created></cp:coreProperties>` },
    { name: 'xl/workbook.xml', inhalt: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${blattName}" sheetId="1" r:id="rId1"/></sheets>${zeilen.length > 1 ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${blattName.replace(/'/g, "''")}'!$A$1:$${spalte(spaltenAnzahl - 1)}$${zeilen.length}</definedName></definedNames>` : ''}</workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', inhalt: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'xl/styles.xml', inhalt: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE3EEDC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Standard" xfId="0" builtinId="0"/></cellStyles></styleSheet>' },
    { name: 'xl/worksheets/sheet1.xml', inhalt: sheet },
  ], jetzt);
}

export const MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv;charset=utf-8',
  pdf: 'application/pdf',
} as const;
