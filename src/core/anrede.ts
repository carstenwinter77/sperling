// Sperling – Anrede und Titel des Kunden (ab 0.15.0, Schema 12). Rein, ohne DOM, in Node testbar.
// Anrede ist eine Vorauswahl (Frau, Herr, Familie, keine), der Titel ein eigenes Feld mit Vorschlägen
// und freier Eingabe. Ältere Freitexte wie „Herr Dr.“ teilt anredeTeilen() beim Lesen auf.
// Wichtig: Dieses Modul importiert nichts aus model.ts (model ↔ anrede wäre ein Zyklus).

/** Vorauswahl der Anrede. Leer = keine Anrede (Gruß mit Vor- und Nachname). */
export const ANREDEN = ['Frau', 'Herr', 'Familie'] as const;

/** Vorschläge für den Titel; frei eingegebene Titel bleiben ebenso erlaubt. */
export const TITEL_VORSCHLAEGE = ['Dr.', 'Prof.', 'Prof. Dr.', 'Dr. med.', 'Dr. med. dent.', 'Dr.-Ing.', 'Dipl.-Ing.', 'Dipl.-Kfm.'];

/** Wert im Titel-Auswahlfeld, der die freie Eingabe öffnet. */
export const TITEL_FREI = '__frei';

const ANREDE_ALIAS: Record<string, string> = {
  frau: 'Frau', fr: 'Frau', herr: 'Herr', herrn: 'Herr', hr: 'Herr', hrn: 'Herr', familie: 'Familie', fam: 'Familie',
};

/** Sieht ein Wort wie der Anfang eines akademischen Titels aus (Dr., Prof., Dipl.-Ing., Professorin …)? */
const TITEL_ANFANG = /^(dr|prof|professor(in)?|dipl|mag|lic|ing)\b/i;

const sauber = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');

/** Übliche Schreibweise für bekannte Titelteile („dr“ → „Dr.“, „prof.dr.“ → „Prof. Dr.“), Unbekanntes bleibt. */
export function titelNormalisieren(t: unknown): string {
  const s = sauber(t).replace(/\.(?=\S)/g, '. ').replace(/\s+-/g, '-').replace(/-\s+/g, '-');
  if (!s) return '';
  return s.split(' ').map((w) => {
    const ohne = w.replace(/\.$/, '').toLowerCase();
    if (ohne === 'dr') return 'Dr.';
    if (ohne === 'prof') return 'Prof.';
    if (ohne === 'med') return 'med.';
    if (ohne === 'dent') return 'dent.';
    if (ohne === 'dr-ing' || ohne === 'dr.-ing') return 'Dr.-Ing.';
    if (ohne === 'dipl-ing' || ohne === 'dipl.-ing') return 'Dipl.-Ing.';
    return w;
  }).join(' ').slice(0, 50);
}

/**
 * Freitext aus älteren Daten oder Listen in Anrede und Titel teilen:
 * „herr dr.“ → Herr + Dr.; „Fr. Prof. Dr.“ → Frau + Prof. Dr.; „Dr.“ → nur Titel.
 * Unbekannte Anreden (z. B. „Eheleute“) bleiben unverändert erhalten (R-LOESCH).
 */
export function anredeTeilen(text: unknown): { anrede: string; titel: string } {
  const s = sauber(text);
  if (!s) return { anrede: '', titel: '' };
  const [erstes = '', ...rest] = s.split(' ');
  const alias = ANREDE_ALIAS[erstes.replace(/\.$/, '').toLowerCase()];
  if (alias) return { anrede: alias, titel: titelNormalisieren(rest.join(' ')) };
  if (TITEL_ANFANG.test(s)) return { anrede: '', titel: titelNormalisieren(s) };
  return { anrede: s.slice(0, 50), titel: '' };
}

/** Anrede und Titel eines Datensatzes zusammenführen (Titel aus dem alten Anrede-Text kommt vor einen vorhandenen). */
export function anredeUndTitel(anrede: unknown, titel: unknown): { anrede: string; titel: string } {
  const a = anredeTeilen(anrede);
  const t = titelNormalisieren(titel);
  const teile = [a.titel, t].filter(Boolean);
  const titelGesamt = teile.length === 2 && t.includes(a.titel) ? t : teile.join(' ');
  return { anrede: a.anrede, titel: titelGesamt.slice(0, 50) };
}

/**
 * Teil des Titels, der in die Briefanrede gehört: nur Professor und Doktor (DIN 5008), Fachzusätze
 * wie „med.“ entfallen, Diplomgrade ebenso. „Prof. Dr. med.“ → „Prof. Dr.“, „Dipl.-Ing.“ → „“.
 */
export function titelFuerAnrede(titel: unknown): string {
  const s = titelNormalisieren(titel);
  const teile: string[] = [];
  for (const w of s.split(' ')) {
    if (/^prof\.?$/i.test(w) || /^professor(in)?$/i.test(w)) { if (!teile.includes('Prof.')) teile.push('Prof.'); }
    else if (/^dr\.?(-ing\.?)?$/i.test(w) || /^dr\./i.test(w)) { if (!teile.includes('Dr.')) teile.push('Dr.'); }
  }
  return teile.join(' ');
}

/** Name mit Titel davor, z. B. „Dr. Anna Beispiel“. */
export function mitTitel(titel: unknown, name: string): string {
  const t = sauber(titel);
  return t && name ? `${t} ${name}` : name;
}
