// Sperling – Produktübersicht (Oberfläche): Katalog, Kacheln, Detail, und „Produkte im Gespräch markieren“.
// Alle Texte aus dem Katalog werden escaped (R-XSS). Bilder nur verlinkt, ohne Referrer, lazy (R-EXTERN:
// es geht dabei nichts über Kunden an den Hersteller).
import rohKatalog from '../data/produkte.json';
import { esc } from '../core/util.ts';
import { SPARTEN, type Sparte } from '../core/model.ts';
import { katalogPruefen, produkteFuer, kategorienIn, preisText, standText, aktuelleMarkierungen, markierungSetzen, markierungenText, KATEGORIEN, MARKIERUNGEN, MARKIERUNG_KEYS, type Katalog, type Produkt, type Markierung } from '../core/produkte.ts';
import * as store from '../storage/store.ts';
import { dialog, kopieren, maskottchen, toast } from './dom.ts';

let kat: Katalog | null = null;
export function katalog(): Katalog {
  if (!kat) {
    kat = katalogPruefen(rohKatalog);
    if (kat.uebersprungen) console.warn(`Produktkatalog: ${kat.uebersprungen} Einträge übersprungen`);
  }
  return kat;
}
export const produkt = (id: string) => katalog().produkte.find((p) => p.id === id) || null;

const ICON: Record<Sparte, string> = { pv: 'photovoltaik', wp: 'waermepumpe', vorwerk: 'vorwerk' };

export function bildHtml(p: Produkt, klasse = 'produkt-bild'): string {
  const ersatz = `<span class="${klasse} produkt-ersatz bereich-${p.bereich}">${maskottchen(ICON[p.bereich], 'mini')}</span>`;
  if (!p.bildUrl) return ersatz;
  // Offline oder gesperrt: Platzhalter mit Bereichs-Icon statt kaputtem Bild
  return `<img class="${klasse}" src="${esc(p.bildUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-ersatz="assets/marke/${ICON[p.bereich]}.png">`;
}
/** Kaputte Bilder durch das Bereichs-Icon ersetzen (einmal je Wurzel aufrufen). */
export function bildFehlerAbfangen(root: Element) {
  root.addEventListener('error', (ev) => {
    const img = ev.target as HTMLImageElement;
    const ersatz = img.getAttribute?.('data-ersatz');
    if (img.tagName !== 'IMG' || !ersatz) return;
    img.removeAttribute('data-ersatz');
    img.classList.add('produkt-ersatz');
    img.src = ersatz;
  }, true);
}

export function kachelHtml(p: Produkt, markierung?: Markierung): string {
  const preis = preisText(p);
  return `<button type="button" class="produkt-kachel bereich-rand bereich-${p.bereich}" data-produkt="${esc(p.id)}">
    <span class="produkt-bildrahmen">${bildHtml(p)}<span class="sparte-etikett" aria-hidden="true">${esc(SPARTEN[p.bereich].label)}</span></span>
    <span class="produkt-text">
      <strong>${esc(p.name)}</strong>
      <small>${esc(KATEGORIEN[p.kategorie])}${p.demnaechst ? ' · <b class="bald">bald verfügbar</b>' : ''}</small>
      ${preis ? `<span class="produkt-preis">${esc(preis)}</span>` : '<span class="produkt-preis leer">Preis auf Anfrage</span>'}
      ${markierung ? `<span class="chip markierung-${markierung}">${MARKIERUNGEN[markierung].kurz} ${esc(MARKIERUNGEN[markierung].label)}</span>` : ''}
    </span>
  </button>`;
}

export function detailHtml(p: Produkt): string {
  const preis = preisText(p);
  const passt = p.passtZu.map(produkt).filter((x): x is Produkt => !!x);
  return `
    <div class="produkt-detail">
      ${bildHtml(p, 'produkt-bild gross')}
      <p class="tags"><span class="tag tag-${p.bereich}">${esc(SPARTEN[p.bereich].label)}</span> <span class="tag">${esc(KATEGORIEN[p.kategorie])}</span>${p.demnaechst ? ' <span class="tag bald">bald verfügbar</span>' : ''}</p>
      ${p.modell ? `<p><small>Modell: ${esc(p.modell)}</small></p>` : ''}
      <p>${esc(p.kurzbeschreibung)}</p>
      ${p.technischeDaten.length ? `<dl class="ka-daten">${p.technischeDaten.map((t) => `<dt>${esc(t.bezeichnung)}</dt><dd>${esc(t.wert)}</dd>`).join('')}</dl>` : ''}
      <p class="produkt-preis">${preis ? esc(preis) : 'Kein Preis veröffentlicht'}${p.preis?.uvp ? ` <small>(statt ${esc(p.preis.uvp.toLocaleString('de-DE', { minimumFractionDigits: 2 }))} €)</small>` : ''}</p>
      <p class="hinweis">Stand ${esc(standText(p.stand))}, laut Hersteller-Website. Vor dem Nennen beim Kunden auf der Quellseite prüfen.${p.hinweise ? ` ${esc(p.hinweise)}` : ''}</p>
      ${p.quelleUrl ? `<p class="knopfreihe"><a class="btn ghost" href="${esc(p.quelleUrl)}" target="_blank" rel="noopener noreferrer">Beim Hersteller ansehen ↗</a> <button type="button" class="btn ghost" data-link-kopieren>🔗 Link kopieren</button></p>` : ''}
      ${passt.length ? `<h3>Passt dazu</h3><div class="produkt-passt">${passt.map((x) => `<button type="button" class="chip-wahl" data-produkt="${esc(x.id)}">${esc(x.name)}</button>`).join('')}</div>` : ''}
    </div>`;
}

