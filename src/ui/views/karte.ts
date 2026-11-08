// Karte: Satellit/Straße, farbige Pins je Status, Tippen setzt neuen Standort mit Adressvorschlag.
import { esc, nowIso, isValidCoord } from '../../core/util.ts';
import { SPARTEN, SPARTEN_KEYS, STATUS, hauptStatus, kundenTitel, kundenName, adresseEinzeilig, neuerKunde, neueNotiz } from '../../core/model.ts';
import * as store from '../../storage/store.ts';
import { adresseZuKoordinate, adressenSuchen } from '../../services/geo.ts';
import { toast, maskottchen, bestaetigen } from '../dom.ts';
import * as pk from '../../core/papierkorb.ts';
import { statusChips } from '../parts.ts';
import { passt, pinStatus, leererKartenFilter, filterAktiv, type KartenFilter } from '../../core/kartenfilter.ts';
import { letzterKontakt, tageSeit, seitText } from '../../core/verlauf.ts';
import { filterPanelHtml, filterPanelZeigen, filterPanelVerdrahten } from '../filterpanel.ts';
import { hinfahrenKnopf, naviLink } from '../navi.ts';
import { HAUSTUER, letzteHaustuer, werbeverbot, tagesStopps, streckeKm, unterwegs, googleRoute, ortsTag, euro, angebotsSumme, haustuerStatus, neuerHaustuerEintrag, type HaustuerErgebnis } from '../../core/vertrieb.ts';
import { haustuerKnoepfe, haustuerSpeichern } from '../vertrieb.ts';

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

