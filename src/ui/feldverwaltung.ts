// Sperling – Einstellungen → Felder: Felder je Kategorie ein-/ausblenden, eigene Felder anlegen,
// bearbeiten und löschen. Ausgeblendete Felder behalten ihre Daten (nur die Anzeige ändert sich).
import { esc } from '../core/util.ts';
import { KATEGORIEN, FELD_TYPEN, MAX_EIGENE, alleFelder, istAus, normalizeEigenesFeld, neuesEigenesFeld, type Kategorie, type FeldTyp, type EigenesFeld, type FeldEinstellungen } from '../core/felder.ts';
import * as store from '../storage/store.ts';
import { dialog, bestaetigen, toast } from './dom.ts';
import * as hilfe from './hilfe.ts';

let offen: Kategorie | null = null; // aufgeklappte Kategorie überlebt das Neuzeichnen

export function html(fe: FeldEinstellungen): string {
  return `
    <section class="karte-box" id="felderEinstellungen">
      <h2>Felder ${hilfe.knopf('felder')}</h2>
      <p class="hinweis">Lege fest, welche Felder die Kundenkartei zeigt. Ausgeblendete Felder behalten ihre Daten und sind beim Einblenden wieder da. Eigene Felder erscheinen in der Kartei, im Gesprächsmodus, in den Texten ihres Bereichs, in der Kundenansicht und in der Suche; Ja/Nein-Felder und Auswahllisten auch im Filter von Kundenliste und Karte.</p>
      ${KATEGORIEN.map((kat) => {
    const felder = alleFelder(kat.key, fe);
    const an = felder.filter((f) => !istAus(fe, f.pfad)).length;
    return `<details class="felder-kat" data-kat="${kat.key}" ${offen === kat.key ? 'open' : ''}>
        <summary><b>${esc(kat.label)}</b> <small>${an} von ${felder.length} sichtbar</small></summary>
        <ul class="felder-liste">${felder.map((f) => `<li>
          <label class="check"><input type="checkbox" data-feld-an="${esc(f.pfad)}" ${istAus(fe, f.pfad) ? '' : 'checked'}> <span>${esc(f.label)}${f.unit ? ` <small>(${esc(f.unit)})</small>` : ''}</span></label>
          ${f.eigen ? `<span class="tag">${esc(FELD_TYPEN[f.type])}</span>
          <button type="button" class="btn klein ghost" data-feld-bearbeiten="${esc(f.pfad.slice(7))}" aria-label="${esc(f.label)} bearbeiten">✎</button>
          <button type="button" class="btn klein ghost" data-feld-loeschen="${esc(f.pfad.slice(7))}" aria-label="${esc(f.label)} löschen">🗑</button>` : ''}
        </li>`).join('')}</ul>
        <button type="button" class="btn klein" data-feld-neu="${kat.key}">+ Eigenes Feld</button>
      </details>`;
  }).join('')}
    </section>`;
}

function formHtml(f: Partial<EigenesFeld>, neu: boolean): string {
  const typ = f.typ || 'text';
  return `
    <label>Bezeichnung<input name="label" value="${esc(f.label || '')}" maxlength="100" required autocomplete="off" placeholder="z. B. Hund vorhanden"></label>
    <label>Bereich<select name="kategorie">${KATEGORIEN.map((k) => `<option value="${k.key}" ${k.key === f.kategorie ? 'selected' : ''}>${esc(k.label)}</option>`).join('')}</select></label>
    <label>Art des Feldes<select name="typ" ${neu ? '' : 'disabled'}>${(Object.keys(FELD_TYPEN) as FeldTyp[]).map((t) => `<option value="${t}" ${t === typ ? 'selected' : ''}>${esc(FELD_TYPEN[t])}</option>`).join('')}</select></label>
    ${neu ? '' : '<p class="hinweis">Die Art lässt sich nachträglich nicht ändern, damit vorhandene Werte gültig bleiben.</p>'}
    <label data-nur="number">Einheit (optional)<input name="einheit" value="${esc(f.einheit || '')}" maxlength="30" placeholder="z. B. m², €, Stück"></label>
    <label data-nur="select">Auswahlmöglichkeiten (eine pro Zeile)<textarea name="optionen" rows="5">${esc((f.optionen || []).join('\n'))}</textarea></label>`;
}

function lesen(dlg: HTMLElement, typFest?: FeldTyp): Partial<EigenesFeld> {
  const wert = (n: string) => (dlg.querySelector<HTMLInputElement>(`[name="${n}"]`)?.value ?? '').trim();
  return {
    label: wert('label'),
    kategorie: wert('kategorie') as Kategorie,
    typ: typFest || (wert('typ') as FeldTyp),
    einheit: wert('einheit'),
    optionen: wert('optionen').split('\n').map((o) => o.trim()).filter(Boolean),
  };
}

