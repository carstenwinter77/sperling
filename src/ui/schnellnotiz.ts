// Sperling – Schnellnotiz: Notiz zu einem Kunden in einem kleinen Fenster, ohne die Kundenseite
// zu öffnen. Ohne Vorgabe wählt man den Kunden per Suche. Optional gleich eine Wiedervorlage.
import { esc, localInputToIso, nowIso } from '../core/util.ts';
import { SPARTEN, SPARTEN_KEYS, neueNotiz, neuerTermin, kundenTitel, adresseEinzeilig, type Sparte } from '../core/model.ts';
import * as store from '../storage/store.ts';
import * as kundenwahl from './kundenwahl.ts';
import * as schnellwahl from './schnellwahl.ts';
import { dialog, toast } from './dom.ts';

/** Bereiche, in denen der Kunde aktiv ist; genau einer wird vorausgewählt. */
function vorauswahl(kundeId: string): Sparte[] {
  const k = store.findKunde(kundeId);
  if (!k) return [];
  const aktiv = SPARTEN_KEYS.filter((s) => !['unbekannt', 'kein_interesse'].includes(k.status[s]));
  return aktiv.length === 1 ? aktiv : [];
}

/** Gibt true zurück, wenn gespeichert wurde. */
export async function schnellNotiz(kundeId = ''): Promise<boolean> {
  const k = kundeId ? store.findKunde(kundeId) : null;
  const vor = k ? vorauswahl(k.id) : [];
  const html = `
    ${k ? `<p class="hinweis">Zu <b>${esc(kundenTitel(k))}</b></p><input type="hidden" name="kundeId" value="${esc(k.id)}">` : kundenwahl.html('kundeId', 'Kunde', '', { leerErlaubt: false })}
    <label>Notiz <textarea name="text" rows="4" maxlength="50000" placeholder="Was wurde besprochen? Diktieren geht über das Mikrofon der Tastatur." required></textarea></label>
    <fieldset class="sparten-wahl"><legend>Worüber wurde gesprochen?</legend>${SPARTEN_KEYS.map((s) => `
      <label class="check"><input type="checkbox" name="sparte" value="${s}" ${vor.includes(s) ? 'checked' : ''}> ${esc(SPARTEN[s].label)}</label>`).join('')}</fieldset>
    <fieldset class="abhaken-folge"><legend>Wiedervorlage <small>(freiwillig)</small></legend>
      ${schnellwahl.html('wv')}
      <label>Am <input type="datetime-local" name="wv"></label>
    </fieldset>`;
  const res = await dialog<{ kundeId: string; text: string; sparten: Sparte[]; wv: string }>({
    titel: '📝 Notiz',
    html,
    onOpen: (dlg) => {
      kundenwahl.verdrahten(dlg);
      // Bei Kundenwahl die Bereichs-Vorauswahl übernehmen
      dlg.querySelector<HTMLInputElement>('[data-kundenwahl] input[type=hidden]')?.addEventListener('change', (ev) => {
        const v = vorauswahl((ev.target as HTMLInputElement).value);
        dlg.querySelectorAll<HTMLInputElement>('[name=sparte]').forEach((c) => { c.checked = v.includes(c.value as Sparte); });
      });
      setTimeout(() => dlg.querySelector<HTMLElement>(k ? '[name=text]' : '.kw-eingabe')?.focus(), 50);
    },
    knoepfe: [{
      label: 'Notiz speichern', primaer: true,
      pruefen: (dlg) => {
        if (!dlg.querySelector<HTMLInputElement>('[name=kundeId]')!.value) return 'Bitte einen Kunden wählen.';
        if (!dlg.querySelector<HTMLTextAreaElement>('[name=text]')!.value.trim()) return 'Bitte einen Text eingeben.';
        const wv = dlg.querySelector<HTMLInputElement>('[name=wv]')!.value;
        if (wv && !localInputToIso(wv)) return 'Bitte ein gültiges Datum für die Wiedervorlage wählen.';
        return null;
      },
      wert: (dlg) => ({
        kundeId: dlg.querySelector<HTMLInputElement>('[name=kundeId]')!.value,
        text: dlg.querySelector<HTMLTextAreaElement>('[name=text]')!.value.trim(),
        sparten: Array.from(dlg.querySelectorAll<HTMLInputElement>('[name=sparte]:checked'), (c) => c.value as Sparte),
        wv: localInputToIso(dlg.querySelector<HTMLInputElement>('[name=wv]')!.value) || '',
      }),
    }],
  });
  if (!res || !store.findKunde(res.kundeId)) return false;
  const jetzt = nowIso();
  store.mutate((d) => {
    const x = d.kunden.find((y) => y.id === res.kundeId);
    if (!x) return;
    x.notizen.push(neueNotiz({ text: res.text, zeitpunkt: jetzt, sparten: res.sparten }));
    x.updatedAt = jetzt;
    if (res.wv) {
      const titel = res.text.split('\n')[0].slice(0, 80);
      d.termine.push(neuerTermin({ art: 'wiedervorlage', titel: `Nachfassen: ${titel}`, kundeId: x.id, sparte: res.sparten.length === 1 ? res.sparten[0] : '', beginn: res.wv, ort: adresseEinzeilig(x) }));
    }
  });
  toast(res.wv ? 'Notiz und Wiedervorlage gespeichert' : 'Notiz gespeichert', 'ok');
  return true;
}