function pinIcon(L, farbe, extra = '') {
  return L.divIcon({
    className: `pin${extra ? ` ${extra}` : ''}`,
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
      <h1 class="sr-only">Karte</h1>
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
        <button type="button" class="btn klein" id="rKnopf" aria-expanded="false" aria-controls="rPanel">🚗 Tagesroute</button>
        <button class="btn klein" id="ich" title="Mein Standort">◎</button>
      </div>
      <section class="route-panel" id="rPanel" hidden aria-label="Tagesroute">
        <div class="route-kopf">
          <label>Tag <input type="date" id="rTag"></label>
          <label>Unterwegs im Umkreis <select id="rRadius"><option value="500">500 m</option><option value="1500" selected>1,5 km</option><option value="3000">3 km</option><option value="6000">6 km</option></select></label>
          <label class="check"><input type="checkbox" id="rAlle"> Andere Kunden zeigen</label>
        </div>
        <div id="rInhalt"></div>
      </section>
      ${filterPanelHtml('fPanel', store.getData().einstellungen.felder)}
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
  // Tagesroute: nur Kunden der Route und Vorschläge zeigen (null = alle)
  let routeFilter: Set<string> | null = null;
  const zeichnen = () => {
    pins.clearLayers();
    let gesamt = 0; let sichtbar = 0;
    const daten = store.getData();
    for (const k of daten.kunden) {
      if (k.lat === null || k.lng === null) continue;
      gesamt++;
      if (!passt(k, filter, tageSeit(letzterKontakt(daten, k)), daten.einstellungen.felder)) continue;
      sichtbar++;
      if (routeFilter && !routeFilter.has(k.id)) continue;
      const st = pinStatus(k, filter);
      const m = L.marker([k.lat, k.lng], { icon: pinIcon(L, STATUS[st].farbe, werbeverbot(k) ? 'werbeverbot' : ''), title: `${kundenTitel(k)}${werbeverbot(k) ? ' (keine Werbung)' : ''}` });
      m.bindPopup(() => {
        const akt = store.findKunde(k.id) || k;
        const tuer = letzteHaustuer(akt);
        return `<div class="popup"><strong>${esc(kundenTitel(akt))}</strong><br><small>${esc(adresseEinzeilig(akt))}</small><br>${statusChips(akt)}<br><small>Letzter Kontakt: ${esc(seitText(tageSeit(letzterKontakt(store.getData(), akt))))}</small>${tuer ? `<small>Haustür: ${HAUSTUER[tuer.ergebnis].symbol} ${esc(HAUSTUER[tuer.ergebnis].label)} (${esc(seitText(tageSeit(tuer.zeitpunkt)))})</small>` : ''}<br><a class="btn klein primary" href="#/kunde/${esc(akt.id)}">Öffnen</a>${hinfahrenKnopf(akt, 'btn klein')}${['potenzial', 'unbekannt'].includes(hauptStatus(akt)) ? ` <button type="button" class="btn klein ghost" data-pin-loeschen="${esc(akt.id)}" aria-label="Markierung löschen" title="Markierung löschen">🗑</button>` : ''}<small class="popup-tuer">An der Haustür:</small>${haustuerKnoepfe(akt.id, 'btn klein ghost')}</div>`;
      });
      pins.addLayer(m);
    }
    const aktiv = filterAktiv(filter);
    el.querySelector('#fAnzahl').textContent = aktiv ? `· ${sichtbar} von ${gesamt}` : '';
    el.querySelector('#fKnopf').classList.toggle('primary', aktiv > 0);
    filterPanelZeigen(el.querySelector('#fPanel'), filter, sichtbar, gesamt, 'Kunden mit Standort', daten.einstellungen.felder);
  };
  zeichnen();
  // Potenzial-Markierung direkt aus der Infobox löschen (mit Sicherheitsabfrage, landet im Papierkorb)
  map.on('popupopen', (e) => {
    // Haustür-Ergebnis mit einem Tipp (bestehende Markierung)
    (e.popup.getElement() as HTMLElement | undefined)?.querySelector('.haustuer-knoepfe')?.addEventListener('click', (ev) => {
      const b = (ev.target as Element).closest<HTMLElement>('[data-haustuer]');
      if (!b || !b.dataset.kunde) return;
      haustuerSpeichern(b.dataset.kunde, b.dataset.haustuer as HaustuerErgebnis);
      map.closePopup();
      zeichnen();
      if (routeAn) routeZeigen();
    });
    const knopf = (e.popup.getElement() as HTMLElement | undefined)?.querySelector('[data-pin-loeschen]') as HTMLElement | null;
    knopf?.addEventListener('click', async () => {
      const id = knopf.dataset.pinLoeschen || '';
      const k = id ? store.findKunde(id) : null;
      if (!k) return;
      map.closePopup();
      if (!(await bestaetigen('Markierung löschen?', `${kundenTitel(k)} (${adresseEinzeilig(k) || 'ohne Adresse'}) kommt in die Liste „Gelöscht“ und lässt sich dort wiederherstellen.`, 'Löschen'))) return;
      store.mutate((d) => { pk.kundeLoeschen(d, id); });
      toast('Markierung gelöscht – unter Kunden › Gelöscht wiederherstellbar', 'ok', 5000);
      zeichnen();
    });
  });

  el.querySelector('#fKnopf').addEventListener('click', (e) => {
    const panel = el.querySelector('#fPanel');
    panel.hidden = !panel.hidden;
    el.querySelector('.karte-seite')?.classList.toggle('filter-offen', !panel.hidden);
    (e.currentTarget as HTMLElement).setAttribute('aria-expanded', String(!panel.hidden));
    setTimeout(() => map.invalidateSize(), 0);
  });
  filterPanelVerdrahten(el.querySelector('#fPanel'), filter, zeichnen);

  // Eigener Standort: blauer Punkt; beim Öffnen der Karte automatisch dorthin zoomen.
  // iPads ohne Mobilfunk haben kein GPS: Mit „hoher Genauigkeit“ läuft die Abfrage dort oft in die Zeitgrenze.
  // Deshalb zuerst schnell und grob (WLAN-Ortung) hinzoomen, danach genau nachbessern.
  let ichPunkt: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  let ichKreis: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  let lauf = 0;
  const zuMirZoomen = ({ still = false, zoom = 18 } = {}) => {
    if (!navigator.geolocation) { if (!still) toast('Standort nicht verfügbar.', 'error'); return; }
    const meinLauf = ++lauf;
    let gezoomt = false;
    let fehlerGezeigt = false;
    // Sichtbare Rückmeldung: Knopf zeigt „sucht“, bis eine Antwort kommt
    const knopf = el.querySelector<HTMLElement>('#ich');
    const fertig = () => { if (meinLauf !== lauf) return; clearTimeout(wachhund); knopf?.classList.remove('sucht'); knopf?.removeAttribute('aria-busy'); };
    if (!still) { knopf?.classList.add('sucht'); knopf?.setAttribute('aria-busy', 'true'); toast('Standort wird gesucht …', 'info', 2500); }
    // Safari auf dem iPad antwortet manchmal gar nicht (z. B. wenn die Standort-Frage nicht erscheint).
    // Dann nach 30 Sekunden selbst Bescheid geben statt still zu bleiben.
    const wachhund = window.setTimeout(() => {
      if (entfernt || meinLauf !== lauf) return;
      knopf?.classList.remove('sucht'); knopf?.removeAttribute('aria-busy');
      if (gezoomt || fehlerGezeigt || still) return;
      fehlerGezeigt = true;
      toast('Keine Antwort vom Standort. iPad: Einstellungen → Datenschutz & Sicherheit → Ortungsdienste an, dort „Safari-Websites“ auf „Beim Verwenden“. Außerdem Einstellungen → Safari → Standort auf „Fragen“ oder „Erlauben“.', 'error', 12000);
    }, 30000);
    const setzen = (p: GeolocationPosition) => {
      if (entfernt || meinLauf !== lauf) return; // Ansicht verlassen oder neuer Versuch gestartet
      fertig();
      const ll: [number, number] = [p.coords.latitude, p.coords.longitude];
      if (!isValidCoord(ll[0], ll[1])) return;
      const genau = Math.min(Math.max(p.coords.accuracy || 0, 0), 5000);
      if (ichPunkt) map.removeLayer(ichPunkt);
      if (ichKreis) map.removeLayer(ichKreis);
      ichKreis = genau > 15 ? L.circle(ll, { radius: genau, color: '#2a7de1', weight: 1, fillColor: '#2a7de1', fillOpacity: 0.12, interactive: false }).addTo(map) : null;
      ichPunkt = L.circleMarker(ll, { radius: 8, color: '#ffffff', weight: 3, fillColor: '#2a7de1', fillOpacity: 1, interactive: false }).addTo(map);
      if (still && nutzerHatBewegt) return; // nicht wegspringen, wenn schon selbst verschoben/gesucht
      // grobe Ortung: nur so weit hinein, dass der Ungenauigkeitskreis passt
      const z = genau > 200 ? Math.min(zoom, 15) : genau > 60 ? Math.min(zoom, 16) : zoom;
      map.invalidateSize();
      if (!gezoomt || map.getZoom() < z) map.setView(ll, Math.max(z, gezoomt ? map.getZoom() : 0));
      else map.panTo(ll);
      gezoomt = true;
    };
    const fehler = (e: GeolocationPositionError) => {
      if (entfernt || meinLauf !== lauf || gezoomt || fehlerGezeigt) return;
      fertig();
      if (still && e.code !== e.PERMISSION_DENIED) return;
      fehlerGezeigt = true;
      toast(e.code === e.PERMISSION_DENIED
        ? 'Standortzugriff ist aus. iPad/iPhone: Einstellungen → Datenschutz & Sicherheit → Ortungsdienste einschalten, dort bei „Safari-Websites“ „Beim Verwenden“ wählen.'
        : 'Standort konnte nicht ermittelt werden. Ist WLAN an? Ohne WLAN oder Mobilfunk findet ein iPad den Standort oft nicht.', 'error', 8000);
    };
    // Nacheinander statt gleichzeitig: Zwei parallele Anfragen bleiben auf älterem iPad-Safari teils ohne Antwort.
    const genauNachbessern = () => {
      if (entfernt || meinLauf !== lauf) return;
      navigator.geolocation.getCurrentPosition(setzen, fehler, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    };
    // 1. schnell und grob (auch aus dem Zwischenspeicher bis 5 Minuten), 2. danach genau nachbessern
    navigator.geolocation.getCurrentPosition(
      (p) => { setzen(p); genauNachbessern(); },
      (e) => { if (e.code === e.PERMISSION_DENIED) fehler(e); else genauNachbessern(); },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };
  let nutzerHatBewegt = false;
  let entfernt = false;
  // Nur echtes Verschieben/Zoomen zählt, nicht ein einzelnes Antippen
  map.on('dragstart', () => { nutzerHatBewegt = true; });
  map.getContainer().addEventListener('wheel', () => { nutzerHatBewegt = true; }, { once: true, passive: true });
  map.getContainer().addEventListener('touchstart', (e: TouchEvent) => { if (e.touches.length > 1) nutzerHatBewegt = true; }, { passive: true });
  el.querySelector('#ich').addEventListener('click', () => { nutzerHatBewegt = false; zuMirZoomen(); });

  // Neuen Standort setzen: Langes Tippen (contextmenu) oder Rechtsklick.
  const neuerPunkt = (e) => {
    const { lat, lng } = e.latlng;
    if (!isValidCoord(lat, lng)) return;
    const html = `<div class="popup" id="neuPopup"><strong>Neuer Standort</strong><br><small id="adrVorschlag">Adresse wird gesucht …</small><br>
      <button class="btn klein primary" data-neu="potenzial">Als Potenzial markieren</button>
      <button class="btn klein" data-neu="kunde">Kunde anlegen</button>
      <small class="popup-tuer">An der Haustür (legt eine Markierung an):</small>${haustuerKnoepfe('', 'btn klein ghost')}</div>`;
    const popup = L.popup().setLatLng(e.latlng).setContent(html).openOn(map);
    let adresse = { strasse: '', plz: '', ort: '' };
    adresseZuKoordinate(lat, lng)
      .then((a) => { if (a) adresse = a; const s = popup.getElement()?.querySelector('#adrVorschlag'); if (s) s.textContent = a ? [a.strasse, [a.plz, a.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Keine Adresse gefunden' : 'Keine Adresse gefunden'; })
      .catch((err) => { const s = popup.getElement()?.querySelector('#adrVorschlag'); if (s) s.textContent = err.message; });
    popup.getElement()?.addEventListener('click', (ev) => {
      const tuer = (ev.target as Element).closest<HTMLElement>('[data-haustuer]');
      if (tuer) {
        const ergebnis = tuer.dataset.haustuer as HaustuerErgebnis;
        const k = neuerKunde({ lat, lng, ...adresse, status: { pv: 'potenzial', wp: 'unbekannt', vorwerk: 'unbekannt' } });
        k.haustuer.push(neuerHaustuerEintrag(ergebnis));
        k.status = haustuerStatus(k.status, ergebnis);
        store.mutate((d) => { d.kunden.push(k); });
        routeFilter?.add(k.id); // während der Tagesroute neu Markiertes sichtbar lassen
        map.closePopup();
        zeichnen();
        toast(`Markiert: ${HAUSTUER[ergebnis].label}`, 'ok');
        return;
      }
      const b = (ev.target as Element).closest('[data-neu]');
      if (!b) return;
      const status = b.dataset.neu === 'potenzial' ? { pv: 'potenzial', wp: 'unbekannt', vorwerk: 'unbekannt' } : undefined;
      const k = neuerKunde({ lat, lng, ...adresse, ...(status ? { status } : {}) });
      if (b.dataset.neu === 'potenzial') {
        k.notizen.push(neueNotiz({ id: `${k.id}-n`, text: 'Auf der Karte als Potenzial markiert.', sparten: ['pv'] }));
      }
      store.mutate((d) => { d.kunden.push(k); });
      routeFilter?.add(k.id);
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

  // ---------- Tagesroute ----------
  // Termine eines Tages in zeitlicher Reihenfolge, Linie dazwischen, dazu lohnende Kunden entlang der Strecke.
  const routeEbene = L.layerGroup().addTo(map);
  let routeAn = false;
  const rPanel = el.querySelector<HTMLElement>('#rPanel');
  const rTag = el.querySelector<HTMLInputElement>('#rTag');
  const rRadius = el.querySelector<HTMLSelectElement>('#rRadius');
  const rAlle = el.querySelector<HTMLInputElement>('#rAlle');
  rTag.value = /^\d{4}-\d{2}-\d{2}$/.test(params.get('route') || '') ? params.get('route')! : ortsTag(new Date());
  const uhr = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const routeZeigen = () => {
    routeEbene.clearLayers();
    const d = store.getData();
    const stopps = tagesStopps(d, rTag.value);
    const mitOrt = stopps.filter((x) => x.lat !== null && x.lng !== null);
    const vorschlaege = unterwegs(d, stopps, Number(rRadius.value) || 1500);
    routeFilter = rAlle.checked ? null : new Set([...stopps.flatMap((x) => (x.kunde ? [x.kunde.id] : [])), ...vorschlaege.map((v) => v.kunde.id)]);
    zeichnen();
    if (mitOrt.length > 1) L.polyline(mitOrt.map((x) => [x.lat, x.lng]), { color: '#2a7de1', weight: 4, opacity: 0.85, dashArray: '8 6', interactive: false }).addTo(routeEbene);
    for (const x of mitOrt) {
      L.marker([x.lat, x.lng], { icon: L.divIcon({ className: 'route-nr', html: `<span>${x.nr}</span>`, iconSize: [28, 28], iconAnchor: [14, 40] }), interactive: false, zIndexOffset: 1000 }).addTo(routeEbene);
    }
    for (const v of vorschlaege) L.circleMarker([v.kunde.lat, v.kunde.lng], { radius: 17, color: '#e8892c', weight: 3, fillOpacity: 0, interactive: false }).addTo(routeEbene);
    const km = streckeKm(stopps);
    const google = googleRoute(stopps);
    const offen = vorschlaege.filter((v) => v.grund === 'Angebot offen');
    el.querySelector('#rInhalt').innerHTML = stopps.length ? `
      <p class="route-summe"><b>${stopps.length}</b> Termin${stopps.length === 1 ? '' : 'e'}${mitOrt.length > 1 ? ` · etwa ${km.toLocaleString('de-DE')} km Luftlinie` : ''}${stopps.length > mitOrt.length ? ` · ${stopps.length - mitOrt.length} ohne Standort` : ''}</p>
      <ol class="route-liste">${stopps.map((x) => {
        const link = x.kunde ? naviLink(x.kunde) : (x.termin.ort ? naviLink({ ort: x.termin.ort }) : '');
        return `<li><span class="route-nr-klein">${x.nr}</span><span class="zeile-haupt"><b>${esc(uhr(x.termin.beginn))}</b> ${esc(x.termin.titel || 'Termin')}<small>${x.kunde ? `<a href="#/kunde/${esc(x.kunde.id)}">${esc(kundenTitel(x.kunde))}</a> · ` : ''}${esc(x.termin.ort || (x.kunde ? adresseEinzeilig(x.kunde) : ''))}${x.lat === null ? ' · <span class="tag warn">ohne Standort</span>' : ''}</small></span>${link ? `<a class="btn klein ghost" href="${esc(link)}" target="_blank" rel="noopener noreferrer" aria-label="Hinfahren">🚗</a>` : ''}</li>`;
      }).join('')}</ol>
      ${rAlle.checked ? '' : '<p class="hinweis route-nur">Auf der Karte stehen nur die Kunden dieser Route und die Vorschläge. Weitere mit „Andere Kunden zeigen“.</p>'}
      ${google ? `<p><a class="btn klein" href="${esc(google)}" target="_blank" rel="noopener noreferrer">Ganze Route in Google Maps</a> <small class="hinweis">übergibt nur die Koordinaten</small></p>` : ''}
      <h3>Unterwegs vorbeischauen <small>(${vorschlaege.length})</small></h3>
      ${vorschlaege.length ? `${offen.length ? `<p class="hinweis">${offen.length} offene${offen.length === 1 ? 's Angebot' : ' Angebote'} an der Strecke über ${esc(euro(angebotsSumme(offen.flatMap((v) => v.kunde.angebote.filter((a) => a.status === 'offen')))))}.</p>` : ''}
        <ul class="route-liste">${vorschlaege.map((v) => `<li><span class="zeile-haupt"><a href="#/kunde/${esc(v.kunde.id)}"><b>${esc(kundenTitel(v.kunde))}</b></a><small>${esc(v.grund)} · ${v.abstandM >= 1000 ? `${(v.abstandM / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} km` : `${v.abstandM} m`} von der Strecke</small></span><button type="button" class="btn klein ghost" data-zeige="${esc(v.kunde.id)}" aria-label="Auf der Karte zeigen">📍</button></li>`).join('')}</ul>`
        : '<p class="hinweis">Keine offenen Angebote, fälligen Wiedervorlagen oder Interessenten in der Nähe der Strecke. Größeren Umkreis wählen?</p>'}`
      : `<p class="hinweis">Am ${esc(rTag.value.split('-').reverse().join('.'))} sind keine Termine eingetragen. Wiedervorlagen zählen nicht, nur Termine vor Ort.</p>`;
    map.invalidateSize();
    if (mitOrt.length) { nutzerHatBewegt = true; map.fitBounds(L.latLngBounds(mitOrt.map((x) => [x.lat, x.lng])).pad(0.3), { maxZoom: 15, animate: false }); }
  };
  const routeSchalten = (an: boolean) => {
    routeAn = an;
    rPanel.hidden = !an;
    el.querySelector('#rKnopf').classList.toggle('primary', an);
    el.querySelector('#rKnopf').setAttribute('aria-expanded', String(an));
    el.querySelector('.karte-seite')?.classList.toggle('route-offen', an);
    map.invalidateSize();
    if (an) routeZeigen(); else { routeEbene.clearLayers(); routeFilter = null; zeichnen(); }
  };
  el.querySelector('#rKnopf').addEventListener('click', () => routeSchalten(!routeAn));
  rTag.addEventListener('change', () => { if (rTag.value) routeZeigen(); });
  rRadius.addEventListener('change', routeZeigen);
  rAlle.addEventListener('change', routeZeigen);
  el.querySelector('#rInhalt').addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-zeige]');
    const k = b ? store.findKunde(b.dataset.zeige || '') : null;
    if (!k || k.lat === null) return;
    map.setView([k.lat, k.lng], 18);
    pins.eachLayer((m) => { const ll = m.getLatLng(); if (ll.lat === k.lat && ll.lng === k.lng) m.openPopup(); });
  });
  if (params.has('route')) routeSchalten(true);

  // Kartenposition merken (ohne Speichervorgang auszulösen)
  map.on('moveend', () => {
    if (entfernt || store.isDemo() || !store.isUnlocked()) return; // beim Sperren läuft ggf. noch eine Kamerafahrt aus
    const c = map.getCenter();
    Object.assign(store.getData().einstellungen.karte, { lat: c.lat, lng: c.lng, zoom: map.getZoom() });
  });

  const fokus = params.get('kunde');
  // Beim Öffnen: zum aktuellen Standort, außer ein Kunde soll gezeigt werden (oder Demo).
  if (!fokus && !store.isDemo() && !routeAn) zuMirZoomen({ still: true, zoom: 17 });
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
