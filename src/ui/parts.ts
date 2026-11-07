// Sperling – wiederverwendbare UI-Bausteine.
import { esc, isoToLocalInput, localInputToIso, formatDateTime, parseNumber } from '../core/util.ts';
import { SPARTEN, SPARTEN_KEYS, STATUS, kundenTitel, adresseEinzeilig, neuerTermin, normalizeTermin, type Termin } from '../core/model.ts';
import { erzeugeIcs } from '../core/ics.ts';
import * as store from '../storage/store.ts';
import * as pk from '../core/papierkorb.ts';
import { hinfahrenKnopf } from './navi.ts';
import { dialog, download, toast, maskottchen } from './dom.ts';
import { terminKarte } from './terminkarte.ts';

export function statusChips(kunde) {
  return `<span class="chips">${SPARTEN_KEYS.map((s) => {
    const st = kunde.status[s];
    return `<span class="chip bereich-chip-${s}" style="--c:${STATUS[st].farbe}" title="${esc(SPARTEN[s].label)}: ${esc(STATUS[st].label)}">${esc(SPARTEN[s].kurz)}<i></i></span>`;
  }).join('')}</span>`;
}

export function spartenIcon(s) {
  const map = { pv: 'photovoltaik', wp: 'waermepumpe', vorwerk: 'vorwerk' };
  return map[s] || 'sperling';
}

