// Vorführbestand (Vorwerk-Geräte im Auto): verleihen, zurücknehmen, Erinnerung, Kaufinteresse.
import { esc, nowIso, formatDate, isValidDate } from '../../core/util.js';
import { KAUFINTERESSE, kundenTitel, adresseEinzeilig, neuesGeraet, neuerLeihvorgang, neueNotiz, neuerTermin, offenerVerleih, STATUS_KEYS } from '../../core/model.js';
import * as store from '../../storage/store.js';
import { maskottchen, toast, dialog, bestaetigen } from '../dom.js';
import { leer } from '../parts.js';

const TAG_MS = 86400000;

function datumInput(iso) {
  if (!isValidDate(iso)) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' -> ISO am gewählten Tag 10:00 Uhr Ortszeit, sonst null. */
function datumZuIso(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return null;
  const d = new Date(`${v}T10:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Vorwerk-Status eines Kunden nur anheben, nie absenken. */
function vorwerkStatusAnheben(k, ziel) {
  const rang = ['unbekannt', 'kein_interesse', 'potenzial', 'interesse', 'termin', 'angebot', 'abschluss'];
  if (!STATUS_KEYS.includes(ziel)) return;
  if (rang.indexOf(ziel) > rang.indexOf(k.status.vorwerk)) k.status.vorwerk = ziel;
}

export function verleihStatus(l) {
  if (l.rueckgabe) return 'zurueck';
  if (l.rueckgabeGeplant && l.rueckgabeGeplant < nowIso()) return 'ueberfaellig';
  return 'verliehen';
}

export function render(el) {
  const d = store.getData();
  const aktiv = d.geraete.filter((g) => g.aktiv);
  const offen = d.leihvorgaenge.filter((l) => !l.rueckgabe);
  const ueberfaellig = offen.filter((l) => verleihStatus(l) === 'ueberfaellig');
  const kunde = (id) => d.kunden.find((k) => k.id === id);
  const verlauf = d.leihvorgaenge.filter((l) => l.rueckgabe).sort((a, b) => (a.rueckgabe < b.rueckgabe ? 1 : -1)).slice(0, 15);

  el.innerHTML = `
    <header class="seitenkopf">
      <h1>${maskottchen('vorwerk', 'titel-bild')} Vorführbestand</h1>
      <button class="btn primary" id="neu">+ Gerät</button>
    </header>
    <div class="zahlen">
      <span><b>${aktiv.length - offen.length}</b> im Auto</span>
      <span><b>${offen.length}</b> verliehen</span>
      <span class="${ueberfaellig.length ? 'warn' : ''}"><b>${ueberfaellig.length}</b> überfällig</span>
    </div>
    ${aktiv.length ? `<div class="geraete">${aktiv.map((g) => {
    const l = offenerVerleih(d, g.id);
    const st = l ? verleihStatus(l) : 'frei';
    const k = l ? kunde(l.kundeId) : null;
    return `
      <article class="karte-box geraet geraet-${st}" data-id="${esc(g.id)}">
        <div class="geraet-kopf">
          <div><strong>${esc(g.name)}</strong>${g.seriennummer ? `<br><small>SN ${esc(g.seriennummer)}</small>` : ''}</div>
          <span class="pill pill-${st}">${st === 'frei' ? 'Im Auto' : st === 'ueberfaellig' ? 'Überfällig' : 'Verliehen'}</span>
        </div>
        ${l ? `
          <p class="geraet-info">Bei ${k ? `<a href="#/kunde/${esc(k.id)}">${esc(kundenTitel(k))}</a>` : 'unbekanntem Kunden'} seit ${esc(formatDate(l.ausgabe))}${l.rueckgabeGeplant ? `, zurück bis <b>${esc(formatDate(l.rueckgabeGeplant))}</b>` : ''}</p>
          <label class="kauf">Kaufinteresse
            <select data-kauf="${esc(l.id)}">${Object.entries(KAUFINTERESSE).filter(([key]) => key !== 'gekauft').map(([key, v]) => `<option value="${key}" ${key === l.kaufinteresse ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
          </label>
          ${l.notiz ? `<p class="hinweis">${esc(l.notiz)}</p>` : ''}
          <div class="knopfreihe">
            <button class="btn primary klein" data-aktion="zurueck">Zurückgenommen</button>
            <button class="btn klein" data-aktion="gekauft">Kunde kauft es</button>
            <button class="btn ghost klein" data-aktion="erinnern">Nachfrage-Erinnerung</button>
          </div>` : `
          ${g.zubehoer ? `<p class="hinweis">Zubehör: ${esc(g.zubehoer)}</p>` : ''}
          <div class="knopfreihe">
            <button class="btn primary klein" data-aktion="verleihen">Verleihen</button>
            <button class="btn ghost klein" data-aktion="bearbeiten">Bearbeiten</button>
          </div>`}
      </article>`;
  }).join('')}</div>` : leer('vorwerk', 'Noch keine Vorführgeräte erfasst. Lege die Geräte aus deinem Auto an.')}
    ${verlauf.length ? `
    <section class="karte-box">
      <h2>Verlauf</h2>
      <ul class="liste">${verlauf.map((l) => {
    const g = d.geraete.find((x) => x.id === l.geraetId);
    const k = kunde(l.kundeId);
    return `<li class="zeile"><span class="zeile-haupt"><strong>${esc(g?.name || 'Gerät')}</strong><small>${k ? esc(kundenTitel(k)) : '–'} · ${esc(formatDate(l.ausgabe))} bis ${esc(formatDate(l.rueckgabe))}</small></span><span class="pill pill-kauf-${l.kaufinteresse}">${esc(KAUFINTERESSE[l.kaufinteresse])}</span></li>`;
  }).join('')}</ul>
    </section>` : ''}`;

  el.querySelector('#neu').addEventListener('click', async () => { if (await geraetDialog()) render(el); });

  el.querySelectorAll('[data-kauf]').forEach((sel) => sel.addEventListener('change', () => {
    store.mutate((data) => {
      const l = data.leihvorgaenge.find((x) => x.id === sel.dataset.kauf);
      if (!l) return;
      l.kaufinteresse = sel.value;
      l.updatedAt = nowIso();
      const k = data.kunden.find((x) => x.id === l.kundeId);
      if (k && sel.value === 'interesse') { vorwerkStatusAnheben(k, 'angebot'); k.updatedAt = nowIso(); }
    });
    toast('Gespeichert', 'ok');
  }));

  el.querySelectorAll('.geraet').forEach((karte) => karte.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-aktion]');
    if (!b) return;
    const g = store.getData().geraete.find((x) => x.id === karte.dataset.id);
    if (!g) return;
    const aktion = b.dataset.aktion;
    let geaendert = false;
    if (aktion === 'verleihen') geaendert = await verleihDialog(g);
    else if (aktion === 'bearbeiten') geaendert = await geraetDialog(g);
    else if (aktion === 'zurueck') geaendert = await ruecknahme(g, false);
    else if (aktion === 'gekauft') geaendert = await ruecknahme(g, true);
    else if (aktion === 'erinnern') geaendert = await erinnerung(g);
    if (geaendert) render(el);
  }));
}

