// Sperling – Kalender: Monats-, Wochen- und Tagesansicht mit Terminen und (einblendbar) Leihgaben,
// Rückgaben und Reservierungen der Vorführgeräte.
// Termin anlegen: Fingertipp; in Woche/Tag auch Finger halten und ziehen für Beginn und Dauer.
// Bestehender Termin: kurz antippen = Termin-Karte. Finger halten = Griffe: in der Mitte verschieben
// (auch auf einen anderen Tag), oben/unten länger oder kürzer ziehen. Im Monat auf einen anderen Tag ziehen.
import { feiertag } from '../core/feiertage.ts';
import { esc } from '../core/util.ts';
import { kundenTitel, type Termin } from '../core/model.ts';
import { geraeteEintraege, GERAET_EINTRAG_TEXT, gezogen, aufTag, type GeraetEintrag } from '../core/kalender.ts';
import { balkenFuer } from '../core/belegung.ts';
import * as store from '../storage/store.ts';
import { terminDialog } from './parts.ts';
import { terminKarte } from './terminkarte.ts';
import { toast } from './dom.ts';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
/** Feiertagsnamen nur an Wortfugen umbrechen („Weihnachts-tag“, „Oster-montag“), nie mitten im Wort. */
const fugen = (name: string) => esc(name).replace(/(?<=[a-zäöüß]{3})(feiertag|montag|sonntag|freitag|tag)\b/g, '&shy;$1');

export const START_STUNDE = 6;
export const ENDE_STUNDE = 22;
const SLOT_MIN = 30;
const SLOT_PX = 26;
const HALTEN_MS = 400;

/** Reiter des Kalenders (auch im Belegungskalender als „Geräte“). */
export const KALENDER_ANSICHTEN = [['liste', 'Liste'], ['monat', 'Monat'], ['woche', 'Woche'], ['tag', 'Tag'], ['geraete', 'Geräte']] as const;
export function kalenderTabs(aktiv: string): string {
  return `<nav class="tabs" role="tablist" id="kalTabs">${KALENDER_ANSICHTEN.map(([k, l]) => `<button type="button" role="tab" data-ansicht="${k}" class="${k === aktiv ? 'aktiv' : ''}" aria-selected="${k === aktiv}">${l}</button>`).join('')}</nav>`;
}

// Merker für diese Sitzung (keine Kundendaten, nichts gespeichert)
let leihZeigen = true;
let gewaehlt: string | null = null;
let klickSperreBis = 0;
const klickGesperrt = () => Date.now() < klickSperreBis;
const klickSperren = () => { klickSperreBis = Date.now() + 450; };

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

function geraetHtml(e: GeraetEintrag) {
  const a = GERAET_EINTRAG_TEXT[e.art];
  return `<button type="button" class="k-geraet ge-${e.art}" data-ge-geraet="${esc(e.geraetId)}" data-ge-id="${esc(e.id)}" title="${esc(`${e.geraet}: ${a.text}${e.kunde ? ` – ${e.kunde}` : ''}`)}">${a.icon} ${esc(e.geraet)}${e.kunde ? ` <small>${esc(e.kunde)}</small>` : ''}</button>`;
}

function monatHtml(datum, d, heuteKey, ge: Map<string, GeraetEintrag[]>) {
  const tage = monatsTage(datum.getFullYear(), datum.getMonth());
  return `<div class="k-monat">
    ${WOCHENTAGE.map((w) => `<div class="k-wt">${w}</div>`).join('')}
    ${tage.map((tag) => {
    const key = tagKey(tag);
    const liste = termineAm(d.termine, key);
    const g = ge.get(key) || [];
    const platz = Math.max(1, 4 - Math.min(g.length, 2));
    const ft = feiertag(key);
    return `<div class="k-tag ${tag.getMonth() !== datum.getMonth() ? 'fremd' : ''} ${key === heuteKey ? 'heute' : ''}${ft ? ' feiertag' : ''}" data-tag="${key}"${ft ? ` title="Feiertag: ${esc(ft)}"` : ''}>
        <div class="k-tag-kopf"><button type="button" class="k-nr" data-zum-tag="${key}">${tag.getDate()}</button>${ft ? `<span class="k-feiertag">${fugen(ft)}</span>` : ''}</div>
        ${liste.slice(0, platz).map((t) => eintragHtml(t, d.kunden)).join('')}
        ${g.slice(0, 2).map(geraetHtml).join('')}
        ${liste.length > platz || g.length > 2 ? `<button type="button" class="k-mehr" data-zum-tag="${key}">+${Math.max(0, liste.length - platz) + Math.max(0, g.length - 2)} weitere</button>` : ''}
      </div>`;
  }).join('')}
  </div>`;
}