export function statusOptions(aktuell) {
  return Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === aktuell ? 'selected' : ''}>${esc(v.label)}</option>`).join('');
}

export function leer(maskottchenName, text) {
  return `<div class="leer">${maskottchen(maskottchenName, 'gross')}<p>${esc(text)}</p></div>`;
}

/** Termin/Wiedervorlage anlegen oder bearbeiten. Gibt den gespeicherten Termin zurück oder null. */
export async function terminDialog({ termin = null as Termin | null, kundeId = '', sparte = '', beginn = '', dauerMin = 0 } = {}): Promise<Termin | null> {
  const d = store.getData();
  const t = termin ? { ...termin } : neuerTermin({ kundeId, sparte, beginn: beginn || naechsteVolleStunde(), ...(dauerMin ? { dauerMin, art: 'termin' } : {}) });
  const k = d.kunden.find((x) => x.id === t.kundeId);
  if (!termin && k) {
    t.ort = adresseEinzeilig(k);
  }
  const kundenOpts = [...d.kunden].sort((a, b) => kundenTitel(a).localeCompare(kundenTitel(b), 'de'))
    .map((x) => `<option value="${esc(x.id)}" ${x.id === t.kundeId ? 'selected' : ''}>${esc(kundenTitel(x))}</option>`).join('');
  const html = `
    <label>Art
      <select name="art"><option value="wiedervorlage" ${t.art === 'wiedervorlage' ? 'selected' : ''}>Wiedervorlage</option><option value="termin" ${t.art === 'termin' ? 'selected' : ''}>Termin</option></select>
    </label>
    <label>Titel <input name="titel" value="${esc(t.titel)}" placeholder="z. B. Vorwerk-Vorführung" required maxlength="300"></label>
    <label>Kunde <select name="kundeId"><option value="">– ohne Kunde –</option>${kundenOpts}</select></label>
    <label>Sparte <select name="sparte"><option value="">– keine –</option>${SPARTEN_KEYS.map((s) => `<option value="${s}" ${s === t.sparte ? 'selected' : ''}>${esc(SPARTEN[s].label)}</option>`).join('')}</select></label>
    <div class="row2">
      <label>Beginn <input type="datetime-local" name="beginn" value="${esc(isoToLocalInput(t.beginn))}" required></label>
      <label>Dauer (Min.) <input type="number" name="dauerMin" min="5" max="1440" step="5" value="${esc(t.dauerMin)}"></label>
    </div>
    <label>Ort <input name="ort" value="${esc(t.ort)}" maxlength="500"></label>
    <label>Notiz <textarea name="notiz" rows="3" maxlength="5000">${esc(t.notiz)}</textarea></label>`;
  const res = await dialog({
    titel: termin ? 'Termin bearbeiten' : 'Neue Wiedervorlage / Termin',
    html,
    knoepfe: [{
      label: 'Speichern', primaer: true,
      pruefen: (dlg) => {
        const f = dlg.querySelector('form');
        if (!f.titel.value.trim()) return 'Bitte einen Titel eingeben.';
        if (!localInputToIso(f.beginn.value)) return 'Bitte ein gültiges Datum wählen.';
        return null;
      },
      wert: (dlg) => {
        const f = dlg.querySelector('form');
        return {
          art: f.art.value, titel: f.titel.value.trim(), kundeId: f.kundeId.value, sparte: f.sparte.value,
          beginn: localInputToIso(f.beginn.value), dauerMin: parseNumber(f.dauerMin.value) ?? 60, ort: f.ort.value, notiz: f.notiz.value,
        };
      },
    }],
  });
  if (!res) return null;
  const gespeichert = normalizeTermin({ ...t, ...res, updatedAt: new Date().toISOString() });
  store.mutate((data) => {
    const i = data.termine.findIndex((x) => x.id === gespeichert.id);
    if (i >= 0) data.termine[i] = gespeichert; else data.termine.push(gespeichert);
  });
  toast('Gespeichert', 'ok');
  return gespeichert;
}

function naechsteVolleStunde() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

export function icsExport(termine, dateiname = 'sperling-termine.ics') {
  if (!termine.length) { toast('Keine Termine zum Exportieren.'); return; }
  download(dateiname, erzeugeIcs(termine), 'text/calendar;charset=utf-8');
}

export function terminZeile(t, kunde) {
  const jetzt = new Date().toISOString();
  const ueberfaellig = !t.erledigt && t.beginn < jetzt;
  return `
    <li class="termin ${t.erledigt ? 'erledigt' : ''} ${ueberfaellig ? 'ueberfaellig' : ''}" data-id="${esc(t.id)}">
      <button class="haken" data-aktion="erledigt" aria-label="Erledigt umschalten">${t.erledigt ? '✓' : ''}</button>
      <div class="termin-text" data-aktion="karte" role="button" tabindex="0">
        <strong>${esc(t.titel || 'Termin')}</strong>
        <small>${esc(formatDateTime(t.beginn))} · ${t.art === 'termin' ? 'Termin' : 'Wiedervorlage'}${t.sparte ? ` · ${esc(SPARTEN[t.sparte].label)}` : ''}${kunde ? ` · <a href="#/kunde/${esc(kunde.id)}">${esc(kundenTitel(kunde))}</a>` : ''}</small>
      </div>
      ${kunde && t.art === 'termin' && !t.erledigt ? hinfahrenKnopf(kunde, 'btn klein ghost').replace('🚗 Hinfahren', '🚗') : ''}
      <button class="btn klein ghost" data-aktion="ics" title="In Kalender exportieren">📅</button>
      <button class="btn klein ghost" data-aktion="bearbeiten" title="Bearbeiten">✎</button>
    </li>`;
}

/** Klicks in einer Terminliste behandeln. */
export function terminListeVerdrahten(root, nachAenderung) {
  root.addEventListener('click', async (ev) => {
    const btn = (ev.target as Element).closest('[data-aktion]');
    const li = (ev.target as Element).closest('li.termin');
    if (!btn || !li) return;
    const id = li.dataset.id;
    const t = store.getData().termine.find((x) => x.id === id);
    if (!t) return;
    if (btn.dataset.aktion === 'erledigt') {
      store.mutate((d) => { const x = d.termine.find((y) => y.id === id); if (x) { x.erledigt = !x.erledigt; x.updatedAt = new Date().toISOString(); } });
      nachAenderung();
    } else if (btn.dataset.aktion === 'ics') {
      icsExport([t], `termin-${(t.titel || 'sperling').replace(/[^\wäöüÄÖÜß-]+/g, '_').slice(0, 40)}.ics`);
    } else if (btn.dataset.aktion === 'bearbeiten') {
      if (await terminDialog({ termin: t })) nachAenderung();
    } else if (btn.dataset.aktion === 'karte') {
      if ((ev.target as Element).closest('a')) return;
      if (await terminKarte(t)) nachAenderung();
    }
  });
}
