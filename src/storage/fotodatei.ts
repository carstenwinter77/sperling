// Sperling – Fotos in der Sicherungsdatei: verschlüsselte Bytes als Base64 lesen (ohne Entschlüsseln).
import { b64ToBytes } from '../core/crypto.ts';
import type { Rec } from '../core/util.ts';
import type { FotoDatensatz } from './db.ts';

/** Fotos aus einer Sicherungsdatei (Feld „fotos“) in Datensätze wandeln, Kaputtes überspringen. */
export function ausDatei(liste: unknown): FotoDatensatz[] {
  if (!Array.isArray(liste)) return [];
  const out: FotoDatensatz[] = [];
  for (const x of liste as Rec[]) {
    try {
      if (typeof x?.id !== 'string' || !/^[\w-]{1,80}$/.test(x.id) || typeof x.schluessel !== 'string') continue;
      out.push({ id: x.id, schluessel: x.schluessel, iv: b64ToBytes(x.iv).buffer, ct: b64ToBytes(x.ct).buffer, tiv: b64ToBytes(x.tiv).buffer, tct: b64ToBytes(x.tct).buffer });
    } catch { /* kaputter Eintrag: überspringen */ }
  }
  return out;
}
