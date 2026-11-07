// Sperling – Beispieldaten für den Demo-Modus (frei erfunden, nur im Arbeitsspeicher).
import { emptyData, type Daten, type Geraet } from './core/model.ts';
import type { Rec } from './core/util.ts';
import { gebietsKunden } from './demo-gebiet.ts';

function tageAb(tage: number, stunde = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + tage);
  d.setHours(stunde, minute, 0, 0);
  return d.toISOString();
}

/** Rohdaten; vor Gebrauch immer durch migrate() (normalisiert und prüft). */
export function demoDaten(): Rec {
  const d: Rec = emptyData();
  d.einstellungen.absender = 'Max Sperling · Außendienst';
  d.einstellungen.karte = { lat: 52.2058, lng: 10.3020, zoom: 13, layer: 'satellit' };
  d.kunden = [
    {
      id: 'demo-1', vorname: 'Anna', nachname: 'Beispiel', strasse: 'Lindenweg 4', plz: '38268', ort: 'Lengede',
      telefon: '05344 123456', email: 'anna@example.de', lat: 52.2061, lng: 10.3002,
      status: { pv: 'abschluss', wp: 'interesse', vorwerk: 'potenzial' },
      pv: { dachflaeche: 62, ausrichtung: 'Süd', neigung: 35, dachform: 'Satteldach', eindeckung: 'Ziegel', verschattung: 'Gering', stromverbrauch: 4800, personen: 4, eauto: true, wallbox: true, speicher: true },
      wp: { heizungsart: 'Gas', heizungBaujahr: 2004, verbrauchMenge: 18000, verbrauchEinheit: 'kWh', wohnflaeche: 140, hausBaujahr: 1985, daemmung: 'Teilsaniert', waermeverteilung: 'Heizkörper', warmwasser: true },
      vorwerk: { vorhandenesGeraet: 'Alter Beutelsauger', haustiere: true },
      notizen: [
        { id: 'n1', zeitpunkt: tageAb(-14, 17, 30), sparten: ['pv'], text: 'PV-Vertrag unterschrieben, Montage im Frühjahr. Sehr zufrieden mit der Beratung.' },
        { id: 'n2', zeitpunkt: tageAb(-2, 18, 0), sparten: ['wp'], text: 'Gasheizung ist 20 Jahre alt. Möchte Angebot für Wärmepumpe, Fördermöglichkeiten erklären.' },
        { id: 'n3', zeitpunkt: tageAb(-2, 18, 20), sparten: ['vorwerk'], text: 'Hat nebenbei erwähnt, dass der Staubsauger mit Hund nicht mehr hinterherkommt. Separaten Vorführtermin anbieten.' },
      ],
      gespraeche: [
        { id: 'gs1', zeitpunkt: tageAb(-2, 18, 0), sparte: 'wp', ausgang: 'termin', naechsterSchritt: 'Beratungstermin mit Förder-Check',
          einwaende: [{ id: 'teuer', text: 'Die Anschaffung ist zu teuer.', ergebnis: 'ueberzeugt' }, { id: 'laut', text: 'Die sind doch laut.', ergebnis: 'offen' }] },
        { id: 'gs2', zeitpunkt: tageAb(-2, 18, 20), sparte: 'vorwerk', ausgang: 'test', naechsterSchritt: 'Kobold VK7 testen, in einer Woche nachfragen',
          einwaende: [{ id: 'hab', text: 'Ich habe schon einen Staubsauger.', ergebnis: 'ueberzeugt' }, { id: 'teuer', text: 'Vorwerk ist mir zu teuer.', ergebnis: 'offen' }] },
      ],
      enpalKontakte: [
        { id: 'ek1', zeitpunkt: tageAb(-21, 16, 10), art: 'telefon', erreicht: true, gespraechspartner: 'Anna Beispiel', themen: ['pv'], ergebnis: 'termin',
          naechsterSchritt: 'Hausbesuch zur Dachbesichtigung', frist: tageAb(-14, 17, 0), notiz: 'Erstkontakt über Empfehlung. Interesse an PV mit Speicher, E-Auto vorhanden.' },
        { id: 'ek2', zeitpunkt: tageAb(-14, 17, 30), art: 'hausbesuch', erreicht: true, gespraechspartner: 'Anna und Jens Beispiel', themen: ['pv'], ergebnis: 'abschluss',
          naechsterSchritt: 'Montage im Frühjahr', notiz: 'Dach besichtigt (Süd, 35°). Vertrag PV mit Speicher und Wallbox unterschrieben.' },
        { id: 'ek3', zeitpunkt: tageAb(-2, 18, 0), art: 'hausbesuch', erreicht: true, gespraechspartner: 'Anna Beispiel', themen: ['wp'], ergebnis: 'termin',
          naechsterSchritt: 'Beratungstermin mit Förder-Check', frist: tageAb(1, 17, 0), notiz: 'Gasheizung 20 Jahre alt. Einwand Kosten ausgeräumt, Lautstärke noch offen.' },
      ],
    },
    {
      id: 'demo-2', vorname: 'Bernd', nachname: 'Muster', strasse: 'Lindenweg 6', plz: '38268', ort: 'Lengede',
      telefon: '05344 654321', lat: 52.2063, lng: 10.3009,
      status: { pv: 'potenzial', wp: 'unbekannt', vorwerk: 'unbekannt' },
      pv: { dachflaeche: 55, ausrichtung: 'Süd-West', dachform: 'Satteldach' },
      enpalKontakte: [{ id: 'ek4', zeitpunkt: tageAb(-1, 10, 5), art: 'telefon', erreicht: false, themen: ['pv'], ergebnis: 'wiedervorlage',
        naechsterSchritt: 'Erneut anrufen', frist: tageAb(-1, 17, 0), notiz: 'Mailbox, keine Nachricht hinterlassen.' }],
      notizen: [{ id: 'n4', zeitpunkt: tageAb(-2, 18, 45), sparten: ['pv'], text: 'Nachbar von Frau Beispiel. Niemand angetroffen, Flyer eingeworfen. Großes Süddach.' }],
    },
    {
      id: 'demo-3', vorname: 'Claudia', nachname: 'Probe', strasse: 'Am Markt 12', plz: '31224', ort: 'Peine',
      telefon: '0170 1112223', email: 'c.probe@example.de', lat: 52.3207, lng: 10.2345,
      status: { pv: 'kein_interesse', wp: 'unbekannt', vorwerk: 'abschluss' },
      vorwerk: { interesseAn: 'Kobold Saugroboter', bodenbelaege: 'Parkett, Fliesen', flaeche: 95, allergien: true, vorfuehrung: true },
      notizen: [{ id: 'n5', zeitpunkt: tageAb(-7, 11, 0), sparten: ['vorwerk'], text: 'Saugroboter gekauft. Wohnung ist gemietet, deshalb kein PV-Thema.' }],
    },
    {
      id: 'demo-4', vorname: 'Dieter', nachname: 'Test', firma: 'Bäckerei Test', strasse: 'Hauptstraße 20', plz: '38159', ort: 'Vechelde',
      telefon: '05302 999888', lat: 52.2612, lng: 10.3651,
      status: { pv: 'angebot', wp: 'termin', vorwerk: 'unbekannt' },
      pv: { dachflaeche: 180, ausrichtung: 'Ost/West', dachform: 'Flachdach', stromverbrauch: 28000, speicher: true },
      wp: { heizungsart: 'Öl', heizungBaujahr: 1998, verbrauchMenge: 4000, verbrauchEinheit: 'Liter', wohnflaeche: 220 },
      notizen: [{ id: 'n6', zeitpunkt: tageAb(-3, 9, 15), sparten: ['pv', 'wp'], text: 'Angebot PV übergeben. Für Wärmepumpe Vor-Ort-Termin mit Techniker vereinbart.' }],
    },
    {
      id: 'demo-5', strasse: 'Lindenweg 8', plz: '38268', ort: 'Lengede', lat: 52.2065, lng: 10.3016,
      status: { pv: 'potenzial', wp: 'potenzial', vorwerk: 'unbekannt' },
      notizen: [{ id: 'n7', zeitpunkt: tageAb(-2, 19, 0), sparten: ['pv', 'wp'], text: 'Altbau mit Ölheizung (Tank im Garten sichtbar), Dach unbelegt. Nochmal klingeln.' }],
    },
  ];
  d.termine = [
    { id: 't1', kundeId: 'demo-1', sparte: 'wp', art: 'termin', titel: 'WP-Beratung Anna Beispiel', beginn: tageAb(1, 17, 0), dauerMin: 60, ort: 'Lindenweg 4, 38268 Lengede' },
    { id: 't2', kundeId: 'demo-1', sparte: 'vorwerk', art: 'termin', titel: 'Vorwerk-Vorführung Anna Beispiel', beginn: tageAb(9, 18, 0), dauerMin: 90, ort: 'Lindenweg 4, 38268 Lengede' },
    { id: 't3', kundeId: 'demo-5', sparte: 'pv', art: 'wiedervorlage', titel: 'Lindenweg 8 nochmal klingeln', beginn: tageAb(0, 18, 30), dauerMin: 60 },
    { id: 't4', kundeId: 'demo-2', sparte: 'pv', art: 'wiedervorlage', titel: 'Bernd Muster anrufen (Flyer)', beginn: tageAb(-1, 10, 0), dauerMin: 60 },
    { id: 't5', kundeId: 'demo-4', sparte: 'wp', art: 'termin', titel: 'Bäckerei Test: Techniker vor Ort', beginn: tageAb(4, 8, 0), dauerMin: 120, ort: 'Hauptstraße 20, 38159 Vechelde' },
  ];
  d.geraete = [
    { id: 'g1', name: 'Kobold VK7 Akku-Staubsauger', seriennummer: 'VK7-20391', zubehoer: 'Bodendüse, Polsterdüse, Ladestation' },
    { id: 'g2', name: 'Kobold VR7 Saugroboter', seriennummer: 'VR7-11873', zubehoer: 'Ladestation' },
    { id: 'g3', name: 'Kobold SP7 Saugwischer', seriennummer: 'SP7-55102', zubehoer: 'Wischpads, Reinigungsmittel' },
    { id: 'g4', name: 'Kobold Polsterboy', seriennummer: 'PB-7720' },
  ];
  d.leihvorgaenge = [
    { id: 'l1', geraetId: 'g1', kundeId: 'demo-1', ausgabe: tageAb(-2, 18, 30), rueckgabeGeplant: tageAb(5, 10, 0), kaufinteresse: 'interesse', notiz: 'Testet mit Hund auf Teppich und Fliesen.' },
    { id: 'l2', geraetId: 'g3', kundeId: 'demo-4', ausgabe: tageAb(-9, 9, 0), rueckgabeGeplant: tageAb(-2, 10, 0), kaufinteresse: 'offen', notiz: 'Für die Backstube ausprobieren.' },
    { id: 'l3', geraetId: 'g2', kundeId: 'demo-3', ausgabe: tageAb(-20, 11, 0), rueckgabeGeplant: tageAb(-13, 10, 0), rueckgabe: tageAb(-7, 11, 0), kaufinteresse: 'gekauft' },
  ];
  d.termine.push({ id: 't6', kundeId: 'demo-4', sparte: 'vorwerk', art: 'wiedervorlage', titel: 'Nachfragen: Kobold SP7 Saugwischer bei Dieter Test (Bäckerei Test)', beginn: tageAb(-2, 10, 0), dauerMin: 60, notiz: 'Wie gefällt das Gerät? Kaufinteresse? Rückgabe abholen.' });
  // Viele weitere Kunden im Beratungsgebiet (Lengede, Raum Peine bis Salzgitter)
  gebietsKunden(d, tageAb);
  return d;
}

