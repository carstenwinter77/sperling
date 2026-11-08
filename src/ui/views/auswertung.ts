// Sperling – Auswertungen: je Bereich oder alles zusammen, als Tag, Woche, Monat, Kalenderjahr oder letzte 365 Tage.
// Die Zahlen entstehen nur auf dem Gerät; der PDF-Bericht wird nur weitergegeben, wenn der Nutzer ihn teilt.
import { esc } from '../../core/util.ts';
import { AUSGANG, SPARTEN, SPARTEN_KEYS, kundenTitel, type Sparte } from '../../core/model.ts';
import { tagVon } from '../../core/belegung.ts';
import {
  bericht, fokusBericht, verschieben, veraenderung, veraenderungText, prozent, nachfassListe, BEREICHE, PERIODEN, PERIODEN_REIHE, PERIODEN_HAUPT,
  STUFEN_LABEL, NACHFASS_GRUPPEN, type Bereich, type Periode, type Bericht, type Kennzahlen, type Ausgang, type Fokus, type Trichter, type Vertrieb, type NachfassArt,
} from '../../core/auswertung.ts';
import * as store from '../../storage/store.ts';
import { maskottchen, toast, dialog } from '../dom.ts';
import { anrufen } from '../kontakt.ts';
import { jsPdfLaden, logo, pdfAnbieten } from '../leihschein.ts';

interface Zahl { titel: string; wert: (k: Kennzahlen) => number | null; quote?: boolean; sub?: (k: Kennzahlen) => string; nurVorwerk?: boolean; ohneVorwerk?: boolean }

const ZAHLEN: Zahl[] = [
  { titel: 'Gespräche', wert: (k) => k.gespraeche, sub: (k) => `${k.erreicht} erreicht${k.telefon || k.hausbesuch ? ` · ${k.telefon} Telefon, ${k.hausbesuch} Hausbesuch` : ''}` },
  { titel: 'Abschlüsse im Gespräch', wert: (k) => k.abschluesse, sub: () => 'Gesprächsergebnis „Abschluss“' },
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

const PERIODE_KURZ: Record<Periode, string> = { tag: 'Tag', woche: 'Woche', monat: 'Monat', quartal: 'Quartal', m1: '1 Monat', m3: '3 Monate', m6: '½ Jahr', jahr: 'Kalenderjahr', '365': '365 Tage' };
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
const PFEIL = { auf: '▲', ab: '▼', gleich: '▶' } as const;
const RICHTUNG = { auf: 'gestiegen', ab: 'gesunken', gleich: 'gleich geblieben' } as const;
const PDF_RICHTUNG: Record<'auf' | 'ab' | 'gleich', [number, number, number]> = { auf: [36, 120, 30], ab: [180, 45, 45], gleich: [90, 100, 95] };
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
  return `<section class="aw-unter aw-fokus" id="awFokus">
      <h3>Fokus je Sparte</h3>
      <p>${esc(urteilText(f))}</p>
      <ul class="aw-anteile">${anteile}</ul>
      <h4>Entwicklung</h4>
      <ul class="aw-reihe">${reihe}</ul>
      ${f.tipp ? `<p class="aw-tipp">💡 ${esc(f.tipp)}</p>` : ''}
      <p class="hinweis klein">Gezählt werden Gespräche, Notizen, Termine und Wiedervorlagen je Sparte. Ein Gespräch über zwei Sparten zählt bei beiden. „Zu kurz“ heißt: unter 15 % oder um 15 Punkte oder mehr gesunken.</p>
    </section>`;
}

