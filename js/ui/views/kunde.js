// Kundendetail: Stammdaten, Spartenstatus, Gesprächsnotizen, Erfassungsbögen, Termine, Texte.
import { esc, debounce, parseNumber, isoToLocalInput, localInputToIso, formatDateTime, distanceMeters, nowIso } from '../../core/util.js';
import { AUSGANG, SPARTEN, SPARTEN_KEYS, STATUS, FELDER, kundenTitel, adresseEinzeilig, notizenSortiert, neueNotiz, normalizeNotiz } from '../../core/model.js';
import { ERGEBNIS } from '../../core/einwaende.js';
import { generiereText, ausgelasseneNotizen, GRUPPEN, notizErlaubt } from '../../core/textgen.js';
import * as store from '../../storage/store.js';
import { koordinateZuAdresse } from '../../services/geo.js';
import { maskottchen, toast, kopieren, bestaetigen, dialog } from '../dom.js';
import { anrufen, emailSchreiben } from '../kontakt.js';
import * as enpalDoku from '../enpaldoku.js';
import { istBeispiel } from '../../demo.js';
import { statusOptions, terminDialog, terminZeile, terminListeVerdrahten, icsExport, spartenIcon, statusChips } from '../parts.js';

const TABS = [
  { key: 'uebersicht', label: 'Übersicht', bild: 'kunde-neu' },
  { key: 'notizen', label: 'Notizen', bild: 'notizen' },
  { key: 'enpal', label: 'PV & Wärmepumpe', bild: 'photovoltaik' },
  { key: 'doku', label: 'Enpal-Doku', bild: 'photovoltaik' },
  { key: 'vorwerk', label: 'Vorwerk', bild: 'vorwerk' },
  { key: 'gespraeche', label: 'Gespräche', bild: 'notizen' },
  { key: 'termine', label: 'Termine', bild: 'termine' },
  { key: 'texte', label: 'Texte', bild: 'notizen' },
];

const NACHBAR_RADIUS_M = 300;

export function render(el, params, [id]) {
  const kunde = store.findKunde(id);
  if (!kunde) {
    el.innerHTML = `<div class="leer">${maskottchen('sperling', 'gross')}<p>Diesen Kunden gibt es nicht (mehr).</p><a class="btn" href="#/kunden">Zur Kundenliste</a></div>`;
    return;
  }
  let tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'uebersicht';

  el.innerHTML = `
    <header class="seitenkopf kunde-kopf">
      <a href="#/kunden" class="zurueck" aria-label="Zurück">‹</a>
      <h1 id="kTitel">${esc(kundenTitel(kunde))}</h1>${istBeispiel(kunde.id) ? '<span class="tag tag-beispiel">Beispiel</span>' : ''}
      <span id="kChips">${statusChips(kunde)}</span>
    </header>
    <div class="knopfreihe kunde-aktionen"><a class="btn klein" href="#/gespraech?kunde=${esc(kunde.id)}">💬 Gesprächsleitfaden</a></div>
    <nav class="tabs" role="tablist">
      ${TABS.map((t) => `<button role="tab" data-tab="${t.key}" class="${t.key === tab ? 'aktiv' : ''}">${esc(t.label)}</button>`).join('')}
    </nav>
    <div id="tabInhalt"></div>`;

  const inhalt = el.querySelector('#tabInhalt');
  const kopfAktualisieren = () => {
    const k = store.findKunde(id);
    if (!k) return;
    el.querySelector('#kTitel').textContent = kundenTitel(k);
    el.querySelector('#kChips').innerHTML = statusChips(k);
  };

  const zeigeTab = (t) => {
    tab = t;
    el.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('aktiv', b.dataset.tab === t));
    history.replaceState(null, '', `#/kunde/${id}?tab=${t}`);
    const k = store.findKunde(id);
    if (!k) { location.hash = '#/kunden'; return; }
    ({ uebersicht, notizen, enpal, doku: enpalDoku.tab, vorwerk, gespraeche, termine, texte })[t](inhalt, k, kopfAktualisieren);
  };
  el.querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (b) zeigeTab(b.dataset.tab);
  });
  zeigeTab(tab);
  if (params.get('neu') === '1') el.querySelector('[data-feld="vorname"]')?.focus();
}

