// Kundendetail: Stammdaten, Spartenstatus, Gesprächsnotizen, Erfassungsbögen, Termine, Texte.
import * as bestandKunde from '../bestandkunde.ts';
import { esc, debounce, parseNumber, isoToLocalInput, localInputToIso, formatDateTime, distanceMeters, nowIso } from '../../core/util.ts';
import { NACHBAR_RADIEN, radiusText, AUSGANG, SPARTEN, SPARTEN_KEYS, STATUS, kundenTitel, adresseEinzeilig, notizenSortiert, neueNotiz, normalizeNotiz, type Sparte } from '../../core/model.ts';
import { ERGEBNIS } from '../../core/einwaende.ts';
import { generiereText, ausgelasseneNotizen, GRUPPEN, GRUPPEN_KEYS, notizErlaubt } from '../../core/textgen.ts';
import * as store from '../../storage/store.ts';
import { koordinateZuAdresse } from '../../services/geo.ts';
import { maskottchen, toast, kopieren, bestaetigen, dialog } from '../dom.ts';
import { anrufen, emailSchreiben } from '../kontakt.ts';
import { felderHtml } from '../felder.ts';
import { markierenHtml, markierenVerdrahten, markierenNeuZeichnen } from '../produkte.ts';
import * as enpalDoku from '../enpaldoku.ts';
import * as pk from '../../core/papierkorb.ts';
import { hinfahrenKnopf } from '../navi.ts';
import * as kundenansicht from '../kundenansicht.ts';
import { istBeispiel } from '../../demo.ts';
import { kundenVerlauf, letzterKontakt, tageSeit, seitText, type VerlaufEintrag } from '../../core/verlauf.ts';
import { kontaktKlasse } from './kunden.ts';
import * as ablauf from '../gespraechsablauf.ts';
import * as suche from '../suche.ts';
import * as kundenfotos from '../kundenfotos.ts';
import * as vertrieb from '../vertrieb.ts';
import * as ruecksprung from '../ruecksprung.ts';
import { statusOptions, terminDialog, terminZeile, terminListeVerdrahten, icsExport, spartenIcon, statusChips } from '../parts.ts';

const TABS = [
  { key: 'uebersicht', label: 'Übersicht', bild: 'kunde-neu' },
  { key: 'notizen', label: 'Notizen', bild: 'notizen' },
  { key: 'pv', label: 'Photovoltaik', bild: 'photovoltaik' },
  { key: 'doku', label: 'Enpal-Doku', bild: 'photovoltaik' },
  { key: 'wp', label: 'Wärmepumpe', bild: 'waermepumpe' },
  { key: 'vorwerk', label: 'Vorwerk', bild: 'vorwerk' },
  { key: 'angebote', label: 'Angebot & Auftrag', bild: 'notizen' },
  { key: 'fotos', label: 'Fotos', bild: 'kunde-neu' },
  { key: 'verlauf', label: 'Verlauf', bild: 'notizen' },
  { key: 'termine', label: 'Termine', bild: 'termine' },
  { key: 'texte', label: 'Texte', bild: 'notizen' },
];


