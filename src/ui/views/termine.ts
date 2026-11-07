// Kalender: Termine & Wiedervorlagen als Liste (überfällig / heute / demnächst / erledigt) oder Monat/Woche/Tag,
// dazu Leihgaben; „Geräte“ führt zum Belegungskalender. ICS-Export.
import * as store from '../../storage/store.ts';
import type { Termin } from '../../core/model.ts';
import { maskottchen } from '../dom.ts';
import { terminZeile, terminListeVerdrahten, terminDialog, icsExport, leer } from '../parts.ts';
import * as kalender from '../kalender.ts';

const tagKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function render(el: HTMLElement, params: URLSearchParams = new URLSearchParams()) {
  const wahl = params.get('ansicht') || '';
  const ansicht: string = kalender.KALENDER_ANSICHTEN.some(([k]) => k !== 'geraete' && k === wahl) ? wahl : 'liste';
  let datum = new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('datum') || '')) { const t = kalender.tagVon(params.get('datum')); if (!Number.isNaN(t.getTime())) datum = t; }
  const neu = (a, dt) => {
    const p = new URLSearchParams({ ansicht: a });
    if (a !== 'liste') p.set('datum', tagKey(dt));
    history.replaceState(null, '', `#/termine?${p}`);
    render(el, p);
  };
  const d = store.getData();
  const kundeVon = (t) => d.kunden.find((k) => k.id === t.kundeId);
  const jetzt = new Date();
  const heuteStart = new Date(jetzt); heuteStart.setHours(0, 0, 0, 0);
  const heuteEnde = new Date(jetzt); heuteEnde.setHours(23, 59, 59, 999);
  const offen = d.termine.filter((t) => !t.erledigt).sort((a, b) => (a.beginn < b.beginn ? -1 : 1));
  const gruppen: [string, Termin[]][] = [
    ['Überfällig', offen.filter((t) => t.beginn < heuteStart.toISOString())],
    ['Heute', offen.filter((t) => t.beginn >= heuteStart.toISOString() && t.beginn <= heuteEnde.toISOString())],
    ['Demnächst', offen.filter((t) => t.beginn > heuteEnde.toISOString())],
    ['Erledigt', d.termine.filter((t) => t.erledigt).sort((a, b) => (a.beginn < b.beginn ? 1 : -1)).slice(0, 30)],
  ];
  el.innerHTML = `
    <header class="seitenkopf">
      <h1>${maskottchen('termine', 'titel-bild')} Kalender</h1>
      <div class="knopfreihe">
        <button class="btn ghost" id="ics">📅 Alle offenen exportieren</button>
        <button class="btn primary" id="neu">+ Neu</button>
      </div>
    </header>
    ${kalender.kalenderTabs(ansicht)}
    ${ansicht !== 'liste' ? '<section class="karte-box kalender"></section>' : d.termine.length ? gruppen.filter(([, l]) => l.length).map(([titel, l]) => `
      <section class="karte-box"><h2>${titel} <small>(${l.length})</small></h2>
        <ul class="terminliste">${l.map((t) => terminZeile(t, kundeVon(t))).join('')}</ul>
      </section>`).join('') : leer('termine', 'Noch keine Termine oder Wiedervorlagen.')}`;
  const nochmal = () => render(el, new URLSearchParams(location.hash.split('?')[1] || ''));
  el.querySelector('#kalTabs').addEventListener('click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-ansicht]'); if (!b) return; if (b.dataset.ansicht === 'geraete') location.hash = '#/belegung'; else neu(b.dataset.ansicht, datum); });
  if (ansicht !== 'liste') kalender.zeichnen(el.querySelector('.kalender'), { ansicht, datum }, (z) => neu(z.ansicht, z.datum), nochmal);
  el.querySelectorAll('.terminliste').forEach((ul) => terminListeVerdrahten(ul, nochmal));
  el.querySelector('#neu').addEventListener('click', async () => { if (await terminDialog()) nochmal(); });
  el.querySelector('#ics').addEventListener('click', () => icsExport(offen));
}
