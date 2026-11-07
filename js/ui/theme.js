// Sperling – Farbschema (hell / dunkel / automatisch).
// Reine Geräte-Einstellung, keine Kundendaten → localStorage ist erlaubt (REGELN.md, R-KRYPTO).
const KEY = 'sperling.farbschema';
export const SCHEMATA = { auto: 'Automatisch', hell: 'Hell', dunkel: 'Dunkel' };

export function lesen() {
  try {
    const v = localStorage.getItem(KEY);
    return SCHEMATA[v] ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function anwenden(wert = lesen()) {
  const root = document.documentElement;
  if (wert === 'hell' || wert === 'dunkel') root.dataset.farbschema = wert;
  else delete root.dataset.farbschema;
}

export function setzen(wert) {
  const v = SCHEMATA[wert] ? wert : 'auto';
  try { localStorage.setItem(KEY, v); } catch { /* privater Modus: gilt dann nur bis zum Neuladen */ }
  anwenden(v);
  return v;
}

/** Ist gerade (effektiv) das dunkle Schema aktiv? */
export function istDunkel() {
  return getComputedStyle(document.documentElement).colorScheme.includes('dark');
}

/** Schneller Umschalter: wechselt zwischen hell und dunkel ausgehend vom aktuellen Eindruck. */
export function umschalten() {
  return setzen(istDunkel() ? 'hell' : 'dunkel');
}
