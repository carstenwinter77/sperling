// Sperling – Anrufen und E-Mail schreiben aus der App heraus.
// Anrufe: immer mit Sicherheitsabfrage (Android wählt bei tel: sonst ohne Rückfrage).
// E-Mail: Standard-Mailprogramm (mailto:), Gmail oder Outlook im Browser. Die Wahl
// kann pro Gerät gemerkt werden (localStorage, keine Kundendaten – R-KRYPTO).
import { esc } from '../core/util.js';
import { dialog, toast, kopieren } from './dom.js';

const KEY = 'sperling.mailprogramm';
export const MAILPROGRAMME = {
  standard: 'Standard-Mailprogramm des Geräts',
  gmail: 'Gmail (im Browser)',
  outlook: 'Outlook (im Browser)',
};
// mailto-Links über ca. 1800 Zeichen werden von manchen Systemen abgeschnitten.
const MAILTO_MAX = 1800;

export function gemerktesMailprogramm() {
  try { const v = localStorage.getItem(KEY); return MAILPROGRAMME[v] ? v : ''; } catch { return ''; }
}

export function mailprogrammMerken(v) {
  try { if (MAILPROGRAMME[v]) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* privat: nicht merkbar */ }
}

/** Telefonnummer für tel:-Links bereinigen (+, Ziffern). */
export function telNummer(nr) {
  return String(nr || '').replace(/(?!^\+)[^\d]/g, '');
}

function linkOeffnen(href, neuerTab) {
  const a = document.createElement('a');
  a.href = href;
  if (neuerTab) { a.target = '_blank'; a.rel = 'noopener'; }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Anruf mit Sicherheitsabfrage. */
export async function anrufen(name, nummer) {
  const nr = telNummer(nummer);
  if (nr.replace('+', '').length < 3) { toast('Keine gültige Telefonnummer hinterlegt.', 'error'); return; }
  const ok = await dialog({
    titel: 'Anrufen?',
    html: `<p><b>${esc(name || 'Kontakt')}</b></p><p class="tel-gross">${esc(nummer)}</p><p class="hinweis">Am Handy startet der Anruf direkt. Am Tablet oder Laptop öffnet sich die verknüpfte Telefon-App (z. B. über das iPhone), falls eingerichtet. Sonst die Nummer kopieren.</p>`,
    knoepfe: [{ label: 'Nummer kopieren', wert: 'kopieren' }, { label: '📞 Jetzt anrufen', primaer: true, wert: 'anrufen' }],
  });
  if (ok === 'anrufen') linkOeffnen(`tel:${nr}`, false);
  else if (ok === 'kopieren') toast((await kopieren(nummer)) ? 'Nummer kopiert' : 'Kopieren nicht möglich', 'ok');
}

export function mailUrl(programm, { an, betreff, text }) {
  const enc = encodeURIComponent;
  if (programm === 'gmail') return `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(an)}&su=${enc(betreff)}&body=${enc(text)}`;
  if (programm === 'outlook') return `https://outlook.office.com/mail/deeplink/compose?to=${enc(an)}&subject=${enc(betreff)}&body=${enc(text)}`;
  return `mailto:${enc(an).replace(/%40/g, '@')}?subject=${enc(betreff)}&body=${enc(text)}`;
}

/**
 * E-Mail-Dialog: Empfänger, Betreff, Text (vorausgefüllt), Mailprogramm wählen/merken.
 * vorlagen: optionale Liste {label, betreff, text} zum Umschalten.
 */
export async function emailSchreiben({ an = '', betreff = '', text = '', vorlagen = [] } = {}) {
  const gemerkt = gemerktesMailprogramm();
  const res = await dialog({
    titel: 'E-Mail schreiben',
    html: `
      ${vorlagen.length ? `<label>Vorlage<select name="vorlage">${vorlagen.map((v, i) => `<option value="${i}">${esc(v.label)}</option>`).join('')}</select></label>` : ''}
      <label>An<input type="email" name="an" value="${esc(an)}" placeholder="name@beispiel.de" autocomplete="off"></label>
      <label>Betreff<input name="betreff" value="${esc(vorlagen[0]?.betreff ?? betreff)}" maxlength="300"></label>
      <label>Text<textarea name="text" rows="8">${esc(vorlagen[0]?.text ?? text)}</textarea></label>
      <label>Senden mit<select name="programm">${Object.entries(MAILPROGRAMME).map(([k, v]) => `<option value="${k}" ${k === (gemerkt || 'standard') ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" name="merken" ${gemerkt ? 'checked' : ''}> Auswahl auf diesem Gerät merken</label>`,
    onOpen: (dlg) => {
      const sel = dlg.querySelector('[name=vorlage]');
      sel?.addEventListener('change', () => {
        const v = vorlagen[Number(sel.value)];
        if (!v) return;
        dlg.querySelector('[name=betreff]').value = v.betreff;
        dlg.querySelector('[name=text]').value = v.text;
      });
    },
    knoepfe: [{
      label: 'Im Mailprogramm öffnen', primaer: true,
      pruefen: (dlg) => {
        const a = dlg.querySelector('[name=an]').value.trim();
        return a && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a) ? 'Die E-Mail-Adresse sieht nicht gültig aus.' : null;
      },
      wert: (dlg) => ({
        an: dlg.querySelector('[name=an]').value.trim(),
        betreff: dlg.querySelector('[name=betreff]').value,
        text: dlg.querySelector('[name=text]').value,
        programm: dlg.querySelector('[name=programm]').value,
        merken: dlg.querySelector('[name=merken]').checked,
      }),
    }],
  });
  if (!res) return;
  mailprogrammMerken(res.merken ? res.programm : '');
  let { text: inhalt } = res;
  if (res.programm === 'standard' && mailUrl('standard', res).length > MAILTO_MAX) {
    // Zu lang für mailto: vollständigen Text in die Zwischenablage, gekürzten Text übergeben
    await kopieren(inhalt);
    inhalt = `${inhalt.slice(0, 600)}\n\n[Text gekürzt – vollständiger Text liegt in der Zwischenablage, bitte hier einfügen]`;
    toast('Langer Text: vollständige Fassung wurde in die Zwischenablage kopiert.', 'ok', 6000);
  }
  linkOeffnen(mailUrl(res.programm, { ...res, text: inhalt }), res.programm !== 'standard');
}
