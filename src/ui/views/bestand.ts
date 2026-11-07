// Vorführbestand (Vorwerk-Geräte im Auto): verleihen, zurücknehmen, Erinnerung, Kaufinteresse.
import { vorwerkStatusAnheben, euro } from '../../core/bestandkunde.ts';
import { verkaufDialog } from '../bestandkunde.ts';
import * as kundenwahl from '../kundenwahl.ts';
import { esc, nowIso, formatDate, isValidDate } from '../../core/util.ts';
import { KAUFINTERESSE, kundenTitel, adresseEinzeilig, neuesGeraet, neuerLeihvorgang, neueNotiz, neuerTermin, offenerVerleih, STATUS_KEYS, normalizeReservierung, geraetBelegung, type Geraet, type Kunde, type Leihvorgang, type Reservierung, type Belegung, type Daten, type StatusKey } from '../../core/model.ts';
import * as store from '../../storage/store.ts';
import { maskottchen, toast, dialog, bestaetigen } from '../dom.ts';
import { leer } from '../parts.ts';
import { istBeispielGeraet } from '../../demo.ts';
import { fotosHtml, fotosVerdrahten, unterschriftHtml, unterschriftVerdrahten } from '../belege.ts';
import * as leihschein from '../leihschein.ts';
import { zeitraumWahl } from '../zeitraum.ts';
import { tagVon, plusTage, balkenFuer, istBelegt, ersterFreierTag, type Tag } from '../../core/belegung.ts';
import { kundenName } from '../../core/model.ts';
import * as suche from '../suche.ts';
import * as material from '../material.ts';
import { nachbestellListe } from '../../core/material.ts';

const TAG_MS = 86400000;

