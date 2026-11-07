// Sperling – Belegungskalender der Vorführgeräte: Zeitleiste je Gerät, Liste nach Tagen, freie Geräte finden.
import { esc, formatDate } from '../../core/util.ts';
import { kundenTitel, KAUFINTERESSE, type Daten } from '../../core/model.ts';
import {
  tagVon, tagDatum, plusTage, wochenanfang, kalenderwoche, tageZwischen, balkenFuer, imZeitraum, agenda, freieGeraete,
  type Balken, type Tag, type EreignisArt,
} from '../../core/belegung.ts';
import * as store from '../../storage/store.ts';
import { maskottchen, toast, dialog, bestaetigen } from '../dom.ts';
import { leer } from '../parts.ts';
import { zeitraumWahl } from '../zeitraum.ts';
import { reservierenDialog, verleihDialog } from './bestand.ts';
import * as leihschein from '../leihschein.ts';
import { kalenderTabs } from '../kalender.ts';

const ANSICHTEN = [['zeitleiste', 'Zeitleiste'], ['liste', 'Liste nach Tagen'], ['frei', 'Freie finden']] as const;
type Ansicht = typeof ANSICHTEN[number][0];
const ZOOM = [[7, '1 Woche'], [28, '4 Wochen'], [91, '3 Monate']] as const;
const ART_TEXT: Record<Balken['art'], string> = { verliehen: 'verliehen', ueberfaellig: 'überfällig', reserviert: 'reserviert', frueher: 'früher verliehen' };
const EREIGNIS_TEXT: Record<EreignisArt, string> = {
  ausgabe: '↗ geht raus', rueckgabe: '↙ kam zurück', zurueckErwartet: '↙ kommt zurück', resvBeginn: '📌 Reservierung beginnt', resvEnde: '📌 Reservierung endet',
};

const kundeName = (d: Daten, id: string) => { const k = d.kunden.find((x) => x.id === id); return k ? kundenTitel(k) : ''; };
const kurz = (t: Tag) => tagDatum(t).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });

export function render(el: HTMLElement, params: URLSearchParams) {
  const p = (n: string) => params.get(n) || '';
  // Am Handy startet die Liste, sonst die Zeitleiste (wie in WASNWO)
  const ansicht: Ansicht = ANSICHTEN.some(([k]) => k === p('ansicht')) ? p('ansicht') as Ansicht : (matchMedia('(max-width: 600px)').matches ? 'liste' : 'zeitleiste');
  const zoom = ZOOM.some(([z]) => String(z) === p('zoom')) ? Number(p('zoom')) : 28;
  const datum: Tag = /^\d{4}-\d{2}-\d{2}$/.test(p('datum')) ? p('datum') : tagVon(new Date());
  const neu = (a: Ansicht, z: number, dt: Tag) => {
    const q = new URLSearchParams({ ansicht: a, zoom: String(z), datum: dt });
    history.replaceState(null, '', `#/belegung?${q}`);
    render(el, q);
  };
  const d = store.getData();
  const geraete = d.geraete.filter((g) => g.aktiv);

  el.innerHTML = `
    <header class="seitenkopf">
      <h1>${maskottchen('termine', 'titel-bild')} Kalender <small>Geräte</small></h1>
      <a class="btn ghost" href="#/bestand">Bestand</a>
    </header>
    ${kalenderTabs('geraete')}
    <nav class="tabs bk-unter" role="tablist">${ANSICHTEN.map(([k, l]) => `<button type="button" data-ansicht="${k}" class="${k === ansicht ? 'aktiv' : ''}">${l}</button>`).join('')}</nav>
    ${ansicht !== 'frei' ? `<div class="bk-leiste">
      <div class="k-nav"><button type="button" class="btn klein ghost" data-schritt="-1" aria-label="Zurück">‹</button><button type="button" class="btn klein ghost" data-schritt="0">Heute</button><button type="button" class="btn klein ghost" data-schritt="1" aria-label="Weiter">›</button></div>
      <select id="bkZoom" aria-label="Zeitraum">${ZOOM.map(([z, l]) => `<option value="${z}" ${z === zoom ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <input type="date" id="bkDatum" value="${datum}" aria-label="Springe zu Datum">
    </div>` : ''}
    <section class="karte-box" id="bkInhalt"></section>`;

  el.querySelector('#kalTabs')?.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-ansicht]');
    if (b && b.dataset.ansicht !== 'geraete') location.hash = `#/termine?ansicht=${b.dataset.ansicht}`;
  });
  el.querySelector('.bk-unter').addEventListener('click', (e) => { const b = (e.target as Element).closest('[data-ansicht]'); if (b) neu(b.dataset.ansicht as Ansicht, zoom, datum); });
  el.querySelector('.k-nav')?.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('[data-schritt]');
    if (!b) return;
    const n = Number(b.dataset.schritt);
    neu(ansicht, zoom, n === 0 ? tagVon(new Date()) : plusTage(datum, n * (zoom === 91 ? 28 : zoom === 28 ? 14 : 7)));
  });
  el.querySelector('#bkZoom')?.addEventListener('change', (e) => neu(ansicht, Number((e.target as HTMLSelectElement).value), datum));
  el.querySelector('#bkDatum')?.addEventListener('change', (e) => { const v = (e.target as HTMLInputElement).value; if (v) neu(ansicht, zoom, v); });

  const box = el.querySelector<HTMLElement>('#bkInhalt');
  const nochmal = () => render(el, new URLSearchParams(location.hash.split('?')[1] || ''));
  if (!geraete.length) { box.innerHTML = leer('vorwerk', 'Noch keine Vorführgeräte. Lege sie unter Bestand an.'); return; }
  if (ansicht === 'zeitleiste') zeitleiste(box, d, wochenanfang(datum), zoom, nochmal);
  else if (ansicht === 'liste') liste(box, d, datum, zoom, nochmal);
  else freiFinden(box, nochmal);
}

