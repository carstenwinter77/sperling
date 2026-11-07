// Sperling – Kundenansicht zum Herzeigen: Tablet dem Kunden geben, ohne interne Daten.
// Zeigt nur Name, Adresse, die eigenen Erfassungsbögen (ohne interne Bemerkungen) und geliehene Geräte.
// Keine Notizen, kein Status, keine Einwände, keine anderen Kunden. Beenden nur mit Passwort oder Face ID.
import { esc, formatDate } from '../core/util.js';
import { FELDER, SPARTEN, kundenName, kundenTitel, adresseEinzeilig } from '../core/model.js';
import { WrongPasswordError, KeyRing } from '../core/crypto.js';
import * as store from '../storage/store.js';
import * as db from '../storage/db.js';
import * as bio from '../storage/biometrie.js';
import { maskottchen, toast } from './dom.js';

const INTERN = new Set(['bemerkung']);

function wert(f, v) {
  if (v === null || v === undefined || v === '') return null;
  if (f.type === 'bool') return v ? 'ja' : 'nein';
  if (f.type === 'number') return `${String(v).replace('.', ',')}${f.unit ? ` ${f.unit}` : ''}`;
  return String(v).replace(/\s*\(prüfen!\)/i, '');
}

export function inhalt(k, data) {
  const bloecke = ['pv', 'wp', 'vorwerk'].map((s) => {
    const zeilen = FELDER[s].filter((f) => !INTERN.has(f.key)).map((f) => [f.label, wert(f, k[s]?.[f.key])]).filter(([, v]) => v !== null);
    return zeilen.length ? `<section class="karte-box"><h2>${maskottchen(s === 'pv' ? 'photovoltaik' : s === 'wp' ? 'waermepumpe' : 'vorwerk', 'titel-bild')} ${esc(SPARTEN[s].label)}</h2><dl class="ka-daten">${zeilen.map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>` : '';
  }).join('');
  const geraete = data.leihvorgaenge.filter((l) => l.kundeId === k.id && !l.rueckgabe).map((l) => ({ l, g: data.geraete.find((g) => g.id === l.geraetId) })).filter((x) => x.g);
  return `
    <header class="ka-kopf">${maskottchen('sperling', 'titel-bild')}<div><h1>${esc(kundenName(k) || kundenTitel(k))}</h1><p>${esc(adresseEinzeilig(k))}</p></div></header>
    ${bloecke || '<p class="hinweis">Noch keine Angaben erfasst.</p>'}
    ${geraete.length ? `<section class="karte-box"><h2>Geliehene Geräte</h2><ul>${geraete.map(({ l, g }) => `<li><b>${esc(g.name)}</b>${g.seriennummer ? ` (SN ${esc(g.seriennummer)})` : ''} – seit ${esc(formatDate(l.ausgabe))}${l.rueckgabeGeplant ? `, zurück bis ${esc(formatDate(l.rueckgabeGeplant))}` : ''}</li>`).join('')}</ul></section>` : ''}`;
}

let aktiv = false;
export const istAktiv = () => aktiv;

export function starten(kundeId) {
  const k = store.findKunde(kundeId);
  if (!k) return;
  aktiv = true;
  const hash = location.hash;
  const ov = document.createElement('div');
  ov.className = 'kundenansicht';
  ov.innerHTML = `<div class="ka-leiste"><span>Kundenansicht</span><button class="btn klein ghost" id="kaEnde">Beenden 🔒</button></div><div class="ka-inhalt">${inhalt(k, store.getData())}</div>`;
  document.body.appendChild(ov);
  document.body.classList.add('ka-aktiv');
  // Navigation sperren: jeder Wechsel springt zurück
  const zurueck = () => { if (aktiv && location.hash !== hash) history.replaceState(null, '', hash); };
  window.addEventListener('hashchange', zurueck);
  const beenden = () => {
    aktiv = false;
    window.removeEventListener('hashchange', zurueck);
    document.body.classList.remove('ka-aktiv');
    ov.remove();
  };
  ov.querySelector('#kaEnde').addEventListener('click', () => entsperrDialog(ov, beenden));
}

async function entsperrDialog(ov, beenden) {
  if (ov.querySelector('.ka-sperre')) return;
  if (store.isDemo()) { beenden(); toast('Demo: In der echten App fragt Sperling hier nach dem Passwort.', 'ok', 4000); return; }
  const mitBio = await bio.eingerichtet();
  const box = document.createElement('form');
  box.className = 'ka-sperre karte-box';
  box.innerHTML = `<p><b>Kundenansicht beenden</b></p>
    <label>Master-Passwort<input type="password" name="pw" autocomplete="current-password"></label>
    <div class="knopfreihe"><button class="btn primary">Beenden</button>${mitBio ? `<button type="button" class="btn ghost" id="kaBio">${esc(bio.bezeichnung())}</button>` : ''}<button type="button" class="btn ghost" id="kaAbbr">Weiter zeigen</button></div>`;
  ov.appendChild(box);
  box.querySelector('[name=pw]').focus();
  box.querySelector('#kaAbbr').addEventListener('click', () => box.remove());
  box.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await new KeyRing(box.pw.value).decrypt(await db.loadEnvelope());
      beenden();
    } catch (err) { toast(err instanceof WrongPasswordError ? 'Falsches Passwort.' : (err.message || 'Fehler'), 'error'); }
  });
  box.querySelector('#kaBio')?.addEventListener('click', async () => {
    try { await bio.passwortHolen(); beenden(); } catch (err) { toast(bio.fehlerText(err), 'error'); }
  });
}
