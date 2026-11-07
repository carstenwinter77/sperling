// Sperling – Textgeneratoren für Enpal (PV + WP) und Vorwerk.
//
// HARTE REGEL (siehe docs/REGELN.md, R-TEXT): Die beiden Generatoren dürfen
// NIEMALS Daten der jeweils anderen Gruppe sehen oder ausgeben.
// Umsetzung in zwei Stufen:
//   1. projizieren(): baut eine Kopie des Kunden, die NUR Stammdaten + die
//      Sparten der eigenen Gruppe enthält. Alles Weitere arbeitet nur damit.
//   2. Notizen werden nur übernommen, wenn sie mindestens eine Sparte haben
//      und ALLE ihre Sparten zur Gruppe gehören. Gemischte oder unmarkierte
//      Notizen werden ausgelassen (und in der UI als Hinweis gezählt).

import { SPARTEN, STATUS, FELDER, AUSGANG, KONTAKTART, kundenName, adresseEinzeilig, notizenSortiert } from './model.js';
import { formatDateTime } from './util.js';

export const GRUPPEN = {
  enpal: { key: 'enpal', label: 'Enpal (PV + Wärmepumpe)', sparten: ['pv', 'wp'] },
  vorwerk: { key: 'vorwerk', label: 'Vorwerk', sparten: ['vorwerk'] },
};

export const PLATZHALTER = ['name', 'vorname', 'nachname', 'firma', 'anrede', 'adresse', 'telefon', 'email', 'sparten', 'status', 'daten', 'notizen', 'datum', 'absender'];

function gruppeOrThrow(gruppe) {
  const g = GRUPPEN[gruppe];
  if (!g) throw new Error(`Unbekannte Textgruppe: ${gruppe}`);
  return g;
}

/** Gehört eine Notiz ausschließlich zu dieser Gruppe? */
export function notizErlaubt(notiz, gruppe) {
  const g = gruppeOrThrow(gruppe);
  return Array.isArray(notiz.sparten) && notiz.sparten.length > 0 && notiz.sparten.every((s) => g.sparten.includes(s));
}

/** Stufe 1: Kunde auf Stammdaten + eigene Sparten reduzieren. */
export function projizieren(kunde, gruppe) {
  const g = gruppeOrThrow(gruppe);
  const p = {
    anrede: kunde.anrede, vorname: kunde.vorname, nachname: kunde.nachname, firma: kunde.firma,
    strasse: kunde.strasse, plz: kunde.plz, ort: kunde.ort, telefon: kunde.telefon, email: kunde.email,
    status: {},
    notizen: (kunde.notizen || []).filter((n) => notizErlaubt(n, gruppe)).map((n) => ({ ...n })),
  };
  for (const s of g.sparten) {
    p.status[s] = kunde.status?.[s] ?? 'unbekannt';
    p[s] = { ...(kunde[s] || {}) };
  }
  // Die Enpal-Gesprächsdokumentation gehört ausschließlich zur Enpal-Gruppe.
  if (gruppe === 'enpal') {
    p.enpalKontakte = (kunde.enpalKontakte || []).map((c) => ({ ...c, themen: (c.themen || []).filter((t) => g.sparten.includes(t)) }));
  }
  return p;
}

function feldWert(f, v) {
  if (v === null || v === undefined || v === '') return null;
  if (f.type === 'bool') return v ? 'ja' : 'nein';
  if (f.type === 'number') return `${String(v).replace('.', ',')}${f.unit ? ` ${f.unit}` : ''}`;
  return String(v);
}

function datenBlock(p, g, nur = g.sparten) {
  const teile = [];
  for (const s of g.sparten.filter((x) => nur.includes(x))) {
    const zeilen = [];
    const st = p.status[s];
    if (st && st !== 'unbekannt') zeilen.push(`Status: ${STATUS[st].label}`);
    for (const f of FELDER[s]) {
      const w = feldWert(f, p[s][f.key]);
      if (w !== null) zeilen.push(`${f.label}: ${w}`);
    }
    if (zeilen.length) teile.push(`${SPARTEN[s].label}\n${zeilen.map((z) => `- ${z}`).join('\n')}`);
  }
  return teile.length ? teile.join('\n\n') : '(keine Angaben erfasst)';
}

function notizenBlock(p) {
  const list = notizenSortiert(p);
  if (!list.length) return '(keine)';
  return list.map((n) => `${formatDateTime(n.zeitpunkt)}: ${n.text.trim()}`).join('\n');
}

