// End-to-End-Test im echten Browser (Playwright). Start: python3 -m http.server 8765 & node tests/e2e.cjs
const { chromium } = require('playwright');
const BASE = process.env.SPERLING_URL || 'http://localhost:8765/';
const fail = (m) => { console.error('FEHLER:', m); process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + (process.env.STACK ? e.stack : '')));
  p.on('dialog', (d) => { errs.push('Natives Dialogfenster: ' + d.message()); d.dismiss(); });
  await p.goto(BASE);
  // Einrichten
  await p.fill('input[name=pw]', 'testpasswort');
  await p.fill('input[name=pw2]', 'testpasswort');
  await p.click('#sperrForm button');
  await p.waitForSelector('.hauptnav');
  // Willkommen beim ersten Start: „Später“ schließt und merkt es sich
  await p.waitForSelector('#tour [data-tour=spaeter]');
  await p.click('#tour [data-tour=spaeter]');
  await p.waitForFunction(() => !document.querySelector('#tour') && /Hilfe/.test(document.querySelector('#toast')?.textContent || ''));
  // Abgleich-Leiste nach dem Start, schließbar
  await p.waitForSelector('#abgleichLeiste [data-abgleich=holen]');
  await p.click('#abgleichLeiste [data-abgleich=zu]');
  if (await p.$('#abgleichLeiste')) fail('Abgleich-Leiste lässt sich nicht schließen');
  // Kunde mit XSS-Namen anlegen
  await p.goto(BASE + '#/kunden');
  await p.click('#neu');
  await p.waitForSelector('[data-feld="vorname"]');
  await p.fill('[data-feld="vorname"]', '<img src=x onerror="window.__xss=1">');
  await p.fill('[data-feld="nachname"]', 'Prüfer');
  await p.selectOption('[data-feld="status.pv"]', 'interesse');
  await p.waitForTimeout(500);
  // Notiz mit manuellem Zeitstempel
  await p.click('button[data-tab=notizen]');
  await p.fill('#notizForm textarea', 'Testnotiz Wärmepumpe');
  await p.check('#notizForm input[value=wp]');
  await p.fill('#notizForm input[name=zeitpunkt]', '2026-01-15T09:30');
  await p.click('#notizForm button.primary');
  await p.waitForSelector('.notizliste li');
  const zeit = await p.textContent('.notizliste time');
  if (!zeit.includes('15.01.2026 09:30')) fail('Zeitstempel falsch: ' + zeit);
  // Termin
  await p.click('button[data-tab=termine]');
  await p.click('#neu');
  await p.fill('dialog input[name=titel]', 'Rückruf');
  await p.click('dialog button.primary');
  await p.waitForSelector('.terminliste li');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.terminliste [data-aktion=ics]')]);
  const ics = require('fs').readFileSync(await dl.path(), 'utf8');
  if (!ics.includes('SUMMARY:Rückruf')) fail('ICS ohne Titel');
  // Texte getrennt
  await p.click('button[data-tab=texte]');
  const vw = await p.inputValue('#text-vorwerk');
  if (vw.includes('Testnotiz')) fail('WP-Notiz im Vorwerk-Text!');
  if (!(await p.inputValue('#text-wp')).includes('Testnotiz')) fail('WP-Notiz fehlt im Wärmepumpen-Text');
  if ((await p.inputValue('#text-pv')).includes('Testnotiz')) fail('WP-Notiz im Photovoltaik-Text (R-TEXT)');
  // Enpal-Doku im echten Modus
  await p.click('button[data-tab=doku]');
  await p.click('[data-neu=hausbesuch]');
  await p.fill('dialog [name=notiz]', 'Dach besichtigt <b>fett</b>');
  await p.selectOption('dialog [name=ergebnis]', 'angebot');
  await p.click('dialog button.primary');
  await p.waitForSelector('.doku-text');
  const doku = await p.inputValue('.doku-text');
  if (!doku.includes('Hausbesuch') || !doku.includes('Dach besichtigt')) fail('Enpal-Doku-Text unvollständig');
  if (/vorwerk/i.test(doku)) fail('Vorwerk in Enpal-Doku!');
  await p.click('dialog .dlg-actions button.ghost');
  // Gesprächsleitfaden speichern (Telefon) -> zweiter Doku-Eintrag
  const kid = (await p.evaluate(() => location.hash)).split('/')[2].split('?')[0];
  await p.goto(BASE + '#/gespraech?kunde=' + kid);
  await p.waitForSelector('#gKontaktart');
  await p.selectOption('#gKontaktart', 'telefon');
  await p.selectOption('[data-abschluss] [name=ausgang]', 'termin');
  await p.click('#gSpeichernKnopf');
  await p.waitForTimeout(500);
  // Karte: Adresssuche (Adressdienst gemockt); Kundennamen dürfen nie an den Dienst gehen
  const anfragen = [];
  await p.route(/nominatim\.openstreetmap\.org/, (r) => { anfragen.push(r.request().url()); r.fulfill({ contentType: 'application/json', body: r.request().url().includes('/search') ? JSON.stringify([{ lat: '52.3768', lon: '9.7335', address: { road: 'Lindenweg', house_number: '4', postcode: '30159', city: 'Hannover' } }]) : '{}' }); });
  await p.goto(BASE + '#/karte');
  await p.waitForSelector('#suche input');
  await p.fill('#suche input', 'Prüfer');
  await p.click('#suche button[type=submit]');
  await p.waitForTimeout(400);
  if (anfragen.some((u) => u.includes('Pr%C3%BCfer'))) fail('Kundenname an Adressdienst gesendet!');
  await p.fill('#suche input', 'Lindenweg 4 Hannover');
  await p.click('#suche button[type=submit]');
  await p.waitForSelector('#neuPopup');
  await p.unroute(/nominatim\.openstreetmap\.org/);
  // Kartenfilter mit Mehrfachauswahl
  await p.click('#fKnopf');
  await p.click('[data-f-sparte=pv]');
  await p.click('[data-f-sparte=vorwerk]');
  if (!/von/.test(await p.textContent('#fAnzahl'))) fail('Kartenfilter zeigt keine Anzahl');
  await p.click('#fPanel [data-f-alle]');
  if ((await p.textContent('#fAnzahl')).trim()) fail('Kartenfilter nicht zurückgesetzt');
  // Sperren und Neuladen
  await p.click('#sperren');
  await p.waitForSelector('#sperrForm');
  await p.reload();
  await p.fill('input[name=pw]', 'falsch');
  await p.click('#sperrForm button');
  await p.waitForFunction(() => document.querySelector('#sperrFehler')?.textContent.includes('Falsches'));
  await p.fill('input[name=pw]', 'testpasswort');
  await p.click('#sperrForm button');
  await p.waitForSelector('.hauptnav');
  await p.goto(BASE + '#/kunden');
  await p.waitForSelector('#liste .zeile');
  const liste = await p.textContent('#liste');
  if (!liste.includes('Prüfer')) fail('Kunde nach Neuladen weg');
  await p.click('#liste .zeile');
  await p.click('button[data-tab=doku]');
  await p.waitForSelector('.doku-liste');
  if ((await p.locator('.doku-liste > li').count()) !== 2) fail('Enpal-Doku nach Neuladen nicht vollständig');
  if (await p.evaluate(() => window.__xss)) fail('XSS ausgeführt!');
  // Kundenfotos: zwei Fotos zu Photovoltaik, Vorschau, Vollansicht mit Zoom
  {
    const fs = require('fs'); const os = require('os'); const path = require('path');
    const bild1 = path.join(os.tmpdir(), 'sperling-test-1.png'); const bild2 = path.join(os.tmpdir(), 'sperling-test-2.png');
    fs.writeFileSync(bild1, await p.screenshot({ clip: { x: 0, y: 0, width: 400, height: 300 } }));
    fs.writeFileSync(bild2, await p.screenshot({ clip: { x: 100, y: 100, width: 300, height: 400 } }));
    await p.click('button[data-tab=fotos]');
    await p.waitForSelector('[data-foto-sparte=pv]');
    await p.setInputFiles('input[data-foto-neu=pv][multiple]', [bild1, bild2]);
    await p.waitForFunction(() => document.querySelectorAll('[data-foto-sparte=pv] .foto-kachel img').length === 2, null, { timeout: 15000 });
    if (await p.$('[data-foto-sparte=wp] .foto-kachel')) fail('Foto in falscher Sparte');
    await p.click('[data-foto-sparte=pv] .foto-kachel');
    await p.waitForFunction(() => { const i = document.querySelector('#fotoVoll img'); return i && i.complete && i.naturalWidth > 0; });
    await p.click('#fotoVoll [data-fv=ein]');
    if (!(await p.getAttribute('#fotoVoll img', 'style')).includes('scale(1.5)')) fail('Zoom in der Vollansicht wirkt nicht');
    await p.keyboard.press('ArrowRight');
    await p.waitForFunction(() => document.querySelector('#fotoVoll .fv-titel')?.textContent.includes('2 von 2'));
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.querySelector('#fotoVoll'));
    // Speicher: Klartext-Bild darf nicht in IndexedDB stehen (nur verschlüsselte Bytes)
    const klar = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('sperling'); r.onsuccess = () => { const g = r.result.transaction('fotos').objectStore('fotos').getAll(); g.onsuccess = () => res(g.result.map((x) => new Uint8Array(x.ct).slice(0, 3).join(','))); }; }));
    if (klar.length !== 2 || klar.some((x) => x === '255,216,255')) fail('Fotos nicht verschlüsselt gespeichert');
  }
  // Backup herunterladen, Klartext darf nicht drin sein
  await p.goto(BASE + '#/einstellungen?bereich=sicherung');
  const [bk] = await Promise.all([p.waitForEvent('download'), p.click('#backup')]);
  const bkTxt = require('fs').readFileSync(await bk.path(), 'utf8');
  if (bkTxt.includes('Prüfer') || bkTxt.includes('Testnotiz')) fail('Backup enthält Klartext!');
  // iCloud-Sicherung (Headless: kein Teilen-Menü -> Download-Ausweg)
  await p.click('#icloud');
  await p.waitForSelector('dialog');
  const [ic] = await Promise.all([p.waitForEvent('download'), p.click('dialog button.primary')]);
  const icPfad = await ic.path();
  const icTxt = require('fs').readFileSync(icPfad, 'utf8');
  if (icTxt.includes('Prüfer') || icTxt.includes('Dach besichtigt')) fail('iCloud-Sicherung enthält Klartext!');
  if ((JSON.parse(icTxt).fotos || []).length !== 2) fail('Fotos fehlen in der iCloud-Sicherung');
  if (icTxt.includes('"ct":"/9j/')) fail('Foto in der Sicherung unverschlüsselt');
  await p.waitForFunction(() => document.querySelector('#letzteSicherung')?.textContent.includes('Letzte Sicherung'));
  // Sicherung wieder einspielen
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#import')]);
  await fc.setFiles(icPfad);
  await p.fill('dialog [name=pw]', 'testpasswort');
  await p.click('dialog button.primary');
  await p.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('eingespielt'));
  // Abgleich mit derselben Datei: nichts zu tun
  await p.goto(BASE + '#/einstellungen?bereich=sicherung');
  const [ab] = await Promise.all([p.waitForEvent('filechooser'), p.click('#abgleichHolen')]);
  await ab.setFiles(icPfad);
  await p.waitForFunction(() => /Schon aktuell|schon aktueller/.test(document.querySelector('#toast')?.textContent || ''));
  // Zweites Gerät: beim ersten Start aus der Sicherung übernehmen, ohne neues Passwort
  {
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p2 = await ctx2.newPage();
    p2.on('pageerror', (e) => errs.push('Gerät 2: ' + e.message));
    await p2.goto(BASE);
    const [fc2] = await Promise.all([p2.waitForEvent('filechooser'), p2.click('#ausSicherung')]);
    await fc2.setFiles(icPfad);
    await p2.fill('dialog [name=pw]', 'falschespasswort');
    await p2.click('dialog button.primary');
    await p2.waitForFunction(() => (document.querySelector('#toast')?.textContent || '').includes('Falsches Passwort'));
    await p2.fill('dialog [name=pw]', 'testpasswort');
    await p2.click('dialog button.primary');
    await p2.waitForSelector('.hauptnav');
    if (await p2.$('#abgleichLeiste')) fail('Nach dem Übernehmen gleich wieder gefragt');
    await p2.goto(BASE + '#/kunden');
    await p2.waitForSelector('#liste');
    if (!(await p2.textContent('#liste')).includes('Prüfer')) fail('Übernahme auf zweitem Gerät ohne Kunden');
    await p2.click('#liste a.zeile:has-text("Prüfer")');
    await p2.click('button[data-tab=fotos]');
    await p2.waitForFunction(() => [...document.querySelectorAll('[data-foto-sparte=pv] .foto-kachel img')].filter((i) => i.complete && i.naturalWidth > 0).length === 2, null, { timeout: 15000 })
      .catch(() => fail('Fotos auf dem zweiten Gerät nicht lesbar'));
    // Handy: Einstellungen als Übersicht, Bereich als Unterseite mit Zurück
    await p2.goto(BASE + '#/einstellungen');
    await p2.waitForSelector('.einst-gruppe');
    if (await p2.isVisible('#absender')) fail('Handy: Einstellungen zeigen schon Inhalt statt Übersicht');
    await p2.click('[data-gruppe-link=sicherung]');
    await p2.waitForSelector('#icloud', { state: 'visible' });
    if (await p2.isVisible('.einst-gruppe')) fail('Handy: Bereichsliste bleibt in der Unterseite sichtbar');
    await p2.click('.einst-zurueck');
    await p2.waitForSelector('.einst-gruppe', { state: 'visible' });
    await ctx2.close();
  }
  // Einstellungen sichern (ohne Kunden, verschlüsselt), ändern, wieder einlesen
  await p.goto(BASE + '#/einstellungen?bereich=allgemein');
  await p.selectOption('#kalenderStart', 'woche');
  await p.click('[data-gruppe-link=sicherung]');
  await p.click('summary:has-text("Nur Einstellungen übertragen")');
  await p.click('#einstExport');
  await p.waitForSelector('dialog');
  const [es] = await Promise.all([p.waitForEvent('download'), p.click('dialog button.primary')]);
  const esPfad = await es.path();
  const esTxt = require('fs').readFileSync(esPfad, 'utf8');
  if (esTxt.includes('Prüfer') || esTxt.includes('woche') || !esTxt.includes('"ct"')) fail('Einstellungsdatei nicht verschlüsselt');
  await p.click('[data-gruppe-link=allgemein]');
  await p.selectOption('#kalenderStart', 'tag');
  await p.click('[data-gruppe-link=sicherung]');
  if (!(await p.isVisible('#einstImport'))) fail('Aufgeklapptes bleibt beim Bereichswechsel nicht offen');
  const [efc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#einstImport')]);
  await efc.setFiles(esPfad);
  await p.fill('dialog [name=pw]', 'testpasswort');
  await p.click('dialog button.primary');
  await p.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('Einstellungen übernommen'));
  if ((await p.inputValue('#kalenderStart')) !== 'woche') fail('Einstellungen nicht übernommen');
  if (!(await p.isVisible('#import'))) fail('Nach dem Einlesen nicht mehr im Bereich Sicherung');
  // Einstellungsdatei als Sicherung einspielen wird abgelehnt (würde sonst Kunden ersetzen)
  const [efc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#import')]);
  await efc2.setFiles(esPfad);
  await p.fill('dialog [name=pw]', 'testpasswort');
  await p.click('dialog button.primary');
  await p.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('Einstellungsdatei'));
  await p.goto(BASE + '#/kunden');
  if (!(await p.locator('#liste .zeile').count())) fail('Kunden nach Einstellungsdatei-Versuch weg');
  await p.goto(BASE + '#/einstellungen?bereich=allgemein');
  await p.selectOption('#kalenderStart', 'monat');
  // Beispielkunden laden und entfernen
  await p.goto(BASE + '#/einstellungen?bereich=aufraeumen');
  await p.click('#beispielLaden');
  await p.waitForFunction(() => document.querySelector('#beispielInfo')?.textContent.includes('54 Beispielkunden'));
  await p.goto(BASE + '#/kunden');
  await p.waitForSelector('#liste .tag-beispiel');
  if ((await p.locator('#liste .tag-beispiel').count()) !== 54) fail(`Beispielkunden nicht markiert (${await p.locator('#liste .tag-beispiel').count()})`);
  // Potenzial-Markierung auf der Karte über die Infobox löschen (mit Sicherheitsabfrage)
  await p.goto(BASE + '#/karte');
  await p.waitForSelector('.leaflet-marker-icon');
  const pinsVorher = await p.locator('.leaflet-marker-icon').count();
  await p.evaluate(() => { const m = [...document.querySelectorAll('.leaflet-marker-icon')].find((x) => (x.getAttribute('title') || '').includes('Lindenweg 8')); m.scrollIntoView(); m.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await p.waitForSelector('.leaflet-popup [data-pin-loeschen]');
  await p.click('.leaflet-popup [data-pin-loeschen]');
  await p.click('dialog .dlg-actions button.ghost');
  if ((await p.locator('.leaflet-marker-icon').count()) !== pinsVorher) fail('Markierung trotz Abbrechen gelöscht');
  await p.evaluate(() => { const m = [...document.querySelectorAll('.leaflet-marker-icon')].find((x) => (x.getAttribute('title') || '').includes('Lindenweg 8')); m.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await p.click('.leaflet-popup [data-pin-loeschen]');
  await p.click('dialog button.danger');
  await p.waitForFunction((n) => document.querySelectorAll('.leaflet-marker-icon').length === n - 1, pinsVorher);
  if (await p.$('.leaflet-marker-icon[title*="Lindenweg 4"]') && !(await p.$('.leaflet-popup'))) {
    await p.evaluate(() => { const m = [...document.querySelectorAll('.leaflet-marker-icon')].find((x) => (x.getAttribute('title') || '').includes('Anna Beispiel')); m?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await p.waitForSelector('.leaflet-popup');
    if (await p.$('.leaflet-popup [data-pin-loeschen]')) fail('Papierkorb auch bei Kunden mit Abschluss');
  }
  await p.goto(BASE + '#/einstellungen?bereich=aufraeumen');
  await p.click('#beispielWeg');
  await p.click('dialog button.danger');
  await p.waitForFunction(() => document.querySelector('#beispielInfo')?.textContent.includes('Keine Beispielkunden'));
  await p.goto(BASE + '#/kunden');
  await p.waitForSelector('#liste .zeile');
  if (await p.$('#liste .tag-beispiel')) fail('Beispielkunden nicht entfernt');
  if (!(await p.textContent('#liste')).includes('Prüfer')) fail('Echter Kunde beim Entfernen verloren!');
  await p.goto(BASE + '#/einstellungen?bereich=hilfe');
  // Rund-Tour aus den Einstellungen: startet bei 1, Weiter/Zurück, Esc beendet
  await p.click('[data-tour-start]');
  await p.waitForFunction(() => (document.querySelector('.tour-zaehler')?.textContent || '').startsWith('1 von'));
  await p.click('#tour [data-tour=weiter]');
  await p.waitForFunction(() => (document.querySelector('.tour-zaehler')?.textContent || '').startsWith('2 von'));
  if (!(await p.isVisible('.tour-loch'))) fail('Tour hebt nichts hervor');
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => !document.querySelector('#tour'));
  await p.goto(BASE + '#/einstellungen?bereich=aufraeumen');
  // Beispiel-Vorführbestand
  await p.click('#bestandLaden');
  await p.waitForFunction(() => /\d+ Beispielgeräte/.test(document.querySelector('#bestandInfo')?.textContent || ''));
  await p.goto(BASE + '#/bestand');
  await p.waitForSelector('.tag-beispiel');
  // Reservieren: für den Kunden, zweite Reservierung im selben Zeitraum wird abgelehnt
  const karte = p.locator('article.geraet').first();
  await karte.locator('[data-aktion=reservieren]').click();
  await p.fill('dialog .kw-eingabe', 'Prüfer');
  await p.click('dialog .kw-treffer [data-kw-id]:not(.kw-ohne)');
  await p.click('dialog button.primary');
  await p.waitForSelector('article.geraet [data-resv]');
  await karte.locator('[data-aktion=reservieren]').click();
  // Kalender schlägt den ersten freien Tag vor; getippt auf den belegten Tag -> Ablehnung
  const morgenTag = await p.evaluate(() => { const d = new Date(Date.now() + 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  if ((await p.inputValue('dialog [name=von]')) === morgenTag) fail('Belegter Tag als Beginn vorgeschlagen');
  await p.click('dialog .zr-tippen summary');
  await p.fill('dialog [name=von]', morgenTag);
  await p.fill('dialog [name=bis]', morgenTag);
  await p.click('dialog button.primary');
  await p.waitForFunction(() => (document.querySelector('#toast')?.textContent || '').startsWith('Belegt'));
  await p.click('dialog .dlg-actions button.ghost');
  // Aus der Kundenansicht verkaufen: Gerät wählen, Preis, Verkauf landet beim Kunden
  await p.goto(BASE + '#/kunden');
  await p.click('#liste a.zeile:has-text("Prüfer")');
  await p.waitForSelector('#bestandKunde');
  await p.click('[data-bestand-kunde=verkaufen]');
  await p.waitForSelector('dialog .gw-liste');
  if (!(await p.textContent('dialog .gw-eintrag')).includes('für diesen Kunden reserviert')) fail('Reserviertes Gerät steht nicht oben');
  // Hintergrund antippen ohne Eingaben: schließt sofort
  await p.mouse.click(4, 4);
  await p.waitForFunction(() => !document.querySelector('dialog'));
  await p.click('[data-bestand-kunde=verkaufen]');
  await p.waitForSelector('dialog .gw-liste');
  const verkaufName = await p.locator('dialog .gw-eintrag:not(.gw-belegt)').last().locator('b').textContent();
  await p.locator('dialog .gw-eintrag:not(.gw-belegt)').last().click();
  await p.click('dialog button.primary');
  await p.waitForSelector('dialog [name=preis]');
  if (!(await p.isChecked('dialog [name=status]'))) fail('Status-Häkchen nicht vorausgewählt');
  await p.fill('dialog [name=preis]', '799,00');
  // Hintergrund mit Eingabe: Rückfrage, „Abbrechen“ lässt den Dialog offen, Esc fragt ebenso
  await p.mouse.click(4, 4);
  await p.waitForSelector('dialog h2:has-text("Eingaben verwerfen?")');
  await p.click('dialog:has(h2:has-text("Eingaben verwerfen?")) .dlg-actions button.ghost');
  await p.waitForFunction(() => document.querySelectorAll('dialog').length === 1);
  if ((await p.inputValue('dialog [name=preis]')) !== '799,00') fail('Rückfrage hat Eingaben verworfen');
  await p.keyboard.press('Escape');
  await p.waitForSelector('dialog h2:has-text("Eingaben verwerfen?")');
  await p.click('dialog:has(h2:has-text("Eingaben verwerfen?")) .dlg-actions button.ghost');
  await p.click('dialog button.primary');
  await p.waitForFunction(() => (document.querySelector('#toast')?.textContent || '').startsWith('Verkauf gebucht'));
  await p.waitForFunction((n) => { const t = document.querySelector('#bestandKunde')?.textContent || ''; return t.includes(n) && t.includes('799,00 €'); }, verkaufName);
  await p.goto(BASE + '#/bestand');
  await p.waitForSelector('article.geraet');
  if (!(await p.textContent('main')).includes('Verkauft')) fail('Verkauf fehlt im Bestand');
  // Verbrauchsmaterial: aus dem Katalog anlegen, Muster an Kunde buchen, Mindestbestand -> nachbestellen
  await p.click('[data-material-neu]');
  await p.selectOption('dialog [data-katalog]', 'vorwerk-koboclean-universal-500ml');
  if (!(await p.inputValue('dialog [name=name]')).startsWith('Koboclean Universal')) fail('Katalogwahl füllt die Bezeichnung nicht');
  await p.fill('dialog [name=bestand]', '3');
  await p.fill('dialog [name=einheit]', 'Flasche');
  await p.fill('dialog [name=mindest]', '2');
  await p.click('dialog button.primary');
  await p.waitForSelector('#material .material-zeile');
  if (await p.$('#nachbestellen')) fail('Nachbestellen zu früh');
  await p.click('#material [data-material-aktion=abgang]');
  await p.waitForSelector('dialog .mengen-wahl');
  await p.fill('dialog .kw-eingabe', 'Prüfer');
  await p.click('dialog .kw-treffer [data-kw-id]:not(.kw-ohne)');
  await p.click('dialog button.primary');
  await p.waitForFunction(() => (document.querySelector('#toast')?.textContent || '').includes('bitte nachbestellen'));
  await p.waitForSelector('#nachbestellen');
  if (!(await p.textContent('#material .material-bestand')).includes('2 Flaschen')) fail('Bestand nicht verringert');
  // zu viel abbuchen wird abgelehnt
  await p.click('#material [data-material-aktion=abgang]');
  await p.fill('dialog [name=menge]', '5');
  await p.click('dialog button.primary');
  await p.waitForFunction(() => (document.querySelector('#toast')?.textContent || '').includes('nur noch 2 Flaschen'));
  await p.keyboard.press('Escape');
  await p.waitForSelector('dialog h2:has-text("Eingaben verwerfen?")');
  await p.click('dialog:has(h2:has-text("Eingaben verwerfen?")) button.gefahr, dialog:has(h2:has-text("Eingaben verwerfen?")) .dlg-actions button.danger');
  await p.waitForFunction(() => !document.querySelector('dialog[open]'));
  await p.goto(BASE + '#/');
  await p.waitForSelector('.start-nachbestellen');
  // Neues Gerät aus dem Katalog
  await p.goto(BASE + '#/bestand');
  await p.click('#neu');
  await p.selectOption('dialog [data-katalog]', 'vorwerk-vm7');
  if ((await p.inputValue('dialog [name=name]')) !== 'Kobold VM7 Akku-Handstaubsauger') fail('Gerät aus Katalog: Bezeichnung fehlt');
  await p.click('dialog button.primary');
  await p.waitForFunction(() => document.querySelector('.geraete')?.textContent.includes('Kobold VM7 Akku-Handstaubsauger'));
  // Verleihen aus der Kundenansicht: Kunde ist vorausgefüllt
  await p.goto(BASE + '#/kunden');
  await p.click('#liste a.zeile:has-text("Prüfer")');
  await p.waitForSelector('#bestandKunde [data-bestand-kunde=muster]');
  if (!(await p.textContent('main')).includes('Muster mitgegeben: 1 × Koboclean Universal')) fail('Muster-Notiz fehlt beim Kunden');
  await p.click('[data-bestand-kunde=verleihen]');
  await p.waitForSelector('dialog .gw-liste');
  await p.click('dialog button.primary');
  await p.waitForSelector('dialog [name=erinnern]');
  if (!(await p.isVisible('dialog .kw-gewaehlt')) || !(await p.textContent('dialog .kw-gewaehlt')).includes('Prüfer')) fail('Kunde im Verleih nicht vorausgefüllt');
  await p.click('dialog .dlg-actions button.ghost');
  await p.waitForFunction(() => !document.querySelector('dialog'));
  // Belegungskalender: Zeitleiste, leere Stelle antippen, Zeitraum wischen, Liste und Freie finden
  await p.goto(BASE + '#/belegung?ansicht=zeitleiste&zoom=28');
  await p.waitForSelector('.bk-bar.art-reserviert');
  const spur0 = await p.locator('.bk-zeile[data-geraet] .bk-spur').first().boundingBox();
  await p.mouse.click(spur0.x + spur0.width * 0.97, spur0.y + spur0.height / 2);
  await p.waitForSelector('dialog .zr-raster');
  const frei3 = await p.$$eval('dialog .zr-tag', (els) => {
    const ok = (e) => e && !/fremd|vorbei|belegt/.test(e.className);
    for (let i = 0; i < els.length - 2; i++) if (ok(els[i]) && ok(els[i + 1]) && ok(els[i + 2])) return [els[i].dataset.tag, els[i + 2].dataset.tag];
    return null;
  });
  if (!frei3) fail('Keine drei freien Tage im Zeitraum-Kalender');
  else {
    const boxA = await p.locator(`dialog .zr-tag[data-tag="${frei3[0]}"]`).boundingBox();
    const boxB = await p.locator(`dialog .zr-tag[data-tag="${frei3[1]}"]`).boundingBox();
    await p.mouse.move(boxA.x + boxA.width / 2, boxA.y + boxA.height / 2);
    await p.mouse.down();
    await p.mouse.move(boxB.x + boxB.width / 2, boxB.y + boxB.height / 2, { steps: 8 });
    await p.mouse.up();
    const felder = [await p.inputValue('dialog [name=von]'), await p.inputValue('dialog [name=bis]')];
    if (felder[0] !== frei3[0] || felder[1] !== frei3[1]) fail('Wischen ergibt ' + felder.join('–') + ' statt ' + frei3.join('–'));
    // gesperrter Tag lässt sich nicht als Beginn wählen
    const gesperrt = p.locator('dialog .zr-tag.belegt:not(.fremd)').first();
    if (await gesperrt.count()) {
      await gesperrt.click();
      if ((await p.inputValue('dialog [name=von]')) !== frei3[0]) fail('Gesperrter Tag wurde gewählt');
    }
    await p.click('dialog button.primary');
    await p.waitForFunction(() => (document.querySelector('#toast')?.textContent || '').startsWith('Reserviert'));
  }
  await p.click('.bk-unter [data-ansicht=liste]');
  await p.waitForFunction(() => /Reservierung/.test(document.querySelector('main')?.textContent || ''));
  await p.click('.bk-unter [data-ansicht=frei]');
  await p.waitForSelector('#bkFreie');
  await p.goto(BASE + '#/termine?ansicht=monat');
  await p.waitForSelector('.k-geraet');
  await p.click('#kLeih');
  if (await p.$('.k-geraet')) fail('Leihgaben lassen sich nicht ausblenden');
  await p.click('#kLeih');
  await p.waitForSelector('.k-geraet');
  await p.goto(BASE + '#/einstellungen?bereich=aufraeumen');
  await p.click('#bestandWeg');
  await p.click('dialog button.danger');
  // reserviertes Beispielgerät bleibt (echte Reservierung), alle anderen sind weg
  await p.waitForFunction(() => /bleiben erhalten|Beispielbestand entfernt/.test(document.querySelector('#toast')?.textContent || ''));
  // Historie vorhanden
  await p.waitForTimeout(500);
  if (!(await p.$('#historie [data-i]'))) fail('Keine Versionshistorie');
  // Feiertage: 1. Weihnachtstag im Monat sichtbar (Text, nicht nur Farbe)
  await p.goto(BASE + '#/termine?ansicht=monat&datum=2026-12-10');
  await p.waitForSelector('.k-monat');
  if (!(await p.textContent('.k-tag.feiertag[data-tag="2026-12-25"]'))?.replace(/\u00ad/g, '').includes('1. Weihnachtstag')) fail('Feiertag im Monat fehlt');
  // iPad hochkant: Leiste unten mit „Mehr“ (Produkte, Sperren darin)
  {
    const vorher = p.viewportSize();
    await p.setViewportSize({ width: 820, height: 1180 });
    await p.goto(BASE + '#/');
    await p.waitForSelector('#navMehr', { state: 'visible' }).catch(() => fail('iPad hochkant: „Mehr“ fehlt'));
    await p.click('#navMehr');
    if (!(await p.$('dialog[open] [data-mehr=sperren]')) || !(await p.$('dialog[open] a[href="#/produkte"]'))) fail('iPad hochkant: Sperren/Produkte nicht unter „Mehr“');
    await p.keyboard.press('Escape');
    await p.setViewportSize(vorher);
  }
  // Kalender: Woche, Fingertipp auf eine Uhrzeit legt Termin an
  await p.goto(BASE + '#/termine');
  await p.waitForSelector('.k-monat');
  await p.click('.tabs [data-ansicht=woche]');
  await p.waitForSelector('.k-spalte');
  if (!(await p.evaluate(() => location.hash.includes('ansicht=woche')))) fail('Ansicht nicht in der Adresse');
  const sp = await p.locator('.k-spalte').nth(2).boundingBox();
  await p.mouse.click(sp.x + 20, sp.y + 26 * 8 + 5); // 10:00
  await p.waitForSelector('dialog [name=titel]');
  if ((await p.inputValue('dialog [name=beginn]')).slice(11) !== '10:00') fail('Beginn aus Kalender falsch: ' + await p.inputValue('dialog [name=beginn]'));
  if ((await p.inputValue('dialog [name=dauerMin]')) !== '60') fail('Dauer aus Kalender falsch');
  // Schnellwahl Wiedervorlage: „1 Woche“ = heute + 7 Tage, Uhrzeit bleibt
  const beginnVorher = await p.inputValue('dialog [name=beginn]');
  await p.click('dialog [data-wv-schritt="1w"]');
  const erwartetWoche = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 7); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T10:00`; });
  if ((await p.inputValue('dialog [name=beginn]')) !== erwartetWoche) fail('Schnellwahl 1 Woche falsch: ' + await p.inputValue('dialog [name=beginn]'));
  if ((await p.getAttribute('dialog [data-wv-schritt="1w"]', 'aria-pressed')) !== 'true') fail('Schnellwahl nicht markiert');
  await p.fill('dialog [name=beginn]', beginnVorher);
  await p.fill('dialog [name=titel]', 'Kalendertermin');
  await p.click('dialog button.primary');
  await p.waitForFunction(() => [...document.querySelectorAll('.k-block .k-eintrag')].some((x) => x.textContent.includes('Kalendertermin')));
  // Ziehen = Dauer
  await p.mouse.move(sp.x + 20, sp.y + 26 * 14 + 5); // 13:00
  await p.mouse.down();
  await p.mouse.move(sp.x + 20, sp.y + 26 * 16 + 5, { steps: 4 });
  await p.mouse.up();
  await p.waitForSelector('dialog [name=titel]');
  if ((await p.inputValue('dialog [name=dauerMin]')) !== '90') fail('Dauer aus Ziehen falsch: ' + await p.inputValue('dialog [name=dauerMin]'));
  await p.click('dialog .dlg-actions button.ghost');
  // Monat: Tippen auf einen Tag, Tagesansicht über die Tageszahl
  await p.click('.tabs [data-ansicht=monat]');
  await p.waitForSelector('.k-monat');
  if (!(await p.textContent('.k-monat')).includes('Kalendertermin')) fail('Termin fehlt in Monatsansicht');
  {
    // Tipp auf einen Tag – auch direkt auf einen Termin darin – öffnet die Tagesansicht dieses Tages, keinen Dialog
    const e = p.locator('.k-monat .k-eintrag', { hasText: 'Kalendertermin' }).first();
    const tagKey = await e.evaluate((x) => x.closest('.k-tag').dataset.tag);
    await e.click();
    await p.waitForSelector('.k-raster[style*="--spalten:1"]');
    if (await p.$('dialog[open]')) fail('Tipp auf Termin im Monat öffnet Dialog statt Tagesansicht');
    if (!(await p.$(`.k-spalte[data-tag="${tagKey}"]`))) fail('Tagesansicht zeigt nicht den angetippten Tag');
    await p.click('.tabs [data-ansicht=monat]');
    await p.waitForSelector('.k-monat');
    await p.locator('.k-tag:not(.fremd)').nth(14).click({ position: { x: 40, y: 80 } });
    await p.waitForSelector('.k-raster[style*="--spalten:1"]');
    if (await p.$('dialog[open]')) fail('Tipp auf leeren Tag im Monat öffnet Dialog');
  }
  await p.click('.k-nav [data-schritt="1"]');
  await p.click('.k-nav [data-schritt="0"]');
  await p.click('.tabs [data-ansicht=woche]');
  await p.locator('.k-block .k-eintrag', { hasText: 'Kalendertermin' }).click();
  await p.waitForSelector('dialog .termin-karte');
  if (!(await p.textContent('dialog .termin-karte')).includes('10:00')) fail('Termin-Karte ohne Zeit');
  if ((await p.textContent('dialog .dlg-actions')).indexOf('Löschen') < 0) fail('Termin-Karte ohne Löschen');
  await p.click('dialog .dlg-actions button.ghost');
  // Ziehen mit der Maus: Termin auf 11:00 und einen Tag weiter schieben
  const tid = await p.locator('.k-block', { hasText: 'Kalendertermin' }).getAttribute('data-block');
  const bb = await p.locator(`.k-block[data-block="${tid}"]`).boundingBox();
  const sp3 = await p.locator('.k-spalte').nth(3).boundingBox();
  await p.mouse.move(bb.x + 10, bb.y + 8);
  await p.mouse.down();
  await p.mouse.move(bb.x + 30, bb.y + 20, { steps: 3 });
  await p.mouse.move(sp3.x + 10, bb.y + 8 + 26 * 2, { steps: 6 });
  await p.mouse.up();
  await p.waitForFunction((id) => { const b = document.querySelector(`.k-block[data-block="${id}"]`); return b && b.closest('.k-spalte') === document.querySelectorAll('.k-spalte')[3]; }, tid);
  if (!(await p.textContent(`.k-block[data-block="${tid}"]`)).includes('11:00')) fail('Verschieben: Uhrzeit falsch ' + await p.textContent(`.k-block[data-block="${tid}"]`));
  // Gewählt: Griff unten 1 Stunde länger ziehen
  await p.waitForSelector(`.k-block.gewaehlt[data-block="${tid}"] .k-griff.unten`);
  const gu = await p.locator(`.k-block[data-block="${tid}"] .k-griff.unten`).boundingBox();
  await p.mouse.move(gu.x + gu.width / 2, gu.y + gu.height / 2);
  await p.mouse.down();
  await p.mouse.move(gu.x + gu.width / 2, gu.y + gu.height / 2 + 26 * 2, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(500);
  await p.waitForFunction((id) => (document.querySelector(`.k-block[data-block="${id}"]`)?.getBoundingClientRect().height || 0) > 26 * 3.5, tid);
  await p.locator(`.k-block[data-block="${tid}"] .k-eintrag`).click({ position: { x: 6, y: 30 } });
  await p.waitForSelector('dialog .termin-karte');
  if (!(await p.textContent('dialog .tk-zeit')).includes('13:00')) fail('Länger ziehen: Ende falsch ' + await p.textContent('dialog .tk-zeit'));
  await p.click('dialog .dlg-actions button.ghost');
  // Monat: auf einen anderen Tag ziehen
  await p.click('.tabs [data-ansicht=monat]');
  await p.waitForSelector('.k-monat');
  const eintrag = p.locator(`.k-monat [data-termin="${tid}"]`);
  const eb = await eintrag.boundingBox();
  const quelleTag = await eintrag.evaluate((x) => x.closest('.k-tag').dataset.tag);
  const zielZelle = p.locator('.k-tag:not(.fremd)').nth(20);
  const zielTag = await zielZelle.getAttribute('data-tag');
  const zb = await zielZelle.boundingBox();
  await p.mouse.move(eb.x + 10, eb.y + 5);
  await p.mouse.down();
  await p.mouse.move(eb.x + 30, eb.y + 25, { steps: 3 });
  await p.mouse.move(zb.x + zb.width / 2, zb.y + zb.height - 10, { steps: 8 });
  await p.mouse.up();
  if (zielTag !== quelleTag) await p.waitForFunction(([id, tag]) => document.querySelector(`.k-monat [data-termin="${id}"]`)?.closest('.k-tag')?.dataset.tag === tag, [tid, zielTag]);
  if (await p.$('dialog[open]')) fail('Nach dem Ziehen im Monat öffnet sich ein Dialog');
  // Löschen nur nach Sicherheitsabfrage
  await p.waitForTimeout(500);
  await p.locator(`.k-monat [data-termin="${tid}"]`).click();
  await p.waitForSelector('.k-raster[style*="--spalten:1"]');
  await p.locator(`.k-block[data-block="${tid}"] .k-eintrag`).click({ position: { x: 6, y: 10 } });
  await p.waitForSelector('dialog .termin-karte');
  await p.click('dialog .dlg-actions button.danger');
  await p.waitForSelector('dialog:not(:has(.termin-karte)) button.danger');
  await p.click('dialog:not(:has(.termin-karte)) .dlg-actions button.ghost');
  if (!(await p.$(`.k-block[data-block="${tid}"]`))) fail('Termin trotz Abbruch gelöscht');
  await p.click('.tabs [data-ansicht=geraete]');
  await p.waitForSelector('#bkInhalt');
  await p.click('#kalTabs [data-ansicht=woche]');
  await p.waitForSelector('.k-spalte');
  await p.click('.tabs [data-ansicht=liste]');
  await p.waitForSelector('.terminliste');
  // Kundenliste: Filter, Sortierung nach letztem Kontakt, Kontakt von Hand
  await p.goto(BASE + '#/kunden');
  await p.click('#fKnopf');
  await p.click('#kFilter [data-f-kontakt=nie]');
  for (const sel of ['#kFilter [data-f-kontakt=nie]', '#kFilter [data-f-produkt=interesse]']) {
    if (sel.includes('produkt')) await p.click(sel);
    const st = await p.$eval(sel, (e) => ({ vor: getComputedStyle(e, '::before').content, bg: getComputedStyle(e).backgroundColor, aus: getComputedStyle(e.parentElement.querySelector('.chip-wahl:not(.aktiv)')).backgroundColor }));
    if (!st.vor.includes('✓') || st.bg === st.aus) fail('Aktiver Filter nicht hervorgehoben: ' + sel);
  }
  if (!/von/.test(await p.textContent('#fAnzahl'))) fail('Kundenfilter zeigt keine Anzahl');
  await p.click('#kFilter [data-f-alle]');
  await p.selectOption('#sortierung', 'kontakt-alt');
  await p.click('#liste .zeile');
  await p.click('#kKontakt');
  await p.click('dialog button.primary');
  await p.waitForFunction(() => /heute/.test(document.querySelector('#kKontakt')?.textContent || ''));
  // Laufendes Gespräch: geteilte Ansicht, Leitfaden nahtlos, Abschluss landet im Verlauf
  await p.goto(BASE + '#/kunden');
  await p.click('#liste .zeile');
  await p.click('#gespraechStarten');
  await p.waitForSelector('.gm-teilung .gm-links [data-feld=telefon]');
  await p.fill('textarea[data-gruppe] >> nth=0', 'E2E-Gesprächsnotiz Speicherwunsch');
  await p.click('.gm-seiten [data-seite=leitfaden]');
  // Geführter Ablauf: 7 Phasen, Weiter, Leitfrage antippen -> Haken + Stichwort in der Notiz
  await p.waitForSelector('.gl-leiste .gl-punkt.aktiv');
  if ((await p.$$('.gl-leiste .gl-punkt')).length !== 7) fail('Phasenleiste hat nicht 7 Phasen');
  if ((await p.inputValue('#gNotiz')) !== 'E2E-Gesprächsnotiz Speicherwunsch') fail('Leitfaden zeigt die Notiz des Bereichs nicht');
  await p.click('.gl-weiter [data-schritt="1"]');
  await p.waitForSelector('.gl-punkt.aktiv[data-phase=einstieg]');
  await p.click('.gl-leiste [data-phase=situation]');
  await p.waitForSelector('.gl-punkt.aktiv[data-phase=situation]');
  const stichwort = ((await p.textContent('.gl-frage >> nth=0')).split('→ Notiz:')[1] || '').trim();
  if (!stichwort) fail('Leitfrage ohne Stichwort');
  await p.click('.gl-frage >> nth=0');
  await p.waitForSelector('.gl-frage.gefragt');
  await p.waitForSelector('.gl-punkt.erledigt[data-phase=situation]');
  const mitStichwort = 'E2E-Gesprächsnotiz Speicherwunsch\n' + stichwort + ': ';
  if ((await p.inputValue('#gNotiz')) !== mitStichwort) fail('Stichwort nicht in die Notiz übernommen: ' + JSON.stringify(await p.inputValue('#gNotiz')));
  // Einwand: Rückfrage zuerst, Antwort erst nach Aufdecken
  await p.click('.gl-einwand-sprung');
  await p.waitForSelector('.gl-punkt.aktiv[data-phase=loesung]');
  await p.click('.gm-leitfaden .einwand >> nth=0');
  if (await p.$('.gm-leitfaden .argumente')) fail('Antwort vor der Rückfrage sichtbar');
  await p.click('#gAufdecken');
  await p.waitForSelector('.gm-leitfaden .argumente');
  await p.click('.gm-leitfaden [data-ergebnis=ueberzeugt]');
  // Letzte Phase: Widerrufsrecht erklärt -> Satz in der Notiz
  await p.click('.gl-leiste [data-phase=schritt]');
  await p.click('[data-widerruf]');
  if (!(await p.inputValue('#gNotiz')).includes('Widerrufsrecht (14 Tage) erklärt.')) fail('Widerruf nicht in der Notiz');
  await p.click('.gm-seiten [data-seite=notizen]');
  const nachLeitfaden = await p.inputValue('textarea[data-gruppe] >> nth=0');
  if (!nachLeitfaden.startsWith(mitStichwort.trimEnd()) || !nachLeitfaden.includes('Widerrufsrecht')) fail('Notiz nach Leitfaden verloren: ' + JSON.stringify(nachLeitfaden));
  await p.fill('textarea[data-gruppe] >> nth=0', 'E2E-Gesprächsnotiz Speicherwunsch');
  // Textbaustein antippen hängt eine Zeile an
  const bsText = (await p.textContent('.gm-bausteine .gm-baustein >> nth=0')).replace(/^\+\s*/, '').trim();
  await p.click('.gm-bausteine .gm-baustein >> nth=0');
  if ((await p.inputValue('textarea[data-gruppe] >> nth=0')) !== 'E2E-Gesprächsnotiz Speicherwunsch\n' + bsText) fail('Textbaustein nicht angehängt');
  if (!(await p.isVisible('.gm-diktat'))) fail('Diktat-Hinweis fehlt');
  await p.click('.gm-seiten [data-seite=abschluss]');
  if (!(await p.textContent('#gmBilanz')).includes('1 Leitfrage gestellt')) fail('Gesprächsbilanz fehlt: ' + (await p.textContent('#gmBilanz')));
  await p.selectOption('[data-abschluss] [name=ausgang] >> nth=0', 'termin');
  await p.waitForSelector('#gmBilanz.gut');
  await p.selectOption('[data-abschluss] [name=ausgang] >> nth=0', 'wiedervorlage');
  await p.click('#gmSpeichern');
  await p.waitForSelector('.verlauf');
  if (!(await p.textContent('.verlauf')).includes('E2E-Gesprächsnotiz')) fail('Gespräch fehlt im Verlauf');
  if (!(await p.textContent('.verlauf')).includes('Wiedervorlage vereinbart')) fail('Ergebnis fehlt im Verlauf');
  // Vom Leitfaden aus nahtlos in die geteilte Ansicht
  await p.goto(BASE + '#/gespraech');
  await p.fill('#gKunde .kw-eingabe', 'Prüfer');
  await p.click('#gKunde .kw-treffer [data-kw-id]:not(.kw-ohne)');
  await p.click('#gInhalt .gl-einwand-sprung');
  await p.click('#gInhalt .einwand >> nth=1');
  await p.click('#gGeteilt');
  await p.waitForSelector('.gm-leitfaden .einwand.e-offen');
  await p.click('.gm-seiten [data-seite=abschluss]');
  await p.click('#gmVerwerfen');
  await p.click('dialog button.danger');
  await p.waitForFunction(() => /^#\/kunde\/[\w-]+(\?|$)/.test(location.hash));
  // Beratungs-Schutz: nur der beratene Kunde, andere Seiten führen zu ihm zurück, Aufheben nur mit Passwort
  await p.goto(BASE + '#/kunden');
  await p.waitForSelector('#liste .zeile');
  if (await p.isVisible('#schutzKnopf')) fail('Schutz-Knopf ohne geöffneten Kunden sichtbar');
  await p.click('#liste .zeile');
  await p.waitForSelector('#kTitel');
  const beraten = await p.textContent('#kTitel');
  await p.click('#schutzKnopf');
  await p.waitForSelector('#schutzBand:not([hidden])');
  await p.evaluate(() => { location.hash = '#/kunden'; });
  await p.waitForFunction(() => /^#\/kunde\//.test(location.hash));
  await p.evaluate(() => { location.hash = '#/gespraech'; });
  await p.waitForSelector('#gKunde');
  if (await p.isVisible('#gKunde [data-kw-aendern]')) await p.click('#gKunde [data-kw-aendern]');
  await p.fill('#gKunde .kw-eingabe', 'e');
  if ((await p.$$('#gKunde .kw-treffer [data-kw-id]:not(.kw-ohne)')).length > 1) fail('Im Schutz sind andere Kunden im Leitfaden wählbar');
  await p.click('#schutzKnopf');
  await p.fill('.schutz-sperre [name=pw]', 'falsch');
  await p.click('.schutz-sperre button.primary');
  await p.waitForFunction(() => (document.querySelector('#toast')?.textContent || '').includes('Falsches'));
  if (await p.isHidden('#schutzBand')) fail('Schutz trotz falschem Passwort aufgehoben');
  await p.fill('.schutz-sperre [name=pw]', 'testpasswort');
  await p.click('.schutz-sperre button.primary');
  await p.waitForSelector('#schutzBand', { state: 'hidden' });
  void beraten;
  // Kundenansicht: nur Freigegebenes, Beenden nur mit Passwort
  await p.goto(BASE + '#/kunden');
  await p.click('#liste .zeile');
  await p.click('#kundenansicht');
  await p.waitForSelector('.kundenansicht');
  if ((await p.textContent('.kundenansicht')).includes('Testnotiz')) fail('Notiz in Kundenansicht sichtbar!');
  await p.evaluate(() => { location.hash = '#/einstellungen'; });
  await p.waitForTimeout(200);
  if (!(await p.$('.kundenansicht'))) fail('Kundenansicht durch Navigation verlassen');
  await p.click('#kaEnde');
  await p.fill('.ka-sperre [name=pw]', 'falsch');
  await p.click('.ka-sperre button.primary');
  await p.waitForFunction(() => (document.querySelector('#toast')?.textContent || '').includes('Falsches'));
  if (!(await p.$('.kundenansicht'))) fail('Kundenansicht trotz falschem Passwort beendet');
  await p.fill('.ka-sperre [name=pw]', 'testpasswort');
  await p.click('.ka-sperre button.primary');
  await p.waitForSelector('.kundenansicht', { state: 'detached' });
  // Kunde löschen und aus dem Papierkorb zurückholen
  await p.goto(BASE + '#/kunden');
  await p.click('#liste .zeile');
  await p.click('#loeschen');
  await p.click('dialog button.danger');
  await p.waitForFunction(() => location.hash === '#/kunden');
  await p.goto(BASE + '#/geloescht');
  await p.click('.geloescht-liste [data-zurueck]');
  await p.goto(BASE + '#/kunden');
  await p.waitForSelector('#liste .zeile');
  if (!(await p.textContent('#liste')).includes('Prüfer')) fail('Kunde nicht wiederhergestellt');
  // Auswertungen: Bereich, Zeitraum, Blättern, PDF-Bericht
  await p.goto(BASE + '#/auswertung');
  await p.waitForSelector('.aw-kern [data-kern=abschluesse]');
  await p.waitForSelector('#awTrichter');
  await p.waitForSelector('#awNachfassen');
  if ((await p.$$('.aw-kern .aw-kern-zahl')).length !== 4) fail('Vier Kernzahlen fehlen');
  if (!(await p.textContent('.aw-kopf')).includes('verglichen mit')) fail('Vergleichszeitraum fehlt');
  await p.waitForSelector('#awSparten');
  // Details aufklappen: dort stehen die übrigen Kennzahlen, der Verlauf und der Fokus
  await p.click('#awDetails summary');
  await p.waitForSelector('.aw-zahlen .aw-zahl');
  await p.click('[data-bereich=pv]');
  await p.waitForSelector('.aw-zahlen .aw-zahl');
  if (await p.$('#awSparten')) fail('Spartenvergleich nur bei „Alles zusammen“');
  await p.click('[data-periode=woche]');
  const kw = await p.textContent('.aw-kopf h2');
  await p.click('.k-nav [data-schritt="-1"]');
  if ((await p.textContent('.aw-kopf h2')) === kw) fail('Blättern in Auswertungen ohne Wirkung');
  if (await p.$('.aw-zahl >> text=Kaufquote')) fail('Kaufquote im PV-Bericht');
  await p.selectOption('#awMehr', '365');
  if (!(await p.textContent('.aw-kopf h2')).startsWith('Letzte 365 Tage')) fail('365-Tage-Bericht fehlt');
  await p.click('#awPdf');
  await p.waitForFunction(() => /auswertung-pv-365-.*\.pdf/.test(document.querySelector('dialog')?.textContent || ''));
  await p.click('dialog .dlg-actions button.ghost');
  // Alles zusammen: Säulen nach Thema gestapelt, mit Legende; PDF auch hier
  await p.click('[data-bereich=alle]');
  await p.waitForFunction(() => document.querySelector('.aw-kopf')?.textContent.includes('Alles zusammen'));
  if (await p.$('.aw-verlauf') && (!(await p.$('.aw-legende')) || !(await p.$('.aw-stapel .aw-teil')))) fail('Gesprächssäulen nicht nach Thema gestapelt');
  // Fokus je Sparte: drei Anteile, sechs Zeiträume in der Entwicklung; nur bei „Alles zusammen“
  await p.waitForSelector('#awFokus');
  if ((await p.$$('#awFokus .aw-anteil')).length !== 3 || (await p.$$('#awFokus .aw-reihe li')).length !== 6) fail('Fokus je Sparte unvollständig');
  if (!(await p.$$eval('.aw-zahl .aw-delta', (x) => x.some((e) => /\((?:[+−±]\d+ %|neu)\)/.test(e.textContent) && e.querySelector('.aw-pfeil'))))) fail('Prozentuale Veränderung mit Pfeil fehlt');
  await p.click('[data-bereich=wp]');
  await p.waitForFunction(() => !document.querySelector('#awFokus'));
  await p.click('[data-bereich=alle]');
  await p.waitForSelector('#awFokus');
  await p.click('#awPdf');
  await p.waitForFunction(() => /auswertung-alle-365-.*\.pdf/.test(document.querySelector('dialog')?.textContent || ''));
  await p.click('dialog .dlg-actions button.ghost');
  // Kommandozeile: Feld auf der Übersicht, Enter öffnet, Zuletzt-Chip, ⌘K/Strg+K, „… anrufen“ erzeugt tel:-Link
  await p.goto(BASE + '#/');
  await p.click('#startSuche');
  await p.fill('#suchFeld', 'prüfer');
  await p.waitForSelector('.such-treffer[data-art=kunde]');
  if (await p.evaluate(() => window.__xss)) fail('XSS in der Suche ausgeführt!');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => /^#\/kunde\/[\w-]+/.test(location.hash));
  await p.fill('[data-feld="telefon"]', '0421 555 1234');
  await p.waitForTimeout(400);
  await p.goto(BASE + '#/');
  await p.waitForSelector('.zuletzt-chip');
  if (!(await p.textContent('.zuletzt')).includes('Prüfer')) fail('Zuletzt-Chip fehlt');
  await p.keyboard.press('Control+k');
  await p.waitForSelector('dialog.such-dlg[open]');
  await p.evaluate(() => { const o = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.href.startsWith('tel:')) { window.__tel = this.href; return; } return o.call(this); }; });
  await p.fill('#suchFeld', 'prüfer anrufen');
  await p.waitForSelector('.such-treffer.vorschlag');
  await p.keyboard.press('Enter');
  await p.click('dialog.dlg button.primary');
  await p.waitForFunction(() => window.__tel, null, { timeout: 3000 }).catch(() => {});
  if ((await p.evaluate(() => window.__tel)) !== 'tel:04215551234') fail('Anruf aus der Suche ohne tel:-Link: ' + (await p.evaluate(() => window.__tel)));
  await p.keyboard.press('Control+k');
  await p.fill('#suchFeld', 'zu teuer');
  await p.waitForSelector('.such-treffer[data-art=einwand]');
  await p.click('.such-treffer[data-art=einwand]');
  await p.waitForSelector('#antwort');
  await p.keyboard.press('Control+k');
  await p.fill('#suchFeld', 'neuer termin');
  await p.keyboard.press('Enter');
  await p.waitForSelector('dialog.dlg input[name=titel]');
  await p.click('dialog.dlg button.ghost');
  // Hilfe: ?-Knopf zeigt Kurzhilfe, Hilfe-Seite mit Suche und Installationshilfe, abschaltbar
  await p.goto(BASE + '#/kunden');
  await p.click('.seitenkopf h1 .hilfe-knopf');
  await p.waitForSelector('dialog.dlg .hilfe-schritte');
  await p.click('dialog.dlg button.primary');
  await p.goto(BASE + '#/hilfe');
  await p.waitForSelector('#installBox .install-weg');
  await p.click('#installBox [data-geraet=ipad]');
  if (!(await p.textContent('#installBox')).includes('Zum Home-Bildschirm')) fail('iPad-Anleitung fehlt');
  await p.fill('#hilfeSuche', 'passwort vergessen');
  await p.waitForSelector('#hilfeTreffer details');
  if (!(await p.isHidden('#hilfeAlles'))) fail('Hilfe-Suche blendet den Rest nicht aus');
  await p.goto(BASE + '#/einstellungen?bereich=hilfe');
  await p.uncheck('#hilfeKnoepfe');
  await p.goto(BASE + '#/kunden');
  await p.waitForSelector('#liste');
  if (await p.isVisible('.seitenkopf h1 .hilfe-knopf')) fail('?-Knopf trotz Abschalten sichtbar');
  await p.goto(BASE + '#/einstellungen?bereich=hilfe');
  await p.check('#hilfeKnoepfe');
  // Einstellungen in Bereichen: breit Liste + Inhalt, Wechsel ohne Neuladen, Suche über alle Bereiche
  await p.goto(BASE + '#/einstellungen');
  if ((await p.locator('.einst-gruppe').count()) !== 8) fail('Einstellungen: nicht 8 Bereiche');
  if (!(await p.isVisible('#absender'))) fail('Einstellungen breit: Allgemein nicht vorausgewählt');
  await p.click('[data-gruppe-link=sicherheit]');
  if (!(await p.isVisible('#autoSperre')) || (await p.isVisible('#absender'))) fail('Bereichswechsel zeigt falschen Inhalt');
  await p.fill('#einstSuche', 'vorlage');
  if (!(await p.isVisible('#vReset')) || (await p.isVisible('#autoSperre'))) fail('Einstellungssuche findet Vorlagen nicht');
  await p.fill('#einstSuche', 'xyzunbekannt');
  if (!(await p.isVisible('.einst-keine'))) fail('Einstellungssuche ohne Treffer-Hinweis');
  await p.fill('#einstSuche', '');
  if (!(await p.isVisible('#autoSperre'))) fail('Nach Leeren der Suche nicht zurück im Bereich');
  // Kalender-Startansicht aus den Einstellungen
  await p.goto(BASE + '#/einstellungen?bereich=allgemein');
  await p.selectOption('#kalenderStart', 'woche');
  await p.goto(BASE + '#/termine');
  await p.waitForSelector('.k-raster');
  await p.goto(BASE + '#/einstellungen?bereich=allgemein');
  await p.selectOption('#kalenderStart', 'monat');
  // Klick aufs Logo führt zur Übersicht
  await p.goto(BASE + '#/termine');
  await p.click('.hauptnav .marke');
  await p.waitForSelector('.hero');
  // Feldverwaltung: Feld ausblenden (Daten bleiben), eigenes Ja/Nein-Feld anlegen, ausfüllen, filtern
  await p.goto(BASE + '#/einstellungen?bereich=kunden');
  await p.click('#felderEinstellungen details[data-kat=kontakt] summary');
  await p.uncheck('[data-feld-an="kontakt.firma"]');
  await p.click('#felderEinstellungen details[data-kat=vorwerk] summary');
  await p.click('[data-feld-neu=vorwerk]');
  await p.fill('dialog input[name=label]', 'Hund im Haus');
  await p.selectOption('dialog select[name=typ]', 'bool');
  await p.click('dialog button.primary');
  await p.waitForSelector('#felderEinstellungen details[data-kat=vorwerk][open] [data-feld-bearbeiten]');
  await p.goto(BASE + '#/kunden');
  await p.click('#liste a.zeile');
  await p.waitForSelector('[data-feld="vorname"]');
  if (await p.$('[data-feld="firma"]')) fail('Ausgeblendetes Feld Firma noch sichtbar');
  await p.click('button[data-tab=vorwerk]');
  const hundSel = await p.waitForSelector('select[data-feld^="eigene."]');
  await hundSel.selectOption('ja');
  await p.waitForTimeout(500);
  await p.click('button[data-tab=texte]');
  if (!(await p.inputValue('#text-vorwerk')).includes('Hund im Haus: ja')) fail('Eigenes Feld fehlt im Vorwerk-Text');
  if ((await p.inputValue('#text-pv')).includes('Hund im Haus')) fail('Eigenes Vorwerk-Feld im PV-Text (R-TEXT)');
  await p.goto(BASE + '#/kunden');
  await p.click('#fKnopf');
  await p.click('[data-f-eigen][data-wert=nein]');
  if ((await p.$$('#liste a.zeile')).length) fail('Filter eigenes Feld nein zeigt Kunden');
  await p.click('[data-f-eigen][data-wert=nein]');
  await p.click('[data-f-eigen][data-wert=ja]');
  if ((await p.$$('#liste a.zeile')).length !== 1) fail('Filter eigenes Feld ja falsch');
  await p.click('[data-f-alle]');
  await p.goto(BASE + '#/einstellungen?bereich=kunden');
  await p.click('#felderEinstellungen details[data-kat=kontakt] summary');
  await p.check('[data-feld-an="kontakt.firma"]');
  // Produktübersicht: Reiter, Kategorie, Suche, Detail
  await p.goto(BASE + '#/produkte?bereich=vorwerk');
  await p.waitForSelector('.produkt-kachel');
  if ((await p.textContent('#pListe')).includes('Enpal')) fail('Vorwerk-Reiter zeigt Enpal-Produkte');
  await p.fill('#pSuche', 'vk7');
  await p.waitForTimeout(100);
  const vk = await p.$$('.produkt-kachel');
  if (!vk.length) fail('Produktsuche VK7 ohne Treffer');
  await vk[0].click();
  await p.waitForSelector('dialog .produkt-detail');
  if (!(await p.textContent('dialog .produkt-detail')).includes('Stand')) fail('Produktdetail ohne Stand-Datum');
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  await p.click('dialog [data-link-kopieren]');
  await p.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('Link kopiert'));
  const kopiert = await p.evaluate(() => navigator.clipboard.readText());
  if (kopiert !== (await p.getAttribute('dialog .produkt-detail a.btn', 'href'))) fail('Produktlink nicht kopiert');
  await p.click('dialog .dlg-actions button.primary');
  await p.fill('#pSuche', '');
  // Förderung: Navigation, Bereich, Suche mit Hervorhebung, Zeitleiste springt, Kopieren mit Quellen
  await p.click('.hauptnav a[data-nav=foerderung]');
  await p.waitForSelector('#foeListe .foe-abschnitt');
  if (!(await p.textContent('.foe-intro')).includes('keine Rechts- oder Steuerberatung')) fail('Förderung ohne Hinweis');
  await p.click('#foeBereiche [data-bereich=wp]');
  if (await p.$('#foeListe .foe-pv')) fail('Förderung: WP-Reiter zeigt PV-Abschnitte');
  if (!(await p.$('#foeListe .foe-beide'))) fail('Förderung: gemeinsame Abschnitte fehlen unter WP');
  await p.click('#foeBereiche [data-bereich=alle]');
  await p.fill('#foeSuche', 'balkonkraftwerk');
  await p.waitForSelector('#foe-pv-balkon[open] mark');
  if ((await p.$$('#foeListe .foe-abschnitt')).length > 3) fail('Förderung: Suche filtert nicht');
  await p.fill('#foeSuche', '<img src=x onerror="window.__xss=1">');
  await p.waitForTimeout(100);
  if (await p.evaluate(() => window.__xss)) fail('XSS in der Förderung-Suche ausgeführt!');
  await p.fill('#foeSuche', '');
  if (await p.$eval('.foe-zeit', (d) => d.open)) fail('Förderung: Was kommt wann sollte eingeklappt starten');
  await p.click('.foe-zeit > summary');
  await p.click('.foe-zeitleiste [data-springen=wp-gmodg]');
  await p.waitForSelector('#foe-wp-gmodg[open]');
  await p.click('#foe-wp-gmodg [data-kopieren]');
  await p.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('Kopiert'));
  const foeText = await p.evaluate(() => navigator.clipboard.readText());
  if (!foeText.includes('Quellen:') || !foeText.includes('https://www.gmodg.bund.de') || !foeText.includes('Stand:')) fail('Förderung: Kopiertext ohne Quellen/Stand');
  await p.click('#foeWeiter');
  await p.waitForSelector('#foeWusstestText');
  // Rechner: Anschaffung ändern, Ergebnis rechnet neu, Wärmepumpe, Kopieren mit Annahmen
  await p.click('#rechner > summary');
  await p.waitForSelector('#rechner[open] #rz-investition');
  const vorher = await p.textContent('.rz-haupt b');
  await p.fill('#rz-investition', '40.000');
  await p.waitForFunction((v) => document.querySelector('.rz-haupt b')?.textContent !== v, vorher);
  await p.click('[data-rz-art=wp]');
  await p.waitForSelector('#rechner[open] #rz-jaz');
  await p.click('[data-rz-kopieren]');
  await p.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('Rechnung'));
  const rzText = await p.evaluate(() => navigator.clipboard.readText());
  if (!rzText.includes('Wärmepumpe') || !rzText.includes('ohne Gewähr') || !rzText.includes('Jahresarbeitszahl')) fail('Rechner: Kopiertext unvollständig');
  // Produkte im Gespräch markieren: beim Kunden, dann Verlauf, Text und Filter
  await p.goto(BASE + '#/kunden');
  await p.click('#liste a.zeile');
  await p.waitForSelector('[data-feld="vorname"]');
  await p.click('button[data-tab=pv]');
  await p.click('.produkte-markieren[data-bereich=pv] summary');
  await p.click('.produkte-markieren[data-bereich=pv] [data-mark=interesse]');
  await p.waitForSelector('.produkte-markieren[data-bereich=pv][open] .chip-wahl.aktiv[data-mark=interesse]');
  const markiert = await p.getAttribute('.produkte-markieren[data-bereich=pv] .chip-wahl.aktiv', 'data-produkt-mark');
  await p.click('button[data-tab=verlauf]');
  await p.waitForSelector('.verlauf-eintrag.art-produkt');
  await p.click('button[data-tab=texte]');
  if (!(await p.inputValue('#text-pv')).includes('Produkte – Interesse:')) fail('Produkt-Interesse fehlt im PV-Text');
  if ((await p.inputValue('#text-wp')).includes('Produkte – Interesse:')) fail('PV-Produkt im WP-Text (R-TEXT)');
  if ((await p.inputValue('#text-vorwerk')).includes('Produkte – Interesse:')) fail('PV-Produkt im Vorwerk-Text (R-TEXT)');
  await p.goto(BASE + '#/kunden');
  await p.click('#fKnopf');
  await p.click('[data-f-produkt=interesse]');
  if ((await p.$$('#liste a.zeile')).length !== 1) fail('Produktfilter Interesse falsch');
  await p.click('[data-f-alle]');
  if (!markiert) fail('Markiertes Produkt nicht erkennbar');
  // Einstellungen → Textbausteine: hinzufügen, erscheint im Gesprächsmodus
  await p.goto(BASE + '#/einstellungen?bereich=texte');
  await p.click('#bausteinEinstellungen details[data-baustein-bereich=vorwerk] summary');
  await p.fill('[data-bs-neu=vorwerk] input', 'E2E-Baustein Rückruf abends');
  await p.click('[data-bs-neu=vorwerk] button');
  await p.waitForSelector('#bausteinEinstellungen details[data-baustein-bereich=vorwerk][open] [data-bs-text]');
  if (!(await p.$$eval('[data-baustein-bereich=vorwerk] [data-bs-text]', (l) => l.some((i) => i.value === 'E2E-Baustein Rückruf abends')))) fail('Baustein nicht gespeichert');
  // per Griff zwei Plätze nach oben ziehen, dann per Tastatur einen zurück
  {
    const wert = (i) => p.$eval(`[data-baustein-bereich=vorwerk] [data-bs-text="${i}"]`, (x) => x.value).catch(() => '');
    const griffe = await p.$$('[data-baustein-bereich=vorwerk] [data-bs-griff]');
    const n = griffe.length;
    await griffe[n - 1].scrollIntoViewIfNeeded();
    const von = await griffe[n - 1].boundingBox();
    const nach = await griffe[n - 3].boundingBox();
    await p.mouse.move(von.x + von.width / 2, von.y + von.height / 2);
    await p.mouse.down();
    await p.mouse.move(nach.x + nach.width / 2, nach.y + 5, { steps: 8 });
    await p.mouse.move(nach.x + nach.width / 2, nach.y + 2, { steps: 2 });
    await p.mouse.up();
    await p.waitForTimeout(300);
    if ((await wert(n - 3)) !== 'E2E-Baustein Rückruf abends') fail(`Baustein per Griff nicht verschoben (n=${n}, an n-3: ${await wert(n - 3)}, an n-1: ${await wert(n - 1)})`);
    await p.focus(`[data-baustein-bereich=vorwerk] [data-bs-griff="${n - 3}"]`);
    await p.keyboard.press('ArrowDown');
    await p.waitForTimeout(300);
    if ((await wert(n - 2)) !== 'E2E-Baustein Rückruf abends') fail('Baustein per Pfeiltaste am Griff nicht verschoben');
  }
  await p.goto(BASE + '#/kunden');
  await p.click('#liste .zeile');
  await p.click('#gespraechStarten');
  await p.waitForSelector('.gm-sparten');
  if (!(await p.$('.gm-sparten [data-sparte=vorwerk].aktiv'))) await p.click('.gm-sparten [data-sparte=vorwerk]');
  await p.click('.gm-bausteine[data-gruppe=vorwerk] .gm-baustein:has-text("E2E-Baustein Rückruf abends")');
  if (!(await p.inputValue('textarea[data-gruppe=vorwerk]')).includes('E2E-Baustein Rückruf abends')) fail('Eigener Baustein nicht in Vorwerk-Notiz');
  if ((await p.$$('.gm-bausteine:not([data-gruppe=vorwerk]) .gm-baustein:has-text("E2E-Baustein")')).length) fail('Vorwerk-Baustein bei Enpal (R-TEXT)');
  await p.click('.gm-seiten [data-seite=abschluss]');
  await p.click('#gmVerwerfen');
  await p.click('dialog button.danger');
  await p.waitForFunction(() => /^#\/kunde\/[\w-]+(\?|$)/.test(location.hash));
  // Vorwerk-PDF-Liste importieren (selbst erzeugte Test-PDF, erfundene Namen)
  {
    const pdfPfad = require('path').join(require('os').tmpdir(), 'sperling-testliste.pdf');
    require('fs').writeFileSync(pdfPfad, require('./testliste-pdf.cjs').erzeugen());
    await p.goto(BASE + '#/kunden');
    const [pfc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#pdfImport')]);
    await pfc.setFiles(pdfPfad);
    await p.waitForSelector('dialog .li-tabelle', { timeout: 20000 });
    const kopfText = await p.textContent('dialog .dlg-body');
    if (!kopfText.includes('32 Kunden erkannt') || !kopfText.includes('1 doppelte')) fail(`PDF-Import: Erkennung falsch (${kopfText.slice(0, 120)})`);
    await p.uncheck('dialog [data-li="0"]');
    await p.click('dialog button.primary');
    await p.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('31 neue'));
    await p.fill('#suche', 'Fricke');
    await p.waitForFunction(() => document.querySelectorAll('#liste .zeile').length === 2);
    await p.fill('#suche', 'Ahrens');
    await p.waitForTimeout(300);
    if (await p.$('#liste .zeile')) fail('Abgewählter Eintrag trotzdem übernommen');
    // Zweiter Import: nur noch Ahrens neu, Rest unverändert
    const [pfc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#pdfImport')]);
    await pfc2.setFiles(pdfPfad);
    await p.waitForSelector('dialog .li-tabelle', { timeout: 20000 });
    if (!(await p.textContent('dialog .li-summe')).includes('1 neu')) fail('PDF-Import: zweiter Abgleich falsch');
    await p.click('dialog .dlg-actions button.ghost');
    await p.fill('#suche', '');
  }
  // Kürzere Wege: Schnellnotiz aus der Liste, „Als Nächstes“, Abhaken mit Folge-Wiedervorlage, „+“-Knopf
  {
    await p.goto(BASE + '#/kunden');
    await p.fill('#suche', 'Fricke');
    await p.waitForSelector('#liste li.kz [data-schnell=notiz]');
    const kid = await p.getAttribute('#liste li.kz', 'data-kunde');
    await p.click('#liste li.kz [data-schnell=notiz]');
    await p.fill('dialog textarea[name=text]', 'E2E-Schnellnotiz');
    const heute = await p.evaluate(() => { const d = new Date(); d.setHours(0, 5, 0, 0); const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T00:05`; });
    await p.fill('dialog input[name=wv]', heute);
    await p.click('dialog button.primary');
    await p.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('Notiz und Wiedervorlage gespeichert'));
    await p.fill('#suche', '');
    if (!(await p.isVisible('#plusKnopf'))) fail('„+“-Knopf fehlt in der Kundenliste');
    await p.goto(BASE + '#/');
    await p.waitForSelector('#alsNaechstes [data-an=erledigt]');
    const zeile = p.locator('#faellig li.termin', { hasText: 'Nachfassen: E2E-Schnellnotiz' });
    await zeile.locator('[data-aktion=erledigt]').click();
    await p.waitForSelector('dialog.dlg-abhaken');
    await p.click('dialog [data-baustein="Nicht erreicht"]');
    await p.click('dialog [data-wv-schritt="3t"]');
    await p.click('dialog .dlg-actions button.primary');
    await p.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('nächste Wiedervorlage'));
    await p.goto(BASE + '#/kunde/' + kid + '?tab=notizen');
    await p.waitForSelector('.notizliste');
    const notizen = await p.textContent('.notizliste');
    if (!notizen.includes('Nachfassen: E2E-Schnellnotiz erledigt: Nicht erreicht')) fail('Abhaken: Notiz fehlt beim Kunden');
    await p.click('button[data-tab=termine]');
    const offen = await p.locator('.terminliste li.termin:not(.erledigt)', { hasText: 'Nachfassen: E2E-Schnellnotiz' }).count();
    if (offen !== 1) fail('Abhaken: Folge-Wiedervorlage fehlt (' + offen + ')');
    // „+“ auf der Kundenseite: Termin gehört zum geöffneten Kunden
    await p.click('#plusKnopf');
    await p.waitForSelector('dialog.dlg-plus');
    await p.click('dialog [data-plus=termin]');
    await p.waitForSelector('dialog input[name=titel]');
    if ((await p.inputValue('dialog input[name=kundeId]')) !== kid) fail('„+“: Termin nicht beim geöffneten Kunden');
    await p.click('dialog .dlg-actions button.ghost');
    await p.goto(BASE + '#/kunde/' + kid + '/gespraech');
    await p.waitForTimeout(300);
    if (await p.isVisible('#plusKnopf')) fail('„+“-Knopf im Gesprächsmodus sichtbar');
    await p.goto(BASE + '#/karte');
    await p.waitForTimeout(300);
    if (await p.isVisible('#plusKnopf')) fail('„+“-Knopf auf der Karte sichtbar');
    if (await p.evaluate(() => window.__xss)) fail('XSS bei den Schnellknöpfen ausgeführt!');
  }
  // Vertriebswerkzeuge (0.12.0): Ansprechpartner, Haustür, Angebot mit Nachfassen, Auftrag, Pflege, Terminbestätigung
  {
    await p.goto(BASE + '#/kunden');
    await p.click('#neu');
    await p.waitForSelector('[data-feld="nachname"]');
    await p.fill('[data-feld="nachname"]', 'Vertrieb');
    await p.fill('[data-feld="firma"]', '<img src=x onerror="window.__xss=1">Hof');
    await p.fill('[data-feld="telefon"]', '0170 1112223');
    await p.waitForTimeout(500);
    const vid = (await p.evaluate(() => location.hash)).match(/kunde\/([^?]+)/)[1];
    await p.goto(BASE + '#/kunde/' + vid);
    await p.waitForSelector('.ap-box [data-ap-neu]');
    await p.click('.ap-box [data-ap-neu]');
    await p.fill('dialog input[name=name]', '<img src=x onerror="window.__xss=1">Heinz');
    await p.selectOption('dialog select[name=rolle]', 'technik');
    await p.click('dialog .dlg-actions button.primary');
    await p.waitForSelector('.ap-liste li');
    if (!(await p.textContent('.ap-box')).includes('Entscheidet')) fail('Ansprechpartner: Hinweis auf fehlenden Entscheider fehlt');
    await p.click('.haustuer-box [data-haustuer=werbeverbot]');
    await p.waitForSelector('#kBand .werbeverbot-band');
    await p.click('button[data-tab=angebote]');
    await p.click('#angNeu');
    await p.fill('dialog input[name=titel]', 'PV <img src=x onerror="window.__xss=1">');
    await p.fill('dialog input[name=betrag]', '18.900');
    await p.click('dialog .dlg-actions button.primary');
    await p.waitForSelector('.ang-liste li');
    if ((await p.textContent('.ang-betrag')).trim() !== '18.900 €') fail('Angebot: Betrag falsch: ' + (await p.textContent('.ang-betrag')));
    if (!(await p.textContent('.ang-summe')).includes('18.900')) fail('Angebot: offene Summe fehlt');
    await p.click('button[data-tab=termine]');
    if ((await p.locator('.terminliste li.termin:not(.erledigt)', { hasText: 'Angebot nachfassen' }).count()) !== 2) fail('Angebot: 2 Nachfass-Wiedervorlagen erwartet');
    await p.click('button[data-tab=angebote]');
    await p.click('.ang-liste [data-ang=angenommen]');
    await p.click('dialog .dlg-actions button.primary');
    await p.waitForSelector('.auftrag[data-sparte=pv]');
    if (!(await p.getAttribute('#kChips .bereich-chip-pv', 'title')).includes('Abschluss')) fail('Angebot angenommen: Status nicht Abschluss');
    // Alle Schritte abhaken; beim letzten kommen die Pflege-Vorschläge
    for (let i = 0; i < 5; i++) {
      const box = p.locator('.auftrag[data-sparte=pv] input[data-schritt]:not(:checked)').first();
      if (!(await box.count())) break;
      await box.click();
      await p.waitForTimeout(150);
    }
    await p.waitForSelector('dialog [name=p]');
    await p.click('dialog .dlg-actions button.primary');
    await p.waitForFunction(() => /Wiedervorlage/.test(document.querySelector('#toast')?.textContent || ''));
    await p.click('button[data-tab=termine]');
    if ((await p.locator('.terminliste li.termin:not(.erledigt)', { hasText: 'Angebot nachfassen' }).count()) !== 0) fail('Angebot angenommen: Nachfass-Wiedervorlagen nicht erledigt');
    if (!(await p.locator('.terminliste li.termin', { hasText: 'Läuft die PV-Anlage' }).count())) fail('Pflege-Wiedervorlage fehlt');
    // Termin bestätigen: Termin anlegen, Karte öffnen, Bestätigung als Text kopieren
    await p.click('#neu');
    await p.selectOption('dialog select[name=art]', 'termin');
    await p.fill('dialog input[name=titel]', 'Beratung vor Ort');
    await p.selectOption('dialog select[name=sparte]', 'pv');
    await p.click('dialog .dlg-actions button.primary');
    await p.waitForSelector('.terminliste li.termin >> text=Beratung vor Ort');
    await p.locator('.terminliste li.termin', { hasText: 'Beratung vor Ort' }).locator('.termin-titel').click();
    await p.click('dialog [data-tk=bestaetigen]');
    await p.waitForSelector('dialog textarea[name=text]');
    const best = await p.inputValue('dialog textarea[name=text]');
    if (!/Beratung Photovoltaik/.test(best) || !/Stromrechnung/.test(best)) fail('Terminbestätigung: Text unvollständig');
    if (!(await p.$('dialog .werbeverbot-band'))) fail('Terminbestätigung: Hinweis „Keine Werbung“ fehlt');
    await p.uncheck('dialog [name=b] >> nth=0');
    if (/Stromrechnung/.test(await p.inputValue('dialog textarea[name=text]'))) fail('Terminbestätigung: abgewählter Punkt bleibt im Text');
    if (!(await p.locator('dialog .dlg-actions button', { hasText: 'WhatsApp' }).count())) fail('Terminbestätigung: WhatsApp fehlt');
    await p.locator('dialog .dlg-actions button', { hasText: 'Kopieren' }).click();
    await p.waitForTimeout(200);
    await p.click('button[data-tab=verlauf]');
    if (!(await p.textContent('.verlauf')).includes('Keine Werbung erwünscht')) fail('Haustür fehlt im Verlauf');
    if (await p.evaluate(() => window.__xss)) fail('XSS in den Vertriebswerkzeugen ausgeführt!');
    // Nach Neuladen ist alles noch da (verschlüsselt gespeichert)
    await p.waitForTimeout(600);
    await p.reload();
    await p.fill('input[name=pw]', 'testpasswort');
    await p.click('#sperrForm button');
    await p.waitForSelector('.hauptnav');
    await p.goto(BASE + '#/kunde/' + vid + '?tab=angebote');
    await p.waitForSelector('.ang-liste li.ang-angenommen');
    await p.waitForSelector('.auftrag[data-sparte=pv] .auftrag-balken');
  }
  // Tagesroute und Haustür auf der Karte (Demo mit Beispieldaten, eigener Tab)
  {
    const dp = await ctx.newPage();
    dp.on('pageerror', (e) => errs.push('Demo: ' + e.message));
    await dp.goto(BASE + '?demo');
    await dp.waitForSelector('.hauptnav');
    const ueber = await dp.evaluate(() => { const x = new Date(); x.setDate(x.getDate() + 2); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; });
    await dp.goto(BASE + '?demo#/karte?route=' + ueber);
    await dp.waitForSelector('#rPanel:not([hidden]) .route-liste li');
    const stopps = await dp.locator('#rInhalt ol.route-liste > li').count();
    if (stopps < 3) fail('Tagesroute: mindestens 3 Termine erwartet, gefunden ' + stopps);
    const ohneOrt = await dp.locator('#rInhalt ol.route-liste > li', { hasText: 'ohne Standort' }).count();
    if ((await dp.locator('.route-nr').count()) !== stopps - ohneOrt) fail('Tagesroute: Nummern auf der Karte fehlen');
    if (!(await dp.textContent('#rInhalt ol.route-liste')).includes('Bäckerei Test')) fail('Tagesroute: Beispieltermin fehlt');
    if (!(await dp.textContent('#rInhalt')).includes('Unterwegs vorbeischauen')) fail('Tagesroute: Vorschläge fehlen');
    if (!(await dp.$('#rInhalt a[href*="google.com/maps/dir"]'))) fail('Tagesroute: Link für die ganze Route fehlt');
    if (/Bäckerei|Muster|Probe/.test(await dp.getAttribute('#rInhalt a[href*="google.com/maps/dir"]', 'href'))) fail('Tagesroute: Namen im Routenlink');
    await dp.click('#rKnopf');
    if (await dp.isVisible('#rPanel')) fail('Tagesroute lässt sich nicht schließen');
    // Haustür in der Infobox eines Pins
    await dp.goto(BASE + '?demo#/kunden');
    await dp.goto(BASE + '?demo#/karte?kunde=demo-2');
    await dp.waitForSelector('.leaflet-popup .haustuer-knoepfe');
    await dp.click('.leaflet-popup [data-haustuer=spaeter]');
    await dp.waitForFunction(() => /Später wiederkommen/.test(document.querySelector('#toast')?.textContent || ''));
    await dp.close();
  }
  // Unbekannte Route / unbekannter Kunde stürzen nicht ab
  await p.goto(BASE + '#/kunde/gibtsnicht');
  await p.waitForSelector('.leer');
  await p.goto(BASE + '#/quatsch');
  await p.waitForSelector('.hero');
  if (errs.length) fail('Seitenfehler: ' + errs.join(' | '));
  console.log(process.exitCode ? 'E2E FEHLGESCHLAGEN' : 'E2E OK');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
