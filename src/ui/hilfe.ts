// Sperling – Hilfe (Oberfläche): ?-Knöpfe mit Kurzhilfe, Installieren-Angebot des Browsers, Installationshinweis.
// Gerätevorlieben in localStorage `sperling.hilfe` (keine Kundendaten, R-KRYPTO-Ausnahme):
// { knoepfe: ?-Knöpfe zeigen, installiert: auf diesem Gerät schon installiert, hinweisWeg: Hinweis weggeklickt }.
import { esc } from '../core/util.ts';
import { THEMEN, type ThemaId } from '../core/hilfe.ts';
import { erkennen, type Geraet, type Browser } from '../core/installieren.ts';
import { dialog } from './dom.ts';

const KEY = 'sperling.hilfe';
interface Vorlieben { knoepfe: boolean; installiert: boolean; hinweisWeg: boolean }
const STANDARD: Vorlieben = { knoepfe: true, installiert: false, hinweisWeg: false };

export function vorlieben(): Vorlieben {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      knoepfe: typeof v.knoepfe === 'boolean' ? v.knoepfe : STANDARD.knoepfe,
      installiert: v.installiert === true,
      hinweisWeg: v.hinweisWeg === true,
    };
  } catch { return { ...STANDARD }; }
}
export function vorliebeSetzen(teil: Partial<Vorlieben>) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...vorlieben(), ...teil })); } catch { /* privat: nicht merkbar */ }
  document.body.classList.toggle('hilfe-aus', !vorlieben().knoepfe);
}

// ---------- ?-Knöpfe ----------

/** Kleiner ?-Knopf für ein Thema (wird per CSS ausgeblendet, wenn die Knöpfe aus sind). */
export function knopf(id: ThemaId): string {
  const t = THEMEN[id];
  return t ? `<button type="button" class="hilfe-knopf" data-hilfe="${id}" aria-label="Hilfe: ${esc(t.titel)}">?</button>` : '';
}

export function zeigen(id: ThemaId) {
  const t = THEMEN[id];
  if (!t) return;
  const schritte = 'schritte' in t ? (t.schritte as string[]) : [];
  dialog({
    titel: t.titel,
    html: `<p>${esc(t.kurz)}</p>${schritte.length ? `<ol class="hilfe-schritte">${schritte.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
      <p class="hinweis"><a href="#/hilfe?thema=${id}" data-hilfe-seite>Alle Hilfethemen</a></p>`,
    knoepfe: [{ label: 'Verstanden', primaer: true, wert: true }],
    onOpen: (dlg) => {
      dlg.querySelector('[data-hilfe-seite]')?.addEventListener('click', () => dlg.close());
      // „Abbrechen“ ist hier überflüssig
      dlg.querySelector<HTMLElement>('.dlg-actions button.ghost')?.style.setProperty('display', 'none');
    },
  });
}

// ---------- Installieren ----------

interface InstallAngebot extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
declare global { interface Navigator { standalone?: boolean } }

export const install = { geraet: 'windows' as Geraet, browser: 'andere' as Browser, alsApp: false, knopf: false };
let angebot: InstallAngebot | null = null;
const beiAenderung = new Set<() => void>();
const melden = () => beiAenderung.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
export function beobachten(fn: () => void): () => void { beiAenderung.add(fn); return () => beiAenderung.delete(fn); }

/** Installiert auf diesem Gerät (läuft als App oder wurde hier schon installiert)? */
export const istInstalliert = () => install.alsApp || vorlieben().installiert;

let gestartet = false;
export function starten() {
  if (gestartet) return;
  gestartet = true;
  Object.assign(install, erkennen(navigator.userAgent || '', navigator.maxTouchPoints || 0));
  document.body.classList.toggle('hilfe-aus', !vorlieben().knoepfe);
  const mq = matchMedia('(display-mode: standalone), (display-mode: window-controls-overlay), (display-mode: fullscreen)');
  const pruefen = () => {
    install.alsApp = mq.matches || navigator.standalone === true;
    if (install.alsApp && !vorlieben().installiert) vorliebeSetzen({ installiert: true });
  };
  pruefen();
  mq.addEventListener?.('change', () => { pruefen(); melden(); });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // eigener Knopf statt Browser-Leiste
    angebot = e as InstallAngebot;
    install.knopf = true;
    // Bietet der Browser die Installation an, ist die App hier (wieder) nicht installiert
    if (!install.alsApp) vorliebeSetzen({ installiert: false });
    melden();
  });
  window.addEventListener('appinstalled', () => {
    angebot = null; install.knopf = false;
    vorliebeSetzen({ installiert: true });
    melden();
  });
  document.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest?.<HTMLElement>('[data-hilfe]');
    if (!b) return;
    ev.preventDefault();
    ev.stopPropagation();
    zeigen(b.dataset.hilfe as ThemaId);
  }, true);
}

/** Installieren-Dialog des Browsers öffnen (nur Chrome/Edge/Samsung). true = installiert. */
export async function installieren(): Promise<boolean> {
  if (!angebot) return false;
  const a = angebot;
  await a.prompt();
  const { outcome } = await a.userChoice;
  angebot = null; install.knopf = false; // ein Angebot gilt nur einmal
  if (outcome === 'accepted') vorliebeSetzen({ installiert: true });
  melden();
  return outcome === 'accepted';
}

/** Hinweis auf der Übersicht, solange Sperling im Browser-Tab läuft (wegklickbar). */
export function hinweisHtml(): string {
  if (istInstalliert() || vorlieben().hinweisWeg) return '';
  return `<p class="hinweis install-hinweis" id="installHinweis">📲 Sperling läuft gerade im Browser. Als App installiert startet es vom Home-Bildschirm, läuft offline und kann Face ID nutzen. <a href="#/hilfe?thema=installieren">So geht's</a> <button type="button" class="btn klein ghost" id="installHinweisWeg" aria-label="Hinweis ausblenden">✕</button></p>`;
}
export function hinweisVerdrahten(root: ParentNode) {
  root.querySelector('#installHinweisWeg')?.addEventListener('click', () => {
    vorliebeSetzen({ hinweisWeg: true });
    root.querySelector('#installHinweis')?.remove();
  });
}
