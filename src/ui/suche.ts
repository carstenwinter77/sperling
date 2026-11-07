// Sperling – Kommandozeile (Oberfläche): Suchen, Springen, Aktionen, „Zuletzt geöffnet“.
// Öffnen über das Feld auf der Übersicht, die Lupe in der Navigation oder ⌘K / Strg+K.
// Logik in core/suche.ts. Ausgabe nur über esc() (R-XSS). Im Beratungs-Schutz gesperrt.
import { esc } from '../core/util.ts';
import { kundenTitel, neuerKunde } from '../core/model.ts';
import { index, suchen, ausschnitt, zuletztHinzu, zuletztAufloesen, AKTION_LABEL, type Aktion, type Eintrag, type Treffer, type Befehl } from '../core/suche.ts';
import * as store from '../storage/store.ts';
import { katalog } from './produkte.ts';
import { KATEGORIEN } from '../core/produkte.ts';
import * as theme from './theme.ts';
import { toast } from './dom.ts';
import { anrufen, emailSchreiben } from './kontakt.ts';
import { navigieren } from './navi.ts';
import { terminDialog } from './parts.ts';
import * as enpalDoku from './enpaldoku.ts';
import { verleihDialog, reservierenDialog, ruecknahme } from './views/bestand.ts';

const istApfel = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
export const kuerzel = () => (istApfel() ? '⌘K' : 'Strg+K');

/** Ein auswählbarer Eintrag in der Liste (Vorschlag, Treffer oder Befehl). */
interface Wahl { treffer: Treffer | Eintrag; aktion?: Aktion }

let dlg: HTMLDialogElement | null = null;
let wahlen: Wahl[] = [];
let aktiv = 0;
let eintraege: Eintrag[] = [];

// ---------- Zuletzt geöffnet ----------

/** Kunden/Gerät als „zuletzt geöffnet“ merken (verschlüsselt im Store). */
export function merken(art: 'kunde' | 'geraet', id: string) {
  if (!store.isUnlocked() || store.schutzKunde()) return;
  const z = store.getData().einstellungen.zuletzt;
  if (z[0]?.art === art && z[0]?.id === id) return; // nichts geändert, nichts speichern
  try { store.mutate((d) => { d.einstellungen.zuletzt = zuletztHinzu(d.einstellungen.zuletzt, { art, id }); }); } catch (e) { console.error(e); }
}

export function zuletztHtml(): string {
  const d = store.getData();
  const liste = zuletztAufloesen(d, d.einstellungen.zuletzt);
  if (!liste.length) return '';
  return `<div class="zuletzt" aria-label="Zuletzt geöffnet"><span class="zuletzt-titel">Zuletzt:</span>${liste.map((z) => `<a class="zuletzt-chip" href="${esc(z.href)}">${z.art === 'geraet' ? '📦 ' : ''}${esc(z.titel)}</a>`).join('')}</div>`;
}

/** Großes Feld für die Übersicht. */
export function feldHtml(): string {
  return `<button type="button" class="such-feld" id="startSuche" aria-label="Suchen oder Befehl eingeben"><span aria-hidden="true">🔍</span><span class="such-feld-text">Kunde, Gerät, Termin oder Befehl …</span><kbd>${esc(kuerzel())}</kbd></button>`;
}

// ---------- Dialog ----------

