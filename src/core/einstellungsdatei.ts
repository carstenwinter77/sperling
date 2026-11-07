// Sperling – Einstellungsdatei: alle Einstellungen (Vorlagen, Empfänger, Textbausteine, Felder,
// Kalender, Navigation, Kundenansicht …) ohne Kundendaten, zum Übertragen auf ein anderes Gerät.
// Die Datei wird wie die Sicherung mit dem Master-Passwort verschlüsselt (R-KRYPTO).
// Nicht enthalten: „zuletzt geöffnet“ (zeigt auf Kunden dieses Geräts).
import { normalizeEinstellungen, SCHEMA_VERSION, type Einstellungen } from './model.ts';
import type { Rec } from './util.ts';

export const EINSTELLUNGEN_ART = 'sperling-einstellungen';

export interface GeraeteWahl { farbschema?: string; mailprogramm?: string }

export interface EinstellungsPaket {
  art: typeof EINSTELLUNGEN_ART;
  schemaVersion: number;
  erstellt: string;
  einstellungen: Rec;
  geraet: GeraeteWahl;
}

/** Inhalt der Einstellungsdatei (vor dem Verschlüsseln). */
export function einstellungenPaket(e: Einstellungen, geraet: GeraeteWahl = {}, erstellt = new Date().toISOString()): EinstellungsPaket {
  const kopie: Rec = JSON.parse(JSON.stringify(e));
  delete kopie.zuletzt;
  return { art: EINSTELLUNGEN_ART, schemaVersion: SCHEMA_VERSION, erstellt, einstellungen: kopie, geraet: { ...geraet } };
}

export const istEinstellungsPaket = (x: unknown): x is EinstellungsPaket =>
  !!x && typeof x === 'object' && (x as Rec).art === EINSTELLUNGEN_ART && !!(x as Rec).einstellungen && typeof (x as Rec).einstellungen === 'object';

/**
 * Einstellungen aus einer (entschlüsselten) Datei übernehmen. Alles wird normalisiert wie beim Laden,
 * ältere Dateien werden dabei angehoben. „Zuletzt geöffnet“ bleibt vom aktuellen Gerät.
 */
export function einstellungenAusPaket(paket: unknown, aktuell: Einstellungen): Einstellungen {
  if (!istEinstellungsPaket(paket)) throw new Error('Das ist keine Sperling-Einstellungsdatei.');
  return normalizeEinstellungen({ ...paket.einstellungen, zuletzt: aktuell.zuletzt });
}

/** Gerätewahl (Farbschema, Mailprogramm) nur mit bekannten Werten. */
export function geraeteWahl(paket: unknown, erlaubt: { farbschema: string[]; mailprogramm: string[] }): GeraeteWahl {
  const g: Rec = istEinstellungsPaket(paket) && paket.geraet && typeof paket.geraet === 'object' ? paket.geraet : {};
  return {
    farbschema: erlaubt.farbschema.includes(g.farbschema) ? g.farbschema : undefined,
    mailprogramm: erlaubt.mailprogramm.includes(g.mailprogramm) ? g.mailprogramm : undefined,
  };
}