// ---------- Zeitleiste ----------

function zeitleiste(box: HTMLElement, d: Daten, start: Tag, tage: number, nochmal: () => void) {
  const ende = plusTage(start, tage - 1);
  const heute = tagVon(new Date());
  const pct = (n: number) => `${(n / tage) * 100}%`;
  const tagListe = Array.from({ length: tage }, (_, i) => plusTage(start, i));
  const wochenende = tagListe.map((t, i) => ([0, 6].includes(tagDatum(t).getDay()) ? `<span class="bk-we" style="left:${pct(i)};width:${pct(1)}"></span>` : '')).join('');
  const heuteLinie = heute >= start && heute <= ende ? `<span class="bk-heute" style="left:${pct(tageZwischen(start, heute) + 0.5)}"></span>` : '';
  const kopf = tage === 91
    ? tagListe.filter((t) => tagDatum(t).getDay() === 1).map((t) => `<span class="bk-kopf-zelle" style="left:${pct(tageZwischen(start, t))};width:${pct(7)}">KW ${kalenderwoche(t)}<small>${tagDatum(t).getDate()}.${tagDatum(t).getMonth() + 1}.</small></span>`).join('')
    : tagListe.map((t, i) => `<span class="bk-kopf-zelle ${t === heute ? 'heute' : ''}" style="left:${pct(i)};width:${pct(1)}">${tage === 7 ? kurz(t) : `${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][tagDatum(t).getDay()]}<small>${tagDatum(t).getDate()}.</small>`}</span>`).join('');
  const geraete = d.geraete.filter((g) => g.aktiv).sort((a, b) => a.name.localeCompare(b.name, 'de'));

  box.innerHTML = `
    <p class="hinweis bk-legende"><span class="bk-bar art-verliehen">verliehen</span><span class="bk-bar art-ueberfaellig">überfällig</span><span class="bk-bar art-reserviert">reserviert</span><span class="bk-bar art-frueher">früher</span> · Leere Stelle antippen = reservieren</p>
    <div class="bk-plan" style="--tage:${tage}">
      <div class="bk-zeile bk-kopfzeile"><div class="bk-name">${esc(formatDate(tagDatum(start).toISOString()))} – ${esc(formatDate(tagDatum(ende).toISOString()))}</div><div class="bk-spur">${kopf}</div></div>
      ${geraete.map((g) => {
    const balken = balkenFuer(d, g.id, heute).filter((b) => imZeitraum(b, start, ende));
    return `<div class="bk-zeile" data-geraet="${esc(g.id)}">
          <div class="bk-name"><strong>${esc(g.name)}</strong>${g.seriennummer ? `<small>${esc(g.seriennummer)}</small>` : ''}</div>
          <div class="bk-spur">${wochenende}${heuteLinie}
            ${balken.map((b, i) => {
      const a = b.von < start ? 0 : tageZwischen(start, b.von);
      const bisEff = b.bis === null || b.bis > ende ? ende : b.bis;
      const w = tageZwischen(b.von < start ? start : b.von, bisEff) + 1;
      const offenL = b.von < start; const offenR = b.bis === null || b.bis > ende;
      const wer = kundeName(d, b.kundeId);
      return `<button type="button" class="bk-bar art-${b.art}${offenL ? ' offen-l' : ''}${offenR ? ' offen-r' : ''}" data-i="${i}" style="left:${pct(a)};width:${pct(w)}" title="${esc(`${ART_TEXT[b.art]}${wer ? ` – ${wer}` : ''}`)}">${esc(wer || ART_TEXT[b.art])}</button>`;
    }).join('')}
          </div>
        </div>`;
  }).join('')}
    </div>`;

  box.querySelector('.bk-plan')?.addEventListener('click', async (e) => {
    const zeile = (e.target as Element).closest<HTMLElement>('[data-geraet]');
    if (!zeile) return;
    const g = store.getData().geraete.find((x) => x.id === zeile.dataset.geraet);
    if (!g) return;
    const bar = (e.target as Element).closest<HTMLElement>('.bk-bar');
    if (bar) {
      const b = balkenFuer(store.getData(), g.id, heute).filter((x) => imZeitraum(x, start, ende))[Number(bar.dataset.i)];
      if (b && (await balkenDialog(g.name, b))) nochmal();
      return;
    }
    const spur = (e.target as Element).closest<HTMLElement>('.bk-spur');
    if (!spur) return;
    const r = spur.getBoundingClientRect();
    const tag = plusTage(start, Math.max(0, Math.min(tage - 1, Math.floor(((e as MouseEvent).clientX - r.left) / (r.width / tage)))));
    const ab = tag < heute ? heute : tag;
    // Belegter Tag (z. B. offener Verleih ohne Ende): Belegung zeigen statt Reservieren
    const belegtDurch = balkenFuer(store.getData(), g.id, heute).find((x) => x.art !== 'frueher' && imZeitraum(x, ab, ab));
    if (belegtDurch) { if (await balkenDialog(g.name, belegtDurch)) nochmal(); return; }
    if (await reservierenDialog(g, { von: tagDatum(ab).toISOString() })) nochmal();
  });
}

