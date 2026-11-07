// Sperling – Auswertungen: je Bereich oder alles zusammen, als Tag, Woche, Monat, Kalenderjahr oder letzte 365 Tage.
// Die Zahlen entstehen nur auf dem Gerät; der PDF-Bericht wird nur weitergegeben, wenn der Nutzer ihn teilt.
import { esc } from '../../core/util.ts';
import { AUSGANG } from '../../core/model.ts';
import { tagVon } from '../../core/belegung.ts';
import {
  bericht, verschieben, veraenderung, prozent, BEREICHE, PERIODEN, PERIODEN_REIHE,
  type Bereich, type Periode, type Bericht, type Kennzahlen, type Ausgang,
} from '../../core/auswertung.ts';
import * as store from '../../storage/store.ts';
import { maskottchen, toast, dialog } from '../dom.ts';
import { jsPdfLaden, logo, pdfAnbieten } from '../leihschein.ts';

interface Zahl { titel: string; wert: (k: Kennzahlen) => number | null; quote?: boolean; sub?: (k: Kennzahlen) => string; nurVorwerk?: boolean; ohneVorwerk?: boolean }

const ZAHLEN: Zahl[] = [
  { titel: 'Gespräche', wert: (k) => k.gespraeche, sub: (k) => `${k.erreicht} erreicht${k.telefon || k.hausbesuch ? ` · ${k.telefon} Telefon, ${k.hausbesuch} Hausbesuch` : ''}` },
  { titel: 'Abschlüsse', wert: (k) => k.abschluesse },
  { titel: 'Abschlussquote', wert: (k) => k.abschlussquote, quote: true, sub: () => 'Abschlüsse je erreichtes Gespräch' },
  { titel: 'Neue Kunden', wert: (k) => k.neueKunden },
  { titel: 'Termine', wert: (k) => k.termine, sub: (k) => `${k.termineErledigt} erledigt · ${k.termine - k.termineErledigt} offen` },
  { titel: 'Wiedervorlagen', wert: (k) => k.wiedervorlagen, sub: (k) => `${k.wiedervorlagenErledigt} erledigt · ${k.wiedervorlagen - k.wiedervorlagenErledigt} offen` },
  { titel: 'Notizen', wert: (k) => k.notizen },
  { titel: 'Geräte verliehen', wert: (k) => k.verleihe, nurVorwerk: true },
  { titel: 'Rückgaben', wert: (k) => k.rueckgaben, nurVorwerk: true },
  { titel: 'Käufe nach Test', wert: (k) => k.kaeufe, nurVorwerk: true },
  { titel: 'Kaufquote', wert: (k) => k.kaufquote, quote: true, nurVorwerk: true, sub: () => 'Käufe je verliehenes Gerät' },
];

const zahlenFuer = (bereich: Bereich) => ZAHLEN.filter((z) => !z.nurVorwerk || bereich === 'alle' || bereich === 'vorwerk');
const anzeigen = (z: Zahl, k: Kennzahlen) => { const w = z.wert(k); return z.quote ? prozent(w) : String(w ?? 0); };

