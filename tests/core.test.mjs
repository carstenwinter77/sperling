// Unit-Tests für den DOM-freien Kern. Ausführen: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KeyRing, WrongPasswordError, InvalidEnvelopeError, validateEnvelope } from '../src/core/crypto.ts';
import { migrate, emptyData, neuerKunde, neueNotiz, normalizeKunde, SCHEMA_VERSION, hauptStatus } from '../src/core/model.ts';
import { generiereText, projizieren, notizErlaubt, ausgelasseneNotizen } from '../src/core/textgen.ts';
import { erzeugeIcs, icsEscape, foldLine } from '../src/core/ics.ts';
import { parseNumber, isoToLocalInput, localInputToIso, esc, distanceMeters } from '../src/core/util.ts';

const ITER = 100000; // schneller für Tests, Minimum laut validateEnvelope

test('Verschlüsselung: Rundreise und falsches Passwort', async () => {
  const kr = new KeyRing('geheim123', ITER);
  const data = { hallo: 'Wörld', n: [1, 2, 3] };
  const env = await kr.encrypt(data, { updatedAt: '2026-01-01T00:00:00.000Z', deviceId: 'a' });
  assert.equal(validateEnvelope(env), true);
  assert.ok(!JSON.stringify(env).includes('Wörld'), 'Klartext darf nicht im Umschlag stehen');
  assert.deepEqual(await new KeyRing('geheim123').decrypt(env), data);
  await assert.rejects(new KeyRing('falsch').decrypt(env), WrongPasswordError);
});

test('Verschlüsselung: manipulierter Kopf wird erkannt', async () => {
  const kr = new KeyRing('pw-pw-pw-pw', ITER);
  const env = await kr.encrypt({ a: 1 }, { updatedAt: '2026-01-01T00:00:00.000Z' });
  await assert.rejects(new KeyRing('pw-pw-pw-pw').decrypt({ ...env, updatedAt: '2099-01-01T00:00:00.000Z' }), WrongPasswordError);
});

test('Umschlag-Validierung lehnt Fremdes ab', () => {
  assert.throws(() => validateEnvelope(null), InvalidEnvelopeError);
  assert.throws(() => validateEnvelope({ app: 'x' }), InvalidEnvelopeError);
  assert.throws(() => validateEnvelope({ app: 'sperling', format: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 10, salt: 'a' }, iv: 'a', ct: 'a', updatedAt: 'x' }), InvalidEnvelopeError);
});

test('Migration repariert kaputte Daten ohne Absturz', () => {
  assert.equal(migrate(null).schemaVersion, SCHEMA_VERSION);
  const d = migrate({ kunden: [{ id: 'k1', status: { pv: 'quatsch' }, lat: 'abc', notizen: [{ text: 5, sparten: ['pv', 'xx'] }] }, { id: 'k1' }, 7], termine: [{ kundeId: 'weg', beginn: 'kein datum', dauerMin: -5 }] });
  assert.equal(d.kunden.length, 2, 'Doppelte ID entfernt, ungültiger Eintrag normalisiert');
  assert.equal(d.kunden[0].status.pv, 'unbekannt');
  assert.equal(d.kunden[0].lat, null);
  assert.deepEqual(d.kunden[0].notizen[0].sparten, ['pv']);
  assert.equal(d.kunden[0].notizen[0].text, '5');
  assert.equal(d.termine.length, 1, 'Verwaister Termin bleibt erhalten');
  assert.equal(d.termine[0].kundeId, '');
  assert.equal(d.termine[0].dauerMin, 60);
  assert.throws(() => migrate({ schemaVersion: SCHEMA_VERSION + 1 }));
});

test('hauptStatus wählt den wichtigsten Status', () => {
  assert.equal(hauptStatus(neuerKunde({ status: { pv: 'potenzial', wp: 'abschluss', vorwerk: 'kein_interesse' } })), 'abschluss');
  assert.equal(hauptStatus(neuerKunde()), 'unbekannt');
});

