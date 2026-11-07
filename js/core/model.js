// Sperling – Datenmodell, Feldkatalog, Normalisierung und Migration.
// Siehe docs/DATENMODELL.md. Jede Änderung am Modell: SCHEMA_VERSION erhöhen,
// Migration in migrate() ergänzen, Doku + Tests aktualisieren.

import { uid, nowIso, isValidDate, parseNumber, isValidCoord } from './util.js';

export const SCHEMA_VERSION = 2;

/** Die drei Geschäftszweige. Gruppe bestimmt, welcher Textgenerator sie sehen darf. */
export const SPARTEN = {
  pv: { key: 'pv', label: 'Photovoltaik', kurz: 'PV', gruppe: 'enpal' },
  wp: { key: 'wp', label: 'Wärmepumpe', kurz: 'WP', gruppe: 'enpal' },
  vorwerk: { key: 'vorwerk', label: 'Vorwerk', kurz: 'VW', gruppe: 'vorwerk' },
};
export const SPARTEN_KEYS = Object.keys(SPARTEN);

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
export const STATUS_KEYS = Object.keys(STATUS);

/** Status eines Markers auf der Karte (wichtigster Status über alle Sparten). */
const STATUS_PRIO = ['abschluss', 'angebot', 'termin', 'interesse', 'potenzial', 'kein_interesse', 'unbekannt'];
export function hauptStatus(kunde) {
  const vals = SPARTEN_KEYS.map((s) => kunde?.status?.[s] ?? 'unbekannt');
  for (const p of STATUS_PRIO) if (vals.includes(p)) return p;
  return 'unbekannt';
}

/**
 * Feldkatalog der Erfassungsbögen. Die UI rendert Formulare daraus,
 * die Textgeneratoren nutzen Label/Einheit. Typen: text, number, select, bool, textarea.
 */
