// Sperling – Schnellwahl-Knöpfe unter Wiedervorlage-Feldern (datetime-local).
// html(ziel) liefert die Knopfreihe; ein einziger Klick-Handler am document setzt das Feld
// mit dem Namen `ziel` im nächsten umgebenden fieldset/form und feuert input/change.
import { esc, isoToLocalInput } from '../core/util.ts';
import { SCHRITTE, schrittDatum, uhrzeitAus } from '../core/schnellwahl.ts';

export function html(ziel: string): string {
  return `<div class="wv-schnell" role="group" aria-label="Schnellwahl Wiedervorlage" data-wv-ziel="${esc(ziel)}">
    <span class="wv-schnell-label">In</span>${SCHRITTE.map((s) => `<button type="button" class="chip-knopf" data-wv-schritt="${esc(s.id)}">${esc(s.label)}</button>`).join('')}
  </div>`;
}

let aktiv = false;
export function aktivieren() {
  if (aktiv) return;
  aktiv = true;
  document.addEventListener('click', (ev) => {
    const knopf = (ev.target as Element | null)?.closest?.<HTMLButtonElement>('[data-wv-schritt]');
    if (!knopf) return;
    const reihe = knopf.closest<HTMLElement>('[data-wv-ziel]');
    const bereich = reihe?.closest('fieldset, form, dialog');
    const feld = bereich?.querySelector<HTMLInputElement>(`input[name="${CSS.escape(reihe!.dataset.wvZiel || '')}"]`);
    if (!feld) return;
    const d = schrittDatum(new Date(), knopf.dataset.wvSchritt || '', uhrzeitAus(feld.value));
    if (!d) return;
    feld.value = isoToLocalInput(d.toISOString());
    reihe!.querySelectorAll('[data-wv-schritt]').forEach((b) => b.setAttribute('aria-pressed', String((b as Element) === (knopf as Element))));
    feld.dispatchEvent(new Event('input', { bubbles: true }));
    feld.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
