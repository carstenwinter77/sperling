// Sperling – Kundenauswahl für Dialoge: Suchfeld mit Live-Treffern (Name, Adresse, Telefon),
// ohne Eingabe die zuletzt benutzten Kunden. Der gewählte Kunde steht in einem versteckten Feld
// mit dem bisherigen Namen (z. B. „kunde“), daher bleiben die Dialoge sonst unverändert.
// Bei Auswahl feuert das versteckte Feld ein „change“-Ereignis.
import { esc } from '../core/util.ts';
import { kundenSuchen, kundeAnzeige } from '../core/kundenwahl.ts';
import * as store from '../storage/store.ts';

let zaehler = 0;

export function html(name: string, label: string, vorgabeId = '', { leerErlaubt = true, id: boxId = '', leerText = '– ohne Kunde –' } = {}): string {
  const id = `kw${++zaehler}`;
  const k = vorgabeId ? kundeAnzeige(store.getData(), vorgabeId) : null;
  return `<div class="kundenwahl" ${boxId ? `id="${esc(boxId)}"` : ''} data-kundenwahl="${esc(name)}" data-leer="${leerErlaubt ? esc(leerText) : ''}">
    <span class="kw-label" id="${id}-l">${esc(label)}</span>
    <input type="hidden" name="${esc(name)}" value="${esc(k?.id || '')}">
    <div class="kw-gewaehlt" ${k ? '' : 'hidden'}>
      <span class="kw-text"><b>${esc(k?.titel || '')}</b><small>${esc(k?.zusatz || '')}</small></span>
      <button type="button" class="btn klein kw-aendern" data-kw-aendern aria-label="Anderen Kunden wählen">Ändern</button>
    </div>
    <div class="kw-suche" ${k ? 'hidden' : ''}>
      <input type="search" class="kw-eingabe" placeholder="Name, Straße, Ort oder Telefon …" autocomplete="off" aria-labelledby="${id}-l" aria-controls="${id}-t" enterkeyhint="search">
      <ul class="kw-treffer" id="${id}-t" role="listbox"></ul>
    </div>
  </div>`;
}

export function verdrahten(root: Element) {
  root.querySelectorAll<HTMLElement>('[data-kundenwahl]').forEach((box) => {
    const versteckt = box.querySelector<HTMLInputElement>('input[type=hidden]')!;
    const eingabe = box.querySelector<HTMLInputElement>('.kw-eingabe')!;
    const liste = box.querySelector<HTMLUListElement>('.kw-treffer')!;
    const gewaehlt = box.querySelector<HTMLElement>('.kw-gewaehlt')!;
    const suche = box.querySelector<HTMLElement>('.kw-suche')!;
    const zeigen = () => {
      const t = kundenSuchen(store.getData(), eingabe.value);
      const leer = !eingabe.value.trim();
      liste.innerHTML = `${leer && t.length ? '<li class="kw-kopf">Zuletzt</li>' : ''}${box.dataset.leer && leer ? `<li role="option" class="kw-ohne" data-kw-id="">${esc(box.dataset.leer || '')}</li>` : ''}${t.map((x) => `<li role="option" data-kw-id="${esc(x.id)}"><b>${esc(x.titel)}</b>${x.doppelt ? ' <span class="chip">gleicher Name</span>' : ''}<small>${esc(x.zusatz || 'ohne Adresse')}</small></li>`).join('')}${!leer && !t.length ? '<li class="kw-kopf">Kein Kunde gefunden</li>' : ''}`;
    };
    const waehlen = (id: string) => {
      versteckt.value = id;
      const k = id ? kundeAnzeige(store.getData(), id) : null;
      gewaehlt.hidden = !k; suche.hidden = !!k;
      gewaehlt.querySelector('.kw-text')!.innerHTML = k ? `<b>${esc(k.titel)}</b><small>${esc(k.zusatz)}</small>` : '';
      if (!k) { eingabe.value = ''; zeigen(); }
      versteckt.dispatchEvent(new Event('change', { bubbles: true }));
    };
    eingabe.addEventListener('input', zeigen);
    eingabe.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); const erst = liste.querySelector<HTMLElement>('[data-kw-id]:not(.kw-ohne)'); if (erst) waehlen(erst.dataset.kwId!); }
    });
    liste.addEventListener('click', (ev) => { const li = (ev.target as Element).closest<HTMLElement>('[data-kw-id]'); if (li) waehlen(li.dataset.kwId || ''); });
    gewaehlt.querySelector('[data-kw-aendern]')!.addEventListener('click', () => { gewaehlt.hidden = true; suche.hidden = false; eingabe.value = ''; zeigen(); eingabe.focus(); });
    zeigen();
  });
}
