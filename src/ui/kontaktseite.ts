// Sperling – „Meine Kontaktseite“: Link zur öffentlichen Werbe- und Kontaktseite (public/kontakt/),
// teilen und als QR-Code zeigen oder als Bild speichern. Der QR-Code entsteht offline auf dem Gerät
// (qrcode-generator, lokal in public/vendor/qrcode, R-KEINE-ABHÄNGIGKEITEN). Keine Kundendaten beteiligt.
import { esc } from '../core/util.ts';
import { dialog, maskottchen, teilenOderSpeichern, toast } from './dom.ts';

interface QrCode { addData(d: string): void; make(): void; getModuleCount(): number; isDark(r: number, c: number): boolean }
interface QrFabrik { (typ: number, stufe: 'L' | 'M' | 'Q' | 'H'): QrCode; stringToBytes: unknown; stringToBytesFuncs: Record<string, unknown> }

const qrGlobal = () => (globalThis as unknown as { qrcode?: QrFabrik }).qrcode;
let laden: Promise<QrFabrik> | null = null;
export function qrLaden(): Promise<QrFabrik> {
  const vorhanden = qrGlobal();
  if (vorhanden) return Promise.resolve(vorhanden);
  laden ||= new Promise((ok, fehler) => {
    const s = document.createElement('script');
    s.src = 'vendor/qrcode/qrcode.js';
    s.onload = () => { const q = qrGlobal(); if (q) { q.stringToBytes = q.stringToBytesFuncs['UTF-8']; ok(q); } else fehler(new Error('QR-Bibliothek fehlt.')); };
    s.onerror = () => { laden = null; fehler(new Error('QR-Bibliothek konnte nicht geladen werden.')); };
    document.head.appendChild(s);
  });
  return laden;
}

/** Adresse der Kontaktseite (liegt neben der App unter kontakt/). */
export function kontaktUrl(basis = location.href): string {
  return new URL('kontakt/', basis.split('#')[0]).href;
}

/** QR-Code als Canvas: schwarze Module auf Weiß mit Ruhezone; optional Beschriftung darunter. */
export async function qrCanvas(text: string, groesse = 1024, beschriftung = ''): Promise<HTMLCanvasElement> {
  const qrcode = await qrLaden();
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  const rand = 4; // Ruhezone in Modulen (Norm)
  const zelle = Math.max(1, Math.floor(groesse / (n + rand * 2)));
  const seite = zelle * (n + rand * 2);
  const unten = beschriftung ? Math.round(seite * 0.12) : 0;
  const c = document.createElement('canvas');
  c.width = seite;
  c.height = seite + unten;
  const g = c.getContext('2d');
  if (!g) throw new Error('Zeichnen nicht möglich.');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#0b4a2a'; // Dunkelgrün aus dem Logo – kontraststark genug für alle Scanner
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + rand) * zelle, (r + rand) * zelle, zelle, zelle);
  if (beschriftung) {
    g.fillStyle = '#14261b';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `600 ${Math.round(unten * 0.38)}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    g.fillText(beschriftung, seite / 2, seite + unten * 0.35, seite - zelle * rand * 2);
  }
  return c;
}

export function abschnitt(): string {
  const url = kontaktUrl();
  return `
    <section class="karte-box" id="kontaktseite">
      <h2>${maskottchen('sperling', 'titel-bild')} Meine Kontaktseite</h2>
      <p class="hinweis">Eine öffentliche Seite, die allgemein für Photovoltaik und Wärmepumpe wirbt – ohne Anbieter, ohne Kundendaten. Kunden können dich von dort anrufen, per WhatsApp oder E-Mail schreiben, deinen Kontakt speichern oder um Rückruf bitten.</p>
      <p class="hinweis"><b>Konzept:</b> Kontaktdaten und Impressum sind noch Platzhalter.</p>
      <p class="kontaktseite-url"><code>${esc(url)}</code></p>
      <div class="knopfreihe">
        <a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Seite öffnen</a>
        <button class="btn ghost" id="ksQr">QR-Code zeigen</button>
        <button class="btn ghost" id="ksTeilen">Link teilen</button>
      </div>
    </section>`;
}

async function linkTeilen(url: string) {
  try {
    if (navigator.share) { await navigator.share({ title: 'Photovoltaik & Wärmepumpe – persönliche Beratung', url }); return; }
    await navigator.clipboard.writeText(url);
    toast('Link kopiert', 'ok');
  } catch (err) {
    if ((err as Error | null)?.name !== 'AbortError') toast('Teilen nicht möglich – Link bitte abschreiben.', 'error');
  }
}

async function qrZeigen(url: string) {
  let canvas: HTMLCanvasElement;
  try { canvas = await qrCanvas(url, 900); } catch (e) { toast((e as Error).message, 'error'); return; }
  const wahl = await dialog<string>({
    titel: 'Kontaktseite als QR-Code',
    html: `<div class="qr-gross"></div><p class="hinweis">Mit der Handykamera scannen. Für Visitenkarte oder Flyer als Bild speichern.</p>`,
    knoepfe: [{ label: 'Als Bild speichern', wert: 'bild' }, { label: 'Fertig', wert: 'ok', primaer: true }],
    onOpen: (d) => { canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'QR-Code zur Kontaktseite'); d.querySelector('.qr-gross')?.appendChild(canvas); },
  });
  if (wahl !== 'bild') return;
  try {
    const bild = await qrCanvas(url, 1200, 'Photovoltaik & Wärmepumpe – Beratung');
    const blob = await new Promise<Blob | null>((ok) => bild.toBlob(ok, 'image/png'));
    if (!blob) throw new Error('Bild konnte nicht erzeugt werden.');
    const r = await teilenOderSpeichern('kontaktseite-qr.png', blob, 'image/png');
    if (r === 'heruntergeladen') toast('QR-Code gespeichert', 'ok');
  } catch (e) { toast((e as Error).message, 'error'); }
}

export function binden(el: HTMLElement) {
  const url = kontaktUrl();
  el.querySelector('#ksQr')?.addEventListener('click', () => { void qrZeigen(url); });
  el.querySelector('#ksTeilen')?.addEventListener('click', () => { void linkTeilen(url); });
}
