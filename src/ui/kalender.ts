// Sperling – Kalender: Monats-, Wochen- und Tagesansicht. Termin anlegen per Fingertipp,
// in Woche/Tag auch per Wischen (Finger kurz halten, dann ziehen) für Beginn und Dauer.
import { esc } from '../core/util.ts';
import { kundenTitel } from '../core/model.ts';
import * as store from '../storage/store.ts';
import { terminDialog, terminBearbeitenOderLoeschen } from './parts.ts';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const START_STUNDE = 6;
export const ENDE_STUNDE = 22;
const SLOT_MIN = 30;
const SLOT_PX = 26;

const tagKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function tagVon(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
const plusTage = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
/** Montag der Woche (lokale Zeit). */
export function wochenStart(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay() + 6) % 7; return plusTage(x, -wd); }
const uhr = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

/** Termine eines Tages (lokal), sortiert. */
export function termineAm(termine, key) {
  return termine.filter((t) => tagKey(new Date(t.beginn)) === key).sort((a, b) => (a.beginn < b.beginn ? -1 : 1));
}

/** Monatsraster: 6 Wochen ab Montag vor dem 1. */
export function monatsTage(jahr, monat) {
  const start = wochenStart(new Date(jahr, monat, 1));
  return Array.from({ length: 42 }, (_, i) => plusTage(start, i));
}

/** Slot-Index (ab START_STUNDE) -> Date am Tag. */
export function slotZeit(key, slot) {
  const d = tagVon(key);
  d.setHours(START_STUNDE, 0, 0, 0);
  d.setMinutes(d.getMinutes() + slot * SLOT_MIN);
  return d;
}

function eintragHtml(t, kunden) {
  const k = kunden.find((x) => x.id === t.kundeId);
  return `<button type="button" class="k-eintrag art-${t.art} ${t.erledigt ? 'erledigt' : ''}" data-termin="${esc(t.id)}" title="${esc(t.titel)}"><b>${esc(uhr(t.beginn))}</b> ${esc(t.titel || 'Termin')}${k ? ` <small>${esc(kundenTitel(k))}</small>` : ''}</button>`;
}

function monatHtml(datum, d, heuteKey) {
  const tage = monatsTage(datum.getFullYear(), datum.getMonth());
  const resv = d.reservierungen || [];
  return `<div class="k-monat">
    ${WOCHENTAGE.map((w) => `<div class="k-wt">${w}</div>`).join('')}
    ${tage.map((tag) => {
    const key = tagKey(tag);
    const liste = termineAm(d.termine, key);
    const r = resv.filter((x) => x.von.slice(0, 10) <= key && x.bis.slice(0, 10) >= key);
    return `<div class="k-tag ${tag.getMonth() !== datum.getMonth() ? 'fremd' : ''} ${key === heuteKey ? 'heute' : ''}" data-tag="${key}">
        <button type="button" class="k-nr" data-zum-tag="${key}">${tag.getDate()}</button>
        ${liste.slice(0, 3).map((t) => eintragHtml(t, d.kunden)).join('')}
        ${liste.length > 3 ? `<button type="button" class="k-mehr" data-zum-tag="${key}">+${liste.length - 3} weitere</button>` : ''}
        ${r.length ? `<span class="k-resv" title="Reservierte Geräte">📌 ${r.length}</span>` : ''}
      </div>`;
  }).join('')}
  </div>`;
}