export const FELDER = {
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

export const DEFAULT_VORLAGEN = {
  enpal:
`Kundenanfrage {{sparten}}

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

export function emptyData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    kunden: [],
    termine: [],
    einstellungen: defaultEinstellungen(),
    // Vorführbestand im Auto (Vorwerk) und Verleih; Lieferschein-PDF folgt in Version 2
    geraete: [],
    leihvorgaenge: [],
  };
}

export function defaultEinstellungen() {
  return {
    absender: '',
    vorlagen: { ...DEFAULT_VORLAGEN },
    karte: { lat: 51.1657, lng: 10.4515, zoom: 6, layer: 'satellit' },
    autoSperreMin: 15,
    dropbox: { appKey: '', refreshToken: '', pfad: '/sperling-daten.sperling', letzterSync: null },
    // Empfänger für „Per E-Mail senden“ im Texte-Tab (z. B. Enpal-Teamleitung, Vorwerk-Büro)
    empfaenger: { enpal: '', vorwerk: '' },
  };
}

export function neuerKunde(partial = {}) {
  const t = nowIso();
  return normalizeKunde({ id: uid(), createdAt: t, updatedAt: t, ...partial });
}

export function neueNotiz(partial = {}) {
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
export function normalizeGespraech(g) {
  const src = g && typeof g === 'object' ? g : {};
  const t = nowIso();
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    zeitpunkt: isValidDate(src.zeitpunkt) ? new Date(src.zeitpunkt).toISOString() : t,
    sparte: SPARTEN_KEYS.includes(src.sparte) ? src.sparte : 'pv',
    einwaende: Array.isArray(src.einwaende)
      ? src.einwaende.filter((e) => e && typeof e === 'object').map((e) => ({
        id: str(e.id, 50), text: str(e.text, 300), ergebnis: ['ueberzeugt', 'offen', 'bleibt'].includes(e.ergebnis) ? e.ergebnis : 'offen',
      }))
      : [],
    ausgang: AUSGANG[src.ausgang] ? src.ausgang : '',
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
export function normalizeEnpalKontakt(c) {
  const src = c && typeof c === 'object' ? c : {};
  const t = nowIso();
  const themen = Array.isArray(src.themen) ? [...new Set(src.themen.filter((x) => x === 'pv' || x === 'wp'))] : [];
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    zeitpunkt: isValidDate(src.zeitpunkt) ? new Date(src.zeitpunkt).toISOString() : t,
    art: KONTAKTART[src.art] ? src.art : 'telefon',
    erreicht: src.erreicht !== false,
    gespraechspartner: str(src.gespraechspartner, 200),
    themen,
    ergebnis: AUSGANG[src.ergebnis] ? src.ergebnis : '',
    naechsterSchritt: str(src.naechsterSchritt, 1000),
    frist: isValidDate(src.frist) ? new Date(src.frist).toISOString() : null,
    notiz: str(src.notiz, 10000),
    createdAt: isValidDate(src.createdAt) ? src.createdAt : t,
    updatedAt: isValidDate(src.updatedAt) ? src.updatedAt : t,
  };
}

export const KAUFINTERESSE = {
  offen: 'Noch offen',
  interesse: 'Interesse am Kauf',
  gekauft: 'Gekauft',
  kein: 'Kein Kaufinteresse',
};

export function neuesGeraet(partial = {}) {
  const t = nowIso();
  return normalizeGeraet({ id: uid(), createdAt: t, updatedAt: t, ...partial });
}

export function neuerLeihvorgang(partial = {}) {
  const t = nowIso();
  return normalizeLeihvorgang({ id: uid(), createdAt: t, updatedAt: t, ausgabe: t, ...partial });
}

/** Vorführgerät aus dem Auto-Bestand (nur Vorwerk). */
export function normalizeGeraet(g) {
  const src = g && typeof g === 'object' ? g : {};
  const t = nowIso();
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    name: str(src.name, 200) || 'Unbenanntes Gerät',
    seriennummer: str(src.seriennummer, 100),
    zubehoer: str(src.zubehoer, 1000),
    notiz: str(src.notiz, 5000),
    aktiv: src.aktiv !== false, // false = ausgemustert/verkauft, bleibt für die Historie erhalten
    createdAt: isValidDate(src.createdAt) ? src.createdAt : t,
    updatedAt: isValidDate(src.updatedAt) ? src.updatedAt : t,
  };
}

/** Ein Verleih: Gerät an Kunde, mit geplanter und tatsächlicher Rückgabe. */
export function normalizeLeihvorgang(l) {
  const src = l && typeof l === 'object' ? l : {};
  const t = nowIso();
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    geraetId: typeof src.geraetId === 'string' ? src.geraetId : '',
    kundeId: typeof src.kundeId === 'string' ? src.kundeId : '',
    ausgabe: isValidDate(src.ausgabe) ? new Date(src.ausgabe).toISOString() : t,
    rueckgabeGeplant: isValidDate(src.rueckgabeGeplant) ? new Date(src.rueckgabeGeplant).toISOString() : null,
    rueckgabe: isValidDate(src.rueckgabe) ? new Date(src.rueckgabe).toISOString() : null,
    kaufinteresse: KAUFINTERESSE[src.kaufinteresse] ? src.kaufinteresse : 'offen',
    notiz: str(src.notiz, 5000),
    createdAt: isValidDate(src.createdAt) ? src.createdAt : t,
    updatedAt: isValidDate(src.updatedAt) ? src.updatedAt : t,
  };
}

/** Offener (nicht zurückgegebener) Leihvorgang eines Geräts oder null. */
export function offenerVerleih(data, geraetId) {
  return data.leihvorgaenge.find((l) => l.geraetId === geraetId && !l.rueckgabe) || null;
}

export function neuerTermin(partial = {}) {
  const t = nowIso();
  return normalizeTermin({ id: uid(), createdAt: t, updatedAt: t, ...partial });
}

// ---------- Normalisierung: macht aus beliebigem (auch kaputtem) Input gültige Objekte ----------

const str = (v, max = 5000) => (typeof v === 'string' ? v.slice(0, max) : v === null || v === undefined ? '' : String(v).slice(0, max));

function normalizeFelder(sparte, input) {
  const out = {};
  const src = input && typeof input === 'object' ? input : {};
  for (const f of FELDER[sparte]) {
    const v = src[f.key];
    if (f.type === 'number') out[f.key] = parseNumber(v);
    else if (f.type === 'bool') out[f.key] = v === true ? true : v === false ? false : null;
    else if (f.type === 'select') out[f.key] = typeof v === 'string' && f.options.includes(v) ? v : '';
    else out[f.key] = str(v, f.type === 'textarea' ? 20000 : 500);
  }
  return out;
}

export function normalizeNotiz(n) {
  const src = n && typeof n === 'object' ? n : {};
  const t = nowIso();
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    zeitpunkt: isValidDate(src.zeitpunkt) ? new Date(src.zeitpunkt).toISOString() : t,
    text: str(src.text, 50000),
    sparten: Array.isArray(src.sparten) ? [...new Set(src.sparten.filter((s) => SPARTEN_KEYS.includes(s)))] : [],
    createdAt: isValidDate(src.createdAt) ? src.createdAt : t,
    updatedAt: isValidDate(src.updatedAt) ? src.updatedAt : t,
  };
}

export function normalizeKunde(k) {
  const src = k && typeof k === 'object' ? k : {};
  const t = nowIso();
  const status = {};
  for (const s of SPARTEN_KEYS) {
    const v = src.status?.[s];
    status[s] = STATUS_KEYS.includes(v) ? v : 'unbekannt';
  }
  const lat = parseNumber(src.lat);
  const lng = parseNumber(src.lng);
  const coordOk = lat !== null && lng !== null && isValidCoord(lat, lng);
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    createdAt: isValidDate(src.createdAt) ? src.createdAt : t,
    updatedAt: isValidDate(src.updatedAt) ? src.updatedAt : t,
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
  };
}

export function normalizeTermin(tm) {
  const src = tm && typeof tm === 'object' ? tm : {};
  const t = nowIso();
  const dauer = parseNumber(src.dauerMin);
  return {
    id: typeof src.id === 'string' && src.id ? src.id : uid(),
    kundeId: typeof src.kundeId === 'string' ? src.kundeId : '',
    sparte: SPARTEN_KEYS.includes(src.sparte) ? src.sparte : '',
    art: src.art === 'termin' ? 'termin' : 'wiedervorlage',
    titel: str(src.titel, 300),
    beginn: isValidDate(src.beginn) ? new Date(src.beginn).toISOString() : t,
    dauerMin: dauer !== null && dauer > 0 && dauer <= 24 * 60 ? Math.round(dauer) : 60,
    ort: str(src.ort, 500),
    notiz: str(src.notiz, 5000),
    erledigt: src.erledigt === true,
    createdAt: isValidDate(src.createdAt) ? src.createdAt : t,
    updatedAt: isValidDate(src.updatedAt) ? src.updatedAt : t,
  };
}

function normalizeEinstellungen(e) {
  const d = defaultEinstellungen();
  const src = e && typeof e === 'object' ? e : {};
  const autoSperre = parseNumber(src.autoSperreMin);
  const karte = src.karte && typeof src.karte === 'object' ? src.karte : {};
  const kLat = parseNumber(karte.lat);
  const kLng = parseNumber(karte.lng);
  const kZoom = parseNumber(karte.zoom);
  const dbx = src.dropbox && typeof src.dropbox === 'object' ? src.dropbox : {};
  return {
    absender: str(src.absender, 500),
    vorlagen: {
      enpal: typeof src.vorlagen?.enpal === 'string' && src.vorlagen.enpal.trim() ? src.vorlagen.enpal : d.vorlagen.enpal,
      vorwerk: typeof src.vorlagen?.vorwerk === 'string' && src.vorlagen.vorwerk.trim() ? src.vorlagen.vorwerk : d.vorlagen.vorwerk,
    },
    karte: {
      lat: kLat !== null && kLng !== null && isValidCoord(kLat, kLng) ? kLat : d.karte.lat,
      lng: kLat !== null && kLng !== null && isValidCoord(kLat, kLng) ? kLng : d.karte.lng,
      zoom: kZoom !== null && kZoom >= 1 && kZoom <= 20 ? kZoom : d.karte.zoom,
      layer: karte.layer === 'strasse' ? 'strasse' : 'satellit',
    },
    autoSperreMin: autoSperre !== null && autoSperre >= 0 && autoSperre <= 240 ? Math.round(autoSperre) : d.autoSperreMin,
    dropbox: {
      appKey: str(dbx.appKey, 100),
      refreshToken: str(dbx.refreshToken, 2000),
      pfad: typeof dbx.pfad === 'string' && dbx.pfad.startsWith('/') ? dbx.pfad : d.dropbox.pfad,
      letzterSync: isValidDate(dbx.letzterSync) ? dbx.letzterSync : null,
    },
    empfaenger: {
      enpal: str(src.empfaenger?.enpal, 300),
      vorwerk: str(src.empfaenger?.vorwerk, 300),
    },
  };
}

/** Bringt geladene Daten auf die aktuelle Schema-Version und repariert Fehlerhaftes. */
export function migrate(input) {
  if (!input || typeof input !== 'object') return emptyData();
  const v = Number.isInteger(input.schemaVersion) ? input.schemaVersion : 0;
  if (v > SCHEMA_VERSION) {
    throw new Error(`Die Daten stammen aus einer neueren Sperling-Version (Schema ${v}). Bitte App aktualisieren.`);
  }
  const data = { ...input };
  // v1 → v2: Kunden bekommen enpalKontakte (leer), Einstellungen bekommen empfaenger.
  // Beides ergänzt normalize…() unten; ältere Daten bleiben vollständig lesbar.
  // Künftige Migrationen hier schrittweise: if (v < 3) { ... }
  const kunden = Array.isArray(data.kunden) ? data.kunden.map(normalizeKunde) : [];
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
  };
}

// ---------- Anzeige-Helfer ----------

export function kundenName(k) {
  const name = [k.vorname, k.nachname].filter(Boolean).join(' ').trim();
  if (name && k.firma) return `${name} (${k.firma})`;
  return name || k.firma || '';
}

export function kundenTitel(k) {
  return kundenName(k) || adresseEinzeilig(k) || 'Unbenannter Standort';
}

export function adresseEinzeilig(k) {
  const ortTeil = [k.plz, k.ort].filter(Boolean).join(' ');
  return [k.strasse, ortTeil].filter(Boolean).join(', ');
}

/** Notizen absteigend nach Zeitpunkt (neueste zuerst). */
export function notizenSortiert(k) {
  return [...(k.notizen || [])].sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? 1 : a.zeitpunkt > b.zeitpunkt ? -1 : 0));
}
