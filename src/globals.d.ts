// Sperling – projektweite Typ-Ergänzungen.
//
// DOM: Die Ansichten rendern ihr HTML selbst und greifen direkt danach auf die Elemente zu.
// Deshalb liefern querySelector/querySelectorAll hier standardmäßig Eingabefelder (mit .value,
// .checked, .dataset) statt `Element | null`. Für Elemente, die fehlen können, immer `?.` benutzen;
// für andere Elementarten den Typ angeben: root.querySelector<HTMLCanvasElement>('canvas').
import type { Formular } from './ui/dom.ts';

declare global {
  interface ParentNode {
    querySelector(selectors: 'form'): Formular;
    querySelector<E extends Element = HTMLInputElement>(selectors: string): E;
    querySelectorAll<E extends Element = HTMLInputElement>(selectors: string): NodeListOf<E>;
  }
  interface Element {
    closest<E extends Element = HTMLInputElement>(selectors: string): E | null;
  }
  /** Version aus package.json, vom Build eingesetzt (vite.config.ts). */
  const __APP_VERSION__: string;
  /** Leaflet wird als klassisches Skript aus public/vendor geladen. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var L: any;
}
export {};