const GRIFFE = '<span class="k-griff oben" data-griff="oben" aria-hidden="true"></span><span class="k-griff mitte" data-griff="schieben" aria-hidden="true">⠿</span><span class="k-griff unten" data-griff="unten" aria-hidden="true"></span><span class="k-zeitlabel" hidden></span>';

function blockHtml(t, d) {
  const b = new Date(t.beginn);
  const min = (b.getHours() - START_STUNDE) * 60 + b.getMinutes();
  const top = (min / SLOT_MIN) * SLOT_PX;
  const h = Math.max(SLOT_PX - 2, (Math.min(t.dauerMin, (ENDE_STUNDE - START_STUNDE) * 60 - min) / SLOT_MIN) * SLOT_PX - 2);
  const an = gewaehlt === t.id;
  return `<div class="k-block${an ? ' gewaehlt' : ''}" data-block="${esc(t.id)}" style="top:${top}px;height:${h}px">${eintragHtml(t, d.kunden)}${an ? GRIFFE : ''}</div>`;
}

function rasterHtml(tage, d, heuteKey, ge: Map<string, GeraetEintrag[]>) {
  const slots = ((ENDE_STUNDE - START_STUNDE) * 60) / SLOT_MIN;
  const keys = tage.map(tagKey);
  const ganztags = leihZeigen && keys.some((k) => (ge.get(k) || []).length);
  return `<div class="k-raster" style="--spalten:${tage.length};--slot:${SLOT_PX}px">
    <div class="k-kopfzeile"><div></div>${tage.map((t) => { const key = tagKey(t); return `<button type="button" class="k-spaltenkopf ${key === heuteKey ? 'heute' : ''}${feiertag(key) ? ' feiertag' : ''}" data-zum-tag="${key}">${WOCHENTAGE[(t.getDay() + 6) % 7]} ${t.getDate()}.${t.getMonth() + 1}.${feiertag(key) ? `<small class="k-feiertag">${fugen(feiertag(key)!)}</small>` : ''}</button>`; }).join('')}</div>
    ${ganztags ? `<div class="k-ganztags"><div class="k-ganztags-titel" title="Leihgaben">📦</div>${keys.map((k) => `<div class="k-ganztags-zelle">${(ge.get(k) || []).map(geraetHtml).join('')}</div>`).join('')}</div>` : ''}
    <div class="k-koerper">
      <div class="k-zeiten">${Array.from({ length: ENDE_STUNDE - START_STUNDE }, (_, i) => `<div style="height:${SLOT_PX * (60 / SLOT_MIN)}px">${START_STUNDE + i}:00</div>`).join('')}</div>
      ${keys.map((key) => {
    const liste = termineAm(d.termine, key);
    const frueh = liste.filter((t) => { const h = new Date(t.beginn).getHours(); return h < START_STUNDE || h >= ENDE_STUNDE; });
    return `<div class="k-spalte${feiertag(key) ? ' feiertag' : ''}" data-tag="${key}" style="height:${slots * SLOT_PX}px">
          ${frueh.length ? `<div class="k-ausserhalb">${frueh.map((t) => eintragHtml(t, d.kunden)).join('')}</div>` : ''}
          ${liste.filter((t) => !frueh.includes(t)).map((t) => blockHtml(t, d)).join('')}
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
  let von: Date; let bis: Date;
  if (ansicht === 'monat') {
    const tage = monatsTage(datum.getFullYear(), datum.getMonth());
    von = tage[0]; bis = tage[41];
  } else if (ansicht === 'woche') {
    von = wochenStart(datum); bis = plusTage(von, 6);
  } else { von = datum; bis = datum; }
  const ge = leihZeigen ? geraeteEintraege(d, tagKey(von), tagKey(bis), heuteKey) : new Map();
  if (gewaehlt && !d.termine.some((t) => t.id === gewaehlt)) gewaehlt = null;
  if (ansicht === 'monat') {
    titel = `${MONATE[datum.getMonth()]} ${datum.getFullYear()}`;
    inhalt = monatHtml(datum, d, heuteKey, ge);
  } else if (ansicht === 'woche') {
    const tage = Array.from({ length: 7 }, (_, i) => plusTage(von, i));
    titel = `${von.getDate()}.${von.getMonth() + 1}. – ${bis.getDate()}.${bis.getMonth() + 1}.${bis.getFullYear()}`;
    inhalt = rasterHtml(tage, d, heuteKey, ge);
  } else {
    titel = datum.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    inhalt = rasterHtml([datum], d, heuteKey, ge);
  }
  el.innerHTML = `
    <div class="k-leiste">
      <div class="k-nav"><button type="button" class="btn klein ghost" data-schritt="-1" aria-label="Zurück">‹</button><button type="button" class="btn klein ghost" data-schritt="0">Heute</button><button type="button" class="btn klein ghost" data-schritt="1" aria-label="Weiter">›</button></div>
      <strong class="k-titel">${esc(titel)}</strong>
      ${d.geraete.length ? `<label class="check k-leih"><input type="checkbox" id="kLeih" ${leihZeigen ? 'checked' : ''}> Leihgaben zeigen</label>` : ''}
    </div>
    <p class="hinweis k-tipp">${ansicht === 'monat'
    ? 'Tag antippen = Tagesansicht mit allen Terminen dieses Tages. Finger auf einem Termin halten und auf einen anderen Tag ziehen = verschieben.'
    : 'Uhrzeit antippen = neuer Termin (Finger halten und ziehen für die Dauer). Termin antippen = Details. Finger auf dem Termin halten = Griffe zum Verschieben und Länger/Kürzer-Ziehen.'}</p>
    ${inhalt}`;

  el.querySelector('#kLeih')?.addEventListener('change', (e) => { leihZeigen = (e.target as HTMLInputElement).checked; neuZeichnen(); });
  el.querySelector('.k-nav').addEventListener('click', (e) => {
    const b = (e.target as Element).closest('[data-schritt]');
    if (!b) return;
    const n = Number(b.dataset.schritt);
    let neu;
    if (n === 0) neu = new Date();
    else if (ansicht === 'monat') neu = new Date(datum.getFullYear(), datum.getMonth() + n, 1);
    else neu = plusTage(datum, n * (ansicht === 'woche' ? 7 : 1));
    gewaehlt = null;
    onWechsel({ ansicht, datum: neu });
  });

  const neuerTermin = async (beginn, dauerMin = 0) => { if (await terminDialog({ beginn: beginn.toISOString(), dauerMin })) neuZeichnen(); };

  el.addEventListener('click', async (e) => {
    if (klickGesperrt()) { e.preventDefault(); return; }
    const ziel = e.target as Element;
    // Monat: Tipp irgendwo auf einen Tag (auch auf einen Termin darin) öffnet die Tagesansicht dieses Tages
    if (ansicht === 'monat') {
      const zelle = ziel.closest<HTMLElement>('.k-tag');
      if (zelle?.dataset.tag) { onWechsel({ ansicht: 'tag', datum: tagVon(zelle.dataset.tag) }); return; }
    }
    const t = ziel.closest<HTMLElement>('[data-termin]');
    if (t) {
      const termin = store.getData().termine.find((x) => x.id === t.dataset.termin);
      if (termin && (await terminKarte(termin))) neuZeichnen();
      return;
    }
    const g = ziel.closest<HTMLElement>('[data-ge-id]');
    if (g) { if (await geraetOeffnen(g.dataset.geGeraet!, g.dataset.geId!)) neuZeichnen(); return; }
    const zt = ziel.closest<HTMLElement>('[data-zum-tag]');
    if (zt) { onWechsel({ ansicht: 'tag', datum: tagVon(zt.dataset.zumTag) }); return; }
  });

  if (ansicht === 'monat') monatZiehenVerdrahten(el, neuZeichnen);
  else {
    rasterZiehenVerdrahten(el, neuZeichnen);
    auswahlVerdrahten(el, neuerTermin, neuZeichnen);
  }
}

