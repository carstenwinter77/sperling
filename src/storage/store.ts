// Sperling – zentraler Datenzustand.
//
// Ablauf:   setup()/unlock()  ->  data im Speicher  ->  mutate(fn)  ->  (verzögert) persist()
// Regeln:   - Änderungen NUR über mutate(), nie direkt am data-Objekt.
//           - Jeder Speichervorgang verschlüsselt den GESAMTEN Bestand neu.
//           - Speicherfehler gehen nie verloren: dirty bleibt true, nächster Versuch folgt.

import { KeyRing, validateEnvelope } from '../core/crypto.ts';
import { anzeigeSetzen, emptyData, migrate, statusVerlaufAbgleichen, type Daten, type Kunde } from '../core/model.ts';
import { istEinstellungsPaket } from '../core/einstellungsdatei.ts';
import { uid, nowIso, clone, type Rec } from '../core/util.ts';
import * as db from './db.ts';
import { ausDatei } from './fotodatei.ts';

const SAVE_DELAY_MS = 400;

let keyring: KeyRing | null = null;
let data: Daten | null = null;
let stand: string | null = null; // updatedAt des zuletzt gespeicherten/geladenen Standes
let dirty = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let deviceId: string | null = null;
let demo = false; // Demo-Modus: nur im Arbeitsspeicher, nichts wird gespeichert
const listeners = new Set<(d: Daten | null) => void>();
const saveListeners = new Set<(info: Rec) => void>();

export function isUnlocked() {
  return data !== null && keyring !== null;
}

export function getData(): Daten {
  if (!data) throw new Error('Daten sind gesperrt.');
  anzeigeSetzen(data.einstellungen);
  return schutzKundeId ? schutzSicht(data, schutzKundeId) : data;
}

// ---------- Beratungs-Schutz ----------
// Ist er an, liefert getData() nur den beratenen Kunden: andere Kunden, deren Termine und das
// Gelöschte fehlen, Verleihe/Reservierungen anderer Kunden sind anonymisiert. Geändert wird weiter
// über mutate() am vollständigen Bestand. Gilt nur im Arbeitsspeicher, Sperren hebt ihn auf.
let schutzKundeId: string | null = null;
export const schutzKunde = () => schutzKundeId;
export function schutzSetzen(kundeId: string | null) {
  schutzKundeId = kundeId && data?.kunden.some((k) => k.id === kundeId) ? kundeId : null;
  notify();
}
function schutzSicht(d: Daten, id: string): Daten {
  // fremde Einträge: Kundenbezug, Notizen, Namen, Fotos und Unterschriften entfernen
  const fremd = <T extends { kundeId: string; notiz?: string }>(x: T): T => (x.kundeId === id ? x : {
    ...x, kundeId: '', notiz: '',
    ...('nameAusgabe' in x ? { nameAusgabe: '', nameRueckgabe: '', unterschriftAusgabe: '', unterschriftRueckgabe: '', fotosAusgabe: [], fotosRueckgabe: [] } : {}),
  });
  return {
    ...d,
    kunden: d.kunden.filter((k) => k.id === id),
    termine: d.termine.filter((t) => t.kundeId === id),
    leihvorgaenge: d.leihvorgaenge.map(fremd),
    reservierungen: d.reservierungen.map(fremd),
    papierkorb: [],
    entwuerfe: d.entwuerfe.filter((e) => e.kundeId === id),
  };
}

export function getStand() {
  return stand;
}

export function isDirty() {
  return dirty;
}

export async function getDeviceId() {
  if (deviceId) return deviceId;
  let id = await db.getMeta<string>('deviceId');
  if (!id) {
    id = uid();
    await db.setMeta('deviceId', id);
  }
  deviceId = id;
  return id;
}

export async function hasVault() {
  return Boolean(await db.loadEnvelope());
}

export function isDemo() {
  return demo;
}

/** Demo starten: Beispieldaten nur im Speicher, keine Persistenz, kein Sync. */
export function startDemo(demoDaten: unknown) {
  // Sicherheit: Nie echte, entsperrte Daten im Speicher durch Beispieldaten ersetzen.
  if (data && !demo) throw new Error('Demo nur im gesperrten Zustand.');
  demo = true;
  keyring = new KeyRing('demo');
  data = migrate(demoDaten);
  stand = nowIso();
  dirty = false;
  notify();
}

