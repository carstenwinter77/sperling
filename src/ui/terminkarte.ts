// Sperling – Termin-Karte: Antippen eines Termins zeigt alles Wichtige und bietet
// Route, Anrufen, E-Mail, Kalender-Export, Erledigt, Bearbeiten und Löschen (mit Sicherheitsabfrage).
import { esc, formatDateTime } from '../core/util.ts';
import { SPARTEN, kundenTitel, adresseEinzeilig, type Termin } from '../core/model.ts';
import { kundenVerlauf } from '../core/verlauf.ts';
import * as pk from '../core/papierkorb.ts';
import * as store from '../storage/store.ts';
import { dialog, bestaetigen, toast } from './dom.ts';
import { terminDialog, icsExport } from './parts.ts';
import { naviLink } from './navi.ts';
import { abhaken } from './abhaken.ts';
import { anrufen, emailSchreiben } from './kontakt.ts';
import { bestaetigungSenden } from './vertrieb.ts';

const uhr = (d: Date) => d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

/** Zeigt die Karte. Gibt true zurück, wenn sich am Termin etwas geändert hat. */
export async function terminKarte(t0: Termin): Promise<boolean> {
  const d = store.getData();
  const t = d.termine.find((x) => x.id === t0.id) || t0;
  const k = d.kunden.find((x) => x.id === t.kundeId) || null;
  const beginn = new Date(t.beginn);
  const ende = new Date(beginn.getTime() + (t.dauerMin || 0) * 60000);
  const zeit = `${formatDateTime(t.beginn)}${t.dauerMin ? ` – ${uhr(ende)}` : ''}`;
  const ort = t.ort || (k ? adresseEinzeilig(k) : '');
  const route = t.ort ? naviLink({ ort: t.ort }) : naviLink(k);
  const bisher = k ? kundenVerlauf(d, k).filter((v) => v.art === 'gespraech' || v.art === 'notiz').slice(0, 2) : [];
  let aktion = '';

  const html = `
    <div class="termin-karte">
      <p class="tags"><span class="tag">${t.art === 'termin' ? 'Termin' : 'Wiedervorlage'}</span>${t.sparte ? ` <span class="tag tag-${t.sparte}">${esc(SPARTEN[t.sparte].label)}</span>` : ''}${t.erledigt ? ' <span class="tag">erledigt</span>' : ''}</p>
      <p class="tk-zeit"><b>${esc(zeit)}</b></p>
      ${ort ? `<p>📍 ${esc(ort)}</p>` : ''}
      ${k ? `<p>👤 <a href="#/kunde/${esc(k.id)}" data-tk-link>${esc(kundenTitel(k))}</a>${k.telefon ? ` · ${esc(k.telefon)}` : ''}${k.email ? ` · ${esc(k.email)}` : ''}</p>` : ''}
      ${t.notiz ? `<p class="tk-notiz">${esc(t.notiz).replace(/\n/g, '<br>')}</p>` : ''}
      <div class="knopfreihe tk-aktionen">
        ${k && !t.erledigt ? `<a class="btn primary" href="#/kunde/${esc(k.id)}/gespraech?termin=${esc(t.id)}" data-tk-link>💬 Gespräch starten</a>` : ''}
        ${route ? `<a class="btn" href="${esc(route)}" target="_blank" rel="noopener">🚗 Route</a>` : ''}
        ${k?.telefon ? '<button type="button" class="btn" data-tk="anrufen">📞 Anrufen</button>' : ''}
        ${k?.email ? '<button type="button" class="btn" data-tk="mail">✉️ E-Mail</button>' : ''}
        ${k && t.art === 'termin' && !t.erledigt && t.beginn > new Date().toISOString() ? '<button type="button" class="btn" data-tk="bestaetigen">✅ Termin bestätigen</button>' : ''}
        <button type="button" class="btn ghost" data-tk="erledigt">${t.erledigt ? '↺ Wieder offen' : '✓ Erledigt'}</button>
        <button type="button" class="btn ghost" data-tk="ics">📅 In Kalender-App</button>
      </div>
      ${bisher.length ? `<h3>Zuletzt mit ${esc(kundenTitel(k!))}</h3><ul class="gm-bisher">${bisher.map((v) => `<li><b>${esc(formatDateTime(v.zeitpunkt))}</b> · ${esc(v.titel)}<p>${esc(v.zeilen.join('\n')).replace(/\n/g, '<br>')}</p></li>`).join('')}</ul>` : ''}
    </div>`;

  const wahl = await dialog<string>({
    titel: t.titel || 'Termin',
    html,
    knoepfe: [{ label: '🗑 Löschen', wert: 'loeschen', gefahr: true }, { label: '✎ Bearbeiten', wert: 'bearbeiten', primaer: true }],
    onOpen: (dlg) => {
      dlg.classList.add('dlg-termin');
      const zu = dlg.querySelector<HTMLElement>('.dlg-actions button.ghost');
      if (zu) zu.textContent = 'Schließen';
      dlg.querySelector('.termin-karte')?.addEventListener('click', (ev) => {
        const el = ev.target as Element;
        if (el.closest('[data-tk-link]')) { dlg.close(); return; }
        const b = el.closest<HTMLElement>('[data-tk]');
        if (!b) return;
        aktion = b.dataset.tk || '';
        dlg.close();
      });
    },
  });
  const a = aktion || wahl || '';
  if (a === 'anrufen' && k) { anrufen(kundenTitel(k), k.telefon); return false; }
  if (a === 'mail' && k) {
    const anrede = k.nachname ? `Guten Tag ${[k.anrede, k.nachname].filter(Boolean).join(' ')},` : 'Guten Tag,';
    const gruss = d.einstellungen.absender;
    emailSchreiben({ an: k.email, betreff: t.titel || '', text: `${anrede}\n\n\n\nViele Grüße${gruss ? `\n${gruss}` : ''}` });
    return false;
  }
  if (a === 'bestaetigen' && k) { await bestaetigungSenden(t); return false; }
  if (a === 'ics') { icsExport([t], `termin-${(t.titel || 'sperling').replace(/[^\wäöüÄÖÜß-]+/g, '_').slice(0, 40)}.ics`); return false; }
  if (a === 'erledigt') {
    return abhaken(t);
  }
  if (a === 'bearbeiten') return !!(await terminDialog({ termin: t }));
  if (a === 'loeschen') {
    if (!(await bestaetigen('Termin löschen?', `„${t.titel || 'Termin'}“ am ${formatDateTime(t.beginn)}. Er bleibt unter „Gelöscht“ wiederherstellbar.`, 'Termin löschen'))) return false;
    store.mutate((data) => { pk.terminLoeschen(data, t.id); });
    toast('Termin gelöscht – unter „Gelöscht“ wiederherstellbar', 'ok');
    return true;
  }
  return false;
}
