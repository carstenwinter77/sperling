// Sperling – Kundenfotos: Reiter „Fotos“ beim Kunden, getrennt nach Photovoltaik, Wärmepumpe und Vorwerk.
// Aufnehmen oder aus den Fotos wählen (mehrere auf einmal), Tipp öffnet die Vollansicht mit Zoom
// (zwei Finger, Doppeltipp, Mausrad, + und −) und Wischen zum nächsten Foto.
import { esc, formatDateTime, nowIso } from '../core/util.ts';
import { FOTO_SPARTEN, MAX_FOTOS_JE_KUNDE, groesseText, type FotoSparte, type KundenFoto } from '../core/fotos.ts';
import type { Kunde } from '../core/model.ts';
import * as store from '../storage/store.ts';
import * as fotos from '../storage/fotos.ts';
import { toast, bestaetigen } from './dom.ts';

const SPARTEN = Object.keys(FOTO_SPARTEN) as FotoSparte[];

/** Reiter „Fotos“ beim Kunden. */
export function tab(el: Element, k: Kunde, fertig?: () => void) {
  const zeichnen = () => {
    const kunde = store.findKunde(k.id);
    if (!kunde) return;
    const gesamt = kunde.fotos.reduce((n, f) => n + f.bytes, 0);
    el.innerHTML = `
      <p class="hinweis">Fotos für die Beratung, nach Sparte getrennt. Sie werden verkleinert und verschlüsselt auf dem Gerät gespeichert.${kunde.fotos.length ? ` Zusammen ${kunde.fotos.length} Foto${kunde.fotos.length === 1 ? '' : 's'}, etwa ${esc(groesseText(gesamt))}.` : ''}</p>
      ${SPARTEN.map((s) => {
    const liste = kunde.fotos.filter((f) => f.sparte === s).sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? 1 : -1));
    return `<section class="karte-box foto-gruppe bereich-${s}" data-foto-sparte="${s}">
          <div class="abschnitt-kopf"><h2>${esc(FOTO_SPARTEN[s])} <small>(${liste.length})</small></h2>
            <div class="knopfreihe">
              <label class="btn klein primary">📷 Aufnehmen<input type="file" accept="image/*" capture="environment" hidden data-foto-neu="${s}"></label>
              <label class="btn klein">🖼 Auswählen<input type="file" accept="image/*" multiple hidden data-foto-neu="${s}"></label>
            </div>
          </div>
          ${liste.length ? `<div class="foto-raster">${liste.map((f, i) => `<button type="button" class="foto-kachel" data-foto="${esc(f.id)}" data-i="${i}" aria-label="Foto ${i + 1} von ${liste.length}, ${esc(formatDateTime(f.zeitpunkt))}"><span class="foto-laedt"></span></button>`).join('')}</div>`
    : '<p class="hinweis">Noch keine Fotos.</p>'}
        </section>`;
  }).join('')}`;
    // Vorschaubilder nach und nach entschlüsseln
    el.querySelectorAll<HTMLElement>('.foto-kachel').forEach(async (b) => {
      try {
        const u = await fotos.url(b.dataset.foto!, 'vorschau');
        if (!b.isConnected) return;
        b.innerHTML = u ? `<img src="${u}" alt="" loading="lazy">` : '<span class="foto-fehlt">Foto fehlt</span>';
      } catch { b.innerHTML = '<span class="foto-fehlt">nicht lesbar</span>'; }
    });
  };
  zeichnen();

  el.addEventListener('change', async (ev) => {
    const input = (ev.target as Element).closest<HTMLInputElement>('[data-foto-neu]');
    if (!input?.files?.length) return;
    const sparte = input.dataset.fotoNeu as FotoSparte;
    const dateien = [...input.files];
    input.value = '';
    const frei = MAX_FOTOS_JE_KUNDE - (store.findKunde(k.id)?.fotos.length || 0);
    if (frei <= 0) { toast(`Höchstens ${MAX_FOTOS_JE_KUNDE} Fotos je Kunde.`, 'error'); return; }
    let ok = 0;
    for (const [i, d] of dateien.slice(0, frei).entries()) {
      if (dateien.length > 1) toast(`Foto ${i + 1} von ${Math.min(dateien.length, frei)} wird gespeichert …`, 'ok', 60000);
      try {
        const m = await fotos.aufnehmen(d);
        store.mutate((data) => {
          const x = data.kunden.find((y) => y.id === k.id);
          if (!x) throw new Error('Kunde nicht gefunden.');
          x.fotos.push({ id: m.id, sparte, zeitpunkt: nowIso(), notiz: '', bytes: m.bytes, breite: m.breite, hoehe: m.hoehe });
          x.updatedAt = nowIso();
        });
        ok++;
      } catch (err) { toast(`Foto ${i + 1}: ${(err as Error).message || 'konnte nicht gespeichert werden'}`, 'error', 5000); }
    }
    if (ok) toast(`${ok} Foto${ok === 1 ? '' : 's'} gespeichert`, 'ok');
    if (dateien.length > frei) toast(`Nur ${frei} von ${dateien.length} übernommen: höchstens ${MAX_FOTOS_JE_KUNDE} Fotos je Kunde.`, 'error', 6000);
    zeichnen();
    fertig?.();
  });

  el.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('.foto-kachel');
    if (!b) return;
    const sparte = b.closest<HTMLElement>('[data-foto-sparte]')!.dataset.fotoSparte as FotoSparte;
    const liste = (store.findKunde(k.id)?.fotos || []).filter((f) => f.sparte === sparte).sort((a, c) => (a.zeitpunkt < c.zeitpunkt ? 1 : -1));
    vollansicht(k.id, liste, Number(b.dataset.i) || 0, () => { zeichnen(); fertig?.(); });
  });
}

