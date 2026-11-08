// Unit-Tests für den DOM-freien Kern. Ausführen: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KeyRing, WrongPasswordError, InvalidEnvelopeError, validateEnvelope } from '../src/core/crypto.ts';
import { migrate, emptyData, neuerKunde, neueNotiz, normalizeKunde, SCHEMA_VERSION, hauptStatus, kundenName, kundenTitel, kundenVergleich, anzeigeSetzen, normalizeEinstellungen } from '../src/core/model.ts';
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

test('Drei getrennte Texte: PV (Enpal) und WP (GALVANY) sehen nur sich selbst (R-TEXT)', () => {
  const t = generiereText(testKunde(), 'pv', emptyData().einstellungen);
  assert.match(t, /NOTIZ-PV/);
  assert.match(t, /Dachfläche: 50 m²/);
  assert.match(t, /^Kundenanfrage Photovoltaik/);
  for (const verboten of ['NOTIZ-WP', 'Öl', 'Wärmepumpe', 'NOTIZ-VW', 'NOTIZ-GEMISCHT', 'NOTIZ-OHNE', 'GEHEIM-VORWERK', 'Kobold', 'Vorwerk']) {
    assert.ok(!t.includes(verboten), `PV-Text enthält ${verboten}`);
  }
  const w = generiereText(testKunde(), 'wp', emptyData().einstellungen);
  assert.match(w, /NOTIZ-WP/);
  assert.match(w, /Öl/);
  for (const verboten of ['NOTIZ-PV', 'Dachfläche', 'Photovoltaik', 'NOTIZ-VW', 'Kobold', 'Vorwerk', 'NOTIZ-GEMISCHT']) {
    assert.ok(!w.includes(verboten), `WP-Text enthält ${verboten}`);
  }
  // Alte gemeinsame PV/WP-Notiz steht in beiden Texten, nie bei Vorwerk
  const k = testKunde();
  k.notizen.push(neueNotiz({ text: 'NOTIZ-ALT-ENPAL', sparten: ['pv', 'wp'] }));
  assert.ok(generiereText(k, 'pv', emptyData().einstellungen).includes('NOTIZ-ALT-ENPAL'));
  assert.ok(generiereText(k, 'wp', emptyData().einstellungen).includes('NOTIZ-ALT-ENPAL'));
  assert.ok(!generiereText(k, 'vorwerk', emptyData().einstellungen).includes('NOTIZ-ALT-ENPAL'));
  assert.equal(projizieren(k, 'wp').pv, undefined);
  assert.equal(projizieren(k, 'pv').wp, undefined);
  assert.equal(projizieren(k, 'wp').enpalKontakte, undefined, 'Enpal-Doku nur bei Photovoltaik');
});

