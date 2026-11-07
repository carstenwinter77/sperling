// Sperling – Leihschein und Rückgabeschein als PDF (jsPDF, lokal in vendor/jspdf, R-KEINE-ABHÄNGIGKEITEN).
// Das PDF entsteht nur auf dem Gerät; weitergegeben wird es nur, wenn der Nutzer es teilt.
import { formatDate, formatDateTime } from '../core/util.ts';
import { kundenName, kundenTitel, adresseEinzeilig } from '../core/model.ts';
import * as store from '../storage/store.ts';
import { teilenOderSpeichern, toast } from './dom.ts';

// jsPDF kommt als klassisches Skript (public/vendor/jspdf) und hängt sich an globalThis.jspdf.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsPdfKlasse = new (opts: object) => any;
const jspdfGlobal = () => (globalThis as unknown as { jspdf?: { jsPDF?: JsPdfKlasse } }).jspdf;
let laden: Promise<JsPdfKlasse> | null = null;
export function jsPdfLaden() {
  const vorhanden = jspdfGlobal()?.jsPDF;
  if (vorhanden) return Promise.resolve(vorhanden);
  laden ||= new Promise((ok, fehler) => {
    const s = document.createElement('script');
    s.src = 'vendor/jspdf/jspdf.umd.min.js';
    s.onload = () => (jspdfGlobal()?.jsPDF ? ok(jspdfGlobal()!.jsPDF!) : fehler(new Error('PDF-Bibliothek fehlt.')));
    s.onerror = () => { laden = null; fehler(new Error('PDF-Bibliothek konnte nicht geladen werden.')); };
    document.head.appendChild(s);
  });
  return laden;
}

export async function logo(): Promise<string> {
  try {
    const r = await fetch('assets/marke/zeichen.png');
    const b = await r.blob();
    return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result || '')); fr.onerror = () => ok(''); fr.readAsDataURL(b); });
  } catch { return ''; }
}

const bildMasse = (src: string) => new Promise<[number, number]>((ok) => { const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.onerror = () => ok([4, 3]); i.src = src; });

/**
 * Erzeugt das PDF. art: 'ausgabe' (Leihschein) oder 'rueckgabe' (Rückgabeschein).
 * Gibt {blob, dateiname} zurück.
 */
