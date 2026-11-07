// End-to-End-Test im echten Browser (Playwright). Start: python3 -m http.server 8765 & node tests/e2e.cjs
const { chromium } = require('playwright');
const BASE = process.env.SPERLING_URL || 'http://localhost:8765/';
const fail = (m) => { console.error('FEHLER:', m); process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => { errs.push('Natives Dialogfenster: ' + d.message()); d.dismiss(); });
  await p.goto(BASE);
  // Einrichten
  await p.fill('input[name=pw]', 'testpasswort');
  await p.fill('input[name=pw2]', 'testpasswort');
  await p.click('#sperrForm button');
  await p.waitForSelector('.hauptnav');
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
  const en = await p.inputValue('#text-enpal');
  if (!en.includes('Testnotiz')) fail('WP-Notiz fehlt im Enpal-Text');
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
  // Backup herunterladen, Klartext darf nicht drin sein
  await p.goto(BASE + '#/einstellungen');
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
  await p.waitForFunction(() => document.querySelector('#letzteSicherung')?.textContent.includes('Letzte Sicherung'));
  // Sicherung wieder einspielen
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#import')]);
  await fc.setFiles(icPfad);
  await p.fill('dialog [name=pw]', 'testpasswort');
  await p.click('dialog button.primary');
  await p.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('eingespielt'));
  // Beispielkunden laden und entfernen
  await p.click('#beispielLaden');
  await p.waitForFunction(() => document.querySelector('#beispielInfo')?.textContent.includes('5 Beispielkunden'));
  await p.goto(BASE + '#/kunden');
  await p.waitForSelector('#liste .tag-beispiel');
  if ((await p.locator('#liste .tag-beispiel').count()) !== 5) fail('Beispielkunden nicht markiert');
  await p.goto(BASE + '#/einstellungen');
  await p.click('#beispielWeg');
  await p.click('dialog button.danger');
  await p.waitForFunction(() => document.querySelector('#beispielInfo')?.textContent.includes('Keine Beispielkunden'));
  await p.goto(BASE + '#/kunden');
  await p.waitForSelector('#liste .zeile');
  if (await p.$('#liste .tag-beispiel')) fail('Beispielkunden nicht entfernt');
  if (!(await p.textContent('#liste')).includes('Prüfer')) fail('Echter Kunde beim Entfernen verloren!');
  await p.goto(BASE + '#/einstellungen');
  // Beispiel-Vorführbestand
  await p.click('#bestandLaden');
  await p.waitForFunction(() => /\d+ Beispielgeräte/.test(document.querySelector('#bestandInfo')?.textContent || ''));
  await p.goto(BASE + '#/bestand');
  await p.waitForSelector('.tag-beispiel');
  // Reservieren: für den Kunden, zweite Reservierung im selben Zeitraum wird abgelehnt
  const karte = p.locator('article.geraet').first();
  await karte.locator('[data-aktion=reservieren]').click();
  await p.selectOption('dialog [name=kunde]', { index: 1 });
  await p.click('dialog button.primary');
  await p.waitForSelector('article.geraet [data-resv]');
  await karte.locator('[data-aktion=reservieren]').click();
  await p.click('dialog button.primary');
  await p.waitForFunction(() => (document.querySelector('#toast')?.textContent || '').startsWith('Belegt'));
  await p.click('dialog .dlg-actions button.ghost');
  await p.goto(BASE + '#/termine?ansicht=monat');
  await p.waitForSelector('.k-resv');
  await p.goto(BASE + '#/einstellungen');
  await p.click('#bestandWeg');
  await p.click('dialog button.danger');
  await p.waitForFunction(() => (document.querySelector('#bestandInfo')?.textContent || '').includes('Kein Beispielbestand'));
  // Historie vorhanden
  await p.waitForTimeout(500);
  if (!(await p.$('#historie [data-i]'))) fail('Keine Versionshistorie');
  // Kalender: Woche, Fingertipp auf eine Uhrzeit legt Termin an
  await p.goto(BASE + '#/termine');
  await p.click('.tabs [data-ansicht=woche]');
  await p.waitForSelector('.k-spalte');
  if (!(await p.evaluate(() => location.hash.includes('ansicht=woche')))) fail('Ansicht nicht in der Adresse');
  const sp = await p.locator('.k-spalte').nth(2).boundingBox();
  await p.mouse.click(sp.x + 20, sp.y + 26 * 8 + 5); // 10:00
  await p.waitForSelector('dialog [name=titel]');
  if ((await p.inputValue('dialog [name=beginn]')).slice(11) !== '10:00') fail('Beginn aus Kalender falsch: ' + await p.inputValue('dialog [name=beginn]'));
  if ((await p.inputValue('dialog [name=dauerMin]')) !== '60') fail('Dauer aus Kalender falsch');
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
  await p.locator('.k-tag:not(.fremd)').nth(14).click({ position: { x: 40, y: 80 } });
  await p.waitForSelector('dialog [name=titel]');
  await p.click('dialog .dlg-actions button.ghost');
  await p.locator('.k-tag.heute .k-nr').click();
  await p.waitForSelector('.k-raster[style*="--spalten:1"]');
  await p.click('.k-nav [data-schritt="1"]');
  await p.click('.k-nav [data-schritt="0"]');
  await p.click('.tabs [data-ansicht=woche]');
  await p.locator('.k-block .k-eintrag', { hasText: 'Kalendertermin' }).click();
  await p.waitForSelector('dialog');
  await p.click('dialog .dlg-actions button.ghost');
  await p.click('.tabs [data-ansicht=liste]');
  await p.waitForSelector('.terminliste');
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
  await p.goto(BASE + '#/einstellungen');
  await p.click('#papierkorb [data-zurueck]');
  await p.goto(BASE + '#/kunden');
  await p.waitForSelector('#liste .zeile');
  if (!(await p.textContent('#liste')).includes('Prüfer')) fail('Kunde nicht wiederhergestellt');
  // Unbekannte Route / unbekannter Kunde stürzen nicht ab
  await p.goto(BASE + '#/kunde/gibtsnicht');
  await p.waitForSelector('.leer');
  await p.goto(BASE + '#/quatsch');
  await p.waitForSelector('.hero');
  if (errs.length) fail('Seitenfehler: ' + errs.join(' | '));
  console.log(process.exitCode ? 'E2E FEHLGESCHLAGEN' : 'E2E OK');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
