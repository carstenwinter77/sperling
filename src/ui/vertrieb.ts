// Sperling – Vertriebswerkzeuge in der Oberfläche: Reiter „Angebot & Auftrag“, Ansprechpartner und
// Haustür-Ergebnis in der Kundenübersicht, Terminbestätigung an den Kunden (SMS, WhatsApp, E-Mail).
// Logik in src/core/vertrieb.ts.
import { esc, nowIso, formatDate, formatDateTime } from '../core/util.ts';
import { SPARTEN, SPARTEN_KEYS, STATUS, kundenTitel, adresseEinzeilig, neuerTermin, type Kunde, type Termin, type Sparte } from '../core/model.ts';
import {
  ANGEBOT_STATUS, AUFTRAG_SCHRITTE, HAUSTUER, HAUSTUER_KEYS, ROLLEN, ANSPRECHPARTNER_MAX, tageListeText,
  neuesAngebot, normalizeAngebot, angebotAbgelaufen, angebotsSumme, nachfassTermine, offeneNachfass, euro,
  neuerAuftrag, auftragStand, auftragText, auftragKundentext, pflegeVorschlaege, pflegeVorhanden, anredeZeile,
  normalizeAnsprechpartner, neuerHaustuerEintrag, letzteHaustuer, werbeverbot, haustuerStatus,
  terminBestaetigung, waNummer, waUrl, smsUrl, ortsTag, type Angebot, type HaustuerErgebnis, type AngebotStatus,
} from '../core/vertrieb.ts';
import * as pk from '../core/papierkorb.ts';
import * as store from '../storage/store.ts';
import { dialog, toast, kopieren, bestaetigen, maskottchen } from './dom.ts';
import { anrufen, emailSchreiben } from './kontakt.ts';
import { spartenIcon } from './parts.ts';

const STATUS_RANG: Record<string, number> = { unbekannt: 0, kein_interesse: 0, potenzial: 1, interesse: 2, termin: 3, angebot: 4, abschluss: 5 };
const heute = () => ortsTag(new Date());
const tagDeutsch = (tag: string) => (tag ? tag.split('-').reverse().join('.') : '');

function linkOeffnen(href: string, neuerTab: boolean) {
  const a = document.createElement('a');
  a.href = href;
  if (neuerTab) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------- Reiter „Angebot & Auftrag“ ----------

export function tab(el: HTMLElement, k0: Kunde, kopf: () => void) {
  const k = store.findKunde(k0.id) || k0;
  const jetzt = nowIso();
  const angebote = [...k.angebote].sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const offen = angebote.filter((a) => a.status === 'offen');
  const mitAuftrag = SPARTEN_KEYS.filter((s) => k.auftrag[s]);
  const ohneAuftrag = SPARTEN_KEYS.filter((s) => !k.auftrag[s]);
  el.innerHTML = `
    <section class="karte-box">
      <header class="seitenkopf"><h2>${maskottchen('notizen', 'titel-bild')} Angebote</h2><button class="btn primary" id="angNeu">+ Angebot erfassen</button></header>
      ${offen.length ? `<p class="ang-summe">Offen: <b>${offen.length}</b> ${offen.length === 1 ? 'Angebot' : 'Angebote'} über <b>${esc(euro(angebotsSumme(offen)))}</b></p>` : ''}
      ${angebote.length ? `<ul class="ang-liste">${angebote.map((a) => angebotHtml(a, jetzt)).join('')}</ul>` : '<p class="hinweis">Noch kein Angebot erfasst. Trag hier ein, was du dem Kunden angeboten hast: Bereich, Betrag, gültig bis. Sperling erinnert dich dann ans Nachfassen.</p>'}
    </section>
    <section class="karte-box">
      <h2>${maskottchen('termine', 'titel-bild')} Auftragsstand nach dem Abschluss</h2>
      ${mitAuftrag.length ? mitAuftrag.map((s) => auftragHtml(k, s)).join('') : '<p class="hinweis">Nach der Unterschrift fragen Kunden oft „Wann kommt die Montage?“. Hier hakst du die Schritte ab und hast die Antwort sofort parat.</p>'}
      ${ohneAuftrag.length ? `<div class="knopfreihe">${ohneAuftrag.map((s) => `<button class="btn ghost klein" data-auftrag-start="${s}">+ Auftrag ${esc(SPARTEN[s].label)}</button>`).join('')}</div>` : ''}
    </section>`;

  const neuZeichnen = () => { kopf(); tab(el, store.findKunde(k.id) || k, kopf); };

  el.querySelector('#angNeu').addEventListener('click', async () => { if (await angebotDialog(k.id, null)) neuZeichnen(); });
  el.querySelector('.ang-liste')?.addEventListener('click', async (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-ang]');
    const li = (e.target as Element).closest<HTMLElement>('li[data-id]');
    if (!b || !li) return;
    const a = store.findKunde(k.id)?.angebote.find((x) => x.id === li.dataset.id);
    if (!a) return;
    const was = b.dataset.ang || '';
    if (was === 'bearbeiten') { if (await angebotDialog(k.id, a)) neuZeichnen(); return; }
    if (was === 'angenommen' || was === 'abgelehnt' || was === 'zurueckgezogen' || was === 'offen') { if (await angebotEntscheiden(k.id, a, was)) neuZeichnen(); }
  });
  el.querySelectorAll<HTMLElement>('[data-auftrag-start]').forEach((b) => b.addEventListener('click', () => {
    const s = b.dataset.auftragStart as Sparte;
    store.mutate((d) => { const x = d.kunden.find((y) => y.id === k.id); if (x && !x.auftrag[s]) { x.auftrag[s] = neuerAuftrag(s, x.status[s] === 'abschluss' ? heute() : ''); x.updatedAt = nowIso(); } });
    neuZeichnen();
  }));
  auftragVerdrahten(el, k.id, neuZeichnen);
}

