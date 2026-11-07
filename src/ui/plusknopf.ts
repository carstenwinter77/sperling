// Sperling – schwebender „+“-Knopf: Notiz, Termin/Wiedervorlage oder neuer Kunde von überall.
// Ist gerade ein Kunde geöffnet, gehören Notiz und Termin automatisch zu ihm.
// Nicht im Beratungs-Schutz, nicht im Gesprächsmodus und nur auf den Seiten, wo er hilft.
import { esc } from '../core/util.ts';
import { kundenTitel, neuerKunde } from '../core/model.ts';
import * as store from '../storage/store.ts';
import { dialog } from './dom.ts';
import { terminDialog } from './parts.ts';
import { schnellNotiz } from './schnellnotiz.ts';

/** Seiten mit „+“ (Pfad ohne #). Gesprächsmodus /kunde/…/gespraech gehört nicht dazu. */
const SEITEN = [/^\/?$/, /^\/kunden$/, /^\/kunde\/[\w-]+$/, /^\/(termine|kalender)$/];

function pfad(): string { return (location.hash.replace(/^#/, '') || '/').split('?')[0]; }

/** ID des gerade geöffneten Kunden (nur auf der Kundenseite). */
export function offenerKunde(p = pfad()): string {
  const m = p.match(/^\/kunde\/([\w-]+)$/);
  return m && store.findKunde(m[1]) ? m[1] : '';
}

export function sichtbar(p = pfad()): boolean {
  return store.isUnlocked() && !store.schutzKunde() && SEITEN.some((r) => r.test(p));
}

function zeigen() {
  const b = document.querySelector<HTMLButtonElement>('#plusKnopf');
  if (!b) return;
  b.hidden = !sichtbar();
  document.body.classList.toggle('plus-da', !b.hidden);
}

const neuZeichnen = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

async function menue() {
  if (!sichtbar()) return;
  const kid = offenerKunde();
  const k = kid ? store.findKunde(kid) : null;
  const zu = k ? ` <small>zu ${esc(kundenTitel(k))}</small>` : '';
  let wahl = '';
  await dialog({
    titel: 'Schnell anlegen',
    html: `<div class="plus-menue">
      <button type="button" class="btn" data-plus="notiz">📝 Notiz${zu}</button>
      <button type="button" class="btn" data-plus="termin">📅 Termin / Wiedervorlage${zu}</button>
      <button type="button" class="btn" data-plus="kunde">👤 Neuer Kunde</button>
    </div>`,
    knoepfe: [],
    onOpen: (dlg) => {
      dlg.classList.add('dlg-plus');
      dlg.querySelector('.plus-menue')?.addEventListener('click', (ev) => {
        const b = (ev.target as Element).closest<HTMLElement>('[data-plus]');
        if (!b) return;
        wahl = b.dataset.plus || '';
        dlg.close();
      });
    },
  });
  if (wahl === 'notiz') { if (await schnellNotiz(kid)) neuZeichnen(); }
  else if (wahl === 'termin') { if (await terminDialog({ kundeId: kid })) neuZeichnen(); }
  else if (wahl === 'kunde') {
    const neu = neuerKunde();
    store.mutate((d) => { d.kunden.push(neu); });
    location.hash = `#/kunde/${neu.id}?neu=1`;
  }
}

/** Einmal nach dem Aufbau des App-Rahmens aufrufen. */
let horcht = false;
export function verdrahten() {
  document.querySelector('#plusKnopf')?.addEventListener('click', () => { menue().catch((e) => console.error(e)); });
  if (!horcht) { horcht = true; window.addEventListener('hashchange', zeigen); }
  zeigen();
}

/** Nach jedem Seitenwechsel (Router) aufrufen. */
export { zeigen as aktualisieren };
