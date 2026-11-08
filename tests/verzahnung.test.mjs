// Unit-Tests: Verzahnung der Abläufe (ab 0.14.0). Ausführen: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, neuerKunde, neuerTermin, normalizeTermin, SCHEMA_VERSION } from '../src/core/model.ts';
import { abschlussVorschlag, statusFuerAusgang, querverkauf, naechsterStopp, kontaktartFuerTermin, spartenFuerTermin, widerrufWiedervorlage, offeneAngeboteBereich } from '../src/core/verzahnung.ts';
import { speichern, leererVerlauf, leereNotizen } from '../src/core/gespraech.ts';
import { leereAntworten } from '../src/core/klemmbrett.ts';
import { nachfassTermine, neuesAngebot, offeneNachfass } from '../src/core/vertrieb.ts';

test('Verzahnung: „Vereinbart“ stellt Ergebnis und Wiedervorlage vor', () => {
  const a = leereAntworten();
  a.pv.schritt = 'Angebot rechnen';
  assert.deepEqual(abschlussVorschlag('pv', a), { ausgang: 'angebot', tage: 3, schritt: 'Angebot rechnen' });
  a.wp.schritt = 'Vor-Ort-Check, Später melden';
  assert.equal(abschlussVorschlag('wp', a).ausgang, 'termin', 'die erste bekannte Antwort zählt');
  a.vorwerk.schritt = 'Bestellung';
  assert.deepEqual(abschlussVorschlag('vorwerk', a), { ausgang: 'abschluss', tage: null, schritt: 'Bestellung' });
  assert.deepEqual(abschlussVorschlag('pv', leereAntworten()), { ausgang: '', tage: null, schritt: '' }, 'ohne Antwort kein Vorschlag');
  // Nicht erreicht: morgen noch einmal
  assert.deepEqual(abschlussVorschlag('pv', a, false), { ausgang: '', tage: 1, schritt: 'Noch einmal versuchen' });
  // Partner fehlt, nichts vereinbart: Termin mit beiden
  const b = leereAntworten();
  b.pv.entscheider = 'Partner fehlt';
  assert.deepEqual(abschlussVorschlag('pv', b), { ausgang: 'termin', tage: 7, schritt: 'Termin mit beiden Entscheidern' });
  // Freitext ohne bekannte Option: Text bleibt, kein Ergebnis
  const c = leereAntworten();
  c.pv.schritt = 'ruft nach dem Urlaub an';
  assert.deepEqual(abschlussVorschlag('pv', c), { ausgang: '', tage: null, schritt: 'ruft nach dem Urlaub an' });
});

test('Verzahnung: Status folgt dem Ergebnis, hebt aber nie ab', () => {
  assert.equal(statusFuerAusgang('abschluss', 'interesse'), 'abschluss');
  assert.equal(statusFuerAusgang('kein', 'angebot'), 'kein_interesse');
  assert.equal(statusFuerAusgang('termin', 'potenzial'), 'termin');
  assert.equal(statusFuerAusgang('termin', 'angebot'), 'angebot', 'Angebot bleibt Angebot');
  assert.equal(statusFuerAusgang('angebot', 'unbekannt'), 'interesse');
  assert.equal(statusFuerAusgang('wiedervorlage', 'kein_interesse'), 'interesse', 'neues Interesse nach Absage');
  assert.equal(statusFuerAusgang('', 'termin'), 'termin');
});

test('Verzahnung: Chancen im anderen Bereich aus den Antworten', () => {
  const k = neuerKunde({ nachname: 'Q' });
  const a = leereAntworten();
  a.wp.pv = 'Geplant';
  assert.deepEqual(querverkauf(k, a, ['wp']).map((q) => q.sparte), ['pv']);
  assert.deepEqual(querverkauf(k, a, ['wp', 'pv']), [], 'schon besprochen');
  k.status.pv = 'interesse';
  assert.deepEqual(querverkauf(k, a, ['wp']), [], 'läuft schon');
  const b = leereAntworten();
  b.pv.anlass = 'Stromrechnung, Neue Heizung';
  assert.deepEqual(querverkauf(neuerKunde({}), b, ['pv']).map((q) => q.sparte), ['wp']);
});

test('Verzahnung: Gespräch aus einem Termin hakt den Termin ab', () => {
  const d = migrate({ schemaVersion: SCHEMA_VERSION, kunden: [neuerKunde({ id: 'k1', nachname: 'T' })] });
  const t = neuerTermin({ kundeId: 'k1', art: 'termin', sparte: 'wp', titel: 'Vor-Ort', beginn: '2026-11-08T10:00:00.000Z' });
  const fremd = neuerTermin({ kundeId: 'k1', art: 'termin', titel: 'Anderer', beginn: '2026-11-09T10:00:00.000Z' });
  d.termine.push(t, fremd);
  assert.equal(kontaktartFuerTermin(t), 'hausbesuch');
  assert.equal(kontaktartFuerTermin({ art: 'wiedervorlage' }), 'telefon');
  assert.deepEqual(spartenFuerTermin(t), ['wp']);
  assert.equal(spartenFuerTermin({ sparte: '' }), null);
  const e = { kundeId: 'k1', start: '2026-11-08T10:00:00.000Z', kontaktart: 'hausbesuch', erreicht: true, sparten: ['wp'], notiz: { ...leereNotizen(), wp: 'Gut gelaufen' }, verlauf: leererVerlauf(), leitfadenSparte: 'wp', antworten: leereAntworten(), terminId: t.id };
  speichern(d, e, [{ sparte: 'wp', ausgang: 'termin', status: 'termin', schritt: '', wv: null }]);
  assert.equal(d.termine.find((x) => x.id === t.id).erledigt, true);
  assert.equal(d.termine.find((x) => x.id === fremd.id).erledigt, false, 'andere Termine bleiben offen');
});

