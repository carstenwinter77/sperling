// Sperling – Verschlüsselung (Web Crypto API, läuft in Browser und Node ≥ 20).
//
// Verfahren: PBKDF2-SHA-256 (600.000 Iterationen) leitet aus dem Master-Passwort
// einen AES-256-GCM-Schlüssel ab. Der gesamte Datenbestand wird als JSON
// verschlüsselt und in einem "Umschlag" (Envelope) gespeichert:
//
//   { app, format, updatedAt, deviceId, kdf:{name,hash,iterations,salt}, iv, ct }
//
// `app|format|updatedAt|deviceId` sind als Additional Authenticated Data (AAD)
// gebunden: Wer den Klartext-Kopf manipuliert, macht die Datei unlesbar.

export const ENVELOPE_APP = 'sperling';
export const ENVELOPE_FORMAT = 1;
export const PBKDF2_ITERATIONS = 600000;

/** Verschlüsselter Datenbestand, wie er in IndexedDB und in der Sicherungsdatei liegt. */
export interface Umschlag {
  app: string;
  format: number;
  updatedAt: string;
  deviceId?: string;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  iv: string;
  ct: string;
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Falsches Passwort oder beschädigte Datei.');
    this.name = 'WrongPasswordError';
  }
}

export class InvalidEnvelopeError extends Error {
  constructor(msg?: string) {
    super(msg || 'Keine gültige Sperling-Datei.');
    this.name = 'InvalidEnvelopeError';
  }
}

const subtle = () => {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('Web Crypto ist nicht verfügbar. Die App muss über https:// oder http://localhost geöffnet werden.');
  }
  return c.subtle;
};

export function bytesToB64(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  const CHUNK = 0x8000; // Stack-sicher auch bei großen Daten
  for (let i = 0; i < arr.length; i += CHUNK) {
    bin += String.fromCharCode(...arr.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

export async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Passwort fehlt.');
  }
  const s = subtle();
  const base = await s.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return s.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function aad(app: string, format: number, updatedAt: string, deviceId: string) {
  return new TextEncoder().encode(`${app}|${format}|${updatedAt}|${deviceId}`);
}

/** Prüft die Form eines Umschlags, ohne zu entschlüsseln. Wirft InvalidEnvelopeError. */
export function validateEnvelope(env: unknown): env is Umschlag {
  const e = env as Partial<Umschlag> | null;
  if (!e || typeof e !== 'object') throw new InvalidEnvelopeError();
  if (e.app !== ENVELOPE_APP) throw new InvalidEnvelopeError('Datei stammt nicht aus Sperling.');
  if (e.format !== ENVELOPE_FORMAT) throw new InvalidEnvelopeError(`Unbekanntes Dateiformat (${e.format}).`);
  const k = e.kdf;
  if (!k || k.name !== 'PBKDF2' || k.hash !== 'SHA-256' || !Number.isInteger(k.iterations) || k.iterations < 100000 || typeof k.salt !== 'string') {
    throw new InvalidEnvelopeError('Schlüsselparameter fehlen oder sind unsicher.');
  }
  if (typeof e.iv !== 'string' || typeof e.ct !== 'string' || typeof e.updatedAt !== 'string') {
    throw new InvalidEnvelopeError();
  }
  return true;
}

/**
 * Hält das Passwort für die Dauer der entsperrten Sitzung und cached
 * abgeleitete Schlüssel pro Salt (PBKDF2 ist absichtlich langsam).
 */
export class KeyRing {
  private _password: string | null;
  private _iterations: number;
  private _cache = new Map<string, CryptoKey>();
  private _salt: string | null;

  constructor(password: string, iterations = PBKDF2_ITERATIONS) {
    this._password = password;
    this._iterations = iterations;
    this._salt = null; // eigener Salt für neue Verschlüsselungen
  }

  async keyFor(saltB64: string, iterations: number): Promise<CryptoKey> {
    const id = `${saltB64}|${iterations}`;
    if (!this._cache.has(id)) {
      if (this._password === null) throw new Error('Gesperrt.');
      this._cache.set(id, await deriveKey(this._password, b64ToBytes(saltB64), iterations));
    }
    return this._cache.get(id)!;
  }

  /** Setzt den Salt, mit dem künftig verschlüsselt wird (z. B. aus vorhandener Datei übernommen). */
  useSalt(saltB64: string, iterations?: number) {
    this._salt = saltB64;
    if (iterations) this._iterations = iterations;
  }

  async encrypt(dataObj: unknown, { updatedAt, deviceId = '' }: { updatedAt?: string; deviceId?: string } = {}): Promise<Umschlag> {
    if (typeof updatedAt !== 'string') throw new Error('updatedAt fehlt.');
    if (!this._salt) this._salt = bytesToB64(randomBytes(16));
    const key = await this.keyFor(this._salt, this._iterations);
    const iv = randomBytes(12);
    const plain = new TextEncoder().encode(JSON.stringify(dataObj));
    const ct = await subtle().encrypt(
      { name: 'AES-GCM', iv, additionalData: aad(ENVELOPE_APP, ENVELOPE_FORMAT, updatedAt, deviceId) },
      key,
      plain,
    );
    return {
      app: ENVELOPE_APP,
      format: ENVELOPE_FORMAT,
      updatedAt,
      deviceId,
      kdf: { name: 'PBKDF2' as const, hash: 'SHA-256' as const, iterations: this._iterations, salt: this._salt },
      iv: bytesToB64(iv),
      ct: bytesToB64(new Uint8Array(ct)),
    };
  }

  async decrypt(env: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!validateEnvelope(env)) throw new InvalidEnvelopeError();
    const key = await this.keyFor(env.kdf.salt, env.kdf.iterations);
    let plain: ArrayBuffer;
    try {
      plain = await subtle().decrypt(
        { name: 'AES-GCM', iv: b64ToBytes(env.iv), additionalData: aad(env.app, env.format, env.updatedAt, env.deviceId ?? '') },
        key,
        b64ToBytes(env.ct),
      );
    } catch {
      throw new WrongPasswordError();
    }
    try {
      return JSON.parse(new TextDecoder().decode(plain));
    } catch {
      throw new InvalidEnvelopeError('Entschlüsselte Daten sind kein gültiges JSON.');
    }
  }

  /** Passwort ändern: neuer Salt, alter Cache verworfen. */
  changePassword(newPassword: string) {
    this._password = newPassword;
    this._cache.clear();
    this._salt = null;
  }

  wipe() {
    this._password = null;
    this._cache.clear();
    this._salt = null;
  }
}
