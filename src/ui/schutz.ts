// Sperling – Beratungs-Schutz: Ein Tipp blendet alle anderen Kunden aus, solange ein Kunde mit aufs Tablet schaut.
// Einschalten mit einem Tipp, Ausschalten nur mit Master-Passwort oder Face ID (in der Demo ohne).
// Die Sicht filtert store.getData(); hier sitzen Knopf, Band, Routen-Wächter und die Entsperr-Abfrage.
import { esc } from '../core/util.ts';
import { kundenTitel } from '../core/model.ts';
import { KeyRing, WrongPasswordError } from '../core/crypto.ts';
import * as store from '../storage/store.ts';
import * as db from '../storage/db.ts';
import * as bio from '../storage/biometrie.ts';
import { toast } from './dom.ts';
import { knopf as hilfeKnopf } from './hilfe.ts';

/** Routen, die im Schutz erreichbar sind (alles andere führt zurück zum Kunden). */
const ERLAUBT = [/^\/kunde\/([\w-]+)(\/gespraech)?$/, /^\/gespraech$/, /^\/(termine|kalender)$/, /^\/bestand$/, /^\/belegung$/, /^\/hilfe$/, /^\/produkte$/];

export const aktiv = () => !!store.schutzKunde();
store.subscribe((d) => { if (!d) document.body.classList.remove('schutz-aktiv'); });

/** Kunde aus der aktuellen Adresse (#/kunde/ID…) oder ?kunde=ID. */
function kundeAusAdresse(): string | null {
  const h = location.hash.replace(/^#/, '');
  const m = h.match(/^\/kunde\/([\w-]+)/);
  if (m) return m[1]!;
  const q = new URLSearchParams(h.split('?')[1] || '').get('kunde');
  return q || null;
}

/** Wächter für den Router: gibt eine Umleitung zurück oder null. */
export function umleitung(pfad: string): string | null {
  const id = store.schutzKunde();
  if (!id) return null;
  const m = ERLAUBT.map((r) => pfad.match(r)).find(Boolean);
  if (!m) return `#/kunde/${id}`;
  if (m[1] && m[1] !== id) return `#/kunde/${id}`;
  return null;
}

export function einschalten() {
  const id = kundeAusAdresse();
  const k = id ? store.findKunde(id) : null;
  if (!k) { toast('Öffne zuerst den Kunden, den du gerade berätst. Dann blendet 🛡 alle anderen aus.', 'error', 5000); return; }
  store.schutzSetzen(k.id);
  zeigen();
  toast(`Nur noch ${kundenTitel(k)} sichtbar`, 'ok');
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export async function ausschalten() {
  if (!aktiv()) return;
  if (!(await entsperren())) return;
  store.schutzSetzen(null);
  zeigen();
  toast('Alle Kunden wieder sichtbar', 'ok');
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Knopf, Band und Navigation an den Zustand anpassen. */
export function zeigen() {
  const id = store.schutzKunde();
  const k = id ? store.findKunde(id) : null;
  document.body.classList.toggle('schutz-aktiv', !!k);
  const knopf = document.querySelector<HTMLButtonElement>('#schutzKnopf');
  if (knopf) {
    // Nur zeigen, wenn es nutzbar ist: Schutz an oder ein Kunde geöffnet
    const offen = kundeAusAdresse();
    knopf.hidden = !k && !(offen && store.findKunde(offen));
    knopf.classList.toggle('an', !!k);
    knopf.setAttribute('aria-pressed', String(!!k));
    knopf.title = k ? 'Beratungs-Schutz an – Aufheben mit Passwort oder Face ID' : 'Beratungs-Schutz: nur diesen Kunden zeigen';
  }
  const band = document.querySelector<HTMLElement>('#schutzBand');
  if (band) {
    band.hidden = !k;
    band.innerHTML = k ? `<span class="schutz-text">🛡 Nur <b>${esc(kundenTitel(k))}</b></span><button type="button" id="schutzAus">Aufheben</button>${hilfeKnopf('schutz')}` : '';
    band.querySelector('#schutzAus')?.addEventListener('click', ausschalten);
  }
}

export function verdrahten() {
  document.querySelector('#schutzKnopf')?.addEventListener('click', () => (aktiv() ? ausschalten() : einschalten()));
  window.addEventListener('hashchange', () => zeigen());
  zeigen();
}

/** Master-Passwort oder Face ID abfragen. true = bestätigt. */
async function entsperren(): Promise<boolean> {
  if (store.isDemo()) { toast('Demo: In der echten App fragt Sperling hier nach Passwort oder Face ID.', 'ok', 4000); return true; }
  if (document.querySelector('.schutz-sperre')) return false;
  const mitBio = await bio.eingerichtet();
  return new Promise((fertig) => {
    const box = document.createElement('form');
    box.className = 'ka-sperre schutz-sperre karte-box';
    box.innerHTML = `<p><b>Beratungs-Schutz aufheben</b></p>
      <label>Master-Passwort<input type="password" name="pw" autocomplete="current-password"></label>
      <div class="knopfreihe"><button class="btn primary">Aufheben</button>${mitBio ? `<button type="button" class="btn ghost" data-bio>${esc(bio.bezeichnung())}</button>` : ''}<button type="button" class="btn ghost" data-abbr>Schutz lassen</button></div>`;
    document.body.appendChild(box);
    const ende = (ok: boolean) => { box.remove(); fertig(ok); };
    box.querySelector<HTMLInputElement>('[name=pw]').focus();
    box.querySelector('[data-abbr]').addEventListener('click', () => ende(false));
    box.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const env = await db.loadEnvelope();
        if (!env) throw new Error('Kein Datenbestand.');
        await new KeyRing(box.querySelector<HTMLInputElement>('[name=pw]').value).decrypt(env);
        ende(true);
      } catch (err) { toast(err instanceof WrongPasswordError ? 'Falsches Passwort.' : ((err as Error).message || 'Fehler'), 'error'); }
    });
    box.querySelector('[data-bio]')?.addEventListener('click', async () => {
      try { await bio.passwortHolen(); ende(true); } catch (err) { toast(bio.fehlerText(err), 'error'); }
    });
  });
}
