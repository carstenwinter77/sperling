// Gesprächsleitfaden: Einstiegsfragen, Einwände anklicken → Gegenargumente, Überleitungen.
// Gespeichert wird je Sparte eine EIGENE Notiz (R-TEXT: nie Sparten mischen).
import * as kundenwahl from '../kundenwahl.ts';
import { esc, nowIso, formatDateTime, localInputToIso } from '../../core/util.ts';
import { SPARTEN, SPARTEN_KEYS, kundenTitel, neueNotiz, neuerTermin, normalizeGespraech, normalizeEnpalKontakt, KONTAKTART, kundenName, adresseEinzeilig, STATUS, AUSGANG, type Sparte, type StatusKey, type Kunde } from '../../core/model.ts';
import { LEITFADEN, UEBERLEITUNG, ERGEBNIS, TECHNIKEN, gespraechsNotiz } from '../../core/einwaende.ts';
import { PHASEN, PHASEN_IDS, IMPULS, WIDERRUF_NOTIZ, WIDERRUF_HINWEIS, leitfragen, phase, phasenIndex, nachbar, stichpunkt, umschalten, fortschritt, neuerFluss, type Fluss, type PhaseId, type Leitfrage } from '../../core/leitfragen.ts';
import { bausteinAnhaengen } from '../../core/bausteine.ts';
import * as store from '../../storage/store.ts';
import { maskottchen, toast } from '../dom.ts';
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

/** Eingebettet im laufenden Gespräch: ohne Kopf, Kundenwahl und Abschluss; Einwände und Notizen landen im Entwurf. */
export interface Einbettung {
  kundeId: string; sparte: Sparte; verlauf: ablauf.Verlauf;
  /** Geführter Ablauf des Entwurfs (Phase, abgehakte Fragen) */
  fluss: Fluss;
  /** Notizen je Bereich des Entwurfs; angetippte Leitfragen hängen dort ein Stichwort an */
  notiz: Record<Sparte, string>;
  onSparte?: (s: Sparte) => void; onEinwand?: () => void;
}

