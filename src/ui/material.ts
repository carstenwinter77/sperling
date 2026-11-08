// Sperling – Verbrauchsmaterial im Bestand: anlegen (auch aus dem Vorwerk-Katalog), Verbrauch und Zugang
// buchen, Mindestbestand mit Hinweis „nachbestellen“. Auch aus der Kundenansicht (Muster mitgeben).
import { esc, formatDate, nowIso } from '../core/util.ts';
import { MATERIAL_GRUND, kundenTitel, neuesMaterial, type Material, type MaterialGrund } from '../core/model.ts';
import { einheitFuer } from '../core/bestandvorlage.ts';
import { materialBuchen, nachbestellListe, istKnapp, mengeText, ABGANG } from '../core/material.ts';
import * as store from '../storage/store.ts';
import { dialog, toast, bestaetigen } from './dom.ts';
import * as kundenwahl from './kundenwahl.ts';
import { katalogFeldHtml, katalogFeldVerdrahten } from './katalogfeld.ts';
import { bestandBild } from './views/bestand.ts';

const menge = (m: Pick<Material, 'bestand' | 'einheit'>, n = m.bestand) => mengeText(n, m.einheit);

/** Hinweisbox „Nachbestellen“ (leer, wenn nichts knapp ist). */
export function nachbestellHtml(): string {
  const liste = nachbestellListe(store.getData());
  if (!liste.length) return '';
  return `<section class="karte-box nachbestellen" id="nachbestellen" role="status">
    <h2>🛒 Nachbestellen</h2>
    <ul>${liste.map((m) => `<li><b>${esc(m.name)}</b>: noch ${esc(menge(m))} (Mindestbestand ${m.mindestbestand})</li>`).join('')}</ul>
  </section>`;
}

/** Abschnitt „Verbrauchsmaterial“ für die Bestandsseite. */
export function abschnittHtml(): string {
  const d = store.getData();
  const aktiv = (d.material || []).filter((m) => m.aktiv).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const kunde = (id: string) => d.kunden.find((k) => k.id === id);
  return `<section class="karte-box material" id="material">
    <div class="abschnitt-kopf"><h2>🧴 Verbrauchsmaterial</h2><button type="button" class="btn klein" data-material-neu>+ Material</button></div>
    ${aktiv.length ? `<ul class="material-liste">${aktiv.map((m) => {
    const letzte = m.buchungen.slice(0, 3);
    return `<li class="material-zeile${istKnapp(m) ? ' knapp' : ''}" data-material="${esc(m.id)}">
        <div class="material-kopf">
          ${bestandBild(m.produktId)}<span class="material-name"><strong>${esc(m.name)}</strong>${m.mindestbestand !== null ? `<small>Mindestbestand ${m.mindestbestand}</small>` : ''}</span>
          <span class="material-bestand" aria-label="Bestand"><b>${m.bestand}</b> ${esc(mengeText(m.bestand, m.einheit).replace(/^\d+ /, ""))}${istKnapp(m) ? ' <span class="pill pill-ueberfaellig">nachbestellen</span>' : ''}</span>
        </div>
        ${letzte.length ? `<ul class="material-verlauf">${letzte.map((b) => { const k = b.kundeId ? kunde(b.kundeId) : null; return `<li>${esc(formatDate(b.zeitpunkt))} · <b>${b.menge > 0 ? '+' : '−'}${Math.abs(b.menge)}</b> ${esc(MATERIAL_GRUND[b.grund])}${k ? ` · ${esc(kundenTitel(k))}` : ''}${b.notiz ? ` · ${esc(b.notiz)}` : ''}</li>`; }).join('')}</ul>` : ''}
        <div class="knopfreihe">
          <button type="button" class="btn klein primary" data-material-aktion="abgang"${m.bestand ? '' : ' disabled'}>− Verbrauch</button>
          <button type="button" class="btn klein" data-material-aktion="zugang">+ Zugang</button>
          <button type="button" class="btn klein ghost" data-material-aktion="bearbeiten">Bearbeiten</button>
        </div>
      </li>`;
  }).join('')}</ul>` : '<p class="hinweis">Muster, Reinigungsmittel, Filtertüten: mit Anzahl erfassen, Verbrauch buchen und bei Mindestbestand an die Nachbestellung erinnert werden.</p>'}
  </section>`;
}

