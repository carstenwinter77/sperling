// Sperling – Kundenfotos speichern und lesen. Jedes Foto wird verkleinert (Vollbild und Vorschau),
// mit einem zufälligen Fotoschlüssel (AES-GCM, 256 Bit) verschlüsselt und in der IndexedDB-Tabelle
// „fotos“ abgelegt. Der Fotoschlüssel liegt nur im verschlüsselten Bestand (R-KRYPTO); ein neues
// Master-Passwort ändert daran nichts. Entschlüsselte Bilder gibt es nur als Blob-URLs im Arbeits-
// speicher, beim Sperren werden sie verworfen. In der Demo bleibt alles im Arbeitsspeicher.
import { bytesToB64, b64ToBytes, randomBytes } from '../core/crypto.ts';
import { uid, type Rec } from '../core/util.ts';
import { benutzteFotoIds, neueFotoId } from '../core/fotos.ts';
import * as store from './store.ts';
import * as db from './db.ts';
import { ausDatei } from './fotodatei.ts';

const VOLL_KANTE = 1600;
const VOLL_QUALITAET = 0.72;
const VORSCHAU_KANTE = 320;
const VORSCHAU_QUALITAET = 0.6;

const schluesselCache = new Map<string, CryptoKey>();
const vorschauUrls = new Map<string, string>();
const vollUrls = new Map<string, string>(); // höchstens VOLL_MAX, älteste fliegen raus
const VOLL_MAX = 8;
const demoAblage = new Map<string, db.FotoDatensatz>();

store.subscribe((d) => { if (!d) vergessen(); });

/** Beim Sperren: entschlüsselte Bilder und Schlüssel aus dem Speicher werfen. */
export function vergessen() {
  for (const u of [...vorschauUrls.values(), ...vollUrls.values()]) URL.revokeObjectURL(u);
  vorschauUrls.clear(); vollUrls.clear(); schluesselCache.clear(); demoAblage.clear();
}

const ablage = {
  speichern: (...s: db.FotoDatensatz[]) => (store.isDemo() ? (s.forEach((x) => demoAblage.set(x.id, x)), Promise.resolve()) : db.fotoSpeichern(...s)),
  laden: (id: string) => (store.isDemo() ? Promise.resolve(demoAblage.get(id)) : db.fotoLaden(id)),
  ids: () => (store.isDemo() ? Promise.resolve([...demoAblage.keys()]) : db.fotoIds()),
  loeschen: (ids: string[]) => (store.isDemo() ? (ids.forEach((i) => demoAblage.delete(i)), Promise.resolve()) : db.fotoLoeschen(ids)),
};

async function schluesselImport(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', b64ToBytes(b64), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Aktueller Fotoschlüssel; beim ersten Foto wird einer erzeugt und im Bestand gespeichert. */
async function aktuellerSchluessel(): Promise<{ id: string; key: CryptoKey }> {
  let liste = store.getData().fotoSchluessel || {};
  if (!Object.keys(liste).length) {
    const neu = bytesToB64(randomBytes(32));
    store.mutate((d) => { d.fotoSchluessel ||= {}; if (!Object.keys(d.fotoSchluessel).length) d.fotoSchluessel[`k-${uid()}`] = neu; });
    liste = store.getData().fotoSchluessel;
  }
  const id = Object.keys(liste).sort().at(-1)!;
  return { id, key: await schluessel(id) };
}

async function schluessel(id: string): Promise<CryptoKey> {
  const vorhanden = schluesselCache.get(id);
  if (vorhanden) return vorhanden;
  const b64 = store.getData().fotoSchluessel?.[id];
  if (!b64) throw new Error('Fotoschlüssel fehlt. Das Foto stammt von einem anderen Gerät, dessen Sicherung hier nicht eingespielt ist.');
  const k = await schluesselImport(b64);
  schluesselCache.set(id, k);
  return k;
}

const aad = (id: string, art: 'voll' | 'vorschau') => new TextEncoder().encode(`sperling-foto|${id}|${art}`);

/** Bild verkleinern (Ausrichtung aus EXIF), weißer Hintergrund, JPEG. */
async function verkleinern(datei: Blob, kante: number, qualitaet: number): Promise<{ blob: Blob; breite: number; hoehe: number }> {
  const bmp = await createImageBitmap(datei, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(datei));
  const f = Math.min(1, kante / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * f));
  c.height = Math.max(1, Math.round(bmp.height * f));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Bild konnte nicht verarbeitet werden.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', qualitaet));
  c.width = 0; c.height = 0; // Speicher sofort freigeben (iOS)
  if (!blob) throw new Error('Bild konnte nicht verarbeitet werden.');
  return { blob, breite: Math.round(bmp.width * f), hoehe: Math.round(bmp.height * f) };
}

