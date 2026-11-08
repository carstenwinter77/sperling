// „Wann rechnet sich das?“ – grober Amortisationsrechner (PV und Wärmepumpe), eigener Menüpunkt #/rechner.
// Werte bleiben nur im Arbeitsspeicher; aus der Kundenkartei übernommene Angaben werden nirgends gespeichert.
import { esc } from '../core/util.ts';
import {
  PV_STANDARD, WP_STANDARD, PV_FELDER, WP_FELDER, RECHNER_HINWEIS, rechnePv, rechneWp, staffel, hoechstpreis, wpZuschuss,
  pvAusKunde, wpAusKunde, zahlLesen, euro, jahreText, rechnerText, type Rechner, type PvAnnahmen, type WpAnnahmen, type Ergebnis, type Feld,
} from '../core/amortisation.ts';
import { kopieren, toast } from './dom.ts';

let art: Rechner = 'pv';
let pv: PvAnnahmen = { ...PV_STANDARD };
let wp: WpAnnahmen = { ...WP_STANDARD };
/** Kunde und übernommene Werte, zuletzt geladen (damit Änderungen beim Zurückkommen bleiben). */
let kundeGeladen = '';
let uebernommen: Record<Rechner, string[]> = { pv: [], wp: [] };

const zahl = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 });

function rechnen(): { a: PvAnnahmen | WpAnnahmen; e: Ergebnis } {
  return art === 'pv' ? { a: pv, e: rechnePv(pv) } : { a: wp, e: rechneWp(wp) };
}

/** Säulen je Jahr: Stand nach dem Jahr (unter null = noch nicht bezahlt). */
function diagramm(e: Ergebnis): string {
  const w = 600; const h = 200; const rand = 4;
  const werte = e.kumuliert;
  const max = Math.max(1, ...werte); const min = Math.min(0, -e.eigenanteil, ...werte);
  const y = (v: number) => rand + ((max - v) / (max - min)) * (h - 2 * rand);
  const bw = (w - 2 * rand) / werte.length;
  const null0 = y(0);
  const saeulen = werte.map((v, i) => {
    const x = rand + i * bw + bw * 0.15; const y1 = Math.min(y(v), null0); const hh = Math.max(1, Math.abs(y(v) - null0));
    return `<rect x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${hh.toFixed(1)}" class="${v >= 0 ? 'rz-plus' : 'rz-minus'}"><title>Jahr ${i + 1}: ${esc(euro(v))}</title></rect>`;
  }).join('');
  const beschr = `Stand nach jedem Jahr. ${e.amortisation === null ? 'Im Zeitraum nicht bezahlt gemacht.' : `Bezahlt gemacht ${jahreText(e.amortisation)}.`} Nach ${werte.length} Jahren: ${euro(e.ende)}.`;
  return `<figure class="rz-diagramm">
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(beschr)}" preserveAspectRatio="none">
      ${saeulen}
      <line x1="0" x2="${w}" y1="${null0.toFixed(1)}" y2="${null0.toFixed(1)}" class="rz-null"/>
    </svg>
    <figcaption class="hinweis"><span class="rz-leg rz-minus-leg"></span> noch nicht bezahlt <span class="rz-leg rz-plus-leg"></span> im Plus · Jahr 1 bis ${werte.length}</figcaption>
  </figure>`;
}

function feldHtml(f: Feld, wert: number): string {
  const id = `rz-${f.key}`;
  return `<label class="rz-feld" for="${id}"><span>${esc(f.label)}${f.einheit ? ` <small>(${esc(f.einheit)})</small>` : ''}</span>
    <input id="${id}" data-rz="${esc(f.key)}" inputmode="decimal" autocomplete="off" value="${esc(zahl(wert))}"${f.hilfe ? ` aria-describedby="${id}-h"` : ''}>
    ${f.hilfe ? `<small class="hinweis" id="${id}-h">${esc(f.hilfe)}</small>` : ''}</label>`;
}

