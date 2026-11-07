// Sperling – Abgleich über iCloud Drive: beim Start eine Leiste „Neueren Stand holen?“, Datei wählen,
// nur Neueres übernehmen (bei Änderungen auf beiden Seiten nachfragen). Und „In iCloud sichern“ mit
// zwei Tipps (Safari öffnet das Teilen-Menü nur direkt nach einem Tipp).
import { esc, formatDateTime } from '../core/util.ts';
import { validateEnvelope, WrongPasswordError } from '../core/crypto.ts';
import { abgleichUrteil, beimStartFragen } from '../core/abgleich.ts';
import * as store from '../storage/store.ts';
import * as db from '../storage/db.ts';
import { dialog, toast, dateiWaehlen, teilenOderSpeichern } from './dom.ts';

let gefragt = false;

export const sicherungsName = () => `sperling-sicherung-${new Date().toISOString().slice(0, 10)}.sperling`;

/** Nach dem Entsperren: Leiste zeigen (einmal je Sitzung, abschaltbar in Einstellungen → Datensicherung). */
export async function beimStart() {
  let aus = false;
  try { aus = (await db.getMeta<boolean>('abgleichAus')) === true; } catch { /* Standard: fragen */ }
  if (!beimStartFragen({ demo: store.isDemo(), abgeschaltet: aus, schonGefragt: gefragt })) return;
  gefragt = true;
  let letzter: string | null = null;
  try { letzter = (await db.getMeta<string>('abgleichStand')) || null; } catch { /* ohne */ }
  const lokal = store.getStand();
  leisteZeigen(!!lokal && (!letzter || lokal > letzter));
}

function leisteZeigen(hierGeaendert: boolean) {
  if (document.querySelector('#abgleichLeiste')) return;
  const div = document.createElement('div');
  div.id = 'abgleichLeiste';
  div.className = 'abgleich-leiste';
  div.setAttribute('role', 'status');
  div.innerHTML = `<span>☁️ Auf einem anderen Gerät gearbeitet?</span>
    <button type="button" class="btn klein primary" data-abgleich="holen">Neueren Stand aus iCloud holen</button>
    ${hierGeaendert ? '<button type="button" class="btn klein" data-abgleich="sichern">Diesen Stand in iCloud sichern</button>' : ''}
    <button type="button" class="btn klein ghost" data-abgleich="zu" aria-label="Schließen">Nicht jetzt</button>`;
  // im Fluss vor dem Inhalt, damit nichts verdeckt wird
  const main = document.querySelector('#inhalt');
  if (main?.parentElement) main.parentElement.insertBefore(div, main); else document.body.appendChild(div);
  div.addEventListener('click', async (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-abgleich]');
    if (!b) return;
    if (b.dataset.abgleich === 'zu') { div.remove(); return; }
    if (b.dataset.abgleich === 'sichern') { await sichern(() => div.remove()); return; }
    // Dateiauswahl muss direkt im Tipp starten (iOS)
    if (await holen()) div.remove();
  });
}

/** Nach dem Einrichten aus einer Sicherung nicht gleich wieder fragen. */
export function nichtFragen() { gefragt = true; }

/** Ersteinrichtung auf einem weiteren Gerät: Sicherung wählen, bestehendes Passwort, fertig. Gibt das Passwort zurück. */
export async function einrichtenAusDatei(): Promise<string | null> {
  const txt = await dateiWaehlen();
  if (!txt) return null;
  let env: { updatedAt?: string } | null = null;
  try { env = JSON.parse(txt); if (!validateEnvelope(env)) throw new Error(); } catch { toast('Das ist keine Sperling-Sicherung.', 'error'); return null; }
  for (;;) {
    const pw = await dialog<string>({
      titel: 'Vom anderen Gerät übernehmen',
      html: `<p>Sicherung vom <b>${esc(formatDateTime(env!.updatedAt!))}</b>.</p><label>Master-Passwort (wie auf dem anderen Gerät)<input type="password" name="pw" autocomplete="current-password" required></label><p class="hinweis">Ab jetzt gilt dieses Passwort auch auf diesem Gerät.</p>`,
      knoepfe: [{ label: 'Übernehmen', primaer: true, wert: (dlg) => dlg.querySelector<HTMLInputElement>('[name=pw]')!.value }],
    });
    if (!pw) return null;
    try {
      await store.einrichtenAusSicherung(env, pw);
      await db.setMeta('abgleichStand', store.getStand()).catch(() => {});
      gefragt = true;
      toast(`Stand vom ${formatDateTime(env!.updatedAt!)} übernommen`, 'ok', 5000);
      return pw;
    } catch (err) {
      if (err instanceof WrongPasswordError) { toast('Falsches Passwort. Bitte noch einmal.', 'error'); continue; }
      toast((err as Error).message, 'error');
      return null;
    }
  }
}

