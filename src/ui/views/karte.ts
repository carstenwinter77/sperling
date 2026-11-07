// Karte: Satellit/Straße, farbige Pins je Status, Tippen setzt neuen Standort mit Adressvorschlag.
import { esc, nowIso, isValidCoord } from '../../core/util.ts';
import { SPARTEN, SPARTEN_KEYS, STATUS, hauptStatus, kundenTitel, kundenName, adresseEinzeilig, neuerKunde, neueNotiz } from '../../core/model.ts';
import * as store from '../../storage/store.ts';
import { adresseZuKoordinate, adressenSuchen } from '../../services/geo.ts';
import { toast, maskottchen } from '../dom.ts';
import { statusChips } from '../parts.ts';
import { passt, pinStatus, leererKartenFilter, filterAktiv, type KartenFilter } from '../../core/kartenfilter.ts';
import { letzterKontakt, tageSeit, seitText } from '../../core/verlauf.ts';
import { filterPanelHtml, filterPanelZeigen, filterPanelVerdrahten } from '../filterpanel.ts';
import { hinfahrenKnopf } from '../navi.ts';

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

/** Filter bleibt beim Hin- und Herwechseln erhalten (nur im Arbeitsspeicher). */
const letzterFilter: KartenFilter = leererKartenFilter();

