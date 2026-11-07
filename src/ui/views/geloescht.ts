// Sperling – Gelöscht: alles Gelöschte bleibt hier, bis es einzeln und mit Bestätigung endgültig gelöscht wird (R-LOESCH).
import { esc, formatDateTime } from '../../core/util.ts';
import * as pk from '../../core/papierkorb.ts';
import * as store from '../../storage/store.ts';
import { maskottchen, toast, bestaetigen } from '../dom.ts';
import { leer } from '../parts.ts';

export function render(el: HTMLElement) {
  const d = store.getData();
  const eintraege = d.papierkorb || [];
  const kunden = eintraege.filter((e) => e.typ === 'kunde');
  const rest = eintraege.filter((e) => e.typ !== 'kunde');
  const zeile = (x: (typeof eintraege)[number]) => {
    const t = pk.eintragTitel(x, d);
    return `<li class="zeile" data-id="${esc(x.id)}"><span class="zeile-haupt"><strong>${x.typ === 'kunde' ? '' : `${esc(t.art)}: `}${esc(t.text || '(ohne Namen)')}</strong><small>gelöscht ${esc(formatDateTime(x.geloeschtAm))}</small></span>
      <button class="btn klein primary" data-zurueck="${esc(x.id)}">Wiederherstellen</button>
      <button class="btn klein ghost danger-text" data-weg="${esc(x.id)}">Endgültig löschen</button></li>`;
  };
  el.innerHTML = `<div class="geloescht">
    <header class="seitenkopf">
      <h1>${maskottchen('kunde-neu', 'titel-bild')} Gelöscht</h1>
      <a class="btn ghost" href="#/kunden">‹ Kunden</a>
    </header>
    <p class="hinweis">Gelöschtes geht nicht verloren: Es bleibt hier, bis du es einzeln endgültig löschst. Beim Wiederherstellen eines Kunden hängen auch seine Termine und Verleihe wieder an ihm.</p>
    <section class="karte-box">
      <h2>Kunden (${kunden.length})</h2>
      ${kunden.length ? `<ul class="liste geloescht-liste">${kunden.map(zeile).join('')}</ul>` : '<p class="hinweis">Keine gelöschten Kunden.</p>'}
    </section>
    <section class="karte-box">
      <h2>Notizen, Termine und Enpal-Dokumentation (${rest.length})</h2>
      ${rest.length ? `<ul class="liste geloescht-liste">${rest.map(zeile).join('')}</ul>` : '<p class="hinweis">Nichts gelöscht.</p>'}
    </section>
    ${!eintraege.length ? leer('kunde-neu', 'Hier ist nichts.') : ''}</div>`;

  el.querySelector('.geloescht')!.addEventListener('click', async (ev) => {
    const zurueck = (ev.target as Element).closest<HTMLElement>('[data-zurueck]');
    const weg = (ev.target as Element).closest<HTMLElement>('[data-weg]');
    try {
      if (zurueck) {
        store.mutate((x) => { pk.wiederherstellen(x, zurueck.dataset.zurueck || ''); });
        toast('Wiederhergestellt', 'ok');
        render(el);
      } else if (weg) {
        const e = store.getData().papierkorb.find((x) => x.id === weg.dataset.weg);
        if (!e) return;
        const t = pk.eintragTitel(e, store.getData());
        if (!(await bestaetigen(`${t.art} endgültig löschen?`, `„${t.text}“ ist danach unwiderruflich weg und kann nicht mehr zurückgeholt werden.`, 'Endgültig löschen'))) return;
        store.mutate((x) => { pk.endgueltigLoeschen(x, e.id); });
        toast('Endgültig gelöscht', 'ok');
        render(el);
      }
    } catch (err) { toast((err as Error).message, 'error', 5000); }
  });
}