export function leisteEntfernen() { document.querySelector('#abgleichLeiste')?.remove(); }

/** Datei wählen und, wenn sie neuer ist, übernehmen. true = erledigt (übernommen oder schon aktuell). */
export async function holen(): Promise<boolean> {
  const txt = await dateiWaehlen(); // ohne Filter: iOS graut .sperling sonst aus
  if (!txt) return false;
  let env: { updatedAt?: string } | null = null;
  try { env = JSON.parse(txt); if (!validateEnvelope(env)) throw new Error(); } catch { toast('Das ist keine Sperling-Sicherung.', 'error'); return false; }
  let letzter: string | null = null;
  try { letzter = (await db.getMeta<string>('abgleichStand')) || null; } catch { /* ohne */ }
  await store.flush().catch(() => {});
  const lokal = store.getStand();
  const urteil = abgleichUrteil(env!.updatedAt, lokal, letzter);
  if (urteil === 'ungueltig') { toast('Die Datei hat keinen gültigen Stand.', 'error'); return false; }
  if (urteil === 'gleich' || urteil === 'aelter') {
    toast(urteil === 'gleich' ? 'Schon aktuell: Die Datei hat denselben Stand.' : `Hier ist es schon aktueller. Die Datei ist vom ${formatDateTime(env!.updatedAt!)}, nichts geändert.`, 'ok', 5000);
    return true;
  }
  if (urteil === 'konflikt') {
    const ok = await dialog<boolean>({
      titel: 'Auf beiden Geräten geändert',
      html: `<p>Die Datei ist neuer (${esc(formatDateTime(env!.updatedAt!))}), aber auch hier wurde seit dem letzten Abgleich etwas geändert (${esc(formatDateTime(lokal))}).</p>
        <p>Übernehmen ersetzt den Stand hier. Er bleibt unter Einstellungen → Versionen erhalten und lässt sich zurückholen.</p>`,
      knoepfe: [{ label: 'Datei übernehmen', primaer: true, wert: true }],
    });
    if (!ok) return false;
  }
  try {
    await store.adoptEnvelope(env);
  } catch (err) {
    if (!(err instanceof WrongPasswordError)) { toast((err as Error).message, 'error'); return false; }
    const pw = await dialog<string>({
      titel: 'Passwort der Datei',
      html: '<p>Die Datei wurde mit einem anderen Passwort verschlüsselt.</p><label>Passwort<input type="password" name="pw" autocomplete="current-password" required></label>',
      knoepfe: [{ label: 'Übernehmen', primaer: true, wert: (dlg) => dlg.querySelector<HTMLInputElement>('[name=pw]')!.value }],
    });
    if (!pw) return false;
    try { await store.adoptEnvelope(env, pw); } catch (e2) { toast((e2 as Error).message, 'error'); return false; }
  }
  await db.setMeta('abgleichStand', store.getStand()).catch(() => {});
  toast(`Stand vom ${formatDateTime(env!.updatedAt!)} übernommen`, 'ok', 5000);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  return true;
}

/** „In iCloud sichern“: Datei vorbereiten, zweiter Tipp öffnet das Teilen-Menü. */
export async function sichern(nachher?: () => void): Promise<void> {
  let inhalt: string;
  try { inhalt = JSON.stringify(await store.currentEnvelope()); } catch (err) { toast(`Sicherung fehlgeschlagen: ${(err as Error).message}`, 'error'); return; }
  const name = sicherungsName();
  await dialog({
    titel: 'In iCloud sichern',
    html: `<p>Die verschlüsselte Sicherung <b>${esc(name)}</b> ist bereit.</p><p class="hinweis">Im nächsten Schritt „In Dateien sichern“ wählen, dann „iCloud Drive“ und den Ordner „Sperling“. Eine gleichnamige Datei vom selben Tag ersetzen lassen.</p>`,
    knoepfe: [{ label: 'Jetzt sichern', primaer: true, wert: null }],
    onOpen: (dlg) => {
      dlg.querySelectorAll('.dlg-actions button')[1]?.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const r = await teilenOderSpeichern(name, inhalt, 'application/json');
        if (r === 'abgebrochen') { toast('Abgebrochen – nichts gesichert.', 'error'); return; }
        const jetzt = new Date().toISOString();
        await db.setMeta('letzteSicherung', jetzt).catch(() => {});
        await db.setMeta('abgleichStand', store.getStand()).catch(() => {});
        nachher?.();
        toast(r === 'geteilt' ? 'Sicherung übergeben' : 'Sicherung heruntergeladen (Ordner „Downloads“ bzw. Dateien-App)', 'ok', 5000);
        dlg.close();
      });
    },
  });
}
