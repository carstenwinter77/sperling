// Sperling – Willkommen und Rund-Tour: beim ersten Start einmal anbieten, danach jederzeit über
// Hilfe, Einstellungen, „Mehr“ oder die Suche. Hebt nacheinander die Bereiche der Navigation hervor.
// Merker `tourGesehen` in localStorage `sperling.hilfe` (Gerätevorliebe, keine Kundendaten).
import { esc } from '../core/util.ts';
import { maskottchen, toast } from './dom.ts';
import { vorlieben, vorliebeSetzen } from './hilfe.ts';

export interface Schritt {
  /** CSS-Selektoren, der erste sichtbare wird hervorgehoben; leer = Karte in der Mitte */
  ziel: string[];
  titel: string;
  text: string;
  /** Zusatz, wenn das Ziel nur über „Mehr“ erreichbar ist (Handy) */
  mehr?: string;
}

const nav = (key: string) => [`.hauptnav [data-nav="${key}"]`, '#navMehr'];

export const SCHRITTE: Schritt[] = [
  { ziel: nav('start'), titel: 'Übersicht', text: 'Dein Start in den Tag: was heute ansteht, überfällige Wiedervorlagen, Chancen in anderen Sparten und was nachbestellt werden muss.' },
  { ziel: ['.start-suche', '#navSuche'], titel: 'Suchen', text: 'Kunden, Termine, Geräte und Hilfe finden: Name, Straße oder Telefonnummer eintippen. Auch Befehle wie „Meier anrufen“ gehen.' },
  { ziel: nav('kunden'), titel: 'Kunden', text: 'Deine Kartei mit Status je Sparte (PV, Wärmepumpe, Vorwerk), Notizen und den fertigen Texten für Enpal, GALVANY und Vorwerk. Hier importierst du auch die Vorwerk-Liste.' },
  { ziel: nav('karte'), titel: 'Karte', text: 'Alle Kunden auf der Karte oder im Satellitenbild, mit Nachbarn im Umkreis. Praktisch, um Touren zu planen.' },
  { ziel: nav('termine'), titel: 'Kalender', text: 'Termine und Wiedervorlagen in Monat, Woche oder Tag, mit Feiertagen. Unter „Geräte“ siehst du, wann welches Vorführgerät belegt ist.' },
  { ziel: nav('gespraech'), titel: 'Gespräch', text: 'Der Gesprächsleitfaden in sieben Phasen mit Einwandbehandlung. Ergebnis und Wiedervorlage landen direkt beim Kunden.', mehr: 'Auf dem iPhone unter „Mehr“.' },
  { ziel: nav('bestand'), titel: 'Bestand', text: 'Vorführgeräte im Auto, Leihgaben mit Leihschein, Reservierungen und Verbrauchsmaterial mit Mindestbestand.', mehr: 'Auf dem iPhone unter „Mehr“.' },
  { ziel: nav('produkte'), titel: 'Produkte', text: 'Die Produktübersicht von Enpal, GALVANY und Vorwerk mit Preisen und technischen Daten, zum Zeigen beim Kunden.', mehr: 'Auf dem iPhone unter „Mehr“.' },
  { ziel: nav('auswertung'), titel: 'Auswertungen', text: 'Gespräche, Abschlüsse und Termine je Zeitraum, mit „Fokus je Sparte“ und Kurztipp. Als PDF auf einer Seite.', mehr: 'Auf dem iPhone unter „Mehr“.' },
  { ziel: nav('einstellungen'), titel: 'Einstellungen', text: 'Sicherung in iCloud, Felder, Textvorlagen, Face ID und Darstellung. Hier startest du diese Tour auch wieder.', mehr: 'Auf dem iPhone unter „Mehr“.' },
  { ziel: ['#sperren', '#navMehr'], titel: 'Sperren', text: 'Ein Tipp sperrt Sperling. Danach nur mit Passwort oder Face ID wieder öffnen. Alle Daten sind auf dem Gerät verschlüsselt.' },
  { ziel: [], titel: 'Beratungs-Schutz 🛡', text: 'Sitzt du beim Kunden, tippst du in seiner Kartei unten rechts auf 🛡. Dann ist nur noch dieser Kunde sichtbar, bis du mit Passwort oder Face ID aufhebst.' },
  { ziel: [], titel: 'Fertig!', text: 'Die ?-Knöpfe erklären jede Seite kurz. Die Tour findest du jederzeit unter Hilfe, in den Einstellungen und über die Suche („Tour“).' },
];

