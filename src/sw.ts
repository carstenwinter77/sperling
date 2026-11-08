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
// Produktbilder der Hersteller: nur verlinkt (nicht im Paket), aber nach dem ersten Laden auf dem Gerät
// zwischengespeichert, damit jedes Bild nur einmal abgerufen wird und offline da ist. Der Cache überlebt Updates.
const BILDER_CACHE = 'sperling-produktbilder-v1';
const BILDER_MAX = 300;
const BILDER_HOSTS = ['cdn.prod.website-files.com', 'a.storyblok.com', 'media.vorwerk.com'];

self.addEventListener('install', (e) => {
  // Erste Installation: sofort aktiv. Update: warten, bis der Nutzer „Jetzt aktualisieren“ tippt
  // (nie mitten in einer Eingabe wechseln).
  // cache: 'reload' = immer frisch vom Server, nie eine bis zu 10 Minuten alte Kopie aus dem Browser-Zwischenspeicher
  // (sonst könnte eine neue Version mit der alten Startseite zusammengepackt werden und nicht starten).
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => (self.registration.active ? undefined : self.skipWaiting())));
});

self.addEventListener('message', (e) => {
  if (e.data?.typ === 'jetzt') void self.skipWaiting();
  if (e.data?.typ === 'version') e.ports?.[0]?.postMessage({ version: __VERSION__ });
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION && k !== BILDER_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === 'GET' && url.protocol === 'https:' && BILDER_HOSTS.includes(url.hostname) && e.request.destination === 'image') {
    e.respondWith(produktBild(e.request));
    return;
  }
  // Sonst nur eigene GET-Anfragen bedienen; Karten, Nominatim gehen direkt ins Netz.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then((hit) => hit || fetch(e.request).catch(async () => (await caches.match('index.html')) || Response.error())),
  );
});

/** Produktbild: aus dem Zwischenspeicher, sonst einmal laden und merken (auch undurchsichtige Antworten). */
async function produktBild(req: Request): Promise<Response> {
  const cache = await caches.open(BILDER_CACHE);
  const hit = await cache.match(req.url);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') {
    try {
      await cache.put(req.url, res.clone());
      const keys = await cache.keys();
      for (const k of keys.slice(0, Math.max(0, keys.length - BILDER_MAX))) await cache.delete(k);
    } catch { /* Speicher voll: Bild trotzdem zeigen */ }
  }
  return res;
}
