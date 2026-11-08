// Sperling – Zeit im Kalender wählen (ab 0.16.0). Öffnet über dem aktuellen Fenster den Kalender mit allen
// vorhandenen Terminen, Wiedervorlagen und festen Zeiten (Tag oder Woche). Frei ist grün hinterlegt.
// Oben stehen Vorschläge „du bist sowieso in der Nähe“. Tipp auf eine Uhrzeit wählt sie, „Zeit übernehmen“
// gibt Beginn und Dauer zurück. Nichts wird hier gespeichert; das übernimmt das aufrufende Fenster.
// Felder verknüpfen: knopfHtml(ziel) neben ein datetime-local-Feld; aktivieren() hängt einen Klick-Handler ans document.
import { esc, isoToLocalInput, localInputToIso } from '../core/util.ts';
import { kundenTitel } from '../core/model.ts';
import { feiertag } from '../core/feiertage.ts';
import {
  belegungAm, freieZeitenAm, naheVorschlaege, ueberschneidungen, konfliktText, minuten, minutenVon, hhmm, tagKey, tagDatum, tagPlus,
  wochentag, zeitpunkt, DAUER_STUFEN, RASTER,
} from '../core/terminfinder.ts';
import * as store from '../storage/store.ts';
import { dialog } from './dom.ts';

const START = 6;
const ENDE = 22;
const PX_STUNDE = 52;
const px = (min: number) => ((min - START * 60) / 60) * PX_STUNDE;
const WT = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export interface ZeitWahl { beginn: string; dauerMin: number }
export interface ZeitWahlOptionen { beginn?: string | null; dauerMin?: number; kundeId?: string; ohneTerminId?: string; titel?: string }

const datumText = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
const spanne = (iso: string, dauer: number) => `${hhmm(minutenVon(iso))}–${hhmm(Math.min(24 * 60, minutenVon(iso) + dauer))}`;
const km = (m: number) => (m < 1000 ? `${Math.max(100, Math.round(m / 100) * 100)} m` : `${(Math.round(m / 100) / 10).toLocaleString('de-DE')} km`);

