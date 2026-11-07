// Sperling – Dropbox-Abgleich (nur verschlüsselte Datei, "letzter Stand gewinnt").
//
// Auth: OAuth 2 "Authorization Code + PKCE" direkt aus dem Browser, ohne Server.
// Der Refresh-Token liegt NUR im verschlüsselten Datenbestand (einstellungen.dropbox).
// Voraussetzung: eigene Dropbox-App (Zugriff "App folder"), siehe docs/ANLEITUNG.md.

import { bytesToB64, randomBytes, validateEnvelope } from '../core/crypto.js';

const AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const DOWNLOAD_URL = 'https://content.dropboxapi.com/2/files/download';
const UPLOAD_URL = 'https://content.dropboxapi.com/2/files/upload';
const SS_VERIFIER = 'sperling.dbx.verifier';
const SS_CODE = 'sperling.dbx.code';
const TIMEOUT_MS = 30000;

let accessToken = null;
let accessTokenExp = 0;

export function redirectUri() {
  return `${location.origin}${location.pathname}`;
}

function b64url(bytes) {
  return bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Dropbox-API-Arg muss ASCII sein: Nicht-ASCII als \\uXXXX kodieren. */
function headerJson(obj) {
  return JSON.stringify(obj).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

async function fetchMitTimeout(url, opts) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Dropbox antwortet nicht (Zeitüberschreitung).');
    throw new Error('Keine Verbindung zu Dropbox (offline?).');
  } finally {
    clearTimeout(t);
  }
}

/** Schritt 1: Zur Dropbox-Anmeldung weiterleiten. */
export async function startAuth(appKey) {
  if (!appKey) throw new Error('Bitte zuerst den App-Key eintragen.');
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  sessionStorage.setItem(SS_VERIFIER, verifier);
  const p = new URLSearchParams({
    client_id: appKey,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline',
    redirect_uri: redirectUri(),
  });
  location.assign(`${AUTH_URL}?${p}`);
}

/** Beim App-Start: ?code=… aus der URL abholen und bis nach dem Entsperren merken. */
export function captureAuthCode() {
  const url = new URL(location.href);
  const code = url.searchParams.get('code');
  const err = url.searchParams.get('error');
  if (code || err) {
    if (code) sessionStorage.setItem(SS_CODE, code);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
  }
  return Boolean(code);
}

export function hasPendingAuthCode() {
  return Boolean(sessionStorage.getItem(SS_CODE));
}

/** Schritt 2 (nach dem Entsperren): Code gegen Refresh-Token tauschen. */
export async function finishAuth(appKey) {
  const code = sessionStorage.getItem(SS_CODE);
  const verifier = sessionStorage.getItem(SS_VERIFIER);
  sessionStorage.removeItem(SS_CODE);
  sessionStorage.removeItem(SS_VERIFIER);
  if (!code || !verifier) throw new Error('Dropbox-Anmeldung unvollständig. Bitte erneut verbinden.');
  const res = await fetchMitTimeout(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, grant_type: 'authorization_code', code_verifier: verifier, client_id: appKey, redirect_uri: redirectUri() }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.refresh_token) throw new Error(`Dropbox-Anmeldung fehlgeschlagen: ${j.error_description || j.error || res.status}`);
  accessToken = j.access_token || null;
  accessTokenExp = Date.now() + ((j.expires_in || 0) - 60) * 1000;
  return j.refresh_token;
}

async function token(cfg) {
  if (accessToken && Date.now() < accessTokenExp) return accessToken;
  if (!cfg.appKey || !cfg.refreshToken) throw new Error('Dropbox ist nicht verbunden.');
  const res = await fetchMitTimeout(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: cfg.refreshToken, client_id: cfg.appKey }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) {
    const e = new Error('Dropbox-Zugang abgelaufen oder widerrufen. Bitte neu verbinden.');
    e.code = 'AUTH';
    throw e;
  }
  accessToken = j.access_token;
  accessTokenExp = Date.now() + ((j.expires_in || 14400) - 60) * 1000;
  return accessToken;
}

export function vergessen() {
  accessToken = null;
  accessTokenExp = 0;
}

/** Lädt den Umschlag aus Dropbox. Gibt null zurück, wenn noch keine Datei existiert. */
export async function download(cfg) {
  const res = await fetchMitTimeout(DOWNLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token(cfg)}`, 'Dropbox-API-Arg': headerJson({ path: cfg.pfad }) },
  });
  if (res.status === 409) {
    const txt = await res.text();
    if (txt.includes('not_found')) return null;
    throw new Error(`Dropbox-Fehler: ${txt.slice(0, 200)}`);
  }
  if (res.status === 401) { vergessen(); throw new Error('Dropbox-Zugang ungültig. Bitte neu verbinden.'); }
  if (!res.ok) throw new Error(`Dropbox-Download fehlgeschlagen (${res.status}).`);
  let env;
  try {
    env = JSON.parse(await res.text());
  } catch {
    throw new Error('Die Datei in Dropbox ist beschädigt (kein JSON).');
  }
  validateEnvelope(env);
  return env;
}

export async function upload(cfg, env) {
  validateEnvelope(env);
  const res = await fetchMitTimeout(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await token(cfg)}`,
      'Dropbox-API-Arg': headerJson({ path: cfg.pfad, mode: 'overwrite', mute: true }),
      'Content-Type': 'application/octet-stream',
    },
    body: JSON.stringify(env),
  });
  if (res.status === 401) { vergessen(); throw new Error('Dropbox-Zugang ungültig. Bitte neu verbinden.'); }
  if (!res.ok) throw new Error(`Dropbox-Upload fehlgeschlagen (${res.status}).`);
}
