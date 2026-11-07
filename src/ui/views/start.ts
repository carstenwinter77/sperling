// Übersicht: Begrüßung, Kennzahlen, fällige Wiedervorlagen, Cross-Selling-Chancen.
import { esc } from '../../core/util.ts';
import { SPARTEN, kundenTitel, type Kunde } from '../../core/model.ts';
import * as store from '../../storage/store.ts';
import * as db from '../../storage/db.ts';
import { maskottchen } from '../dom.ts';
import { terminZeile, terminListeVerdrahten, statusChips } from '../parts.ts';
import * as suche from '../suche.ts';
import * as hilfe from '../hilfe.ts';
import { nachbestellListe } from '../../core/material.ts';

const AKTIV = ['interesse', 'termin', 'angebot', 'abschluss'];

/** Cross-Selling: Kunde ist in einer Sparte aktiv, eine andere ist noch offen (unbekannt/potenzial). */
export function crossSelling(kunden: Kunde[]): { kunde: Kunde; offen: string[] }[] {
  const out: { kunde: Kunde; offen: string[] }[] = [];
  for (const k of kunden) {
    const aktiv = Object.keys(SPARTEN).filter((s) => AKTIV.includes(k.status[s]));
    if (!aktiv.length) continue;
    const offen = Object.keys(SPARTEN).filter((s) => ['unbekannt', 'potenzial'].includes(k.status[s]));
    if (offen.length) out.push({ kunde: k, offen });
  }
  return out;
}

export function render(el: HTMLElement) {
  const d = store.getData();
  const jetzt = new Date();
  const ende = new Date(jetzt); ende.setHours(23, 59, 59, 999);
  const faellig = d.termine.filter((t) => !t.erledigt && t.beginn <= ende.toISOString()).sort((a, b) => (a.beginn < b.beginn ? -1 : 1));
  const kommend = d.termine.filter((t) => !t.erledigt && t.beginn > ende.toISOString()).sort((a, b) => (a.beginn < b.beginn ? -1 : 1)).slice(0, 5);
  const zaehl = (s, werte) => d.kunden.filter((k) => werte.includes(k.status[s])).length;
  const cs = crossSelling(d.kunden).slice(0, 8);
  const stunde = jetzt.getHours();
  const gruss = stunde < 11 ? 'Guten Morgen' : stunde < 18 ? 'Hallo' : 'Guten Abend';

  el.innerHTML = `
    <section class="hero">
      ${maskottchen('sperling', 'hero-bild')}
      <div>
        <h1>${gruss}!</h1>
        ${nachbestellListe(d).length ? `<p class="start-nachbestellen"><a href="#/bestand">🛒 Nachbestellen: ${nachbestellListe(d).map((m) => esc(m.name)).join(', ')}</a></p>` : ''}
        <p>${d.leihvorgaenge.some((l) => !l.rueckgabe) ? `<a href="#/bestand">${d.leihvorgaenge.filter((l) => !l.rueckgabe).length} Vorführgerät(e) verliehen</a> · ` : ''}${faellig.length ? `Heute ${faellig.length === 1 ? 'steht <b>1 Aufgabe</b>' : `stehen <b>${faellig.length} Aufgaben</b>`} an.` : 'Für heute ist nichts mehr offen.'}</p>
      </div>
    </section>
    <div class="start-suche">${suche.feldHtml()}${suche.zuletztHtml()}</div>
    ${store.isDemo() ? '' : hilfe.hinweisHtml()}
    <div id="sicherungHinweis"></div>

    <section class="kacheln">
      ${['pv', 'wp', 'vorwerk'].map((s) => `
        <a class="kachel kachel-${s}" href="#/kunden?sparte=${s}">
          ${maskottchen(s === 'pv' ? 'photovoltaik' : s === 'wp' ? 'waermepumpe' : 'vorwerk', 'kachel-bild')}
          <span class="kachel-titel">${esc(SPARTEN[s].label)}</span>
          <span class="kachel-zahl">${zaehl(s, ['abschluss'])} <small>Kunden</small></span>
          <span class="kachel-sub">${zaehl(s, ['interesse', 'termin', 'angebot'])} in Arbeit · ${zaehl(s, ['potenzial'])} Potenzial</span>
        </a>`).join('')}
    </section>

    <div class="spalten">
      <section class="karte-box">
        <h2>${maskottchen('termine', 'titel-bild')} Fällig &amp; überfällig</h2>
        ${faellig.length ? `<ul class="terminliste" id="faellig">${faellig.map((t) => terminZeile(t, d.kunden.find((k) => k.id === t.kundeId))).join('')}</ul>` : '<p class="hinweis">Alles erledigt. 🎉</p>'}
        ${kommend.length ? `<h3>Demnächst</h3><ul class="terminliste" id="kommend">${kommend.map((t) => terminZeile(t, d.kunden.find((k) => k.id === t.kundeId))).join('')}</ul>` : ''}
        <a class="btn ghost" href="#/termine">Alle Termine</a>
      </section>

      <section class="karte-box">
        <h2>${maskottchen('statistik', 'titel-bild')} Chancen in anderen Sparten</h2>
        ${cs.length ? `<ul class="liste">${cs.map(({ kunde, offen }) => `
          <li><a href="#/kunde/${esc(kunde.id)}" class="zeile">
            <span class="zeile-haupt"><strong>${esc(kundenTitel(kunde))}</strong><small>Noch offen: ${offen.map((s) => esc(SPARTEN[s].label)).join(', ')}</small></span>
            ${statusChips(kunde)}
          </a></li>`).join('')}</ul>` : '<p class="hinweis">Sobald Kunden in einer Sparte aktiv sind, erscheinen hier Ideen für die anderen Sparten.</p>'}
      </section>
    </div>`;

  for (const id of ['faellig', 'kommend']) {
    const ul = el.querySelector(`#${id}`);
    if (ul) terminListeVerdrahten(ul, () => render(el));
  }
  hilfe.hinweisVerdrahten(el);
  el.querySelector('#startSuche')?.addEventListener('click', () => suche.oeffnen());
  sicherungErinnern(el.querySelector('#sicherungHinweis'), d);
}

/** Erinnert an eine Sicherung (iCloud/Datei), wenn die letzte älter als 7 Tage ist. */
function sicherungErinnern(box, d) {
  if (!box || store.isDemo() || !d.kunden.length) return;
  db.getMeta<string>('letzteSicherung').then((t) => {
    const alt = !t || Date.now() - new Date(t).getTime() > 7 * 24 * 3600 * 1000;
    if (!alt || !box.isConnected) return;
    box.innerHTML = `<p class="hinweis warnung-box">☁️ ${t ? 'Die letzte Sicherung ist älter als eine Woche.' : 'Es gibt noch keine Sicherung.'} <a href="#/einstellungen">Jetzt in iCloud sichern</a></p>`;
  }).catch(() => {});
}
