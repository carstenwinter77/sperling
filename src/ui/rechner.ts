// „Wann rechnet sich das?“ – grober Amortisationsrechner (PV und Wärmepumpe), eigener Menüpunkt #/rechner.
// Werte bleiben nur im Arbeitsspeicher; aus der Kundenkartei übernommene Angaben werden nirgends gespeichert.
import { esc } from '../core/util.ts';
import {
  PV_STANDARD, WP_STANDARD, PV_FELDER, WP_FELDER, RECHNER_HINWEIS, rechnePv, rechneWp, staffel, hoechstpreis, wpZuschuss,
  pvAusKunde, wpAusKunde, zahlLesen, ERKLAERUNG, euro, jahreText, rechnerText, type Rechner, type PvAnnahmen, type WpAnnahmen, type Ergebnis, type Feld,
} from '../core/amortisation.ts';
import {
  WERKS_VORLAGEN, VORLAGE_HINWEIS, VORLAGE_PRIVAT, VORLAGEN_MAX, VORLAGE_NAME_MAX, normalizeRechnerVorlagen, zuletztGewaehlt, neueVorlagenId,
  type RechnerVorlage,
} from '../core/rechnervorlagen.ts';
import * as store from '../storage/store.ts';
import { dialog, kopieren, toast } from './dom.ts';

let art: Rechner = 'pv';
let pv: PvAnnahmen = { ...PV_STANDARD };
let wp: WpAnnahmen = { ...WP_STANDARD };
/** Kunde und übernommene Werte, zuletzt geladen (damit Änderungen beim Zurückkommen bleiben). */
let kundeGeladen = '';
let uebernommen: Record<Rechner, string[]> = { pv: [], wp: [] };
let kundeWerte: { pv: Partial<PvAnnahmen>; wp: Partial<WpAnnahmen> } = { pv: {}, wp: {} };
/** Gewählte Vorlage und ihr Stand beim Anwenden (ändert Jan sie in den Einstellungen, gilt der neue Stand). */
let vorlageId = VORLAGE_PRIVAT;
let angewandt = '';

/** Vorlagen aus den Einstellungen (gesperrt oder alt: Werksvorlagen). */
export function vorlagen(): RechnerVorlage[] {
  try { return store.getData().einstellungen.rechnerVorlagen || [...WERKS_VORLAGEN]; } catch { return [...WERKS_VORLAGEN]; }
}
const vorlage = (id = vorlageId) => vorlagen().find((v) => v.id === id) || vorlagen()[0]!;

/** Vorlage laden; Werte vom Kunden kommen obendrauf. */
function vorlageAnwenden(id: string) {
  const v = vorlage(id);
  vorlageId = v.id;
  angewandt = JSON.stringify(v);
  pv = { ...v.pv, ...kundeWerte.pv };
  wp = { ...v.wp, ...kundeWerte.wp };
}

/** Zuletzt gewählte Vorlage (gespeichert in den Einstellungen, Standard „Privat“). */
function gemerkt(): string {
  try { return zuletztGewaehlt(store.getData().einstellungen.rechnerVorlageZuletzt, vorlagen()); } catch { return VORLAGE_PRIVAT; }
}
/** Auswahl merken, damit der Rechner beim nächsten Mal wieder damit startet. */
function auswahlMerken(id: string) {
  try { if (store.getData().einstellungen.rechnerVorlageZuletzt !== id) store.mutate((d) => { d.einstellungen.rechnerVorlageZuletzt = id; }); } catch { /* gesperrt */ }
}

/** Vor dem Zeichnen: beim ersten Mal mit der gemerkten Vorlage starten; nach Änderung in den Einstellungen neu laden. */
export function vorbereiten() {
  if (!angewandt || !vorlagen().some((v) => v.id === vorlageId)) { vorlageAnwenden(gemerkt()); return; }
  if (JSON.stringify(vorlage()) !== angewandt) vorlageAnwenden(vorlageId);
}

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

/** „?“ am Feld: klappt eine kurze Erklärung darunter auf (nur wenn es eine gibt). */
export function frageKnopf(sparte: Rechner, f: Feld, id: string): string {
  return ERKLAERUNG[sparte][f.key] ? `<button type="button" class="rz-frage" data-rz-frage="${id}-e" aria-expanded="false" aria-controls="${id}-e" aria-label="Was bedeutet „${esc(f.label)}“?">?</button>` : '';
}
export function erklaerungHtml(sparte: Rechner, f: Feld, id: string): string {
  const t = ERKLAERUNG[sparte][f.key];
  return t ? `<small class="rz-erklaerung" id="${id}-e" hidden>${esc(t)}</small>` : '';
}
/** Klick auf „?“ verarbeiten (true, wenn es einer war). */
export function frageUmschalten(t: Element): boolean {
  const b = t.closest<HTMLButtonElement>('[data-rz-frage]');
  if (!b) return false;
  const e = document.getElementById(b.dataset.rzFrage || '');
  if (!e) return true;
  e.hidden = !e.hidden;
  b.setAttribute('aria-expanded', String(!e.hidden));
  b.classList.toggle('offen', !e.hidden);
  return true;
}