// ---------- Beispielkunden in der echten App (Einstellungen → Beispielkunden) ----------
// Kennzeichnung ohne Schemaänderung: Alle Beispiel-Objekte haben IDs mit Präfix "demo-".
// So lassen sie sich jederzeit vollständig wieder entfernen, ohne echte Daten anzufassen.

export const BEISPIEL_PRAEFIX = 'demo-';
export const istBeispiel = (id) => typeof id === 'string' && id.startsWith(BEISPIEL_PRAEFIX);
const mitPraefix = (id) => (istBeispiel(id) ? id : `${BEISPIEL_PRAEFIX}${id}`);

// ---------- Sicherheitsprüfung: echte Daten werden von Beispielen nie angetastet ----------
// Jede Änderung durch Beispielkunden/-bestand läuft über beispielSicher(): Sie arbeitet auf einer Kopie,
// vergleicht danach jeden echten Datensatz (Kunden, Termine, Geräte, Leihvorgänge, Reservierungen,
// Papierkorb, Einstellungen) mit dem Stand vorher und übernimmt das Ergebnis nur, wenn alles Echte
// unverändert ist. Sonst bricht sie ab und es ändert sich gar nichts.

const SAMMLUNGEN = ['kunden', 'termine', 'geraete', 'leihvorgaenge', 'reservierungen', 'papierkorb'] as const;
const istBeispielId = (id) => istBeispiel(id) || (typeof id === 'string' && id.startsWith('demob-'));