/** Vollansicht mit Zoom und Wischen. */
export function vollansicht(kundeId: string, start: KundenFoto[], index: number, geaendert: () => void) {
  let liste = [...start];
  let i = Math.max(0, Math.min(index, liste.length - 1));
  let s = 1; let tx = 0; let ty = 0; // Zoom und Verschiebung
  const vorher = document.activeElement as HTMLElement | null;
  const el = document.createElement('div');
  el.className = 'foto-voll';
  el.id = 'fotoVoll';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Foto in voller Größe');
  el.innerHTML = `
    <div class="fv-kopf"><span class="fv-titel"></span>
      <span class="fv-knoepfe">
        <button type="button" data-fv="aus" aria-label="Verkleinern">−</button>
        <button type="button" data-fv="ein" aria-label="Vergrößern">+</button>
        <button type="button" data-fv="loeschen" aria-label="Foto löschen">🗑</button>
        <button type="button" data-fv="zu" aria-label="Schließen">✕</button>
      </span></div>
    <div class="fv-buehne"><img alt="" draggable="false"><span class="fv-laedt">Wird geladen …</span></div>
    <button type="button" class="fv-pfeil fv-zurueck" data-fv="zurueck" aria-label="Voriges Foto">‹</button>
    <button type="button" class="fv-pfeil fv-weiter" data-fv="weiter" aria-label="Nächstes Foto">›</button>`;
  document.body.appendChild(el);
  const img = el.querySelector('img')!;
  const buehne = el.querySelector<HTMLElement>('.fv-buehne')!;

  const anwenden = (weich = false) => {
    // nicht weiter als bis zum Bildrand schieben
    const r = buehne.getBoundingClientRect();
    const mx = Math.max(0, (img.offsetWidth * s - r.width) / 2); const my = Math.max(0, (img.offsetHeight * s - r.height) / 2);
    tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
    img.style.transition = weich ? 'transform .2s ease' : 'none';
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    el.classList.toggle('gezoomt', s > 1.01);
  };
  const zoomen = (neu: number, px?: number, py?: number) => {
    const r = buehne.getBoundingClientRect();
    const cx = (px ?? r.left + r.width / 2) - (r.left + r.width / 2);
    const cy = (py ?? r.top + r.height / 2) - (r.top + r.height / 2);
    const z = Math.max(1, Math.min(6, neu));
    // Punkt unter dem Finger bleibt stehen
    tx = cx - ((cx - tx) * z) / s; ty = cy - ((cy - ty) * z) / s;
    s = z;
    if (s === 1) { tx = 0; ty = 0; }
  };
  const laden = async () => {
    const f = liste[i];
    if (!f) { schliessen(); return; }
    s = 1; tx = 0; ty = 0; anwenden();
    el.querySelector('.fv-titel')!.textContent = `${FOTO_SPARTEN[f.sparte]} · ${formatDateTime(f.zeitpunkt)} · ${i + 1} von ${liste.length}`;
    el.querySelector<HTMLElement>('.fv-zurueck')!.hidden = i === 0;
    el.querySelector<HTMLElement>('.fv-weiter')!.hidden = i >= liste.length - 1;
    el.classList.add('laedt');
    try {
      const u = (await fotos.url(f.id, 'vorschau')) || '';
      if (liste[i] === f && u && !img.src) img.src = u; // erst unscharf, dann scharf
      const v = await fotos.url(f.id, 'voll');
      if (liste[i] !== f) return;
      img.src = v || u;
    } catch (err) { toast((err as Error).message || 'Foto nicht lesbar.', 'error'); }
    el.classList.remove('laedt');
  };
  const blaettern = (n: number) => { const z = i + n; if (z < 0 || z >= liste.length) return; i = z; img.removeAttribute('src'); laden(); };
  const schliessen = () => { el.remove(); document.removeEventListener('keydown', taste, true); vorher?.focus?.(); };
  const taste = (ev: KeyboardEvent) => {
    if (document.querySelector('dialog[open]')) return; // Rückfrage offen
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); schliessen(); }
    else if (ev.key === 'ArrowRight') blaettern(1);
    else if (ev.key === 'ArrowLeft') blaettern(-1);
    else if (ev.key === '+' || ev.key === '=') { zoomen(s * 1.5); anwenden(true); }
    else if (ev.key === '-') { zoomen(s / 1.5); anwenden(true); }
  };
  document.addEventListener('keydown', taste, true);

  el.addEventListener('click', async (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-fv]');
    if (!b) return;
    const a = b.dataset.fv;
    if (a === 'zu') schliessen();
    else if (a === 'weiter') blaettern(1);
    else if (a === 'zurueck') blaettern(-1);
    else if (a === 'ein') { zoomen(s * 1.5); anwenden(true); }
    else if (a === 'aus') { zoomen(s / 1.5); anwenden(true); }
    else if (a === 'loeschen') {
      const f = liste[i];
      if (!f || !(await bestaetigen('Foto löschen?', 'Das Foto wird endgültig gelöscht.', 'Löschen'))) return;
      store.mutate((d) => { const x = d.kunden.find((y) => y.id === kundeId); if (x) { x.fotos = x.fotos.filter((y) => y.id !== f.id); x.updatedAt = nowIso(); } });
      await fotos.loeschen([f.id]).catch(() => {});
      liste = liste.filter((y) => y.id !== f.id);
      geaendert();
      toast('Foto gelöscht', 'ok');
      if (!liste.length) { schliessen(); return; }
      i = Math.min(i, liste.length - 1);
      img.removeAttribute('src');
      laden();
    }
  });

  // Gesten: zwei Finger zoomen, ein Finger verschiebt (gezoomt) oder wischt (nicht gezoomt), Doppeltipp
  const finger = new Map<number, { x: number; y: number }>();
  let pinch: { d: number; s: number } | null = null;
  let wisch: { x: number; y: number; tx: number; ty: number } | null = null;
  let letzterTipp = 0;
  const abstand = () => { const [a, b] = [...finger.values()]; return Math.hypot(a!.x - b!.x, a!.y - b!.y); };
  const mitte = () => { const [a, b] = [...finger.values()]; return { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 }; };
  buehne.addEventListener('pointerdown', (ev) => {
    buehne.setPointerCapture(ev.pointerId);
    finger.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (finger.size === 2) { pinch = { d: abstand(), s }; wisch = null; } else if (finger.size === 1) wisch = { x: ev.clientX, y: ev.clientY, tx, ty };
  });
  buehne.addEventListener('pointermove', (ev) => {
    if (!finger.has(ev.pointerId)) return;
    finger.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && finger.size >= 2) { const m = mitte(); zoomen((pinch.s * abstand()) / pinch.d, m.x, m.y); anwenden(); }
    else if (wisch && s > 1.01) { tx = wisch.tx + ev.clientX - wisch.x; ty = wisch.ty + ev.clientY - wisch.y; anwenden(); }
  });
  const ende = (ev: PointerEvent) => {
    if (!finger.has(ev.pointerId)) return;
    finger.delete(ev.pointerId);
    if (finger.size < 2) pinch = null;
    if (wisch && finger.size === 0) {
      const dx = ev.clientX - wisch.x; const dy = ev.clientY - wisch.y;
      if (s <= 1.01 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) blaettern(dx < 0 ? 1 : -1);
      else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const jetzt = Date.now();
        if (jetzt - letzterTipp < 320) { zoomen(s > 1.01 ? 1 : 2.5, ev.clientX, ev.clientY); anwenden(true); letzterTipp = 0; } else letzterTipp = jetzt;
      }
      wisch = null;
    }
  };
  buehne.addEventListener('pointerup', ende);
  buehne.addEventListener('pointercancel', ende);
  buehne.addEventListener('wheel', (ev) => { ev.preventDefault(); zoomen(s * (ev.deltaY < 0 ? 1.15 : 1 / 1.15), ev.clientX, ev.clientY); anwenden(); }, { passive: false });
  img.addEventListener('load', () => anwenden());
  window.addEventListener('resize', () => anwenden(), { once: true });

  el.querySelector<HTMLElement>('[data-fv=zu]')!.focus();
  laden();
}