function feldHtml(f: Feld, wert: number): string {
  const id = `rz-${f.key}`;
  return `<div class="rz-feld"><span class="rz-feld-kopf"><label for="${id}">${esc(f.label)}${f.einheit ? ` <small>(${esc(f.einheit)})</small>` : ''}</label>${frageKnopf(art, f, id)}</span>
    <input id="${id}" data-rz="${esc(f.key)}" inputmode="decimal" autocomplete="off" value="${esc(zahl(wert))}"${f.hilfe ? ` aria-describedby="${id}-h"` : ''}>
    ${f.hilfe ? `<small class="hinweis" id="${id}-h">${esc(f.hilfe)}</small>` : ''}${erklaerungHtml(art, f, id)}</div>`;
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
  const v = vorlage();
  return `<section class="karte-box rz" id="rechner" aria-label="Rechner">
    <p class="hinweis">Grober Rechner mit Annahmen, die du anpassen kannst. ${art === 'pv' ? 'Photovoltaik: Ersparnis durch selbst genutzten Strom plus Einspeisevergütung, abzüglich laufender Kosten.' : 'Wärmepumpe: Vergleich mit dem Weiterheizen mit Gas oder Öl.'}</p>
    <div class="rz-vorlagen-zeile">
      <span class="rz-vorlagen-titel" id="rzVorlagenTitel">Vorlage</span>
      <div class="chips-filter rz-vorlagen" role="group" aria-labelledby="rzVorlagenTitel">
        ${vorlagen().map((x) => `<button type="button" data-rz-vorlage="${esc(x.id)}" class="${x.id === v.id ? 'aktiv' : ''}" aria-pressed="${x.id === v.id}">${esc(x.name)}</button>`).join('')}
      </div>
      <a class="rz-vorlagen-verwalten" href="#/einstellungen?bereich=vertrieb">Vorlagen verwalten</a>
    </div>
    ${VORLAGE_HINWEIS[v.id] ? `<p class="hinweis rz-vorlage-hinweis">${esc(VORLAGE_HINWEIS[v.id])}</p>` : ''}
    <div class="segment rz-art" role="tablist" aria-label="Rechner">
      <button type="button" role="tab" data-rz-art="pv" class="bereich-pv${art === 'pv' ? ' aktiv' : ''}" aria-selected="${art === 'pv'}">Photovoltaik</button>
      <button type="button" role="tab" data-rz-art="wp" class="bereich-wp${art === 'wp' ? ' aktiv' : ''}" aria-selected="${art === 'wp'}">Wärmepumpe</button>
    </div>
    ${aus.length ? `<p class="rz-uebernommen" role="note"><span aria-hidden="true">📋</span> <span><b>Vom Kunden übernommen:</b> ${aus.map(esc).join(', ')}. Alles andere aus der Vorlage „${esc(v.name)}“.</span></p>` : ''}
    <div class="rz-raster">
      <fieldset class="rz-annahmen"><legend>Annahmen</legend>${felder.map((f) => feldHtml(f, werte[f.key])).join('')}
        <div class="rz-annahmen-knoepfe">
          <button type="button" class="btn klein" data-rz-merken>⭐ Als Vorlage merken</button>
          <button type="button" class="btn klein ghost" data-rz-zurueck>Auf „${esc(v.name)}“ zurücksetzen</button>
        </div>
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
    if (frageUmschalten(t)) return;
    const wahl = t.closest<HTMLElement>('[data-rz-art]');
    if (wahl) { art = wahl.dataset.rzArt as Rechner; neuZeichnen(); box.querySelector<HTMLElement>(`[data-rz-art=${art}]`)?.focus(); return; }
    const vw = t.closest<HTMLElement>('[data-rz-vorlage]');
    if (vw) { vorlageAnwenden(vw.dataset.rzVorlage || VORLAGE_PRIVAT); auswahlMerken(vorlageId); neuZeichnen(); box.querySelector<HTMLElement>(`[data-rz-vorlage="${CSS.escape(vorlageId)}"]`)?.focus(); return; }
    if (t.closest('[data-rz-zurueck]')) {
      const v = vorlage();
      if (art === 'pv') { pv = { ...v.pv }; kundeWerte.pv = {}; } else { wp = { ...v.wp }; kundeWerte.wp = {}; }
      uebernommen[art] = []; neuZeichnen(); return;
    }
    if (t.closest('[data-rz-merken]')) { if (await alsVorlageMerken()) neuZeichnen(); return; }
    if (t.closest('[data-rz-kopieren]')) {
      const { a, e } = rechnen();
      const ok = await kopieren(rechnerText(art, a, e).replace('\n', `\nVorlage: ${vorlage().name}\n`));
      toast(ok ? 'Rechnung mit Annahmen kopiert' : 'Kopieren hat nicht geklappt', ok ? 'ok' : 'error');
    }
  });
}

/** PV- oder WP-Rechner vorwählen. */
export function artSetzen(b: string | null) { if (b === 'pv' || b === 'wp') art = b; }
export const aktuelleArt = () => art;

/**
 * Angaben eines Kunden übernehmen (Strompreis, Speicher; Gas/Öl-Verbrauch und Heizkosten) auf die zuletzt gewählte
 * Vorlage. Kommt Jan zum selben Kunden zurück und hat sich in der Kartei nichts geändert, bleiben seine Änderungen stehen.
 */
export function kundeLaden(id: string, angaben: { pv?: Record<string, unknown>; wp?: Record<string, unknown> }) {
  const p = pvAusKunde(angaben.pv); const w = wpAusKunde(angaben.wp);
  const start = gemerkt();
  const schluessel = `${id}|${start}|${JSON.stringify(p.werte)}|${JSON.stringify(w.werte)}`;
  if (schluessel === kundeGeladen) return;
  kundeGeladen = schluessel;
  kundeWerte = { pv: p.werte, wp: w.werte };
  uebernommen = { pv: p.liste, wp: w.liste };
  vorlageAnwenden(start);
}
export const aktuelleVorlage = () => vorlageId;

/** Ohne Kunden geöffnet: Werte eines vorher geladenen Kunden verwerfen (kein Rest im Beratungs-Schutz). */
export function kundeVergessen() {
  if (!kundeGeladen) return;
  kundeGeladen = '';
  kundeWerte = { pv: {}, wp: {} };
  uebernommen = { pv: [], wp: [] };
  vorlageAnwenden(gemerkt());
}

/** „Als Vorlage merken“: die Werte der gewählten Sparte in eine bestehende oder neue Vorlage schreiben. */
async function alsVorlageMerken(): Promise<boolean> {
  const liste = vorlagen();
  const voll = liste.length >= VORLAGEN_MAX;
  const sparte = art === 'pv' ? 'Photovoltaik' : 'Wärmepumpe';
  const res = await dialog<{ ziel: string; name: string }>({
    titel: 'Als Vorlage merken',
    html: `<p class="hinweis">Speichert die ${sparte}-Werte, die gerade im Rechner stehen, als Startwerte. Die anderen Werte der Vorlage bleiben, wie sie sind.</p>
      <label>Speichern in<select name="ziel">
        ${liste.map((x) => `<option value="${esc(x.id)}" ${x.id === vorlageId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
        ${voll ? '' : '<option value="__neu">Neue Vorlage …</option>'}
      </select></label>
      <label class="rz-merken-name" hidden>Name der neuen Vorlage<input name="name" maxlength="${VORLAGE_NAME_MAX}" placeholder="z. B. Landwirtschaft" autocomplete="off"></label>`,
    knoepfe: [{
      label: 'Speichern', primaer: true,
      pruefen: (d) => ((d.querySelector('[name=ziel]') as HTMLSelectElement).value === '__neu' && !(d.querySelector('[name=name]') as HTMLInputElement).value.trim() ? 'Bitte einen Namen eingeben.' : ''),
      wert: (d) => ({ ziel: (d.querySelector('[name=ziel]') as HTMLSelectElement).value, name: (d.querySelector('[name=name]') as HTMLInputElement).value.trim() }),
    }],
    onOpen: (d) => {
      const sel = d.querySelector('[name=ziel]') as HTMLSelectElement;
      const feld = d.querySelector('.rz-merken-name') as HTMLElement;
      sel.addEventListener('change', () => { feld.hidden = sel.value !== '__neu'; if (!feld.hidden) feld.querySelector('input')?.focus(); });
    },
  });
  if (!res) return false;
  const werte = art === 'pv' ? { pv: { ...pv } } : { wp: { ...wp } };
  let ziel = res.ziel;
  store.mutate((d) => {
    const vs = d.einstellungen.rechnerVorlagen;
    if (ziel === '__neu') {
      const basis = vs.find((x) => x.id === vorlageId) || vs[0]!;
      ziel = neueVorlagenId();
      vs.push({ id: ziel, name: res.name, pv: { ...basis.pv }, wp: { ...basis.wp }, ...werte });
    } else {
      const v = vs.find((x) => x.id === ziel);
      if (v) Object.assign(v, werte);
    }
    d.einstellungen.rechnerVorlagen = normalizeRechnerVorlagen(vs);
  });
  vorlageAnwenden(ziel);
  auswahlMerken(ziel);
  toast(store.isDemo() ? 'Gemerkt (im Demo-Modus nur bis zum Neuladen)' : `${sparte}-Werte in „${vorlage().name}“ gespeichert`, 'ok');
  return true;
}
