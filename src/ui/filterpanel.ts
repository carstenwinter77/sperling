// Sperling – Filterfeld mit Mehrfachauswahl (Bereiche, Status, letzter Kontakt) für Karte und Kundenliste.
// Angetippte Chips werden gezeigt, alles andere ausgeblendet. Leere Gruppe = alle.
import { esc } from '../core/util.ts';
import { SPARTEN, SPARTEN_KEYS, STATUS, type Sparte, type StatusKey } from '../core/model.ts';
import { KONTAKT_FILTER, leererKartenFilter, filterAktiv, type KartenFilter, type KontaktFilter } from '../core/kartenfilter.ts';

export function filterPanelHtml(id: string): string {
  return `<div class="karte-filter karte-box" id="${id}" hidden>
    <div class="kf-gruppe"><strong>Bereiche</strong>${SPARTEN_KEYS.map((s) => `<button type="button" class="chip-wahl tag-${s}" data-f-sparte="${s}" aria-pressed="false">${esc(SPARTEN[s].label)}</button>`).join('')}</div>
    <div class="kf-gruppe"><strong>Status</strong>${Object.entries(STATUS).map(([k, v]) => `<button type="button" class="chip-wahl kf-status" data-f-status="${k}" style="--c:${v.farbe}" aria-pressed="false"><i></i>${esc(v.label)}</button>`).join('')}</div>
    <div class="kf-gruppe"><strong>Kein Kontakt</strong>${KONTAKT_FILTER.map(([k, l]) => `<button type="button" class="chip-wahl" data-f-kontakt="${k}" aria-pressed="false">${esc(l)}</button>`).join('')}</div>
    <p class="hinweis kf-text"></p>
    <button type="button" class="btn klein ghost" data-f-alle>Alle zeigen</button>
  </div>`;
}

/** Zustand der Chips auffrischen und Beschreibung setzen. */
export function filterPanelZeigen(panel: Element, f: KartenFilter, sichtbar: number, gesamt: number, was = 'Kunden') {
  panel.querySelectorAll<HTMLElement>('[data-f-sparte]').forEach((b) => an(b, f.sparten.includes(b.dataset.fSparte as Sparte)));
  panel.querySelectorAll<HTMLElement>('[data-f-status]').forEach((b) => an(b, f.status.includes(b.dataset.fStatus as StatusKey)));
  panel.querySelectorAll<HTMLElement>('[data-f-kontakt]').forEach((b) => an(b, f.kontakt === b.dataset.fKontakt));
  const sp = f.sparten.length ? f.sparten.map((s) => SPARTEN[s].label).join(', ') : 'alle Bereiche';
  const st = f.status.length ? f.status.map((s) => STATUS[s].label).join(', ') : (f.sparten.length ? 'mit Interesse' : 'jeder Status');
  const ko = f.kontakt ? ` · kein Kontakt ${KONTAKT_FILTER.find(([k]) => k === f.kontakt)?.[1]}` : '';
  panel.querySelector('.kf-text').textContent = filterAktiv(f)
    ? `Gezeigt: ${sp} · ${st}${ko} – ${sichtbar} von ${gesamt} ${was}. Nicht Gewähltes ist ausgeblendet.`
    : 'Tippe an, was du sehen willst. Mehrere sind möglich, alles andere wird ausgeblendet.';
}
const an = (b: HTMLElement, ja: boolean) => { b.classList.toggle('aktiv', ja); b.setAttribute('aria-pressed', String(ja)); };

/** Klicks im Feld verarbeiten; ändert `f` und ruft danach `geaendert`. */
export function filterPanelVerdrahten(panel: Element, f: KartenFilter, geaendert: () => void) {
  const umschalten = <T,>(liste: T[], x: T) => (liste.includes(x) ? liste.filter((y) => y !== x) : [...liste, x]);
  panel.addEventListener('click', (e) => {
    const t = e.target as Element;
    const sp = t.closest<HTMLElement>('[data-f-sparte]');
    const st = t.closest<HTMLElement>('[data-f-status]');
    const ko = t.closest<HTMLElement>('[data-f-kontakt]');
    if (sp) f.sparten = umschalten(f.sparten, sp.dataset.fSparte as Sparte);
    else if (st) f.status = umschalten(f.status, st.dataset.fStatus as StatusKey);
    else if (ko) f.kontakt = f.kontakt === ko.dataset.fKontakt ? '' : ko.dataset.fKontakt as KontaktFilter;
    else if (t.closest('[data-f-alle]')) Object.assign(f, leererKartenFilter());
    else return;
    geaendert();
  });
}