const ruhig = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Kurzer „Flug“ eines Stichworts von der angetippten Frage in die Notiz (nur Optik). */
function flug(von: Element, nach: Element, text: string) {
  if (ruhig() || typeof document.body.animate !== 'function') return;
  const a = von.getBoundingClientRect();
  const b = nach.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const f = document.createElement('span');
  f.className = 'gl-flug';
  f.textContent = text;
  f.style.left = `${a.left + 12}px`;
  f.style.top = `${a.top + a.height / 2 - 14}px`;
  document.body.append(f);
  const dx = b.left + 16 - (a.left + 12);
  const dy = b.top + 18 - (a.top + a.height / 2 - 14);
  const anim = f.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(1.05)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.7)`, opacity: 0 },
  ], { duration: 520, easing: 'cubic-bezier(.3,.7,.4,1)' });
  anim.onfinish = () => f.remove();
  anim.oncancel = () => f.remove();
}

export function render(el: HTMLElement, params: URLSearchParams, _teile: string[] = [], einb: Einbettung | null = null) {
  const d = store.getData();
  const p = (n: string) => params.get(n) || '';
  const zustand = {
    kundeId: einb ? einb.kundeId : (d.kunden.some((k) => k.id === p('kunde')) ? p('kunde') : ''),
    sparte: (einb ? einb.sparte : (p('sparte') in SPARTEN ? p('sparte') : 'pv')) as Sparte,
    // einwandId -> 'offen' | 'ueberzeugt' | 'bleibt'
    verlauf: einb ? einb.verlauf : ablauf.leererVerlauf(),
    offenerEinwand: null as string | null,
    /** Einwände, bei denen die Rückfrage gestellt und die Antwort aufgedeckt ist */
    aufgedeckt: new Set<string>(),
    /** Richtung der nächsten Karten-Animation */
    richtung: '' as '' | 'von-rechts' | 'von-links',
  };
  const fluss: Fluss = einb ? einb.fluss : neuerFluss();
  if (!einb && PHASEN_IDS.includes(p('phase') as PhaseId)) fluss.phase = p('phase') as PhaseId;
  // aus der Suche: Einwand direkt aufschlagen (nur nachschlagen, nichts wird angetippt)
  if (!einb && LEITFADEN[zustand.sparte]?.einwaende.some((x) => x.id === p('einwand'))) {
    zustand.offenerEinwand = p('einwand');
    zustand.aufgedeckt.add(p('einwand'));
    fluss.phase = 'loesung';
  }

  el.innerHTML = einb ? `
    <nav class="tabs" id="gTabs">${SPARTEN_KEYS.map((s) => `<button data-sparte="${s}" class="${s === zustand.sparte ? 'aktiv' : ''}">${esc(SPARTEN[s].label)}</button>`).join('')}</nav>
    <div id="gInhalt"></div>` : `
    <header class="seitenkopf">
      <h1>${maskottchen('notizen', 'titel-bild')} Gesprächsleitfaden</h1>
      <a class="btn ghost" href="#/produkte">🏷️ Produkte</a>
    </header>
    <section class="karte-box">
      ${kundenwahl.html('gKunde', 'Gespräch mit', zustand.kundeId, { id: 'gKunde', leerText: '– ohne Kunde (nur nachschlagen) –' })}
    </section>
    <nav class="tabs" id="gTabs">${SPARTEN_KEYS.map((s) => `<button data-sparte="${s}" class="${s === zustand.sparte ? 'aktiv' : ''}">${esc(SPARTEN[s].label)}</button>`).join('')}</nav>
    <div id="gInhalt"></div>
    <section class="karte-box" id="gSpeichern"></section>`;

  const inhalt = el.querySelector('#gInhalt');

  // ---------- Bausteine der Phasenkarte ----------
  const leisteHtml = (s: Sparte) => {
    const i = phasenIndex(fluss.phase);
    const fort = fortschritt(fluss, s);
    return `<ol class="gl-leiste" style="--fortschritt:${i / (PHASEN.length - 1)}" aria-label="Gesprächsphasen">${PHASEN.map((ph, j) => `
      <li><button type="button" class="gl-punkt ${j < i ? 'vorbei' : ''} ${j === i ? 'aktiv' : ''} ${fort[ph.id] ? 'erledigt' : ''}" data-phase="${ph.id}" ${j === i ? 'aria-current="step"' : ''} aria-label="Phase ${j + 1}: ${esc(ph.titel)}${fort[ph.id] ? `, ${fort[ph.id]} abgehakt` : ''}">
        <span class="gl-dot" aria-hidden="true">${fort[ph.id] ? '✓' : j + 1}</span><span class="gl-name">${esc(ph.kurz)}</span>
      </button></li>`).join('')}</ol>`;
  };

  const frageHtml = (s: Sparte, q: Leitfrage) => {
    const an = (fluss.gefragt[s] || []).includes(q.id);
    return `<button type="button" class="gl-frage ${an ? 'gefragt' : ''}" data-frage="${esc(q.id)}" aria-pressed="${an}">
      <span class="gl-haken" aria-hidden="true"></span>
      <span class="gl-text">${esc(q.frage)}${q.stichwort && einb ? `<small>→ Notiz: ${esc(q.stichwort)}</small>` : ''}</span>
    </button>`;
  };

  const einwaendeHtml = (s: Sparte, k: Kunde | null) => {
    const l = LEITFADEN[s];
    const v = zustand.verlauf[s];
    const e = l.einwaende.find((x) => x.id === zustand.offenerEinwand);
    const offen = e && !zustand.aufgedeckt.has(e.id) && (!v[e.id] || v[e.id] === 'offen');
    return `
      <h3 class="gl-unter">Was sagt der Kunde?</h3>
      <div class="einwand-knoepfe">${l.einwaende.map((x) => `<button class="einwand ${v[x.id] ? `e-${v[x.id]}` : ''} ${x.id === zustand.offenerEinwand ? 'aktiv' : ''}" data-einwand="${x.id}">${esc(x.kunde)}${v[x.id] ? `<small>${esc(ERGEBNIS[v[x.id]])}</small>` : (frueher(k, s, x.id) ? `<small class="frueher">früher: ${esc(ERGEBNIS[frueher(k, s, x.id)])}</small>` : '')}</button>`).join('')}</div>
      ${e ? `
      <div class="antwort gl-antwort" id="antwort">
        <p class="zitat">„${esc(e.kunde)}“</p>
        ${erinnerungHtml(k, s, e)}
        <p class="technik">${esc(TECHNIKEN[e.technik] || '')}</p>
        <ol class="schritte">
          <li class="gl-stufe"><span>1 · Auffangen</span><p>${esc(e.auffangen)}</p></li>
          <li class="gl-stufe schritt-rueckfrage"><span>2 · Rückfrage: Was steckt dahinter?</span><p>${esc(e.isolieren)}</p></li>
          ${offen ? `<li class="gl-stufe"><button type="button" class="btn gl-aufdecken" id="gAufdecken">Rückfrage gestellt · Antwort zeigen ›</button></li>` : `
          <li class="gl-stufe gl-aufklappen"><span>3 · Antworten</span><ul class="argumente">${e.antworten.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></li>
          <li class="gl-stufe gl-aufklappen schritt-abschluss"><span>4 · Nächster Schritt</span><p>${esc(e.abschluss)}</p></li>`}
        </ol>
        <div class="knopfreihe">
          ${Object.entries(ERGEBNIS).map(([key, lbl]) => `<button class="btn klein ${v[e.id] === key ? 'primary' : ''}" data-ergebnis="${key}">${esc(lbl)}</button>`).join('')}
        </div>
      </div>` : ''}`;
  };

  const ueberleitungHtml = (s: Sparte) => `
      <h3 class="gl-unter">Überleiten zu …</h3>
      ${Object.entries(UEBERLEITUNG[s]).map(([ziel, satz]) => `
        <div class="ueberleitung">
          ${maskottchen(spartenIcon(ziel), 'mini')}
          <div><b>${esc(SPARTEN[ziel as Sparte].label)}</b><p>${esc(satz)}</p></div>
          <button class="btn klein ghost" data-wechsel="${ziel}">Leitfaden ${esc(SPARTEN[ziel as Sparte].kurz)}</button>
        </div>`).join('')}`;

  const widerrufHtml = (s: Sparte) => {
    const an = fluss.widerruf.includes(s);
    return `<button type="button" class="gl-frage gl-widerruf ${an ? 'gefragt' : ''}" data-widerruf="${s}" aria-pressed="${an}">
      <span class="gl-haken" aria-hidden="true"></span>
      <span class="gl-text">Widerrufsrecht erklärt<small>${esc(WIDERRUF_HINWEIS)}</small></span>
    </button>`;
  };

  const zeichnen = () => {
    const s = zustand.sparte;
    const l = LEITFADEN[s];
    const k = zustand.kundeId ? store.findKunde(zustand.kundeId) : null;
    const ph = phase(fluss.phase);
    const i = phasenIndex(ph.id);
    const letzte = i === PHASEN.length - 1;
    inhalt.innerHTML = `
      <section class="karte-box gl-fluss bereich-${s}">
        <div class="gl-kopf">
          <h2>${maskottchen(spartenIcon(s), 'titel-bild')} ${esc(l.titel)} <small>· ${esc(SPARTEN[s].anbieter)}${k ? ` · ${esc(STATUS[k.status[s]].label)}` : ''}</small></h2>
          ${ph.id !== 'loesung' ? '<button type="button" class="btn klein ghost gl-einwand-sprung" data-phase="loesung">💬 Einwand?</button>' : ''}
        </div>
        ${leisteHtml(s)}
        <div class="gl-karte ${zustand.richtung}" id="gKarte">
          <p class="gl-nr">Phase ${i + 1} von ${PHASEN.length}</p>
          <h3>${esc(ph.titel)}</h3>
          <p class="gl-ziel">${esc(ph.ziel)}</p>
          ${ph.id === 'vorbereiten' && k ? bisherHtml(k, s) : ''}
          ${ph.id === 'loesung' ? `<p class="gl-impuls"><b>Denkanstoß</b> ${esc(IMPULS[s])}</p>` : ''}
          <div class="gl-fragen">${leitfragen(s, ph.id).map((q) => frageHtml(s, q)).join('')}${letzte ? widerrufHtml(s) : ''}</div>
          ${ph.id === 'loesung' ? einwaendeHtml(s, k) : ''}
          ${letzte ? ueberleitungHtml(s) : ''}
          <div class="gl-weiter">
            <button type="button" class="btn ghost" data-schritt="-1" ${i === 0 ? 'disabled' : ''}>‹ Zurück</button>
            ${letzte
    ? (einb ? '<button type="button" class="btn primary" data-geh="abschluss">Gespräch abschließen ›</button>' : (zustand.kundeId ? '<button type="button" class="btn primary" id="gZumSpeichern">Zum Abschluss ›</button>' : ''))
    : `<button type="button" class="btn primary" data-schritt="1">Weiter: ${esc(PHASEN[i + 1]!.kurz)} ›</button>`}
          </div>
        </div>
      </section>
      ${einb ? `
      <section class="karte-box gl-notiz bereich-rand bereich-${s}">
        <label for="gNotiz">Notiz ${esc(SPARTEN[s].label)} <small>(${esc(SPARTEN[s].anbieter)})</small></label>
        <textarea id="gNotiz" rows="3" placeholder="Fragen oben antippen: das Stichwort landet hier, die Antwort des Kunden tippst oder diktierst du dahinter.">${esc(einb.notiz[s] || '')}</textarea>
      </section>` : ''}`;
    zustand.richtung = '';
    inhalt.querySelector<HTMLTextAreaElement>('#gNotiz')?.addEventListener('input', (ev) => { if (einb) einb.notiz[s] = (ev.target as HTMLTextAreaElement).value; });
    karteWischen();
    speicherBereich();
  };

  // ---------- Phasen wechseln: Antippen, Weiter/Zurück, Wischen ----------
  const phaseWechseln = (ziel: PhaseId) => {
    if (ziel === fluss.phase) return;
    zustand.richtung = phasenIndex(ziel) > phasenIndex(fluss.phase) ? 'von-rechts' : 'von-links';
    fluss.phase = ziel;
    zeichnen();
    const karte = inhalt.querySelector('.gl-fluss');
    if (karte && karte.getBoundingClientRect().top < 0) karte.scrollIntoView({ behavior: ruhig() ? 'auto' : 'smooth', block: 'start' });
  };

  const karteWischen = () => {
    const karte = inhalt.querySelector<HTMLElement>('#gKarte');
    if (!karte) return;
    let x0 = 0; let y0 = 0; let aktiv = false;
    karte.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse') return; // Wischen nur mit Finger/Stift
      aktiv = true; x0 = ev.clientX; y0 = ev.clientY;
    });
    karte.addEventListener('pointercancel', () => { aktiv = false; });
    karte.addEventListener('pointerup', (ev) => {
      if (!aktiv) return;
      aktiv = false;
      const dx = ev.clientX - x0; const dy = ev.clientY - y0;
      if (Math.abs(dx) > 70 && Math.abs(dy) < 50) phaseWechseln(nachbar(fluss.phase, dx < 0 ? 1 : -1));
    });
  };

  /** Haken und Phasenpunkt nur dort aktualisieren, wo sich etwas geändert hat (Animation bleibt sichtbar). */
  const frageUmschalten = (btn: HTMLElement, an: boolean) => {
    btn.classList.toggle('gefragt', an);
    btn.setAttribute('aria-pressed', String(an));
    btn.classList.remove('gl-pop');
    void btn.offsetWidth; // Animation neu starten
    if (an) btn.classList.add('gl-pop');
    const alt = inhalt.querySelector('.gl-leiste');
    if (alt) {
      const tmp = document.createElement('div');
      tmp.innerHTML = leisteHtml(zustand.sparte);
      const neu = tmp.firstElementChild;
      if (neu) {
        alt.querySelectorAll('.gl-punkt').forEach((b, j) => {
          const n = neu.querySelectorAll('.gl-punkt')[j];
          if (!n) return;
          const warErledigt = b.classList.contains('erledigt');
          b.className = n.className;
          b.innerHTML = n.innerHTML;
          b.setAttribute('aria-label', n.getAttribute('aria-label') || '');
          if (!warErledigt && b.classList.contains('erledigt')) b.classList.add('gl-puls');
        });
      }
    }
  };

  const stichwortAnhaengen = (btn: HTMLElement, s: Sparte, text: string) => {
    if (!einb || !text) return;
    einb.notiz[s] = `${bausteinAnhaengen(einb.notiz[s] || '', text)} `;
    const ta = inhalt.querySelector<HTMLTextAreaElement>('#gNotiz');
    if (!ta) return;
    ta.value = einb.notiz[s];
    ta.scrollTop = ta.scrollHeight;
    flug(btn, ta, text.trim());
    ta.classList.remove('gl-angekommen');
    void ta.offsetWidth;
    ta.classList.add('gl-angekommen');
  };

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
            <label>Wiedervorlage / Termin am<input type="datetime-local" name="wv"></label>
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
      ablauf.beginnen(k.id, { verlauf: zustand.verlauf, sparten: mit.length ? mit : [zustand.sparte], leitfadenSparte: zustand.sparte, fluss });
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
        eintraege.push({ s, ausgang, status: f('status').value, schritt: f('schritt').value.trim(), wv, notiz: [f('notiz').value.trim(), fluss.widerruf.includes(s) ? WIDERRUF_NOTIZ : ''].filter(Boolean).join('\n') });
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
            zeitpunkt: jetzt, art: kontaktart, erreicht: true, gespraechspartner: kundenName(kk),
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
      Object.assign(fluss, neuerFluss());
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
  inhalt.addEventListener('click', (ev) => {
    const t = ev.target as Element;
    const ziel = t.closest<HTMLElement>('[data-phase]');
    const schritt = t.closest<HTMLElement>('[data-schritt]');
    const frage = t.closest<HTMLElement>('[data-frage]');
    const widerruf = t.closest<HTMLElement>('[data-widerruf]');
    const ein = t.closest<HTMLElement>('[data-einwand]');
    const erg = t.closest<HTMLElement>('[data-ergebnis]');
    const wech = t.closest<HTMLElement>('[data-wechsel]');
    const s = zustand.sparte;
    if (ziel) {
      phaseWechseln(ziel.dataset.phase as PhaseId);
    } else if (schritt) {
      phaseWechseln(nachbar(fluss.phase, Number(schritt.dataset.schritt) || 0));
    } else if (frage) {
      const id = frage.dataset.frage || '';
      const an = umschalten(fluss, s, id);
      frageUmschalten(frage, an);
      const q = leitfragen(s, fluss.phase).find((x) => x.id === id);
      if (an && q) stichwortAnhaengen(frage, s, stichpunkt(q));
      if (an) einb?.onEinwand?.();
    } else if (widerruf) {
      const an = !fluss.widerruf.includes(s);
      fluss.widerruf = an ? [...fluss.widerruf, s] : fluss.widerruf.filter((x) => x !== s);
      frageUmschalten(widerruf, an);
      if (an) stichwortAnhaengen(widerruf, s, WIDERRUF_NOTIZ);
    } else if (t.closest('#gAufdecken')) {
      if (zustand.offenerEinwand) zustand.aufgedeckt.add(zustand.offenerEinwand);
      zeichnen();
    } else if (t.closest('#gZumSpeichern')) {
      el.querySelector('#gSpeichern')?.scrollIntoView({ behavior: ruhig() ? 'auto' : 'smooth', block: 'start' });
    } else if (ein) {
      const eid = ein.dataset.einwand || '';
      zustand.offenerEinwand = eid;
      if (!zustand.verlauf[s][eid]) zustand.verlauf[s][eid] = 'offen';
      einb?.onEinwand?.();
      zeichnen();
      el.querySelector('#antwort')?.scrollIntoView({ behavior: ruhig() ? 'auto' : 'smooth', block: 'nearest' });
    } else if (erg && zustand.offenerEinwand) {
      zustand.verlauf[s][zustand.offenerEinwand] = erg.dataset.ergebnis || 'offen';
      zustand.aufgedeckt.add(zustand.offenerEinwand);
      einb?.onEinwand?.();
      zeichnen();
    } else if (wech) {
      tabWechsel(wech.dataset.wechsel as Sparte);
      if (einb) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  zeichnen();
}
