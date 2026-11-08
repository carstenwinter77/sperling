// Sperling – Rücksprung nach einem verzahnten Schritt: Vor dem Wechsel (z. B. Kunde → Rechner, Kalender → Gespräch)
// merkt sich die App Adresse und Scrollstelle. Ist der Abstecher erledigt, geht es genau dorthin zurück
// (gleiche Seite, gleicher Reiter, gleiche Scrollstelle). Nur im Arbeitsspeicher, keine Kundendaten außer der ID in der Adresse.
import { toast } from './dom.ts';

let merk: { hash: string; y: number; innen: number; fuer: string } | null = null;

const inhalt = () => document.querySelector<HTMLElement>('#inhalt');

/**
 * Aktuelle Stelle merken (aus einem Klick heraus aufrufen, bevor die Adresse wechselt).
 * `fuer` = Adresse (Anfang) des Abstechers, für den die Stelle gilt; leer = für jeden.
 */
export function merken(hash = location.hash, fuer = '') {
  merk = { hash: hash || '#/', y: window.scrollY, innen: inhalt()?.scrollTop ?? 0, fuer };
}

/** Adresse, zu der „Zurück“ führen soll: die gemerkte, wenn sie mit `praefix` beginnt, sonst der Ersatz. */
export function ziel(ersatz: string, praefix: string): string {
  if (!merk || !merk.hash.startsWith(praefix)) return ersatz;
  const rest = merk.hash.slice(praefix.length);
  return rest === '' || rest[0] === '?' || rest[0] === '/' ? merk.hash : ersatz;
}

/** Gilt die gemerkte Stelle für den Abstecher, auf dem wir gerade sind? */
function passt(): boolean {
  if (!merk) return false;
  const hier = location.hash || '#/';
  return merk.hash !== hier && (!merk.fuer || hier.startsWith(merk.fuer));
}

/** Woher kam Jan? Gemerkte Adresse, wenn sie zum aktuellen Abstecher gehört, sonst der Ersatz. */
export function herkunft(ersatz: string): string {
  return passt() ? merk!.hash : ersatz;
}

/** Abstecher beendet: zurück an die gemerkte Stelle (oder zum Ersatz) und kurz sagen, was passiert ist. */
export function zurueck(ersatz: string, meldung = '') {
  const nach = herkunft(ersatz);
  if (!passt()) merk = null;
  if (meldung) toast(meldung, 'ok', 3600);
  if (location.hash === nach) { wiederherstellen(); return; }
  location.hash = nach;
}

/** Vom Router nach dem Zeichnen aufgerufen: Ist das die gemerkte Seite, an die alte Stelle scrollen. */
export function wiederherstellen() {
  if (!merk || (location.hash || '#/') !== merk.hash) return;
  const { y, innen } = merk;
  merk = null;
  requestAnimationFrame(() => {
    const el = inhalt();
    if (el) el.scrollTop = innen;
    window.scrollTo(0, y);
  });
}

/**
 * Links in einen Abstecher (Gespräch mit einem Kunden) merken sich automatisch die Stelle, von der sie kommen.
 * Einmal beim Start aufrufen.
 */
export function linksBeobachten() {
  document.addEventListener('click', (ev) => {
    const a = (ev.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#/kunde/"]');
    const m = a?.getAttribute('href')?.match(/^#\/kunde\/([\w-]+)\/gespraech/);
    if (!m) return;
    const fuer = `#/kunde/${m[1]}/gespraech`;
    if ((location.hash || '').startsWith(fuer)) return;
    merken(location.hash, fuer);
  }, true);
}

/** Aktuelle Seite neu zeichnen und dabei an derselben Stelle bleiben (nach einem Fenster, das Daten geändert hat). */
export function neuZeichnen() {
  merken(location.hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
