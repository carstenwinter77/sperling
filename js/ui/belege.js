// Sperling – Belege beim Verleih: Fotos vom Zustand und Unterschrift auf dem Tablet.
// Fotos werden verkleinert (max. 1280 px, JPEG) und landen verschlüsselt im Datenbestand (R-KRYPTO).
import { esc } from '../core/util.js';
import { MAX_FOTOS, bild } from '../core/model.js';
import { toast } from './dom.js';

const MAX_KANTE = 1280;
const QUALITAET = 0.6;

/** Bilddatei -> verkleinerte JPEG-data-URL (oder '' bei Fehler). */
export async function fotoVerkleinern(datei) {
  try {
    const bmp = await createImageBitmap(datei, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(datei));
    const f = Math.min(1, MAX_KANTE / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * f);
    c.height = Math.round(bmp.height * f);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    return bild(c.toDataURL('image/jpeg', QUALITAET));
  } catch { return ''; }
}

export function fotosHtml(titel = 'Fotos vom Zustand') {
  return `<fieldset class="beleg-fotos"><legend>${esc(titel)} <small>(max. ${MAX_FOTOS})</small></legend>
    <div class="foto-reihe"></div>
    <label class="btn ghost klein foto-knopf">📷 Foto aufnehmen / wählen<input type="file" accept="image/*" capture="environment" multiple hidden></label>
  </fieldset>`;
}

/** Verdrahtet die Fotoauswahl im Dialog; liefert eine Funktion, die die aktuelle Liste zurückgibt. */
export function fotosVerdrahten(root, start = []) {
  const box = root.querySelector('.beleg-fotos');
  let liste = [...start];
  const zeichnen = () => {
    box.querySelector('.foto-reihe').innerHTML = liste.map((src, i) => `<span class="foto"><img src="${src}" alt="Foto ${i + 1}"><button type="button" data-weg="${i}" aria-label="Foto entfernen">✕</button></span>`).join('');
    box.querySelector('.foto-knopf').hidden = liste.length >= MAX_FOTOS;
  };
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-weg]');
    if (b) { e.preventDefault(); liste.splice(Number(b.dataset.weg), 1); zeichnen(); }
  });
  box.querySelector('input[type=file]').addEventListener('change', async (e) => {
    const dateien = [...e.target.files].slice(0, MAX_FOTOS - liste.length);
    e.target.value = '';
    for (const d of dateien) {
      const url = await fotoVerkleinern(d);
      if (url) liste.push(url); else toast('Ein Foto konnte nicht gelesen werden.', 'error');
    }
    zeichnen();
  });
  zeichnen();
  return () => liste;
}

export function unterschriftHtml(name = '') {
  return `<fieldset class="beleg-unterschrift"><legend>Unterschrift Kunde</legend>
    <canvas class="unterschrift-feld" width="600" height="200" aria-label="Hier unterschreiben"></canvas>
    <div class="knopfreihe"><button type="button" class="btn ghost klein" data-leeren>Neu unterschreiben</button></div>
    <label>Name in Druckbuchstaben<input name="unterschriftName" value="${esc(name)}" maxlength="200"></label>
  </fieldset>`;
}

/** Unterschriftsfeld (Finger/Stift/Maus). Liefert Funktion -> {bild, name} (bild leer, wenn nicht unterschrieben). */
export function unterschriftVerdrahten(root) {
  const c = root.querySelector('.unterschrift-feld');
  const ctx = c.getContext('2d');
  const leeren = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.strokeStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(20, c.height - 40); ctx.lineTo(c.width - 20, c.height - 40); ctx.stroke(); benutzt = false; };
  let benutzt = false;
  let zeichnet = false;
  const punkt = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)]; };
  c.style.touchAction = 'none';
  c.addEventListener('pointerdown', (e) => { zeichnet = true; benutzt = true; c.setPointerCapture(e.pointerId); const [x, y] = punkt(e); ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x, y); });
  c.addEventListener('pointermove', (e) => { if (!zeichnet) return; const [x, y] = punkt(e); ctx.lineTo(x, y); ctx.stroke(); });
  const ende = () => { zeichnet = false; };
  c.addEventListener('pointerup', ende);
  c.addEventListener('pointercancel', ende);
  root.querySelector('[data-leeren]').addEventListener('click', (e) => { e.preventDefault(); leeren(); });
  leeren();
  return () => ({ bild: benutzt ? bild(c.toDataURL('image/png')) : '', name: root.querySelector('[name=unterschriftName]').value.trim() });
}