/** Klicks im Abschnitt verdrahten. */
export function verdrahten(root: Element, fertig: () => void) {
  root.querySelector('[data-material-neu]')?.addEventListener('click', async () => { if (await materialDialog()) fertig(); });
  root.querySelector('#material')?.addEventListener('click', async (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-material-aktion]');
    const id = b?.closest<HTMLElement>('[data-material]')?.dataset.material;
    const m = id ? store.getData().material.find((x) => x.id === id) : null;
    if (!b || !m) return;
    const a = b.dataset.materialAktion;
    const ok = a === 'bearbeiten' ? await materialDialog(m) : await buchenDialog(a === 'zugang' ? 'zugang' : 'abgang', m);
    if (ok) fertig();
  });
}

/** Vorbelegung für neues Material (z. B. aus der Produktübersicht). */
export interface MaterialVorgabe { name?: string; produktId?: string; einheit?: string; bestand?: number }

/** Neues Material anlegen oder bearbeiten (Bestand gezählt = Korrekturbuchung). `vorgabe` füllt ein neues vor. */
export async function materialDialog(m: Material | null = null, vorgabe: MaterialVorgabe = {}): Promise<boolean> {
  type Erg = 'entfernen' | { name: string; produktId: string; einheit: string; bestand: number; mindestbestand: number | null; notiz: string };
  const zahl = (dlg: Element, n: string) => { const v = dlg.querySelector<HTMLInputElement>(`[name=${n}]`)!.value.trim(); return v === '' ? null : Math.round(Number(v)); };
  const res = await dialog<Erg>({
    titel: m ? 'Material bearbeiten' : 'Neues Verbrauchsmaterial',
    html: `
      ${katalogFeldHtml('material', m?.name || vorgabe.name || '', m?.produktId || vorgabe.produktId || '', 'z. B. Koboclean Universal (500 ml)')}
      <div class="zwei-spalten">
        <label>${m ? 'Bestand (gezählt)' : 'Anzahl jetzt'}<input name="bestand" type="number" inputmode="numeric" min="0" step="1" value="${m ? m.bestand : (vorgabe.bestand ?? 0)}"></label>
        <label>Einheit<input name="einheit" value="${esc(m?.einheit || vorgabe.einheit || 'Stück')}" list="einheiten" maxlength="30"></label>
      </div>
      <datalist id="einheiten"><option value="Stück"><option value="Packung"><option value="Flasche"><option value="Dose"><option value="Beutel"></datalist>
      <label>Mindestbestand<input name="mindest" type="number" inputmode="numeric" min="0" step="1" value="${m?.mindestbestand ?? ''}" placeholder="leer = keine Erinnerung"></label>
      <p class="hinweis klein">Erreicht der Bestand den Mindestbestand, erinnert Sperling ans Nachbestellen (Übersicht, Bestand, Zahl am App-Symbol).</p>
      <label>Notiz<textarea name="notiz" rows="2" maxlength="2000">${esc(m?.notiz || '')}</textarea></label>`,
    knoepfe: [
      ...(m ? [{ label: 'Aus Bestand nehmen', gefahr: true, wert: 'entfernen' as const }] : []),
      {
        label: 'Speichern', primaer: true,
        pruefen: (dlg) => {
          if (!dlg.querySelector<HTMLInputElement>('[name=name]')!.value.trim()) return 'Bitte eine Bezeichnung eingeben.';
          const b = zahl(dlg, 'bestand'); const mi = zahl(dlg, 'mindest');
          if (b === null || !Number.isFinite(b) || b < 0) return 'Bitte eine Anzahl ab 0 eingeben.';
          if (mi !== null && (!Number.isFinite(mi) || mi < 0)) return 'Der Mindestbestand muss 0 oder mehr sein.';
          return null;
        },
        wert: (dlg) => ({
          name: dlg.querySelector<HTMLInputElement>('[name=name]')!.value.trim(),
          produktId: dlg.querySelector<HTMLInputElement>('[name=katalog]')?.value || '',
          einheit: dlg.querySelector<HTMLInputElement>('[name=einheit]')!.value.trim() || 'Stück',
          bestand: zahl(dlg, 'bestand') ?? 0,
          mindestbestand: zahl(dlg, 'mindest'),
          notiz: dlg.querySelector<HTMLTextAreaElement>('[name=notiz]')!.value,
        }),
      },
    ],
    onOpen: (dlg) => {
      katalogFeldVerdrahten(dlg, (p) => {
        const einheit = dlg.querySelector<HTMLInputElement>('[name=einheit]')!;
        if (!einheit.value.trim() || einheit.value === 'Stück') einheit.value = einheitFuer(p);
      });
      // Aus der Produktübersicht: Bezeichnung steht schon, weiter mit der Anzahl
      if (!m && vorgabe.produktId) setTimeout(() => dlg.querySelector<HTMLInputElement>('[name=bestand]')?.select(), 0);
    },
  });
  if (!res) return false;
  if (res === 'entfernen') {
    if (!m || !(await bestaetigen('Material aus dem Bestand nehmen?', `${m.name} wird ausgeblendet. Der Verlauf bleibt erhalten.`, 'Aus Bestand nehmen'))) return false;
    store.mutate((d) => { const x = d.material.find((y) => y.id === m.id); if (x) { x.aktiv = false; x.updatedAt = nowIso(); } });
    return true;
  }
  let knapp = false;
  store.mutate((d) => {
    d.material ||= [];
    const { bestand, ...rest } = res;
    let x = m ? d.material.find((y) => y.id === m.id) : null;
    if (!x) { x = neuesMaterial({ ...rest, bestand: 0 }); d.material.push(x); } else Object.assign(x, rest, { updatedAt: nowIso() });
    if (!m && bestand > 0) materialBuchen(d, x.id, { grund: 'zugang', menge: bestand });
    else if (m && bestand !== x.bestand) materialBuchen(d, x.id, { grund: 'korrektur', menge: bestand });
    knapp = istKnapp(x);
  });
  toast(knapp ? 'Gespeichert. Mindestbestand erreicht: bitte nachbestellen.' : 'Gespeichert', knapp ? 'error' : 'ok', knapp ? 5000 : undefined);
  return true;
}

