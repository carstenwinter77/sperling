// Sperling – Aus der Kundenansicht verleihen oder verkaufen: Block „Aus meinem Bestand“,
// Geräteauswahl (Kunde steht fest) und Verkaufsdialog. Zeigt nie Namen anderer Kunden (Beratungs-Schutz).
import { esc, nowIso, formatDate, parseNumber } from '../core/util.ts';
import { kundenTitel, offenerVerleih, type Geraet } from '../core/model.ts';
import { geraeteFuerKunde, verleihbar, verkaufbar, verkaufBuchen, gekaufteGeraete, euro, type GeraetFuerKunde } from '../core/bestandkunde.ts';
import * as store from '../storage/store.ts';
import { dialog, toast } from './dom.ts';
import * as kundenwahl from './kundenwahl.ts';
import { verleihDialog } from './views/bestand.ts';
import { buchenDialog } from './material.ts';
import { vorwerkKaufFolge } from './vertrieb.ts';

type Art = 'verleihen' | 'verkaufen';

const LAGE_TEXT = (x: GeraetFuerKunde, art: Art): string => {
  switch (x.lage) {
    case 'reserviert': return `für diesen Kunden reserviert ab ${formatDate(x.reservierung!.von)}`;
    case 'beimKunden': return art === 'verkaufen' ? 'ist gerade bei ihm (Leihgabe wird abgeschlossen)' : 'ist schon bei ihm';
    case 'frei': return 'im Auto';
    case 'fremdReserviert': return `ab ${formatDate(x.fremde[0].von)} anderweitig reserviert`;
    default: return x.verleih ? 'gerade verliehen' : 'heute anderweitig reserviert';
  }
};

/** Block für die Übersicht des Kunden. */
export function blockHtml(kundeId: string): string {
  const d = store.getData();
  const offen = d.leihvorgaenge.filter((l) => l.kundeId === kundeId && !l.rueckgabe);
  const gekauft = gekaufteGeraete(d, kundeId);
  const name = (id: string) => d.geraete.find((g) => g.id === id)?.name || 'Gerät';
  return `
    <section class="karte-box bestand-kunde" id="bestandKunde">
      <h2>📦 Aus meinem Bestand</h2>
      ${offen.length ? `<ul class="liste">${offen.map((l) => `<li class="zeile"><span class="zeile-haupt"><strong>${esc(name(l.geraetId))}</strong><small>geliehen seit ${esc(formatDate(l.ausgabe))}${l.rueckgabeGeplant ? `, zurück bis ${esc(formatDate(l.rueckgabeGeplant))}` : ''}</small></span><span class="pill pill-verliehen">Leihgabe</span></li>`).join('')}</ul>` : ''}
      ${gekauft.length ? `<ul class="liste">${gekauft.map((g) => `<li class="zeile"><span class="zeile-haupt"><strong>${esc(g.name)}</strong><small>gekauft am ${esc(formatDate(g.verkauf!.datum))}${g.verkauf!.preis !== null ? ` · ${esc(euro(g.verkauf!.preis))}` : ''}</small></span><span class="pill pill-kauf-gekauft">Gekauft</span></li>`).join('')}</ul>` : ''}
      ${!offen.length && !gekauft.length ? '<p class="hinweis">Gib ein Vorführgerät als Leihgabe mit oder buche einen Verkauf. Der Kunde ist schon eingetragen.</p>' : ''}
      <div class="knopfreihe">
        <button type="button" class="btn" data-bestand-kunde="verleihen">📦 Gerät verleihen</button>
        <button type="button" class="btn" data-bestand-kunde="verkaufen">🛒 Gerät verkaufen</button>
        ${(d.material || []).some((m) => m.aktiv && m.bestand > 0) ? '<button type="button" class="btn" data-bestand-kunde="muster">🧴 Muster mitgeben</button>' : ''}
        ${offen.length ? '<a class="btn ghost" href="#/bestand">Zum Bestand</a>' : ''}
      </div>
    </section>`;
}