function angebotHtml(a: Angebot, jetzt: string) {
  const abgelaufen = angebotAbgelaufen(a, jetzt);
  const frist = a.gueltigBis ? `gültig bis ${formatDate(a.gueltigBis)}` : 'ohne Frist';
  return `<li data-id="${esc(a.id)}" class="ang ang-${a.status} bereich-rand bereich-${a.sparte}">
    <div class="ang-kopf">
      <span class="tag tag-${a.sparte}">${esc(SPARTEN[a.sparte].kurz)}</span>
      <strong>${esc(a.titel || SPARTEN[a.sparte].label)}</strong>
      <span class="ang-betrag">${esc(euro(a.betrag))}</span>
    </div>
    <p class="ang-zeile"><span class="tag ang-st-${a.status}">${esc(ANGEBOT_STATUS[a.status])}</span> vom ${esc(formatDate(a.datum))} · ${esc(frist)}${abgelaufen ? ' <span class="tag warn">Frist abgelaufen</span>' : ''}${a.entschieden ? ` · entschieden ${esc(formatDate(a.entschieden))}` : ''}</p>
    ${a.notiz ? `<p class="ang-notiz">${esc(a.notiz).replace(/\n/g, '<br>')}</p>` : ''}
    <div class="knopfreihe">
      ${a.status === 'offen' ? `<button class="btn klein" data-ang="angenommen">✓ Angenommen</button><button class="btn klein ghost" data-ang="abgelehnt">✗ Abgelehnt</button><button class="btn klein ghost" data-ang="zurueckgezogen">Ersetzt</button>` : '<button class="btn klein ghost" data-ang="offen">↺ Wieder offen</button>'}
      <button class="btn klein ghost" data-ang="bearbeiten" aria-label="Angebot bearbeiten">✎</button>
    </div>
  </li>`;
}

const datumsfeld = (iso: string | null) => (iso ? ortsTag(iso) : '');

