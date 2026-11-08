// Sperling – laufendes Gespräch mit einem Kunden in geteilter Ansicht:
// links die Kundendaten (weiter bearbeitbar), rechts Notizen, Leitfaden und Abschluss.
// Am Handy werden daraus Reiter. Der Entwurf bleibt im Arbeitsspeicher, bis gespeichert oder verworfen wird.
import * as schnellwahl from '../schnellwahl.ts';
import { esc, formatDateTime, localInputToIso } from '../../core/util.ts';
import { SPARTEN, SPARTEN_KEYS, STATUS, AUSGANG, KONTAKTART, kundenTitel, adresseEinzeilig, type Sparte } from '../../core/model.ts';
import { kundenVerlauf } from '../../core/verlauf.ts';
import * as store from '../../storage/store.ts';
import { maskottchen, toast, bestaetigen } from '../dom.ts';
import { anrufen } from '../kontakt.ts';
import { statusOptions, spartenIcon, statusChips } from '../parts.ts';
import * as ablauf from '../gespraechsablauf.ts';
import * as leitfaden from './gespraech.ts';
import { bindeFelder } from './kunde.ts';
import { felderHtml } from '../felder.ts';
import { markierenHtml, markierenVerdrahten, markierenNeuZeichnen } from '../produkte.ts';
import { bausteinAnhaengen } from '../../core/bausteine.ts';
import { stand, schrittVorschlag } from '../../core/klemmbrett.ts';

type Seite = 'notizen' | 'leitfaden' | 'abschluss';
const SEITEN: [Seite, string][] = [['leitfaden', '📋 Klemmbrett'], ['notizen', '📝 Notizen'], ['abschluss', '✓ Abschließen']];

