// Sperling – Einstiegspunkt: Sperrbildschirm, Navigation, Router, Auto-Sperre, Fehlerbehandlung.
import * as abgleich from './ui/abgleich.ts';
import * as schnellwahl from './ui/schnellwahl.ts';
import * as store from './storage/store.ts';
import { WrongPasswordError } from './core/crypto.ts';
import { esc } from './core/util.ts';
import { $, toast, maskottchen, logo, dialog, type Formular } from './ui/dom.ts';
import { demoDaten } from './demo.ts';
import * as theme from './ui/theme.ts';
import * as bio from './storage/biometrie.ts';
import { badgeSetzen } from './ui/badge.ts';
import * as update from './ui/update.ts';
import { APP_VERSION } from './ui/views/einstellungen.ts';
import * as db from './storage/db.ts';
import * as vStart from './ui/views/start.ts';
import * as vKunden from './ui/views/kunden.ts';
import * as vKunde from './ui/views/kunde.ts';
import * as vKarte from './ui/views/karte.ts';
import * as vTermine from './ui/views/termine.ts';
import * as vEinst from './ui/views/einstellungen.ts';
import * as vBestand from './ui/views/bestand.ts';
import * as vGespraech from './ui/views/gespraech.ts';
import * as vBelegung from './ui/views/belegung.ts';
import * as vAuswertung from './ui/views/auswertung.ts';
import * as vGeloescht from './ui/views/geloescht.ts';
import * as vGespraechsmodus from './ui/views/gespraechsmodus.ts';
import * as schutz from './ui/schutz.ts';
import * as tour from './ui/tour.ts';
import * as fotos from './storage/fotos.ts';
import * as suche from './ui/suche.ts';
import * as hilfe from './ui/hilfe.ts';
import * as vHilfe from './ui/views/hilfe.ts';
import * as vProdukte from './ui/views/produkte.ts';
import type { ThemaId } from './core/hilfe.ts';

interface Ansicht { render(el: HTMLElement, params: URLSearchParams, treffer: string[]): void | (() => void) }
interface Route { muster: RegExp; view: Ansicht; nav: string; hilfe?: ThemaId }
const ROUTEN: Route[] = [
  { muster: /^\/?$/, view: vStart, nav: 'start', hilfe: 'start' },
  { muster: /^\/kunden$/, view: vKunden, nav: 'kunden', hilfe: 'kunden' },
  { muster: /^\/kunde\/([\w-]+)$/, view: vKunde, nav: 'kunden', hilfe: 'kunde' },
  { muster: /^\/kunde\/([\w-]+)\/gespraech$/, view: vGespraechsmodus, nav: 'kunden', hilfe: 'gespraechsmodus' },
  { muster: /^\/karte$/, view: vKarte, nav: 'karte', hilfe: 'karte' },
  { muster: /^\/(termine|kalender)$/, view: vTermine, nav: 'termine', hilfe: 'termine' },
  { muster: /^\/einstellungen$/, view: vEinst, nav: 'einstellungen', hilfe: 'einstellungen' },
  { muster: /^\/bestand$/, view: vBestand, nav: 'bestand', hilfe: 'bestand' },
  { muster: /^\/belegung$/, view: vBelegung, nav: 'termine', hilfe: 'belegung' },
  { muster: /^\/auswertung$/, view: vAuswertung, nav: 'auswertung', hilfe: 'auswertung' },
  { muster: /^\/geloescht$/, view: vGeloescht, nav: 'kunden', hilfe: 'geloescht' },
  { muster: /^\/gespraech$/, view: vGespraech, nav: 'gespraech', hilfe: 'gespraech' },
  { muster: /^\/hilfe$/, view: vHilfe, nav: 'einstellungen' },
  { muster: /^\/produkte$/, view: vProdukte, nav: 'produkte', hilfe: 'produkte' },
];

const NAV = [
  { key: 'start', href: '#/', label: 'Übersicht', bild: 'sperling' },
  { key: 'kunden', href: '#/kunden', label: 'Kunden', bild: 'kunde-neu' },
  { key: 'karte', href: '#/karte', label: 'Karte', bild: 'karte' },
  { key: 'termine', href: '#/termine', label: 'Kalender', bild: 'termine' },
  { key: 'gespraech', href: '#/gespraech', label: 'Gespräch', bild: 'notizen' },
  { key: 'bestand', href: '#/bestand', label: 'Bestand', bild: 'vorwerk' },
  { key: 'produkte', href: '#/produkte', label: 'Produkte', bild: 'produkte' },
  { key: 'auswertung', href: '#/auswertung', label: 'Auswertungen', bild: 'statistik' },
  { key: 'einstellungen', href: '#/einstellungen', label: 'Einstellungen', bild: 'einstellungen' },
];

