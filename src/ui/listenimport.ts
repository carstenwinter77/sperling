// Sperling – Kunden → „PDF-Liste importieren“: Vorwerk-Kundenliste (digitale PDF) einlesen,
// Vorschau mit Abgleich (neu / geändert / gleich / fehlt), dann übernehmen. pdf.js wird erst beim
// Import geladen und läuft lokal; die PDF verlässt das Gerät nie (R-EXTERN). Nur die Adressen neuer
// Kunden gehen danach – wie bei der Adresssuche – an den Adressdienst, um sie auf die Karte zu setzen.
import { esc } from '../core/util.ts';
import * as li from '../core/listenimport.ts';
import * as store from '../storage/store.ts';
import { koordinateZuAdresse } from '../services/geo.ts';
import { dialog, toast } from './dom.ts';

/** PDF-Datei wählen (binär). */
function pdfWaehlen(): Promise<File | null> {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/pdf,.pdf';
    inp.style.display = 'none';
    inp.addEventListener('change', () => { resolve(inp.files?.[0] || null); inp.remove(); });
    inp.addEventListener('cancel', () => { resolve(null); inp.remove(); });
    document.body.appendChild(inp);
    inp.click();
  });
}

/** Textstücke aller Seiten mit pdf.js (lokal, ohne Netz). */
export async function pdfLesen(daten: ArrayBuffer): Promise<li.TextStueck[][]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const aufgabe = pdfjs.getDocument({ data: new Uint8Array(daten), disableFontFace: true });
  const doc = await aufgabe.promise;
  const seiten: li.TextStueck[][] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 200); i++) {
    const seite = await doc.getPage(i);
    const inhalt = await seite.getTextContent();
    seiten.push(inhalt.items.filter((x) => 'str' in x).map((x) => {
      const t = x as { str: string; transform: number[]; width: number };
      return { str: t.str, x: t.transform[4] ?? 0, y: t.transform[5] ?? 0, w: t.width };
    }));
  }
  await aufgabe.destroy();
  return seiten;
}

const ART_TEXT: Record<li.AbgleichArt, string> = { neu: 'Neu', geaendert: 'Geändert', gleich: 'Unverändert' };

function vorschauHtml(a: li.Abgleich, dateiname: string): string {
  const zahl = (art: li.AbgleichArt) => a.posten.filter((p) => p.art === art).length;
  const zeile = (p: li.AbgleichPosten, i: number) => {
    const e = p.eintrag;
    return `<tr class="li-${p.art}">
      <td>${p.art === 'gleich' ? '' : `<input type="checkbox" data-li="${i}" checked aria-label="Übernehmen">`}</td>
      <td><span class="chip li-art">${ART_TEXT[p.art]}</span></td>
      <td><b>${esc([e.vorname, e.nachname].filter(Boolean).join(' '))}</b><br><small>${esc([e.strasse, [e.plz, e.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '))}</small></td>
      <td>${esc(e.telefon)}</td>
      <td><small>${li.LISTEN_FELDER.map((f) => (e.werte[f.id] ? `${esc(f.label)}: ${esc(e.werte[f.id]!)}` : '')).filter(Boolean).join('<br>')}${e.notiz ? `<br>Notiz: ${esc(e.notiz)}` : ''}${p.aenderungen.length ? `<br><i>geändert: ${esc(p.aenderungen.join(', '))}</i>` : ''}</small></td>
    </tr>`;
  };
  return `
    <p><b>${esc(dateiname)}</b>: ${a.posten.length} Kunden erkannt${a.zusammengefasst ? `, ${a.zusammengefasst} doppelte Zeile(n) zusammengeführt` : ''}.</p>
    <p class="li-summe"><span class="chip li-neu">${zahl('neu')} neu</span> <span class="chip li-geaendert">${zahl('geaendert')} geändert</span> <span class="chip li-gleich">${zahl('gleich')} unverändert</span>${a.fehlen.length ? ` <span class="chip li-fehlt">${a.fehlen.length} nicht mehr in der Liste</span>` : ''}</p>
    <p class="hinweis">Neue Kunden bekommen Vorwerk „Potenzial“. Sperre, EWE, EWE-Belegdatum und BNW werden unverändert in eigene Vorwerk-Felder übernommen, Notizen als Vorwerk-Notiz. Es wird nichts gelöscht. Häkchen weg = diesen Eintrag nicht übernehmen.</p>
    ${a.fehlen.length ? `<details><summary>Nicht mehr in der Liste (${a.fehlen.length})</summary><p class="hinweis">Diese Kunden stammen aus einer früheren Liste. Sie bleiben unverändert.</p><ul>${a.fehlen.map((f) => `<li>${esc(f.titel)}</li>`).join('')}</ul></details>` : ''}
    <div class="li-tabelle-rahmen"><table class="li-tabelle">
      <thead><tr><th></th><th>Abgleich</th><th>Kunde</th><th>Telefon</th><th>Listenwerte und Notiz</th></tr></thead>
      <tbody>${a.posten.map(zeile).join('')}</tbody>
    </table></div>`;
}