export function render(el: HTMLElement, params: URLSearchParams, [id = '']: string[]) {
  const kunde = store.findKunde(id);
  if (!kunde) {
    el.innerHTML = `<div class="leer">${maskottchen('sperling', 'gross')}<p>Diesen Kunden gibt es nicht (mehr).</p><a class="btn" href="#/kunden">Zur Kundenliste</a></div>`;
    return;
  }
  // frühere Reiter: „gespraeche“ → Verlauf, „enpal“ (PV & WP) → Photovoltaik
  const tabWunsch = ({ gespraeche: 'verlauf', enpal: 'pv' } as Record<string, string>)[params.get('tab') || ''] || params.get('tab');
  let tab = TABS.some((t) => t.key === tabWunsch) ? tabWunsch : 'uebersicht';
  const laeuft = ablauf.entwurf(id);

  el.innerHTML = `
    <header class="seitenkopf kunde-kopf">
      <a href="#/kunden" class="zurueck" aria-label="Zurück">‹</a>
      <h1 id="kTitel">${esc(kundenTitel(kunde))}</h1>${istBeispiel(kunde.id) ? '<span class="tag tag-beispiel">Beispiel</span>' : ''}
      <span id="kChips">${statusChips(kunde)}</span>
    </header>
    <p class="kunde-kontakt"><button type="button" class="kontakt-alter-knopf" id="kKontakt" title="Letzten Kontakt von Hand setzen"></button></p>
    <div id="kBand">${vertrieb.werbeverbotBand(kunde)}</div>
    <div class="knopfreihe kunde-aktionen"><a class="btn klein primary" href="#/kunde/${esc(kunde.id)}/gespraech" id="gespraechStarten">${laeuft ? '▶ Gespräch fortsetzen' : '📞 Gespräch starten'}</a><a class="btn klein" href="#/kunde/${esc(kunde.id)}/gespraech?seite=leitfaden">💬 Gesprächsleitfaden</a><button class="btn klein" id="kundenansicht">👁 Kundenansicht zum Herzeigen</button></div>
    <nav class="tabs" role="tablist">
      ${TABS.map((t) => `<button role="tab" data-tab="${t.key}" class="${t.key === tab ? 'aktiv' : ''}">${esc(t.label)}</button>`).join('')}
    </nav>
    <div id="tabInhalt"></div>`;

  el.querySelector('#kundenansicht').addEventListener('click', () => {
    kundenansicht.starten(kunde.id);
  });
  const inhalt = el.querySelector('#tabInhalt');
  const kontaktZeigen = () => {
    const k = store.findKunde(id);
    if (!k) return;
    const iso = letzterKontakt(store.getData(), k);
    const t = tageSeit(iso);
    const b = el.querySelector('#kKontakt');
    if (!b) return; // Ansicht schon verlassen
    b.className = `kontakt-alter-knopf kontakt-alter ${kontaktKlasse(t)}`;
    b.textContent = iso ? `Letzter Kontakt ${seitText(t)} · ${formatDateTime(iso).slice(0, 10)} ✎` : 'Noch kein Kontakt ✎';
  };
  kontaktZeigen();
  el.querySelector('#kKontakt').addEventListener('click', async () => {
    const k = store.findKunde(id);
    if (!k) return;
    const heute = new Date(); const z = (n: number) => String(n).padStart(2, '0');
    const heuteStr = `${heute.getFullYear()}-${z(heute.getMonth() + 1)}-${z(heute.getDate())}`;
    const res = await dialog({
      titel: 'Letzter Kontakt',
      html: `<p class="hinweis">Sperling ermittelt den letzten Kontakt selbst aus Gesprächen, Notizen, erledigten Terminen und Verleihen. Hier trägst du einen Kontakt nach, der sonst nirgends steht, z. B. ein kurzes Gespräch an der Haustür.</p>
        <label>Kontakt am<input type="date" name="tag" value="${esc(k.letzterKontaktManuell ? k.letzterKontaktManuell.slice(0, 10) : heuteStr)}" max="${heuteStr}"></label>`,
      knoepfe: [
        ...(k.letzterKontaktManuell ? [{ label: 'Eintrag entfernen', wert: 'weg' }] : []),
        { label: 'Speichern', primaer: true, wert: (dlg) => dlg.querySelector('[name=tag]').value || null },
      ],
    });
    if (res === null || res === undefined) return;
    const wert = res === 'weg' ? null : new Date(`${res}T12:00`).toISOString();
    if (res !== 'weg' && Number.isNaN(Date.parse(wert || ''))) { toast('Ungültiges Datum.', 'error'); return; }
    store.mutate((d) => { const x = d.kunden.find((y) => y.id === id); if (x) { x.letzterKontaktManuell = wert; x.updatedAt = nowIso(); } });
    kontaktZeigen();
  });
  const kopfAktualisieren = () => {
    const k = store.findKunde(id);
    if (!k || !el.querySelector('#kTitel')) return;
    kontaktZeigen();
    el.querySelector('#kTitel').textContent = kundenTitel(k);
    el.querySelector('#kChips').innerHTML = statusChips(k);
    const band = el.querySelector('#kBand');
    if (band) band.innerHTML = vertrieb.werbeverbotBand(k);
  };

  const zeigeTab = (t) => {
    tab = t;
    el.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('aktiv', b.dataset.tab === t));
    history.replaceState(null, '', `#/kunde/${id}?tab=${t}`);
    const k = store.findKunde(id);
    if (!k) { location.hash = '#/kunden'; return; }
    ({ uebersicht, notizen, pv, wp, doku: enpalDoku.tab, vorwerk, angebote: vertrieb.tab, fotos: kundenfotos.tab, verlauf, termine, texte })[t](inhalt, k, kopfAktualisieren);
  };
  el.querySelector('.tabs').addEventListener('click', (e) => {
    const b = (e.target as Element).closest('button[data-tab]');
    if (b) zeigeTab(b.dataset.tab);
  });
  zeigeTab(tab);
  if (params.get('neu') === '1') el.querySelector('[data-feld="vorname"]')?.focus();
  if (params.get('fokus') === 'notiz') el.querySelector<HTMLTextAreaElement>('#notizForm textarea')?.focus();
  suche.merken('kunde', id);
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

