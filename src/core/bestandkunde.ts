// Sperling – Aus der Kundenansicht verleihen oder verkaufen: Geräteauswahl für einen Kunden
// und das Buchen eines Verkaufs. Rein, ohne DOM, in Node testbar.
import { offenerVerleih, neueNotiz, STATUS_KEYS, type Daten, type Geraet, type Kunde, type Leihvorgang, type Reservierung, type StatusKey } from './model.ts';
import { tagVon, type Tag } from './belegung.ts';

export type GeraeteLage = 'reserviert' | 'frei' | 'beimKunden' | 'verliehen' | 'fremdReserviert';

export interface GeraetFuerKunde {
  g: Geraet;
  lage: GeraeteLage;
  /** Reservierung dieses Kunden für das Gerät (nächste) */
  reservierung: Reservierung | null;
  /** offener Verleih (an diesen oder einen anderen Kunden) */
  verleih: Leihvorgang | null;
  /** Reservierungen anderer Kunden, die heute oder später liegen */
  fremde: Reservierung[];
}

const RANG: Record<GeraeteLage, number> = { reserviert: 0, beimKunden: 1, frei: 2, fremdReserviert: 3, verliehen: 4 };

/**
 * Aktive Geräte aus Sicht eines Kunden, sortiert: für ihn reserviert, bei ihm verliehen, frei,
 * später für andere reserviert, gerade bei jemand anderem.
 */
export function geraeteFuerKunde(data: Daten, kundeId: string, heute: Tag = tagVon(new Date())): GeraetFuerKunde[] {
  return data.geraete.filter((g) => g.aktiv).map((g) => {
    const verleih = offenerVerleih(data, g.id);
    const res = (data.reservierungen || []).filter((r) => r.geraetId === g.id && tagVon(r.bis) >= heute).sort((a, b) => (a.von < b.von ? -1 : 1));
    const eigene = res.find((r) => r.kundeId === kundeId) || null;
    const fremde = res.filter((r) => r.kundeId !== kundeId);
    const heuteFremd = fremde.some((r) => tagVon(r.von) <= heute);
    let lage: GeraeteLage;
    if (verleih) lage = verleih.kundeId === kundeId ? 'beimKunden' : 'verliehen';
    else if (eigene) lage = 'reserviert';
    else if (heuteFremd) lage = 'verliehen'; // heute für jemand anderen reserviert: nicht verfügbar
    else lage = fremde.length ? 'fremdReserviert' : 'frei';
    return { g, lage, reservierung: eigene, verleih, fremde };
  }).sort((a, b) => RANG[a.lage] - RANG[b.lage] || a.g.name.localeCompare(b.g.name, 'de'));
}

/** Darf das Gerät jetzt an diesen Kunden verliehen werden? */
export const verleihbar = (x: GeraetFuerKunde) => x.lage === 'reserviert' || x.lage === 'frei' || x.lage === 'fremdReserviert';
/** Darf das Gerät an diesen Kunden verkauft werden? (auch wenn er es gerade geliehen hat) */
export const verkaufbar = (x: GeraetFuerKunde) => x.lage !== 'verliehen';

export interface VerkaufEingabe { kundeId: string; datum: string; preis: number | null; notiz: string; statusSetzen: boolean }

const euro = (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** Vorwerk-Status nur anheben, nie absenken. */
export function vorwerkStatusAnheben(k: Kunde, ziel: StatusKey) {
  const rang = ['unbekannt', 'kein_interesse', 'potenzial', 'interesse', 'termin', 'angebot', 'abschluss'];
  if (!STATUS_KEYS.includes(ziel)) return;
  if (rang.indexOf(ziel) > rang.indexOf(k.status.vorwerk)) k.status.vorwerk = ziel;
}

/**
 * Verkauf buchen: Gerät verlässt den aktiven Bestand (bleibt für den Verlauf), `verkauf` hält Kunde,
 * Datum, Preis. Ein offener Verleih an diesen Kunden wird als „gekauft“ abgeschlossen. Reservierungen
 * des Geräts ab dem Verkaufstag werden entfernt (Rückgabe: die entfernten). Nachfrage-Erinnerungen
 * zum Gerät werden erledigt. Wirft bei unbekanntem/inaktivem Gerät oder Verleih an andere.
 */
export function verkaufBuchen(data: Daten, geraetId: string, e: VerkaufEingabe, jetzt: string): Reservierung[] {
  const g = data.geraete.find((x) => x.id === geraetId);
  if (!g || !g.aktiv) throw new Error('Gerät ist nicht mehr im Bestand.');
  const k = data.kunden.find((x) => x.id === e.kundeId);
  if (!k) throw new Error('Kunde nicht gefunden.');
  const l = offenerVerleih(data, geraetId);
  if (l && l.kundeId !== e.kundeId) throw new Error('Gerät ist gerade an einen anderen Kunden verliehen.');
  const preis = typeof e.preis === 'number' && Number.isFinite(e.preis) && e.preis >= 0 ? Math.round(e.preis * 100) / 100 : null;
  const datum = e.datum || jetzt;
  if (l) {
    l.rueckgabe = datum < l.ausgabe ? l.ausgabe : datum;
    l.kaufinteresse = 'gekauft';
    l.updatedAt = jetzt;
  }
  g.aktiv = false;
  g.verkauf = { kundeId: k.id, datum, preis, notiz: (e.notiz || '').slice(0, 2000) };
  g.updatedAt = jetzt;
  const ab = tagVon(datum);
  const weg = (data.reservierungen || []).filter((r) => r.geraetId === geraetId && tagVon(r.bis) >= ab);
  data.reservierungen = (data.reservierungen || []).filter((r) => !weg.includes(r));
  for (const t of data.termine) if (!t.erledigt && t.kundeId === k.id && t.titel.startsWith(`Nachfragen: ${g.name}`)) { t.erledigt = true; t.updatedAt = jetzt; }
  if (e.statusSetzen) vorwerkStatusAnheben(k, 'abschluss');
  k.notizen.push(neueNotiz({ text: `Gekauft: ${g.name}${g.seriennummer ? ` (SN ${g.seriennummer})` : ''}${preis !== null ? ` für ${euro(preis)}` : ''}.${e.notiz ? ` ${e.notiz}` : ''}`, sparten: ['vorwerk'], zeitpunkt: datum }));
  k.updatedAt = jetzt;
  return weg;
}

/** Geräte, die dieser Kunde gekauft hat (neueste zuerst). */
export function gekaufteGeraete(data: Daten, kundeId: string): Geraet[] {
  return data.geraete.filter((g) => g.verkauf?.kundeId === kundeId).sort((a, b) => (a.verkauf!.datum < b.verkauf!.datum ? 1 : -1));
}

export { euro };
