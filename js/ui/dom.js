// Sperling – DOM-Hilfen: Toasts, Dialoge, Downloads, Zwischenablage.
import { esc } from '../core/util.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let toastTimer = null;
export function toast(msg, typ = 'info', ms = 3200) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${typ}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, ms);
}

/** Modaler Dialog. Gibt Promise mit dem gewählten Wert bzw. null (Abbruch) zurück. */
export function dialog({ titel, html = '', knoepfe = [{ label: 'OK', wert: true, primaer: true }], onOpen }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'dlg';
    dlg.innerHTML = `
      <form method="dialog" class="dlg-inner">
        <h2>${esc(titel)}</h2>
        <div class="dlg-body">${html}</div>
        <div class="dlg-actions">
          <button value="__abbrechen" class="btn ghost" formnovalidate>Abbrechen</button>
          ${knoepfe.map((k, i) => `<button value="${i}" class="btn ${k.primaer ? 'primary' : ''} ${k.gefahr ? 'danger' : ''}">${esc(k.label)}</button>`).join('')}
        </div>
      </form>`;
    document.body.appendChild(dlg);
    let ergebnis = null;
    const form = dlg.querySelector('form');
    form.addEventListener('submit', (ev) => {
      const v = ev.submitter?.value;
      if (v === undefined || v === '__abbrechen') return;
      const k = knoepfe[Number(v)];
      if (k?.pruefen) {
        const fehler = k.pruefen(dlg);
        if (fehler) { ev.preventDefault(); toast(fehler, 'error'); return; }
      }
      ergebnis = typeof k?.wert === 'function' ? k.wert(dlg) : k?.wert ?? null;
    });
    dlg.addEventListener('close', () => { dlg.remove(); resolve(ergebnis); });
    dlg.showModal();
    try { onOpen?.(dlg); } catch (e) { console.error(e); }
  });
}

export function bestaetigen(titel, text, label = 'Löschen') {
  return dialog({ titel, html: `<p>${esc(text)}</p>`, knoepfe: [{ label, wert: true, gefahr: true }] }).then(Boolean);
}

export function download(dateiname, inhalt, mime = 'application/octet-stream') {
  const blob = inhalt instanceof Blob ? inhalt : new Blob([inhalt], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function kopieren(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback für ältere Browser / fehlende Berechtigung
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

/** Datei vom Nutzer wählen lassen und als Text lesen. */
export function dateiWaehlen(accept = '') {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.addEventListener('change', async () => {
      const f = inp.files?.[0];
      if (!f) return resolve(null);
      if (f.size > 50 * 1024 * 1024) { toast('Datei ist zu groß.', 'error'); return resolve(null); }
      try { resolve(await f.text()); } catch { resolve(null); }
    });
    inp.click();
  });
}

export function maskottchen(name, klasse = '', alt = '') {
  return `<img src="assets/maskottchen/${esc(name)}.png" class="maskottchen ${esc(klasse)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
}
