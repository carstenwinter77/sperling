// Einstellungen in Bereichen (GRUPPEN): breit links Liste, rechts Inhalt; schmal Übersicht → Unterseite.
// Alle Bereiche werden gezeichnet und nur ein-/ausgeblendet, damit Suche und Verdrahtung überall greifen.
import * as abgleich from '../abgleich.ts';
import { esc, formatDateTime, parseNumber } from '../../core/util.ts';
import { BEREITLEGEN, NACHFASS_TAGE, NACHFASS_MAX, BEREITLEGEN_MAX, normalizeBereitlegen, normalizeNachfassTage, tageListeText } from '../../core/vertrieb.ts';
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
import { symbol } from '../symbole.ts';
import * as kontaktseite from '../kontaktseite.ts';
import * as feldverwaltung from '../feldverwaltung.ts';
import * as bausteinverwaltung from '../bausteinverwaltung.ts';
import { KALENDER_ANSICHTEN } from '../kalender.ts';
import { einstellungenPaket, einstellungenAusPaket, geraeteWahl } from '../../core/einstellungsdatei.ts';

export const APP_VERSION = __APP_VERSION__; // aus package.json (vite.config.ts)

/** „heute“, „gestern“, „vor 5 Tagen“ */
function tageText(iso: string): string {
  const tage = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000));
  return tage <= 0 ? 'heute' : tage === 1 ? 'gestern' : `vor ${tage} Tagen`;
}

/** Bereiche der Einstellungen: links (iPad quer) bzw. als Übersicht (Handy, iPad hochkant). */
export const GRUPPEN = [
  { key: 'allgemein', sym: 'allgemein', titel: 'Allgemein', such: 'absender gruss name farbschema hell dunkel automatisch kalender start ansicht hinfahren navigation karten app apple google waze' },
  { key: 'texte', sym: 'texte', titel: 'Texte & E-Mail', such: 'textvorlagen vorlage platzhalter textbausteine baustein mail e-mail mailprogramm empfaenger gmail outlook' },
  { key: 'vertrieb', sym: 'vertrieb', titel: 'Vertrieb', such: 'nachfassen angebot wiedervorlage tage abstand bereitlegen terminbestaetigung termin bestaetigen sms whatsapp stromrechnung' },
  { key: 'kunden', sym: 'kundendaten', titel: 'Kundendaten', such: 'namen name nachname vorname reihenfolge sortierung sortieren ort strasse ohne namen felder eigene felder feldverwaltung kundenansicht herzeigen fotos kundenfotos speicher' },
  { key: 'sicherung', sym: 'sicherung', titel: 'Sicherung', such: 'sicherung icloud backup datei einspielen wiederherstellen versionen einstellungen uebertragen abgleich geraet wechseln fotos mitsichern' },
  { key: 'sicherheit', sym: 'sicherheit', titel: 'Sicherheit & Datenschutz', such: 'sperren automatisch sperre face id touch id passwort master-passwort datenschutz alles loeschen zuruecksetzen' },
  { key: 'kontaktseite', sym: 'kontaktseite', titel: 'Meine Kontaktseite', such: 'kontaktseite qr code link teilen werbung' },
  { key: 'hilfe', sym: 'hilfe', titel: 'Hilfe', such: 'hilfe fragezeichen knoepfe rund-tour tour anleitung installieren' },
  { key: 'aufraeumen', sym: 'aufraeumen', titel: 'Gelöscht & Beispieldaten', such: 'geloescht papierkorb beispieldaten beispielkunden beispielbestand demo ueben' },
] as const;
type GruppeKey = typeof GRUPPEN[number]['key'];

const NAMENS_FOLGEN: [string, string][] = [['vorname', 'Vorname Nachname'], ['nachname', 'Nachname, Vorname']];
const ORTS_FOLGEN: [string, string][] = [['ort', 'Ort, dann Straße'], ['strasse', 'Straße, dann Ort']];
const KARTEN_APPS: [string, string][] = [['auto', 'Beim ersten Mal fragen'], ['apple', 'Apple Karten'], ['google', 'Google Maps'], ['waze', 'Waze']];
/** Verständliche Namen für die Platzhalter-Knöpfe (die Platzhalter selbst stehen in textgen.ts). */
const PLATZHALTER_NAMEN: Record<string, string> = {
  name: 'Name', vorname: 'Vorname', nachname: 'Nachname', firma: 'Firma', anrede: 'Anrede', adresse: 'Adresse', telefon: 'Telefon', email: 'E-Mail',
  sparten: 'Sparten', status: 'Status', daten: 'Kundendaten', notizen: 'Notizen', datum: 'Datum', absender: 'Absender',
};
const SPERR_MINUTEN = [0, 1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120, 240];