test('Verzahnung: nächster Stopp des Tages', () => {
  const jetzt = new Date(2026, 10, 9, 11, 0);
  const at = (h, m = 0) => new Date(2026, 10, 9, h, m).toISOString();
  const termine = [
    normalizeTermin({ id: 'a', kundeId: 'x', art: 'termin', beginn: at(9), dauerMin: 60 }),
    normalizeTermin({ id: 'b', kundeId: 'hier', art: 'termin', beginn: at(12) }),
    normalizeTermin({ id: 'c', kundeId: 'y', art: 'wiedervorlage', beginn: at(12, 30) }),
    normalizeTermin({ id: 'd', kundeId: 'z', art: 'termin', beginn: at(14) }),
    normalizeTermin({ id: 'e', kundeId: 'z', art: 'termin', beginn: new Date(2026, 10, 10, 9).toISOString() }),
  ];
  assert.equal(naechsterStopp({ termine }, jetzt, 'hier')?.id, 'd');
  assert.equal(naechsterStopp({ termine }, jetzt, '')?.id, 'b');
  assert.equal(naechsterStopp({ termine: termine.slice(0, 1) }, jetzt, ''), null, 'vorbei');
});

test('Verzahnung: Wiedervorlagen mit Bezug (Schema 10)', () => {
  assert.equal(SCHEMA_VERSION, 10);
  assert.deepEqual(normalizeTermin({}).bezug, { art: '', id: '' });
  assert.deepEqual(normalizeTermin({ bezug: { art: 'leihe', id: 'L1' } }).bezug, { art: 'leihe', id: 'L1' });
  assert.deepEqual(normalizeTermin({ bezug: { art: 'quatsch', id: 'L1' } }).bezug, { art: '', id: '' });
  // Nachfassen bekommt den Bezug zum Angebot; offeneNachfass findet es auch nach geändertem Titel
  const a = neuesAngebot({ sparte: 'pv', titel: 'PV 9 kWp', datum: '2026-11-01T12:00:00.000Z' });
  const nf = nachfassTermine(a, 'k1', '2026-11-01T13:00:00.000Z', [3]).map(neuerTermin);
  assert.deepEqual(nf[0].bezug, { art: 'angebot', id: a.id });
  nf[0].titel = 'Von Hand umbenannt';
  assert.equal(offeneNachfass(nf, 'k1', a).length, 1);
  // Migration 9 → 10: Bezug über den Titel nachtragen
  const d = migrate({
    schemaVersion: 9,
    kunden: [{ id: 'k1', nachname: 'M', angebote: [{ id: 'an1', sparte: 'pv', titel: 'PV 9 kWp', datum: '2026-11-01T12:00:00.000Z' }] }],
    geraete: [{ id: 'g1', name: 'Kobold VK7' }],
    leihvorgaenge: [{ id: 'l1', geraetId: 'g1', kundeId: 'k1', ausgabe: '2026-11-01T12:00:00.000Z' }],
    termine: [
      { id: 't1', kundeId: 'k1', sparte: 'pv', art: 'wiedervorlage', titel: 'Angebot nachfassen: PV 9 kWp' },
      { id: 't2', kundeId: 'k1', sparte: 'vorwerk', art: 'wiedervorlage', titel: 'Nachfragen: Kobold VK7 bei M' },
      { id: 't3', kundeId: 'k1', art: 'wiedervorlage', titel: 'Irgendwas' },
    ],
  });
  assert.deepEqual(d.termine.map((t) => t.bezug), [{ art: 'angebot', id: 'an1' }, { art: 'leihe', id: 'l1' }, { art: '', id: '' }]);
});

test('Verzahnung: Widerrufsfrist und offene Angebote je Bereich', () => {
  const w = widerrufWiedervorlage('k1', 'wp', '2026-11-08T12:00:00.000Z');
  assert.equal(w.art, 'wiedervorlage');
  assert.ok(w.beginn.startsWith('2026-11-23'), w.beginn);
  const k = neuerKunde({ angebote: [{ sparte: 'pv', status: 'offen' }, { sparte: 'pv', status: 'abgelehnt' }, { sparte: 'wp', status: 'offen' }] });
  assert.equal(offeneAngeboteBereich(k, 'pv').length, 1);
});