async function feldDialog(f: Partial<EigenesFeld>, neu: boolean): Promise<Partial<EigenesFeld> | null> {
  return dialog<Partial<EigenesFeld>>({
    titel: neu ? 'Eigenes Feld anlegen' : 'Eigenes Feld bearbeiten',
    html: formHtml(f, neu),
    knoepfe: [{
      label: neu ? 'Anlegen' : 'Speichern', primaer: true,
      pruefen: (dlg) => {
        const w = lesen(dlg, neu ? undefined : f.typ);
        if (!w.label) return 'Bitte eine Bezeichnung eingeben.';
        if (w.typ === 'select' && !w.optionen?.length) return 'Bitte mindestens eine Auswahlmöglichkeit eintragen.';
        return '';
      },
      wert: (dlg) => lesen(dlg, neu ? undefined : f.typ),
    }],
    onOpen: (dlg) => {
      const typSel = dlg.querySelector<HTMLSelectElement>('[name="typ"]')!;
      const zeigen = () => dlg.querySelectorAll<HTMLElement>('[data-nur]').forEach((x) => { x.style.display = x.dataset.nur === typSel.value ? '' : 'none'; });
      typSel.addEventListener('change', zeigen);
      zeigen();
      dlg.querySelector<HTMLInputElement>('[name="label"]')?.focus();
    },
  });
}

/** Wie viele Kunden haben einen Wert in diesem eigenen Feld? */
const mitWert = (id: string) => store.getData().kunden.filter((k) => k.eigene && k.eigene[id] !== undefined && k.eigene[id] !== '' && k.eigene[id] !== null).length;

export function verdrahten(root: HTMLElement, neuZeichnen: () => void) {
  const box = root.querySelector('#felderEinstellungen');
  if (!box) return;
  box.addEventListener('toggle', (ev) => {
    const d = ev.target as HTMLDetailsElement;
    if (d.dataset?.kat) { if (d.open) offen = d.dataset.kat as Kategorie; else if (offen === d.dataset.kat) offen = null; }
  }, true);
  box.addEventListener('change', (ev) => {
    const c = (ev.target as Element).closest<HTMLInputElement>('[data-feld-an]');
    if (!c) return;
    const pfad = c.dataset.feldAn!;
    store.mutate((d) => {
      const aus = new Set(d.einstellungen.felder.aus);
      if (c.checked) aus.delete(pfad); else aus.add(pfad);
      d.einstellungen.felder.aus = [...aus];
    });
    neuZeichnen();
  });
  box.addEventListener('click', async (ev) => {
    const t = ev.target as Element;
    const neuB = t.closest<HTMLElement>('[data-feld-neu]');
    const bearbB = t.closest<HTMLElement>('[data-feld-bearbeiten]');
    const loeschB = t.closest<HTMLElement>('[data-feld-loeschen]');
    if (neuB) {
      if (store.getData().einstellungen.felder.eigene.length >= MAX_EIGENE) { toast(`Höchstens ${MAX_EIGENE} eigene Felder.`, 'error'); return; }
      const w = await feldDialog({ kategorie: neuB.dataset.feldNeu as Kategorie, typ: 'text' }, true);
      const f = w && neuesEigenesFeld(w);
      if (!f) return;
      store.mutate((d) => { d.einstellungen.felder.eigene.push(f); });
      offen = f.kategorie;
      toast(`Feld „${f.label}“ angelegt`, 'ok');
      neuZeichnen();
    } else if (bearbB) {
      const id = bearbB.dataset.feldBearbeiten!;
      const alt = store.getData().einstellungen.felder.eigene.find((x) => x.id === id);
      if (!alt) return;
      const w = await feldDialog(alt, false);
      if (!w) return;
      const f = normalizeEigenesFeld({ ...alt, ...w, id, typ: alt.typ });
      if (!f) return;
      store.mutate((d) => { d.einstellungen.felder.eigene = d.einstellungen.felder.eigene.map((x) => (x.id === id ? f : x)); });
      offen = f.kategorie;
      neuZeichnen();
    } else if (loeschB) {
      const id = loeschB.dataset.feldLoeschen!;
      const f = store.getData().einstellungen.felder.eigene.find((x) => x.id === id);
      if (!f) return;
      const n = mitWert(id);
      const text = n
        ? `Bei ${n} ${n === 1 ? 'Kunde ist' : 'Kunden ist'} ein Wert eingetragen, der dabei endgültig gelöscht wird. Wenn du die Werte behalten willst, blende das Feld nur aus (Häkchen weg).`
        : 'Das Feld ist bei keinem Kunden ausgefüllt.';
      if (!(await bestaetigen(`Feld „${f.label}“ löschen?`, text, 'Feld löschen'))) return;
      store.mutate((d) => {
        d.einstellungen.felder.eigene = d.einstellungen.felder.eigene.filter((x) => x.id !== id);
        d.einstellungen.felder.aus = d.einstellungen.felder.aus.filter((p) => p !== `eigene.${id}`);
        for (const k of d.kunden) if (k.eigene && id in k.eigene) delete k.eigene[id];
      });
      toast(`Feld „${f.label}“ gelöscht`, 'ok');
      neuZeichnen();
    }
  });
}
