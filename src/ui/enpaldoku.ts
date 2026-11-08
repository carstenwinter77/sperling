// Sperling – Enpal-Gesprächsdokumentation (Lead-Nachweis).
// Enpal verlangt eine Dokumentation je Kontakt (Telefon, später Hausbesuch). Sperling
// speichert sie beim Kunden und liefert einen kopierfertigen Text für die Enpal-App.
// Nur PV/WP – Vorwerk kommt hier nie vor (R-TEXT).
import * as schnellwahl from './schnellwahl.ts';
import * as terminwahl from './terminwahl.ts';
import { TERMIN_DAUER } from '../core/terminfinder.ts';
import { statusFuerAusgang, wvDatum } from '../core/verzahnung.ts';
import { bestaetigungAnbieten } from './parts.ts';
import { esc, nowIso, isoToLocalInput, localInputToIso, formatDateTime } from '../core/util.ts';
import { AUSGANG, KONTAKTART, SPARTEN, kundenName, kundenTitel, adresseEinzeilig, normalizeEnpalKontakt, neuerTermin, type Termin } from '../core/model.ts';
import { enpalDokuText, enpalVerlaufText } from '../core/textgen.ts';
import * as store from '../storage/store.ts';
import * as pk from '../core/papierkorb.ts';
import { dialog, toast, kopieren, bestaetigen } from './dom.ts';

/**
 * Dialog zum Anlegen/Bearbeiten. Gibt die Kontakt-ID zurück oder null.
 * „Termin vereinbart“ (ab 0.16.0): das Datum ist Pflicht (Kalender mit freien Zeiten oder „Datum noch offen“),
 * beim Speichern entsteht ein echter Termin und der Status der Themen geht auf „Termin vereinbart“.
 * Der neu angelegte Termin steht danach in `zuletztTermin` (für die Terminbestätigung).
 */