// ---------- Feld-Bindung ----------

/** Liest den Wert eines Eingabefelds passend zum Feldtyp. */
function feldwert(input) {
  const typ = input.dataset.typ || 'text';
  if (typ === 'number') return parseNumber(input.value);
  if (typ === 'bool') return input.value === 'ja' ? true : input.value === 'nein' ? false : null;
  return input.value;
}

function setzePfad(obj, pfad, wert) {
  const teile = pfad.split('.');
  let o = obj;
  for (let i = 0; i < teile.length - 1; i++) {
    if (!o[teile[i]] || typeof o[teile[i]] !== 'object') return false;
    o = o[teile[i]];
  }
  o[teile[teile.length - 1]] = wert;
  return true;
}

function bindeFelder(root, kundeId, nachher) {
  const speichern = (input) => {
    const pfad = input.dataset.feld;
    const wert = feldwert(input);
    store.mutate((d) => {
      const k = d.kunden.find((x) => x.id === kundeId);
      if (!k) return;
      if (setzePfad(k, pfad, wert)) k.updatedAt = nowIso();
    });
    nachher?.(pfad);
  };
  const verzoegert = new Map();
  root.addEventListener('input', (e) => {
    const inp = e.target.closest('[data-feld]');
    if (!inp || inp.tagName === 'SELECT') return;
    if (!verzoegert.has(inp)) verzoegert.set(inp, debounce(() => speichern(inp), 350));
    verzoegert.get(inp)();
  });
  root.addEventListener('change', (e) => {
    const inp = e.target.closest('[data-feld]');
    if (!inp) return;
    verzoegert.get(inp)?.flush?.();
    if (inp.tagName === 'SELECT') speichern(inp);
  });
}

