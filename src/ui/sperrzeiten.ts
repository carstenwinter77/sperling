// Sperling – Arbeitszeit und feste Zeiten (ab 0.16.0): Jan blockt Zeiten, an denen er keine Termine macht
// (privat, Büro, Urlaub), einmalig oder wiederkehrend. Der Terminfinder (src/ui/terminwahl.ts) und der Kalender
// zeigen sie; freie Zeiten und Vorschläge sparen sie aus. Logik: src/core/terminfinder.ts.
import { esc } from '../core/util.ts';
import {
  normalizeArbeitszeit, normalizeSperrzeit, neueSperrzeit, sperrzeitText, wochentag,
  WIEDERHOLUNG, WOCHENTAGE_KURZ, SPERRZEITEN_MAX, type Sperrzeit,
} from '../core/terminfinder.ts';
import * as store from '../storage/store.ts';
import { dialog, toast, bestaetigen } from './dom.ts';

const TAGE = [1, 2, 3, 4, 5, 6, 7];
const tagChecks = (name: string, gewaehlt: readonly number[]) => `<div class="tw-tage" role="group">${TAGE.map((n) => `<label class="check tw-tag"><input type="checkbox" name="${name}" value="${n}" ${gewaehlt.includes(n) ? 'checked' : ''}> ${WOCHENTAGE_KURZ[n]}</label>`).join('')}</div>`;
const gewaehlteTage = (root: Element, name: string) => [...root.querySelectorAll<HTMLInputElement>(`[name=${name}]:checked`)].map((x) => Number(x.value));

/** Kurzfassung für Einstellungen und Kalender: „Mo–Fr 08:00–18:00 · 2 feste Zeiten“. */
export function zusammenfassung(): string {
  const e = store.getData().einstellungen;
  const az = e.arbeitszeit;
  const tage = az.tage.length === 5 && az.tage.join() === '1,2,3,4,5' ? 'Mo–Fr' : az.tage.map((n) => WOCHENTAGE_KURZ[n]).join(', ') || 'keine Arbeitstage';
  return `${tage} ${az.von}–${az.bis} · ${e.sperrzeiten.length ? `${e.sperrzeiten.length} feste ${e.sperrzeiten.length === 1 ? 'Zeit' : 'Zeiten'}` : 'keine festen Zeiten'}`;
}