/** Leihgabe oder Reservierung öffnen (Details und Aktionen wie im Belegungskalender). */
async function geraetOeffnen(geraetId: string, id: string): Promise<boolean> {
  const d = store.getData();
  const g = d.geraete.find((x) => x.id === geraetId);
  const b = balkenFuer(d, geraetId).find((x) => x.verleih?.id === id || x.reservierung?.id === id);
  if (!g || !b) { location.hash = '#/belegung'; return false; }
  const { balkenDialog } = await import('./views/belegung.ts');
  return balkenDialog(g.name, b);
}

function speichern(id: string, neu: { beginn: string; dauerMin: number }) {
  let geaendert = false;
  store.mutate((data) => {
    const x = data.termine.find((y) => y.id === id);
    if (!x || (x.beginn === neu.beginn && x.dauerMin === neu.dauerMin)) return;
    x.beginn = neu.beginn;
    x.dauerMin = neu.dauerMin;
    x.updatedAt = new Date().toISOString();
    geaendert = true;
  });
  if (geaendert) {
    const b = new Date(neu.beginn);
    toast(`${b.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })}, ${uhr(neu.beginn)} – ${uhr(new Date(b.getTime() + neu.dauerMin * 60000).toISOString())}`, 'ok');
  }
}

/** Woche/Tag: Termin per Halten wählen, dann verschieben oder an den Griffen länger/kürzer ziehen. */
function rasterZiehenVerdrahten(el: HTMLElement, neuZeichnen: () => void) {
  const koerper = el.querySelector<HTMLElement>('.k-koerper');
  if (!koerper) return;
  const spalten = [...koerper.querySelectorAll<HTMLElement>('.k-spalte')];
  type Zug = { id: string; t: Termin; block: HTMLElement; modus: 'schieben' | 'oben' | 'unten'; x: number; y: number; spalte0: number; aktiv: boolean; bewegt: boolean; timer?: ReturnType<typeof setTimeout>; vorschau?: { beginn: string; dauerMin: number }; griff?: boolean };
  let zug: Zug | null = null;

  const griffeZeigen = (block: HTMLElement, id: string) => {
    gewaehlt = id;
    koerper.querySelectorAll('.k-block.gewaehlt').forEach((b) => { if (b !== block) { b.classList.remove('gewaehlt'); b.querySelectorAll('.k-griff,.k-zeitlabel').forEach((x) => x.remove()); } });
    if (!block.classList.contains('gewaehlt')) {
      block.classList.add('gewaehlt');
      block.insertAdjacentHTML('beforeend', GRIFFE);
    }
  };
  const spalteBei = (x: number) => spalten.findIndex((s) => { const r = s.getBoundingClientRect(); return x >= r.left && x < r.right; });
  const vorschauZeigen = (z: Zug, cx: number, cy: number) => {
    const deltaMin = ((cy - z.y) / SLOT_PX) * SLOT_MIN;
    let deltaTage = 0;
    if (z.modus === 'schieben' && spalten.length > 1) {
      const i = spalteBei(cx);
      if (i >= 0) deltaTage = i - z.spalte0;
    }
    const v = gezogen(z.t.beginn, z.t.dauerMin, z.modus, deltaMin, deltaTage);
    z.vorschau = v;
    const b = new Date(v.beginn);
    const ziel = spalten[z.spalte0 + deltaTage] || spalten[z.spalte0];
    if (ziel && z.block.parentElement !== ziel) ziel.appendChild(z.block);
    const min = (b.getHours() - START_STUNDE) * 60 + b.getMinutes();
    z.block.style.top = `${Math.max(0, (min / SLOT_MIN) * SLOT_PX)}px`;
    z.block.style.height = `${Math.max(SLOT_PX / 2, (v.dauerMin / SLOT_MIN) * SLOT_PX - 2)}px`;
    const lab = z.block.querySelector<HTMLElement>('.k-zeitlabel');
    if (lab) { lab.hidden = false; lab.textContent = `${uhr(v.beginn)} – ${uhr(new Date(b.getTime() + v.dauerMin * 60000).toISOString())}`; }
  };
  const ende = () => { if (zug?.timer) clearTimeout(zug.timer); zug = null; koerper.classList.remove('k-zieht'); };

  koerper.addEventListener('pointerdown', (e) => {
    const block = (e.target as Element).closest<HTMLElement>('.k-block');
    if (!block || e.button > 0) return;
    const id = block.dataset.block!;
    const t = store.getData().termine.find((x) => x.id === id);
    if (!t) return;
    const griff = (e.target as Element).closest<HTMLElement>('[data-griff]');
    const modus = (griff?.dataset.griff || 'schieben') as Zug['modus'];
    const z: Zug = { id, t, block, modus, x: e.clientX, y: e.clientY, spalte0: spalten.indexOf(block.parentElement as HTMLElement), aktiv: false, bewegt: false };
    zug = z;
    if (griff) {
      z.aktiv = true;
      z.griff = true;
      block.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    } else if (e.pointerType === 'touch') {
      if (gewaehlt === id) { z.aktiv = true; return; }
      z.timer = setTimeout(() => {
        if (zug !== z) return;
        z.aktiv = true;
        griffeZeigen(block, id);
        koerper.classList.add('k-zieht');
        klickSperren();
        navigator.vibrate?.(15);
      }, HALTEN_MS);
    }
    // Maus/Stift: ab ein paar Pixeln Bewegung wird geschoben, sonst ist es ein Klick
  });
  koerper.addEventListener('pointermove', (e) => {
    const z = zug;
    if (!z) return;
    const weit = Math.hypot(e.clientX - z.x, e.clientY - z.y);
    if (!z.aktiv) {
      if (e.pointerType === 'touch') { if (weit > 8) ende(); return; } // war Scrollen
      if (weit < 5) return;
      z.aktiv = true;
      griffeZeigen(z.block, z.id);
      z.block.setPointerCapture?.(e.pointerId);
    }
    if (!z.bewegt && weit < 4) return;
    z.bewegt = true;
    koerper.classList.add('k-zieht');
    vorschauZeigen(z, e.clientX, e.clientY);
  });
  // Während des Ziehens mit dem Finger nicht scrollen
  koerper.addEventListener('touchmove', (e) => { if (zug?.aktiv) e.preventDefault(); }, { passive: false });
  koerper.addEventListener('pointerup', () => {
    const z = zug;
    if (!z) return;
    ende();
    if (z.bewegt && z.vorschau) {
      klickSperren();
      speichern(z.id, z.vorschau);
      neuZeichnen();
    } else if (z.griff && z.modus === 'schieben') {
      // Mittleren Griff nur angetippt: wie Antippen des Termins
      klickSperren();
      void terminKarte(z.t).then((x) => { if (x) neuZeichnen(); });
    } else if (z.aktiv && z.timer !== undefined) klickSperren();
  });
  koerper.addEventListener('pointercancel', () => { const war = zug?.bewegt; ende(); if (war) neuZeichnen(); });
}