function testKunde() {
  return neuerKunde({
    vorname: 'Eva', nachname: 'Test', strasse: 'Weg 1', plz: '12345', ort: 'Stadt',
    status: { pv: 'interesse', wp: 'potenzial', vorwerk: 'interesse' },
    pv: { dachflaeche: 50, ausrichtung: 'Süd' },
    wp: { heizungsart: 'Öl' },
    vorwerk: { interesseAn: 'Kobold Saugroboter', bemerkung: 'GEHEIM-VORWERK' },
    notizen: [
      neueNotiz({ text: 'NOTIZ-PV', sparten: ['pv'] }),
      neueNotiz({ text: 'NOTIZ-WP', sparten: ['wp'] }),
      neueNotiz({ text: 'NOTIZ-VW', sparten: ['vorwerk'] }),
      neueNotiz({ text: 'NOTIZ-GEMISCHT', sparten: ['pv', 'vorwerk'] }),
      neueNotiz({ text: 'NOTIZ-OHNE', sparten: [] }),
    ],
  });
}

test('Textgenerator Enpal enthält nie Vorwerk-Daten', () => {
  const t = generiereText(testKunde(), 'enpal', emptyData().einstellungen);
  assert.match(t, /NOTIZ-PV/);
  assert.match(t, /NOTIZ-WP/);
  assert.match(t, /Dachfläche: 50 m²/);
  for (const verboten of ['NOTIZ-VW', 'NOTIZ-GEMISCHT', 'NOTIZ-OHNE', 'GEHEIM-VORWERK', 'Kobold', 'Vorwerk']) {
    assert.ok(!t.includes(verboten), `Enpal-Text enthält ${verboten}`);
  }
});

test('Textgenerator Vorwerk enthält nie PV/WP-Daten', () => {
  const t = generiereText(testKunde(), 'vorwerk', emptyData().einstellungen);
  assert.match(t, /NOTIZ-VW/);
  assert.match(t, /Kobold Saugroboter/);
  for (const verboten of ['NOTIZ-PV', 'NOTIZ-WP', 'NOTIZ-GEMISCHT', 'Dachfläche', 'Öl', 'Photovoltaik', 'Wärmepumpe']) {
    assert.ok(!t.includes(verboten), `Vorwerk-Text enthält ${verboten}`);
  }
});

test('Vorlage kann fremde Daten nicht per Platzhalter erreichen', () => {
  const e = emptyData().einstellungen;
  e.vorlagen.vorwerk = '{{pv}} {{wp.heizungsart}} {{daten}} {{constructor}} {{__proto__}}';
  const t = generiereText(testKunde(), 'vorwerk', e);
  assert.ok(!t.includes('Öl') && !t.includes('Süd') && !t.includes('function'));
  const p = projizieren(testKunde(), 'vorwerk');
  assert.equal(p.pv, undefined);
  assert.equal(p.wp, undefined);
});

test('Notiz-Zuordnung und Zählung ausgelassener Notizen', () => {
  assert.equal(notizErlaubt({ sparten: ['pv', 'wp'] }, 'enpal'), true);
  assert.equal(notizErlaubt({ sparten: ['pv', 'vorwerk'] }, 'enpal'), false);
  assert.equal(notizErlaubt({ sparten: [] }, 'vorwerk'), false);
  assert.equal(ausgelasseneNotizen(testKunde()), 2);
  assert.throws(() => notizErlaubt({ sparten: [] }, 'gibtsnicht'));
});

test('ICS: gültige Struktur, Escaping, Faltung, CRLF', () => {
  const ics = erzeugeIcs([{ id: 'x1', titel: 'Termin; mit, Komma\nund Zeile', beginn: '2026-03-01T09:00:00.000Z', dauerMin: 90, ort: 'Ä'.repeat(80), notiz: '' }, { id: 'kaputt', beginn: 'nix' }], { jetzt: '2026-01-01T00:00:00.000Z' });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1, 'Ungültiger Termin wird übersprungen');
  assert.match(ics, /DTSTART:20260301T090000Z/);
  assert.match(ics, /DTEND:20260301T103000Z/);
  assert.ok(ics.includes(String.raw`SUMMARY:Termin\; mit\, Komma\nund Zeile`));
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, `Zeile zu lang: ${line}`);
  assert.equal(icsEscape('a\\b'), 'a\\\\b');
  assert.equal(foldLine('kurz'), 'kurz');
});

