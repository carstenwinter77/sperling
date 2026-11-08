// Kundenliste mit Suche, Filter (Mehrfachauswahl: Bereiche, Status, letzter Kontakt) und Sortierung.
import { esc, formatDate } from '../../core/util.ts';
import { SPARTEN, STATUS, kundenTitel, kundenVergleich, adresseEinzeilig, neuerKunde, type Sparte, type StatusKey } from '../../core/model.ts';
import { passt, leererKartenFilter, filterAktiv, type KartenFilter } from '../../core/kartenfilter.ts';
import { letzterKontakt, tageSeit, seitText } from '../../core/verlauf.ts';
import { filterPanelHtml, filterPanelZeigen, filterPanelVerdrahten } from '../filterpanel.ts';
import { istBeispiel } from '../../demo.ts';
import * as store from '../../storage/store.ts';
import { maskottchen } from '../dom.ts';
import { statusChips, leer, terminDialog } from '../parts.ts';
import { naviLink } from '../navi.ts';
import { anrufen } from '../kontakt.ts';
import { schnellNotiz } from '../schnellnotiz.ts';
import { trenner } from '../../core/kundenexport.ts';

export type Sortierung = 'name' | 'kontakt-alt' | 'kontakt-neu' | 'neu';
const SORTIERUNG: [Sortierung, string][] = [['name', 'Name A–Z'], ['kontakt-alt', 'Längster Kontakt zuerst'], ['kontakt-neu', 'Letzter Kontakt zuerst'], ['neu', 'Zuletzt angelegt']];

/** Suche über Name, Adresse, Telefon, E-Mail. */
export function sucheTrifft(k, suche: string) {
  const q = suche.trim().toLowerCase();
  if (!q) return true;
  const heu = [k.vorname, k.nachname, k.firma, k.strasse, k.plz, k.ort, k.telefon, k.email, ...Object.values(k.eigene || {}).filter((v) => typeof v === 'string')].join(' ').toLowerCase();
  return q.split(/\s+/).every((w) => heu.includes(w));
}

/** Filter bleibt beim Hin- und Herwechseln erhalten (nur im Arbeitsspeicher). */
const filter: KartenFilter = leererKartenFilter();
let sortierung: Sortierung = 'name';
let suche = '';
/** Zuletzt angezeigte Liste (Reihenfolge wie auf dem Bildschirm) für den Export. */
let angezeigt: { k: any; kontakt: string | null }[] = []; // any: Kunde aus store, wie in zeichnen()