/** Detail als Blatt; „Passt dazu“ wechselt zum anderen Produkt. */
export function detailZeigen(id: string) {
  const p = produkt(id);
  if (!p) { toast('Dieses Produkt steht nicht mehr im Katalog.', 'info'); return; }
  dialog({
    titel: p.name,
    html: detailHtml(p),
    knoepfe: [{ label: 'Schließen', primaer: true, wert: true }],
    onOpen: (dlg) => {
      dlg.classList.add('dlg-produkt');
      dlg.querySelector<HTMLElement>('.dlg-actions button.ghost')?.style.setProperty('display', 'none');
      bildFehlerAbfangen(dlg);
      dlg.querySelector('[data-link-kopieren]')?.addEventListener('click', async () => {
        const ok = p.quelleUrl ? await kopieren(p.quelleUrl) : false;
        toast(ok ? 'Link kopiert' : 'Kopieren nicht möglich', ok ? 'ok' : 'error');
      });
      dlg.querySelector('.produkt-passt')?.addEventListener('click', (ev) => {
        const b = (ev.target as Element).closest<HTMLElement>('[data-produkt]');
        if (!b) return;
        dlg.close();
        setTimeout(() => detailZeigen(b.dataset.produkt!), 0);
      });
    },
  });
}

// ---------- Produkte im Gespräch markieren ----------

/** Block „Produkte“ für einen Bereich beim Kunden (Kartei und Gesprächsmodus). */
export function markierenHtml(k: { produkte?: unknown[] } & { id: string }, bereich: Sparte, offen = false): string {
  const liste = produkteFuer(katalog(), bereich);
  if (!liste.length) return '';
  const akt = aktuelleMarkierungen(k.produkte as never);
  const zusammen = markierungenText(k.produkte as never, bereich);
  return `<details class="produkte-markieren" data-bereich="${bereich}" ${offen ? 'open' : ''}>
    <summary><b>🏷️ Produkte</b> <small>${zusammen ? esc(zusammen) : 'Interesse antippen'}</small></summary>
    ${kategorienIn(liste).map((kt) => `<div class="pm-gruppe"><h4>${esc(KATEGORIEN[kt])}</h4>
      ${liste.filter((p) => p.kategorie === kt).map((p) => {
    const m = akt.get(p.id)?.markierung;
    return `<div class="pm-zeile">
        <button type="button" class="pm-name" data-produkt-info="${esc(p.id)}">${esc(p.name)}${p.demnaechst ? ' <small class="bald">bald</small>' : ''}</button>
        <span class="pm-wahl" role="group" aria-label="${esc(p.name)}">${MARKIERUNG_KEYS.map((x) => `<button type="button" class="chip-wahl markierung-${x}${m === x ? ' aktiv' : ''}" data-produkt-mark="${esc(p.id)}" data-mark="${x}" aria-pressed="${m === x}" title="${esc(MARKIERUNGEN[x].label)}">${MARKIERUNGEN[x].kurz}<span class="pm-label"> ${esc(MARKIERUNGEN[x].label)}</span></button>`).join('')}</span>
      </div>`;
  }).join('')}</div>`).join('')}
  </details>`;
}

/** Den Block eines Bereichs nach einer Änderung frisch zeichnen (bleibt aufgeklappt). */
export function markierenNeuZeichnen(root: Element, kundeId: string, bereich: Sparte) {
  const alt = root.querySelector(`.produkte-markieren[data-bereich="${bereich}"]`);
  const k = store.findKunde(kundeId);
  if (!alt || !k) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = markierenHtml(k, bereich, true);
  if (tmp.firstElementChild) alt.replaceWith(tmp.firstElementChild);
}

/** Klicks verarbeiten. `neu` zeichnet nach einer Änderung neu (bekommt den Bereich). */
export function markierenVerdrahten(root: Element, kundeId: string, neu: (bereich: Sparte) => void) {
  root.addEventListener('click', (ev) => {
    const t = ev.target as Element;
    const info = t.closest<HTMLElement>('[data-produkt-info]');
    if (info) { detailZeigen(info.dataset.produktInfo!); return; }
    const b = t.closest<HTMLElement>('[data-produkt-mark]');
    if (!b) return;
    const p = produkt(b.dataset.produktMark!);
    if (!p) return;
    const bereich = (b.closest<HTMLElement>('[data-bereich]')?.dataset.bereich || p.bereich) as Sparte;
    store.mutate((d) => {
      const k = d.kunden.find((x) => x.id === kundeId);
      if (!k) return;
      // Bereich der Markierung = Reiter, unter dem markiert wurde (Komplettpakete stehen unter PV und WP)
      markierungSetzen(k.produkte, { ...p, bereich }, b.dataset.mark as Markierung);
      k.updatedAt = new Date().toISOString();
    });
    neu(bereich);
  });
}
