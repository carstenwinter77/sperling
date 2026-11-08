// Sperling – laufendes Gespräch: Entwurf im Arbeitsspeicher und gemeinsames Speichern.
// Der Entwurf (Notizen, angetippte Einwände, Klemmbrett-Antworten) lebt im Arbeitsspeicher und wird
// regelmäßig, beim Wechsel in eine andere App und vor dem Sperren verschlüsselt im Bestand gesichert
// (`entwuerfe`, ab Schema 11, R-KRYPTO). So übersteht er Sperren, Updates und ein Neuladen durch das iPad.
// Gespeichert wird je Bereich (PV, WP, Vorwerk) eine eigene Notiz (R-TEXT).
import { nowIso, clone } from '../core/util.ts';
import { SPARTEN, type Sparte } from '../core/model.ts';
import { speichern, leererVerlauf, leereNotizen, hatEinwaende, hatInhalt, gruppeVon, type Entwurf, type Abschluss, type Gruppe, type Verlauf } from '../core/gespraech.ts';
import * as store from '../storage/store.ts';
import { leereAntworten } from '../core/klemmbrett.ts';

export { speichern, leererVerlauf, hatEinwaende, hatInhalt, gruppeVon, type Entwurf, type Abschluss, type Gruppe, type Verlauf };

const entwuerfe = new Map<string, Entwurf>();
let geladen = false;
let gesichert = '[]';
store.subscribe((d) => {
  if (!d) { entwuerfe.clear(); geladen = false; gesichert = '[]'; return; }
  if (geladen) return;
  // Nach dem Entsperren: gesicherte Entwürfe zurückholen
  geladen = true;
  for (const e of d.entwuerfe || []) if (!entwuerfe.has(e.kundeId)) entwuerfe.set(e.kundeId, clone(e));
  gesichert = JSON.stringify(d.entwuerfe || []);
});

/** Wie viele Gespräche wurden nach dem Entsperren wiederhergestellt? (für einen kurzen Hinweis) */
export function wiederhergestellt(): Entwurf[] { return alleEntwuerfe(); }

/** Entwürfe verschlüsselt im Bestand sichern, wenn sie sich geändert haben. Danach store.flush() für sofortiges Speichern. */
export function sichern(): boolean {
  if (!store.isUnlocked() || store.isDemo()) return false;
  const liste = [...entwuerfe.values()].map((e) => clone({ ...e, antworten: e.antworten || leereAntworten() }));
  const json = JSON.stringify(liste);
  if (json === gesichert) return false;
  // am vollständigen Bestand (auch im Beratungs-Schutz): nur Entwürfe zu vorhandenen Kunden
  store.mutate((d) => { const ids = new Set(d.kunden.map((k) => k.id)); d.entwuerfe = liste.filter((e) => ids.has(e.kundeId)); });
  gesichert = json;
  return true;
}
// Alle 20 Sekunden still mitsichern (nur bei Änderungen), damit auch ein plötzliches Beenden wenig kostet
setInterval(() => { try { sichern(); } catch (e) { console.error(e); } }, 20000);

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
      notiz: leereNotizen(), verlauf: leererVerlauf(), leitfadenSparte: sparten[0] || 'pv', antworten: leereAntworten(), ...vorgabe,
    };
    entwuerfe.set(kundeId, e);
  } else if (vorgabe.verlauf) {
    // aus dem Leitfaden kommend: Einwände übernehmen
    for (const s of Object.keys(vorgabe.verlauf) as Sparte[]) Object.assign(e.verlauf[s], vorgabe.verlauf[s]);
    for (const s of vorgabe.sparten || []) if (!e.sparten.includes(s)) e.sparten.push(s);
  }
  e.antworten ||= leereAntworten();
  return e;
}

export function verwerfen(kundeId: string) {
  entwuerfe.delete(kundeId);
  if (store.isUnlocked() && store.getData().entwuerfe?.some((e) => e.kundeId === kundeId)) {
    store.mutate((d) => { d.entwuerfe = d.entwuerfe.filter((e) => e.kundeId !== kundeId); });
    gesichert = JSON.stringify(store.getData().entwuerfe);
  }
}

/** Bequem: speichern über den Store und Entwurf verwerfen. */
export function abschliessen(e: Entwurf, abschluesse: Abschluss[]): Sparte[] {
  let sparten: Sparte[] = [];
  store.mutate((d) => { sparten = speichern(d, e, abschluesse); d.entwuerfe = (d.entwuerfe || []).filter((x) => x.kundeId !== e.kundeId); });
  entwuerfe.delete(e.kundeId);
  gesichert = JSON.stringify(store.getData().entwuerfe);
  return sparten;
}
