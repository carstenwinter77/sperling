// Gesprächsleitfaden: im laufenden Gespräch ein digitales Klemmbrett (Antworten festhalten, Kartei-Felder
// direkt ausfüllen, Einwand-Fenster), ohne Gespräch ein Spickzettel zum Nachschlagen mit Einwandbehandlung.
// Gespeichert wird je Sparte eine EIGENE Notiz (R-TEXT: nie Sparten mischen).
import * as schnellwahl from '../schnellwahl.ts';
import * as kundenwahl from '../kundenwahl.ts';
import { esc, nowIso, formatDate, formatDateTime, localInputToIso } from '../../core/util.ts';
import { SPARTEN, SPARTEN_KEYS, kundenTitel, neueNotiz, neuerTermin, normalizeGespraech, normalizeEnpalKontakt, KONTAKTART, kundenName, adresseEinzeilig, STATUS, AUSGANG, type Sparte, type StatusKey, type Kunde } from '../../core/model.ts';
import { LEITFADEN, UEBERLEITUNG, ERGEBNIS, TECHNIKEN, gespraechsNotiz } from '../../core/einwaende.ts';
import { KLEMMBRETT, IMPULS, MAX_ANTWORT, abschnitte, punktId, punktLabel, erledigt, stand, antwortSetzen, optionUmschalten, optionGewaehlt, freiAnteil, mitFreitext, leereAntworten, GERAET_DALASSEN, istGeraetPunkt, geraeteFuerKunde, type Antworten, type Punkt, type AntwortPunkt } from '../../core/klemmbrett.ts';
import { FELDER } from '../../core/model.ts';
import { bindeFelder } from './kunde.ts';
import * as store from '../../storage/store.ts';
import { maskottchen, toast, dialog } from '../dom.ts';
import { verleihDialog } from './bestand.ts';
import * as leihschein from '../leihschein.ts';
import { spartenIcon, statusOptions } from '../parts.ts';
import * as ablauf from '../gespraechsablauf.ts';

/** Letztes Ergebnis eines Einwands aus früheren Gesprächen dieser Sparte. */
function frueher(k, sparte, einwandId) {
  if (!k) return null;
  const g = [...k.gespraeche].filter((x) => x.sparte === sparte).sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? 1 : -1));
  for (const x of g) { const e = x.einwaende.find((y) => y.id === einwandId); if (e) return e.ergebnis; }
  return null;
}

/** Letztes Gespräch (dieser Sparte), in dem der Einwand vorkam, samt Ergebnis. */
function frueherDetail(k, sparte, einwandId) {
  if (!k) return null;
  const g = [...k.gespraeche].filter((x) => x.sparte === sparte).sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? 1 : -1));
  for (const x of g) { const e = x.einwaende.find((y) => y.id === einwandId); if (e) return { gespraech: x, einwand: e }; }
  return null;
}

/** Erinnerungs-Hinweis, wenn derselbe Einwand schon einmal kam (Folgegespräch). */
function erinnerungHtml(k, sparte, einwand) {
  const f = frueherDetail(k, sparte, einwand.id);
  if (!f) return '';
  const { gespraech: g, einwand: e } = f;
  const datum = formatDateTime(g.zeitpunkt).slice(0, 10);
  const satz = e.ergebnis === 'ueberzeugt'
    ? `„Das hatten wir am ${datum} schon einmal besprochen, und damals war der Punkt für Sie geklärt. Was hat sich seitdem für Sie geändert?“`
    : `„Diesen Punkt hatten Sie am ${datum} schon angesprochen. Lassen Sie uns ihn heute gemeinsam endgültig klären, damit er Sie nicht weiter beschäftigt.“`;
  return `
    <div class="schon-mal">
      <strong>Schon einmal besprochen am ${esc(datum)}</strong>
      <p>Ergebnis damals: <b>${esc(ERGEBNIS[e.ergebnis])}</b> · Gespräch endete mit: <b>${esc(AUSGANG[g.ausgang] || '–')}</b>${g.naechsterSchritt ? ` · vereinbart: ${esc(g.naechsterSchritt)}` : ''}</p>
      ${g.notiz ? `<p class="hinweis">Notiz damals: ${esc(g.notiz)}</p>` : ''}
      <p class="schon-mal-satz"><span>Daran erinnern:</span> ${esc(satz)}</p>
      ${e.ergebnis === 'ueberzeugt' ? `<p class="hinweis">Damals überzeugt hat vermutlich: ${esc(einwand.antworten[0])}</p>` : ''}
      <p class="hinweis">Besteht der Kunde trotzdem darauf, geht es unten mit der Einwandbehandlung weiter.</p>
    </div>`;
}

/** Kurzüberblick der bisherigen Gespräche in dieser Sparte. */
function bisherHtml(k, sparte) {
  const g = k.gespraeche.filter((x) => x.sparte === sparte).sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? 1 : -1)).slice(0, 3);
  if (!g.length) return '<p class="hinweis">Mit diesem Kunden gab es zu dieser Sparte noch kein erfasstes Gespräch.</p>';
  return `<div class="bisher"><h3>Bisherige Gespräche</h3>${g.map((x) => `
    <div class="bisher-eintrag"><b>${esc(formatDateTime(x.zeitpunkt))}</b> · ${esc(AUSGANG[x.ausgang] || '–')}${x.naechsterSchritt ? ` · nächster Schritt: ${esc(x.naechsterSchritt)}` : ''}
    ${x.einwaende.length ? `<br><small>${x.einwaende.map((e) => `„${esc(e.text)}“ → ${esc(ERGEBNIS[e.ergebnis])}`).join(' · ')}</small>` : ''}</div>`).join('')}</div>`;
}

