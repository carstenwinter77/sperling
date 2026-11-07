// Karte: Satellit/Straße, farbige Pins je Status, Tippen setzt neuen Standort mit Adressvorschlag.
import { esc, nowIso, isValidCoord } from '../../core/util.js';
import { SPARTEN, SPARTEN_KEYS, STATUS, hauptStatus, kundenTitel, adresseEinzeilig, neuerKunde } from '../../core/model.js';
import * as store from '../../storage/store.js';
import { adresseZuKoordinate } from '../../services/geo.js';
import { toast, maskottchen } from '../dom.js';
import { statusChips } from '../parts.js';

const LAYER = {
  satellit: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    opt: { maxZoom: 20, maxNativeZoom: 19, attribution: 'Bilder © Esri, Maxar, Earthstar Geographics' },
  },
  strasse: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    opt: { maxZoom: 20, maxNativeZoom: 19, attribution: '© OpenStreetMap-Mitwirkende' },
  },
};
// Straßennamen als Overlay über dem Satellitenbild
const LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

function pinIcon(L, farbe) {
  return L.divIcon({
    className: 'pin',
    html: `<span style="--c:${farbe}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

export function render(el, params) {
  if (!globalThis.L) {
    el.innerHTML = '<p class="hinweis">Die Kartenbibliothek konnte nicht geladen werden.</p>';
    return;
  }
  const L = globalThis.L;
  const einst = store.getData().einstellungen.karte;
  const filter = { sparte: '', status: '' };

  el.innerHTML = `
    <div class="karte-seite">
      <div class="karte-leiste">
        <div class="segment" role="group" aria-label="Kartenansicht">
          <button data-layer="satellit">Satellit</button><button data-layer="strasse">Karte</button>
        </div>
        <select id="fSparte"><option value="">Alle Sparten</option>${SPARTEN_KEYS.map((s) => `<option value="${s}">${esc(SPARTEN[s].label)}</option>`).join('')}</select>
        <select id="fStatus"><option value="">Jeder Status</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}</select>
        <button class="btn klein" id="ich" title="Mein Standort">◎</button>
      </div>
      <div id="map" class="map"></div>
      <div class="karte-hinweis" id="kHinweis">${maskottchen('karte', 'mini')} Tippe lange (oder Rechtsklick) auf ein Haus, um es zu markieren.</div>
      <div class="legende">${Object.entries(STATUS).map(([, v]) => `<span><i style="background:${v.farbe}"></i>${esc(v.label)}</span>`).join('')}</div>
    </div>`;

  const map = L.map(el.querySelector('#map'), { zoomControl: true }).setView([einst.lat, einst.lng], einst.zoom);
  let basis = null;
  let labels = null;
  let kachelFehler = 0;
  const setLayer = (name) => {
    if (basis) map.removeLayer(basis);
    if (labels) { map.removeLayer(labels); labels = null; }
    basis = L.tileLayer(LAYER[name].url, LAYER[name].opt).addTo(map);
    basis.on('tileerror', () => {
      kachelFehler++;
      if (kachelFehler === 3 && !store.isDemo()) toast('Kartenbilder werden nicht geladen (offline oder blockiert).', 'error', 5000);
      if (kachelFehler === 3 && store.isDemo()) {
        const h = el.querySelector('#kHinweis');
        if (h) h.innerHTML = 'In dieser Vorschau sind Kartenbilder gesperrt. In der echten App siehst du hier das Satellitenbild bzw. die Straßenkarte.';
      }
    });
    if (name === 'satellit') labels = L.tileLayer(LABELS, { maxZoom: 20, maxNativeZoom: 19 }).addTo(map);
    el.querySelectorAll('[data-layer]').forEach((b) => b.classList.toggle('aktiv', b.dataset.layer === name));
    if (!store.isDemo()) store.getData().einstellungen.karte.layer = name; // reine Ansichtseinstellung, kein eigener Speichervorgang
  };
  setLayer(einst.layer);
  el.querySelectorAll('[data-layer]').forEach((b) => b.addEventListener('click', () => setLayer(b.dataset.layer)));

  // Demo-Link: Dort sind fremde Kartenserver gesperrt. Damit die Ansicht trotzdem lesbar ist,
  // zeichnen wir die Beispielstraßen als einfache Linien. In der echten App erscheint das Satellitenbild.
  if (store.isDemo()) {
    const strassen = [
      { name: 'Lindenweg', pkt: [[52.3762, 9.7315], [52.3775, 9.7360]] },
      { name: 'Hauptstraße', pkt: [[52.3740, 9.7280], [52.3760, 9.7310], [52.3762, 9.7315]] },
      { name: 'Am Markt', pkt: [[52.3738, 9.7340], [52.3750, 9.7385]] },
      { name: '', pkt: [[52.3760, 9.7310], [52.3745, 9.7355]] },
    ];
    for (const st of strassen) {
      const linie = L.polyline(st.pkt, { color: '#ffffff', weight: 14, opacity: 0.95, interactive: false }).addTo(map);
      if (st.name) linie.bindTooltip(st.name, { permanent: true, direction: 'center', className: 'strassen-label' });
    }
    el.querySelector('#map').classList.add('demo-karte');
  }

  const pins = L.layerGroup().addTo(map);
  const zeichnen = () => {
    pins.clearLayers();
    for (const k of store.getData().kunden) {
      if (k.lat === null || k.lng === null) continue;
      if (filter.sparte && filter.status && k.status[filter.sparte] !== filter.status) continue;
      if (filter.sparte && !filter.status && ['unbekannt', 'kein_interesse'].includes(k.status[filter.sparte])) continue;
      if (!filter.sparte && filter.status && !SPARTEN_KEYS.some((s) => k.status[s] === filter.status)) continue;
      const st = filter.sparte ? k.status[filter.sparte] : hauptStatus(k);
      const m = L.marker([k.lat, k.lng], { icon: pinIcon(L, STATUS[st].farbe), title: kundenTitel(k) });
      m.bindPopup(() => `<div class="popup"><strong>${esc(kundenTitel(k))}</strong><br><small>${esc(adresseEinzeilig(k))}</small><br>${statusChips(k)}<br><a class="btn klein primary" href="#/kunde/${esc(k.id)}">Öffnen</a></div>`);
      pins.addLayer(m);
    }
  };
  zeichnen();

  el.querySelector('#fSparte').addEventListener('change', (e) => { filter.sparte = e.target.value; zeichnen(); });
  el.querySelector('#fStatus').addEventListener('change', (e) => { filter.status = e.target.value; zeichnen(); });

  el.querySelector('#ich').addEventListener('click', () => {
    if (!navigator.geolocation) { toast('Standort nicht verfügbar.', 'error'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => map.setView([p.coords.latitude, p.coords.longitude], 18),
      () => toast('Standort konnte nicht ermittelt werden.', 'error'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });

  // Neuen Standort setzen: Langes Tippen (contextmenu) oder Rechtsklick.
  const neuerPunkt = (e) => {
    const { lat, lng } = e.latlng;
    if (!isValidCoord(lat, lng)) return;
    const html = `<div class="popup" id="neuPopup"><strong>Neuer Standort</strong><br><small id="adrVorschlag">Adresse wird gesucht …</small><br>
      <button class="btn klein primary" data-neu="potenzial">Als Potenzial markieren</button>
      <button class="btn klein" data-neu="kunde">Kunde anlegen</button></div>`;
    const popup = L.popup().setLatLng(e.latlng).setContent(html).openOn(map);
    let adresse = { strasse: '', plz: '', ort: '' };
    adresseZuKoordinate(lat, lng)
      .then((a) => { if (a) adresse = a; const s = popup.getElement()?.querySelector('#adrVorschlag'); if (s) s.textContent = a ? [a.strasse, [a.plz, a.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Keine Adresse gefunden' : 'Keine Adresse gefunden'; })
      .catch((err) => { const s = popup.getElement()?.querySelector('#adrVorschlag'); if (s) s.textContent = err.message; });
    popup.getElement()?.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-neu]');
      if (!b) return;
      const status = b.dataset.neu === 'potenzial' ? { pv: 'potenzial', wp: 'unbekannt', vorwerk: 'unbekannt' } : undefined;
      const k = neuerKunde({ lat, lng, ...adresse, ...(status ? { status } : {}) });
      if (b.dataset.neu === 'potenzial') {
        k.notizen.push({ id: `${k.id}-n`, zeitpunkt: nowIso(), text: 'Auf der Karte als Potenzial markiert.', sparten: ['pv'] });
      }
      store.mutate((d) => { d.kunden.push(k); });
      map.closePopup();
      if (b.dataset.neu === 'kunde') location.hash = `#/kunde/${k.id}?neu=1`;
      else { zeichnen(); toast('Markiert', 'ok'); }
    });
  };
  map.on('contextmenu', neuerPunkt);

  // Kartenposition merken (ohne Speichervorgang auszulösen)
  map.on('moveend', () => {
    if (store.isDemo()) return;
    const c = map.getCenter();
    Object.assign(store.getData().einstellungen.karte, { lat: c.lat, lng: c.lng, zoom: map.getZoom() });
  });

  const fokus = params.get('kunde');
  if (fokus) {
    const k = store.findKunde(fokus);
    if (k && k.lat !== null) {
      map.setView([k.lat, k.lng], 19);
      pins.eachLayer((m) => { const ll = m.getLatLng(); if (ll.lat === k.lat && ll.lng === k.lng) m.openPopup(); });
    }
  }
  // Größe nach Layout korrigieren (Leaflet misst beim Erzeugen evtl. 0px)
  setTimeout(() => map.invalidateSize(), 50);

  return () => map.remove();
}
