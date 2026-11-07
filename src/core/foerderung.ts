// Förderung und Rechtsgrundlagen für Photovoltaik und Wärmepumpe (Stand siehe STAND).
// Reiner Inhalt ohne Kundendaten, DOM-frei und testbar. Jeder Abschnitt hat mindestens eine Quelle.
// Pflege: Bei jeder inhaltlichen Änderung STAND und das Feld `geprueft` des Abschnitts setzen.
import { suchText } from './util.ts';

/** Datum, an dem der Inhalt zuletzt insgesamt geprüft wurde (ISO). */
export const STAND = '2026-11-07';

export const HINWEIS = 'Diese Übersicht erklärt Gesetze und Förderprogramme in einfacher Sprache. Sie ist keine Rechts- oder Steuerberatung. '
  + 'Regeln und Fördersätze ändern sich oft. Maßgeblich sind immer der Gesetzestext und die Merkblätter der Förderstelle zum Zeitpunkt des Antrags. '
  + 'Für den Einzelfall helfen Energieberatung, Steuerberatung oder die Förderstelle selbst.';

export type FoeBereich = 'pv' | 'wp' | 'beide';
export type FoeStatus = 'gilt' | 'geplant' | 'aendert' | 'endet';
export type FoeKategorie = 'gesetz' | 'zuschuss' | 'steuer' | 'netz' | 'region' | 'tipp';

export const BEREICHE: Record<FoeBereich, string> = { pv: 'Photovoltaik', wp: 'Wärmepumpe', beide: 'PV und Wärmepumpe' };
export const STATUS: Record<FoeStatus, string> = { gilt: 'Gilt', geplant: 'Geplant', aendert: 'Ändert sich bald', endet: 'Läuft aus' };
export const KATEGORIEN: Record<FoeKategorie, string> = {
  gesetz: 'Gesetze', zuschuss: 'Zuschuss und Kredit', steuer: 'Steuern', netz: 'Netz und Anmeldung', region: 'Niedersachsen und Region', tipp: 'Gut zu wissen',
};

export interface FoeQuelle { titel: string; url: string; amtlich: boolean }
export interface Abschnitt {
  id: string;
  titel: string;
  bereich: FoeBereich;
  kategorie: FoeKategorie;
  status: FoeStatus;
  /** Ein Satz: worum es geht. */
  kurz: string;
  /** Die wichtigsten Punkte, je ein kurzer Satz. */
  punkte: string[];
  /** Optional: Tabelle (erste Zeile = Kopf). */
  tabelle?: string[][];
  /** Merksatz für das Gespräch. */
  merke?: string;
  /** Kleine Überraschung für „Wusstest du?“. */
  wusstest?: string;
  stichworte: string[];
  quellen: FoeQuelle[];
  /** ISO-Datum der letzten Prüfung dieses Abschnitts. */
  geprueft: string;
}

export interface Termin { datum: string; text: string; bereich: FoeBereich; abschnitt: string; sicher: boolean }

const BT_GEG = { titel: 'Deutscher Bundestag: Bundestag beschließt Heizungsgesetz-Novelle (10.07.2026)', url: 'https://www.bundestag.de/dokumente/textarchiv/2026/kw28-de-heizungsgesetz-1194534', amtlich: true };
const GMODG = { titel: 'Infoportal Gebäudemodernisierungsgesetz (Bundesregierung)', url: 'https://www.gmodg.bund.de/GModG/DE/Home/startseite/GModG_News/GModG_News-node.html', amtlich: true };
const ADAC_GEG = { titel: 'ADAC: Das regelt das Gebäudemodernisierungsgesetz (03.11.2026)', url: 'https://www.adac.de/rund-ums-haus/energie/versorgung/heizungsgesetz/', amtlich: false };
const KFW458 = { titel: 'KfW: Heizungsförderung für Privatpersonen – Wohngebäude (458)', url: 'https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestehende-Immobilie/F%C3%B6rderprodukte/Heizungsf%C3%B6rderung-f%C3%BCr-Privatpersonen-Wohngeb%C3%A4ude-(458)/', amtlich: true };
const ADAC_FOE = { titel: 'ADAC: KfW-Heizungsförderung seit 21. Juli 2026', url: 'https://www.adac.de/rund-ums-haus/energie/spartipps/foerderung-heizung/', amtlich: false };
const BAFA_WE = { titel: 'BAFA: Anlagen zur Wärmeerzeugung (BEG EM)', url: 'https://www.bafa.de/DE/Energie/Effiziente_Gebaeude/Sanierung_Wohngebaeude/Anlagen_zur_Waermeerzeugung/anlagen_zur_waermeerzeugung_node.html', amtlich: true };
const BNETZA_EEG = { titel: 'Bundesnetzagentur: EEG-Förderung und Fördersätze', url: 'https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/EEG_Foerderung/start.html', amtlich: true };
const HIB_EEG = { titel: 'Bundestag (hib 701/2026): Bundesregierung legt EEG-Novelle vor', url: 'https://www.bundestag.de/presse/hib/kurzmeldungen-1211152', amtlich: true };
const TA_EEG = { titel: 'Bundestag: Grundlegende Reform des Erneuerbare-Energien-Gesetzes geplant', url: 'https://www.bundestag.de/dokumente/textarchiv/2026/kw39-de-energie-stromsektor-1211294', amtlich: true };
const BMWE_SPITZEN = { titel: 'BMWE: FAQ zur Energierechtsnovelle zur Vermeidung von Stromspitzen', url: 'https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Dossier/ErneuerbareEnergien/faq-zur-energierechtsnovelle-zur-vermeidung-von-stromspitzen-und-zum-biomassepaket.html', amtlich: true };
const MASTR = { titel: 'Marktstammdatenregister: Häufige Fragen', url: 'https://www.marktstammdatenregister.de/MaStRHilfe/subpages/faq.html', amtlich: true };
const KEAN_FOE = { titel: 'Klimaschutz- und Energieagentur Niedersachsen: Förderprogramme für Hauseigentümer', url: 'https://www.klimaschutz-niedersachsen.de/foerderprogramme/hauseigentuemer/index.php', amtlich: true };
const KEAN_NBAUO = { titel: 'Klimaschutz- und Energieagentur Niedersachsen: Niedersächsische Bauordnung', url: 'https://www.klimaschutz-niedersachsen.de/Gesetze/NBauO.php', amtlich: true };
const KEAN_NKLIMAG = { titel: 'Klimaschutz- und Energieagentur Niedersachsen: Niedersächsisches Klimagesetz', url: 'https://www.klimaschutz-niedersachsen.de/Gesetze/NKlimaG.php', amtlich: true };
const gii = (pfad: string, titel: string) => ({ titel: `Gesetzestext: ${titel}`, url: `https://www.gesetze-im-internet.de/${pfad}`, amtlich: true });