/** Erstes Einrichten mit neuem Master-Passwort. */
export async function setup(password: string) {
  if (await hasVault()) throw new Error('Es gibt bereits einen Datenbestand auf diesem Gerät.');
  keyring = new KeyRing(password);
  data = emptyData();
  dirty = true;
  await persist();
  notify();
}

/** Erstes Einrichten aus einer Sicherung (zweites Gerät): kein neues Passwort, es gilt das der Sicherung. */
export async function einrichtenAusSicherung(env: unknown, password: string) {
  if (await hasVault()) throw new Error('Es gibt bereits einen Datenbestand auf diesem Gerät.');
  if (!password) throw new Error('Bitte das Passwort eingeben.');
  await adoptEnvelope(env, password);
}

/** Entsperren. Wirft WrongPasswordError bei falschem Passwort. */
export async function unlock(password: string) {
  const env = await db.loadEnvelope();
  if (!env) throw new Error('Kein Datenbestand vorhanden.');
  const kr = new KeyRing(password);
  const raw = await kr.decrypt(env); // wirft bei falschem Passwort
  kr.useSalt(env.kdf.salt, env.kdf.iterations);
  keyring = kr;
  data = migrate(raw);
  stand = env.updatedAt;
  dirty = false;
  notify();
}

/** Sperren: offene Änderungen speichern, dann Schlüssel und Klartext verwerfen. */
export async function lock() {
  if (isUnlocked()) {
    try {
      await flush();
    } catch (e) {
      console.error('Speichern vor dem Sperren fehlgeschlagen', e);
      throw e; // nicht sperren, sonst gingen Änderungen verloren
    }
  }
  keyring?.wipe();
  keyring = null;
  data = null;
  schutzKundeId = null;
  demo = false;
  stand = null;
  notify();
}

/**
 * Einzige erlaubte Art, Daten zu ändern.
 * fn bekommt den Datenbestand und ändert ihn direkt. Wirft fn, bleibt der alte Stand erhalten.
 */
export function mutate(fn: (d: Daten) => void): void {
  if (!data) throw new Error('Daten sind gesperrt.');
  const d = data; // immer der vollständige Bestand, auch bei Beratungs-Schutz
  // Sicherung für den Fehlerfall; structuredClone ist bei großen Beständen deutlich schneller als JSON hin und zurück
  const backup = typeof structuredClone === 'function' ? structuredClone(d) : clone(d);
  try {
    fn(d);
  } catch (e) {
    data = backup; // Zustand zurückrollen
    throw e;
  }
  // Jeden Statuswechsel mit Datum festhalten (Verkaufstrichter), egal an welcher Stelle der Status geändert wurde
  const jetzt = nowIso();
  for (const k of d.kunden) statusVerlaufAbgleichen(k, jetzt);
  anzeigeSetzen(d.einstellungen);
  if (!demo) {
    dirty = true;
    scheduleSave();
  }
  notify();
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persist().catch((e) => console.error('Speichern fehlgeschlagen', e));
  }, SAVE_DELAY_MS);
}

/** Sofort speichern (z. B. beim Verlassen der Seite). */
export async function flush() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  await persist();
}

// Alle Speichervorgänge laufen strikt nacheinander über diese Kette.
let saveChain = Promise.resolve();

function persist() {
  const p = saveChain.then(() => (dirty && isUnlocked() && !demo ? doSave() : undefined));
  saveChain = p.catch(() => {});
  return p;
}

async function doSave() {
  dirty = false;
  try {
    const updatedAt = nextTimestamp(stand);
    if (!keyring || !data) throw new Error('Gesperrt.');
    // Sicherheit: Demo-Daten werden nie gespeichert (würden sonst den echten Bestand überschreiben).
    if (demo) throw new Error('Demo-Modus: Speichern gesperrt.');
    const env = await keyring.encrypt(data, { updatedAt, deviceId: await getDeviceId() });
    await db.saveEnvelope(env);
    stand = updatedAt;
    for (const l of saveListeners) safeCall(l, { env, quelle: 'lokal' });
  } catch (e) {
    dirty = true; // nichts geht verloren – nächster Versuch beim nächsten Speichern
    for (const l of saveListeners) safeCall(l, { fehler: e });
    throw e;
  }
}

/** Zeitstempel strikt größer als der vorherige (schützt bei falsch gehender Uhr). */
function nextTimestamp(prev) {
  const now = nowIso();
  if (prev && now <= prev) return new Date(new Date(prev).getTime() + 1).toISOString();
  return now;
}

