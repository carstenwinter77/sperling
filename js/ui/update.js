// Sperling – Updates: neue Version erkennen, Leiste „Jetzt aktualisieren“, danach „Was ist neu“.
// Die Prüfung lädt nur sw.js von der App-Adresse, es werden keine Daten gesendet.
import * as store from '../storage/store.js';
import { esc } from '../core/util.js';
import { dialog } from './dom.js';
import { NEUIGKEITEN, versionVergleich } from '../neuigkeiten.js';

const GESEHEN = 'sperling.version'; // nur Versionsnummer, keine Kundendaten (R-KRYPTO-Ausnahme)
let reg = null;
let letztePruefung = 0;

function versionErfragen(w) {
  return new Promise((fertig) => {
    const kanal = new MessageChannel();
    const t = setTimeout(() => fertig(''), 1500);
    kanal.port1.onmessage = (e) => { clearTimeout(t); fertig(String(e.data?.version || '')); };
    try { w.postMessage({ typ: 'version' }, [kanal.port2]); } catch { fertig(''); }
  });
}

async function leisteZeigen() {
  const w = reg?.waiting;
  if (!w || !navigator.serviceWorker.controller || document.querySelector('#updateLeiste')) return;
  const v = await versionErfragen(w);
  const div = document.createElement('div');
  div.id = 'updateLeiste';
  div.className = 'update-leiste';
  div.innerHTML = `<span>✨ Neue Version${v ? ` ${esc(v)}` : ''} ist bereit.</span><button class="btn klein primary" id="updJetzt">Jetzt aktualisieren</button><button class="btn klein ghost" id="updSpaeter">Später</button>`;
  document.body.appendChild(div);
  div.querySelector('#updSpaeter').addEventListener('click', () => div.remove());
  div.querySelector('#updJetzt').addEventListener('click', async (ev) => {
    ev.currentTarget.disabled = true;
    try { await store.flush(); } catch { /* Speichern versucht; Daten bleiben in jedem Fall lokal */ }
    reg.waiting?.postMessage({ typ: 'jetzt' });
  });
}

export function pruefen() {
  if (!reg) return;
  letztePruefung = Date.now();
  reg.update().catch(() => {});
}

export async function starten() {
  if (!('serviceWorker' in navigator)) return;
  try { reg = await navigator.serviceWorker.register('sw.js'); } catch (e) { console.warn('Service Worker nicht registriert', e); return; }
  let neuGeladen = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (neuGeladen || !document.querySelector('#updateLeiste')) return; // nur nach eigenem Tipp neu laden
    neuGeladen = true;
    location.reload();
  });
  reg.addEventListener('updatefound', () => {
    const neu = reg.installing;
    neu?.addEventListener('statechange', () => { if (neu.state === 'installed') leisteZeigen(); });
  });
  leisteZeigen();
  pruefen();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - letztePruefung > 30 * 60 * 1000) pruefen(); });
  setInterval(pruefen, 3 * 60 * 60 * 1000);
}

/** Nach dem Entsperren: einmal zeigen, was seit der zuletzt gesehenen Version neu ist. */
export function wasIstNeu(aktuell) {
  let gesehen = '';
  try { gesehen = localStorage.getItem(GESEHEN) || ''; localStorage.setItem(GESEHEN, aktuell); } catch { return; }
  if (!gesehen || versionVergleich(aktuell, gesehen) <= 0) return; // Erstinstallation oder nichts Neues
  const neu = NEUIGKEITEN.filter((n) => versionVergleich(n.version, gesehen) > 0 && versionVergleich(n.version, aktuell) <= 0);
  if (!neu.length) return;
  dialog({
    titel: 'Was ist neu in Sperling',
    html: neu.map((n) => `<h3>Version ${esc(n.version)}</h3><ul>${n.punkte.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`).join(''),
    knoepfe: [{ label: 'Alles klar', primaer: true, wert: true }],
  });
}