export function oeffnen(vorgabe = '') {
  if (!store.isUnlocked()) return;
  if (store.schutzKunde()) { toast('Im Beratungs-Schutz ist die Suche aus.', 'error'); return; }
  if (dlg?.open) { feld()?.focus(); return; }
  eintraege = index(store.getData(), katalog().produkte.map((p) => ({ id: p.id, name: p.name, kategorieLabel: KATEGORIEN[p.kategorie], bereich: p.bereich, such: [p.modell, KATEGORIEN[p.kategorie], p.quelle, ...p.stichworte].join(' ') })));
  dlg = document.createElement('dialog');
  dlg.className = 'such-dlg';
  dlg.setAttribute('aria-label', 'Suchen und Befehle');
  dlg.innerHTML = `
    <div class="such-kopf">
      <span aria-hidden="true">🔍</span>
      <input type="search" id="suchFeld" placeholder="Suchen … oder z. B. „müller anrufen“" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" role="combobox" aria-expanded="true" aria-controls="suchListe" aria-autocomplete="list">
      <button type="button" class="such-zu" aria-label="Schließen">✕</button>
    </div>
    <div class="such-liste" id="suchListe" role="listbox"></div>
    <p class="such-fuss">↑ ↓ auswählen · Enter öffnen · Esc schließen</p>`;
  document.body.appendChild(dlg);
  const f = feld()!;
  f.value = vorgabe;
  dlg.addEventListener('close', () => { dlg?.remove(); dlg = null; });
  dlg.addEventListener('click', (ev) => {
    if (ev.target === dlg) { schliessen(); return; } // Hintergrund
    const t = ev.target as Element;
    if (t.closest('.such-zu')) { schliessen(); return; }
    const knopf = t.closest<HTMLElement>('[data-aktion]');
    const zeile = t.closest<HTMLElement>('[data-i]');
    if (!zeile) return;
    const w = wahlen[Number(zeile.dataset.i)];
    if (!w) return;
    ev.preventDefault();
    ausfuehren(w, (knopf?.dataset.aktion as Aktion) || w.aktion);
  });
  dlg.addEventListener('pointermove', (ev) => {
    const zeile = (ev.target as Element).closest<HTMLElement>('[data-i]');
    if (zeile && Number(zeile.dataset.i) !== aktiv) { aktiv = Number(zeile.dataset.i); markieren(false); }
  });
  f.addEventListener('input', zeichnen);
  f.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (!wahlen.length) return;
      aktiv = (aktiv + (ev.key === 'ArrowDown' ? 1 : -1) + wahlen.length) % wahlen.length;
      markieren(true);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const w = wahlen[aktiv];
      if (w) ausfuehren(w, w.aktion);
    }
  });
  dlg.showModal();
  f.focus();
  zeichnen();
}

export function schliessen() { dlg?.close(); }

const feld = () => dlg?.querySelector<HTMLInputElement>('#suchFeld') || null;

function zeichnen() {
  if (!dlg) return;
  const eingabe = feld()?.value || '';
  const liste = dlg.querySelector('#suchListe')!;
  wahlen = [];
  aktiv = 0;
  let html = '';
  if (!eingabe.trim()) {
    const d = store.getData();
    const zuletzt = zuletztAufloesen(d, d.einstellungen.zuletzt);
    const nachId = new Map(eintraege.map((e) => [`${e.art}:${e.id}`, e]));
    const zl = zuletzt.map((z) => nachId.get(`${z.art}:${z.id}`)).filter((e): e is Eintrag => !!e);
    if (zl.length) html += gruppeHtml('Zuletzt geöffnet', zl.map((e) => ({ treffer: e })), '');
    html += gruppeHtml('Befehle', eintraege.filter((e) => e.art === 'befehl').map((e) => ({ treffer: e })), '');
  } else {
    const r = suchen(eintraege, eingabe);
    if (r.vorschlag) html += gruppeHtml('Vorschlag', [{ treffer: r.vorschlag.ziel, aktion: r.vorschlag.aktion }], eingabe);
    for (const g of r.gruppen) html += gruppeHtml(g.label, g.treffer.map((t) => ({ treffer: t })), eingabe, g.mehr);
    if (!r.vorschlag && !r.gruppen.length) html = `<p class="such-leer">Nichts gefunden für „${esc(eingabe.trim())}“.</p>`;
  }
  liste.innerHTML = html;
  markieren(false);
}

function gruppeHtml(titel: string, neu: Wahl[], eingabe: string, mehr = 0): string {
  if (!neu.length) return '';
  const zeilen = neu.map((w) => {
    const i = wahlen.push(w) - 1;
    const t = w.treffer;
    const unter = t.art === 'notiz' && t.voll ? `${t.unter} · ${ausschnitt(t.voll, eingabe)}` : t.unter;
    const knoepfe = w.aktion ? '' : t.aktionen.map((a) => `<button type="button" class="btn klein" data-aktion="${a}">${esc(AKTION_LABEL[a])}</button>`).join('');
    const titelText = w.aktion ? `${AKTION_LABEL[w.aktion]}: ${t.titel}` : t.titel;
    return `<div class="such-treffer${w.aktion ? ' vorschlag' : ''}" role="option" id="st-${i}" data-i="${i}" data-art="${t.art}">
      <span class="such-haupt"><strong>${esc(titelText)}</strong>${unter ? `<small>${esc(unter)}</small>` : ''}</span>
      ${knoepfe ? `<span class="such-aktionen">${knoepfe}</span>` : ''}
    </div>`;
  }).join('');
  return `<section class="such-gruppe" role="group" aria-label="${esc(titel)}"><h3>${esc(titel)}</h3>${zeilen}${mehr ? `<p class="such-mehr">${mehr} weitere – genauer suchen</p>` : ''}</section>`;
}