/** Kernzahl-Kachel oben: großer Wert, Veränderung, kurze Erklärung. */
function kernHtml(titel: string, wert: string, v: ReturnType<typeof veraenderung>, vorher: string, sub: string, id: string): string {
  return `<div class="aw-kern-zahl" data-kern="${id}">
    <span class="aw-titel">${esc(titel)}</span>
    <strong>${esc(wert)}</strong>
    ${v ? `<span class="aw-delta ${v.richtung}" title="Vergleich: ${esc(vorher)}"><span class="aw-pfeil" aria-hidden="true">${PFEIL[v.richtung]}</span> ${esc(v.text)}<span class="sr-only"> ${RICHTUNG[v.richtung]}, vorher ${esc(vorher)}</span></span>` : '<span class="aw-delta gleich">–</span>'}
    <small>${esc(sub)}</small>
  </div>`;
}

/** Verkaufstrichter: Stufen als zentrierte Balken (nach Sparte geteilt), dazwischen die Quote; schwächster Übergang markiert. */
function trichterHtml(t: Trichter, bereich: Bereich): string {
  const max = Math.max(1, t.stufen[0]!.anzahl);
  if (!t.stufen[0]!.anzahl) return '<p class="hinweis">In diesem Zeitraum stand kein Kunde im Trichter. Sobald du bei Kunden einen Status setzt, erscheint er hier.</p>';
  const zeilen = t.stufen.map((x, i) => {
    const breite = Math.max(6, Math.round((x.anzahl / max) * 100));
    const teile = bereich === 'alle'
      ? SPARTEN_KEYS.filter((s) => x.je[s]).map((s) => `<i class="aw-teil aw-${s}" style="flex-grow:${x.je[s]}"></i>`).join('')
      : `<i class="aw-teil aw-${bereich}" style="flex-grow:1"></i>`;
    const text = `${STUFEN_LABEL[x.stufe]}: ${x.anzahl}${bereich === 'alle' && x.anzahl ? ` (${SPARTEN_KEYS.filter((s) => x.je[s]).map((s) => `${SPARTEN[s].kurz} ${x.je[s]}`).join(', ')})` : ''}`;
    const q = i < t.quoten.length ? t.quoten[i] : undefined;
    const quote = q === undefined ? '' : `<div class="aw-tr-quote${t.schwach === i ? ' schwach' : ''}">${q === null ? '–' : `↓ ${Math.round(q * 100)} % kommen weiter`}${t.schwach === i ? ' · schwächste Stufe' : ''}</div>`;
    return `<li class="aw-tr-stufe" data-stufe="${x.stufe}"><span class="aw-tr-name">${esc(STUFEN_LABEL[x.stufe])}</span>
      <span class="aw-tr-spur"><span class="aw-tr-balken" style="width:${breite}%" role="img" aria-label="${esc(text)}" title="${esc(text)}">${x.anzahl ? teile : ''}</span></span>
      <b class="aw-tr-zahl">${x.anzahl}</b></li>${quote ? `<li class="aw-tr-zwischen" aria-hidden="${q === null}">${quote}</li>` : ''}`;
  }).join('');
  return `<ol class="aw-trichter">${zeilen}</ol>${t.tipp ? `<p class="aw-tipp warn">💡 ${esc(t.tipp)}</p>` : ''}`;
}

const SPARTE_PUNKT = (s: Sparte | '') => `<i class="aw-punkt ${s ? `aw-${s}` : 'aw-ohne'}" aria-hidden="true"></i>`;