/** Echte Datensätze als Vergleichsabdruck. Bezüge auf Beispiele (kundeId/geraetId) zählen nicht als Inhalt. */
function echterAbdruck(data: Daten): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of SAMMLUNGEN) {
    for (const x of (data[s] as Rec[] | undefined) || []) {
      if (istBeispielId(x?.id)) continue;
      const kopie: Rec = { ...x };
      if (istBeispielId(kopie.kundeId)) kopie.kundeId = '';
      const schluessel = `${s}:${x?.id}`;
      if (m.has(schluessel)) throw new Error(`Sicherheitsprüfung: doppelte ID ${schluessel}.`);
      m.set(schluessel, JSON.stringify(kopie));
    }
  }
  m.set('einstellungen', JSON.stringify(data.einstellungen));
  m.set('schemaVersion', String(data.schemaVersion));
  return m;
}

export class BeispielSchutzFehler extends Error {}

/**
 * Führt eine Beispiel-Änderung aus, aber nur, wenn danach jeder echte Datensatz unverändert da ist
 * und nichts Neues ohne Beispiel-Kennung dazukam. Sonst: Fehler, `data` bleibt wie es war.
 */
export function beispielSicher(data: Daten, aenderung: (kopie: Daten) => void): void {
  const vorher = echterAbdruck(data);
  const kopie: Daten = JSON.parse(JSON.stringify(data));
  aenderung(kopie);
  const nachher = echterAbdruck(kopie);
  for (const [k, v] of vorher) {
    if (!nachher.has(k)) throw new BeispielSchutzFehler(`Sicherheitsprüfung: Echter Datensatz würde fehlen (${k}). Nichts wurde geändert.`);
    if (nachher.get(k) !== v) throw new BeispielSchutzFehler(`Sicherheitsprüfung: Echter Datensatz würde verändert (${k}). Nichts wurde geändert.`);
  }
  for (const k of nachher.keys()) {
    if (!vorher.has(k)) throw new BeispielSchutzFehler(`Sicherheitsprüfung: Neuer Datensatz ohne Beispiel-Kennung (${k}). Nichts wurde geändert.`);
  }
  for (const s of SAMMLUNGEN) (data as Rec)[s] = (kopie as Rec)[s];
}