export function render(el: HTMLElement, params: URLSearchParams) {
  if (!globalThis.L) {
    el.innerHTML = '<p class="hinweis">Die Kartenbibliothek konnte nicht geladen werden.</p>';
    return;
  }
  const L = globalThis.L;
  const einst = store.getData().einstellungen.karte;
  const filter: KartenFilter = letzterFilter;

  el.innerHTML = `
    <div class="karte-seite">
      <form class="karte-suche" id="suche" role="search" autocomplete="off">
        <input type="search" name="q" placeholder="Adresse oder Kunde suchen, z. B. Lindenweg 4 Hannover" enterkeyhint="search" aria-label="Adresse suchen">
        <button class="btn klein primary" type="submit">Suchen</button>
        <ul class="suchergebnisse" id="treffer" hidden></ul>
      </form>
      <div class="karte-leiste">
        <div class="segment" role="group" aria-label="Kartenansicht">
          <button data-layer="satellit">Satellit</button><button data-layer="strasse">Karte</button>
        </div>
        <button type="button" class="btn klein" id="fKnopf" aria-expanded="false" aria-controls="fPanel">Filter <span id="fAnzahl"></span></button>
        <button class="btn klein" id="ich" title="Mein Standort">◎</button>
      </div>
      ${filterPanelHtml('fPanel')}
      <div id="map" class="map"></div>
      <div class="karte-hinweis" id="kHinweis">${maskottchen('karte', 'mini')} Tippe lange (oder Rechtsklick) auf ein Haus, um es zu markieren.</div>
      <div class="legende">${Object.entries(STATUS).map(([, v]) => `<span><i style="background:${v.farbe}"></i>${esc(v.label)}</span>`).join('')}</div>
    </div>`;

  const map = L.map(el.querySelector('#map'), { zoomControl: true }).setView([einst.lat, einst.lng], einst.zoom);
  let basis: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  let labels: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
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
    let gesamt = 0; let sichtbar = 0;
    const daten = store.getData();
    for (const k of daten.kunden) {
      if (k.lat === null || k.lng === null) continue;
      gesamt++;
      if (!passt(k, filter, tageSeit(letzterKontakt(daten, k)))) continue;
      sichtbar++;
      const st = pinStatus(k, filter);
      const m = L.marker([k.lat, k.lng], { icon: pinIcon(L, STATUS[st].farbe), title: kundenTitel(k) });
      m.bindPopup(() => `<div class="popup"><strong>${esc(kundenTitel(k))}</strong><br><small>${esc(adresseEinzeilig(k))}</small><br>${statusChips(k)}<br><small>Letzter Kontakt: ${esc(seitText(tageSeit(letzterKontakt(store.getData(), k))))}</small><br><a class="btn klein primary" href="#/kunde/${esc(k.id)}">Öffnen</a>${hinfahrenKnopf(k, 'btn klein')}</div>`);
      pins.addLayer(m);
    }
    const aktiv = filterAktiv(filter);
    el.querySelector('#fAnzahl').textContent = aktiv ? `· ${sichtbar} von ${gesamt}` : '';
    el.querySelector('#fKnopf').classList.toggle('primary', aktiv > 0);
    filterPanelZeigen(el.querySelector('#fPanel'), filter, sichtbar, gesamt, 'Kunden mit Standort');
  };
  zeichnen();

  el.querySelector('#fKnopf').addEventListener('click', (e) => {
    const panel = el.querySelector('#fPanel');
    panel.hidden = !panel.hidden;
    el.querySelector('.karte-seite')?.classList.toggle('filter-offen', !panel.hidden);
    (e.currentTarget as HTMLElement).setAttribute('aria-expanded', String(!panel.hidden));
    setTimeout(() => map.invalidateSize(), 0);
  });
  filterPanelVerdrahten(el.querySelector('#fPanel'), filter, zeichnen);

  // Eigener Standort: blauer Punkt; beim Öffnen der Karte automatisch dorthin zoomen.
  let ichPunkt: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  const zuMirZoomen = ({ still = false, zoom = 18 } = {}) => {
    if (!navigator.geolocation) { if (!still) toast('Standort nicht verfügbar.', 'error'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (entfernt) return; // Ansicht schon verlassen
        const ll = [p.coords.latitude, p.coords.longitude];
        if (!isValidCoord(ll[0], ll[1])) return;
        if (ichPunkt) map.removeLayer(ichPunkt);
        ichPunkt = L.circleMarker(ll, { radius: 8, color: '#ffffff', weight: 3, fillColor: '#2a7de1', fillOpacity: 1, interactive: false }).addTo(map);
        if (still && nutzerHatBewegt) return; // nicht wegspringen, wenn schon selbst verschoben/gesucht
        map.setView(ll, zoom);
      },
      () => { if (!still) toast('Standort konnte nicht ermittelt werden. Bitte Standortzugriff erlauben.', 'error', 5000); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };
  let nutzerHatBewegt = false;
  let entfernt = false;
  for (const typ of ['pointerdown', 'wheel', 'keydown']) map.getContainer().addEventListener(typ, () => { nutzerHatBewegt = true; }, { once: true, passive: true });
  el.querySelector('#ich').addEventListener('click', () => zuMirZoomen());

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
      const b = (ev.target as Element).closest('[data-neu]');
      if (!b) return;
      const status = b.dataset.neu === 'potenzial' ? { pv: 'potenzial', wp: 'unbekannt', vorwerk: 'unbekannt' } : undefined;
      const k = neuerKunde({ lat, lng, ...adresse, ...(status ? { status } : {}) });
      if (b.dataset.neu === 'potenzial') {
        k.notizen.push(neueNotiz({ id: `${k.id}-n`, text: 'Auf der Karte als Potenzial markiert.', sparten: ['pv'] }));
      }
      store.mutate((d) => { d.kunden.push(k); });
      map.closePopup();
      if (b.dataset.neu === 'kunde') location.hash = `#/kunde/${k.id}?neu=1`;
      else { zeichnen(); toast('Markiert', 'ok'); }
    });
  };
  map.on('contextmenu', neuerPunkt);

  // ---------- Adresssuche ----------
  // Datenschutz (R-EXTERN): Zuerst werden die eigenen Kunden lokal durchsucht. Passt der Suchtext
  // auf einen Kundennamen, geht NICHTS an den Adressdienst – Namen verlassen nie das Gerät.
  const suche = el.querySelector('#suche');
  const trefferListe = el.querySelector('#treffer');
  let suchMarker: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  const listeZu = () => { trefferListe.hidden = true; trefferListe.innerHTML = ''; };
  const hinfliegen = (t) => {
    nutzerHatBewegt = true;
    listeZu();
    suche.querySelector('input').blur();
    if (t.kundeId) {
      map.setView([t.lat, t.lng], 19);
      pins.eachLayer((m) => { const ll = m.getLatLng(); if (ll.lat === t.lat && ll.lng === t.lng) m.openPopup(); });
      return;
    }
    map.setView([t.lat, t.lng], t.genau ? 19 : 17);
    if (suchMarker) map.removeLayer(suchMarker);
    suchMarker = L.circleMarker([t.lat, t.lng], { radius: 14, color: '#e8892c', weight: 3, fillOpacity: 0.15, interactive: false }).addTo(map);
    neuerPunkt({ latlng: L.latLng(t.lat, t.lng) });
  };
  const zeigeTreffer = (liste) => {
    trefferListe.innerHTML = liste.map((t, i) => `<li><button type="button" data-i="${i}">${t.kundeId ? '👤 ' : '📍 '}${esc(t.label)}</button></li>`).join('');
    trefferListe.hidden = false;
    trefferListe.onclick = (ev) => { const b = (ev.target as Element).closest('[data-i]'); if (b) hinfliegen(liste[Number(b.dataset.i)]); };
  };
  suche.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const q = suche.querySelector('input').value.trim();
    listeZu();
    if (q.length < 3) { toast('Bitte mindestens 3 Zeichen eingeben.', 'error'); return; }
    const ql = q.toLocaleLowerCase('de');
    const lokal = store.getData().kunden
      .filter((k) => k.lat !== null && `${kundenTitel(k)} ${kundenName(k)} ${adresseEinzeilig(k)}`.toLocaleLowerCase('de').includes(ql))
      .slice(0, 5)
      .map((k) => ({ lat: k.lat, lng: k.lng, label: `${kundenTitel(k)} – ${adresseEinzeilig(k)}`, kundeId: k.id }));
    const istName = store.getData().kunden.some((k) => kundenName(k) && kundenName(k).toLocaleLowerCase('de').includes(ql));
    if (istName) {
      if (lokal.length === 1) hinfliegen(lokal[0]); else if (lokal.length) zeigeTreffer(lokal); else toast('Kunde gefunden, aber ohne Standort.', 'error');
      return;
    }
    const knopf = suche.querySelector('button[type=submit]');
    knopf.disabled = true;
    try {
      const fern = await adressenSuchen(q, 5);
      const alle = [...lokal, ...fern];
      if (!alle.length) { toast('Keine Adresse gefunden. Mit Ort oder PLZ versuchen.', 'error'); return; }
      if (alle.length === 1 || (!lokal.length && fern[0].genau && fern.length >= 1 && fern.filter((f) => f.genau).length === 1)) hinfliegen(alle[0]);
      else zeigeTreffer(alle);
    } catch (err) {
      if (lokal.length) zeigeTreffer(lokal);
      toast(store.isDemo() ? 'In dieser Vorschau ist die Adresssuche gesperrt – in der echten App funktioniert sie.' : (err as Error).message, 'error', 5000);
    } finally { knopf.disabled = false; }
  });
  suche.querySelector('input').addEventListener('input', (e) => { if (!(e.target as HTMLInputElement).value) listeZu(); });
  map.on('click', listeZu);

  // Kartenposition merken (ohne Speichervorgang auszulösen)
  map.on('moveend', () => {
    if (entfernt || store.isDemo() || !store.isUnlocked()) return; // beim Sperren läuft ggf. noch eine Kamerafahrt aus
    const c = map.getCenter();
    Object.assign(store.getData().einstellungen.karte, { lat: c.lat, lng: c.lng, zoom: map.getZoom() });
  });

  const fokus = params.get('kunde');
  // Beim Öffnen: zum aktuellen Standort, außer ein Kunde soll gezeigt werden (oder Demo).
  if (!fokus && !store.isDemo()) zuMirZoomen({ still: true, zoom: 17 });
  if (fokus) {
    const k = store.findKunde(fokus);
    if (k && k.lat !== null) {
      map.setView([k.lat, k.lng], 19);
      pins.eachLayer((m) => { const ll = m.getLatLng(); if (ll.lat === k.lat && ll.lng === k.lng) m.openPopup(); });
    }
  }
  // Größe nach Layout korrigieren (Leaflet misst beim Erzeugen evtl. 0px)
  setTimeout(() => map.invalidateSize(), 50);

  return () => { entfernt = true; map.remove(); };
}