test('Hilfsfunktionen', () => {
  assert.equal(parseNumber('12,5'), 12.5);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber(Infinity), null);
  assert.equal(localInputToIso('quatsch'), null);
  const iso = localInputToIso('2026-05-04T13:45');
  assert.equal(isoToLocalInput(iso), '2026-05-04T13:45');
  assert.equal(isoToLocalInput('kaputt'), '');
  assert.equal(esc('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
  assert.ok(Math.abs(distanceMeters(52.52, 13.405, 52.521, 13.405) - 111) < 2);
});

test('normalizeKunde akzeptiert gültige Bogenwerte und verwirft ungültige', () => {
  const k = normalizeKunde({ pv: { dachflaeche: '45,5', ausrichtung: 'Irgendwo', eauto: 'ja' } });
  assert.equal(k.pv.dachflaeche, 45.5);
  assert.equal(k.pv.ausrichtung, '');
  assert.equal(k.pv.eauto, null);
});

import { gespraechsNotiz, LEITFADEN, TECHNIKEN } from '../src/core/einwaende.ts';
import { normalizeLeihvorgang, normalizeGeraet } from '../src/core/model.ts';

test('Gesprächsnotiz enthält nur Einwände der eigenen Sparte', () => {
  const t = gespraechsNotiz('vorwerk', { hab: 'bleibt', teuer: 'ueberzeugt', unbekannt: 'offen' });
  assert.match(t, /Vorwerk/);
  assert.match(t, /schon einen Staubsauger.*bleibt dabei/);
  assert.ok(!/Dach|Heizung|Wärmepumpe/.test(t));
  assert.equal(gespraechsNotiz('pv', {}), '');
  assert.throws(() => gespraechsNotiz('xx', {}));
  for (const s of Object.keys(LEITFADEN)) for (const e of LEITFADEN[s].einwaende) assert.ok(e.id && e.kunde && e.auffangen && e.isolieren && e.antworten.length && e.abschluss && TECHNIKEN[e.technik], `${s}/${e.id} unvollständig`);
});

test('Leihvorgang/Gerät werden robust normalisiert', () => {
  const l = normalizeLeihvorgang({ kaufinteresse: 'quatsch', rueckgabeGeplant: 'nie', ausgabe: 'x' });
  assert.equal(l.kaufinteresse, 'offen');
  assert.equal(l.rueckgabeGeplant, null);
  assert.ok(l.ausgabe);
  assert.equal(normalizeGeraet({}).name, 'Unbenanntes Gerät');
  assert.equal(normalizeGeraet({ aktiv: false }).aktiv, false);
});

import { normalizeGespraech, AUSGANG } from '../src/core/model.ts';
test('Gespräch wird robust normalisiert und bleibt bei einer Sparte', () => {
  const g = normalizeGespraech({ sparte: 'xx', ausgang: 'quatsch', einwaende: [null, { id: 'a', text: 't', ergebnis: 'komisch' }] });
  assert.equal(g.sparte, 'pv');
  assert.equal(g.ausgang, '');
  assert.equal(g.einwaende.length, 1);
  assert.equal(g.einwaende[0].ergebnis, 'offen');
  assert.ok(Object.keys(AUSGANG).includes('termin'));
  assert.deepEqual(normalizeKunde({}).gespraeche, []);
});

// ---------- 0.3.0: Kontakt & Enpal-Gesprächsdokumentation ----------
import { telNummer, mailUrl } from '../src/ui/kontakt.ts';
import { enpalDokuText, enpalVerlaufText } from '../src/core/textgen.ts';

test('telNummer bereinigt, behält führendes +', () => {
  assert.equal(telNummer('+49 (511) 123-456'), '+49511123456');
  assert.equal(telNummer('0511 / 12 34'), '05111234');
  assert.equal(telNummer('12+34'), '1234');
  assert.equal(telNummer(null), '');
});

test('mailUrl kodiert Betreff und Text für alle Programme', () => {
  const m = { an: 'a@b.de', betreff: 'Hallo & Tschüss', text: 'Zeile 1\nZeile 2' };
  const std = mailUrl('standard', m);
  assert.ok(std.startsWith('mailto:a@b.de?subject='));
  assert.ok(std.includes('Hallo%20%26%20Tsch%C3%BCss') && std.includes('%0A'));
  assert.ok(mailUrl('gmail', m).startsWith('https://mail.google.com/'));
  assert.ok(mailUrl('outlook', m).startsWith('https://outlook.office.com/'));
  assert.ok(!mailUrl('standard', { an: 'x@y.de?bcc=z@q.de', betreff: '', text: '' }).includes('?bcc'));
});

test('Migration v1 → v2: enpalKontakte und Empfänger werden ergänzt', () => {
  const alt = { schemaVersion: 1, kunden: [{ id: 'a', nachname: 'Alt' }], termine: [], einstellungen: { absender: 'X' } };
  const d = migrate(alt);
  assert.equal(d.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(d.kunden[0].enpalKontakte, []);
  assert.deepEqual(d.einstellungen.empfaenger, { enpal: '', vorwerk: '' });
  assert.equal(d.einstellungen.absender, 'X');
});

test('Enpal-Doku: Text enthält Kontakt, nie Vorwerk (R-TEXT)', () => {
  const k = normalizeKunde({
    vorname: 'Eva', nachname: 'Enpal', telefon: '0511 1',
    status: { pv: 'interesse', wp: 'unbekannt', vorwerk: 'abschluss' },
    pv: { dachflaeche: 50 }, vorwerk: { vorhandenesGeraet: 'GEHEIM-VORWERK' },
    notizen: [{ text: 'VORWERK-NOTIZ', sparten: ['vorwerk'] }],
    enpalKontakte: [
      { id: 'c1', art: 'telefon', zeitpunkt: '2026-11-01T09:00:00Z', themen: ['pv', 'vorwerk'], ergebnis: 'termin', naechsterSchritt: 'Hausbesuch', notiz: 'Erstgespräch' },
      { id: 'c2', art: 'hausbesuch', zeitpunkt: '2026-11-05T15:00:00Z', themen: ['pv'], ergebnis: 'angebot', erreicht: false },
    ],
  });
  assert.deepEqual(k.enpalKontakte[0].themen, ['pv'], 'Vorwerk wird beim Normalisieren entfernt');
  const t = enpalDokuText(k, 'c1', { absender: 'Max' });
  assert.match(t, /Telefonische Kontaktaufnahme/);
  assert.match(t, /Hausbesuch/);
  assert.match(t, /Dachfläche/);
  assert.match(t, /Dokumentiert von: Max/);
  assert.doesNotMatch(t, /GEHEIM-VORWERK|VORWERK-NOTIZ|Vorwerk/);
  const v = enpalVerlaufText(k, {});
  assert.ok(v.indexOf('Kontakt 1') < v.indexOf('Kontakt 2'));
  assert.match(v, /Kunde erreicht: nein/);
  assert.equal(enpalDokuText(k, 'gibtsnicht'), '');
  assert.equal(projizieren(k, 'vorwerk').enpalKontakte, undefined, 'Vorwerk-Projektion sieht keine Enpal-Doku');
});

// ---------- 0.5.0: Beispielkunden in der echten App ----------
import { demoDaten, beispielEinfuegen, beispielEntfernen, beispielAnzahl, istBeispiel } from '../src/demo.ts';

test('Beispielkunden laden und vollständig entfernen, echte Daten bleiben', () => {
  const d = migrate({ schemaVersion: 2, kunden: [{ id: 'echt', nachname: 'Echt' }], termine: [{ id: 'te', kundeId: 'echt', titel: 'Echt', beginn: '2026-11-10T10:00:00Z' }] });
  beispielEinfuegen(d, migrate(demoDaten()));
  assert.equal(beispielAnzahl(d), 5);
  assert.ok(d.termine.length > 1 && d.termine.filter((t) => t.id !== 'te').every((t) => istBeispiel(t.id) && istBeispiel(t.kundeId)));
  assert.ok(d.leihvorgaenge.every((l) => istBeispiel(l.geraetId) && istBeispiel(l.kundeId)));
  // doppelt laden ersetzt statt zu verdoppeln
  beispielEinfuegen(d, migrate(demoDaten()));
  assert.equal(beispielAnzahl(d), 5);
  // echter Termin bei Beispielkunde, echter Verleih eines Beispielgeräts
  d.termine.push({ id: 'te2', kundeId: 'demo-1', titel: 'Echt bei Beispiel' });
  d.leihvorgaenge.push({ id: 'le', geraetId: 'demo-g2', kundeId: 'echt' });
  beispielEntfernen(d);
  assert.equal(beispielAnzahl(d), 0);
  assert.deepEqual(d.kunden.map((k) => k.id), ['echt']);
  assert.ok(d.termine.find((t) => t.id === 'te'));
  assert.equal(d.termine.find((t) => t.id === 'te2').kundeId, '', 'echter Termin bleibt, verliert nur den Bezug');
  assert.deepEqual(d.geraete.map((g) => g.id), ['demo-g2'], 'echt verliehenes Beispielgerät bleibt');
  assert.deepEqual(d.leihvorgaenge.map((l) => l.id), ['le']);
});

test('Beispiel-Vorführbestand laden/entfernen, verliehene Geräte bleiben', async () => {
  const { beispielBestand, bestandEinfuegen, bestandEntfernen, bestandAnzahl } = await import('../src/demo.ts');
  const { normalizeGeraet } = await import('../src/core/model.ts');
  const d = migrate({ schemaVersion: 2, geraete: [{ id: 'echt-g', name: 'Eigenes Gerät' }] });
  bestandEinfuegen(d, beispielBestand().map(normalizeGeraet));
  const n = bestandAnzahl(d);
  assert.ok(n >= 5);
  bestandEinfuegen(d, beispielBestand().map(normalizeGeraet));
  assert.equal(bestandAnzahl(d), n, 'kein Doppeln');
  d.leihvorgaenge.push({ id: 'l', geraetId: 'demob-1', kundeId: '' });
  bestandEntfernen(d);
  assert.deepEqual(d.geraete.map((g) => g.id).sort(), ['demob-1', 'echt-g']);
});

test('Papierkorb: Kunde löschen und mit Bezügen wiederherstellen', async () => {
  const { neuerTermin, neuesGeraet, neuerLeihvorgang, normalizeReservierung } = await import('../src/core/model.ts');
  const pk = await import('../src/core/papierkorb.ts');
  const data = emptyData();
  const k = neuerKunde({ vorname: 'Anna', nachname: 'Beispiel' });
  k.notizen.push(neueNotiz({ text: 'Notiz eins' }));
  data.kunden.push(k);
  const t = neuerTermin({ kundeId: k.id, titel: 'Besuch', beginn: new Date().toISOString() });
  data.termine.push(t);
  const g = neuesGeraet({ name: 'Kobold' });
  data.geraete.push(g);
  const l = neuerLeihvorgang({ geraetId: g.id, kundeId: k.id });
  data.leihvorgaenge.push(l);
  data.reservierungen = [normalizeReservierung({ geraetId: g.id, kundeId: k.id, von: '2026-12-01', bis: '2026-12-03' })];

  // Notiz löschen und zurückholen
  assert.equal(pk.notizLoeschen(data, k.id, k.notizen[0].id), true);
  assert.equal(k.notizen.length, 0);
  assert.equal(pk.eintragTitel(data.papierkorb[0], data).art, 'Notiz');
  pk.wiederherstellen(data, data.papierkorb[0].id);
  assert.equal(k.notizen.length, 1);

  // Kunde löschen: Bezüge werden gelöst
  assert.equal(pk.kundeLoeschen(data, k.id), true);
  assert.equal(data.kunden.length, 0);
  assert.equal(t.kundeId, '');
  assert.equal(l.kundeId, '');
  assert.equal(data.reservierungen[0].kundeId, '');
  // Notiz eines gelöschten Kunden kann nicht zurück
  pk.notizLoeschen(data, k.id, 'gibtsnicht');
  // Termin wird inzwischen einem anderen Kunden zugeordnet -> bleibt dort
  const k2 = neuerKunde({ vorname: 'Bert' });
  data.kunden.push(k2);
  t.kundeId = k2.id;
  const eintrag = data.papierkorb.find((e) => e.typ === 'kunde');
  pk.wiederherstellen(data, eintrag.id);
  assert.equal(data.kunden.length, 2);
  assert.equal(t.kundeId, k2.id, 'umgehängter Termin bleibt beim anderen Kunden');
  assert.equal(l.kundeId, k.id);
  assert.equal(data.reservierungen[0].kundeId, k.id);
  assert.equal(data.papierkorb.some((e) => e.id === eintrag.id), false);
  assert.throws(() => pk.wiederherstellen(data, eintrag.id), /nicht mehr/);

  // Termin löschen, endgültig löschen, leeren
  pk.terminLoeschen(data, t.id);
  assert.equal(data.termine.length, 0);
  pk.endgueltigLoeschen(data, data.papierkorb[0].id);
  assert.equal(data.papierkorb.length, 0);
  pk.terminLoeschen(data, 'x');
  pk.leeren(data);
  assert.deepEqual(data.papierkorb, []);
});

test('Papierkorb: Einträge älter als 30 Tage verfallen beim Laden', () => {
  const alt = new Date(Date.now() - 31 * 864e5).toISOString();
  const neu = new Date(Date.now() - 2 * 864e5).toISOString();
  const d = migrate({ ...emptyData(), papierkorb: [
    { id: 'a', typ: 'termin', objekt: { id: 't1' }, geloeschtAm: alt },
    { id: 'b', typ: 'termin', objekt: { id: 't2' }, geloeschtAm: neu },
    { id: 'c', typ: 'quatsch', objekt: {}, geloeschtAm: neu },
  ] });
  assert.deepEqual(d.papierkorb.map((e) => e.id), ['b']);
});

test('Gerätebelegung: Reservierungen und Verleihe, tageweise inklusive', async () => {
  const { geraetBelegung, ueberschneidet, normalizeReservierung, neuerLeihvorgang } = await import('../src/core/model.ts');
  assert.equal(ueberschneidet('2026-12-01', '2026-12-03', '2026-12-03', '2026-12-05'), true);
  assert.equal(ueberschneidet('2026-12-01', '2026-12-02', '2026-12-03', '2026-12-05'), false);
  const data = emptyData();
  data.reservierungen = [normalizeReservierung({ id: 'r1', geraetId: 'g', von: '2026-12-10', bis: '2026-12-12' })];
  data.leihvorgaenge = [
    neuerLeihvorgang({ id: 'l1', geraetId: 'g', ausgabe: '2026-12-01', rueckgabeGeplant: '2026-12-04' }),
    neuerLeihvorgang({ id: 'l2', geraetId: 'g', ausgabe: '2027-01-10' }), // offen ohne Datum: bis auf Weiteres belegt
    neuerLeihvorgang({ id: 'l3', geraetId: 'anderes', ausgabe: '2026-12-11' }),
  ];
  assert.deepEqual(geraetBelegung(data, 'g', '2026-12-05', '2026-12-09'), []);
  assert.deepEqual(geraetBelegung(data, 'g', '2026-12-04', '2026-12-10').map((x) => x.eintrag.id), ['r1', 'l1']);
  assert.deepEqual(geraetBelegung(data, 'g', '2026-12-11', '2026-12-11', 'r1'), []);
  assert.deepEqual(geraetBelegung(data, 'g', '2030-06-01', '2030-06-02').map((x) => x.art), ['verleih']);
  // Normalisierung: bis vor von wird korrigiert
  const r = normalizeReservierung({ von: '2026-12-10', bis: '2026-12-01' });
  assert.equal(r.bis, r.von);
});

test('Belegungsplan: Balken, Sperren, freie Geräte, Liste nach Tagen', async () => {
  const b = await import('../src/core/belegung.ts');
  const { normalizeReservierung, neuerLeihvorgang, neuesGeraet } = await import('../src/core/model.ts');
  assert.equal(b.plusTage('2026-12-31', 1), '2027-01-01');
  assert.equal(b.wochenanfang('2026-11-08'), '2026-11-02');
  assert.equal(b.kalenderwoche('2026-01-01'), 1);
  assert.equal(b.kalenderwoche('2026-12-31'), 53);
  assert.equal(b.tageZwischen('2026-11-01', '2026-11-08'), 7);
  const data = emptyData();
  data.geraete = [neuesGeraet({ id: 'g1', name: 'A' }), neuesGeraet({ id: 'g2', name: 'B' }), neuesGeraet({ id: 'g3', name: 'C', aktiv: false })];
  const t = (s) => new Date(`${s}T10:00`).toISOString();
  data.leihvorgaenge = [
    neuerLeihvorgang({ id: 'l1', geraetId: 'g1', kundeId: 'k', ausgabe: t('2026-11-02'), rueckgabeGeplant: t('2026-11-05') }), // überfällig (heute 10.11.)
    neuerLeihvorgang({ id: 'l2', geraetId: 'g2', ausgabe: t('2026-10-01'), rueckgabe: t('2026-10-08') }),
  ];
  data.reservierungen = [normalizeReservierung({ id: 'r1', geraetId: 'g2', kundeId: 'k2', von: t('2026-11-12'), bis: t('2026-11-14') })];
  const heute = '2026-11-10';
  const g1 = b.balkenFuer(data, 'g1', heute);
  assert.equal(g1[0].art, 'ueberfaellig');
  assert.equal(g1[0].bis, null);
  assert.equal(b.istBelegt(g1, '2026-12-24'), true, 'überfällig bleibt belegt');
  const g2 = b.balkenFuer(data, 'g2', heute);
  assert.deepEqual(g2.map((x) => x.art), ['frueher', 'reserviert']);
  assert.equal(b.istBelegt(g2, '2026-10-05'), false, 'früherer Verleih sperrt nicht');
  const belegt = (tag) => b.istBelegt(g2, tag);
  assert.equal(b.begrenzen('2026-11-10', '2026-11-20', belegt), '2026-11-11');
  assert.equal(b.begrenzen('2026-11-12', '2026-11-20', belegt), null);
  assert.equal(b.ersterFreierTag('2026-11-12', belegt), '2026-11-15');
  assert.deepEqual(b.freieGeraete(data, '2026-11-10', '2026-11-11', heute).map((g) => g.id), ['g2']);
  assert.deepEqual(b.freieGeraete(data, '2026-11-10', '2026-11-12', heute).map((g) => g.id), []);
  const a = b.agenda(data, '2026-11-10', '2026-11-20', heute);
  assert.deepEqual(a.ueberfaellig.map((l) => l.id), ['l1']);
  assert.deepEqual(a.tage.map((x) => [x.tag, x.ereignisse.map((e) => e.art).join()]), [['2026-11-12', 'resvBeginn'], ['2026-11-14', 'resvEnde']]);
});

test('Auswertungen: Zeiträume, Navigation, Kennzahlen je Bereich, Vergleich', async () => {
  const a = await import('../src/core/auswertung.ts');
  const { normalizeTermin, neuerLeihvorgang, normalizeKunde: nk } = await import('../src/core/model.ts');
  // Zeiträume
  assert.deepEqual([a.zeitraum('woche', '2026-11-08').von, a.zeitraum('woche', '2026-11-08').bis], ['2026-11-02', '2026-11-08']);
  assert.deepEqual([a.zeitraum('monat', '2026-02-14').von, a.zeitraum('monat', '2026-02-14').bis], ['2026-02-01', '2026-02-28']);
  assert.deepEqual([a.zeitraum('jahr', '2026-07-01').von, a.zeitraum('jahr', '2026-07-01').bis], ['2026-01-01', '2026-12-31']);
  // 365 Tage enden am gewählten Tag, egal wo er liegt
  assert.deepEqual([a.zeitraum('365', '2026-03-15').von, a.zeitraum('365', '2026-03-15').bis], ['2025-03-16', '2026-03-15']);
  assert.equal(a.verschieben('monat', '2026-03-31', -1), '2026-02-28');
  assert.equal(a.verschieben('jahr', '2028-02-29', 1), '2029-02-28');
  assert.equal(a.verschieben('woche', '2026-11-08', 1), '2026-11-15');
  assert.equal(a.vorzeitraum('tag', '2026-01-01').von, '2025-12-31');

  const t = (s, h = 10) => new Date(`${s}T${String(h).padStart(2, '0')}:00`).toISOString();
  const data = emptyData();
  data.kunden = [
    nk({ id: 'k1', nachname: 'A', createdAt: t('2026-11-03'), status: { pv: 'abschluss' },
      enpalKontakte: [
        { zeitpunkt: t('2026-11-03', 9), art: 'telefon', erreicht: true, themen: ['pv'], ergebnis: 'abschluss' },
        { zeitpunkt: t('2026-11-04'), art: 'hausbesuch', erreicht: false, themen: ['pv', 'wp'], ergebnis: '' },
        { zeitpunkt: t('2026-10-20'), art: 'telefon', erreicht: true, themen: ['wp'], ergebnis: 'kein' },
      ],
      notizen: [{ zeitpunkt: t('2026-11-05'), text: 'x', sparten: ['pv'] }] }),
    nk({ id: 'k2', nachname: 'B', createdAt: t('2026-11-05'), status: { vorwerk: 'interesse' },
      gespraeche: [{ zeitpunkt: t('2026-11-05'), sparte: 'vorwerk', ausgang: 'test' }] }),
  ];
  data.termine = [
    normalizeTermin({ art: 'termin', sparte: 'pv', beginn: t('2026-11-06'), erledigt: true }),
    normalizeTermin({ art: 'termin', sparte: 'vorwerk', beginn: t('2026-11-06') }),
    normalizeTermin({ art: 'wiedervorlage', sparte: '', beginn: t('2026-11-07') }),
  ];
  data.leihvorgaenge = [
    neuerLeihvorgang({ geraetId: 'g', kundeId: 'k2', ausgabe: t('2026-11-05'), rueckgabe: t('2026-11-06'), kaufinteresse: 'gekauft' }),
    neuerLeihvorgang({ geraetId: 'g', kundeId: 'k2', ausgabe: t('2026-11-06') }),
  ];
  const alle = a.kennzahlen(data, 'alle', '2026-11-02', '2026-11-08', 'woche');
  assert.equal(alle.gespraeche, 3);
  assert.equal(alle.erreicht, 2);
  assert.equal(alle.abschluesse, 1);
  assert.equal(alle.abschlussquote, 0.5);
  assert.equal(alle.neueKunden, 2);
  assert.equal(alle.termine, 2); assert.equal(alle.termineErledigt, 1); assert.equal(alle.wiedervorlagen, 1);
  assert.equal(alle.verleihe, 2); assert.equal(alle.rueckgaben, 1); assert.equal(alle.kaeufe, 1); assert.equal(alle.kaufquote, 0.5);
  assert.equal(alle.verlauf.length, 7);
  assert.equal(alle.verlauf.reduce((s, x) => s + x.wert, 0), 3);
  const pv = a.kennzahlen(data, 'pv', '2026-11-02', '2026-11-08');
  assert.equal(pv.gespraeche, 2); assert.equal(pv.abschlussquote, 1); assert.equal(pv.neueKunden, 1); assert.equal(pv.notizen, 1); assert.equal(pv.termine, 1);
  assert.equal(pv.verleihe, 0); assert.equal(pv.kaufquote, null);
  const wp = a.kennzahlen(data, 'wp', '2026-11-02', '2026-11-08');
  assert.equal(wp.gespraeche, 1); assert.equal(wp.abschlussquote, null);
  const vw = a.kennzahlen(data, 'vorwerk', '2026-11-02', '2026-11-08');
  assert.equal(vw.gespraeche, 1); assert.equal(vw.ergebnisse.test, 1); assert.equal(vw.termine, 1); assert.equal(vw.verleihe, 2);
  // Vergleich mit Vorzeitraum
  const ber = a.bericht(data, 'wp', 'woche', '2026-10-26');
  assert.equal(ber.jetzt.gespraeche, 0); assert.equal(ber.vorher.gespraeche, 1);
  assert.deepEqual(a.veraenderung(ber.jetzt.gespraeche, ber.vorher.gespraeche), { text: '−1', richtung: 'ab' });
  assert.deepEqual(a.veraenderung(0.5, 0.25, true), { text: '+25 Pkt.', richtung: 'auf' });
  assert.equal(a.veraenderung(null, 1), null);
  // Jahr/365: Monatsverlauf, leere Daten stürzen nicht ab
  assert.equal(a.kennzahlen(emptyData(), 'alle', '2026-01-01', '2026-12-31', 'jahr').verlauf.length, 12);
  assert.equal(a.kennzahlen(emptyData(), 'alle', '2025-11-08', '2026-11-07', '365').verlauf.length, 13);
  assert.equal(a.kennzahlen(emptyData(), 'alle', '2026-11-07', '2026-11-07', 'tag').verlauf.length, 14);
});

test('Einstellungen: Nachbar-Umkreis nur in festen Stufen', () => {
  assert.equal(migrate({ ...emptyData(), einstellungen: { nachbarRadiusM: 1000 } }).einstellungen.nachbarRadiusM, 1000);
  assert.equal(migrate({ ...emptyData(), einstellungen: { nachbarRadiusM: 777 } }).einstellungen.nachbarRadiusM, 300);
  assert.equal(emptyData().einstellungen.nachbarRadiusM, 300);
});