/** Anzahl der vorhandenen Beispielkunden. */
export function beispielAnzahl(data: Daten) {
  return data.kunden.filter((k) => istBeispiel(k.id)).length;
}

/**
 * Fügt die Beispieldaten in einen (bereits migrierten) Datenbestand ein. Bereits vorhandene
 * Beispiele werden vorher entfernt, damit nichts doppelt ist. `beispiel` = migrate(demoDaten()).
 * Absender, Vorlagen und übrige Einstellungen bleiben unangetastet.
 */
export function beispielEinfuegen(data: Daten, beispiel: Daten) {
  beispielEntfernen(data);
  data.kunden.push(...beispiel.kunden.map((k) => ({ ...k, id: mitPraefix(k.id) })));
  data.termine.push(...beispiel.termine.map((t) => ({ ...t, id: mitPraefix(t.id), kundeId: t.kundeId ? mitPraefix(t.kundeId) : '' })));
  data.geraete.push(...beispiel.geraete.map((g) => ({ ...g, id: mitPraefix(g.id) })));
  data.leihvorgaenge.push(...beispiel.leihvorgaenge.map((l) => ({ ...l, id: mitPraefix(l.id), geraetId: mitPraefix(l.geraetId), kundeId: l.kundeId ? mitPraefix(l.kundeId) : '' })));
}

