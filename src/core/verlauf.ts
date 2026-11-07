// Sperling – Gesprächshistorie eines Kunden als Zeitstrahl (rein, ohne DOM, in Node testbar).
// Alles, was zu einem Gespräch gleichzeitig gespeichert wurde (Notiz, Leitfaden-Ergebnis, Enpal-Doku),
// trägt denselben Zeitstempel und wird zu EINEM Eintrag zusammengefasst.
import { AUSGANG, KONTAKTART, SPARTEN, KAUFINTERESSE, type Daten, type Kunde, type Sparte } from './model.ts';
import { ERGEBNIS } from './einwaende.ts';

export type VerlaufArt = 'gespraech' | 'notiz' | 'termin' | 'verleih';
export interface VerlaufEintrag {
  zeitpunkt: string;
  art: VerlaufArt;
  titel: string;
  /** Textabsätze (Notizen, Ergebnisse, Einwände) */
  zeilen: string[];
  sparten: Sparte[];
  /** Verweise zum Bearbeiten */
  notizIds: string[];
  enpalIds: string[];
  terminId?: string;
  leihId?: string;
  erledigt?: boolean;
  zukunft?: boolean;
}

export function kundenVerlauf(data: Daten, k: Kunde, jetzt = new Date().toISOString()): VerlaufEintrag[] {
  const gruppen = new Map<string, VerlaufEintrag>();
  const holen = (zeitpunkt: string): VerlaufEintrag => {
    let e = gruppen.get(zeitpunkt);
    if (!e) { e = { zeitpunkt, art: 'notiz', titel: 'Notiz', zeilen: [], sparten: [], notizIds: [], enpalIds: [] }; gruppen.set(zeitpunkt, e); }
    return e;
  };
  const freiGezeigt = new Set<string>();
  const sparteDazu = (e: VerlaufEintrag, s: Sparte[]) => { for (const x of s) if (!e.sparten.includes(x)) e.sparten.push(x); };

  for (const g of k.gespraeche) {
    const e = holen(g.zeitpunkt);
    e.art = 'gespraech';
    sparteDazu(e, [g.sparte]);
    const teile = [`${SPARTEN[g.sparte].label}: ${g.ausgang ? AUSGANG[g.ausgang] : 'ohne Ergebnis'}`];
    if (g.einwaende.length) teile.push(g.einwaende.map((x) => `„${x.text}“ → ${ERGEBNIS[x.ergebnis] || x.ergebnis}`).join(' · '));
    if (g.naechsterSchritt) teile.push(`Nächster Schritt: ${g.naechsterSchritt}`);
    e.zeilen.push(teile.join('\n'));
  }
  for (const c of k.enpalKontakte) {
    const e = holen(c.zeitpunkt);
    const schonGespraech = e.art === 'gespraech';
    e.art = 'gespraech';
    e.enpalIds.push(c.id);
    sparteDazu(e, c.themen);
    e.titel = `${KONTAKTART[c.art] || 'Kontakt'}${c.erreicht ? '' : ' (nicht erreicht)'}`;
    // Bei Gesprächen aus dem Leitfaden steht das Ergebnis schon da; sonst Inhalt der Enpal-Doku zeigen
    if (!schonGespraech) {
      const teile = [c.ergebnis ? `Ergebnis: ${AUSGANG[c.ergebnis]}` : '', c.naechsterSchritt ? `Nächster Schritt: ${c.naechsterSchritt}` : '', c.notiz].filter(Boolean);
      if (teile.length) e.zeilen.push(teile.join('\n'));
    }
  }
  for (const n of k.notizen) {
    const e = holen(n.zeitpunkt);
    e.notizIds.push(n.id);
    sparteDazu(e, n.sparten);
    // Notizen aus einem Gespräch: den Freitext zeigen; die Ergebniszeilen stehen schon oben
    if (e.art === 'gespraech') {
      const frei = n.text.split('\n\n').filter((t) => !/^Gespräch |^Ergebnis |^Nächster Schritt/.test(t) && !Object.values(KONTAKTART).some((a) => t.startsWith(a)));
      if (frei.length) { e.zeilen.unshift(frei.join('\n\n')); freiGezeigt.add(e.zeitpunkt); }
    } else {
      e.zeilen.push(n.text);
    }
  }
  // Ältere Leitfaden-Gespräche: Freitext steckt nur im Gespräch selbst
  for (const g of k.gespraeche) {
    const e = gruppen.get(g.zeitpunkt);
    if (e && g.notiz && !freiGezeigt.has(g.zeitpunkt) && !e.zeilen.includes(g.notiz)) e.zeilen.unshift(g.notiz);
  }
  for (const e of gruppen.values()) {
    if (e.art === 'gespraech' && e.titel === 'Notiz') {
      // Leitfaden-/Gesprächs-Notiz ohne Enpal-Doku: Kontaktart steht am Anfang der Notiz
      const n = k.notizen.find((x) => e.notizIds.includes(x.id));
      const art = n ? Object.values(KONTAKTART).find((a) => n.text.startsWith(a)) : '';
      e.titel = art ? `${art}${n!.text.startsWith(`${art} (nicht erreicht)`) ? ' (nicht erreicht)' : ''}` : 'Gespräch';
    }
  }
  const out = [...gruppen.values()];
  for (const t of data.termine) {
    if (t.kundeId !== k.id) continue;
    out.push({
      zeitpunkt: t.beginn, art: 'termin', titel: `${t.art === 'termin' ? 'Termin' : 'Wiedervorlage'}: ${t.titel || 'ohne Titel'}`,
      zeilen: t.notiz ? [t.notiz] : [], sparten: t.sparte ? [t.sparte] : [], notizIds: [], enpalIds: [], terminId: t.id, erledigt: t.erledigt, zukunft: t.beginn > jetzt,
    });
  }
  for (const l of data.leihvorgaenge) {
    if (l.kundeId !== k.id) continue;
    const g = data.geraete.find((x) => x.id === l.geraetId);
    const zeilen = [l.rueckgabe ? `zurück am ${l.rueckgabe.slice(0, 10).split('-').reverse().join('.')}` : 'noch beim Kunden', `Kaufinteresse: ${KAUFINTERESSE[l.kaufinteresse]}`];
    if (l.notiz) zeilen.push(l.notiz);
    out.push({ zeitpunkt: l.ausgabe, art: 'verleih', titel: `Verliehen: ${g?.name || 'Gerät'}`, zeilen: [zeilen.join(' · ')], sparten: ['vorwerk'], notizIds: [], enpalIds: [], leihId: l.id });
  }
  return out.sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? 1 : a.zeitpunkt > b.zeitpunkt ? -1 : 0));
}
