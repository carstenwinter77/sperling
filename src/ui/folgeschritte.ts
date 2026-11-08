// Sperling – „Als Nächstes“ nach dem Gespräch (ab 0.14.0): Ein Fenster mit den Schritten, die zum Ergebnis passen
// (Termin bestätigen, Angebot erfassen, Auftrag beginnen, Enpal-Doku kopieren …). Jeder Schritt öffnet sein Fenster,
// danach kommt Jan zurück in diese Liste; „Fertig“ schließt sie. Die Seite darunter ist schon die, von der Jan kam.
import { esc, formatDateTime, nowIso } from '../core/util.ts';
import { SPARTEN, kundenTitel, neuerTermin, type Sparte, type Termin } from '../core/model.ts';
import { neuerAuftrag, ortsTag } from '../core/vertrieb.ts';
import { querverkauf, offeneAngeboteBereich, naechsterStopp, wvDatum } from '../core/verzahnung.ts';
import type { Abschluss, Entwurf } from '../core/gespraech.ts';
import * as store from '../storage/store.ts';
import { dialog, toast } from './dom.ts';
import { emailSchreiben } from './kontakt.ts';
import { naviLink } from './navi.ts';
import * as enpalDoku from './enpaldoku.ts';
import { angebotDialog, angebotEntscheiden, apDialog, bestaetigungSenden } from './vertrieb.ts';

export interface Folge {
  key: string;
  label: string;
  hinweis?: string;
  /** Link statt Knopf (Navi-App muss direkt aus dem Tippen geöffnet werden) */
  href?: string;
  ausfuehren?: () => Promise<unknown>;
}

/** Was nach diesem Gespräch sinnvoll ist. `neueTermine` = beim Speichern angelegte Termine/Wiedervorlagen. */
export function folgenNachGespraech(e: Entwurf, abschluesse: Abschluss[], neueTermine: Termin[], enpalId: string, jetzt = new Date()): Folge[] {
  const d = store.getData();
  const k = d.kunden.find((x) => x.id === e.kundeId);
  if (!k) return [];
  const out: Folge[] = [];
  const id = k.id;
  // Termin bestätigen (nur Termine in der Zukunft und wenn es einen Weg zum Kunden gibt)
  for (const t of neueTermine) {
    if (t.art !== 'termin' || t.beginn <= jetzt.toISOString() || !(k.telefon || k.email)) continue;
    out.push({ key: `bestaetigen:${t.id}`, label: `✅ Termin am ${formatDateTime(t.beginn)} bestätigen`, hinweis: 'SMS, WhatsApp oder E-Mail mit „Bitte bereitlegen“', ausfuehren: () => bestaetigungSenden(t) });
  }
  for (const a of abschluesse) {
    const s = a.sparte;
    const offen = offeneAngeboteBereich(k, s);
    if (a.ausgang === 'angebot') {
      out.push({ key: `angebot:${s}`, label: `📄 Angebot ${SPARTEN[s].label} erfassen`, hinweis: 'Betrag, gültig bis; Sperling legt die Nachfass-Wiedervorlagen an', ausfuehren: () => angebotDialog(id, null, s) });
    }
    if (a.ausgang === 'abschluss' || a.status === 'abschluss') {
      if (offen[0]) out.push({ key: `angenommen:${offen[0].id}`, label: `✓ Angebot „${offen[0].titel || SPARTEN[s].label}“ als angenommen markieren`, hinweis: 'beginnt den Auftragsstand, erledigt das Nachfassen', ausfuehren: () => angebotEntscheiden(id, offen[0]!, 'angenommen') });
      else if (!k.auftrag[s]) out.push({ key: `auftrag:${s}`, label: `🛠 Auftragsstand ${SPARTEN[s].label} beginnen`, hinweis: 'Schritte bis zur Montage abhaken, Stand an den Kunden schicken', ausfuehren: async () => auftragBeginnen(id, s) });
    }
    if ((a.ausgang === 'kein' || a.status === 'kein_interesse') && offen[0]) {
      out.push({ key: `abgelehnt:${offen[0].id}`, label: `✗ Angebot „${offen[0].titel || SPARTEN[s].label}“ als abgelehnt markieren`, hinweis: 'erledigt die Nachfass-Wiedervorlagen', ausfuehren: () => angebotEntscheiden(id, offen[0]!, 'abgelehnt') });
    }
    if (/unterlagen/i.test(a.schritt) && k.email) {
      out.push({ key: `mail:${s}`, label: '✉️ Unterlagen per E-Mail schicken', ausfuehren: () => unterlagenMail(id, s) });
    }
  }
  // Partner fehlte: zweiten Entscheider eintragen
  const partner = e.sparten.some((s) => (e.antworten?.[s]?.entscheider || '').includes('Partner fehlt'));
  if (partner && !k.ansprechpartner.length) out.push({ key: 'partner', label: '👥 Partner als Ansprechpartner eintragen', hinweis: 'Name, Telefon; Rolle „Entscheidet“', ausfuehren: () => apDialog(id, null) });
  // Enpal-Dokumentation (Pflicht für Enpal) direkt kopieren
  if (enpalId) out.push({ key: 'enpal', label: '📋 Enpal-Doku kopieren', hinweis: 'Text für die Enpal-App', ausfuehren: () => enpalDoku.textZeigen(id, enpalId) });
  // Chancen im anderen Bereich
  for (const q of querverkauf(k, e.antworten, e.sparten)) {
    out.push({ key: `quer:${q.sparte}`, label: `💡 ${SPARTEN[q.sparte].label}: auf „Potenzial“ setzen`, hinweis: `${q.grund} Mit Wiedervorlage in 2 Wochen.`, ausfuehren: async () => querverkaufMerken(id, q.sparte, jetzt) });
  }
  // Tagesroute: nächster Termin heute
  const stopp = naechsterStopp(d, jetzt, id);
  if (stopp) {
    const sk = d.kunden.find((x) => x.id === stopp.kundeId);
    const href = stopp.ort ? naviLink({ ort: stopp.ort }) : sk ? naviLink(sk) : '';
    const uhr = new Date(stopp.beginn).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (href) out.push({ key: `stopp:${stopp.id}`, label: `🚗 Weiter zum nächsten Termin: ${uhr} Uhr ${sk ? kundenTitel(sk) : stopp.titel}`, hinweis: stopp.ort || '', href });
  }
  return out;
}

