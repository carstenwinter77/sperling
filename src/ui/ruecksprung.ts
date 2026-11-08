// Sperling – Rücksprung nach einem verzahnten Schritt: Vor dem Wechsel (z. B. Kunde → Rechner) merkt sich die App
// Adresse und Scrollstelle; kommt Jan über „Zurück“ wieder dorthin, steht die Seite an derselben Stelle.
// Nur im Arbeitsspeicher, keine Kundendaten außer der ID in der Adresse.

let merk: { hash: string; y: number; innen: number } | null = null;

const inhalt = () => document.querySelector<HTMLElement>('#inhalt');

/** Aktuelle Stelle merken (aus einem Klick heraus aufrufen, bevor die Adresse wechselt). */
export function merken(hash = location.hash) {
  merk = { hash, y: window.scrollY, innen: inhalt()?.scrollTop ?? 0 };
}

/** Adresse, zu der „Zurück“ führen soll: die gemerkte, wenn sie mit `praefix` beginnt, sonst der Ersatz. */
export function ziel(ersatz: string, praefix: string): string {
  if (!merk || !merk.hash.startsWith(praefix)) return ersatz;
  const rest = merk.hash.slice(praefix.length);
  return rest === '' || rest[0] === '?' || rest[0] === '/' ? merk.hash : ersatz;
}

/** Vom Router nach dem Zeichnen aufgerufen: Ist das die gemerkte Seite, an die alte Stelle scrollen. */
export function wiederherstellen() {
  if (!merk || location.hash !== merk.hash) return;
  const { y, innen } = merk;
  merk = null;
  requestAnimationFrame(() => {
    const el = inhalt();
    if (el) el.scrollTop = innen;
    window.scrollTo(0, y);
  });
}