const sichtbar = (e: Element | null): e is HTMLElement => {
  if (!e) return false;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
};

export const offen = () => !!document.querySelector('#tour');

/** Beim ersten Start (einmal je Gerät) die Willkommenskarte zeigen. */
export function beimStart(versuch = 0) {
  if (vorlieben().tourGesehen || offen()) return;
  // erst, wenn kein anderer Dialog (z. B. Face ID einrichten) mehr offen ist
  if (document.querySelector('dialog[open]')) { if (versuch < 40) setTimeout(() => beimStart(versuch + 1), 800); return; }
  if (document.body.classList.contains('gesperrt')) return;
  willkommen();
}

/** Willkommen: Tour starten oder später. */
export function willkommen() {
  oeffnen((karte, zu) => {
    karte.innerHTML = `
      <div class="tour-willkommen">${maskottchen('sperling', 'tour-bild')}</div>
      <h2 id="tourTitel">Willkommen bei Sperling!</h2>
      <p>Deine App für Kunden, Termine und Vorführgeräte, für Photovoltaik, Wärmepumpe und Vorwerk. Alles bleibt verschlüsselt auf deinem Gerät.</p>
      <p>Magst du eine kurze Rund-Tour (etwa eine Minute)?</p>
      <div class="tour-knoepfe"><button type="button" class="btn ghost" data-tour="spaeter">Später</button><button type="button" class="btn primary" data-tour="start">Tour starten</button></div>`;
    karte.querySelector<HTMLElement>('[data-tour=start]')!.focus();
    karte.addEventListener('click', (ev) => {
      const b = (ev.target as Element).closest<HTMLElement>('[data-tour]');
      if (!b) return;
      if (b.dataset.tour === 'start') { zu(false); starten(); } else {
        zu(true);
        toast('Die Tour findest du jederzeit unter Hilfe und in den Einstellungen.', 'ok', 5000);
      }
    }, { once: true });
  });
}

/** Rund-Tour durch die Bereiche. */
export function starten(ab = 0) {
  if (!location.hash || location.hash === '#' || location.hash.startsWith('#/?') || location.hash === '#/') { /* schon auf der Übersicht */ } else location.hash = '#/';
  let i = Math.max(0, Math.min(ab, SCHRITTE.length - 1));
  oeffnen((karte, zu, loch) => {
    const zeigen = () => {
      const s = SCHRITTE[i]!;
      const ziel = s.ziel.map((sel) => document.querySelector(sel)).find(sichtbar) || null;
      const ueberMehr = !!ziel && ziel.id === 'navMehr' && !s.ziel[0]!.includes('navMehr');
      karte.innerHTML = `
        <p class="tour-zaehler">${i + 1} von ${SCHRITTE.length}</p>
        <h2 id="tourTitel">${esc(s.titel)}</h2>
        <p>${esc(s.text)}</p>
        ${ueberMehr && s.mehr ? `<p class="hinweis">${esc(s.mehr)}</p>` : ''}
        <div class="tour-punkte" aria-hidden="true">${SCHRITTE.map((_, n) => `<i${n === i ? ' class="an"' : ''}></i>`).join('')}</div>
        <div class="tour-knoepfe">
          ${i < SCHRITTE.length - 1 ? '<button type="button" class="btn ghost klein" data-tour="ende">Beenden</button>' : ''}
          <span class="tour-luecke"></span>
          ${i > 0 ? '<button type="button" class="btn klein" data-tour="zurueck">Zurück</button>' : ''}
          <button type="button" class="btn primary" data-tour="weiter">${i < SCHRITTE.length - 1 ? 'Weiter' : 'Fertig'}</button>
        </div>`;
      platzieren(karte, loch, ziel);
      karte.querySelector<HTMLElement>('[data-tour=weiter]')!.focus();
    };
    karte.addEventListener('click', (ev) => {
      const b = (ev.target as Element).closest<HTMLElement>('[data-tour]');
      if (!b) return;
      if (b.dataset.tour === 'ende') return zu(true);
      if (b.dataset.tour === 'zurueck') i = Math.max(0, i - 1);
      else if (i >= SCHRITTE.length - 1) return zu(true);
      else i++;
      zeigen();
    });
    document.querySelector('#tour')!.addEventListener('keydown', (ev) => {
      const k = (ev as KeyboardEvent).key;
      if (k === 'ArrowRight') { (karte.querySelector('[data-tour=weiter]') as HTMLElement)?.click(); }
      if (k === 'ArrowLeft') { (karte.querySelector('[data-tour=zurueck]') as HTMLElement)?.click(); }
    });
    // nach dem Wechsel zur Übersicht ist das Suchfeld erst einen Moment später da
    requestAnimationFrame(() => requestAnimationFrame(zeigen));
    return zeigen;
  });
}