export const ABSCHNITTE: Abschnitt[] = [
  // ───────────── Photovoltaik ─────────────
  {
    id: 'pv-verguetung', titel: 'Einspeisevergütung nach dem EEG', bereich: 'pv', kategorie: 'gesetz', status: 'endet',
    kurz: 'Wer Solarstrom ins Netz einspeist, bekommt dafür einen festen Betrag pro Kilowattstunde, 20 Jahre lang.',
    punkte: [
      'Die Höhe hängt vom Monat der Inbetriebnahme ab und bleibt dann für die ganze Laufzeit gleich.',
      'Die Laufzeit beträgt 20 Jahre plus den Rest des Jahres, in dem die Anlage in Betrieb ging.',
      'Teileinspeisung heißt: Man nutzt selbst Strom und speist nur den Rest ein. Volleinspeisung heißt: Alles geht ins Netz, dafür gibt es mehr pro Kilowattstunde.',
      'Die Sätze gelten anteilig: Bei 15 kWp werden die ersten 10 kWp mit dem Satz bis 10 kWp vergütet, der Rest mit dem Satz bis 40 kWp.',
      'Wer voll einspeisen will, muss das dem Netzbetreiber vor Inbetriebnahme mitteilen, für die Folgejahre jeweils vor dem 1. Dezember des Vorjahres. Für 2027 also bis Ende November 2026.',
      'Die Sätze unten gelten nur für Anlagen, die vom 1. August bis 31. Dezember 2026 in Betrieb gehen.',
      'Für Anlagen ab 2027 gibt es noch keine festen Sätze, weil das EEG gerade neu geregelt wird (siehe „EEG-Reform 2027“).',
    ],
    tabelle: [
      ['Anlage auf dem Gebäude', 'Teileinspeisung', 'Volleinspeisung'],
      ['bis 10 kWp', '7,70 ct/kWh', '12,22 ct/kWh'],
      ['10 bis 40 kWp', '6,66 ct/kWh', '10,24 ct/kWh'],
      ['40 bis 100 kWp', '5,44 ct/kWh', '10,24 ct/kWh'],
    ],
    merke: 'Eigenverbrauch lohnt sich meist mehr als Einspeisen, weil gekaufter Strom deutlich teurer ist als die Vergütung.',
    wusstest: 'Die Vergütung wird an jedem 1. Februar und 1. August um 1 % gesenkt. Wer früher in Betrieb geht, hat 20 Jahre lang den höheren Satz.',
    stichworte: ['eeg', 'einspeisung', 'einspeiseverguetung', 'cent', 'ct', 'kwh', 'teileinspeisung', 'volleinspeisung', 'degression', 'verguetungssatz', '2026'],
    quellen: [BNETZA_EEG, gii('eeg_2014/__48.html', '§ 48 EEG (Solaranlagen)')],
    geprueft: '2026-11-07',
  },
  {
    id: 'pv-eeg-reform', titel: 'EEG-Reform 2027: Was geplant ist', bereich: 'pv', kategorie: 'gesetz', status: 'geplant',
    kurz: 'Die Bundesregierung will das Erneuerbare-Energien-Gesetz ab 2027 grundlegend ändern. Beschlossen ist es noch nicht.',
    punkte: [
      'Der Gesetzentwurf (Bundestag-Drucksache 21/7867) wurde am 24.09.2026 zum ersten Mal im Bundestag beraten, die Anhörung war am 05.10.2026.',
      'Stand 06.11.2026 hat der Bundestag noch nicht abgestimmt. Auch die EU-Kommission muss zustimmen.',
      'Geplant ist: Neue kleine Dachanlagen bekommen keine feste Einspeisevergütung über 20 Jahre mehr.',
      'Für Anlagen unter 25 kW ist laut Bundestag eine Übergangszeit bis Ende 2028 vorgesehen, mit 5,2 ct/kWh für 3 Jahre statt 20 Jahre.',
      'Neue Anlagen sollen ihren Strom in der Regel selbst vermarkten (Direktvermarktung). Der Bundesrat und Branchenverbände kritisieren das für kleine Anlagen.',
      'Netzbetreiber sollen Anschlüsse bei knappen Netzen nach Reife des Vorhabens ordnen dürfen, nicht mehr nur nach Reihenfolge der Anfragen.',
      'Für Anlagen, die schon laufen, sollen die bisherigen Regeln weiter gelten. Die genaue Übergangsregel steht erst im beschlossenen Gesetz.',
    ],
    merke: 'Eine Anlage, die 2026 in Betrieb geht, fällt nach heutigem Stand noch unter das bisherige EEG. Für Anlagen ab 2027 bitte immer den aktuellen Stand prüfen.',
    wusstest: 'Die EU-Genehmigung für das heutige EEG läuft am 31.12.2026 aus. Deshalb drängt die Zeit für die Reform.',
    stichworte: ['eeg 2027', 'novelle', 'reform', 'abschaffung', 'einspeiseverguetung', 'direktvermarktung', 'uebergangszahlung', 'drucksache', 'bundestag', 'netzanschluss'],
    quellen: [HIB_EEG, TA_EEG, { titel: 'cleanthinking: Einspeisevergütung 2026 und EEG 2027 (21.10.2026)', url: 'https://www.cleanthinking.de/einspeiseverguetung/', amtlich: false }],
    geprueft: '2026-11-07',
  },
  {
    id: 'pv-solarspitzen', titel: 'Solarspitzengesetz: Regeln für neue Anlagen', bereich: 'pv', kategorie: 'netz', status: 'gilt',
    kurz: 'Seit 25.02.2025 gelten neue Regeln, damit an sonnigen Tagen nicht zu viel Strom gleichzeitig ins Netz fließt.',
    punkte: [
      'Der offizielle Name ist „Energierechtsnovelle zur Vermeidung von temporären Stromspitzen“.',
      'Ist der Strompreis an der Börse negativ, gibt es für neue Anlagen in dieser Zeit keine Vergütung. Bei Anlagen von 2 bis unter 100 kW gilt das erst ab dem Jahr nach dem Einbau eines intelligenten Messsystems.',
      'Die Stunden ohne Vergütung werden hinten an die 20 Jahre angehängt. Es geht also wenig verloren.',
      'Neue Anlagen über 2 kW ohne intelligentes Messsystem dürfen höchstens 60 % ihrer Leistung ins Netz einspeisen. Mit Smart Meter und Steuerbox fällt die Grenze weg.',
      'Ausgenommen sind Balkonkraftwerke, Anlagen ohne Einspeisung und alle Anlagen, die vorher schon liefen.',
      'Betreiber älterer Anlagen können freiwillig in die neuen Regeln wechseln und bekommen dann 0,6 ct/kWh mehr.',
    ],
    merke: 'Mit Batteriespeicher und Eigenverbrauch fällt die 60-%-Grenze kaum ins Gewicht, weil mittags viel Strom im Haus bleibt.',
    wusstest: 'Die 60-%-Grenze gilt am Netzanschluss, nicht am Dach. Was im Haus verbraucht oder gespeichert wird, zählt nicht mit.',
    stichworte: ['solarspitzen', 'solarspitzengesetz', 'negative preise', '60 prozent', 'einspeisebegrenzung', 'smart meter', 'steuerbox', 'stromspitzen'],
    quellen: [BMWE_SPITZEN],
    geprueft: '2026-11-07',
  },
  {
    id: 'pv-umsatzsteuer', titel: '0 % Umsatzsteuer auf Solaranlage und Speicher', bereich: 'pv', kategorie: 'steuer', status: 'gilt',
    kurz: 'Seit 2023 fällt beim Kauf und bei der Montage einer Solaranlage für das Wohnhaus keine Umsatzsteuer an.',
    punkte: [
      'Das gilt für Solarmodule, wichtige Bauteile wie den Wechselrichter, den Batteriespeicher und die Installation.',
      'Die Anlage muss auf oder in der Nähe einer Wohnung bzw. eines Wohnhauses stehen.',
      'Bei höchstens 30 kWp laut Marktstammdatenregister gilt diese Bedingung automatisch als erfüllt.',
      'Der Käufer muss nichts beantragen. Der Fachbetrieb stellt die Rechnung direkt mit 0 % aus.',
    ],
    merke: 'Auf der Rechnung muss 0 % Umsatzsteuer stehen. Steht dort 19 %, lohnt sich eine Rückfrage.',
    stichworte: ['umsatzsteuer', 'mehrwertsteuer', 'mwst', 'ust', 'nullsteuersatz', '0 prozent', 'speicher', '30 kwp', '12 ustg'],
    quellen: [gii('ustg_1980/__12.html', '§ 12 Abs. 3 UStG')],
    geprueft: '2026-11-07',
  },
  {
    id: 'pv-einkommensteuer', titel: 'Keine Einkommensteuer auf kleine Solaranlagen', bereich: 'pv', kategorie: 'steuer', status: 'gilt',
    kurz: 'Einnahmen aus einer kleinen Solaranlage auf dem Haus sind steuerfrei, auch die Einspeisevergütung.',
    punkte: [
      'Steuerfrei bis 30 kWp je Wohnung oder Gewerbeeinheit, insgesamt höchstens 100 kWp je Person.',
      'Dazu zählen Anlagen auf dem Wohnhaus und auf Nebengebäuden wie Garage oder Carport.',
      'Für steuerfreie Anlagen muss kein Gewinn ermittelt werden, eine Anlage EÜR für die Solaranlage entfällt.',
      'Auch die Gewerbesteuer fällt für solche Anlagen nicht an.',
      'Wer die Kleinunternehmerregelung nutzt (Umsatz im Vorjahr bis 25.000 €), muss auch keine Umsatzsteuer auf eingespeisten Strom abführen.',
    ],
    merke: 'Für die übliche Anlage auf dem Einfamilienhaus gibt es keinen Steuer-Papierkram mehr.',
    wusstest: 'Die 30-kWp-Grenze zählt je Wohneinheit. Ein Zweifamilienhaus darf also bis 60 kWp haben.',
    stichworte: ['einkommensteuer', 'steuerfrei', 'steuer', 'finanzamt', '3 nr 72', '30 kwp', '100 kwp', 'gewerbesteuer', 'kleinunternehmer', 'euer'],
    quellen: [gii('estg/__3.html', '§ 3 Nr. 72 EStG'), gii('gewstg/__3.html', '§ 3 Nr. 32 GewStG'), gii('ustg_1980/__19.html', '§ 19 UStG (Kleinunternehmer)')],
    geprueft: '2026-11-07',
  },
  {
    id: 'pv-kfw270', titel: 'KfW-Kredit 270 für Solaranlage und Speicher', bereich: 'pv', kategorie: 'zuschuss', status: 'gilt',
    kurz: 'Für Solaranlagen und Batteriespeicher gibt es vom Bund keinen Zuschuss, aber einen günstigen Kredit der KfW.',
    punkte: [
      'Der Kredit heißt „Erneuerbare Energien – Standard“ (Programm 270) und läuft über die Hausbank.',
      'Der Antrag muss gestellt sein, bevor die Anlage bestellt bzw. mit dem Bau begonnen wird.',
      'Privatpersonen können ihn nutzen, wenn sie einen Teil des Stroms einspeisen. Finanziert werden bis zu 100 % der Kosten, mit Laufzeiten bis 30 Jahre.',
      'Auch Batteriespeicher und Wärmepumpen sind damit finanzierbar. Balkonkraftwerke sind ausgeschlossen.',
      'Der Zinssatz ändert sich laufend und hängt von Laufzeit und Bonität ab. Den aktuellen Satz nennt die KfW bzw. die Hausbank.',
    ],
    merke: 'Erst Kredit beantragen, dann bestellen. Wer schon unterschrieben hat, bekommt den Kredit nicht mehr.',
    stichworte: ['kfw', '270', 'kredit', 'darlehen', 'finanzierung', 'speicher', 'batteriespeicher', 'hausbank', 'zins'],
    quellen: [{ titel: 'KfW: Erneuerbare Energien – Standard (270)', url: 'https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestehende-Immobilie/F%C3%B6rderprodukte/Erneuerbare-Energien-Standard-(270)/', amtlich: true }, KEAN_FOE],
    geprueft: '2026-11-07',
  },
  {
    id: 'pv-anmeldung', titel: 'Anmelden: Netzbetreiber und Marktstammdatenregister', bereich: 'pv', kategorie: 'netz', status: 'gilt',
    kurz: 'Jede Solaranlage muss beim Netzbetreiber angemeldet und im Marktstammdatenregister eingetragen werden.',
    punkte: [
      'Der Netzbetreiber muss eine Solaranlage unverzüglich anschließen. Die Anmeldung übernimmt meist der Fachbetrieb.',
      'Im Marktstammdatenregister der Bundesnetzagentur muss die Anlage spätestens einen Monat nach Inbetriebnahme eingetragen sein. Das ist kostenlos.',
      'Ein Batteriespeicher wird dort als eigene Einheit eingetragen.',
      'Fehlt der Eintrag, darf der Netzbetreiber die Vergütung zurückhalten.',
      'Eine Wärmepumpe im normalen Wohnhaus muss nicht ins Marktstammdatenregister.',
    ],
    merke: 'Nach der Inbetriebnahme an den Eintrag im Marktstammdatenregister denken, sonst fließt kein Geld.',
    stichworte: ['marktstammdatenregister', 'mastr', 'anmeldung', 'registrierung', 'netzbetreiber', 'netzanschluss', 'inbetriebnahme', 'frist', '8 eeg'],
    quellen: [MASTR, gii('eeg_2014/__8.html', '§ 8 EEG (Netzanschluss)')],
    geprueft: '2026-11-07',
  },
  {
    id: 'pv-balkon', titel: 'Balkonkraftwerk (Steckersolargerät)', bereich: 'pv', kategorie: 'netz', status: 'gilt',
    kurz: 'Kleine Solaranlagen für den Balkon sind seit 2024 deutlich einfacher erlaubt.',
    punkte: [
      'Erlaubt sind bis 800 VA Wechselrichterleistung und bis 2.000 W Modulleistung.',
      'Eine Meldung beim Netzbetreiber ist dafür nicht mehr nötig, nur der Eintrag im Marktstammdatenregister.',
      'Mieter und Wohnungseigentümer haben ein Recht darauf, dass Vermieter bzw. Eigentümergemeinschaft ein Balkonkraftwerk erlauben. Über das Wie dürfen diese mitreden.',
      'Für Balkonkraftwerke gelten die 60-%-Grenze und die Regel zu negativen Preisen nicht.',
    ],
    merke: 'Ein Balkonkraftwerk ist ein guter Einstieg, ersetzt aber keine Dachanlage mit Speicher.',
    stichworte: ['balkonkraftwerk', 'steckersolar', 'stecker', '800 watt', '800 va', 'mieter', 'weg', 'eigentuemergemeinschaft', '554 bgb'],
    quellen: [MASTR, gii('bgb/__554.html', '§ 554 BGB (Mieter)'), gii('woeigg/__20.html', '§ 20 WEG (Eigentümer)')],
    geprueft: '2026-11-07',
  },
  {
    id: 'pv-solarpflicht', titel: 'Solarpflicht in Niedersachsen', bereich: 'pv', kategorie: 'region', status: 'gilt',
    kurz: 'In Niedersachsen müssen neue Wohnhäuser und Häuser mit neuem Dach in vielen Fällen eine Solaranlage bekommen.',
    punkte: [
      'Gilt für Wohngebäude, deren Bauantrag seit 2025 gestellt wurde, bei Dachflächen über 50 m².',
      'Mindestens die Hälfte der Dachfläche muss mit Photovoltaik belegt werden.',
      'Die Pflicht greift auch bei Anbau, Aufstockung oder wenn die Dachhaut bis auf die wasserführende Schicht erneuert wird.',
      'Ausnahmen gibt es, wenn es technisch nicht geht, wirtschaftlich nicht vertretbar ist, andere Gesetze entgegenstehen oder Solarthermie genutzt wird.',
      'Für bestehende Häuser ohne Dacharbeiten gibt es keine Pflicht.',
      'Bundesweit sieht das neue Gebäudemodernisierungsgesetz eine Solarpflicht für Wohngebäude erst ab 2030 vor.',
    ],
    merke: 'Steht eine Dachsanierung an, ist das der natürliche Zeitpunkt für die Solaranlage, weil Gerüst und Dachdecker ohnehin da sind.',
    stichworte: ['solarpflicht', 'pv-pflicht', 'nbauo', 'bauordnung', 'niedersachsen', 'neubau', 'dachsanierung', 'nklimag', 'gmodg', '106'],
    quellen: [KEAN_NKLIMAG, KEAN_NBAUO, ADAC_GEG],
    geprueft: '2026-11-07',
  },
  {
    id: 'pv-teilen', titel: 'Strom teilen: Energy Sharing und Mieterstrom', bereich: 'pv', kategorie: 'netz', status: 'gilt',
    kurz: 'Solarstrom darf inzwischen leichter mit Nachbarn oder Mietern geteilt werden.',
    punkte: [
      'Seit 01.06.2026 erlaubt das Energiewirtschaftsgesetz „Energy Sharing“: Strom aus einer Anlage über das öffentliche Netz an andere Haushalte in der Nähe liefern.',
      'Im Mehrfamilienhaus können Eigentümer den Strom vom Dach über die „gemeinschaftliche Gebäudeversorgung“ an die Bewohner abgeben, mit wenig Bürokratie.',
      'Daneben gibt es weiter Mieterstrom mit einem kleinen Zuschlag nach dem EEG.',
      'Für die Abrechnung braucht es passende Zähler und meist einen Dienstleister.',
    ],
    stichworte: ['energy sharing', 'teilen', 'nachbar', 'mieterstrom', 'gebaeudeversorgung', '42b', '42c', 'enwg', 'mehrfamilienhaus'],
    quellen: [gii('enwg_2005/__42c.html', '§ 42c EnWG (Energy Sharing)'), gii('enwg_2005/__42b.html', '§ 42b EnWG (Gebäudeversorgung)')],
    geprueft: '2026-11-07',
  },

  // ───────────── Wärmepumpe ─────────────
  {
    id: 'wp-gmodg', titel: 'Gebäudemodernisierungsgesetz (früher „Heizungsgesetz“)', bereich: 'wp', kategorie: 'gesetz', status: 'gilt',
    kurz: 'Das frühere Gebäudeenergiegesetz heißt jetzt Gebäudemodernisierungsgesetz. Die 65-%-Pflicht für neue Heizungen ist weggefallen.',
    punkte: [
      'Der Bundestag hat das Gesetz am 10.07.2026 beschlossen, der Bundesrat am selben Tag zugestimmt. Die Regeln zum Heizungstausch gelten seit 29.07.2026.',
      'Es gibt keine Pflicht mehr, dass eine neue Heizung zu 65 % mit erneuerbarer Energie läuft. Eigentümer wählen die Heizung frei.',
      'Neue Öl- und Gasheizungen sind erlaubt, müssen aber nach und nach klimafreundlichen Brennstoff nutzen („Bio-Treppe“): 2029 mindestens 10 %, 2030 15 %, 2035 30 %, 2040 60 %. Ab 2045 muss jeder Brennstoff klimaneutral sein.',
      'Eine Wärmepumpe erfüllt diese Anforderungen von Anfang an.',
      'Bestehende Heizungen dürfen weiterlaufen und repariert werden. Ein Austausch nur wegen des Alters ist nicht vorgeschrieben.',
      'Die Pflicht zur Beratung vor dem Einbau einer Öl- oder Gasheizung ist entfallen.',
      'Bei neuen Öl- oder Gasheizungen in Mietwohnungen tragen Vermieter ab 2028 die Hälfte von Netzentgelt und CO2-Preis, ab 2029 die Hälfte der Mehrkosten für den Bio-Anteil.',
      'Gegen das Gesetz ist eine Verfassungsbeschwerde eingereicht worden.',
    ],
    merke: 'Niemand muss heute eine Wärmepumpe einbauen. Wer eine Öl- oder Gasheizung neu einbaut, muss aber mit steigenden Brennstoffkosten durch Bio-Anteil und CO2-Preis rechnen.',
    wusstest: 'Das Gesetz hat drei Namen erlebt: Energieeinsparverordnung, Gebäudeenergiegesetz und jetzt Gebäudemodernisierungsgesetz.',
    stichworte: ['gmodg', 'geg', 'heizungsgesetz', 'gebaeudeenergiegesetz', 'gebaeudemodernisierungsgesetz', '65 prozent', 'bio-treppe', 'biotreppe', 'gasheizung', 'oelheizung', 'heizungstausch', 'bestandsschutz', 'vermieter'],
    quellen: [GMODG, BT_GEG, ADAC_GEG],
    geprueft: '2026-11-07',
  },
  {
    id: 'wp-kfw458', titel: 'Zuschuss für die neue Heizung (KfW 458)', bereich: 'wp', kategorie: 'zuschuss', status: 'aendert',
    kurz: 'Wer im eigenen Wohnhaus eine Wärmepumpe einbaut, bekommt von der KfW einen Zuschuss von 30 bis 80 % der Kosten.',
    punkte: [
      'Neue Bedingungen gelten für Anträge seit 21.07.2026.',
      'Grundförderung: 30 % für alle Antragsteller.',
      'Klimageschwindigkeitsbonus: 16 %, wenn eine funktionierende Öl-, Kohle-, Gasetagen- oder Nachtspeicherheizung oder eine mindestens 20 Jahre alte Gas- oder Biomasseheizung ersetzt wird. Nur für selbst bewohnte Häuser.',
      'Einkommensbonus: bis zu 40 % bei niedrigem Haushaltseinkommen, nur für selbst bewohnte Häuser (siehe Tabelle).',
      'Zusammen höchstens 80 %. Gefördert werden Kosten bis 28.000 € für die erste Wohnung, also höchstens 22.400 € Zuschuss.',
      'Der frühere Effizienzbonus (5 % für natürliche Kältemittel) ist entfallen.',
      'Die Förderung steht unter Haushaltsvorbehalt. Einen Rechtsanspruch gibt es nicht.',
    ],
    tabelle: [
      ['Zu versteuerndes Haushaltseinkommen', 'ohne Kind unter 18', 'mit Kind unter 18'],
      ['bis 30.000 €', '40 %', '40 %'],
      ['30.001 bis 40.000 €', '30 %', '40 %'],
      ['40.001 bis 50.000 €', '10 %', '30 %'],
      ['50.001 bis 60.000 €', '–', '10 %'],
    ],
    merke: 'Ein gut geplanter Heizungstausch mit allen passenden Boni wird vom Staat spürbar unterstützt. Was genau passt, klärt die Förderstelle.',
    wusstest: 'Der Klimageschwindigkeitsbonus sinkt alle sechs Monate: 12 % ab 01.02.2027, 8 % ab 01.08.2027, 4 % ab 01.02.2028. Für Anträge ab 01.08.2028 entfällt er.',
    stichworte: ['kfw', '458', 'zuschuss', 'heizungsfoerderung', 'beg', 'grundfoerderung', 'klimageschwindigkeitsbonus', 'einkommensbonus', 'effizienzbonus', '80 prozent', '28000', 'foerdersatz'],
    quellen: [KFW458, ADAC_FOE, BAFA_WE],
    geprueft: '2026-11-07',
  },
  {
    id: 'wp-458-aenderungen', titel: 'Was sich 2027 bei der Heizungsförderung ändert', bereich: 'wp', kategorie: 'zuschuss', status: 'geplant',
    kurz: 'Ab 2027 sinken einige Fördersätze schrittweise. Ein Teil ist schon festgelegt, ein Teil noch nicht endgültig.',
    punkte: [
      'Ab 01.02.2027 sinken die förderfähigen Kosten für die erste Wohnung alle sechs Monate um 750 €, bis auf 22.000 € ab 01.08.2030.',
      'Der Klimageschwindigkeitsbonus sinkt ab 01.02.2027 auf 12 %, dann weiter in Schritten von 4 Prozentpunkten.',
      'Ab dem 1. Quartal 2027 soll die Grundförderung für Wärmepumpen auf 15 % sinken. Für Wärmepumpen aus EU-Herstellung soll es 15 % Bonus geben. Start und genaue Regeln sind laut ADAC noch nicht endgültig.',
      'Ab dem 1. Quartal 2027 soll kein Austausch mehr gefördert werden, wenn die vorhandene Heizung erst seit 2008 oder später läuft.',
    ],
    merke: 'Wer ohnehin plant, sollte die Termine kennen. Druck machen sollte man damit nicht: Eine gute Entscheidung braucht Zeit.',
    stichworte: ['2027', 'aenderung', 'absenkung', 'wertschoepfungsbonus', 'eu-bonus', 'union-bonus', '750', '15 prozent', 'kfw'],
    quellen: [KFW458, BAFA_WE, ADAC_FOE],
    geprueft: '2026-11-07',
  },
  {
    id: 'wp-antrag', titel: 'So läuft der Antrag bei der KfW', bereich: 'wp', kategorie: 'zuschuss', status: 'gilt',
    kurz: 'Der Antrag muss gestellt sein, bevor vor Ort gearbeitet wird. Die Reihenfolge ist wichtig.',
    punkte: [
      '1. Ein Fachbetrieb oder ein Energieeffizienz-Experte erstellt die „Bestätigung zum Antrag“ (BzA) mit einer 15-stelligen Nummer.',
      '2. Den Vertrag mit dem Fachbetrieb mit einer Bedingung schließen: Er gilt nur, wenn die Förderung zugesagt wird. Diese Klausel kann man nicht nachträglich einfügen.',
      '3. Antrag im Kundenportal „Meine KfW“ stellen, als Eigentümer selbst. Erst danach darf vor Ort gearbeitet werden.',
      '4. Nach der Zusage ist für die Umsetzung bis zu 36 Monate Zeit.',
      '5. Nach dem Einbau stellt der Fachbetrieb die „Bestätigung nach Durchführung“ aus. Mit den Rechnungen hochladen, dann zahlt die KfW aus.',
      'Gefördert werden nur Häuser, deren Bauantrag mindestens fünf Jahre zurückliegt. Nach dem Umbau müssen die Räume zu mindestens 65 % erneuerbar beheizt werden.',
      'Für den Teil, den der Zuschuss nicht deckt, gibt es bei der KfW zusätzlich einen Ergänzungskredit.',
    ],
    merke: 'Erst Vertrag mit Förderbedingung, dann Antrag, dann Bauen. Wer diese Reihenfolge einhält, verliert keine Förderung.',
    stichworte: ['antrag', 'ablauf', 'bza', 'bnd', 'meine kfw', 'aufschiebende bedingung', 'vertrag', 'reihenfolge', 'ergaenzungskredit', '358', '359'],
    quellen: [KFW458, ADAC_FOE],
    geprueft: '2026-11-07',
  },
  {
    id: 'wp-bafa', titel: 'BAFA: Energieberatung, Sanierungsfahrplan und Dämmung', bereich: 'beide', kategorie: 'zuschuss', status: 'gilt',
    kurz: 'Das BAFA fördert die Energieberatung für das Haus und Maßnahmen an Dach, Wänden und Fenstern.',
    punkte: [
      'Energieberatung für Wohngebäude: 50 % des Honorars, höchstens 650 € beim Ein- oder Zweifamilienhaus, 850 € ab drei Wohnungen.',
      'Der Antrag muss vor Beginn der Beratung gestellt sein.',
      'Ergebnis der Beratung kann ein individueller Sanierungsfahrplan (iSFP) sein, ein Plan, in welcher Reihenfolge das Haus saniert wird.',
      'Dämmung, Fenster und Außentüren: 15 % Zuschuss. Mit Sanierungsfahrplan gibt es 5 % mehr und doppelt so hohe Höchstbeträge (bis 60.000 € für die erste Wohnung).',
      'Auch die Optimierung einer bestehenden Heizung, zum Beispiel ein hydraulischer Abgleich, kann gefördert werden.',
    ],
    merke: 'Die geförderte Energieberatung ist ein guter erster Schritt, gerade wenn Wärmepumpe und Dämmung zusammen gedacht werden.',
    stichworte: ['bafa', 'energieberatung', 'isfp', 'sanierungsfahrplan', 'daemmung', 'fenster', 'gebaeudehuelle', 'heizungsoptimierung', 'hydraulischer abgleich', 'energieberater'],
    quellen: [
      { titel: 'BAFA: Energieberatung für Wohngebäude', url: 'https://www.bafa.de/DE/Energie/Energieberatung/Energieberatung_Wohngebaeude/energieberatung_wohngebaeude_node.html', amtlich: true },
      { titel: 'BAFA: Gebäudehülle (BEG EM)', url: 'https://www.bafa.de/DE/Energie/Effiziente_Gebaeude/Sanierung_Wohngebaeude/Gebaeudehuelle/gebaeudehuelle_node.html', amtlich: true },
      { titel: 'BAFA: Sanierung Wohngebäude', url: 'https://www.bafa.de/DE/Energie/Effiziente_Gebaeude/Sanierung_Wohngebaeude/sanierung_wohngebaeude_node.html', amtlich: true },
    ],
    geprueft: '2026-11-07',
  },
  {
    id: 'wp-steuerbonus', titel: 'Steuerbonus statt Zuschuss (§ 35c EStG)', bereich: 'wp', kategorie: 'steuer', status: 'endet',
    kurz: 'Statt einen Zuschuss zu beantragen, kann man 20 % der Kosten über drei Jahre von der Einkommensteuer abziehen.',
    punkte: [
      'Abzug direkt von der Steuer: 7 % im Jahr des Abschlusses, 7 % im Folgejahr, 6 % im Jahr danach. Zusammen höchstens 40.000 € je Haus oder Wohnung.',
      'Das Haus muss selbst bewohnt und älter als zehn Jahre sein.',
      'Begünstigt sind unter anderem die Erneuerung und die Optimierung der Heizung, Dämmung und Fenster.',
      'Ein Fachbetrieb muss die Arbeiten ausführen und eine amtliche Bescheinigung ausstellen. Bezahlt wird per Überweisung.',
      'Nicht kombinierbar: Für dieselbe Maßnahme gibt es entweder den Steuerbonus oder einen Zuschuss bzw. Förderkredit oder den Handwerkerbonus.',
      'Gilt für Maßnahmen, die bis zum 31.12.2029 abgeschlossen sind.',
    ],
    merke: 'Ob Zuschuss oder Steuerbonus günstiger ist, hängt vom Einzelfall ab. Das klärt am besten die Steuerberatung.',
    stichworte: ['35c', 'steuerbonus', 'steuerermaessigung', 'einkommensteuer', 'sanierung', 'steuer', '40000', 'handwerkerbonus', '35a', 'kombinationsverbot'],
    quellen: [gii('estg/__35c.html', '§ 35c EStG'), gii('estg/__35a.html', '§ 35a EStG (Handwerkerleistungen)')],
    geprueft: '2026-11-07',
  },
  {
    id: 'wp-14a', titel: 'Günstigeres Netzentgelt für steuerbare Wärmepumpen (§ 14a EnWG)', bereich: 'beide', kategorie: 'netz', status: 'gilt',
    kurz: 'Neue Wärmepumpen und Wallboxen muss der Netzbetreiber anschließen. Dafür darf er sie bei Engpässen kurz drosseln und senkt im Gegenzug das Netzentgelt.',
    punkte: [
      'Gilt für Wärmepumpen, Wallboxen und Batteriespeicher mit mehr als 4,2 kW, die seit 01.01.2024 in Betrieb gehen.',
      'Der Netzbetreiber darf den Bezug nur vorübergehend und nur bis auf 4,2 kW drosseln. Diese Leistung bleibt immer verfügbar, die Heizung fällt also nicht aus.',
      'Dafür gibt es eine Ermäßigung beim Netzentgelt. Man wählt zwischen einer festen jährlichen Pauschale je nach Netzbetreiber (Modul 1) und einem um 60 % günstigeren Arbeitspreis mit eigenem Zähler (Modul 2).',
      'Seit April 2025 gibt es zusätzlich zeitabhängige Netzentgelte mit günstigen Zeitfenstern (Modul 3), die man mit der Pauschale verbinden kann.',
      'Stromanbieter müssen außerdem Tarife anbieten, die sich nach Tageszeit oder Börsenpreis richten (dynamische Tarife). Mit Wärmepumpe und Speicher lässt sich so günstiger Strom gezielt nutzen.',
    ],
    merke: 'Die Steuerbarkeit ist kein Nachteil im Alltag: Gedrosselt wird nur selten, und es bleibt genug Leistung für Heizen und Warmwasser.',
    stichworte: ['14a', 'enwg', 'steuerbar', 'netzentgelt', 'modul 1', 'modul 2', 'modul 3', 'dimmen', 'drosseln', '4,2 kw', 'waermepumpentarif', 'dynamischer tarif', '41a', 'wallbox'],
    quellen: [{ titel: 'Bundesnetzagentur: Steuerbare Verbrauchseinrichtungen', url: 'https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/start.html', amtlich: true }, gii('enwg_2005/__14a.html', '§ 14a EnWG'), gii('enwg_2005/__41a.html', '§ 41a EnWG (dynamische Tarife)')],
    geprueft: '2026-11-07',
  },
  {
    id: 'wp-abstand', titel: 'Wärmepumpe im Garten: Abstand zum Nachbarn', bereich: 'wp', kategorie: 'region', status: 'gilt',
    kurz: 'Die Niedersächsische Bauordnung regelt, wie nah ein Außengerät an der Grundstücksgrenze stehen darf.',
    punkte: [
      'Bis 1 m Höhe darf eine Wärmepumpe ohne Grenzabstand stehen.',
      'Ist sie höher als 2 m und breiter als 3 m, braucht sie 3 m Abstand zur Grenze.',
      'Dazwischen wird im Einzelfall entschieden.',
      'Unabhängig davon müssen die Lärmrichtwerte eingehalten werden. Ein guter Standort und ein leises Gerät vermeiden Ärger mit Nachbarn.',
    ],
    stichworte: ['abstand', 'grenzabstand', 'nachbar', 'nbauo', 'bauordnung', 'laerm', 'schall', 'aussengeraet', 'standort', 'garten'],
    quellen: [KEAN_NBAUO],
    geprueft: '2026-11-07',
  },
  {
    id: 'wp-waermeplanung', titel: 'Kommunale Wärmeplanung', bereich: 'wp', kategorie: 'region', status: 'gilt',
    kurz: 'Städte und Gemeinden planen, wo es künftig Wärmenetze geben kann. Mit der Heizungswahl ist das nicht mehr verknüpft.',
    punkte: [
      'In Niedersachsen müssen seit 2026 alle Gemeinden und Samtgemeinden einen Wärmeplan aufstellen.',
      'Mittel- und Oberzentren haben eigene Fristen: über 100.000 Einwohner bis 30.06.2026, kleinere bis 31.12.2026.',
      'Der Wärmeplan zeigt, wo ein Fernwärme- oder Nahwärmenetz denkbar ist. Ein Anspruch auf Anschluss folgt daraus nicht.',
      'Seit dem Gebäudemodernisierungsgesetz hängen die Regeln für den Heizungstausch nicht mehr vom Wärmeplan ab.',
    ],
    merke: 'Wer wissen will, ob ein Wärmenetz in die Straße kommt, fragt bei der Gemeinde nach dem Stand des Wärmeplans.',
    stichworte: ['waermeplanung', 'waermeplan', 'fernwaerme', 'nahwaerme', 'waermenetz', 'gemeinde', 'nklimag', 'lengede', 'salzgitter', 'peine'],
    quellen: [KEAN_NKLIMAG, ADAC_GEG],
    geprueft: '2026-11-07',
  },
  {
    id: 'beide-co2', titel: 'CO2-Preis auf Öl und Gas', bereich: 'beide', kategorie: 'gesetz', status: 'gilt',
    kurz: 'Auf Heizöl und Erdgas wird ein CO2-Preis aufgeschlagen. Er macht fossiles Heizen mit der Zeit teurer.',
    punkte: [
      '2026 liegt der CO2-Preis in einem Korridor von 55 bis 65 € je Tonne CO2.',
      'Der Bundestag hat am 15.10.2026 beschlossen, dass er 2027 im gleichen Korridor bleibt.',
      'Ab 2028 soll der europäische Emissionshandel für Gebäude und Verkehr (ETS2) starten. Dann bildet sich der Preis am Markt.',
      'Strom für die Wärmepumpe ist davon nicht betroffen.',
    ],
    merke: 'Niemand kennt den CO2-Preis nach 2027 genau. Seriös ist, mit Spannbreiten zu rechnen statt mit einer festen Zahl.',
    stichworte: ['co2', 'co2-preis', 'behg', 'ets2', 'emissionshandel', 'heizoel', 'erdgas', 'gaspreis', 'klimaabgabe'],
    quellen: [
      { titel: 'Bundestag: Brennstoffemissionshandelsgesetz novelliert (15.10.2026)', url: 'https://www.bundestag.de/dokumente/textarchiv/2026/kw39-de-brennstoffemissionshandelsgesetz-1211312', amtlich: true },
      { titel: 'Bundestag (hib 692/2026): Gesetzentwurf zum CO2-Preis', url: 'https://www.bundestag.de/presse/hib/kurzmeldungen-1210950', amtlich: true },
    ],
    geprueft: '2026-11-07',
  },

  // ───────────── Region und Tipps ─────────────
  {
    id: 'region-foerderung', titel: 'Förderung in Niedersachsen, Peine, Lengede und Salzgitter', bereich: 'beide', kategorie: 'region', status: 'gilt',
    kurz: 'Für private Solaranlagen, Speicher und Wärmepumpen gibt es derzeit kein eigenes Programm von Land, Landkreis Peine, Lengede oder Salzgitter.',
    punkte: [
      'Die NBank (Förderbank des Landes) hat derzeit kein Programm für Privatleute zu Solaranlage, Speicher oder Wärmepumpe. Das frühere Speicherprogramm ist seit 2021 ausgeschöpft.',
      'Der Landkreis Peine bietet laut eigener Seite derzeit keine eigenen Förderprogramme zum Klimaschutz an. Die Klimaschutzagentur des Landkreises berät aber zu Fördermitteln.',
      'Für Lengede und Salzgitter haben wir kein eigenes Förderprogramm für Privathaushalte gefunden (geprüft 07.11.2026).',
      'Programme wie proKlima gelten nur in Hannover und Umgebung, nicht in Peine oder Salzgitter.',
      'Damit bleiben die Bundesprogramme (KfW, BAFA) und die Steuervorteile die wichtigste Unterstützung.',
    ],
    merke: 'Regionale Programme öffnen und schließen oft kurzfristig. Vor einer Entscheidung lohnt ein kurzer Blick auf die Seiten von Landkreis, Gemeinde und Stadtwerken.',
    stichworte: ['niedersachsen', 'nbank', 'peine', 'landkreis peine', 'lengede', 'salzgitter', 'kommune', 'region', 'proklima', 'landesfoerderung', 'klimaschutzagentur'],
    quellen: [
      { titel: 'NBank: Aktuelle Förderprogramme', url: 'https://www.nbank.de/F%C3%B6rderprogramme/Aktuelle-F%C3%B6rderprogramme/', amtlich: true },
      { titel: 'Landkreis Peine, Klimaschutzagentur: Förderprogramme', url: 'https://www.landkreis-peine.de/Themen/Klimaschutzagentur/F%C3%B6rderprogramme/', amtlich: true },
      KEAN_FOE,
    ],
    geprueft: '2026-11-07',
  },
  {
    id: 'tipp-reihenfolge', titel: 'Die goldenen Regeln bei Förderung', bereich: 'beide', kategorie: 'tipp', status: 'gilt',
    kurz: 'Die meisten Förderungen gehen nicht wegen fehlender Voraussetzungen verloren, sondern wegen der falschen Reihenfolge.',
    punkte: [
      'Erst beantragen, dann beginnen. Das gilt für KfW-Zuschuss, KfW-Kredit und BAFA-Beratung.',
      'Verträge mit Förderbedingung schließen, wenn das Programm es verlangt.',
      'Rechnungen aufheben und immer überweisen, nie bar zahlen.',
      'Förderungen nicht doppelt nutzen: Zuschuss, Steuerbonus und Handwerkerbonus schließen sich für dieselbe Maßnahme meist aus.',
      'Fördersätze und Fristen am Tag des Antrags bei der Förderstelle prüfen. Diese Übersicht ist eine Orientierung.',
    ],
    merke: 'Ehrlich beraten heißt auch: auf Fristen hinweisen, aber keinen Zeitdruck aufbauen. Die Entscheidung trifft der Kunde in Ruhe.',
    stichworte: ['regeln', 'reihenfolge', 'tipps', 'vorhabensbeginn', 'antrag', 'rechnung', 'ueberweisen', 'kombinieren', 'doppelt'],
    quellen: [KFW458, gii('estg/__35c.html', '§ 35c EStG')],
    geprueft: '2026-11-07',
  },
  {
    id: 'tipp-beratung', titel: 'Wo Kunden neutral Rat bekommen', bereich: 'beide', kategorie: 'tipp', status: 'gilt',
    kurz: 'Für eine unabhängige Zweitmeinung gibt es gute Anlaufstellen.',
    punkte: [
      'Die Energieberatung der Verbraucherzentrale berät unabhängig, am Telefon, online oder vor Ort.',
      'Die Klimaschutz- und Energieagentur Niedersachsen bündelt Förderprogramme und Gesetze für das Land.',
      'Energieeffizienz-Experten (Liste bei der dena) erstellen Sanierungsfahrpläne und Bestätigungen für die Förderung.',
      'Bei Steuerfragen hilft die Steuerberatung oder ein Lohnsteuerhilfeverein.',
    ],
    merke: 'Wer Kunden selbst auf neutrale Beratung hinweist, gewinnt Vertrauen.',
    stichworte: ['beratung', 'verbraucherzentrale', 'energieberatung', 'kean', 'energieeffizienz-experte', 'dena', 'zweitmeinung', 'steuerberatung'],
    quellen: [
      { titel: 'Verbraucherzentrale: Energieberatung', url: 'https://verbraucherzentrale-energieberatung.de/', amtlich: false },
      { titel: 'Klimaschutz- und Energieagentur Niedersachsen', url: 'https://www.klimaschutz-niedersachsen.de/', amtlich: true },
      { titel: 'dena: Energieeffizienz-Expertenliste', url: 'https://www.energie-effizienz-experten.de/', amtlich: true },
    ],
    geprueft: '2026-11-07',
  },
];