function rasterHtml(tage, d, heuteKey) {
  const slots = ((ENDE_STUNDE - START_STUNDE) * 60) / SLOT_MIN;
  return `<div class="k-raster" style="--spalten:${tage.length};--slot:${SLOT_PX}px">
    <div class="k-kopfzeile"><div></div>${tage.map((t) => { const key = tagKey(t); return `<button type="button" class="k-spaltenkopf ${key === heuteKey ? 'heute' : ''}" data-zum-tag="${key}">${WOCHENTAGE[(t.getDay() + 6) % 7]} ${t.getDate()}.${t.getMonth() + 1}.</button>`; }).join('')}</div>
    <div class="k-koerper">
      <div class="k-zeiten">${Array.from({ length: ENDE_STUNDE - START_STUNDE }, (_, i) => `<div style="height:${SLOT_PX * (60 / SLOT_MIN)}px">${START_STUNDE + i}:00</div>`).join('')}</div>
      ${tage.map((tag) => {
    const key = tagKey(tag);
    const liste = termineAm(d.termine, key);
    const frueh = liste.filter((t) => { const h = new Date(t.beginn).getHours(); return h < START_STUNDE || h >= ENDE_STUNDE; });
    return `<div class="k-spalte" data-tag="${key}" style="height:${slots * SLOT_PX}px">
          ${frueh.length ? `<div class="k-ausserhalb">${frueh.map((t) => eintragHtml(t, d.kunden)).join('')}</div>` : ''}
          ${liste.filter((t) => !frueh.includes(t)).map((t) => {
      const b = new Date(t.beginn);
      const min = (b.getHours() - START_STUNDE) * 60 + b.getMinutes();
      const top = (min / SLOT_MIN) * SLOT_PX;
      const h = Math.max(SLOT_PX - 2, (Math.min(t.dauerMin, (ENDE_STUNDE - START_STUNDE) * 60 - min) / SLOT_MIN) * SLOT_PX - 2);
      return `<div class="k-block" style="top:${top}px;height:${h}px">${eintragHtml(t, d.kunden)}</div>`;
    }).join('')}
          <div class="k-auswahl" hidden></div>
        </div>`;
  }).join('')}
    </div>
  </div>`;
}

/**
 * Zeichnet den Kalender in `el`. zustand: {ansicht, datum(Date)}. onWechsel(zustand) merkt Ansicht/Datum.
 */
export function zeichnen(el, zustand, onWechsel, neuZeichnen) {
  const d = store.getData();
  const heuteKey = tagKey(new Date());
  const { ansicht, datum } = zustand;
  let titel = '';
  let inhalt = '';
  if (ansicht === 'monat') {
    titel = `${MONATE[datum.getMonth()]} ${datum.getFullYear()}`;
    inhalt = monatHtml(datum, d, heuteKey);
  } else if (ansicht === 'woche') {
    const ws = wochenStart(datum);
    const tage = Array.from({ length: 7 }, (_, i) => plusTage(ws, i));
    titel = `${ws.getDate()}.${ws.getMonth() + 1}. – ${tage[6].getDate()}.${tage[6].getMonth() + 1}.${tage[6].getFullYear()}`;
    inhalt = rasterHtml(tage, d, heuteKey);
  } else {
    titel = datum.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    inhalt = rasterHtml([datum], d, heuteKey);
  }
  el.innerHTML = `
    <div class="k-leiste">
      <div class="k-nav"><button type="button" class="btn klein ghost" data-schritt="-1" aria-label="Zurück">‹</button><button type="button" class="btn klein ghost" data-schritt="0">Heute</button><button type="button" class="btn klein ghost" data-schritt="1" aria-label="Weiter">›</button></div>
      <strong class="k-titel">${esc(titel)}</strong>
    </div>
    <p class="hinweis k-tipp">${ansicht === 'monat' ? 'Tippe auf einen Tag, um dort einen Termin anzulegen.' : 'Tippe auf eine Uhrzeit für einen Termin. Für die Dauer: kurz halten und nach unten ziehen.'}</p>
    ${inhalt}`;

  el.querySelector('.k-nav').addEventListener('click', (e) => {
    const b = (e.target as Element).closest('[data-schritt]');
    if (!b) return;
    const n = Number(b.dataset.schritt);
    let neu;
    if (n === 0) neu = new Date();
    else if (ansicht === 'monat') neu = new Date(datum.getFullYear(), datum.getMonth() + n, 1);
    else neu = plusTage(datum, n * (ansicht === 'woche' ? 7 : 1));
    onWechsel({ ansicht, datum: neu });
  });

  const neuerTermin = async (beginn, dauerMin = 0) => { if (await terminDialog({ beginn: beginn.toISOString(), dauerMin })) neuZeichnen(); };

  el.addEventListener('click', async (e) => {
    const t = (e.target as Element).closest('[data-termin]');
    if (t) {
      const termin = store.getData().termine.find((x) => x.id === t.dataset.termin);
      if (termin && (await terminBearbeitenOderLoeschen(termin))) neuZeichnen();
      return;
    }
    const zt = (e.target as Element).closest('[data-zum-tag]');
    if (zt) { onWechsel({ ansicht: 'tag', datum: tagVon(zt.dataset.zumTag) }); return; }
    if (ansicht === 'monat') {
      const zelle = (e.target as Element).closest('.k-tag');
      if (!zelle) return;
      const tag = tagVon(zelle.dataset.tag);
      const jetzt = new Date();
      if (zelle.dataset.tag === tagKey(jetzt)) { tag.setHours(Math.min(jetzt.getHours() + 1, 21), 0, 0, 0); } else tag.setHours(10, 0, 0, 0);
      neuerTermin(tag);
    }
  }, { once: false });

  if (ansicht !== 'monat') auswahlVerdrahten(el, neuerTermin);
}

