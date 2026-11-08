// Sperling – Einstellungen → Vertrieb → Rechner-Vorlagen: Startwerte des Rechners „Wann rechnet sich das?“
// je Kundentyp. Privat und Gewerbe sind immer da (änderbar, auf Werkseinstellung zurücksetzbar), eigene lassen sich
// anlegen, umbenennen und löschen. Gespeichert verschlüsselt in einstellungen.rechnerVorlagen.
import { esc } from '../core/util.ts';
import { PV_FELDER, WP_FELDER, zahlLesen, type Feld, type Rechner } from '../core/amortisation.ts';
import {
  VORLAGEN_MAX, VORLAGE_NAME_MAX, VORLAGE_PRIVAT, istWerksvorlage, werksVorlage, angepasst, normalizeRechnerVorlagen, neueVorlagenId,
  type RechnerVorlage,
} from '../core/rechnervorlagen.ts';
import * as store from '../storage/store.ts';
import { bestaetigen, toast } from './dom.ts';

let offen = ''; // aufgeklappte Vorlage überlebt das Neuzeichnen

const zahl = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 });

function felderHtml(v: RechnerVorlage, art: Rechner, felder: Feld[]): string {
  const werte = v[art] as Record<string, number>;
  return `<fieldset class="rv-felder"><legend>${art === 'pv' ? 'Photovoltaik' : 'Wärmepumpe'}</legend>
    ${felder.map((f) => `<label class="rz-feld"><span>${esc(f.label)}${f.einheit ? ` <small>(${esc(f.einheit)})</small>` : ''}</span>
      <input data-rv-feld="${art}.${esc(f.key)}" inputmode="decimal" autocomplete="off" value="${esc(zahl(werte[f.key]))}"></label>`).join('')}
  </fieldset>`;
}

export function html(vs: RechnerVorlage[]): string {
  return `
    <section class="karte-box" id="rechnerVorlagen">
      <h2>Rechner: Vorlagen</h2>
      <p class="hinweis">Startwerte für „Wann rechnet sich das?“. Im Rechner wählst du oben die Vorlage. Aus der Kundenkartei startet er mit „Gewerbe“, wenn beim Kunden eine Firma eingetragen ist, sonst mit „Privat“. Angaben des Kunden wie Strompreis oder Verbrauch kommen obendrauf.</p>
      ${vs.map((v) => {
        const werk = istWerksvorlage(v.id);
        const marke = werk ? (angepasst(v) ? 'angepasst' : 'Werkseinstellung') : 'eigene';
        return `<details class="felder-kat rv-vorlage" data-rv="${esc(v.id)}" ${offen === v.id ? 'open' : ''}>
          <summary><b>${esc(v.name)}</b> <small>${marke}</small></summary>
          <label class="rv-name">Name<input data-rv-name maxlength="${VORLAGE_NAME_MAX}" value="${esc(v.name)}" autocomplete="off"></label>
          <div class="rv-raster">${felderHtml(v, 'pv', PV_FELDER)}${felderHtml(v, 'wp', WP_FELDER)}</div>
          <div class="knopfreihe">${werk
            ? (angepasst(v) ? '<button type="button" class="btn klein ghost" data-rv-werk>Auf Werkseinstellung</button>' : '')
            : '<button type="button" class="btn klein ghost" data-rv-weg>🗑 Vorlage löschen</button>'}</div>
        </details>`;
      }).join('')}
      <div class="knopfreihe"><button type="button" class="btn ghost" id="rvNeu" ${vs.length >= VORLAGEN_MAX ? 'disabled' : ''}>+ Neue Vorlage</button></div>
    </section>`;
}

