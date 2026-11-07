// Sperling – Kundenansicht zum Herzeigen: Tablet dem Kunden geben, ohne interne Daten.
// Was sichtbar ist, legt der Nutzer in den Einstellungen fest (einstellungen.kundenansicht); Standard:
// Name, Adresse, Erfassungsbögen ohne interne Bemerkungen, geliehene Geräte. Nie: andere Kunden, Einwände.
// Beenden nur mit Passwort oder Face ID.
import { esc, formatDate } from '../core/util.ts';
import { SPARTEN, STATUS, kundenName, kundenTitel, adresseEinzeilig, notizenSortiert, type Kunde, type Daten } from '../core/model.ts';
import { formatDateTime } from '../core/util.ts';
import { sichtbareFelder, feldText, feldWertLesen, istAus } from '../core/felder.ts';
import { WrongPasswordError, KeyRing } from '../core/crypto.ts';
import * as store from '../storage/store.ts';
import * as db from '../storage/db.ts';
import * as bio from '../storage/biometrie.ts';
import { maskottchen, toast } from './dom.ts';

const wert = (t: string | null) => (t === null ? null : t.replace(/\s*\(prüfen!\)/i, ''));

export function inhalt(k: Kunde, data: Daten) {
  const z = data.einstellungen.kundenansicht;
  const bloecke = (['pv', 'wp', 'vorwerk'] as const).filter((s) => z[s]).map((s) => {
    const zeilen = sichtbareFelder(s, data.einstellungen.felder).filter((f) => z.bemerkungen || !f.intern).map((f) => [f.label, wert(feldText(f, feldWertLesen(k, f)))]).filter(([, v]) => v !== null);
    if (z.status && k.status[s] !== 'unbekannt') zeilen.unshift(['Stand', STATUS[k.status[s]].label]);
    return zeilen.length ? `<section class="karte-box"><h2>${maskottchen(s === 'pv' ? 'photovoltaik' : s === 'wp' ? 'waermepumpe' : 'vorwerk', 'titel-bild')} ${esc(SPARTEN[s].label)}</h2><dl class="ka-daten">${zeilen.map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>` : '';
  }).join('');
  const geraete = z.geraete ? data.leihvorgaenge.filter((l) => l.kundeId === k.id && !l.rueckgabe).map((l) => ({ l, g: data.geraete.find((g) => g.id === l.geraetId) })).filter((x): x is { l: typeof x.l; g: NonNullable<typeof x.g> } => !!x.g) : [];
  const jetzt = new Date().toISOString();
  const termine = z.termine ? data.termine.filter((t) => t.kundeId === k.id && !t.erledigt && t.beginn >= jetzt).sort((a, b) => (a.beginn < b.beginn ? -1 : 1)) : [];
  const notizen = z.notizen ? notizenSortiert(k).filter((n) => !n.sparten.length || n.sparten.some((s) => z[s])) : [];
  const kontakt = z.kontakt ? (['telefon', 'email'] as const).filter((x) => !istAus(data.einstellungen.felder, `kontakt.${x}`)).map((x) => k[x]).filter(Boolean).join(' · ') : '';
  const weitere = z.kontakt ? sichtbareFelder('kontakt', data.einstellungen.felder).filter((f) => f.eigen).map((f) => [f.label, feldText(f, feldWertLesen(k, f))]).filter(([, v]) => v !== null) : [];
  return `
    <header class="ka-kopf">${maskottchen('sperling', 'titel-bild')}<div><h1>${esc(kundenName(k) || kundenTitel(k))}</h1><p>${esc(adresseEinzeilig(k))}</p>${kontakt ? `<p>${esc(kontakt)}</p>` : ''}</div></header>
    ${weitere.length ? `<section class="karte-box"><h2>Weitere Angaben</h2><dl class="ka-daten">${weitere.map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>` : ''}
    ${bloecke || '<p class="hinweis">Noch keine Angaben erfasst.</p>'}
    ${geraete.length ? `<section class="karte-box"><h2>Geliehene Geräte</h2><ul>${geraete.map(({ l, g }) => `<li><b>${esc(g.name)}</b>${g.seriennummer ? ` (SN ${esc(g.seriennummer)})` : ''} – seit ${esc(formatDate(l.ausgabe))}${l.rueckgabeGeplant ? `, zurück bis ${esc(formatDate(l.rueckgabeGeplant))}` : ''}</li>`).join('')}</ul></section>` : ''}
    ${termine.length ? `<section class="karte-box"><h2>Kommende Termine</h2><ul>${termine.map((t) => `<li><b>${esc(formatDateTime(t.beginn))}</b> – ${esc(t.titel || (t.art === 'termin' ? 'Termin' : 'Rückmeldung'))}</li>`).join('')}</ul></section>` : ''}
    ${notizen.length ? `<section class="karte-box"><h2>Gesprächsnotizen</h2><ul class="notizliste">${notizen.map((n) => `<li><time>${esc(formatDateTime(n.zeitpunkt))}</time><p>${esc(n.text).replace(/\n/g, '<br>')}</p></li>`).join('')}</ul></section>` : ''}`;
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
    } catch (err) { toast(err instanceof WrongPasswordError ? 'Falsches Passwort.' : ((err as Error).message || 'Fehler'), 'error'); }
  });
  box.querySelector('#kaBio')?.addEventListener('click', async () => {
    try { await bio.passwortHolen(); beenden(); } catch (err) { toast(bio.fehlerText(err), 'error'); }
  });
}