/** „Jetzt nachfassen“: drei Gruppen, je drei Einträge sichtbar, der Rest aufklappbar. Tippen öffnet den Kunden. */
function nachfassHtml(liste: ReturnType<typeof nachfassListe>, kundeVon: (id: string) => string | null): string {
  const gruppen = (Object.keys(liste) as NachfassArt[]).filter((a) => liste[a].length);
  if (!gruppen.length) return '<p class="hinweis">Nichts liegen geblieben: keine überfälligen Wiedervorlagen, keine stillen Angebote, keine fälligen Testgeräte. 👍</p>';
  const zeile = (e: ReturnType<typeof nachfassListe>[NachfassArt][number]) => {
    const name = e.kundeId ? kundeVon(e.kundeId) : null;
    const inhalt = `${SPARTE_PUNKT(e.sparte)}<span class="aw-nf-text"><b>${esc(name || 'ohne Kunde')}</b><small>${esc(e.text)}</small></span><span class="aw-nf-wann${e.dringend ? ' dringend' : ''}">${esc(e.wann)}</span>`;
    // Direkt handeln (ab 0.14.0): anrufen oder Gespräch starten, danach zurück in die Auswertung
    const k = e.kundeId ? store.findKunde(e.kundeId) : null;
    const knoepfe = k ? `<span class="aw-nf-aktion">${k.telefon ? `<button type="button" class="btn klein ghost" data-aw-anrufen="${esc(k.id)}" aria-label="${esc(kundenTitel(k))} anrufen">📞</button>` : ''}<a class="btn klein ghost" href="#/kunde/${esc(k.id)}/gespraech${e.terminId ? `?termin=${esc(e.terminId)}` : ''}" aria-label="Gespräch mit ${esc(kundenTitel(k))} starten">💬</a></span>` : '';
    return `<li class="${knoepfe ? 'mit-aktion' : ''}">${name ? `<a href="#/kunde/${esc(e.kundeId)}">${inhalt}</a>` : `<span class="aw-nf-ohne">${inhalt}</span>`}${knoepfe}</li>`;
  };
  return gruppen.map((a) => {
    const alle = liste[a];
    return `<h3 class="aw-nf-gruppe">${esc(NACHFASS_GRUPPEN[a])} <span>${alle.length}</span></h3>
      <ul class="aw-nachfassen" data-gruppe="${a}">${alle.slice(0, 3).map(zeile).join('')}</ul>
      ${alle.length > 3 ? `<details class="aw-nf-mehr"><summary>${alle.length - 3} weitere anzeigen</summary><ul class="aw-nachfassen">${alle.slice(3).map(zeile).join('')}</ul></details>` : ''}`;
  }).join('');
}

/** Sparten nebeneinander (nur „Alles zusammen“). */
function spartenHtml(je: Record<Sparte, Bericht>, fokus: Fokus, ueberfaellig: Record<Sparte, number>, gesamtGespraeche: number): string {
  const pfeil = (jetzt: number | null, vorher: number | null, quote = false) => {
    const v = veraenderung(jetzt, vorher, quote);
    return v && v.richtung !== 'gleich' ? ` <span class="aw-mini ${v.richtung}" title="Vergleich: ${esc(quote ? prozent(vorher) : String(vorher))}">${PFEIL[v.richtung]}<span class="sr-only"> ${RICHTUNG[v.richtung]}</span></span>` : '';
  };
  const summe = (f: (b: Bericht) => number) => SPARTEN_KEYS.reduce((n, s) => n + f(je[s]), 0);
  const ab = summe((b) => b.vt.abschluesse); const vl = summe((b) => b.vt.verloren);
  const zeilen: [string, (s: Sparte) => string, string][] = [
    ['Gespräche', (s) => `${je[s].jetzt.gespraeche}${pfeil(je[s].jetzt.gespraeche, je[s].vorher.gespraeche)}`, String(gesamtGespraeche)],
    ['Abschlüsse', (s) => `${je[s].vt.abschluesse}${pfeil(je[s].vt.abschluesse, je[s].vtVorher.abschluesse)}`, String(ab)],
    ['Abschlussquote', (s) => `${prozent(je[s].vt.quote)}${pfeil(je[s].vt.quote, je[s].vtVorher.quote, true)}`, prozent(ab + vl ? ab / (ab + vl) : null)],
    ['Offene Chancen', (s) => `${je[s].vt.offen}${pfeil(je[s].vt.offen, je[s].vtVorher.offen)}`, String(summe((b) => b.vt.offen))],
    ['Überfällig', (s) => (ueberfaellig[s] ? `<span class="aw-rot">${ueberfaellig[s]}</span>` : '0'), String(SPARTEN_KEYS.reduce((n, s) => n + ueberfaellig[s], 0))],
    ['Anteil deiner Zeit', (s) => anteilText(fokus.sparten.find((x) => x.sparte === s)!.anteil), ''],
    ['Test → Kauf', (s) => (s === 'vorwerk' && je.vorwerk.jetzt.verleihe ? `${je.vorwerk.jetzt.kaeufe} von ${je.vorwerk.jetzt.verleihe} (${prozent(je.vorwerk.jetzt.kaufquote)})` : '–'), ''],
  ];
  return `<section class="karte-box aw-sparten" id="awSparten">
    <h2>Sparten im Vergleich</h2>
    <div class="aw-tabelle-rahmen"><table class="aw-tabelle aw-vergleich"><thead><tr><th></th>${SPARTEN_KEYS.map((s) => `<th class="aw-kopf-${s}">${esc(SPARTEN[s].label)}</th>`).join('')}<th>Gesamt</th></tr></thead><tbody>
      ${zeilen.map(([titel, wert, gesamt]) => `<tr><td>${esc(titel)}</td>${SPARTEN_KEYS.map((s) => `<td>${wert(s)}</td>`).join('')}<td><b>${esc(gesamt)}</b></td></tr>`).join('')}
    </tbody></table></div>
    <p class="hinweis klein">▲ ▼ = besser oder schlechter als im Vergleichszeitraum. „Überfällig“: offene Termine und Wiedervorlagen vor heute.</p>
  </section>`;
}