/**
 * Verbrauch oder Zugang buchen. Ohne `m` wird das Material im Dialog gewählt (Kundenansicht).
 * Mit `kundeId` steht der Kunde fest (Muster mitgeben); sonst optional wählbar.
 */
export async function buchenDialog(art: 'abgang' | 'zugang', m: Material | null = null, kundeId = ''): Promise<boolean> {
  const d = store.getData();
  const auswahl = (d.material || []).filter((x) => x.aktiv && (art === 'zugang' || x.bestand > 0));
  if (!m && !auswahl.length) { toast(art === 'abgang' ? 'Kein Verbrauchsmaterial vorrätig. Lege es unter Bestand an.' : 'Noch kein Verbrauchsmaterial angelegt.', 'error', 5000); return false; }
  const gruende: MaterialGrund[] = art === 'zugang' ? ['zugang'] : ABGANG;
  const kunde = kundeId ? d.kunden.find((k) => k.id === kundeId) : null;
  type Erg = { id: string; grund: MaterialGrund; menge: number; kundeId: string; notiz: string };
  const res = await dialog<Erg>({
    titel: art === 'zugang' ? `Zugang buchen${m ? `: ${m.name}` : ''}` : kunde ? `Muster oder Test bei ${kundenTitel(kunde)}` : `Verbrauch buchen${m ? `: ${m.name}` : ''}`,
    html: `
      ${m ? `<p class="hinweis">Bestand jetzt: <b>${esc(menge(m))}</b></p><input type="hidden" name="mat" value="${esc(m.id)}">`
    : `<label>Material<select name="mat" required>${auswahl.map((x) => `<option value="${esc(x.id)}">${esc(x.name)} (${esc(menge(x))})</option>`).join('')}</select></label>`}
      ${gruende.length > 1 ? `<fieldset class="grund-wahl"><legend>Wofür?</legend>${gruende.filter((g) => !kunde || g === 'muster' || g === 'test').map((g, i) => `<label class="chip-radio"><input type="radio" name="grund" value="${g}"${i === 0 ? ' checked' : ''}>${esc(MATERIAL_GRUND[g])}</label>`).join('')}</fieldset>` : `<input type="hidden" name="grund" value="${gruende[0]}">`}
      <label>Anzahl<span class="mengen-wahl"><button type="button" class="btn klein" data-schritt="-1" aria-label="Eins weniger">−</button><input name="menge" type="number" inputmode="numeric" min="1" step="1" value="1"><button type="button" class="btn klein" data-schritt="1" aria-label="Eins mehr">+</button></span></label>
      ${art === 'abgang' && !kunde ? `<div class="nur-kunde">${kundenwahl.html('kunde', 'Kunde (bei Muster oder Test)', '')}</div>` : ''}
      <label>Notiz<input name="notiz" maxlength="1000" placeholder="${art === 'zugang' ? 'z. B. Lieferung vom Vorwerk-Shop' : 'optional'}"></label>`,
    knoepfe: [{
      label: art === 'zugang' ? 'Zugang buchen' : 'Verbrauch buchen', primaer: true,
      pruefen: (dlg) => {
        const n = Number(dlg.querySelector<HTMLInputElement>('[name=menge]')!.value);
        if (!Number.isInteger(n) || n < 1) return 'Bitte eine Anzahl ab 1 eingeben.';
        const id = dlg.querySelector<HTMLInputElement | HTMLSelectElement>('[name=mat]')!.value;
        const x = store.getData().material.find((y) => y.id === id);
        if (art === 'abgang' && x && n > x.bestand) return `Es sind nur noch ${menge(x)} da.`;
        return null;
      },
      wert: (dlg) => ({
        id: dlg.querySelector<HTMLInputElement | HTMLSelectElement>('[name=mat]')!.value,
        grund: (dlg.querySelector<HTMLInputElement>('[name=grund]:checked') || dlg.querySelector<HTMLInputElement>('[name=grund]'))!.value as MaterialGrund,
        menge: Number(dlg.querySelector<HTMLInputElement>('[name=menge]')!.value),
        kundeId: kundeId || dlg.querySelector<HTMLInputElement>('input[name=kunde]')?.value || '',
        notiz: dlg.querySelector<HTMLInputElement>('[name=notiz]')!.value.trim(),
      }),
    }],
    onOpen: (dlg) => {
      kundenwahl.verdrahten(dlg);
      const feld = dlg.querySelector<HTMLInputElement>('[name=menge]')!;
      dlg.querySelector('.mengen-wahl')!.addEventListener('click', (ev) => {
        const b = (ev.target as Element).closest<HTMLElement>('[data-schritt]');
        if (!b) return;
        feld.value = String(Math.max(1, (Number(feld.value) || 0) + Number(b.dataset.schritt)));
        feld.dispatchEvent(new Event('input', { bubbles: true }));
      });
      // Kundenwahl nur bei Muster/Test zeigen
      const nurKunde = dlg.querySelector<HTMLElement>('.nur-kunde');
      const sichtbar = () => { if (nurKunde) nurKunde.hidden = !['muster', 'test'].includes(dlg.querySelector<HTMLInputElement>('[name=grund]:checked')?.value || ''); };
      dlg.querySelector('.grund-wahl')?.addEventListener('change', sichtbar);
      sichtbar();
    },
  });
  if (!res) return false;
  let r: ReturnType<typeof materialBuchen> | null = null;
  try {
    store.mutate((data) => {
      const kid = ['muster', 'test'].includes(res.grund) ? res.kundeId : '';
      r = materialBuchen(data, res.id, { grund: res.grund, menge: res.menge, kundeId: kid, notiz: res.notiz });
    });
  } catch (err) { toast((err as Error).message, 'error'); return false; }
  const e = r as unknown as ReturnType<typeof materialBuchen>;
  if (e.neuKnapp) toast(`${e.material.name}: noch ${menge(e.material)}. Mindestbestand erreicht, bitte nachbestellen.`, 'error', 6000);
  else toast(`Gebucht. Bestand jetzt ${menge(e.material)}.`, 'ok');
  return true;
}
