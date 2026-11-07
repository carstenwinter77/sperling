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
  if (await p.evaluate(() => window.__xss)) fail('XSS ausgeführt!');
  // Backup herunterladen, Klartext darf nicht drin sein
  await p.goto(BASE + '#/einstellungen');
  const [bk] = await Promise.all([p.waitForEvent('download'), p.click('#backup')]);
  const bkTxt = require('fs').readFileSync(await bk.path(), 'utf8');
  if (bkTxt.includes('Prüfer') || bkTxt.includes('Testnotiz')) fail('Backup enthält Klartext!');
  // Historie vorhanden
  await p.waitForTimeout(500);
  if (!(await p.$('#historie [data-i]'))) fail('Keine Versionshistorie');
  // Kunde löschen
  await p.goto(BASE + '#/kunden');
  await p.click('#liste .zeile');
  await p.click('#loeschen');
  await p.click('dialog button.danger');
  await p.waitForFunction(() => location.hash === '#/kunden');
  // Unbekannte Route / unbekannter Kunde stürzen nicht ab
  await p.goto(BASE + '#/kunde/gibtsnicht');
  await p.waitForSelector('.leer');
  await p.goto(BASE + '#/quatsch');
  await p.waitForSelector('.hero');
  if (errs.length) fail('Seitenfehler: ' + errs.join(' | '));
  console.log(process.exitCode ? 'E2E FEHLGESCHLAGEN' : 'E2E OK');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