export function bindeFelder(root, kundeId, nachher) {
  const speichern = (input) => {
    const pfad = input.dataset.feld;
    const wert = feldwert(input);
    store.mutate((d) => {
      const k = d.kunden.find((x) => x.id === kundeId);
      if (!k) return;
      if (setzePfad(k, pfad, wert)) k.updatedAt = nowIso();
    });
    nachher?.(pfad);
    // Status „Abschluss“/„Kein Interesse“: offene Angebote gleich mit entscheiden, Auftragsstand anbieten
    if (typeof pfad === 'string' && pfad.startsWith('status.')) void vertrieb.statusFolge(kundeId, pfad.slice(7) as Sparte, String(wert)).then((x) => { if (x) nachher?.(pfad); });
  };
  const verzoegert = new Map();
  root.addEventListener('input', (e) => {
    const inp = (e.target as Element).closest('[data-feld]');
    if (!inp || inp.tagName === 'SELECT') return;
    if (!verzoegert.has(inp)) verzoegert.set(inp, debounce(() => speichern(inp), 350));
    verzoegert.get(inp)();
  });
  root.addEventListener('change', (e) => {
    const inp = (e.target as Element).closest('[data-feld]');
    if (!inp) return;
    verzoegert.get(inp)?.flush?.();
    if (inp.tagName === 'SELECT') speichern(inp);
  });
}

// ---------- Tabs ----------