/** Antippen = 1 Stunde ab Slot. Maus/Stift: sofort ziehen. Finger: 350 ms halten, dann ziehen (sonst wird gescrollt). */
function auswahlVerdrahten(el, neuerTermin) {
  for (const spalte of el.querySelectorAll('.k-spalte')) {
    const box = spalte.querySelector('.k-auswahl');
    let start: number | null = null; let ende: number | null = null; let aktiv = false; let timer: ReturnType<typeof setTimeout> | undefined; let startY = 0; let bewegt = false;
    const slotBei = (clientY) => { const r = spalte.getBoundingClientRect(); return Math.max(0, Math.min(Math.floor((clientY - r.top) / SLOT_PX), ((ENDE_STUNDE - START_STUNDE) * 60) / SLOT_MIN - 1)); };
    const zeigen = () => { if (start === null || ende === null) return; const a = Math.min(start, ende); const b = Math.max(start, ende); box.hidden = false; box.style.top = `${a * SLOT_PX}px`; box.style.height = `${(b - a + 1) * SLOT_PX}px`; box.textContent = `${slotZeit(spalte.dataset.tag, a).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${slotZeit(spalte.dataset.tag, b + 1).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`; };
    const aufhoeren = () => { clearTimeout(timer); timer = undefined; aktiv = false; start = null; box.hidden = true; };
    spalte.addEventListener('pointerdown', (e) => {
      if ((e.target as Element).closest('[data-termin]') || e.button > 0) return;
      start = slotBei(e.clientY); ende = start; startY = e.clientY; bewegt = false;
      if (e.pointerType === 'touch') {
        timer = setTimeout(() => { aktiv = true; zeigen(); navigator.vibrate?.(15); }, 350);
      } else { aktiv = true; spalte.setPointerCapture(e.pointerId); zeigen(); }
    });
    spalte.addEventListener('pointermove', (e) => {
      if (start === null) return;
      if (!aktiv) { if (Math.abs(e.clientY - startY) > 8) { clearTimeout(timer); timer = undefined; bewegt = true; } return; }
      ende = slotBei(e.clientY); zeigen();
    });
    // Während des Ziehens mit dem Finger nicht scrollen
    spalte.addEventListener('touchmove', (e) => { if (aktiv) e.preventDefault(); }, { passive: false });
    spalte.addEventListener('pointerup', (e) => {
      if (start === null) return;
      const e2 = ende ?? start; const war = aktiv; const a = Math.min(start, e2); const b = Math.max(start, e2);
      const key = spalte.dataset.tag;
      aufhoeren();
      if (bewegt && !war) return; // war Scrollen
      if ((e.target as Element).closest('[data-termin]')) return;
      const dauer = war && b > a ? (b - a + 1) * SLOT_MIN : 60;
      neuerTermin(slotZeit(key, a), dauer);
    });
    spalte.addEventListener('pointercancel', aufhoeren);
  }
}