/** Standorte neuer Kunden nacheinander suchen (nur Adresse, gedrosselt), im Hintergrund. */
async function standorteSuchen(ids: string[]) {
  let gefunden = 0;
  for (const id of ids) {
    const k = store.findKunde(id);
    if (!k || k.lat !== null || !k.ort) continue;
    try {
      const p = await koordinateZuAdresse([k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '));
      if (p && store.isUnlocked()) { store.mutate((d) => { const x = d.kunden.find((y) => y.id === id); if (x && x.lat === null) { x.lat = p.lat; x.lng = p.lng; } }); gefunden++; }
    } catch { break; } // offline: später über die Kartei
  }
  if (ids.length) toast(`${gefunden} von ${ids.length} neuen Kunden auf der Karte eingetragen`, gefunden ? 'ok' : 'info', 5000);
}

/** Ganzer Ablauf. `fertig` wird nach dem Übernehmen aufgerufen (Liste neu zeichnen). */
export async function importieren(fertig: () => void) {
  const datei = await pdfWaehlen();
  if (!datei) return;
  if (datei.size > 30 * 1024 * 1024) { toast('Die PDF ist zu groß (über 30 MB).', 'error'); return; }
  let abgleich: li.Abgleich;
  try {
    toast('PDF wird gelesen …', 'info', 2000);
    const seiten = await pdfLesen(await datei.arrayBuffer());
    const { zeilen, kopf } = li.zeilenAusSeiten(seiten);
    if (!kopf) { toast('Keine Kopfzeile mit Name, Straße, PLZ, Ort … gefunden. Ist es eine digitale PDF (kein Scan)?', 'error', 7000); return; }
    const eintraege = zeilen.map(li.eintragAusZeile).filter((x): x is li.ListenEintrag => !!x);
    if (!eintraege.length) { toast('In der PDF wurden keine Kunden gefunden.', 'error'); return; }
    abgleich = li.abgleichen(store.getData(), eintraege);
  } catch (err) {
    console.error(err);
    toast(`PDF konnte nicht gelesen werden: ${(err as Error).message}`, 'error', 6000);
    return;
  }
  const auswahl = await dialog<Set<number>>({
    titel: 'Vorwerk-Liste importieren',
    html: vorschauHtml(abgleich, datei.name),
    knoepfe: [{ label: 'Übernehmen', primaer: true, wert: (dlg) => new Set([...dlg.querySelectorAll<HTMLInputElement>('[data-li]')].filter((c) => c.checked).map((c) => Number(c.dataset.li))) }],
    onOpen: (dlg) => dlg.classList.add('dlg-breit'),
  });
  if (!auswahl) return;
  const vorher = new Set(store.getData().kunden.map((k) => k.id));
  let erg = { neu: 0, geaendert: 0 };
  store.mutate((d) => { erg = li.uebernehmen(d, abgleich, (p) => auswahl.has(abgleich.posten.indexOf(p))); });
  toast(`${erg.neu} neue und ${erg.geaendert} geänderte Kunden übernommen`, 'ok', 5000);
  fertig();
  const neue = store.getData().kunden.filter((k) => !vorher.has(k.id)).map((k) => k.id);
  standorteSuchen(neue).catch(() => {});
}
