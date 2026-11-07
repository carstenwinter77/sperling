// Einstellungen: Absender, Textvorlagen, Sicherung (iCloud), Historie, Passwort, Datenschutz.
import { esc, formatDateTime, parseNumber } from '../../core/util.ts';
import { DEFAULT_VORLAGEN, KUNDENANSICHT_TEILE, migrate, normalizeGeraet, type KundenansichtTeil } from '../../core/model.ts';
import { demoDaten, beispielAnzahl, beispielEinfuegen, beispielEntfernen, beispielBestand, bestandAnzahl, bestandEinfuegen, bestandEntfernen } from '../../demo.ts';
import { PLATZHALTER } from '../../core/textgen.ts';
import { validateEnvelope } from '../../core/crypto.ts';
import * as store from '../../storage/store.ts';
import * as db from '../../storage/db.ts';
import * as theme from '../theme.ts';
import * as bio from '../../storage/biometrie.ts';
import { KeyRing } from '../../core/crypto.ts';
import { MAILPROGRAMME, gemerktesMailprogramm, mailprogrammMerken } from '../kontakt.ts';
import { maskottchen, toast, download, dateiWaehlen, dialog, bestaetigen, teilenOderSpeichern } from '../dom.ts';
import * as hilfe from '../hilfe.ts';
import * as kontaktseite from '../kontaktseite.ts';

export const APP_VERSION = __APP_VERSION__; // aus package.json (vite.config.ts)

