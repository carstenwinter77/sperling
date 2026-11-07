// Sperling – DOM-Hilfen: Toasts, Dialoge, Downloads, Zwischenablage.
import { esc } from '../core/util.ts';

export const $ = <E extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<E>(sel);
export const $$ = <E extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<E>(sel));

/** Formular mit Zugriff auf Felder per Name (form.titel.value). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Formular = HTMLFormElement & Record<string, any>;
/** Dialog-Element; querySelector('form') liefert direkt das Formular. */
export type DialogEl = { querySelector(sel: 'form'): Formular } & HTMLDialogElement;

export interface Knopf<T> {
  label: string;
  primaer?: boolean;
  gefahr?: boolean;
  /** Fehlertext zurückgeben, um den Dialog offen zu lassen. */
  pruefen?: (dlg: DialogEl) => string | null | undefined | false;
  wert?: T | ((dlg: DialogEl) => T);
}
export interface DialogOptionen<T> {
  titel: string;
  html?: string;
  knoepfe?: Knopf<T>[];
  onOpen?: (dlg: DialogEl) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(msg: string, typ = 'info', ms = 3200): void {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${typ}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, ms);
}

/** Modaler Dialog. Gibt Promise mit dem gewählten Wert bzw. null (Abbruch) zurück. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dialog<T = any>({ titel, html = '', knoepfe = [{ label: 'OK', wert: true as T, primaer: true }], onOpen }: DialogOptionen<T>): Promise<T | null> {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog') as DialogEl;
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
    let ergebnis: T | null = null;
    const form = dlg.querySelector('form');
    form.addEventListener('submit', (ev) => {
      const v = (ev.submitter as HTMLButtonElement | null)?.value;
      if (v === undefined || v === '__abbrechen') return;
      const k = knoepfe[Number(v)];
      if (k?.pruefen) {
        const fehler = k.pruefen(dlg);
        if (fehler) { ev.preventDefault(); toast(fehler, 'error'); return; }
      }
      ergebnis = typeof k?.wert === 'function' ? (k.wert as (d: DialogEl) => T)(dlg) : (k?.wert as T | undefined) ?? null;
    });
    dlg.addEventListener('close', () => { dlg.remove(); resolve(ergebnis); });
    dlg.showModal();
    try { onOpen?.(dlg); } catch (e) { console.error(e); }
  });
}

export function bestaetigen(titel: string, text: string, label = 'Löschen'): Promise<boolean> {
  return dialog<boolean>({ titel, html: `<p>${esc(text)}</p>`, knoepfe: [{ label, wert: true, gefahr: true }] }).then(Boolean);
}

export function download(dateiname: string, inhalt: BlobPart | Blob, mime = 'application/octet-stream'): void {
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

/**
 * Datei über das Teilen-Menü des Systems weitergeben (iPad/iPhone: „In Dateien sichern“
 * → iCloud Drive). Muss direkt aus einem Klick heraus aufgerufen werden (Safari verlangt das).
 * Rückgabe: 'geteilt' | 'abgebrochen' | 'heruntergeladen'.
 */
export async function teilenOderSpeichern(dateiname: string, inhalt: BlobPart | Blob, mime = 'application/octet-stream'): Promise<'geteilt' | 'abgebrochen' | 'heruntergeladen'> {
  try {
    const datei = new File([inhalt], dateiname, { type: mime });
    if (navigator.canShare?.({ files: [datei] })) {
      await navigator.share({ files: [datei], title: dateiname });
      return 'geteilt';
    }
  } catch (err) {
    if ((err as Error | null)?.name === 'AbortError') return 'abgebrochen';
    // andere Fehler: auf Download ausweichen
  }
  download(dateiname, inhalt, mime);
  return 'heruntergeladen';
}

export async function kopieren(text: string): Promise<boolean> {
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
export function dateiWaehlen(accept = ''): Promise<string | null> {
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

export function maskottchen(name: string, klasse = '', alt = ''): string {
  return `<img src="assets/maskottchen/${esc(name)}.png" class="maskottchen ${esc(klasse)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
}