/** Zum Suchen: klein, ohne Akzente/Umlaute-Punkte, ß → ss. */
const such = (s: string) => s.toLowerCase().replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Ein/Aus-Schalter als Zeile: Text links, Schalter rechts. */
const schalter = (id: string, text: string, an: boolean, aus = false, unter = '') => `<label class="schalter-zeile"><span>${text}${unter ? `<small>${unter}</small>` : ''}</span><input type="checkbox" role="switch" class="schalter" id="${id}" ${an ? 'checked' : ''} ${aus ? 'disabled' : ''}></label>`;
/** Längere Erklärungen eingeklappt hinter „ⓘ“. */
const mehr = (titel: string, inhalt: string) => `<details class="mehr-info"><summary>ⓘ ${titel}</summary><div>${inhalt}</div></details>`;

function statusText(key: GruppeKey, demo: boolean): string {
  const d = store.getData();
  const e = d.einstellungen;
  const n = (z: number, ein: string, mehrz: string) => `${z} ${z === 1 ? ein : mehrz}`;
  switch (key) {
    case 'allgemein': return `Farbe: ${theme.SCHEMATA[theme.lesen() as keyof typeof theme.SCHEMATA] || 'Automatisch'} · Kalender: ${(KALENDER_ANSICHTEN.find(([k]) => k === e.kalenderStart) || KALENDER_ANSICHTEN[0])[1]}`;
    case 'texte': {
      const b = SPARTEN_KEYS.reduce((z, s) => z + (e.bausteine?.[s]?.length || 0), 0);
      const m = gemerktesMailprogramm();
      return `3 Vorlagen · ${n(b, 'Baustein', 'Bausteine')} · ${m && m in MAILPROGRAMME ? esc(MAILPROGRAMME[m as keyof typeof MAILPROGRAMME]) : 'Mail: jedes Mal fragen'}`;
    }
    case 'vertrieb': return `Nachfassen: ${e.nachfassTage.length ? `nach ${tageListeText(e.nachfassTage)}` : 'aus'} · Bereitlegen: ${SPARTEN_KEYS.reduce((z, s) => z + e.bereitlegen[s].length, 0)} Punkte`;
    case 'kunden': {
      const st = fotoStatistik(d);
      return `${e.namensFolge === 'nachname' ? 'Nachname, Vorname' : 'Vorname Nachname'} · ${n(e.felder.eigene.length, 'eigenes Feld', 'eigene Felder')} · ${st.anzahl ? `${n(st.anzahl, 'Foto', 'Fotos')} (${groesseText(st.bytes)})` : 'keine Fotos'}`;
    }
    case 'sicherung': return demo ? 'Im Demo-Modus aus' : 'Wird geprüft …';
    case 'sicherheit': return demo ? 'Im Demo-Modus eingeschränkt' : (e.autoSperreMin ? `Sperrt nach ${e.autoSperreMin} Min.` : 'Sperrt nicht automatisch');
    case 'kontaktseite': return 'Link und QR-Code für Kunden';
    case 'hilfe': return `?-Knöpfe ${hilfe.vorlieben().knoepfe ? 'an' : 'aus'} · Rund-Tour · Installieren`;
    case 'aufraeumen': {
      const g = (d.papierkorb || []).length;
      const bsp = demo ? 0 : beispielAnzahl(d);
      return `${g ? `${g} gelöscht` : 'Nichts gelöscht'}${bsp ? ` · ${n(bsp, 'Beispielkunde', 'Beispielkunden')}` : ''}`;
    }
  }
}