/** Foto aufnehmen: verkleinern, verschlüsseln, ablegen. Gibt die Beschreibung für kunde.fotos zurück. */
export async function aufnehmen(datei: Blob): Promise<{ id: string; bytes: number; breite: number; hoehe: number }> {
  const voll = await verkleinern(datei, VOLL_KANTE, VOLL_QUALITAET);
  const vorschau = await verkleinern(datei, VORSCHAU_KANTE, VORSCHAU_QUALITAET);
  const { id: sid, key } = await aktuellerSchluessel();
  const id = neueFotoId();
  const iv = randomBytes(12); const tiv = randomBytes(12);
  const [ct, tct] = await Promise.all([
    crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(id, 'voll') }, key, await voll.blob.arrayBuffer()),
    crypto.subtle.encrypt({ name: 'AES-GCM', iv: tiv, additionalData: aad(id, 'vorschau') }, key, await vorschau.blob.arrayBuffer()),
  ]);
  await ablage.speichern({ id, schluessel: sid, iv: iv.buffer, ct, tiv: tiv.buffer, tct });
  vorschauUrls.set(id, URL.createObjectURL(vorschau.blob));
  return { id, bytes: voll.blob.size + vorschau.blob.size, breite: voll.breite, hoehe: voll.hoehe };
}

/** Blob-URL eines Fotos (entschlüsselt, zwischengespeichert). null, wenn es nicht (mehr) da ist. */
export async function url(id: string, art: 'voll' | 'vorschau' = 'vorschau'): Promise<string | null> {
  const cache = art === 'voll' ? vollUrls : vorschauUrls;
  const da = cache.get(id);
  if (da) { if (art === 'voll') { cache.delete(id); cache.set(id, da); } return da; }
  const s = await ablage.laden(id);
  if (!s) return null;
  const key = await schluessel(s.schluessel);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(art === 'voll' ? s.iv : s.tiv), additionalData: aad(id, art) }, key, art === 'voll' ? s.ct : s.tct);
  const u = URL.createObjectURL(new Blob([plain], { type: 'image/jpeg' }));
  cache.set(id, u);
  if (art === 'voll' && cache.size > VOLL_MAX) { const alt = cache.keys().next().value!; URL.revokeObjectURL(cache.get(alt)!); cache.delete(alt); }
  return u;
}

/** Bilddaten löschen (die Beschreibung im Kunden entfernt der Aufrufer per mutate). */
export async function loeschen(ids: string[]) {
  for (const id of ids) {
    for (const c of [vorschauUrls, vollUrls]) { const u = c.get(id); if (u) { URL.revokeObjectURL(u); c.delete(id); } }
  }
  await ablage.loeschen(ids);
}

/** Bilddaten löschen, die kein Kunde (auch keiner im Papierkorb) mehr braucht. Nicht im Beratungs-Schutz. */
export async function aufraeumen(): Promise<number> {
  if (!store.isUnlocked() || store.schutzKunde()) return 0;
  const benutzt = benutzteFotoIds(store.getData());
  const weg = (await ablage.ids()).filter((id) => !benutzt.has(id));
  if (weg.length) await loeschen(weg);
  return weg.length;
}

// ---------- Sicherung ----------

/** Fotos für die Sicherungsdatei (Bytes bleiben verschlüsselt, nur als Base64). */
export async function fuerSicherung(): Promise<Rec[]> {
  const out: Rec[] = [];
  for (const id of benutzteFotoIds(store.getData())) {
    const s = await ablage.laden(id);
    if (s) out.push({ id: s.id, schluessel: s.schluessel, iv: bytesToB64(s.iv), ct: bytesToB64(s.ct), tiv: bytesToB64(s.tiv), tct: bytesToB64(s.tct) });
  }
  return out;
}

export async function einspielen(liste: unknown): Promise<number> {
  const saetze = ausDatei(liste);
  for (const s of saetze) for (const c of [vorschauUrls, vollUrls]) { const u = c.get(s.id); if (u) { URL.revokeObjectURL(u); c.delete(s.id); } }
  await ablage.speichern(...saetze);
  return saetze.length;
}

/**
 * Inhalt der Sicherungsdatei: der verschlüsselte Bestand, bei Bedarf mit den verschlüsselten Fotos.
 * Ältere Sperling-Versionen lesen die Datei weiter (das Feld „fotos“ ignorieren sie).
 */
export async function sicherungsDatei(): Promise<{ text: string; fotos: number }> {
  const env = await store.currentEnvelope();
  if (!env) throw new Error('Noch kein gespeicherter Stand.');
  const mit = store.getData().einstellungen.fotosMitsichern !== false;
  const fotos = mit ? await fuerSicherung() : [];
  return { text: JSON.stringify(fotos.length ? { ...env, fotos } : env), fotos: fotos.length };
}
