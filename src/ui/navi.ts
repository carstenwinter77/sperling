// Sperling – „Hinfahren“: öffnet Apple Karten, Google Maps oder Waze mit der Kundenadresse als Ziel.
// Kein eigener Dienst: nur ein Link. Es geht nur die Adresse raus (wie bei der Adresssuche), nie der Name.
// Eine Web-App kann die Standard-Karten-App des iPhones nicht erkennen. Deshalb fragt Sperling beim ersten
// „Hinfahren“ auf iPhone/iPad einmal nach und merkt sich die Wahl (Einstellungen → „Hinfahren“ öffnet).
import { esc } from '../core/util.ts';
import * as store from '../storage/store.ts';
import { dialog } from './dom.ts';

type App = 'apple' | 'google' | 'waze';

const apfel = () => /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(navigator.userAgent || '');
/** iPhone/iPad (auch iPad mit Desktop-Kennung) */
const iosGeraet = () => /iPhone|iPad|iPod/.test(navigator.userAgent || '') || (/Macintosh/.test(navigator.userAgent || '') && navigator.maxTouchPoints > 1);

/** Im Demo-Modus wird nichts gespeichert; die Wahl gilt dann bis zum Neuladen. */
let demoWahl: App | null = null;

/** Ziel: Adresse (mit Ort) oder sonst Koordinaten; leer, wenn nichts Brauchbares da ist. */
export function ziel(k) {
  if (k?.ort?.trim()) return [k.strasse?.trim(), [k.plz?.trim(), k.ort.trim()].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  if (k && k.lat !== null && k.lng !== null && k.lat !== undefined) return `${k.lat},${k.lng}`;
  return '';
}

const einstellung = (): 'auto' | App => demoWahl || store.getData()?.einstellungen?.kartenApp || 'auto';
const gewaehlteApp = (): App => { const w = einstellung(); return w === 'auto' ? (apfel() ? 'apple' : 'google') : w; };

function linkFuer(app: App, z: string) {
  const e = encodeURIComponent(z);
  if (app === 'waze') return `https://waze.com/ul?q=${e}&navigate=yes`;
  return app === 'apple' ? `https://maps.apple.com/?daddr=${e}` : `https://www.google.com/maps/dir/?api=1&destination=${e}`;
}

export function naviLink(k) {
  const z = ziel(k);
  return z ? linkFuer(gewaehlteApp(), z) : '';
}

/** Fertiger Knopf (oder leer). */
export function hinfahrenKnopf(k, klasse = 'btn ghost') {
  const href = naviLink(k);
  return href ? `<a class="${klasse}" href="${esc(href)}" target="_blank" rel="noopener">🚗 Hinfahren</a>` : '';
}

/** Ziel aus einem Navi-Link lesen (für den Klick-Abfang). */
export function zielAusLink(href: string): string {
  try {
    const u = new URL(href);
    if (u.hostname === 'maps.apple.com') return u.searchParams.get('daddr') || '';
    if (u.hostname === 'www.google.com' && u.pathname.startsWith('/maps/dir')) return u.searchParams.get('destination') || '';
    if (u.hostname === 'waze.com' && u.pathname.startsWith('/ul')) return u.searchParams.get('q') || '';
  } catch { /* kein gültiger Link */ }
  return '';
}

/**
 * Öffnen. Auf iPhone/iPad Google Maps und Waze direkt über ihr App-Schema (die https-Links landen aus der
 * installierten Web-App sonst oft im Browser); ist die App nicht da, nach kurzer Zeit der Web-Link.
 */
function oeffnen(app: App, z: string) {
  const web = linkFuer(app, z);
  if (iosGeraet() && app !== 'apple') {
    const e = encodeURIComponent(z);
    const schema = app === 'google' ? `comgooglemaps://?daddr=${e}&directionsmode=driving` : `waze://?q=${e}&navigate=yes`;
    let weg = false;
    const merken = () => { if (document.hidden) weg = true; };
    document.addEventListener('visibilitychange', merken);
    location.href = schema;
    setTimeout(() => {
      document.removeEventListener('visibilitychange', merken);
      if (!weg && !document.hidden) window.open(web, '_blank', 'noopener');
    }, 1500);
    return;
  }
  window.open(web, '_blank', 'noopener');
}

/** Einmalige Frage: welche Karten-App? Öffnet danach sofort (im Klick, damit kein Popup-Blocker greift). */
function fragen(z: string) {
  const wahl: [App, string][] = [['google', 'Google Maps'], ['apple', 'Apple Karten'], ['waze', 'Waze']];
  dialog({
    titel: 'Womit navigierst du?',
    html: `<p>Sperling öffnet „Hinfahren“ ab jetzt immer in dieser App. Ändern kannst du das unter Einstellungen → „Hinfahren“ öffnet.</p>
      <div class="navi-wahl">${wahl.map(([k, l]) => `<button type="button" class="btn" data-navi-app="${k}">${esc(l)}</button>`).join('')}</div>`,
    knoepfe: [],
    onOpen: (dlg) => {
      dlg.addEventListener('click', (ev) => {
        const b = (ev.target as Element).closest<HTMLElement>('[data-navi-app]');
        if (!b) return;
        const app = b.dataset.naviApp as App;
        if (store.isDemo()) demoWahl = app;
        else store.mutate((d) => { d.einstellungen.kartenApp = app; });
        dlg.close();
        oeffnen(app, z);
      });
    },
  });
}

/** Navigation zu einem Kunden/Ort starten (aus einem Klick heraus aufrufen). */
export function navigieren(k) {
  const z = ziel(k);
  if (!z) return false;
  if (einstellung() === 'auto' && iosGeraet()) fragen(z);
  else oeffnen(gewaehlteApp(), z);
  return true;
}

/** Alle „Hinfahren“-/„Route“-Links abfangen: einmal fragen (iPhone/iPad), App-Schema nutzen. */
export function verdrahten() {
  document.addEventListener('click', (ev) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey) return;
    const a = (ev.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a) return;
    const z = zielAusLink(a.href);
    if (!z) return;
    ev.preventDefault();
    if (einstellung() === 'auto' && iosGeraet()) fragen(z);
    else oeffnen(gewaehlteApp(), z);
  }, true);
}