async function geraetDialog(g = null) {
  const res = await dialog({
    titel: g ? 'Gerät bearbeiten' : 'Neues Vorführgerät',
    html: `
      <label>Bezeichnung<input name="name" value="${esc(g?.name || '')}" placeholder="z. B. Kobold VK7 Akku-Staubsauger" required maxlength="200"></label>
      <label>Seriennummer<input name="sn" value="${esc(g?.seriennummer || '')}" maxlength="100"></label>
      <label>Zubehör<input name="zub" value="${esc(g?.zubehoer || '')}" placeholder="z. B. Polsterdüse, Ladegerät" maxlength="1000"></label>
      <label>Notiz<textarea name="notiz" rows="2">${esc(g?.notiz || '')}</textarea></label>`,
    knoepfe: [
      ...(g ? [{ label: 'Aus Bestand nehmen', gefahr: true, wert: 'entfernen' }] : []),
      { label: 'Speichern', primaer: true, pruefen: (dlg) => (dlg.querySelector('[name=name]').value.trim() ? null : 'Bitte eine Bezeichnung eingeben.'),
        wert: (dlg) => ({ name: dlg.querySelector('[name=name]').value.trim(), seriennummer: dlg.querySelector('[name=sn]').value.trim(), zubehoer: dlg.querySelector('[name=zub]').value, notiz: dlg.querySelector('[name=notiz]').value }) },
    ],
  });
  if (!res) return false;
  if (res === 'entfernen') {
    if (!(await bestaetigen('Gerät aus dem Bestand nehmen?', `${g.name} wird ausgeblendet. Der Verleih-Verlauf bleibt erhalten.`, 'Aus Bestand nehmen'))) return false;
    store.mutate((d) => { const x = d.geraete.find((y) => y.id === g.id); if (x) { x.aktiv = false; x.updatedAt = nowIso(); } });
    return true;
  }
  store.mutate((d) => {
    if (g) { const x = d.geraete.find((y) => y.id === g.id); if (x) Object.assign(x, res, { updatedAt: nowIso() }); } else d.geraete.push(neuesGeraet(res));
  });
  toast('Gespeichert', 'ok');
  return true;
}