/** Klicks im Block verdrahten; `fertig` zeichnet die Ansicht neu. */
export function verdrahten(root: Element, kundeId: string, fertig: () => void) {
  root.querySelector('#bestandKunde')?.addEventListener('click', async (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-bestand-kunde]');
    if (!b) return;
    if (b.dataset.bestandKunde === 'muster') { if (await buchenDialog('abgang', null, kundeId)) fertig(); return; }
    if (await ausBestand(kundeId, b.dataset.bestandKunde as Art)) fertig();
  });
}

/** Gerät wählen (Kunde steht fest), dann Verleih- oder Verkaufsdialog. */
export async function ausBestand(kundeId: string, art: Art): Promise<boolean> {
  const d = store.getData();
  const k = d.kunden.find((x) => x.id === kundeId);
  if (!k) return false;
  const liste = geraeteFuerKunde(d, kundeId);
  if (!liste.length) { toast('Im Bestand ist kein Gerät. Lege die Geräte unter „Vorführbestand“ an.', 'error', 5000); return false; }
  const darf = art === 'verleihen' ? verleihbar : verkaufbar;
  if (!liste.some(darf)) { toast(art === 'verleihen' ? 'Gerade ist kein Gerät frei.' : 'Gerade ist kein Gerät verfügbar.', 'error'); return false; }
  const id = await dialog<string>({
    titel: art === 'verleihen' ? `Gerät an ${kundenTitel(k)} verleihen` : `Gerät an ${kundenTitel(k)} verkaufen`,
    html: `
      ${liste.length > 6 ? '<input type="search" class="gw-suche" placeholder="Gerät oder Seriennummer suchen …" autocomplete="off" aria-label="Gerät suchen">' : ''}
      <ul class="gw-liste" role="radiogroup" aria-label="Gerät">
        ${liste.map((x, i) => `<li><label class="gw-eintrag ${darf(x) ? '' : 'gw-belegt'}" data-such="${esc(`${x.g.name} ${x.g.seriennummer}`.toLowerCase())}">
          <input type="radio" name="gw" value="${esc(x.g.id)}" ${darf(x) ? '' : 'disabled'} ${i === 0 && darf(x) ? 'checked' : ''}>
          <span><b>${esc(x.g.name)}</b>${x.g.seriennummer ? ` <small>SN ${esc(x.g.seriennummer)}</small>` : ''}<small class="gw-lage">${esc(LAGE_TEXT(x, art))}</small></span>
        </label></li>`).join('')}
      </ul>`,
    onOpen: (dlg) => {
      const such = dlg.querySelector<HTMLInputElement>('.gw-suche');
      such?.addEventListener('input', () => {
        const q = such.value.trim().toLowerCase();
        dlg.querySelectorAll<HTMLElement>('.gw-eintrag').forEach((e) => { e.parentElement!.hidden = !!q && !e.dataset.such!.includes(q); });
      });
      if (!dlg.querySelector('input[name=gw]:checked')) dlg.querySelector<HTMLInputElement>('input[name=gw]:not([disabled])')!.checked = true;
    },
    knoepfe: [{
      label: 'Weiter', primaer: true,
      pruefen: (dlg) => (dlg.querySelector('input[name=gw]:checked') ? null : 'Bitte ein Gerät wählen.'),
      wert: (dlg) => dlg.querySelector<HTMLInputElement>('input[name=gw]:checked')!.value,
    }],
  });
  if (!id) return false;
  const x = geraeteFuerKunde(store.getData(), kundeId).find((y) => y.g.id === id);
  if (!x || !darf(x)) { toast('Das Gerät ist nicht mehr verfügbar.', 'error'); return false; }
  if (art === 'verkaufen') return verkaufDialog(x.g, kundeId);
  return verleihDialog(x.g, x.reservierung, '', kundeId);
}

