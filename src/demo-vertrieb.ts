// Sperling – Beispieldaten für die Vertriebswerkzeuge (0.13.0): Angebote, Auftragsstand, Ansprechpartner,
// Haustür-Ergebnisse und ein Tag mit mehreren Terminen für die Tagesroute. Frei erfunden.
import type { Rec } from './core/util.ts';

const PREISE: Record<string, [string, number][]> = {
  pv: [['PV 8,2 kWp mit Speicher', 17900], ['PV 10,4 kWp mit Speicher und Wallbox', 23400], ['PV 6,5 kWp ohne Speicher', 11800]],
  wp: [['Luft-Wasser-Wärmepumpe 9 kW', 27600], ['Luft-Wasser-Wärmepumpe 12 kW mit Pufferspeicher', 33900]],
  vorwerk: [['Kobold VK7 mit Polsterboy', 1189], ['Kobold VR7 Saugroboter', 999]],
};
const TAG = (iso: string) => iso.slice(0, 10);

export function vertriebBeispiele(d: Rec, tageAb: (t: number, h?: number, m?: number) => string): void {
  const kunde = (id: string): Rec | undefined => (d.kunden as Rec[]).find((k) => k.id === id);
  const lokalTag = (t: number) => { const x = new Date(tageAb(t, 12)); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

  // Anna Beispiel: PV unterschrieben, Montage geplant
  const k1 = kunde('demo-1');
  if (k1) {
    k1.auftrag = { pv: { schritte: { vertrag: { datum: lokalTag(-14), erledigt: true }, planung: { datum: lokalTag(-5), erledigt: true }, montage: { datum: lokalTag(38), erledigt: false } }, notiz: 'Montageteam meldet sich eine Woche vorher.' } };
    k1.angebote = [{ id: 'a1', sparte: 'pv', titel: 'PV 9,8 kWp mit Speicher und Wallbox', betrag: 21900, datum: tageAb(-18, 17), gueltigBis: tageAb(12, 23), status: 'angenommen', entschieden: tageAb(-14, 17, 30) }];
  }
  // Bernd Muster: zweimal nicht angetroffen
  const k2 = kunde('demo-2');
  if (k2) k2.haustuer = [{ id: 'h1', zeitpunkt: tageAb(-9, 17, 10), ergebnis: 'nicht_da' }, { id: 'h2', zeitpunkt: tageAb(-2, 18, 45), ergebnis: 'nicht_da', notiz: 'Flyer eingeworfen' }];
  // Claudia Probe: Vorwerk gekauft und eingewiesen
  const k3 = kunde('demo-3');
  if (k3) k3.auftrag = { vorwerk: { schritte: { vertrag: { datum: lokalTag(-7), erledigt: true }, lieferung: { datum: lokalTag(-7), erledigt: true }, einweisung: { datum: lokalTag(-7), erledigt: true } }, notiz: '' } };
  // Bäckerei Test: Firma mit drei Ansprechpartnern und offenem PV-Angebot
  const k4 = kunde('demo-4');
  if (k4) {
    k4.ansprechpartner = [
      { id: 'ap1', name: 'Dieter Test', rolle: 'entscheider', funktion: 'Inhaber', telefon: '05302 999888' },
      { id: 'ap2', name: 'Sabine Test', rolle: 'finanzen', funktion: 'Buchhaltung', email: 'buero@example.de', notiz: 'Will Wirtschaftlichkeit schriftlich sehen.' },
      { id: 'ap3', name: 'Uwe Kraus', rolle: 'technik', funktion: 'Haustechnik', telefon: '0171 5554443', notiz: 'Kennt den Zählerschrank, erreichbar ab 6 Uhr.' },
    ];
    k4.angebote = [{ id: 'a2', sparte: 'pv', titel: 'PV 49 kWp Gewerbedach Ost/West mit Speicher', betrag: 61900, datum: tageAb(-3, 9), gueltigBis: tageAb(27, 23), notiz: 'Zwei Varianten: mit und ohne Speicher. Lastgang der Backöfen morgens.' }];
  }
  // Lindenweg 8: später wiederkommen
  const k5 = kunde('demo-5');
  if (k5) k5.haustuer = [{ id: 'h3', zeitpunkt: tageAb(-2, 19, 0), ergebnis: 'spaeter', notiz: 'Tochter öffnet, Eltern ab 18 Uhr da.' }];

  // Gebietskunden: offene Angebote zum Status „Angebot“, Auftragsstand zum Status „Abschluss“
  let i = 0;
  for (const k of d.kunden as Rec[]) {
    if (!/^demo-\d{3}$/.test(k.id)) continue;
    i++;
    for (const s of ['pv', 'wp', 'vorwerk']) {
      const st = k.status?.[s];
      const [titel, betrag] = PREISE[s]![i % PREISE[s]!.length]!;
      if (st === 'angebot') {
        k.angebote = [...(k.angebote || []), { id: `ga${i}${s}`, sparte: s, titel, betrag: betrag + (i % 5) * 300, datum: tageAb(-(2 + (i % 12)), 17), gueltigBis: tageAb(28 - (i % 12) - (i % 3 === 0 ? 30 : 0), 23) }];
      }
      if (st === 'abschluss' && s !== 'vorwerk') {
        const schritte: Rec = { vertrag: { datum: lokalTag(-(20 + i)), erledigt: true } };
        if (i % 3 !== 0) schritte.planung = { datum: lokalTag(-(10 + (i % 7))), erledigt: true };
        if (i % 3 === 2) schritte.montage = { datum: lokalTag(5 + (i % 20)), erledigt: false };
        k.auftrag = { ...(k.auftrag || {}), [s]: { schritte } };
        k.angebote = [...(k.angebote || []), { id: `ga${i}${s}`, sparte: s, titel, betrag, datum: tageAb(-(25 + i), 17), status: 'angenommen', entschieden: tageAb(-(20 + i), 17) }];
      }
    }
    if (i % 9 === 4 && !k.haustuer) k.haustuer = [{ id: `gh${i}`, zeitpunkt: tageAb(-(i % 10) - 1, 17, 30), ergebnis: i % 2 ? 'nicht_da' : 'werbeverbot' }];
  }

  // Ein voller Tag (übermorgen) für die Tagesroute: Lengede → Vechelde → Peine
  const ort = (k: Rec | undefined) => (k ? `${k.strasse}, ${k.plz} ${k.ort}` : '');
  (d.termine as Rec[]).push(
    { id: 'tv1', kundeId: 'demo-2', sparte: 'pv', art: 'termin', titel: 'PV-Erstberatung Bernd Muster', beginn: tageAb(2, 9, 30), dauerMin: 60, ort: ort(k2) },
    { id: 'tv2', kundeId: 'demo-4', sparte: 'pv', art: 'termin', titel: 'Bäckerei Test: Angebot PV besprechen', beginn: tageAb(2, 13, 0), dauerMin: 90, ort: ort(k4), notiz: 'Mit Inhaber und Buchhaltung. Beide Varianten mitnehmen.' },
    { id: 'tv3', kundeId: 'demo-3', sparte: 'vorwerk', art: 'termin', titel: 'Claudia Probe: Zubehör zeigen', beginn: tageAb(2, 16, 30), dauerMin: 45, ort: ort(k3) },
  );
  // Nachfassen für das offene Angebot der Bäckerei
  (d.termine as Rec[]).push({ id: 'tv4', kundeId: 'demo-4', sparte: 'pv', art: 'wiedervorlage', titel: 'Angebot nachfassen: PV 49 kWp Gewerbedach Ost/West mit Speicher', beginn: tageAb(4, 10), dauerMin: 15, notiz: `7 Tage nach dem Angebot vom ${TAG(tageAb(-3, 9)).split('-').reverse().join('.')}.` });
}