function feldHtml(sparte, f, wert) {
  const pfad = `${sparte}.${f.key}`;
  const lbl = `${esc(f.label)}${f.unit ? ` <small>(${esc(f.unit)})</small>` : ''}`;
  if (f.type === 'select') {
    return `<label>${lbl}<select data-feld="${pfad}"><option value="">–</option>${f.options.map((o) => `<option ${o === wert ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  }
  if (f.type === 'bool') {
    return `<label>${lbl}<select data-feld="${pfad}" data-typ="bool"><option value="">–</option><option value="ja" ${wert === true ? 'selected' : ''}>ja</option><option value="nein" ${wert === false ? 'selected' : ''}>nein</option></select></label>`;
  }
  if (f.type === 'number') {
    return `<label>${lbl}<input data-feld="${pfad}" data-typ="number" inputmode="decimal" value="${wert === null || wert === undefined ? '' : esc(String(wert).replace('.', ','))}"></label>`;
  }
  if (f.type === 'textarea') {
    return `<label class="breit">${lbl}<textarea data-feld="${pfad}" rows="3">${esc(wert)}</textarea></label>`;
  }
  return `<label>${lbl}<input data-feld="${pfad}" value="${esc(wert)}"></label>`;
}

// ---------- Tabs ----------

function uebersicht(el, k, kopf) {
  const nachbarn = k.lat !== null
    ? store.getData().kunden
      .filter((x) => x.id !== k.id && x.lat !== null)
      .map((x) => ({ x, m: distanceMeters(k.lat, k.lng, x.lat, x.lng) }))
      .filter((n) => n.m <= NACHBAR_RADIUS_M)
      .sort((a, b) => a.m - b.m)
    : [];
  el.innerHTML = `
    <section class="karte-box">
      <h2>Interesse je Sparte</h2>
      <div class="sparten-status">
        ${SPARTEN_KEYS.map((s) => `
          <label class="sparte-karte" style="--c:${STATUS[k.status[s]].farbe}">
            ${maskottchen(spartenIcon(s), 'sparte-bild')}
            <span>${esc(SPARTEN[s].label)}</span>
            <select data-feld="status.${s}" data-status>${statusOptions(k.status[s])}</select>
          </label>`).join('')}
      </div>
    </section>
    <section class="karte-box">
      <h2>Kontakt</h2>
      <div class="formgrid">
        <label>Anrede<input data-feld="anrede" value="${esc(k.anrede)}" placeholder="Frau / Herr"></label>
        <label>Vorname<input data-feld="vorname" value="${esc(k.vorname)}" autocomplete="off"></label>
        <label>Nachname<input data-feld="nachname" value="${esc(k.nachname)}" autocomplete="off"></label>
        <label>Firma<input data-feld="firma" value="${esc(k.firma)}"></label>
        <label>Telefon<input data-feld="telefon" type="tel" value="${esc(k.telefon)}"></label>
        <label>E-Mail<input data-feld="email" type="email" value="${esc(k.email)}"></label>
        <label class="breit">Straße und Hausnummer<input data-feld="strasse" value="${esc(k.strasse)}"></label>
        <label>PLZ<input data-feld="plz" inputmode="numeric" value="${esc(k.plz)}"></label>
        <label>Ort<input data-feld="ort" value="${esc(k.ort)}"></label>
      </div>
      <div class="knopfreihe">
        <button class="btn ghost" id="anrufen">📞 Anrufen</button>
        <button class="btn ghost" id="mailen">✉️ E-Mail schreiben</button>
        ${k.lat !== null ? `<a class="btn ghost" href="#/karte?kunde=${esc(k.id)}">🗺️ Auf Karte zeigen</a>` : ''}
        <button class="btn ghost" id="geocode">📍 Standort aus Adresse ermitteln</button>
      </div>
    </section>
    ${k.lat !== null ? `
    <section class="karte-box">
      <h2>${maskottchen('karte', 'titel-bild')} Nachbarn im Umkreis von ${NACHBAR_RADIUS_M} m</h2>
      ${nachbarn.length ? `<ul class="liste">${nachbarn.map(({ x, m }) => `<li><a class="zeile" href="#/kunde/${esc(x.id)}"><span class="zeile-haupt"><strong>${esc(kundenTitel(x))}</strong><small>${Math.round(m)} m entfernt</small></span>${statusChips(x)}</a></li>`).join('')}</ul>` : '<p class="hinweis">Noch keine markierten Häuser in der Nähe. Auf der Karte kannst du Nachbarhäuser als Potenzial markieren.</p>'}
    </section>` : ''}
    <section class="karte-box gefahrzone">
      <small>Angelegt ${esc(formatDateTime(k.createdAt))} · zuletzt geändert ${esc(formatDateTime(k.updatedAt))}</small>
      <button class="btn danger klein" id="loeschen">Kunde löschen</button>
    </section>`;

  bindeFelder(el, k.id, (pfad) => {
    kopf();
    if (pfad.startsWith('status.')) {
      const s = pfad.split('.')[1];
      const sel = el.querySelector(`[data-feld="${pfad}"]`);
      sel?.closest('.sparte-karte')?.style.setProperty('--c', STATUS[store.findKunde(k.id)?.status[s] ?? 'unbekannt'].farbe);
    }
  });

  // Immer den aktuellen Stand nehmen (Felder speichern beim Tippen).
  el.querySelector('#anrufen').addEventListener('click', () => {
    const akt = store.findKunde(k.id);
    if (!akt?.telefon) { toast('Bitte zuerst eine Telefonnummer eintragen.', 'error'); return; }
    anrufen(kundenTitel(akt), akt.telefon);
  });
  el.querySelector('#mailen').addEventListener('click', () => {
    const akt = store.findKunde(k.id);
    if (!akt) return;
    const anrede = akt.nachname ? `Guten Tag ${[akt.anrede, akt.nachname].filter(Boolean).join(' ')},` : 'Guten Tag,';
    const gruss = store.getData().einstellungen.absender;
    emailSchreiben({ an: akt.email, betreff: '', text: `${anrede}\n\n\n\nViele Grüße${gruss ? `\n${gruss}` : ''}` });
  });

  el.querySelector('#geocode').addEventListener('click', async (e) => {
    const akt = store.findKunde(k.id);
    const adr = adresseEinzeilig(akt);
    if (!adr) { toast('Bitte zuerst eine Adresse eingeben.', 'error'); return; }
    e.target.disabled = true;
    try {
      const pos = await koordinateZuAdresse(adr);
      if (!pos) { toast('Adresse nicht gefunden.', 'error'); return; }
      store.mutate((d) => { const x = d.kunden.find((y) => y.id === k.id); if (x) { x.lat = pos.lat; x.lng = pos.lng; x.updatedAt = nowIso(); } });
      toast('Standort gesetzt', 'ok');
      uebersicht(el, store.findKunde(k.id), kopf);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      e.target.disabled = false;
    }
  });

  el.querySelector('#loeschen').addEventListener('click', async () => {
    const ok = await bestaetigen('Kunde löschen?', `${kundenTitel(k)} mit allen Notizen wird gelöscht. Zugehörige Termine bleiben ohne Kundenbezug erhalten.`);
    if (!ok) return;
    store.mutate((d) => {
      d.kunden = d.kunden.filter((x) => x.id !== k.id);
      for (const t of d.termine) if (t.kundeId === k.id) t.kundeId = '';
    });
    toast('Kunde gelöscht');
    location.hash = '#/kunden';
  });
}

function spartenCheckboxen(name, aktiv = []) {
  return `<fieldset class="sparten-wahl"><legend>Worüber wurde gesprochen?</legend>${SPARTEN_KEYS.map((s) => `
    <label class="check"><input type="checkbox" name="${name}" value="${s}" ${aktiv.includes(s) ? 'checked' : ''}> ${esc(SPARTEN[s].label)}</label>`).join('')}</fieldset>`;
}

function notizen(el, k) {
  const liste = notizenSortiert(k);
  el.innerHTML = `
    <section class="karte-box">
      <h2>${maskottchen('notizen', 'titel-bild')} Neue Gesprächsnotiz</h2>
      <form id="notizForm" class="notiz-form">
        <textarea name="text" rows="4" placeholder="Was wurde besprochen?" required maxlength="50000"></textarea>
        ${spartenCheckboxen('sparte')}
        <div class="row2">
          <label>Zeitpunkt <small id="autoHinweis">(automatisch: jetzt)</small>
            <input type="datetime-local" name="zeitpunkt" value="${esc(isoToLocalInput(nowIso()))}">
          </label>
          <label class="check"><input type="checkbox" name="wv"> danach Wiedervorlage/Termin anlegen</label>
        </div>
        <button class="btn primary">Notiz speichern</button>
      </form>
    </section>
    <section class="karte-box">
      <h2>Verlauf (${liste.length})</h2>
      ${liste.length ? `<ul class="notizliste">${liste.map((n) => notizHtml(n)).join('')}</ul>` : '<p class="hinweis">Noch keine Notizen.</p>'}
    </section>`;

  const form = el.querySelector('#notizForm');
  let zeitManuell = false;
  form.zeitpunkt.addEventListener('input', () => { zeitManuell = true; el.querySelector('#autoHinweis').textContent = '(manuell)'; });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = form.text.value.trim();
    if (!text) { toast('Bitte einen Text eingeben.', 'error'); return; }
    const zeitpunkt = zeitManuell ? localInputToIso(form.zeitpunkt.value) : nowIso();
    if (!zeitpunkt) { toast('Ungültiger Zeitpunkt.', 'error'); return; }
    const sparten = Array.from(form.querySelectorAll('input[name="sparte"]:checked'), (c) => c.value);
    const n = neueNotiz({ text, zeitpunkt, sparten });
    store.mutate((d) => { const x = d.kunden.find((y) => y.id === k.id); if (x) { x.notizen.push(n); x.updatedAt = nowIso(); } });
    toast('Notiz gespeichert', 'ok');
    const wv = form.wv.checked;
    notizen(el, store.findKunde(k.id));
    if (wv) await terminDialog({ kundeId: k.id, sparte: sparten.length === 1 ? sparten[0] : '' });
  });

  el.querySelector('.notizliste')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-aktion]');
    const li = e.target.closest('li[data-id]');
    if (!btn || !li) return;
    const nid = li.dataset.id;
    const akt = store.findKunde(k.id);
    const n = akt?.notizen.find((x) => x.id === nid);
    if (!n) return;
    if (btn.dataset.aktion === 'loeschen') {
      if (!(await bestaetigen('Notiz löschen?', n.text.slice(0, 120)))) return;
      store.mutate((d) => { const x = d.kunden.find((y) => y.id === k.id); if (x) x.notizen = x.notizen.filter((y) => y.id !== nid); });
      notizen(el, store.findKunde(k.id));
    } else if (btn.dataset.aktion === 'bearbeiten') {
      const res = await dialog({
        titel: 'Notiz bearbeiten',
        html: `<label>Text<textarea name="text" rows="6" maxlength="50000">${esc(n.text)}</textarea></label>
               <label>Zeitpunkt<input type="datetime-local" name="zeitpunkt" value="${esc(isoToLocalInput(n.zeitpunkt))}" required></label>
               ${spartenCheckboxen('sparte', n.sparten)}`,
        knoepfe: [{
          label: 'Speichern', primaer: true,
          pruefen: (dlg) => (localInputToIso(dlg.querySelector('[name=zeitpunkt]').value) ? null : 'Ungültiger Zeitpunkt.'),
          wert: (dlg) => ({
            text: dlg.querySelector('[name=text]').value,
            zeitpunkt: localInputToIso(dlg.querySelector('[name=zeitpunkt]').value),
            sparten: Array.from(dlg.querySelectorAll('input[name="sparte"]:checked'), (c) => c.value),
          }),
        }],
      });
      if (!res) return;
      store.mutate((d) => {
        const x = d.kunden.find((y) => y.id === k.id);
        const i = x ? x.notizen.findIndex((y) => y.id === nid) : -1;
        if (i >= 0) { x.notizen[i] = normalizeNotiz({ ...x.notizen[i], ...res, updatedAt: nowIso() }); x.updatedAt = nowIso(); }
      });
      notizen(el, store.findKunde(k.id));
    }
  });
}

