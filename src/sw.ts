// Sperling – Service Worker: App-Dateien offline verfügbar machen.
// Die Dateiliste (__SHELL__) und die Version (__VERSION__) setzt der Build ein
// (vite.config.ts, Plugin „sperling-sw“). Kundendaten werden hier NIE gecacht
// (die liegen verschlüsselt in IndexedDB).
/// <reference lib="webworker" />
export {};
declare const self: ServiceWorkerGlobalScope;
declare const __SHELL__: string[];
declare const __VERSION__: string;

const CACHE_VERSION = `sperling-v${__VERSION__}`;
const SHELL: string[] = ['./', ...__SHELL__];

self.addEventListener('install', (e) => {
  // Erste Installation: sofort aktiv. Update: warten, bis der Nutzer „Jetzt aktualisieren“ tippt
  // (nie mitten in einer Eingabe wechseln).
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL)).then(() => (self.registration.active ? undefined : self.skipWaiting())));
});

self.addEventListener('message', (e) => {
  if (e.data?.typ === 'jetzt') void self.skipWaiting();
  if (e.data?.typ === 'version') e.ports?.[0]?.postMessage({ version: __VERSION__ });
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Nur eigene GET-Anfragen bedienen; Dropbox, Karten, Nominatim gehen direkt ins Netz.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then((hit) => hit || fetch(e.request).catch(async () => (await caches.match('index.html')) || Response.error())),
  );
});
