// Hilfe-Seite: Installationshilfe für das erkannte Gerät, Anleitungen je Bereich, Begriffe, häufige Fragen, Suche.
import { esc } from '../../core/util.ts';
import { THEMEN, BEGRIFFE, FRAGEN, hilfeSuchen, type ThemaId } from '../../core/hilfe.ts';
import { GERAETE, BROWSER_NAME, geraetName, wegeFuer, type Geraet } from '../../core/installieren.ts';
import { maskottchen, toast } from '../dom.ts';
import * as hilfe from '../hilfe.ts';

let gewaehlt: Geraet | null = null;

export function render(el: HTMLElement, params: URLSearchParams) {
  const ziel = params.get('thema') || '';
  el.innerHTML = `
    <header class="seitenkopf">
      <h1>${maskottchen('sperling', 'titel-bild')} Hilfe</h1>
    </header>
    <label class="hilfe-suche"><span class="sr-only">Hilfe durchsuchen</span><input type="search" id="hilfeSuche" placeholder="Hilfe durchsuchen, z. B. „sichern“ oder „Einwand“" autocomplete="off"></label>
    <div id="hilfeTreffer"></div>
    <div id="hilfeAlles">
      <section class="karte-box" id="thema-installieren"><div id="installBox"></div></section>
      <section class="karte-box">
        <h2>Anleitungen</h2>
        ${(Object.keys(THEMEN) as ThemaId[]).filter((id) => id !== 'installieren').map((id) => themaHtml(id, id === ziel)).join('')}
      </section>
      <section class="karte-box">
        <h2>Begriffe</h2>
        <dl class="hilfe-begriffe">${BEGRIFFE.map(([b, t]) => `<dt>${esc(b)}</dt><dd>${esc(t)}</dd>`).join('')}</dl>
      </section>
      <section class="karte-box">
        <h2>Häufige Fragen</h2>
        ${FRAGEN.map(([f, a]) => `<details class="hilfe-thema"><summary>${esc(f)}</summary><p>${esc(a)}</p></details>`).join('')}
      </section>
    </div>`;

  const installZeichnen = () => {
    const box = el.querySelector('#installBox');
    if (!box) return;
    const i = hilfe.install;
    const geraet = gewaehlt || i.geraet;
    const wege = wegeFuer(geraet, geraet === i.geraet ? i.browser : 'andere');
    box.innerHTML = `
      <h2>📲 Sperling als App installieren</h2>
      ${i.alsApp ? '<p class="ok-box">✓ Sperling läuft gerade als installierte App.</p>'
    : hilfe.istInstalliert() ? '<p class="hinweis">Auf diesem Gerät ist Sperling schon installiert. Öffne es am besten über das App-Symbol.</p>'
      : `<p>Erkannt: <b>${esc(geraetName(i.geraet))}</b> mit <b>${esc(BROWSER_NAME[i.browser])}</b>. Installiert startet Sperling vom Home-Bildschirm, läuft offline und kann Face ID nutzen.</p>`}
      ${i.knopf && !i.alsApp ? '<button type="button" class="btn primary" id="jetztInstallieren">Jetzt installieren</button>' : ''}
      <div class="segment install-geraete" role="tablist" aria-label="Gerät">${GERAETE.map((g) => `<button type="button" role="tab" data-geraet="${g.key}" class="${g.key === (geraet === 'linux' ? 'windows' : geraet) ? 'aktiv' : ''}" aria-selected="${g.key === geraet}">${esc(g.name)}</button>`).join('')}</div>
      ${wege.map((w, n) => `
        <details class="hilfe-thema install-weg" ${n === 0 ? 'open' : ''}>
          <summary>${esc(w.titel)}${n === 0 && geraet === i.geraet ? ' <small>(dein Browser)</small>' : ''}</summary>
          <ol class="hilfe-schritte">${w.schritte.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
          ${w.hinweis ? `<p class="hinweis">${esc(w.hinweis)}</p>` : ''}
        </details>`).join('')}`;
    box.querySelector('#jetztInstallieren')?.addEventListener('click', async () => {
      const ok = await hilfe.installieren();
      toast(ok ? 'Sperling ist installiert' : 'Installation abgebrochen', ok ? 'ok' : 'info');
    });
    box.querySelectorAll<HTMLElement>('[data-geraet]').forEach((b) => b.addEventListener('click', () => { gewaehlt = b.dataset.geraet as Geraet; installZeichnen(); }));
  };
  installZeichnen();
  const weg = hilfe.beobachten(installZeichnen);

  const suche = el.querySelector<HTMLInputElement>('#hilfeSuche')!;
  suche.addEventListener('input', () => {
    const q = suche.value.trim();
    const alles = el.querySelector<HTMLElement>('#hilfeAlles')!;
    const box = el.querySelector('#hilfeTreffer')!;
    alles.hidden = !!q;
    if (!q) { box.innerHTML = ''; return; }
    const t = hilfeSuchen(q);
    box.innerHTML = t.length ? `<section class="karte-box"><h2>${t.length} Treffer</h2>${t.map((x) => (x.art === 'thema' ? themaHtml(x.id as ThemaId, true)
      : `<details class="hilfe-thema" open><summary>${esc(x.titel)}</summary><p>${esc(x.text)}</p></details>`)).join('')}</section>`
      : `<p class="hinweis">Nichts gefunden für „${esc(q)}“.</p>`;
  });

  if (ziel) {
    const z = el.querySelector(`#thema-${CSS.escape(ziel)}`);
    if (z) requestAnimationFrame(() => z.scrollIntoView({ block: 'start' }));
  }
  return weg;
}

function themaHtml(id: ThemaId, offen: boolean): string {
  const t = THEMEN[id];
  const schritte = 'schritte' in t ? (t.schritte as string[]) : [];
  return `<details class="hilfe-thema" id="thema-${id}" ${offen ? 'open' : ''}>
    <summary>${esc(t.titel)}</summary>
    <p>${esc(t.kurz)}</p>
    ${schritte.length ? `<ol class="hilfe-schritte">${schritte.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
  </details>`;
}