/** Details zu einem Balken mit passenden Aktionen. Gibt true zurück, wenn sich etwas geändert hat. */
export async function balkenDialog(geraetName: string, b: Balken): Promise<boolean> {
  const d = store.getData();
  const wer = kundeName(d, b.kundeId);
  const zeitraum = `${formatDate(tagDatum(b.von).toISOString())} – ${b.bis ? formatDate(tagDatum(b.bis).toISOString()) : 'offen'}`;
  const l = b.verleih;
  const knoepfe: { label: string; wert: string; primaer?: boolean; gefahr?: boolean }[] = [];
  if (l) knoepfe.push({ label: '📄 Leihschein', wert: 'leihschein' });
  if (l?.rueckgabe && l.kaufinteresse !== 'gekauft') knoepfe.push({ label: '↩️📄 Rückgabeschein', wert: 'rueckgabeschein' });
  if (b.reservierung) {
    knoepfe.push({ label: 'Reservierung löschen', wert: 'loeschen', gefahr: true });
    if (b.von <= tagVon(new Date()) && !d.leihvorgaenge.some((x) => x.geraetId === b.geraetId && !x.rueckgabe)) knoepfe.push({ label: 'Jetzt verleihen', wert: 'verleihen', primaer: true });
  }
  const wahl = await dialog<string>({
    titel: geraetName,
    html: `<p><span class="bk-bar art-${b.art}">${esc(ART_TEXT[b.art])}</span> ${esc(zeitraum)}</p>
      ${wer ? `<p>Kunde: <a href="#/kunde/${esc(b.kundeId)}">${esc(wer)}</a></p>` : ''}
      ${l ? `<p class="hinweis">Kaufinteresse: ${esc(KAUFINTERESSE[l.kaufinteresse])}${l.notiz ? ` · ${esc(l.notiz)}` : ''}</p>` : ''}
      ${b.reservierung?.notiz ? `<p class="hinweis">${esc(b.reservierung.notiz)}</p>` : ''}`,
    knoepfe: knoepfe.length ? knoepfe : [{ label: 'OK', wert: '' }],
  });
  if (!wahl) return false;
  if (wahl === 'leihschein' && l) await leihschein.anbieten(l.id, 'ausgabe', dialog);
  if (wahl === 'rueckgabeschein' && l) await leihschein.anbieten(l.id, 'rueckgabe', dialog);
  if (wahl === 'loeschen' && b.reservierung) {
    const rid = b.reservierung.id;
    if (!(await bestaetigen('Reservierung löschen?', `${geraetName}, ${zeitraum}`))) return false;
    store.mutate((data) => { data.reservierungen = data.reservierungen.filter((x) => x.id !== rid); });
    toast('Reservierung gelöscht', 'ok');
    return true;
  }
  if (wahl === 'verleihen' && b.reservierung) {
    const g = d.geraete.find((x) => x.id === b.geraetId);
    return g ? verleihDialog(g, b.reservierung) : false;
  }
  return false;
}