/** Fenster „Arbeitszeit und feste Zeiten“. Gibt true zurück, wenn etwas geändert wurde. */
export async function verwalten(): Promise<boolean> {
  let geaendert = false;
  const listeHtml = () => {
    const liste = store.getData().einstellungen.sperrzeiten;
    return liste.length
      ? `<ul class="tw-sperrliste">${liste.map((s) => `<li><span><b>🔒 ${esc(s.titel)}</b><small>${esc(sperrzeitText(s))}</small></span>
          <span class="knopfreihe"><button type="button" class="btn klein ghost" data-sz-bearb="${esc(s.id)}">Bearbeiten</button><button type="button" class="btn klein ghost danger-text" data-sz-weg="${esc(s.id)}">Löschen</button></span></li>`).join('')}</ul>`
      : '<p class="hinweis">Noch keine festen Zeiten. Beispiele: „Privat“ jeden Mittwochnachmittag, „Büro“ freitags ab 13 Uhr, „Urlaub“ vom 22.12. bis 2.1.</p>';
  };
  const az = store.getData().einstellungen.arbeitszeit;
  await dialog({
    titel: 'Arbeitszeit und feste Zeiten',
    html: `
      <section class="tw-abschnitt" id="szArbeitszeit">
        <h3>Arbeitszeit</h3>
        <p class="hinweis">Nur in dieser Zeit zeigt der Kalender freie Zeiten und Vorschläge. Termine außerhalb kannst du trotzdem eintragen, Sperling weist nur darauf hin.</p>
        ${tagChecks('azTag', az.tage)}
        <div class="row2"><label>Von<input type="time" name="azVon" value="${esc(az.von)}" step="900"></label><label>Bis<input type="time" name="azBis" value="${esc(az.bis)}" step="900"></label></div>
        <label>Puffer zwischen Terminen (Fahrt, Überziehen)<select name="azPuffer">${[0, 15, 30, 45, 60].map((n) => `<option value="${n}" ${n === az.pufferMin ? 'selected' : ''}>${n ? `${n} Minuten` : 'kein Puffer'}</option>`).join('')}</select></label>
      </section>
      <section class="tw-abschnitt">
        <h3>Feste Zeiten blocken</h3>
        <p class="hinweis">Zeiten, in denen du keine Kundentermine machst. Sie stehen gestreift im Kalender; private Termine aus anderen Kalendern übernimmt Sperling nicht.</p>
        <div class="tw-sperr-liste">${listeHtml()}</div>
        <div class="knopfreihe"><button type="button" class="btn ghost" id="szNeu">+ Feste Zeit</button></div>
      </section>`,
    knoepfe: [{ label: 'Fertig', primaer: true, wert: true }],
    onOpen: (dlg) => {
      // Änderungen gelten sofort; „Abbrechen“ wäre irreführend
      dlg.querySelector('.dlg-actions button[value="__abbrechen"]')?.remove();
      const neuZeichnen = () => { dlg.querySelector<HTMLElement>('.tw-sperr-liste')!.innerHTML = listeHtml(); };
      const azSpeichern = () => {
        const a = normalizeArbeitszeit({
          tage: gewaehlteTage(dlg, 'azTag'), von: dlg.querySelector<HTMLInputElement>('[name=azVon]')!.value,
          bis: dlg.querySelector<HTMLInputElement>('[name=azBis]')!.value, pufferMin: Number(dlg.querySelector<HTMLSelectElement>('[name=azPuffer]')!.value),
        });
        store.mutate((d) => { d.einstellungen.arbeitszeit = a; });
        geaendert = true;
      };
      dlg.querySelector('#szArbeitszeit')!.addEventListener('change', azSpeichern);
      dlg.addEventListener('click', async (ev) => {
        const b = (ev.target as Element).closest<HTMLElement>('button');
        if (!b) return;
        if (b.id === 'szNeu') {
          if (store.getData().einstellungen.sperrzeiten.length >= SPERRZEITEN_MAX) { toast(`Höchstens ${SPERRZEITEN_MAX} feste Zeiten.`, 'error'); return; }
          if (await bearbeiten(null)) { geaendert = true; neuZeichnen(); }
        } else if (b.dataset.szBearb) {
          const s = store.getData().einstellungen.sperrzeiten.find((x) => x.id === b.dataset.szBearb);
          if (s && (await bearbeiten(s))) { geaendert = true; neuZeichnen(); }
        } else if (b.dataset.szWeg) {
          const s = store.getData().einstellungen.sperrzeiten.find((x) => x.id === b.dataset.szWeg);
          if (!s || !(await bestaetigen('Feste Zeit löschen?', `„${s.titel}“ (${sperrzeitText(s)}) wird nicht mehr geblockt.`))) return;
          store.mutate((d) => { d.einstellungen.sperrzeiten = d.einstellungen.sperrzeiten.filter((x) => x.id !== s.id); });
          geaendert = true; neuZeichnen(); toast('Feste Zeit gelöscht', 'ok');
        }
      });
    },
  });
  return geaendert;
}

