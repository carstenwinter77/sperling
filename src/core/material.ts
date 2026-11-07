// Sperling – Verbrauchsmaterial: Bestand buchen (Zugang, Muster, Test, Eigenverbrauch, Korrektur)
// und Hinweis „nachbestellen“, sobald der Mindestbestand erreicht ist. Rein, ohne DOM, in Node testbar.
import { uid, nowIso } from './util.ts';
import { MATERIAL_GRUND, neueNotiz, type Daten, type Material, type MaterialGrund } from './model.ts';

/** Gründe, die den Bestand verringern (Abgang). */
export const ABGANG: MaterialGrund[] = ['muster', 'test', 'eigen', 'defekt'];

/** Mindestbestand erreicht oder unterschritten? */
export const istKnapp = (m: Pick<Material, 'bestand' | 'mindestbestand' | 'aktiv'>) => m.aktiv && m.mindestbestand !== null && m.bestand <= m.mindestbestand;

/** Material, das nachbestellt werden sollte, das knappste zuerst. */
export function nachbestellListe(data: Pick<Daten, 'material'>): Material[] {
  return (data.material || []).filter(istKnapp).sort((a, b) => (a.bestand - (a.mindestbestand ?? 0)) - (b.bestand - (b.mindestbestand ?? 0)) || a.name.localeCompare(b.name, 'de'));
}

export interface BuchungEingabe { grund: MaterialGrund; menge: number; kundeId?: string; notiz?: string }

/**
 * Bucht auf ein Material. `menge` ist immer positiv: bei Abgang wird abgezogen, bei Zugang addiert,
 * bei Korrektur ist es der gezählte neue Bestand. Ein Abgang an einen Kunden (Muster/Test) steht auch
 * als Notiz (Vorwerk) beim Kunden. Wirft bei unmöglichen Buchungen.
 */
export function materialBuchen(data: Daten, materialId: string, e: BuchungEingabe, jetzt = nowIso()) {
  const m = (data.material || []).find((x) => x.id === materialId);
  if (!m) throw new Error('Material nicht gefunden.');
  if (!(e.grund in MATERIAL_GRUND)) throw new Error('Unbekannter Grund.');
  const menge = Math.round(Number(e.menge));
  if (!Number.isFinite(menge) || menge < 0 || (e.grund !== 'korrektur' && menge === 0)) throw new Error('Bitte eine gültige Anzahl eingeben.');
  const vorher = m.bestand;
  let delta: number;
  if (e.grund === 'korrektur') delta = menge - vorher;
  else if (e.grund === 'zugang') delta = menge;
  else {
    if (menge > vorher) throw new Error(`Es sind nur noch ${mengeText(vorher, m.einheit)} da.`);
    delta = -menge;
  }
  const kundeId = e.kundeId && data.kunden.some((k) => k.id === e.kundeId) ? e.kundeId : '';
  m.bestand = vorher + delta;
  m.buchungen.unshift({ id: uid(), zeitpunkt: jetzt, menge: delta, grund: e.grund, kundeId, notiz: (e.notiz || '').slice(0, 1000) });
  if (m.buchungen.length > 300) m.buchungen.length = 300;
  m.updatedAt = jetzt;
  if (kundeId && (e.grund === 'muster' || e.grund === 'test')) {
    const k = data.kunden.find((x) => x.id === kundeId)!;
    const was = e.grund === 'muster' ? 'Muster mitgegeben' : 'Beim Kunden getestet';
    k.notizen.push(neueNotiz({ zeitpunkt: jetzt, text: `${was}: ${menge} × ${m.name}${e.notiz ? ` (${e.notiz})` : ''}`, sparten: ['vorwerk'] }));
    k.updatedAt = jetzt;
  }
  const knapp = istKnapp(m);
  /** true, wenn genau diese Buchung den Mindestbestand erreicht hat (für den Hinweis) */
  const neuKnapp = knapp && !(m.mindestbestand !== null && vorher <= m.mindestbestand);
  return { material: m, vorher, nachher: m.bestand, knapp, neuKnapp };
}

const MEHRZAHL: Record<string, string> = { Flasche: 'Flaschen', Packung: 'Packungen', Dose: 'Dosen', Tube: 'Tuben', Rolle: 'Rollen', Kiste: 'Kisten', Schachtel: 'Schachteln' };
/** „1 Flasche“, „3 Flaschen“ (Stück, Beutel, Set bleiben gleich). */
export const mengeText = (n: number, einheit: string) => `${n} ${n === 1 ? einheit : MEHRZAHL[einheit] || einheit}`;