test('Schema 7: frühere Enpal-Vorlage und -Empfänger gelten für PV und WP', () => {
  const eigen = 'Meine Enpal-Vorlage {{daten}}';
  const d = migrate({ schemaVersion: 6, einstellungen: { vorlagen: { enpal: eigen, vorwerk: 'V {{daten}}' }, empfaenger: { enpal: 'team@enpal.de', vorwerk: 'b@v.de' } } });
  assert.equal(d.einstellungen.vorlagen.pv, eigen);
  assert.equal(d.einstellungen.vorlagen.wp, eigen);
  assert.equal(d.einstellungen.vorlagen.vorwerk, 'V {{daten}}');
  assert.deepEqual(d.einstellungen.empfaenger, { pv: 'team@enpal.de', wp: 'team@enpal.de', vorwerk: 'b@v.de' });
  // Unveränderte alte Standardvorlage wird durch die neuen getrennten ersetzt
  const alt = migrate({ schemaVersion: 6, einstellungen: { vorlagen: { enpal: 'Kundenanfrage {{sparten}}\n\nKunde: {{name}}\nAdresse: {{adresse}}\nTelefon: {{telefon}}\nE-Mail: {{email}}\n\n{{daten}}\n\nGesprächsnotizen:\n{{notizen}}\n\nViele Grüße\n{{absender}}' } } });
  assert.match(alt.einstellungen.vorlagen.wp, /^Kundenanfrage Wärmepumpe/);
  assert.equal(d.einstellungen.kalenderStart, 'monat');
  assert.equal(migrate({ einstellungen: { kalenderStart: 'woche' } }).einstellungen.kalenderStart, 'woche');
  assert.equal(migrate({ einstellungen: { kalenderStart: 'quatsch' } }).einstellungen.kalenderStart, 'monat');
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
  assert.equal(notizErlaubt({ sparten: ['pv', 'wp'] }, 'pv'), true);
  assert.equal(notizErlaubt({ sparten: ['pv', 'wp'] }, 'wp'), true);
  assert.equal(notizErlaubt({ sparten: ['wp'] }, 'pv'), false);
  assert.equal(notizErlaubt({ sparten: ['pv', 'vorwerk'] }, 'pv'), false);
  assert.equal(notizErlaubt({ sparten: ['pv', 'wp'] }, 'vorwerk'), false);
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
  assert.deepEqual(d.einstellungen.empfaenger, { pv: '', wp: '', vorwerk: '' });
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
  assert.equal(beispielAnzahl(d), 54);
  assert.ok(d.termine.length > 1 && d.termine.filter((t) => t.id !== 'te').every((t) => istBeispiel(t.id) && istBeispiel(t.kundeId)));
  assert.ok(d.leihvorgaenge.every((l) => istBeispiel(l.geraetId) && istBeispiel(l.kundeId)));
  // doppelt laden ersetzt statt zu verdoppeln
  beispielEinfuegen(d, migrate(demoDaten()));
  assert.equal(beispielAnzahl(d), 54);
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

test('Papierkorb: Gelöschtes verfällt nie von selbst, nur Kaputtes fällt weg', () => {
  const alt = new Date(Date.now() - 31 * 864e5).toISOString();
  const neu = new Date(Date.now() - 2 * 864e5).toISOString();
  const d = migrate({ ...emptyData(), papierkorb: [
    { id: 'a', typ: 'termin', objekt: { id: 't1' }, geloeschtAm: alt },
    { id: 'b', typ: 'termin', objekt: { id: 't2' }, geloeschtAm: neu },
    { id: 'c', typ: 'quatsch', objekt: {}, geloeschtAm: neu },
  ] });
  assert.deepEqual(d.papierkorb.map((e) => e.id), ['a', 'b']);
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
  // gleitende Zeiträume: letzter Monat, 3 Monate, halbes Jahr
  assert.deepEqual([a.zeitraum('m1', '2026-11-07').von, a.zeitraum('m1', '2026-11-07').bis], ['2026-10-08', '2026-11-07']);
  assert.equal(a.zeitraum('m3', '2026-11-07').von, '2026-08-08');
  assert.equal(a.zeitraum('m6', '2026-11-07').von, '2026-05-08');
  assert.equal(a.zeitraum('m1', '2026-03-31').von, '2026-03-01', 'Monatsende gekappt');
  assert.equal(a.vorzeitraum('m3', '2026-11-07').bis, '2026-08-07', 'Vorzeitraum schließt direkt an');
  assert.equal(a.kennzahlen(emptyData(), 'alle', '2026-10-08', '2026-11-07', 'm1').verlauf.length, 31);
  assert.ok(a.kennzahlen(emptyData(), 'alle', '2026-08-08', '2026-11-07', 'm3').verlauf.every((v) => v.label.startsWith('KW')));
  assert.equal(a.kennzahlen(emptyData(), 'alle', '2026-05-08', '2026-11-07', 'm6').verlauf.length, 7);
  assert.equal(a.PERIODEN_REIHE.length, 9);
  assert.deepEqual([a.zeitraum("quartal", "2026-11-08").von, a.zeitraum("quartal", "2026-11-08").bis], ["2026-10-01", "2026-12-31"]);
  assert.equal(a.verschieben("quartal", "2026-11-08", -1), "2026-08-08");
  assert.equal(a.periodenLabel("quartal", a.zeitraum("quartal", "2026-02-01")), "Q1 26");
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
  for (const v of alle.verlauf) { const n = v.je.pv + v.je.wp + v.je.vorwerk + v.je.ohne; assert.ok(n >= v.wert && (v.wert > 0 || n === 0), 'Themen je Säule'); }
  assert.ok(alle.verlauf.some((v) => v.je.pv > 0), 'PV-Gespräch im Stapel');
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
  assert.deepEqual(a.veraenderung(ber.jetzt.gespraeche, ber.vorher.gespraeche), { text: '−1', richtung: 'ab', prozent: `−${Math.round(100 / ber.vorher.gespraeche)} %` });
  assert.deepEqual(a.veraenderung(0.5, 0.25, true), { text: '+25 Pkt.', richtung: 'auf', prozent: null });
  assert.deepEqual(a.veraenderung(5, 4), { text: '+1', richtung: 'auf', prozent: '+25 %' });
  assert.deepEqual(a.veraenderung(2, 0), { text: '+2', richtung: 'auf', prozent: 'neu' });
  assert.deepEqual(a.veraenderung(0, 0), { text: '±0', richtung: 'gleich', prozent: null });
  assert.deepEqual(a.veraenderung(3, 3), { text: '±0', richtung: 'gleich', prozent: '±0 %' });
  assert.deepEqual(a.veraenderung(0, 4), { text: '−4', richtung: 'ab', prozent: '−100 %' });
  assert.equal(a.veraenderungText(a.veraenderung(5, 4)), '+1 (+25 %)');
  assert.equal(a.veraenderungText(a.veraenderung(0.5, 0.25, true)), '+25 Pkt.');
  assert.equal(a.veraenderungText(null), '–');
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

test('Gespräch speichern: Notizen je Bereich getrennt (R-TEXT), Verlauf fasst zusammen', async () => {
  const g = await import('../src/core/gespraech.ts');
  const { kundenVerlauf } = await import('../src/core/verlauf.ts');
  const { notizErlaubt } = await import('../src/core/textgen.ts');
  const data = emptyData();
  data.kunden = [normalizeKunde({ id: 'k1', vorname: 'Eva', nachname: 'Test', status: { pv: 'interesse', vorwerk: 'interesse' } })];
  const e = {
    kundeId: 'k1', start: '2026-11-07T10:00:00.000Z', kontaktart: 'telefon', erreicht: true, sparten: ['pv', 'vorwerk'],
    notiz: { pv: 'Dach Süd, Speicher gewünscht', wp: '', vorwerk: 'Hund, Teppich' }, verlauf: g.leererVerlauf(), leitfadenSparte: 'pv',
  };
  e.verlauf.pv.preis = 'ueberzeugt';
  const jetzt = '2026-11-07T10:20:00.000Z';
  const gespeichert = g.speichern(data, e, [
    { sparte: 'pv', ausgang: 'termin', status: 'termin', schritt: 'Hausbesuch', wv: '2026-11-10T09:00:00.000Z' },
    { sparte: 'vorwerk', ausgang: 'test', status: '', schritt: '', wv: null },
  ], jetzt);
  assert.deepEqual(gespeichert, ['pv', 'vorwerk']);
  const k = data.kunden[0];
  assert.equal(k.notizen.length, 2);
  const enpalNotiz = k.notizen.find((n) => n.sparten.includes('pv'));
  const vwNotiz = k.notizen.find((n) => n.sparten.includes('vorwerk'));
  assert.ok(notizErlaubt(enpalNotiz, 'pv') && !notizErlaubt(enpalNotiz, 'wp') && !notizErlaubt(enpalNotiz, 'vorwerk'));
  assert.ok(notizErlaubt(vwNotiz, 'vorwerk') && !notizErlaubt(vwNotiz, 'pv'));
  assert.ok(!enpalNotiz.text.includes('Teppich') && !vwNotiz.text.includes('Speicher'));
  assert.equal(k.status.pv, 'termin');
  assert.equal(k.enpalKontakte.length, 1);
  assert.deepEqual(k.enpalKontakte[0].themen, ['pv']);
  assert.ok(!k.enpalKontakte[0].notiz.includes('Teppich'));
  assert.equal(data.termine.length, 1);
  assert.equal(k.gespraeche.length, 2);
  const v = kundenVerlauf(data, k, jetzt);
  const gesp = v.filter((x) => x.art === 'gespraech');
  assert.equal(gesp.length, 1, 'ein Gespräch, nicht drei Einträge');
  assert.equal(gesp[0].titel, 'Telefonische Kontaktaufnahme');
  assert.ok(gesp[0].zeilen.join('\n').includes('Dach Süd'));
  assert.ok(v.some((x) => x.art === 'termin' && x.zukunft));
  // nicht erreicht, ohne Notiz: Wärmepumpe (GALVANY) bekommt keinen Enpal-Doku-Eintrag
  const e2 = { ...e, erreicht: false, notiz: g.leereNotizen(), verlauf: g.leererVerlauf(), sparten: ['wp'] };
  g.speichern(data, e2, [{ sparte: 'wp', ausgang: '', status: '', schritt: '', wv: null }], '2026-11-08T10:00:00.000Z');
  assert.equal(k.gespraeche.length, 2);
  assert.equal(g.hatInhalt(e2), false);
  assert.equal(k.enpalKontakte.length, 1, 'Wärmepumpe läuft nicht über Enpal');
  // Photovoltaik nicht erreicht: Anrufversuch wird für Enpal dokumentiert
  g.speichern(data, { ...e2, sparten: ['pv'] }, [{ sparte: 'pv', ausgang: '', status: '', schritt: '', wv: null }], '2026-11-08T11:00:00.000Z');
  assert.equal(k.enpalKontakte.length, 2, 'Anrufversuch wird für Enpal dokumentiert');
  assert.equal(k.enpalKontakte[1].erreicht, false);
  const versuch = k.notizen.find((n) => n.text.startsWith('Telefonische Kontaktaufnahme (nicht erreicht)'));
  assert.deepEqual(versuch?.sparten, ['wp']);
});

test('Kartenfilter: Mehrfachauswahl, Rest ausgeblendet', async () => {
  const f = await import('../src/core/kartenfilter.ts');
  const k = (pv, wp, vorwerk) => ({ status: { pv, wp, vorwerk } });
  const a = k('abschluss', 'unbekannt', 'unbekannt');
  const b = k('unbekannt', 'interesse', 'termin');
  const c = k('kein_interesse', 'unbekannt', 'unbekannt');
  assert.ok([a, b, c].every((x) => f.passt(x, f.leererKartenFilter())));
  // PV + Vorwerk zeigen, WP ausschließen
  const pvVw = { sparten: ['pv', 'vorwerk'], status: [], kontakt: '' };
  assert.deepEqual([a, b, c].map((x) => f.passt(x, pvVw)), [true, true, false]);
  // nur bestimmte Status über alle Bereiche
  const st = { sparten: [], status: ['termin', 'interesse'], kontakt: '' };
  assert.deepEqual([a, b, c].map((x) => f.passt(x, st)), [false, true, false]);
  // Kombination: WP mit Interesse oder Termin
  assert.deepEqual([a, b, c].map((x) => f.passt(x, { sparten: ['wp'], status: ['termin'], kontakt: '' })), [false, false, false]);
  assert.equal(f.pinStatus(b, { sparten: ['wp'], status: [], kontakt: '' }), 'interesse');
  assert.equal(f.pinStatus(b, f.leererKartenFilter()), 'termin');
});

test('Letzter Kontakt: aus Verlauf oder von Hand, nichts aus der Zukunft; Kontakt-Filter', async () => {
  const v = await import('../src/core/verlauf.ts');
  const f = await import('../src/core/kartenfilter.ts');
  const { normalizeTermin, neuerLeihvorgang } = await import('../src/core/model.ts');
  const jetzt = '2026-11-07T12:00:00.000Z';
  const data = emptyData();
  const k = normalizeKunde({ id: 'k', notizen: [{ zeitpunkt: '2026-09-01T10:00:00.000Z', text: 'x' }] });
  data.kunden = [k];
  assert.equal(v.letzterKontakt(data, k, jetzt), '2026-09-01T10:00:00.000Z');
  data.termine = [
    normalizeTermin({ kundeId: 'k', beginn: '2026-10-01T10:00:00.000Z', erledigt: false }),
    normalizeTermin({ kundeId: 'k', beginn: '2026-12-01T10:00:00.000Z', erledigt: true }),
  ];
  assert.equal(v.letzterKontakt(data, k, jetzt), '2026-09-01T10:00:00.000Z', 'offene und künftige Termine zählen nicht');
  data.leihvorgaenge = [neuerLeihvorgang({ kundeId: 'k', geraetId: 'g', ausgabe: '2026-10-05T10:00:00.000Z' })];
  assert.equal(v.letzterKontakt(data, k, jetzt), '2026-10-05T10:00:00.000Z');
  k.letzterKontaktManuell = '2026-11-01T12:00:00.000Z';
  assert.equal(v.letzterKontakt(data, k, jetzt), '2026-11-01T12:00:00.000Z');
  assert.equal(normalizeKunde({ letzterKontaktManuell: 'quatsch' }).letzterKontaktManuell, null);
  assert.equal(v.letzterKontakt(data, normalizeKunde({ id: 'leer' }), jetzt), null);
  assert.equal(v.tageSeit('2026-11-01T12:00:00.000Z', new Date(jetzt)), 6);
  assert.equal(v.seitText(null), 'noch nie');
  assert.equal(v.seitText(0), 'heute');
  assert.equal(v.seitText(6), 'vor 6 Tagen');
  assert.equal(f.kontaktPasst(100, '90'), true);
  assert.equal(f.kontaktPasst(30, '90'), false);
  assert.equal(f.kontaktPasst(null, '90'), true, 'noch nie zählt als lange her');
  assert.equal(f.kontaktPasst(5, 'nie'), false);
  assert.equal(f.passt({ status: { pv: 'interesse', wp: 'unbekannt', vorwerk: 'unbekannt' } }, { sparten: ['pv'], status: [], kontakt: '90' }, 10), false);
});

test('Kundenansicht: Standard wie bisher, Auswahl wird übernommen', () => {
  const e = emptyData().einstellungen.kundenansicht;
  assert.equal(e.notizen, false); assert.equal(e.bemerkungen, false); assert.equal(e.pv, true); assert.equal(e.geraete, true);
  const m = migrate({ ...emptyData(), einstellungen: { kundenansicht: { notizen: true, pv: false, quatsch: true } } }).einstellungen.kundenansicht;
  assert.equal(m.notizen, true); assert.equal(m.pv, false); assert.equal(m.wp, true); assert.equal('quatsch' in m, false);
});

test('Kommandozeile: Normalisierung, Bewertung, Gruppen, Verben, Zuletzt', async () => {
  const s = await import('../src/core/suche.ts');
  const { normalizeGeraet, neuerLeihvorgang, normalizeTermin } = await import('../src/core/model.ts');
  assert.equal(s.suchText('Müller-Lüdenscheidt, Straße'), 'mueller luedenscheidt strasse');
  assert.equal(s.suchText('René E-Mail'), 'rene email');
  assert.equal(s.ziffern('0171 / 23-45'), '0171 2345'.replace(' ', ''));

  const e = { text: 'anna mueller hauptstrasse', titelN: 'anna mueller' };
  assert.equal(s.punkte(e, ['mueller'], 'mueller'), 3);
  assert.equal(s.punkte(e, ['muel'], 'muel'), 2);
  assert.equal(s.punkte(e, ['ller'], 'ller'), 1);
  assert.equal(s.punkte(e, ['mueller', 'xyz'], 'mueller xyz'), 0, 'jedes Wort muss vorkommen');
  assert.equal(s.punkte(e, ['anna', 'mueller'], 'anna mueller'), 12, 'Titel exakt +6');
  assert.equal(s.punkte(e, ['anna'], 'anna'), 7, 'Titel beginnt mit Eingabe +4');

  const data = emptyData();
  const a = normalizeKunde({ id: 'a', vorname: 'Anna', nachname: 'Müller', ort: 'Bremen', telefon: '0421 123456', email: 'anna@example.org', status: { pv: 'interesse' } });
  const b = normalizeKunde({ id: 'b', vorname: 'Bernd', nachname: 'Müllermann' });
  a.notizen.push(neueNotiz({ text: 'Dach ist nach Süden ausgerichtet, Speicher gewünscht' }));
  data.kunden = [a, b];
  data.termine = [normalizeTermin({ kundeId: 'a', titel: 'Beratung Dach', beginn: '2026-11-10T10:00:00.000Z' })];
  data.geraete = [normalizeGeraet({ id: 'g', name: 'Kobold VK7', aktiv: true })];
  const idx = s.index(data);

  let r = s.suchen(idx, 'müller');
  assert.equal(r.gruppen[0].art, 'kunde');
  assert.deepEqual(r.gruppen[0].treffer.map((t) => t.id), ['a', 'b'], 'exaktes Wort vor Wortanfang');
  assert.equal(s.suchen(idx, '421123').gruppen[0].treffer[0].id, 'a', 'Telefonnummer ohne Leerzeichen');
  assert.equal(s.suchen(idx, 'photovoltaik').gruppen.find((g) => g.art === 'kunde').treffer[0].id, 'a');
  assert.ok(s.suchen(idx, 'speicher').gruppen.some((g) => g.art === 'notiz'));
  assert.ok(s.suchen(idx, 'dach').gruppen.some((g) => g.art === 'termin'));
  assert.ok(s.suchen(idx, 'zu teuer').gruppen.some((g) => g.art === 'einwand'));
  assert.equal(s.suchen(idx, 'neuer kunde').gruppen[0].treffer[0].befehl, 'neuerKunde');
  assert.deepEqual(s.suchen(idx, '   ').gruppen, []);

  // Aktionen nur, wenn möglich
  assert.deepEqual(s.kundenAktionen(a).slice(0, 3), ['anrufen', 'email', 'hinfahren']);
  assert.equal(s.kundenAktionen(b).includes('anrufen'), false);

  // Verb-Erkennung
  assert.deepEqual(s.verbErkennen('Müller anrufen'), { aktion: 'anrufen', rest: 'mueller' });
  r = s.suchen(idx, 'anna anrufen');
  assert.equal(r.vorschlag.aktion, 'anrufen'); assert.equal(r.vorschlag.ziel.id, 'a');
  assert.equal(s.suchen(idx, 'bernd anrufen').vorschlag, null, 'ohne Telefon kein Anruf-Vorschlag');
  assert.equal(s.suchen(idx, 'kobold verleihen').vorschlag.ziel.id, 'g');
  data.leihvorgaenge = [neuerLeihvorgang({ kundeId: 'a', geraetId: 'g' })];
  const g = s.index(data).find((x) => x.art === 'geraet');
  assert.deepEqual(g.aktionen, ['zuruecknehmen', 'reservieren']);
  assert.match(g.unter, /Anna Müller/);

  // Zuletzt
  let z = [];
  for (let i = 0; i < 10; i++) z = s.zuletztHinzu(z, { art: 'kunde', id: `k${i}` });
  assert.equal(z.length, 8); assert.equal(z[0].id, 'k9');
  z = s.zuletztHinzu(z, { art: 'kunde', id: 'k5' });
  assert.equal(z[0].id, 'k5'); assert.equal(z.filter((x) => x.id === 'k5').length, 1);
  assert.deepEqual(s.zuletztAufloesen(data, [{ art: 'kunde', id: 'weg' }, { art: 'kunde', id: 'a' }, { art: 'geraet', id: 'g' }]).map((x) => x.titel), ['Anna Müller', 'Kobold VK7']);
  assert.deepEqual(migrate({ ...emptyData(), einstellungen: { zuletzt: [{ art: 'kunde', id: 'a' }, { art: 'x', id: 'b' }, 'quatsch'] } }).einstellungen.zuletzt, [{ art: 'kunde', id: 'a' }]);
  assert.match(s.ausschnitt('x '.repeat(80) + 'Speicher gewünscht ' + 'y '.repeat(80), 'speicher'), /Speicher/);
});

test('Installationshilfe: Gerät/Browser erkennen, passender Weg zuerst', async () => {
  const i = await import('../src/core/installieren.ts');
  const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
  assert.deepEqual(i.erkennen(ipad, 5), { geraet: 'ipad', browser: 'safari' });
  assert.deepEqual(i.erkennen(ipad, 0), { geraet: 'mac', browser: 'safari' });
  assert.deepEqual(i.erkennen('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130.0 Mobile/15E148 Safari/604.1'), { geraet: 'iphone', browser: 'chrome' });
  assert.deepEqual(i.erkennen('Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Safari/537.36'), { geraet: 'android', browser: 'samsung' });
  assert.deepEqual(i.erkennen('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0'), { geraet: 'windows', browser: 'edge' });
  assert.equal(i.wegeFuer('ipad', 'safari')[0].id, 'ios-safari');
  assert.equal(i.wegeFuer('iphone', 'chrome')[0].id, 'ios-andere');
  assert.equal(i.wegeFuer('android', 'samsung')[0].id, 'android-samsung');
  assert.equal(i.wegeFuer('mac', 'safari')[0].id, 'mac-safari');
  assert.equal(i.wegeFuer('linux', 'firefox')[0].id, 'desktop-firefox');
  for (const g of ['iphone', 'ipad', 'android', 'windows', 'mac', 'linux']) assert.ok(i.wegeFuer(g, 'andere').length >= 2, g);
});

test('Hilfe: Themen vollständig, Suche findet Anleitungen, Begriffe und Fragen', async () => {
  const h = await import('../src/core/hilfe.ts');
  for (const [id, t] of Object.entries(h.THEMEN)) { assert.ok(t.titel && t.kurz, id); }
  assert.equal(h.hilfeSuchen('').length, 0);
  assert.equal(h.hilfeSuchen('sicherung')[0].id, 'sicherung');
  assert.equal(h.hilfeSuchen('karte')[0].id, 'karte');
  assert.ok(h.hilfeSuchen('wiedervorlage').some((x) => x.art === 'begriff'));
  assert.ok(h.hilfeSuchen('passwort vergessen').some((x) => x.art === 'frage'));
  assert.ok(h.hilfeSuchen('Einwände').length > 0, 'Umlaute');
});

test('Dropbox entfernt: alte Zugangsdaten werden beim Laden verworfen', () => {
  const d = migrate({ einstellungen: { absender: 'X', dropbox: { appKey: 'k', refreshToken: 'geheim', pfad: '/a.sperling' } } });
  assert.equal('dropbox' in d.einstellungen, false);
  assert.equal(d.einstellungen.absender, 'X');
  assert.equal(JSON.stringify(d).includes('geheim'), false);
});

test('Feldverwaltung: eigene Felder normalisieren, ausblenden, Werte behalten', async () => {
  const f = await import('../src/core/felder.ts');
  const fe = f.normalizeFeldEinstellungen({
    aus: ['pv.neigung', 'kontakt.firma', 'kaputt', 5],
    eigene: [
      { id: 'hund', kategorie: 'vorwerk', label: ' Hund ', typ: 'bool' },
      { id: 'dach', kategorie: 'pv', label: 'Dachfenster', typ: 'select', optionen: ['keine', 'eins', 'eins', ''] },
      { id: 'flaeche', kategorie: 'pv', label: 'Carport', typ: 'number', einheit: 'm²' },
      { id: 'geb', kategorie: 'kontakt', label: 'Geburtstag', typ: 'date' },
      { kategorie: 'xx', label: '' }, // ohne Bezeichnung: verworfen
      { id: 'hund', label: 'Doppelt', typ: 'text' }, // doppelte ID: verworfen
    ],
  });
  assert.deepEqual(fe.aus, ['pv.neigung', 'kontakt.firma']);
  assert.equal(fe.eigene.length, 4);
  assert.equal(fe.eigene[0].label, 'Hund');
  assert.deepEqual(fe.eigene[1].optionen, ['keine', 'eins']);
  assert.equal(fe.eigene[3].kategorie, 'kontakt');
  // Sichtbare Felder: eingebaute ohne ausgeblendete, dann eigene
  const pv = f.sichtbareFelder('pv', fe).map((x) => x.pfad);
  assert.ok(!pv.includes('pv.neigung') && pv.includes('pv.dachflaeche'));
  assert.deepEqual(pv.slice(-2), ['eigene.dach', 'eigene.flaeche']);
  assert.ok(f.alleFelder('pv', fe).some((x) => x.pfad === 'pv.neigung'), 'ausgeblendet bleibt in der Verwaltung');
  assert.ok(!f.sichtbareFelder('kontakt', fe).some((x) => x.pfad === 'kontakt.firma'));
  // Werte bleiben am Kunden, auch wenn ausgeblendet; Unsinn wird verworfen
  const d = migrate({ einstellungen: { felder: fe }, kunden: [{ id: 'k', firma: 'Bleibt', pv: { neigung: 30 }, eigene: { hund: true, dach: 'eins', flaeche: 12.5, geb: '1980-05-17', boese: { x: 1 }, 'a b': 'x' } }] });
  const k = d.kunden[0];
  assert.equal(k.firma, 'Bleibt');
  assert.equal(k.pv.neigung, 30);
  assert.deepEqual(k.eigene, { hund: true, dach: 'eins', flaeche: 12.5, geb: '1980-05-17' });
  assert.equal(d.einstellungen.felder.eigene.length, 4);
  // Anzeige je Typ
  const def = (id) => f.alleFelder(fe.eigene.find((x) => x.id === id).kategorie, fe).find((x) => x.pfad === `eigene.${id}`);
  assert.equal(f.feldText(def('hund'), true), 'ja');
  assert.equal(f.feldText(def('flaeche'), 12.5), '12,5 m²');
  assert.equal(f.feldText(def('geb'), '1980-05-17'), '17.05.1980');
  assert.equal(f.feldText(def('geb'), 'gestern'), null);
  assert.equal(f.feldText(def('dach'), 'drei'), null);
  // Filter: Ja/Nein und Auswahllisten
  const { passt, leererKartenFilter } = await import('../src/core/kartenfilter.ts');
  assert.deepEqual(f.filterbareFelder(fe).map((x) => x.id), ['hund', 'dach']);
  const filt = { ...leererKartenFilter(), eigen: { hund: ['ja'] } };
  assert.equal(passt(k, filt, null, fe), true);
  assert.equal(passt({ ...k, eigene: {} }, filt, null, fe), false);
  assert.equal(passt({ ...k, eigene: {} }, { ...filt, eigen: { hund: [''] } }, null, fe), true, 'ohne Angabe');
  // Ausgeblendetes eigenes Feld ist nicht filterbar
  assert.deepEqual(f.filterbareFelder({ ...fe, aus: ['eigene.hund'] }).map((x) => x.id), ['dach']);
});

test('Feldverwaltung und Texte: eigene Felder nur im Text ihres Bereichs (R-TEXT)', () => {
  const einst = migrate({ einstellungen: { felder: { aus: ['pv.dachflaeche'], eigene: [
    { id: 'hund', kategorie: 'vorwerk', label: 'Hund', typ: 'bool' },
    { id: 'carport', kategorie: 'pv', label: 'Carport', typ: 'number', einheit: 'm²' },
    { id: 'beruf', kategorie: 'kontakt', label: 'Beruf', typ: 'text' },
  ] } } }).einstellungen;
  const k = normalizeKunde({ vorname: 'A', pv: { dachflaeche: 60, neigung: 30 }, status: { pv: 'interesse', vorwerk: 'interesse' }, eigene: { hund: true, carport: 20, beruf: 'Lehrerin' } });
  const enpal = generiereText(k, 'pv', einst);
  const vorwerk = generiereText(k, 'vorwerk', einst);
  assert.ok(enpal.includes('Carport: 20 m²'));
  assert.ok(enpal.includes('Beruf: Lehrerin'));
  assert.ok(!enpal.includes('Hund'));
  assert.ok(!enpal.includes('Nutzbare Dachfläche'), 'ausgeblendetes Feld nicht im Text');
  assert.ok(enpal.includes('Dachneigung: 30'));
  assert.ok(vorwerk.includes('Hund: ja'));
  assert.ok(!vorwerk.includes('Carport'));
  assert.equal(projizieren(k, 'vorwerk', einst.felder).eigene.carport, undefined);
  assert.deepEqual(projizieren(k, 'pv').eigene, {}, 'ohne Felddefinition keine eigenen Werte');
});

test('Produktkatalog: Datei prüft sauber, Unsinn wird übersprungen', async () => {
  const pr = await import('../src/core/produkte.ts');
  const roh = JSON.parse((await import('node:fs')).readFileSync(new URL('../src/data/produkte.json', import.meta.url), 'utf8'));
  const kat = pr.katalogPruefen(roh);
  assert.equal(kat.uebersprungen, 0, 'alle Katalogeinträge gültig');
  assert.ok(kat.produkte.length >= 40);
  assert.equal(new Set(kat.produkte.map((p) => p.id)).size, kat.produkte.length, 'IDs eindeutig');
  for (const p of kat.produkte) {
    assert.ok(p.stand && p.quelleUrl?.startsWith('https://'), p.id);
    assert.ok(!p.bildUrl || p.bildUrl.startsWith('https://'), p.id);
  }
  for (const b of ['pv', 'wp', 'vorwerk']) assert.ok(pr.produkteFuer(kat, b).length > 0, b);
  assert.ok(kat.produkte.some((p) => p.quelle === 'galvany' && p.bereich === 'wp'));
  assert.ok(kat.produkte.some((p) => p.demnaechst), 'bald verfügbar');
  // Komplettpakete erscheinen zusätzlich unter WP
  const zus = kat.produkte.find((p) => p.bereiche.length > 1);
  assert.ok(zus && pr.produkteFuer(kat, zus.bereiche[1]).includes(zus));
  assert.ok(pr.produktSuchen(kat.produkte, 'wärmepumpe').length > 0);
  // Ungültiges wird verworfen, gefährliche URLs entfernt
  const k2 = pr.katalogPruefen({ produkte: [
    { id: 'ok', name: 'OK', bereich: 'pv', kategorie: 'speicher', quelleUrl: 'javascript:alert(1)', bildUrl: 'http://x/y.png', passtZu: ['gibtsnicht', 'ok'] },
    { id: 'ok', name: 'doppelt', bereich: 'pv', kategorie: 'speicher' },
    { id: 'x', name: 'falscher Bereich', bereich: 'auto', kategorie: 'speicher' },
    { id: 'y', name: 'falsche Kategorie', bereich: 'pv', kategorie: 'rakete' },
    null,
  ] });
  assert.equal(k2.produkte.length, 1);
  assert.equal(k2.uebersprungen, 4);
  assert.equal(k2.produkte[0].quelleUrl, null);
  assert.equal(k2.produkte[0].bildUrl, null);
  assert.deepEqual(k2.produkte[0].passtZu, []);
  assert.equal(pr.preisText({ preis: { modell: 'kauf', betragEuro: 1299, einheit: 'einmalig', text: null } }), '1.299 €');
  assert.equal(pr.preisText({ preis: { modell: 'tarif', betragEuro: 99, einheit: 'pro Monat', text: null } }), '99 € pro Monat');
  assert.equal(pr.preisText({ preis: null }), '');
});

test('Produkte im Gespräch: markieren, umentscheiden, aufheben, Verlauf, Texte (R-TEXT), Filter, Auswertung', async () => {
  const pr = await import('../src/core/produkte.ts');
  const { kundenVerlauf } = await import('../src/core/verlauf.ts');
  const { passt, leererKartenFilter } = await import('../src/core/kartenfilter.ts');
  const { kennzahlen } = await import('../src/core/auswertung.ts');
  const k = normalizeKunde({ id: 'k', vorname: 'A', status: { pv: 'interesse' } });
  const speicher = { id: 'enpal-speicher', name: 'Enpal Speicher', bereich: 'pv' };
  const vk7 = { id: 'vorwerk-vk7', name: 'Kobold VK7', bereich: 'vorwerk' };
  pr.markierungSetzen(k.produkte, speicher, 'spaeter', '2026-11-01T10:00:00.000Z');
  pr.markierungSetzen(k.produkte, speicher, 'interesse', '2026-11-01T10:05:00.000Z');
  pr.markierungSetzen(k.produkte, vk7, 'vorhanden', '2026-11-01T10:06:00.000Z');
  let akt = pr.aktuelleMarkierungen(k.produkte);
  assert.equal(akt.get('enpal-speicher').markierung, 'interesse');
  // gleiche Markierung erneut = aufheben
  pr.markierungSetzen(k.produkte, vk7, 'vorhanden', '2026-11-01T10:07:00.000Z');
  akt = pr.aktuelleMarkierungen(k.produkte);
  assert.equal(akt.has('vorwerk-vk7'), false);
  pr.markierungSetzen(k.produkte, vk7, 'kein', '2026-11-01T10:08:00.000Z');
  // Laden/Speichern übersteht die Markierungen, Unsinn fällt weg
  const d = migrate({ kunden: [{ ...k, produkte: [...k.produkte, { produktId: '', bereich: 'pv' }, { produktId: 'x', bereich: 'mond' }] }] });
  const k2 = d.kunden[0];
  assert.equal(k2.produkte.length, 5);
  assert.equal(pr.markierungenText(k2.produkte, 'pv'), 'Interesse: Enpal Speicher');
  // Verlauf: ein Eintrag pro Tag, letzter Stand je Produkt
  const v = kundenVerlauf(d, k2).filter((e) => e.art === 'produkt');
  assert.equal(v.length, 1);
  assert.ok(v[0].zeilen.includes('Enpal Speicher: Interesse') && v[0].zeilen.includes('Kobold VK7: Kein Interesse'));
  assert.ok(!v[0].zeilen.some((z) => z.includes('Später')));
  // Texte: Vorwerk-Produkte nie im Enpal-Text und umgekehrt
  const enpal = generiereText(k2, 'pv', d.einstellungen);
  const vorwerk = generiereText(k2, 'vorwerk', d.einstellungen);
  assert.ok(enpal.includes('Produkte – Interesse: Enpal Speicher'));
  assert.ok(!enpal.includes('Kobold'));
  assert.ok(vorwerk.includes('Kein Interesse: Kobold VK7'));
  assert.ok(!vorwerk.includes('Enpal Speicher'));
  assert.equal(projizieren(k2, 'vorwerk').produkte.length, 3);
  assert.ok(projizieren(k2, 'vorwerk').produkte.every((m) => m.bereich === 'vorwerk'));
  // Filter
  assert.equal(passt(k2, { ...leererKartenFilter(), produkt: ['interesse'] }), true);
  assert.equal(passt(k2, { ...leererKartenFilter(), produkt: ['interesse'], sparten: ['vorwerk'] }), false);
  assert.equal(passt(k2, { ...leererKartenFilter(), produkt: ['kein'], sparten: ['vorwerk'] }), true);
  // Auswertung: letzter Stand im Zeitraum
  const kz = kennzahlen(d, 'alle', '2026-11-01', '2026-11-01', 'tag');
  assert.equal(kz.produkte.interesse, 1);
  assert.equal(kz.produkte.kein, 1);
  assert.equal(kz.produkte.spaeter, 0);
  assert.deepEqual(kz.topProdukte, [{ name: 'Enpal Speicher', anzahl: 1 }]);
  assert.equal(kennzahlen(d, 'vorwerk', '2026-11-01', '2026-11-01', 'tag').produkte.interesse, 0);
});

import * as bs from '../src/core/bausteine.ts';
test('Textbausteine: Startliste, Normalisierung, Anhängen', () => {
  // Ältere Daten ohne bausteine bekommen die Startliste
  const d = migrate({ schemaVersion: 5, kunden: [], einstellungen: {} });
  assert.deepEqual(d.einstellungen.bausteine.pv, bs.STANDARD_BAUSTEINE.pv);
  assert.ok(d.einstellungen.bausteine.vorwerk.length > 5);
  // Bewusst geleerte Liste bleibt leer, Unsinn wird bereinigt
  const n = bs.normalizeBausteine({ pv: [], wp: ['  A  ', 'A', '', 5, null, 'B   C'], vorwerk: 'kaputt' });
  assert.deepEqual(n.pv, []);
  assert.deepEqual(n.wp, ['A', 'B C']);
  assert.deepEqual(n.vorwerk, bs.STANDARD_BAUSTEINE.vorwerk);
  assert.equal(bs.bausteinListe(Array.from({ length: 200 }, (_, i) => `x${i}`)).length, bs.MAX_BAUSTEINE);
  assert.equal(bs.bausteinListe(['y'.repeat(999)])[0].length, bs.MAX_BAUSTEIN_LAENGE);
  // Anhängen: jede Bausteinzeile eigene Zeile
  assert.equal(bs.bausteinAnhaengen('', 'Speicher gewünscht'), 'Speicher gewünscht');
  assert.deepEqual(bs.verschieben(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
  assert.deepEqual(bs.verschieben(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(bs.verschieben(['a', 'b'], 5, 0), ['a', 'b']);
  assert.equal(bs.bausteinAnhaengen('Hallo', 'B'), 'Hallo\nB');
  assert.equal(bs.bausteinAnhaengen('Hallo\n', 'B'), 'Hallo\nB');
  assert.equal(bs.bausteinAnhaengen('Hallo  ', 'B'), 'Hallo\nB');
  assert.equal(bs.bausteinAnhaengen('Hallo', '   '), 'Hallo');
  // Verschlüsselte Einstellungen überleben den Rundweg
  const d2 = migrate(JSON.parse(JSON.stringify({ ...d, einstellungen: { ...d.einstellungen, bausteine: n } })));
  assert.deepEqual(d2.einstellungen.bausteine.wp, ['A', 'B C']);
});

import * as kal from '../src/core/kalender.ts';
test('Kalender: Leihgaben je Tag, Termine ziehen und verschieben', () => {
  const d = migrate({
    kunden: [{ id: 'k1', nachname: 'Leih' }],
    geraete: [{ id: 'g1', name: 'Kobold VK7' }, { id: 'g2', name: 'Kobold VR7' }],
    leihvorgaenge: [
      { id: 'l1', geraetId: 'g1', kundeId: 'k1', ausgabe: '2026-11-02T10:00:00', rueckgabeGeplant: '2026-11-09T10:00:00' },
      { id: 'l2', geraetId: 'g2', kundeId: 'k1', ausgabe: '2026-10-20T10:00:00', rueckgabeGeplant: '2026-11-01T10:00:00' },
    ],
    reservierungen: [{ id: 'r1', geraetId: 'g2', kundeId: '', von: '2026-11-12T00:00:00', bis: '2026-11-14T00:00:00' }],
  });
  const m = kal.geraeteEintraege(d, '2026-11-01', '2026-11-30', '2026-11-07');
  assert.deepEqual(m.get('2026-11-02').map((e) => e.art), ['ausgabe']);
  assert.equal(m.get('2026-11-02')[0].kunde, 'Leih');
  assert.deepEqual(m.get('2026-11-09').map((e) => e.art), ['zurueckErwartet']);
  assert.deepEqual(m.get('2026-11-07').map((e) => [e.art, e.geraet]), [['ueberfaellig', 'Kobold VR7']]);
  assert.ok(m.get('2026-11-12')[0].reservierung && m.get('2026-11-14')[0].art === 'resvEnde');
  // Heute außerhalb: keine Überfällig-Einträge
  assert.equal(kal.geraeteEintraege(d, '2026-12-01', '2026-12-31', '2026-11-07').size, 0);
  // Ziehen im 15-Minuten-Raster
  const b = new Date(2026, 10, 10, 10, 0).toISOString();
  const lokal = (iso) => { const x = new Date(iso); return `${x.getDate()}. ${x.getHours()}:${String(x.getMinutes()).padStart(2, '0')}`; };
  let r = kal.gezogen(b, 60, 'schieben', 52, 1);
  assert.equal(lokal(r.beginn), '11. 10:45');
  assert.equal(r.dauerMin, 60);
  r = kal.gezogen(b, 60, 'unten', 31);
  assert.equal(r.dauerMin, 90);
  assert.equal(r.beginn, b);
  r = kal.gezogen(b, 60, 'oben', -30);
  assert.equal(lokal(r.beginn), '10. 9:30');
  assert.equal(r.dauerMin, 90);
  r = kal.gezogen(b, 60, 'oben', 200);
  assert.equal(r.dauerMin, kal.MIN_DAUER);
  assert.equal(lokal(r.beginn), '10. 10:45');
  assert.equal(kal.gezogen(b, 60, 'unten', -500).dauerMin, kal.MIN_DAUER);
  assert.equal(kal.gezogen('kaputt', 60, 'schieben', 30).beginn, 'kaputt');
  // Monat: auf anderen Tag, Uhrzeit bleibt
  assert.equal(lokal(kal.aufTag(b, '2026-11-20')), '20. 10:00');
  assert.equal(kal.aufTag(b, 'quatsch'), b);
});

test('Einstellungsdatei: ohne Kunden und „zuletzt“, verschlüsselt übertragbar, alte Dateien werden angehoben', async () => {
  const ed = await import('../src/core/einstellungsdatei.ts');
  const d = migrate({ einstellungen: { absender: 'Außendienst', kalenderStart: 'woche', kartenApp: 'waze', bausteine: { pv: ['A'], wp: [], vorwerk: ['V'] }, zuletzt: [{ art: 'kunde', id: 'k1' }] } });
  d.kunden.push(neuerKunde({ nachname: 'GEHEIM-KUNDE' }));
  const paket = ed.einstellungenPaket(d.einstellungen, { farbschema: 'dunkel', mailprogramm: 'gmail' }, '2026-11-07T10:00:00.000Z');
  const json = JSON.stringify(paket);
  assert.ok(!json.includes('GEHEIM-KUNDE'));
  assert.equal(paket.einstellungen.zuletzt, undefined);
  // verschlüsselt hin und zurück
  const kr = new KeyRing('passwort123', 100000);
  const env = await kr.encrypt(paket, { updatedAt: paket.erstellt, deviceId: 'einstellungen' });
  const zurueck = await new KeyRing('passwort123', 100000).decrypt(env);
  const ziel = migrate({ einstellungen: { zuletzt: [{ art: 'kunde', id: 'hier' }] } });
  const neu = ed.einstellungenAusPaket(zurueck, ziel.einstellungen);
  assert.equal(neu.absender, 'Außendienst');
  assert.equal(neu.kalenderStart, 'woche');
  assert.equal(neu.kartenApp, 'waze');
  assert.deepEqual(neu.bausteine, { pv: ['A'], wp: [], vorwerk: ['V'] });
  assert.deepEqual(neu.zuletzt, ziel.einstellungen.zuletzt, '„zuletzt“ bleibt vom Gerät');
  assert.deepEqual(ed.geraeteWahl(zurueck, { farbschema: ['auto', 'hell', 'dunkel'], mailprogramm: ['standard', 'gmail'] }), { farbschema: 'dunkel', mailprogramm: 'gmail' });
  assert.deepEqual(ed.geraeteWahl({ ...zurueck, geraet: { farbschema: '<b>', mailprogramm: 1 } }, { farbschema: ['auto'], mailprogramm: ['gmail'] }), { farbschema: undefined, mailprogramm: undefined });
  // Ältere Datei (Schema 6, eine Enpal-Vorlage) wird angehoben
  const alt = ed.einstellungenAusPaket({ art: 'sperling-einstellungen', einstellungen: { vorlagen: { enpal: 'E {{daten}}' }, empfaenger: { enpal: 'x@y.de' } } }, ziel.einstellungen);
  assert.equal(alt.vorlagen.wp, 'E {{daten}}');
  assert.equal(alt.empfaenger.pv, 'x@y.de');
  // Fremdes wird abgelehnt
  assert.throws(() => ed.einstellungenAusPaket(emptyData(), ziel.einstellungen), /keine Sperling-Einstellungsdatei/);
  assert.throws(() => ed.einstellungenAusPaket(null, ziel.einstellungen));
  assert.equal(ed.istEinstellungsPaket(emptyData()), false);
});

test('Klemmbrett: Abschnitte je Bereich, Felder aus der Kartei, eindeutige IDs, keine Druck-Formulierungen', async () => {
  const kb = await import('../src/core/klemmbrett.ts');
  const { FELDER } = await import('../src/core/model.ts');
  for (const s of ['pv', 'wp', 'vorwerk']) {
    const abs = kb.abschnitte(s);
    assert.deepEqual(abs.map((a) => a.id), ['situation', 'bedarf', 'schritt']);
    const punkte = abs.flatMap((a) => a.punkte);
    const ids = punkte.map((p) => kb.punktId(s, p));
    assert.equal(new Set(ids).size, ids.length, `doppelte Punkte in ${s}`);
    for (const p of punkte) if (p.art === 'feld') assert.ok(FELDER[s].some((f) => f.key === p.key), `${s}.${p.key} gibt es nicht in der Kartei`);
    assert.ok(punkte.some((p) => p.art === 'antwort' && p.id === 'widerruf'), `Widerruf fehlt in ${s}`);
    assert.ok(punkte.every((p) => p.frage.length > 5));
  }
  const text = ['pv', 'wp', 'vorwerk'].flatMap((s) => kb.KLEMMBRETT[s].flatMap((a) => a.punkte.map((p) => p.frage))).join(' ') + Object.values(kb.IMPULS).join(' ');
  assert.doesNotMatch(text, /nur heute|sofort unterschreiben|letzte Chance|€|Prozent/i);
  // Ausgeblendete Kartei-Felder erscheinen nicht auf dem Klemmbrett
  const ohne = kb.abschnitte('pv', { aus: ['pv.stromverbrauch'], eigene: [] }).flatMap((a) => a.punkte);
  assert.ok(!ohne.some((p) => p.art === 'feld' && p.key === 'stromverbrauch'));
});

test('Klemmbrett: erledigt, Stand, Optionen, Freitext, Notiztext je Bereich (R-TEXT)', async () => {
  const kb = await import('../src/core/klemmbrett.ts');
  const k = normalizeKunde({ id: 'k1', nachname: 'Test', pv: { stromverbrauch: 4500, eauto: false } });
  const a = kb.leereAntworten();
  const vorher = kb.stand('pv', k, a);
  assert.ok(vorher.erledigt >= 2, 'Kartei-Felder mit Wert (auch „nein“) zählen als erledigt');
  assert.ok(vorher.offen.includes('Dachausrichtung'));
  // Einzelwahl ersetzt, Freitext bleibt; Mehrfachwahl ergänzt
  let w = kb.optionUmschalten('', 'Partner fehlt', ['Beide dabei', 'Partner fehlt', 'Allein']);
  assert.equal(w, 'Partner fehlt');
  w = kb.mitFreitext(w, ['Beide dabei', 'Partner fehlt', 'Allein'], 'kommt Freitag');
  assert.equal(w, 'Partner fehlt, kommt Freitag');
  w = kb.optionUmschalten(w, 'Beide dabei', ['Beide dabei', 'Partner fehlt', 'Allein']);
  assert.equal(w, 'Beide dabei, kommt Freitag');
  assert.equal(kb.freiAnteil(w, ['Beide dabei', 'Partner fehlt', 'Allein']), 'kommt Freitag');
  assert.equal(kb.optionUmschalten(w, 'Beide dabei', ['Beide dabei']), 'kommt Freitag', 'erneutes Antippen nimmt die Option weg');
  const opt = ['Wenig Aufwand (Miete)', 'Viel Ersparnis (Kauf)', 'Unabhängigkeit', 'Umwelt'];
  assert.equal(kb.optionUmschalten(kb.optionUmschalten('', 'Umwelt', opt, true), 'Unabhängigkeit', opt, true), 'Unabhängigkeit, Umwelt');
  kb.antwortSetzen(a, 'pv', 'aerger', '  Preiserhöhungen  ');
  kb.antwortSetzen(a, 'pv', 'widerruf', 'erklärt');
  kb.antwortSetzen(a, 'vorwerk', 'nervt', 'Tierhaare');
  kb.antwortSetzen(a, 'pv', 'nutzen', '');
  assert.equal(a.pv.nutzen, undefined, 'leere Antwort wird entfernt');
  assert.equal(kb.stand('pv', k, a).erledigt, vorher.erledigt + 2);
  assert.equal(kb.klemmbrettText('pv', a), 'Ärgert am meisten: Preiserhöhungen\nWiderrufsrecht: erklärt');
  assert.ok(!kb.klemmbrettText('pv', a).includes('Tierhaare'));
  assert.equal(kb.klemmbrettText('vorwerk', a), 'Nervt beim Putzen: Tierhaare');
  kb.antwortSetzen(a, 'pv', 'schritt', 'Vor-Ort-Termin');
  assert.equal(kb.schrittVorschlag('pv', a), 'Vor-Ort-Termin');
  // Antworten kommen beim Speichern in die Notiz des eigenen Bereichs
  const g = await import('../src/core/gespraech.ts');
  const data = emptyData();
  data.kunden = [k];
  const e = { kundeId: 'k1', start: '2026-11-08T10:00:00.000Z', kontaktart: 'hausbesuch', erreicht: true, sparten: ['pv', 'vorwerk'], notiz: { pv: 'Hund bellt', wp: '', vorwerk: '' }, verlauf: g.leererVerlauf(), leitfadenSparte: 'pv', antworten: a };
  assert.ok(g.hatInhalt({ ...e, notiz: { pv: '', wp: '', vorwerk: '' } }), 'Antworten allein zählen als Inhalt');
  g.speichern(data, e, [{ sparte: 'pv', ausgang: 'termin', status: '', schritt: 'Vor-Ort-Termin', wv: null }], '2026-11-08T10:30:00.000Z');
  const pvNotiz = data.kunden[0].notizen.find((n) => n.sparten.includes('pv'));
  const vwNotiz = data.kunden[0].notizen.find((n) => n.sparten.includes('vorwerk'));
  assert.ok(pvNotiz.text.includes('Ärgert am meisten: Preiserhöhungen') && pvNotiz.text.includes('Hund bellt'));
  assert.ok(!pvNotiz.text.includes('Tierhaare'));
  assert.ok(vwNotiz && vwNotiz.text.includes('Nervt beim Putzen: Tierhaare') && !vwNotiz.text.includes('Preiserhöhungen'));
});

test('Beispielkunden im Gebiet: viele, plausibel, Produkte aus dem Katalog, stabil', async () => {
  const fs = await import('node:fs');
  const { katalogPruefen } = await import('../src/core/produkte.ts');
  const ids = new Set(katalogPruefen(JSON.parse(fs.readFileSync(new URL('../src/data/produkte.json', import.meta.url), 'utf8'))).produkte.map((p) => p.id));
  const d = migrate(demoDaten());
  assert.equal(d.kunden.length, 54);
  const orte = new Set(d.kunden.map((k) => k.ort));
  for (const o of ['Lengede', 'Peine', 'Vechelde', 'Ilsede', 'Salzgitter-Lebenstedt', 'Salzgitter-Bad']) assert.ok(orte.has(o), o);
  assert.ok(d.kunden.every((k) => k.lat > 52 && k.lat < 52.45 && k.lng > 10 && k.lng < 10.5), 'alle im Gebiet');
  const marken = d.kunden.flatMap((k) => k.produkte);
  assert.ok(marken.length > 100);
  assert.ok(marken.every((m) => ids.has(m.produktId)), 'nur Produkte aus dem Katalog');
  assert.ok(new Set(marken.map((m) => m.produktId)).size >= 25, 'viele verschiedene Produkte');
  for (const s of ['pv', 'wp', 'vorwerk']) for (const st of ['interesse', 'abschluss']) assert.ok(d.kunden.some((k) => k.status[s] === st), `${s} ${st}`);
  assert.ok(d.termine.length > 40 && d.termine.every((t) => !t.kundeId || d.kunden.some((k) => k.id === t.kundeId)));
  assert.ok(d.leihvorgaenge.every((l) => d.geraete.some((g) => g.id === l.geraetId)));
  assert.equal(new Set(d.kunden.map((k) => k.id)).size, d.kunden.length);
  // immer gleich (fester Startwert)
  assert.deepEqual(migrate(demoDaten()).kunden.map((k) => k.nachname), d.kunden.map((k) => k.nachname));
});

test('Sicherheitsprüfung: Beispieldaten überschreiben nie echte Kunden oder Geräte', async () => {
  const { beispielSicher, beispielBestand, bestandEinfuegen, bestandEntfernen } = await import('../src/demo.ts');
  const { normalizeGeraet } = await import('../src/core/model.ts');
  const d = migrate({ kunden: [{ id: 'echt', nachname: 'Echt', notizen: [{ id: 'n', text: 'ECHT' }] }], geraete: [{ id: 'echt-g', name: 'Eigenes Gerät' }], termine: [{ id: 'te', kundeId: 'echt', titel: 'Echt', beginn: '2026-11-10T10:00:00Z' }] });
  const echt = JSON.stringify([d.kunden, d.geraete, d.termine, d.einstellungen]);
  beispielSicher(d, (k) => beispielEinfuegen(k, migrate(demoDaten())));
  beispielSicher(d, (k) => bestandEinfuegen(k, beispielBestand().map(normalizeGeraet)));
  assert.equal(beispielAnzahl(d), 54);
  beispielSicher(d, (k) => beispielEntfernen(k));
  beispielSicher(d, (k) => bestandEntfernen(k));
  assert.equal(JSON.stringify([d.kunden, d.geraete, d.termine, d.einstellungen]), echt, 'echte Daten unverändert');
  // Fehlerhafte Beispiel-Änderungen werden abgelehnt, nichts ändert sich
  const vorher = JSON.stringify(d);
  const boese = [
    (k) => { k.kunden = []; },
    (k) => { k.kunden[0].nachname = 'Überschrieben'; },
    (k) => { k.geraete = k.geraete.filter((g) => g.id !== 'echt-g'); },
    (k) => { k.kunden.push({ id: 'neu-ohne-kennung', nachname: 'X' }); },
    (k) => { k.einstellungen.absender = 'Fremd'; },
    (k) => { k.kunden.push({ ...k.kunden[0], id: 'demo-1' }); k.kunden.shift(); },
  ];
  for (const f of boese) {
    assert.throws(() => beispielSicher(d, f), /Sicherheitsprüfung/);
    assert.equal(JSON.stringify(d), vorher);
  }
  // Echte Reservierung eines Beispielgeräts: Gerät bleibt beim Entfernen
  beispielSicher(d, (k) => bestandEinfuegen(k, beispielBestand().map(normalizeGeraet)));
  d.reservierungen.push({ id: 'r-echt', geraetId: 'demob-2', von: '2026-12-01', bis: '2026-12-02' });
  beispielSicher(d, (k) => bestandEntfernen(k));
  assert.ok(d.geraete.some((g) => g.id === 'demob-2') && d.reservierungen.some((r) => r.id === 'r-echt'));
});

test('Vorwerk-PDF-Liste: Spalten erkennen, Dubletten, Haushalt, Abgleich und Übernahme', async () => {
  const { createRequire } = await import('node:module');
  const { erzeugen } = createRequire(import.meta.url)('./testliste-pdf.cjs');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const li = await import('../src/core/listenimport.ts');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(erzeugen()), disableFontFace: true }).promise;
  const seiten = [];
  for (let i = 1; i <= doc.numPages; i++) seiten.push((await (await doc.getPage(i)).getTextContent()).items.map((t) => ({ str: t.str, x: t.transform[4], y: t.transform[5] })));
  assert.equal(seiten.length, 2, 'zwei Seiten mit Kopfzeile');
  const { zeilen, kopf } = li.zeilenAusSeiten(seiten);
  assert.deepEqual(kopf.spalten.map((s) => s.spalte), ['name', 'strasse', 'plz', 'ort', 'telefon', 'sperre', 'ewe', 'eweDatum', 'bnw', 'notiz']);
  assert.equal(zeilen.length, 33, 'keine Kopf-/Fußzeilen als Kunden');
  assert.equal(zeilen[2].notiz, 'Service fällig, bitte im Frühjahr anrufen, Wartung', 'umbrochene Notiz zusammengesetzt');
  const eintraege = zeilen.map(li.eintragAusZeile).filter(Boolean);
  const d = migrate({});
  const a = li.abgleichen(d, eintraege);
  assert.equal(a.zusammengefasst, 1, 'doppelte Zeile zusammengeführt');
  assert.equal(a.posten.length, 32);
  assert.ok(a.posten.every((p) => p.art === 'neu'));
  const fricke = a.posten.filter((p) => p.eintrag.nachname === 'Fricke');
  assert.equal(fricke.length, 2, 'gleiche Telefonnummer, gleiche Adresse = Haushalt, keine Dublette');
  // Übernahme ohne einen Eintrag
  const erg = li.uebernehmen(d, a, (p) => p.eintrag.nachname !== 'Kassebaum', '2026-11-07T12:00:00.000Z');
  assert.deepEqual(erg, { neu: 31, geaendert: 0 });
  const ahrens = d.kunden.find((k) => k.nachname === 'Ahrens');
  assert.equal(ahrens.vorname, 'Gisela');
  assert.deepEqual(ahrens.eigene, { 'vwliste-ewe': 'ja', 'vwliste-ewe-datum': '12.03.2025', 'vwliste-bnw': '1' }, 'EWE/BNW unverändert');
  assert.equal(ahrens.status.vorwerk, 'potenzial');
  assert.ok(ahrens.notizen[0].text.includes('VK7 seit 2023') && ahrens.notizen[0].sparten.join() === 'vorwerk');
  assert.equal(d.kunden.find((k) => k.nachname === 'Bode').eigene['vwliste-sperre'], 'X');
  assert.ok(li.LISTEN_FELDER.every((f) => d.einstellungen.felder.eigene.some((e) => e.id === f.id && e.kategorie === 'vorwerk')));
  // Zweiter Import: alles gleich, Kassebaum neu; geänderte Telefonnummer wird erkannt
  const a2 = li.abgleichen(d, eintraege);
  assert.equal(a2.posten.filter((p) => p.art === 'gleich').length, 31);
  assert.equal(a2.posten.filter((p) => p.art === 'neu').length, 1);
  const anders = eintraege.map((e) => (e.nachname === 'Ahrens' ? { ...e, telefon: '0170 999', werte: { ...e.werte, 'vwliste-bnw': '3' } } : e)).filter((e) => !e.nachname.startsWith('Testkunde1'));
  const a3 = li.abgleichen(d, anders);
  const p3 = a3.posten.find((p) => p.eintrag.nachname === 'Ahrens');
  assert.equal(p3.art, 'geaendert');
  assert.deepEqual(p3.aenderungen, ['Telefon', 'BNW']);
  assert.ok(a3.fehlen.some((f) => f.titel === 'Erika Testkunde1'), 'fehlende Listenkunden werden gemeldet');
  const anzahl = d.kunden.length;
  li.uebernehmen(d, a3);
  assert.equal(d.kunden.find((k) => k.nachname === 'Ahrens').telefon, '0170 999');
  assert.equal(d.kunden.find((k) => k.nachname === 'Ahrens').notizen.length, 1, 'Notiz nicht doppelt');
  assert.ok(d.kunden.length === anzahl + 1 && d.kunden.some((k) => k.nachname === 'Testkunde1'), 'nichts gelöscht');
  // Kaputtes bleibt harmlos
  assert.deepEqual(li.zeilenAusSeiten([[{ str: 'Irgendwas', x: 1, y: 1 }]]).zeilen, []);
  assert.equal(li.eintragAusZeile({ strasse: 'X' }), null);
  assert.deepEqual(li.nameTeilen('Anna Maria Muster'), { vorname: 'Anna Maria', nachname: 'Muster' });
});

test('Kundenauswahl: Suche statt Liste, gleiche Namen unterscheidbar, zuletzt benutzte zuerst', async () => {
  const kw = await import('../src/core/kundenwahl.ts');
  const d = migrate({ kunden: [
    { id: 'a', vorname: 'Anna', nachname: 'Meyer', strasse: 'Lindenweg 4', plz: '38268', ort: 'Lengede', telefon: '05344 1234' },
    { id: 'b', vorname: 'Anna', nachname: 'Meyer', strasse: 'Am Markt 2', plz: '31224', ort: 'Peine' },
    { id: 'c', vorname: 'Bernd', nachname: 'Schulz', ort: 'Vechelde' },
  ], termine: [{ id: 't', kundeId: 'c', titel: 'X', beginn: '2026-11-10T10:00:00Z', updatedAt: '2026-11-07T10:00:00Z' }] });
  const t = kw.kundenSuchen(d, 'anna meyer');
  assert.deepEqual(t.map((x) => x.id).sort(), ['a', 'b']);
  assert.ok(t.every((x) => x.doppelt), 'gleicher Name wird markiert');
  assert.ok(t.find((x) => x.id === 'a').zusatz.includes('Lindenweg 4') && t.find((x) => x.id === 'b').zusatz.includes('Peine'));
  assert.deepEqual(kw.kundenSuchen(d, 'meyer peine').map((x) => x.id), ['b'], 'Ort grenzt ein');
  assert.deepEqual(kw.kundenSuchen(d, '1234').map((x) => x.id), ['a'], 'Telefon');
  assert.deepEqual(kw.kundenSuchen(d, '').map((x) => x.id), ['c'], 'leer: zuletzt benutzte');
  assert.deepEqual(kw.kundenSuchen(d, 'gibtsnicht'), []);
  const viele = migrate({ kunden: Array.from({ length: 500 }, (_, i) => ({ id: `k${i}`, nachname: `Kunde${i}` })) });
  assert.equal(kw.kundenSuchen(viele, 'kunde').length, 8, 'nie endlose Liste');
});

test('Schnellwahl Wiedervorlage: Tage, Wochen, Monate, Monatsende, Uhrzeit', async () => {
  const sw = await import('../src/core/schnellwahl.ts');
  const f = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
  const heute = new Date(2026, 10, 7, 18, 30);
  assert.equal(f(sw.schrittDatum(heute, '1t')), '2026-11-8 9:0', 'leer: 9:00');
  assert.equal(f(sw.schrittDatum(heute, '3t', { h: 14, m: 15 })), '2026-11-10 14:15', 'Uhrzeit bleibt');
  assert.equal(f(sw.schrittDatum(heute, '4w')), '2026-12-5 9:0');
  assert.equal(f(sw.schrittDatum(heute, '3m')), '2027-2-7 9:0', 'über den Jahreswechsel');
  assert.equal(f(sw.schrittDatum(heute, '12m')), '2027-11-7 9:0');
  assert.equal(f(sw.schrittDatum(new Date(2026, 7, 31), '6m')), '2027-2-28 9:0', 'Monatsende gekappt');
  assert.equal(f(sw.schrittDatum(new Date(2026, 10, 30), '3m')), '2027-2-28 9:0');
  assert.equal(sw.schrittDatum(heute, 'quatsch'), null);
  assert.equal(f(sw.schrittDatum(heute, '1w', { h: 99, m: 0 })), '2026-11-14 9:0', 'ungültige Uhrzeit -> 9:00');
  assert.deepEqual(sw.uhrzeitAus('2026-11-07T08:45'), { h: 8, m: 45 });
  assert.equal(sw.uhrzeitAus(''), null);
  assert.equal(sw.SCHRITTE.length, 9);
});

test('Aus der Kundenansicht: Geräteauswahl und Verkauf buchen', async () => {
  const { neuesGeraet, neuerLeihvorgang, normalizeReservierung, neuerTermin, normalizeGeraet } = await import('../src/core/model.ts');
  const bk = await import('../src/core/bestandkunde.ts');
  const pk = await import('../src/core/papierkorb.ts');
  const data = emptyData();
  const a = neuerKunde({ vorname: 'Anna', nachname: 'A' }); const b = neuerKunde({ vorname: 'Bert', nachname: 'B' });
  data.kunden.push(a, b);
  const frei = neuesGeraet({ name: 'Frei' }); const resA = neuesGeraet({ name: 'ResA' }); const beiB = neuesGeraet({ name: 'BeiB' }); const beiA = neuesGeraet({ name: 'BeiA' }); const alt = neuesGeraet({ name: 'Alt', aktiv: false });
  data.geraete.push(frei, resA, beiB, beiA, alt);
  data.leihvorgaenge.push(neuerLeihvorgang({ geraetId: beiB.id, kundeId: b.id }), neuerLeihvorgang({ geraetId: beiA.id, kundeId: a.id, ausgabe: '2026-11-01T10:00:00.000Z' }));
  data.reservierungen = [normalizeReservierung({ geraetId: resA.id, kundeId: a.id, von: '2026-11-10', bis: '2026-11-12' }), normalizeReservierung({ geraetId: frei.id, kundeId: b.id, von: '2026-11-20', bis: '2026-11-21' })];
  const liste = bk.geraeteFuerKunde(data, a.id, '2026-11-07');
  assert.deepEqual(liste.map((x) => [x.g.name, x.lage]), [['ResA', 'reserviert'], ['BeiA', 'beimKunden'], ['Frei', 'fremdReserviert'], ['BeiB', 'verliehen']]);
  assert.deepEqual(liste.filter(bk.verleihbar).map((x) => x.g.name), ['ResA', 'Frei']);
  assert.deepEqual(liste.filter(bk.verkaufbar).map((x) => x.g.name), ['ResA', 'BeiA', 'Frei']);
  // An andere verliehen: Verkauf an A abgelehnt, nichts geändert
  assert.throws(() => bk.verkaufBuchen(data, beiB.id, { kundeId: a.id, datum: '2026-11-07T12:00:00.000Z', preis: 1, notiz: '', statusSetzen: true }, '2026-11-07T12:00:00.000Z'));
  assert.equal(beiB.aktiv, true);
  // Bei A verliehen -> Leihgabe wird „gekauft“, Erinnerung erledigt, Status nur mit Häkchen
  data.termine.push(neuerTermin({ kundeId: a.id, titel: 'Nachfragen: BeiA bei Anna A', beginn: '2026-11-08T10:00:00.000Z' }));
  bk.verkaufBuchen(data, beiA.id, { kundeId: a.id, datum: '2026-11-07T12:00:00.000Z', preis: 799, notiz: 'mit Zubehör', statusSetzen: false }, '2026-11-07T12:00:00.000Z');
  assert.equal(beiA.aktiv, false);
  assert.deepEqual(beiA.verkauf, { kundeId: a.id, datum: '2026-11-07T12:00:00.000Z', preis: 799, notiz: 'mit Zubehör' });
  const l = data.leihvorgaenge.find((x) => x.geraetId === beiA.id);
  assert.equal(l.kaufinteresse, 'gekauft'); assert.equal(l.rueckgabe, '2026-11-07T12:00:00.000Z');
  assert.equal(data.termine[0].erledigt, true);
  assert.notEqual(a.status.vorwerk, 'abschluss');
  assert.match(a.notizen.at(-1).text, /Gekauft: BeiA für 799,00\s€\. mit Zubehör/);
  // Freies Gerät mit fremder späterer Reservierung: Reservierung fällt weg, Status mit Häkchen
  const weg = bk.verkaufBuchen(data, frei.id, { kundeId: a.id, datum: '2026-11-07T12:00:00.000Z', preis: null, notiz: '', statusSetzen: true }, '2026-11-07T12:00:00.000Z');
  assert.equal(weg.length, 1); assert.equal(data.reservierungen.length, 1);
  assert.equal(a.status.vorwerk, 'abschluss');
  assert.deepEqual(bk.gekaufteGeraete(data, a.id).map((g) => g.name).sort(), ['BeiA', 'Frei']);
  assert.throws(() => bk.verkaufBuchen(data, frei.id, { kundeId: a.id, datum: '', preis: null, notiz: '', statusSetzen: false }, '2026-11-07T12:00:00.000Z'), /nicht mehr im Bestand/);
  // Normalisierung und Papierkorb
  assert.equal(normalizeGeraet({ name: 'x' }).verkauf, null);
  assert.equal(normalizeGeraet({ name: 'x', verkauf: { datum: 'kaputt' } }).verkauf, null);
  assert.equal(normalizeGeraet({ name: 'x', verkauf: { datum: '2026-11-07T12:00:00.000Z', preis: -5 } }).verkauf.preis, null);
  pk.kundeLoeschen(data, a.id);
  assert.equal(beiA.verkauf.kundeId, '');
  pk.wiederherstellen(data, data.papierkorb[0].id);
  assert.equal(beiA.verkauf.kundeId, a.id);
});

test('Feiertage Niedersachsen: fest, beweglich, Reformationstag ab 2018', async () => {
  const f = await import('../src/core/feiertage.ts');
  assert.deepEqual(f.ostersonntag(2026), [4, 5]);
  assert.deepEqual(f.ostersonntag(2027), [3, 28]);
  assert.deepEqual(f.ostersonntag(2025), [4, 20]);
  assert.equal(f.feiertag('2026-04-03'), 'Karfreitag');
  assert.equal(f.feiertag('2026-04-06'), 'Ostermontag');
  assert.equal(f.feiertag('2026-05-14'), 'Christi Himmelfahrt');
  assert.equal(f.feiertag('2026-05-25'), 'Pfingstmontag');
  assert.equal(f.feiertag('2026-10-31'), 'Reformationstag');
  assert.equal(f.feiertag('2017-10-31'), null, 'erst ab 2018 dauerhaft');
  assert.equal(f.feiertag('2026-12-26T09:00'), '2. Weihnachtstag');
  assert.equal(f.feiertag(new Date(2027, 0, 1, 15)), 'Neujahr');
  assert.equal(f.feiertag('2026-06-04'), null, 'Fronleichnam gilt in Niedersachsen nicht');
  assert.equal(f.feiertag('2026-11-07'), null);
  assert.equal(f.feiertag('quatsch'), null);
  assert.equal(f.feiertage(2026).size, 10);
});

test('Abgleich über iCloud Drive: nur Neueres, Konflikt bei Änderungen auf beiden Seiten', async () => {
  const a = await import('../src/core/abgleich.ts');
  const t = (h) => `2026-11-07T${String(h).padStart(2, '0')}:00:00.000Z`;
  assert.equal(a.abgleichUrteil(t(10), null, null), 'neuer', 'neues Gerät ohne Daten');
  assert.equal(a.abgleichUrteil(t(10), t(10), null), 'gleich');
  assert.equal(a.abgleichUrteil(t(9), t(10), t(10)), 'aelter');
  assert.equal(a.abgleichUrteil(t(12), t(10), t(10)), 'neuer', 'hier seit Abgleich nichts geändert');
  assert.equal(a.abgleichUrteil(t(12), t(11), t(10)), 'konflikt', 'auch hier geändert');
  assert.equal(a.abgleichUrteil(t(12), t(11), null), 'konflikt', 'nie abgeglichen: lieber fragen');
  assert.equal(a.abgleichUrteil('kaputt', t(11), null), 'ungueltig');
  assert.equal(a.abgleichUrteil(undefined, t(11), null), 'ungueltig');
  assert.equal(a.beimStartFragen({ demo: false, abgeschaltet: false, schonGefragt: false }), true);
  assert.equal(a.beimStartFragen({ demo: true, abgeschaltet: false, schonGefragt: false }), false);
  assert.equal(a.beimStartFragen({ demo: false, abgeschaltet: true, schonGefragt: false }), false);
  assert.equal(a.beimStartFragen({ demo: false, abgeschaltet: false, schonGefragt: true }), false);
});

test('Fokus je Sparte: Anteile, Rückgang, Gleichgewicht, Kurztipp', async () => {
  const a = await import('../src/core/auswertung.ts');
  const { normalizeTermin, normalizeKunde: nk } = await import('../src/core/model.ts');
  const t = (s, h = 10) => new Date(`${s}T${String(h).padStart(2, '0')}:00`).toISOString();
  const leer = a.fokusBericht(emptyData(), 'monat', '2026-11-07', '2026-11-07');
  assert.equal(leer.urteil, 'leer');
  assert.equal(leer.reihe.length, 6);
  assert.equal(leer.tipp, null);

  const data = emptyData();
  const pv = (tag) => ({ zeitpunkt: t(tag), art: 'telefon', erreicht: true, themen: ['pv'], ergebnis: '' });
  const wp = (tag) => ({ zeitpunkt: t(tag), art: 'telefon', erreicht: true, themen: ['wp'], ergebnis: '' });
  data.kunden = [
    // Oktober ausgewogen PV/WP, November fast nur PV
    nk({ id: 'k1', nachname: 'A', status: { pv: 'interesse', wp: 'angebot' },
      enpalKontakte: [pv('2026-10-02'), wp('2026-10-03'), pv('2026-11-02'), pv('2026-11-03'), pv('2026-11-04'), pv('2026-11-05'), pv('2026-11-06'), wp('2026-11-06')] }),
    nk({ id: 'k2', nachname: 'B', status: { wp: 'interesse', vorwerk: 'potenzial' } }),
  ];
  data.termine = [normalizeTermin({ kundeId: 'k2', sparte: 'wp', art: 'wiedervorlage', beginn: t('2026-11-01') })];
  const f = a.fokusBericht(data, 'monat', '2026-11-07', '2026-11-07');
  const je = Object.fromEntries(f.sparten.map((x) => [x.sparte, x]));
  // November: PV 5, WP 1 + Wiedervorlage 1 = 2
  assert.equal(je.pv.anzahl, 5);
  assert.equal(je.wp.anzahl, 2);
  assert.equal(f.gesamt, 7);
  assert.equal(f.schwerpunkt, 'pv');
  assert.equal(je.wp.deltaPkt, Math.round((2 / 7 - 1 / 2) * 100));
  assert.equal(je.wp.ruecklaufig, 1);
  assert.equal(je.wp.vernachlaessigt, true, 'WP um mehr als 15 Pkt. gefallen');
  assert.equal(je.wp.offen, 2);
  assert.equal(je.wp.ueberfaellig, 1, 'offene Wiedervorlage vor heute');
  // Vorwerk: Potenzial-Kunde, aber gar keine Zuwendung -> kommt zuerst dran
  assert.equal(je.vorwerk.vernachlaessigt, true);
  assert.equal(f.urteil, 'einseitig', 'PV 71 %');
  assert.match(f.tipp, /^Vorwerk kam mit 0 % zu kurz\. Gegensteuern: 1 Potenzial-Kunde ansprechen\.$/);
  // ohne Vorwerk-Kunden: WP-Tipp mit Wiedervorlage und offenen Kunden
  data.kunden[1].status.vorwerk = 'unbekannt';
  const f2 = a.fokusBericht(data, 'monat', '2026-11-07', '2026-11-07');
  assert.equal(f2.sparten.find((x) => x.sparte === 'vorwerk').vernachlaessigt, false, 'nicht genutzte Sparte wird nicht angemahnt');
  assert.match(f2.tipp, /Wärmepumpe ist auf 29 % gefallen \(−21 Pkt\.\)\. Gegensteuern: 1 überfällige Wiedervorlage abarbeiten und 2 offene Kunden/);
  // Oktober allein: ausgeglichen
  const okt = a.fokusBericht(data, 'monat', '2026-10-15', '2026-10-15');
  assert.equal(okt.urteil, 'ausgeglichen');
  assert.equal(okt.reihe.at(-1).label, 'Okt 26');
  assert.equal(a.periodenLabel('woche', a.zeitraum('woche', '2026-11-07')), 'KW 45');
  assert.equal(a.periodenLabel('m3', a.zeitraum('m3', '2026-11-07')), 'Aug–Nov 26');
});

test('Verbrauchsmaterial: Buchen, Mindestbestand, Notiz beim Kunden, Papierkorb, Beispiele', async () => {
  const mat = await import('../src/core/material.ts');
  const { neuesMaterial, normalizeKunde: nk } = await import('../src/core/model.ts');
  const pk = await import('../src/core/papierkorb.ts');
  const { badgeZahl } = await import('../src/ui/badge.ts');
  const data = emptyData();
  data.kunden = [nk({ id: 'k1', nachname: 'A' })];
  data.material = [neuesMaterial({ id: 'm', name: 'Koboclean', einheit: 'Flasche', bestand: 4, mindestbestand: 2 })];
  assert.equal(mat.nachbestellListe(data).length, 0);
  let r = mat.materialBuchen(data, 'm', { grund: 'muster', menge: 1, kundeId: 'k1', notiz: 'Küche' }, '2026-11-07T10:00:00.000Z');
  assert.deepEqual([r.nachher, r.knapp, r.neuKnapp], [3, false, false]);
  assert.match(data.kunden[0].notizen[0].text, /^Muster mitgegeben: 1 × Koboclean \(Küche\)$/);
  assert.deepEqual(data.kunden[0].notizen[0].sparten, ['vorwerk']);
  r = mat.materialBuchen(data, 'm', { grund: 'test', menge: 1 });
  assert.deepEqual([r.nachher, r.knapp, r.neuKnapp], [2, true, true], 'Mindestbestand erreicht');
  r = mat.materialBuchen(data, 'm', { grund: 'eigen', menge: 1 });
  assert.equal(r.neuKnapp, false, 'nur einmal melden');
  assert.throws(() => mat.materialBuchen(data, 'm', { grund: 'defekt', menge: 5 }), /nur noch 1 Flasche da/);
  assert.throws(() => mat.materialBuchen(data, 'm', { grund: 'muster', menge: 0 }), /gültige Anzahl/);
  assert.equal(mat.nachbestellListe(data).length, 1);
  assert.equal(badgeZahl(data), 1, 'nachbestellen zählt am App-Symbol');
  mat.materialBuchen(data, 'm', { grund: 'zugang', menge: 6 });
  assert.equal(data.material[0].bestand, 7);
  mat.materialBuchen(data, 'm', { grund: 'korrektur', menge: 5 });
  assert.equal(data.material[0].bestand, 5);
  assert.equal(data.material[0].buchungen[0].menge, -2, 'Korrektur bucht die Differenz');
  assert.equal(data.material[0].buchungen.length, 5);
  // Laden übersteht alles, Unsinn wird repariert, Bezug auf fehlende Kunden fällt weg
  const d2 = migrate({ ...data, material: [...data.material, { name: '', bestand: -3, mindestbestand: 'x', buchungen: [{ menge: 'a', grund: 'mond', kundeId: 'weg' }] }] });
  assert.equal(d2.material[0].bestand, 5);
  assert.equal(d2.material[1].bestand, 0);
  assert.equal(d2.material[1].mindestbestand, null);
  assert.equal(d2.material[1].buchungen[0].grund, 'korrektur');
  assert.equal(d2.material[1].buchungen[0].kundeId, '');
  assert.equal(migrate({}).material.length, 0, 'alte Daten ohne Material');
  // Kunde löschen und wiederherstellen: Bezug der Buchung geht und kommt zurück
  pk.kundeLoeschen(data, 'k1');
  assert.equal(data.material[0].buchungen.at(-1).kundeId, '');
  pk.wiederherstellen(data, data.papierkorb[0].id);
  assert.equal(data.material[0].buchungen.at(-1).kundeId, 'k1');
});

test('Kundenfotos: Beschreibung, Schlüssel, Alter, benutzte Bilddaten auch im Papierkorb', async () => {
  const f = await import('../src/core/fotos.ts');
  const { normalizeKunde: nk } = await import('../src/core/model.ts');
  const pk = await import('../src/core/papierkorb.ts');
  const k = nk({ id: 'k1', nachname: 'A', fotos: [
    { id: 'f-1', sparte: 'pv', zeitpunkt: '2025-01-01T10:00:00.000Z', bytes: 200000 },
    { id: 'f-2', sparte: 'mond', zeitpunkt: '2026-11-01T10:00:00.000Z', bytes: 100000 },
    { id: 'f-1', sparte: 'wp' }, { sparte: 'wp' }, 'quatsch',
  ] });
  assert.equal(k.fotos.length, 2, 'Doppelte und Kaputte fallen weg');
  assert.equal(k.fotos[1].sparte, 'pv', 'unbekannte Sparte wird PV');
  const data = emptyData();
  data.kunden = [k, nk({ id: 'k2', fotos: [{ id: 'f-3', sparte: 'vorwerk', zeitpunkt: '2026-10-01T10:00:00.000Z', bytes: 50000 }] })];
  assert.deepEqual(f.fotoStatistik(data), { anzahl: 3, bytes: 350000, kunden: 2 });
  assert.deepEqual(f.fotosAelterAls(data, 365, new Date('2026-11-07T12:00:00Z')).map((x) => x.fotoId), ['f-1']);
  assert.equal(f.fotosAelterAls(data, 30, new Date('2026-11-07T12:00:00Z')).length, 2);
  pk.kundeLoeschen(data, 'k2');
  assert.deepEqual([...f.benutzteFotoIds(data)].sort(), ['f-1', 'f-2', 'f-3'], 'Kunde im Papierkorb behält seine Fotos');
  pk.endgueltigLoeschen(data, data.papierkorb[0].id);
  assert.deepEqual([...f.benutzteFotoIds(data)].sort(), ['f-1', 'f-2']);
  assert.equal(f.groesseText(150 * 1024), '150 KB');
  assert.equal(f.groesseText(1.5 * 1024 * 1024), '1,5 MB');
  // Fotoschlüssel: nur gültige 256-Bit-Schlüssel, alte Daten ohne Schlüssel
  const gut = Buffer.alloc(32, 7).toString('base64');
  const d = migrate({ fotoSchluessel: { 'k-1': gut, 'k-2': 'kurz', '../x': gut } });
  assert.deepEqual(d.fotoSchluessel, { 'k-1': gut });
  assert.deepEqual(migrate({}).fotoSchluessel, {});
  assert.equal(migrate({}).einstellungen.fotosMitsichern, true, 'Standard: Fotos mitsichern');
  assert.equal(migrate({ einstellungen: { fotosMitsichern: false } }).einstellungen.fotosMitsichern, false);
});

import { ABSCHNITTE, ZEITLEISTE, STAND, HINWEIS, foerderungFiltern, abschnittText, zeitleiste, wusstestDu } from '../src/core/foerderung.ts';

test('Förderung: jeder Abschnitt hat Quelle, Prüfdatum und eindeutige ID', () => {
  const ids = new Set();
  for (const a of ABSCHNITTE) {
    assert.ok(!ids.has(a.id), `doppelte ID ${a.id}`); ids.add(a.id);
    assert.ok(a.quellen.length >= 1, `${a.id} ohne Quelle`);
    for (const q of a.quellen) assert.match(q.url, /^https:\/\/[^\s"<>]+$/, `${a.id}: Quelle ${q.url}`);
    assert.match(a.geprueft, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(a.geprueft <= STAND, `${a.id}: Prüfdatum nach Stand`);
    assert.ok(a.punkte.length >= 2 && a.kurz && a.titel);
    if (a.tabelle) assert.ok(a.tabelle.every((z) => z.length === a.tabelle[0].length), `${a.id}: Tabelle ungleich breit`);
  }
  for (const t of ZEITLEISTE) assert.ok(ids.has(t.abschnitt), `Zeitleiste verweist auf ${t.abschnitt}`);
  assert.match(HINWEIS, /keine Rechts- oder Steuerberatung/);
});

test('Förderung: Filter nach Bereich, Thema und Suche', () => {
  const pv = foerderungFiltern(ABSCHNITTE, { bereich: 'pv' });
  assert.ok(pv.length > 0 && pv.every((a) => a.bereich !== 'wp'));
  assert.ok(pv.some((a) => a.bereich === 'beide'), '„beide“ erscheint auch unter PV');
  const steuer = foerderungFiltern(ABSCHNITTE, { kategorie: 'steuer' });
  assert.ok(steuer.every((a) => a.kategorie === 'steuer') && steuer.length >= 2);
  assert.ok(foerderungFiltern(ABSCHNITTE, { q: 'Wärmepumpe Zuschuss' }).some((a) => a.id === 'wp-kfw458'), 'Umlaute in der Suche');
  assert.ok(foerderungFiltern(ABSCHNITTE, { q: 'Balkonkraftwerk' }).some((a) => a.id === 'pv-balkon'));
  assert.equal(foerderungFiltern(ABSCHNITTE, { q: 'xyzgibtsnicht' }).length, 0);
});

test('Förderung: Kopiertext enthält Quellen, Stand und Hinweis', () => {
  const a = ABSCHNITTE.find((x) => x.id === 'pv-verguetung');
  const t = abschnittText(a);
  assert.ok(t.startsWith(a.titel));
  assert.ok(t.includes('Quellen:') && t.includes(a.quellen[0].url));
  assert.ok(t.includes('Stand: 07.11.2026'));
  assert.ok(t.includes('keine Rechts- oder Steuerberatung'));
  assert.ok(t.includes('7,70 ct/kWh'));
});

test('Förderung: Zeitleiste sortiert und markiert Vergangenes', () => {
  const z = zeitleiste('2026-11-07');
  for (let i = 1; i < z.length; i++) assert.ok(z[i - 1].datum <= z[i].datum);
  assert.ok(z.find((t) => t.datum === '2025-02-25').vorbei);
  assert.ok(!z.find((t) => t.datum === '2027-02-01').vorbei);
  assert.ok(wusstestDu().length >= 5);
});

test('Förderung: seriöser Ton ohne Verkaufsdruck (R-LEITFADEN)', () => {
  const alles = ABSCHNITTE.map((a) => abschnittText(a)).join('\n').toLowerCase();
  for (const w of ['nur noch heute', 'jetzt zuschlagen', 'schnell sein', 'letzte chance', 'garantiert', 'sofort unterschreiben', 'rendite von']) {
    assert.ok(!alles.includes(w), `verbotene Formulierung: ${w}`);
  }
});

import { PV_STANDARD, WP_STANDARD, PV_FELDER, rechnePv, rechneWp, wpZuschuss, staffel, hoechstpreis, zahlLesen, rechnerText } from '../src/core/amortisation.ts';

test('Rechner: PV-Beispiel macht sich in plausibler Zeit bezahlt, teurer = später', () => {
  const e = rechnePv(PV_STANDARD);
  assert.equal(e.kumuliert.length, PV_STANDARD.jahre);
  assert.equal(e.kumuliert[0], -PV_STANDARD.investition + e.jahr[0]);
  assert.ok(e.amortisation > 8 && e.amortisation < 18, `Amortisation ${e.amortisation}`);
  const st = staffel('pv', PV_STANDARD);
  for (let i = 1; i < st.length; i++) assert.ok((st[i].ergebnis.amortisation ?? 99) >= (st[i - 1].ergebnis.amortisation ?? 99));
  assert.equal(rechnePv({ ...PV_STANDARD, investition: 0 }).amortisation, 0);
  assert.equal(rechnePv({ ...PV_STANDARD, strompreis: 0, verguetung: 0 }).amortisation, null, 'ohne Erlöse nie bezahlt');
  const g = hoechstpreis('pv', PV_STANDARD, 15);
  assert.ok(rechnePv({ ...PV_STANDARD, investition: g }).amortisation <= 15);
  assert.ok(rechnePv({ ...PV_STANDARD, investition: g + 1000 }).amortisation > 15);
});

test('Rechner: Wärmepumpe mit Zuschussdeckel und „ohnehin fällig“', () => {
  assert.equal(wpZuschuss({ investition: 40000, foerderung: 50 }), 14000, 'nur 28.000 € förderfähig');
  const e = rechneWp(WP_STANDARD);
  assert.equal(e.eigenanteil, 30000 - 14000);
  assert.ok(e.vorteilJahr1 > 0);
  assert.ok(rechneWp({ ...WP_STANDARD, sowieso: 12000 }).amortisation < e.amortisation);
  assert.equal(rechneWp({ ...WP_STANDARD, jaz: 1.5, wpstrompreis: 60 }).amortisation, null);
});

test('Rechner: Eingaben in deutscher Schreibweise, Grenzen, Kopiertext', () => {
  const f = PV_FELDER.find((x) => x.key === 'investition');
  assert.equal(zahlLesen('15.000', f, 1), 15000);
  assert.equal(zahlLesen('15.000,50 €', f, 1), 15000.5);
  assert.equal(zahlLesen('abc', f, 7), 7);
  assert.equal(zahlLesen('-5', f, 7), 0);
  assert.equal(zahlLesen('7,7', PV_FELDER.find((x) => x.key === 'verguetung'), 1), 7.7);
  const t = rechnerText('pv', PV_STANDARD, rechnePv(PV_STANDARD));
  assert.ok(t.includes('ohne Gewähr') && t.includes('Annahmen:') && t.includes('Eigenverbrauch'));
});

test('Rechner: Angaben aus der Kundenkartei übernehmen (nur passende Werte)', async () => {
  const { pvAusKunde, wpAusKunde } = await import('../src/core/amortisation.ts');
  const p = pvAusKunde({ strompreis: 38, speicher: true, stromverbrauch: 4500 });
  assert.deepEqual(p.werte, { strompreis: 38, eigenverbrauch: 60 });
  assert.equal(p.liste.length, 2);
  assert.deepEqual(pvAusKunde({ strompreis: 500 }).werte, {}, 'unplausibler Strompreis bleibt draußen');
  assert.deepEqual(pvAusKunde(null).werte, {});
  const gas = wpAusKunde({ heizungsart: 'Gas', verbrauchMenge: 18000, verbrauchEinheit: 'kWh', heizkosten: 2160 });
  assert.equal(gas.werte.waermebedarf, 16000, '18.000 kWh × 90 % auf 500 gerundet');
  assert.equal(gas.werte.brennstoffpreis, 12);
  const oel = wpAusKunde({ heizungsart: 'Öl', verbrauchMenge: 2500, verbrauchEinheit: 'Liter' });
  assert.equal(oel.werte.waermebedarf, 22500, '1 Liter Heizöl ≈ 10 kWh');
  assert.equal(oel.werte.brennstoffpreis, undefined);
  assert.deepEqual(wpAusKunde({ heizungsart: 'Pellets', verbrauchMenge: 5000, verbrauchEinheit: 'kg' }).werte, {}, 'nur Gas und Öl');
  assert.deepEqual(wpAusKunde({ heizungsart: 'Gas', verbrauchMenge: 2000, verbrauchEinheit: 'Liter' }).werte, {}, 'Einheit passt nicht zur Heizung');
});

test('Abhaken mit Folgeschritt: erledigt, Notiz im Bereich des Termins, nächste Wiedervorlage', async () => {
  const { abhakenAnwenden, notizText } = await import('../src/core/abhaken.ts');
  const { neuerTermin } = await import('../src/core/model.ts');
  const k = neuerKunde({ vorname: 'Erika', nachname: 'Muster' });
  const t = neuerTermin({ kundeId: k.id, sparte: 'vorwerk', titel: 'Nachfragen Kobold', beginn: '2026-11-07T09:00:00.000Z', dauerMin: 30, ort: 'Musterweg 1' });
  const data = { kunden: [k], termine: [t] };
  const folge = abhakenAnwenden(data, t.id, { text: '  Nicht erreicht ', folgeBeginn: '2026-11-10T09:00:00.000Z' }, '2026-11-07T10:00:00.000Z');
  assert.equal(data.termine[0].erledigt, true);
  assert.equal(k.notizen.length, 1);
  assert.equal(k.notizen[0].text, 'Nachfragen Kobold erledigt: Nicht erreicht');
  assert.deepEqual(k.notizen[0].sparten, ['vorwerk'], 'Notiz trägt nur den Bereich des Termins (R-TEXT)');
  assert.ok(folge);
  assert.equal(data.termine.length, 2);
  assert.equal(folge.art, 'wiedervorlage');
  assert.equal(folge.kundeId, k.id);
  assert.equal(folge.sparte, 'vorwerk');
  assert.equal(folge.titel, 'Nachfragen Kobold');
  assert.equal(folge.beginn, '2026-11-10T09:00:00.000Z');
  assert.equal(folge.erledigt, false);
  assert.equal(notizText({ titel: '', art: 'termin' }, 'ok'), 'Termin erledigt: ok');
});

test('Abhaken ohne Eingaben: nur erledigt, keine Notiz, keine Wiedervorlage; ungültiges Datum wird ignoriert', async () => {
  const { abhakenAnwenden } = await import('../src/core/abhaken.ts');
  const { neuerTermin } = await import('../src/core/model.ts');
  const k = neuerKunde({ vorname: 'Max' });
  const t = neuerTermin({ kundeId: k.id, titel: 'Anruf' });
  const data = { kunden: [k], termine: [t] };
  assert.equal(abhakenAnwenden(data, t.id, { text: '   ', folgeBeginn: '' }), null);
  assert.equal(t.erledigt, true);
  assert.equal(k.notizen.length, 0);
  assert.equal(data.termine.length, 1);
  const t2 = neuerTermin({ titel: 'ohne Kunde' });
  data.termine.push(t2);
  assert.equal(abhakenAnwenden(data, t2.id, { text: 'Text', folgeBeginn: 'kaputt' }), null);
  assert.equal(k.notizen.length, 0, 'ohne Kunde keine Notiz');
  assert.equal(abhakenAnwenden(data, 'gibt-es-nicht', { text: '', folgeBeginn: '' }), null);
});

test('Als Nächstes: laufender Termin vor fälliger Wiedervorlage, sonst älteste fällige', async () => {
  const { alsNaechstes, zeitText } = await import('../src/core/naechstes.ts');
  const { neuerTermin } = await import('../src/core/model.ts');
  const jetzt = new Date(2026, 10, 7, 10, 0);
  const iso = (h, m = 0, tag = 7) => new Date(2026, 10, tag, h, m).toISOString();
  const wvAlt = neuerTermin({ art: 'wiedervorlage', titel: 'alt', beginn: iso(9, 0, 4) });
  const laeuft = neuerTermin({ art: 'termin', titel: 'läuft', beginn: iso(9, 30), dauerMin: 60 });
  const spaeter = neuerTermin({ art: 'termin', titel: 'später', beginn: iso(15) });
  const vorbei = neuerTermin({ art: 'termin', titel: 'vorbei', beginn: iso(8), dauerMin: 30 });
  const erledigt = neuerTermin({ art: 'termin', titel: 'erledigt', beginn: iso(9, 45), erledigt: true });
  let n = alsNaechstes([wvAlt, spaeter, laeuft, vorbei, erledigt], jetzt);
  assert.equal(n.termin.titel, 'läuft');
  assert.equal(n.lage, 'laeuft');
  n = alsNaechstes([wvAlt, spaeter, vorbei], jetzt);
  assert.equal(n.termin.titel, 'später');
  assert.equal(n.lage, 'heute');
  n = alsNaechstes([wvAlt, vorbei], jetzt);
  assert.equal(n.termin.titel, 'alt', 'älteste fällige zuerst');
  assert.equal(n.lage, 'ueberfaellig');
  assert.equal(zeitText(n, jetzt), 'überfällig seit 3 Tagen');
  const gleich = neuerTermin({ art: 'termin', titel: 'gleich', beginn: iso(10, 25) });
  n = alsNaechstes([gleich], jetzt);
  assert.equal(n.lage, 'gleich');
  assert.equal(zeitText(n, jetzt), 'in 25 Min. (10:25 Uhr)');
  assert.equal(alsNaechstes([neuerTermin({ art: 'termin', beginn: iso(10, 0, 8) })], jetzt), null, 'morgen ist nicht „als Nächstes“');
  assert.equal(alsNaechstes([], jetzt), null);
});

test('Statusverlauf (Schema 8): Migration schätzt, Änderungen werden mit Datum festgehalten', async () => {
  const { statusVerlaufAbgleichen, letzterVerlaufStatus, SCHEMA_VERSION } = await import('../src/core/model.ts');
  assert.ok(SCHEMA_VERSION >= 8); // ab 0.12.0 Schema 9
  // Alte Daten (Schema 7): vorhandener Status wird als geschätzter Wechsel zum Anlagedatum nachgetragen
  const alt = migrate({ schemaVersion: 7, kunden: [{ id: 'k1', nachname: 'A', createdAt: '2026-10-01T08:00:00.000Z', status: { pv: 'angebot' } }] });
  const k = alt.kunden[0];
  assert.deepEqual(k.statusVerlauf, [{ zeitpunkt: '2026-10-01T08:00:00.000Z', sparte: 'pv', von: 'unbekannt', nach: 'angebot', geschaetzt: true }]);
  // erneutes Laden ergänzt nichts (idempotent)
  assert.equal(migrate(JSON.parse(JSON.stringify(alt))).kunden[0].statusVerlauf.length, 1);
  // Wechsel festhalten, unveränderter Status ergänzt nichts
  k.status.pv = 'abschluss'; k.status.vorwerk = 'interesse';
  assert.equal(statusVerlaufAbgleichen(k, '2026-11-05T10:00:00.000Z'), true);
  assert.equal(statusVerlaufAbgleichen(k, '2026-11-06T10:00:00.000Z'), false);
  assert.deepEqual(k.statusVerlauf.slice(1).map((w) => `${w.sparte}:${w.von}>${w.nach}`), ['pv:angebot>abschluss', 'vorwerk:unbekannt>interesse']);
  assert.equal(letzterVerlaufStatus(k.statusVerlauf, 'pv'), 'abschluss');
  // Ungültige Einträge fallen weg, Reihenfolge wird sortiert
  const n = normalizeKunde({ status: { wp: 'termin' }, statusVerlauf: [
    { zeitpunkt: '2026-11-02T10:00:00.000Z', sparte: 'wp', von: 'interesse', nach: 'termin' },
    { zeitpunkt: 'kaputt', sparte: 'wp', nach: 'termin' }, { zeitpunkt: '2026-11-01T10:00:00.000Z', sparte: 'xx', nach: 'termin' },
    { zeitpunkt: '2026-11-01T10:00:00.000Z', sparte: 'wp', von: 'unbekannt', nach: 'interesse' }] });
  assert.deepEqual(n.statusVerlauf.map((w) => w.nach), ['interesse', 'termin']);
});

test('Vertriebssicht: Abschlüsse, Abschlussquote, Trichter, fairer Vergleich, Nachfassliste', async () => {
  const a = await import('../src/core/auswertung.ts');
  const { normalizeTermin, neuerLeihvorgang, normalizeKunde: nk } = await import('../src/core/model.ts');
  const t = (s, h = 10) => new Date(`${s}T${String(h).padStart(2, '0')}:00`).toISOString();
  const w = (tag, sparte, von, nach) => ({ zeitpunkt: t(tag), sparte, von, nach });
  const data = emptyData();
  data.kunden = [
    // PV: im Oktober Interesse, im November Termin → Angebot → Abschluss
    nk({ id: 'k1', nachname: 'A', status: { pv: 'abschluss' }, statusVerlauf: [w('2026-10-05', 'pv', 'unbekannt', 'interesse'), w('2026-11-02', 'pv', 'interesse', 'termin'), w('2026-11-03', 'pv', 'termin', 'angebot'), w('2026-11-06', 'pv', 'angebot', 'abschluss')] }),
    // PV: Termin, dann im November abgesagt → verlorene Chance
    nk({ id: 'k2', nachname: 'B', status: { pv: 'kein_interesse' }, statusVerlauf: [w('2026-10-10', 'pv', 'unbekannt', 'termin'), w('2026-11-04', 'pv', 'termin', 'kein_interesse')] }),
    // WP: Angebot seit September, nichts passiert → Nachfassliste
    nk({ id: 'k3', nachname: 'C', status: { wp: 'angebot' }, statusVerlauf: [w('2026-09-01', 'wp', 'unbekannt', 'angebot')] }),
    // Vorwerk: schon im Oktober abgeschlossen → nicht mehr im November-Trichter
    nk({ id: 'k4', nachname: 'D', status: { vorwerk: 'abschluss' }, statusVerlauf: [w('2026-10-02', 'vorwerk', 'unbekannt', 'abschluss')] }),
    // nur Potenzial
    nk({ id: 'k5', nachname: 'E', status: { pv: 'potenzial' }, statusVerlauf: [w('2026-10-20', 'pv', 'unbekannt', 'potenzial')] }),
  ];
  const v = a.vertrieb(data, 'alle', '2026-11-01', '2026-11-30');
  assert.equal(v.abschluesse, 1);
  assert.equal(v.verloren, 1);
  assert.equal(v.quote, 0.5);
  assert.equal(v.offen, 1, 'nur k3 (Angebot) ist am Monatsende offen');
  assert.deepEqual(v.trichter.stufen.map((x) => x.anzahl), [4, 3, 3, 2, 1]);
  assert.equal(v.trichter.stufen[3].je.wp, 1);
  // Status an einem Stichtag
  assert.equal(a.statusAm(data.kunden[0], 'pv', '2026-11-02'), 'termin');
  assert.equal(a.statusVor(data.kunden[0], 'pv', '2026-11-02'), 'interesse');
  assert.equal(a.statusVor(data.kunden[0], 'pv', '2026-10-01'), 'unbekannt');
  // Bereich PV
  const pv = a.vertrieb(data, 'pv', '2026-11-01', '2026-11-30');
  assert.deepEqual(pv.trichter.stufen.map((x) => x.anzahl), [3, 2, 2, 1, 1]);
  assert.equal(pv.trichter.schwach, 0, 'Potenzial → Interesse am schwächsten (2 von 3)');
  assert.match(pv.trichter.tipp, /zwischen Potenzial und Interesse \(67 % kommen weiter\)/);
  // Fairer Vergleich im laufenden Monat: 1.–8. November gegen 1.–8. Oktober
  const ber = a.bericht(data, 'alle', 'monat', '2026-11-08', '2026-11-08');
  assert.equal(ber.laufend, true);
  assert.equal(ber.vbis, '2026-10-08');
  assert.match(ber.vergleich, /^1\.10\.–8\.10\.2026 \(gleich viele Tage\)$/);
  assert.equal(ber.vtVorher.abschluesse, 1, 'k4 am 2.10.');
  assert.equal(ber.jetzt.verlauf.length, 30, 'Säulen über den ganzen Monat');
  const okt = a.bericht(data, 'alle', 'monat', '2026-10-15', '2026-11-08');
  assert.equal(okt.laufend, false);
  assert.equal(okt.vbis, '2026-09-30');
  // Nachfassliste
  data.termine = [
    normalizeTermin({ kundeId: 'k5', sparte: 'pv', art: 'wiedervorlage', titel: 'nochmal klingeln', beginn: t('2026-11-03') }),
    normalizeTermin({ kundeId: 'k5', sparte: 'pv', art: 'wiedervorlage', titel: 'erledigt', beginn: t('2026-11-02'), erledigt: true }),
  ];
  data.geraete = [{ id: 'g', name: 'Kobold VK7' }];
  data.leihvorgaenge = [neuerLeihvorgang({ geraetId: 'g', kundeId: 'k4', ausgabe: t('2026-11-01'), rueckgabeGeplant: t('2026-11-06') })];
  const nf = a.nachfassListe(data, 'alle', '2026-11-08');
  assert.deepEqual(nf.ueberfaellig.map((e) => [e.kundeId, e.wann]), [['k5', 'seit 5 Tagen']]);
  assert.deepEqual(nf.angebot.map((e) => e.kundeId), ['k3']);
  assert.match(nf.angebot[0].text, /^Wärmepumpe · Angebot vom 1\.9\.$/);
  assert.deepEqual(nf.test.map((e) => [e.kundeId, e.wann, e.dringend]), [['k4', 'seit 2 Tagen', true]]);
  assert.equal(a.nachfassListe(data, 'pv', '2026-11-08').test.length, 0, 'Testgeräte nur bei Vorwerk');
  // Ein kommender Termin nimmt das Angebot von der Liste
  data.termine.push(normalizeTermin({ kundeId: 'k3', sparte: 'wp', art: 'termin', beginn: t('2026-11-12') }));
  assert.equal(a.nachfassListe(data, 'alle', '2026-11-08').angebot.length, 0);
  // Leere Daten stürzen nicht ab
  const leer = a.vertrieb(emptyData(), 'alle', '2026-11-01', '2026-11-30');
  assert.equal(leer.quote, null); assert.equal(leer.trichter.schwach, null);
});

test('Demo: Statusverlauf passt zum Status, Kunden haben ein Anlagedatum', async () => {
  const { demoDaten } = await import('../src/demo.ts');
  const { letzterVerlaufStatus, SPARTEN_KEYS } = await import('../src/core/model.ts');
  const d = migrate(demoDaten());
  for (const k of d.kunden) {
    for (const s of SPARTEN_KEYS) assert.equal(letzterVerlaufStatus(k.statusVerlauf, s), k.status[s], `${k.id} ${s}`);
    assert.ok(k.statusVerlauf.every((w) => !w.geschaetzt), 'Demo ohne geschätzte Einträge');
    assert.ok(k.createdAt <= (k.statusVerlauf[0]?.zeitpunkt ?? k.createdAt));
  }
});

test('Vertrieb (Schema 9): Angebote normalisieren, Frist, Summe, Nachfassen', async () => {
  const v = await import('../src/core/vertrieb.ts');
  const { SCHEMA_VERSION } = await import('../src/core/model.ts');
  assert.equal(SCHEMA_VERSION, 9);
  // Alte Daten ohne die neuen Felder bleiben lesbar
  const alt = migrate({ schemaVersion: 8, kunden: [{ id: 'k1', nachname: 'A' }] });
  assert.deepEqual(alt.kunden[0].angebote, []);
  assert.deepEqual(alt.kunden[0].auftrag, {});
  assert.deepEqual(alt.kunden[0].ansprechpartner, []);
  assert.deepEqual(alt.kunden[0].haustuer, []);
  // Kaputtes wird repariert, nicht übernommen
  const a = v.normalizeAngebot({ sparte: 'xx', betrag: 'abc', status: 'unsinn', datum: '2026-11-01T10:00:00.000Z', gueltigBis: '2026-10-01T10:00:00.000Z' });
  assert.equal(a.sparte, 'pv');
  assert.equal(a.betrag, null);
  assert.equal(a.status, 'offen');
  assert.equal(a.gueltigBis, null, 'Frist vor dem Angebotsdatum wird verworfen');
  assert.equal(v.normalizeAngebot({ betrag: -5 }).betrag, null);
  assert.equal(v.normalizeAngebot({ betrag: 18900.555 }).betrag, 18900.56);
  const k = normalizeKunde({ id: 'k2', angebote: [
    { id: 'x1', sparte: 'pv', betrag: 20000, datum: '2026-11-01T10:00:00.000Z', gueltigBis: '2026-11-05T22:00:00.000Z' },
    { id: 'x2', sparte: 'wp', betrag: 30000, datum: '2026-11-03T10:00:00.000Z' },
    { id: 'x3', sparte: 'wp', betrag: 99999, datum: '2026-11-03T10:00:00.000Z', status: 'abgelehnt', entschieden: '2026-11-04T10:00:00.000Z' },
    { id: 'x4', sparte: 'vorwerk', datum: '2026-11-04T10:00:00.000Z' },
  ] });
  const jetzt = '2026-11-08T09:00:00.000Z';
  const offen = v.offeneAngebote([k], jetzt);
  assert.deepEqual(offen.map((o) => o.angebot.id), ['x1', 'x2', 'x4']);
  assert.equal(offen[0].abgelaufen, true);
  assert.equal(offen[1].abgelaufen, false);
  assert.equal(offen[0].tageOffen, 6); // volle Tage
  assert.equal(v.angebotsSumme(offen), 50000, 'ohne Betrag zählt nicht, abgelehnt zählt nicht');
  assert.equal(v.offeneAngebote([k], jetzt, 'wp').length, 1);
  // Nachfassen: Tag 3 und 7 nach dem Angebot, vergangene entfallen
  const neu = v.normalizeAngebot({ sparte: 'wp', titel: 'WP 9 kW', datum: '2026-11-06T15:00:00.000Z', betrag: 27000 });
  const nf = v.nachfassTermine(neu, 'k2', jetzt);
  assert.equal(nf.length, 2);
  assert.ok(nf.every((t) => t.art === 'wiedervorlage' && t.sparte === 'wp' && t.kundeId === 'k2' && t.titel === 'Angebot nachfassen: WP 9 kW'));
  assert.ok(nf[0].beginn > jetzt && nf[0].beginn < nf[1].beginn);
  assert.equal(v.nachfassTermine(neu, 'k2', '2026-11-12T12:00:00.000Z').length, 1);
  const termine = nf.map((t, i) => ({ ...t, id: `t${i}`, erledigt: i === 1 }));
  assert.equal(v.offeneNachfass(termine, 'k2', neu).length, 1);
  assert.equal(v.offeneNachfass(termine, 'anders', neu).length, 0);
  assert.equal(v.euro(18900), '18.900 €');
  assert.equal(v.euro(null), '–');
});

test('Vertrieb: Auftragsstand und Pflege-Wiedervorlagen', async () => {
  const v = await import('../src/core/vertrieb.ts');
  const k = normalizeKunde({ id: 'k1', auftrag: { pv: { schritte: { vertrag: { datum: '2026-10-01', erledigt: true }, montage: { datum: '2027-03-12', erledigt: false }, netz: { datum: 'kaputt', erledigt: 'ja' } } }, unsinn: {} } });
  assert.deepEqual(Object.keys(k.auftrag), ['pv'], 'nur begonnene, bekannte Sparten');
  assert.equal(k.auftrag.pv.schritte.netz.datum, '');
  assert.equal(k.auftrag.pv.schritte.netz.erledigt, false);
  const st = v.auftragStand('pv', k.auftrag.pv);
  assert.equal(st.erledigt, 1);
  assert.equal(st.gesamt, 5);
  assert.equal(st.naechster.key, 'planung');
  assert.equal(st.fertig, false);
  assert.match(v.auftragText('pv', k.auftrag.pv), /Planung.*\(1 von 5\)/);
  const kt = v.auftragKundentext('pv', k.auftrag.pv, 'Guten Tag Frau A,', 'Jan');
  assert.match(kt, /✓ Vertrag unterschrieben \(01\.10\.2026\)/);
  assert.match(kt, /○ Montage – geplant am 12\.03\.2027/);
  assert.ok(!/Wärmepumpe|Vorwerk/.test(kt), 'Kundentext nur für die eine Sparte');
  const fertig = v.neuerAuftrag('wp', '2026-11-01');
  for (const s of v.AUFTRAG_SCHRITTE.wp) fertig.schritte[s.key] = { datum: '2026-11-01', erledigt: true };
  const st2 = v.auftragStand('wp', fertig);
  assert.equal(st2.fertig, true);
  assert.equal(st2.fertigAm, '2026-11-01');
  const p = v.pflegeVorschlaege('wp', st2.fertigAm, '2026-11-08T09:00:00.000Z');
  assert.ok(p.length >= 2 && p.every((x) => x.sparte === 'wp' && x.beginn > '2026-11-08'));
  assert.ok(p.some((x) => /Wartung/.test(x.titel)));
  assert.equal(v.pflegeVorhanden([{ kundeId: 'k1', sparte: 'wp', titel: p[0].titel }], 'k1', p[0]), true);
  assert.equal(v.pflegeVorhanden([], 'k1', p[0]), false);
});

test('Vertrieb: Ansprechpartner, Haustür, Werbeverbot, letzter Kontakt', async () => {
  const v = await import('../src/core/vertrieb.ts');
  const { letzterKontakt, kundenVerlauf } = await import('../src/core/verlauf.ts');
  const k = normalizeKunde({ id: 'k1', firma: 'Hof Meyer', status: { pv: 'potenzial', wp: 'interesse' },
    ansprechpartner: [{ name: 'Heinz', rolle: 'boss' }, { name: 'Anke', rolle: 'finanzen' }],
    haustuer: [{ ergebnis: 'nicht_da', zeitpunkt: '2026-11-01T10:00:00.000Z' }, { ergebnis: 'falsch' }] });
  assert.equal(k.ansprechpartner[0].rolle, 'sonstiges');
  assert.equal(k.ansprechpartner[1].rolle, 'finanzen');
  assert.equal(k.haustuer.length, 1, 'unbekanntes Ergebnis wird verworfen');
  assert.equal(letzterKontakt({ termine: [], leihvorgaenge: [] }, k, '2026-11-08T00:00:00.000Z'), null, '„nicht angetroffen“ ist kein Kontakt');
  k.haustuer.push(v.neuerHaustuerEintrag('spaeter', '', '2026-11-03T10:00:00.000Z'));
  assert.equal(letzterKontakt({ termine: [], leihvorgaenge: [] }, k, '2026-11-08T00:00:00.000Z'), '2026-11-03T10:00:00.000Z');
  assert.equal(v.werbeverbot(k), false);
  k.haustuer.push(v.neuerHaustuerEintrag('werbeverbot', '', '2026-11-05T10:00:00.000Z'));
  assert.equal(v.werbeverbot(k), true);
  assert.equal(v.letzteHaustuer(k).ergebnis, 'werbeverbot');
  assert.ok(kundenVerlauf({ termine: [], leihvorgaenge: [], geraete: [] }, k).some((e) => e.art === 'haustuer' && /Keine Werbung/.test(e.titel)));
  // „Kein Interesse“ an der Tür betrifft nur vermutete Bereiche
  assert.deepEqual(v.haustuerStatus({ pv: 'potenzial', wp: 'interesse', vorwerk: 'unbekannt' }, 'kein_interesse'), { pv: 'kein_interesse', wp: 'interesse', vorwerk: 'unbekannt' });
  assert.deepEqual(v.haustuerStatus({ pv: 'potenzial', wp: 'interesse', vorwerk: 'unbekannt' }, 'gespraech'), { pv: 'potenzial', wp: 'interesse', vorwerk: 'unbekannt' });
  // Papierkorb: Ansprechpartner löschen und wiederherstellen
  const pk = await import('../src/core/papierkorb.ts');
  const d = migrate({ schemaVersion: 9, kunden: [k] });
  const apId = d.kunden[0].ansprechpartner[1].id;
  assert.equal(pk.ansprechpartnerLoeschen(d, 'k1', apId), true);
  assert.equal(d.kunden[0].ansprechpartner.length, 1);
  assert.equal(d.papierkorb[0].typ, 'ansprechpartner');
  assert.equal(pk.eintragTitel(migrate(d).papierkorb[0], d).art, 'Ansprechpartner');
  pk.wiederherstellen(d, d.papierkorb[0].id);
  assert.equal(d.kunden[0].ansprechpartner.length, 2);
});

test('Vertrieb: Terminbestätigung und Nummern für SMS/WhatsApp', async () => {
  const v = await import('../src/core/vertrieb.ts');
  assert.equal(v.waNummer('05344 123456'), '495344123456');
  assert.equal(v.waNummer('+49 170 1112223'), '491701112223');
  assert.equal(v.waNummer('0049 170 1112223'), '491701112223');
  assert.equal(v.waNummer('123'), '');
  assert.equal(v.smsNummer('+49 (170) 111-2223'), '+491701112223');
  assert.match(v.smsUrl('0170 1', 'a b'), /^sms:01701\?&body=a%20b$/);
  assert.match(v.waUrl('0170 1112223', 'Hallo & tschüss'), /^https:\/\/wa\.me\/491701112223\?text=Hallo%20%26%20tsch%C3%BCss$/);
  assert.equal(v.anredeZeile({ anrede: 'frau', vorname: 'Anna', nachname: 'Beispiel' }), 'Guten Tag Frau Beispiel,');
  assert.equal(v.anredeZeile({ anrede: '', vorname: 'Anna', nachname: 'Beispiel' }), 'Guten Tag Anna Beispiel,');
  assert.equal(v.anredeZeile(null), 'Guten Tag,');
  const text = v.terminBestaetigung({ beginn: new Date(2026, 10, 10, 15, 0).toISOString(), sparte: 'pv', dauerMin: 60 }, { anrede: 'Herr', vorname: 'Bernd', nachname: 'Muster' },
    { bereitlegen: v.BEREITLEGEN.pv.slice(0, 2), absender: 'Jan Sperling', ort: 'Lindenweg 6, 38268 Lengede' });
  assert.match(text, /^Guten Tag Herr Muster,/);
  assert.match(text, /Dienstag, 10\.11\.2026 um 15:00 Uhr \(Lindenweg 6, 38268 Lengede\)/);
  assert.match(text, /- die letzte Stromrechnung/);
  assert.match(text, /Viele Grüße\nJan Sperling$/);
  assert.ok(!/Enpal|GALVANY|€/.test(text), 'ohne Anbieternamen und Preise');
  const ohne = v.terminBestaetigung({ beginn: new Date(2026, 10, 10, 15, 0).toISOString(), sparte: '', dauerMin: 60 }, null, { bereitlegen: [] });
  assert.ok(!/bereit/.test(ohne));
});

test('Vertrieb: Tagesroute mit Stopps und Vorschlägen an der Strecke', async () => {
  const v = await import('../src/core/vertrieb.ts');
  const tag = '2026-11-10';
  const um = (h) => new Date(2026, 10, 10, h, 0).toISOString();
  const d = migrate({ schemaVersion: 9,
    kunden: [
      { id: 'a', nachname: 'A', lat: 52.2060, lng: 10.3000 },
      { id: 'b', nachname: 'B', lat: 52.2600, lng: 10.3650 },
      { id: 'mitte', nachname: 'Mitte', lat: 52.2330, lng: 10.3330, status: { pv: 'potenzial' } },
      { id: 'angebot', nachname: 'Angebot', lat: 52.2335, lng: 10.3320, angebote: [{ sparte: 'wp', betrag: 20000 }] },
      { id: 'weit', nachname: 'Weit', lat: 52.4000, lng: 10.6000, status: { pv: 'interesse' } },
      { id: 'kein', nachname: 'Kein', lat: 52.2331, lng: 10.3331, status: { pv: 'potenzial' }, haustuer: [{ ergebnis: 'werbeverbot' }] },
      { id: 'egal', nachname: 'Egal', lat: 52.2332, lng: 10.3332 },
    ],
    termine: [
      { id: 't2', kundeId: 'b', art: 'termin', beginn: um(14) },
      { id: 't1', kundeId: 'a', art: 'termin', beginn: um(9) },
      { id: 'wv', kundeId: 'mitte', art: 'wiedervorlage', beginn: um(11) },
      { id: 'andererTag', kundeId: 'weit', art: 'termin', beginn: new Date(2026, 10, 11, 9).toISOString() },
    ] });
  const st = v.tagesStopps(d, tag);
  assert.deepEqual(st.map((x) => x.termin.id), ['t1', 't2'], 'nur Termine des Tages, zeitlich sortiert');
  assert.deepEqual(st.map((x) => x.nr), [1, 2]);
  assert.ok(v.streckeKm(st) > 5 && v.streckeKm(st) < 10);
  const u = v.unterwegs(d, st, 1500, 15, um(8));
  assert.deepEqual(u.map((x) => x.kunde.id), ['angebot', 'mitte'], 'Angebot zuerst, kein Werbeverbot, nichts Fernes, nichts ohne Anlass');
  assert.equal(u[0].grund, 'Angebot offen');
  const g = v.googleRoute(st);
  assert.match(g, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&origin=52\.206%2C10\.3&destination=52\.26%2C10\.365/);
  assert.ok(!/A|B/.test(g.replace(/api|maps|dir|travelmode|driving|destination|origin|https|www|google|com/g, '')), 'keine Namen in der Route');
  assert.equal(v.googleRoute(st.slice(0, 1)), '');
  assert.ok(v.abstandZurStrecke(52.2330, 10.3330, [52.2060, 10.3000], [52.2600, 10.3650]) < 300);
});

test('Vertrieb: Nachfass-Abstände und Bereitlegen-Listen aus den Einstellungen', async () => {
  const v = await import('../src/core/vertrieb.ts');
  const { normalizeEinstellungen } = await import('../src/core/model.ts');
  // Standard für alte Daten
  const alt = normalizeEinstellungen({});
  assert.deepEqual(alt.nachfassTage, [3, 7]);
  assert.deepEqual(alt.bereitlegen.pv, v.BEREITLEGEN.pv);
  // Bereinigen: ganze Tage 1–90, ohne Doppelte, sortiert, höchstens 6; leer bleibt leer (= aus)
  assert.deepEqual(v.normalizeNachfassTage([14, '3', 3, 0, 91, 2.5, 'x', null, 7]), [3, 7, 14]);
  assert.deepEqual(v.normalizeNachfassTage([]), []);
  assert.deepEqual(v.normalizeNachfassTage('3,7'), [3, 7]);
  assert.equal(v.normalizeNachfassTage([1, 2, 3, 4, 5, 6, 7, 8]).length, v.NACHFASS_MAX);
  assert.equal(v.tageListeText([3, 7]), '3 und 7 Tagen');
  assert.equal(v.tageListeText([2, 5, 10]), '2, 5 und 10 Tagen');
  assert.equal(v.tageListeText([1]), '1 Tag');
  assert.equal(v.tageListeText([]), '');
  // eigene Abstände steuern die Wiedervorlagen
  const a = v.normalizeAngebot({ sparte: 'pv', titel: 'PV', datum: '2026-11-08T12:00:00.000Z' });
  const nf = v.nachfassTermine(a, 'k1', '2026-11-08T13:00:00.000Z', [1, 14]);
  assert.equal(nf.length, 2);
  assert.match(nf[0].notiz, /^1 Tag nach/);
  assert.match(nf[1].notiz, /^14 Tage nach/);
  assert.equal(v.nachfassTermine(a, 'k1', '2026-11-08T13:00:00.000Z', []).length, 0);
  // Bereitlegen: Leerzeilen und Doppelte weg, fehlender Bereich = Standard, leere Liste erlaubt
  const b = v.normalizeBereitlegen({ pv: [' Stromrechnung ', '', 'Stromrechnung', 'Dachplan', 42], wp: [] });
  assert.deepEqual(b.pv, ['Stromrechnung', 'Dachplan', '42']);
  assert.deepEqual(b.wp, []);
  assert.deepEqual(b.vorwerk, v.BEREITLEGEN.vorwerk);
  assert.equal(v.normalizeBereitlegen({ pv: Array.from({ length: 30 }, (_, i) => `P${i}`) }).pv.length, v.BEREITLEGEN_MAX);
  assert.equal(normalizeEinstellungen({ nachfassTage: [5], bereitlegen: { pv: ['X'] } }).nachfassTage[0], 5);
});

test('Klemmbrett: Gerät dalassen zeigt verliehene und freie Vorführgeräte', async () => {
  const kb = await import('../src/core/klemmbrett.ts');
  const data = emptyData();
  data.geraete = [{ id: 'g1', name: 'VK7', aktiv: true }, { id: 'g2', name: 'VR7', aktiv: true }, { id: 'g3', name: 'Alt', aktiv: false }];
  data.leihvorgaenge = [{ id: 'l1', geraetId: 'g1', kundeId: 'k1', ausgabe: '2026-11-08T10:00:00.000Z', rueckgabe: null }];
  const r = kb.geraeteFuerKunde(data, 'k1');
  assert.deepEqual(r.verliehen.map((x) => x.name), ['VK7']);
  assert.deepEqual(r.frei.map((g) => g.id), ['g2'], 'verliehene und ausgemusterte Geräte sind nicht frei');
  assert.equal(kb.geraeteFuerKunde(data, 'k2').verliehen.length, 0);
  const pk = kb.KLEMMBRETT.vorwerk.flatMap((a) => a.punkte).find((p) => p.art === 'antwort' && p.id === 'schritt');
  assert.ok(kb.istGeraetPunkt('vorwerk', pk) && pk.optionen.includes(kb.GERAET_DALASSEN));
  assert.ok(!kb.istGeraetPunkt('pv', pk));
});

test('Namensanzeige und Sortierung nach Nachname', () => {
  try {
    assert.equal(normalizeEinstellungen({}).namensFolge, 'vorname');
    assert.equal(normalizeEinstellungen({}).ortsFolge, 'ort');
    assert.equal(normalizeEinstellungen({ namensFolge: 'nachname', ortsFolge: 'strasse' }).namensFolge, 'nachname');
    assert.equal(normalizeEinstellungen({ namensFolge: 'quatsch' }).namensFolge, 'vorname');
    const k = { vorname: 'Anna', nachname: 'Zander', firma: 'Bäckerei' };
    anzeigeSetzen({ namensFolge: 'vorname' });
    assert.equal(kundenName(k), 'Anna Zander (Bäckerei)');
    anzeigeSetzen({ namensFolge: 'nachname' });
    assert.equal(kundenName(k), 'Zander, Anna (Bäckerei)');
    assert.equal(kundenName({ vorname: 'Anna' }), 'Anna');
    assert.equal(kundenName(k, 'vorname'), 'Anna Zander (Bäckerei)', 'Texte geben die Reihenfolge fest vor');
    // Nachname zählt, egal wie angezeigt wird
    const liste = [
      { vorname: 'Bernd', nachname: 'Müller' }, { vorname: 'Anna', nachname: 'Zander' }, { vorname: 'Zoe', nachname: 'Albers' },
      { strasse: 'Bahnhofstraße 10', plz: '38268', ort: 'Lengede' }, { strasse: 'Bahnhofstraße 2', plz: '38268', ort: 'Lengede' },
      { strasse: 'Am Markt 1', plz: '31224', ort: 'Peine' }, { firma: 'Meyer GmbH' }, { vorname: 'Anton', nachname: 'Müller' },
    ];
    for (const f of ['vorname', 'nachname']) {
      anzeigeSetzen({ namensFolge: f, ortsFolge: 'ort' });
      assert.deepEqual([...liste].sort(kundenVergleich).map((x) => kundenTitel(x, 'strasse')).slice(0, 5).map((t) => t.replace(/^(\S+), (\S+)$/, '$2 $1')),
        ['Zoe Albers', 'Meyer GmbH', 'Anton Müller', 'Bernd Müller', 'Anna Zander']);
    }
    anzeigeSetzen({ ortsFolge: 'ort' });
    assert.deepEqual([...liste].sort(kundenVergleich).slice(5).map((x) => kundenTitel(x)), ['Lengede, Bahnhofstraße 2', 'Lengede, Bahnhofstraße 10', 'Peine, Am Markt 1']);
    anzeigeSetzen({ ortsFolge: 'strasse' });
    assert.deepEqual([...liste].sort(kundenVergleich).slice(5).map((x) => kundenTitel(x)), ['Am Markt 1, 31224 Peine', 'Bahnhofstraße 2, 38268 Lengede', 'Bahnhofstraße 10, 38268 Lengede']);
  } finally {
    anzeigeSetzen(null);
  }
});
