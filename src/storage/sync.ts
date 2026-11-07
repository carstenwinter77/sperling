// Sperling – Abgleich-Steuerung: vergleicht lokalen und Dropbox-Stand, neuester gewinnt.
// Der verdrängte lokale Stand liegt danach in der lokalen Historie (Einstellungen > Historie).

import * as store from './store.ts';
import * as dbx from './dropbox.ts';
import { debounce } from '../core/util.ts';

let laeuft: Promise<string> | null = null;
export interface SyncStatus { zustand: string; text: string }
let statusListener: (s: SyncStatus) => void = () => {};
let letzterStatus: SyncStatus = { zustand: 'aus', text: 'Dropbox nicht verbunden' };

export function onStatus(fn: (s: SyncStatus) => void) {
  statusListener = fn;
  fn(letzterStatus);
}

function setStatus(zustand: string, text: string) {
  letzterStatus = { zustand, text };
  try { statusListener(letzterStatus); } catch (e) { console.error(e); }
}

export function istVerbunden() {
  if (!store.isUnlocked() || store.isDemo()) return false;
  const c = store.getData().einstellungen.dropbox;
  return Boolean(c.appKey && c.refreshToken);
}

/** Führt einen Abgleich aus. Parallele Aufrufe teilen sich denselben Lauf. */
export function syncJetzt() {
  if (!istVerbunden()) {
    setStatus('aus', 'Dropbox nicht verbunden');
    return Promise.resolve('aus');
  }
  if (laeuft) return laeuft;
  laeuft = (async () => {
    setStatus('laeuft', 'Abgleich läuft …');
    try {
      if (!navigator.onLine) { setStatus('offline', 'Offline – Abgleich später'); return 'offline'; }
      const cfg = { ...store.getData().einstellungen.dropbox };
      const lokal = await store.currentEnvelope();
      const remote = await dbx.download(cfg);
      let ergebnis = 'gleich';
      if (!remote || (lokal && lokal.updatedAt > remote.updatedAt)) {
        await dbx.upload(cfg, lokal);
        ergebnis = 'hochgeladen';
      } else if (!lokal || remote.updatedAt > lokal.updatedAt) {
        await store.adoptEnvelope(remote);
        ergebnis = 'heruntergeladen';
      }
      // letzterSync nur im Speicher vermerken, ohne neuen Speicherstand zu erzeugen
      store.getData().einstellungen.dropbox.letzterSync = new Date().toISOString();
      const texte = { hochgeladen: 'Hochgeladen', heruntergeladen: 'Neuester Stand geladen', gleich: 'Aktuell' };
      setStatus('ok', `${texte[ergebnis]} · ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`);
      return ergebnis;
    } catch (e) {
      console.error('Sync-Fehler', e);
      setStatus('fehler', (e as Error).message || 'Abgleich fehlgeschlagen');
      return 'fehler';
    } finally {
      laeuft = null;
    }
  })();
  return laeuft;
}

const syncSpaeter = debounce(() => { syncJetzt(); }, 5000);

/** Einmalig beim Start aufrufen. */
export function init() {
  store.onSaved((ev) => { if (!ev.fehler && ev.quelle === 'lokal' && istVerbunden()) syncSpaeter(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && istVerbunden()) syncJetzt();
  });
  window.addEventListener('online', () => { if (istVerbunden()) syncJetzt(); });
}
