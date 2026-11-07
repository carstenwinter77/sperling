// Kundenliste mit Suche, Filter (Mehrfachauswahl: Bereiche, Status, letzter Kontakt) und Sortierung.
import { esc, formatDate } from '../../core/util.ts';
import { SPARTEN, kundenTitel, adresseEinzeilig, neuerKunde, type Sparte } from '../../core/model.ts';
import { passt, leererKartenFilter, filterAktiv, type KartenFilter } from '../../core/kartenfilter.ts';
import { letzterKontakt, tageSeit, seitText } from '../../core/verlauf.ts';
import { filterPanelHtml, filterPanelZeigen, filterPanelVerdrahten } from '../filterpanel.ts';
import { istBeispiel } from '../../demo.ts';
import * as store from '../../storage/store.ts';
import { maskottchen } from '../dom.ts';
import { statusChips, leer } from '../parts.ts';

export type Sortierung = 'name' | 'kontakt-alt' | 'kontakt-neu' | 'neu';
const SORTIERUNG: [Sortierung, string][] = [['name', 'Name A–Z'], ['kontakt-alt', 'Längster Kontakt zuerst'], ['kontakt-neu', 'Letzter Kontakt zuerst'], ['neu', 'Zuletzt angelegt']];

/** Suche über Name, Adresse, Telefon, E-Mail. */
export function sucheTrifft(k, suche: string) {
  const q = suche.trim().toLowerCase();
  if (!q) return true;
  const heu = [k.vorname, k.nachname, k.firma, k.strasse, k.plz, k.ort, k.telefon, k.email].join(' ').toLowerCase();
  return q.split(/\s+/).every((w) => heu.includes(w));
}

/** Filter bleibt beim Hin- und Herwechseln erhalten (nur im Arbeitsspeicher). */
const filter: KartenFilter = leererKartenFilter();
let sortierung: Sortierung = 'name';
let suche = '';

export function render(el: HTMLElement, params: URLSearchParams) {
  // Link von der Übersicht (#/kunden?sparte=pv) setzt den Filter neu
  const sp = params.get('sparte');
  if (sp && sp in SPARTEN) Object.assign(filter, leererKartenFilter(), { sparten: [sp as Sparte] });
  if (params.has('q')) suche = params.get('q') || '';

  el.innerHTML = `
    <header class="seitenkopf">
      <h1>${maskottchen('kunde-neu', 'titel-bild')} Kunden</h1>
      <button class="btn primary" id="neu">+ Neuer Kunde</button>
    </header>
    <div class="filterleiste">
      <input type="search" id="suche" placeholder="Name, Adresse, Telefon …" value="${esc(suche)}" autocomplete="off">
      <button type="button" class="btn" id="fKnopf" aria-expanded="false" aria-controls="kFilter">Filter <span id="fAnzahl"></span></button>
      <select id="sortierung" aria-label="Sortierung">${SORTIERUNG.map(([k, l]) => `<option value="${k}" ${k === sortierung ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    ${filterPanelHtml('kFilter')}
    <ul class="liste" id="liste"></ul>
    <p class="geloescht-hinweis"><a href="#/geloescht">🗑 Gelöscht (${(store.getData().papierkorb || []).filter((e) => e.typ === 'kunde').length} Kunden)</a></p>`;

  const liste = el.querySelector('#liste');
  const panel = el.querySelector('#kFilter');
  if (filterAktiv(filter)) { panel.hidden = false; el.querySelector('#fKnopf').setAttribute('aria-expanded', 'true'); }
  const zeichnen = () => {
    const d = store.getData();
    const alle = d.kunden;
    const mitKontakt = alle.map((k) => ({ k, kontakt: letzterKontakt(d, k) })).map((x) => ({ ...x, tage: tageSeit(x.kontakt) }));
    const treffer = mitKontakt.filter((x) => sucheTrifft(x.k, suche) && passt(x.k, filter, x.tage));
    const name = (a, b) => kundenTitel(a.k).localeCompare(kundenTitel(b.k), 'de');
    const tage = (x) => (x.tage === null ? Infinity : x.tage);
    treffer.sort(sortierung === 'kontakt-alt' ? (a, b) => tage(b) - tage(a) || name(a, b)
      : sortierung === 'kontakt-neu' ? (a, b) => tage(a) - tage(b) || name(a, b)
        : sortierung === 'neu' ? (a, b) => (a.k.createdAt < b.k.createdAt ? 1 : -1)
          : name);
    const aktiv = filterAktiv(filter);
    el.querySelector('#fAnzahl').textContent = aktiv ? `· ${treffer.length} von ${alle.length}` : '';
    el.querySelector('#fKnopf').classList.toggle('primary', aktiv > 0);
    filterPanelZeigen(panel, filter, treffer.length, alle.length);
    if (!alle.length) { liste.innerHTML = `<li>${leer('kunde-neu', 'Noch keine Kunden. Lege den ersten an oder setze einen Pin auf der Karte.')}</li>`; return; }
    if (!treffer.length) { liste.innerHTML = '<li class="hinweis">Keine Treffer.</li>'; return; }
    liste.innerHTML = treffer.map(({ k, kontakt, tage: t }) => `
      <li><a class="zeile" href="#/kunde/${esc(k.id)}">
        <span class="zeile-haupt"><strong>${esc(kundenTitel(k))}${istBeispiel(k.id) ? ' <span class="tag tag-beispiel">Beispiel</span>' : ''}</strong><small>${esc(kundenName(k) ? adresseEinzeilig(k) : (k.telefon || ''))}</small></span>
        <span class="kontakt-alter ${kontaktKlasse(t)}" title="${kontakt ? `Letzter Kontakt ${esc(formatDate(kontakt))}` : 'Noch kein Kontakt'}">${esc(seitText(t))}</span>
        ${statusChips(k)}
      </a></li>`).join('');
  };
  const kundenName = (k) => [k.vorname, k.nachname, k.firma].some(Boolean);
  zeichnen();

  el.querySelector('#suche').addEventListener('input', (e) => { suche = (e.target as HTMLInputElement).value; zeichnen(); });
  el.querySelector('#sortierung').addEventListener('change', (e) => { sortierung = (e.target as HTMLSelectElement).value as Sortierung; zeichnen(); });
  el.querySelector('#fKnopf').addEventListener('click', (e) => {
    panel.hidden = !panel.hidden;
    (e.currentTarget as HTMLElement).setAttribute('aria-expanded', String(!panel.hidden));
  });
  filterPanelVerdrahten(panel, filter, zeichnen);
  el.querySelector('#neu').addEventListener('click', () => {
    const k = neuerKunde();
    store.mutate((d) => { d.kunden.push(k); });
    location.hash = `#/kunde/${k.id}?neu=1`;
  });
}

/** Farbe nach Kontakt-Alter: frisch, mittel, lange her. */
export const kontaktKlasse = (t: number | null) => (t === null ? 'nie' : t <= 30 ? 'frisch' : t <= 90 ? 'mittel' : 'alt');
