// Termine & Wiedervorlagen: überfällig / heute / demnächst / erledigt, ICS-Export.
import * as store from '../../storage/store.js';
import { maskottchen } from '../dom.js';
import { terminZeile, terminListeVerdrahten, terminDialog, icsExport, leer } from '../parts.js';

export function render(el) {
  const d = store.getData();
  const kundeVon = (t) => d.kunden.find((k) => k.id === t.kundeId);
  const jetzt = new Date();
  const heuteStart = new Date(jetzt); heuteStart.setHours(0, 0, 0, 0);
  const heuteEnde = new Date(jetzt); heuteEnde.setHours(23, 59, 59, 999);
  const offen = d.termine.filter((t) => !t.erledigt).sort((a, b) => (a.beginn < b.beginn ? -1 : 1));
  const gruppen = [
    ['Überfällig', offen.filter((t) => t.beginn < heuteStart.toISOString())],
    ['Heute', offen.filter((t) => t.beginn >= heuteStart.toISOString() && t.beginn <= heuteEnde.toISOString())],
    ['Demnächst', offen.filter((t) => t.beginn > heuteEnde.toISOString())],
    ['Erledigt', d.termine.filter((t) => t.erledigt).sort((a, b) => (a.beginn < b.beginn ? 1 : -1)).slice(0, 30)],
  ];
  el.innerHTML = `
    <header class="seitenkopf">
      <h1>${maskottchen('termine', 'titel-bild')} Termine</h1>
      <div class="knopfreihe">
        <button class="btn ghost" id="ics">📅 Alle offenen exportieren</button>
        <button class="btn primary" id="neu">+ Neu</button>
      </div>
    </header>
    ${d.termine.length ? gruppen.filter(([, l]) => l.length).map(([titel, l]) => `
      <section class="karte-box"><h2>${titel} <small>(${l.length})</small></h2>
        <ul class="terminliste">${l.map((t) => terminZeile(t, kundeVon(t))).join('')}</ul>
      </section>`).join('') : leer('termine', 'Noch keine Termine oder Wiedervorlagen.')}`;
  el.querySelectorAll('.terminliste').forEach((ul) => terminListeVerdrahten(ul, () => render(el)));
  el.querySelector('#neu').addEventListener('click', async () => { if (await terminDialog()) render(el); });
  el.querySelector('#ics').addEventListener('click', () => icsExport(offen));
}
