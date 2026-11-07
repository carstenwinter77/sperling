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
  // Kalender schlägt den ersten freien Tag vor; getippt auf den belegten Tag -> Ablehnung
  const morgenTag = await p.evaluate(() => { const d = new Date(Date.now() + 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  if ((await p.inputValue('dialog [name=von]')) === morgenTag) fail('Belegter Tag als Beginn vorgeschlagen');
  await p.click('dialog .zr-tippen summary');
  await p.fill('dialog [name=von]', morgenTag);
  await p.fill('dialog [name=bis]', morgenTag);
  await p.click('dialog button.primary');
  await p.waitForFunction(() => (document.querySelector('#toast')?.textContent || '').startsWith('Belegt'));
  await p.click('dialog .dlg-actions button.ghost');
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
  await p.click('.tabs [data-ansicht=liste]');
  await p.waitForFunction(() => /Reservierung/.test(document.querySelector('main')?.textContent || ''));
  await p.click('.tabs [data-ansicht=frei]');
  await p.waitForSelector('#bkFreie');
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
  // Kundenliste: Filter, Sortierung nach letztem Kontakt, Kontakt von Hand
  await p.goto(BASE + '#/kunden');
  await p.click('#fKnopf');
  await p.click('#kFilter [data-f-kontakt=nie]');
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
  await p.click('.gm-leitfaden .einwand >> nth=0');
  await p.click('.gm-leitfaden [data-ergebnis=ueberzeugt]');
  await p.click('.gm-seiten [data-seite=notizen]');
  if ((await p.inputValue('textarea[data-gruppe] >> nth=0')) !== 'E2E-Gesprächsnotiz Speicherwunsch') fail('Notiz nach Leitfaden verloren');
  await p.click('.gm-seiten [data-seite=abschluss]');
  await p.selectOption('[data-abschluss] [name=ausgang] >> nth=0', 'wiedervorlage');
  await p.click('#gmSpeichern');
  await p.waitForSelector('.verlauf');
  if (!(await p.textContent('.verlauf')).includes('E2E-Gesprächsnotiz')) fail('Gespräch fehlt im Verlauf');
  if (!(await p.textContent('.verlauf')).includes('Wiedervorlage vereinbart')) fail('Ergebnis fehlt im Verlauf');
  // Vom Leitfaden aus nahtlos in die geteilte Ansicht
  await p.goto(BASE + '#/gespraech');
  await p.selectOption('#gKunde', { index: 1 });
  await p.click('#gInhalt .einwand >> nth=1');
  await p.click('#gGeteilt');
  await p.waitForSelector('.gm-leitfaden .einwand.e-offen');
  await p.click('.gm-seiten [data-seite=abschluss]');
  await p.click('#gmVerwerfen');
  await p.click('dialog button.danger');
  await p.waitForFunction(() => /^#\/kunde\/[\w-]+$/.test(location.hash));
  // Beratungs-Schutz: nur der beratene Kunde, andere Seiten führen zu ihm zurück, Aufheben nur mit Passwort
  await p.goto(BASE + '#/kunden');
  await p.click('#liste .zeile');
  await p.waitForSelector('#kTitel');
  const beraten = await p.textContent('#kTitel');
  await p.click('#schutzKnopf');
  await p.waitForSelector('#schutzBand:not([hidden])');
  await p.evaluate(() => { location.hash = '#/kunden'; });
  await p.waitForFunction(() => /^#\/kunde\//.test(location.hash));
  await p.evaluate(() => { location.hash = '#/gespraech'; });
  await p.waitForSelector('#gKunde');
  if ((await p.$$eval('#gKunde option', (o) => o.length)) !== 2) fail('Im Schutz sind andere Kunden im Leitfaden wählbar');
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
  await p.waitForSelector('.aw-zahlen .aw-zahl');
  await p.click('[data-bereich=pv]');
  await p.click('[data-periode=woche]');
  const kw = await p.textContent('.aw-kopf h2');
  await p.click('.k-nav [data-schritt="-1"]');
  if ((await p.textContent('.aw-kopf h2')) === kw) fail('Blättern in Auswertungen ohne Wirkung');
  if (await p.$('.aw-zahl >> text=Kaufquote')) fail('Kaufquote im PV-Bericht');
  await p.click('[data-periode="365"]');
  if (!(await p.textContent('.aw-kopf h2')).startsWith('Letzte 365 Tage')) fail('365-Tage-Bericht fehlt');
  await p.click('#awPdf');
  await p.waitForFunction(() => /auswertung-pv-365-.*\.pdf/.test(document.querySelector('dialog')?.textContent || ''));
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
  await p.goto(BASE + '#/einstellungen');
  await p.uncheck('#hilfeKnoepfe');
  await p.goto(BASE + '#/kunden');
  await p.waitForSelector('#liste');
  if (await p.isVisible('.seitenkopf h1 .hilfe-knopf')) fail('?-Knopf trotz Abschalten sichtbar');
  await p.goto(BASE + '#/einstellungen');
  await p.check('#hilfeKnoepfe');
  // Klick aufs Logo führt zur Übersicht
  await p.goto(BASE + '#/termine');
  await p.click('.hauptnav .marke');
  await p.waitForSelector('.hero');
  // Unbekannte Route / unbekannter Kunde stürzen nicht ab
  await p.goto(BASE + '#/kunde/gibtsnicht');
  await p.waitForSelector('.leer');
  await p.goto(BASE + '#/quatsch');
  await p.waitForSelector('.hero');
  if (errs.length) fail('Seitenfehler: ' + errs.join(' | '));
  console.log(process.exitCode ? 'E2E FEHLGESCHLAGEN' : 'E2E OK');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
