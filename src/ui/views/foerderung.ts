// Förderung: Gesetze, Zuschüsse, Steuern und Netzregeln für PV und Wärmepumpe in einfacher Sprache.
// Durchsuchbar, nach Bereich und Thema filterbar, Zeitleiste „Was kommt wann“, „Wusstest du?“ und Kopieren je Abschnitt mit Quellen.
// Enthält keine Kundendaten und ist deshalb auch im Beratungs-Schutz erlaubt.
import { esc, suchText } from '../../core/util.ts';
import {
  ABSCHNITTE, BEREICHE, HINWEIS, KATEGORIEN, STAND, STATUS, abschnittText, datumText, foerderungFiltern, wusstestDu, zeitleiste,
  type Abschnitt, type FoeKategorie,
} from '../../core/foerderung.ts';
import { kopieren, maskottchen, toast } from '../dom.ts';

let bereich: 'alle' | 'pv' | 'wp' = 'alle';
let kategorie: FoeKategorie | '' = '';
let suche = '';
let wusstestNr = -1;

const heuteIso = () => new Date().toISOString().slice(0, 10);

/** Suchwörter im (bereits escapten) Text mit <mark> hervorheben. Arbeitet nur auf escaptem Text (R-XSS). */
function markiert(text: string, woerter: string[]): string {
  const roh = esc(text);
  if (!woerter.length) return roh;
  // Flache Fassung wie suchText (Umlaute ausgeschrieben), mit Rückverweis auf die Stelle im Originaltext.
  let flach = ''; const stelle: number[] = [];
  [...roh].forEach((c, i) => {
    const f = suchText(c) || (c.trim() ? c : ' ');
    for (const z of f) { flach += z; stelle.push(i); }
  });
  const zeichen = [...roh];
  const treffer: [number, number][] = [];
  for (const w of woerter) {
    if (w.length < 2) continue;
    let i = flach.indexOf(w);
    while (i >= 0) { treffer.push([stelle[i], stelle[i + w.length - 1] + 1]); i = flach.indexOf(w, i + w.length); }
  }
  if (!treffer.length) return roh;
  treffer.sort((x, y) => x[0] - y[0]);
  let out = ''; let pos = 0;
  for (const [a, b] of treffer) {
    if (a < pos) continue;
    const vor = zeichen.slice(0, b).join(''); const amp = vor.lastIndexOf('&');
    if (amp >= 0 && vor.indexOf(';', amp) < 0) continue; // nicht in eine HTML-Entität schneiden
    out += zeichen.slice(pos, a).join('') + '<mark>' + zeichen.slice(a, b).join('') + '</mark>';
    pos = b;
  }
  return out + zeichen.slice(pos).join('');
}

function abschnittHtml(a: Abschnitt, woerter: string[], offen: boolean): string {
  const m = (t: string) => markiert(t, woerter);
  return `<details class="foe-abschnitt foe-${a.bereich}" id="foe-${esc(a.id)}" data-abschnitt="${esc(a.id)}" ${offen ? 'open' : ''}>
    <summary>
      <span class="foe-titel">${m(a.titel)}</span>
      <span class="foe-marken">
        <span class="foe-bereich foe-bereich-${a.bereich}">${esc(BEREICHE[a.bereich])}</span>
        <span class="foe-status foe-status-${a.status}">${esc(STATUS[a.status])}</span>
      </span>
      <span class="foe-kurz">${m(a.kurz)}</span>
    </summary>
    <div class="foe-inhalt">
      <ul class="foe-punkte">${a.punkte.map((p) => `<li>${m(p)}</li>`).join('')}</ul>
      ${a.tabelle?.length ? `<div class="foe-tabelle-rahmen"><table class="foe-tabelle">
        <thead><tr>${a.tabelle[0].map((z) => `<th scope="col">${m(z)}</th>`).join('')}</tr></thead>
        <tbody>${a.tabelle.slice(1).map((r) => `<tr>${r.map((z, i) => (i === 0 ? `<th scope="row">${m(z)}</th>` : `<td>${m(z)}</td>`)).join('')}</tr>`).join('')}</tbody>
      </table></div>` : ''}
      ${a.merke ? `<p class="foe-merke"><span aria-hidden="true">💡</span> <b>Gut zu wissen:</b> ${m(a.merke)}</p>` : ''}
      <div class="foe-quellen">
        <h3>Quellen</h3>
        <ul>${a.quellen.map((q) => `<li><a href="${esc(q.url)}" target="_blank" rel="noopener noreferrer">${esc(q.titel)}<span class="sr-only"> (öffnet in neuem Fenster)</span></a>${q.amtlich ? ' <span class="foe-amtlich" title="Offizielle Stelle">amtlich</span>' : ''}</li>`).join('')}</ul>
      </div>
      <div class="foe-fuss">
        <span class="hinweis">Geprüft am ${esc(datumText(a.geprueft))}</span>
        <button type="button" class="btn klein" data-kopieren="${esc(a.id)}" aria-label="„${esc(a.titel)}“ mit Quellen kopieren">📋 Kopieren</button>
      </div>
    </div>
  </details>`;
}

