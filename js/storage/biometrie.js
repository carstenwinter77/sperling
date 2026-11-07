// Sperling – Entsperren mit Face ID / Touch ID (iPad, iPhone, Mac) bzw. Fingerabdruck (Android).
//
// Technik: Passkey (WebAuthn, Gerätesperre) mit PRF-Erweiterung. Der Passkey liefert nach
// erfolgreicher Face-ID-Prüfung ein geheimes 32-Byte-Ergebnis, das nur dieses Gerät/dieser Passkey
// erzeugen kann. Daraus leiten wir einen AES-Schlüssel ab, mit dem das Master-Passwort
// verschlüsselt auf dem Gerät liegt (IndexedDB, meta „biometrie“). Ohne Face ID kein Schlüssel,
// ohne Schlüssel kein Passwort. Das Master-Passwort bleibt immer als Ausweg (R-PASSWORT).
//
// Ohne PRF-Unterstützung (ältere Systeme, vor iOS/iPadOS 18) wird Face ID NICHT angeboten –
// ein reines „Gesicht erkannt, also los“ ohne Schlüssel wäre keine echte Verschlüsselung.

import * as db from './db.js';

const META = 'biometrie';
const INFO = new TextEncoder().encode('sperling-biometrie-v1');

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const zufall = (n) => crypto.getRandomValues(new Uint8Array(n));

/** Gerät kann grundsätzlich Face ID/Touch ID für Webseiten (PRF-Unterstützung zeigt sich erst beim Einrichten). */
export async function verfuegbar() {
  try {
    if (!window.isSecureContext || !window.PublicKeyCredential) return false;
    if (document.documentElement.dataset.demo === '1') return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

export async function eingerichtet() {
  try { return Boolean(await db.getMeta(META)); } catch { return false; }
}

export async function ausschalten() {
  await db.setMeta(META, null);
}

/** Name für die Oberfläche. */
export function bezeichnung() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|Macintosh/.test(ua)) return 'Face ID / Touch ID';
  if (/Android/.test(ua)) return 'Fingerabdruck / Gesicht';
  return 'Gerätesperre (Windows Hello / Touch ID)';
}

async function schluesselAus(prfErgebnis) {
  const basis = await crypto.subtle.importKey('raw', prfErgebnis, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: INFO }, basis, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function prfHolen(credId, salt) {
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: zufall(32),
      rpId: location.hostname,
      allowCredentials: [{ type: 'public-key', id: credId, transports: ['internal', 'hybrid'] }],
      userVerification: 'required',
      timeout: 60000,
      extensions: { prf: { eval: { first: salt } } },
    },
  });
  const erg = res?.getClientExtensionResults?.().prf?.results?.first;
  if (!erg) throw new Error('Dieses Gerät unterstützt das sichere Entsperren per Face ID nicht (ab iOS/iPadOS 18).');
  return erg;
}

/**
 * Einrichten. MUSS direkt aus einem Tipp heraus aufgerufen werden (Safari verlangt das):
 * vor navigator.credentials.create darf kein await stehen.
 */
export async function einrichten(passwort) {
  const salt = zufall(32);
  const cred = await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Sperling', id: location.hostname },
      user: { id: zufall(16), name: 'sperling', displayName: 'Sperling' },
      challenge: zufall(32),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
      extensions: { prf: { eval: { first: salt } } },
    },
  });
  if (!cred) throw new Error('Einrichten abgebrochen.');
  const ext = cred.getClientExtensionResults?.().prf;
  if (ext && ext.enabled === false) throw new Error('Dieses Gerät unterstützt das sichere Entsperren per Face ID nicht (ab iOS/iPadOS 18).');
  const credId = new Uint8Array(cred.rawId);
  // Manche Systeme liefern das PRF-Ergebnis schon beim Anlegen, sonst einmal abfragen (zweiter Face-ID-Blick).
  const prf = ext?.results?.first || await prfHolen(credId, salt);
  const key = await schluesselAus(prf);
  const iv = zufall(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(passwort));
  await db.setMeta(META, { v: 1, credId: b64(credId), salt: b64(salt), iv: b64(iv), ct: b64(ct), seit: new Date().toISOString() });
}

/** Liefert das Master-Passwort nach erfolgreicher Face-ID-Prüfung. */
export async function passwortHolen() {
  const m = await db.getMeta(META);
  if (!m) throw new Error('Face ID ist nicht eingerichtet.');
  const prf = await prfHolen(unb64(m.credId), unb64(m.salt));
  const key = await schluesselAus(prf);
  try {
    const klar = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(m.iv) }, key, unb64(m.ct));
    return new TextDecoder().decode(klar);
  } catch {
    throw new Error('Face ID passt nicht mehr zu diesem Gerät. Bitte mit Passwort entsperren und neu einrichten.');
  }
}

/** Verständliche Meldung für abgebrochene/verweigerte Prüfungen. */
export function fehlerText(err) {
  if (err?.name === 'NotAllowedError') return 'Abgebrochen oder nicht erkannt. Nochmal versuchen oder Passwort eingeben.';
  if (err?.name === 'InvalidStateError') return 'Auf diesem Gerät ist bereits ein Sperling-Zugang eingerichtet.';
  if (err?.name === 'SecurityError') return 'Face ID geht nur in der installierten App (https).';
  return err?.message || 'Face ID hat nicht geklappt.';
}