/** Verkauf buchen. Ohne `kundeId` wird der Kunde per Suche gewählt (aus dem Bestand heraus). */
export async function verkaufDialog(g: Geraet, kundeId = ''): Promise<boolean> {
  const d = store.getData();
  const l = offenerVerleih(d, g.id);
  const vorgabe = kundeId || l?.kundeId || '';
  const heute = nowIso().slice(0, 10);
  const lokalHeute = (() => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; })();
  const res = await dialog<{ kundeId: string; datum: string; preis: number | null; notiz: string; statusSetzen: boolean }>({
    titel: `${g.name} verkaufen`,
    html: `
      ${kundeId || l ? '' : kundenwahl.html('kunde', 'An Kunde', '', { leerErlaubt: false })}
      ${kundeId || l ? `<input type="hidden" name="kunde" value="${esc(vorgabe)}"><p>${esc((() => { const kk = d.kunden.find((x) => x.id === vorgabe); return kk ? `An ${kundenTitel(kk)}` : ''; })())}</p>` : ''}
      ${g.seriennummer ? `<p class="hinweis">SN ${esc(g.seriennummer)}</p>` : ''}
      ${l && l.kundeId === vorgabe ? '<p class="hinweis">Das Gerät ist gerade bei diesem Kunden als Leihgabe. Die Leihgabe wird als „gekauft“ abgeschlossen.</p>' : ''}
      <div class="row2">
        <label>Verkauft am<input type="date" name="datum" value="${esc(lokalHeute || heute)}" max="${esc(lokalHeute)}" required></label>
        <label>Preis in € (optional)<input name="preis" inputmode="decimal" placeholder="z. B. 799,00" autocomplete="off"></label>
      </div>
      <label>Notiz (optional)<textarea name="notiz" rows="2" maxlength="2000" placeholder="z. B. mit Zubehör, Rechnung folgt"></textarea></label>
      <label class="check"><input type="checkbox" name="status" checked> Vorwerk-Status auf „Abschluss / Kunde“ setzen</label>
      <p class="hinweis">Das Gerät verlässt danach den Bestand und bleibt im Verlauf sichtbar.</p>`,
    onOpen: (dlg) => { if (!kundeId && !l) kundenwahl.verdrahten(dlg); },
    knoepfe: [{
      label: 'Verkauf buchen', primaer: true,
      pruefen: (dlg) => {
        const f = dlg.querySelector('form')!;
        if (!f.kunde.value) return 'Bitte einen Kunden wählen.';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(f.datum.value)) return 'Bitte ein gültiges Datum wählen.';
        const p = f.preis.value.trim();
        if (p && (parseNumber(p.replace(/\.(?=\d{3}(\D|$))/g, '').replace(/€/g, '')) === null || (parseNumber(p.replace(/\.(?=\d{3}(\D|$))/g, '').replace(/€/g, '')) as number) < 0)) return 'Preis bitte als Zahl, z. B. 799,00.';
        return null;
      },
      wert: (dlg) => {
        const f = dlg.querySelector('form')!;
        const p = f.preis.value.trim().replace(/\.(?=\d{3}(\D|$))/g, '').replace(/€/g, '');
        return { kundeId: f.kunde.value, datum: new Date(`${f.datum.value}T12:00`).toISOString(), preis: p ? parseNumber(p) : null, notiz: f.notiz.value.trim(), statusSetzen: f.status.checked };
      },
    }],
  });
  if (!res) return false;
  let weg = 0;
  try {
    store.mutate((data) => { weg = verkaufBuchen(data, g.id, res, nowIso()).length; });
  } catch (e) { toast((e as Error).message, 'error'); return false; }
  toast(`Verkauf gebucht${weg ? `, ${weg} Reservierung${weg > 1 ? 'en' : ''} entfernt` : ''}`, 'ok', 4500);
  await vorwerkKaufFolge(res.kundeId, g.name);
  return true;
}