/** Entfernt alle Beispiel-Objekte. Echte Termine/Verleihe, die auf Beispiele zeigen, verlieren nur den Bezug (R-LOESCH). */
export function beispielEntfernen(data: Daten) {
  data.kunden = data.kunden.filter((k) => !istBeispiel(k.id));
  data.termine = data.termine.filter((t) => !istBeispiel(t.id)).map((t) => (istBeispiel(t.kundeId) ? { ...t, kundeId: '' } : t));
  // Ein Beispielgerät, das schon echt verliehen wurde, bleibt (sonst ginge ein echter Verleih verloren).
  const echtVerliehen = new Set(data.leihvorgaenge.filter((l) => !istBeispiel(l.id)).map((l) => l.geraetId));
  data.geraete = data.geraete.filter((g) => !istBeispiel(g.id) || echtVerliehen.has(g.id));
  data.leihvorgaenge = data.leihvorgaenge
    .filter((l) => !istBeispiel(l.id))
    .map((l) => (istBeispiel(l.kundeId) ? { ...l, kundeId: '' } : l));
}

// ---------- Beispiel-Vorführbestand (nur Geräte, ohne Kunden) ----------
// Eigener Präfix "demob-", damit „Beispielkunden entfernen“ und „Beispielbestand entfernen“ unabhängig sind.
export const BESTAND_PRAEFIX = 'demob-';
export const istBeispielGeraet = (id) => typeof id === 'string' && (id.startsWith(BESTAND_PRAEFIX) || id.startsWith(BEISPIEL_PRAEFIX));

/** Realistischer Kobold-Vorführbestand (Seriennummern frei erfunden). */
export function beispielBestand() {
  return [
    { id: 'demob-1', name: 'Kobold VK7 Akku-Staubsauger', seriennummer: 'BSP-VK7-0001', zubehoer: 'Elektrobürste EB7, Polsterdüse, Fugendüse, Ladestation, 2 Filtertüten', notiz: 'Vorführgerät 1, voll geladen ins Auto.' },
    { id: 'demob-2', name: 'Kobold VK7 Akku-Staubsauger', seriennummer: 'BSP-VK7-0002', zubehoer: 'Elektrobürste EB7, Ladestation', notiz: 'Zweitgerät zum Verleihen.' },
    { id: 'demob-3', name: 'Kobold VR7 Saugroboter', seriennummer: 'BSP-VR7-0001', zubehoer: 'Ladestation, Ersatzfilter', notiz: 'App-Kopplung vor Ort zeigen.' },
    { id: 'demob-4', name: 'Kobold SP7 Saugwischer', seriennummer: 'BSP-SP7-0001', zubehoer: 'Wischpads (4), Reinigungsmittel, Ladestation' },
    { id: 'demob-5', name: 'Kobold VB100 Akku-Handstaubsauger', seriennummer: 'BSP-VB100-0001', zubehoer: 'Ladekabel, Fugendüse' },
    { id: 'demob-6', name: 'Kobold Polsterboy PB7', seriennummer: 'BSP-PB7-0001', zubehoer: 'Milbenaufsatz' },
    { id: 'demob-7', name: 'Kobold Zubehör-Koffer (Vorführung)', seriennummer: '', zubehoer: 'Teppichfrischer, Duftkonzentrat, Filtertüten, Hartbodendüse', notiz: 'Verbrauchsmaterial zum Zeigen.' },
  ];
}

export function bestandAnzahl(data: Daten) {
  return data.geraete.filter((g) => g.id.startsWith(BESTAND_PRAEFIX)).length;
}

/** Fügt den Beispielbestand ein (vorhandene Beispielgeräte vorher entfernen, außer sie sind verliehen). `geraete` = normalisierte Geräte. */
export function bestandEinfuegen(data: Daten, geraete: Geraet[]) {
  bestandEntfernen(data);
  const vorhanden = new Set(data.geraete.map((g) => g.id));
  data.geraete.push(...geraete.filter((g) => !vorhanden.has(g.id)));
}

/** Entfernt Beispielgeräte. Geräte mit Verleih-Verlauf bleiben (sonst ginge echter Verlauf verloren, R-LOESCH). */
export function bestandEntfernen(data: Daten) {
  // Geräte mit Verleih-Verlauf oder Reservierung bleiben (sonst ginge Echtes verloren, R-LOESCH)
  const mitVerlauf = new Set([...data.leihvorgaenge.map((l) => l.geraetId), ...(data.reservierungen || []).map((r) => r.geraetId)]);
  data.geraete = data.geraete.filter((g) => !g.id.startsWith(BESTAND_PRAEFIX) || mitVerlauf.has(g.id));
  const bleiben = new Set(data.geraete.map((g) => g.id));
  data.reservierungen = (data.reservierungen || []).filter((r) => bleiben.has(r.geraetId));
}