function uebersicht(el, k, kopf) {
  const radius = store.getData().einstellungen.nachbarRadiusM;
  const nachbarn = k.lat !== null
    ? store.getData().kunden
      .filter((x) => x.id !== k.id && x.lat !== null && x.lng !== null)
      .map((x) => ({ x, m: distanceMeters(k.lat!, k.lng!, x.lat!, x.lng!) }))
      .filter((n) => n.m <= radius)
      .sort((a, b) => a.m - b.m)
    : [];
  const zuletzt = kundenVerlauf(store.getData(), k).filter((v) => v.art === 'gespraech' || v.art === 'notiz').slice(0, 3);
  el.innerHTML = `
    <section class="karte-box">
      <header class="seitenkopf"><h2>${maskottchen('notizen', 'titel-bild')} Letzte Gespräche</h2><a class="btn klein ghost" href="#/kunde/${esc(k.id)}?tab=verlauf">Ganzer Verlauf</a></header>
      ${zuletzt.length ? `<ul class="verlauf kurz">${zuletzt.map(verlaufHtml).join('')}</ul>` : `<p class="hinweis">Noch keine Gespräche. Mit „📞 Gespräch starten“ schreibst du beim Telefonat mit und hast die Kundendaten daneben.</p>`}
    </section>
    <section class="karte-box">
      <h2>Interesse je Sparte</h2>
      <div class="sparten-status">
        ${SPARTEN_KEYS.map((s) => `
          <label class="sparte-karte bereich-${s}" style="--c:${STATUS[k.status[s]].farbe}">
            ${maskottchen(spartenIcon(s), 'sparte-bild')}
            <span>${esc(SPARTEN[s].label)}</span>
            <select data-feld="status.${s}" data-status>${statusOptions(k.status[s])}</select>
          </label>`).join('')}
      </div>
    </section>
    <section class="karte-box">
      <h2>Kontakt</h2>
      <div class="formgrid">${felderHtml('kontakt', k, store.getData().einstellungen.felder) || '<p class="hinweis breit">Alle Kontaktfelder sind ausgeblendet (Einstellungen → Felder).</p>'}</div>
      <div class="knopfreihe">
        <button class="btn ghost" id="anrufen">📞 Anrufen</button>
        <button class="btn ghost" id="mailen">✉️ E-Mail schreiben</button>
        ${hinfahrenKnopf(k)}
        ${k.lat !== null ? `<a class="btn ghost" href="#/karte?kunde=${esc(k.id)}">🗺️ Auf Karte zeigen</a>` : ''}
        <button class="btn ghost" id="geocode">📍 Standort aus Adresse ermitteln</button>
      </div>
    </section>
    ${vertrieb.ansprechpartnerHtml(k)}
    ${vertrieb.haustuerHtml(k)}
    ${bestandKunde.blockHtml(k.id)}
    ${k.lat !== null ? `
    <section class="karte-box nachbarn-box">
      <header class="seitenkopf"><h2>${maskottchen('karte', 'titel-bild')} Nachbarn <small>(${nachbarn.length})</small></h2>
        <label class="umkreis">Umkreis <select id="umkreis">${NACHBAR_RADIEN.map((r) => `<option value="${r}" ${r === radius ? 'selected' : ''}>${radiusText(r)}</option>`).join('')}</select></label></header>
      ${nachbarn.length ? `<ul class="liste">${nachbarn.slice(0, 100).map(({ x, m }) => `<li><a class="zeile" href="#/kunde/${esc(x.id)}"><span class="zeile-haupt"><strong>${esc(kundenTitel(x))}</strong><small>${m >= 1000 ? `${(m / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} km` : `${Math.round(m)} m`} entfernt${x.ort && x.ort !== k.ort ? ` · ${esc(x.ort)}` : ''}</small></span>${statusChips(x)}</a></li>`).join('')}</ul>${nachbarn.length > 100 ? '<p class="hinweis">Die 100 nächsten werden gezeigt.</p>' : ''}` : `<p class="hinweis">Im Umkreis von ${radiusText(radius)} gibt es keine Kunden mit Standort. Wähle einen größeren Umkreis oder markiere Nachbarhäuser auf der Karte.</p>`}
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

  el.querySelector('#umkreis')?.addEventListener('change', (e) => {
    const r = Number((e.target as HTMLSelectElement).value);
    store.mutate((d) => { d.einstellungen.nachbarRadiusM = r; });
    uebersicht(el, store.findKunde(k.id), kopf);
  });

  bestandKunde.verdrahten(el, k.id, () => { kopf(); uebersicht(el, store.findKunde(k.id), kopf); });
  vertrieb.ansprechpartnerVerdrahten(el, k.id, () => uebersicht(el, store.findKunde(k.id), kopf));
  vertrieb.haustuerVerdrahten(el, () => { kopf(); uebersicht(el, store.findKunde(k.id), kopf); });
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
    const adr = akt ? adresseEinzeilig(akt) : '';
    if (!adr) { toast('Bitte zuerst eine Adresse eingeben.', 'error'); return; }
    e.target.disabled = true;
    try {
      const pos = await koordinateZuAdresse(adr);
      if (!pos) { toast('Adresse nicht gefunden.', 'error'); return; }
      store.mutate((d) => { const x = d.kunden.find((y) => y.id === k.id); if (x) { x.lat = pos.lat; x.lng = pos.lng; x.updatedAt = nowIso(); } });
      toast('Standort gesetzt', 'ok');
      uebersicht(el, store.findKunde(k.id), kopf);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      e.target.disabled = false;
    }
  });

  el.querySelector('#loeschen').addEventListener('click', async () => {
    const ok = await bestaetigen('Kunde löschen?', `${kundenTitel(k)} kommt mit allen Notizen in die Liste „Gelöscht“ und lässt sich dort jederzeit wiederherstellen. Zugehörige Termine bleiben erhalten.`);
    if (!ok) return;
    store.mutate((d) => { pk.kundeLoeschen(d, k.id); });
    toast('Kunde gelöscht – unter Kunden › Gelöscht wiederherstellbar', 'ok', 5000);
    location.hash = '#/kunden';
  });
}