function notizHtml(n) {
  const gemischt = !notizErlaubt(n, 'enpal') && !notizErlaubt(n, 'vorwerk');
  return `<li data-id="${esc(n.id)}">
    <div class="notiz-kopf">
      <time>${esc(formatDateTime(n.zeitpunkt))}</time>
      <span class="tags">${n.sparten.map((s) => `<span class="tag tag-${s}">${esc(SPARTEN[s].kurz)}</span>`).join('')}${gemischt ? '<span class="tag warn" title="Erscheint in keinem Text, weil keine oder gemischte Sparten markiert sind">nicht in Texten</span>' : ''}</span>
      <button class="btn klein ghost" data-aktion="bearbeiten" aria-label="Bearbeiten">✎</button>
      <button class="btn klein ghost" data-aktion="loeschen" aria-label="Löschen">🗑</button>
    </div>
    <p>${esc(n.text).replace(/\n/g, '<br>')}</p>
  </li>`;
}

function bogen(el, k, sparten, kopf) {
  el.innerHTML = sparten.map((s) => `
    <section class="karte-box">
      <h2>${maskottchen(spartenIcon(s), 'titel-bild')} ${esc(SPARTEN[s].label)}</h2>
      <label class="status-zeile">Status <select data-feld="status.${s}">${statusOptions(k.status[s])}</select></label>
      <div class="formgrid">${FELDER[s].map((f) => feldHtml(s, f, k[s][f.key])).join('')}</div>
    </section>`).join('');
  bindeFelder(el, k.id, kopf);
}