function auftragBeginnen(kundeId: string, s: Sparte) {
  store.mutate((d) => { const x = d.kunden.find((y) => y.id === kundeId); if (x && !x.auftrag[s]) { x.auftrag[s] = neuerAuftrag(s, ortsTag(new Date())); x.updatedAt = nowIso(); } });
  toast(`Auftragsstand ${SPARTEN[s].label} begonnen (Kunde › Angebot & Auftrag)`, 'ok');
}

function querverkaufMerken(kundeId: string, s: Sparte, jetzt: Date) {
  store.mutate((d) => {
    const x = d.kunden.find((y) => y.id === kundeId);
    if (!x) return;
    if (x.status[s] === 'unbekannt') x.status[s] = 'potenzial';
    d.termine.push(neuerTermin({ kundeId, sparte: s, art: 'wiedervorlage', dauerMin: 15, beginn: wvDatum(14, jetzt), titel: `${SPARTEN[s].label} ansprechen – ${kundenTitel(x)}` }));
    x.updatedAt = nowIso();
  });
  toast(`${SPARTEN[s].label}: Potenzial, Wiedervorlage in 2 Wochen`, 'ok');
}

async function unterlagenMail(kundeId: string, s: Sparte) {
  const k = store.findKunde(kundeId);
  if (!k) return;
  const absender = store.getData().einstellungen.absender;
  const anrede = k.nachname ? `Guten Tag ${[k.anrede, k.nachname].filter(Boolean).join(' ')},` : 'Guten Tag,';
  await emailSchreiben({ an: k.email, betreff: `Ihre Unterlagen ${SPARTEN[s].label}`, text: `${anrede}\n\nwie besprochen erhalten Sie anbei die Unterlagen.\n\n\nViele Grüße${absender ? `\n${absender}` : ''}` });
}

/**
 * Fenster „Als Nächstes“ zeigen, bis Jan „Fertig“ tippt oder alles erledigt ist.
 * Gibt true zurück, wenn mindestens ein Schritt ausgeführt wurde (Seite neu zeichnen).
 */
export async function folgenZeigen(titel: string, folgen: Folge[]): Promise<boolean> {
  if (!folgen.length) return false;
  const erledigt = new Set<string>();
  let etwas = false;
  for (;;) {
    let gewaehlt = '';
    const offen = folgen.filter((f) => !erledigt.has(f.key));
    if (!offen.length) break;
    const zu = await dialog<string>({
      titel,
      html: `<p class="hinweis">Tipp an, was du jetzt erledigen willst. Danach geht es hier weiter, „Fertig“ bringt dich zurück.</p>
        <ul class="folge-liste">${folgen.map((f) => `<li class="${erledigt.has(f.key) ? 'erledigt' : ''}">
          ${f.href
    ? `<a class="btn folge-knopf" href="${esc(f.href)}" target="_blank" rel="noopener" data-folge="${esc(f.key)}">${esc(f.label)}</a>`
    : `<button type="button" class="btn folge-knopf" data-folge="${esc(f.key)}" ${erledigt.has(f.key) ? 'disabled' : ''}>${erledigt.has(f.key) ? '✓ ' : ''}${esc(f.label)}</button>`}
          ${f.hinweis ? `<small>${esc(f.hinweis)}</small>` : ''}</li>`).join('')}</ul>`,
      knoepfe: [{ label: 'Fertig', primaer: true, wert: 'fertig' }],
      onOpen: (dlg) => {
        dlg.classList.add('dlg-folge');
        const zuKnopf = dlg.querySelector<HTMLElement>('.dlg-actions button.ghost');
        if (zuKnopf) zuKnopf.hidden = true; // nur „Fertig“
        dlg.querySelector('.folge-liste')?.addEventListener('click', (ev) => {
          const b = (ev.target as Element).closest<HTMLElement>('[data-folge]');
          if (!b) return;
          gewaehlt = b.dataset.folge || '';
          // Links öffnen selbst (Navi-App), danach Fenster schließen
          setTimeout(() => dlg.close(), b.tagName === 'A' ? 50 : 0);
        });
      },
    });
    if (!gewaehlt) { if (zu === null || zu === 'fertig') break; continue; }
    const f = folgen.find((x) => x.key === gewaehlt);
    if (!f) break;
    erledigt.add(f.key);
    if (f.href) break; // unterwegs zum nächsten Termin: Liste nicht wieder öffnen
    try { await f.ausfuehren?.(); etwas = true; } catch (err) { toast((err as Error).message, 'error'); }
  }
  return etwas;
}
