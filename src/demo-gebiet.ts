// Sperling – viele weitere Beispielkunden im Beratungsgebiet (Lengede, Raum Peine bis Salzgitter).
// Alles frei erfunden: Namen werden zufällig kombiniert, Hausnummern und Straßen sind ausgedacht,
// Koordinaten liegen nur grob im jeweiligen Ort. Ein fester Startwert macht die Daten bei jedem
// Laden gleich (Tests, Demo-Link). Produkte stammen aus dem Katalog (src/data/produkte.json).
import type { Rec } from './core/util.ts';

/** Kleiner, fest gesäter Zufallsgenerator (mulberry32). */
function zufall(seed: number) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const wahl = <T>(l: readonly T[]): T => l[Math.floor(r() * l.length)] as T;
  const zahl = (von: number, bis: number) => von + Math.floor(r() * (bis - von + 1));
  const ja = (p = 0.5) => r() < p;
  return { r, wahl, zahl, ja };
}

const ORTE = [
  { ort: 'Lengede', plz: '38268', lat: 52.2045, lng: 10.3080, n: 6 },
  { ort: 'Lengede-Broistedt', plz: '38268', lat: 52.2163, lng: 10.2905, n: 3 },
  { ort: 'Lengede-Barbecke', plz: '38268', lat: 52.1925, lng: 10.3330, n: 2 },
  { ort: 'Lengede-Woltwiesche', plz: '38268', lat: 52.1840, lng: 10.2870, n: 2 },
  { ort: 'Peine', plz: '31224', lat: 52.3203, lng: 10.2336, n: 6 },
  { ort: 'Peine-Vöhrum', plz: '31228', lat: 52.3410, lng: 10.2050, n: 2 },
  { ort: 'Vechelde', plz: '38159', lat: 52.2605, lng: 10.3660, n: 3 },
  { ort: 'Ilsede', plz: '31241', lat: 52.2650, lng: 10.1990, n: 3 },
  { ort: 'Ilsede-Gadenstedt', plz: '31246', lat: 52.2390, lng: 10.2200, n: 2 },
  { ort: 'Hohenhameln', plz: '31249', lat: 52.2580, lng: 10.0670, n: 2 },
  { ort: 'Söhlde', plz: '31185', lat: 52.1905, lng: 10.2300, n: 2 },
  { ort: 'Wendeburg', plz: '38176', lat: 52.3250, lng: 10.3900, n: 2 },
  { ort: 'Edemissen', plz: '31234', lat: 52.3870, lng: 10.2600, n: 2 },
  { ort: 'Salzgitter-Lebenstedt', plz: '38226', lat: 52.1560, lng: 10.3410, n: 5 },
  { ort: 'Salzgitter-Thiede', plz: '38239', lat: 52.1700, lng: 10.4300, n: 2 },
  { ort: 'Salzgitter-Bad', plz: '38259', lat: 52.0500, lng: 10.3720, n: 3 },
  { ort: 'Salzgitter-Gebhardshagen', plz: '38229', lat: 52.1150, lng: 10.3500, n: 2 },
] as const;

const STRASSEN = ['Lindenweg', 'Am Sportplatz', 'Birkenstraße', 'Ahornweg', 'Kastanienallee', 'Am Mühlenteich', 'Rosenstraße', 'Gartenstraße',
  'Am Feldrand', 'Schulstraße', 'Eichendorffweg', 'Wiesengrund', 'Lerchenweg', 'Am Kirchberg', 'Drosselgasse', 'Holunderweg', 'Erlenkamp',
  'Im Winkel', 'Sonnenstieg', 'Ulmenring', 'Fliederweg', 'Akazienweg', 'Hasenwinkel', 'Am Bahndamm', 'Zum Teich'];
const VORNAMEN = ['Andrea', 'Bärbel', 'Christian', 'Dagmar', 'Elke', 'Frank', 'Gabriele', 'Heiko', 'Ingrid', 'Jürgen', 'Karin', 'Lars', 'Monika',
  'Norbert', 'Olga', 'Petra', 'Rainer', 'Sabine', 'Thorsten', 'Ute', 'Volker', 'Waltraud', 'Yvonne', 'Detlef', 'Silke', 'Marco', 'Nadine', 'Kerstin',
  'Holger', 'Tanja', 'Dennis', 'Melanie', 'Ralf', 'Anke', 'Sven', 'Heike', 'Uwe', 'Jana', 'Mehmet', 'Aylin', 'Piotr', 'Agnieszka'];