export function verdrahten(root: HTMLElement, neuZeichnen: () => void) {
  const box = root.querySelector<HTMLElement>('#rechnerVorlagen');
  if (!box) return;
  const idVon = (el: Element) => el.closest<HTMLElement>('[data-rv]')?.dataset.rv || '';
  const aendern = (f: (vs: RechnerVorlage[]) => RechnerVorlage[], neu = false) => {
    store.mutate((d) => { d.einstellungen.rechnerVorlagen = normalizeRechnerVorlagen(f(d.einstellungen.rechnerVorlagen.map((v) => ({ ...v, pv: { ...v.pv }, wp: { ...v.wp } })))); });
    if (neu) neuZeichnen();
  };
  box.addEventListener('toggle', (ev) => { const d = ev.target as HTMLDetailsElement; if (d.dataset?.rv && d.open) offen = d.dataset.rv; }, true);
  box.addEventListener('change', (ev) => {
    const t = ev.target as HTMLInputElement;
    const id = idVon(t);
    if (!id) return;
    if (t.matches('[data-rv-name]')) {
      const name = t.value.trim();
      if (!name) { toast('Bitte einen Namen eingeben.', 'error'); t.value = store.getData().einstellungen.rechnerVorlagen.find((v) => v.id === id)?.name || ''; return; }
      offen = id;
      aendern((vs) => vs.map((v) => (v.id === id ? { ...v, name } : v)), true);
      toast('Gespeichert', 'ok');
      return;
    }
    const [art, key] = (t.dataset.rvFeld || '').split('.') as [Rechner, string];
    const f = (art === 'pv' ? PV_FELDER : WP_FELDER).find((x) => x.key === key);
    if (!f) return;
    let wert = 0;
    aendern((vs) => vs.map((v) => {
      if (v.id !== id) return v;
      const werte = v[art] as Record<string, number>;
      wert = zahlLesen(t.value, f, werte[key]!);
      return { ...v, [art]: { ...werte, [key]: wert } };
    }));
    t.value = zahl(wert); // gekappte Werte sichtbar machen
    const sum = box.querySelector(`[data-rv="${CSS.escape(id)}"] > summary small`);
    const v = store.getData().einstellungen.rechnerVorlagen.find((x) => x.id === id);
    if (sum && v && istWerksvorlage(id)) sum.textContent = angepasst(v) ? 'angepasst' : 'Werkseinstellung';
    toast(store.isDemo() ? 'Gemerkt (im Demo-Modus nur bis zum Neuladen)' : 'Gespeichert', 'ok');
  });
  box.addEventListener('click', async (ev) => {
    const t = ev.target as Element;
    if (t.closest('#rvNeu')) {
      const id = neueVorlagenId();
      const basis = store.getData().einstellungen.rechnerVorlagen.find((v) => v.id === VORLAGE_PRIVAT)!;
      offen = id;
      aendern((vs) => [...vs, { id, name: 'Neue Vorlage', pv: { ...basis.pv }, wp: { ...basis.wp } }], true);
      root.querySelector<HTMLInputElement>(`[data-rv="${CSS.escape(id)}"] [data-rv-name]`)?.select();
      return;
    }
    const id = idVon(t);
    if (!id) return;
    const v = store.getData().einstellungen.rechnerVorlagen.find((x) => x.id === id);
    if (!v) return;
    if (t.closest('[data-rv-werk]')) {
      if (!(await bestaetigen('Auf Werkseinstellung?', `„${v.name}“ bekommt wieder den ursprünglichen Namen und die ursprünglichen Werte.`, 'Zurücksetzen'))) return;
      const w = werksVorlage(id)!;
      offen = id;
      aendern((vs) => vs.map((x) => (x.id === id ? { id, name: w.name, pv: { ...w.pv }, wp: { ...w.wp } } : x)), true);
    } else if (t.closest('[data-rv-weg]')) {
      if (!(await bestaetigen('Vorlage löschen?', `„${v.name}“ wird gelöscht. Kundendaten sind nicht betroffen.`, 'Löschen'))) return;
      offen = '';
      aendern((vs) => vs.filter((x) => x.id !== id), true);
      toast('Vorlage gelöscht', 'ok');
    }
  });
}