export function render(el: HTMLElement, params: URLSearchParams) {
  const p = (n: string) => params.get(n) || '';
  const bereich: Bereich = p('bereich') in BEREICHE ? p('bereich') as Bereich : 'alle';
  const periode: Periode = p('periode') in PERIODEN ? p('periode') as Periode : 'monat';
  const anker = /^\d{4}-\d{2}-\d{2}$/.test(p('datum')) ? p('datum') : tagVon(new Date());
  const neu = (b: Bereich, pe: Periode, dt: string) => {
    const q = new URLSearchParams({ bereich: b, periode: pe, datum: dt });
    history.replaceState(null, '', `#/auswertung?${q}`);
    render(el, q);
  };
  const ber = bericht(store.getData(), bereich, periode, anker);
  const { jetzt, vorher } = ber;

  const max = Math.max(1, ...jetzt.verlauf.map((v) => v.wert));
  const ergebnisse = (Object.keys(AUSGANG) as Ausgang[]).filter((a) => jetzt.ergebnisse[a] || vorher.ergebnisse[a]);

  el.innerHTML = `
    <header class="seitenkopf">
      <h1>${maskottchen('statistik', 'titel-bild')} Auswertungen</h1>
      <button type="button" class="btn" id="awPdf">PDF-Bericht</button>
    </header>
    <nav class="tabs aw-bereiche" role="tablist">${(Object.keys(BEREICHE) as Bereich[]).map((b) => `<button type="button" data-bereich="${b}" class="bereich-${b}${b === bereich ? ' aktiv' : ''}">${BEREICHE[b]}</button>`).join('')}</nav>
    <div class="aw-leiste">
      <div class="segment" role="group" aria-label="Zeitraum">${PERIODEN_REIHE.map((pe) => `<button type="button" data-periode="${pe}" class="${pe === periode ? 'aktiv' : ''}">${PERIODEN[pe]}</button>`).join('')}</div>
      <div class="k-nav"><button type="button" class="btn klein ghost" data-schritt="-1" aria-label="Voriger Zeitraum">‹</button><button type="button" class="btn klein ghost" data-schritt="0">Heute</button><button type="button" class="btn klein ghost" data-schritt="1" aria-label="Nächster Zeitraum">›</button></div>
      <input type="date" id="awDatum" value="${anker}" aria-label="Stichtag">
    </div>
    <section class="karte-box aw-kopf bereich-${bereich}">
      <h2>${esc(ber.zeitraum.titel)}</h2>
      <p class="hinweis">${esc(BEREICHE[bereich])} · Vergleich mit ${esc(ber.vorzeitraum.titel)}</p>
    </section>
    <div class="aw-zahlen">${zahlenFuer(bereich).map((z) => {
    const v = veraenderung(z.wert(jetzt), z.wert(vorher), z.quote);
    return `<div class="aw-zahl">
        <span class="aw-titel">${z.titel}</span>
        <strong>${anzeigen(z, jetzt)}</strong>
        ${v ? `<span class="aw-delta ${v.richtung}" title="Vorzeitraum: ${anzeigen(z, vorher)}">${v.text}</span>` : '<span class="aw-delta gleich">–</span>'}
        ${z.sub ? `<small>${esc(z.sub(jetzt))}</small>` : ''}
      </div>`;
  }).join('')}</div>
    <section class="karte-box">
      <h2>Gespräche im Verlauf</h2>
      ${jetzt.gespraeche ? `<div class="aw-verlauf bereich-${bereich}" style="--n:${jetzt.verlauf.length}">${jetzt.verlauf.map((v) => `<div class="aw-saeule" title="${esc(v.label)}: ${v.wert}"><span style="height:${Math.round((v.wert / max) * 100)}%"></span><em>${esc(v.label)}</em></div>`).join('')}</div>`
    : '<p class="hinweis">In diesem Zeitraum gibt es keine Gespräche.</p>'}
    </section>
    <section class="karte-box">
      <h2>Ergebnisse der Gespräche</h2>
      ${ergebnisse.length ? `<table class="aw-tabelle"><thead><tr><th>Ergebnis</th><th>Jetzt</th><th>Vorher</th></tr></thead><tbody>
        ${ergebnisse.map((a) => `<tr><td>${esc(AUSGANG[a])}</td><td>${jetzt.ergebnisse[a]}</td><td>${vorher.ergebnisse[a]}</td></tr>`).join('')}
      </tbody></table>` : '<p class="hinweis">Noch keine Gespräche mit Ergebnis in diesem oder dem vorigen Zeitraum.</p>'}
    </section>`;

  el.querySelector('.aw-bereiche')!.addEventListener('click', (e) => { const b = (e.target as Element).closest('[data-bereich]'); if (b) neu(b.dataset.bereich as Bereich, periode, anker); });
  el.querySelector('.segment')!.addEventListener('click', (e) => { const b = (e.target as Element).closest('[data-periode]'); if (b) neu(bereich, b.dataset.periode as Periode, anker); });
  el.querySelector('.k-nav')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('[data-schritt]');
    if (!b) return;
    const n = Number(b.dataset.schritt);
    neu(bereich, periode, n === 0 ? tagVon(new Date()) : verschieben(periode, anker, n));
  });
  el.querySelector('#awDatum')!.addEventListener('change', (e) => { const v = (e.target as HTMLInputElement).value; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) neu(bereich, periode, v); });
  el.querySelector('#awPdf')!.addEventListener('click', async () => {
    try { await pdfAnbieten(await berichtPdf(ber), 'Bericht (PDF)', 'Der Bericht', dialog); } catch (err) { toast((err as Error).message, 'error'); }
  });
}