/** Neues Angebot oder Bearbeiten. true = gespeichert. */
export async function angebotDialog(kundeId: string, a: Angebot | null, sparteVorgabe: Sparte | '' = ''): Promise<boolean> {
  const k = store.findKunde(kundeId);
  if (!k) return false;
  const sparte = a?.sparte || sparteVorgabe || SPARTEN_KEYS.find((s) => ['termin', 'interesse', 'angebot'].includes(k.status[s])) || 'pv';
  const plus30 = ortsTag(new Date(Date.now() + 30 * 86400000));
  const nfTage = store.getData().einstellungen.nachfassTage;
  const res = await dialog<Record<string, unknown>>({
    titel: a ? 'Angebot bearbeiten' : 'Angebot erfassen',
    html: `
      <label>Bereich<select name="sparte">${SPARTEN_KEYS.map((s) => `<option value="${s}" ${s === sparte ? 'selected' : ''}>${esc(SPARTEN[s].label)}</option>`).join('')}</select></label>
      <label>Was wurde angeboten?<input name="titel" maxlength="200" value="${esc(a?.titel || '')}" placeholder="z. B. PV 9,8 kWp mit Speicher"></label>
      <div class="row2">
        <label>Betrag in Euro<input name="betrag" inputmode="decimal" value="${a?.betrag !== null && a?.betrag !== undefined ? esc(String(a.betrag).replace('.', ',')) : ''}" placeholder="z. B. 18.900"></label>
        <label>Angebot vom<input type="date" name="datum" value="${esc(a ? datumsfeld(a.datum) : heute())}" required></label>
      </div>
      <label>Gültig bis<input type="date" name="bis" value="${esc(a ? datumsfeld(a.gueltigBis) : plus30)}"></label>
      <label>Notiz<textarea name="notiz" rows="3" maxlength="5000" placeholder="Varianten, offene Fragen, Konkurrenzangebot …">${esc(a?.notiz || '')}</textarea></label>
      ${a ? '' : `${nfTage.length ? `<label class="check"><input type="checkbox" name="nachfassen" checked> Nachfassen nach ${esc(tageListeText(nfTage))} als Wiedervorlage anlegen</label>` : '<p class="hinweis">Nachfassen ist in den Einstellungen (Vertrieb) ausgeschaltet.</p>'}
      <label class="check"><input type="checkbox" name="status" checked> Status des Bereichs auf „${esc(STATUS.angebot.label)}“ setzen (wenn noch nicht weiter)</label>`}`,
    knoepfe: [{
      label: 'Speichern', primaer: true,
      pruefen: (dlg) => {
        const roh = String(dlg.querySelector<HTMLInputElement>('[name=betrag]')!.value).trim();
        if (roh && betragLesen(roh) === null) return 'Betrag bitte als Zahl eingeben, z. B. 18900 oder 18.900,50.';
        if (!dlg.querySelector<HTMLInputElement>('[name=datum]')!.value) return 'Bitte das Datum des Angebots eingeben.';
        const bis = dlg.querySelector<HTMLInputElement>('[name=bis]')!.value;
        if (bis && bis < dlg.querySelector<HTMLInputElement>('[name=datum]')!.value) return '„Gültig bis“ liegt vor dem Angebotsdatum.';
        return null;
      },
      wert: (dlg) => {
        const v = (n: string) => dlg.querySelector<HTMLInputElement>(`[name=${n}]`)?.value ?? '';
        return {
          sparte: v('sparte'), titel: v('titel').trim(), betrag: betragLesen(v('betrag')), notiz: v('notiz'),
          datum: new Date(`${v('datum')}T12:00`).toISOString(), gueltigBis: v('bis') ? new Date(`${v('bis')}T23:59`).toISOString() : null,
          nachfassen: !!dlg.querySelector<HTMLInputElement>('[name=nachfassen]')?.checked,
          statusSetzen: !!dlg.querySelector<HTMLInputElement>('[name=status]')?.checked,
        };
      },
    }],
  });
  if (!res) return false;
  const { nachfassen, statusSetzen, ...felder } = res;
  let angelegt = 0;
  store.mutate((d) => {
    const x = d.kunden.find((y) => y.id === kundeId);
    if (!x) return;
    if (a) {
      const i = x.angebote.findIndex((y) => y.id === a.id);
      if (i >= 0) x.angebote[i] = normalizeAngebot({ ...x.angebote[i], ...felder, updatedAt: nowIso() });
    } else {
      const neu = neuesAngebot(felder);
      x.angebote.push(neu);
      if (statusSetzen && STATUS_RANG[x.status[neu.sparte]]! < STATUS_RANG.angebot!) x.status[neu.sparte] = 'angebot';
      if (nachfassen) for (const t of nachfassTermine(neu, kundeId, nowIso(), d.einstellungen.nachfassTage)) { d.termine.push(neuerTermin(t)); angelegt++; }
    }
    x.updatedAt = nowIso();
  });
  toast(a ? 'Angebot gespeichert' : angelegt ? `Angebot gespeichert, ${angelegt} Nachfass-Wiedervorlage${angelegt === 1 ? '' : 'n'} angelegt` : 'Angebot gespeichert', 'ok');
  return true;
}