/** Aktuellen Umschlag holen (für Backup/Upload). Speichert vorher ausstehende Änderungen. */
export async function currentEnvelope() {
  await flush();
  return db.loadEnvelope();
}

/** Beliebigen Inhalt (z. B. die Einstellungsdatei) mit dem Master-Passwort verschlüsseln. */
export async function verschluesseln(inhalt: unknown) {
  if (!keyring) throw new Error('Gesperrt.');
  return keyring.encrypt(inhalt, { updatedAt: nowIso(), deviceId: 'einstellungen' });
}

/**
 * Fremden Umschlag übernehmen (Sicherung einspielen).
 * Entschlüsselt mit dem aktuellen Passwort, wenn keines übergeben wird.
 * Der bisherige Stand wandert automatisch in die lokale Historie.
 */
export async function adoptEnvelope(env: unknown, password: string | null = null, { passwortBehalten = false } = {}) {
  if (!validateEnvelope(env)) throw new Error('Keine gültige Sperling-Datei.');
  const kr = password ? new KeyRing(password) : keyring;
  if (!kr) throw new Error('Gesperrt.');
  const raw = await kr.decrypt(env);
  if (passwortBehalten && kr !== keyring) {
    // Ältere Version mit früherem Passwort: Inhalt übernehmen, aber mit dem aktuellen Passwort neu verschlüsseln
    // (sonst würde das Gerät stillschweigend wieder das alte Passwort verlangen).
    kr.wipe();
    if (istEinstellungsPaket(raw)) throw new Error('Das ist eine Einstellungsdatei. Bitte unter „Einstellungen übertragen“ einlesen.');
    const migriert = migrate(raw);
    for (const [k, v] of Object.entries(data?.fotoSchluessel || {})) if (!(k in migriert.fotoSchluessel)) migriert.fotoSchluessel[k] = v;
    await flush();
    data = migriert;
    dirty = true;
    await persist();
    notify();
    return;
  }
  // Eine Einstellungsdatei ist keine Sicherung: sie würde sonst alle Kunden ersetzen.
  if (istEinstellungsPaket(raw)) throw new Error('Das ist eine Einstellungsdatei. Bitte unter „Einstellungen übertragen“ einlesen.');
  const migrated = migrate(raw);
  // Fotoschlüssel dieses Geräts behalten: Fotos, die nicht in der Datei sind, bleiben lesbar
  const alteSchluessel = data?.fotoSchluessel || {};
  const fehlend = Object.keys(alteSchluessel).filter((k) => !(k in migrated.fotoSchluessel));
  for (const k of fehlend) migrated.fotoSchluessel[k] = alteSchluessel[k]!;
  await flush();
  // Fotos aus der Datei (verschlüsselt) übernehmen
  const fotos = ausDatei((env as Rec).fotos);
  if (fotos.length && !demo) await db.fotoSpeichern(...fotos);
  // ohne die Fotos speichern: die Historie hält nur den Bestand
  const { fotos: _ohne, ...nurBestand } = env as Rec;
  void _ohne;
  await db.saveEnvelope(nurBestand as typeof env);
  kr.useSalt(env.kdf.salt, env.kdf.iterations);
  if (kr !== keyring) keyring?.wipe();
  keyring = kr;
  data = migrated;
  stand = env.updatedAt;
  dirty = false;
  if (fehlend.length) { dirty = true; scheduleSave(); }
  notify();
}

export async function changePassword(oldPw: string, newPw: string) {
  const env = await db.loadEnvelope();
  const probe = new KeyRing(oldPw);
  await probe.decrypt(env); // wirft bei falschem altem Passwort
  probe.wipe();
  if (!keyring) throw new Error('Gesperrt.');
  keyring.changePassword(newPw);
  dirty = true;
  await persist();
}

export function subscribe(fn: (d: Daten | null) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function onSaved(fn: (info: Rec) => void): () => void {
  saveListeners.add(fn);
  return () => { saveListeners.delete(fn); };
}

function notify() {
  for (const l of listeners) safeCall(l, data);
}

function safeCall<A>(fn: (a: A) => void, arg: A) {
  try {
    fn(arg);
  } catch (e) {
    console.error('Listener-Fehler', e);
  }
}

// ---------- bequeme Zugriffe ----------

export function findKunde(id: string): Kunde | null {
  if (schutzKundeId && id !== schutzKundeId) return null;
  return data?.kunden.find((k) => k.id === id) || null;
}