/** Monat: Termin halten (Finger) oder ziehen (Maus) und auf einem anderen Tag loslassen. */
function monatZiehenVerdrahten(el: HTMLElement, neuZeichnen: () => void) {
  const monat = el.querySelector<HTMLElement>('.k-monat');
  if (!monat) return;
  type Zug = { id: string; x: number; y: number; aktiv: boolean; geist?: HTMLElement; ziel?: string; timer?: ReturnType<typeof setTimeout>; quelle: string };
  let zug: Zug | null = null;
  const zielBei = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>('.k-monat .k-tag')?.dataset.tag;
  const starten = (z: Zug, eintrag: HTMLElement) => {
    z.aktiv = true;
    const g = eintrag.cloneNode(true) as HTMLElement;
    g.classList.add('k-geist');
    g.removeAttribute('data-termin');
    g.style.width = `${eintrag.getBoundingClientRect().width}px`;
    document.body.appendChild(g);
    z.geist = g;
    monat.classList.add('k-zieht');
    klickSperren();
    navigator.vibrate?.(15);
  };
  const bewegen = (z: Zug, x: number, y: number) => {
    if (!z.geist) return;
    z.geist.style.left = `${x - 20}px`;
    z.geist.style.top = `${y - 14}px`;
    const t = zielBei(x, y);
    if (t !== z.ziel) {
      monat.querySelectorAll('.k-tag.k-ziel').forEach((c) => c.classList.remove('k-ziel'));
      if (t) monat.querySelector(`.k-tag[data-tag="${t}"]`)?.classList.add('k-ziel');
      z.ziel = t;
    }
  };
  const ende = () => {
    if (!zug) return;
    if (zug.timer) clearTimeout(zug.timer);
    zug.geist?.remove();
    monat.querySelectorAll('.k-tag.k-ziel').forEach((c) => c.classList.remove('k-ziel'));
    monat.classList.remove('k-zieht');
    zug = null;
  };
  monat.addEventListener('pointerdown', (e) => {
    const eintrag = (e.target as Element).closest<HTMLElement>('[data-termin]');
    if (!eintrag || e.button > 0) return;
    const quelle = eintrag.closest<HTMLElement>('.k-tag')?.dataset.tag || '';
    const z: Zug = { id: eintrag.dataset.termin!, x: e.clientX, y: e.clientY, aktiv: false, quelle };
    zug = z;
    if (e.pointerType === 'touch') {
      z.timer = setTimeout(() => { if (zug === z) { starten(z, eintrag); bewegen(z, z.x, z.y); } }, HALTEN_MS);
    }
  });
  monat.addEventListener('pointermove', (e) => {
    const z = zug;
    if (!z) return;
    if (!z.aktiv) {
      const weit = Math.hypot(e.clientX - z.x, e.clientY - z.y);
      if (e.pointerType === 'touch') { if (weit > 8) ende(); return; }
      if (weit < 6) return;
      const eintrag = monat.querySelector<HTMLElement>(`[data-termin="${CSS.escape(z.id)}"]`);
      if (!eintrag) return;
      starten(z, eintrag);
    }
    bewegen(z, e.clientX, e.clientY);
  });
  monat.addEventListener('touchmove', (e) => { if (zug?.aktiv) e.preventDefault(); }, { passive: false });
  monat.addEventListener('pointerup', (e) => {
    const z = zug;
    if (!z) return;
    const ziel = z.aktiv ? (zielBei(e.clientX, e.clientY) || z.ziel) : undefined;
    const war = z.aktiv;
    ende();
    if (!war) return;
    klickSperren();
    const t = store.getData().termine.find((x) => x.id === z.id);
    if (!t || !ziel || ziel === z.quelle) return;
    speichern(t.id, { beginn: aufTag(t.beginn, ziel), dauerMin: t.dauerMin });
    neuZeichnen();
  });
  monat.addEventListener('pointercancel', ende);
}

