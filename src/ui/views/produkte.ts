// Produktübersicht: Reiter je Bereich, Kategorie-Chips, Suche, Kacheln, Detail als Blatt.
// Enthält keine Kundendaten und ist deshalb auch im Beratungs-Schutz erlaubt.
import { esc } from '../../core/util.ts';
import { SPARTEN, SPARTEN_KEYS, type Sparte } from '../../core/model.ts';
import { produkteFuer, kategorienIn, produktSuchen, standText, KATEGORIEN } from '../../core/produkte.ts';
import { katalog, kachelHtml, detailZeigen, bildFehlerAbfangen } from '../produkte.ts';
import { maskottchen } from '../dom.ts';

let bereich: Sparte | 'alle' = 'alle';
let kategorie = '';
let suche = '';

export function render(el: HTMLElement, params: URLSearchParams) {
  const b = params.get('bereich');
  if (b === 'alle' || SPARTEN_KEYS.includes(b as Sparte)) { bereich = b as Sparte | 'alle'; kategorie = ''; }
  const kat = katalog();
  el.innerHTML = `
    <header class="seitenkopf"><h1>${maskottchen('produkte', 'titel-bild')} Produkte</h1></header>
    <nav class="tabs aw-bereiche" role="tablist" id="pBereiche">
      ${(['alle', ...SPARTEN_KEYS] as const).map((x) => `<button type="button" role="tab" data-bereich="${x}" class="bereich-${x}">${x === 'alle' ? 'Alle' : esc(SPARTEN[x].label)} <small>${produkteFuer(kat, x).length}</small></button>`).join('')}
    </nav>
    <label class="hilfe-suche"><span class="sr-only">Produkte durchsuchen</span><input type="search" id="pSuche" placeholder="Produkt suchen, z. B. „Speicher“ oder „VK7“" autocomplete="off" value="${esc(suche)}"></label>
    <div class="chips-filter" id="pKategorien" role="group" aria-label="Kategorie"></div>
    <div class="produkt-raster" id="pListe"></div>
    <p class="hinweis">${esc(kat.hinweis)} Stand ${esc(standText(kat.stand))}. Quellen: ${kat.quellen.map((q) => esc(q.name)).join(', ')}.</p>`;

  const liste = el.querySelector('#pListe')!;
  bildFehlerAbfangen(liste);
  const zeichnen = () => {
    el.querySelectorAll<HTMLElement>('#pBereiche [data-bereich]').forEach((x) => { const an = x.dataset.bereich === bereich; x.classList.toggle('aktiv', an); x.setAttribute('aria-selected', String(an)); });
    const imBereich = produkteFuer(kat, bereich);
    const kats = kategorienIn(imBereich);
    if (kategorie && !kats.includes(kategorie)) kategorie = '';
    el.querySelector('#pKategorien')!.innerHTML = kats.length > 1
      ? `<button type="button" data-kat="" class="${kategorie ? '' : 'aktiv'}">Alle</button>${kats.map((k) => `<button type="button" data-kat="${esc(k)}" class="${k === kategorie ? 'aktiv' : ''}">${esc(KATEGORIEN[k])}</button>`).join('')}`
      : '';
    const treffer = produktSuchen(imBereich.filter((p) => !kategorie || p.kategorie === kategorie), suche);
    liste.innerHTML = treffer.length ? treffer.map((p) => kachelHtml(p)).join('') : `<p class="hinweis">Nichts gefunden${suche ? ` für „${esc(suche)}“` : ''}.</p>`;
  };
  zeichnen();
  el.querySelector('#pBereiche')!.addEventListener('click', (ev) => {
    const x = (ev.target as Element).closest<HTMLElement>('[data-bereich]');
    if (!x) return;
    bereich = x.dataset.bereich as Sparte | 'alle';
    kategorie = '';
    history.replaceState(null, '', `#/produkte?bereich=${bereich}`);
    zeichnen();
  });
  el.querySelector('#pKategorien')!.addEventListener('click', (ev) => {
    const x = (ev.target as Element).closest<HTMLElement>('[data-kat]');
    if (x) { kategorie = x.dataset.kat || ''; zeichnen(); }
  });
  el.querySelector<HTMLInputElement>('#pSuche')!.addEventListener('input', (ev) => { suche = (ev.target as HTMLInputElement).value; zeichnen(); });
  liste.addEventListener('click', (ev) => {
    const x = (ev.target as Element).closest<HTMLElement>('[data-produkt]');
    if (x) detailZeigen(x.dataset.produkt!);
  });
  const direkt = params.get('produkt');
  if (direkt) detailZeigen(direkt);
}