/** Stufe 2: Kontext für Platzhalter – ausschließlich aus der Projektion. */
export function kontext(kunde, gruppe, einstellungen = {}) {
  const g = gruppeOrThrow(gruppe);
  const p = projizieren(kunde, gruppe);
  const aktiv = g.sparten.filter((s) => !['unbekannt', 'kein_interesse'].includes(p.status[s]));
  const spartenLabel = (aktiv.length ? aktiv : g.sparten).map((s) => SPARTEN[s].label).join(' & ');
  return {
    name: kundenName(p) || '(ohne Namen)',
    vorname: p.vorname, nachname: p.nachname, firma: p.firma, anrede: p.anrede,
    adresse: adresseEinzeilig(p) || '–',
    telefon: p.telefon || '–',
    email: p.email || '–',
    sparten: spartenLabel,
    status: g.sparten.map((s) => `${SPARTEN[s].label}: ${STATUS[p.status[s]].label}`).join(', '),
    daten: datenBlock(p, g),
    notizen: notizenBlock(p),
    datum: formatDateTime(new Date().toISOString()).slice(0, 10),
    absender: einstellungen.absender || '',
  };
}

/** Ersetzt {{platzhalter}}. Unbekannte Platzhalter werden zu leerem Text. */
export function rendern(vorlage, ctx) {
  return String(vorlage ?? '').replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (_, key) =>
    PLATZHALTER.includes(key) && ctx[key] !== undefined && ctx[key] !== null ? String(ctx[key]) : '');
}

export function generiereText(kunde, gruppe, einstellungen = {}) {
  const vorlage = einstellungen.vorlagen?.[gruppe];
  return rendern(vorlage, kontext(kunde, gruppe, einstellungen)).replace(/\n{3,}/g, '\n\n').trim();
}

/** Zählt Notizen, die wegen Mischung/fehlender Sparte in keinem Text erscheinen. */
export function ausgelasseneNotizen(kunde) {
  return (kunde.notizen || []).filter((n) => !notizErlaubt(n, 'enpal') && !notizErlaubt(n, 'vorwerk')).length;
}

// ---------- Enpal-Gesprächsdokumentation (Lead-Nachweis) ----------

function kontaktBlock(p, c) {
  const themen = c.themen.length ? c.themen : ['pv', 'wp'];
  const z = [
    `${KONTAKTART[c.art] || 'Kontakt'} am ${formatDateTime(c.zeitpunkt)} Uhr`,
    `Kunde erreicht: ${c.erreicht ? 'ja' : 'nein'}${c.gespraechspartner ? ` – Gesprächspartner: ${c.gespraechspartner}` : ''}`,
    `Themen: ${themen.map((t) => SPARTEN[t].label).join(', ')}`,
    `Aktueller Status: ${themen.map((t) => `${SPARTEN[t].label} ${STATUS[p.status[t]].label}`).join(', ')}`,
    c.ergebnis ? `Ergebnis: ${AUSGANG[c.ergebnis]}` : '',
    c.naechsterSchritt ? `Nächster Schritt: ${c.naechsterSchritt}` : '',
    c.frist ? `Frist / Wiedervorlage: ${formatDateTime(c.frist)} Uhr` : '',
  ].filter(Boolean);
  if (c.notiz.trim()) z.push('', 'Gesprächsinhalt:', c.notiz.trim());
  return z.join('\n');
}

function kundenKopf(p) {
  return [
    `Kunde: ${kundenName(p) || '(ohne Namen)'}`,
    `Adresse: ${adresseEinzeilig(p) || '–'}`,
    `Telefon: ${p.telefon || '–'}`,
    `E-Mail: ${p.email || '–'}`,
  ].join('\n');
}

/**
 * Kopierfertiger Text EINES Kontakts für die Enpal-App.
 * Arbeitet nur mit der Enpal-Projektion (R-TEXT): Vorwerk kann nicht vorkommen.
 */
export function enpalDokuText(kunde, kontaktId, einstellungen = {}) {
  const p = projizieren(kunde, 'enpal');
  const c = p.enpalKontakte.find((x) => x.id === kontaktId);
  if (!c) return '';
  const g = GRUPPEN.enpal;
  const daten = datenBlock(p, g, c.themen.length ? c.themen : g.sparten);
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
export function enpalVerlaufText(kunde, einstellungen = {}) {
  const p = projizieren(kunde, 'enpal');
  const liste = [...p.enpalKontakte].sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? -1 : 1));
  if (!liste.length) return '';
  return [
    'Gesprächsdokumentation Enpal – Verlauf',
    '',
    kundenKopf(p),
    ...liste.flatMap((c, i) => ['', `--- Kontakt ${i + 1} ---`, kontaktBlock(p, c)]),
    einstellungen.absender ? `\nDokumentiert von: ${einstellungen.absender}` : '',
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
