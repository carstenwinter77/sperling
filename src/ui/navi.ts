// Sperling – „Hinfahren“: öffnet Apple Karten oder Google Maps mit der Kundenadresse als Ziel.
// Kein eigener Dienst: nur ein Link. Es geht nur die Adresse raus (wie bei der Adresssuche), nie der Name.
import { esc } from '../core/util.ts';
import * as store from '../storage/store.ts';

const apfel = () => /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(navigator.userAgent || '');

/** Ziel: Adresse (mit Ort) oder sonst Koordinaten; leer, wenn nichts Brauchbares da ist. */
export function ziel(k) {
  if (k?.ort?.trim()) return [k.strasse?.trim(), [k.plz?.trim(), k.ort.trim()].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  if (k && k.lat !== null && k.lng !== null && k.lat !== undefined) return `${k.lat},${k.lng}`;
  return '';
}

export function naviLink(k) {
  const z = ziel(k);
  if (!z) return '';
  const wahl = store.getData()?.einstellungen?.kartenApp || 'auto';
  const app = wahl === 'auto' ? (apfel() ? 'apple' : 'google') : wahl;
  const e = encodeURIComponent(z);
  return app === 'apple' ? `https://maps.apple.com/?daddr=${e}` : `https://www.google.com/maps/dir/?api=1&destination=${e}`;
}

/** Fertiger Knopf (oder leer). */
export function hinfahrenKnopf(k, klasse = 'btn ghost') {
  const href = naviLink(k);
  return href ? `<a class="${klasse}" href="${esc(href)}" target="_blank" rel="noopener">🚗 Hinfahren</a>` : '';
}
