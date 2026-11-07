// Einstellungen: Absender, Textvorlagen, Sicherung (iCloud), Historie, Passwort, Datenschutz.
import * as abgleich from '../abgleich.ts';
import { esc, formatDateTime, parseNumber } from '../../core/util.ts';
import { DEFAULT_VORLAGEN, KUNDENANSICHT_TEILE, SPARTEN, SPARTEN_KEYS, migrate, normalizeGeraet, type KundenansichtTeil, type Sparte } from '../../core/model.ts';
import { demoDaten, beispielAnzahl, beispielEinfuegen, beispielEntfernen, beispielBestand, bestandAnzahl, bestandEinfuegen, bestandEntfernen, beispielSicher } from '../../demo.ts';
import { PLATZHALTER } from '../../core/textgen.ts';
import { validateEnvelope } from '../../core/crypto.ts';
import * as store from '../../storage/store.ts';
import * as db from '../../storage/db.ts';
import * as fotos from '../../storage/fotos.ts';
import { fotoStatistik, fotosAelterAls, groesseText } from '../../core/fotos.ts';
import * as theme from '../theme.ts';
import * as bio from '../../storage/biometrie.ts';
import { KeyRing } from '../../core/crypto.ts';
import { MAILPROGRAMME, gemerktesMailprogramm, mailprogrammMerken } from '../kontakt.ts';
import { maskottchen, toast, download, dateiWaehlen, dialog, bestaetigen, teilenOderSpeichern } from '../dom.ts';
import * as hilfe from '../hilfe.ts';
import * as kontaktseite from '../kontaktseite.ts';
import * as feldverwaltung from '../feldverwaltung.ts';
import * as bausteinverwaltung from '../bausteinverwaltung.ts';
import { KALENDER_ANSICHTEN } from '../kalender.ts';
import { einstellungenPaket, einstellungenAusPaket, geraeteWahl } from '../../core/einstellungsdatei.ts';

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
      <div class="knopfreihe"><button type="button" class="btn primary" data-tour-start>🧭 Rund-Tour starten</button><a class="btn" href="#/hilfe">📖 Hilfe öffnen</a><a class="btn ghost" href="#/hilfe?thema=installieren">📲 App installieren</a></div>
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
      <h2>Kalender</h2>
      <label>Kalender startet mit<select id="kalenderStart">
        ${KALENDER_ANSICHTEN.map(([k, l]) => `<option value="${k}" ${e.kalenderStart === k ? 'selected' : ''}>${l}</option>`).join('')}
      </select></label>
    </section>

    <section class="karte-box">
      <h2>Navigation</h2>
      <label>„Hinfahren“ öffnet<select id="kartenApp">
        ${[['auto', 'Automatisch (Apple Karten auf iPhone/iPad, sonst Google Maps)'], ['apple', 'Apple Karten'], ['google', 'Google Maps'], ['waze', 'Waze']].map(([k, v]) => `<option value="${k}" ${e.kartenApp === k ? 'selected' : ''}>${v}</option>`).join('')}
      </select></label>
      <p class="hinweis">Eine Web-App kann die in iOS gewählte Standard-Navigations-App nicht direkt aufrufen. Wähle hier die App, mit der du fährst; Google Maps und Waze öffnen sich, wenn sie installiert sind, sonst im Browser.</p>
    </section>

    ${feldverwaltung.html(e.felder)}

    ${bausteinverwaltung.html(e.bausteine)}

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
        ${SPARTEN_KEYS.map((s) => `<label>Empfänger für ${esc(SPARTEN[s].label)}-Texte (${esc(SPARTEN[s].anbieter)})<input data-empf="${s}" type="email" value="${esc(e.empfaenger[s])}" placeholder="z. B. team@…" autocomplete="off"></label>`).join('')}
      </div>
      <p class="hinweis">Die Empfänger werden beim „Per E-Mail senden“ im Texte-Tab vorausgefüllt. Die Mail geht erst raus, wenn du sie im Mailprogramm abschickst.</p>
    </section>

    <section class="karte-box">
      <h2>Textvorlagen</h2>
      <p class="hinweis">Platzhalter: ${PLATZHALTER.map((p) => `<code>{{${p}}}</code>`).join(' ')}. Jede Vorlage bekommt nur die Daten ihres eigenen Bereichs.</p>
      ${SPARTEN_KEYS.map((s) => `<label>${esc(SPARTEN[s].label)} (${esc(SPARTEN[s].anbieter)})<textarea data-vorlage="${s}" rows="10">${esc(e.vorlagen[s])}</textarea></label>`).join('')}
      <button class="btn ghost" id="vReset">Vorlagen zurücksetzen</button>
    </section>

    <section class="karte-box ${demo ? 'aus' : ''}">
      <h2>Datensicherung ${hilfe.knopf('sicherung')}</h2>
      <p class="hinweis">Die Sicherungsdatei ist mit deinem Master-Passwort verschlüsselt. <b>iCloud:</b> „In iCloud / Dateien sichern“ tippen, im Teilen-Menü „In Dateien sichern“ wählen und den Ordner in iCloud Drive aussuchen. <b>Zwischen Geräten wechseln:</b> auf dem einen Gerät sichern, auf dem anderen „Neueren Stand holen“. Übernommen wird nur, was neuer ist.</p>
      <p id="letzteSicherung" class="hinweis"></p>
      <div class="knopfreihe">
        <button class="btn primary" id="icloud" ${demo ? 'disabled' : ''}>☁️ In iCloud / Dateien sichern</button>
        <button class="btn" id="abgleichHolen" ${demo ? 'disabled' : ''}>☁️ Neueren Stand holen</button>
        <button class="btn ghost" id="backup" ${demo ? 'disabled' : ''}>Sicherung herunterladen</button>
        <button class="btn ghost" id="import" ${demo ? 'disabled' : ''}>Sicherung einspielen</button>
      </div>
      <label class="check"><input type="checkbox" id="abgleichFragen" ${demo ? 'disabled' : ''}> Beim Start fragen, ob ein neuerer Stand aus iCloud geholt werden soll</label>
      <h3>Einstellungen übertragen</h3>
      <p class="hinweis">Nur die Einstellungen, ohne Kunden: Vorlagen, Empfänger, Textbausteine, Felder, Kalender, Navigation, Kundenansicht, Farbschema und Mailprogramm. So richtest du alles einmal ein (z. B. auf dem iPad) und spielst es auf iPhone oder Laptop ein. Die Datei ist mit deinem Master-Passwort verschlüsselt. Die volle Sicherung oben enthält die Einstellungen ohnehin mit.</p>
      <div class="knopfreihe">
        <button class="btn ghost" id="einstExport" ${demo ? 'disabled' : ''}>⚙️ Einstellungen sichern</button>
        <button class="btn ghost" id="einstImport" ${demo ? 'disabled' : ''}>Einstellungen einlesen</button>
      </div>
      <h3>Automatische Versionen auf diesem Gerät</h3>
      <ul class="liste" id="historie"><li class="hinweis">${demo ? 'Im Demo-Modus nicht verfügbar.' : 'Wird geladen …'}</li></ul>
    </section>

    <section class="karte-box" id="fotoEinstellungen">
      <h2>📷 Kundenfotos</h2>
      <p id="fotoStatistik"></p>
      <label class="check"><input type="checkbox" id="fotosMitsichern" ${e.fotosMitsichern !== false ? 'checked' : ''}> Fotos in die iCloud-Sicherung aufnehmen (für den Wechsel zwischen iPad und iPhone)</label>
      <h3>Alte Fotos löschen</h3>
      <p class="hinweis">Damit der Speicher nicht vollläuft: Fotos löschen, die älter sind als …</p>
      <div class="knopfreihe">
        <select id="fotoAlter" aria-label="Alter der Fotos">
          <option value="90">3 Monate</option><option value="182">6 Monate</option><option value="365" selected>1 Jahr</option><option value="730">2 Jahre</option><option value="1095">3 Jahre</option>
        </select>
        <button type="button" class="btn ghost" id="fotosAltLoeschen">Löschen …</button>
      </div>
      <p class="hinweis" id="fotoAlterInfo"></p>
    </section>

    <section class="karte-box ${demo ? 'aus' : ''}">
      <h2>Sicherheit</h2>
      <p><button class="btn primary" id="jetztSperren">🔒 Jetzt sperren</button></p>
      <p class="hinweis" id="bioInfo"></p>
      <div class="knopfreihe">
        <button class="btn ghost" id="bio" hidden>Face ID einrichten</button>
        <button class="btn ghost" id="pw" ${demo ? 'disabled' : ''}>Master-Passwort ändern</button>
        <button class="btn danger" id="reset" ${demo ? 'disabled' : ''}>Alle Daten auf diesem Gerät löschen</button>
      </div>
    </section>

    <section class="karte-box">
      <h2>Datenschutz</h2>
      <p class="hinweis">Sperling speichert alle Kundendaten ausschließlich verschlüsselt auf diesem Gerät und – falls eingerichtet – als verschlüsselte Sicherungsdatei, die du selbst in iCloud Drive ablegst. Es gibt keinen Sperling-Server. Für Kartenbilder werden Kartenausschnitte bei Esri bzw. OpenStreetMap geladen, für Adressvorschläge werden Koordinaten bzw. Adressen an OpenStreetMap Nominatim gesendet – niemals Namen oder Notizen. Produktbilder in der Produktübersicht kommen direkt von den Hersteller-Websites (ohne Angaben über Kunden). Kunden können auf Wunsch jederzeit vollständig gelöscht werden (Kunde öffnen → Kunde löschen).</p>
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
      await store.mutate((d) => beispielSicher(d, (k) => beispielEinfuegen(k, beispiel)));
      toast('Beispielkunden geladen – siehe Kunden', 'ok');
      render(el);
    } catch (err) { toast(`Laden fehlgeschlagen: ${(err as Error).message}`, 'error'); }
  });
  el.querySelector('#bestandLaden').addEventListener('click', async () => {
    try {
      const geraete = beispielBestand().map(normalizeGeraet);
      await store.mutate((d) => beispielSicher(d, (k) => bestandEinfuegen(k, geraete)));
      toast('Beispielbestand geladen – siehe Bestand', 'ok');
      render(el);
    } catch (err) { toast(`Laden fehlgeschlagen: ${(err as Error).message}`, 'error'); }
  });
  el.querySelector('#bestandWeg').addEventListener('click', async () => {
    if (!(await bestaetigen('Beispielbestand entfernen?', 'Die Beispielgeräte werden aus dem Bestand gelöscht. Geräte, die schon verliehen oder reserviert sind, bleiben erhalten.', 'Entfernen'))) return;
    try {
      await store.mutate((d) => beispielSicher(d, (k) => bestandEntfernen(k)));
      toast(bestandAnzahl(store.getData()) ? 'Entfernt – verliehene oder reservierte Beispielgeräte bleiben erhalten' : 'Beispielbestand entfernt', 'ok', 5000);
      render(el);
    } catch (err) { toast(`Entfernen fehlgeschlagen: ${(err as Error).message}`, 'error'); }
  });
  el.querySelector('#beispielWeg').addEventListener('click', async () => {
    if (!(await bestaetigen('Beispielkunden entfernen?', 'Alle Beispielkunden samt ihrer Notizen, Termine und Beispielgeräte werden gelöscht. Echte Kunden bleiben unberührt.', 'Entfernen'))) return;
    try {
      await store.mutate((d) => beispielSicher(d, (k) => beispielEntfernen(k)));
      toast('Beispielkunden entfernt', 'ok');
      render(el);
    } catch (err) { toast(`Entfernen fehlgeschlagen: ${(err as Error).message}`, 'error'); }
  });
  kontaktseite.binden(el);
  // Kundenfotos: Größe, mitsichern, alte löschen
  const fotoAnzeige = () => {
    const st = fotoStatistik(store.getData());
    const p = el.querySelector('#fotoStatistik');
    if (p) p.textContent = st.anzahl ? `${st.anzahl} Foto${st.anzahl === 1 ? '' : 's'} bei ${st.kunden} Kunde${st.kunden === 1 ? '' : 'n'}, zusammen etwa ${groesseText(st.bytes)}.` : 'Noch keine Kundenfotos.';
    const tage = Number(el.querySelector<HTMLSelectElement>('#fotoAlter')?.value || 365);
    const alt = fotosAelterAls(store.getData(), tage);
    const i = el.querySelector('#fotoAlterInfo');
    if (i) i.textContent = alt.length ? `Betrifft ${alt.length} Foto${alt.length === 1 ? '' : 's'} (${groesseText(alt.reduce((n, x) => n + x.bytes, 0))}).` : 'Keine Fotos in diesem Alter.';
    const b = el.querySelector<HTMLButtonElement>('#fotosAltLoeschen');
    if (b) b.disabled = !alt.length;
  };
  fotoAnzeige();
  el.querySelector('#fotoAlter')?.addEventListener('change', fotoAnzeige);
  el.querySelector('#fotosMitsichern')?.addEventListener('change', (ev) => {
    const an = (ev.target as HTMLInputElement).checked;
    store.mutate((d) => { d.einstellungen.fotosMitsichern = an; });
    toast(an ? 'Fotos kommen mit in die Sicherung.' : 'Sicherungen ohne Fotos: die Fotos bleiben nur auf diesem Gerät.', 'ok', 4000);
  });
  el.querySelector('#fotosAltLoeschen')?.addEventListener('click', async () => {
    const sel = el.querySelector<HTMLSelectElement>('#fotoAlter')!;
    const alt = fotosAelterAls(store.getData(), Number(sel.value));
    if (!alt.length) return;
    if (!(await bestaetigen('Alte Fotos löschen?', `${alt.length} Foto${alt.length === 1 ? '' : 's'} älter als ${sel.selectedOptions[0]!.textContent} werden endgültig gelöscht. Notizen und Kundendaten bleiben.`, 'Endgültig löschen'))) return;
    const weg = new Set(alt.map((x) => x.fotoId));
    store.mutate((d) => { for (const k of d.kunden) if (k.fotos.some((f) => weg.has(f.id))) k.fotos = k.fotos.filter((f) => !weg.has(f.id)); });
    await fotos.loeschen([...weg]).catch(() => {});
    toast(`${weg.size} Foto${weg.size === 1 ? '' : 's'} gelöscht`, 'ok');
    fotoAnzeige();
  });
  el.querySelector('#hilfeKnoepfe')?.addEventListener('change', (ev) => { hilfe.vorliebeSetzen({ knoepfe: (ev.target as HTMLInputElement).checked }); toast('Gespeichert', 'ok'); });
  el.querySelector('#kalenderStart').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.kalenderStart = (ev.target as HTMLSelectElement).value as typeof d.einstellungen.kalenderStart; }));
  el.querySelector('#kartenApp').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.kartenApp = (ev.target as HTMLInputElement).value; }));
  feldverwaltung.verdrahten(el, () => { const y = scrollY; render(el); scrollTo(0, y); });
  bausteinverwaltung.verdrahten(el, () => { const y = scrollY; render(el); scrollTo(0, y); });
  el.querySelector('#kaEinstellungen').addEventListener('change', (ev) => {
    const c = (ev.target as Element).closest<HTMLInputElement>('[data-ka]');
    if (c) speichere((d) => { d.einstellungen.kundenansicht[c.dataset.ka as KundenansichtTeil] = c.checked; });
  });
  el.querySelector('#mailprogramm').addEventListener('change', (ev) => { mailprogrammMerken((ev.target as HTMLInputElement).value); toast('Gespeichert', 'ok'); });
  el.querySelectorAll<HTMLInputElement>('[data-empf]').forEach((i) => i.addEventListener('change', () => speichere((d) => { d.einstellungen.empfaenger[i.dataset.empf as Sparte] = i.value.trim(); })));
  el.querySelector('#absender').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.absender = (ev.target as HTMLInputElement).value; }));
  el.querySelector('#autoSperre').addEventListener('change', (ev) => {
    const n = parseNumber((ev.target as HTMLInputElement).value);
    if (n === null || n < 0 || n > 240) { toast('Bitte 0 bis 240 eingeben.', 'error'); return; }
    speichere((d) => { d.einstellungen.autoSperreMin = Math.round(n); });
  });
  el.querySelectorAll<HTMLTextAreaElement>('[data-vorlage]').forEach((t) => t.addEventListener('change', () => {
    const s = t.dataset.vorlage as Sparte;
    speichere((d) => { d.einstellungen.vorlagen[s] = t.value || DEFAULT_VORLAGEN[s]; });
  }));
  el.querySelector('#vReset').addEventListener('click', async () => {
    if (!(await bestaetigen('Vorlagen zurücksetzen?', 'Eigene Änderungen an allen drei Vorlagen gehen verloren.', 'Zurücksetzen'))) return;
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
  const merken = () => db.setMeta('letzteSicherung', new Date().toISOString()).then(() => db.setMeta('abgleichStand', store.getStand())).then(letzteZeigen).catch(() => {});
  el.querySelector('#backup').addEventListener('click', async () => {
    try {
      const { text } = await fotos.sicherungsDatei();
      download(sicherungsName(), text, 'application/json');
      merken();
    } catch (err) { toast(`Sicherung fehlgeschlagen: ${(err as Error).message}`, 'error'); }
  });
  // iCloud: Safari erlaubt das Teilen-Menü nur direkt nach einem Tipp. Deshalb erst die
  // Datei vorbereiten, dann ein zweiter Tipp auf „Jetzt sichern“ öffnet das Teilen-Menü.
  el.querySelector('#abgleichHolen')?.addEventListener('click', async () => { if (await abgleich.holen()) render(el); });
  const fragen = el.querySelector<HTMLInputElement>('#abgleichFragen');
  db.getMeta<boolean>('abgleichAus').then((aus) => { if (fragen) fragen.checked = aus !== true; }).catch(() => { if (fragen) fragen.checked = true; });
  fragen?.addEventListener('change', () => { db.setMeta('abgleichAus', !fragen.checked).catch(() => {}); toast(fragen.checked ? 'Sperling fragt beim Start.' : 'Sperling fragt beim Start nicht mehr.', 'ok'); });
  el.querySelector('#icloud').addEventListener('click', async () => { await abgleich.sichern(letzteZeigen); });
  // Sperren auch dort, wo die Menüleiste keinen Sperr-Knopf hat (iPhone, iPad hochkant)
  el.querySelector('#jetztSperren')?.addEventListener('click', () => document.getElementById('sperren')?.click());
  el.querySelector('#einstExport').addEventListener('click', async () => {
    let inhalt;
    try {
      const paket = einstellungenPaket(store.getData().einstellungen, { farbschema: theme.lesen(), mailprogramm: gemerktesMailprogramm() });
      inhalt = JSON.stringify(await store.verschluesseln(paket));
    } catch (err) { toast(`Einstellungen sichern fehlgeschlagen: ${(err as Error).message}`, 'error'); return; }
    const name = `sperling-einstellungen-${new Date().toISOString().slice(0, 10)}.sperling`;
    // Safari öffnet das Teilen-Menü nur direkt nach einem Tipp, deshalb zweiter Tipp im Dialog
    await dialog({
      titel: 'Einstellungen sichern',
      html: `<p>Die verschlüsselte Datei <b>${esc(name)}</b> ist bereit.</p><p class="hinweis">Zum Beispiel „In Dateien sichern“ → iCloud Drive wählen. Auf dem anderen Gerät dann „Einstellungen einlesen“.</p>`,
      knoepfe: [{ label: 'Jetzt sichern', primaer: true, wert: null }],
      onOpen: (dlg) => {
        dlg.querySelectorAll('.dlg-actions button')[1]?.addEventListener('click', async (ev) => {
          ev.preventDefault();
          const r = await teilenOderSpeichern(name, inhalt, 'application/json');
          if (r === 'abgebrochen') { toast('Abgebrochen – nichts gesichert.', 'error'); return; }
          toast(r === 'geteilt' ? 'Einstellungen übergeben' : 'Einstellungen heruntergeladen', 'ok', 4000);
          dlg.close();
        });
      },
    });
  });
  el.querySelector('#einstImport').addEventListener('click', async () => {
    const txt = await dateiWaehlen();
    if (!txt) return;
    let env;
    try { env = JSON.parse(txt); validateEnvelope(env); } catch (err) { toast((err as Error).message || 'Ungültige Datei.', 'error'); return; }
    const pw = await dialog({
      titel: 'Einstellungen einlesen',
      html: `<p>Deine Einstellungen auf diesem Gerät werden durch die aus der Datei ersetzt. Kunden, Termine und Geräte bleiben unverändert.</p>
             <label>Master-Passwort des Geräts, auf dem die Datei erstellt wurde<input type="password" name="pw" autocomplete="current-password" required></label>`,
      knoepfe: [{ label: 'Einlesen', primaer: true, wert: (dlg) => dlg.querySelector('[name=pw]').value }],
    });
    if (!pw) return;
    try {
      const paket = await new KeyRing(pw).decrypt(env);
      const neu = einstellungenAusPaket(paket, store.getData().einstellungen);
      store.mutate((d) => { d.einstellungen = neu; });
      const g = geraeteWahl(paket, { farbschema: Object.keys(theme.SCHEMATA), mailprogramm: Object.keys(MAILPROGRAMME) });
      if (g.farbschema) theme.setzen(g.farbschema);
      if (g.mailprogramm) mailprogrammMerken(g.mailprogramm);
      toast('Einstellungen übernommen', 'ok');
      render(el);
    } catch (err) { toast((err as Error).message, 'error'); }
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
    try { await store.adoptEnvelope(env, pw); await db.setMeta('abgleichStand', store.getStand()).catch(() => {}); toast('Sicherung eingespielt', 'ok'); render(el); } catch (err) { toast((err as Error).message, 'error'); }
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
