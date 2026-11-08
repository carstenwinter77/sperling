// Face ID / Touch ID (WebAuthn + PRF) mit virtuellem Authenticator in Chromium.
const { chromium } = require('playwright');
const BASE = process.env.SPERLING_URL || 'http://localhost:8765/';
const fail = (m) => { console.error('FEHLER:', m); process.exitCode = 1; };
async function lauf(mitPrf) {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  await ctx.addInitScript(() => { try { localStorage.setItem('sperling.hilfe', JSON.stringify({ tourGesehen: true })); } catch { /* egal */ } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', ctap2Version: 'ctap2_1', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, hasPrf: mitPrf, automaticPresenceSimulation: true } });
  await p.goto(BASE);
  await p.fill('input[name=pw]', 'testpasswort');
  await p.fill('input[name=pw2]', 'testpasswort');
  await p.click('#sperrForm button');
  await p.waitForSelector('dialog');
  await p.locator('dialog .dlg-actions button.primary').click();
  await p.waitForTimeout(2000);
  await p.click('#sperren');
  await p.waitForSelector('#sperrForm');
  await p.reload();
  await p.waitForSelector('#sperrForm');
  const knopf = await p.locator('#bioEntsperren').count();
  if (mitPrf) {
    if (!knopf) fail('Face-ID-Knopf fehlt');
    await p.click('#bioEntsperren');
    await p.waitForSelector('.hauptnav', { timeout: 8000 }).catch(() => fail('Entsperren per Face ID klappt nicht'));
    // Passwort ändern schaltet Face ID ab
    await p.goto(BASE + '#/einstellungen?bereich=sicherheit');
    await p.click('#pw');
    await p.fill('dialog [name=alt]', 'testpasswort');
    await p.fill('dialog [name=neu]', 'neuespasswort');
    await p.fill('dialog [name=neu2]', 'neuespasswort').catch(() => {});
    await p.locator('dialog .dlg-actions button.primary').click();
    await p.waitForTimeout(1500);
    if (!(await p.textContent('#bio')).includes('einrichten')) fail('Face ID nach Passwortwechsel nicht abgeschaltet');
  } else if (knopf) fail('Face ID ohne PRF angeboten');
  if (errs.length) fail('Seitenfehler: ' + errs.join(' | '));
  await b.close();
}
(async () => {
  await lauf(true);
  await lauf(false);
  console.log(process.exitCode ? 'FACEID FEHLGESCHLAGEN' : 'FACEID OK');
})().catch((e) => { console.error(e); process.exit(1); });
