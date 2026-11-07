// Gesprächsleitfaden: Einstiegsfragen, Einwände anklicken → Gegenargumente, Überleitungen.
// Gespeichert wird je Sparte eine EIGENE Notiz (R-TEXT: nie Sparten mischen).
import { esc, nowIso, formatDateTime, localInputToIso } from '../../core/util.ts';
import { SPARTEN, SPARTEN_KEYS, kundenTitel, neueNotiz, neuerTermin, normalizeGespraech, normalizeEnpalKontakt, KONTAKTART, kundenName, adresseEinzeilig, STATUS, AUSGANG, type Sparte, type StatusKey } from '../../core/model.ts';
import { LEITFADEN, UEBERLEITUNG, ERGEBNIS, TECHNIKEN, gespraechsNotiz } from '../../core/einwaende.ts';
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

/** Eingebettet im laufenden Gespräch: ohne Kopf, Kundenwahl und Abschluss; Einwände landen im Entwurf. */
export interface Einbettung { kundeId: string; sparte: Sparte; verlauf: ablauf.Verlauf; onSparte?: (s: Sparte) => void; onEinwand?: () => void }

export function render(el: HTMLElement, params: URLSearchParams, _teile: string[] = [], einb: Einbettung | null = null) {
  const d = store.getData();
  const p = (n: string) => params.get(n) || '';
  const zustand = {
    kundeId: einb ? einb.kundeId : (d.kunden.some((k) => k.id === p('kunde')) ? p('kunde') : ''),
    sparte: (einb ? einb.sparte : (p('sparte') in SPARTEN ? p('sparte') : 'pv')) as Sparte,
    // einwandId -> 'offen' | 'ueberzeugt' | 'bleibt'
    verlauf: einb ? einb.verlauf : ablauf.leererVerlauf(),
    offenerEinwand: null as string | null,
  };
  const kundenOpts = [...d.kunden].sort((a, b) => kundenTitel(a).localeCompare(kundenTitel(b), 'de'))
    .map((k) => `<option value="${esc(k.id)}" ${k.id === zustand.kundeId ? 'selected' : ''}>${esc(kundenTitel(k))}</option>`).join('');

  el.innerHTML = einb ? `
    <nav class="tabs" id="gTabs">${SPARTEN_KEYS.map((s) => `<button data-sparte="${s}" class="${s === zustand.sparte ? 'aktiv' : ''}">${esc(SPARTEN[s].label)}</button>`).join('')}</nav>
    <div id="gInhalt"></div>` : `
    <header class="seitenkopf">
      <h1>${maskottchen('notizen', 'titel-bild')} Gesprächsleitfaden</h1>
    </header>
    <section class="karte-box">
      <label>Gespräch mit<select id="gKunde"><option value="">– ohne Kunde (nur nachschlagen) –</option>${kundenOpts}</select></label>
    </section>
    <nav class="tabs" id="gTabs">${SPARTEN_KEYS.map((s) => `<button data-sparte="${s}" class="${s === zustand.sparte ? 'aktiv' : ''}">${esc(SPARTEN[s].label)}</button>`).join('')}</nav>
    <div id="gInhalt"></div>
    <section class="karte-box" id="gSpeichern"></section>`;

  const inhalt = el.querySelector('#gInhalt');

  const zeichnen = () => {
    const s = zustand.sparte;
    const l = LEITFADEN[s];
    const v = zustand.verlauf[s];
    const k = zustand.kundeId ? store.findKunde(zustand.kundeId) : null;
    const e = l.einwaende.find((x) => x.id === zustand.offenerEinwand);
    inhalt.innerHTML = `
      <section class="karte-box">
        <h2>${maskottchen(spartenIcon(s), 'titel-bild')} ${esc(l.titel)}${k ? ` <small>· aktuell: ${esc(STATUS[k.status[s]].label)}</small>` : ''}</h2>
        ${k ? bisherHtml(k, s) : ''}
        <h3>Einstiegsfragen</h3>
        <ul class="fragen">${l.einstieg.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        <h3>Was sagt der Kunde?</h3>
        <div class="einwand-knoepfe">${l.einwaende.map((x) => `<button class="einwand ${v[x.id] ? `e-${v[x.id]}` : ''} ${x.id === zustand.offenerEinwand ? 'aktiv' : ''}" data-einwand="${x.id}">${esc(x.kunde)}${v[x.id] ? `<small>${esc(ERGEBNIS[v[x.id]])}</small>` : (frueher(k, s, x.id) ? `<small class="frueher">früher: ${esc(ERGEBNIS[frueher(k, s, x.id)])}</small>` : '')}</button>`).join('')}</div>
      </section>
      ${e ? `
      <section class="karte-box antwort" id="antwort">
        <p class="zitat">„${esc(e.kunde)}“</p>
        ${erinnerungHtml(k, s, e)}
        <p class="technik">${esc(TECHNIKEN[e.technik] || '')}</p>
        <ol class="schritte">
          <li><span>1 · Auffangen</span><p>${esc(e.auffangen)}</p></li>
          <li><span>2 · Isolieren</span><p>${esc(e.isolieren)}</p></li>
          <li><span>3 · Argumentieren</span><ul class="argumente">${e.antworten.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></li>
          <li class="schritt-abschluss"><span>4 · Abschlussfrage</span><p>${esc(e.abschluss)}</p></li>
        </ol>
        <div class="knopfreihe">
          ${Object.entries(ERGEBNIS).map(([key, lbl]) => `<button class="btn klein ${v[e.id] === key ? 'primary' : ''}" data-ergebnis="${key}">${esc(lbl)}</button>`).join('')}
        </div>
      </section>` : ''}
      <section class="karte-box">
        <h3>Überleiten zu …</h3>
        ${Object.entries(UEBERLEITUNG[s]).map(([ziel, satz]) => `
          <div class="ueberleitung">
            ${maskottchen(spartenIcon(ziel), 'mini')}
            <div><b>${esc(SPARTEN[ziel].label)}</b><p>${esc(satz)}</p></div>
            <button class="btn klein ghost" data-wechsel="${ziel}">Leitfaden ${esc(SPARTEN[ziel].kurz)}</button>
          </div>`).join('')}
      </section>`;
    speicherBereich();
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
            data.termine.push(neuerTermin({ kundeId: kk.id, sparte: e.s, art: e.ausgang === 'termin' ? 'termin' : 'wiedervorlage', beginn: e.wv, dauerMin: e.ausgang === 'termin' ? 60 : 15,
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
      toast(`Gespräch gespeichert (${eintraege.map((e) => SPARTEN[e.s].kurz).join(', ')})${enpalTeile.length ? ' – Enpal-Doku angelegt, Text unter Kunde › Enpal-Doku' : ''}`, 'ok', enpalTeile.length ? 6000 : 3200);
      zeichnen();
    });
  };

  el.querySelector('#gKunde')?.addEventListener('change', (ev) => { zustand.kundeId = (ev.target as HTMLInputElement).value; zeichnen(); });
  const tabWechsel = (s) => {
    zustand.sparte = s;
    zustand.offenerEinwand = null;
    einb?.onSparte?.(s);
    el.querySelectorAll('#gTabs button').forEach((b) => b.classList.toggle('aktiv', b.dataset.sparte === s));
    zeichnen();
  };
  el.querySelector('#gTabs').addEventListener('click', (ev) => { const b = (ev.target as Element).closest('[data-sparte]'); if (b) tabWechsel(b.dataset.sparte); });
  inhalt.addEventListener('click', (ev) => {
    const ein = (ev.target as Element).closest('[data-einwand]');
    const erg = (ev.target as Element).closest('[data-ergebnis]');
    const wech = (ev.target as Element).closest('[data-wechsel]');
    if (ein) {
      const eid = ein.dataset.einwand || '';
      zustand.offenerEinwand = eid;
      if (!zustand.verlauf[zustand.sparte][eid]) zustand.verlauf[zustand.sparte][eid] = 'offen';
      einb?.onEinwand?.();
      zeichnen();
      el.querySelector('#antwort')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (erg && zustand.offenerEinwand) {
      zustand.verlauf[zustand.sparte][zustand.offenerEinwand] = erg.dataset.ergebnis || 'offen';
      einb?.onEinwand?.();
      zeichnen();
    } else if (wech) {
      tabWechsel(wech.dataset.wechsel);
      if (einb) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  zeichnen();
}