export function render(el: HTMLElement, params: URLSearchParams, [id = '']: string[]) {
  const k0 = store.findKunde(id);
  if (!k0) { location.hash = '#/kunden'; return; }
  const e = ablauf.beginnen(id);
  let seite: Seite = SEITEN.some(([s]) => s === params.get('seite')) ? params.get('seite') as Seite : 'leitfaden';
  // Am Handy: Kunde oder Gespräch zeigen
  let handyKunde = false;
  let uhr = 0;

  el.innerHTML = `
    <header class="seitenkopf gm-kopf">
      <a href="#/kunde/${esc(id)}" class="zurueck" aria-label="Zur Kundenkartei">‹</a>
      <h1><span class="gm-live" aria-hidden="true"></span> Gespräch mit <span id="gmName">${esc(kundenTitel(k0))}</span></h1>
      <span class="gm-uhr" id="gmUhr" title="Dauer seit Beginn"></span>
    </header>
    <nav class="tabs gm-handy" aria-label="Kunde oder Gespräch"><button data-handy="kunde">👤 Kunde</button><button data-handy="gespraech" class="aktiv">💬 Gespräch</button></nav>
    <div class="gm-teilung">
      <section class="gm-links" id="gmLinks" aria-label="Kundendaten"></section>
      <section class="gm-rechts" aria-label="Gespräch">
        <nav class="tabs gm-seiten" aria-label="Seite">${SEITEN.map(([s, l]) => `<button data-seite="${s}" class="${s === seite ? 'aktiv' : ''}">${l}</button>`).join('')}</nav>
        <div id="gmRechts"></div>
      </section>
    </div>`;

  const links = el.querySelector('#gmLinks');
  const rechts = el.querySelector('#gmRechts');
  const teilung = el.querySelector('.gm-teilung');

  // ---------- Links: Kundendaten ----------
  const linksZeichnen = () => {
    const k = store.findKunde(id);
    if (!k) return;
    const bisher = kundenVerlauf(store.getData(), k).filter((v) => v.art === 'gespraech' || v.art === 'notiz').slice(0, 3);
    links.innerHTML = `
      <div class="karte-box gm-kontakt">
        <div class="gm-chips">${statusChips(k)}</div>
        <div class="formgrid">${felderHtml('kontakt', k, store.getData().einstellungen.felder, { 'kontakt.telefon': '<button type="button" class="btn klein" id="gmAnrufen" aria-label="Anrufen">📞</button>' })}</div>
      </div>
      <div class="karte-box">
        <h2>Zuletzt</h2>
        ${bisher.length ? `<ul class="gm-bisher">${bisher.map((v) => `<li><b>${esc(formatDateTime(v.zeitpunkt))}</b> · ${esc(v.titel)}<p>${esc(v.zeilen.join('\n')).replace(/\n/g, '<br>')}</p></li>`).join('')}</ul>
          <a class="btn klein ghost" href="#/kunde/${esc(id)}?tab=verlauf">Ganzer Verlauf</a>` : '<p class="hinweis">Erstes Gespräch mit diesem Kunden.</p>'}
      </div>
      ${SPARTEN_KEYS.map((s) => `
      <details class="karte-box gm-bogen bereich-rand bereich-${s}" ${e.sparten.includes(s) ? 'open' : ''}>
        <summary>${maskottchen(spartenIcon(s), 'mini')} ${esc(SPARTEN[s].label)} <small>${esc(STATUS[k.status[s]].label)}</small></summary>
        <label class="status-zeile">Status <select data-feld="status.${s}">${statusOptions(k.status[s])}</select></label>
        <div class="formgrid">${felderHtml(s, k, store.getData().einstellungen.felder)}</div>
        ${markierenHtml(k, s, e.sparten.includes(s))}
      </details>`).join('')}`;
    links.querySelector('#gmAnrufen')?.addEventListener('click', () => {
      const akt = store.findKunde(id);
      if (!akt?.telefon) { toast('Bitte zuerst eine Telefonnummer eintragen.', 'error'); return; }
      e.kontaktart = 'telefon';
      anrufen(kundenTitel(akt), akt.telefon);
      if (seite === 'notizen') rechtsZeichnen();
    });
  };
  bindeFelder(links, id, (pfad: string) => {
    const k = store.findKunde(id);
    if (!k) return;
    el.querySelector('#gmName').textContent = kundenTitel(k);
    if (pfad.startsWith('status.')) { links.querySelector('.gm-chips').innerHTML = statusChips(k); if (seite === 'abschluss') rechtsZeichnen(); }
  });
  markierenVerdrahten(links, id, (b) => markierenNeuZeichnen(links, id, b));

  // ---------- Rechts ----------
  const gruppen = (): ablauf.Gruppe[] => SPARTEN_KEYS.filter((g) => e.sparten.includes(g) || (e.notiz[g] || '').trim());

  // Textbausteine des Bereichs
  const bausteineHtml = (g: ablauf.Gruppe) => {
    const bs = store.getData().einstellungen.bausteine[g] || [];
    if (!bs.length) return '';
    return `<div class="gm-bausteine" data-gruppe="${g}"><div class="gm-baustein-reihe" role="group" aria-label="Textbausteine ${esc(SPARTEN[g].label)}">${bs.map((t, i) => `<button type="button" class="chip-wahl gm-baustein" data-baustein="${g}:${i}">+ ${esc(t)}</button>`).join('')}</div></div>`;
  };

  const notizenZeichnen = () => {
    const gs = gruppen();
    rechts.innerHTML = `
      <div class="karte-box">
        <div class="gm-art segment" role="group" aria-label="Kontaktart">${Object.entries(KONTAKTART).map(([key, v]) => `<button type="button" data-art="${key}" class="${e.kontaktart === key ? 'aktiv' : ''}">${esc(v.replace('Telefonische Kontaktaufnahme', 'Telefonat').replace('Sonstiger Kontakt', 'Sonstiges'))}</button>`).join('')}</div>
        <label class="check"><input type="checkbox" id="gmErreicht" ${e.erreicht ? 'checked' : ''}> Kunde erreicht</label>
        <div class="gm-sparten" role="group" aria-label="Worüber wird gesprochen?">
          <span>Thema:</span>${SPARTEN_KEYS.map((s) => `<button type="button" class="chip-wahl tag-${s} ${e.sparten.includes(s) ? 'aktiv' : ''}" data-sparte="${s}" aria-pressed="${e.sparten.includes(s)}">${esc(SPARTEN[s].label)}</button>`).join('')}
        </div>
      </div>
      ${gs.length ? gs.map((g) => `
      <div class="karte-box gm-notiz bereich-rand bereich-${g}">
        <label for="gmNotiz-${g}">${gs.length > 1 ? `Notizen ${esc(SPARTEN[g].label)} <small>(${esc(SPARTEN[g].anbieter)})</small>` : 'Notizen'}</label>
        ${bausteineHtml(g)}
        <textarea id="gmNotiz-${g}" data-gruppe="${g}" rows="${gs.length > 2 ? 5 : gs.length > 1 ? 7 : 12}" placeholder="Was sagt der Kunde? Wünsche, Bedenken, Absprachen … oder oben Bausteine antippen">${esc(e.notiz[g] || '')}</textarea>
      </div>`).join('') : '<p class="hinweis">Wähle oben, worüber ihr sprecht.</p>'}
      ${gs.length ? '<p class="hinweis gm-diktat">🎤 Lieber sprechen? Ins Notizfeld tippen und auf der Tastatur das Mikrofon antippen. Bausteine änderst du unter Einstellungen → Textbausteine.</p>' : ''}
      ${gs.length > 1 ? '<p class="hinweis">Jeder Bereich wird getrennt notiert, damit Enpal, GALVANY und Vorwerk nur ihren eigenen Teil im Text bekommen.</p>' : ''}
      <div class="knopfreihe">
        <button type="button" class="btn" data-geh="leitfaden">📋 Zum Klemmbrett</button>
        <button type="button" class="btn primary" data-geh="abschluss">Gespräch abschließen ›</button>
      </div>`;
    rechts.querySelectorAll<HTMLTextAreaElement>('textarea[data-gruppe]').forEach((t) => t.addEventListener('input', () => { e.notiz[t.dataset.gruppe as ablauf.Gruppe] = t.value; }));
    rechts.querySelectorAll<HTMLElement>('.gm-bausteine').forEach((box) => box.addEventListener('click', (ev) => {
      const b = (ev.target as Element).closest<HTMLElement>('[data-baustein]');
      if (!b) return;
      const g = box.dataset.gruppe as ablauf.Gruppe;
      const [s, i] = b.dataset.baustein!.split(':');
      const text = store.getData().einstellungen.bausteine[s as Sparte]?.[Number(i)];
      const ta = rechts.querySelector<HTMLTextAreaElement>(`textarea[data-gruppe="${g}"]`);
      if (!text || !ta) return;
      e.notiz[g] = bausteinAnhaengen(e.notiz[g] || '', text);
      ta.value = e.notiz[g];
      ta.scrollTop = ta.scrollHeight;
      b.classList.add('benutzt');
    }));
    rechts.querySelector('#gmErreicht').addEventListener('change', (ev) => { e.erreicht = (ev.target as HTMLInputElement).checked; });
    rechts.querySelector('.gm-art').addEventListener('click', (ev) => {
      const b = (ev.target as Element).closest('[data-art]');
      if (!b) return;
      e.kontaktart = b.dataset.art as typeof e.kontaktart;
      rechts.querySelectorAll('.gm-art button').forEach((x) => x.classList.toggle('aktiv', x === b));
    });
    rechts.querySelector('.gm-sparten').addEventListener('click', (ev) => {
      const b = (ev.target as Element).closest('[data-sparte]');
      if (!b) return;
      const s = b.dataset.sparte as Sparte;
      e.sparten = e.sparten.includes(s) ? e.sparten.filter((x) => x !== s) : [...e.sparten, s];
      if (e.sparten.length && !e.sparten.includes(e.leitfadenSparte)) e.leitfadenSparte = e.sparten[0]!;
      notizenZeichnen();
      links.querySelectorAll<HTMLDetailsElement>('.gm-bogen').forEach((d, i) => { if (SPARTEN_KEYS[i] === s && e.sparten.includes(s)) d.open = true; });
    });
  };

  const leitfadenZeichnen = () => {
    rechts.innerHTML = '<div class="gm-leitfaden"></div>';
    leitfaden.render(rechts.querySelector('.gm-leitfaden'), new URLSearchParams(), [], {
      entwurf: e,
      onSparte: (s) => { e.leitfadenSparte = s; if (!e.sparten.includes(s)) e.sparten.push(s); },
      onEinwand: () => { if (!e.sparten.includes(e.leitfadenSparte)) e.sparten.push(e.leitfadenSparte); },
      onFeld: () => { if (!e.sparten.includes(e.leitfadenSparte)) e.sparten.push(e.leitfadenSparte); linksZeichnen(); },
    });
  };

  /** Bilanz des Gesprächs je Bereich: wie viel erfasst ist und was offen blieb. Das Maskottchen zeigt sich bei einem guten Ergebnis. */
  const bilanzHtml = (sparten: Sparte[]) => {
    const k = store.findKunde(id);
    const fe = store.getData().einstellungen.felder;
    const zeilen = sparten.map((s) => {
      const st = stand(s, k, e.antworten!, fe);
      const einw = Object.keys(e.verlauf[s]).length;
      const widerruf = (e.antworten?.[s]?.widerruf || '').includes('erklärt');
      const teile = [`${st.erledigt} von ${st.gesamt} erfasst`, einw ? `${einw} ${einw === 1 ? 'Einwand' : 'Einwände'}` : '', widerruf ? 'Widerrufsrecht erklärt' : ''].filter(Boolean);
      return `<li><b>${esc(SPARTEN[s].label)}:</b> ${esc(teile.join(' · '))}${st.offen.length ? `<br><small>Noch offen: ${esc(st.offen.slice(0, 6).join(', '))}${st.offen.length > 6 ? ' …' : ''}</small>` : ''}</li>`;
    });
    return `<div class="gm-bilanz" id="gmBilanz">
      <span class="gm-bilanz-bild" aria-hidden="true">${maskottchen('sperling', 'gm-bilanz-sperling')}</span>
      <div><b id="gmBilanzTitel">Gesprächsbilanz</b>${zeilen.length ? `<ul class="gm-bilanz-liste">${zeilen.join('')}</ul>` : '<p>Noch nichts erfasst.</p>'}</div>
    </div>`;
  };

  const abschlussZeichnen = () => {
    const k = store.findKunde(id);
    if (!k) return;
    const sparten = SPARTEN_KEYS.filter((s) => e.sparten.includes(s) || ablauf.hatEinwaende(e.verlauf, s));
    rechts.innerHTML = `
      <div class="karte-box">
        <h2>Gespräch abschließen</h2>
        ${bilanzHtml(sparten)}
        <p class="hinweis">${esc(KONTAKTART[e.kontaktart])}${e.erreicht ? '' : ' · nicht erreicht'} · ${sparten.length ? sparten.map((s) => esc(SPARTEN[s].label)).join(', ') : 'ohne Thema'}${ablauf.hatInhalt(e) ? '' : ' · noch keine Notizen'}</p>
        ${sparten.map((s) => `
        <fieldset class="abschluss-sparte bereich-rand bereich-${s}" data-abschluss="${s}">
          <legend>${maskottchen(spartenIcon(s), 'mini')} ${esc(SPARTEN[s].label)}${ablauf.hatEinwaende(e.verlauf, s) ? ` <small>${Object.keys(e.verlauf[s]).length} Einwand/Einwände</small>` : ''}</legend>
          <div class="formgrid">
            <label>Ergebnis<select name="ausgang"><option value="">${e.erreicht ? '– bitte wählen –' : '– keins –'}</option>${Object.entries(AUSGANG).map(([key, v]) => `<option value="${key}">${esc(v)}</option>`).join('')}</select></label>
            <label>Status<select name="status">${statusOptions(k.status[s])}</select></label>
            <label>Nächster Schritt<input name="schritt" maxlength="1000" placeholder="z. B. Angebot rechnen lassen" value="${esc(schrittVorschlag(s, e.antworten))}"></label>
            <div class="wv-feld"><label>Wiedervorlage / Termin am<input type="datetime-local" name="wv"></label>${schnellwahl.html('wv')}</div>
          </div>
        </fieldset>`).join('')}
        <div class="knopfreihe">
          <button type="button" class="btn primary" id="gmSpeichern">Gespräch beim Kunden speichern</button>
          <button type="button" class="btn ghost" data-geh="notizen">‹ Zurück</button>
          <button type="button" class="btn ghost danger-text" id="gmVerwerfen">Verwerfen</button>
        </div>
      </div>`;
    rechts.querySelectorAll<HTMLSelectElement>('[data-abschluss] [name=ausgang]').forEach((sel) => sel.addEventListener('change', () => {
      const gut = [...rechts.querySelectorAll<HTMLSelectElement>('[data-abschluss] [name=ausgang]')].some((x) => ['termin', 'abschluss', 'test', 'angebot'].includes(x.value));
      const bilanz = rechts.querySelector('#gmBilanz');
      bilanz?.classList.toggle('gut', gut);
      const titel = rechts.querySelector('#gmBilanzTitel');
      if (titel) titel.textContent = gut ? 'Schönes Gespräch, nächster Schritt steht.' : 'Gesprächsbilanz';
    }));
    rechts.querySelector('#gmSpeichern').addEventListener('click', () => {
      const abschluesse: ablauf.Abschluss[] = [];
      for (const fs of rechts.querySelectorAll<HTMLFieldSetElement>('[data-abschluss]')) {
        const s = fs.dataset.abschluss as Sparte;
        const f = (n: string) => fs.querySelector<HTMLInputElement>(`[name=${n}]`);
        const wvRoh = f('wv').value;
        const wv = wvRoh ? localInputToIso(wvRoh) : null;
        if (wvRoh && !wv) { toast(`Ungültiges Datum bei ${SPARTEN[s].label}.`, 'error'); return; }
        const ausgang = f('ausgang').value as ablauf.Abschluss['ausgang'];
        if (e.erreicht && !ausgang && ablauf.hatEinwaende(e.verlauf, s)) { toast(`Bitte das Ergebnis für ${SPARTEN[s].label} wählen.`, 'error'); f('ausgang').focus(); return; }
        abschluesse.push({ sparte: s, ausgang, status: f('status').value as ablauf.Abschluss['status'], schritt: f('schritt').value.trim(), wv });
      }
      const etwas = ablauf.hatInhalt(e) || abschluesse.some((a) => a.ausgang || a.schritt || a.wv) || !e.erreicht;
      if (!etwas) { toast('Noch nichts zu speichern: Notiz schreiben oder Ergebnis wählen.', 'error'); return; }
      try {
        ablauf.abschliessen(e, abschluesse);
      } catch (err) { toast((err as Error).message, 'error'); return; }
      toast('Gespräch gespeichert', 'ok');
      location.hash = `#/kunde/${id}?tab=verlauf`;
    });
    rechts.querySelector('#gmVerwerfen').addEventListener('click', async () => {
      if (ablauf.hatInhalt(e) && !(await bestaetigen('Gespräch verwerfen?', 'Die Notizen und angetippten Einwände dieses Gesprächs gehen verloren.', 'Verwerfen'))) return;
      ablauf.verwerfen(id);
      location.hash = `#/kunde/${id}`;
    });
  };

  const rechtsZeichnen = () => {
    el.querySelectorAll('.gm-seiten button').forEach((b) => b.classList.toggle('aktiv', b.dataset.seite === seite));
    history.replaceState(null, '', `#/kunde/${id}/gespraech?seite=${seite}`);
    ({ notizen: notizenZeichnen, leitfaden: leitfadenZeichnen, abschluss: abschlussZeichnen })[seite]();
  };
  const gehe = (s: Seite) => { seite = s; rechtsZeichnen(); el.querySelector('.gm-rechts')?.scrollTo?.({ top: 0 }); if (handyKunde) handy(false); };
  el.querySelector('.gm-seiten').addEventListener('click', (ev) => { const b = (ev.target as Element).closest('[data-seite]'); if (b) gehe(b.dataset.seite as Seite); });
  rechts.addEventListener('click', (ev) => { const b = (ev.target as Element).closest('[data-geh]'); if (b) gehe(b.dataset.geh as Seite); });

  const handy = (kunde: boolean) => {
    handyKunde = kunde;
    teilung.classList.toggle('zeige-kunde', kunde);
    el.querySelectorAll('.gm-handy button').forEach((b) => b.classList.toggle('aktiv', (b.dataset.handy === 'kunde') === kunde));
  };
  el.querySelector('.gm-handy').addEventListener('click', (ev) => { const b = (ev.target as Element).closest('[data-handy]'); if (b) handy(b.dataset.handy === 'kunde'); });

  const uhrZeigen = () => {
    const s = Math.max(0, Math.floor((Date.now() - new Date(e.start).getTime()) / 1000));
    const t = el.querySelector('#gmUhr');
    if (t) t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  uhrZeigen();
  uhr = window.setInterval(uhrZeigen, 1000);

  linksZeichnen();
  rechtsZeichnen();
  void adresseEinzeilig;
  return () => window.clearInterval(uhr);
}