/** Auf dem Handy stehen diese Bereiche unter „Mehr“, damit die Leiste unten große Tippflächen behält. */
const NEBEN = ['gespraech', 'bestand', 'auswertung', 'einstellungen'];

/** „Mehr“-Menü (Handy): übrige Bereiche, Suchen, Sperren. */
function mehrMenue() {
  const eintraege = NAV.filter((n) => NEBEN.includes(n.key) || n.key === 'produkte');
  dialog({
    titel: 'Mehr',
    html: `<div class="mehr-raster">
      <button type="button" class="mehr-eintrag" data-mehr="suche"><span class="nav-lupe" aria-hidden="true">🔍</span><span>Suchen</span></button>
      ${eintraege.map((n) => `<a class="mehr-eintrag" href="${n.href}" data-mehr="link">${n.bild ? maskottchen(n.bild, 'nav-bild') : '<span class="nav-lupe" aria-hidden="true">🏷️</span>'}<span>${n.label}</span></a>`).join('')}
      <button type="button" class="mehr-eintrag" data-mehr="tour"><span class="nav-lupe" aria-hidden="true">🧭</span><span>Rund-Tour</span></button>
      <button type="button" class="mehr-eintrag" data-mehr="sperren"><span class="nav-lupe" aria-hidden="true">🔒</span><span>Sperren</span></button>
    </div><p class="hinweis mehr-version">Version ${esc(APP_VERSION)}</p>`,
    knoepfe: [],
    onOpen: (dlg) => {
      dlg.classList.add('dlg-mehr');
      dlg.addEventListener('click', (ev) => {
        const e = (ev.target as Element).closest<HTMLElement>('[data-mehr]');
        if (!e) return;
        dlg.close();
        if (e.dataset.mehr === 'suche') suche.oeffnen();
        else if (e.dataset.mehr === 'sperren') sperren();
        else if (e.dataset.mehr === 'tour') tour.starten();
      });
    },
  });
}

