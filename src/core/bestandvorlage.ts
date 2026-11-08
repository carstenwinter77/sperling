// Sperling – Produkte aus der Produktübersicht als Vorlage für den eigenen Bestand (DOM-frei, getestet).
// Der Bestand (Vorführgeräte und Verbrauchsmaterial) ist Vorwerk; Enpal und GALVANY haben keinen eigenen Bestand.
import type { Produkt } from './produkte.ts';

export type BestandArt = 'geraet' | 'material';

/** Kategorien, die als Vorführgerät (mit Seriennummer, zum Verleihen) geführt werden. */
export const GERAETE_KATEGORIEN = ['akkusauger', 'bodenstaubsauger', 'saugroboter', 'saugwischer', 'fenstersauger', 'set', 'aufsatz-zubehoer'];
/** Kategorien, die als Verbrauchsmaterial (mit Anzahl) geführt werden. */
export const MATERIAL_KATEGORIEN = ['reinigungsmittel', 'aufsatz-zubehoer', 'set'];

/**
 * Wohin ein Produkt im Bestand passt. `null` = gar nicht (Enpal/GALVANY, Service, Finanzierung).
 * `beides` = Sets und Zubehör: Jan entscheidet, ob Vorführgerät oder Material.
 */
export function bestandArtFuer(p: Pick<Produkt, 'bereich' | 'kategorie'> | null | undefined): BestandArt | 'beides' | null {
  if (!p || p.bereich !== 'vorwerk') return null;
  const g = GERAETE_KATEGORIEN.includes(p.kategorie);
  const m = MATERIAL_KATEGORIEN.includes(p.kategorie);
  if (g && m) return 'beides';
  return g ? 'geraet' : m ? 'material' : null;
}

/** Vorschlag, ob ein Produkt der Kategorie `beides` eher Gerät oder Material ist. */
export const bestandArtVorschlag = (p: Pick<Produkt, 'kategorie'>): BestandArt => (p.kategorie === 'set' ? 'geraet' : 'material');

/** Passt das Produkt in die Suche des jeweiligen Anlege-Fensters? */
export const passtZuArt = (p: Pick<Produkt, 'bereich' | 'kategorie'>, art: BestandArt): boolean => {
  const a = bestandArtFuer(p);
  return a === art || a === 'beides';
};

/** „Lieferumfang“ bzw. „Zusätzlich enthalten“ aus den technischen Daten (für das Feld Zubehör). */
export function lieferumfang(p: Pick<Produkt, 'technischeDaten'>): string {
  const t = p.technischeDaten.find((x) => /^(lieferumfang|zusätzlich enthalten)$/i.test(x.bezeichnung));
  return t ? t.wert.slice(0, 1000) : '';
}

/** Einheit für Verbrauchsmaterial aus dem Namen raten: „(500 ml)“ = Flasche, „(12 Stk.)“ = Packung, sonst Stück. */
export function einheitFuer(p: Pick<Produkt, 'name' | 'technischeDaten'>): string {
  const n = p.name.toLowerCase();
  if (/\(\s*\d+[.,]?\d*\s*(ml|l)\s*\)/.test(n)) return 'Flasche';
  if (/\(\s*\d+\s*stk\.?\s*\)/.test(n)) return 'Packung';
  return 'Stück';
}

/** Vorbelegung für „Neues Vorführgerät“. */
export function geraetVorlage(p: Produkt) {
  return { name: p.name.slice(0, 200), produktId: p.id, zubehoer: lieferumfang(p) };
}

/** Vorbelegung für „Neues Verbrauchsmaterial“. */
export function materialVorlage(p: Produkt) {
  return { name: p.name.slice(0, 200), produktId: p.id, einheit: einheitFuer(p), bestand: 1 };
}

/** Wie oft das Produkt schon im Bestand steht (aktive Geräte; Material: Anzahl Einträge und Stückzahl). */
export function imBestand(
  d: { geraete?: { produktId: string; aktiv: boolean }[]; material?: { produktId: string; aktiv: boolean; bestand: number; einheit: string }[] },
  produktId: string,
): { geraete: number; material: number; stueck: number } {
  if (!produktId) return { geraete: 0, material: 0, stueck: 0 };
  const g = (d.geraete || []).filter((x) => x.aktiv && x.produktId === produktId).length;
  const m = (d.material || []).filter((x) => x.aktiv && x.produktId === produktId);
  return { geraete: g, material: m.length, stueck: m.reduce((s, x) => s + x.bestand, 0) };
}
