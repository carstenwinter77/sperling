// Sperling – Abhaken mit „Wie ging's aus?“: ein kleines Fenster statt Abhaken, Kunde öffnen,
// Notiz schreiben und neue Wiedervorlage anlegen. Logik in core/abhaken.ts.
import { esc, localInputToIso, formatDateTime } from '../core/util.ts';
import { kundenTitel, type Termin } from '../core/model.ts';
import { abhakenAnwenden } from '../core/abhaken.ts';
import * as store from '../storage/store.ts';
import * as schnellwahl from './schnellwahl.ts';
import { dialog, toast } from './dom.ts';

/** Kurze Bausteine für den Ausgang; Antippen hängt sie an den Text an. */
export const AUSGANG_BAUSTEINE = ['Nicht erreicht', 'Erreicht', 'Angebot geschickt', 'Meldet sich selbst', 'Kein Interesse'];

/**
 * Termin abhaken. Offener Termin: Fenster mit Notiz und nächster Wiedervorlage; erledigter Termin:
 * direkt wieder öffnen. Gibt true zurück, wenn sich etwas geändert hat.
 */
export async function abhaken(t0: Termin): Promise<boolean> {
  const d = store.getData();
  const t = d.termine.find((x) => x.id === t0.id);
  if (!t) return false;
  if (t.erledigt) {
    store.mutate((data) => { const x = data.termine.find((y) => y.id === t.id); if (x) { x.erledigt = false; x.updatedAt = new Date().toISOString(); } });
    toast('Wieder offen', 'ok');
    return true;
  }
  const k = d.kunden.find((x) => x.id === t.kundeId) || null;
  const html = `
    <p class="hinweis">${esc(t.titel || 'Termin')} · ${esc(formatDateTime(t.beginn))}${k ? ` · ${esc(kundenTitel(k))}` : ''}</p>
    ${k ? `<fieldset class="abhaken-ausgang"><legend>Wie ging's aus? <small>(freiwillig, kommt als Notiz zum Kunden)</small></legend>
      <div class="chips-filter abhaken-bausteine" role="group" aria-label="Schnelltexte">${AUSGANG_BAUSTEINE.map((b) => `<button type="button" class="chip-knopf" data-baustein="${esc(b)}">${esc(b)}</button>`).join('')}</div>
      <textarea name="text" rows="3" maxlength="5000" placeholder="Kurz notieren oder diktieren …" aria-label="Wie ging's aus?"></textarea>
    </fieldset>` : ''}
    <fieldset class="abhaken-folge"><legend>Nächste Wiedervorlage <small>(freiwillig)</small></legend>
      ${schnellwahl.html('folge')}
      <div class="row2">
        <label>Am <input type="datetime-local" name="folge"></label>
        <label>Titel <input name="folgeTitel" value="${esc(t.titel)}" maxlength="300"></label>
      </div>
      <button type="button" class="btn klein ghost" data-keine hidden>Keine Wiedervorlage</button>
    </fieldset>`;
  const res = await dialog<{ text: string; folge: string; folgeTitel: string }>({
    titel: '✓ Erledigt',
    html,
    onOpen: (dlg) => {
      dlg.classList.add('dlg-abhaken');
      const text = dlg.querySelector<HTMLTextAreaElement>('[name=text]');
      const folge = dlg.querySelector<HTMLInputElement>('[name=folge]')!;
      const keine = dlg.querySelector<HTMLButtonElement>('[data-keine]')!;
      const zeigen = () => { keine.hidden = !folge.value; };
      folge.addEventListener('input', zeigen);
      folge.addEventListener('change', zeigen);
      keine.addEventListener('click', () => {
        folge.value = '';
        dlg.querySelectorAll('[data-wv-schritt]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        zeigen();
      });
      dlg.querySelector('.abhaken-bausteine')?.addEventListener('click', (ev) => {
        const b = (ev.target as Element).closest<HTMLElement>('[data-baustein]');
        if (!b || !text) return;
        const v = text.value.trim();
        text.value = v ? `${v}. ${b.dataset.baustein}` : b.dataset.baustein || '';
        text.dispatchEvent(new Event('input', { bubbles: true }));
        text.focus();
      });
    },
    knoepfe: [{
      label: '✓ Erledigt', primaer: true,
      pruefen: (dlg) => {
        const f = dlg.querySelector<HTMLInputElement>('[name=folge]')!;
        return f.value && !localInputToIso(f.value) ? 'Bitte ein gültiges Datum wählen oder „Keine Wiedervorlage“.' : null;
      },
      wert: (dlg) => ({
        text: dlg.querySelector<HTMLTextAreaElement>('[name=text]')?.value || '',
        folge: localInputToIso(dlg.querySelector<HTMLInputElement>('[name=folge]')!.value) || '',
        folgeTitel: dlg.querySelector<HTMLInputElement>('[name=folgeTitel]')!.value,
      }),
    }],
  });
  if (!res) return false;
  let folge: Termin | null = null;
  store.mutate((data) => { folge = abhakenAnwenden(data, t.id, { text: res.text, folgeBeginn: res.folge, folgeTitel: res.folgeTitel }); });
  const f = folge as Termin | null;
  toast(f ? `Erledigt · nächste Wiedervorlage ${formatDateTime(f.beginn)}` : 'Erledigt', 'ok', 4000);
  return true;
}
