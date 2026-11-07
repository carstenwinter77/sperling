// Sperling – Einstiegspunkt: Sperrbildschirm, Navigation, Router, Auto-Sperre, Fehlerbehandlung.
import * as store from './storage/store.js';
import * as sync from './storage/sync.js';
import * as dbx from './storage/dropbox.js';
import { WrongPasswordError } from './core/crypto.js';
import { esc } from './core/util.js';
import { $, toast, maskottchen, dialog } from './ui/dom.js';
import { demoDaten } from './demo.js';
import * as theme from './ui/theme.js';
import * as bio from './storage/biometrie.js';
import { badgeSetzen } from './ui/badge.js';
import * as update from './ui/update.js';
import { APP_VERSION } from './ui/views/einstellungen.js';
import * as db from './storage/db.js';
import * as vStart from './ui/views/start.js';
import * as vKunden from './ui/views/kunden.js';
import * as vKunde from './ui/views/kunde.js';
import * as vKarte from './ui/views/karte.js';
import * as vTermine from './ui/views/termine.js';
import * as vEinst from './ui/views/einstellungen.js';
import * as vBestand from './ui/views/bestand.js';
import * as vGespraech from './ui/views/gespraech.js';

const ROUTEN = [
  { muster: /^\/?$/, view: vStart, nav: 'start' },
  { muster: /^\/kunden$/, view: vKunden, nav: 'kunden' },
  { muster: /^\/kunde\/([\w-]+)$/, view: vKunde, nav: 'kunden' },
  { muster: /^\/karte$/, view: vKarte, nav: 'karte' },
  { muster: /^\/termine$/, view: vTermine, nav: 'termine' },
  { muster: /^\/einstellungen$/, view: vEinst, nav: 'einstellungen' },
  { muster: /^\/bestand$/, view: vBestand, nav: 'bestand' },
  { muster: /^\/gespraech$/, view: vGespraech, nav: 'gespraech' },
];

const NAV = [
  { key: 'start', href: '#/', label: 'Übersicht', bild: 'sperling' },
  { key: 'kunden', href: '#/kunden', label: 'Kunden', bild: 'kunde-neu' },
  { key: 'karte', href: '#/karte', label: 'Karte', bild: 'karte' },
  { key: 'termine', href: '#/termine', label: 'Termine', bild: 'termine' },
  { key: 'gespraech', href: '#/gespraech', label: 'Gespräch', bild: 'notizen' },
  { key: 'bestand', href: '#/bestand', label: 'Bestand', bild: 'vorwerk' },
  { key: 'einstellungen', href: '#/einstellungen', label: 'Einstellungen', bild: 'einstellungen' },
];

let aufraeumen = null;

theme.anwenden();
// Zahl am App-Symbol bei jeder Änderung aktualisieren (nicht im Demo-Modus)
store.subscribe(() => { if (!store.isDemo() && store.isUnlocked()) badgeSetzen(store.getData()); });
setInterval(() => { if (!store.isDemo() && store.isUnlocked()) badgeSetzen(store.getData()); }, 10 * 60 * 1000);

// ---------- Fehler: nie still abstürzen ----------
window.addEventListener('error', (e) => {
  console.error(e.error || e.message);
  toast('Unerwarteter Fehler – deine Daten sind sicher. Details in der Konsole.', 'error', 5000);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  toast(`Fehler: ${e.reason?.message || e.reason}`, 'error', 5000);
});