/** „18.900,50“, „18900“, „18 900 €“ → Zahl; null wenn unlesbar. */
export function betragLesen(roh: string): number | null {
  let s = String(roh || '').replace(/[€\s]/g, '');
  if (!s) return null;
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function angebotEntscheiden(kundeId: string, a: Angebot, status: AngebotStatus): Promise<boolean> {
  const k = store.findKunde(kundeId);
  if (!k) return false;
  const nachfass = offeneNachfass(store.getData().termine, kundeId, a);
  let abschluss = false;
  if (status === 'angenommen') {
    const w = await dialog<string>({
      titel: 'Angebot angenommen',
      html: `<p>Glückwunsch! „${esc(a.titel || SPARTEN[a.sparte].label)}“ ist angenommen.</p>
        <label class="check"><input type="checkbox" name="abschluss" checked> Status ${esc(SPARTEN[a.sparte].label)} auf „${esc(STATUS.abschluss.label)}“ setzen und den Auftragsstand beginnen</label>
        ${nachfass.length ? `<p class="hinweis">${nachfass.length} offene Nachfass-Wiedervorlage${nachfass.length === 1 ? '' : 'n'} werden als erledigt markiert.</p>` : ''}`,
      knoepfe: [{ label: 'Übernehmen', primaer: true, wert: (dlg) => (dlg.querySelector<HTMLInputElement>('[name=abschluss]')!.checked ? 'ja' : 'nein') }],
    });
    if (!w) return false;
    abschluss = w === 'ja';
  }
  store.mutate((d) => {
    const x = d.kunden.find((y) => y.id === kundeId);
    const i = x ? x.angebote.findIndex((y) => y.id === a.id) : -1;
    if (!x || i < 0) return;
    x.angebote[i] = normalizeAngebot({ ...x.angebote[i], status, entschieden: status === 'offen' ? null : nowIso(), updatedAt: nowIso() });
    if (status !== 'offen') for (const t of d.termine) if (nachfass.some((n) => n.id === t.id)) { t.erledigt = true; t.updatedAt = nowIso(); }
    if (abschluss) {
      x.status[a.sparte] = 'abschluss';
      if (!x.auftrag[a.sparte]) x.auftrag[a.sparte] = neuerAuftrag(a.sparte, heute());
    }
    x.updatedAt = nowIso();
  });
  toast(status === 'offen' ? 'Angebot wieder offen' : `Angebot: ${ANGEBOT_STATUS[status]}`, 'ok');
  return true;
}

function auftragHtml(k: Kunde, s: Sparte) {
  const a = k.auftrag[s]!;
  const st = auftragStand(s, a);
  return `<div class="auftrag bereich-rand bereich-${s}" data-sparte="${s}">
    <h3>${maskottchen(spartenIcon(s), 'mini')} ${esc(SPARTEN[s].label)} <small>${esc(auftragText(s, a))}</small></h3>
    <div class="auftrag-balken" role="progressbar" aria-label="Fortschritt ${esc(SPARTEN[s].label)}" aria-valuemin="0" aria-valuemax="${st.gesamt}" aria-valuenow="${st.erledigt}"><span style="width:${Math.round((st.erledigt / st.gesamt) * 100)}%"></span></div>
    <ol class="auftrag-schritte">
      ${AUFTRAG_SCHRITTE[s].map((x) => {
    const w = a.schritte[x.key]!;
    return `<li class="${w.erledigt ? 'erledigt' : ''}">
          <label class="check"><input type="checkbox" data-schritt="${x.key}" ${w.erledigt ? 'checked' : ''}> ${esc(x.label)}${x.hinweis ? ` <small>${esc(x.hinweis)}</small>` : ''}</label>
          <input type="date" data-schritt-datum="${x.key}" value="${esc(w.datum)}" aria-label="${esc(x.label)}: ${w.erledigt ? 'erledigt am' : 'geplant am'}" title="${w.erledigt ? 'erledigt am' : 'geplant am'}">
        </li>`;
  }).join('')}
    </ol>
    <label>Notiz zum Auftrag<textarea data-auftrag-notiz rows="2" maxlength="5000" placeholder="z. B. Ansprechpartner Montage, Besonderheiten">${esc(a.notiz)}</textarea></label>
    <div class="knopfreihe">
      <button class="btn klein ghost" data-auftrag-text>📋 Stand für den Kunden kopieren</button>
      ${st.fertig ? '<button class="btn klein primary" data-pflege>🤝 Pflege-Wiedervorlagen anlegen</button>' : ''}
    </div>
  </div>`;
}

function auftragVerdrahten(el: HTMLElement, kundeId: string, neuZeichnen: () => void) {
  const aendern = (s: Sparte, fn: (a: NonNullable<Kunde['auftrag'][Sparte]>) => void) => {
    store.mutate((d) => { const x = d.kunden.find((y) => y.id === kundeId); const a = x?.auftrag[s]; if (x && a) { fn(a); x.updatedAt = nowIso(); } });
  };
  el.querySelectorAll<HTMLElement>('.auftrag').forEach((box) => {
    const s = box.dataset.sparte as Sparte;
    box.addEventListener('change', async (e) => {
      const t = e.target as HTMLInputElement;
      if (t.dataset.schritt) {
        const key = t.dataset.schritt;
        const war = store.findKunde(kundeId)?.auftrag[s];
        const vorher = war ? auftragStand(s, war).fertig : false;
        aendern(s, (a) => { const w = a.schritte[key]!; w.erledigt = t.checked; if (t.checked && !w.datum) w.datum = heute(); });
        const jetzt = store.findKunde(kundeId)?.auftrag[s];
        neuZeichnen();
        if (!vorher && jetzt && auftragStand(s, jetzt).fertig) await pflegeAnlegen(kundeId, s);
      } else if (t.dataset.schrittDatum) {
        const key = t.dataset.schrittDatum;
        aendern(s, (a) => { a.schritte[key]!.datum = /^\d{4}-\d{2}-\d{2}$/.test(t.value) ? t.value : ''; });
        neuZeichnen();
      } else if (t.matches('[data-auftrag-notiz]')) {
        aendern(s, (a) => { a.notiz = t.value.slice(0, 5000); });
      }
    });
    box.querySelector('[data-auftrag-text]')?.addEventListener('click', async () => {
      const k = store.findKunde(kundeId);
      const a = k?.auftrag[s];
      if (!k || !a) return;
      const ok = await kopieren(auftragKundentext(s, a, anredeZeile(k), store.getData().einstellungen.absender));
      toast(ok ? 'Stand kopiert, zum Einfügen in SMS, WhatsApp oder E-Mail' : 'Kopieren nicht möglich', ok ? 'ok' : 'error');
    });
    box.querySelector('[data-pflege]')?.addEventListener('click', async () => { if (await pflegeAnlegen(kundeId, s)) neuZeichnen(); });
  });
}

/** Vorschläge zur Kundenpflege auswählen und als Wiedervorlagen anlegen. */
async function pflegeAnlegen(kundeId: string, s: Sparte): Promise<boolean> {
  const k = store.findKunde(kundeId);
  const a = k?.auftrag[s];
  if (!k || !a) return false;
  const termine = store.getData().termine;
  const vorschlaege = pflegeVorschlaege(s, auftragStand(s, a).fertigAm).filter((p) => !pflegeVorhanden(termine, kundeId, p));
  if (!vorschlaege.length) { toast('Die Pflege-Wiedervorlagen sind schon angelegt.', 'ok'); return false; }
  const wahl = await dialog<number[]>({
    titel: `${SPARTEN[s].label}: Auftrag fertig`,
    html: `<p>Zufriedene Kunden bleiben, kaufen dazu und empfehlen weiter. Sollen diese Wiedervorlagen angelegt werden?</p>
      ${vorschlaege.map((p, i) => `<label class="check"><input type="checkbox" name="p" value="${i}" checked> <b>${esc(formatDate(p.beginn))}</b> · ${esc(p.titel)}</label>`).join('')}`,
    knoepfe: [{ label: 'Anlegen', primaer: true, wert: (dlg) => Array.from(dlg.querySelectorAll<HTMLInputElement>('[name=p]:checked'), (c) => Number(c.value)) }],
  });
  if (!wahl?.length) return false;
  store.mutate((d) => { for (const i of wahl) { const p = vorschlaege[i]; if (p) d.termine.push(neuerTermin({ kundeId, sparte: p.sparte, art: 'wiedervorlage', titel: p.titel, beginn: p.beginn, dauerMin: 15, notiz: p.notiz })); } });
  toast(`${wahl.length} Wiedervorlage${wahl.length === 1 ? '' : 'n'} angelegt`, 'ok');
  return true;
}

// ---------- Ansprechpartner (Übersicht) ----------

export function ansprechpartnerHtml(k: Kunde) {
  const liste = k.ansprechpartner;
  if (!liste.length && !k.firma) {
    return `<section class="karte-box ap-box"><header class="seitenkopf"><h2>Ansprechpartner</h2><button class="btn klein ghost" data-ap-neu>+ Ansprechpartner</button></header>
      <p class="hinweis">Bei Firmen, Höfen oder Familien mit mehreren Beteiligten: Wer entscheidet, wer kümmert sich um die Technik, wer zahlt?</p></section>`;
  }
  return `<section class="karte-box ap-box">
    <header class="seitenkopf"><h2>Ansprechpartner <small>(${liste.length})</small></h2>${liste.length < ANSPRECHPARTNER_MAX ? '<button class="btn klein primary" data-ap-neu>+ Ansprechpartner</button>' : ''}</header>
    ${liste.length ? `<ul class="liste ap-liste">${liste.map((a) => `<li data-id="${esc(a.id)}"><div class="zeile">
      <span class="zeile-haupt"><strong>${esc(a.name || 'ohne Namen')}</strong><small><span class="tag ap-rolle-${a.rolle}">${esc(ROLLEN[a.rolle])}</span>${a.funktion ? ` ${esc(a.funktion)}` : ''}${a.telefon ? ` · ${esc(a.telefon)}` : ''}${a.email ? ` · ${esc(a.email)}` : ''}</small>${a.notiz ? `<small>${esc(a.notiz)}</small>` : ''}</span>
      <span class="knopfreihe">${a.telefon ? '<button class="btn klein ghost" data-ap="anrufen" aria-label="Anrufen">📞</button>' : ''}${a.email ? '<button class="btn klein ghost" data-ap="mail" aria-label="E-Mail">✉️</button>' : ''}<button class="btn klein ghost" data-ap="bearbeiten" aria-label="Bearbeiten">✎</button><button class="btn klein ghost" data-ap="loeschen" aria-label="Löschen">🗑</button></span>
    </div></li>`).join('')}</ul>` : `<p class="hinweis">Bei ${esc(k.firma)} noch niemand eingetragen. Wer entscheidet, wer kümmert sich um die Technik, wer zahlt?</p>`}
    ${liste.length && !liste.some((a) => a.rolle === 'entscheider') ? '<p class="hinweis">Tipp: Noch niemand ist als „Entscheidet“ markiert. Wer unterschreibt am Ende?</p>' : ''}
  </section>`;
}

export function ansprechpartnerVerdrahten(el: HTMLElement, kundeId: string, neuZeichnen: () => void) {
  const box = el.querySelector<HTMLElement>('.ap-box');
  if (!box) return;
  box.addEventListener('click', async (e) => {
    const t = e.target as Element;
    if (t.closest('[data-ap-neu]')) { if (await apDialog(kundeId, null)) neuZeichnen(); return; }
    const b = t.closest<HTMLElement>('[data-ap]');
    const li = t.closest<HTMLElement>('li[data-id]');
    if (!b || !li) return;
    const k = store.findKunde(kundeId);
    const a = k?.ansprechpartner.find((x) => x.id === li.dataset.id);
    if (!k || !a) return;
    const was = b.dataset.ap;
    if (was === 'anrufen') anrufen(`${a.name}${k.firma ? ` (${k.firma})` : ''}`, a.telefon);
    else if (was === 'mail') emailSchreiben({ an: a.email, betreff: '', text: `Guten Tag ${a.name},\n\n\n\nViele Grüße${store.getData().einstellungen.absender ? `\n${store.getData().einstellungen.absender}` : ''}` });
    else if (was === 'bearbeiten') { if (await apDialog(kundeId, a)) neuZeichnen(); }
    else if (was === 'loeschen') {
      if (!(await bestaetigen('Ansprechpartner entfernen?', `${a.name || 'Ansprechpartner'} kommt in die Liste „Gelöscht“ und lässt sich dort wiederherstellen.`, 'Entfernen'))) return;
      store.mutate((d) => { pk.ansprechpartnerLoeschen(d, kundeId, a.id); });
      toast('Entfernt – unter Kunden › Gelöscht wiederherstellbar', 'ok');
      neuZeichnen();
    }
  });
}

async function apDialog(kundeId: string, a: Kunde['ansprechpartner'][number] | null): Promise<boolean> {
  const res = await dialog<Record<string, string>>({
    titel: a ? 'Ansprechpartner bearbeiten' : 'Ansprechpartner hinzufügen',
    html: `
      <label>Name<input name="name" maxlength="200" value="${esc(a?.name || '')}" required></label>
      <div class="row2">
        <label>Rolle<select name="rolle">${Object.entries(ROLLEN).map(([r, l]) => `<option value="${r}" ${r === (a?.rolle || 'entscheider') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label>Funktion<input name="funktion" maxlength="200" value="${esc(a?.funktion || '')}" placeholder="z. B. Geschäftsführer"></label>
      </div>
      <div class="row2">
        <label>Telefon<input type="tel" name="telefon" maxlength="100" value="${esc(a?.telefon || '')}"></label>
        <label>E-Mail<input type="email" name="email" maxlength="200" value="${esc(a?.email || '')}"></label>
      </div>
      <label>Notiz<textarea name="notiz" rows="2" maxlength="2000" placeholder="z. B. erreichbar vormittags, entscheidet mit dem Sohn">${esc(a?.notiz || '')}</textarea></label>`,
    knoepfe: [{
      label: 'Speichern', primaer: true,
      pruefen: (dlg) => (dlg.querySelector<HTMLInputElement>('[name=name]')!.value.trim() ? null : 'Bitte einen Namen eingeben.'),
      wert: (dlg) => Object.fromEntries(['name', 'rolle', 'funktion', 'telefon', 'email', 'notiz'].map((n) => [n, dlg.querySelector<HTMLInputElement>(`[name=${n}]`)!.value.trim()])),
    }],
  });
  if (!res) return false;
  store.mutate((d) => {
    const x = d.kunden.find((y) => y.id === kundeId);
    if (!x) return;
    if (a) { const i = x.ansprechpartner.findIndex((y) => y.id === a.id); if (i >= 0) x.ansprechpartner[i] = normalizeAnsprechpartner({ ...x.ansprechpartner[i], ...res }); }
    else if (x.ansprechpartner.length < ANSPRECHPARTNER_MAX) x.ansprechpartner.push(normalizeAnsprechpartner(res));
    x.updatedAt = nowIso();
  });
  toast('Gespeichert', 'ok');
  return true;
}

// ---------- Haustür ----------

/** Haustür-Ergebnis speichern (Kundenübersicht und Karte). */
export function haustuerSpeichern(kundeId: string, ergebnis: HaustuerErgebnis, notiz = ''): void {
  store.mutate((d) => {
    const x = d.kunden.find((y) => y.id === kundeId);
    if (!x) return;
    x.haustuer.push(neuerHaustuerEintrag(ergebnis, notiz));
    x.status = haustuerStatus(x.status, ergebnis);
    x.updatedAt = nowIso();
  });
  toast(`Haustür: ${HAUSTUER[ergebnis].label}${ergebnis === 'werbeverbot' ? ' – Sperling schlägt diese Adresse nicht mehr vor' : ''}`, 'ok');
}

export function haustuerKnoepfe(kundeId: string, klasse = 'btn klein') {
  return `<div class="haustuer-knoepfe" role="group" aria-label="Ergebnis an der Haustür">${HAUSTUER_KEYS.map((h) => `<button type="button" class="${klasse}" data-haustuer="${h}" data-kunde="${esc(kundeId)}">${HAUSTUER[h].symbol} ${esc(HAUSTUER[h].kurz)}</button>`).join('')}</div>`;
}

export function haustuerHtml(k: Kunde) {
  const letzte = [...k.haustuer].sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? 1 : -1)).slice(0, 3);
  return `<section class="karte-box haustuer-box">
    <h2>An der Haustür</h2>
    ${haustuerKnoepfe(k.id)}
    ${letzte.length ? `<ul class="haustuer-liste">${letzte.map((h) => `<li>${HAUSTUER[h.ergebnis].symbol} <b>${esc(HAUSTUER[h.ergebnis].label)}</b> · ${esc(formatDateTime(h.zeitpunkt))}${h.notiz ? ` · ${esc(h.notiz)}` : ''}</li>`).join('')}</ul>` : '<p class="hinweis">Ein Tipp hält fest, wie es an der Tür lief. „Kein Interesse“ setzt vermutete Bereiche auf „Kein Interesse“, „Keine Werbung“ nimmt die Adresse aus allen Vorschlägen.</p>'}
  </section>`;
}

export function haustuerVerdrahten(el: HTMLElement, neuZeichnen: () => void) {
  el.querySelector('.haustuer-box')?.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-haustuer]');
    if (!b) return;
    haustuerSpeichern(b.dataset.kunde || '', b.dataset.haustuer as HaustuerErgebnis);
    neuZeichnen();
  });
}

/** Warnband oben beim Kunden, wenn „Keine Werbung erwünscht“ gilt. */
export function werbeverbotBand(k: Kunde) {
  if (!werbeverbot(k)) return '';
  const h = letzteHaustuer(k)!;
  return `<p class="werbeverbot-band" role="note">⛔ <b>Keine Werbung erwünscht</b> (an der Haustür am ${esc(formatDate(h.zeitpunkt))}). Nur auf ausdrücklichen Wunsch des Kunden Kontakt aufnehmen.</p>`;
}

// ---------- Terminbestätigung ----------

/** Dialog mit fertigem Text; Versand über SMS, WhatsApp oder E-Mail (Sperling verschickt selbst nichts, R-KONTAKT). */
export async function bestaetigungSenden(t: Termin): Promise<void> {
  const d = store.getData();
  const k = d.kunden.find((x) => x.id === t.kundeId) || null;
  const sp = t.sparte;
  const eigen = d.einstellungen.bereitlegen;
  const liste = sp ? eigen[sp] : SPARTEN_KEYS.flatMap((s) => eigen[s].slice(0, 1));
  const ort = t.ort || (k ? adresseEinzeilig(k) : '');
  const text = (gewaehlt: string[]) => terminBestaetigung(t, k, { bereitlegen: gewaehlt, absender: d.einstellungen.absender, ort });
  const tel = k?.telefon || '';
  const res = await dialog<{ weg: string; text: string }>({
    titel: 'Termin bestätigen',
    html: `
      <p class="hinweis">Für ${esc(k ? kundenTitel(k) : 'den Termin')} am ${esc(formatDateTime(t.beginn))}. Sperling bereitet die Nachricht nur vor, verschickt wird sie von deinem Gerät.</p>
      ${werbeverbot(k || { haustuer: [] }) ? '<p class="werbeverbot-band">⛔ An der Haustür wurde „Keine Werbung erwünscht“ vermerkt. Bestätige nur, wenn der Kunde den Termin selbst wollte.</p>' : ''}
      ${liste.length ? '' : '<p class="hinweis">Für diesen Bereich ist keine „Bitte bereitlegen“-Liste eingetragen (Einstellungen → Vertrieb).</p>'}
      <fieldset class="bereitlegen" ${liste.length ? '' : 'hidden'}><legend>Bitte bereitlegen</legend>${liste.map((b, i) => `<label class="check"><input type="checkbox" name="b" value="${i}" checked> ${esc(b)}</label>`).join('')}</fieldset>
      <label>Nachricht<textarea name="text" rows="10" maxlength="4000">${esc(text(liste))}</textarea></label>
      ${tel ? '' : '<p class="hinweis">Beim Kunden ist keine Telefonnummer eingetragen, deshalb nur E-Mail oder Kopieren.</p>'}`,
    knoepfe: [
      { label: '📋 Kopieren', wert: (dlg) => ({ weg: 'kopieren', text: dlg.querySelector<HTMLTextAreaElement>('[name=text]')!.value }) },
      { label: '✉️ E-Mail', wert: (dlg) => ({ weg: 'mail', text: dlg.querySelector<HTMLTextAreaElement>('[name=text]')!.value }) },
      ...(tel && waNummer(tel) ? [{ label: '🟢 WhatsApp', wert: (dlg: HTMLDialogElement) => ({ weg: 'wa', text: dlg.querySelector<HTMLTextAreaElement>('[name=text]')!.value }) }] : []),
      ...(tel ? [{ label: '💬 SMS', primaer: true, wert: (dlg: HTMLDialogElement) => ({ weg: 'sms', text: dlg.querySelector<HTMLTextAreaElement>('[name=text]')!.value }) }] : []),
    ],
    onOpen: (dlg) => {
      const ta = dlg.querySelector<HTMLTextAreaElement>('[name=text]')!;
      let vonHand = false;
      ta.addEventListener('input', () => { vonHand = true; });
      dlg.querySelector('.bereitlegen')?.addEventListener('change', () => {
        if (vonHand) return; // eigene Änderungen nicht überschreiben
        ta.value = text(Array.from(dlg.querySelectorAll<HTMLInputElement>('[name=b]:checked'), (c) => liste[Number(c.value)]!));
      });
    },
  });
  if (!res) return;
  if (res.weg === 'kopieren') { toast((await kopieren(res.text)) ? 'Kopiert' : 'Kopieren nicht möglich', 'ok'); return; }
  if (res.weg === 'mail') { emailSchreiben({ an: k?.email || '', betreff: `Terminbestätigung ${formatDate(t.beginn)}`, text: res.text }); return; }
  if (res.weg === 'wa') { linkOeffnen(waUrl(tel, res.text), true); return; }
  if (res.weg === 'sms') linkOeffnen(smsUrl(tel, res.text), false);
}
