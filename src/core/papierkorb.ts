// Sperling – Gelöscht (Papierkorb): Gelöschtes bleibt, bis es einzeln endgültig gelöscht wird (R-LOESCH).
// Reine Datenfunktionen, werden innerhalb von store.mutate() aufgerufen.
import { uid, nowIso, clone } from './util.ts';
import { kundenTitel, normalizeKunde, normalizeNotiz, normalizeEnpalKontakt, normalizeTermin, type Daten, type PapierkorbEintrag } from './model.ts';
import { normalizeAnsprechpartner } from './vertrieb.ts';

type Bezug = NonNullable<PapierkorbEintrag['bezug']>;

function ablegen(data: Daten, typ: PapierkorbEintrag['typ'], objekt: object, kundeId = '', bezug: Bezug | null = null) {
  data.papierkorb ||= [];
  data.papierkorb.unshift({ id: uid(), typ, objekt: clone(objekt) as PapierkorbEintrag['objekt'], kundeId, geloeschtAm: nowIso(), bezug });
}

/** Kunde löschen: Kunde in den Papierkorb, Termine/Verleihe/Reservierungen bleiben ohne Bezug (merken für Rückholung). */
export function kundeLoeschen(data: Daten, kundeId: string): boolean {
  const k = data.kunden.find((x) => x.id === kundeId);
  if (!k) return false;
  const bezug: Bezug = { termine: [], leihvorgaenge: [], reservierungen: [], geraete: [], material: [] };
  for (const t of data.termine) if (t.kundeId === kundeId) { t.kundeId = ''; bezug.termine.push(t.id); }
  for (const l of data.leihvorgaenge) if (l.kundeId === kundeId) { l.kundeId = ''; bezug.leihvorgaenge.push(l.id); }
  for (const r of data.reservierungen || []) if (r.kundeId === kundeId) { r.kundeId = ''; bezug.reservierungen.push(r.id); }
  for (const g of data.geraete) if (g.verkauf?.kundeId === kundeId) { g.verkauf.kundeId = ''; bezug.geraete.push(g.id); }
  for (const m of data.material || []) for (const b of m.buchungen) if (b.kundeId === kundeId) { b.kundeId = ''; bezug.material.push(b.id); }
  data.kunden = data.kunden.filter((x) => x.id !== kundeId);
  ablegen(data, 'kunde', k, kundeId, bezug);
  return true;
}

export function notizLoeschen(data: Daten, kundeId: string, notizId: string): boolean {
  const k = data.kunden.find((x) => x.id === kundeId);
  const n = k?.notizen.find((x) => x.id === notizId);
  if (!k || !n) return false;
  k.notizen = k.notizen.filter((x) => x.id !== notizId);
  k.updatedAt = nowIso();
  ablegen(data, 'notiz', n, kundeId);
  return true;
}

export function enpalKontaktLoeschen(data: Daten, kundeId: string, kontaktId: string): boolean {
  const k = data.kunden.find((x) => x.id === kundeId);
  const c = k?.enpalKontakte.find((x) => x.id === kontaktId);
  if (!k || !c) return false;
  k.enpalKontakte = k.enpalKontakte.filter((x) => x.id !== kontaktId);
  k.updatedAt = nowIso();
  ablegen(data, 'enpalKontakt', c, kundeId);
  return true;
}

export function ansprechpartnerLoeschen(data: Daten, kundeId: string, apId: string): boolean {
  const k = data.kunden.find((x) => x.id === kundeId);
  const a = k?.ansprechpartner.find((x) => x.id === apId);
  if (!k || !a) return false;
  k.ansprechpartner = k.ansprechpartner.filter((x) => x.id !== apId);
  k.updatedAt = nowIso();
  ablegen(data, 'ansprechpartner', a, kundeId);
  return true;
}

export function terminLoeschen(data: Daten, terminId: string): boolean {
  const t = data.termine.find((x) => x.id === terminId);
  if (!t) return false;
  data.termine = data.termine.filter((x) => x.id !== terminId);
  ablegen(data, 'termin', t, t.kundeId);
  return true;
}

/**
 * Wiederherstellen. Gibt eine Meldung zurück (für die Anzeige) oder wirft mit verständlichem Text.
 */