/** Aufgeklappter Zustand der Details bleibt beim Umschalten erhalten (nur Ansicht, nichts gespeichert). */
let detailsOffen = false;

export function render(el: HTMLElement, params: URLSearchParams) {
  const p = (n: string) => params.get(n) || '';
  const bereich: Bereich = p('bereich') in BEREICHE ? p('bereich') as Bereich : 'alle';
  const periode: Periode = p('periode') in PERIODEN ? p('periode') as Periode : 'monat';
  const heute = tagVon(new Date());
  const anker = /^\d{4}-\d{2}-\d{2}$/.test(p('datum')) ? p('datum') : heute;
  const neu = (b: Bereich, pe: Periode, dt: string) => {
    const q = new URLSearchParams({ bereich: b, periode: pe, datum: dt });
    history.replaceState(null, '', `#/auswertung?${q}`);
    render(el, q);
  };
  const data = store.getData();
  const ber = bericht(data, bereich, periode, anker, heute);
  const { jetzt, vorher, vt, vtVorher } = ber;
  const fokus = fokusBericht(data, periode, anker);
  const meinAnteil = bereich === 'alle' ? null : fokus.sparten.find((x) => x.sparte === bereich)!;
  const nachfassen = nachfassListe(data, bereich, heute);
  const kundeVon = (id: string) => { const k = data.kunden.find((x) => x.id === id); return k ? kundenTitel(k) : null; };
  const jeSparte = bereich === 'alle' ? Object.fromEntries(SPARTEN_KEYS.map((s) => [s, bericht(data, s, periode, anker, heute)])) as Record<Sparte, Bericht> : null;
  const ueberfaellig = Object.fromEntries(SPARTEN_KEYS.map((s) => [s, nachfassen.ueberfaellig.filter((e) => e.sparte === s).length])) as Record<Sparte, number>;

  const max = Math.max(1, ...jetzt.verlauf.map((v) => v.wert));
  const ergebnisse = (Object.keys(AUSGANG) as Ausgang[]).filter((a) => jetzt.ergebnisse[a] || vorher.ergebnisse[a]);
  const mehr = PERIODEN_REIHE.filter((x) => !PERIODEN_HAUPT.includes(x));
  const kurzVergleich = ber.laufend ? ber.vergleich.replace(' (gleich viele Tage)', '') : 'Vorzeitraum';

  el.innerHTML = `
    <header class="seitenkopf">
      <h1>${maskottchen('statistik', 'titel-bild')} Auswertungen</h1>
      <button type="button" class="btn" id="awPdf">PDF-Bericht</button>
    </header>
    <nav class="tabs aw-bereiche" aria-label="Bereich">${(Object.keys(BEREICHE) as Bereich[]).map((b) => `<button type="button" data-bereich="${b}" class="bereich-${b}${b === bereich ? ' aktiv' : ''}">${BEREICHE[b]}</button>`).join('')}</nav>
    <div class="aw-leiste">
      <div class="segment aw-perioden" role="group" aria-label="Zeitraum">${PERIODEN_HAUPT.map((pe) => `<button type="button" data-periode="${pe}" class="${pe === periode ? 'aktiv' : ''}" title="${PERIODEN[pe]}" aria-pressed="${pe === periode}">${PERIODE_KURZ[pe]}</button>`).join('')}</div>
      <select id="awMehr" class="aw-mehr${mehr.includes(periode) ? ' aktiv' : ''}" aria-label="Weitere Zeiträume">
        <option value="">Mehr …</option>${mehr.map((pe) => `<option value="${pe}"${pe === periode ? ' selected' : ''}>${PERIODEN[pe]}</option>`).join('')}
      </select>
      <div class="k-nav"><button type="button" class="btn klein ghost" data-schritt="-1" aria-label="Voriger Zeitraum">‹</button>${anker !== heute ? '<button type="button" class="btn klein ghost" data-schritt="0">Heute</button>' : ''}<button type="button" class="btn klein ghost" data-schritt="1" aria-label="Nächster Zeitraum">›</button></div>
    </div>
    <section class="karte-box aw-kopf bereich-${bereich}">
      <h2>${esc(ber.zeitraum.titel)}</h2>
      <p class="hinweis">${esc(BEREICHE[bereich])}${ber.laufend ? ` · bis heute` : ''} · verglichen mit ${esc(ber.vergleich)}</p>
      ${meinAnteil && fokus.gesamt ? `<p class="aw-mein-anteil">Anteil an allem, was du in diesem Zeitraum gemacht hast: <b>${anteilText(meinAnteil.anteil)}</b>${meinAnteil.deltaPkt !== null ? ` (${pkt(meinAnteil.deltaPkt)})` : ''}${meinAnteil.vernachlaessigt ? ' · ⚠️ kam zu kurz' : ''}</p>` : ''}
    </section>
    <div class="aw-kern">
      ${kernHtml('Abschlüsse', String(vt.abschluesse), veraenderung(vt.abschluesse, vtVorher.abschluesse), String(vtVorher.abschluesse), `Status auf „Abschluss“ gewechselt · ${kurzVergleich}: ${vtVorher.abschluesse}`, 'abschluesse')}
      ${kernHtml('Abschlussquote', prozent(vt.quote), veraenderung(vt.quote, vtVorher.quote, true), prozent(vtVorher.quote), vt.quote === null ? 'Noch keine Chance entschieden' : `${vt.abschluesse} von ${vt.abschluesse + vt.verloren} entschiedenen Chancen gewonnen`, 'quote')}
      ${kernHtml('Offene Chancen', String(vt.offen), veraenderung(vt.offen, vtVorher.offen), String(vtVorher.offen), `${vt.offenJe.interesse} Interesse · ${vt.offenJe.termin} Termin · ${vt.offenJe.angebot} Angebot`, 'offen')}
      ${kernHtml('Gespräche', String(jetzt.gespraeche), veraenderung(jetzt.gespraeche, vorher.gespraeche), String(vorher.gespraeche), `${jetzt.erreicht} erreicht${jetzt.telefon || jetzt.hausbesuch ? ` · ${jetzt.telefon} Telefon · ${jetzt.hausbesuch} vor Ort` : ''}`, 'gespraeche')}
    </div>
    <div class="aw-zwei">
      <section class="karte-box aw-trichter-box" id="awTrichter">
        <h2>Verkaufstrichter</h2>
        <p class="hinweis klein">Wie viele Kunden kamen in diesem Zeitraum bis zu welcher Stufe – und wo bleiben sie hängen?</p>
        ${trichterHtml(vt.trichter, bereich)}
      </section>
      <section class="karte-box aw-nf-box" id="awNachfassen">
        <h2>Jetzt nachfassen</h2>
        <p class="hinweis klein">Stand heute, sortiert nach Dringlichkeit. Tippen öffnet den Kunden, 📞 ruft an, 💬 startet das Gespräch.</p>
        ${nachfassHtml(nachfassen, kundeVon)}
      </section>
    </div>
    ${jeSparte ? spartenHtml(jeSparte, fokus, ueberfaellig, jetzt.gespraeche) : ''}
    <details class="aw-details karte-box" id="awDetails"${detailsOffen ? ' open' : ''}>
      <summary><h2>Aktivität im Detail</h2><span class="hinweis klein">Weitere Kennzahlen, Gespräche im Verlauf${bereich === 'alle' ? ', Fokus je Sparte' : ''}, Ergebnisse, meistgefragte Produkte</span></summary>
      <div class="aw-zahlen">${zahlenFuer(bereich).map((z) => {
    const v = veraenderung(z.wert(jetzt), z.wert(vorher), z.quote);
    return `<div class="aw-zahl">
        <span class="aw-titel">${z.titel}</span>
        <strong>${anzeigen(z, jetzt)}</strong>
        ${v ? `<span class="aw-delta ${v.richtung}" title="Vergleich: ${anzeigen(z, vorher)}"><span class="aw-pfeil" aria-hidden="true">${PFEIL[v.richtung]}</span> ${v.text}${v.prozent ? ` <span class="aw-prozent">(${v.prozent})</span>` : ''}<span class="sr-only"> ${RICHTUNG[v.richtung]}, vorher ${anzeigen(z, vorher)}</span></span>` : '<span class="aw-delta gleich">–</span>'}
        ${z.sub ? `<small>${esc(z.sub(jetzt))}</small>` : ''}
      </div>`;
  }).join('')}</div>
      <section class="aw-unter">
        <h3>Gespräche im Verlauf</h3>
        ${jetzt.gespraeche ? verlaufHtml(jetzt.verlauf, bereich, max) : '<p class="hinweis">In diesem Zeitraum gibt es keine Gespräche.</p>'}
      </section>
      ${bereich === 'alle' ? fokusHtml(fokus) : ''}
      ${jetzt.topProdukte.length ? `<section class="aw-unter">
        <h3>Meistgefragte Produkte</h3>
        <table class="aw-tabelle"><thead><tr><th>Produkt</th><th>Interesse</th></tr></thead><tbody>
          ${jetzt.topProdukte.map((x) => `<tr><td>${esc(x.name)}</td><td>${x.anzahl}</td></tr>`).join('')}
        </tbody></table>
      </section>` : ''}
      <section class="aw-unter">
        <h3>Ergebnisse der Gespräche</h3>
        ${ergebnisse.length ? `<table class="aw-tabelle"><thead><tr><th>Ergebnis</th><th>Jetzt</th><th>Vergleich</th></tr></thead><tbody>
          ${ergebnisse.map((a) => `<tr><td>${esc(AUSGANG[a])}</td><td>${jetzt.ergebnisse[a]}</td><td>${vorher.ergebnisse[a]}</td></tr>`).join('')}
        </tbody></table>` : '<p class="hinweis">Noch keine Gespräche mit Ergebnis in diesem oder dem vorigen Zeitraum.</p>'}
      </section>
    </details>`;

  el.querySelector('.aw-bereiche')!.addEventListener('click', (e) => { const b = (e.target as Element).closest('[data-bereich]'); if (b) neu(b.dataset.bereich as Bereich, periode, anker); });
  el.querySelector('.segment')!.addEventListener('click', (e) => { const b = (e.target as Element).closest('[data-periode]'); if (b) neu(bereich, b.dataset.periode as Periode, anker); });
  el.querySelector('#awMehr')!.addEventListener('change', (e) => { const v = (e.target as HTMLSelectElement).value; if (v in PERIODEN) neu(bereich, v as Periode, anker); });
  el.querySelector('.k-nav')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('[data-schritt]');
    if (!b) return;
    const n = Number(b.dataset.schritt);
    neu(bereich, periode, n === 0 ? heute : verschieben(periode, anker, n));
  });
  el.querySelector('#awNachfassen')?.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-aw-anrufen]');
    const k = b ? store.findKunde(b.dataset.awAnrufen || '') : null;
    if (k) anrufen(kundenTitel(k), k.telefon);
  });
  el.querySelector('#awDetails')!.addEventListener('toggle', (e) => { detailsOffen = (e.target as HTMLDetailsElement).open; });
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
  doc.text(`${ber.laufend ? 'Stand heute · ' : ''}Vergleich: ${ber.vergleich} · erstellt am ${new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}`, R, y); y += 10;
  doc.setTextColor(0);

  // Immer genau eine Seite: Zeilenhöhe und Schrift schrumpfen, wenn es viele Zeilen sind.
  const kennzahlVer = zahlenFuer(ber.bereich).map((z) => veraenderung(z.wert(ber.jetzt), z.wert(ber.vorher), z.quote));
  const kennzahlZeilen = zahlenFuer(ber.bereich).map((z, i) => [
    z.titel, anzeigen(z, ber.jetzt), anzeigen(z, ber.vorher), ansi(veraenderungText(kennzahlVer[i]!)),
  ]);
  const erg = (Object.keys(AUSGANG) as Ausgang[]).filter((a) => ber.jetzt.ergebnisse[a] || ber.vorher.ergebnisse[a]);
  const top = ber.jetzt.topProdukte;
  const unten = 287;
  const diagramm = ber.jetzt.gespraeche ? 6 + 34 + 6 + (ber.bereich === 'alle' ? 6 : 0) : 0;
  const zweiSpalten = Math.max(erg.length, top.length);
  const zeilen = kennzahlZeilen.length + 1 + (zweiSpalten ? zweiSpalten + 1 : 0);
  const mitFokus = !!fokus && fokus.gesamt > 0;
  const fokusHoehe = mitFokus ? 6 + 6 + 5 + (fokus!.tipp ? 10 : 0) + 4 : 0;
  const trichterHoehe = ber.vt.trichter.stufen[0]!.anzahl ? 6 + 5 * 5.2 + (ber.vt.trichter.tipp ? 13.6 : 0) + 3 : 0;
  const fest = 6 + 22 + trichterHoehe + (zweiSpalten ? 7 + 6 : 0) + diagramm + fokusHoehe;
  const zh = Math.max(3.6, Math.min(6, (unten - y - fest) / Math.max(1, zeilen)));
  const fs = Math.max(7, Math.min(10, zh * 1.7));

  const tabelle = (kopf: string[], reihe: string[][], sp: number[], bis: number, farbe?: (zeile: number, spalte: number) => [number, number, number] | null) => {
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
    reihe.forEach((z, n) => { z.forEach((t, i) => { if (!t) return; const f = farbe?.(n, i); if (f) doc.setTextColor(...f); doc.text(passend(t, (sp[i + 1] ?? bis) - sp[i]! - 2), sp[i]!, yy); if (f) doc.setTextColor(0); }); yy += zh; });
    return yy;
  };
  // Vier Kernzahlen als Kästen
  {
    const { vt, vtVorher, jetzt, vorher } = ber;
    const kern: [string, string, ReturnType<typeof veraenderung>][] = [
      ['Abschlüsse', String(vt.abschluesse), veraenderung(vt.abschluesse, vtVorher.abschluesse)],
      ['Abschlussquote', prozent(vt.quote), veraenderung(vt.quote, vtVorher.quote, true)],
      ['Offene Chancen', String(vt.offen), veraenderung(vt.offen, vtVorher.offen)],
      ['Gespräche', String(jetzt.gespraeche), veraenderung(jetzt.gespraeche, vorher.gespraeche)],
    ];
    const bw = (B - 2 * R - 9) / 4;
    kern.forEach(([titel, wert, v], i) => {
      const x = R + i * (bw + 3);
      doc.setDrawColor(200); doc.setFillColor(246, 249, 243); doc.roundedRect(x, y - 4, bw, 18, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90); doc.text(titel, x + 3, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(0); doc.text(wert, x + 3, y + 7);
      if (v) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...PDF_RICHTUNG[v.richtung]); doc.text(ansi(v.text), x + 3, y + 12); doc.setTextColor(0); }
    });
    y += 22;
  }
  // Verkaufstrichter: fünf Balken, Quote daneben
  if (trichterHoehe) {
    const t = ber.vt.trichter; const maxT = Math.max(1, t.stufen[0]!.anzahl);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(Math.min(12, fs + 2)); doc.text('Verkaufstrichter', R, y); y += 5;
    const bx = R + 26; const bw = 100;
    t.stufen.forEach((x, i) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(STUFEN_LABEL[x.stufe], R, y + 0.5);
      const w = Math.max(1.5, (bw * x.anzahl) / maxT); let px = bx + (bw - w) / 2;
      const teile = ber.bereich === 'alle' ? SPARTEN_KEYS.filter((s) => x.je[s]) : [ber.bereich as Sparte];
      const summe = ber.bereich === 'alle' ? x.anzahl : 1;
      for (const s of teile) { const tw = ber.bereich === 'alle' ? (w * x.je[s]) / Math.max(1, summe) : w; doc.setFillColor(...PDF_FARBE[s]); doc.rect(px, y - 3, tw, 4, 'F'); px += tw; }
      doc.setFont('helvetica', 'bold'); doc.text(String(x.anzahl), bx + bw + 3, y + 0.5);
      const q = t.quoten[i];
      if (i < t.quoten.length) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        if (t.schwach === i) doc.setTextColor(180, 45, 45); else doc.setTextColor(110);
        doc.text(q === null ? '' : `${Math.round(q * 100)} % weiter${t.schwach === i ? ' (schwächste Stufe)' : ''}`, bx + bw + 14, y + 3);
        doc.setTextColor(0);
      }
      y += 5.2;
    });
    if (t.tipp) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      const z = doc.splitTextToSize(ansi(`Tipp: ${t.tipp}`), B - 2 * R).slice(0, 3);
      doc.text(z, R, y + 1); y += 4.2 * z.length + 1;
    }
    y += 3;
  }
  y = tabelle(['Kennzahl', 'Jetzt', 'Vergleich', 'Veränderung (%)'], kennzahlZeilen, [R, R + 88, R + 110, R + 132], B - R,
    (n, i) => (i === 3 && kennzahlVer[n] ? PDF_RICHTUNG[kennzahlVer[n]!.richtung] : null)) + 4;
  if (zweiSpalten) {
    const mitte = R + 90;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(Math.min(12, fs + 2));
    if (erg.length) doc.text('Ergebnisse der Gespräche', R, y);
    if (top.length) doc.text('Meistgefragte Produkte', mitte, y);
    y += 6;
    const y0 = y;
    let yl = y; let yr = y;
    if (erg.length) yl = tabelle(['Ergebnis', 'Jetzt', 'Vergleich'], erg.map((a) => [AUSGANG[a], String(ber.jetzt.ergebnisse[a]), String(ber.vorher.ergebnisse[a])]), [R, R + 56, R + 72], mitte - 6);
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
