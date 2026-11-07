// Sperling – Adresssuche über OpenStreetMap Nominatim.
// Nutzungsregeln Nominatim: max. 1 Anfrage/Sekunde, keine Massenabfragen.
// Es werden NUR Koordinaten bzw. die eingegebene Adresse gesendet, nie Kundennamen.

const BASE = 'https://nominatim.openstreetmap.org';
let letzteAnfrage = 0;

async function drossel() {
  const warte = letzteAnfrage + 1100 - Date.now();
  if (warte > 0) await new Promise((r) => setTimeout(r, warte));
  letzteAnfrage = Date.now();
}

async function holen(url) {
  await drossel();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'Accept-Language': 'de' } });
    if (!res.ok) throw new Error(`Adressdienst antwortet mit ${res.status}`);
    return await res.json();
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Adressdienst antwortet nicht.');
    throw new Error('Adresse konnte nicht ermittelt werden (offline?).');
  } finally {
    clearTimeout(t);
  }
}

/** Koordinate -> {strasse, plz, ort} oder null. */
export async function adresseZuKoordinate(lat, lng) {
  const j = await holen(`${BASE}/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`);
  const a = j?.address;
  if (!a) return null;
  const strasse = [a.road || a.pedestrian || a.footway || '', a.house_number || ''].filter(Boolean).join(' ');
  return {
    strasse,
    plz: a.postcode || '',
    ort: a.city || a.town || a.village || a.municipality || a.suburb || '',
  };
}

/** Adresse -> {lat, lng} oder null. */
export async function koordinateZuAdresse(text) {
  const q = String(text || '').trim();
  if (!q) return null;
  const j = await holen(`${BASE}/search?format=jsonv2&limit=1&countrycodes=de,at,ch&q=${encodeURIComponent(q)}`);
  const r = Array.isArray(j) ? j[0] : null;
  if (!r) return null;
  const lat = Number(r.lat);
  const lng = Number(r.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/** Freitext-Adresssuche: bis zu `limit` Treffer [{lat, lng, label}] (für das Suchfeld der Karte). */
export async function adressenSuchen(text, limit = 5) {
  const q = String(text || '').trim().slice(0, 200);
  if (q.length < 3) return [];
  const j = await holen(`${BASE}/search?format=jsonv2&addressdetails=1&limit=${Math.min(Math.max(limit, 1), 10)}&countrycodes=de,at,ch&q=${encodeURIComponent(q)}`);
  if (!Array.isArray(j)) return [];
  return j.map((r) => {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    const a = r.address || {};
    const strasse = [a.road || a.pedestrian || '', a.house_number || ''].filter(Boolean).join(' ');
    const ort = [a.postcode || '', a.city || a.town || a.village || a.municipality || ''].filter(Boolean).join(' ');
    const label = [strasse, ort].filter(Boolean).join(', ') || String(r.display_name || '').split(',').slice(0, 3).join(',');
    return { lat, lng, label, genau: Boolean(a.house_number) };
  }).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}
