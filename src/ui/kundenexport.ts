// Sperling – Kundenliste exportieren (PDF, Excel, CSV). Exportiert wird genau die angezeigte Liste
// (Suche, Filter, Sortierung). Alles entsteht auf dem Gerät; die Datei geht nur weiter, wenn der Nutzer sie teilt.
import { esc } from '../core/util.ts';
import { tabelle, pdfZeilen, csv, xlsx, dateiname, MIME, type ExportEintrag } from '../core/kundenexport.ts';
import { dialog, teilenOderSpeichern, toast } from './dom.ts';
import { jsPdfLaden, logo } from './leihschein.ts';

export interface ExportAnsicht {
  eintraege: ExportEintrag[];
  gesamt: number;
  /** z. B. „Sortiert: Name A–Z · Filter aktiv · Suche „Peine““ */
  beschreibung: string;
}

type JsPdf = Awaited<ReturnType<typeof jsPdfLaden>>;

/** PDF quer A4 als Tabelle, Kopfzeile auf jeder Seite, Seitenzahlen. Synchron, sobald jsPDF geladen ist. */
export function kundenPdf(JsPDF: JsPdf, ansicht: ExportAnsicht, logoBild = '', jetzt = new Date()): Blob {
  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });
  const B = 297; const H = 210; const R = 14; const unten = H - 14;
  const kopf = ['Name', 'Adresse', 'Telefon / E-Mail', 'Bereiche', 'Letzter Kontakt'];
  const breiten = [64, 80, 62, 44, 19];
  const xs = breiten.reduce<number[]>((a, w, i) => [...a, i ? a[i - 1]! + breiten[i - 1]! : R], []);
  const zh = 4.2;
  let y = 18;

  if (logoBild) doc.addImage(logoBild, 'PNG', B - R - 16, 9, 16, 16);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Kundenliste', R, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
  const anzahl = ansicht.eintraege.length === ansicht.gesamt ? `${ansicht.gesamt} Kunden` : `${ansicht.eintraege.length} von ${ansicht.gesamt} Kunden`;
  doc.text(doc.splitTextToSize(`${anzahl} · ${ansicht.beschreibung} · erstellt am ${jetzt.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}`, B - 2 * R - 20), R, y);
  doc.setTextColor(0); y += 8;

  const kopfZeichnen = () => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    kopf.forEach((t, i) => doc.text(t, xs[i]!, y));
    doc.setDrawColor(150); doc.line(R, y + 1.5, B - R, y + 1.5);
    y += 5.5; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  };
  kopfZeichnen();
  const zeilen = pdfZeilen(ansicht.eintraege);
  zeilen.forEach((z, n) => {
    const teile = z.map((t, i) => (t ? doc.splitTextToSize(t, breiten[i]! - 2.5) as string[] : []));
    const hoehe = Math.max(1, ...teile.map((t) => t.length)) * zh;
    if (y + hoehe > unten) { doc.addPage(); y = 16; kopfZeichnen(); }
    if (n % 2) { doc.setFillColor(244, 246, 242); doc.rect(R, y - 3.2, B - 2 * R, hoehe + 0.6, 'F'); }
    teile.forEach((t, i) => { if (t.length) { if (i === 0) doc.setFont('helvetica', 'bold'); doc.text(t, xs[i]!, y); if (i === 0) doc.setFont('helvetica', 'normal'); } });
    y += hoehe + 1.2;
  });
  if (!zeilen.length) { doc.setTextColor(110); doc.text('Keine Kunden in dieser Ansicht.', R, y); doc.setTextColor(0); }

  const seiten = doc.getNumberOfPages();
  for (let i = 1; i <= seiten; i++) {
    doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(120);
    doc.text('Vertraulich – enthält personenbezogene Daten. Nach Gebrauch löschen.', R, H - 7);
    doc.text(`Seite ${i} von ${seiten}`, B - R, H - 7, { align: 'right' });
  }
  doc.setTextColor(0);
  return doc.output('blob');
}

/** Dialog: Format wählen, Datei teilen/speichern. Teilen läuft direkt im Tipp (Safari verlangt das). */
export async function exportDialog(ansicht: ExportAnsicht): Promise<void> {
  const n = ansicht.eintraege.length;
  if (!n) { toast('Keine Kunden in dieser Ansicht. Filter oder Suche lockern.', 'error'); return; }
  let JsPDF: JsPdf | null = null; let lg = '';
  const pdfBereit = Promise.all([jsPdfLaden(), logo()]).then(([k, l]) => { JsPDF = k; lg = l; }).catch(() => {});
  await dialog({
    titel: 'Kundenliste exportieren',
    html: `<p><b>${n === ansicht.gesamt ? `Alle ${n} Kunden` : `${n} von ${ansicht.gesamt} Kunden`}</b>, so wie die Liste gerade angezeigt wird.</p>
      <p class="hinweis">${esc(ansicht.beschreibung)}</p>
      <div class="export-wahl">
        <button type="button" class="btn primary" data-format="pdf">📄 PDF zum Ausdrucken</button>
        <button type="button" class="btn" data-format="xlsx">📊 Excel-Tabelle (.xlsx)</button>
        <button type="button" class="btn ghost" data-format="csv">CSV (für andere Programme)</button>
      </div>
      <p class="hinweis">Enthalten: Name, Firma, Adresse, Telefon, E-Mail, Status je Bereich, letzter Kontakt. Notizen, Gespräche und Fotos bleiben in Sperling.</p>
      <p class="hinweis export-warnung">⚠️ Die Datei ist <b>nicht verschlüsselt</b>. Teile sie nur mit Berechtigten und lösche sie, wenn du sie nicht mehr brauchst.</p>`,
    knoepfe: [],
    onOpen: (dlg) => {
      const abbrechen = dlg.querySelector<HTMLButtonElement>('.dlg-actions button');
      if (abbrechen) abbrechen.textContent = 'Schließen';
      dlg.querySelector('.export-wahl')?.addEventListener('click', async (ev) => {
        const b = (ev.target as Element).closest<HTMLButtonElement>('[data-format]');
        if (!b) return;
        const format = b.dataset.format as 'pdf' | 'xlsx' | 'csv';
        try {
          let inhalt: Blob | Uint8Array | string;
          if (format === 'pdf') {
            if (!JsPDF) { b.disabled = true; await pdfBereit; b.disabled = false; }
            if (!JsPDF) throw new Error('PDF-Bibliothek konnte nicht geladen werden.');
            inhalt = kundenPdf(JsPDF, ansicht, lg);
          } else if (format === 'xlsx') inhalt = xlsx(tabelle(ansicht.eintraege));
          else inhalt = csv(tabelle(ansicht.eintraege));
          const r = await teilenOderSpeichern(dateiname(format), inhalt as BlobPart, MIME[format]);
          if (r === 'heruntergeladen') toast(`${dateiname(format)} gespeichert`);
          if (r !== 'abgebrochen') dlg.close();
        } catch (err) { toast((err as Error).message || 'Export fehlgeschlagen.', 'error'); }
      });
    },
  });
}