export function render(el: HTMLElement, params: URLSearchParams) {
  // Link von der Übersicht (#/kunden?sparte=pv, optional &status=potenzial,interesse) setzt den Filter neu
  const sp = params.get('sparte');
  if (sp && sp in SPARTEN) {
    const status = (params.get('status') || '').split(',').filter((x): x is StatusKey => x in STATUS);
    Object.assign(filter, leererKartenFilter(), { sparten: [sp as Sparte], status });
  }
  if (params.has('q')) suche = params.get('q') || '';

  el.innerHTML = `
    <header class="seitenkopf">
      <h1>${maskottchen('kunde-neu', 'titel-bild')} Kunden</h1>
      <div class="knopfreihe">
        <button class="btn ghost" id="pdfImport" ${store.isDemo() ? 'disabled title="Im Demo-Modus nicht verfügbar"' : ''}>📄 PDF-Liste importieren</button>
        <button class="btn primary" id="neu">+ Neuer Kunde</button>
      </div>
    </header>
    <div class="filterleiste mit-export">
      <input type="search" id="suche" placeholder="Name, Adresse, Telefon …" value="${esc(suche)}" autocomplete="off">
      <button type="button" class="btn" id="fKnopf" aria-expanded="false" aria-controls="kFilter">Filter <span id="fAnzahl"></span></button>
      <select id="sortierung" aria-label="Sortierung">${SORTIERUNG.map(([k, l]) => `<option value="${k}" ${k === sortierung ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button type="button" class="btn" id="export" title="Angezeigte Liste als PDF, Excel oder CSV exportieren" aria-label="Angezeigte Liste exportieren (PDF, Excel, CSV)">⬇<span class="export-text"> Export</span></button>
    </div>
    ${filterPanelHtml('kFilter', store.getData().einstellungen.felder)}
    <ul class="liste" id="liste"></ul>
    <p class="geloescht-hinweis"><a href="#/geloescht">🗑 Gelöscht (${(store.getData().papierkorb || []).filter((e) => e.typ === 'kunde').length} Kunden)</a></p>`;

  const liste = el.querySelector('#liste');
  const panel = el.querySelector('#kFilter');
  if (filterAktiv(filter)) { panel.hidden = false; el.querySelector('#fKnopf').setAttribute('aria-expanded', 'true'); }
  const zeichnen = () => {
    const d = store.getData();
    const alle = d.kunden;
    const mitKontakt = alle.map((k) => ({ k, kontakt: letzterKontakt(d, k) })).map((x) => ({ ...x, tage: tageSeit(x.kontakt) }));
    const treffer = mitKontakt.filter((x) => sucheTrifft(x.k, suche) && passt(x.k, filter, x.tage, d.einstellungen.felder));
    const name = (a, b) => kundenVergleich(a.k, b.k);
    const tage = (x) => (x.tage === null ? Infinity : x.tage);
    treffer.sort(sortierung === 'kontakt-alt' ? (a, b) => tage(b) - tage(a) || name(a, b)
      : sortierung === 'kontakt-neu' ? (a, b) => tage(a) - tage(b) || name(a, b)
        : sortierung === 'neu' ? (a, b) => (a.k.createdAt < b.k.createdAt ? 1 : -1)
          : name);
    angezeigt = treffer;
    const aktiv = filterAktiv(filter);
    el.querySelector('#fAnzahl').textContent = aktiv ? `· ${treffer.length} von ${alle.length}` : '';
    el.querySelector('#fKnopf').classList.toggle('primary', aktiv > 0);
    filterPanelZeigen(panel, filter, treffer.length, alle.length, 'Kunden', d.einstellungen.felder);
    if (!alle.length) { liste.innerHTML = `<li>${leer('kunde-neu', 'Noch keine Kunden. Lege den ersten an oder setze einen Pin auf der Karte.')}</li>`; return; }
    if (!treffer.length) { liste.innerHTML = '<li class="hinweis">Keine Treffer.</li>'; return; }
    const buchstaben = trenner(treffer, sortierung === 'name');
    liste.innerHTML = treffer.map(({ k, kontakt, tage: t }, i) => `${buchstaben[i] ? `
      <li class="buchstabe" data-buchstabe="${esc(buchstaben[i]!)}"><span>${esc(buchstaben[i]!)}</span></li>` : ''}
      <li class="kz" data-kunde="${esc(k.id)}"><a class="zeile" href="#/kunde/${esc(k.id)}">
        <span class="zeile-haupt"><strong>${esc(kundenTitel(k))}${istBeispiel(k.id) ? ' <span class="tag tag-beispiel">Beispiel</span>' : ''}</strong><small>${esc(kundenName(k) ? adresseEinzeilig(k) : (k.telefon || ''))}</small></span>
        <span class="kontakt-alter ${kontaktKlasse(t)}" title="${kontakt ? `Letzter Kontakt ${esc(formatDate(kontakt))}` : 'Noch kein Kontakt'}">${esc(seitText(t))}</span>
        ${statusChips(k)}
      </a>${schnellKnoepfe(k)}</li>`).join('');
  };
  const kundenName = (k) => [k.vorname, k.nachname, k.firma].some(Boolean);
  zeichnen();

  liste.addEventListener('click', async (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-schnell]');
    const li = (ev.target as Element).closest<HTMLElement>('li[data-kunde]');
    if (!b || !li) return;
    const k = store.findKunde(li.dataset.kunde || '');
    if (!k) return;
    const a = b.dataset.schnell;
    if (a === 'anrufen') anrufen(kundenTitel(k), k.telefon);
    else if (a === 'notiz') { if (await schnellNotiz(k.id)) zeichnen(); }
    else if (a === 'termin') { if (await terminDialog({ kundeId: k.id })) zeichnen(); }
  });
  el.querySelector('#suche').addEventListener('input', (e) => { suche = (e.target as HTMLInputElement).value; zeichnen(); });
  el.querySelector('#sortierung').addEventListener('change', (e) => { sortierung = (e.target as HTMLSelectElement).value as Sortierung; zeichnen(); });
  el.querySelector('#fKnopf').addEventListener('click', (e) => {
    panel.hidden = !panel.hidden;
    (e.currentTarget as HTMLElement).setAttribute('aria-expanded', String(!panel.hidden));
  });
  filterPanelVerdrahten(panel, filter, zeichnen);
  el.querySelector('#export').addEventListener('click', async () => {
    const { exportDialog } = await import('../kundenexport.ts');
    const teile = [`Sortiert: ${SORTIERUNG.find(([k]) => k === sortierung)?.[1] || ''}`];
    if (filterAktiv(filter)) teile.push('Filter aktiv');
    if (suche.trim()) teile.push(`Suche „${suche.trim()}“`);
    await exportDialog({ eintraege: angezeigt, gesamt: store.getData().kunden.length, beschreibung: teile.join(' · '), buchstaben: sortierung === 'name' });
  });
  el.querySelector('#pdfImport').addEventListener('click', async () => {
    const { importieren } = await import('../listenimport.ts');
    await importieren(() => render(el, params));
  });
  el.querySelector('#neu').addEventListener('click', () => {
    const k = neuerKunde();
    store.mutate((d) => { d.kunden.push(k); });
    location.hash = `#/kunde/${k.id}?neu=1`;
  });
}

/** Farbe nach Kontakt-Alter: frisch, mittel, lange her. */
export const kontaktKlasse = (t: number | null) => (t === null ? 'nie' : t <= 30 ? 'frisch' : t <= 90 ? 'mittel' : 'alt');

/** Schnellknöpfe je Zeile: Anrufen, Hinfahren, Notiz, Termin, ohne die Kundenseite zu öffnen. */
export function schnellKnoepfe(k): string {
  const name = esc(kundenTitel(k));
  const route = naviLink(k);
  return `<span class="kz-aktionen">
    ${k.telefon ? `<button type="button" class="btn klein ghost" data-schnell="anrufen" aria-label="${name} anrufen" title="Anrufen">📞</button>` : '<span class="kz-platz" aria-hidden="true"></span>'}
    ${route ? `<a class="btn klein ghost" href="${esc(route)}" target="_blank" rel="noopener" aria-label="Zu ${name} fahren" title="Hinfahren">🚗</a>` : '<span class="kz-platz" aria-hidden="true"></span>'}
    <button type="button" class="btn klein ghost" data-schnell="notiz" aria-label="Notiz zu ${name}" title="Notiz">📝</button>
    <button type="button" class="btn klein ghost" data-schnell="termin" aria-label="Termin oder Wiedervorlage für ${name}" title="Termin / Wiedervorlage">📅</button>
  </span>`;
}