function markieren(scrollen: boolean) {
  if (!dlg) return;
  dlg.querySelectorAll('.such-treffer').forEach((z) => z.classList.toggle('aktiv', Number((z as HTMLElement).dataset.i) === aktiv));
  const z = dlg.querySelector<HTMLElement>(`#st-${aktiv}`);
  feld()?.setAttribute('aria-activedescendant', z ? z.id : '');
  z?.setAttribute('aria-selected', 'true');
  if (scrollen) z?.scrollIntoView({ block: 'nearest' });
}

// ---------- Ausführen ----------

function gehe(href: string) {
  schliessen();
  if (location.hash === href) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = href;
}

function ausfuehren(w: Wahl, aktion?: Aktion) {
  const t = w.treffer;
  if (t.art === 'befehl') { befehl(t.befehl!); return; }
  if (!aktion) { gehe(t.href); return; }
  if (t.art === 'kunde') kundenAktion(t.id, aktion);
  else if (t.art === 'geraet') geraeteAktion(t.id, aktion);
}

function kundenAktion(id: string, aktion: Aktion) {
  const k = store.findKunde(id);
  if (!k) return;
  merken('kunde', id);
  if (aktion === 'hinfahren') {
    // im Klick selbst öffnen, sonst blockiert der Browser das neue Fenster
    schliessen();
    navigieren(k);
    return;
  }
  schliessen();
  switch (aktion) {
    case 'anrufen': anrufen(kundenTitel(k), k.telefon); break;
    case 'email': emailSchreiben({ an: k.email }); break;
    case 'notiz': gehe(`#/kunde/${id}?tab=notizen&fokus=notiz`); break;
    case 'termin': terminDialog({ kundeId: id }).then((t) => { if (t) neuZeichnen(); }); break;
    case 'doku': enpalDoku.textZeigen(id); break;
    case 'gespraech': gehe(`#/kunde/${id}/gespraech`); break;
    default: gehe(`#/kunde/${id}`);
  }
}

function geraeteAktion(id: string, aktion: Aktion) {
  const g = store.getData().geraete.find((x) => x.id === id);
  if (!g) return;
  merken('geraet', id);
  schliessen();
  const fertig = (ok: boolean) => { if (ok) neuZeichnen(); };
  if (aktion === 'verleihen') verleihDialog(g).then(fertig);
  else if (aktion === 'reservieren') reservierenDialog(g).then(fertig);
  else if (aktion === 'zuruecknehmen') ruecknahme(g, false).then(fertig);
  else gehe(`#/bestand?geraet=${id}`);
}

/** Aktuelle Ansicht neu zeichnen, damit Änderungen sichtbar werden. */
const neuZeichnen = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

function befehl(b: Befehl) {
  schliessen();
  switch (b) {
    case 'neuerKunde': {
      const k = neuerKunde();
      store.mutate((d) => { d.kunden.push(k); });
      gehe(`#/kunde/${k.id}?neu=1`);
      break;
    }
    case 'neuerTermin': terminDialog({}).then((t) => { if (t) neuZeichnen(); }); break;
    case 'geraetVerleihen': gehe('#/bestand'); break;
    case 'sichern':
      if (store.isDemo()) { toast('In der Demo wird nichts gespeichert.', 'info', 5000); break; }
      // Das Teilen-Menü braucht einen eigenen Tipp (Safari), deshalb zum Knopf führen statt direkt zu sichern
      gehe('#/einstellungen');
      setTimeout(() => {
        const b = document.getElementById('icloud');
        b?.scrollIntoView({ block: 'center' });
        b?.focus();
      }, 150);
      break;
    case 'thema': theme.umschalten(); if (location.hash.startsWith('#/einstellungen')) neuZeichnen(); break;
    case 'sperren': document.getElementById('sperren')?.click(); break;
  }
}

// ---------- Tastenkürzel ----------

let verdrahtet = false;
export function verdrahten() {
  if (verdrahtet) return;
  verdrahtet = true;
  document.addEventListener('keydown', (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && !ev.shiftKey && ev.key.toLowerCase() === 'k') {
      if (!store.isUnlocked() || document.body.classList.contains('gesperrt')) return;
      ev.preventDefault();
      if (dlg?.open) schliessen(); else oeffnen();
    }
  });
}