function spartenCheckboxen(name: string, aktiv: string[] = []) {
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
    const sparten = Array.from(form.querySelectorAll('input[name="sparte"]:checked'), (c: HTMLInputElement) => c.value);
    const n = neueNotiz({ text, zeitpunkt, sparten });
    store.mutate((d) => { const x = d.kunden.find((y) => y.id === k.id); if (x) { x.notizen.push(n); x.updatedAt = nowIso(); } });
    toast('Notiz gespeichert', 'ok');
    const wv = form.wv.checked;
    notizen(el, store.findKunde(k.id));
    if (wv) await terminDialog({ kundeId: k.id, sparte: sparten.length === 1 ? sparten[0] : '' });
  });

  el.querySelector('.notizliste')?.addEventListener('click', async (e) => {
    const btn = (e.target as Element).closest('[data-aktion]');
    const li = (e.target as Element).closest('li[data-id]');
    if (!btn || !li) return;
    const nid = li.dataset.id || '';
    const akt = store.findKunde(k.id);
    const n = akt?.notizen.find((x) => x.id === nid);
    if (!n) return;
    if (btn.dataset.aktion === 'loeschen') {
      if (!(await bestaetigen('Notiz löschen?', n.text.slice(0, 120)))) return;
      store.mutate((d) => { pk.notizLoeschen(d, k.id, nid); });
      toast('Notiz gelöscht – unter Kunden › Gelöscht wiederherstellbar', 'ok');
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
        if (x && i >= 0) { x.notizen[i] = normalizeNotiz({ ...x.notizen[i], ...res, updatedAt: nowIso() }); x.updatedAt = nowIso(); }
      });
      notizen(el, store.findKunde(k.id));
    }
  });
}

function notizHtml(n) {
  const gemischt = !GRUPPEN_KEYS.some((g) => notizErlaubt(n, g));
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
    <section class="karte-box bereich-rand bereich-${s}">
      <h2>${maskottchen(spartenIcon(s), 'titel-bild')} ${esc(SPARTEN[s].label)}</h2>
      ${s === 'pv' || s === 'wp' ? `<a class="btn klein rz-knopf" href="#/rechner?kunde=${esc(k.id)}&amp;art=${s}" data-zum-rechner>🧮 Wann rechnet sich das?</a>` : ''}
      <label class="status-zeile">Status <select data-feld="status.${s}">${statusOptions(k.status[s])}</select></label>
      <div class="formgrid">${felderHtml(s, k, store.getData().einstellungen.felder)}</div>
      ${markierenHtml(k, s)}
    </section>`).join('');
  bindeFelder(el, k.id, kopf);
  markierenVerdrahten(el, k.id, (b) => markierenNeuZeichnen(el, k.id, b));
  // Verzahnt: mit den Angaben dieses Kunden in den Rechner, „Zurück“ führt an dieselbe Stelle
  el.querySelectorAll('[data-zum-rechner]').forEach((a) => a.addEventListener('click', () => ruecksprung.merken()));
}

const pv = (el, k, kopf) => bogen(el, k, ['pv'], kopf);
const wp = (el, k, kopf) => bogen(el, k, ['wp'], kopf);
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
    <p class="hinweis">Die drei Texte sind strikt getrennt: Photovoltaik für Enpal, Wärmepumpe für GALVANY, Vorwerk für Vorwerk. Jeder enthält nur seinen eigenen Bereich. Ältere Notizen, die Photovoltaik und Wärmepumpe gemeinsam betreffen, stehen in beiden dieser Texte.${ausgelassen ? ` <b>${ausgelassen} Notiz(en)</b> sind keinem oder mehreren Anbietern zugeordnet und erscheinen deshalb in keinem Text.` : ''}</p>
    <div class="spalten drei">
      ${GRUPPEN_KEYS.map((g) => `
      <section class="karte-box text-${g} bereich-rand bereich-${g}">
        <h2>${maskottchen(spartenIcon(g), 'titel-bild')} ${esc(GRUPPEN[g].label)}</h2>
        <textarea readonly rows="16" id="text-${g}">${esc(generiereText(k, g, einst))}</textarea>
        <div class="knopfreihe">
          <button class="btn primary" data-kopieren="${g}">In Zwischenablage kopieren</button>
          <button class="btn ghost" data-mail="${g}">✉️ Per E-Mail senden</button>
        </div>
      </section>`).join('')}
    </div>
    <p class="hinweis">Vorlagen kannst du unter <a href="#/einstellungen?bereich=texte">Einstellungen → Texte &amp; E-Mail</a> anpassen.</p>`;
  el.querySelectorAll('[data-kopieren]').forEach((b) => b.addEventListener('click', async () => {
    const ok = await kopieren(el.querySelector(`#text-${b.dataset.kopieren}`).value);
    toast(ok ? 'Kopiert' : 'Kopieren nicht möglich – bitte Text markieren.', ok ? 'ok' : 'error');
  }));
  el.querySelectorAll('[data-mail]').forEach((b) => b.addEventListener('click', () => {
    const g = b.dataset.mail;
    emailSchreiben({
      an: einst.empfaenger?.[g] || '',
      betreff: `${GRUPPEN[g].anbieter} ${SPARTEN[g].label}: ${kundenTitel(k)}`,
      text: el.querySelector(`#text-${g}`).value,
    });
  }));
}