let aufraeumen: (() => void) | null = null;

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
      <h1 class="sperre-titel">${logo('sperre-logo')}</h1>
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
      ${hatDaten ? '' : `<div class="sperre-uebernehmen">
        <p>Sperling läuft schon auf deinem iPad oder iPhone?</p>
        <button type="button" class="btn" id="ausSicherung">☁️ Vom anderen Gerät übernehmen (iCloud)</button>
        <p class="hinweis">Sicherungsdatei aus iCloud Drive wählen und das bisherige Passwort eingeben. Ein neues Passwort ist dann nicht nötig.</p>
      </div>`}
      ${mitBio ? `<button class="btn primary bio-knopf" id="bioEntsperren">🔓 Mit ${esc(bio.bezeichnung())} entsperren</button>` : ''}
      <button class="btn ghost" id="demo">Demo mit Beispielkunden ansehen</button>
    </main>`;
  const form = $<Formular>('#sperrForm')!;
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
      $('#sperrFehler').textContent = err instanceof WrongPasswordError ? 'Falsches Passwort.' : (err as Error).message;
      btn.disabled = false;
      btn.textContent = hatDaten ? 'Entsperren' : 'Einrichten';
    }
  });
  $('#demo').addEventListener('click', () => { store.startDemo(demoDaten()); nachEntsperren(); });
  $('#ausSicherung')?.addEventListener('click', async () => {
    const pw = await abgleich.einrichtenAusDatei();
    if (!pw) return;
    await nachEntsperren();
    bioAnbieten(pw);
  });
  $('#bioEntsperren')?.addEventListener('click', async (ev) => {
    const b = ev.currentTarget as HTMLButtonElement;
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
    abgleich.beimStart().catch(() => {});
    setTimeout(() => fotos.aufraeumen().catch(() => 0), 5000); // verwaiste Fotodaten entfernen
    navigator.storage?.persist?.().catch(() => {});
  }
  route();
  // Willkommen und Rund-Tour: einmal je Gerät (auch in der Demo)
  setTimeout(() => tour.beimStart(), 400);
}

// ---------- App-Rahmen ----------
function shell() {
  document.body.classList.toggle('demo', store.isDemo());
  $('#app').innerHTML = `
    ${store.isDemo() ? '<div class="demo-band">Demo<span class="band-lang">&nbsp;· Beispieldaten, nichts wird gespeichert</span> <button id="demoEnde">Beenden</button></div>' : ''}
    <nav class="hauptnav" aria-label="Hauptnavigation">
      <div class="marke-zeile">
        <a class="marke" href="#/" aria-label="Sperling – zur Übersicht">${logo('marke-logo')}</a>
        <button class="sperr-knopf" id="sperren" title="Sperren" aria-label="Sperling sperren"><span aria-hidden="true">🔒</span><small>Sperren</small></button>
      </div>
      <button type="button" class="nav-suche" id="navSuche" title="Suchen (${suche.kuerzel()})"><span class="nav-bild nav-lupe" aria-hidden="true">🔍</span><span>Suchen</span></button>
      ${NAV.map((n) => `<a href="${n.href}" data-nav="${n.key}"${NEBEN.includes(n.key) ? ' data-neben' : ''}${n.key === 'einstellungen' ? ' class="nav-einstellungen"' : n.key === 'produkte' ? ' class="nav-produkte"' : ''}>${n.bild ? maskottchen(n.bild, 'nav-bild') : '<span class="nav-bild nav-lupe" aria-hidden="true">🏷️</span>'}<span>${n.label}${n.key === 'einstellungen' ? `<small class="nav-version">Version ${esc(APP_VERSION)}</small>` : ''}</span></a>`).join('')}
      <button type="button" class="nav-mehr" id="navMehr" aria-haspopup="dialog"><span class="nav-bild nav-lupe" aria-hidden="true">☰</span><span>Mehr</span></button>
    </nav>
    <div class="schutz-band" id="schutzBand" role="status" hidden></div>
    <button type="button" class="schutz-knopf" id="schutzKnopf" aria-pressed="false" aria-label="Beratungs-Schutz">🛡</button>
    <main id="inhalt" class="inhalt" tabindex="-1"></main>`;
  schutz.verdrahten();
  suche.verdrahten();
  $('#navSuche').addEventListener('click', () => suche.oeffnen());
  $('#navMehr').addEventListener('click', mehrMenue);
  if (!document.body.dataset.tourKlick) {
    document.body.dataset.tourKlick = '1';
    document.addEventListener('click', (ev) => { if ((ev.target as Element).closest?.('[data-tour-start]')) tour.starten(); });
  }
  $('#sperren').addEventListener('click', sperren);
  $('#demoEnde')?.addEventListener('click', sperren);
}

async function sperren() {
  abgleich.leisteEntfernen();
  try {
    await store.lock();
    location.hash = '#/';
    zeigeSperre();
  } catch (e) {
    toast(`Sperren nicht möglich, Speichern fehlgeschlagen: ${(e as Error).message}`, 'error', 6000);
  }
}

// ---------- Router ----------
function route() {
  if (!store.isUnlocked()) return;
  const roh = location.hash.replace(/^#/, '') || '/';
  const [pfad, query = ''] = roh.split('?');
  const params = new URLSearchParams(query);
  const umleiten = schutz.umleitung(pfad);
  if (umleiten) { history.replaceState(null, '', umleiten); route(); return; }
  const r = ROUTEN.find((x) => x.muster.test(pfad)) || ROUTEN[0];
  const treffer = pfad.match(r.muster)?.slice(1) || [];
  suche.schliessen();
  try { aufraeumen?.(); } catch (e) { console.error(e); }
  aufraeumen = null;
  const el = $('#inhalt');
  if (!el) return;
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('aktiv', a.dataset.nav === r.nav));
  document.querySelector('#navMehr')?.classList.toggle('aktiv', NEBEN.includes(r.nav) || r.nav === 'produkte');
  el.className = `inhalt seite-${r.nav}`;
  try {
    const res = r.view.render(el, params, treffer);
    if (typeof res === 'function') aufraeumen = res;
    // ?-Knopf an die Seitenüberschrift
    const h1 = el.querySelector('.seitenkopf h1, .hero h1');
    if (r.hilfe && h1 && !h1.querySelector('.hilfe-knopf')) h1.insertAdjacentHTML('beforeend', hilfe.knopf(r.hilfe));
  } catch (e) {
    console.error(e);
    el.innerHTML = `<div class="leer">${maskottchen('sperling', 'gross')}<p>Diese Ansicht konnte nicht angezeigt werden.</p><p class="hinweis">${esc((e as Error).message)}</p><a class="btn" href="#/">Zur Übersicht</a></div>`;
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
  try { schnellwahl.aktivieren(); } catch (e) { console.error(e); }
  try { hilfe.starten(); } catch (e) { console.error(e); }
  // Reste der früheren Dropbox-Anmeldung entfernen (seit 0.9.5 gibt es keinen Dropbox-Abgleich mehr)
  try { sessionStorage.removeItem('sperling.dbx.code'); sessionStorage.removeItem('sperling.dbx.verifier'); } catch { /* egal */ }
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
