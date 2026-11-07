// Sperling – Auswertungen: je Bereich oder alles zusammen, als Tag, Woche, Monat, Kalenderjahr oder letzte 365 Tage.
// Die Zahlen entstehen nur auf dem Gerät; der PDF-Bericht wird nur weitergegeben, wenn der Nutzer ihn teilt.
import { esc } from '../../core/util.ts';
import { AUSGANG, SPARTEN, SPARTEN_KEYS } from '../../core/model.ts';
import { tagVon } from '../../core/belegung.ts';
import {
  bericht, fokusBericht, verschieben, veraenderung, prozent, BEREICHE, PERIODEN, PERIODEN_REIHE,
  type Bereich, type Periode, type Bericht, type Kennzahlen, type Ausgang, type Fokus,
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
  { titel: 'Produkt-Interessen', wert: (k) => k.produkte.interesse, sub: (k) => `${k.produkte.spaeter} später · ${k.produkte.vorhanden} vorhanden · ${k.produkte.kein} kein Interesse` },
  { titel: 'Geräte verliehen', wert: (k) => k.verleihe, nurVorwerk: true },
  { titel: 'Rückgaben', wert: (k) => k.rueckgaben, nurVorwerk: true },
  { titel: 'Käufe nach Test', wert: (k) => k.kaeufe, nurVorwerk: true },
  { titel: 'Kaufquote', wert: (k) => k.kaufquote, quote: true, nurVorwerk: true, sub: () => 'Käufe je verliehenes Gerät' },
];

const zahlenFuer = (bereich: Bereich) => ZAHLEN.filter((z) => !z.nurVorwerk || bereich === 'alle' || bereich === 'vorwerk');
const anzeigen = (z: Zahl, k: Kennzahlen) => { const w = z.wert(k); return z.quote ? prozent(w) : String(w ?? 0); };

const PERIODE_KURZ: Record<Periode, string> = { tag: 'Tag', woche: 'Woche', monat: 'Monat', m1: '1 Monat', m3: '3 Monate', m6: '½ Jahr', jahr: 'Kalenderjahr', '365': '365 Tage' };
const THEMEN = [...SPARTEN_KEYS, 'ohne'] as const;
const PDF_FARBE: Record<(typeof THEMEN)[number], [number, number, number]> = { pv: [224, 168, 0], wp: [47, 127, 214], vorwerk: [47, 154, 60], ohne: [140, 150, 145] };
const themaLabel = (t: (typeof THEMEN)[number]) => (t === 'ohne' ? 'ohne Thema' : SPARTEN[t].label);

/** Säulen; bei „Alles zusammen“ nach Thema gestapelt (Farbe + Muster + Legende, Werte im Tooltip). */
function verlaufHtml(verlauf: Kennzahlen['verlauf'], bereich: Bereich, max: number): string {
  const gestapelt = bereich === 'alle';
  const summe = Object.fromEntries(THEMEN.map((t) => [t, verlauf.reduce((n, v) => n + v.je[t], 0)])) as Record<(typeof THEMEN)[number], number>;
  const saeulen = verlauf.map((v) => {
    const hoehe = Math.round((v.wert / max) * 100);
    const nennungen = THEMEN.reduce((n, t) => n + v.je[t], 0);
    const text = `${v.label}: ${v.wert} Gespräch${v.wert === 1 ? '' : 'e'}${gestapelt && v.wert ? ` (${THEMEN.filter((t) => v.je[t]).map((t) => `${themaLabel(t)} ${v.je[t]}`).join(', ')})` : ''}`;
    const innen = gestapelt && nennungen
      ? `<span class="aw-stapel" style="height:${hoehe}%">${THEMEN.filter((t) => v.je[t]).map((t) => `<i class="aw-teil aw-${t}" style="flex-grow:${v.je[t]}"></i>`).join('')}</span>`
      : `<span style="height:${hoehe}%"></span>`;
    return `<div class="aw-saeule" title="${esc(text)}" aria-label="${esc(text)}" role="img">${innen}<em>${esc(v.label)}</em></div>`;
  }).join('');
  const legende = gestapelt ? `<ul class="aw-legende">${THEMEN.filter((t) => t !== 'ohne' || summe.ohne).map((t) => `<li><i class="aw-teil aw-${t}"></i>${esc(themaLabel(t))} <b>${summe[t]}</b></li>`).join('')}</ul>${THEMEN.some((t) => t !== 'ohne') ? '<p class="hinweis klein">Ein Gespräch über zwei Themen zählt bei beiden; die Säule zeigt die Anzahl der Gespräche.</p>' : ''}` : '';
  return `<div class="aw-verlauf bereich-${bereich}" style="--n:${verlauf.length}">${saeulen}</div>${legende}`;
}