export function wiederherstellen(data: Daten, eintragId: string): string {
  const e = (data.papierkorb || []).find((x) => x.id === eintragId);
  if (!e) throw new Error('Eintrag nicht mehr im Papierkorb.');
  const o = clone(e.objekt);
  if (e.typ === 'kunde') {
    if (data.kunden.some((x) => x.id === o.id)) o.id = uid(); // sehr unwahrscheinlich, aber nie doppelt
    data.kunden.push(normalizeKunde(o));
    const b: Partial<Bezug> = e.bezug || {};
    // Nur Einträge wieder verknüpfen, die inzwischen keinem anderen Kunden zugeordnet wurden
    for (const t of data.termine) if ((b.termine || []).includes(t.id) && !t.kundeId) t.kundeId = o.id;
    for (const l of data.leihvorgaenge) if ((b.leihvorgaenge || []).includes(l.id) && !l.kundeId) l.kundeId = o.id;
    for (const r of data.reservierungen || []) if ((b.reservierungen || []).includes(r.id) && !r.kundeId) r.kundeId = o.id;
    for (const g of data.geraete) if ((b.geraete || []).includes(g.id) && g.verkauf && !g.verkauf.kundeId) g.verkauf.kundeId = o.id;
    for (const m of data.material || []) for (const x of m.buchungen) if ((b.material || []).includes(x.id) && !x.kundeId) x.kundeId = o.id;
  } else if (e.typ === 'notiz' || e.typ === 'enpalKontakt') {
    const k = data.kunden.find((x) => x.id === e.kundeId);
    if (!k) throw new Error('Der Kunde dazu ist gelöscht. Bitte zuerst den Kunden wiederherstellen.');
    if (e.typ === 'notiz' ? k.notizen.some((x) => x.id === o.id) : k.enpalKontakte.some((x) => x.id === o.id)) o.id = uid();
    if (e.typ === 'notiz') k.notizen.push(normalizeNotiz(o)); else k.enpalKontakte.push(normalizeEnpalKontakt(o));
    k.updatedAt = nowIso();
  } else if (e.typ === 'ansprechpartner') {
    const k = data.kunden.find((x) => x.id === e.kundeId);
    if (!k) throw new Error('Der Kunde dazu ist gelöscht. Bitte zuerst den Kunden wiederherstellen.');
    if (k.ansprechpartner.some((x) => x.id === o.id)) o.id = uid();
    k.ansprechpartner.push(normalizeAnsprechpartner(o));
    k.updatedAt = nowIso();
  } else if (e.typ === 'termin') {
    if (o.kundeId && !data.kunden.some((x) => x.id === o.kundeId)) o.kundeId = '';
    if (data.termine.some((x) => x.id === o.id)) o.id = uid();
    data.termine.push(normalizeTermin(o));
  } else {
    throw new Error('Unbekannter Eintrag.');
  }
  data.papierkorb = data.papierkorb.filter((x) => x.id !== eintragId);
  return 'Wiederhergestellt';
}

export function endgueltigLoeschen(data: Daten, eintragId: string): void {
  data.papierkorb = (data.papierkorb || []).filter((x) => x.id !== eintragId);
}

export function leeren(data: Daten): void {
  data.papierkorb = [];
}

/** Kurztitel für die Liste. */
export function eintragTitel(e: PapierkorbEintrag, data: Daten): { art: string; text: string } {
  const o = e.objekt || {};
  const kunde = e.kundeId ? data.kunden.find((k) => k.id === e.kundeId) : null;
  const zu = kunde ? ` – ${kundenTitel(kunde)}` : '';
  if (e.typ === 'kunde') return { art: 'Kunde', text: kundenTitel(o) };
  if (e.typ === 'notiz') return { art: 'Notiz', text: `${String(o.text || '').slice(0, 80)}${zu}` };
  if (e.typ === 'enpalKontakt') return { art: 'Enpal-Doku', text: `${o.art === 'hausbesuch' ? 'Hausbesuch' : 'Telefonat'}${zu}` };
  if (e.typ === 'termin') return { art: 'Termin', text: `${o.titel || 'Termin'}${zu}` };
  if (e.typ === 'ansprechpartner') return { art: 'Ansprechpartner', text: `${o.name || 'ohne Namen'}${zu}` };
  return { art: e.typ, text: '' };
}
