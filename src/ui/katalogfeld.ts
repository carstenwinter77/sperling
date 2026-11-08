// Sperling – Bezeichnung mit Katalogsuche für „Neues Vorführgerät“ und „Neues Verbrauchsmaterial“.
// Jan tippt in die Bezeichnung: passende Produkte aus der Produktübersicht (Vorwerk) erscheinen darunter.
// Antippen übernimmt Name, Bild-Bezug und passende Felder; ohne Antippen bleibt es eine freie Eingabe.
// Alle Katalogtexte gehen durch esc() (R-XSS).
import { esc } from '../core/util.ts';
import { KATEGORIEN, produkteFuer, produktSuchen, type Produkt } from '../core/produkte.ts';
import { passtZuArt, type BestandArt } from '../core/bestandvorlage.ts';
import { katalog, produkt, bildHtml, bildFehlerAbfangen } from './produkte.ts';

const MAX_TREFFER = 8;

function gewaehltHtml(p: Produkt | null): string {
  if (!p) return '';
  return `${bildHtml(p, 'produkt-bild mini')}<span>Aus der Produktübersicht: <b>${esc(p.name)}</b></span>
    <button type="button" class="btn klein ghost" data-katalog-loesen aria-label="Verknüpfung mit dem Katalog lösen">✕</button>`;
}

/** Feld „Bezeichnung“ mit Suche. `produktId` = schon verknüpftes Produkt (Bearbeiten oder Vorlage). */
export function katalogFeldHtml(art: BestandArt, name: string, produktId: string, platzhalter: string): string {
  let p: Produkt | null = null;
  try { p = produktId ? produkt(produktId) : null; } catch { p = null; }
  return `<div class="katalog-feld" data-katalog-art="${art}">
    <label>Bezeichnung <small class="hinweis">tippen, um in der Produktübersicht zu suchen, oder frei eingeben</small>
      <input name="name" value="${esc(name)}" placeholder="${esc(platzhalter)}" required maxlength="200" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="katalogTreffer"></label>
    <input type="hidden" name="katalog" value="${esc(p ? p.id : '')}">
    <ul class="katalog-treffer" id="katalogTreffer" role="listbox" aria-label="Produkte aus der Produktübersicht" hidden></ul>
    <div class="katalog-gewaehlt" data-katalog-gewaehlt ${p ? '' : 'hidden'}>${gewaehltHtml(p)}</div>
  </div>`;
}

/**
 * Suche verdrahten. `uebernehmen` füllt nach dem Antippen weitere Felder des Fensters
 * (z. B. Zubehör oder Einheit), aber nur, wenn Jan dort noch nichts eingetragen hat.
 */
export function katalogFeldVerdrahten(dlg: Element, uebernehmen: (p: Produkt) => void = () => {}) {
  const feld = dlg.querySelector<HTMLElement>('.katalog-feld');
  if (!feld) return;
  const art = feld.dataset.katalogArt as BestandArt;
  const name = feld.querySelector<HTMLInputElement>('[name=name]')!;
  const versteckt = feld.querySelector<HTMLInputElement>('[name=katalog]')!;
  const liste = feld.querySelector<HTMLElement>('.katalog-treffer')!;
  const gewaehlt = feld.querySelector<HTMLElement>('[data-katalog-gewaehlt]')!;
  bildFehlerAbfangen(feld);
  let alle: Produkt[] = [];
  try { alle = produkteFuer(katalog(), 'vorwerk').filter((p) => passtZuArt(p, art)); } catch { alle = []; }

  const zu = () => { liste.hidden = true; liste.innerHTML = ''; name.setAttribute('aria-expanded', 'false'); };
  const zeigen = () => {
    const q = name.value.trim();
    if (q.length < 2 || !alle.length) { zu(); return; }
    const treffer = produktSuchen(alle, q).slice(0, MAX_TREFFER);
    if (!treffer.length) { zu(); return; }
    liste.innerHTML = treffer.map((p) => `<li role="option"><button type="button" class="katalog-treffer-knopf" data-katalog-id="${esc(p.id)}">
      ${bildHtml(p, 'produkt-bild mini')}<span><b>${esc(p.name)}</b><small>${esc(KATEGORIEN[p.kategorie] || '')}</small></span></button></li>`).join('')
      + '<li class="katalog-frei"><small>Nichts Passendes? Einfach weiterschreiben, dann wird es eine freie Eingabe.</small></li>';
    liste.hidden = false;
    name.setAttribute('aria-expanded', 'true');
  };
  const verknuepfen = (p: Produkt | null) => {
    versteckt.value = p ? p.id : '';
    gewaehlt.innerHTML = gewaehltHtml(p);
    gewaehlt.hidden = !p;
  };

  name.addEventListener('input', zeigen);
  name.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown' && !liste.hidden) { ev.preventDefault(); liste.querySelector<HTMLElement>('[data-katalog-id]')?.focus(); }
    if (ev.key === 'Escape' && !liste.hidden) { ev.preventDefault(); ev.stopPropagation(); zu(); }
  });
  liste.addEventListener('keydown', (ev) => {
    const knoepfe = [...liste.querySelectorAll<HTMLElement>('[data-katalog-id]')];
    const i = knoepfe.indexOf(document.activeElement as HTMLElement);
    if (ev.key === 'ArrowDown') { ev.preventDefault(); knoepfe[Math.min(i + 1, knoepfe.length - 1)]?.focus(); }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); (i <= 0 ? name : knoepfe[i - 1])?.focus(); }
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); zu(); name.focus(); }
  });
  liste.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-katalog-id]');
    const p = b ? alle.find((x) => x.id === b.dataset.katalogId) : null;
    if (!p) return;
    name.value = p.name.slice(0, 200);
    verknuepfen(p);
    uebernehmen(p);
    zu();
    name.dispatchEvent(new Event('change', { bubbles: true }));
  });
  gewaehlt.addEventListener('click', (ev) => {
    if ((ev.target as Element).closest('[data-katalog-loesen]')) { verknuepfen(null); name.focus(); }
  });
  // Tipp außerhalb schließt die Trefferliste
  dlg.addEventListener('pointerdown', (ev) => { if (!feld.contains(ev.target as Node)) zu(); });
}