/** Zeitleiste „Was kommt wann“. `sicher: false` = geplant, noch nicht beschlossen bzw. nicht endgültig. */
export const ZEITLEISTE: Termin[] = [
  { datum: '2025-02-25', text: 'Solarspitzengesetz gilt: keine Vergütung bei negativen Preisen, 60-%-Grenze ohne Smart Meter', bereich: 'pv', abschnitt: 'pv-solarspitzen', sicher: true },
  { datum: '2026-06-01', text: 'Energy Sharing erlaubt: Solarstrom mit Nachbarn teilen', bereich: 'pv', abschnitt: 'pv-teilen', sicher: true },
  { datum: '2026-07-21', text: 'Neue Bedingungen für den KfW-Heizungszuschuss', bereich: 'wp', abschnitt: 'wp-kfw458', sicher: true },
  { datum: '2026-07-29', text: 'Gebäudemodernisierungsgesetz gilt, die 65-%-Pflicht entfällt', bereich: 'wp', abschnitt: 'wp-gmodg', sicher: true },
  { datum: '2026-08-01', text: 'Aktuelle Einspeisevergütung (7,70 ct bis 10 kWp, Teileinspeisung)', bereich: 'pv', abschnitt: 'pv-verguetung', sicher: true },
  { datum: '2026-10-15', text: 'Bundestag beschließt: CO2-Preis bleibt 2027 bei 55 bis 65 € je Tonne', bereich: 'beide', abschnitt: 'beide-co2', sicher: true },
  { datum: '2026-12-31', text: 'EU-Genehmigung des heutigen EEG endet', bereich: 'pv', abschnitt: 'pv-eeg-reform', sicher: true },
  { datum: '2027-01-01', text: 'Geplanter Start der EEG-Reform (noch nicht beschlossen)', bereich: 'pv', abschnitt: 'pv-eeg-reform', sicher: false },
  { datum: '2027-02-01', text: 'Klimageschwindigkeitsbonus sinkt auf 12 %, förderfähige Kosten sinken um 750 €', bereich: 'wp', abschnitt: 'wp-458-aenderungen', sicher: true },
  { datum: '2027-03-31', text: 'Bis Ende 1. Quartal: Wärmepumpen-Grundförderung soll auf 15 % sinken, plus EU-Bonus (noch nicht endgültig)', bereich: 'wp', abschnitt: 'wp-458-aenderungen', sicher: false },
  { datum: '2028-01-01', text: 'Europäischer Emissionshandel für Gebäude (ETS2) soll starten', bereich: 'beide', abschnitt: 'beide-co2', sicher: false },
  { datum: '2028-08-01', text: 'Klimageschwindigkeitsbonus entfällt für neue Anträge', bereich: 'wp', abschnitt: 'wp-kfw458', sicher: true },
  { datum: '2029-01-01', text: 'Bio-Treppe: neue Öl- und Gasheizungen brauchen 10 % klimafreundlichen Brennstoff', bereich: 'wp', abschnitt: 'wp-gmodg', sicher: true },
  { datum: '2029-12-31', text: 'Letzter Tag für den Abschluss von Maßnahmen mit Steuerbonus nach § 35c', bereich: 'wp', abschnitt: 'wp-steuerbonus', sicher: true },
  { datum: '2030-01-01', text: 'Bundesweite Solarpflicht für neue Wohngebäude nach dem Gebäudemodernisierungsgesetz', bereich: 'pv', abschnitt: 'pv-solarpflicht', sicher: true },
  { datum: '2045-01-01', text: 'Alle Brennstoffe für Heizungen müssen klimaneutral sein', bereich: 'wp', abschnitt: 'wp-gmodg', sicher: true },
];