// ---------- Sperrbildschirm ----------
async function zeigeSperre(fehler = '') {
  aufraeumen?.(); aufraeumen = null;
  document.body.classList.add('gesperrt');
  document.body.classList.remove('demo');
  const hatDaten = await store.hasVault().catch(() => false);
  const mitBio = hatDaten && (await bio.eingerichtet());
  $('#app').innerHTML = `
    <main class="sperre">
      ${maskottchen('sperling', 'sperre-bild', 'Sperling')}
      <h1>Sperling</h1>
      <p class="untertitel">Dein Außendienst-Begleiter für Photovoltaik, Wärmepumpe und Vorwerk</p>
      <form id="sperrForm" class="sperre-form">
        ${hatDaten
    ? '<label>Master-Passwort<input type="password" name="pw" autocomplete="current-password" required autofocus></label><button class="btn primary">Entsperren</button>'
    : `<p>Willkommen! Lege ein Master-Passwort fest. Damit werden alle Daten verschlüsselt. <b>Ohne dieses Passwort sind die Daten nicht wiederherstellbar.</b></p>
           <label>Neues Master-Passwort (mind. 8 Zeichen)<input type="password" name="pw" minlength="8" autocomplete="new-password" required></label>
           <label>Wiederholen<input type="password" name="pw2" minlength="8" autocomplete="new-password" required></label>
           <button class="btn primary">Einrichten</button>`}
        <p class="fehler" id="sperrFehler">${esc(fehler)}</p>
      </form>
      ${mitBio ? `<button class="btn primary bio-knopf" id="bioEntsperren">🔓 Mit ${esc(bio.bezeichnung())} entsperren</button>` : ''}
      <button class="btn ghost" id="demo">Demo mit Beispielkunden ansehen</button>
    </main>`;
  const form = $('#sperrForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Bitte warten …';
    try {
      if (hatDaten) {
        await store.unlock(form.pw.value);
        bioAnbieten(form.pw.value);
      } else {
        if (form.pw.value.length < 8) throw new Error('Mindestens 8 Zeichen.');
        if (form.pw.value !== form.pw2.value) throw new Error('Passwörter stimmen nicht überein.');
        await store.setup(form.pw.value);
        bioAnbieten(form.pw.value);
      }
      form.reset();
      await nachEntsperren();
    } catch (err) {
      $('#sperrFehler').textContent = err instanceof WrongPasswordError ? 'Falsches Passwort.' : err.message;
      btn.disabled = false;
      btn.textContent = hatDaten ? 'Entsperren' : 'Einrichten';
    }
  });
  $('#demo').addEventListener('click', () => { store.startDemo(demoDaten()); nachEntsperren(); });
  $('#bioEntsperren')?.addEventListener('click', async (ev) => {
    const b = ev.currentTarget;
    b.disabled = true;
    try {
      const pw = await bio.passwortHolen();
      try {
        await store.unlock(pw);
      } catch (err) {
        if (err instanceof WrongPasswordError) {
          await bio.ausschalten(); // Passwort wurde inzwischen geändert (z. B. auf anderem Gerät)
          throw new Error('Das Passwort wurde geändert. Bitte einmal mit Passwort entsperren, danach kannst du Face ID neu einrichten.');
        }
        throw err;
      }
      await nachEntsperren();
    } catch (err) {
      $('#sperrFehler').textContent = bio.fehlerText(err);
      b.disabled = false;
    }
  });
}

/**
 * Nach dem Entsperren mit Passwort einmalig Face ID anbieten (wenn verfügbar und noch nicht gefragt).
 * Das Einrichten startet direkt im Tipp auf „Einrichten“ (Safari verlangt eine Nutzeraktion).
 */
async function bioAnbieten(passwort) {
  try {
    if (!(await bio.verfuegbar()) || (await bio.eingerichtet()) || (await db.getMeta('biometrieGefragt'))) return;
    await db.setMeta('biometrieGefragt', true);
  } catch { return; }
  setTimeout(() => {
    dialog({
      titel: `${bio.bezeichnung()} verwenden?`,
      html: `<p>Sperling kann sich künftig mit ${bio.bezeichnung()} entsperren lassen. Das Master-Passwort bleibt gültig und wird weiterhin gebraucht, wenn ${bio.bezeichnung()} nicht klappt.</p><p class="hinweis">Jederzeit änderbar unter Einstellungen → Sicherheit.</p>`,
      knoepfe: [{ label: 'Einrichten', primaer: true, wert: null }],
      onOpen: (dlg) => {
        dlg.querySelectorAll('.dlg-actions button')[1]?.addEventListener('click', (ev) => {
          ev.preventDefault();
          bio.einrichten(passwort)
            .then(() => { toast(`${bio.bezeichnung()} eingerichtet`, 'ok'); dlg.close(); })
            .catch((err) => { toast(bio.fehlerText(err), 'error', 6000); dlg.close(); });
        });
      },
    });
  }, 600);
}

async function nachEntsperren() {
  document.body.classList.remove('gesperrt');
  shell();
  if (!store.isDemo()) {
    badgeSetzen(store.getData());
    setTimeout(() => update.wasIstNeu(APP_VERSION), 1200);
    navigator.storage?.persist?.().catch(() => {});
    if (dbx.hasPendingAuthCode()) {
      try {
        const rt = await dbx.finishAuth(store.getData().einstellungen.dropbox.appKey);
        store.mutate((d) => { d.einstellungen.dropbox.refreshToken = rt; });
        toast('Dropbox verbunden', 'ok');
      } catch (e) { toast(e.message, 'error', 6000); }
    }
    sync.syncJetzt().then((r) => { if (r === 'heruntergeladen') route(); });
  }
  route();
}