const enpal = (el, k, kopf) => bogen(el, k, ['pv', 'wp'], kopf);
const vorwerk = (el, k, kopf) => bogen(el, k, ['vorwerk'], kopf);

function termine(el, k) {
  const d = store.getData();
  const liste = d.termine.filter((t) => t.kundeId === k.id).sort((a, b) => (a.beginn < b.beginn ? 1 : -1));
  el.innerHTML = `
    <section class="karte-box">
      <header class="seitenkopf">
        <h2>${maskottchen('termine', 'titel-bild')} Termine &amp; Wiedervorlagen</h2>
        <button class="btn primary" id="neu">+ Neu</button>
      </header>
      ${liste.length ? `<ul class="terminliste">${liste.map((t) => terminZeile(t, null)).join('')}</ul>
      <button class="btn ghost" id="alleIcs">Offene in Kalender exportieren</button>` : '<p class="hinweis">Keine Termine.</p>'}
    </section>`;
  el.querySelector('#neu').addEventListener('click', async () => { if (await terminDialog({ kundeId: k.id })) termine(el, store.findKunde(k.id)); });
  const ul = el.querySelector('.terminliste');
  if (ul) terminListeVerdrahten(ul, () => termine(el, store.findKunde(k.id)));
  el.querySelector('#alleIcs')?.addEventListener('click', () => icsExport(liste.filter((t) => !t.erledigt), 'sperling-kunde.ics'));
}