/** Overlay aufbauen; `inhalt` füllt die Karte und darf eine Neuzeichnen-Funktion für Größenänderungen zurückgeben. */
function oeffnen(inhalt: (karte: HTMLElement, zu: (gesehen: boolean) => void, loch: HTMLElement) => void | (() => void)) {
  document.querySelector('#tour')?.remove();
  const vorher = document.activeElement as HTMLElement | null;
  const el = document.createElement('div');
  el.id = 'tour';
  el.className = 'tour';
  el.innerHTML = '<div class="tour-loch" hidden></div><div class="tour-karte" role="dialog" aria-modal="true" aria-labelledby="tourTitel" tabindex="-1"></div>';
  document.body.appendChild(el);
  const karte = el.querySelector<HTMLElement>('.tour-karte')!;
  const loch = el.querySelector<HTMLElement>('.tour-loch')!;
  let neu: void | (() => void);
  const anpassen = () => (neu ? neu() : platzieren(karte, loch, null));
  const taste = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') { ev.preventDefault(); zu(true); }
    if (ev.key === 'Tab') { // Fokus in der Karte halten
      const f = [...karte.querySelectorAll<HTMLElement>('button')];
      if (!f.length) return;
      const erst = f[0]!; const letzt = f[f.length - 1]!;
      if (ev.shiftKey && document.activeElement === erst) { ev.preventDefault(); letzt.focus(); } else if (!ev.shiftKey && document.activeElement === letzt) { ev.preventDefault(); erst.focus(); }
    }
  };
  const zu = (gesehen: boolean) => {
    if (gesehen) vorliebeSetzen({ tourGesehen: true });
    window.removeEventListener('resize', anpassen);
    document.removeEventListener('keydown', taste, true);
    el.remove();
    vorher?.focus?.();
  };
  window.addEventListener('resize', anpassen);
  document.addEventListener('keydown', taste, true);
  neu = inhalt(karte, zu, loch);
  if (!neu) platzieren(karte, loch, null);
}

/** Loch um das Ziel legen und die Karte daneben, darüber oder darunter platzieren (immer im Bild). */
function platzieren(karte: HTMLElement, loch: HTMLElement, ziel: HTMLElement | null) {
  const vw = window.innerWidth; const vh = window.innerHeight; const rand = 16; const abstand = 12;
  karte.style.left = ''; karte.style.top = ''; karte.classList.toggle('mitte', !ziel);
  if (!ziel) { loch.hidden = true; return; }
  ziel.scrollIntoView?.({ block: 'nearest' });
  const r = ziel.getBoundingClientRect();
  const pad = 6;
  loch.hidden = false;
  Object.assign(loch.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + 2 * pad}px`, height: `${r.height + 2 * pad}px` });
  const kb = Math.min(380, vw - 2 * rand);
  karte.style.width = `${kb}px`;
  const kh = karte.offsetHeight;
  let x: number; let y: number;
  if (r.right + abstand + kb + rand <= vw && r.width < vw / 3) {
    // rechts daneben (Seitenleiste auf Tablet und Laptop)
    x = r.right + pad + abstand; y = r.top + r.height / 2 - kh / 2;
  } else if (r.top > vh / 2) {
    // darüber (Leiste unten auf dem Handy)
    x = r.left + r.width / 2 - kb / 2; y = r.top - pad - abstand - kh;
  } else {
    x = r.left + r.width / 2 - kb / 2; y = r.bottom + pad + abstand;
  }
  karte.style.left = `${Math.round(Math.max(rand, Math.min(x, vw - kb - rand)))}px`;
  karte.style.top = `${Math.round(Math.max(rand, Math.min(y, vh - kh - rand)))}px`;
}