const pkt = (d: number | null) => (d === null ? '' : d === 0 ? '±0 Pkt.' : `${d > 0 ? '+' : '−'}${Math.abs(d)} Pkt.`);
/** Standardschrift im PDF kennt kein Unicode-Minus. */
const ansi = (s: string) => s.replace(/−/g, '-');
const anteilText = (a: number | null) => (a === null ? '–' : `${Math.round(a * 100)} %`);

/** Ein Satz zum Gleichgewicht. */
export function urteilText(f: Fokus): string {
  const top = f.sparten.find((x) => x.sparte === f.schwerpunkt);
  const name = f.schwerpunkt ? SPARTEN[f.schwerpunkt].label : '';
  switch (f.urteil) {
    case 'leer': return 'In diesem Zeitraum gab es keine Gespräche, Notizen oder Termine mit Sparte.';
    case 'ausgeglichen': return `Ausgeglichen: Die Sparten bekamen ähnlich viel Aufmerksamkeit (am meisten ${name}, ${anteilText(top!.anteil)}).`;
    case 'einseitig': return `Sehr einseitig: ${name} mit ${anteilText(top!.anteil)}.`;
    default: return `Schwerpunkt: ${name} mit ${anteilText(top!.anteil)}.`;
  }
}

/** „Fokus je Sparte“: Anteile mit Veränderung, Entwicklung über die letzten Zeiträume, Kurztipp. */
function fokusHtml(f: Fokus): string {
  const anteile = f.sparten.map((x) => {
    const breite = Math.round((x.anteil ?? 0) * 100);
    const richtung = x.deltaPkt === null || x.deltaPkt === 0 ? 'gleich' : x.deltaPkt > 0 ? 'auf' : 'ab';
    const hinweis = [x.vernachlaessigt ? 'kam zu kurz' : '', x.ruecklaufig >= 2 ? `${x.ruecklaufig}× in Folge weniger` : ''].filter(Boolean).join(' · ');
    return `<li class="aw-anteil${x.vernachlaessigt ? ' knapp' : ''}" data-fokus="${x.sparte}">
      <span class="aw-anteil-name">${esc(SPARTEN[x.sparte].label)}</span>
      <span class="aw-balken" role="img" aria-label="${esc(`${SPARTEN[x.sparte].label}: ${anteilText(x.anteil)}`)}"><i class="aw-teil aw-${x.sparte}" style="width:${breite}%"></i></span>
      <span class="aw-anteil-wert"><b>${anteilText(x.anteil)}</b> <small>(${x.anzahl})</small></span>
      ${x.deltaPkt !== null ? `<span class="aw-delta ${richtung}" title="gegenüber dem Vorzeitraum">${pkt(x.deltaPkt)}</span>` : '<span></span>'}
      ${hinweis ? `<small class="aw-anteil-hinweis">${x.vernachlaessigt ? '⚠️ ' : ''}${esc(hinweis)}</small>` : ''}
    </li>`;
  }).join('');
  const reihe = f.reihe.map((r, i) => {
    const text = `${r.label}: ${r.summe ? SPARTEN_KEYS.filter((s) => r.je[s]).map((s) => `${SPARTEN[s].label} ${Math.round((r.je[s] / r.summe) * 100)} %`).join(', ') : 'nichts'}`;
    return `<li${i === f.reihe.length - 1 ? ' class="jetzt"' : ''}><span class="aw-reihe-label">${esc(r.label)}</span>
      <span class="aw-balken aw-mix" role="img" aria-label="${esc(text)}" title="${esc(text)}">${r.summe ? SPARTEN_KEYS.filter((s) => r.je[s]).map((s) => `<i class="aw-teil aw-${s}" style="flex-grow:${r.je[s]}"></i>`).join('') : ''}</span>
      <span class="aw-reihe-summe">${r.summe}</span></li>`;
  }).join('');
  return `<section class="karte-box aw-fokus" id="awFokus">
      <h2>Fokus je Sparte</h2>
      <p>${esc(urteilText(f))}</p>
      <ul class="aw-anteile">${anteile}</ul>
      <h3>Entwicklung</h3>
      <ul class="aw-reihe">${reihe}</ul>
      ${f.tipp ? `<p class="aw-tipp">💡 ${esc(f.tipp)}</p>` : ''}
      <p class="hinweis klein">Gezählt werden Gespräche, Notizen, Termine und Wiedervorlagen je Sparte. Ein Gespräch über zwei Sparten zählt bei beiden. „Zu kurz“ heißt: unter 15 % oder um 15 Punkte oder mehr gesunken.</p>
    </section>`;
}

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
  const fokus = fokusBericht(store.getData(), periode, anker);
  const meinAnteil = bereich === 'alle' ? null : fokus.sparten.find((x) => x.sparte === bereich)!;

  const max = Math.max(1, ...jetzt.verlauf.map((v) => v.wert));
  const ergebnisse = (Object.keys(AUSGANG) as Ausgang[]).filter((a) => jetzt.ergebnisse[a] || vorher.ergebnisse[a]);

  el.innerHTML = `
    <header class="seitenkopf">
      <h1>${maskottchen('statistik', 'titel-bild')} Auswertungen</h1>
      <button type="button" class="btn" id="awPdf">PDF-Bericht</button>
    </header>
    <nav class="tabs aw-bereiche" role="tablist">${(Object.keys(BEREICHE) as Bereich[]).map((b) => `<button type="button" data-bereich="${b}" class="bereich-${b}${b === bereich ? ' aktiv' : ''}">${BEREICHE[b]}</button>`).join('')}</nav>
    <div class="aw-leiste">
      <div class="segment aw-perioden" role="group" aria-label="Zeitraum">${PERIODEN_REIHE.map((pe) => `<button type="button" data-periode="${pe}" class="${pe === periode ? 'aktiv' : ''}" title="${PERIODEN[pe]}" aria-pressed="${pe === periode}">${PERIODE_KURZ[pe]}</button>`).join('')}</div>
      <div class="k-nav"><button type="button" class="btn klein ghost" data-schritt="-1" aria-label="Voriger Zeitraum">‹</button><button type="button" class="btn klein ghost" data-schritt="0">Heute</button><button type="button" class="btn klein ghost" data-schritt="1" aria-label="Nächster Zeitraum">›</button></div>
      <input type="date" id="awDatum" value="${anker}" aria-label="Stichtag">
    </div>
    <section class="karte-box aw-kopf bereich-${bereich}">
      <h2>${esc(ber.zeitraum.titel)}</h2>
      <p class="hinweis">${esc(BEREICHE[bereich])} · Vergleich mit ${esc(ber.vorzeitraum.titel)}</p>
      ${meinAnteil && fokus.gesamt ? `<p class="aw-mein-anteil">Anteil an allem, was du in diesem Zeitraum gemacht hast: <b>${anteilText(meinAnteil.anteil)}</b>${meinAnteil.deltaPkt !== null ? ` (${pkt(meinAnteil.deltaPkt)})` : ''}${meinAnteil.vernachlaessigt ? ' · ⚠️ kam zu kurz' : ''}</p>` : ''}
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
      ${jetzt.gespraeche ? verlaufHtml(jetzt.verlauf, bereich, max) : '<p class="hinweis">In diesem Zeitraum gibt es keine Gespräche.</p>'}
    </section>
    ${bereich === 'alle' ? fokusHtml(fokus) : ''}
    ${jetzt.topProdukte.length ? `<section class="karte-box">
      <h2>Meistgefragte Produkte</h2>
      <table class="aw-tabelle"><thead><tr><th>Produkt</th><th>Interesse</th></tr></thead><tbody>
        ${jetzt.topProdukte.map((x) => `<tr><td>${esc(x.name)}</td><td>${x.anzahl}</td></tr>`).join('')}
      </tbody></table>
    </section>` : ''}
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
    try { await pdfAnbieten(await berichtPdf(ber, bereich === 'alle' ? fokus : null), 'Bericht (PDF)', 'Der Bericht', dialog); } catch (err) { toast((err as Error).message, 'error'); }
  });
}

/** Bericht als A4-PDF (jsPDF lokal). Enthält nur Zahlen, keine Kundennamen. */
export async function berichtPdf(ber: Bericht, fokus: Fokus | null = null): Promise<{ blob: Blob; dateiname: string }> {
  const JsPDF = await jsPdfLaden();
  const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
  const B = 210; const R = 18; let y = 22;
  const lg = await logo();
  if (lg) doc.addImage(lg, 'PNG', B - R - 20, 12, 20, 20);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text(ber.bereich === 'alle' ? 'Gesamtauswertung' : `Auswertung ${BEREICHE[ber.bereich]}`, R, y); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text(ber.zeitraum.titel, R, y); y += 6;
  doc.setFontSize(9); doc.setTextColor(110);
  doc.text(`Vergleich: ${ber.vorzeitraum.titel} · erstellt am ${new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}`, R, y); y += 10;
  doc.setTextColor(0);

  // Immer genau eine Seite: Zeilenhöhe und Schrift schrumpfen, wenn es viele Zeilen sind.
  const kennzahlZeilen = zahlenFuer(ber.bereich).map((z) => [
    z.titel, anzeigen(z, ber.jetzt), anzeigen(z, ber.vorher), ansi(veraenderung(z.wert(ber.jetzt), z.wert(ber.vorher), z.quote)?.text || '–'),
  ]);
  const erg = (Object.keys(AUSGANG) as Ausgang[]).filter((a) => ber.jetzt.ergebnisse[a] || ber.vorher.ergebnisse[a]);
  const top = ber.jetzt.topProdukte;
  const unten = 287;
  const diagramm = ber.jetzt.gespraeche ? 6 + 34 + 6 + (ber.bereich === 'alle' ? 6 : 0) : 0;
  const zweiSpalten = Math.max(erg.length, top.length);
  const zeilen = kennzahlZeilen.length + 1 + (zweiSpalten ? zweiSpalten + 1 : 0);
  const mitFokus = !!fokus && fokus.gesamt > 0;
  const fokusHoehe = mitFokus ? 6 + 6 + 5 + (fokus!.tipp ? 10 : 0) + 4 : 0;
  const fest = 6 + (zweiSpalten ? 7 + 6 : 0) + diagramm + fokusHoehe;
  const zh = Math.max(3.6, Math.min(6, (unten - y - fest) / Math.max(1, zeilen)));
  const fs = Math.max(7, Math.min(10, zh * 1.7));

  const tabelle = (kopf: string[], reihe: string[][], sp: number[], bis: number) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(fs);
    kopf.forEach((t, i) => { if (t) doc.text(t, sp[i]!, y); });
    doc.setDrawColor(180); doc.line(sp[0]!, y + 1.5, bis, y + 1.5);
    let yy = y + zh;
    doc.setFont('helvetica', 'normal');
    // Text auf die Spaltenbreite kürzen, damit nichts in die Nachbarspalte läuft
    const passend = (t: string, breite: number) => {
      if (doc.getTextWidth(t) <= breite) return t;
      let x = t;
      while (x.length > 1 && doc.getTextWidth(`${x}…`) > breite) x = x.slice(0, -1);
      return `${x.trimEnd()}…`;
    };
    for (const z of reihe) { z.forEach((t, i) => { if (t) doc.text(passend(t, (sp[i + 1] ?? bis) - sp[i]! - 2), sp[i]!, yy); }); yy += zh; }
    return yy;
  };
  y = tabelle(['Kennzahl', 'Jetzt', 'Vorher', 'Veränderung'], kennzahlZeilen, [R, R + 92, R + 118, R + 144], B - R) + 4;
  if (zweiSpalten) {
    const mitte = R + 90;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(Math.min(12, fs + 2));
    if (erg.length) doc.text('Ergebnisse der Gespräche', R, y);
    if (top.length) doc.text('Meistgefragte Produkte', mitte, y);
    y += 6;
    const y0 = y;
    let yl = y; let yr = y;
    if (erg.length) yl = tabelle(['Ergebnis', 'Jetzt', 'Vorher'], erg.map((a) => [AUSGANG[a], String(ber.jetzt.ergebnisse[a]), String(ber.vorher.ergebnisse[a])]), [R, R + 56, R + 72], mitte - 6);
    y = y0;
    if (top.length) yr = tabelle(['Produkt', 'Interesse'], top.map((x) => [x.name, String(x.anzahl)]), [mitte, B - R - 16], B - R);
    y = Math.max(yl, yr) + 4;
  }
  // Fokus je Sparte: Satz, Anteile mit Veränderung, Kurztipp
  if (mitFokus) {
    const f = fokus!;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(Math.min(12, fs + 2)); doc.text('Fokus je Sparte', R, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(ansi(urteilText(f)), R, y); y += 6;
    // ein 100-%-Balken mit den Anteilen, darunter die Zahlen
    let bx = R; const bw = B - 2 * R;
    for (const x of f.sparten) {
      if (!x.anteil) continue;
      doc.setFillColor(...PDF_FARBE[x.sparte]); doc.rect(bx, y - 3.5, bw * x.anteil, 4, 'F'); bx += bw * x.anteil;
    }
    y += 4.5;
    doc.setFontSize(8);
    doc.text(ansi(f.sparten.map((x) => `${SPARTEN[x.sparte].label} ${anteilText(x.anteil)}${x.deltaPkt !== null ? ` (${pkt(x.deltaPkt)})` : ''}${x.vernachlaessigt ? ' – zu kurz' : ''}`).join('   ·   ')), R, y);
    y += 5;
    if (f.tipp) {
      doc.setFontSize(9);
      const zeilenTipp = doc.splitTextToSize(ansi(`Tipp: ${f.tipp}`), bw).slice(0, 2);
      doc.text(zeilenTipp, R, y); y += 4.5 * zeilenTipp.length + 1;
    }
    y += 4;
  }
  // Verlauf als einfache Säulen
  if (ber.jetzt.gespraeche) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(Math.min(12, fs + 2)); doc.text('Gespräche im Verlauf', R, y); y += 4;
    const v = ber.jetzt.verlauf; const max = Math.max(1, ...v.map((x) => x.wert));
    const breite = (B - 2 * R) / v.length; const hoehe = 34;
    doc.setFontSize(6); doc.setFont('helvetica', 'normal');
    v.forEach((x, i) => {
      const h = (x.wert / max) * hoehe;
      const nenn = THEMEN.reduce((n, t) => n + x.je[t], 0);
      if (h > 0 && ber.bereich === 'alle' && nenn) {
        // gestapelt nach Thema, unten beginnend (Farben wie in der App)
        let unten = y + hoehe;
        for (const t of THEMEN) {
          if (!x.je[t]) continue;
          const teil = (h * x.je[t]) / nenn;
          doc.setFillColor(...PDF_FARBE[t]);
          doc.rect(R + i * breite + breite * 0.15, unten - teil, breite * 0.7, teil, 'F');
          unten -= teil;
        }
      } else if (h > 0) { doc.setFillColor(90, 140, 70); doc.rect(R + i * breite + breite * 0.15, y + hoehe - h, breite * 0.7, h, 'F'); }
      if (v.length <= 14 || i % 2 === 0) doc.text(x.label, R + i * breite + breite / 2, y + hoehe + 4, { align: 'center' });
    });
    y += hoehe + 8;
    if (ber.bereich === 'alle') {
      doc.setFontSize(8);
      let lx = R;
      for (const t of THEMEN) {
        doc.setFillColor(...PDF_FARBE[t]); doc.rect(lx, y - 3, 4, 3, 'F');
        const txt = themaLabel(t); doc.text(txt, lx + 5.5, y - 0.5); lx += 9 + doc.getTextWidth(txt);
      }
      y += 6;
    }
  }
  const blob = doc.output('blob');
  const datei = `auswertung-${ber.bereich}-${ber.periode}-${ber.zeitraum.von}_${ber.zeitraum.bis}.pdf`;
  return { blob, dateiname: datei };
}