/** Antippen = 1 Stunde ab Slot. Maus/Stift: sofort ziehen. Finger: 350 ms halten, dann ziehen (sonst wird gescrollt). */
function auswahlVerdrahten(el, neuerTermin, neuZeichnen) {
  for (const spalte of el.querySelectorAll('.k-spalte')) {
    const box = spalte.querySelector('.k-auswahl');
    let start: number | null = null; let ende: number | null = null; let aktiv = false; let timer: ReturnType<typeof setTimeout> | undefined; let startY = 0; let bewegt = false;
    const slotBei = (clientY) => { const r = spalte.getBoundingClientRect(); return Math.max(0, Math.min(Math.floor((clientY - r.top) / SLOT_PX), ((ENDE_STUNDE - START_STUNDE) * 60) / SLOT_MIN - 1)); };
    const zeigen = () => { if (start === null || ende === null) return; const a = Math.min(start, ende); const b = Math.max(start, ende); box.hidden = false; box.style.top = `${a * SLOT_PX}px`; box.style.height = `${(b - a + 1) * SLOT_PX}px`; box.textContent = `${slotZeit(spalte.dataset.tag, a).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${slotZeit(spalte.dataset.tag, b + 1).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`; };
    const aufhoeren = () => { clearTimeout(timer); timer = undefined; aktiv = false; start = null; box.hidden = true; };
    spalte.addEventListener('pointerdown', (e) => {
      if ((e.target as Element).closest('[data-termin],.k-block') || e.button > 0) return;
      // Ein gewählter Termin wird mit einem Tipp daneben nur abgewählt
      if (gewaehlt) { gewaehlt = null; klickSperren(); neuZeichnen(); return; }
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
      if ((e.target as Element).closest('[data-termin],.k-block')) return;
      const dauer = war && b > a ? (b - a + 1) * SLOT_MIN : 60;
      neuerTermin(slotZeit(key, a), dauer);
    });
    spalte.addEventListener('pointercancel', aufhoeren);
  }
}