async function verleihDialog(g) {
  const d = store.getData();
  if (!d.kunden.length) { toast('Bitte zuerst einen Kunden anlegen.', 'error'); return false; }
  const opts = [...d.kunden].sort((a, b) => kundenTitel(a).localeCompare(kundenTitel(b), 'de'))
    .map((k) => `<option value="${esc(k.id)}">${esc(kundenTitel(k))}</option>`).join('');
  const res = await dialog({
    titel: `${g.name} verleihen`,
    html: `
      <label>An Kunde<select name="kunde" required><option value="">– bitte wählen –</option>${opts}</select></label>
      <div class="row2">
        <label>Ausgegeben am<input type="date" name="ab" value="${datumInput(nowIso())}" required></label>
        <label>Zurück bis<input type="date" name="bis" value="${datumInput(new Date(Date.now() + 7 * TAG_MS).toISOString())}"></label>
      </div>
      <label class="check"><input type="checkbox" name="erinnern" checked> Erinnerung zum Nachfragen am Rückgabetag anlegen</label>
      <label>Notiz (Zustand, Absprache)<textarea name="notiz" rows="2" placeholder="z. B. neuwertig, Kunde testet auf Teppich und Fliesen"></textarea></label>`,
    knoepfe: [{
      label: 'Verleihen', primaer: true,
      pruefen: (dlg) => {
        const f = dlg.querySelector('form');
        if (!f.kunde.value) return 'Bitte einen Kunden wählen.';
        if (!datumZuIso(f.ab.value)) return 'Bitte ein gültiges Ausgabedatum wählen.';
        if (f.bis.value && datumZuIso(f.bis.value) < datumZuIso(f.ab.value)) return 'Rückgabe liegt vor der Ausgabe.';
        return null;
      },
      wert: (dlg) => {
        const f = dlg.querySelector('form');
        return { kundeId: f.kunde.value, ausgabe: datumZuIso(f.ab.value), rueckgabeGeplant: datumZuIso(f.bis.value), erinnern: f.erinnern.checked, notiz: f.notiz.value.trim() };
      },
    }],
  });
  if (!res) return false;
  store.mutate((data) => {
    if (offenerVerleih(data, g.id)) throw new Error('Gerät ist bereits verliehen.');
    const l = neuerLeihvorgang({ geraetId: g.id, kundeId: res.kundeId, ausgabe: res.ausgabe, rueckgabeGeplant: res.rueckgabeGeplant, notiz: res.notiz });
    data.leihvorgaenge.push(l);
    const k = data.kunden.find((x) => x.id === res.kundeId);
    if (k) {
      vorwerkStatusAnheben(k, 'interesse');
      k.notizen.push(neueNotiz({ text: `Vorführgerät ausgeliehen: ${g.name}${res.rueckgabeGeplant ? ` (zurück bis ${formatDate(res.rueckgabeGeplant)})` : ''}.${res.notiz ? ` ${res.notiz}` : ''}`, sparten: ['vorwerk'], zeitpunkt: res.ausgabe }));
      k.updatedAt = nowIso();
    }
    if (res.erinnern && res.rueckgabeGeplant) {
      data.termine.push(neuerTermin({
        kundeId: res.kundeId, sparte: 'vorwerk', art: 'wiedervorlage', dauerMin: 15, beginn: res.rueckgabeGeplant,
        titel: `Nachfragen: ${g.name} bei ${k ? kundenTitel(k) : 'Kunde'}`,
        notiz: 'Wie gefällt das Gerät? Kaufinteresse? Rückgabe abholen.',
        ort: k ? adresseEinzeilig(k) : '',
      }));
    }
  });
  toast(res.erinnern && res.rueckgabeGeplant ? 'Verliehen, Erinnerung angelegt' : 'Verliehen', 'ok');
  return true;
}