// ---------- Liste nach Tagen ----------

function liste(box: HTMLElement, d: Daten, datum: Tag, tage: number, nochmal: () => void) {
  const bis = plusTage(datum, tage - 1);
  const { ueberfaellig, tage: tl } = agenda(d, datum, bis);
  const geraet = (id: string) => d.geraete.find((g) => g.id === id)?.name || 'Gerät';
  const zeile = (text: string, g: string, wer: string, extra = '') => `<li class="zeile"><span class="zeile-haupt"><strong>${esc(g)}</strong><small>${esc(text)}${wer ? ` · ${esc(wer)}` : ''}${extra}</small></span></li>`;
  box.innerHTML = `
    <h2>${esc(kurz(datum))} bis ${esc(kurz(bis))}</h2>
    ${ueberfaellig.length ? `<h3 class="warn">Überfällig (${ueberfaellig.length})</h3><ul class="liste">${ueberfaellig.map((l) => zeile(`sollte zurück sein am ${formatDate(l.rueckgabeGeplant)}`, geraet(l.geraetId), kundeName(d, l.kundeId))).join('')}</ul>` : ''}
    ${tl.length ? tl.map((t) => `<h3>${esc(kurz(t.tag))}${t.tag === tagVon(new Date()) ? ' · heute' : ''}</h3><ul class="liste">${t.ereignisse.map((e) => zeile(EREIGNIS_TEXT[e.art], geraet(e.geraetId), kundeName(d, e.kundeId))).join('')}</ul>`).join('')
    : '<p class="hinweis">In diesem Zeitraum geht nichts raus und kommt nichts zurück.</p>'}`;
  void nochmal;
}

// ---------- Freie finden ----------

function freiFinden(box: HTMLElement, nochmal: () => void) {
  const heute = tagVon(new Date());
  box.innerHTML = `<p class="hinweis">Zeitraum wählen: Beginn antippen und bis zum Ende wischen (oder das Ende antippen). Darunter stehen die Geräte, die dann frei sind.</p>
    <div id="bkZeitraum"></div><div id="bkFreie"></div>`;
  const ergebnis = box.querySelector<HTMLElement>('#bkFreie');
  const zeigen = (von: Tag | null, bis: Tag | null) => {
    if (!von) { ergebnis.innerHTML = ''; return; }
    const ende = bis || von;
    const frei = freieGeraete(store.getData(), von, ende);
    ergebnis.innerHTML = frei.length
      ? `<h3>${frei.length} ${frei.length === 1 ? 'Gerät' : 'Geräte'} frei</h3><ul class="liste">${frei.map((g) => `<li class="zeile" data-id="${esc(g.id)}"><span class="zeile-haupt"><strong>${esc(g.name)}</strong>${g.zubehoer ? `<small>${esc(g.zubehoer)}</small>` : ''}</span><button class="btn klein ghost" data-tun="reservieren">Reservieren</button>${von === heute ? '<button class="btn klein primary" data-tun="verleihen">Verleihen</button>' : ''}</li>`).join('')}</ul>`
      : '<p class="hinweis">In diesem Zeitraum ist kein Gerät frei.</p>';
  };
  const wahl = zeitraumWahl(box.querySelector<HTMLElement>('#bkZeitraum'), { von: heute, bis: plusTage(heute, 6), min: heute, vorgabeTage: 7, onChange: zeigen });
  zeigen(heute, plusTage(heute, 6));
  ergebnis.addEventListener('click', async (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-tun]');
    const id = b?.closest<HTMLElement>('[data-id]')?.dataset.id;
    const g = store.getData().geraete.find((x) => x.id === id);
    if (!b || !g) return;
    const { von, bis } = wahl.get();
    if (!von) return;
    const iso = (t: Tag) => tagDatum(t).toISOString();
    const ok = b.dataset.tun === 'verleihen'
      ? await verleihDialog(g, null, iso(bis || von))
      : await reservierenDialog(g, { von: iso(von), bis: iso(bis || von) });
    if (ok) nochmal();
  });
}