export async function erzeugen(leihId, art = 'ausgabe') {
  const d = store.getData();
  const l = d.leihvorgaenge.find((x) => x.id === leihId);
  if (!l) throw new Error('Verleih nicht gefunden.');
  const g = d.geraete.find((x) => x.id === l.geraetId);
  const k = d.kunden.find((x) => x.id === l.kundeId);
  const JsPDF = await jsPdfLaden();
  const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
  const B = 210; const R = 18; let y = 20;
  const zeile = (text, groesse = 11, stil = 'normal', abstand = 6) => {
    doc.setFont('helvetica', stil); doc.setFontSize(groesse);
    const teile = doc.splitTextToSize(String(text), B - 2 * R);
    if (y + teile.length * abstand > 280) { doc.addPage(); y = 20; }
    doc.text(teile, R, y); y += teile.length * abstand;
  };
  const feld = (label, wert) => { if (!wert) return; doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(label, R, y); doc.setFont('helvetica', 'normal'); const t = doc.splitTextToSize(String(wert), B - 2 * R - 45); doc.text(t, R + 45, y); y += Math.max(1, t.length) * 5.5; };

  const lg = await logo();
  if (lg) doc.addImage(lg, 'PNG', B - R - 22, 12, 22, 22);
  const rueck = art === 'rueckgabe';
  zeile(rueck ? 'Rückgabeschein Vorführgerät' : 'Leihschein Vorführgerät', 18, 'bold', 9);
  const abs = d.einstellungen.absender;
  if (abs) zeile(abs, 10, 'normal', 5);
  zeile(`Erstellt am ${formatDateTime(new Date().toISOString())} Uhr`, 9, 'normal', 8);

  y += 2; zeile('Kunde', 12, 'bold', 7);
  feld('Name', k ? (kundenName(k) || kundenTitel(k)) : '(Kunde gelöscht)');
  feld('Anschrift', k ? adresseEinzeilig(k) : '');
  feld('Telefon', k?.telefon || '');

  y += 3; zeile('Gerät', 12, 'bold', 7);
  feld('Bezeichnung', g?.name || 'Gerät');
  feld('Seriennummer', g?.seriennummer || '');
  feld('Zubehör', g?.zubehoer || '');

  y += 3; zeile('Leihe', 12, 'bold', 7);
  feld('Ausgegeben am', formatDate(l.ausgabe));
  feld('Rückgabe bis', l.rueckgabeGeplant ? formatDate(l.rueckgabeGeplant) : 'nach Absprache');
  if (rueck) feld('Zurückgegeben am', l.rueckgabe ? formatDate(l.rueckgabe) : '–');
  feld('Zustand / Absprache', l.notiz);

  const fotos = rueck ? l.fotosRueckgabe : l.fotosAusgabe;
  if (fotos.length) {
    y += 3; zeile(rueck ? 'Fotos bei Rückgabe' : 'Fotos bei Übergabe', 12, 'bold', 7);
    const breite = (B - 2 * R - 3 * 4) / 4;
    let x = R; let zeilenHoehe = 0;
    for (const f of fotos) {
      const [w, h] = await bildMasse(f);
      const hh = Math.min(breite * (h / w), 45);
      const ww = hh * (w / h);
      if (y + hh > 270) { doc.addPage(); y = 20; x = R; }
      doc.addImage(f, 'JPEG', x, y, ww, hh);
      x += breite + 4; zeilenHoehe = Math.max(zeilenHoehe, hh);
    }
    y += zeilenHoehe + 6;
  }

  if (!rueck) {
    zeile('Der Kunde erhält das oben genannte Vorführgerät leihweise zum Testen. Es bleibt Eigentum des Verleihers und wird bis zum genannten Datum in gutem Zustand zurückgegeben.', 9, 'normal', 4.5);
  } else {
    zeile('Das Vorführgerät wurde wie oben angegeben zurückgegeben.', 9, 'normal', 4.5);
  }
  y += 6;
  if (y > 240) { doc.addPage(); y = 20; }
  const sig = rueck ? l.unterschriftRueckgabe : l.unterschriftAusgabe;
  const name = rueck ? l.nameRueckgabe : l.nameAusgabe;
  if (sig) doc.addImage(sig, 'PNG', R, y, 70, 23);
  y += 25;
  doc.setDrawColor(120); doc.line(R, y, R + 80, y);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Unterschrift Kunde${name ? ` – ${name}` : ''}, ${formatDate(rueck ? (l.rueckgabe || l.ausgabe) : l.ausgabe)}`, R, y + 5);

  const blob = doc.output('blob');
  const kurz = (g?.name || 'geraet').replace(/[^\wäöüÄÖÜß-]+/g, '-').slice(0, 30);
  return { blob, dateiname: `${rueck ? 'rueckgabeschein' : 'leihschein'}-${kurz}-${formatDate(rueck ? (l.rueckgabe || l.ausgabe) : l.ausgabe).replace(/\./g, '-')}.pdf` };
}

/** PDF erzeugen und teilen/speichern. Zwei Schritte, weil Safari das Teilen-Menü nur direkt nach einem Tipp öffnet. */
export async function anbieten(leihId, art, dialogFn) {
  let pdf;
  try { pdf = await erzeugen(leihId, art); } catch (err) { toast((err as Error).message, 'error'); return; }
  await pdfAnbieten(pdf, art === 'rueckgabe' ? 'Rückgabeschein (PDF)' : 'Leihschein (PDF)', 'Der Beleg', dialogFn);
}

/** Fertiges PDF ansehen oder teilen/speichern. */
export async function pdfAnbieten(pdf: { blob: Blob; dateiname: string }, titel: string, was: string, dialogFn) {
  await dialogFn({
    titel,
    html: `<p>${was} <b>${pdf.dateiname}</b> ist fertig.</p><p class="hinweis">Teilen öffnet z. B. Mail, Nachrichten oder „In Dateien sichern“.</p>`,
    knoepfe: [{ label: 'Ansehen', wert: null }, { label: 'Teilen / Speichern', primaer: true, wert: null }],
    onOpen: (dlg) => {
      const [, ansehen, teilen] = dlg.querySelectorAll('.dlg-actions button');
      ansehen?.addEventListener('click', (e) => { e.preventDefault(); const u = URL.createObjectURL(pdf.blob); window.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 60000); });
      teilen?.addEventListener('click', async (e) => {
        e.preventDefault();
        const r = await teilenOderSpeichern(pdf.dateiname, pdf.blob, 'application/pdf');
        if (r !== 'abgebrochen') dlg.close();
      });
    },
  });
}