export function render(el: HTMLElement) {
  const e = store.getData().einstellungen;
  const demo = store.isDemo();
  el.innerHTML = `
    <header class="seitenkopf"><h1>${maskottchen('einstellungen', 'titel-bild')} Einstellungen</h1></header>
    ${demo ? '<p class="hinweis demo-hinweis">Demo-Modus: Änderungen werden nicht gespeichert. Sicherung und Passwort sind hier deaktiviert.</p>' : ''}

    <section class="karte-box">
      <h2>Darstellung</h2>
      <div class="segment farbschema-wahl" role="group" aria-label="Farbschema">
        ${Object.entries(theme.SCHEMATA).map(([k, v]) => `<button data-schema="${k}" class="${theme.lesen() === k ? 'aktiv' : ''}">${v}</button>`).join('')}
      </div>
      <p class="hinweis">Automatisch folgt der Einstellung des Geräts.</p>
    </section>

    <section class="karte-box" id="hilfeEinstellungen">
      <h2>Hilfe</h2>
      <label class="check"><input type="checkbox" id="hilfeKnoepfe" ${hilfe.vorlieben().knoepfe ? 'checked' : ''}> ?-Knöpfe mit Kurzhilfe anzeigen</label>
      <div class="knopfreihe"><a class="btn" href="#/hilfe">📖 Hilfe öffnen</a><a class="btn ghost" href="#/hilfe?thema=installieren">📲 App installieren</a></div>
      <p class="hinweis">Die Hilfe-Seite bleibt auch ohne ?-Knöpfe erreichbar (hier und über die Suche).</p>
    </section>
    ${kontaktseite.abschnitt()}

    <section class="karte-box">
      <h2>Allgemein</h2>
      <div class="formgrid">
        <label class="breit">Absender (Gruß unter Texten)<input id="absender" value="${esc(e.absender)}"></label>
        <label>Automatisch sperren nach (Minuten, 0 = nie)<input id="autoSperre" type="number" min="0" max="240" value="${esc(e.autoSperreMin)}"></label>
      </div>
    </section>

    <section class="karte-box ${demo ? 'aus' : ''}">
      <h2>Beispieldaten</h2>
      <h3>Beispielkunden</h3>
      <p class="hinweis">Lädt fünf erfundene Kunden mit Notizen, Gesprächen, Enpal-Doku, Terminen und Vorführgeräten – zum Zeigen und Üben. Sie sind mit „Beispiel“ markiert und lassen sich mit einem Tipp wieder vollständig entfernen. Deine echten Kunden bleiben unberührt.</p>
      <p id="beispielInfo" class="hinweis">${demo ? '' : (beispielAnzahl(store.getData()) ? `<b>${beispielAnzahl(store.getData())} Beispielkunden</b> sind geladen.` : 'Keine Beispielkunden geladen.')}</p>
      <div class="knopfreihe">
        <button class="btn ghost" id="beispielLaden" ${demo ? 'disabled' : ''}>Beispielkunden laden</button>
        <button class="btn danger" id="beispielWeg" ${demo || !beispielAnzahl(store.getData()) ? 'disabled' : ''}>Beispielkunden entfernen</button>
      </div>
      <h3>Beispiel-Vorführbestand (Vorwerk)</h3>
      <p class="hinweis">Lädt einen typischen Kobold-Vorführbestand (VK7, VR7, SP7, VB100, Polsterboy, Zubehör-Koffer) ohne Kunden – zum Ausprobieren von Verleih, Erinnerung und Kaufinteresse. Erfundene Seriennummern beginnen mit „BSP“.</p>
      <p id="bestandInfo" class="hinweis">${demo ? '' : (bestandAnzahl(store.getData()) ? `<b>${bestandAnzahl(store.getData())} Beispielgeräte</b> sind im Bestand.` : 'Kein Beispielbestand geladen.')}</p>
      <div class="knopfreihe">
        <button class="btn ghost" id="bestandLaden" ${demo ? 'disabled' : ''}>Beispielbestand laden</button>
        <button class="btn danger" id="bestandWeg" ${demo || !bestandAnzahl(store.getData()) ? 'disabled' : ''}>Beispielbestand entfernen</button>
      </div>
    </section>

    <section class="karte-box">
      <h2>Navigation</h2>
      <label>„Hinfahren“ öffnet<select id="kartenApp">
        ${[['auto', 'Automatisch (Apple Karten auf iPhone/iPad, sonst Google Maps)'], ['apple', 'Apple Karten'], ['google', 'Google Maps']].map(([k, v]) => `<option value="${k}" ${e.kartenApp === k ? 'selected' : ''}>${v}</option>`).join('')}
      </select></label>
    </section>

    <section class="karte-box" id="kaEinstellungen">
      <h2>Kundenansicht zum Herzeigen ${hilfe.knopf('kundenansicht')}</h2>
      <p class="hinweis">Lege fest, was der Kunde sieht, wenn du ihm das Tablet mit der Kundenansicht gibst. Andere Kunden und Einwände sind dort nie zu sehen.</p>
      <div class="ka-wahl">${Object.entries(KUNDENANSICHT_TEILE).map(([k, v]) => `<label class="check"><input type="checkbox" data-ka="${k}" ${e.kundenansicht[k] ? 'checked' : ''}> ${esc(v.label)}</label>`).join('')}</div>
    </section>

    <section class="karte-box">
      <h2>Gelöscht</h2>
      <p class="hinweis">Gelöschte Kunden, Notizen, Termine und Enpal-Dokumentationen gehen nie verloren. Sie bleiben in der Liste „Gelöscht“, bis du sie dort einzeln endgültig löschst.</p>
      <a class="btn" href="#/geloescht" id="geloeschtLink">Gelöscht öffnen (${(store.getData().papierkorb || []).length})</a>
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
      <h2>Datensicherung ${hilfe.knopf('sicherung')}</h2>
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
      <p class="hinweis" id="bioInfo"></p>
      <div class="knopfreihe">
        <button class="btn ghost" id="bio" hidden></button>
        <button class="btn ghost" id="pw" ${demo ? 'disabled' : ''}>Master-Passwort ändern</button>
        <button class="btn danger" id="reset" ${demo ? 'disabled' : ''}>Alle Daten auf diesem Gerät löschen</button>
      </div>
    </section>

    <section class="karte-box">
      <h2>Datenschutz</h2>
      <p class="hinweis">Sperling speichert alle Kundendaten ausschließlich verschlüsselt auf diesem Gerät und – falls eingerichtet – als verschlüsselte Sicherungsdatei, die du selbst in iCloud Drive ablegst. Es gibt keinen Sperling-Server. Für Kartenbilder werden Kartenausschnitte bei Esri bzw. OpenStreetMap geladen, für Adressvorschläge werden Koordinaten bzw. Adressen an OpenStreetMap Nominatim gesendet – niemals Namen oder Notizen. Kunden können auf Wunsch jederzeit vollständig gelöscht werden (Kunde öffnen → Kunde löschen).</p>
      <p><small>Sperling ${APP_VERSION} · Kartenbibliothek Leaflet (BSD-2)</small></p>
    </section>`;

  el.querySelectorAll('[data-schema]').forEach((b) => b.addEventListener('click', () => {
    theme.setzen(b.dataset.schema);
    el.querySelectorAll('[data-schema]').forEach((x) => x.classList.toggle('aktiv', x === b));
  }));

  const speichere = (fn) => { if (!demo) store.mutate(fn); };
  el.querySelector('#beispielLaden').addEventListener('click', async () => {
    if (beispielAnzahl(store.getData()) && !(await bestaetigen('Beispielkunden neu laden?', 'Die vorhandenen Beispielkunden werden durch frische ersetzt (Änderungen daran gehen verloren). Echte Kunden bleiben unberührt.', 'Neu laden'))) return;
    try {
      const beispiel = migrate(demoDaten());
      await store.mutate((d) => beispielEinfuegen(d, beispiel));
      toast('Beispielkunden geladen – siehe Kunden', 'ok');
      render(el);
    } catch (err) { toast(`Laden fehlgeschlagen: ${(err as Error).message}`, 'error'); }
  });
  el.querySelector('#bestandLaden').addEventListener('click', async () => {
    try {
      const geraete = beispielBestand().map(normalizeGeraet);
      await store.mutate((d) => bestandEinfuegen(d, geraete));
      toast('Beispielbestand geladen – siehe Bestand', 'ok');
      render(el);
    } catch (err) { toast(`Laden fehlgeschlagen: ${(err as Error).message}`, 'error'); }
  });
  el.querySelector('#bestandWeg').addEventListener('click', async () => {
    if (!(await bestaetigen('Beispielbestand entfernen?', 'Die Beispielgeräte werden aus dem Bestand gelöscht. Geräte, die schon verliehen waren, bleiben wegen des Verlaufs erhalten.', 'Entfernen'))) return;
    try {
      await store.mutate((d) => bestandEntfernen(d));
      toast(bestandAnzahl(store.getData()) ? 'Entfernt – verliehene Beispielgeräte bleiben wegen des Verlaufs' : 'Beispielbestand entfernt', 'ok', 5000);
      render(el);
    } catch (err) { toast(`Entfernen fehlgeschlagen: ${(err as Error).message}`, 'error'); }
  });
  el.querySelector('#beispielWeg').addEventListener('click', async () => {
    if (!(await bestaetigen('Beispielkunden entfernen?', 'Alle Beispielkunden samt ihrer Notizen, Termine und Beispielgeräte werden gelöscht. Echte Kunden bleiben unberührt.', 'Entfernen'))) return;
    try {
      await store.mutate((d) => beispielEntfernen(d));
      toast('Beispielkunden entfernt', 'ok');
      render(el);
    } catch (err) { toast(`Entfernen fehlgeschlagen: ${(err as Error).message}`, 'error'); }
  });
  kontaktseite.binden(el);
  el.querySelector('#hilfeKnoepfe')?.addEventListener('change', (ev) => { hilfe.vorliebeSetzen({ knoepfe: (ev.target as HTMLInputElement).checked }); toast('Gespeichert', 'ok'); });
  el.querySelector('#kartenApp').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.kartenApp = (ev.target as HTMLInputElement).value; }));
  el.querySelector('#kaEinstellungen').addEventListener('change', (ev) => {
    const c = (ev.target as Element).closest<HTMLInputElement>('[data-ka]');
    if (c) speichere((d) => { d.einstellungen.kundenansicht[c.dataset.ka as KundenansichtTeil] = c.checked; });
  });
  el.querySelector('#mailprogramm').addEventListener('change', (ev) => { mailprogrammMerken((ev.target as HTMLInputElement).value); toast('Gespeichert', 'ok'); });
  el.querySelector('#empfEnpal').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.empfaenger.enpal = (ev.target as HTMLInputElement).value.trim(); }));
  el.querySelector('#empfVorwerk').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.empfaenger.vorwerk = (ev.target as HTMLInputElement).value.trim(); }));
  el.querySelector('#absender').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.absender = (ev.target as HTMLInputElement).value; }));
  el.querySelector('#autoSperre').addEventListener('change', (ev) => {
    const n = parseNumber((ev.target as HTMLInputElement).value);
    if (n === null || n < 0 || n > 240) { toast('Bitte 0 bis 240 eingeben.', 'error'); return; }
    speichere((d) => { d.einstellungen.autoSperreMin = Math.round(n); });
  });
  el.querySelector('#vEnpal').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.vorlagen.enpal = (ev.target as HTMLInputElement).value || DEFAULT_VORLAGEN.enpal; }));
  el.querySelector('#vVorwerk').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.vorlagen.vorwerk = (ev.target as HTMLInputElement).value || DEFAULT_VORLAGEN.vorwerk; }));
  el.querySelector('#vReset').addEventListener('click', async () => {
    if (!(await bestaetigen('Vorlagen zurücksetzen?', 'Eigene Änderungen an beiden Vorlagen gehen verloren.', 'Zurücksetzen'))) return;
    speichere((d) => { d.einstellungen.vorlagen = { ...DEFAULT_VORLAGEN }; });
    render(el);
  });

  if (demo) return;

  const sicherungsName = () => `sperling-sicherung-${new Date().toISOString().slice(0, 10)}.sperling`;
  const letzteZeigen = () => {
    db.getMeta<string>('letzteSicherung').then((t) => {
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
    } catch (err) { toast(`Sicherung fehlgeschlagen: ${(err as Error).message}`, 'error'); }
  });
  // iCloud: Safari erlaubt das Teilen-Menü nur direkt nach einem Tipp. Deshalb erst die
  // Datei vorbereiten, dann ein zweiter Tipp auf „Jetzt sichern“ öffnet das Teilen-Menü.
  el.querySelector('#icloud').addEventListener('click', async () => {
    let inhalt;
    try { inhalt = JSON.stringify(await store.currentEnvelope()); } catch (err) { toast(`Sicherung fehlgeschlagen: ${(err as Error).message}`, 'error'); return; }
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
    try { env = JSON.parse(txt); validateEnvelope(env); } catch (err) { toast((err as Error).message || 'Ungültige Datei.', 'error'); return; }
    const pw = await dialog({
      titel: 'Sicherung einspielen',
      html: `<p>Stand der Sicherung: <b>${esc(formatDateTime(env.updatedAt))}</b>. Der aktuelle Stand wird ersetzt (bleibt aber in den automatischen Versionen erhalten).</p>
             <label>Passwort der Sicherung<input type="password" name="pw" autocomplete="current-password" required></label>`,
      knoepfe: [{ label: 'Einspielen', primaer: true, wert: (dlg) => dlg.querySelector('[name=pw]').value }],
    });
    if (!pw) return;
    try { await store.adoptEnvelope(env, pw); toast('Sicherung eingespielt', 'ok'); render(el); } catch (err) { toast((err as Error).message, 'error'); }
  });

  db.listHistory().then((liste) => {
    const ul = el.querySelector('#historie');
    if (!ul) return;
    if (!liste.length) { ul.innerHTML = '<li class="hinweis">Noch keine älteren Versionen.</li>'; return; }
    ul.innerHTML = liste.map((h, i) => `<li class="zeile"><span class="zeile-haupt">${esc(formatDateTime(h.updatedAt))}</span><button class="btn klein ghost" data-i="${i}">Wiederherstellen</button></li>`).join('');
    ul.addEventListener('click', async (ev) => {
      const b = (ev.target as Element).closest('[data-i]');
      if (!b) return;
      const h = liste[Number(b.dataset.i)];
      if (!(await bestaetigen('Version wiederherstellen?', `Stand vom ${formatDateTime(h.updatedAt)} wird geladen. Der aktuelle Stand bleibt als Version erhalten.`, 'Wiederherstellen'))) return;
      try {
        await store.adoptEnvelope(h.env);
        // als neuen Stand speichern, damit er beim Sync nicht vom älteren Zeitstempel verdrängt wird
        store.mutate(() => {});
        toast('Wiederhergestellt', 'ok');
        render(el);
      } catch (err) { toast((err as Error).message, 'error'); }
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
    try {
      await store.changePassword(res.alt, res.neu);
      const hatteBio = await bio.eingerichtet();
      if (hatteBio) await bio.ausschalten(); // gespeichertes Passwort ist veraltet
      toast(`Passwort geändert. Auf anderen Geräten ab jetzt das neue verwenden.${hatteBio ? ` ${bio.bezeichnung()} bitte neu einrichten.` : ''}`, 'ok', 7000);
      bioZeigen();
    } catch (err) { toast((err as Error).message, 'error'); }
  });

  // Face ID / Touch ID
  const bioZeigen = async () => {
    const knopf = el.querySelector('#bio');
    const info = el.querySelector('#bioInfo');
    if (!knopf || demo) return;
    const name = bio.bezeichnung();
    if (await bio.eingerichtet()) {
      knopf.hidden = false; knopf.textContent = `${name} ausschalten`; knopf.dataset.an = '1';
      info.textContent = `Entsperren mit ${name} ist eingeschaltet. Das Master-Passwort funktioniert weiterhin.`;
    } else if (await bio.verfuegbar()) {
      knopf.hidden = false; knopf.textContent = `${name} einrichten`; knopf.dataset.an = '';
      info.textContent = `Statt des Passworts mit ${name} entsperren (iPhone/iPad ab iOS 18, installierte App).`;
    } else {
      knopf.hidden = true;
      info.textContent = 'Entsperren per Face ID ist auf diesem Gerät bzw. in diesem Browser nicht verfügbar.';
    }
  };
  bioZeigen();
  el.querySelector('#bio').addEventListener('click', async (ev) => {
    if ((ev.currentTarget as HTMLInputElement).dataset.an) {
      await bio.ausschalten();
      toast(`${bio.bezeichnung()} ausgeschaltet`, 'ok');
      bioZeigen();
      return;
    }
    // Erst Passwort prüfen, dann im zweiten Tipp einrichten (Safari verlangt dafür einen direkten Tipp).
    let passwort: string | null = null;
    await dialog({
      titel: `${bio.bezeichnung()} einrichten`,
      html: `<label>Master-Passwort zur Bestätigung<input type="password" name="pw" autocomplete="current-password" required></label>
             <p class="hinweis" id="bioSchritt">Nach der Prüfung erscheint die Face-ID-Abfrage des Geräts.</p>`,
      knoepfe: [{ label: 'Weiter', primaer: true, wert: null }],
      onOpen: (dlg) => {
        const k = dlg.querySelectorAll('.dlg-actions button')[1];
        k?.addEventListener('click', async (e) => {
          e.preventDefault();
          if (passwort) {
            // zweiter Tipp: Einrichten direkt aus dem Tipp heraus
            bio.einrichten(passwort)
              .then(() => { toast(`${bio.bezeichnung()} eingerichtet`, 'ok'); dlg.close(); bioZeigen(); })
              .catch((err) => toast(bio.fehlerText(err), 'error', 6000));
            return;
          }
          const pw = dlg.querySelector('[name=pw]').value;
          try {
            await new KeyRing(pw).decrypt(await db.loadEnvelope());
          } catch { toast('Falsches Passwort.', 'error'); return; }
          passwort = pw;
          dlg.querySelector('[name=pw]').disabled = true;
          dlg.querySelector('#bioSchritt').textContent = `Passwort stimmt. Jetzt „${bio.bezeichnung()} einrichten“ tippen.`;
          k.textContent = `${bio.bezeichnung()} einrichten`;
        });
      },
    });
  });

  el.querySelector('#reset').addEventListener('click', async () => {
    const ok = await dialog({
      titel: 'Wirklich ALLES löschen?',
      html: '<p>Alle Kunden, Notizen, Termine und Versionen auf diesem Gerät werden gelöscht. Sicherungsdateien in iCloud Drive bleiben unberührt.</p><label>Zur Bestätigung LÖSCHEN eintippen<input name="b" autocomplete="off"></label>',
      knoepfe: [{ label: 'Endgültig löschen', gefahr: true, pruefen: (dlg) => (dlg.querySelector('[name=b]').value === 'LÖSCHEN' ? null : 'Bitte LÖSCHEN eintippen.'), wert: true }],
    });
    if (!ok) return;
    await store.lock().catch(() => {});
    await db.wipeAll();
    location.hash = '';
    location.reload();
  });
}