/** Datum (ISO) → „07.11.2026“. */
export const datumText = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

function heuhaufen(a: Abschnitt): string {
  return suchText([a.titel, a.kurz, ...a.punkte, ...(a.tabelle || []).flat(), a.merke || '', a.wusstest || '', ...a.stichworte,
    BEREICHE[a.bereich], KATEGORIEN[a.kategorie], STATUS[a.status], ...a.quellen.map((q) => q.titel)].join(' '));
}

/** Abschnitte filtern: Bereich (pv/wp; „beide“ erscheint bei beiden), Kategorie, Suchwörter (alle müssen vorkommen). */
export function foerderungFiltern(liste: Abschnitt[], opt: { bereich?: 'alle' | 'pv' | 'wp'; kategorie?: FoeKategorie | ''; q?: string } = {}): Abschnitt[] {
  const woerter = suchText(opt.q || '').split(/\s+/).filter(Boolean);
  return liste.filter((a) => {
    if (opt.bereich && opt.bereich !== 'alle' && a.bereich !== opt.bereich && a.bereich !== 'beide') return false;
    if (opt.kategorie && a.kategorie !== opt.kategorie) return false;
    if (!woerter.length) return true;
    const h = heuhaufen(a);
    return woerter.every((w) => h.includes(w));
  });
}