/** Eingebettet im laufenden Gespräch: Klemmbrett mit Eingaben; Antworten, Notiz und Einwände landen im Entwurf. */
export interface Einbettung {
  entwurf: ablauf.Entwurf;
  onSparte?: (s: Sparte) => void;
  onEinwand?: () => void;
  /** Ein Kartei-Feld wurde vom Klemmbrett aus geändert */
  onFeld?: () => void;
}

const ruhig = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function render(el: HTMLElement, params: URLSearchParams, _teile: string[] = [], einb: Einbettung | null = null) {
  const d = store.getData();
  const p = (n: string) => params.get(n) || '';
  const ent = einb?.entwurf || null;
  const zustand = {
    kundeId: ent ? ent.kundeId : (d.kunden.some((k) => k.id === p('kunde')) ? p('kunde') : ''),
    sparte: (ent ? ent.leitfadenSparte : (p('sparte') in SPARTEN ? p('sparte') : 'pv')) as Sparte,
    // einwandId -> 'offen' | 'ueberzeugt' | 'bleibt'
    verlauf: ent ? ent.verlauf : ablauf.leererVerlauf(),
    offenerEinwand: null as string | null,
    /** Einwände, bei denen die Rückfrage gestellt und die Antwort aufgedeckt ist */
    aufgedeckt: new Set<string>(),
  };
  const antworten: Antworten = ent ? (ent.antworten ||= leereAntworten()) : leereAntworten();
  // aus der Suche: Einwand direkt aufschlagen (nur nachschlagen, nichts wird angetippt)
  if (!einb && LEITFADEN[zustand.sparte]?.einwaende.some((x) => x.id === p('einwand'))) {
    zustand.offenerEinwand = p('einwand');
    zustand.aufgedeckt.add(p('einwand'));
  }

  const tabs = `<nav class="tabs" id="gTabs">${SPARTEN_KEYS.map((s) => `<button data-sparte="${s}" class="${s === zustand.sparte ? 'aktiv' : ''}">${esc(SPARTEN[s].label)}</button>`).join('')}</nav>`;
  el.innerHTML = einb ? `
    ${tabs}
    <div id="gInhalt"></div>
    <button type="button" class="gk-einwand-knopf" id="gkEinwand" aria-haspopup="dialog">💬 Einwand<span class="gk-badge" id="gkBadge" hidden></span></button>
    <div class="gk-sheet" id="gkSheet" hidden>
      <div class="gk-sheet-hg" data-zu></div>
      <div class="gk-sheet-inhalt" role="dialog" aria-modal="true" aria-labelledby="gkSheetTitel">
        <div class="gk-sheet-kopf"><h2 id="gkSheetTitel">Einwand</h2><button type="button" class="btn primary klein" data-zu>Zurück zum Gespräch</button></div>
        <div id="gkSheetInhalt"></div>
      </div>
    </div>` : `
    <header class="seitenkopf">
      <h1>${maskottchen('notizen', 'titel-bild')} Gesprächsleitfaden</h1>
      <a class="btn ghost" href="#/produkte">🏷️ Produkte</a>
    </header>
    <section class="karte-box">
      ${kundenwahl.html('gKunde', 'Gespräch mit', zustand.kundeId, { id: 'gKunde', leerText: '– ohne Kunde (nur nachschlagen) –' })}
    </section>
    ${tabs}
    <div id="gInhalt"></div>
    <section class="karte-box" id="gSpeichern"></section>`;

  const inhalt = el.querySelector('#gInhalt');
  const sheet = el.querySelector<HTMLElement>('#gkSheet');
  const sheetInhalt = el.querySelector<HTMLElement>('#gkSheetInhalt');
  const fe = () => store.getData().einstellungen.felder;
  const kunde = () => (zustand.kundeId ? store.findKunde(zustand.kundeId) : null);

  // ---------- Einwände ----------
  const einwaendeHtml = (s: Sparte, k: Kunde | null) => {
    const l = LEITFADEN[s];
    const v = zustand.verlauf[s];
    const e = l.einwaende.find((x) => x.id === zustand.offenerEinwand);
    const offen = e && !zustand.aufgedeckt.has(e.id) && (!v[e.id] || v[e.id] === 'offen');
    return `
      <div class="einwand-knoepfe">${l.einwaende.map((x) => `<button class="einwand ${v[x.id] ? `e-${v[x.id]}` : ''} ${x.id === zustand.offenerEinwand ? 'aktiv' : ''}" data-einwand="${x.id}">${esc(x.kunde)}${v[x.id] ? `<small>${esc(ERGEBNIS[v[x.id]])}</small>` : (frueher(k, s, x.id) ? `<small class="frueher">früher: ${esc(ERGEBNIS[frueher(k, s, x.id)])}</small>` : '')}</button>`).join('')}</div>
      ${e ? `
      <div class="antwort gl-antwort" id="antwort">
        <p class="zitat">„${esc(e.kunde)}“</p>
        ${erinnerungHtml(k, s, e)}
        <p class="technik">${esc(TECHNIKEN[e.technik] || '')}</p>
        <ol class="schritte">
          <li class="gl-stufe"><span>1 · Auffangen</span><p>${esc(e.auffangen)}</p></li>
          <li class="gl-stufe schritt-rueckfrage"><span>2 · Rückfrage: Was steckt dahinter?</span><p>${esc(e.isolieren)}</p></li>
          ${offen ? '<li class="gl-stufe"><button type="button" class="btn gl-aufdecken" id="gAufdecken">Rückfrage gestellt · Antwort zeigen ›</button></li>' : `
          <li class="gl-stufe gl-aufklappen"><span>3 · Antworten</span><ul class="argumente">${e.antworten.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></li>
          <li class="gl-stufe gl-aufklappen schritt-abschluss"><span>4 · Nächster Schritt</span><p>${esc(e.abschluss)}</p></li>`}
        </ol>
        <p class="gk-frage-titel">Wie ging es aus?</p>
        <div class="knopfreihe">
          ${Object.entries(ERGEBNIS).map(([key, lbl]) => `<button class="btn klein ${v[e.id] === key ? 'primary' : ''}" data-ergebnis="${key}">${esc(lbl)}</button>`).join('')}
        </div>
      </div>` : ''}`;
  };

  const ueberleitungHtml = (s: Sparte) => Object.entries(UEBERLEITUNG[s]).map(([ziel, satz]) => `
        <div class="ueberleitung">
          ${maskottchen(spartenIcon(ziel), 'mini')}
          <div><b>${esc(SPARTEN[ziel as Sparte].label)}</b><p>${esc(satz)}</p></div>
          <button class="btn klein ghost" data-wechsel="${ziel}">${einb ? 'Klemmbrett' : 'Leitfaden'} ${esc(SPARTEN[ziel as Sparte].kurz)}</button>
        </div>`).join('');

  // ---------- Klemmbrett (im Gespräch) ----------
  const chip = (attr: string, wert: string, an: boolean, label = wert) =>
    `<button type="button" class="chip-wahl gk-chip ${an ? 'aktiv' : ''}" ${attr} data-wert="${esc(wert)}" aria-pressed="${an}">${esc(label)}</button>`;

  const eingabeHtml = (s: Sparte, pk: Punkt, k: Kunde | null) => {
    if (pk.art === 'antwort') {
      const wert = antworten[s][pk.id] || '';
      const opts = pk.optionen || [];
      return `${opts.length ? `<div class="gk-chips">${opts.map((o) => chip(`data-awahl="${esc(pk.id)}"`, o, optionGewaehlt(wert, o))).join('')}</div>` : ''}
        <input class="gk-text" data-antwort="${esc(pk.id)}" maxlength="${MAX_ANTWORT}" value="${esc(freiAnteil(wert, opts))}" placeholder="${opts.length ? 'oder eigene Antwort …' : 'Antwort des Kunden …'}" enterkeyhint="done">`;
    }
    const f = FELDER[s].find((x) => x.key === pk.key)!;
    const wert = (k?.[s] as Record<string, unknown> | undefined)?.[pk.key];
    const pfad = `${s}.${pk.key}`;
    if (f.type === 'select') return `<div class="gk-chips">${(f.options || []).map((o) => chip(`data-fwahl="${pfad}"`, o, wert === o)).join('')}</div>`;
    if (f.type === 'bool') return `<div class="gk-chips">${chip(`data-fwahl="${pfad}" data-typ="bool"`, 'ja', wert === true)}${chip(`data-fwahl="${pfad}" data-typ="bool"`, 'nein', wert === false)}</div>`;
    if (f.type === 'number') return `<span class="gk-zahl"><input class="gk-text" data-feld="${pfad}" data-typ="number" inputmode="decimal" value="${wert === null || wert === undefined || wert === '' ? '' : esc(String(wert).replace('.', ','))}">${f.unit ? `<span>${esc(f.unit)}</span>` : ''}</span>`;
    return `<input class="gk-text" data-feld="${pfad}" value="${esc(typeof wert === 'string' ? wert : '')}" enterkeyhint="done">`;
  };

  // Vorwerk „Gerät dalassen“: Gerät aus dem Vorführbestand wählen, Übergabe mit Unterschrift (Leihschein)
  const geraeteHtml = () => {
    if (!optionGewaehlt(antworten.vorwerk.schritt || '', GERAET_DALASSEN) || !zustand.kundeId) return '';
    const { verliehen, frei } = geraeteFuerKunde(store.getData(), zustand.kundeId);
    const da = verliehen.map(({ leihe, name }) => `
        <p class="gk-geraet-da"><span>✓ <b>${esc(name)}</b> übergeben am ${esc(formatDate(leihe.ausgabe))}${leihe.rueckgabeGeplant ? `, zurück bis ${esc(formatDate(leihe.rueckgabeGeplant))}` : ''}${leihe.unterschriftAusgabe ? ' · unterschrieben' : ''}</span>
        <button type="button" class="btn klein ghost" data-gk-schein="${esc(leihe.id)}">📄 Leihschein</button></p>`).join('');
    const wahl = frei.length
      ? `<p class="gk-geraet-titel">${verliehen.length ? 'Noch ein Gerät dalassen?' : 'Welches Gerät bleibt hier?'}</p>
        <div class="gk-chips">${frei.map((g) => `<button type="button" class="chip-wahl gk-chip" data-gk-leihen="${esc(g.id)}">${esc(g.name)}</button>`).join('')}</div>
        <p class="gk-frage">Danach: Rückgabedatum wählen, Kunde unterschreibt auf dem Tablet, Leihschein als PDF.</p>`
      : `<p class="hinweis">Kein freies Vorführgerät im Bestand. <a href="#/bestand">Zum Bestand</a></p>`;
    return da + wahl;
  };
  /** Scrollt so, dass die Geräte-Box wieder an derselben Bildschirmstelle steht (auch nach dem Leihschein-Fenster). */
  const zuruecksetzen = (top: number) => {
    const ausrichten = () => {
      const box = inhalt.querySelector<HTMLElement>('[data-gk-geraete]');
      if (!box) return;
      let d = box.getBoundingClientRect().top - top;
      for (let x: HTMLElement | null = box.parentElement; x && Math.abs(d) > 1; x = x.parentElement) {
        if (x.scrollHeight > x.clientHeight && /auto|scroll/.test(getComputedStyle(x).overflowY)) { const vorher = x.scrollTop; x.scrollTop += d; d -= x.scrollTop - vorher; }
      }
      if (Math.abs(d) > 1) window.scrollBy(0, d);
      box.querySelectorAll('.gk-geraet-da').forEach((z) => { z.classList.remove('gk-pop'); void (z as HTMLElement).offsetWidth; z.classList.add('gk-pop'); });
    };
    ausrichten();
    // Das Leihschein-Fenster öffnet sich gleich danach; nach dem Schließen noch einmal ausrichten
    const warten = (n: number) => requestAnimationFrame(() => (document.querySelector('dialog[open]') && n < 20000 ? warten(n + 1) : setTimeout(ausrichten, 50)));
    setTimeout(() => warten(0), 300);
  };
  const geraeteNeu = () => { const box = inhalt.querySelector<HTMLElement>('[data-gk-geraete]'); if (box) box.innerHTML = geraeteHtml(); };

  const punktHtml = (s: Sparte, pk: Punkt, k: Kunde | null) => `
    <div class="gk-punkt ${erledigt(s, pk, k, antworten) ? 'erledigt' : ''}" data-pid="${esc(punktId(s, pk))}">
      <div class="gk-kopf"><span class="gk-haken" aria-hidden="true"></span><span class="gk-label">${esc(punktLabel(s, pk))}</span></div>
      <div class="gk-eingabe">${eingabeHtml(s, pk, k)}</div>
      <p class="gk-frage">„${esc(pk.frage)}“</p>
      ${istGeraetPunkt(s, pk) ? `<div class="gk-geraete" data-gk-geraete>${geraeteHtml()}</div>` : ''}
    </div>`;

  const ringHtml = (st: { erledigt: number; gesamt: number }) =>
    `<div class="gk-ring" id="gkRing" style="--anteil:${st.gesamt ? st.erledigt / st.gesamt : 0}" role="img" aria-label="${st.erledigt} von ${st.gesamt} Punkten erfasst"><span>${st.erledigt}<small>/${st.gesamt}</small></span></div>`;

  const klemmbrettZeichnen = () => {
    const s = zustand.sparte;
    const k = kunde();
    const st = stand(s, k, antworten, fe());
    const abs = abschnitte(s, fe());
    const anzEinwaende = Object.keys(zustand.verlauf[s]).length;
    inhalt.innerHTML = `
      <section class="karte-box gk bereich-${s}">
        <div class="gk-titel">
          <h2>${maskottchen(spartenIcon(s), 'titel-bild')} ${esc(SPARTEN[s].label)} <small>· ${esc(SPARTEN[s].anbieter)}${k ? ` · ${esc(STATUS[k.status[s]].label)}` : ''}</small></h2>
          ${ringHtml(st)}
        </div>
        <div class="gk-art segment" role="group" aria-label="Kontaktart">${Object.entries(KONTAKTART).map(([key, v]) => `<button type="button" data-art="${key}" class="${ent!.kontaktart === key ? 'aktiv' : ''}">${esc(v.replace('Telefonische Kontaktaufnahme', 'Telefonat').replace('Sonstiger Kontakt', 'Sonstiges'))}</button>`).join('')}</div>
        <details class="gk-vorb" ${st.erledigt === 0 && !anzEinwaende ? 'open' : ''}>
          <summary><b>Vorbereitung</b> <small>was schon bekannt ist, was noch fehlt</small></summary>
          ${k ? bisherHtml(k, s) : ''}
          ${st.offen.length ? `<p class="gk-offen"><b>Heute noch klären:</b> ${st.offen.slice(0, 10).map((o) => `<span class="pill">${esc(o)}</span>`).join(' ')}${st.offen.length > 10 ? ` <small>+${st.offen.length - 10}</small>` : ''}</p>` : '<p class="hinweis">Alles Wichtige ist schon erfasst.</p>'}
        </details>
        ${abs.map((ab) => {
    const sa = stand(s, k, antworten, fe(), ab.id);
    return `
        <section class="gk-abschnitt" data-abschnitt="${ab.id}">
          <h3>${esc(ab.titel)} <small class="gk-zaehler ${sa.erledigt === sa.gesamt ? 'voll' : ''}" data-zaehler="${ab.id}">${sa.erledigt}/${sa.gesamt}</small></h3>
          <p class="gk-hinweis">${esc(ab.hinweis)}</p>
          ${ab.id === 'bedarf' ? `<p class="gl-impuls"><b>Denkanstoß</b> ${esc(IMPULS[s])}</p>` : ''}
          <div class="gk-punkte">${ab.punkte.map((pk) => punktHtml(s, pk, k)).join('')}</div>
        </section>`;
  }).join('')}
        <section class="gk-abschnitt">
          <h3>Sonstiges</h3>
          <textarea id="gNotiz" rows="3" placeholder="Was sonst noch wichtig ist … Diktieren: ins Feld tippen, dann Mikrofon auf der Tastatur.">${esc(ent!.notiz[s] || '')}</textarea>
          <details class="gk-ueber"><summary>Überleiten zu einem anderen Thema</summary>${ueberleitungHtml(s)}</details>
        </section>
        <div class="gl-weiter">
          <span class="hinweis">Die Antworten kommen beim Speichern in die Notiz ${esc(SPARTEN[s].label)}; Kartei-Felder sind schon gespeichert.</span>
          <button type="button" class="btn primary" data-geh="abschluss">Gespräch abschließen ›</button>
        </div>
      </section>`;
    inhalt.querySelector<HTMLTextAreaElement>('#gNotiz')?.addEventListener('input', (ev) => { ent!.notiz[s] = (ev.target as HTMLTextAreaElement).value; });
    badge();
  };

  /** Haken, Zähler und Ring neu berechnen, ohne neu zu zeichnen (Fokus und Tastatur bleiben). */
  const aktualisieren = () => {
    const s = zustand.sparte;
    const k = kunde();
    for (const ab of abschnitte(s, fe())) {
      for (const pk of ab.punkte) {
        const box = inhalt.querySelector<HTMLElement>(`.gk-punkt[data-pid="${CSS.escape(punktId(s, pk))}"]`);
        if (!box) continue;
        const jetzt = erledigt(s, pk, k, antworten);
        if (jetzt && !box.classList.contains('erledigt')) { box.classList.remove('gk-pop'); void box.offsetWidth; box.classList.add('gk-pop'); }
        box.classList.toggle('erledigt', jetzt);
      }
      const sa = stand(s, k, antworten, fe(), ab.id);
      const z = inhalt.querySelector(`[data-zaehler="${ab.id}"]`);
      if (z) { z.textContent = `${sa.erledigt}/${sa.gesamt}`; z.classList.toggle('voll', sa.erledigt === sa.gesamt); }
    }
    einb?.onEinwand?.(); // Bereich gilt als besprochen
    const ring = inhalt.querySelector('#gkRing');
    if (ring) ring.outerHTML = ringHtml(stand(s, k, antworten, fe()));
  };

  const feldSetzen = (pfad: string, wert: string | boolean | null) => {
    const [s, key] = pfad.split('.') as [Sparte, string];
    store.mutate((data) => {
      const k = data.kunden.find((x) => x.id === zustand.kundeId);
      const bereich = k?.[s] as Record<string, unknown> | undefined;
      if (!k || !bereich || !FELDER[s].some((f) => f.key === key)) return;
      bereich[key] = wert;
      k.updatedAt = nowIso();
    });
    einb?.onFeld?.();
  };

  const badge = () => {
    const b = el.querySelector<HTMLElement>('#gkBadge');
    if (!b) return;
    const n = Object.keys(zustand.verlauf[zustand.sparte]).length;
    b.hidden = !n;
    b.textContent = String(n);
  };

  // ---------- Einwand-Fenster ----------
  const sheetZeichnen = () => {
    if (!sheetInhalt) return;
    sheetInhalt.innerHTML = einwaendeHtml(zustand.sparte, kunde());
    el.querySelector('#gkSheetTitel')!.textContent = `Einwand · ${SPARTEN[zustand.sparte].label}`;
  };
  const sheetAuf = () => {
    if (!sheet) return;
    sheetZeichnen();
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('offen'));
    sheet.querySelector<HTMLElement>('.einwand')?.focus();
  };
  const sheetZu = () => {
    if (!sheet || sheet.hidden) return;
    sheet.classList.remove('offen');
    zustand.offenerEinwand = null;
    window.setTimeout(() => { sheet.hidden = true; }, ruhig() ? 0 : 220);
    badge();
    el.querySelector<HTMLElement>('#gkEinwand')?.focus();
  };
  sheet?.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') sheetZu(); });

  // ---------- Spickzettel (ohne laufendes Gespräch, nur nachschlagen) ----------
  const spickZeichnen = () => {
    const s = zustand.sparte;
    const k = kunde();
    inhalt.innerHTML = `
      <section class="karte-box gk bereich-${s}">
        <h2>${maskottchen(spartenIcon(s), 'titel-bild')} ${esc(LEITFADEN[s].titel)} <small>· ${esc(SPARTEN[s].anbieter)}${k ? ` · ${esc(STATUS[k.status[s]].label)}` : ''}</small></h2>
        ${k ? bisherHtml(k, s) : ''}
        ${abschnitte(s, fe()).map((ab) => `
          <h3>${esc(ab.titel)}</h3>
          ${ab.id === 'bedarf' ? `<p class="gl-impuls"><b>Denkanstoß</b> ${esc(IMPULS[s])}</p>` : ''}
          <ul class="gk-spick">${ab.punkte.map((pk) => `<li><b>${esc(punktLabel(s, pk))}</b> · ${esc(pk.frage)}</li>`).join('')}</ul>`).join('')}
        ${k ? '<p class="hinweis">Tipp: „Mit Kundendaten weiter“ unten öffnet das Klemmbrett zum Ausfüllen.</p>' : ''}
      </section>
      <section class="karte-box">
        <h2>Was sagt der Kunde?</h2>
        ${einwaendeHtml(s, k)}
      </section>
      <section class="karte-box"><h3>Überleiten zu …</h3>${ueberleitungHtml(s)}</section>`;
    speicherBereich();
  };

  const zeichnen = () => { if (einb) klemmbrettZeichnen(); else spickZeichnen(); };
  const einwandNeu = () => { if (einb) sheetZeichnen(); else zeichnen(); };

  const speicherBereich = () => {
    if (einb) return;
    const box = el.querySelector('#gSpeichern');
    const k = zustand.kundeId ? store.findKunde(zustand.kundeId) : null;
    if (!k) { box.innerHTML = '<p class="hinweis">Wähle oben einen Kunden, damit das Gespräch mit Ergebnis beim Kunden hinterlegt wird.</p>'; return; }
    // Abzuschließen sind alle Sparten mit angeklickten Einwänden, mindestens die aktuelle.
    const sparten = SPARTEN_KEYS.filter((s) => Object.keys(zustand.verlauf[s]).length || s === zustand.sparte);
    box.innerHTML = `
      <h2>Gespräch abschließen</h2>
      <p class="hinweis">Das Ergebnis wird beim Kunden unter „Gespräche“ gespeichert, je Sparte getrennt. Zusätzlich entsteht eine Notiz, die nur im passenden Text (Enpal oder Vorwerk) erscheint. Bei Photovoltaik/Wärmepumpe wird außerdem die Enpal-Gesprächsdokumentation angelegt.</p>
      <label class="kontaktart">Wie war der Kontakt?<select id="gKontaktart">${Object.entries(KONTAKTART).map(([key, v]) => `<option value="${key}">${esc(v)}</option>`).join('')}</select></label>
      ${sparten.map((s) => {
    const anzahl = Object.keys(zustand.verlauf[s]).length;
    return `
        <fieldset class="abschluss-sparte" data-abschluss="${s}">
          <legend>${maskottchen(spartenIcon(s), 'mini')} ${esc(SPARTEN[s].label)} <small>${anzahl} Einwand/Einwände</small></legend>
          <div class="formgrid">
            <label>Worauf lief es hinaus?<select name="ausgang"><option value="">– bitte wählen –</option>${Object.entries(AUSGANG).map(([key, v]) => `<option value="${key}">${esc(v)}</option>`).join('')}</select></label>
            <label>Status ${esc(SPARTEN[s].label)}<select name="status">${statusOptions(k.status[s])}</select></label>
            <label>Nächster Schritt<input name="schritt" placeholder="z. B. Angebot rechnen lassen" maxlength="1000"></label>
            <div class="wv-feld"><label>Wiedervorlage / Termin am<input type="datetime-local" name="wv"></label>${schnellwahl.html('wv')}</div>
            <label class="breit">Notiz<textarea name="notiz" rows="2" placeholder="Was war wichtig?"></textarea></label>
          </div>
        </fieldset>`;
  }).join('')}
      <div class="knopfreihe"><button class="btn primary" id="gSpeichernKnopf">Gespräch beim Kunden speichern</button>
      <button class="btn" id="gGeteilt">📞 Mit Kundendaten weiter</button>
      <a class="btn ghost" href="#/kunde/${esc(k.id)}?tab=gespraeche">Alle Gespräche ansehen</a></div>`;
    box.querySelector('#gGeteilt').addEventListener('click', () => {
      // Nahtlos in die geteilte Ansicht: angetippte Einwände wandern in das laufende Gespräch
      const mit = SPARTEN_KEYS.filter((s) => Object.keys(zustand.verlauf[s]).length);
      ablauf.beginnen(k.id, { verlauf: zustand.verlauf, sparten: mit.length ? mit : [zustand.sparte], leitfadenSparte: zustand.sparte });
      location.hash = `#/kunde/${k.id}/gespraech?seite=leitfaden`;
    });
    box.querySelector('#gSpeichernKnopf').addEventListener('click', () => {
      const eintraege: { s: Sparte; ausgang: string; status: string; schritt: string; wv: string | null; notiz: string }[] = [];
      for (const fs of box.querySelectorAll('[data-abschluss]')) {
        const s = fs.dataset.abschluss as Sparte;
        const f = (n) => fs.querySelector(`[name=${n}]`);
        const ausgang = f('ausgang').value;
        const anzahl = Object.keys(zustand.verlauf[s]).length;
        const wvRoh = f('wv').value;
        const wv = wvRoh ? localInputToIso(wvRoh) : null;
        if (wvRoh && !wv) { toast(`Ungültiges Datum bei ${SPARTEN[s].label}.`, 'error'); return; }
        if (!ausgang && !anzahl && !f('notiz').value.trim()) continue; // nichts zu speichern für diese Sparte
        if (!ausgang) { toast(`Bitte das Ergebnis für ${SPARTEN[s].label} wählen.`, 'error'); f('ausgang').focus(); return; }
        eintraege.push({ s, ausgang, status: f('status').value, schritt: f('schritt').value.trim(), wv, notiz: f('notiz').value.trim() });
      }
      if (!eintraege.length) { toast('Noch nichts zu speichern: Einwand antippen oder Ergebnis wählen.', 'error'); return; }
      const l = (s) => LEITFADEN[s];
      const kontaktart = box.querySelector('#gKontaktart').value;
      const enpalTeile = eintraege.filter((e) => e.s === 'pv' || e.s === 'wp');
      store.mutate((data) => {
        const kk = data.kunden.find((x) => x.id === k.id);
        if (!kk) return;
        const jetzt = nowIso();
        for (const e of eintraege) {
          const einwaende = l(e.s).einwaende.filter((x) => zustand.verlauf[e.s][x.id]).map((x) => ({ id: x.id, text: x.kunde, ergebnis: zustand.verlauf[e.s][x.id] }));
          kk.gespraeche.push(normalizeGespraech({ zeitpunkt: jetzt, sparte: e.s, einwaende, ausgang: e.ausgang, naechsterSchritt: e.schritt, notiz: e.notiz }));
          const text = [gespraechsNotiz(e.s, zustand.verlauf[e.s], e.notiz) || `Gespräch ${l(e.s).titel}`, `Ergebnis: ${AUSGANG[e.ausgang]}`, e.schritt ? `Nächster Schritt: ${e.schritt}` : ''].filter(Boolean).join('\n');
          kk.notizen.push(neueNotiz({ text, sparten: [e.s], zeitpunkt: jetzt }));
          if (e.status in STATUS) kk.status[e.s] = e.status as StatusKey;
          if (e.wv) {
            data.termine.push(neuerTermin({ kundeId: kk.id, sparte: e.s, art: e.ausgang === 'termin' ? 'termin' : 'wiedervorlage', beginn: e.wv, dauerMin: 60,
              titel: `${SPARTEN[e.s].label}: ${e.schritt || AUSGANG[e.ausgang]} – ${kundenTitel(kk)}`, ort: adresseEinzeilig(kk), notiz: e.notiz }));
          }
        }
        // Enpal-Dokumentation: EIN Eintrag für PV und WP zusammen (beides Enpal, R-TEXT erlaubt das).
        if (enpalTeile.length) {
          const fristen = enpalTeile.map((e) => e.wv).filter(Boolean).sort();
          kk.enpalKontakte.push(normalizeEnpalKontakt({
            zeitpunkt: jetzt, art: kontaktart, erreicht: true, gespraechspartner: kundenName(kk, 'vorname'),
            themen: enpalTeile.map((e) => e.s),
            ergebnis: enpalTeile[0].ausgang,
            naechsterSchritt: enpalTeile.map((e) => e.schritt).filter(Boolean).join(' / '),
            frist: fristen[0] || null,
            notiz: enpalTeile.map((e) => `${SPARTEN[e.s].label}: ${AUSGANG[e.ausgang]}\n${gespraechsNotiz(e.s, zustand.verlauf[e.s], e.notiz) || ''}`.trim()).join('\n\n'),
          }));
        }
        kk.updatedAt = jetzt;
      });
      zustand.verlauf = { pv: {}, wp: {}, vorwerk: {} };
      zustand.offenerEinwand = null;
      toast(`Gespräch gespeichert (${eintraege.map((e) => SPARTEN[e.s].kurz).join(', ')})${enpalTeile.length ? ' – Enpal-Doku angelegt, Text unter Kunde › Enpal-Doku' : ''}`, 'ok', enpalTeile.length ? 6000 : 3200);
      zeichnen();
    });
  };

  const kw = el.querySelector('#gKunde');
  if (kw) { kundenwahl.verdrahten(kw.parentElement!); kw.querySelector('[name=gKunde]')!.addEventListener('change', (ev) => { zustand.kundeId = (ev.target as HTMLInputElement).value; zeichnen(); }); }
  const tabWechsel = (s: Sparte) => {
    zustand.sparte = s;
    zustand.offenerEinwand = null;
    einb?.onSparte?.(s);
    el.querySelectorAll('#gTabs button').forEach((b) => b.classList.toggle('aktiv', b.dataset.sparte === s));
    zeichnen();
  };
  el.querySelector('#gTabs').addEventListener('click', (ev) => { const b = (ev.target as Element).closest('[data-sparte]'); if (b) tabWechsel(b.dataset.sparte as Sparte); });

  if (einb) {
    // Kartei-Felder (Zahlen, Text) speichern wie in der Kartei; danach Haken aktualisieren
    bindeFelder(inhalt, zustand.kundeId, () => { aktualisieren(); einb.onFeld?.(); });
    inhalt.addEventListener('input', (ev) => {
      const t = (ev.target as Element).closest<HTMLInputElement>('[data-antwort]');
      if (!t) return;
      const s = zustand.sparte;
      const id = t.dataset.antwort || '';
      const pk = KLEMMBRETT[s].flatMap((x) => x.punkte).find((x) => x.art === 'antwort' && x.id === id) as AntwortPunkt | undefined;
      if (!pk) return;
      antwortSetzen(antworten, s, id, mitFreitext(antworten[s][id] || '', pk.optionen || [], t.value));
      aktualisieren();
    });
    el.querySelector('#gkEinwand')?.addEventListener('click', sheetAuf);
  }

  el.addEventListener('click', (ev) => {
    const t = ev.target as Element;
    const s = zustand.sparte;
    const fwahl = t.closest<HTMLElement>('[data-fwahl]');
    const awahl = t.closest<HTMLElement>('[data-awahl]');
    const art = t.closest<HTMLElement>('.gk-art [data-art]');
    const ein = t.closest<HTMLElement>('[data-einwand]');
    const erg = t.closest<HTMLElement>('[data-ergebnis]');
    const wech = t.closest<HTMLElement>('[data-wechsel]');
    const leihen = t.closest<HTMLElement>('[data-gk-leihen]');
    const schein = t.closest<HTMLElement>('[data-gk-schein]');
    if (leihen) {
      const g = store.getData().geraete.find((x) => x.id === leihen.dataset.gkLeihen);
      if (g) {
        // Nach Verleih, Unterschrift und Leihschein genau dorthin zurück, wo Jan im Klemmbrett war
        const merk = leihen.closest<HTMLElement>('[data-gk-geraete]')!.getBoundingClientRect().top;
        void verleihDialog(g, null, '', zustand.kundeId).then((ok) => {
          if (!ok) return;
          geraeteNeu();
          einb?.onFeld?.();
          zuruecksetzen(merk);
        });
      }
    } else if (schein) {
      void leihschein.anbieten(schein.dataset.gkSchein, 'ausgabe', dialog);
    } else if (t.closest('[data-zu]')) {
      sheetZu();
    } else if (fwahl) {
      const pfad = fwahl.dataset.fwahl || '';
      const roh = fwahl.dataset.wert || '';
      const an = fwahl.classList.contains('aktiv');
      const wert = an ? null : fwahl.dataset.typ === 'bool' ? roh === 'ja' : roh;
      fwahl.parentElement?.querySelectorAll<HTMLElement>('[data-fwahl]').forEach((b) => { const x = b === fwahl && !an; b.classList.toggle('aktiv', x); b.setAttribute('aria-pressed', String(x)); });
      feldSetzen(pfad, wert);
      aktualisieren();
    } else if (awahl) {
      const id = awahl.dataset.awahl || '';
      const pk = KLEMMBRETT[s].flatMap((x) => x.punkte).find((x) => x.art === 'antwort' && x.id === id) as AntwortPunkt | undefined;
      if (!pk) return;
      antwortSetzen(antworten, s, id, optionUmschalten(antworten[s][id] || '', awahl.dataset.wert || '', pk.optionen || [], !!pk.mehrfach));
      const wert = antworten[s][id] || '';
      awahl.parentElement?.querySelectorAll<HTMLElement>('[data-awahl]').forEach((b) => { const x = optionGewaehlt(wert, b.dataset.wert || ''); b.classList.toggle('aktiv', x); b.setAttribute('aria-pressed', String(x)); });
      aktualisieren();
      if (istGeraetPunkt(s, pk)) geraeteNeu();
    } else if (art && ent) {
      ent.kontaktart = art.dataset.art as typeof ent.kontaktart;
      art.parentElement?.querySelectorAll('[data-art]').forEach((x) => x.classList.toggle('aktiv', x === art));
    } else if (t.closest('#gAufdecken')) {
      if (zustand.offenerEinwand) zustand.aufgedeckt.add(zustand.offenerEinwand);
      einwandNeu();
    } else if (ein) {
      const eid = ein.dataset.einwand || '';
      zustand.offenerEinwand = eid;
      if (!zustand.verlauf[s][eid]) zustand.verlauf[s][eid] = 'offen';
      einb?.onEinwand?.();
      einwandNeu();
      el.querySelector('#antwort')?.scrollIntoView({ behavior: ruhig() ? 'auto' : 'smooth', block: 'nearest' });
    } else if (erg && zustand.offenerEinwand) {
      zustand.verlauf[s][zustand.offenerEinwand] = erg.dataset.ergebnis || 'offen';
      zustand.aufgedeckt.add(zustand.offenerEinwand);
      einb?.onEinwand?.();
      einwandNeu();
      badge();
    } else if (wech) {
      tabWechsel(wech.dataset.wechsel as Sparte);
      if (einb) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  zeichnen();
}
