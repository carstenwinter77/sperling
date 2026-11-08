// Unit-Tests: Produkte aus der Produktübersicht als Vorlage für den eigenen Bestand. Ausführen: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { katalogPruefen } from '../src/core/produkte.ts';
import { bestandArtFuer, bestandArtVorschlag, passtZuArt, lieferumfang, einheitFuer, geraetVorlage, materialVorlage, imBestand } from '../src/core/bestandvorlage.ts';

const kat = katalogPruefen(JSON.parse(fs.readFileSync(new URL('../src/data/produkte.json', import.meta.url), 'utf8')));
const p = (id) => { const x = kat.produkte.find((y) => y.id === id); assert.ok(x, `Produkt ${id} fehlt im Katalog`); return x; };

test('Bestand: welche Produkte wohin passen', () => {
  assert.equal(bestandArtFuer(p('vorwerk-vm7')), 'geraet');
  assert.equal(bestandArtFuer(p('vorwerk-koboclean-universal-500ml')), 'material');
  for (const x of kat.produkte) {
    const a = bestandArtFuer(x);
    if (x.bereich !== 'vorwerk') assert.equal(a, null, `${x.id}: Enpal/GALVANY haben keinen Bestand`);
    if (x.kategorie === 'service' || x.kategorie === 'finanzierung') assert.equal(a, null, `${x.id}: Service gehört nicht in den Bestand`);
    if (x.kategorie === 'set' || x.kategorie === 'aufsatz-zubehoer') assert.equal(a, 'beides');
  }
  assert.equal(bestandArtFuer(null), null);
  assert.equal(bestandArtVorschlag({ kategorie: 'set' }), 'geraet');
  assert.equal(bestandArtVorschlag({ kategorie: 'aufsatz-zubehoer' }), 'material');
  assert.equal(passtZuArt(p('vorwerk-vm7'), 'material'), false);
  assert.equal(passtZuArt(p('vorwerk-vm7'), 'geraet'), true);
  // Jedes Vorwerk-Gerät ist in der Suche „Neues Vorführgerät“ zu finden
  assert.ok(kat.produkte.filter((x) => passtZuArt(x, 'geraet')).length >= 10);
});

test('Bestand: Vorlage übernimmt Name, Produktbezug, Zubehör und Einheit', () => {
  const g = geraetVorlage(p('vorwerk-vm7'));
  assert.equal(g.name, 'Kobold VM7 Akku-Handstaubsauger');
  assert.equal(g.produktId, 'vorwerk-vm7');
  const mitLieferumfang = kat.produkte.find((x) => x.bereich === 'vorwerk' && x.technischeDaten.some((t) => t.bezeichnung === 'Lieferumfang'));
  assert.ok(mitLieferumfang);
  assert.ok(geraetVorlage(mitLieferumfang).zubehoer.length > 0, 'Lieferumfang kommt ins Zubehör');
  assert.equal(lieferumfang({ technischeDaten: [] }), '');
  const m = materialVorlage(p('vorwerk-koboclean-universal-500ml'));
  assert.deepEqual({ einheit: m.einheit, bestand: m.bestand, produktId: m.produktId }, { einheit: 'Flasche', bestand: 1, produktId: 'vorwerk-koboclean-universal-500ml' });
  assert.equal(einheitFuer({ name: 'Kobold FP7 Premium-Filtertüten (12 Stk.)', technischeDaten: [] }), 'Packung');
  assert.equal(einheitFuer({ name: 'Kobold HD7 Hartbodendüse', technischeDaten: [] }), 'Stück');
});

test('Bestand: zählt, was schon da ist (nur aktive)', () => {
  const d = {
    geraete: [{ produktId: 'a', aktiv: true }, { produktId: 'a', aktiv: false }, { produktId: 'b', aktiv: true }],
    material: [{ produktId: 'a', aktiv: true, bestand: 3, einheit: 'Stück' }, { produktId: 'a', aktiv: false, bestand: 9, einheit: 'Stück' }],
  };
  assert.deepEqual(imBestand(d, 'a'), { geraete: 1, material: 1, stueck: 3 });
  assert.deepEqual(imBestand(d, ''), { geraete: 0, material: 0, stueck: 0 });
  assert.deepEqual(imBestand({}, 'a'), { geraete: 0, material: 0, stueck: 0 });
});