function datumInput(iso: string | null | undefined): string {
  if (!iso || !isValidDate(iso)) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' -> ISO am gewählten Tag 10:00 Uhr Ortszeit, sonst null. */
function datumZuIso(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return null;
  const d = new Date(`${v}T10:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}


/** Zeitraum-Kalender im Dialog an zwei Datumsfelder koppeln (die bleiben unter „Datum eintippen“ erreichbar). */
function zeitraumAnbinden(dlg: ParentNode, vonName: string, bisName: string, opt: Parameters<typeof zeitraumWahl>[1]) {
  const vonEl = dlg.querySelector(`[name=${vonName}]`);
  const bisEl = dlg.querySelector(`[name=${bisName}]`);
  const wahl = zeitraumWahl(dlg.querySelector<HTMLElement>('.zr-platz'), {
    ...opt,
    // Getippte, aber gesperrte Daten bleiben stehen; „Speichern“ meldet dann den Konflikt
    onChange: (von, bis) => { if (von) { vonEl.value = von; bisEl.value = bis || von; } },
  });
  const ausFeldern = () => wahl.set(vonEl.value || null, bisEl.value || null);
  vonEl.addEventListener('change', ausFeldern);
  bisEl.addEventListener('change', ausFeldern);
  const { von, bis } = wahl.get();
  vonEl.value = von || ''; bisEl.value = bis || von || '';
  return wahl;
}

export function verleihStatus(l: Leihvorgang): 'zurueck' | 'ueberfaellig' | 'verliehen' {
  if (l.rueckgabe) return 'zurueck';
  if (l.rueckgabeGeplant && l.rueckgabeGeplant < nowIso()) return 'ueberfaellig';
  return 'verliehen';
}

export function render(el: HTMLElement, params: URLSearchParams = new URLSearchParams()) {
  const d = store.getData();
  const aktiv = d.geraete.filter((g) => g.aktiv);
  const offen = d.leihvorgaenge.filter((l) => !l.rueckgabe);
  const ueberfaellig = offen.filter((l) => verleihStatus(l) === 'ueberfaellig');
  const kunde = (id) => d.kunden.find((k) => k.id === id);
  const verkauft = d.geraete.filter((g) => g.verkauf).sort((a, b) => (a.verkauf!.datum < b.verkauf!.datum ? 1 : -1)).slice(0, 15);
  const verlauf = d.leihvorgaenge.filter((l) => l.rueckgabe).sort((a, b) => ((a.rueckgabe || '') < (b.rueckgabe || '') ? 1 : -1)).slice(0, 15);

  el.innerHTML = `
    <header class="seitenkopf">
      <h1>${maskottchen('vorwerk', 'titel-bild')} Vorführbestand</h1>
      <div class="knopfreihe"><a class="btn ghost" href="#/belegung">📅 Belegungskalender</a><a class="btn ghost" href="#material">🧴 Material</a><button class="btn primary" id="neu">+ Gerät</button></div>
    </header>
    <div class="zahlen">
      <span><b>${aktiv.length - offen.length}</b> im Auto</span>
      <span><b>${offen.length}</b> verliehen</span>
      <span class="${ueberfaellig.length ? 'warn' : ''}"><b>${ueberfaellig.length}</b> überfällig</span>
      ${nachbestellListe(d).length ? `<span class="warn"><b>${nachbestellListe(d).length}</b> nachbestellen</span>` : ''}
    </div>
    ${material.nachbestellHtml()}
    ${aktiv.length ? `<div class="geraete">${aktiv.map((g) => {
    const l = offenerVerleih(d, g.id);
    const st = l ? verleihStatus(l) : 'frei';
    const k = l ? kunde(l.kundeId) : null;
    const heute = datumInput(nowIso());
    const resv = (d.reservierungen || []).filter((r) => r.geraetId === g.id && datumInput(r.bis) >= heute).sort((a, b) => (a.von < b.von ? -1 : 1));
    const resvHtml = resv.length ? `<ul class="reservierungen">${resv.map((r) => { const rk = kunde(r.kundeId); return `<li data-resv="${esc(r.id)}">📌 <b>${esc(formatDate(r.von))}${r.bis.slice(0, 10) !== r.von.slice(0, 10) ? `–${esc(formatDate(r.bis))}` : ''}</b> ${rk ? `für ${esc(kundenTitel(rk))}` : ''}${r.notiz ? ` · ${esc(r.notiz)}` : ''} ${!l && datumInput(r.von) <= heute ? '<button class="btn klein primary" data-resv-aktion="starten">Jetzt verleihen</button>' : ''}<button class="btn klein ghost" data-resv-aktion="loeschen" aria-label="Reservierung löschen">✕</button></li>`; }).join('')}</ul>` : '';
    return `
      <article class="karte-box geraet geraet-${st}" data-id="${esc(g.id)}">
        <div class="geraet-kopf">
          <div><strong>${esc(g.name)}</strong>${istBeispielGeraet(g.id) ? ' <span class="tag tag-beispiel">Beispiel</span>' : ''}${g.seriennummer ? `<br><small>SN ${esc(g.seriennummer)}</small>` : ''}</div>
          <span class="pill pill-${st}">${st === 'frei' ? 'Im Auto' : st === 'ueberfaellig' ? 'Überfällig' : 'Verliehen'}</span>
        </div>
        ${resvHtml}
        ${l ? `
          <p class="geraet-info">Bei ${k ? `<a href="#/kunde/${esc(k.id)}">${esc(kundenTitel(k))}</a>` : (store.schutzKunde() ? 'einem anderen Kunden' : 'unbekanntem Kunden')} seit ${esc(formatDate(l.ausgabe))}${l.rueckgabeGeplant ? `, zurück bis <b>${esc(formatDate(l.rueckgabeGeplant))}</b>` : ''}</p>
          <label class="kauf">Kaufinteresse
            <select data-kauf="${esc(l.id)}">${Object.entries(KAUFINTERESSE).filter(([key]) => key !== 'gekauft').map(([key, v]) => `<option value="${key}" ${key === l.kaufinteresse ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
          </label>
          ${l.notiz ? `<p class="hinweis">${esc(l.notiz)}</p>` : ''}
          <div class="knopfreihe">
            <button class="btn primary klein" data-aktion="zurueck">Zurückgenommen</button>
            <button class="btn klein" data-aktion="gekauft">Kunde kauft es</button>
            <button class="btn ghost klein" data-aktion="erinnern">Nachfrage-Erinnerung</button>
            <button class="btn ghost klein" data-aktion="reservieren">Reservieren</button>
            <button class="btn ghost klein" data-aktion="leihschein">📄 Leihschein</button>
          </div>` : `
          ${g.zubehoer ? `<p class="hinweis">Zubehör: ${esc(g.zubehoer)}</p>` : ''}
          <div class="knopfreihe">
            <button class="btn primary klein" data-aktion="verleihen">Verleihen</button>
            <button class="btn ghost klein" data-aktion="reservieren">Reservieren</button>
            <button class="btn ghost klein" data-aktion="verkaufen">Verkaufen</button>
            <button class="btn ghost klein" data-aktion="bearbeiten">Bearbeiten</button>
          </div>`}
      </article>`;
  }).join('')}</div>` : leer('vorwerk', 'Noch keine Vorführgeräte erfasst. Lege die Geräte aus deinem Auto an.')}
    ${material.abschnittHtml()}
    ${verlauf.length ? `
    <section class="karte-box">
      <h2>Verlauf</h2>
      <ul class="liste">${verlauf.map((l) => {
    const g = d.geraete.find((x) => x.id === l.geraetId);
    const k = kunde(l.kundeId);
    return `<li class="zeile"><span class="zeile-haupt"><strong>${esc(g?.name || 'Gerät')}</strong><small>${k ? esc(kundenTitel(k)) : '–'} · ${esc(formatDate(l.ausgabe))} bis ${esc(formatDate(l.rueckgabe))}</small></span><span class="pill pill-kauf-${l.kaufinteresse}">${esc(KAUFINTERESSE[l.kaufinteresse])}</span><button class="btn klein ghost" data-beleg="${esc(l.id)}" data-art="ausgabe" title="Leihschein">📄</button>${l.kaufinteresse !== 'gekauft' ? `<button class="btn klein ghost" data-beleg="${esc(l.id)}" data-art="rueckgabe" title="Rückgabeschein">↩️📄</button>` : ''}</li>`;
  }).join('')}</ul>
    </section>` : ''}
    ${verkauft.length ? `
    <section class="karte-box">
      <h2>Verkauft</h2>
      <ul class="liste">${verkauft.map((g) => { const k = kunde(g.verkauf!.kundeId); return `<li class="zeile"><span class="zeile-haupt"><strong>${esc(g.name)}</strong><small>${k ? `<a href="#/kunde/${esc(k.id)}">${esc(kundenTitel(k))}</a>` : '–'} · ${esc(formatDate(g.verkauf!.datum))}${g.verkauf!.preis !== null ? ` · ${esc(euro(g.verkauf!.preis))}` : ''}</small></span><span class="pill pill-kauf-gekauft">Verkauft</span></li>`; }).join('')}</ul>
    </section>` : ''}`;

  const ziel = params.get('geraet');
  const karte = ziel ? [...el.querySelectorAll<HTMLElement>('.geraet')].find((x) => x.dataset.id === ziel) : null;
  if (karte) {
    karte.classList.add('such-ziel');
    suche.merken('geraet', ziel!);
    requestAnimationFrame(() => karte.scrollIntoView({ block: 'center' }));
  }
  el.querySelector('#neu').addEventListener('click', async () => { if (await geraetDialog()) render(el); });
  material.verdrahten(el, () => render(el, params));
  el.querySelector('a[href="#material"]')?.addEventListener('click', (ev) => { ev.preventDefault(); el.querySelector('#material')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  el.querySelectorAll('[data-beleg]').forEach((b) => b.addEventListener('click', () => leihschein.anbieten(b.dataset.beleg, b.dataset.art, dialog)));

  el.querySelectorAll('[data-kauf]').forEach((sel) => sel.addEventListener('change', () => {
    store.mutate((data) => {
      const l = data.leihvorgaenge.find((x) => x.id === sel.dataset.kauf);
      if (!l) return;
      if (sel.value in KAUFINTERESSE) l.kaufinteresse = sel.value as Leihvorgang['kaufinteresse'];
      l.updatedAt = nowIso();
      const k = data.kunden.find((x) => x.id === l.kundeId);
      if (k && sel.value === 'interesse') { vorwerkStatusAnheben(k, 'angebot'); k.updatedAt = nowIso(); }
    });
    toast('Gespeichert', 'ok');
  }));

  el.querySelectorAll('.geraet').forEach((karte) => karte.addEventListener('click', async (ev) => {
    const g = store.getData().geraete.find((x) => x.id === karte.dataset.id);
    if (!g) return;
    const rb = (ev.target as Element).closest('[data-resv-aktion]');
    if (rb) {
      const rid = rb.closest('[data-resv]')?.dataset.resv;
      const r = (store.getData().reservierungen || []).find((x) => x.id === rid);
      if (!r) return;
      if (rb.dataset.resvAktion === 'loeschen') {
        if (!(await bestaetigen('Reservierung löschen?', `${g.name} ab ${formatDate(r.von)}`))) return;
        store.mutate((data) => { data.reservierungen = data.reservierungen.filter((x) => x.id !== rid); });
        render(el);
      } else if (await verleihDialog(g, r)) render(el);
      return;
    }
    const b = (ev.target as Element).closest('[data-aktion]');
    if (!b) return;
    const aktion = b.dataset.aktion;
    let geaendert = false;
    if (aktion === 'verleihen') geaendert = await verleihDialog(g);
    else if (aktion === 'bearbeiten') geaendert = await geraetDialog(g);
    else if (aktion === 'verkaufen') geaendert = await verkaufDialog(g);
    else if (aktion === 'zurueck') geaendert = await ruecknahme(g, false);
    else if (aktion === 'gekauft') geaendert = await ruecknahme(g, true);
    else if (aktion === 'erinnern') geaendert = await erinnerung(g);
    else if (aktion === 'reservieren') geaendert = await reservierenDialog(g);
    else if (aktion === 'leihschein') { const lv = offenerVerleih(store.getData(), g.id); if (lv) await leihschein.anbieten(lv.id, 'ausgabe', dialog); }
    if (geaendert) render(el);
  }));
}

async function geraetDialog(g: Geraet | null = null): Promise<boolean> {
  type Ergebnis = 'entfernen' | { name: string; produktId: string; seriennummer: string; zubehoer: string; notiz: string };
  const res = await dialog<Ergebnis>({
    titel: g ? 'Gerät bearbeiten' : 'Neues Vorführgerät',
    html: `
      ${material.katalogAuswahl('geraet', g?.produktId || '')}
      <label>Bezeichnung<input name="name" value="${esc(g?.name || '')}" placeholder="z. B. Kobold VK7 Akku-Staubsauger" required maxlength="200"></label>
      <label>Seriennummer<input name="sn" value="${esc(g?.seriennummer || '')}" maxlength="100"></label>
      <label>Zubehör<input name="zub" value="${esc(g?.zubehoer || '')}" placeholder="z. B. Polsterdüse, Ladegerät" maxlength="1000"></label>
      <label>Notiz<textarea name="notiz" rows="2">${esc(g?.notiz || '')}</textarea></label>`,
    knoepfe: [
      ...(g ? [{ label: 'Aus Bestand nehmen', gefahr: true, wert: 'entfernen' as const }] : []),
      { label: 'Speichern', primaer: true, pruefen: (dlg) => (dlg.querySelector('[name=name]').value.trim() ? null : 'Bitte eine Bezeichnung eingeben.'),
        wert: (dlg) => ({ name: dlg.querySelector('[name=name]').value.trim(), produktId: dlg.querySelector<HTMLSelectElement>('[name=katalog]')?.value || '', seriennummer: dlg.querySelector('[name=sn]').value.trim(), zubehoer: dlg.querySelector('[name=zub]').value, notiz: dlg.querySelector('[name=notiz]').value }) },
    ],
    onOpen: (dlg) => material.katalogVerdrahten(dlg),
  });
  if (!res) return false;
  if (res === 'entfernen' && g) {
    if (!(await bestaetigen('Gerät aus dem Bestand nehmen?', `${g.name} wird ausgeblendet. Der Verleih-Verlauf bleibt erhalten.`, 'Aus Bestand nehmen'))) return false;
    store.mutate((d) => { const x = d.geraete.find((y) => y.id === g.id); if (x) { x.aktiv = false; x.updatedAt = nowIso(); } });
    return true;
  }
  store.mutate((d) => {
    if (res === 'entfernen') return;
    if (g) { const x = d.geraete.find((y) => y.id === g.id); if (x) Object.assign(x, res, { updatedAt: nowIso() }); } else d.geraete.push(neuesGeraet(res));
  });
  toast('Gespeichert', 'ok');
  return true;
}

function konfliktText(konflikte: Belegung[], d: Daten): string {
  return konflikte.map(({ art, eintrag }) => {
    const k = d.kunden.find((x) => x.id === eintrag.kundeId);
    const wer = k ? kundenTitel(k) : 'ohne Kunde';
    if (art === 'reservierung') { const r = eintrag as Reservierung; return `reserviert ${formatDate(r.von)}–${formatDate(r.bis)} (${wer})`; }
    const e = eintrag as Leihvorgang;
    return `verliehen ab ${formatDate(e.ausgabe)}${e.rueckgabe ? ` bis ${formatDate(e.rueckgabe)}` : e.rueckgabeGeplant ? ` bis ${formatDate(e.rueckgabeGeplant)}` : ' (offen)'} (${wer})`;
  }).join('; ');
}

/** Gerät für einen künftigen Zeitraum vormerken. Belegte Tage werden abgelehnt. */
export async function reservierenDialog(g: Geraet, vorgabe: { kundeId?: string; von?: string; bis?: string } = {}): Promise<boolean> {
  const d = store.getData();
  // Gesperrt: Verleihe und andere Reservierungen dieses Geräts
  const heute = tagVon(new Date());
  const balken = balkenFuer(d, g.id, heute);
  const belegt = (t: Tag) => istBelegt(balken, t);
  const info = (t: Tag) => { const b = balken.find((x) => x.art !== 'frueher' && x.von <= t && (x.bis === null || x.bis >= t)); const k = b ? d.kunden.find((y) => y.id === b.kundeId) : null; return b ? `${b.art === 'reserviert' ? 'reserviert' : 'verliehen'}${k ? ` – ${kundenTitel(k)}` : ''}` : ''; };
  const start = ersterFreierTag(vorgabe.von ? tagVon(vorgabe.von) : plusTage(heute, 1), belegt);
  if (!start) { toast('Das Gerät ist für das nächste Jahr durchgehend belegt.', 'error'); return false; }
  const morgen = datumInput(new Date(Date.now() + TAG_MS).toISOString());
  const res = await dialog({
    titel: `${g.name} reservieren`,
    html: `
      ${kundenwahl.html('kunde', 'Für Kunde (optional)', vorgabe.kundeId || '')}
      <div class="zr-platz"></div>
      <details class="zr-tippen"><summary>Datum eintippen</summary>
      <div class="row2">
        <label>Von<input type="date" name="von" value="${vorgabe.von ? datumInput(vorgabe.von) : morgen}" required></label>
        <label>Bis<input type="date" name="bis" value="${vorgabe.bis ? datumInput(vorgabe.bis) : (vorgabe.von ? datumInput(vorgabe.von) : morgen)}" required></label>
      </div>
      </details>
      <label>Notiz<input name="notiz" maxlength="2000" placeholder="z. B. Vorführung beim Hausbesuch"></label>`,
    onOpen: (dlg) => { kundenwahl.verdrahten(dlg); zeitraumAnbinden(dlg, 'von', 'bis', { von: start, bis: vorgabe.bis ? tagVon(vorgabe.bis) : start, belegt, info, min: heute, vorgabeTage: 1 }); },
    knoepfe: [{
      label: 'Reservieren', primaer: true,
      pruefen: (dlg) => {
        const f = dlg.querySelector('form');
        const von = datumZuIso(f.von.value); const bis = datumZuIso(f.bis.value);
        if (!von || !bis) return 'Bitte gültige Daten wählen.';
        if (bis < von) return '„Bis“ liegt vor „Von“.';
        const k = geraetBelegung(store.getData(), g.id, von, bis);
        return k.length ? `Belegt: ${konfliktText(k, store.getData())}` : null;
      },
      wert: (dlg) => { const f = dlg.querySelector('form'); return { kundeId: f.kunde.value, von: datumZuIso(f.von.value), bis: datumZuIso(f.bis.value), notiz: f.notiz.value.trim() }; },
    }],
  });
  if (!res) return false;
  store.mutate((data) => {
    if (!res.von || !res.bis || geraetBelegung(data, g.id, res.von, res.bis).length) throw new Error('Gerät ist in diesem Zeitraum schon belegt.');
    data.reservierungen.push(normalizeReservierung({ geraetId: g.id, ...res }));
  });
  toast('Reserviert', 'ok');
  return true;
}

export async function verleihDialog(g: Geraet, reservierung: Reservierung | null = null, vorgabeBis = '', vorgabeKunde = ''): Promise<boolean> {
  const d = store.getData();
  if (!d.kunden.length) { toast('Bitte zuerst einen Kunden anlegen.', 'error'); return false; }
  let holeFotos = (): string[] => [];
  let holeUnterschrift = () => ({ bild: '', name: '' });
  const res = await dialog({
    titel: `${g.name} verleihen`,
    html: `
      ${kundenwahl.html('kunde', 'An Kunde', reservierung?.kundeId || vorgabeKunde, { leerErlaubt: false })}
      <div class="zr-platz"></div>
      <details class="zr-tippen"><summary>Datum eintippen</summary>
      <div class="row2">
        <label>Ausgegeben am<input type="date" name="ab" value="${datumInput(nowIso())}" required></label>
        <label>Zurück bis<input type="date" name="bis" value="${datumInput(reservierung ? reservierung.bis : (vorgabeBis || new Date(Date.now() + 7 * TAG_MS).toISOString()))}"></label>
      </div>
      </details>
      <label class="check"><input type="checkbox" name="erinnern" checked> Erinnerung zum Nachfragen am Rückgabetag anlegen</label>
      <label>Notiz (Zustand, Absprache)<textarea name="notiz" rows="2" placeholder="z. B. neuwertig, Kunde testet auf Teppich und Fliesen"></textarea></label>
      ${fotosHtml('Fotos vom Zustand bei Übergabe')}
      ${unterschriftHtml((reservierung?.kundeId || vorgabeKunde) ? kundenName(d.kunden.find((x) => x.id === (reservierung?.kundeId || vorgabeKunde)) || {}) : '')}`,
    onOpen: (dlg) => {
      kundenwahl.verdrahten(dlg);
      holeFotos = fotosVerdrahten(dlg);
      holeUnterschrift = unterschriftVerdrahten(dlg);
      const sel = dlg.querySelector<HTMLInputElement>('[name=kunde]');
      // Gesperrt sind Reservierungen anderer Kunden (die eigene bzw. die erfüllte zählt nicht)
      const heute = tagVon(new Date());
      const sperren = () => {
        const fremd = balkenFuer(store.getData(), g.id, heute).filter((b) => b.art === 'reserviert' && b.reservierung?.id !== reservierung?.id && b.kundeId !== sel.value);
        const kn = (id: string) => { const k = store.getData().kunden.find((y) => y.id === id); return k ? kundenTitel(k) : ''; };
        return { belegt: (t: Tag) => istBelegt(fremd, t), info: (t: Tag) => { const b = fremd.find((x) => x.von <= t && (x.bis === null || x.bis >= t)); return b ? `reserviert${kn(b.kundeId) ? ` – ${kn(b.kundeId)}` : ''}` : ''; } };
      };
      const f = dlg.querySelector('form');
      const wahl = zeitraumAnbinden(dlg, 'ab', 'bis', { von: heute, bis: f.bis.value || plusTage(heute, 6), min: heute, vorgabeTage: 7, ...sperren() });
      sel.addEventListener('change', () => { const s2 = sperren(); wahl.setBelegt(s2.belegt, s2.info); });
      sel.addEventListener('change', () => { const kk = store.getData().kunden.find((x) => x.id === sel.value); const n = dlg.querySelector('[name=unterschriftName]'); if (kk && !n.value) n.value = kundenName(kk); });
    },
    knoepfe: [{
      label: 'Verleihen', primaer: true,
      pruefen: (dlg) => {
        const f = dlg.querySelector('form');
        if (!f.kunde.value) return 'Bitte einen Kunden wählen.';
        if (!datumZuIso(f.ab.value)) return 'Bitte ein gültiges Ausgabedatum wählen.';
        const ab = datumZuIso(f.ab.value)!;
        const bis = datumZuIso(f.bis.value);
        if (bis && bis < ab) return 'Rückgabe liegt vor der Ausgabe.';
        // Reservierungen anderer Kunden im Zeitraum sperren den Verleih
        const k = geraetBelegung(store.getData(), g.id, ab, bis || ab, reservierung?.id || '')
          .filter((x) => x.art === 'reservierung' && x.eintrag.kundeId !== f.kunde.value);
        return k.length ? `Im Zeitraum reserviert: ${konfliktText(k, store.getData())}. Bitte Rückgabe früher legen oder Reservierung ändern.` : null;
      },
      wert: (dlg) => {
        const f = dlg.querySelector('form');
        const u = holeUnterschrift();
        return { kundeId: f.kunde.value as string, ausgabe: datumZuIso(f.ab.value) || nowIso(), rueckgabeGeplant: datumZuIso(f.bis.value), erinnern: f.erinnern.checked, notiz: f.notiz.value.trim(), fotos: holeFotos(), unterschrift: u.bild, name: u.name };
      },
    }],
  });
  if (!res) return false;
  let neueLeihId = '';
  store.mutate((data) => {
    if (offenerVerleih(data, g.id)) throw new Error('Gerät ist bereits verliehen.');
    const l = neuerLeihvorgang({ geraetId: g.id, kundeId: res.kundeId, ausgabe: res.ausgabe, rueckgabeGeplant: res.rueckgabeGeplant, notiz: res.notiz, fotosAusgabe: res.fotos, unterschriftAusgabe: res.unterschrift, nameAusgabe: res.name });
    neueLeihId = l.id;
    data.leihvorgaenge.push(l);
    // Reservierung ist mit dem Verleih erledigt (eigene oder die des Kunden für dieses Gerät)
    data.reservierungen = data.reservierungen.filter((r) => !(r.id === reservierung?.id || (r.geraetId === g.id && r.kundeId === res.kundeId && r.von.slice(0, 10) <= (res.rueckgabeGeplant || res.ausgabe).slice(0, 10))));
    const k = data.kunden.find((x) => x.id === res.kundeId);
    if (k) {
      vorwerkStatusAnheben(k, 'interesse');
      k.notizen.push(neueNotiz({ text: `Vorführgerät ausgeliehen: ${g.name}${res.rueckgabeGeplant ? ` (zurück bis ${formatDate(res.rueckgabeGeplant)})` : ''}.${res.notiz ? ` ${res.notiz}` : ''}`, sparten: ['vorwerk'], zeitpunkt: res.ausgabe }));
      k.updatedAt = nowIso();
    }
    if (res.erinnern && res.rueckgabeGeplant) {
      data.termine.push(neuerTermin({
        kundeId: res.kundeId, sparte: 'vorwerk', art: 'wiedervorlage', dauerMin: 60, beginn: res.rueckgabeGeplant,
        titel: `Nachfragen: ${g.name} bei ${k ? kundenTitel(k) : 'Kunde'}`,
        notiz: 'Wie gefällt das Gerät? Kaufinteresse? Rückgabe abholen.',
        ort: k ? adresseEinzeilig(k) : '',
      }));
    }
  });
  toast(res.erinnern && res.rueckgabeGeplant ? 'Verliehen, Erinnerung angelegt' : 'Verliehen', 'ok');
  if (neueLeihId) leihschein.anbieten(neueLeihId, 'ausgabe', dialog);
  return true;
}

export async function ruecknahme(g: Geraet, gekauft: boolean): Promise<boolean> {
  const d = store.getData();
  const l = offenerVerleih(d, g.id);
  if (!l) return false;
  const k = d.kunden.find((x) => x.id === l.kundeId);
  let holeFotos = (): string[] => [];
  let holeUnterschrift = () => ({ bild: '', name: '' });
  const res = await dialog({
    titel: gekauft ? `${g.name} wird gekauft` : `${g.name} zurückgenommen`,
    html: gekauft
      ? `<p>${esc(k ? kundenTitel(k) : 'Der Kunde')} behält das Vorführgerät. Es wird aus dem Bestand genommen, der Vorwerk-Status wird auf „Abschluss“ gesetzt.</p>`
      : `<label>Kaufinteresse<select name="kauf">${Object.entries(KAUFINTERESSE).filter(([key]) => key !== 'gekauft').map(([key, v]) => `<option value="${key}" ${key === l.kaufinteresse ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
         <label>Notiz (Zustand bei Rückgabe, Feedback)<textarea name="notiz" rows="2"></textarea></label>
         ${fotosHtml('Fotos vom Zustand bei Rückgabe')}
         ${unterschriftHtml(k ? kundenName(k) : '')}`,
    onOpen: (dlg) => { if (!gekauft) { holeFotos = fotosVerdrahten(dlg); holeUnterschrift = unterschriftVerdrahten(dlg); } },
    knoepfe: [{ label: gekauft ? 'Als verkauft buchen' : 'Rücknahme buchen', primaer: true, wert: (dlg) => ({ kauf: gekauft ? 'gekauft' : dlg.querySelector('[name=kauf]').value, notiz: gekauft ? '' : dlg.querySelector('[name=notiz]').value.trim(), fotos: holeFotos(), unterschrift: holeUnterschrift() }) }],
  });
  if (!res) return false;
  store.mutate((data) => {
    const x = data.leihvorgaenge.find((y) => y.id === l.id);
    if (!x) return;
    x.rueckgabe = nowIso();
    x.kaufinteresse = (res.kauf in KAUFINTERESSE ? res.kauf : 'offen') as Leihvorgang['kaufinteresse'];
    x.fotosRueckgabe = res.fotos;
    x.unterschriftRueckgabe = res.unterschrift.bild;
    x.nameRueckgabe = res.unterschrift.name;
    if (res.notiz) x.notiz = x.notiz ? `${x.notiz}\n${res.notiz}` : res.notiz;
    x.updatedAt = nowIso();
    if (gekauft) { const gg = data.geraete.find((y) => y.id === g.id); if (gg) { gg.aktiv = false; gg.verkauf = { kundeId: x.kundeId, datum: x.rueckgabe!, preis: null, notiz: '' }; gg.updatedAt = nowIso(); } }
    const kk = data.kunden.find((y) => y.id === x.kundeId);
    if (kk) {
      if (gekauft) vorwerkStatusAnheben(kk, 'abschluss');
      else if (res.kauf === 'interesse') vorwerkStatusAnheben(kk, 'angebot');
      kk.notizen.push(neueNotiz({ text: gekauft ? `Vorführgerät ${g.name} gekauft.` : `Vorführgerät ${g.name} zurückgenommen. Kaufinteresse: ${KAUFINTERESSE[res.kauf]}.${res.notiz ? ` ${res.notiz}` : ''}`, sparten: ['vorwerk'] }));
      kk.updatedAt = nowIso();
    }
    // Offene Nachfrage-Erinnerung zu diesem Gerät erledigen
    for (const t of data.termine) if (!t.erledigt && t.kundeId === x.kundeId && t.titel.startsWith(`Nachfragen: ${g.name}`)) { t.erledigt = true; t.updatedAt = nowIso(); }
  });
  toast(gekauft ? 'Verkauf gebucht' : 'Rücknahme gebucht', 'ok');
  if (!gekauft) leihschein.anbieten(l.id, 'rueckgabe', dialog);
  return true;
}

async function erinnerung(g: Geraet): Promise<boolean> {
  const d = store.getData();
  const l = offenerVerleih(d, g.id);
  const k = l ? d.kunden.find((x) => x.id === l.kundeId) : null;
  const res = await dialog({
    titel: 'Nachfrage-Erinnerung',
    html: `<label>Wann nachfragen?<input type="date" name="am" value="${datumInput(new Date(Date.now() + 2 * TAG_MS).toISOString())}" required></label>`,
    knoepfe: [{ label: 'Anlegen', primaer: true, pruefen: (dlg) => (datumZuIso(dlg.querySelector('[name=am]').value) ? null : 'Ungültiges Datum.'), wert: (dlg) => datumZuIso(dlg.querySelector('[name=am]').value) }],
  });
  if (!res) return false;
  store.mutate((data) => {
    data.termine.push(neuerTermin({ kundeId: l?.kundeId || '', sparte: 'vorwerk', art: 'wiedervorlage', dauerMin: 60, beginn: res, titel: `Nachfragen: ${g.name} bei ${k ? kundenTitel(k) : 'Kunde'}`, notiz: 'Wie gefällt das Gerät? Kaufinteresse?' }));
  });
  toast('Erinnerung angelegt', 'ok');
  return false;
}
