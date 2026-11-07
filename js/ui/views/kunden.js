// Kundenliste mit Suche und Filter nach Sparte/Status.
import { esc } from '../../core/util.js';
import { SPARTEN, SPARTEN_KEYS, STATUS, kundenTitel, adresseEinzeilig, neuerKunde } from '../../core/model.js';
import { istBeispiel } from '../../demo.js';
import * as store from '../../storage/store.js';
import { maskottchen } from '../dom.js';
import { statusChips, leer } from '../parts.js';

export function filterKunden(kunden, { suche = '', sparte = '', status = '' } = {}) {
  const q = suche.trim().toLowerCase();
  return kunden.filter((k) => {
    if (q) {
      const heu = [k.vorname, k.nachname, k.firma, k.strasse, k.plz, k.ort, k.telefon, k.email].join(' ').toLowerCase();
      if (!heu.includes(q)) return false;
    }
    if (sparte && status) return k.status[sparte] === status;
    if (sparte) return k.status[sparte] !== 'unbekannt' && k.status[sparte] !== 'kein_interesse';
    if (status) return SPARTEN_KEYS.some((s) => k.status[s] === status);
    return true;
  });
}

export function render(el, params) {
  const zustand = { suche: params.get('q') || '', sparte: SPARTEN[params.get('sparte')] ? params.get('sparte') : '', status: STATUS[params.get('status')] ? params.get('status') : '' };

  el.innerHTML = `
    <header class="seitenkopf">
      <h1>${maskottchen('kunde-neu', 'titel-bild')} Kunden</h1>
      <button class="btn primary" id="neu">+ Neuer Kunde</button>
    </header>
    <div class="filterleiste">
      <input type="search" id="suche" placeholder="Name, Adresse, Telefon …" value="${esc(zustand.suche)}" autocomplete="off">
      <select id="sparte"><option value="">Alle Sparten</option>${SPARTEN_KEYS.map((s) => `<option value="${s}" ${s === zustand.sparte ? 'selected' : ''}>${esc(SPARTEN[s].label)}</option>`).join('')}</select>
      <select id="status"><option value="">Jeder Status</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === zustand.status ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select>
    </div>
    <ul class="liste" id="liste"></ul>`;

  const liste = el.querySelector('#liste');
  const zeichnen = () => {
    const alle = store.getData().kunden;
    const treffer = filterKunden(alle, zustand).sort((a, b) => kundenTitel(a).localeCompare(kundenTitel(b), 'de'));
    if (!alle.length) { liste.innerHTML = `<li>${leer('kunde-neu', 'Noch keine Kunden. Lege den ersten an oder setze einen Pin auf der Karte.')}</li>`; return; }
    if (!treffer.length) { liste.innerHTML = '<li class="hinweis">Keine Treffer.</li>'; return; }
    liste.innerHTML = treffer.map((k) => `
      <li><a class="zeile" href="#/kunde/${esc(k.id)}">
        <span class="zeile-haupt"><strong>${esc(kundenTitel(k))}${istBeispiel(k.id) ? ' <span class="tag tag-beispiel">Beispiel</span>' : ''}</strong><small>${esc(kundenName(k) ? adresseEinzeilig(k) : (k.telefon || ''))}</small></span>
        ${statusChips(k)}
      </a></li>`).join('');
  };
  const kundenName = (k) => [k.vorname, k.nachname, k.firma].some(Boolean);
  zeichnen();

  el.querySelector('#suche').addEventListener('input', (e) => { zustand.suche = e.target.value; zeichnen(); });
  el.querySelector('#sparte').addEventListener('change', (e) => { zustand.sparte = e.target.value; zeichnen(); });
  el.querySelector('#status').addEventListener('change', (e) => { zustand.status = e.target.value; zeichnen(); });
  el.querySelector('#neu').addEventListener('click', () => {
    const k = neuerKunde();
    store.mutate((d) => { d.kunden.push(k); });
    location.hash = `#/kunde/${k.id}?neu=1`;
  });
}