function inhalt(key: GruppeKey, demo: boolean): string {
  const d = store.getData();
  const e = d.einstellungen;
  const aus = demo ? 'disabled' : '';
  switch (key) {
    case 'allgemein': return `
    <section class="karte-box">
      <div class="formgrid einst-felder">
        <label class="breit">Absender (Gruß unter Texten)<input id="absender" value="${esc(e.absender)}" placeholder="z. B. Jan Sperling"></label>
        <div class="breit einst-feld"><span class="einst-label">Farbschema</span>
          <div class="segment farbschema-wahl" role="group" aria-label="Farbschema">
            ${Object.entries(theme.SCHEMATA).map(([k, v]) => `<button type="button" data-schema="${k}" class="${theme.lesen() === k ? 'aktiv' : ''}">${v}</button>`).join('')}
          </div>
          <small class="hinweis">„Automatisch“ folgt der Einstellung des Geräts.</small></div>
        <label>Kalender startet mit<select id="kalenderStart">
          ${KALENDER_ANSICHTEN.map(([k, l]) => `<option value="${k}" ${e.kalenderStart === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select></label>
        <label class="breit">„Hinfahren“ öffnet<select id="kartenApp">
          ${KARTEN_APPS.map(([k, v]) => `<option value="${k}" ${e.kartenApp === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select></label>
      </div>
      ${mehr('Warum nicht die Standard-App von iOS?', '<p class="hinweis">Eine Web-App kann die in iOS gewählte Standard-Navigations-App nicht direkt aufrufen. Wähle hier die App, mit der du fährst; Google Maps und Waze öffnen sich, wenn sie installiert sind, sonst im Browser.</p>')}
    </section>`;

    case 'texte': return `
    <section class="karte-box">
      <h2>E-Mail</h2>
      <div class="formgrid">
        <label class="breit">Mailprogramm auf diesem Gerät<select id="mailprogramm">
          <option value="">Jedes Mal fragen</option>
          ${Object.entries(MAILPROGRAMME).map(([k, v]) => `<option value="${k}" ${gemerktesMailprogramm() === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
        </select></label>
        ${SPARTEN_KEYS.map((s) => `<label>Empfänger ${esc(SPARTEN[s].label)} (${esc(SPARTEN[s].anbieter)})<input data-empf="${s}" type="email" value="${esc(e.empfaenger[s])}" placeholder="z. B. team@…" autocomplete="off"></label>`).join('')}
      </div>
      ${mehr('Wofür sind die Empfänger?', '<p class="hinweis">Sie werden beim „Per E-Mail senden“ im Texte-Tab vorausgefüllt. Die Mail geht erst raus, wenn du sie im Mailprogramm abschickst.</p>')}
    </section>
    <section class="karte-box" id="vorlagenEinstellungen">
      <h2>Textvorlagen</h2>
      ${SPARTEN_KEYS.map((s) => `<details class="felder-kat einst-vorlage" data-vorlage-bereich="${s}"><summary><b>${esc(SPARTEN[s].label)}</b> <small>${esc(SPARTEN[s].anbieter)}${e.vorlagen[s] !== DEFAULT_VORLAGEN[s] ? ' · angepasst' : ''}</small></summary>
        <textarea data-vorlage="${s}" rows="10" aria-label="Vorlage ${esc(SPARTEN[s].label)}">${esc(e.vorlagen[s])}</textarea>
        <p class="hinweis ph-titel">Einfügen an der Schreibmarke:</p>
        <div class="ph-leiste" role="group" aria-label="Platzhalter einfügen">${PLATZHALTER.map((p) => `<button type="button" class="ph-knopf" data-ph="${p}" data-ph-ziel="${s}" title="fügt {{${p}}} ein">+ ${esc(PLATZHALTER_NAMEN[p] || p)}</button>`).join('')}</div></details>`).join('')}
      ${mehr('Was sind Platzhalter?', '<p class="hinweis">Platzhalter wie <code>{{vorname}}</code> ersetzt Sperling beim Erstellen des Textes durch die Angaben des Kunden. Tippe in die Vorlage an die gewünschte Stelle und dann auf einen Knopf. Jede Vorlage bekommt nur die Daten ihres eigenen Bereichs.</p>')}
      <div class="knopfreihe"><button type="button" class="btn ghost" id="vReset">Vorlagen zurücksetzen</button></div>
    </section>
    ${bausteinverwaltung.html(e.bausteine)}`;

    case 'vertrieb': return `
    <section class="karte-box" id="nachfassEinstellungen">
      <h2>Angebote nachfassen</h2>
      <p class="hinweis">Beim Erfassen eines Angebots legt Sperling an diesen Tagen danach eine Wiedervorlage an (10 Uhr). Ohne Tage wird nichts angelegt.</p>
      <div class="nf-tage" role="list">${e.nachfassTage.map((n) => `<span class="nf-tag" role="listitem">${n} ${n === 1 ? 'Tag' : 'Tage'} <button type="button" class="nf-weg" data-nf-weg="${n}" aria-label="${n} Tage entfernen">×</button></span>`).join('') || '<span class="hinweis">Nachfassen aus</span>'}</div>
      <div class="knopfreihe einst-zeile">
        <input type="number" id="nfNeu" min="1" max="90" step="1" inputmode="numeric" placeholder="Tage" aria-label="Tage nach dem Angebot" ${e.nachfassTage.length >= NACHFASS_MAX ? 'disabled' : ''}>
        <button type="button" class="btn ghost" id="nfDazu" ${e.nachfassTage.length >= NACHFASS_MAX ? 'disabled' : ''}>+ Hinzufügen</button>
        ${e.nachfassTage.join() !== NACHFASS_TAGE.join() ? `<button type="button" class="btn ghost" id="nfReset">Zurück auf ${tageListeText(NACHFASS_TAGE)}</button>` : ''}
      </div>
      ${mehr('Gilt das auch für schon erfasste Angebote?', `<p class="hinweis">Nein. Die Abstände gelten für neue Angebote. Schon angelegte Wiedervorlagen bleiben im Kalender und lassen sich dort verschieben oder löschen. Höchstens ${NACHFASS_MAX} Abstände, je 1 bis 90 Tage.</p>`)}
    </section>
    <section class="karte-box" id="bereitlegenEinstellungen">
      <h2>Termin bestätigen: „Bitte bereitlegen“</h2>
      <p class="hinweis">Diese Punkte stehen in der Terminbestätigung an den Kunden und lassen sich dort einzeln abwählen. Ein Punkt pro Zeile, höchstens ${BEREITLEGEN_MAX}.</p>
      ${SPARTEN_KEYS.map((s) => `<details class="felder-kat einst-vorlage" data-bl-bereich="${s}"><summary><b>${esc(SPARTEN[s].label)}</b> <small>${e.bereitlegen[s].length} Punkte${e.bereitlegen[s].join('\n') !== BEREITLEGEN[s].join('\n') ? ' · angepasst' : ''}</small></summary>
        <textarea data-bereitlegen="${s}" rows="5" aria-label="Bitte bereitlegen ${esc(SPARTEN[s].label)}">${esc(e.bereitlegen[s].join('\n'))}</textarea></details>`).join('')}
      <div class="knopfreihe"><button type="button" class="btn ghost" id="blReset">Listen zurücksetzen</button></div>
    </section>`;

    case 'kunden': return `
    <section class="karte-box" id="namenEinstellungen">
      <h2>Namen in Listen</h2>
      <div class="formgrid einst-felder">
        <label>Namen anzeigen als<select id="namensFolge">
          ${NAMENS_FOLGEN.map(([k, l]) => `<option value="${k}" ${e.namensFolge === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select></label>
        <label>Einträge ohne Namen<select id="ortsFolge">
          ${ORTS_FOLGEN.map(([k, l]) => `<option value="${k}" ${e.ortsFolge === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select></label>
      </div>
      ${mehr('Wie wird sortiert?', '<p class="hinweis">„Name A–Z“ in der Kundenliste sortiert immer nach dem Nachnamen, dann nach dem Vornamen. Steht nur ein Vorname oder nur eine Firma da, zählt diese wie ein Nachname. Einträge ohne Namen (z. B. ein Pin auf der Karte) stehen alphabetisch dazwischen, je nach Wahl mit dem Ort (dann Straße) oder der Straße (dann Ort) wie ein Name. Texte für Enpal, GALVANY und Vorwerk sowie Leihscheine schreiben den Namen immer als „Vorname Nachname“.</p>')}
    </section>
    ${feldverwaltung.html(e.felder)}
    <section class="karte-box" id="kaEinstellungen">
      <h2>Kundenansicht zum Herzeigen ${hilfe.knopf('kundenansicht')}</h2>
      <p class="hinweis">Was der Kunde sieht, wenn du ihm das Tablet gibst. Andere Kunden und Einwände sind dort nie zu sehen.</p>
      <div class="ka-wahl">${Object.entries(KUNDENANSICHT_TEILE).map(([k, v]) => `<label class="check"><input type="checkbox" data-ka="${k}" ${e.kundenansicht[k as KundenansichtTeil] ? 'checked' : ''}> ${esc(v.label)}</label>`).join('')}</div>
    </section>
    <section class="karte-box" id="fotoEinstellungen">
      <h2>📷 Kundenfotos</h2>
      <p id="fotoStatistik"></p>
      <h3>Alte Fotos löschen</h3>
      <div class="knopfreihe einst-zeile">
        <select id="fotoAlter" aria-label="Alter der Fotos">
          <option value="90">älter als 3 Monate</option><option value="182">älter als 6 Monate</option><option value="365" selected>älter als 1 Jahr</option><option value="730">älter als 2 Jahre</option><option value="1095">älter als 3 Jahre</option>
        </select>
        <button type="button" class="btn ghost" id="fotosAltLoeschen">Löschen …</button>
      </div>
      <p class="hinweis" id="fotoAlterInfo"></p>
      <p class="hinweis">Ob Fotos in die iCloud-Sicherung kommen, stellst du unter <a href="#/einstellungen?bereich=sicherung">Sicherung</a> ein.</p>
    </section>`;

    case 'sicherung': return `
    <p id="letzteSicherung" class="einst-stand"></p>
    <section class="karte-box ${demo ? 'aus' : ''}">
      <h2>Zwischen iPad und iPhone ${hilfe.knopf('sicherung')}</h2>
      <div class="knopfreihe">
        <button type="button" class="btn primary" id="icloud" ${aus}>☁️ In iCloud sichern</button>
        <button type="button" class="btn" id="abgleichHolen" ${aus}>☁️ Neueren Stand holen</button>
      </div>
      <div class="schalter-liste">
        ${schalter('abgleichFragen', 'Beim Start nach neuerem Stand fragen', false, demo)}
        ${schalter('fotosMitsichern', 'Fotos mitsichern', e.fotosMitsichern !== false, false, 'Für den Wechsel zwischen iPad und iPhone')}
      </div>
      ${mehr('So funktioniert’s', '<p class="hinweis">Die Sicherungsdatei ist mit deinem Master-Passwort verschlüsselt. „In iCloud sichern“ tippen, im Teilen-Menü „In Dateien sichern“ wählen und den Ordner in iCloud Drive aussuchen. Zum Gerätewechsel auf dem einen Gerät sichern, auf dem anderen „Neueren Stand holen“. Übernommen wird nur, was neuer ist.</p>')}
    </section>
    <section class="karte-box ${demo ? 'aus' : ''}">
      <h2>Als Datei</h2>
      <div class="knopfreihe">
        <button type="button" class="btn" id="backup" ${aus}>Sicherung herunterladen</button>
        <button type="button" class="btn ghost" id="import" ${aus}>Sicherung einspielen</button>
      </div>
    </section>
    <section class="karte-box ${demo ? 'aus' : ''}">
      <details class="felder-kat">
        <summary><b>Nur Einstellungen übertragen</b> <small>ohne Kunden, z. B. aufs iPhone</small></summary>
        <p class="hinweis">Vorlagen, Empfänger, Textbausteine, Felder, Kalender, Navigation, Kundenansicht, Farbschema und Mailprogramm. Einmal einrichten (z. B. auf dem iPad) und auf iPhone oder Laptop einspielen. Die Datei ist mit deinem Master-Passwort verschlüsselt; die volle Sicherung enthält die Einstellungen ohnehin mit.</p>
        <div class="knopfreihe">
          <button type="button" class="btn ghost" id="einstExport" ${aus}>⚙️ Einstellungen sichern</button>
          <button type="button" class="btn ghost" id="einstImport" ${aus}>Einstellungen einlesen</button>
        </div>
      </details>
      <details class="felder-kat" id="versionenBox">
        <summary><b>Automatische Versionen</b> <small id="versionenAnzahl">auf diesem Gerät</small></summary>
        <ul class="liste" id="historie"><li class="hinweis">${demo ? 'Im Demo-Modus nicht verfügbar.' : 'Wird geladen …'}</li></ul>
      </details>
    </section>`;

    case 'sicherheit': return `
    <section class="karte-box ${demo ? 'aus' : ''}">
      <div class="knopfreihe" style="margin-top:0"><button type="button" class="btn primary" id="jetztSperren">🔒 Jetzt sperren</button></div>
      <div class="schalter-liste">
        <label class="schalter-zeile"><span>Automatisch sperren nach</span><select id="autoSperre" class="einst-kurz">
          ${[...new Set([...SPERR_MINUTEN, e.autoSperreMin])].sort((x, y) => x - y).map((m) => `<option value="${m}" ${m === e.autoSperreMin ? 'selected' : ''}>${m === 0 ? 'Nie' : `${m} Minute${m === 1 ? '' : 'n'}`}</option>`).join('')}
        </select></label>
        <div class="schalter-zeile"><span>Face ID / Touch ID<small id="bioInfo"></small></span><button type="button" class="btn ghost" id="bio" hidden>Face ID einrichten</button></div>
        <div class="schalter-zeile"><span>Master-Passwort</span><button type="button" class="btn ghost" id="pw" ${aus}>Ändern …</button></div>
      </div>
    </section>
    <section class="karte-box">
      <h2>Datenschutz</h2>
      <p class="hinweis">Alle Kundendaten liegen nur verschlüsselt auf diesem Gerät. Es gibt keinen Sperling-Server.</p>
      ${mehr('Was wohin geht', '<p class="hinweis">Sperling speichert alle Kundendaten ausschließlich verschlüsselt auf diesem Gerät und – falls eingerichtet – als verschlüsselte Sicherungsdatei, die du selbst in iCloud Drive ablegst. Für Kartenbilder werden Kartenausschnitte bei Esri bzw. OpenStreetMap geladen, für Adressvorschläge werden Koordinaten bzw. Adressen an OpenStreetMap Nominatim gesendet – niemals Namen oder Notizen. Produktbilder in der Produktübersicht kommen direkt von den Hersteller-Websites (ohne Angaben über Kunden). Kunden können auf Wunsch jederzeit vollständig gelöscht werden (Kunde öffnen → Kunde löschen).</p>')}
      <p><small>Sperling ${APP_VERSION} · Kartenbibliothek Leaflet (BSD-2)</small></p>
    </section>
    <section class="karte-box gefahrenbereich ${demo ? 'aus' : ''}">
      <h2>Gefahrenbereich</h2>
      <p class="hinweis">Löscht alle Kunden, Notizen, Termine und Versionen auf diesem Gerät. Sicherungsdateien in iCloud Drive bleiben.</p>
      <button type="button" class="btn danger" id="reset" ${aus}>Alle Daten auf diesem Gerät löschen</button>
    </section>`;

    case 'kontaktseite': return kontaktseite.abschnitt();

    case 'hilfe': return `
    <section class="karte-box" id="hilfeEinstellungen">
      <div class="schalter-liste">${schalter('hilfeKnoepfe', '?-Knöpfe mit Kurzhilfe anzeigen', hilfe.vorlieben().knoepfe, false, 'Die Hilfe-Seite bleibt auch ohne ?-Knöpfe erreichbar.')}</div>
      <div class="knopfreihe"><button type="button" class="btn primary" data-tour-start>🧭 Rund-Tour starten</button><a class="btn" href="#/hilfe">📖 Hilfe öffnen</a><a class="btn ghost" href="#/hilfe?thema=installieren">📲 App installieren</a></div>
    </section>`;

    case 'aufraeumen': {
      const bsp = demo ? 0 : beispielAnzahl(d);
      const best = demo ? 0 : bestandAnzahl(d);
      return `
    <section class="karte-box">
      <h2>Gelöscht</h2>
      <p class="hinweis">Gelöschtes geht nie verloren: Es bleibt dort, bis du es einzeln endgültig löschst.</p>
      <a class="btn" href="#/geloescht" id="geloeschtLink">Gelöscht öffnen (${(d.papierkorb || []).length})</a>
    </section>
    <section class="karte-box ${demo ? 'aus' : ''}">
      <h2>Beispieldaten zum Üben</h2>
      <h3>Beispielkunden</h3>
      <p id="beispielInfo" class="hinweis">${demo ? '' : (bsp ? `<b>${bsp} Beispielkunden</b> sind geladen.` : 'Keine Beispielkunden geladen.')}</p>
      <div class="knopfreihe">
        <button type="button" class="btn ghost" id="beispielLaden" ${aus}>Beispielkunden laden</button>
        <button type="button" class="btn danger" id="beispielWeg" ${demo || !bsp ? 'disabled' : ''}>Beispielkunden entfernen</button>
      </div>
      <h3>Beispiel-Vorführbestand (Vorwerk)</h3>
      <p id="bestandInfo" class="hinweis">${demo ? '' : (best ? `<b>${best} Beispielgeräte</b> sind im Bestand.` : 'Kein Beispielbestand geladen.')}</p>
      <div class="knopfreihe">
        <button type="button" class="btn ghost" id="bestandLaden" ${aus}>Beispielbestand laden</button>
        <button type="button" class="btn danger" id="bestandWeg" ${demo || !best ? 'disabled' : ''}>Beispielbestand entfernen</button>
      </div>
      ${mehr('Was wird geladen?', '<p class="hinweis"><b>Beispielkunden:</b> erfundene Kunden mit Notizen, Gesprächen, Enpal-Doku, Terminen und Vorführgeräten – zum Zeigen und Üben. Sie sind mit „Beispiel“ markiert und lassen sich mit einem Tipp wieder vollständig entfernen. Deine echten Kunden bleiben unberührt.</p><p class="hinweis"><b>Beispielbestand:</b> ein typischer Kobold-Vorführbestand (VK7, VR7, SP7, VB100, Polsterboy, Zubehör-Koffer) ohne Kunden – zum Ausprobieren von Verleih, Erinnerung und Kaufinteresse. Erfundene Seriennummern beginnen mit „BSP“.</p>')}
    </section>`;
    }
  }
}

export function render(el: HTMLElement, params?: URLSearchParams) {
  const demo = store.isDemo();
  // Neuzeichnen von innen (ohne params) bleibt im gewählten Bereich
  params ??= new URLSearchParams(location.hash.split('?')[1] || '');
  const gewuenscht = params?.get('bereich') || '';
  const bereich = GRUPPEN.some((g) => g.key === gewuenscht) ? gewuenscht as GruppeKey : null;
  const gewaehlt: GruppeKey = bereich || 'allgemein'; // breite Ansicht zeigt immer einen Bereich
  el.innerHTML = `
    <header class="seitenkopf"><h1>${maskottchen('einstellungen', 'titel-bild')} Einstellungen</h1></header>
    ${demo ? '<p class="hinweis demo-hinweis">Demo-Modus: Änderungen werden nicht gespeichert. Sicherung und Passwort sind hier deaktiviert.</p>' : ''}
    <div class="einst ${bereich ? 'mit-bereich' : ''}">
      <div class="einst-suche"><input type="search" id="einstSuche" placeholder="Einstellung suchen, z. B. „Passwort“" aria-label="Einstellungen durchsuchen" autocomplete="off" enterkeyhint="search"></div>
      <p class="hinweis einst-keine" hidden>Keine passende Einstellung gefunden.</p>
      <nav class="einst-gruppen" aria-label="Bereiche der Einstellungen">
        ${GRUPPEN.map((g) => `<a href="#/einstellungen?bereich=${g.key}" class="einst-gruppe${g.key === gewaehlt ? ' aktiv' : ''}" data-gruppe-link="${g.key}"${g.key === gewaehlt ? ' aria-current="true"' : ''}>
          <span class="eg-sym">${symbol(g.sym)}</span>
          <span class="eg-text"><b>${esc(g.titel)}</b><small data-status="${g.key}">${statusText(g.key, demo)}</small></span>
          <span class="eg-pfeil" aria-hidden="true">›</span></a>`).join('')}
      </nav>
      <div class="einst-inhalt">
        <a class="einst-zurueck" href="#/einstellungen">‹ Alle Einstellungen</a>
        ${GRUPPEN.map((g) => `<div class="einst-bereich" data-gruppe="${g.key}" ${g.key === gewaehlt ? '' : 'hidden'}>
          <h2 class="eb-titel">${symbol(g.sym)} ${esc(g.titel)}</h2>
          ${inhalt(g.key, demo)}
        </div>`).join('')}
      </div>
    </div>`;

  // Bereich wechseln ohne neuen Verlaufseintrag auf breiten Bildschirmen; schmal: normale Unterseite
  el.querySelector('.einst-gruppen')?.addEventListener('click', (ev) => {
    const a = (ev.target as Element).closest<HTMLAnchorElement>('[data-gruppe-link]');
    if (!a || !matchMedia('(min-width: 900px)').matches) return;
    ev.preventDefault();
    const key = a.dataset.gruppeLink!;
    history.replaceState(null, '', `#/einstellungen?bereich=${key}`);
    el.querySelectorAll<HTMLElement>('[data-gruppe-link]').forEach((x) => { const an = x === a; x.classList.toggle('aktiv', an); if (an) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
    el.querySelectorAll<HTMLElement>('.einst-bereich').forEach((b) => { b.hidden = b.dataset.gruppe !== key; });
    el.querySelector('.einst')?.classList.add('mit-bereich');
    el.querySelector('.einst-inhalt')?.scrollIntoView({ block: 'nearest' });
  });

  // Suche über alle Bereiche: zeigt passende Kästen, Bereichstitel bleiben als Orientierung
  const sucheFeld = el.querySelector<HTMLInputElement>('#einstSuche')!;
  sucheFeld.addEventListener('input', () => {
    const woerter = such(sucheFeld.value.trim()).split(/\s+/).filter(Boolean);
    const box = el.querySelector('.einst')!;
    box.classList.toggle('suchend', woerter.length > 0);
    let treffer = 0;
    el.querySelectorAll<HTMLElement>('.einst-bereich').forEach((b) => {
      const g = GRUPPEN.find((x) => x.key === b.dataset.gruppe)!;
      if (!woerter.length) { b.hidden = !(b.dataset.gruppe === (el.querySelector<HTMLElement>('.einst-gruppe.aktiv')?.dataset.gruppeLink || gewaehlt)); b.querySelectorAll<HTMLElement>(':scope > section, :scope > p').forEach((s) => { s.hidden = false; }); return; }
      const gruppeTrifft = woerter.every((w) => such(`${g.titel} ${g.such}`).includes(w));
      let sichtbar = 0;
      b.querySelectorAll<HTMLElement>(':scope > section').forEach((s) => {
        const ja = gruppeTrifft || woerter.every((w) => such(s.textContent || '').includes(w));
        s.hidden = !ja;
        if (ja) sichtbar++;
      });
      b.querySelectorAll<HTMLElement>(':scope > p').forEach((s) => { s.hidden = !gruppeTrifft; });
      b.hidden = !sichtbar;
      b.classList.toggle('vorne', gruppeTrifft); // passender Bereich zuerst
      treffer += sichtbar;
    });
    const keine = el.querySelector<HTMLElement>('.einst-keine');
    if (keine) keine.hidden = !woerter.length || treffer > 0;
  });

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
  // Namensanzeige gilt sofort, auch im Demo-Modus (dort nur bis zum Neuladen)
  el.querySelector('#namensFolge')?.addEventListener('change', (ev) => { const v = (ev.target as HTMLSelectElement).value === 'nachname' ? 'nachname' : 'vorname'; store.mutate((d) => { d.einstellungen.namensFolge = v; }); toast(v === 'nachname' ? 'Namen jetzt als „Nachname, Vorname“' : 'Namen jetzt als „Vorname Nachname“', 'ok'); });
  el.querySelector('#ortsFolge')?.addEventListener('change', (ev) => { const v = (ev.target as HTMLSelectElement).value === 'strasse' ? 'strasse' : 'ort'; store.mutate((d) => { d.einstellungen.ortsFolge = v; }); toast('Gespeichert', 'ok'); });
  el.querySelector('#kartenApp').addEventListener('change', (ev) => speichere((d) => { d.einstellungen.kartenApp = (ev.target as HTMLInputElement).value; }));
  feldverwaltung.verdrahten(el, () => { const y = scrollY; render(el); scrollTo(0, y); });
  bausteinverwaltung.verdrahten(el, () => { const y = scrollY; render(el); scrollTo(0, y); });
  el.querySelector('#kaEinstellungen').addEventListener('change', (ev) => {
    const c = (ev.target as Element).closest<HTMLInputElement>('[data-ka]');
    if (c) speichere((d) => { d.einstellungen.kundenansicht[c.dataset.ka as KundenansichtTeil] = c.checked; });
  });
  // Vertrieb: Nachfass-Abstände und „Bitte bereitlegen“
  const nachfassSetzen = (tage: number[]) => {
    if (demo) { toast('Im Demo-Modus wird nichts gespeichert.', 'info'); return; }
    store.mutate((d) => { d.einstellungen.nachfassTage = normalizeNachfassTage(tage); });
    const y = scrollY; render(el); scrollTo(0, y);
  };
  el.querySelector('#nachfassEinstellungen')?.addEventListener('click', (ev) => {
    const weg = (ev.target as Element).closest<HTMLElement>('[data-nf-weg]');
    if (weg) nachfassSetzen(store.getData().einstellungen.nachfassTage.filter((n) => n !== Number(weg.dataset.nfWeg)));
  });
  const nfDazu = () => {
    const f = el.querySelector<HTMLInputElement>('#nfNeu')!;
    const n = parseNumber(f.value);
    if (n === null || !Number.isInteger(n) || n < 1 || n > 90) { toast('Bitte ganze Tage von 1 bis 90 eingeben.', 'error'); return; }
    if (store.getData().einstellungen.nachfassTage.includes(n)) { toast(`${n} Tage sind schon eingetragen.`, 'info'); return; }
    nachfassSetzen([...store.getData().einstellungen.nachfassTage, n]);
  };
  el.querySelector('#nfDazu')?.addEventListener('click', nfDazu);
  el.querySelector('#nfNeu')?.addEventListener('keydown', (ev) => { if ((ev as KeyboardEvent).key === 'Enter') { ev.preventDefault(); nfDazu(); } });
  el.querySelector('#nfReset')?.addEventListener('click', () => nachfassSetzen([...NACHFASS_TAGE]));
  el.querySelectorAll<HTMLTextAreaElement>('[data-bereitlegen]').forEach((t) => t.addEventListener('change', () => {
    const s = t.dataset.bereitlegen as Sparte;
    speichere((d) => { d.einstellungen.bereitlegen = normalizeBereitlegen({ ...d.einstellungen.bereitlegen, [s]: t.value.split('\n') }); });
    if (!demo) { const n = store.getData().einstellungen.bereitlegen[s].length; toast(`Gespeichert (${n} Punkte)`, 'ok'); }
  }));
  el.querySelector('#blReset')?.addEventListener('click', async () => {
    if (!(await bestaetigen('Listen zurücksetzen?', 'Die „Bitte bereitlegen“-Listen aller Bereiche bekommen wieder die Standardpunkte.', 'Zurücksetzen'))) return;
    speichere((d) => { d.einstellungen.bereitlegen = normalizeBereitlegen({}); });
    const y = scrollY; render(el); scrollTo(0, y);
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
  // Platzhalter-Knöpfe: an der Schreibmarke einfügen, Fokus bleibt in der Vorlage (iPad: Tastatur bleibt offen)
  el.querySelectorAll<HTMLButtonElement>('[data-ph]').forEach((b) => {
    b.addEventListener('pointerdown', (ev) => ev.preventDefault());
    b.addEventListener('click', () => {
      const t = el.querySelector<HTMLTextAreaElement>(`[data-vorlage="${b.dataset.phZiel}"]`);
      if (!t) return;
      const text = `{{${b.dataset.ph}}}`;
      const anfang = t.selectionStart ?? t.value.length;
      const ende = t.selectionEnd ?? anfang;
      t.setRangeText(text, anfang, ende, 'end');
      t.focus();
      t.dispatchEvent(new Event('change')); // speichert wie beim Tippen
    });
  });
  el.querySelector('#vReset').addEventListener('click', async () => {
    if (!(await bestaetigen('Vorlagen zurücksetzen?', 'Eigene Änderungen an allen drei Vorlagen gehen verloren.', 'Zurücksetzen'))) return;
    speichere((d) => { d.einstellungen.vorlagen = { ...DEFAULT_VORLAGEN }; });
    render(el);
  });

  if (demo) return;

  const sicherungsName = () => `sperling-sicherung-${new Date().toISOString().slice(0, 10)}.sperling`;
  const letzteZeigen = () => {
    db.getMeta<string>('letzteSicherung').then((t) => {
      const alt = !t || Date.now() - new Date(t).getTime() > 7 * 24 * 3600 * 1000;
      const p = el.querySelector('#letzteSicherung');
      if (p) { p.textContent = t ? `Letzte Sicherung: ${formatDateTime(t)}` : 'Noch keine Sicherung erstellt.'; p.classList.toggle('warnung', alt); }
      const st = el.querySelector<HTMLElement>('[data-status=sicherung]');
      if (st) { st.textContent = t ? `Letzte Sicherung ${tageText(t)}` : 'Noch keine Sicherung'; st.classList.toggle('warnung', alt); }
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
    const anz = el.querySelector('#versionenAnzahl');
    if (anz) anz.textContent = `${liste.length} ${liste.length === 1 ? 'Stand' : 'Stände'} auf diesem Gerät`;
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
      info.textContent = `Eingeschaltet. Das Master-Passwort funktioniert weiterhin.`;
      const st = el.querySelector('[data-status=sicherheit]');
      if (st && !st.textContent?.includes(name)) st.textContent = `${name} an · ${st.textContent}`;
    } else if (await bio.verfuegbar()) {
      knopf.hidden = false; knopf.textContent = `${name} einrichten`; knopf.dataset.an = '';
      info.textContent = `Statt des Passworts entsperren (iPhone/iPad ab iOS 18, installierte App).`;
    } else {
      knopf.hidden = true;
      info.textContent = 'Auf diesem Gerät bzw. in diesem Browser nicht verfügbar.';
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