function texte(el, k) {
  const einst = store.getData().einstellungen;
  const ausgelassen = ausgelasseneNotizen(k);
  el.innerHTML = `
    <p class="hinweis">Die beiden Texte sind strikt getrennt: Der Enpal-Text enthält nur Photovoltaik und Wärmepumpe, der Vorwerk-Text nur Vorwerk. Notizen erscheinen nur, wenn sie ausschließlich einer Seite zugeordnet sind.${ausgelassen ? ` <b>${ausgelassen} Notiz(en)</b> sind keiner oder beiden Seiten zugeordnet und erscheinen deshalb in keinem Text.` : ''}</p>
    <div class="spalten">
      ${['enpal', 'vorwerk'].map((g) => `
      <section class="karte-box text-${g}">
        <h2>${maskottchen(g === 'enpal' ? 'photovoltaik' : 'vorwerk', 'titel-bild')} ${esc(GRUPPEN[g].label)}</h2>
        <textarea readonly rows="16" id="text-${g}">${esc(generiereText(k, g, einst))}</textarea>
        <div class="knopfreihe">
          <button class="btn primary" data-kopieren="${g}">In Zwischenablage kopieren</button>
          <button class="btn ghost" data-mail="${g}">✉️ Per E-Mail senden</button>
        </div>
      </section>`).join('')}
    </div>
    <p class="hinweis">Vorlagen kannst du unter <a href="#/einstellungen">Einstellungen</a> anpassen.</p>`;
  el.querySelectorAll('[data-kopieren]').forEach((b) => b.addEventListener('click', async () => {
    const ok = await kopieren(el.querySelector(`#text-${b.dataset.kopieren}`).value);
    toast(ok ? 'Kopiert' : 'Kopieren nicht möglich – bitte Text markieren.', ok ? 'ok' : 'error');
  }));
  el.querySelectorAll('[data-mail]').forEach((b) => b.addEventListener('click', () => {
    const g = b.dataset.mail;
    emailSchreiben({
      an: einst.empfaenger?.[g] || '',
      betreff: `${g === 'enpal' ? 'Enpal' : 'Vorwerk'}: ${kundenTitel(k)}`,
      text: el.querySelector(`#text-${g}`).value,
    });
  }));
}

function gespraeche(el, k) {
  const liste = [...k.gespraeche].sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? 1 : -1));
  el.innerHTML = `
    <section class="karte-box">
      <header class="seitenkopf">
        <h2>${maskottchen('notizen', 'titel-bild')} Gespräche &amp; Ergebnisse</h2>
        <a class="btn primary" href="#/gespraech?kunde=${esc(k.id)}">Neues Gespräch</a>
      </header>
      ${liste.length ? `<ul class="gespraechsliste">${liste.map((g) => `
        <li>
          <div class="notiz-kopf"><time>${esc(formatDateTime(g.zeitpunkt))}</time><span class="tags"><span class="tag tag-${g.sparte}">${esc(SPARTEN[g.sparte].label)}</span></span></div>
          <p class="ausgang ausgang-${esc(g.ausgang)}">${esc(AUSGANG[g.ausgang] || 'Ohne Ergebnis')}</p>
          ${g.naechsterSchritt ? `<p><b>Nächster Schritt:</b> ${esc(g.naechsterSchritt)}</p>` : ''}
          ${g.einwaende.length ? `<ul class="einwand-ergebnisse">${g.einwaende.map((e) => `<li class="e-${esc(e.ergebnis)}">„${esc(e.text)}“ <small>${esc(ERGEBNIS[e.ergebnis])}</small></li>`).join('')}</ul>` : ''}
          ${g.notiz ? `<p class="hinweis">${esc(g.notiz)}</p>` : ''}
        </li>`).join('')}</ul>` : '<p class="hinweis">Noch keine Gespräche mit dem Leitfaden erfasst.</p>'}
    </section>`;
}