const NACHNAMEN = ['Ahrens', 'Bartels', 'Brandes', 'Dettmer', 'Ebeling', 'Fricke', 'Gödecke', 'Hartmann', 'Heine', 'Jahns', 'Kassebaum', 'Klages',
  'Lüddecke', 'Meyerhoff', 'Nolte', 'Oelkers', 'Pape', 'Quast', 'Rehbein', 'Schaper', 'Sievers', 'Thiele', 'Uhde', 'Vollmer', 'Warnecke',
  'Wedekind', 'Ziegenbein', 'Bode', 'Kruse', 'Lampe', 'Mertens', 'Rasche', 'Stöter', 'Tönnies', 'Yilmaz', 'Nowak', 'Kowalski', 'Strube', 'Wiechmann'];
const FIRMEN = ['Tischlerei', 'Autohaus', 'Landhandel', 'Physiopraxis', 'Gasthaus', 'Kfz-Werkstatt', 'Hofladen', 'Malerbetrieb'];

const PRODUKT_NAMEN: Record<string, [string, 'pv' | 'wp' | 'vorwerk']> = {
  'enpal-pv-speicher-paket': ['Enpal Solaranlage mit Speicher (Komplettpaket)', 'pv'],
  'enpal-pv-miete': ['Enpal Solaranlage mieten', 'pv'],
  'enpal-pv-komplettanlage': ['Enpal PV-Komplettanlage', 'pv'],
  'enpal-speicher': ['Enpal Stromspeicher (LFP)', 'pv'],
  'enpal-wallbox': ['Enpal Wallbox (11 kW)', 'pv'],
  'enpal-one-plus': ['Enpal.One+ (Energiemanager)', 'pv'],
  'enpal-stromtarif': ['Enpal Stromtarif (mit Enpal.One+)', 'pv'],
  'enpal-notstrom': ['Enpal Notstrom (EnergyProtect)', 'pv'],
  'enpal-easyflex': ['Enpal EasyFlex Finanzierung', 'pv'],
  'enpal-mieterstrom': ['Enpal Mieterstrom', 'pv'],
  'galvany-wp': ['GALVANY Wärmepumpe (Panasonic Aquarea T-CAP M)', 'wp'],
  'galvany-cube': ['GALVANY Cube', 'wp'],
  'galvany-speicher': ['GALVANY Batteriespeicher', 'wp'],
  'galvany-smartcare-flex': ['SmartCare+ Flex', 'wp'],
  'galvany-smartcare-premium': ['SmartCare+ Premium', 'wp'],
  'galvany-finanzierung': ['GALVANY Finanzierung über Partner', 'wp'],
  'galvany-heizungswechsel-check': ['GALVANY Heizungswechsel-Check', 'wp'],
  'vorwerk-vk7-akku-staubsauger-eb7': ['Kobold VK7 Akku-Staubsauger mit EB7 Elektrobürste', 'vorwerk'],
  'vorwerk-vk7-saugwischer-set': ['Kobold VK7 Akku-Saugwischer (VK7 mit EB7 Elektrobürste und SP7 Saugwischer)', 'vorwerk'],
  'vorwerk-vt300': ['Kobold VT300 Bodenstaubsauger mit EB400 Automatik-Elektrobürste', 'vorwerk'],
  'vorwerk-vr7': ['Kobold VR7 Saugroboter mit RB7 Absaugstation', 'vorwerk'],
  'vorwerk-vr7-saugroboter-cb7': ['Kobold VR7 Saugroboter mit CB7 Ladestation', 'vorwerk'],
  'vorwerk-vg100plus': ['Kobold VG100+ Flächenreiniger (Akku-Fenstersauger)', 'vorwerk'],
  'vorwerk-vm7': ['Kobold VM7 Akku-Handstaubsauger', 'vorwerk'],
  'vorwerk-pb7-elektro-polsterbuerste': ['Kobold PB7 Elektro-Polsterbürste', 'vorwerk'],
  'vorwerk-hd7-hartbodenduese': ['Kobold HD7 Hartbodendüse', 'vorwerk'],
  'vorwerk-by7-akku': ['Kobold BY7 Akku', 'vorwerk'],
  'vorwerk-fp7-filtertueten-set': ['Kobold FP7 Premium-Filtertüten (12 Stk.)', 'vorwerk'],
  'vorwerk-kachel-fp300': ['Kobold FP265-300 Premium-Filtertüten (5 Stk.)', 'vorwerk'],
  'vorwerk-koboclean-universal-500ml': ['Koboclean Universal (500 ml)', 'vorwerk'],
  'vorwerk-kachel-mf-tuecher': ['Kobold MF Reinigungstücher Universal (3 Stk.)', 'vorwerk'],
  'vorwerk-fk7-frischer-kit-set': ['Kobold FK7 Frischer-Kit Set', 'vorwerk'],
  'vorwerk-kachel-lavenia': ['Lavenia Matratzenpulver (6 × 120 g)', 'vorwerk'],
  'vorwerk-vk7-service-set': ['Kobold VK7 Service-Set', 'vorwerk'],
};