export function render(el: HTMLElement, params: URLSearchParams) {
  const b = params.get('bereich');
  if (b === 'alle' || b === 'pv' || b === 'wp') bereich = b;
  const ziel = params.get('abschnitt') || '';
  const heute = heuteIso();

  el.innerHTML = `
    <header class="seitenkopf"><h1>${maskottchen('foerderung', 'titel-bild')} Förderung</h1></header>
    <section class="karte-box foe-intro">
      <p>Gesetze, Zuschüsse, Steuern und Netzregeln für <b>Photovoltaik</b> und <b>Wärmepumpe</b>, in einfacher Sprache und mit Quellen. Jeder Abschnitt lässt sich mit Quellenangabe kopieren und weiterleiten.</p>
      <p class="foe-hinweis" role="note"><span aria-hidden="true">⚖️</span> <span><b>Stand ${esc(datumText(STAND))}.</b> ${esc(HINWEIS)}</span></p>
    </section>
    <nav class="tabs aw-bereiche" role="tablist" aria-label="Bereich" id="foeBereiche">
      ${(['alle', 'pv', 'wp'] as const).map((x) => `<button type="button" role="tab" data-bereich="${x}" class="bereich-${x}">${x === 'alle' ? 'Alle' : esc(BEREICHE[x])}</button>`).join('')}
    </nav>
    <label class="hilfe-suche"><span class="sr-only">Förderung durchsuchen</span><input type="search" id="foeSuche" placeholder="Suchen, z. B. „Speicher“, „Steuer“ oder „Bonus“" autocomplete="off" value="${esc(suche)}"></label>
    <div class="chips-filter" id="foeKategorien" role="group" aria-label="Thema">
      <button type="button" data-kat="">Alle Themen</button>
      ${(Object.keys(KATEGORIEN) as FoeKategorie[]).map((k) => `<button type="button" data-kat="${k}">${esc(KATEGORIEN[k])}</button>`).join('')}
    </div>
    <div id="foeOben"></div>
    <p class="sr-only" aria-live="polite" id="foeAnzahl"></p>
    <div id="foeListe" class="foe-liste"></div>
    <p class="hinweis foe-schluss">${esc(HINWEIS)}</p>`;

  const liste = el.querySelector<HTMLElement>('#foeListe')!;
  const oben = el.querySelector<HTMLElement>('#foeOben')!;

  const obenZeichnen = () => {
    if (suche.trim() || kategorie) { oben.innerHTML = ''; return; }
    const fakten = wusstestDu(foerderungFiltern(ABSCHNITTE, { bereich }));
    if (wusstestNr < 0) wusstestNr = Math.floor(Math.random() * Math.max(1, fakten.length));
    const f = fakten.length ? fakten[wusstestNr % fakten.length] : null;
    const zeit = zeitleiste(heute).filter((t) => bereich === 'alle' || t.bereich === bereich || t.bereich === 'beide');
    const naechster = zeit.findIndex((t) => !t.vorbei);
    oben.innerHTML = `
      ${f ? `<section class="karte-box foe-wusstest" aria-labelledby="foeWusstestTitel">
        ${maskottchen('sperling', 'foe-wusstest-bild')}
        <div>
          <h2 id="foeWusstestTitel">Wusstest du?</h2>
          <p id="foeWusstestText">${esc(f.text)}</p>
          <div class="foe-wusstest-knoepfe">
            <button type="button" class="btn klein" id="foeWeiter">Noch einer</button>
            <button type="button" class="btn klein ghost" data-springen="${esc(f.id)}">Mehr dazu</button>
          </div>
        </div>
      </section>` : ''}
      <details class="karte-box foe-zeit" open>
        <summary><h2>Was kommt wann</h2></summary>
        <ol class="foe-zeitleiste">
          ${zeit.map((t, i) => `<li class="foe-zeit-${t.bereich}${t.vorbei ? ' vorbei' : ''}${t.sicher ? '' : ' unsicher'}${i === naechster ? ' naechster' : ''}">
            <button type="button" data-springen="${esc(t.abschnitt)}">
              <time datetime="${esc(t.datum)}">${esc(datumText(t.datum))}</time>
              <span>${esc(t.text)}${t.sicher ? '' : ' <em>(geplant)</em>'}${i === naechster ? ' <strong class="foe-als-naechstes">als Nächstes</strong>' : ''}</span>
            </button>
          </li>`).join('')}
        </ol>
      </details>`;
  };

  const zeichnen = (offenId = '') => {
    el.querySelectorAll<HTMLElement>('#foeBereiche [data-bereich]').forEach((x) => { const an = x.dataset.bereich === bereich; x.classList.toggle('aktiv', an); x.setAttribute('aria-selected', String(an)); });
    el.querySelectorAll<HTMLElement>('#foeKategorien [data-kat]').forEach((x) => { const an = (x.dataset.kat || '') === kategorie; x.classList.toggle('aktiv', an); x.setAttribute('aria-pressed', String(an)); });
    obenZeichnen();
    const woerter = suchText(suche).split(/\s+/).filter(Boolean);
    const treffer = foerderungFiltern(ABSCHNITTE, { bereich, kategorie, q: suche });
    const offenAlle = woerter.length > 0 && treffer.length <= 3;
    liste.innerHTML = treffer.length
      ? treffer.map((a) => abschnittHtml(a, woerter, offenAlle || a.id === offenId)).join('')
      : `<p class="hinweis">Nichts gefunden${suche ? ` für „${esc(suche)}“` : ''}. Tipp: ein kürzeres Wort probieren oder „Alle“ wählen.</p>`;
    el.querySelector('#foeAnzahl')!.textContent = `${treffer.length} ${treffer.length === 1 ? 'Abschnitt' : 'Abschnitte'} gefunden`;
  };

  const springen = (id: string) => {
    if (!ABSCHNITTE.some((a) => a.id === id)) return;
    let ziel = el.querySelector<HTMLDetailsElement>(`#foe-${CSS.escape(id)}`);
    if (!ziel) { suche = ''; kategorie = ''; bereich = 'alle'; el.querySelector<HTMLInputElement>('#foeSuche')!.value = ''; zeichnen(id); ziel = el.querySelector<HTMLDetailsElement>(`#foe-${CSS.escape(id)}`); }
    if (!ziel) return;
    ziel.open = true;
    ziel.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    ziel.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
  };

  zeichnen(ziel);
  if (ziel) requestAnimationFrame(() => springen(ziel));

  el.querySelector('#foeBereiche')!.addEventListener('click', (ev) => {
    const x = (ev.target as Element).closest<HTMLElement>('[data-bereich]');
    if (!x) return;
    bereich = x.dataset.bereich as typeof bereich;
    wusstestNr = -1;
    history.replaceState(null, '', `#/foerderung?bereich=${bereich}`);
    zeichnen();
  });
  el.querySelector('#foeKategorien')!.addEventListener('click', (ev) => {
    const x = (ev.target as Element).closest<HTMLElement>('[data-kat]');
    if (x) { kategorie = (x.dataset.kat || '') as FoeKategorie | ''; zeichnen(); }
  });
  el.querySelector<HTMLInputElement>('#foeSuche')!.addEventListener('input', (ev) => { suche = (ev.target as HTMLInputElement).value; zeichnen(); });
  el.addEventListener('click', async (ev) => {
    const t = ev.target as Element;
    const k = t.closest<HTMLElement>('[data-kopieren]');
    if (k) {
      const a = ABSCHNITTE.find((x) => x.id === k.dataset.kopieren);
      if (!a) return;
      const ok = await kopieren(abschnittText(a));
      toast(ok ? 'Kopiert, mit Quellen und Hinweis' : 'Kopieren hat nicht geklappt', ok ? 'ok' : 'error');
      return;
    }
    const s = t.closest<HTMLElement>('[data-springen]');
    if (s) { springen(s.dataset.springen || ''); return; }
    if (t.closest('#foeWeiter')) {
      wusstestNr += 1;
      obenZeichnen();
      el.querySelector<HTMLElement>('#foeWeiter')?.focus();
    }
  });
}