async function ruecknahme(g, gekauft) {
  const d = store.getData();
  const l = offenerVerleih(d, g.id);
  if (!l) return false;
  const k = d.kunden.find((x) => x.id === l.kundeId);
  const res = await dialog({
    titel: gekauft ? `${g.name} wird gekauft` : `${g.name} zurückgenommen`,
    html: gekauft
      ? `<p>${esc(k ? kundenTitel(k) : 'Der Kunde')} behält das Vorführgerät. Es wird aus dem Bestand genommen, der Vorwerk-Status wird auf „Abschluss“ gesetzt.</p>`
      : `<label>Kaufinteresse<select name="kauf">${Object.entries(KAUFINTERESSE).filter(([key]) => key !== 'gekauft').map(([key, v]) => `<option value="${key}" ${key === l.kaufinteresse ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
         <label>Notiz (Zustand bei Rückgabe, Feedback)<textarea name="notiz" rows="2"></textarea></label>`,
    knoepfe: [{ label: gekauft ? 'Als verkauft buchen' : 'Rücknahme buchen', primaer: true, wert: (dlg) => ({ kauf: gekauft ? 'gekauft' : dlg.querySelector('[name=kauf]').value, notiz: gekauft ? '' : dlg.querySelector('[name=notiz]').value.trim() }) }],
  });
  if (!res) return false;
  store.mutate((data) => {
    const x = data.leihvorgaenge.find((y) => y.id === l.id);
    if (!x) return;
    x.rueckgabe = nowIso();
    x.kaufinteresse = res.kauf;
    if (res.notiz) x.notiz = x.notiz ? `${x.notiz}\n${res.notiz}` : res.notiz;
    x.updatedAt = nowIso();
    if (gekauft) { const gg = data.geraete.find((y) => y.id === g.id); if (gg) { gg.aktiv = false; gg.updatedAt = nowIso(); } }
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
  return true;
}

async function erinnerung(g) {
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
    data.termine.push(neuerTermin({ kundeId: l?.kundeId || '', sparte: 'vorwerk', art: 'wiedervorlage', dauerMin: 15, beginn: res, titel: `Nachfragen: ${g.name} bei ${k ? kundenTitel(k) : 'Kunde'}`, notiz: 'Wie gefällt das Gerät? Kaufinteresse?' }));
  });
  toast('Erinnerung angelegt', 'ok');
  return false;
}