/** Text zum Weiterleiten: Inhalt, Stand, Quellen und Hinweis. Reiner Text, ohne Kundendaten. */
export function abschnittText(a: Abschnitt): string {
  const zeilen = [a.titel, '', a.kurz, '', ...a.punkte.map((p) => `• ${p}`)];
  if (a.tabelle?.length) {
    zeilen.push('');
    for (const z of a.tabelle) zeilen.push(z.join(' | '));
  }
  if (a.merke) zeilen.push('', `Gut zu wissen: ${a.merke}`);
  zeilen.push('', `Stand: ${datumText(a.geprueft)}`, 'Quellen:', ...a.quellen.map((q) => `– ${q.titel}: ${q.url}`), '', `Hinweis: ${HINWEIS}`);
  return zeilen.join('\n');
}

/** Alle „Wusstest du?“-Sätze mit Abschnitts-ID. */
export function wusstestDu(liste: Abschnitt[] = ABSCHNITTE): { id: string; text: string }[] {
  return liste.filter((a) => a.wusstest).map((a) => ({ id: a.id, text: a.wusstest as string }));
}

/** Zeitleiste ab einem Datum (ISO), sortiert; vergangene Einträge werden als `vorbei` markiert. */
export function zeitleiste(heute: string, liste: Termin[] = ZEITLEISTE): (Termin & { vorbei: boolean })[] {
  return [...liste].sort((x, y) => x.datum.localeCompare(y.datum)).map((t) => ({ ...t, vorbei: t.datum < heute }));
}
