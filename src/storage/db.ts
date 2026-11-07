// Sperling – IndexedDB-Zugriff. Speichert ausschließlich VERSCHLÜSSELTE Umschläge
// und unkritische Metadaten (Geräte-ID). Klartext-Kundendaten landen hier nie.

const DB_NAME = 'sperling';
const DB_VERSION = 1;
const HISTORY_MAX = 10;

import type { Umschlag } from '../core/crypto.ts';

let dbPromise: Promise<IDBDatabase> | null = null;

function req2promise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaktion abgebrochen'));
  });
}

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('Dieser Browser erlaubt keine lokale Datenbank (privater Modus?).'));
      return;
    }
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('vault')) db.createObjectStore('vault');
      if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { autoIncrement: true });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    r.onsuccess = () => {
      const db = r.result;
      // Andere Tabs mit neuerer Version: Verbindung sauber schließen statt blockieren.
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    r.onerror = () => { dbPromise = null; reject(r.error); };
    r.onblocked = () => { /* wartet, bis andere Tabs schließen */ };
  });
  return dbPromise;
}

export async function loadEnvelope(): Promise<Umschlag | undefined> {
  const db = await openDb();
  return req2promise<Umschlag | undefined>(db.transaction('vault').objectStore('vault').get('current'));
}

/**
 * Speichert den neuen Umschlag atomar und legt den VORHERIGEN in die Historie.
 * Historie ist begrenzt (HISTORY_MAX), älteste Einträge werden gelöscht.
 */
export async function saveEnvelope(env: Umschlag, { withHistory = true } = {}): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['vault', 'history'], 'readwrite');
  const vault = tx.objectStore('vault');
  const hist = tx.objectStore('history');
  if (withHistory) {
    const prev = await req2promise(vault.get('current'));
    if (prev) {
      hist.add(prev);
      const keys = await req2promise(hist.getAllKeys());
      const zuViel = keys.length - HISTORY_MAX;
      for (let i = 0; i < zuViel; i++) hist.delete(keys[i]);
    }
  }
  vault.put(env, 'current');
  await txDone(tx);
}

export async function listHistory(): Promise<{ key: IDBValidKey; updatedAt: string | undefined; env: Umschlag }[]> {
  const db = await openDb();
  const store = db.transaction('history').objectStore('history');
  const [keys, vals] = await Promise.all([req2promise(store.getAllKeys()), req2promise<Umschlag[]>(store.getAll())]);
  return keys.map((k, i) => ({ key: k, updatedAt: vals[i]?.updatedAt, env: vals[i] })).reverse();
}

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return req2promise<T | undefined>(db.transaction('meta').objectStore('meta').get(key));
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('meta', 'readwrite');
  tx.objectStore('meta').put(value, key);
  await txDone(tx);
}

/** Alles löschen (Werkseinstellung). */
export async function wipeAll() {
  const db = await openDb();
  const tx = db.transaction(['vault', 'history', 'meta'], 'readwrite');
  tx.objectStore('vault').clear();
  tx.objectStore('history').clear();
  tx.objectStore('meta').clear();
  await txDone(tx);
}
