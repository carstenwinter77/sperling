// Unit-Tests für den DOM-freien Kern. Ausführen: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KeyRing, WrongPasswordError, InvalidEnvelopeError, validateEnvelope } from '../js/core/crypto.js';
import { migrate, emptyData, neuerKunde, neueNotiz, normalizeKunde, SCHEMA_VERSION, hauptStatus } from '../js/core/model.js';
import { generiereText, projizieren, notizErlaubt, ausgelasseneNotizen } from '../js/core/textgen.js';
import { erzeugeIcs, icsEscape, foldLine } from '../js/core/ics.js';
import { parseNumber, isoToLocalInput, localInputToIso, esc, distanceMeters } from '../js/core/util.js';

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

import { gespraechsNotiz, LEITFADEN, TECHNIKEN } from '../js/core/einwaende.js';
import { normalizeLeihvorgang, normalizeGeraet } from '../js/core/model.js';

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

import { normalizeGespraech, AUSGANG } from '../js/core/model.js';
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
import { telNummer, mailUrl } from '../js/ui/kontakt.js';
import { enpalDokuText, enpalVerlaufText } from '../js/core/textgen.js';

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
  assert.equal(d.schemaVersion, 2);
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
import { demoDaten, beispielEinfuegen, beispielEntfernen, beispielAnzahl, istBeispiel } from '../js/demo.js';

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
  const { beispielBestand, bestandEinfuegen, bestandEntfernen, bestandAnzahl } = await import('../js/demo.js');
  const { normalizeGeraet } = await import('../js/core/model.js');
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