// ---------- App-Rahmen ----------
function shell() {
  document.body.classList.toggle('demo', store.isDemo());
  $('#app').innerHTML = `
    ${store.isDemo() ? '<div class="demo-band">Demo<span class="band-lang">&nbsp;· Beispieldaten, nichts wird gespeichert</span> <button id="demoEnde">Beenden</button><button class="thema-knopf" id="themaBand" aria-label="Hell/Dunkel umschalten">◐</button></div>' : ''}
    <nav class="hauptnav" aria-label="Hauptnavigation">
      <div class="marke">${maskottchen('sperling', 'marke-bild')}<span>Sperling</span></div>
      ${NAV.map((n) => `<a href="${n.href}" data-nav="${n.key}">${maskottchen(n.bild, 'nav-bild')}<span>${n.label}</span></a>`).join('')}
      <button class="sperr-knopf" id="thema" title="Hell/Dunkel umschalten">◐<span>Hell / Dunkel</span></button>
      <button class="sperr-knopf" id="sperren" title="Sperren" style="margin-top:0">🔒<span>Sperren</span></button>
    </nav>
    <main id="inhalt" class="inhalt" tabindex="-1"></main>`;
  $('#sperren').addEventListener('click', sperren);
  $('#demoEnde')?.addEventListener('click', sperren);
  const umschalten = () => { theme.umschalten(); if (location.hash.startsWith('#/einstellungen')) route(); };
  $('#thema').addEventListener('click', umschalten);
  $('#themaBand')?.addEventListener('click', umschalten);
}

async function sperren() {
  try {
    await store.lock();
    location.hash = '#/';
    zeigeSperre();
  } catch (e) {
    toast(`Sperren nicht möglich, Speichern fehlgeschlagen: ${e.message}`, 'error', 6000);
  }
}

// ---------- Router ----------
function route() {
  if (!store.isUnlocked()) return;
  const roh = location.hash.replace(/^#/, '') || '/';
  const [pfad, query = ''] = roh.split('?');
  const params = new URLSearchParams(query);
  const r = ROUTEN.find((x) => x.muster.test(pfad)) || ROUTEN[0];
  const treffer = pfad.match(r.muster)?.slice(1) || [];
  try { aufraeumen?.(); } catch (e) { console.error(e); }
  aufraeumen = null;
  const el = $('#inhalt');
  if (!el) return;
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('aktiv', a.dataset.nav === r.nav));
  el.className = `inhalt seite-${r.nav}`;
  try {
    const res = r.view.render(el, params, treffer);
    if (typeof res === 'function') aufraeumen = res;
  } catch (e) {
    console.error(e);
    el.innerHTML = `<div class="leer">${maskottchen('sperling', 'gross')}<p>Diese Ansicht konnte nicht angezeigt werden.</p><p class="hinweis">${esc(e.message)}</p><a class="btn" href="#/">Zur Übersicht</a></div>`;
  }
  el.scrollTop = 0;
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

// ---------- Auto-Sperre & sicheres Speichern ----------
let letzteAktivitaet = Date.now();
['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { letzteAktivitaet = Date.now(); }, { passive: true }));
setInterval(() => {
  if (!store.isUnlocked() || store.isDemo()) return;
  const min = store.getData().einstellungen.autoSperreMin;
  if (min > 0 && Date.now() - letzteAktivitaet > min * 60000) sperren();
}, 30000);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && store.isUnlocked()) store.flush().catch((e) => console.error(e));
});
window.addEventListener('pagehide', () => { if (store.isUnlocked()) store.flush().catch(() => {}); });

store.onSaved((ev) => { if (ev.fehler) toast(`Speichern fehlgeschlagen: ${ev.fehler.message}. Neuer Versuch bei der nächsten Änderung.`, 'error', 6000); });

// ---------- Start ----------
async function start() {
  try { dbx.captureAuthCode(); } catch (e) { console.error(e); }
  sync.init();
  // Browser bitten, die Daten nicht automatisch zu löschen (wichtig v. a. auf iPad/Android).
  if (document.documentElement.dataset.demo !== '1') navigator.storage?.persist?.().catch(() => {});
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && document.documentElement.dataset.demo !== '1') {
    update.starten();
  }
  const autoDemo = new URLSearchParams(location.search).has('demo') || document.documentElement.dataset.demo === '1';
  if (autoDemo) {
    store.startDemo(demoDaten());
    nachEntsperren();
    return;
  }
  zeigeSperre();
}

start().catch((e) => {
  console.error(e);
  $('#app').innerHTML = `<main class="sperre"><h1>Sperling</h1><p class="fehler">Start fehlgeschlagen: ${esc(e.message)}</p></main>`;
});