type Profil = 'pvNeu' | 'pvAbschluss' | 'pvAngebot' | 'wpOel' | 'wpGas' | 'wpAbschluss' | 'vwKunde' | 'vwTest' | 'vwInteresse' | 'kombi' | 'adresse' | 'kein' | 'gewerbe';
const PROFILE: Profil[] = ['pvNeu', 'pvAbschluss', 'pvAngebot', 'wpOel', 'kein', 'wpGas', 'wpAbschluss', 'vwKunde', 'vwTest', 'vwInteresse', 'kombi', 'adresse', 'kein', 'gewerbe'];

/**
 * Hängt die Gebiets-Beispielkunden an (Kunden, Termine, Leihvorgänge). `tageAb(tage, std, min)` liefert ISO-Zeiten
 * relativ zu heute. Rückgabe: Anzahl neuer Kunden.
 */
export function gebietsKunden(d: Rec, tageAb: (t: number, h?: number, m?: number) => string): number {
  const z = zufall(38268);
  const kunden: Rec[] = [];
  const termine: Rec[] = [];
  const leih: Rec[] = [];
  const benutzt = new Set<string>();
  let nr = 100;
  let tnr = 100;
  const marke = (id: string, m: string, zeit: string) => {
    const [name, bereich] = PRODUKT_NAMEN[id]!;
    return { id: `pm${nr}-${id}`, produktId: id, name, bereich, markierung: m, zeitpunkt: zeit };
  };
  const termin = (k: Rec, sparte: string, art: 'termin' | 'wiedervorlage', titel: string, tage: number, std: number, extra: Rec = {}) => {
    termine.push({ id: `t${tnr++}`, kundeId: k.id, sparte, art, titel, beginn: tageAb(tage, std, z.wahl([0, 0, 30, 15])), dauerMin: 60,
      ort: art === 'termin' ? `${k.strasse}, ${k.plz} ${k.ort}` : '', ...extra });
  };

  let p = 0;
  for (const o of ORTE) {
    for (let i = 0; i < o.n; i++) {
      // Profile reihum, damit jede Art mehrmals vorkommt
      const profil = PROFILE[p++ % PROFILE.length]!;
      let vor = z.wahl(VORNAMEN);
      let nach = z.wahl(NACHNAMEN);
      for (let v = 0; benutzt.has(`${vor} ${nach}`) && v < 20; v++) { vor = z.wahl(VORNAMEN); nach = z.wahl(NACHNAMEN); }
      benutzt.add(`${vor} ${nach}`);
      const id = `demo-${nr}`;
      const vor0 = z.ja(0.45) ? z.zahl(3, 35) : z.zahl(36, 150); // erster Kontakt vor … Tagen (knapp die Hälfte im letzten Monat)
      const k: Rec = {
        id, vorname: vor, nachname: nach,
        strasse: `${z.wahl(STRASSEN)} ${z.zahl(1, 48)}${z.ja(0.15) ? 'a' : ''}`, plz: o.plz, ort: o.ort,
        lat: +(o.lat + (z.r() - 0.5) * 0.012).toFixed(5), lng: +(o.lng + (z.r() - 0.5) * 0.018).toFixed(5),
        telefon: z.ja(0.8) ? `0${z.wahl(['5344', '5171', '5341', '5302', '5172', '5128', '5303'])} ${z.zahl(10000, 999999)}` : '',
        email: z.ja(0.45) ? `${vor.toLowerCase().replace(/[^a-z]/g, '')}.${nach.toLowerCase().replace(/[^a-z]/g, '')}@example.de` : '',
        status: { pv: 'unbekannt', wp: 'unbekannt', vorwerk: 'unbekannt' },
        notizen: [], gespraeche: [], enpalKontakte: [], produkte: [],
      };
      const notiz = (sparten: string[], text: string, tage = -vor0, h = z.zahl(9, 19)) => k.notizen.push({ id: `n${nr}-${k.notizen.length}`, zeitpunkt: tageAb(tage, h, z.wahl([0, 10, 25, 40])), sparten, text });
      const gespraech = (sparte: string, ausgang: string, schritt: string, einwaende: Rec[] = [], tage = -vor0) =>
        k.gespraeche.push({ id: `gs${nr}-${k.gespraeche.length}`, zeitpunkt: tageAb(tage, z.zahl(10, 19)), sparte, ausgang, naechsterSchritt: schritt, einwaende });
      const enpal = (art: string, erreicht: boolean, ergebnis: string, schritt: string, notizText: string, tage = -vor0) =>
        k.enpalKontakte.push({ id: `ek${nr}-${k.enpalKontakte.length}`, zeitpunkt: tageAb(tage, z.zahl(9, 19)), art, erreicht, gespraechspartner: erreicht ? `${vor} ${nach}` : '', themen: ['pv'], ergebnis, naechsterSchritt: schritt, notiz: notizText });
      const pv = () => ({
        dachflaeche: z.zahl(30, 110), ausrichtung: z.wahl(['Süd', 'Süd-West', 'Süd-Ost', 'Ost/West']), neigung: z.zahl(25, 45),
        dachform: z.wahl(['Satteldach', 'Satteldach', 'Walmdach', 'Pultdach']), eindeckung: z.wahl(['Ziegel', 'Betondachstein', 'Ziegel']),
        verschattung: z.wahl(['Keine', 'Gering', 'Gering', 'Mittel']), stromverbrauch: z.zahl(28, 75) * 100, personen: z.zahl(1, 5),
        eauto: z.ja(0.35), wallbox: z.ja(0.3), speicher: z.ja(0.65), strompreis: z.zahl(30, 42),
      });
      const wp = (art: string) => {
        const flaeche = z.zahl(95, 210);
        return {
          heizungsart: art, heizungBaujahr: z.zahl(1992, 2010), wohnflaeche: flaeche, hausBaujahr: z.wahl([1958, 1964, 1972, 1979, 1985, 1994, 2001]),
          verbrauchMenge: art === 'Öl' ? z.zahl(15, 35) * 100 : z.zahl(14, 32) * 1000, verbrauchEinheit: art === 'Öl' ? 'Liter' : 'kWh',
          daemmung: z.wahl(['Unsaniert', 'Teilsaniert', 'Teilsaniert', 'Saniert']), fenster: z.wahl(['Zweifach', 'Zweifach', 'Dreifach']),
          waermeverteilung: z.wahl(['Heizkörper', 'Heizkörper', 'Gemischt', 'Fußbodenheizung']), warmwasser: true,
          aufstellort: z.wahl(['Garten hinter dem Haus', 'Neben der Garage', 'Seitlich am Haus, 4 m zum Nachbarn']), heizkosten: z.zahl(18, 42) * 100,
        };
      };
      const vw = (interesse: string) => ({
        interesseAn: interesse, vorhandenesGeraet: z.wahl(['Alter Beutelsauger', 'Kobold VK200', 'Akkusauger vom Discounter', 'Kobold VT300', '']),
        bodenbelaege: z.wahl(['Parkett, Fliesen', 'Teppich, Laminat', 'Fliesen, Vinyl', 'Teppich oben, Fliesen unten']),
        flaeche: z.zahl(70, 190), haustiere: z.ja(0.45), allergien: z.ja(0.25), vorfuehrung: z.ja(0.6),
      });

      switch (profil) {
        case 'pvNeu':
          k.status.pv = 'interesse'; k.pv = pv();
          enpal('telefon', true, 'termin', 'Hausbesuch zur Dachbesichtigung', 'Kam über Empfehlung aus der Nachbarschaft. Möchte Stromkosten senken.');
          notiz(['pv'], `Interesse an PV${k.pv.speicher ? ' mit Speicher' : ''}. Dach ${k.pv.ausrichtung}, ca. ${k.pv.dachflaeche} m².`);
          k.produkte.push(marke('enpal-pv-speicher-paket', 'interesse', tageAb(-vor0, 18)));
          if (k.pv.eauto) k.produkte.push(marke('enpal-wallbox', 'interesse', tageAb(-vor0, 18, 5)));
          termin(k, 'pv', 'termin', `Dachbesichtigung ${vor} ${nach}`, z.zahl(1, 18), z.wahl([10, 14, 17]));
          break;
        case 'pvAbschluss':
          k.status.pv = 'abschluss'; k.pv = { ...pv(), speicher: true };
          enpal('telefon', true, 'termin', 'Hausbesuch', 'Erstkontakt telefonisch, Termin gleich vereinbart.', -vor0 - 14);
          enpal('hausbesuch', true, 'abschluss', 'Montage abwarten', 'Vertrag PV mit Speicher unterschrieben. Montagetermin kommt von Enpal.');
          gespraech('pv', 'abschluss', 'Montage im Frühjahr', [{ id: 'teuer', text: 'Das ist mir zu teuer.', ergebnis: 'ueberzeugt' }]);
          notiz(['pv'], 'Vertrag unterschrieben. Sehr freundlich, würde weiterempfehlen.');
          k.produkte.push(marke('enpal-pv-speicher-paket', 'vorhanden', tageAb(-vor0, 19)), marke('enpal-one-plus', 'interesse', tageAb(-vor0, 19, 2)), marke('enpal-stromtarif', 'spaeter', tageAb(-vor0, 19, 4)));
          if (z.ja(0.5)) { k.status.wp = 'potenzial'; k.wp = wp('Gas'); notiz(['wp'], 'Gasheizung bald 20 Jahre alt. Nach der PV-Montage auf Wärmepumpe ansprechen.'); }
          break;
        case 'pvAngebot':
          k.status.pv = 'angebot'; k.pv = pv();
          enpal('hausbesuch', true, 'angebot', 'Angebot nachfassen', 'Dach angesehen, Angebot von Enpal kommt per E-Mail.');
          gespraech('pv', 'angebot', 'Angebot besprechen', [{ id: 'anbieter', text: 'Ich habe schon ein Angebot von jemand anderem.', ergebnis: 'offen' }, { id: 'lohnt', text: 'Lohnt sich doch heute gar nicht mehr.', ergebnis: 'ueberzeugt' }]);
          k.produkte.push(marke(z.wahl(['enpal-pv-miete', 'enpal-pv-komplettanlage']), 'interesse', tageAb(-vor0, 17)), marke('enpal-easyflex', 'interesse', tageAb(-vor0, 17, 3)), marke('enpal-notstrom', 'spaeter', tageAb(-vor0, 17, 6)));
          termin(k, 'pv', 'wiedervorlage', `${vor} ${nach}: Angebot nachfassen`, z.zahl(-3, 6), 11);
          break;
        case 'wpOel':
          k.status.wp = 'interesse'; k.wp = wp('Öl');
          notiz(['wp'], `Ölheizung von ${k.wp.heizungBaujahr}, Tank im Keller. Will weg vom Öl, Förderung interessiert.`);
          gespraech('wp', 'termin', 'Heizungswechsel-Check vor Ort', [{ id: 'altbau', text: 'Im Altbau funktioniert eine Wärmepumpe nicht.', ergebnis: 'ueberzeugt' }, { id: 'laut', text: 'Die sind doch laut.', ergebnis: 'offen' }]);
          k.produkte.push(marke('galvany-heizungswechsel-check', 'interesse', tageAb(-vor0, 18)), marke('galvany-wp', 'interesse', tageAb(-vor0, 18, 3)), marke('galvany-finanzierung', 'spaeter', tageAb(-vor0, 18, 5)));
          termin(k, 'wp', 'termin', `Heizungswechsel-Check ${vor} ${nach}`, z.zahl(2, 20), z.wahl([9, 15, 16]), { dauerMin: 90 });
          break;
        case 'wpGas':
          k.status.wp = 'angebot'; k.wp = wp('Gas');
          notiz(['wp'], 'Angebot GALVANY übergeben. Will mit Schwiegersohn (Heizungsbauer) drüber sprechen.');
          gespraech('wp', 'ueberlegen', 'In zwei Wochen nachfragen', [{ id: 'teuer', text: 'Die Anschaffung ist zu teuer.', ergebnis: 'offen' }, { id: 'funktioniert', text: 'Meine Heizung läuft doch noch.', ergebnis: 'ueberzeugt' }]);
          k.produkte.push(marke('galvany-wp', 'interesse', tageAb(-vor0, 16)), marke('galvany-smartcare-flex', 'interesse', tageAb(-vor0, 16, 2)), marke('galvany-speicher', 'kein', tageAb(-vor0, 16, 4)));
          termin(k, 'wp', 'wiedervorlage', `${vor} ${nach}: Wärmepumpe nachfragen`, z.zahl(-2, 14), 18);
          break;
        case 'wpAbschluss':
          k.status.wp = 'abschluss'; k.wp = wp(z.wahl(['Gas', 'Öl', 'Nachtspeicher']));
          gespraech('wp', 'abschluss', 'Installation abwarten', [{ id: 'strompreis', text: 'Strom ist doch so teuer.', ergebnis: 'ueberzeugt' }]);
          notiz(['wp'], 'Auftrag Wärmepumpe erteilt. Installation in ca. 8 Wochen.');
          k.produkte.push(marke('galvany-wp', 'vorhanden', tageAb(-vor0, 19)), marke('galvany-smartcare-premium', 'vorhanden', tageAb(-vor0, 19, 1)), marke('galvany-cube', 'interesse', tageAb(-vor0, 19, 3)));
          k.status.pv = 'potenzial'; k.pv = pv();
          notiz(['pv'], 'Mit Wärmepumpe lohnt sich PV doppelt. Nach der Installation ansprechen.', -vor0 + 1);
          break;
        case 'vwKunde': {
          k.status.vorwerk = 'abschluss'; k.vorwerk = { ...vw('Zubehör/Service'), vorhandenesGeraet: z.wahl(['Kobold VK7', 'Kobold VT300', 'Kobold VR7']) };
          const geraet = k.vorwerk.vorhandenesGeraet === 'Kobold VT300' ? 'vorwerk-vt300' : k.vorwerk.vorhandenesGeraet === 'Kobold VR7' ? 'vorwerk-vr7' : 'vorwerk-vk7-akku-staubsauger-eb7';
          const tuete = geraet === 'vorwerk-vt300' ? 'vorwerk-kachel-fp300' : 'vorwerk-fp7-filtertueten-set';
          notiz(['vorwerk'], `Hat ${k.vorwerk.vorhandenesGeraet} vor gut einem Jahr gekauft. Filtertüten und Reiniger nachbestellt.`);
          gespraech('vorwerk', 'abschluss', 'Zubehör liefern, Service in einem Jahr anbieten');
          k.produkte.push(marke(geraet, 'vorhanden', tageAb(-vor0 - 380, 12)), marke(tuete, 'interesse', tageAb(-vor0, 12, 2)),
            marke('vorwerk-koboclean-universal-500ml', 'interesse', tageAb(-vor0, 12, 3)), marke('vorwerk-kachel-mf-tuecher', 'interesse', tageAb(-vor0, 12, 4)));
          if (geraet !== 'vorwerk-vr7') k.produkte.push(marke('vorwerk-vk7-service-set', 'spaeter', tageAb(-vor0, 12, 5)));
          termin(k, 'vorwerk', 'wiedervorlage', `${vor} ${nach}: Zubehör ausliefern`, z.zahl(0, 9), 16, { notiz: 'Filtertüten, Koboclean, MF-Tücher mitnehmen.' });
          break;
        }
        case 'vwTest':
          k.status.vorwerk = 'termin'; k.vorwerk = vw(z.wahl(['Kobold Staubsauger', 'Kobold Saug-Wischer']));
          gespraech('vorwerk', 'test', 'Testgerät in einer Woche abholen', [{ id: 'hab', text: 'Ich habe schon einen Staubsauger.', ergebnis: 'ueberzeugt' }, { id: 'teuer', text: 'Vorwerk ist mir zu teuer.', ergebnis: 'offen' }], -z.zahl(2, 6));
          notiz(['vorwerk'], `${k.vorwerk.haustiere ? 'Hund im Haus, ' : ''}${k.vorwerk.bodenbelaege}. VK7 zum Testen dagelassen.`, -z.zahl(2, 6));
          k.produkte.push(marke('vorwerk-vk7-saugwischer-set', 'interesse', tageAb(-3, 17)), marke('vorwerk-pb7-elektro-polsterbuerste', 'spaeter', tageAb(-3, 17, 2)));
          leih.push({ kundeId: id, notiz: 'Testet zu Hause, Abholung vereinbart.', kaufinteresse: 'interesse' });
          break;
        case 'vwInteresse':
          k.status.vorwerk = 'interesse'; k.vorwerk = vw(z.wahl(['Kobold Saugroboter', 'Kobold Staubsauger']));
          notiz(['vorwerk'], `Auf dem Wochenmarkt angesprochen. Interesse an ${k.vorwerk.interesseAn}, Vorführung zu Hause gewünscht.`);
          gespraech('vorwerk', 'termin', 'Vorführung', [{ id: 'keinezeit', text: 'Ich habe gerade keine Zeit für eine Vorführung.', ergebnis: 'ueberzeugt' }]);
          k.produkte.push(marke(k.vorwerk.interesseAn === 'Kobold Saugroboter' ? 'vorwerk-vr7-saugroboter-cb7' : 'vorwerk-vk7-akku-staubsauger-eb7', 'interesse', tageAb(-vor0, 11)),
            marke('vorwerk-vg100plus', z.wahl(['interesse', 'spaeter']), tageAb(-vor0, 11, 3)), marke('vorwerk-vm7', 'spaeter', tageAb(-vor0, 11, 5)));
          termin(k, 'vorwerk', 'termin', `Vorwerk-Vorführung ${vor} ${nach}`, z.zahl(1, 21), z.wahl([10, 17, 18]), { dauerMin: 90 });
          break;
        case 'kombi':
          k.status = { pv: 'termin', wp: 'interesse', vorwerk: 'potenzial' }; k.pv = pv(); k.wp = wp('Gas'); k.vorwerk = vw('Kobold Staubsauger');
          enpal('telefon', true, 'termin', 'Hausbesuch PV', 'Möchte möglichst unabhängig werden.');
          notiz(['pv'], 'Großes Süddach, Termin zur Besichtigung steht.');
          notiz(['wp'], 'Gasheizung soll in den nächsten Jahren raus. Erst PV, dann Wärmepumpe.');
          notiz(['vorwerk'], 'Nebenbei: alter Staubsauger kaputt. Vorführung anbieten.');
          k.produkte.push(marke('enpal-pv-speicher-paket', 'interesse', tageAb(-vor0, 18)), marke('enpal-one-plus', 'interesse', tageAb(-vor0, 18, 1)),
            marke('galvany-wp', 'spaeter', tageAb(-vor0, 18, 2)), marke('vorwerk-vk7-akku-staubsauger-eb7', 'interesse', tageAb(-vor0, 18, 3)));
          termin(k, 'pv', 'termin', `PV-Besichtigung ${vor} ${nach}`, z.zahl(1, 12), 16);
          break;
        case 'adresse':
          // nur Adresse, beim Klingeln notiert
          delete k.vorname; delete k.nachname; k.telefon = ''; k.email = '';
          k.status = { pv: 'potenzial', wp: z.ja() ? 'potenzial' : 'unbekannt', vorwerk: 'unbekannt' };
          notiz(['pv', 'wp'], z.wahl(['Niemand angetroffen, Flyer eingeworfen. Dach unbelegt, Süd.', 'Altbau mit Öltank im Garten, Dach frei. Nochmal klingeln.', 'Neubau, Dach noch ohne PV. Abends nochmal vorbeischauen.']), -z.zahl(1, 10), 18);
          termin(k, 'pv', 'wiedervorlage', `${k.strasse} nochmal klingeln`, z.zahl(0, 7), 18);
          break;
        case 'kein':
          k.status = { pv: 'kein_interesse', wp: 'unbekannt', vorwerk: z.ja() ? 'kein_interesse' : 'unbekannt' };
          gespraech('pv', 'kein', '', [{ id: 'alt', text: 'Dafür bin ich zu alt.', ergebnis: 'offen' }]);
          notiz(['pv'], 'Kein Interesse, Mietwohnung bzw. Dach gehört der Genossenschaft.');
          k.produkte.push(marke('enpal-mieterstrom', 'spaeter', tageAb(-vor0, 15)));
          break;
        case 'gewerbe':
          k.firma = `${z.wahl(FIRMEN)} ${nach}`;
          k.status = { pv: 'angebot', wp: 'termin', vorwerk: z.ja() ? 'interesse' : 'unbekannt' };
          k.pv = { ...pv(), dachflaeche: z.zahl(150, 420), dachform: z.wahl(['Flachdach', 'Pultdach']), stromverbrauch: z.zahl(18, 60) * 1000, speicher: true };
          k.wp = { ...wp('Öl'), wohnflaeche: z.zahl(220, 480) };
          enpal('hausbesuch', true, 'angebot', 'Angebot Gewerbedach', 'Großes Hallendach, hoher Tagverbrauch.');
          notiz(['pv'], 'Angebot für das Hallendach erstellt, Eigenverbrauch tagsüber sehr hoch.');
          notiz(['wp'], 'Ölheizung im Betrieb, Vor-Ort-Termin mit Techniker.');
          k.produkte.push(marke('enpal-pv-komplettanlage', 'interesse', tageAb(-vor0, 10)), marke('enpal-speicher', 'interesse', tageAb(-vor0, 10, 2)), marke('galvany-wp', 'interesse', tageAb(-vor0, 10, 4)));
          if (k.status.vorwerk === 'interesse') k.produkte.push(marke('vorwerk-vt300', 'interesse', tageAb(-vor0, 10, 6)));
          termin(k, 'wp', 'termin', `${k.firma}: Techniker vor Ort`, z.zahl(3, 25), 8, { dauerMin: 120 });
          break;
      }
      // Einige erledigte Termine in der Vergangenheit
      if (z.ja(0.3) && k.vorname) termin(k, Object.keys(k.status).find((s) => k.status[s] !== 'unbekannt') || 'pv', 'termin', `Erstgespräch ${vor} ${nach}`, -vor0, 17, { erledigt: true });
      kunden.push(k);
      nr++;
    }
  }

  // Testgeräte: freie Vorführgeräte aus dem Demo-Bestand plus zwei weitere
  const extraGeraete = [
    { id: 'g5', name: 'Kobold VK7 Akku-Staubsauger', seriennummer: 'VK7-20577', zubehoer: 'Elektrobürste EB7, Ladestation' },
    { id: 'g6', name: 'Kobold VK7 Akku-Saugwischer (mit SP7)', seriennummer: 'VK7-SP7-31208', zubehoer: 'Wischpads, Koboclean' },
    { id: 'g7', name: 'Kobold VG100+ Fenstersauger', seriennummer: 'VG100-80412', zubehoer: 'Sprühflasche, Wischbezug' },
  ];
  d.geraete.push(...extraGeraete);
  const freie = ['g5', 'g6'];
  leih.slice(0, freie.length).forEach((l, i) => {
    d.leihvorgaenge.push({ id: `l${100 + i}`, geraetId: freie[i], kundeId: l.kundeId, ausgabe: tageAb(-3 - i, 18), rueckgabeGeplant: tageAb(4 - i * 6, 18), kaufinteresse: l.kaufinteresse, notiz: l.notiz });
  });
  d.leihvorgaenge.push({ id: 'l110', geraetId: 'g7', kundeId: kunden.find((k) => k.status.vorwerk === 'abschluss')?.id || '', ausgabe: tageAb(-40, 11), rueckgabeGeplant: tageAb(-33, 11), rueckgabe: tageAb(-33, 12), kaufinteresse: 'gekauft' });

  d.kunden.push(...kunden);
  d.termine.push(...termine);
  return kunden.length;
}

