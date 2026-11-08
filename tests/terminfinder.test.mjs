// Unit-Tests: Terminfinder (ab 0.16.0) – Arbeitszeit, feste Zeiten, freie Zeiten, Vorschläge in der Nähe,
// Überschneidungen, Pflichtdatum bei „Termin vereinbart“. Ausführen: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, neuerKunde, neuerTermin, SCHEMA_VERSION } from '../src/core/model.ts';
import {
  normalizeArbeitszeit, normalizeSperrzeit, normalizeSperrzeiten, giltAm, sperrzeitText, freieZeitenAm, belegungAm,
  naheVorschlaege, ueberschneidungen, konfliktText, fahrMinuten, minuten, hhmm, zeitpunkt, tagKey, ARBEITSZEIT,
} from '../src/core/terminfinder.ts';
import { fehlendesTerminDatum, abschlussVorschlag } from '../src/core/verzahnung.ts';
import { speichern, leererVerlauf, leereNotizen } from '../src/core/gespraech.ts';
import { leereAntworten } from '../src/core/klemmbrett.ts';

// Ein fester Montag in der Zukunft relativ zu „jetzt“ der Tests
const MO = '2030-06-03'; // Montag
const JETZT = new Date(2030, 5, 1, 9, 0); // Samstag davor
const daten = (termine = [], sperrzeiten = [], kunden = []) => migrate({ schemaVersion: SCHEMA_VERSION, kunden, termine, einstellungen: { sperrzeiten } });

test('Terminfinder: Schema 13 ergänzt Arbeitszeit und feste Zeiten', () => {
  assert.ok(SCHEMA_VERSION >= 13);
  const d = migrate({ schemaVersion: 12, kunden: [], einstellungen: {} });
  assert.deepEqual(d.einstellungen.arbeitszeit, ARBEITSZEIT);
  assert.deepEqual(d.einstellungen.sperrzeiten, []);
  // Unsinn wird repariert statt verworfen
  assert.deepEqual(normalizeArbeitszeit({ von: '19:00', bis: '07:00', tage: [9, 1, 1, 'x'], pufferMin: 999 }), { tage: [1], von: '08:00', bis: '18:00', pufferMin: 15 });
  assert.equal(normalizeSperrzeit({ titel: 'ohne Datum' }), null);
  assert.equal(normalizeSperrzeiten(Array.from({ length: 150 }, () => ({ datum: MO }))).length, 100);
  const s = normalizeSperrzeit({ datum: MO, wiederholung: 'woechentlich', tage: [], von: '15:00', bis: '14:00' });
  assert.deepEqual(s.tage, [1], 'ohne Tage: Wochentag des Startdatums');
  assert.equal(s.bis, '16:00', '„bis“ vor „von“ wird eine Stunde danach');
  assert.equal(normalizeSperrzeit({ datum: MO, bisDatum: '2030-01-01' }).bisDatum, '', 'Ende vor Anfang fällt weg');
});

test('Terminfinder: Wiederholungen (einmalig, Urlaub, wöchentlich, alle 2 Wochen, Ende)', () => {
  const einmal = normalizeSperrzeit({ datum: MO, wiederholung: 'einmal' });
  assert.equal(giltAm(einmal, MO), true);
  assert.equal(giltAm(einmal, '2030-06-04'), false);
  const urlaub = normalizeSperrzeit({ datum: MO, bisDatum: '2030-06-07', ganztags: true, titel: 'Urlaub' });
  assert.equal(giltAm(urlaub, '2030-06-05'), true);
  assert.equal(giltAm(urlaub, '2030-06-08'), false);
  assert.equal(sperrzeitText(urlaub), '03.06.–07.06. ganztägig');
  const mi = normalizeSperrzeit({ datum: MO, wiederholung: 'woechentlich', tage: [3], von: '14:00', bis: '18:00' });
  assert.equal(giltAm(mi, '2030-06-05'), true);
  assert.equal(giltAm(mi, '2030-06-12'), true);
  assert.equal(giltAm(mi, '2030-06-06'), false);
  assert.equal(giltAm(mi, '2030-05-29'), false, 'vor dem Start nicht');
  assert.equal(sperrzeitText(mi), 'Jede Woche Mi 14:00–18:00');
  const zwei = normalizeSperrzeit({ datum: MO, wiederholung: 'zweiwoechentlich', tage: [5], bisDatum: '2030-07-31' });
  assert.equal(giltAm(zwei, '2030-06-07'), true);
  assert.equal(giltAm(zwei, '2030-06-14'), false);
  assert.equal(giltAm(zwei, '2030-06-21'), true);
  assert.equal(giltAm(zwei, '2030-08-02'), false, 'nach dem Ende nicht');
});

