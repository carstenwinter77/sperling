// Sperling – Einstellungen → Textbausteine: je Bereich Bausteine anlegen, ändern, sortieren, löschen
// und die Startliste wiederherstellen. Gespeichert verschlüsselt in einstellungen.bausteine.
import { esc } from '../core/util.ts';
import { SPARTEN, SPARTEN_KEYS, type Sparte } from '../core/model.ts';
import { STANDARD_BAUSTEINE, MAX_BAUSTEINE, MAX_BAUSTEIN_LAENGE, bausteinListe, type Bausteine } from '../core/bausteine.ts';
import * as store from '../storage/store.ts';
import { bestaetigen, toast } from './dom.ts';
import * as hilfe from './hilfe.ts';

let offen: Sparte | null = null; // aufgeklappter Bereich überlebt das Neuzeichnen

export function html(bs: Bausteine): string {
  return `
    <section class="karte-box" id="bausteinEinstellungen">
      <h2>Textbausteine ${hilfe.knopf('bausteine')}</h2>
      <p class="hinweis">Kurze Sätze, die du im Gesprächsmodus über dem Notizfeld antippst. Jeder Tipp hängt den Satz als neue Zeile an die Notiz an.</p>
      ${SPARTEN_KEYS.map((s) => `<details class="felder-kat" data-baustein-bereich="${s}" ${offen === s ? 'open' : ''}>
        <summary><b>${esc(SPARTEN[s].label)}</b> <small>${bs[s].length} Bausteine</small></summary>
        <ol class="baustein-liste">${bs[s].map((t, i) => `<li>
          <input value="${esc(t)}" maxlength="${MAX_BAUSTEIN_LAENGE}" data-bs-text="${i}" aria-label="Baustein ${i + 1}" autocomplete="off">
          <button type="button" class="btn klein ghost" data-bs-hoch="${i}" aria-label="Nach oben" ${i ? '' : 'disabled'}>↑</button>
          <button type="button" class="btn klein ghost" data-bs-runter="${i}" aria-label="Nach unten" ${i < bs[s].length - 1 ? '' : 'disabled'}>↓</button>
          <button type="button" class="btn klein ghost" data-bs-weg="${i}" aria-label="Löschen">🗑</button>
        </li>`).join('')}</ol>
        <form class="baustein-neu" data-bs-neu="${s}"><input name="neu" maxlength="${MAX_BAUSTEIN_LAENGE}" placeholder="Neuer Baustein, z. B. „Rückruf am Abend“" autocomplete="off" aria-label="Neuer Baustein"><button class="btn klein">+ Hinzufügen</button></form>
        <button type="button" class="btn klein ghost" data-bs-standard="${s}">Startliste wiederherstellen</button>
      </details>`).join('')}
    </section>`;
}

export function verdrahten(root: HTMLElement, neuZeichnen: () => void) {
  const box = root.querySelector<HTMLElement>('#bausteinEinstellungen');
  if (!box) return;
  const bereichVon = (el: Element) => el.closest<HTMLElement>('[data-baustein-bereich]')?.dataset.bausteinBereich as Sparte | undefined;
  const aendern = (s: Sparte, f: (liste: string[]) => string[]) => {
    store.mutate((d) => { d.einstellungen.bausteine[s] = bausteinListe(f([...d.einstellungen.bausteine[s]])); });
    offen = s;
    neuZeichnen();
  };
  box.addEventListener('toggle', (ev) => {
    const d = ev.target as HTMLElement;
    const s = d.dataset?.bausteinBereich as Sparte | undefined;
    if (s) { if ((d as HTMLDetailsElement).open) offen = s; else if (offen === s) offen = null; }
  }, true);
  box.addEventListener('change', (ev) => {
    const inp = (ev.target as Element).closest<HTMLInputElement>('[data-bs-text]');
    const s = inp && bereichVon(inp);
    if (!inp || !s) return;
    const i = Number(inp.dataset.bsText);
    const t = inp.value.trim();
    aendern(s, (l) => (t ? l.map((x, j) => (j === i ? t : x)) : l.filter((_, j) => j !== i)));
  });
  box.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target as HTMLFormElement;
    const s = f.dataset.bsNeu as Sparte;
    const t = (f.elements.namedItem('neu') as HTMLInputElement).value.trim();
    if (!t || !SPARTEN_KEYS.includes(s)) return;
    const l = store.getData().einstellungen.bausteine[s];
    if (l.length >= MAX_BAUSTEINE) { toast(`Höchstens ${MAX_BAUSTEINE} Bausteine je Bereich.`, 'error'); return; }
    if (l.includes(t.replace(/\s+/g, ' '))) { toast('Diesen Baustein gibt es schon.', 'info'); return; }
    aendern(s, (x) => [...x, t]);
    setTimeout(() => root.querySelector<HTMLInputElement>(`[data-bs-neu="${s}"] input`)?.focus(), 0);
  });
  box.addEventListener('click', async (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-bs-hoch],[data-bs-runter],[data-bs-weg],[data-bs-standard]');
    const s = b && bereichVon(b);
    if (!b || !s) return;
    if (b.dataset.bsStandard) {
      if (!(await bestaetigen(`Startliste ${SPARTEN[s].label} wiederherstellen?`, 'Deine Bausteine dieses Bereichs werden durch die mitgelieferte Startliste ersetzt.', 'Wiederherstellen'))) return;
      aendern(s, () => [...STANDARD_BAUSTEINE[s]]);
      return;
    }
    const tausch = (l: string[], a: number, z: number) => { if (z < 0 || z >= l.length) return l; [l[a], l[z]] = [l[z]!, l[a]!]; return l; };
    if (b.dataset.bsHoch) { const i = Number(b.dataset.bsHoch); aendern(s, (l) => tausch(l, i, i - 1)); }
    else if (b.dataset.bsRunter) { const i = Number(b.dataset.bsRunter); aendern(s, (l) => tausch(l, i, i + 1)); }
    else if (b.dataset.bsWeg) { const i = Number(b.dataset.bsWeg); aendern(s, (l) => l.filter((_, j) => j !== i)); }
  });
}