/** Kalender zum Auswählen einer Zeit. Gibt Beginn und Dauer zurück oder null (abgebrochen). */
export async function zeitWaehlen(o: ZeitWahlOptionen = {}): Promise<ZeitWahl | null> {
  const d0 = store.getData();
  const kunde = o.kundeId ? d0.kunden.find((k) => k.id === o.kundeId) || null : null;
  let dauer = o.dauerMin && o.dauerMin > 0 ? o.dauerMin : 60;
  let wahl: string | null = o.beginn && !Number.isNaN(new Date(o.beginn).getTime()) && new Date(o.beginn) > new Date(Date.now() - 86400000) ? new Date(o.beginn).toISOString() : null;
  let ansicht: 'tag' | 'woche' = window.innerWidth < 700 ? 'tag' : 'woche';
  let tag = wahl ? tagKey(wahl) : tagKey(new Date());
  // Am Wochenende gleich die kommende Woche zeigen (dort wird der Termin meistens liegen)
  if (!wahl && wochentag(tag) >= 6) tag = tagPlus(tag, 8 - wochentag(tag));
  let info = '';
  const dauern = [...new Set([...DAUER_STUFEN, dauer])].sort((a, b) => a - b);

  return dialog<ZeitWahl>({
    titel: o.titel || 'Zeit im Kalender wählen',
    html: `<div class="tw">
      <div class="tw-kopf">
        <label class="tw-dauer">Dauer<select name="twDauer">${dauern.map((n) => `<option value="${n}" ${n === dauer ? 'selected' : ''}>${n < 60 ? `${n} Min.` : `${String(n / 60).replace('.', ',')} Std.`}</option>`).join('')}</select></label>
        <p class="tw-wahl" aria-live="polite"></p>
      </div>
      <p class="tw-konflikt warnung-box" hidden></p>
      <section class="tw-nahe" aria-label="Freie Zeiten in der Nähe"></section>
      <div class="k-leiste tw-leiste">
        <div class="k-nav"><button type="button" class="btn klein ghost" data-tw-schritt="-1" aria-label="Zurück">‹</button><button type="button" class="btn klein ghost" data-tw-schritt="0">Heute</button><button type="button" class="btn klein ghost" data-tw-schritt="1" aria-label="Weiter">›</button></div>
        <strong class="k-titel tw-titel"></strong>
        <div class="segment" role="group" aria-label="Ansicht"><button type="button" data-tw-ansicht="tag">Tag</button><button type="button" data-tw-ansicht="woche">Woche</button></div>
      </div>
      <p class="hinweis tw-legende"><span class="tw-l tw-l-frei"></span> frei · <span class="tw-l tw-l-sperre"></span> feste Zeit · grau = außerhalb der Arbeitszeit. Uhrzeit antippen = auswählen, Termin antippen = Details.</p>
      <p class="tw-info hinweis" aria-live="polite" hidden></p>
      <div class="k-raster tw-raster"></div>
    </div>`,
    knoepfe: [{
      label: 'Zeit übernehmen', primaer: true,
      pruefen: () => (wahl ? null : 'Bitte im Kalender eine Uhrzeit antippen oder einen Vorschlag wählen.'),
      wert: () => ({ beginn: wahl!, dauerMin: dauer }),
    }],
    onOpen: (dlg) => {
      dlg.classList.add('dlg-breit', 'dlg-terminwahl');
      const box = dlg.querySelector<HTMLElement>('.tw')!;
      const raster = box.querySelector<HTMLElement>('.tw-raster')!;

      const wahlZeigen = () => {
        const p = box.querySelector<HTMLElement>('.tw-wahl')!;
        p.innerHTML = wahl ? `Gewählt: <b>${esc(datumText(wahl))}, ${esc(spanne(wahl, dauer))} Uhr</b>` : 'Noch keine Zeit gewählt. Tippe im Kalender auf eine freie Uhrzeit oder nimm einen Vorschlag.';
        const k = box.querySelector<HTMLElement>('.tw-konflikt')!;
        const text = wahl ? konfliktText(ueberschneidungen(store.getData(), wahl, dauer, o.ohneTerminId)) : '';
        k.hidden = !text; k.textContent = text;
        box.querySelectorAll<HTMLElement>('[data-tw-vorschlag]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.twVorschlag === wahl)));
      };

      const naheZeigen = () => {
        const sec = box.querySelector<HTMLElement>('.tw-nahe')!;
        if (!kunde) { sec.innerHTML = ''; sec.hidden = true; return; }
        sec.hidden = false;
        if (kunde.lat === null || kunde.lng === null) { sec.innerHTML = `<p class="hinweis">${esc(kundenTitel(kunde))} hat noch keinen Standort auf der Karte, deshalb keine Vorschläge „in der Nähe“.</p>`; return; }
        const v = naheVorschlaege(store.getData(), { lat: kunde.lat, lng: kunde.lng, kundeId: kunde.id }, { dauerMin: dauer, ohneTerminId: o.ohneTerminId });
        sec.innerHTML = `<h3>📍 Du bist sowieso in der Nähe</h3>${v.length
          ? `<div class="tw-vorschlaege">${v.map((x) => `<button type="button" class="chip-knopf tw-vorschlag" data-tw-vorschlag="${esc(x.beginn)}"><b>${esc(datumText(x.beginn))}, ${esc(hhmm(minutenVon(x.beginn)))} Uhr</b><small>${esc(x.grund)} · ${esc(km(x.abstandM))}, ca. ${x.fahrMin} Min. Fahrt</small></button>`).join('')}</div>`
          : '<p class="hinweis">In den nächsten 2 Wochen hast du keinen Termin im Umkreis von 15 km mit freier Zeit davor oder danach.</p>'}`;
      };

      const spalteHtml = (t: string, d: ReturnType<typeof store.getData>) => {
        const az = d.einstellungen.arbeitszeit;
        const arbeitstag = az.tage.includes(wochentag(t));
        const von = minuten(az.von)!; const bis = minuten(az.bis)!;
        const teile: string[] = [];
        const block = (cls: string, a: number, b: number, inhalt = '', attr = '') => {
          const top = Math.max(0, px(a)); const unten = Math.min(px(ENDE * 60), px(b));
          if (unten <= top) return '';
          return `<div class="${cls}" style="top:${top}px;height:${Math.max(12, unten - top - 2)}px"${attr}>${inhalt}</div>`;
        };
        if (!arbeitstag) teile.push(block('tw-aus', START * 60, ENDE * 60));
        else { teile.push(block('tw-aus', START * 60, von)); teile.push(block('tw-aus', bis, ENDE * 60)); }
        for (const l of freieZeitenAm(d, t, dauer, new Date(), o.ohneTerminId)) teile.push(block('tw-frei', l.vonMin, l.bisMin));
        const belegt = belegungAm(d, t, o.ohneTerminId);
        for (const b of belegt.filter((x) => x.art === 'sperre')) teile.push(block('tw-sperre', b.vonMin, b.bisMin, `<span>🔒 ${esc(b.titel)}</span>`));
        const termine = belegt.filter((x) => x.art !== 'sperre');
        for (const b of termine) {
          const k = b.kundeId ? d.kunden.find((x) => x.id === b.kundeId) : null;
          const a = Math.max(START * 60, Math.min(b.vonMin, ENDE * 60 - 30));
          teile.push(block('k-block tw-block', a, Math.max(a + 30, b.bisMin), `<button type="button" class="k-eintrag art-${b.art}${b.erledigt ? ' erledigt' : ''}" data-tw-termin="${esc(b.terminId || '')}"><b>${esc(hhmm(b.vonMin))}</b> ${esc(b.titel || 'Termin')}${k ? ` <small>${esc(kundenTitel(k))}</small>` : ''}</button>`));
        }
        if (wahl && tagKey(wahl) === t) teile.push(block('k-auswahl tw-auswahl', minutenVon(wahl), minutenVon(wahl) + dauer, esc(spanne(wahl, dauer))));
        return `<div class="k-spalte tw-spalte${feiertag(t) ? ' feiertag' : ''}" data-tw-tag="${t}" style="height:${(ENDE - START) * PX_STUNDE}px">${teile.join('')}</div>`;
      };

      const zeichnen = (scrollen = false) => {
        const d = store.getData();
        const tage = ansicht === 'tag' ? [tag] : Array.from({ length: 7 }, (_, i) => tagPlus(tag, i + 1 - wochentag(tag)));
        const heute = tagKey(new Date());
        box.querySelector<HTMLElement>('.tw-titel')!.textContent = ansicht === 'tag'
          ? tagDatum(tag).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          : `${tagDatum(tage[0]!).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })} – ${tagDatum(tage[6]!).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' })}`;
        box.querySelectorAll<HTMLElement>('[data-tw-ansicht]').forEach((b) => { b.classList.toggle('aktiv', b.dataset.twAnsicht === ansicht); b.setAttribute('aria-pressed', String(b.dataset.twAnsicht === ansicht)); });
        const alt = raster.scrollTop;
        raster.innerHTML = `<div style="--spalten:${tage.length}">
          <div class="k-kopfzeile"><div></div>${tage.map((t) => `<button type="button" class="k-spaltenkopf${t === heute ? ' heute' : ''}${feiertag(t) ? ' feiertag' : ''}" data-tw-zum-tag="${t}">${WT[wochentag(t)]} ${tagDatum(t).getDate()}.${tagDatum(t).getMonth() + 1}.${feiertag(t) ? `<small class="k-feiertag">${esc(feiertag(t)!)}</small>` : ''}</button>`).join('')}</div>
          <div class="k-koerper">
            <div class="k-zeiten">${Array.from({ length: ENDE - START }, (_, i) => `<div style="height:${PX_STUNDE}px">${START + i}:00</div>`).join('')}</div>
            ${tage.map((t) => spalteHtml(t, d)).join('')}
          </div></div>`;
        if (scrollen) {
          const ziel = wahl ? minutenVon(wahl) : minuten(d.einstellungen.arbeitszeit.von)!;
          raster.scrollTop = Math.max(0, px(ziel) - PX_STUNDE);
        } else raster.scrollTop = alt;
        wahlZeigen();
      };

      const infoZeigen = (terminId: string) => {
        const p = box.querySelector<HTMLElement>('.tw-info')!;
        const d = store.getData();
        const t = d.termine.find((x) => x.id === terminId);
        if (!t) { p.hidden = true; return; }
        const k = t.kundeId ? d.kunden.find((x) => x.id === t.kundeId) : null;
        info = [`${datumText(t.beginn)}, ${spanne(t.beginn, t.dauerMin)} Uhr`, t.art === 'termin' ? 'Termin' : 'Wiedervorlage', t.titel, k ? kundenTitel(k) : '', t.ort, t.notiz ? (t.notiz.length > 160 ? `${t.notiz.slice(0, 160)} …` : t.notiz) : '', t.erledigt ? 'erledigt' : ''].filter(Boolean).join(' · ');
        p.hidden = false; p.textContent = info;
      };

      box.addEventListener('click', (ev) => {
        const ziel = ev.target as Element;
        const schritt = ziel.closest<HTMLElement>('[data-tw-schritt]');
        if (schritt) {
          const n = Number(schritt.dataset.twSchritt);
          tag = n === 0 ? tagKey(new Date()) : tagPlus(tag, n * (ansicht === 'woche' ? 7 : 1));
          zeichnen(); return;
        }
        const an = ziel.closest<HTMLElement>('[data-tw-ansicht]');
        if (an) { ansicht = an.dataset.twAnsicht as typeof ansicht; zeichnen(); return; }
        const zt = ziel.closest<HTMLElement>('[data-tw-zum-tag]');
        if (zt) { tag = zt.dataset.twZumTag!; ansicht = 'tag'; zeichnen(); return; }
        const vs = ziel.closest<HTMLElement>('[data-tw-vorschlag]');
        if (vs) { wahl = vs.dataset.twVorschlag!; tag = tagKey(wahl); zeichnen(true); return; }
        const te = ziel.closest<HTMLElement>('[data-tw-termin]');
        if (te) { infoZeigen(te.dataset.twTermin || ''); return; }
        const sp = ziel.closest<HTMLElement>('[data-tw-tag]');
        if (sp && ev instanceof MouseEvent) {
          const r = sp.getBoundingClientRect();
          const min = START * 60 + Math.floor((((ev.clientY - r.top) / PX_STUNDE) * 60) / RASTER) * RASTER;
          wahl = zeitpunkt(sp.dataset.twTag!, Math.max(START * 60, Math.min(min, ENDE * 60 - RASTER)));
          tag = sp.dataset.twTag!;
          zeichnen();
        }
      });
      box.querySelector<HTMLSelectElement>('[name=twDauer]')!.addEventListener('change', (ev) => {
        dauer = Number((ev.target as HTMLSelectElement).value) || 60;
        naheZeigen(); zeichnen();
      });
      naheZeigen();
      zeichnen(true);
    },
  });
}

/** Knopf neben einem datetime-local-Feld. `dauer` = Name eines Felds für die Dauer (Minuten), falls vorhanden. */
export function knopfHtml(ziel: string, { dauer = '', kundeId = '', ohneTerminId = '', label = '📅 Im Kalender wählen', klasse = 'btn klein ghost' } = {}): string {
  return `<button type="button" class="${esc(klasse)} tw-knopf" data-tw-ziel="${esc(ziel)}"${dauer ? ` data-tw-dauer="${esc(dauer)}"` : ''}${kundeId ? ` data-tw-kunde="${esc(kundeId)}"` : ''}${ohneTerminId ? ` data-tw-ohne="${esc(ohneTerminId)}"` : ''}>${esc(label)}</button>`;
}

/** Öffnet den Kalender für das Feld zum Knopf und schreibt die Wahl zurück (feuert input/change). */
export async function fuerKnopf(knopf: HTMLElement): Promise<boolean> {
  const bereich = knopf.closest('fieldset, form, dialog');
  const feld = bereich?.querySelector<HTMLInputElement>(`input[name="${CSS.escape(knopf.dataset.twZiel || '')}"]`);
  if (!feld) return false;
  const dauerFeld = knopf.dataset.twDauer ? bereich!.querySelector<HTMLInputElement>(`[name="${CSS.escape(knopf.dataset.twDauer)}"]`) : null;
  const kundeId = knopf.dataset.twKunde || bereich!.querySelector<HTMLInputElement>('[name=kundeId]')?.value || '';
  const r = await zeitWaehlen({ beginn: localInputToIso(feld.value), dauerMin: Number(dauerFeld?.value) || undefined, kundeId, ohneTerminId: knopf.dataset.twOhne || '' });
  if (!r) return false;
  feld.value = isoToLocalInput(r.beginn);
  if (dauerFeld) dauerFeld.value = String(r.dauerMin);
  for (const f of [feld, dauerFeld]) { f?.dispatchEvent(new Event('input', { bubbles: true })); f?.dispatchEvent(new Event('change', { bubbles: true })); }
  feld.focus?.();
  return true;
}

let aktiv = false;
export function aktivieren() {
  if (aktiv) return;
  aktiv = true;
  document.addEventListener('click', (ev) => {
    const knopf = (ev.target as Element | null)?.closest?.<HTMLElement>('.tw-knopf[data-tw-ziel]');
    if (!knopf) return;
    ev.preventDefault();
    void fuerKnopf(knopf);
  });
}

/** Warnzeile unter einem Zeitfeld: zeigt Überschneidungen live (Feld `ziel`, Dauer aus `dauer` oder fest). */
export function konfliktVerdrahten(bereich: Element, ziel: string, ausgabe: HTMLElement, { dauer = '' as string, dauerMin = 60, ohneTerminId = '' } = {}) {
  const feld = bereich.querySelector<HTMLInputElement>(`input[name="${CSS.escape(ziel)}"]`);
  if (!feld) return () => {};
  const pruefen = () => {
    const iso = localInputToIso(feld.value);
    const n = dauer ? Number(bereich.querySelector<HTMLInputElement>(`[name="${CSS.escape(dauer)}"]`)?.value) || dauerMin : dauerMin;
    const text = iso ? konfliktText(ueberschneidungen(store.getData(), iso, n, ohneTerminId)) : '';
    ausgabe.hidden = !text; ausgabe.textContent = text;
  };
  feld.addEventListener('input', pruefen); feld.addEventListener('change', pruefen);
  if (dauer) bereich.querySelector(`[name="${CSS.escape(dauer)}"]`)?.addEventListener('input', pruefen);
  pruefen();
  return pruefen;
}