test('Terminfinder: freie Zeiten sparen Termine (mit Puffer) und feste Zeiten aus, Wiedervorlagen nicht', () => {
  const d = daten([
    neuerTermin({ art: 'termin', beginn: zeitpunkt(MO, 10 * 60), dauerMin: 60, titel: 'A' }),
    neuerTermin({ art: 'wiedervorlage', beginn: zeitpunkt(MO, 15 * 60), dauerMin: 60, titel: 'Anruf' }),
  ], [{ datum: MO, von: '13:00', bis: '14:00', titel: 'Mittag' }]);
  const frei = freieZeitenAm(d, MO, 60, JETZT);
  assert.deepEqual(frei.map((l) => [hhmm(l.vonMin), hhmm(l.bisMin)]), [['08:00', '09:45'], ['11:15', '13:00'], ['14:00', '18:00']]);
  assert.deepEqual(freieZeitenAm(d, MO, 120, JETZT).map((l) => hhmm(l.vonMin)), ['14:00'], 'nur Lücken, in die die Dauer passt');
  assert.deepEqual(freieZeitenAm(d, '2030-06-08', 60, JETZT), [], 'Samstag ist kein Arbeitstag');
  assert.deepEqual(freieZeitenAm(d, '2030-05-27', 60, JETZT), [], 'Vergangenheit hat keine freien Zeiten');
  // Heute: erst ab jetzt (aufs Raster aufgerundet)
  const heute = freieZeitenAm(d, MO, 30, new Date(2030, 5, 3, 8, 50));
  assert.equal(hhmm(heute[0].vonMin), '09:00');
  const b = belegungAm(d, MO);
  assert.deepEqual(b.map((x) => x.art), ['termin', 'sperre', 'wiedervorlage']);
});

test('Terminfinder: Vorschläge direkt vor/nach Terminen in der Nähe', () => {
  const ziel = neuerKunde({ nachname: 'Neu', ort: 'Lengede', lat: 52.2061, lng: 10.3002 });
  const nah = neuerKunde({ nachname: 'Müller', ort: 'Lengede', lat: 52.2150, lng: 10.3100 }); // gut 1 km
  const weit = neuerKunde({ nachname: 'Fern', ort: 'Hannover', lat: 52.3759, lng: 9.7320 }); // > 40 km
  const d = daten([
    neuerTermin({ art: 'termin', kundeId: nah.id, beginn: zeitpunkt(MO, 9 * 60), dauerMin: 90, titel: 'PV Müller' }),
    neuerTermin({ art: 'termin', kundeId: weit.id, beginn: zeitpunkt('2030-06-04', 10 * 60), dauerMin: 60, titel: 'Fern' }),
  ], [], [ziel, nah, weit]);
  const v = naheVorschlaege(d, { lat: ziel.lat, lng: ziel.lng, kundeId: ziel.id }, { dauerMin: 60, jetzt: JETZT });
  assert.ok(v.length >= 1, 'mindestens ein Vorschlag');
  assert.ok(v.every((x) => tagKey(x.beginn) === MO), 'nur am Tag mit dem nahen Termin');
  const nach = v.find((x) => x.lage === 'nach');
  assert.equal(hhmm(new Date(nach.beginn).getHours() * 60 + new Date(nach.beginn).getMinutes()), '10:45', '10:30 Ende + 15 Min. Puffer');
  assert.match(nach.grund, /^nach 09:00–10:30 Müller \(Lengede\)$/);
  assert.ok(nach.abstandM > 500 && nach.abstandM < 2000);
  // Davor passt nicht (Arbeitszeit beginnt 8:00, 60 Min. + Puffer vor 9:00 → 7:45)
  assert.equal(v.some((x) => x.lage === 'vor'), false);
  // Ohne Standort keine Vorschläge
  assert.deepEqual(naheVorschlaege(d, { lat: null, lng: null }, { dauerMin: 60, jetzt: JETZT }), []);
  // Der Kunde selbst zählt nicht als „in der Nähe“
  assert.deepEqual(naheVorschlaege(d, { lat: nah.lat, lng: nah.lng, kundeId: nah.id }, { dauerMin: 60, jetzt: JETZT, maxKm: 0.5 }), []);
  assert.equal(fahrMinuten(100), 5);
  assert.equal(fahrMinuten(10000), 20);
});