// ---------- Statusverlauf der Beispielkunden (ab Schema 8) ----------
// Aus den Aktivitäten je Sparte wird ein glaubwürdiger Weg durch den Verkaufstrichter erzeugt:
// erster Kontakt = Potenzial, dann Schritt für Schritt bis zum heutigen Status, verteilt bis zur letzten Aktivität.
// So zeigen Trichter, Abschlüsse und Vergleichszeiträume in der Demo sinnvolle Zahlen.
const WEG = ['potenzial', 'interesse', 'termin', 'angebot', 'abschluss'];
const AUSGANG_ZU: Record<string, string> = { interesse: 'wiedervorlage', termin: 'termin', angebot: 'angebot', abschluss: 'abschluss', kein_interesse: 'kein' };
const SCHRITT_ZU: Record<string, string> = { interesse: 'Nochmal melden', termin: 'Termin vor Ort', angebot: 'Angebot besprechen', abschluss: '', kein_interesse: '' };

export function demoStatusVerlauf(d: Rec): void {
  const z = zufall(31224);
  const jetzt = Date.now();
  const iso = (ms: number) => new Date(Math.min(ms, jetzt - 60000)).toISOString();
  for (const k of d.kunden as Rec[]) {
    if (Array.isArray(k.statusVerlauf)) continue; // von Hand vorgegeben
    const status: Rec = k.status || {};
    const daten: Record<string, number[]> = { pv: [], wp: [], vorwerk: [] };
    const dazu = (sp: unknown, zeit: unknown) => {
      const t = typeof zeit === 'string' ? Date.parse(zeit) : NaN;
      if (!Number.isFinite(t) || t > jetzt) return;
      for (const s of Array.isArray(sp) ? sp : [sp]) if (typeof s === 'string' && daten[s]) daten[s].push(t);
    };
    for (const n of k.notizen || []) dazu(n.sparten, n.zeitpunkt);
    for (const g of k.gespraeche || []) dazu(g.sparte, g.zeitpunkt);
    for (const c of k.enpalKontakte || []) dazu(c.themen, c.zeitpunkt);
    for (const m of k.produkte || []) if (Date.parse(m.zeitpunkt) > jetzt - 200 * 86400000) dazu(m.bereich, m.zeitpunkt);
    for (const t of d.termine as Rec[]) if (t.kundeId === k.id) dazu(t.sparte, t.beginn);
    const alle = Object.values(daten).flat();
    const erster = alle.length ? Math.min(...alle) : jetzt - z.zahl(5, 90) * 86400000;
    const verlauf: Rec[] = [];
    for (const s of ['pv', 'wp', 'vorwerk']) {
      const ziel = status[s];
      if (!ziel || ziel === 'unbekannt') continue;
      const ds = daten[s]!.sort((a, b) => a - b);
      const start = (ds[0] ?? erster) - z.zahl(0, 3) * 86400000 - z.zahl(1, 5) * 3600000;
      const ende = Math.min(jetzt - 3600000, Math.max(start + 3600000, ds.at(-1) ?? start + z.zahl(1, 20) * 86400000));
      let vorige = 0;
      let weg: string[];
      if (ziel === 'kein_interesse') { const bis = z.wahl([0, 1, 1, 2, 2, 3]); weg = [...WEG.slice(0, bis + 1), 'kein_interesse']; }
      else weg = WEG.slice(0, WEG.indexOf(ziel) + 1);
      let von = 'unbekannt';
      weg.forEach((nach, i) => {
        const anteil = weg.length === 1 ? 0 : i / (weg.length - 1);
        // streng aufsteigend, damit die Reihenfolge der Schritte nie kippt
        const zeit = Math.max(vorige + 60000, Math.min(ende, start + (ende - start) * anteil + (i ? z.zahl(0, 3) * 3600000 : 0)));
        vorige = zeit;
        verlauf.push({ zeitpunkt: iso(zeit), sparte: s, von, nach });
        // Zu jedem Schritt ab „Interesse“ gehört ein Gespräch, falls dort noch keins liegt (Gespräche über die Monate verteilt)
        if (i && !ds.some((t) => Math.abs(t - zeit) < 86400000) && zeit < jetzt) {
          k.gespraeche = k.gespraeche || [];
          k.gespraeche.push({ id: `gsv-${k.id}-${s}-${i}`, zeitpunkt: iso(zeit), sparte: s, ausgang: AUSGANG_ZU[nach] || '', naechsterSchritt: SCHRITT_ZU[nach] || '', einwaende: [] });
        }
        von = nach;
      });
    }
    verlauf.sort((a, b) => (a.zeitpunkt < b.zeitpunkt ? -1 : a.zeitpunkt > b.zeitpunkt ? 1 : 0));
    k.statusVerlauf = verlauf;
    if (!k.createdAt) k.createdAt = iso(Math.min(erster, ...verlauf.map((w) => Date.parse(w.zeitpunkt))) - 3600000);
  }
}
