// Einstellungen: Absender, Textvorlagen, Dropbox, Backup, Historie, Passwort, Datenschutz.
import { esc, formatDateTime, parseNumber } from '../../core/util.js';
import { DEFAULT_VORLAGEN } from '../../core/model.js';
import { PLATZHALTER } from '../../core/textgen.js';
import { validateEnvelope } from '../../core/crypto.js';
import * as store from '../../storage/store.js';
import * as db from '../../storage/db.js';
import * as dbx from '../../storage/dropbox.js';
import * as sync from '../../storage/sync.js';
import * as theme from '../theme.js';
import { MAILPROGRAMME, gemerktesMailprogramm, mailprogrammMerken } from '../kontakt.js';
import { maskottchen, toast, download, dateiWaehlen, dialog, bestaetigen, teilenOderSpeichern } from '../dom.js';

export const APP_VERSION = '0.4.0';

export function render(el) {
  const e = store.getData().einstellungen;
  const demo = store.isDemo();
  el.innerHTML = `
    <header class="seitenkopf"><h1>${maskottchen('einstellungen', 'titel-bild')} Einstellungen</h1></header>
    ${demo ? '<p class="hinweis demo-hinweis">Demo-Modus: Änderungen werden nicht gespeichert. Backup, Dropbox und Passwort sind hier deaktiviert.</p>' : ''}

    <section class="karte-box">
      <h2>Darstellung</h2>
      <div class="segment farbschema-wahl" role="group" aria-label="Farbschema">
        ${Object.entries(theme.SCHEMATA).map(([k, v]) => `<button data-schema="${k}" class="${theme.lesen() === k ? 'aktiv' : ''}">${v}</button>`).join('')}
      </div>
      <p class="hinweis">Automatisch folgt der Einstellung des Geräts.</p>
    </section>

    <section class="karte-box">
      <h2>Allgemein</h2>
      <div class="formgrid">
        <label class="breit">Absender (Gruß unter Texten)<input id="absender" value="${esc(e.absender)}"></label>
        <label>Automatisch sperren nach (Minuten, 0 = nie)<input id="autoSperre" type="number" min="0" max="240" value="${esc(e.autoSperreMin)}"></label>
      </div>
    </section>

    <section class="karte-box">
      <h2>E-Mail</h2>
      <div class="formgrid">
        <label class="breit">Mailprogramm auf diesem Gerät<select id="mailprogramm">
          <option value="">Jedes Mal fragen</option>
          ${Object.entries(MAILPROGRAMME).map(([k, v]) => `<option value="${k}" ${gemerktesMailprogramm() === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
        </select></label>
        <label>Empfänger für Enpal-Texte<input id="empfEnpal" type="email" value="${esc(e.empfaenger.enpal)}" placeholder="z. B. team@enpal.de" autocomplete="off"></label>
        <label>Empfänger für Vorwerk-Texte<input id="empfVorwerk" type="email" value="${esc(e.empfaenger.vorwerk)}" placeholder="z. B. buero@…" autocomplete="off"></label>
      </div>
      <p class="hinweis">Die Empfänger werden beim „Per E-Mail senden“ im Texte-Tab vorausgefüllt. Die Mail geht erst raus, wenn du sie im Mailprogramm abschickst.</p>
    </section>

    <section class="karte-box">
      <h2>Textvorlagen</h2>
      <p class="hinweis">Platzhalter: ${PLATZHALTER.map((p) => `<code>{{${p}}}</code>`).join(' ')}. Jede Vorlage bekommt nur die Daten ihrer eigenen Seite.</p>
      <label>Enpal (PV + Wärmepumpe)<textarea id="vEnpal" rows="10">${esc(e.vorlagen.enpal)}</textarea></label>
      <label>Vorwerk<textarea id="vVorwerk" rows="10">${esc(e.vorlagen.vorwerk)}</textarea></label>
      <button class="btn ghost" id="vReset">Vorlagen zurücksetzen</button>
    </section>

    <section class="karte-box ${demo ? 'aus' : ''}">
      <h2>Dropbox-Abgleich</h2>
      <p class="hinweis">Es wird nur die verschlüsselte Datei abgelegt. Beim Öffnen holt die App den neuesten Stand, nach Änderungen lädt sie hoch. Der neueste Stand gewinnt.</p>
      <div class="formgrid">
        <label>Dropbox App-Key<input id="dbxKey" value="${esc(e.dropbox.appKey)}" autocomplete="off" ${demo ? 'disabled' : ''}></label>
        <label>Dateipfad<input id="dbxPfad" value="${esc(e.dropbox.pfad)}" ${demo ? 'disabled' : ''}></label>
      </div>
      <p><small>Redirect-URI für die Dropbox-App: <code>${esc(dbx.redirectUri())}</code></small></p>
      <p id="syncStatus" class="sync-status"></p>
      <div class="knopfreihe">
        ${e.dropbox.refreshToken
    ? '<button class="btn primary" id="dbxSync">Jetzt abgleichen</button><button class="btn ghost" id="dbxTrennen">Trennen</button>'
    : `<button class="btn primary" id="dbxVerbinden" ${demo ? 'disabled' : ''}>Mit Dropbox verbinden</button>`}
      </div>
    </section>

    <section class="karte-box ${demo ? 'aus' : ''}">
      <h2>Datensicherung</h2>
      <p class="hinweis">Die Sicherungsdatei ist mit deinem Master-Passwort verschlüsselt. <b>iCloud:</b> „In iCloud / Dateien sichern“ tippen, im Teilen-Menü „In Dateien sichern“ wählen und den Ordner in iCloud Drive aussuchen. Zum Zurückholen „Sicherung einspielen“ und die Datei aus iCloud Drive wählen.</p>
      <p id="letzteSicherung" class="hinweis"></p>
      <div class="knopfreihe">
        <button class="btn primary" id="icloud" ${demo ? 'disabled' : ''}>☁️ In iCloud / Dateien sichern</button>
        <button class="btn ghost" id="backup" ${demo ? 'disabled' : ''}>Sicherung herunterladen</button>
        <button class="btn ghost" id="import" ${demo ? 'disabled' : ''}>Sicherung einspielen</button>
      </div>
      <h3>Automatische Versionen auf diesem Gerät</h3>
      <ul class="liste" id="historie"><li class="hinweis">${demo ? 'Im Demo-Modus nicht verfügbar.' : 'Wird geladen …'}</li></ul>
    </section>

    <section class="karte-box ${demo ? 'aus' : ''}">
      <h2>Sicherheit</h2>
      <div class="knopfreihe">
        <button class="btn ghost" id="pw" ${demo ? 'disabled' : ''}>Master-Passwort ändern</button>
        <button class="btn danger" id="reset" ${demo ? 'disabled' : ''}>Alle Daten auf diesem Gerät löschen</button>
      </div>
    </section>

    <section class="karte-box">
      <h2>Datenschutz</h2>
      <p class="hinweis">Sperling speichert alle Kundendaten ausschließlich verschlüsselt auf diesem Gerät und – falls eingerichtet – als verschlüsselte Datei in deiner eigenen Dropbox. Es gibt keinen Sperling-Server. Für Kartenbilder werden Kartenausschnitte bei Esri bzw. OpenStreetMap geladen, für Adressvorschläge werden Koordinaten bzw. Adressen an OpenStreetMap Nominatim gesendet – niemals Namen oder Notizen. Kunden können auf Wunsch jederzeit vollständig gelöscht werden (Kunde öffnen → Kunde löschen).</p>
      <p><small>Sperling ${APP_VERSION} · Kartenbibliothek Leaflet (BSD-2)</small></p>
    </section>`;

  el.querySelectorAll('[data-schema]').forEach((b) => b.addEventListener('click', () => {
    theme.setzen(b.dataset.schema);
    el.querySelectorAll('[data-schema]').forEach((x) => x.classList.toggle('aktiv', x === b));
  }));

  const speichere = (fn) => { if (!demo) store.mutate(fn); };
  el.querySelector('#mailprogramm').addEventListener('change', (ev) => { mailprogrammMerken(ev.target.value); toast('Gespeichert', 'ok'); });
  el.querySelector('#empfEnpal').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.empfaenger.enpal = ev.target.value.trim(); }));
  el.querySelector('#empfVorwerk').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.empfaenger.vorwerk = ev.target.value.trim(); }));
  el.querySelector('#absender').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.absender = ev.target.value; }));
  el.querySelector('#autoSperre').addEventListener('change', (ev) => {
    const n = parseNumber(ev.target.value);
    if (n === null || n < 0 || n > 240) { toast('Bitte 0 bis 240 eingeben.', 'error'); return; }
    speichere((d) => { d.einstellungen.autoSperreMin = Math.round(n); });
  });
  el.querySelector('#vEnpal').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.vorlagen.enpal = ev.target.value || DEFAULT_VORLAGEN.enpal; }));
  el.querySelector('#vVorwerk').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.vorlagen.vorwerk = ev.target.value || DEFAULT_VORLAGEN.vorwerk; }));
  el.querySelector('#vReset').addEventListener('click', async () => {
    if (!(await bestaetigen('Vorlagen zurücksetzen?', 'Eigene Änderungen an beiden Vorlagen gehen verloren.', 'Zurücksetzen'))) return;
    speichere((d) => { d.einstellungen.vorlagen = { ...DEFAULT_VORLAGEN }; });
    render(el);
  });

  if (demo) return;

  sync.onStatus((s) => { const p = el.querySelector('#syncStatus'); if (p) { p.textContent = s.text; p.dataset.zustand = s.zustand; } });
  el.querySelector('#dbxKey').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.dropbox.appKey = ev.target.value.trim(); }));
  el.querySelector('#dbxPfad').addEventListener('change', (ev) => {
    const v = ev.target.value.trim();
    if (!/^\/[^\\]+$/.test(v)) { toast('Pfad muss mit / beginnen.', 'error'); return; }
    speichere((d) => { d.einstellungen.dropbox.pfad = v; });
  });
  el.querySelector('#dbxVerbinden')?.addEventListener('click', async () => {
    try {
      await store.flush();
      await dbx.startAuth(store.getData().einstellungen.dropbox.appKey);
    } catch (err) { toast(err.message, 'error'); }
  });
  el.querySelector('#dbxSync')?.addEventListener('click', () => sync.syncJetzt().then(() => render(el)));
  el.querySelector('#dbxTrennen')?.addEventListener('click', async () => {
    if (!(await bestaetigen('Dropbox trennen?', 'Die Datei in Dropbox bleibt erhalten, es wird nur nicht mehr abgeglichen.', 'Trennen'))) return;
    dbx.vergessen();
    speichere((d) => { d.einstellungen.dropbox.refreshToken = ''; });
    render(el);
  });

  const sicherungsName = () => `sperling-sicherung-${new Date().toISOString().slice(0, 10)}.sperling`;
  const letzteZeigen = () => {
    db.getMeta('letzteSicherung').then((t) => {
      const p = el.querySelector('#letzteSicherung');
      if (p) p.textContent = t ? `Letzte Sicherung: ${formatDateTime(t)}` : 'Noch keine Sicherung erstellt.';
    }).catch(() => {});
  };
  if (!demo) letzteZeigen();
  const merken = () => db.setMeta('letzteSicherung', new Date().toISOString()).then(letzteZeigen).catch(() => {});
  el.querySelector('#backup').addEventListener('click', async () => {
    try {
      const env = await store.currentEnvelope();
      download(sicherungsName(), JSON.stringify(env), 'application/json');
      merken();
    } catch (err) { toast(`Sicherung fehlgeschlagen: ${err.message}`, 'error'); }
  });
  // iCloud: Safari erlaubt das Teilen-Menü nur direkt nach einem Tipp. Deshalb erst die
  // Datei vorbereiten, dann ein zweiter Tipp auf „Jetzt sichern“ öffnet das Teilen-Menü.
  el.querySelector('#icloud').addEventListener('click', async () => {
    let inhalt;
    try { inhalt = JSON.stringify(await store.currentEnvelope()); } catch (err) { toast(`Sicherung fehlgeschlagen: ${err.message}`, 'error'); return; }
    const name = sicherungsName();
    await dialog({
      titel: 'In iCloud sichern',
      html: `<p>Die verschlüsselte Sicherung <b>${esc(name)}</b> ist bereit.</p><p class="hinweis">Im nächsten Schritt „In Dateien sichern“ wählen, dann „iCloud Drive“ und einen Ordner (z. B. „Sperling“).</p>`,
      knoepfe: [{ label: 'Jetzt sichern', primaer: true, wert: null }],
      onOpen: (dlg) => {
        dlg.querySelectorAll('.dlg-actions button')[1]?.addEventListener('click', async (ev) => {
          ev.preventDefault();
          const r = await teilenOderSpeichern(name, inhalt, 'application/json');
          if (r === 'abgebrochen') { toast('Abgebrochen – nichts gesichert.', 'error'); return; }
          merken();
          toast(r === 'geteilt' ? 'Sicherung übergeben' : 'Sicherung heruntergeladen (Ordner „Downloads“ bzw. Dateien-App)', 'ok', 5000);
          dlg.close();
        });
      },
    });
  });
  el.querySelector('#import').addEventListener('click', async () => {
    const txt = await dateiWaehlen(); // ohne Filter: iOS graut .sperling sonst aus; Inhalt wird unten geprüft
    if (!txt) return;
    let env;
    try { env = JSON.parse(txt); validateEnvelope(env); } catch (err) { toast(err.message || 'Ungültige Datei.', 'error'); return; }
    const pw = await dialog({
      titel: 'Sicherung einspielen',
      html: `<p>Stand der Sicherung: <b>${esc(formatDateTime(env.updatedAt))}</b>. Der aktuelle Stand wird ersetzt (bleibt aber in den automatischen Versionen erhalten).</p>
             <label>Passwort der Sicherung<input type="password" name="pw" autocomplete="current-password" required></label>`,
      knoepfe: [{ label: 'Einspielen', primaer: true, wert: (dlg) => dlg.querySelector('[name=pw]').value }],
    });
    if (!pw) return;
    try { await store.adoptEnvelope(env, pw); toast('Sicherung eingespielt', 'ok'); render(el); } catch (err) { toast(err.message, 'error'); }
  });

  db.listHistory().then((liste) => {
    const ul = el.querySelector('#historie');
    if (!ul) return;
    if (!liste.length) { ul.innerHTML = '<li class="hinweis">Noch keine älteren Versionen.</li>'; return; }
    ul.innerHTML = liste.map((h, i) => `<li class="zeile"><span class="zeile-haupt">${esc(formatDateTime(h.updatedAt))}</span><button class="btn klein ghost" data-i="${i}">Wiederherstellen</button></li>`).join('');
    ul.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-i]');
      if (!b) return;
      const h = liste[Number(b.dataset.i)];
      if (!(await bestaetigen('Version wiederherstellen?', `Stand vom ${formatDateTime(h.updatedAt)} wird geladen. Der aktuelle Stand bleibt als Version erhalten.`, 'Wiederherstellen'))) return;
      try {
        await store.adoptEnvelope(h.env);
        // als neuen Stand speichern, damit er beim Sync nicht vom älteren Zeitstempel verdrängt wird
        store.mutate(() => {});
        toast('Wiederhergestellt', 'ok');
        render(el);
      } catch (err) { toast(err.message, 'error'); }
    });
  }).catch(() => {});

  el.querySelector('#pw').addEventListener('click', async () => {
    const res = await dialog({
      titel: 'Master-Passwort ändern',
      html: `<label>Altes Passwort<input type="password" name="alt" autocomplete="current-password" required></label>
             <label>Neues Passwort (mind. 8 Zeichen)<input type="password" name="neu" minlength="8" autocomplete="new-password" required></label>
             <label>Neues Passwort wiederholen<input type="password" name="neu2" autocomplete="new-password" required></label>`,
      knoepfe: [{
        label: 'Ändern', primaer: true,
        pruefen: (dlg) => {
          const f = dlg.querySelector('form');
          if (f.neu.value.length < 8) return 'Mindestens 8 Zeichen.';
          if (f.neu.value !== f.neu2.value) return 'Passwörter stimmen nicht überein.';
          return null;
        },
        wert: (dlg) => ({ alt: dlg.querySelector('[name=alt]').value, neu: dlg.querySelector('[name=neu]').value }),
      }],
    });
    if (!res) return;
    try { await store.changePassword(res.alt, res.neu); toast('Passwort geändert. Auf anderen Geräten ab jetzt das neue verwenden.', 'ok', 6000); } catch (err) { toast(err.message, 'error'); }
  });

  el.querySelector('#reset').addEventListener('click', async () => {
    const ok = await dialog({
      titel: 'Wirklich ALLES löschen?',
      html: '<p>Alle Kunden, Notizen, Termine und Versionen auf diesem Gerät werden gelöscht. Dropbox bleibt unberührt.</p><label>Zur Bestätigung LÖSCHEN eintippen<input name="b" autocomplete="off"></label>',
      knoepfe: [{ label: 'Endgültig löschen', gefahr: true, pruefen: (dlg) => (dlg.querySelector('[name=b]').value === 'LÖSCHEN' ? null : 'Bitte LÖSCHEN eintippen.'), wert: true }],
    });
    if (!ok) return;
    await store.lock().catch(() => {});
    await db.wipeAll();
    location.hash = '';
    location.reload();
  });
}