/** Bericht als A4-PDF (jsPDF lokal). Enthält nur Zahlen, keine Kundennamen. */
export async function berichtPdf(ber: Bericht): Promise<{ blob: Blob; dateiname: string }> {
  const JsPDF = await jsPdfLaden();
  const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
  const B = 210; const R = 18; let y = 22;
  const lg = await logo();
  if (lg) doc.addImage(lg, 'PNG', B - R - 20, 12, 20, 20);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text(`Auswertung ${BEREICHE[ber.bereich]}`, R, y); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text(ber.zeitraum.titel, R, y); y += 6;
  doc.setFontSize(9); doc.setTextColor(110);
  doc.text(`Vergleich: ${ber.vorzeitraum.titel} · erstellt am ${new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}`, R, y); y += 10;
  doc.setTextColor(0);

  const tabelle = (kopf: string[], zeilen: string[][]) => {
    const sp = [R, R + 90, R + 125, R + 155];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    kopf.forEach((t, i) => doc.text(t, sp[i]!, y));
    y += 2; doc.setDrawColor(180); doc.line(R, y, B - R, y); y += 5;
    doc.setFont('helvetica', 'normal');
    for (const z of zeilen) {
      if (y > 280) { doc.addPage(); y = 20; }
      z.forEach((t, i) => doc.text(t, sp[i]!, y));
      y += 6;
    }
    y += 4;
  };
  tabelle(['Kennzahl', 'Jetzt', 'Vorher', 'Veränderung'], zahlenFuer(ber.bereich).map((z) => [
    z.titel, anzeigen(z, ber.jetzt), anzeigen(z, ber.vorher), veraenderung(z.wert(ber.jetzt), z.wert(ber.vorher), z.quote)?.text || '–',
  ]));
  const erg = (Object.keys(AUSGANG) as Ausgang[]).filter((a) => ber.jetzt.ergebnisse[a] || ber.vorher.ergebnisse[a]);
  if (erg.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Ergebnisse der Gespräche', R, y); y += 7;
    tabelle(['Ergebnis', 'Jetzt', 'Vorher', ''], erg.map((a) => [AUSGANG[a], String(ber.jetzt.ergebnisse[a]), String(ber.vorher.ergebnisse[a]), '']));
  }
  // Verlauf als einfache Säulen
  if (ber.jetzt.gespraeche) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Gespräche im Verlauf', R, y); y += 6;
    const v = ber.jetzt.verlauf; const max = Math.max(1, ...v.map((x) => x.wert));
    const breite = (B - 2 * R) / v.length; const hoehe = 40;
    doc.setFontSize(6); doc.setFont('helvetica', 'normal');
    v.forEach((x, i) => {
      const h = (x.wert / max) * hoehe;
      doc.setFillColor(90, 140, 70);
      if (h > 0) doc.rect(R + i * breite + breite * 0.15, y + hoehe - h, breite * 0.7, h, 'F');
      if (v.length <= 14 || i % 2 === 0) doc.text(x.label, R + i * breite + breite / 2, y + hoehe + 4, { align: 'center' });
    });
    y += hoehe + 8;
  }
  const blob = doc.output('blob');
  const datei = `auswertung-${ber.bereich}-${ber.periode}-${ber.zeitraum.von}_${ber.zeitraum.bis}.pdf`;
  return { blob, dateiname: datei };
}