const VERLAUF_FILTER = [['alle', 'Alles'], ['gespraech', 'Gespräche'], ['notiz', 'Notizen'], ['termin', 'Termine'], ['verleih', 'Geräte'], ['produkt', 'Produkte'], ['haustuer', 'Haustür']] as const;
const VERLAUF_SYMBOL: Record<VerlaufEintrag['art'], string> = { gespraech: '💬', notiz: '📝', termin: '📅', verleih: '📦', produkt: '🏷️', haustuer: '🚪' };

function verlaufHtml(v: VerlaufEintrag) {
  return `<li class="verlauf-eintrag art-${v.art}${v.zukunft ? ' zukunft' : ''}${v.erledigt ? ' erledigt' : ''}">
    <span class="verlauf-symbol" aria-hidden="true">${VERLAUF_SYMBOL[v.art]}</span>
    <div>
      <div class="notiz-kopf"><time>${esc(formatDateTime(v.zeitpunkt))}</time><strong>${esc(v.titel)}</strong>
        <span class="tags">${v.sparten.map((s) => `<span class="tag tag-${s}">${esc(SPARTEN[s].kurz)}</span>`).join('')}${v.zukunft ? '<span class="tag">geplant</span>' : ''}${v.erledigt ? '<span class="tag">erledigt</span>' : ''}</span></div>
      ${v.zeilen.map((z) => `<p>${esc(z).replace(/\n/g, '<br>')}</p>`).join('')}
    </div>
  </li>`;
}

function verlauf(el, k) {
  let filter = 'alle';
  const zeichnen = () => {
    const alle = kundenVerlauf(store.getData(), store.findKunde(k.id) || k);
    const liste = filter === 'alle' ? alle : alle.filter((v) => v.art === filter);
    el.innerHTML = `
    <section class="karte-box">
      <header class="seitenkopf">
        <h2>${maskottchen('notizen', 'titel-bild')} Gesprächshistorie</h2>
        <a class="btn primary" href="#/kunde/${esc(k.id)}/gespraech">${ablauf.entwurf(k.id) ? '▶ Gespräch fortsetzen' : '📞 Gespräch starten'}</a>
      </header>
      <div class="chips-filter" role="group" aria-label="Filter">${VERLAUF_FILTER.map(([f, l]) => `<button type="button" data-filter="${f}" class="${f === filter ? 'aktiv' : ''}">${l} <small>${f === 'alle' ? alle.length : alle.filter((v) => v.art === f).length}</small></button>`).join('')}</div>
      ${liste.length ? `<ul class="verlauf">${liste.map(verlaufHtml).join('')}</ul>` : '<p class="hinweis">Noch nichts im Verlauf.</p>'}
      <p class="hinweis">Notizen bearbeitest du unter „Notizen“, die Enpal-Dokumentation unter „Enpal-Doku“.</p>
    </section>`;
    el.querySelector('.chips-filter').addEventListener('click', (e) => { const b = (e.target as Element).closest('[data-filter]'); if (b) { filter = b.dataset.filter || 'alle'; zeichnen(); } });
  };
  zeichnen();
}
