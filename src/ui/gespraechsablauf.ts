// Sperling – laufendes Gespräch: Entwurf im Arbeitsspeicher und gemeinsames Speichern.
// Der Entwurf (Notizen, angetippte Einwände) lebt nur im Arbeitsspeicher, nie im Browser-Speicher
// (R-KRYPTO), und wird beim Sperren verworfen. So bleibt er erhalten, wenn man zwischen Notizen,
// Leitfaden und anderen Seiten wechselt.
// Gespeichert wird je Gruppe (Enpal = PV/WP, Vorwerk) eine eigene Notiz (R-TEXT).
import { nowIso } from '../core/util.ts';
import { SPARTEN, type Sparte } from '../core/model.ts';
import { speichern, leererVerlauf, hatEinwaende, hatInhalt, gruppeVon, type Entwurf, type Abschluss, type Gruppe, type Verlauf } from '../core/gespraech.ts';
import * as store from '../storage/store.ts';

export { speichern, leererVerlauf, hatEinwaende, hatInhalt, gruppeVon, type Entwurf, type Abschluss, type Gruppe, type Verlauf };

const entwuerfe = new Map<string, Entwurf>();
store.subscribe((d) => { if (!d) entwuerfe.clear(); });

/** Sparten, über die vermutlich gesprochen wird: alle mit Interesse, sonst alle. */
function vermuteteSparten(kundeId: string): Sparte[] {
  const k = store.findKunde(kundeId);
  if (!k) return ['pv'];
  const mit = (Object.keys(SPARTEN) as Sparte[]).filter((s) => !['unbekannt', 'kein_interesse'].includes(k.status[s]));
  return mit.length ? mit : (Object.keys(SPARTEN) as Sparte[]);
}

export function entwurf(kundeId: string): Entwurf | null { return entwuerfe.get(kundeId) ?? null; }
export function alleEntwuerfe(): Entwurf[] { return [...entwuerfe.values()].filter((e) => store.findKunde(e.kundeId)); }

/** Laufendes Gespräch holen oder neu beginnen. */
export function beginnen(kundeId: string, vorgabe: Partial<Entwurf> = {}): Entwurf {
  let e = entwuerfe.get(kundeId);
  if (!e) {
    const sparten = vorgabe.sparten?.length ? vorgabe.sparten : vermuteteSparten(kundeId);
    e = {
      kundeId, start: nowIso(), kontaktart: 'telefon', erreicht: true, sparten,
      notiz: { enpal: '', vorwerk: '' }, verlauf: leererVerlauf(), leitfadenSparte: sparten[0] || 'pv', ...vorgabe,
    };
    entwuerfe.set(kundeId, e);
  } else if (vorgabe.verlauf) {
    // aus dem Leitfaden kommend: Einwände übernehmen
    for (const s of Object.keys(vorgabe.verlauf) as Sparte[]) Object.assign(e.verlauf[s], vorgabe.verlauf[s]);
    for (const s of vorgabe.sparten || []) if (!e.sparten.includes(s)) e.sparten.push(s);
  }
  return e;
}

export function verwerfen(kundeId: string) { entwuerfe.delete(kundeId); }

/** Bequem: speichern über den Store und Entwurf verwerfen. */
export function abschliessen(e: Entwurf, abschluesse: Abschluss[]): Sparte[] {
  let sparten: Sparte[] = [];
  store.mutate((d) => { sparten = speichern(d, e, abschluesse); });
  verwerfen(e.kundeId);
  return sparten;
}
