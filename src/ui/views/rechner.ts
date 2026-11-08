// „Wann rechnet sich das?“ als eigener Menüpunkt (#/rechner). Aufruf aus der Kundenkartei mit ?kunde=ID&art=pv|wp:
// Angaben des Kunden werden übernommen, „Zurück“ führt an dieselbe Stelle in der Kartei.
// Ohne Kunden enthält die Seite keine Kundendaten und ist deshalb auch im Beratungs-Schutz erlaubt.
import { esc } from '../../core/util.ts';
import { kundenTitel } from '../../core/model.ts';
import * as store from '../../storage/store.ts';
import { symbol } from '../symbole.ts';
import * as rechner from '../rechner.ts';
import * as ruecksprung from '../ruecksprung.ts';

export function render(el: HTMLElement, params: URLSearchParams) {
  rechner.artSetzen(params.get('art'));
  const kid = params.get('kunde') || '';
  const k = kid ? store.findKunde(kid) : null; // im Beratungs-Schutz nur der geschützte Kunde
  if (k) rechner.kundeLaden(k.id, { firma: k.firma, pv: k.pv, wp: k.wp });
  else rechner.kundeVergessen();
  const zurueck = k ? ruecksprung.ziel(`#/kunde/${k.id}?tab=${rechner.aktuelleArt()}`, `#/kunde/${k.id}`) : '';

  el.innerHTML = `
    <header class="seitenkopf">
      ${k ? `<a href="${esc(zurueck)}" class="zurueck" aria-label="Zurück zu ${esc(kundenTitel(k))}">‹</a>` : ''}
      <h1>${symbol('rechner', 'titel-sym')} Wann rechnet sich das?</h1>
    </header>
    ${k ? `<div class="rz-kunde karte-box"><span>Für <b>${esc(kundenTitel(k))}</b></span><a class="btn klein" href="${esc(zurueck)}" data-rz-zurueck-kunde>‹ Zurück zum Kunden</a></div>` : ''}
    <div id="rzBox"></div>
    <p class="hinweis rz-foe-link">Welche Zuschüsse und Vergütungen gerade gelten, steht unter <a href="#/foerderung" id="rzZurFoerderung">Förderung</a>.</p>`;
  const box = el.querySelector<HTMLElement>('#rzBox')!;
  rechner.vorbereiten();
  box.innerHTML = rechner.html();
  rechner.binden(box);
  // Förderung passend zur gewählten Sparte öffnen
  el.querySelector<HTMLAnchorElement>('#rzZurFoerderung')!.addEventListener('click', (ev) => {
    ev.preventDefault();
    location.hash = `#/foerderung?bereich=${rechner.aktuelleArt()}`;
  });
  // Wechsel PV/WP in der Adresse festhalten (Neuladen, Zurück)
  box.addEventListener('click', (ev) => {
    if (!(ev.target as Element).closest('[data-rz-art]')) return;
    const q = new URLSearchParams(params); q.set('art', rechner.aktuelleArt());
    history.replaceState(null, '', `#/rechner?${q}`);
  });
}