/** Eine feste Zeit anlegen oder bearbeiten. `vorgabe` füllt ein neues Fenster vor (z. B. Tag aus dem Kalender). */
export async function bearbeiten(alt: Sperrzeit | null, vorgabe: Partial<Sperrzeit> = {}): Promise<boolean> {
  const s = alt || neueSperrzeit({ titel: 'Privat', wiederholung: 'woechentlich', von: '14:00', bis: '18:00', ...vorgabe });
  const res = await dialog<Sperrzeit>({
    titel: alt ? 'Feste Zeit bearbeiten' : 'Neue feste Zeit',
    html: `
      <label>Bezeichnung<input name="szTitel" value="${esc(s.titel)}" maxlength="100" placeholder="z. B. Privat, Büro, Urlaub" required></label>
      <label>Wiederholung<select name="szWdh">${Object.entries(WIEDERHOLUNG).map(([k, v]) => `<option value="${k}" ${k === s.wiederholung ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <div class="sz-tage" ${s.wiederholung === 'einmal' ? 'hidden' : ''}><span class="einst-label">An diesen Tagen</span>${tagChecks('szTag', s.tage)}</div>
      <div class="row2">
        <label><span class="sz-ab">${s.wiederholung === 'einmal' ? 'Am' : 'Ab'}</span><input type="date" name="szDatum" value="${esc(s.datum)}" required></label>
        <label><span class="sz-bis">${s.wiederholung === 'einmal' ? 'Bis (mehrere Tage, z. B. Urlaub)' : 'Endet am (leer = ohne Ende)'}</span><input type="date" name="szBisDatum" value="${esc(s.bisDatum)}"></label>
      </div>
      <label class="check"><input type="checkbox" name="szGanz" ${s.ganztags ? 'checked' : ''}> Ganztägig</label>
      <div class="row2 sz-zeit" ${s.ganztags ? 'hidden' : ''}><label>Von<input type="time" name="szVon" value="${esc(s.von)}" step="900"></label><label>Bis<input type="time" name="szBis" value="${esc(s.bis)}" step="900"></label></div>`,
    onOpen: (dlg) => {
      const wdh = dlg.querySelector<HTMLSelectElement>('[name=szWdh]')!;
      const ganz = dlg.querySelector<HTMLInputElement>('[name=szGanz]')!;
      const datum = dlg.querySelector<HTMLInputElement>('[name=szDatum]')!;
      const sync = () => {
        const einmal = wdh.value === 'einmal';
        dlg.querySelector<HTMLElement>('.sz-tage')!.hidden = einmal;
        dlg.querySelector<HTMLElement>('.sz-ab')!.textContent = einmal ? 'Am' : 'Ab';
        dlg.querySelector<HTMLElement>('.sz-bis')!.textContent = einmal ? 'Bis (mehrere Tage, z. B. Urlaub)' : 'Endet am (leer = ohne Ende)';
        dlg.querySelector<HTMLElement>('.sz-zeit')!.hidden = ganz.checked;
        // Wiederholung ohne Tag: den Wochentag des Datums vorschlagen
        if (!einmal && !gewaehlteTage(dlg, 'szTag').length && datum.value) {
          const box = dlg.querySelector<HTMLInputElement>(`[name=szTag][value="${wochentag(datum.value)}"]`);
          if (box) box.checked = true;
        }
      };
      wdh.addEventListener('change', sync); ganz.addEventListener('change', sync); datum.addEventListener('change', sync);
    },
    knoepfe: [{
      label: 'Speichern', primaer: true,
      pruefen: (dlg) => {
        const q = (n: string) => dlg.querySelector<HTMLInputElement>(`[name=${n}]`)!;
        if (!q('szTitel').value.trim()) return 'Bitte eine Bezeichnung eingeben.';
        if (!q('szDatum').value) return 'Bitte ein Datum wählen.';
        if (q('szBisDatum').value && q('szBisDatum').value < q('szDatum').value) return 'Das Ende liegt vor dem Anfang.';
        if (q('szWdh').value !== 'einmal' && !gewaehlteTage(dlg, 'szTag').length) return 'Bitte mindestens einen Wochentag wählen.';
        if (!q('szGanz').checked && (!q('szVon').value || !q('szBis').value || q('szBis').value <= q('szVon').value)) return 'Bitte eine Uhrzeit „bis“ nach „von“ angeben.';
        return null;
      },
      wert: (dlg) => {
        const q = (n: string) => dlg.querySelector<HTMLInputElement>(`[name=${n}]`)!;
        return normalizeSperrzeit({
          id: s.id, titel: q('szTitel').value, wiederholung: q('szWdh').value, tage: gewaehlteTage(dlg, 'szTag'),
          datum: q('szDatum').value, bisDatum: q('szBisDatum').value, ganztags: q('szGanz').checked, von: q('szVon').value, bis: q('szBis').value,
        })!;
      },
    }],
  });
  if (!res) return false;
  store.mutate((d) => {
    const i = d.einstellungen.sperrzeiten.findIndex((x) => x.id === res.id);
    if (i >= 0) d.einstellungen.sperrzeiten[i] = res; else d.einstellungen.sperrzeiten.push(res);
  });
  toast(`Gespeichert: ${res.titel}, ${sperrzeitText(res)}`, 'ok');
  return true;
}
