// Sperling – Service Worker: App-Dateien offline verfügbar machen.
// REGEL: Bei jeder Änderung an App-Dateien CACHE_VERSION erhöhen (siehe docs/REGELN.md).
// Kundendaten werden hier NIE gecacht (die liegen verschlüsselt in IndexedDB).
const CACHE_VERSION = 'sperling-v0.6.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/layers.png', 'vendor/leaflet/images/layers-2x.png',
  'vendor/leaflet/images/marker-icon.png', 'vendor/leaflet/images/marker-icon-2x.png', 'vendor/leaflet/images/marker-shadow.png',
  'js/app.js', 'js/demo.js',
  'js/core/util.js', 'js/core/crypto.js', 'js/core/model.js', 'js/core/textgen.js', 'js/core/ics.js',
  'js/storage/db.js', 'js/storage/store.js', 'js/storage/sync.js', 'js/storage/dropbox.js',
  'js/services/geo.js',
  'js/ui/dom.js', 'js/ui/parts.js', 'js/ui/theme.js', 'js/ui/kontakt.js', 'js/ui/enpaldoku.js',
  'js/ui/views/start.js', 'js/ui/views/kunden.js', 'js/ui/views/kunde.js', 'js/ui/views/karte.js', 'js/ui/views/termine.js', 'js/ui/views/einstellungen.js', 'js/ui/views/bestand.js', 'js/ui/views/gespraech.js', 'js/core/einwaende.js',
  'assets/icon-192.png', 'assets/icon-512.png', 'assets/apple-touch-icon.png',
  ...['sperling', 'vorwerk', 'waermepumpe', 'photovoltaik', 'kunde-neu', 'karte', 'notizen', 'termine', 'einstellungen', 'statistik'].map((n) => `assets/maskottchen/${n}.png`),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('index.html'))),
  );
});
