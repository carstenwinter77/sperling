// Sperling – Formularfelder der Kundenkartei aus der Feldverwaltung (eingebaute + eigene Felder).
import { esc } from '../core/util.ts';
import { sichtbareFelder, feldWertLesen, speicherPfad, type AnzeigeFeld, type Kategorie, type FeldEinstellungen } from '../core/felder.ts';
import type { Rec } from '../core/util.ts';

const INPUT_TYP: Partial<Record<AnzeigeFeld['type'], string>> = { tel: 'tel', email: 'email', url: 'url', date: 'date' };

/** Ein Eingabefeld. Gebunden über data-feld (siehe bindeFelder in views/kunde.ts). */
export function feldHtml(f: AnzeigeFeld, wert: unknown, extra = ''): string {
  const pfad = esc(speicherPfad(f));
  const lbl = `${esc(f.label)}${f.unit ? ` <small>(${esc(f.unit)})</small>` : ''}`;
  if (f.type === 'select') {
    const opts = f.options || [];
    // Ein Wert, der nicht (mehr) in der Liste steht, bleibt sichtbar und erhalten
    const fremd = typeof wert === 'string' && wert && !opts.includes(wert) ? `<option selected>${esc(wert)}</option>` : '';
    return `<label>${lbl}<select data-feld="${pfad}"><option value="">–</option>${opts.map((o) => `<option ${o === wert ? 'selected' : ''}>${esc(o)}</option>`).join('')}${fremd}</select></label>`;
  }
  if (f.type === 'bool') {
    return `<label>${lbl}<select data-feld="${pfad}" data-typ="bool"><option value="">–</option><option value="ja" ${wert === true ? 'selected' : ''}>ja</option><option value="nein" ${wert === false ? 'selected' : ''}>nein</option></select></label>`;
  }
  if (f.type === 'number') {
    return `<label>${lbl}<input data-feld="${pfad}" data-typ="number" inputmode="decimal" value="${wert === null || wert === undefined || wert === '' ? '' : esc(String(wert).replace('.', ','))}"></label>`;
  }
  if (f.type === 'textarea') {
    return `<label class="breit">${lbl}<textarea data-feld="${pfad}" rows="3">${esc(typeof wert === 'string' ? wert : '')}</textarea></label>`;
  }
  const typ = INPUT_TYP[f.type];
  const zusatz = f.pfad === 'kontakt.plz' ? ' inputmode="numeric"' : f.pfad === 'kontakt.vorname' || f.pfad === 'kontakt.nachname' ? ' autocomplete="off"' : '';
  return `<label${f.breit ? ' class="breit"' : ''}>${lbl}${extra ? '<span class="feld-mit-knopf">' : ''}<input data-feld="${pfad}"${typ ? ` type="${typ}"` : ''}${zusatz}${f.platzhalter ? ` placeholder="${esc(f.platzhalter)}"` : ''} value="${esc(typeof wert === 'string' ? wert : '')}">${extra ? `${extra}</span>` : ''}</label>`;
}

/** Alle eingeschalteten Felder einer Kategorie als Formular-Inhalt. `extras` hängt Knöpfe an Felder (Pfad → HTML). */
export function felderHtml(kat: Kategorie, k: Rec, fe: FeldEinstellungen | undefined, extras: Record<string, string> = {}): string {
  return sichtbareFelder(kat, fe).map((f) => feldHtml(f, feldWertLesen(k, f), extras[f.pfad])).join('');
}