export let zuletztTermin: Termin | null = null;
export async function kontaktDialog(kundeId: string, { kontaktId = null as string | null, art = 'telefon' } = {}) {
  const k = store.findKunde(kundeId);
  if (!k) return null;
  const alt = kontaktId ? k.enpalKontakte.find((c) => c.id === kontaktId) : null;
  const c = alt || normalizeEnpalKontakt({ art, gespraechspartner: kundenName(k, 'vorname'), themen: ['pv', 'wp'].filter((s) => !['unbekannt', 'kein_interesse'].includes(k.status[s])) });
  const res = await dialog({
    titel: alt ? 'Enpal-Kontakt bearbeiten' : `${KONTAKTART[c.art]} dokumentieren`,
    html: `
      <div class="formgrid">
        <label>Kontaktart<select name="art">${Object.entries(KONTAKTART).map(([key, v]) => `<option value="${key}" ${key === c.art ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <label>Zeitpunkt<input type="datetime-local" name="zeitpunkt" value="${esc(isoToLocalInput(c.zeitpunkt))}" required></label>
        <label class="check"><input type="checkbox" name="erreicht" ${c.erreicht ? 'checked' : ''}> Kunde erreicht</label>
        <label>Gesprächspartner<input name="partner" value="${esc(c.gespraechspartner)}" maxlength="200"></label>
        <fieldset class="breit themen"><legend>Themen</legend>
          ${(['pv', 'wp'] as const).map((s) => `<label class="check"><input type="checkbox" name="thema" value="${s}" ${c.themen.includes(s) ? 'checked' : ''}> ${esc(SPARTEN[s].label)}</label>`).join('')}
        </fieldset>
        <label>Ergebnis<select name="ergebnis"><option value="">– bitte wählen –</option>${Object.entries(AUSGANG).filter(([key]) => key !== 'test').map(([key, v]) => `<option value="${key}" ${key === c.ergebnis ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <label>Nächster Schritt<input name="schritt" value="${esc(c.naechsterSchritt)}" maxlength="1000" placeholder="z. B. Hausbesuch, Angebot rechnen"></label>
        <div class="wv-feld breit"><label><span class="ed-frist-label">${c.ergebnis === 'termin' ? 'Termin am' : 'Frist / Wiedervorlage'}</span><input type="datetime-local" name="frist" value="${esc(c.frist ? isoToLocalInput(c.frist) : '')}"></label>
          <input type="hidden" name="dauer" value="${TERMIN_DAUER[c.themen[0] || 'pv']}">
          <div class="tw-zeile">${terminwahl.knopfHtml('frist', { dauer: 'dauer', kundeId, klasse: c.ergebnis === 'termin' ? 'btn klein primary' : 'btn klein ghost' })}
            ${alt ? '' : `<label class="check ed-offen" ${c.ergebnis === 'termin' ? '' : 'hidden'}><input type="checkbox" name="offen"> Datum noch offen</label>`}</div>
          <p class="warnung-box tw-konflikt-feld" hidden></p>
          ${schnellwahl.html('frist')}</div>
        ${alt ? '' : `<label class="check ed-wv" ${c.ergebnis === 'termin' ? 'hidden' : ''}><input type="checkbox" name="termin" checked> Frist als Wiedervorlage in Termine</label>`}
        <label class="breit">Gesprächsinhalt<textarea name="notiz" rows="6" placeholder="Was wurde besprochen? Wünsche, Bedenken, Absprachen">${esc(c.notiz)}</textarea></label>
      </div>`,
    onOpen: (dlg) => {
      terminwahl.konfliktVerdrahten(dlg, 'frist', dlg.querySelector<HTMLElement>('.tw-konflikt-feld')!, { dauer: 'dauer' });
      const erg = dlg.querySelector<HTMLSelectElement>('[name=ergebnis]')!;
      const offen = dlg.querySelector<HTMLInputElement>('[name=offen]');
      offen?.addEventListener('change', () => { dlg.querySelector<HTMLInputElement>('[name=frist]')!.disabled = offen.checked; });
      erg.addEventListener('change', () => {
        const termin = erg.value === 'termin';
        dlg.querySelector<HTMLElement>('.ed-frist-label')!.textContent = termin ? 'Termin am' : 'Frist / Wiedervorlage';
        const o = dlg.querySelector<HTMLElement>('.ed-offen'); if (o) o.hidden = !termin;
        const wv = dlg.querySelector<HTMLElement>('.ed-wv'); if (wv) wv.hidden = termin;
        if (!termin && offen) { offen.checked = false; dlg.querySelector<HTMLInputElement>('[name=frist]')!.disabled = false; }
        const knopf = dlg.querySelector<HTMLElement>('.tw-knopf')!;
        knopf.className = `btn klein ${termin ? 'primary' : 'ghost'} tw-knopf`;
        // R-FLOW: vereinbarter Termin ohne Datum → gleich den Kalender öffnen
        if (termin && !alt && !dlg.querySelector<HTMLInputElement>('[name=frist]')!.value) void terminwahl.fuerKnopf(knopf);
      });
      // Bereich der Themen bestimmt die übliche Termindauer
      dlg.querySelectorAll<HTMLInputElement>('[name=thema]').forEach((x) => x.addEventListener('change', () => {
        const erstes = dlg.querySelector<HTMLInputElement>('[name=thema]:checked')?.value as 'pv' | 'wp' | undefined;
        if (erstes) dlg.querySelector<HTMLInputElement>('[name=dauer]')!.value = String(TERMIN_DAUER[erstes]);
      }));
    },
    knoepfe: [{
      label: 'Speichern', primaer: true,
      pruefen: (dlg) => {
        const q = (n) => dlg.querySelector(`[name=${n}]`);
        if (!localInputToIso(q('zeitpunkt').value)) return 'Bitte einen gültigen Zeitpunkt angeben.';
        if (!alt && q('erreicht').checked && q('ergebnis').value === 'termin' && !q('frist').value && !q('offen')?.checked) return 'Wann ist der vereinbarte Termin? Bitte im Kalender wählen oder „Datum noch offen“ ankreuzen.';
        if (q('frist').value && !localInputToIso(q('frist').value)) return 'Die Frist ist kein gültiges Datum.';
        if (!dlg.querySelectorAll('[name=thema]:checked').length) return 'Bitte mindestens ein Thema wählen (Photovoltaik oder Wärmepumpe).';
        return null;
      },
      wert: (dlg) => {
        const q = (n) => dlg.querySelector(`[name=${n}]`);
        return {
          art: q('art').value,
          zeitpunkt: localInputToIso(q('zeitpunkt').value),
          erreicht: q('erreicht').checked,
          gespraechspartner: q('partner').value.trim(),
          themen: [...dlg.querySelectorAll('[name=thema]:checked')].map((x) => x.value),
          ergebnis: q('ergebnis').value,
          naechsterSchritt: q('schritt').value.trim(),
          frist: q('frist').value && !q('offen')?.checked ? localInputToIso(q('frist').value) : null,
          notiz: q('notiz').value,
          termin: q('termin')?.checked ?? false,
          offen: q('offen')?.checked ?? false,
          dauerMin: Number(q('dauer').value) || 60,
        };
      },
    }],
  });
  zuletztTermin = null;
  if (!res) return null;
  const neu = normalizeEnpalKontakt({ ...c, ...res, updatedAt: nowIso() });
  const vereinbart = !alt && neu.ergebnis === 'termin';
  await store.mutate((d) => {
    const kk = d.kunden.find((x) => x.id === kundeId);
    if (!kk) return;
    const i = kk.enpalKontakte.findIndex((x) => x.id === neu.id);
    if (i >= 0) kk.enpalKontakte[i] = neu; else kk.enpalKontakte.push(neu);
    // Status der besprochenen Themen folgt dem Ergebnis (hebt nur an, außer „Kein Interesse“/„Abschluss“)
    if (!alt && neu.ergebnis) for (const s of neu.themen) kk.status[s] = statusFuerAusgang(neu.ergebnis as Parameters<typeof statusFuerAusgang>[0], kk.status[s]);
    const sparte = neu.themen[0] || 'pv';
    const wofuer = `${neu.naechsterSchritt || (neu.art === 'hausbesuch' ? 'Termin' : 'Hausbesuch')}`;
    if (vereinbart && neu.frist) {
      const t = neuerTermin({ kundeId, sparte, art: 'termin', beginn: neu.frist, dauerMin: res.dauerMin,
        titel: `${SPARTEN[sparte].label}: ${wofuer} – ${kundenTitel(kk)}`, ort: adresseEinzeilig(kk), notiz: neu.notiz.slice(0, 5000) });
      d.termine.push(t);
      zuletztTermin = t;
    } else if (vereinbart && res.offen) {
      d.termine.push(neuerTermin({ kundeId, sparte, art: 'wiedervorlage', beginn: wvDatum(1), dauerMin: 15,
        titel: `Termin-Datum klären – ${SPARTEN[sparte].label}: ${wofuer} – ${kundenTitel(kk)}`, ort: adresseEinzeilig(kk) }));
    } else if (!alt && res.termin && neu.frist) {
      d.termine.push(neuerTermin({ kundeId, sparte: neu.themen[0] || 'pv', art: 'wiedervorlage', beginn: neu.frist, dauerMin: 60,
        titel: `Enpal-Frist: ${neu.naechsterSchritt || AUSGANG[neu.ergebnis] || 'nachfassen'} – ${kundenTitel(kk)}`, ort: adresseEinzeilig(kk) }));
    }
    kk.updatedAt = nowIso();
  });
  return neu.id;
}

/** Zeigt den fertigen Text mit Kopier-Knopf (robust auch auf iPad/Android). */
export async function textZeigen(kundeId: string, kontaktId: string | null = null) {
  const k = store.findKunde(kundeId);
  if (!k) return;
  const einst = store.getData().einstellungen;
  const text = kontaktId ? enpalDokuText(k, kontaktId, einst) : enpalVerlaufText(k, einst);
  if (!text) { toast('Noch keine Enpal-Dokumentation vorhanden.', 'error'); return; }
  await dialog({
    titel: kontaktId ? 'Text für die Enpal-App' : 'Enpal-Verlauf (alle Kontakte)',
    html: `<p class="hinweis">Kopieren und in der Enpal-App beim Lead einfügen.</p><textarea readonly rows="14" class="doku-text">${esc(text)}</textarea>`,
    knoepfe: [{ label: 'Schließen', wert: null }, { label: '📋 Text kopieren', primaer: true, wert: null }],
    onOpen: (dlg) => {
      const knopf = dlg.querySelectorAll('.dlg-actions button')[2];
      knopf?.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const ok = await kopieren(text);
        toast(ok ? 'Kopiert – jetzt in der Enpal-App einfügen' : 'Kopieren nicht möglich – bitte Text markieren.', ok ? 'ok' : 'error');
        if (ok) dlg.close();
      });
    },
  });
}

/** Tab-Inhalt in der Kundenansicht. */
export function tab(el, k) {
  const liste = [...k.enpalKontakte].sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? 1 : -1));
  const jetzt = Date.now();
  el.innerHTML = `
    <section class="karte-box">
      <header class="seitenkopf"><h2>Enpal-Gesprächsdokumentation</h2></header>
      <p class="hinweis">Enpal verlangt je Kontakt eine Dokumentation (Telefon und Hausbesuch). Hier erfassen, dann den Text kopieren und in der Enpal-App einfügen. Enthält nur Photovoltaik und Wärmepumpe.</p>
      <div class="knopfreihe">
        <button class="btn primary" data-neu="telefon">📞 Telefonat dokumentieren</button>
        <button class="btn primary" data-neu="hausbesuch">🏠 Hausbesuch dokumentieren</button>
        ${liste.length ? '<button class="btn ghost" id="verlauf">Gesamten Verlauf kopieren</button>' : ''}
      </div>
      ${liste.length ? `<ul class="gespraechsliste doku-liste">${liste.map((c) => {
    const ueberfaellig = c.frist && new Date(c.frist).getTime() < jetzt;
    return `
        <li>
          <div class="notiz-kopf"><time>${esc(formatDateTime(c.zeitpunkt))}</time>
            <span class="tags"><span class="tag">${c.art === 'telefon' ? '📞' : c.art === 'hausbesuch' ? '🏠' : '💬'} ${esc(KONTAKTART[c.art])}</span>${c.themen.map((s) => `<span class="tag tag-${s}">${esc(SPARTEN[s].kurz)}</span>`).join('')}</span></div>
          <p>${c.erreicht ? '' : '<b>Nicht erreicht.</b> '}${c.ergebnis ? `<span class="ausgang ausgang-${esc(c.ergebnis)}">${esc(AUSGANG[c.ergebnis])}</span>` : ''}</p>
          ${c.naechsterSchritt ? `<p><b>Nächster Schritt:</b> ${esc(c.naechsterSchritt)}</p>` : ''}
          ${c.frist ? `<p class="${ueberfaellig ? 'frist-ueber' : ''}"><b>Frist:</b> ${esc(formatDateTime(c.frist))}${ueberfaellig ? ' – überfällig' : ''}</p>` : ''}
          ${c.notiz ? `<p class="hinweis">${esc(c.notiz.length > 240 ? `${c.notiz.slice(0, 240)} …` : c.notiz)}</p>` : ''}
          <div class="knopfreihe">
            <button class="btn klein primary" data-kopie="${esc(c.id)}">📋 Text für Enpal-App</button>
            <button class="btn klein ghost" data-bearb="${esc(c.id)}">Bearbeiten</button>
            <button class="btn klein ghost danger-text" data-loesch="${esc(c.id)}">Löschen</button>
          </div>
        </li>`;
  }).join('')}</ul>` : '<p class="hinweis">Noch kein Kontakt dokumentiert.</p>'}
    </section>`;
  const neuZeichnen = () => { const kk = store.findKunde(k.id); if (kk) tab(el, kk); };
  // Listener an der Section, nicht am (wiederverwendeten) Tab-Container – sonst doppelte Handler.
  const box = el.querySelector('section');
  box.addEventListener('click', async (ev) => {
    const b = (ev.target as Element).closest('button');
    if (!b) return;
    if (b.dataset.neu) {
      const id = await kontaktDialog(k.id, { art: b.dataset.neu });
      const termin = zuletztTermin;
      if (id) {
        neuZeichnen();
        if (termin) toast(`Termin eingetragen: ${formatDateTime(termin.beginn)}`, 'ok');
        await textZeigen(k.id, id);
        if (termin) await bestaetigungAnbieten(termin, 'Termin eingetragen');
      }
    } else if (b.dataset.kopie) {
      await textZeigen(k.id, b.dataset.kopie);
    } else if (b.dataset.bearb) {
      if (await kontaktDialog(k.id, { kontaktId: b.dataset.bearb })) neuZeichnen();
    } else if (b.dataset.loesch) {
      if (!(await bestaetigen('Dokumentation löschen?', 'Dieser Enpal-Kontakt wird beim Kunden entfernt.'))) return;
      await store.mutate((d) => { pk.enpalKontaktLoeschen(d, k.id, b.dataset.loesch!); });
      neuZeichnen();
    } else if (b.id === 'verlauf') {
      await textZeigen(k.id, null);
    }
  });
}