function ergebnisHtml(): string {
  const { a, e } = rechnen();
  const ziel = 15;
  const grenze = hoechstpreis(art, a, ziel);
  return `
    <div class="rz-kennzahlen">
      <div><small>Eigenanteil</small><b>${esc(euro(e.eigenanteil))}</b>${art === 'wp' ? `<small>nach ${esc(euro(wpZuschuss(wp)))} Zuschuss${wp.sowieso ? ` und ${esc(euro(wp.sowieso))} ohnehin fällig` : ''}</small>` : ''}</div>
      <div><small>Vorteil im 1. Jahr</small><b>${esc(euro(e.vorteilJahr1))}</b></div>
      <div class="rz-haupt"><small>Bezahlt gemacht</small><b>${esc(jahreText(e.amortisation))}</b></div>
      <div><small>Stand nach ${e.kumuliert.length} Jahren</small><b>${esc(euro(e.ende))}</b></div>
    </div>
    ${diagramm(e)}
    <h3 class="rz-unter">Bei welcher Anschaffungssumme?</h3>
    <div class="foe-tabelle-rahmen"><table class="foe-tabelle rz-staffel">
      <thead><tr><th scope="col">Anschaffung</th><th scope="col">Bezahlt gemacht</th><th scope="col">Stand nach ${e.kumuliert.length} Jahren</th></tr></thead>
      <tbody>${staffel(art, a).map((s) => `<tr${s.investition === Math.round(a.investition / 500) * 500 ? ' class="rz-aktuell"' : ''}><th scope="row">${esc(euro(s.investition))}</th><td>${esc(jahreText(s.ergebnis.amortisation))}</td><td>${esc(euro(s.ergebnis.ende))}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="hinweis">Mit diesen Annahmen macht sich die Anlage innerhalb von ${ziel} Jahren bezahlt, wenn die Anschaffung höchstens etwa <b>${esc(euro(grenze))}</b> kostet.</p>`;
}

export function html(): string {
  const felder = art === 'pv' ? PV_FELDER : WP_FELDER;
  const werte = (art === 'pv' ? pv : wp) as Record<string, number>;
  const aus = uebernommen[art];
  return `<section class="karte-box rz" id="rechner" aria-label="Rechner">
    <p class="hinweis">Grober Rechner mit Annahmen, die du anpassen kannst. ${art === 'pv' ? 'Photovoltaik: Ersparnis durch selbst genutzten Strom plus Einspeisevergütung, abzüglich laufender Kosten.' : 'Wärmepumpe: Vergleich mit dem Weiterheizen mit Gas oder Öl.'}</p>
    <div class="segment rz-art" role="tablist" aria-label="Rechner">
      <button type="button" role="tab" data-rz-art="pv" class="bereich-pv${art === 'pv' ? ' aktiv' : ''}" aria-selected="${art === 'pv'}">Photovoltaik</button>
      <button type="button" role="tab" data-rz-art="wp" class="bereich-wp${art === 'wp' ? ' aktiv' : ''}" aria-selected="${art === 'wp'}">Wärmepumpe</button>
    </div>
    ${aus.length ? `<p class="rz-uebernommen" role="note"><span aria-hidden="true">📋</span> <span><b>Vom Kunden übernommen:</b> ${aus.map(esc).join(', ')}. Alles andere sind Beispielwerte.</span></p>` : ''}
    <div class="rz-raster">
      <fieldset class="rz-annahmen"><legend>Annahmen</legend>${felder.map((f) => feldHtml(f, werte[f.key])).join('')}
        <button type="button" class="btn klein ghost" data-rz-zurueck>Auf Beispielwerte zurücksetzen</button>
      </fieldset>
      <div class="rz-ergebnis" aria-live="polite">${ergebnisHtml()}</div>
    </div>
    <p class="foe-hinweis" role="note"><span aria-hidden="true">⚠️</span> <span>${esc(RECHNER_HINWEIS)}</span></p>
    <div class="foe-fuss"><span class="hinweis">Werte werden nicht gespeichert.</span><button type="button" class="btn klein" data-rz-kopieren aria-label="Rechnung mit Annahmen kopieren">📋 Kopieren</button></div>
  </section>`;
}

/** Ereignisse am Container binden; `neu` zeichnet den ganzen Rechner neu (beim Wechsel PV/WP). */
export function binden(box: HTMLElement) {
  const neuZeichnen = () => { box.innerHTML = html(); };
  box.addEventListener('input', (ev) => {
    const inp = (ev.target as Element).closest<HTMLInputElement>('[data-rz]');
    if (!inp) return;
    const felder = art === 'pv' ? PV_FELDER : WP_FELDER;
    const f = felder.find((x) => x.key === inp.dataset.rz);
    if (!f) return;
    const ziel = (art === 'pv' ? pv : wp) as Record<string, number>;
    const std = ((art === 'pv' ? PV_STANDARD : WP_STANDARD) as Record<string, number>)[f.key];
    ziel[f.key] = inp.value.trim() === '' ? std : zahlLesen(inp.value, f, ziel[f.key] ?? std);
    const erg = box.querySelector('.rz-ergebnis');
    if (erg) erg.innerHTML = ergebnisHtml();
  });
  box.addEventListener('change', (ev) => {
    const inp = (ev.target as Element).closest<HTMLInputElement>('[data-rz]');
    if (!inp) return;
    const ziel = (art === 'pv' ? pv : wp) as Record<string, number>;
    inp.value = zahl(ziel[inp.dataset.rz || ''] ?? 0); // gekappte Werte sichtbar machen
  });
  box.addEventListener('click', async (ev) => {
    const t = ev.target as Element;
    const wahl = t.closest<HTMLElement>('[data-rz-art]');
    if (wahl) { art = wahl.dataset.rzArt as Rechner; neuZeichnen(); box.querySelector<HTMLElement>(`[data-rz-art=${art}]`)?.focus(); return; }
    if (t.closest('[data-rz-zurueck]')) { if (art === 'pv') pv = { ...PV_STANDARD }; else wp = { ...WP_STANDARD }; uebernommen[art] = []; neuZeichnen(); return; }
    if (t.closest('[data-rz-kopieren]')) {
      const { a, e } = rechnen();
      const ok = await kopieren(rechnerText(art, a, e));
      toast(ok ? 'Rechnung mit Annahmen kopiert' : 'Kopieren hat nicht geklappt', ok ? 'ok' : 'error');
    }
  });
}

/** PV- oder WP-Rechner vorwählen. */
export function artSetzen(b: string | null) { if (b === 'pv' || b === 'wp') art = b; }
export const aktuelleArt = () => art;

/**
 * Angaben eines Kunden übernehmen (Strompreis, Speicher; Gas/Öl-Verbrauch und Heizkosten).
 * Kommt Jan zum selben Kunden zurück und hat sich in der Kartei nichts geändert, bleiben seine Änderungen stehen.
 */
export function kundeLaden(id: string, angaben: { pv?: Record<string, unknown>; wp?: Record<string, unknown> }) {
  const p = pvAusKunde(angaben.pv); const w = wpAusKunde(angaben.wp);
  const schluessel = `${id}|${JSON.stringify(p.werte)}|${JSON.stringify(w.werte)}`;
  if (schluessel === kundeGeladen) return;
  kundeGeladen = schluessel;
  pv = { ...PV_STANDARD, ...p.werte };
  wp = { ...WP_STANDARD, ...w.werte };
  uebernommen = { pv: p.liste, wp: w.liste };
}

/** Ohne Kunden geöffnet: Werte eines vorher geladenen Kunden verwerfen (kein Rest im Beratungs-Schutz). */
export function kundeVergessen() {
  if (!kundeGeladen) return;
  kundeGeladen = '';
  pv = { ...PV_STANDARD }; wp = { ...WP_STANDARD };
  uebernommen = { pv: [], wp: [] };
}