test('Terminfinder: Überschneidungen und Arbeitszeit-Hinweis', () => {
  const t = neuerTermin({ art: 'termin', beginn: zeitpunkt(MO, 10 * 60), dauerMin: 60, titel: 'Kunde A' });
  const d = daten([t], [{ datum: MO, wiederholung: 'woechentlich', tage: [1], von: '16:00', bis: '18:00', titel: 'Privat' }]);
  assert.deepEqual(ueberschneidungen(d, zeitpunkt(MO, 11 * 60), 60), [], 'direkt danach ist keine Überschneidung');
  const k = ueberschneidungen(d, zeitpunkt(MO, 10 * 60 + 30), 60);
  assert.equal(k.length, 1);
  assert.equal(konfliktText(k), 'Achtung: überschneidet sich mit 10:00–11:00 Kunde A.');
  assert.deepEqual(ueberschneidungen(d, zeitpunkt(MO, 10 * 60 + 30), 60, t.id), [], 'beim Verschieben zählt der Termin selbst nicht');
  assert.match(konfliktText(ueberschneidungen(d, zeitpunkt(MO, 17 * 60), 120)), /Privat.*außerhalb deiner Arbeitszeit/);
  assert.equal(minuten('24:00'), 1440);
  assert.equal(minuten('25:00'), null);
});

test('Verzahnung: „Termin vereinbart“ braucht ein Datum, Klemmbrett schätzt keins mehr', () => {
  const a = leereAntworten();
  a.pv.schritt = 'Vor-Ort-Termin';
  assert.deepEqual(abschlussVorschlag('pv', a), { ausgang: 'termin', tage: null, schritt: 'Vor-Ort-Termin' });
  const ab = [{ sparte: 'pv', ausgang: 'termin', wv: null }, { sparte: 'wp', ausgang: 'angebot', wv: null }];
  assert.equal(fehlendesTerminDatum(ab).sparte, 'pv');
  assert.equal(fehlendesTerminDatum(ab, false), null, 'nicht erreicht: keine Pflicht');
  assert.equal(fehlendesTerminDatum([{ ...ab[0], datumOffen: true }]), null);
  assert.equal(fehlendesTerminDatum([{ ...ab[0], wv: '2030-06-03T08:00:00.000Z' }]), null);
});

test('Gespräch speichern: vereinbarter Termin mit Dauer; „Datum noch offen“ wird Wiedervorlage', () => {
  const k = neuerKunde({ nachname: 'Termin' });
  const d = migrate({ schemaVersion: SCHEMA_VERSION, kunden: [k] });
  const e = { kundeId: k.id, start: new Date().toISOString(), kontaktart: 'telefon', erreicht: true, sparten: ['pv', 'wp'], notiz: leereNotizen(), verlauf: leererVerlauf(), leitfadenSparte: 'pv', antworten: leereAntworten() };
  speichern(d, e, [
    { sparte: 'pv', ausgang: 'termin', status: 'termin', schritt: 'Vor-Ort-Termin', wv: zeitpunkt(MO, 10 * 60), dauerMin: 90 },
    { sparte: 'wp', ausgang: 'termin', status: 'termin', schritt: '', wv: zeitpunkt(MO, 8 * 60), datumOffen: true },
  ]);
  const pv = d.termine.find((t) => t.sparte === 'pv');
  assert.equal(pv.art, 'termin');
  assert.equal(pv.dauerMin, 90);
  const wp = d.termine.find((t) => t.sparte === 'wp');
  assert.equal(wp.art, 'wiedervorlage');
  assert.match(wp.titel, /^Termin-Datum klären – Wärmepumpe/);
});
